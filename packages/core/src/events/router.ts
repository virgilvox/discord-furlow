/**
 * Event router - routes events to handlers
 */

import type { EventHandler as EventHandlerDef } from '@furlow/schema';
import type { EventName, RegisteredHandler } from './types.js';
import type { ActionExecutor } from '../actions/executor.js';
import type { ActionContext } from '../actions/types.js';
import type { ExpressionEvaluator } from '../expression/evaluator.js';

export interface RouterOptions {
  /** Maximum handlers per event */
  maxHandlersPerEvent?: number;
  /** Default debounce time in ms */
  defaultDebounce?: number;
  /** Default throttle time in ms */
  defaultThrottle?: number;
}

const DEFAULT_OPTIONS: Required<RouterOptions> = {
  maxHandlersPerEvent: 100,
  defaultDebounce: 0,
  defaultThrottle: 0,
};

export class EventRouter {
  private handlers: Map<EventName, RegisteredHandler[]> = new Map();
  private debounceTimers: Map<string, NodeJS.Timeout> = new Map();
  private throttleTimers: Map<string, number> = new Map();
  private options: Required<RouterOptions>;
  private idCounter = 0;

  constructor(options: RouterOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * Register an event handler
   */
  register(handler: EventHandlerDef): string {
    const id = `handler_${++this.idCounter}`;
    const registered: RegisteredHandler = {
      id,
      handler,
      once: handler.once ?? false,
      active: true,
    };

    const eventHandlers = this.handlers.get(handler.event) ?? [];

    if (eventHandlers.length >= this.options.maxHandlersPerEvent) {
      throw new Error(
        `Maximum handlers (${this.options.maxHandlersPerEvent}) reached for event "${handler.event}"`
      );
    }

    eventHandlers.push(registered);
    this.handlers.set(handler.event, eventHandlers);

    return id;
  }

  /**
   * Register multiple handlers
   */
  registerAll(handlers: EventHandlerDef[]): string[] {
    return handlers.map((h) => this.register(h));
  }

  /**
   * Unregister a handler by ID
   */
  unregister(id: string): boolean {
    for (const [event, handlers] of this.handlers) {
      const index = handlers.findIndex((h) => h.id === id);
      if (index !== -1) {
        handlers.splice(index, 1);
        if (handlers.length === 0) {
          this.handlers.delete(event);
        }
        return true;
      }
    }
    return false;
  }

  /**
   * Emit an event
   */
  async emit(
    event: EventName,
    context: ActionContext,
    executor: ActionExecutor,
    evaluator: ExpressionEvaluator
  ): Promise<void> {
    const eventHandlers = this.handlers.get(event) ?? [];
    const activeHandlers = eventHandlers.filter((h) => h.active);

    for (const registered of activeHandlers) {
      const { handler } = registered;

      // Handle debounce
      if (handler.debounce) {
        const debounceKey = `${event}_${registered.id}`;
        const existing = this.debounceTimers.get(debounceKey);
        if (existing) {
          clearTimeout(existing);
        }

        const debounceMs = parseDuration(handler.debounce);
        const timer = setTimeout(async () => {
          this.debounceTimers.delete(debounceKey);
          await this.executeHandler(registered, context, executor, evaluator);
        }, debounceMs);

        this.debounceTimers.set(debounceKey, timer);
        continue;
      }

      // Handle throttle
      if (handler.throttle) {
        const throttleKey = `${event}_${registered.id}`;
        const lastRun = this.throttleTimers.get(throttleKey) ?? 0;
        const throttleMs = parseDuration(handler.throttle);
        const now = Date.now();

        if (now - lastRun < throttleMs) {
          continue;
        }

        this.throttleTimers.set(throttleKey, now);
      }

      await this.executeHandler(registered, context, executor, evaluator);
    }
  }

  /**
   * Execute a handler
   */
  private async executeHandler(
    registered: RegisteredHandler,
    context: ActionContext,
    executor: ActionExecutor,
    evaluator: ExpressionEvaluator
  ): Promise<void> {
    const { handler } = registered;

    // Check condition
    if (handler.when) {
      const shouldRun = await this.evaluateCondition(handler.when, context, evaluator);
      if (!shouldRun) {
        return;
      }
    }

    // Normalize actions from YAML shorthand to schema format
    const normalizedActions = normalizeActions(handler.actions);

    // Execute actions
    await executor.executeSequence(normalizedActions, context);

    // Handle once
    if (registered.once) {
      registered.active = false;
    }
  }

  /**
   * Evaluate a condition
   */
  private async evaluateCondition(
    condition: string | object,
    context: ActionContext,
    evaluator: ExpressionEvaluator
  ): Promise<boolean> {
    if (typeof condition === 'string') {
      // Detect common mistake: using ${} in condition fields
      if (condition.includes('${')) {
        throw new Error(
          `Invalid condition syntax: "${condition}". ` +
          `Condition fields expect raw JEXL expressions without \${} wrapper. ` +
          `Use: when: "${condition.replace(/\$\{([^}]+)\}/g, '$1')}" instead.`
        );
      }
      return evaluator.evaluate<boolean>(condition, context);
    }
    // Handle complex condition objects
    return true;
  }

  /**
   * Get all registered events
   */
  getRegisteredEvents(): EventName[] {
    return [...this.handlers.keys()];
  }

  /**
   * Get handlers for an event
   */
  getHandlers(event: EventName): RegisteredHandler[] {
    return this.handlers.get(event) ?? [];
  }

  /**
   * Clear all handlers
   */
  clear(): void {
    this.handlers.clear();
    for (const timer of this.debounceTimers.values()) {
      clearTimeout(timer);
    }
    this.debounceTimers.clear();
    this.throttleTimers.clear();
  }
}

/**
 * Normalize actions from YAML shorthand format to schema format
 * YAML allows: { reply: { content: "..." } }
 * Schema expects: { action: "reply", content: "..." }
 */
function normalizeActions(actions: any[]): any[] {
  return actions.map((action) => {
    // If action already has 'action' property, it's in schema format
    if (action.action) {
      return action;
    }

    // Convert shorthand to schema format
    for (const [key, value] of Object.entries(action)) {
      if (key === 'when' || key === 'error_handler') continue;

      // Found the action type
      const normalized: any = {
        action: key,
        ...((typeof value === 'object' && value !== null) ? value : {}),
      };

      // Copy over when and error_handler if present
      if (action.when) normalized.when = action.when;
      if (action.error_handler) normalized.error_handler = action.error_handler;

      return normalized;
    }

    return action;
  });
}

/**
 * Parse a duration string to milliseconds
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
 * Create an event router
 */
export function createEventRouter(options?: RouterOptions): EventRouter {
  return new EventRouter(options);
}
