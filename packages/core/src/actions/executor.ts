/**
 * Action executor - executes actions with proper context and error handling
 */

import type { Action, SimpleCondition } from '@furlow/schema';
import type { ActionContext, ActionResult } from './types.js';
import type { ActionRegistry } from './registry.js';
import type { ExpressionEvaluator } from '../expression/evaluator.js';
import { ActionExecutionError, FlowAbortedError, QuotaExceededError } from '../errors/index.js';

export interface ExecutorOptions {
  /** Maximum actions to execute in sequence */
  maxActions?: number;
  /** Maximum parallel actions */
  maxParallel?: number;
  /** Whether to stop on first error */
  stopOnError?: boolean;
}

const DEFAULT_OPTIONS: Required<ExecutorOptions> = {
  maxActions: 1000,
  maxParallel: 50,
  stopOnError: true,
};

export class ActionExecutor {
  private registry: ActionRegistry;
  private evaluator: ExpressionEvaluator;
  private options: Required<ExecutorOptions>;

  constructor(
    registry: ActionRegistry,
    evaluator: ExpressionEvaluator,
    options: ExecutorOptions = {}
  ) {
    this.registry = registry;
    this.evaluator = evaluator;
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * Execute a single action
   */
  async executeOne(
    action: Action,
    context: ActionContext
  ): Promise<ActionResult> {
    // Check abort signal
    if (context.signal?.aborted) {
      return { success: false, error: new FlowAbortedError('Action', 'Aborted') };
    }

    // Evaluate condition if present
    if (action.when) {
      const shouldRun = await this.evaluateCondition(action.when, context);
      if (!shouldRun) {
        return { success: true, data: null };
      }
    }

    // Get handler
    const handler = this.registry.get(action.action);

    // Validate if handler has validation
    if (handler.validate) {
      const valid = handler.validate(action);
      if (valid !== true) {
        const message = typeof valid === 'string' ? valid : 'Invalid action configuration';
        return { success: false, error: new ActionExecutionError(action.action, message) };
      }
    }

    // Charge the quota before dispatching. A quota exceed propagates as
    // an abort (throws out of executeOne) so callers can halt cleanly.
    if (context.quota) {
      context.quota.charge(handler.cost ?? 1);
    }

    try {
      const result = await handler.execute(action, context);
      return result;
    } catch (err) {
      // Quota exceeds from inside handlers (e.g. chargeApi) bubble out as
      // aborts; do not wrap them as ActionExecutionError.
      if (err instanceof QuotaExceededError) {
        throw err;
      }
      const error = err instanceof Error ? err : new Error(String(err));
      return {
        success: false,
        error: new ActionExecutionError(action.action, error.message, error),
      };
    }
  }

  /**
   * Execute multiple actions in sequence
   */
  async executeSequence(
    actions: Action[],
    context: ActionContext
  ): Promise<ActionResult[]> {
    if (actions.length > this.options.maxActions) {
      throw new ActionExecutionError(
        'sequence',
        `Too many actions: ${actions.length} exceeds limit of ${this.options.maxActions}`
      );
    }

    const results: ActionResult[] = [];

    for (const action of actions) {
      if (context.signal?.aborted) {
        break;
      }

      const result = await this.executeOne(action, context);
      results.push(result);

      if (!result.success && this.options.stopOnError) {
        break;
      }
    }

    return results;
  }

  /**
   * Execute multiple actions in parallel
   */
  async executeParallel(
    actions: Action[],
    context: ActionContext
  ): Promise<ActionResult[]> {
    if (actions.length > this.options.maxParallel) {
      throw new ActionExecutionError(
        'parallel',
        `Too many parallel actions: ${actions.length} exceeds limit of ${this.options.maxParallel}`
      );
    }

    const promises = actions.map((action) => this.executeOne(action, context));
    return Promise.all(promises);
  }

  /**
   * Execute actions with batch processing
   */
  async executeBatch<T>(
    items: T[],
    actionTemplate: Action[],
    context: ActionContext,
    options: {
      as?: string;
      concurrency?: number;
    } = {}
  ): Promise<ActionResult[][]> {
    const { as = 'item', concurrency = 1 } = options;
    const results: ActionResult[][] = [];

    // Process in batches based on concurrency
    for (let i = 0; i < items.length; i += concurrency) {
      if (context.signal?.aborted) {
        break;
      }

      const batch = items.slice(i, i + concurrency);
      const batchPromises = batch.map((item, index) => {
        const itemContext = {
          ...context,
          [as]: item,
          [`${as}_index`]: i + index,
        };
        return this.executeSequence(actionTemplate, itemContext);
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    }

    return results;
  }

  /**
   * Evaluate a condition
   */
  private async evaluateCondition(
    condition: SimpleCondition,
    context: ActionContext
  ): Promise<boolean> {
    if (typeof condition === 'string') {
      return this.evaluator.evaluate<boolean>(condition, context);
    }

    if ('expr' in condition && condition.expr) {
      return this.evaluator.evaluate<boolean>(condition.expr, context);
    }

    if ('all' in condition && condition.all) {
      for (const sub of condition.all) {
        if (!(await this.evaluateCondition(sub, context))) {
          return false;
        }
      }
      return true;
    }

    if ('any' in condition && condition.any) {
      for (const sub of condition.any) {
        if (await this.evaluateCondition(sub, context)) {
          return true;
        }
      }
      return false;
    }

    if ('not' in condition && condition.not) {
      return !(await this.evaluateCondition(condition.not, context));
    }

    return true;
  }
}

/**
 * Create an action executor
 */
export function createActionExecutor(
  registry: ActionRegistry,
  evaluator: ExpressionEvaluator,
  options?: ExecutorOptions
): ActionExecutor {
  return new ActionExecutor(registry, evaluator, options);
}
