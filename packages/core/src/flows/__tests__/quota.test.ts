/**
 * FlowQuota tests
 *
 * Covers: operations cap, credits cap, wallclock abort, stack depth,
 * api-bucket caps, and end-to-end enforcement through the EventRouter.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  FlowQuota,
  DEFAULT_QUOTA_LIMITS,
  parseQuotaDuration,
} from '../quota.js';
import { QuotaExceededError } from '../../errors/index.js';
import { FlowEngine } from '../engine.js';
import { createActionExecutor, ActionExecutor } from '../../actions/executor.js';
import { createActionRegistry, ActionRegistry } from '../../actions/registry.js';
import { createEvaluator } from '../../expression/evaluator.js';
import { createEventRouter } from '../../events/router.js';
import type { Action } from '@furlow/schema';
import type { ActionContext, ActionHandler, ActionResult } from '../../actions/types.js';

function ctx(over: Partial<ActionContext> = {}): ActionContext {
  return {
    guildId: 'g',
    channelId: 'c',
    userId: 'u',
    client: {},
    stateManager: {},
    evaluator: {},
    flowExecutor: {},
    ...over,
  } as ActionContext;
}

describe('FlowQuota', () => {
  describe('charge', () => {
    it('increments operations and credits with a default cost of 1', () => {
      const q = new FlowQuota();
      q.charge();
      expect(q.operations).toBe(1);
      expect(q.credits).toBe(1);
    });

    it('throws QuotaExceededError on operations overflow', () => {
      const q = new FlowQuota({ limits: { maxOperations: 2 } });
      q.charge(1);
      q.charge(1);
      try {
        q.charge(1);
        expect.fail('should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(QuotaExceededError);
        expect((err as QuotaExceededError).metric).toBe('operations');
        expect((err as QuotaExceededError).limit).toBe(2);
      }
    });

    it('throws QuotaExceededError on credits overflow', () => {
      const q = new FlowQuota({ limits: { maxCredits: 10 } });
      q.charge(5);
      q.charge(5);
      try {
        q.charge(1);
        expect.fail('should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(QuotaExceededError);
        expect((err as QuotaExceededError).metric).toBe('credits');
      }
    });

    it('reports the metric in QuotaExceededError.context', () => {
      const q = new FlowQuota({ limits: { maxOperations: 1 } });
      q.charge(1);
      try {
        q.charge(1);
      } catch (err) {
        expect((err as QuotaExceededError).code).toBe('E5005');
        expect((err as QuotaExceededError).context.metric).toBe('operations');
      }
    });
  });

  describe('chargeApi', () => {
    it('enforces per-bucket caps', () => {
      const q = new FlowQuota({ limits: { apiCallLimits: { send_dm: 1 } } });
      q.chargeApi('send_dm');
      try {
        q.chargeApi('send_dm');
        expect.fail('should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(QuotaExceededError);
        expect((err as QuotaExceededError).metric).toBe('api:send_dm');
      }
    });

    it('ignores unknown buckets silently (no cap configured)', () => {
      const q = new FlowQuota();
      expect(() => q.chargeApi('unconfigured_bucket')).not.toThrow();
    });
  });

  describe('stack depth', () => {
    it('throws when depth >= limit', () => {
      const q = new FlowQuota({ limits: { maxStackDepth: 3 } });
      expect(() => q.checkStackDepth(3)).toThrow(QuotaExceededError);
      expect(() => q.checkStackDepth(2)).not.toThrow();
    });
  });

  describe('wallclock', () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it('aborts the signal when the budget elapses', () => {
      const q = new FlowQuota({ limits: { wallclockMs: 100 } });
      q.startWallclock();
      expect(q.signal.aborted).toBe(false);
      vi.advanceTimersByTime(100);
      expect(q.signal.aborted).toBe(true);
      expect(q.wallclockExceeded).toBe(true);
      expect(q.signal.reason).toBeInstanceOf(QuotaExceededError);
      q.dispose();
    });

    it('dispose() cancels the timer', () => {
      const q = new FlowQuota({ limits: { wallclockMs: 100 } });
      q.startWallclock();
      q.dispose();
      vi.advanceTimersByTime(200);
      expect(q.signal.aborted).toBe(false);
    });
  });

  describe('parseQuotaDuration', () => {
    it('handles ms, s, m, h suffixes', () => {
      expect(parseQuotaDuration('250ms')).toBe(250);
      expect(parseQuotaDuration('3s')).toBe(3000);
      expect(parseQuotaDuration('2m')).toBe(120_000);
      expect(parseQuotaDuration('1h')).toBe(3_600_000);
    });
    it('treats bare numbers as milliseconds', () => {
      expect(parseQuotaDuration('500')).toBe(500);
      expect(parseQuotaDuration(500)).toBe(500);
    });
    it('returns undefined on garbage', () => {
      expect(parseQuotaDuration('nope')).toBeUndefined();
      expect(parseQuotaDuration(undefined)).toBeUndefined();
    });
  });

  describe('defaults', () => {
    it('keeps maxStackDepth at 50 to preserve existing behaviour', () => {
      expect(DEFAULT_QUOTA_LIMITS.maxStackDepth).toBe(50);
    });
  });
});

describe('FlowQuota integration', () => {
  let registry: ActionRegistry;
  let executor: ActionExecutor;

  beforeEach(() => {
    registry = createActionRegistry();
    registry.register({
      name: 'noop',
      async execute(): Promise<ActionResult> {
        return { success: true };
      },
    } satisfies ActionHandler);
    executor = createActionExecutor(registry, createEvaluator());
  });

  it('aborts a large repeat loop via the flow engine when ops exhaust', async () => {
    const engine = new FlowEngine();
    engine.register({
      name: 'flood',
      actions: [
        {
          action: 'repeat',
          times: 10_000,
          do: [{ action: 'noop' }],
        } as unknown as Action,
      ],
    });

    const quota = new FlowQuota({ limits: { maxOperations: 100 } });
    const context = ctx({ quota, signal: quota.signal });

    await expect(
      engine.execute('flood', {}, context, executor, createEvaluator())
    ).rejects.toBeInstanceOf(QuotaExceededError);

    expect(quota.operations).toBeLessThanOrEqual(100);
  });

  it('refuses to dispatch once the abort signal is already set', async () => {
    const quota = new FlowQuota();
    quota.abort(new QuotaExceededError('wallclock', 0, 1));
    const context = ctx({ quota, signal: quota.signal });

    const result = await executor.executeOne({ action: 'noop' } as Action, context);
    expect(result.success).toBe(false);
  });

  it('stops charging across nested call_flow when quota is shared', async () => {
    const engine = new FlowEngine();
    engine.register({
      name: 'inner',
      actions: [{ action: 'noop' } as Action, { action: 'noop' } as Action],
    });
    engine.register({
      name: 'outer',
      actions: [
        { action: 'call_flow', flow: 'inner' } as unknown as Action,
        { action: 'call_flow', flow: 'inner' } as unknown as Action,
        { action: 'call_flow', flow: 'inner' } as unknown as Action,
      ],
    });

    const quota = new FlowQuota({ limits: { maxOperations: 3 } });
    const context = ctx({ quota, signal: quota.signal });

    await expect(
      engine.execute('outer', {}, context, executor, createEvaluator())
    ).rejects.toBeInstanceOf(QuotaExceededError);
  });
});

describe('EventRouter quota wiring', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('attaches a quota to the context and disposes on finish', async () => {
    const router = createEventRouter();
    const registry = createActionRegistry();

    let seenQuota: FlowQuota | undefined;
    registry.register({
      name: 'probe',
      async execute(_a, context): Promise<ActionResult> {
        seenQuota = context.quota;
        return { success: true };
      },
    } satisfies ActionHandler);

    const executor = createActionExecutor(registry, createEvaluator());
    const evaluator = createEvaluator();
    const context = ctx();

    router.register({ event: 'message_create', actions: [{ action: 'probe' }] });

    await router.emit('message_create', context, executor, evaluator);

    expect(seenQuota).toBeInstanceOf(FlowQuota);
    expect(context.quota).toBeUndefined();
  });

  it('aborts a stuck handler via the per-handler timeout', async () => {
    const router = createEventRouter();
    const registry = createActionRegistry();

    registry.register({
      name: 'stuck',
      async execute(_a, context): Promise<ActionResult> {
        return new Promise((resolve) => {
          context.signal?.addEventListener('abort', () => {
            resolve({ success: false });
          });
        });
      },
    } satisfies ActionHandler);

    const executor = createActionExecutor(registry, createEvaluator());
    const evaluator = createEvaluator();
    const context = ctx();

    router.register({
      event: 'message_create',
      actions: [{ action: 'stuck' }],
      timeout: '100ms',
    });

    const pending = router.emit('message_create', context, executor, evaluator);
    vi.advanceTimersByTime(100);
    await pending;
  });

  it('truncates with quota-scoped send_dm bucket to 1 per invocation', async () => {
    vi.useRealTimers();
    const router = createEventRouter();
    const registry = createActionRegistry();

    const calls: number[] = [];
    registry.register({
      name: 'fake_send_dm',
      cost: 5,
      async execute(_a, context): Promise<ActionResult> {
        context.quota?.chargeApi('send_dm');
        calls.push(1);
        return { success: true };
      },
    } satisfies ActionHandler);

    const executor = createActionExecutor(registry, createEvaluator());
    const evaluator = createEvaluator();
    const context = ctx();

    router.register({
      event: 'message_create',
      actions: [
        { action: 'fake_send_dm' },
        { action: 'fake_send_dm' },
      ],
    });

    await router.emit('message_create', context, executor, evaluator);
    // First call succeeds; second call throws from chargeApi inside the
    // handler and is swallowed as an abort at the router.
    expect(calls.length).toBe(1);
  });
});
