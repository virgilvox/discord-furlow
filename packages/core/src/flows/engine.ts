/**
 * Flow engine - executes named action sequences
 */

import type { FlowDefinition, FlowParameter, Action } from '@furlow/schema';
import type { FlowExecutionContext, FlowResult, RegisteredFlow } from './types.js';
import type { ActionExecutor } from '../actions/executor.js';
import type { ActionContext, ActionResult } from '../actions/types.js';
import type { ExpressionEvaluator } from '../expression/evaluator.js';
import type { StateManager } from '../state/manager.js';
import { FlowNotFoundError, FlowAbortedError, MaxFlowDepthError } from '../errors/index.js';
import { normalizeActionsDeep } from '../parser/normalize.js';

export interface FlowEngineOptions {
  /** Maximum flow call depth */
  maxDepth?: number;
  /** Maximum loop iterations */
  maxIterations?: number;
}

const DEFAULT_OPTIONS: Required<FlowEngineOptions> = {
  maxDepth: 50,
  maxIterations: 10000,
};

export class FlowEngine {
  private flows: Map<string, RegisteredFlow> = new Map();
  private options: Required<FlowEngineOptions>;

  constructor(options: FlowEngineOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * Register a flow definition
   */
  register(flow: FlowDefinition): void {
    const parameters = new Map<string, FlowParameter>();
    for (const param of flow.parameters ?? []) {
      parameters.set(param.name, param);
    }

    // Normalize actions from YAML shorthand to schema format
    const normalizedFlow: FlowDefinition = {
      ...flow,
      actions: normalizeActionsDeep(flow.actions),
    };

    this.flows.set(flow.name, { definition: normalizedFlow, parameters });
  }

  /**
   * Register multiple flows
   */
  registerAll(flows: FlowDefinition[]): void {
    for (const flow of flows) {
      this.register(flow);
    }
  }

  /**
   * Get a flow by name
   */
  get(name: string): RegisteredFlow | undefined {
    return this.flows.get(name);
  }

  /**
   * Check if a flow exists
   */
  has(name: string): boolean {
    return this.flows.has(name);
  }

  /**
   * Execute a flow
   */
  async execute(
    name: string,
    args: Record<string, unknown>,
    context: ActionContext,
    executor: ActionExecutor,
    evaluator: ExpressionEvaluator,
    flowContext: FlowExecutionContext = { args: {}, depth: 0 }
  ): Promise<FlowResult> {
    // Check depth
    if (flowContext.depth >= this.options.maxDepth) {
      throw new MaxFlowDepthError(this.options.maxDepth);
    }

    // Get flow
    const flow = this.flows.get(name);
    if (!flow) {
      throw new FlowNotFoundError(name);
    }

    // Validate and apply parameters
    const resolvedArgs = await this.resolveParameters(
      flow.parameters,
      args,
      context,
      evaluator
    );

    // Create flow context
    const flowCtx: FlowExecutionContext = {
      args: resolvedArgs,
      depth: flowContext.depth + 1,
      parentFlow: name,
    };

    // Create action context with flow args
    const actionContext: ActionContext = {
      ...context,
      args: resolvedArgs,
      flowContext: flowCtx,
    } as ActionContext;

    try {
      // Execute actions
      const results = await this.executeActions(
        flow.definition.actions,
        actionContext,
        executor,
        evaluator,
        flowCtx
      );

      // Check for abort
      if (flowCtx.aborted) {
        return {
          success: false,
          aborted: true,
          error: new FlowAbortedError(name, flowCtx.abortReason),
        };
      }

      // Evaluate return value
      let returnValue: unknown;
      if (flow.definition.returns) {
        returnValue = await evaluator.evaluate(flow.definition.returns, {
          ...actionContext,
          results,
        });
      }

      return {
        success: true,
        value: returnValue ?? flowCtx.returnValue,
      };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err : new Error(String(err)),
      };
    }
  }

