/**
 * Tests for M3 fan-out cap. Verifies that a single event emission only
 * fires the first N matching handlers and warns exactly once per event
 * name.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createEventRouter, type EventRouter } from '../router.js';
import type { EventHandler } from '@furlow/schema';
import type { ActionContext } from '../../actions/types.js';
import type { ActionExecutor } from '../../actions/executor.js';
import type { ExpressionEvaluator } from '../../expression/evaluator.js';

function makeHandler(overrides: Partial<EventHandler> = {}): EventHandler {
  return {
    event: 'message_create',
    actions: [{ action: 'log', message: 'hi' } as never],
    ...overrides,
  };
}

describe('EventRouter fan-out cap (M3)', () => {
  let router: EventRouter;
  let executor: ActionExecutor;
  let evaluator: ExpressionEvaluator;
  let context: ActionContext;
  let executeSequence: ReturnType<typeof vi.fn>;
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    executeSequence = vi.fn().mockResolvedValue([]);
    executor = {
      executeOne: vi.fn().mockResolvedValue({ success: true }),
      executeAll: vi.fn().mockResolvedValue([]),
      executeSequence,
    } as unknown as ActionExecutor;

    evaluator = {
      evaluate: vi.fn().mockResolvedValue(true),
      interpolate: vi.fn().mockImplementation(async (s) => s),
    } as unknown as ExpressionEvaluator;

    context = {
      guildId: 'g',
      channelId: 'c',
      userId: 'u',
      client: {},
      stateManager: {},
      evaluator,
      flowExecutor: {},
    } as ActionContext;

    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    router?.clear();
    warnSpy.mockRestore();
  });

  it('fires only the first 10 handlers by default when 15 are registered', async () => {
    router = createEventRouter();
    for (let i = 0; i < 15; i++) router.register(makeHandler());

    await router.emit('message_create', context, executor, evaluator);

    expect(executeSequence).toHaveBeenCalledTimes(10);
  });

  it('respects a custom maxFiringPerEvent constructor option', async () => {
    router = createEventRouter({ maxFiringPerEvent: 3 });
    for (let i = 0; i < 5; i++) router.register(makeHandler());

    await router.emit('message_create', context, executor, evaluator);

    expect(executeSequence).toHaveBeenCalledTimes(3);
  });

  it('fires everything below the cap without warning', async () => {
    router = createEventRouter();
    for (let i = 0; i < 5; i++) router.register(makeHandler());

    await router.emit('message_create', context, executor, evaluator);

    expect(executeSequence).toHaveBeenCalledTimes(5);
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('warns once per event name when truncation happens', async () => {
    router = createEventRouter({ maxFiringPerEvent: 2 });
    for (let i = 0; i < 5; i++) router.register(makeHandler());

    await router.emit('message_create', context, executor, evaluator);
    await router.emit('message_create', context, executor, evaluator);
    await router.emit('message_create', context, executor, evaluator);

    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy.mock.calls[0]?.[0]).toContain('message_create');
    expect(warnSpy.mock.calls[0]?.[0]).toContain('5');
    expect(warnSpy.mock.calls[0]?.[0]).toContain('2');
  });

  it('warns separately for each distinct event name', async () => {
    router = createEventRouter({ maxFiringPerEvent: 1 });
    router.register(makeHandler({ event: 'message_create' }));
    router.register(makeHandler({ event: 'message_create' }));
    router.register(makeHandler({ event: 'member_join' }));
    router.register(makeHandler({ event: 'member_join' }));

    await router.emit('message_create', context, executor, evaluator);
    await router.emit('member_join', context, executor, evaluator);

    expect(warnSpy).toHaveBeenCalledTimes(2);
  });

  it('honors handler.maxHandlers override over the global default', async () => {
    router = createEventRouter(); // default 10
    // First handler declares maxHandlers: 2; that value wins.
    router.register(makeHandler({ maxHandlers: 2 }));
    for (let i = 0; i < 8; i++) router.register(makeHandler());

    await router.emit('message_create', context, executor, evaluator);

    expect(executeSequence).toHaveBeenCalledTimes(2);
  });

  it('the existing registration cap still throws past 100', () => {
    router = createEventRouter();
    for (let i = 0; i < 100; i++) router.register(makeHandler());

    expect(() => router.register(makeHandler())).toThrow(/Maximum handlers/);
  });
});
