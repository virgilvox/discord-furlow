/**
 * Timer system for dynamic timers
 */

import type { ActionExecutor } from '../actions/executor.js';
import type { ActionContext } from '../actions/types.js';
import type { EventRouter } from '../events/router.js';
import type { ExpressionEvaluator } from '../expression/evaluator.js';

interface ActiveTimer {
  id: string;
  event: string;
  data: Record<string, unknown>;
  expiresAt: number;
  timeout: NodeJS.Timeout;
}

export class TimerManager {
  private timers: Map<string, ActiveTimer> = new Map();

  /**
   * Create a new timer
   */
  create(
    id: string,
    durationMs: number,
    event: string,
    data: Record<string, unknown>,
    eventRouter: EventRouter,
    executor: ActionExecutor,
    evaluator: ExpressionEvaluator,
    contextBuilder: () => ActionContext
  ): void {
    // Cancel existing timer with same ID
    this.cancel(id);

    const expiresAt = Date.now() + durationMs;

    const timeout = setTimeout(() => {
      this.timers.delete(id);

      const context = {
        ...contextBuilder(),
        timer: { id, event, data, expiresAt },
      };

      // Emit the timer event with proper error handling
      (async () => {
        try {
          await eventRouter.emit(
            event,
            context as ActionContext,
            executor,
            evaluator
          );

          // Also emit generic timer_fire event
          await eventRouter.emit(
            'timer_fire',
            context as ActionContext,
            executor,
            evaluator
          );
        } catch (err) {
          console.error(`Timer "${id}" event emission error:`, err);
        }
      })();
    }, durationMs);

    this.timers.set(id, {
      id,
      event,
      data,
      expiresAt,
      timeout,
    });
  }

  /**
   * Cancel a timer
   */
  cancel(id: string): boolean {
    const timer = this.timers.get(id);
    if (!timer) return false;

    clearTimeout(timer.timeout);
    return this.timers.delete(id);
  }

  /**
   * Check if a timer exists
   */
  has(id: string): boolean {
    return this.timers.has(id);
  }

  /**
   * Get timer info
   */
  get(id: string): Omit<ActiveTimer, 'timeout'> | undefined {
    const timer = this.timers.get(id);
    if (!timer) return undefined;

    return {
      id: timer.id,
      event: timer.event,
      data: timer.data,
      expiresAt: timer.expiresAt,
    };
  }

  /**
   * Get time remaining for a timer in ms
   */
  getRemaining(id: string): number | undefined {
    const timer = this.timers.get(id);
    if (!timer) return undefined;

    return Math.max(0, timer.expiresAt - Date.now());
  }

  /**
   * Get all timer IDs
   */
  getIds(): string[] {
    return [...this.timers.keys()];
  }

  /**
   * Get count of active timers
   */
  count(): number {
    return this.timers.size;
  }

  /**
   * Cancel all timers
   */
  cancelAll(): void {
    for (const timer of this.timers.values()) {
      clearTimeout(timer.timeout);
    }
    this.timers.clear();
  }

  /**
   * Cleanup expired timers (shouldn't be needed but just in case)
   */
  cleanup(): number {
    const now = Date.now();
    let cleaned = 0;

    for (const [id, timer] of this.timers) {
      if (timer.expiresAt <= now) {
        clearTimeout(timer.timeout);
        this.timers.delete(id);
        cleaned++;
      }
    }

    return cleaned;
  }
}

/**
 * Parse duration string to milliseconds
 */
export function parseDuration(duration: string): number {
  const match = duration.match(/^(\d+)(ms|s|m|h|d|w)?$/);
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
    case 'd':
      return value * 24 * 60 * 60 * 1000;
    case 'w':
      return value * 7 * 24 * 60 * 60 * 1000;
    default:
      return value;
  }
}

/**
 * Create a timer manager
 */
export function createTimerManager(): TimerManager {
  return new TimerManager();
}
