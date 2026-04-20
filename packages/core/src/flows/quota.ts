/**
 * Per-handler execution quotas
 *
 * A FlowQuota is created per top-level handler invocation and attached to
 * the ActionContext. It tracks cumulative operations, weighted credits,
 * per-API-bucket counters, and a wallclock budget, and owns the
 * AbortController whose signal propagates to in-flight actions.
 *
 * Models Kite's FlowContextLimits and YAGPDB's MaxOps / IncreaseCheckCallCounter.
 */

import { QuotaExceededError } from '../errors/runtime-errors.js';

export type QuotaMetric =
  | 'operations'
  | 'credits'
  | 'wallclock'
  | 'stack_depth'
  | `api:${string}`;

export interface QuotaLimits {
  /** Maximum nested flow call depth */
  maxStackDepth: number;
  /** Maximum individual action executions per handler invocation */
  maxOperations: number;
  /** Maximum weighted cost per handler invocation */
  maxCredits: number;
  /** Wallclock budget for the entire handler invocation, in milliseconds */
  wallclockMs: number;
  /** Per-API-bucket caps (e.g., `send_dm: 1`) */
  apiCallLimits: Record<string, number>;
}

export const DEFAULT_QUOTA_LIMITS: QuotaLimits = {
  maxStackDepth: 50,
  maxOperations: 10_000,
  maxCredits: 100_000,
  wallclockMs: 30_000,
  apiCallLimits: {
    send_dm: 1,
    edit_channel: 10,
    add_reaction: 20,
    api_call: 20,
  },
};

export interface FlowQuotaOptions {
  /** Override any subset of defaults */
  limits?: Partial<QuotaLimits>;
}

export class FlowQuota {
  readonly limits: QuotaLimits;
  readonly startedAt: number;
  readonly abortController: AbortController;

  operations = 0;
  credits = 0;
  readonly apiCallCounts = new Map<string, number>();
  wallclockExceeded = false;

  private wallclockTimer: ReturnType<typeof setTimeout> | undefined;

  constructor(options: FlowQuotaOptions = {}) {
    this.limits = {
      ...DEFAULT_QUOTA_LIMITS,
      ...options.limits,
      apiCallLimits: {
        ...DEFAULT_QUOTA_LIMITS.apiCallLimits,
        ...(options.limits?.apiCallLimits ?? {}),
      },
    };
    this.startedAt = Date.now();
    this.abortController = new AbortController();
  }

  /** AbortSignal suitable for attaching to ActionContext.signal */
  get signal(): AbortSignal {
    return this.abortController.signal;
  }

  /**
   * Charge one action execution and its credit cost. Throws
   * QuotaExceededError on exceeded; propagates as abort.
   */
  charge(cost = 1): void {
    const nextOps = this.operations + 1;
    if (nextOps > this.limits.maxOperations) {
      throw new QuotaExceededError('operations', this.limits.maxOperations, nextOps);
    }
    const nextCredits = this.credits + Math.max(0, cost);
    if (nextCredits > this.limits.maxCredits) {
      throw new QuotaExceededError('credits', this.limits.maxCredits, nextCredits);
    }
    this.operations = nextOps;
    this.credits = nextCredits;
    if (this.abortController.signal.aborted) {
      throw this.abortReason();
    }
  }

  /**
   * Charge a Discord API call against a per-bucket cap. Throws
   * QuotaExceededError when the bucket cap would be exceeded.
   */
  chargeApi(bucket: string, count = 1): void {
    const limit = this.limits.apiCallLimits[bucket];
    if (limit === undefined) {
      return;
    }
    const next = (this.apiCallCounts.get(bucket) ?? 0) + count;
    if (next > limit) {
      throw new QuotaExceededError(`api:${bucket}`, limit, next);
    }
    this.apiCallCounts.set(bucket, next);
  }

  /** Throws QuotaExceededError with metric `stack_depth` if the given
   *  depth exceeds the configured limit. */
  checkStackDepth(depth: number): void {
    if (depth >= this.limits.maxStackDepth) {
      throw new QuotaExceededError('stack_depth', this.limits.maxStackDepth, depth);
    }
  }

  /** Start the wallclock timer. Safe to call once. */
  startWallclock(): void {
    if (this.wallclockTimer) return;
    if (this.limits.wallclockMs <= 0) return;
    this.wallclockTimer = setTimeout(() => {
      this.wallclockExceeded = true;
      const err = new QuotaExceededError(
        'wallclock',
        this.limits.wallclockMs,
        Date.now() - this.startedAt
      );
      this.abortController.abort(err);
    }, this.limits.wallclockMs);
    const timer = this.wallclockTimer as unknown as { unref?: () => void };
    if (typeof timer.unref === 'function') {
      timer.unref();
    }
  }

  /** Abort the handler cooperatively (used by tests and shutdown). */
  abort(reason?: unknown): void {
    this.abortController.abort(reason);
  }

  /** Release the wallclock timer. Idempotent. */
  dispose(): void {
    if (this.wallclockTimer) {
      clearTimeout(this.wallclockTimer);
      this.wallclockTimer = undefined;
    }
  }

  private abortReason(): Error {
    const reason = this.abortController.signal.reason;
    if (reason instanceof Error) {
      return reason;
    }
    return new QuotaExceededError('wallclock', this.limits.wallclockMs, Date.now() - this.startedAt);
  }
}

/** Convenience factory. */
export function createFlowQuota(options?: FlowQuotaOptions): FlowQuota {
  return new FlowQuota(options);
}

/** Parse a duration string (`"30s"`, `"500ms"`, `"2m"`, `"1h"`) or raw milliseconds. */
export function parseQuotaDuration(input: string | number | undefined): number | undefined {
  if (input === undefined) return undefined;
  if (typeof input === 'number') return input;
  const match = input.trim().match(/^(\d+)(ms|s|m|h)?$/);
  if (!match) return undefined;
  const value = parseInt(match[1]!, 10);
  const unit = match[2] ?? 'ms';
  switch (unit) {
    case 'ms': return value;
    case 's': return value * 1000;
    case 'm': return value * 60 * 1000;
    case 'h': return value * 60 * 60 * 1000;
    default: return value;
  }
}
