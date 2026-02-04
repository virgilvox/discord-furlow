/**
 * Flow control action handlers
 */

import type { ActionRegistry } from '../registry.js';
import type { ActionHandler, ActionContext, ActionResult } from '../types.js';
import type { HandlerDependencies } from './index.js';
import type {
  CallFlowAction,
  AbortAction,
  ReturnAction,
  FlowIfAction,
  FlowSwitchAction,
  FlowWhileAction,
  RepeatAction,
  ParallelAction,
  BatchAction,
  TryAction,
  WaitAction,
  LogAction,
  EmitAction,
} from '@furlow/schema';

/**
 * Parse duration string to milliseconds
 */
function parseDuration(duration: string): number {
  const match = duration.match(/^(\d+)(ms|s|m|h)?$/);
  if (!match) return 0;

  const value = parseInt(match[1]!, 10);
  const unit = match[2] ?? 'ms';

  switch (unit) {
    case 'ms':
      return value;
    case 's':
      return value * 1000;
    case 'm':
      return value * 60 * 1000;
    case 'h':
      return value * 60 * 60 * 1000;
    default:
      return value;
  }
}

/**
 * Call flow action handler
 * Note: This is a placeholder - actual execution is handled by FlowEngine
 */
const callFlowHandler: ActionHandler<CallFlowAction> = {
  name: 'call_flow',
  async execute(config, context): Promise<ActionResult> {
    const deps = context._deps as HandlerDependencies;
    const { flowEngine, evaluator } = deps;

    if (!flowEngine) {
      return { success: false, error: new Error('FlowEngine not available') };
    }

    // Evaluate flow arguments
    const args: Record<string, unknown> = {};
    if (config.args) {
      for (const [key, expr] of Object.entries(config.args)) {
        args[key] = await evaluator.evaluate(String(expr), context);
      }
    }

    try {
      // Get the action executor from context
      const actionExecutor = context._actionExecutor as any;
      if (!actionExecutor) {
        return { success: false, error: new Error('ActionExecutor not available') };
      }

      const result = await flowEngine.execute(
        config.flow,
        args,
        context,
        actionExecutor,
        evaluator,
        context.flowContext as any
      );

      // Store result if requested
      if (config.as && result.value !== undefined) {
        (context as Record<string, unknown>)[config.as] = result.value;
      }

      return {
        success: result.success,
        data: result.value,
        error: result.error,
      };
    } catch (err) {
      return { success: false, error: err as Error };
    }
  },
};

/**
 * Abort action handler
 * Note: Actual abort is handled by FlowEngine
 */
const abortHandler: ActionHandler<AbortAction> = {
  name: 'abort',
  async execute(config, context): Promise<ActionResult> {
    const deps = context._deps as HandlerDependencies;
    const { evaluator } = deps;

    const reason = config.reason
      ? await evaluator.interpolate(String(config.reason), context)
      : undefined;

    // Set abort flag in flow context
    if (context.flowContext) {
      (context.flowContext as any).aborted = true;
      (context.flowContext as any).abortReason = reason;
    }

    return { success: true, data: { aborted: true, reason } };
  },
};

/**
 * Return action handler
 * Note: Actual return is handled by FlowEngine
 */
const returnHandler: ActionHandler<ReturnAction> = {
  name: 'return',
  async execute(config, context): Promise<ActionResult> {
    const deps = context._deps as HandlerDependencies;
    const { evaluator } = deps;

    let value: unknown;
    if (config.value) {
      value = await evaluator.evaluate(String(config.value), context);
    }

    // Set return value in flow context
    if (context.flowContext) {
      (context.flowContext as any).returnValue = value;
    }

    return { success: true, data: value };
  },
};

/**
 * Flow if action handler
 * Note: Actual branching is handled by FlowEngine
 */
const flowIfHandler: ActionHandler<FlowIfAction> = {
  name: 'flow_if',
  async execute(config, context): Promise<ActionResult> {
    // This is a control flow action - execution is handled by FlowEngine
    // This handler is here for when flow_if is used outside of a flow
    const deps = context._deps as HandlerDependencies;
    const { evaluator } = deps;

    const condition = config.condition || config.if;
    if (!condition) {
      return { success: false, error: new Error('Condition is required') };
    }

    const conditionStr = String(condition);
    // Detect common mistake: using ${} in condition fields
    if (conditionStr.includes('${')) {
      throw new Error(
        `Invalid condition syntax: "${conditionStr}". ` +
        `Condition fields expect raw JEXL expressions without \${} wrapper. ` +
        `Use: condition: "${conditionStr.replace(/\$\{([^}]+)\}/g, '$1')}" instead.`
      );
    }

    const result = await evaluator.evaluate<boolean>(conditionStr, context);

    // The FlowEngine will handle executing the branches
    return { success: true, data: { condition: result } };
  },
};

/**
 * Flow switch action handler
 * Note: Actual branching is handled by FlowEngine
 */
