/**
 * Action execution tracker for E2E testing
 * Intercepts and records all action executions for verification
 */

import type { Action } from '@furlow/schema';
import type { ActionResult, ActionHandler, ActionContext } from '@furlow/core';
import { ActionRegistry } from '@furlow/core';

/**
 * Record of an action execution
 */
export interface ActionExecutionRecord {
  /** Action name */
  action: string;
  /** Action configuration */
  config: Action;
  /** Execution result */
  result: ActionResult;
  /** Timestamp of execution */
  timestamp: number;
  /** Execution context (sanitized) */
  context: {
    guildId?: string;
    channelId?: string;
    userId?: string;
    args?: Record<string, unknown>;
  };
}

/**
 * Discord API call record
 */
export interface DiscordApiCall {
  /** API method (reply, send, edit, etc.) */
  method: string;
  /** Arguments passed to the method */
  args: unknown[];
  /** Timestamp of call */
  timestamp: number;
}

/**
 * Action tracker that wraps handlers to record executions
 */
export class ActionTracker {
  private executions: ActionExecutionRecord[] = [];
  private discordCalls: DiscordApiCall[] = [];

  /**
   * Get all recorded action executions
   */
  getExecutions(): ActionExecutionRecord[] {
    return [...this.executions];
  }

  /**
   * Get all recorded Discord API calls
   */
  getDiscordCalls(): DiscordApiCall[] {
    return [...this.discordCalls];
  }

  /**
   * Record an action execution
   */
  recordExecution(
    action: string,
    config: Action,
    result: ActionResult,
    context: ActionContext
  ): void {
    this.executions.push({
      action,
      config,
      result,
      timestamp: Date.now(),
      context: {
        guildId: context.guildId,
        channelId: context.channelId,
        userId: context.userId,
        args: context.args as Record<string, unknown>,
      },
    });
  }

  /**
   * Record a Discord API call
   */
  recordDiscordCall(method: string, args: unknown[]): void {
    this.discordCalls.push({
      method,
      args,
      timestamp: Date.now(),
    });
  }

  /**
   * Clear all recorded executions
   */
  clear(): void {
    this.executions = [];
    this.discordCalls = [];
  }

  /**
   * Get executions filtered by action name
   */
  getExecutionsByAction(actionName: string): ActionExecutionRecord[] {
    return this.executions.filter((e) => e.action === actionName);
  }

  /**
   * Check if a specific action was executed
   */
  wasExecuted(actionName: string): boolean {
    return this.executions.some((e) => e.action === actionName);
  }

  /**
   * Get the count of executions for an action
   */
  getExecutionCount(actionName: string): number {
    return this.executions.filter((e) => e.action === actionName).length;
  }

  /**
   * Get all execution errors
   */
  getErrors(): ActionExecutionRecord[] {
    return this.executions.filter((e) => !e.result.success);
  }

  /**
   * Check if there were any execution errors
   */
  hasErrors(): boolean {
    return this.executions.some((e) => !e.result.success);
  }
}

/**
 * Create a tracking wrapper for an action handler
 */
export function createTrackedHandler(
  handler: ActionHandler,
  tracker: ActionTracker
): ActionHandler {
  return {
    name: handler.name,
    schema: handler.schema,
    validate: handler.validate,
    async execute(config: Action, context: ActionContext): Promise<ActionResult> {
      const result = await handler.execute(config, context);
      tracker.recordExecution(handler.name, config, result, context);
      return result;
    },
  };
}

/**
 * Create a tracked action registry that wraps all handlers
 */
/**
 * A tracked action registry that wraps handlers with tracking
 */
class TrackedActionRegistry extends ActionRegistry {
  private baseRegistry: ActionRegistry;
  private tracker: ActionTracker;
  private trackedHandlers = new Map<string, ActionHandler>();

  constructor(baseRegistry: ActionRegistry, tracker: ActionTracker) {
    super();
    this.baseRegistry = baseRegistry;
    this.tracker = tracker;
  }

  override register(handler: ActionHandler): void {
    const tracked = createTrackedHandler(handler, this.tracker);
    this.trackedHandlers.set(handler.name, tracked);
    super.register(tracked);
  }

  override get(name: string): ActionHandler {
    const tracked = this.trackedHandlers.get(name);
    if (tracked) {
      return tracked;
    }
    // Fall back to base registry and wrap on demand
    const base = this.baseRegistry.get(name);
    const wrapped = createTrackedHandler(base, this.tracker);
    this.trackedHandlers.set(name, wrapped);
    super.register(wrapped);
    return wrapped;
  }

  override has(name: string): boolean {
    return this.trackedHandlers.has(name) || this.baseRegistry.has(name);
  }

  override getNames(): string[] {
    const names = new Set([...this.trackedHandlers.keys(), ...this.baseRegistry.getNames()]);
    return [...names];
  }
}

export function createTrackedRegistry(
  baseRegistry: ActionRegistry,
  tracker: ActionTracker
): ActionRegistry {
  return new TrackedActionRegistry(baseRegistry, tracker);
}

/**
 * Create an action tracker
 */
export function createActionTracker(): ActionTracker {
  return new ActionTracker();
}