  /**
   * Execute actions with flow control support
   */
  private async executeActions(
    actions: Action[],
    context: ActionContext,
    executor: ActionExecutor,
    evaluator: ExpressionEvaluator,
    flowCtx: FlowExecutionContext
  ): Promise<ActionResult[]> {
    const results: ActionResult[] = [];

    for (const action of actions) {
      // Check for abort
      if (flowCtx.aborted || context.signal?.aborted) {
        break;
      }

      // Handle flow control actions
      if (action.action === 'abort') {
        flowCtx.aborted = true;
        flowCtx.abortReason = action.reason
          ? await evaluator.interpolate(action.reason, context)
          : undefined;
        break;
      }

      if (action.action === 'return') {
        if (action.value) {
          flowCtx.returnValue = await evaluator.evaluate(action.value, context);
        }
        break;
      }

      // Handle flow_if
      if (action.action === 'flow_if') {
        const condition = await this.evaluateConditionWithState(
          action.if as string,
          context,
          evaluator
        );
        const branch = condition
          ? (action.then as Action[])
          : (action.else as Action[] | undefined);

        if (branch) {
          const branchResults = await this.executeActions(
            branch,
            context,
            executor,
            evaluator,
            flowCtx
          );
          results.push(...branchResults);
        }
        continue;
      }

      // Handle flow_switch
      if (action.action === 'flow_switch') {
        const value = await evaluator.evaluate<string>(action.value as string, context);
        const cases = action.cases as Record<string, Action[]>;
        const branch = cases[value] ?? (action.default as Action[] | undefined);

        if (branch) {
          const branchResults = await this.executeActions(
            branch,
            context,
            executor,
            evaluator,
            flowCtx
          );
          results.push(...branchResults);
        }
        continue;
      }

      // Handle flow_while
      if (action.action === 'flow_while') {
        let iterations = 0;
        // Use per-action max_iterations if defined, otherwise use global
        const maxIter = (action.max_iterations as number) ?? this.options.maxIterations;
        while (iterations < maxIter) {
          const condition = await this.evaluateConditionWithState(
            action.while as string,
            context,
            evaluator
          );
          if (!condition || flowCtx.aborted) break;

          const loopResults = await this.executeActions(
            action.do as Action[],
            context,
            executor,
            evaluator,
            flowCtx
          );
          results.push(...loopResults);

          // Check abort after executing loop body
          if (flowCtx.aborted) break;

          iterations++;
        }
        continue;
      }

      // Handle repeat
      if (action.action === 'repeat') {
        const rawTimes = action.times;
        // Validate times is a positive integer
        if (typeof rawTimes !== 'number' || !Number.isInteger(rawTimes) || rawTimes < 0) {
          results.push({
            success: false,
            error: new Error(`repeat.times must be a non-negative integer, got: ${typeof rawTimes === 'number' ? rawTimes : typeof rawTimes}`),
          });
          continue;
        }
        // Cap at maxIterations to prevent runaway loops
        const times = Math.min(rawTimes, this.options.maxIterations);
        const varName = action.as ?? 'i';

        for (let i = 0; i < times && !flowCtx.aborted; i++) {
          const loopContext = { ...context, [varName]: i };
          const loopResults = await this.executeActions(
            action.do as Action[],
            loopContext as ActionContext,
            executor,
            evaluator,
            flowCtx
          );
          results.push(...loopResults);
        }
        continue;
      }

      // Handle call_flow
      if (action.action === 'call_flow') {
        const flowName = action.flow as string;
        const flowArgs: Record<string, unknown> = {};

        if (action.args) {
          for (const [key, expr] of Object.entries(action.args as Record<string, string>)) {
            flowArgs[key] = await evaluator.evaluate(expr, context);
          }
        }

        const result = await this.execute(
          flowName,
          flowArgs,
          context,
          executor,
          evaluator,
          flowCtx
        );

        // Propagate abort from nested flow to parent
        if (result.aborted) {
          flowCtx.aborted = true;
          flowCtx.abortReason = result.error?.message ?? 'Nested flow aborted';
        }

        if (action.as && result.value !== undefined) {
          (context as Record<string, unknown>)[action.as as string] = result.value;
        }

        results.push({
          success: result.success,
          data: result.value,
          error: result.error,
        });
        continue;
      }

      // Handle parallel
      if (action.action === 'parallel') {
        const parallelResults = await executor.executeParallel(
          action.actions as Action[],
          context
        );
        results.push(...parallelResults);
        continue;
      }

      // Handle batch - iterate over items and execute actions for each
      if (action.action === 'batch') {
        const items = await evaluator.evaluate<unknown[]>(action.items as string, context);
        if (!Array.isArray(items)) {
          results.push({ success: false, error: new Error('Batch items must be an array') });
          continue;
        }

        const varName = action.as ?? 'item';
        const concurrency = (action.concurrency as number) ?? 1;
        const eachActions = Array.isArray(action.each) ? action.each : [action.each];

        if (concurrency === 1) {
          // Sequential execution
          for (let i = 0; i < items.length && !flowCtx.aborted; i++) {
            const itemContext = {
              ...context,
              [varName]: items[i],
              [`${varName}_index`]: i,
            } as ActionContext;
            const itemResults = await this.executeActions(
              eachActions as Action[],
              itemContext,
              executor,
              evaluator,
              flowCtx
            );
            results.push(...itemResults);
          }
        } else {
          // Parallel execution with concurrency limit
          for (let i = 0; i < items.length && !flowCtx.aborted; i += concurrency) {
            const batch = items.slice(i, i + concurrency);
            const batchPromises = batch.map((item, idx) => {
              const itemContext = {
                ...context,
                [varName]: item,
                [`${varName}_index`]: i + idx,
              } as ActionContext;
              return this.executeActions(
                eachActions as Action[],
                itemContext,
                executor,
                evaluator,
                flowCtx
              );
            });
            const batchResults = await Promise.all(batchPromises);
            for (const itemResults of batchResults) {
              results.push(...itemResults);
            }
          }
        }
        continue;
      }

      // Handle try/catch/finally
      if (action.action === 'try') {
        const doActions = action.do as Action[];
        const catchActions = action.catch as Action[] | undefined;
        const finallyActions = action.finally as Action[] | undefined;

        let tryError: Error | undefined;

        try {
          const tryResults = await this.executeActions(
            doActions,
            context,
            executor,
            evaluator,
            flowCtx
          );
          results.push(...tryResults);

          // Check if any action in try block failed
          const failedResult = tryResults.find(r => !r.success && r.error);
          if (failedResult) {
            tryError = failedResult.error;
          }
        } catch (err) {
          tryError = err instanceof Error ? err : new Error(String(err));
        }

        // Execute catch block if there was an error
        if (tryError && catchActions && catchActions.length > 0) {
          const catchContext = {
            ...context,
            error: tryError,
            errorMessage: tryError.message,
          } as ActionContext;
          try {
            const catchResults = await this.executeActions(
              catchActions,
              catchContext,
              executor,
              evaluator,
              flowCtx
            );
            results.push(...catchResults);
          } catch (catchErr) {
            results.push({
              success: false,
              error: catchErr instanceof Error ? catchErr : new Error(String(catchErr)),
            });
          }
        }

        // Execute finally block always
        if (finallyActions && finallyActions.length > 0) {
          try {
            const finallyResults = await this.executeActions(
              finallyActions,
              context,
              executor,
              evaluator,
              flowCtx
            );
            results.push(...finallyResults);
          } catch (finallyErr) {
            results.push({
              success: false,
              error: finallyErr instanceof Error ? finallyErr : new Error(String(finallyErr)),
            });
          }
        }
        continue;
      }

      // Execute regular action
      const result = await executor.executeOne(action, context);
      results.push(result);
    }

    return results;
  }