const flowSwitchHandler: ActionHandler<FlowSwitchAction> = {
  name: 'flow_switch',
  async execute(config, context): Promise<ActionResult> {
    const deps = context._deps as HandlerDependencies;
    const { evaluator } = deps;

    const value = await evaluator.evaluate<string>(String(config.value), context);

    // The FlowEngine will handle executing the branches
    return { success: true, data: { value } };
  },
};

/**
 * Flow while action handler
 * Note: Actual looping is handled by FlowEngine
 */
const flowWhileHandler: ActionHandler<FlowWhileAction> = {
  name: 'flow_while',
  async execute(config, context): Promise<ActionResult> {
    // This is a control flow action - execution is handled by FlowEngine
    return { success: true };
  },
};

/**
 * Repeat action handler
 * Note: Actual looping is handled by FlowEngine
 */
const repeatHandler: ActionHandler<RepeatAction> = {
  name: 'repeat',
  async execute(config, context): Promise<ActionResult> {
    // This is a control flow action - execution is handled by FlowEngine
    return { success: true };
  },
};

/**
 * Parallel action handler
 * Note: Actual parallel execution is handled by ActionExecutor
 */
const parallelHandler: ActionHandler<ParallelAction> = {
  name: 'parallel',
  async execute(config, context): Promise<ActionResult> {
    // This is a control flow action - execution is handled by ActionExecutor/FlowEngine
    return { success: true };
  },
};

/**
 * Batch action handler
 * Note: Actual batch execution is handled by ActionExecutor
 */
const batchHandler: ActionHandler<BatchAction> = {
  name: 'batch',
  async execute(config, context): Promise<ActionResult> {
    const deps = context._deps as HandlerDependencies;
    const { evaluator } = deps;

    // Get the items to iterate over
    const items = await evaluator.evaluate<unknown[]>(String(config.items), context);

    if (!Array.isArray(items)) {
      return { success: false, error: new Error('Items must be an array') };
    }

    // The FlowEngine/ActionExecutor will handle the actual iteration
    return { success: true, data: { items, count: items.length } };
  },
};

/**
 * Try action handler
 * Note: Actual try/catch is handled by FlowEngine
 */
const tryHandler: ActionHandler<TryAction> = {
  name: 'try',
  async execute(config, context): Promise<ActionResult> {
    // This is a control flow action - execution is handled by FlowEngine
    return { success: true };
  },
};

/**
 * Wait action handler
 */
const waitHandler: ActionHandler<WaitAction> = {
  name: 'wait',
  async execute(config, context): Promise<ActionResult> {
    const durationMs = parseDuration(String(config.duration));
    await new Promise((resolve) => setTimeout(resolve, durationMs));
    return { success: true };
  },
};

/**
 * Log action handler
 */
const logHandler: ActionHandler<LogAction> = {
  name: 'log',
  async execute(config, context): Promise<ActionResult> {
    const deps = context._deps as HandlerDependencies;
    const { evaluator } = deps;

    const message = await evaluator.interpolate(String(config.message), context);
    const level = config.level || 'info';

    switch (level) {
      case 'debug':
        console.debug(`[FURLOW] ${message}`);
        break;
      case 'info':
        console.info(`[FURLOW] ${message}`);
        break;
      case 'warn':
        console.warn(`[FURLOW] ${message}`);
        break;
      case 'error':
        console.error(`[FURLOW] ${message}`);
        break;
      default:
        console.log(`[FURLOW] ${message}`);
    }

    return { success: true };
  },
};

/**
 * Emit action handler
 */
const emitHandler: ActionHandler<EmitAction> = {
  name: 'emit',
  async execute(config, context): Promise<ActionResult> {
    const deps = context._deps as HandlerDependencies;
    const { evaluator } = deps;

    // Evaluate event data
    const data: Record<string, unknown> = {};
    if (config.data) {
      for (const [key, expr] of Object.entries(config.data)) {
        data[key] = await evaluator.evaluate(String(expr), context);
      }
    }

    // Emit the event through the event router if available
    const eventRouter = (context as any)._eventRouter;
    const actionExecutor = (context as any)._actionExecutor;
    if (eventRouter && typeof eventRouter.emit === 'function' && actionExecutor) {
      await eventRouter.emit(config.event, { ...context, ...data }, actionExecutor, evaluator);
    }

    return { success: true, data: { event: config.event, data } };
  },
};

/**
 * Register all flow handlers
 */
export function registerFlowHandlers(
  registry: ActionRegistry,
  deps: HandlerDependencies
): void {
  registry.register(callFlowHandler);
  registry.register(abortHandler);
  registry.register(returnHandler);
  registry.register(flowIfHandler);
  registry.register(flowSwitchHandler);
  registry.register(flowWhileHandler);
  registry.register(repeatHandler);
  registry.register(parallelHandler);
  registry.register(batchHandler);
  registry.register(tryHandler);
  registry.register(waitHandler);
  registry.register(logHandler);
  registry.register(emitHandler);
}