  /**
   * Resolve and validate parameters
   */
  private async resolveParameters(
    parameters: Map<string, FlowParameter>,
    args: Record<string, unknown>,
    context: ActionContext,
    evaluator: ExpressionEvaluator
  ): Promise<Record<string, unknown>> {
    const resolved: Record<string, unknown> = {};

    for (const [name, param] of parameters) {
      let value = args[name];

      // Use default if not provided
      if (value === undefined && param.default !== undefined) {
        value = param.default;
      }

      // Check required
      if (value === undefined && param.required) {
        throw new Error(`Missing required parameter: ${name}`);
      }

      // Type check if value provided
      if (value !== undefined && param.type && param.type !== 'any') {
        const actualType = Array.isArray(value) ? 'array' : typeof value;
        if (actualType !== param.type) {
          throw new Error(
            `Parameter "${name}" expected ${param.type} but got ${actualType}`
          );
        }
      }

      resolved[name] = value;
    }

    return resolved;
  }

  /**
   * Evaluate a condition expression with state variables loaded from StateManager
   */
  private async evaluateConditionWithState(
    expression: string,
    context: ActionContext,
    evaluator: ExpressionEvaluator
  ): Promise<boolean> {
    // Check if stateManager is available and has getVariableNames method
    const stateManager = context.stateManager as StateManager | undefined;
    if (stateManager && typeof stateManager.getVariableNames === 'function') {
      return evaluator.evaluateWithState<boolean>(
        expression,
        context,
        stateManager,
        {
          guildId: context.guildId,
          channelId: context.channelId,
          userId: context.userId,
        }
      );
    }
    // Fallback to regular evaluation if stateManager not available
    return evaluator.evaluate<boolean>(expression, context);
  }

  /**
   * Get all registered flow names
   */
  getFlowNames(): string[] {
    return [...this.flows.keys()];
  }

  /**
   * Clear all flows
   */
  clear(): void {
    this.flows.clear();
  }
}

/**
 * Create a flow engine
 */
export function createFlowEngine(options?: FlowEngineOptions): FlowEngine {
  return new FlowEngine(options);
}
