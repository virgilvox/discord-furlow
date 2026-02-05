/**
 * Event router tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EventRouter, createEventRouter, type RouterOptions } from '../router.js';
import type { EventHandler } from '@furlow/schema';
import type { ActionContext } from '../../actions/types.js';
import type { ActionExecutor } from '../../actions/executor.js';
import type { ExpressionEvaluator } from '../../expression/evaluator.js';

describe('EventRouter', () => {
  let router: EventRouter;
  let mockExecutor: ActionExecutor;
  let mockEvaluator: ExpressionEvaluator;
  let mockContext: ActionContext;

  beforeEach(() => {
    vi.useFakeTimers();
    router = createEventRouter();

    mockExecutor = {
      executeOne: vi.fn().mockResolvedValue({ success: true }),
      executeAll: vi.fn().mockResolvedValue([]),
      executeSequence: vi.fn().mockResolvedValue([]),
    } as unknown as ActionExecutor;

    mockEvaluator = {
      evaluate: vi.fn().mockResolvedValue(true),
      interpolate: vi.fn().mockImplementation(async (s) => s),
    } as unknown as ExpressionEvaluator;

    mockContext = {
      guildId: 'guild-123',
      channelId: 'channel-123',
      userId: 'user-123',
      client: {},
      stateManager: {},
      evaluator: mockEvaluator,
      flowExecutor: {},
    } as ActionContext;
  });

  afterEach(() => {
    router.clear();
    vi.useRealTimers();
  });

  describe('register', () => {
    it('should register a handler and return an ID', () => {
      const handler: EventHandler = {
        event: 'message_create',
        actions: [{ action: 'log', message: 'test' }],
      };

      const id = router.register(handler);

      expect(id).toMatch(/^handler_\d+$/);
      expect(router.getRegisteredEvents()).toContain('message_create');
    });

    it('should store handler correctly', () => {
      const handler: EventHandler = {
        event: 'member_join',
        actions: [{ action: 'send_dm', content: 'Welcome!' }],
        once: true,
      };

      const id = router.register(handler);
      const handlers = router.getHandlers('member_join');

      expect(handlers).toHaveLength(1);
      expect(handlers[0].id).toBe(id);
      expect(handlers[0].handler).toBe(handler);
      expect(handlers[0].once).toBe(true);
      expect(handlers[0].active).toBe(true);
    });

    it('should default once to false', () => {
      const handler: EventHandler = {
        event: 'reaction_add',
        actions: [],
      };

      router.register(handler);
      const handlers = router.getHandlers('reaction_add');

      expect(handlers[0].once).toBe(false);
    });

    it('should allow multiple handlers for same event', () => {
      router.register({ event: 'message_create', actions: [] });
      router.register({ event: 'message_create', actions: [] });
      router.register({ event: 'message_create', actions: [] });

      const handlers = router.getHandlers('message_create');
      expect(handlers).toHaveLength(3);
    });

    it('should throw when max handlers reached', () => {
      const limitedRouter = createEventRouter({ maxHandlersPerEvent: 2 });

      limitedRouter.register({ event: 'test', actions: [] });
      limitedRouter.register({ event: 'test', actions: [] });

      expect(() => {
        limitedRouter.register({ event: 'test', actions: [] });
      }).toThrow('Maximum handlers (2) reached for event "test"');
    });

    it('should generate unique IDs', () => {
      const id1 = router.register({ event: 'e1', actions: [] });
      const id2 = router.register({ event: 'e2', actions: [] });
      const id3 = router.register({ event: 'e1', actions: [] });

      expect(id1).not.toBe(id2);
      expect(id2).not.toBe(id3);
      expect(id1).not.toBe(id3);
    });
  });

  describe('registerAll', () => {
    it('should register multiple handlers', () => {
      const handlers: EventHandler[] = [
        { event: 'message_create', actions: [] },
        { event: 'member_join', actions: [] },
        { event: 'reaction_add', actions: [] },
      ];

      const ids = router.registerAll(handlers);

      expect(ids).toHaveLength(3);
      expect(router.getRegisteredEvents()).toHaveLength(3);
    });

    it('should return IDs in order', () => {
      const handlers: EventHandler[] = [
        { event: 'e1', actions: [] },
        { event: 'e2', actions: [] },
      ];

      const ids = router.registerAll(handlers);

      expect(ids[0]).toMatch(/^handler_\d+$/);
      expect(ids[1]).toMatch(/^handler_\d+$/);
      expect(parseInt(ids[1].split('_')[1]!)).toBeGreaterThan(
        parseInt(ids[0].split('_')[1]!)
      );
    });
  });

  describe('unregister', () => {
    it('should unregister a handler by ID', () => {
      const id = router.register({ event: 'test', actions: [] });

      const result = router.unregister(id);

      expect(result).toBe(true);
      expect(router.getHandlers('test')).toHaveLength(0);
    });

    it('should return false for non-existent ID', () => {
      const result = router.unregister('nonexistent');
      expect(result).toBe(false);
    });

    it('should remove event from map when last handler removed', () => {
      const id = router.register({ event: 'solo', actions: [] });

      router.unregister(id);

      expect(router.getRegisteredEvents()).not.toContain('solo');
    });

    it('should not remove event when other handlers remain', () => {
      router.register({ event: 'shared', actions: [] });
      const id2 = router.register({ event: 'shared', actions: [] });

      router.unregister(id2);

      expect(router.getRegisteredEvents()).toContain('shared');
      expect(router.getHandlers('shared')).toHaveLength(1);
    });
  });

  describe('emit', () => {
    it('should execute handler actions', async () => {
      router.register({
        event: 'test_event',
        actions: [{ action: 'log', message: 'hello' }],
      });

      await router.emit('test_event', mockContext, mockExecutor, mockEvaluator);

      expect(mockExecutor.executeSequence).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ action: 'log', message: 'hello' }),
        ]),
        mockContext
      );
    });

    it('should execute all handlers for event', async () => {
      router.register({ event: 'multi', actions: [{ action: 'log', message: '1' }] });
      router.register({ event: 'multi', actions: [{ action: 'log', message: '2' }] });

      await router.emit('multi', mockContext, mockExecutor, mockEvaluator);

      expect(mockExecutor.executeSequence).toHaveBeenCalledTimes(2);
    });

    it('should not execute handlers for other events', async () => {
      router.register({ event: 'event_a', actions: [] });
      router.register({ event: 'event_b', actions: [] });

      await router.emit('event_a', mockContext, mockExecutor, mockEvaluator);

      expect(mockExecutor.executeSequence).toHaveBeenCalledTimes(1);
    });

    it('should not execute inactive handlers', async () => {
      const id = router.register({
        event: 'inactive',
        actions: [{ action: 'log', message: 'inactive' }],
      });

      // Get and deactivate handler
      const handlers = router.getHandlers('inactive');
      handlers[0].active = false;

      await router.emit('inactive', mockContext, mockExecutor, mockEvaluator);

      expect(mockExecutor.executeSequence).not.toHaveBeenCalled();
    });

    it('should do nothing for unregistered events', async () => {
      await router.emit('unknown', mockContext, mockExecutor, mockEvaluator);

      expect(mockExecutor.executeSequence).not.toHaveBeenCalled();
    });
  });

  describe('once handlers', () => {
    it('should deactivate after first execution', async () => {
      router.register({
        event: 'once_event',
        actions: [{ action: 'log', message: 'once' }],
        once: true,
      });

      await router.emit('once_event', mockContext, mockExecutor, mockEvaluator);
      await router.emit('once_event', mockContext, mockExecutor, mockEvaluator);

      expect(mockExecutor.executeSequence).toHaveBeenCalledTimes(1);
    });

    it('should mark handler as inactive after execution', async () => {
      router.register({
        event: 'once_check',
        actions: [],
        once: true,
      });

      await router.emit('once_check', mockContext, mockExecutor, mockEvaluator);

      const handlers = router.getHandlers('once_check');
      expect(handlers[0].active).toBe(false);
    });
  });

  describe('when condition', () => {
    it('should evaluate condition before execution', async () => {
      router.register({
        event: 'conditional',
        when: 'user.isAdmin',
        actions: [{ action: 'log', message: 'admin action' }],
      });

      await router.emit('conditional', mockContext, mockExecutor, mockEvaluator);

      expect(mockEvaluator.evaluate).toHaveBeenCalledWith(
        'user.isAdmin',
        mockContext
      );
    });

    it('should execute when condition is true', async () => {
      (mockEvaluator.evaluate as ReturnType<typeof vi.fn>).mockResolvedValue(true);

      router.register({
        event: 'cond_true',
        when: 'true',
        actions: [{ action: 'log', message: 'executed' }],
      });

      await router.emit('cond_true', mockContext, mockExecutor, mockEvaluator);

      expect(mockExecutor.executeSequence).toHaveBeenCalled();
    });

    it('should skip when condition is false', async () => {
      (mockEvaluator.evaluate as ReturnType<typeof vi.fn>).mockResolvedValue(false);

      router.register({
        event: 'cond_false',
        when: 'false',
        actions: [{ action: 'log', message: 'skipped' }],
      });

      await router.emit('cond_false', mockContext, mockExecutor, mockEvaluator);

      expect(mockExecutor.executeSequence).not.toHaveBeenCalled();
    });

    it('should handle object conditions as true', async () => {
      router.register({
        event: 'obj_cond',
        when: { expr: 'complex.condition' } as any,
        actions: [],
      });

      await router.emit('obj_cond', mockContext, mockExecutor, mockEvaluator);

      // Object conditions default to true in current implementation
      expect(mockExecutor.executeSequence).toHaveBeenCalled();
    });
  });

  describe('debounce', () => {
    it('should delay execution by debounce time', async () => {
      router.register({
        event: 'debounced',
        debounce: '100ms',
        actions: [{ action: 'log', message: 'debounced' }],
      });

      await router.emit('debounced', mockContext, mockExecutor, mockEvaluator);

      expect(mockExecutor.executeSequence).not.toHaveBeenCalled();

      await vi.advanceTimersByTimeAsync(100);

      expect(mockExecutor.executeSequence).toHaveBeenCalled();
    });

    it('should reset debounce on subsequent emits', async () => {
      router.register({
        event: 'reset_debounce',
        debounce: '100ms',
        actions: [{ action: 'log', message: 'debounced' }],
      });

      await router.emit('reset_debounce', mockContext, mockExecutor, mockEvaluator);
      await vi.advanceTimersByTimeAsync(50);

      // Emit again - should reset timer
      await router.emit('reset_debounce', mockContext, mockExecutor, mockEvaluator);
      await vi.advanceTimersByTimeAsync(50);

      // Should not have fired yet
      expect(mockExecutor.executeSequence).not.toHaveBeenCalled();

      await vi.advanceTimersByTimeAsync(50);

      // Now it should fire
      expect(mockExecutor.executeSequence).toHaveBeenCalledTimes(1);
    });

    it('should parse different time units', async () => {
      router.register({
        event: 'debounce_seconds',
        debounce: '2s',
        actions: [],
      });

      await router.emit('debounce_seconds', mockContext, mockExecutor, mockEvaluator);

      await vi.advanceTimersByTimeAsync(1500);
      expect(mockExecutor.executeSequence).not.toHaveBeenCalled();

      await vi.advanceTimersByTimeAsync(600);
      expect(mockExecutor.executeSequence).toHaveBeenCalled();
    });
  });

  describe('throttle', () => {
    it('should execute immediately first time', async () => {
      router.register({
        event: 'throttled',
        throttle: '1s',
        actions: [{ action: 'log', message: 'throttled' }],
      });

      await router.emit('throttled', mockContext, mockExecutor, mockEvaluator);

      expect(mockExecutor.executeSequence).toHaveBeenCalledTimes(1);
    });

    it('should skip executions within throttle window', async () => {
      router.register({
        event: 'throttle_skip',
        throttle: '1s',
        actions: [],
      });

      await router.emit('throttle_skip', mockContext, mockExecutor, mockEvaluator);
      await router.emit('throttle_skip', mockContext, mockExecutor, mockEvaluator);
      await router.emit('throttle_skip', mockContext, mockExecutor, mockEvaluator);

      expect(mockExecutor.executeSequence).toHaveBeenCalledTimes(1);
    });

    it('should allow execution after throttle window', async () => {
      router.register({
        event: 'throttle_allow',
        throttle: '100ms',
        actions: [],
      });

      await router.emit('throttle_allow', mockContext, mockExecutor, mockEvaluator);

      await vi.advanceTimersByTimeAsync(150);

      await router.emit('throttle_allow', mockContext, mockExecutor, mockEvaluator);

      expect(mockExecutor.executeSequence).toHaveBeenCalledTimes(2);
    });

    it('should parse different time units', async () => {
      router.register({
        event: 'throttle_minutes',
        throttle: '1m',
        actions: [],
      });

      await router.emit('throttle_minutes', mockContext, mockExecutor, mockEvaluator);

      await vi.advanceTimersByTimeAsync(30000);
      await router.emit('throttle_minutes', mockContext, mockExecutor, mockEvaluator);
      expect(mockExecutor.executeSequence).toHaveBeenCalledTimes(1);

      await vi.advanceTimersByTimeAsync(30001);
      await router.emit('throttle_minutes', mockContext, mockExecutor, mockEvaluator);
      expect(mockExecutor.executeSequence).toHaveBeenCalledTimes(2);
    });
  });

  describe('action normalization', () => {
    it('should normalize shorthand actions', async () => {
      router.register({
        event: 'normalize',
        actions: [
          { reply: { content: 'Hello!' } } as any,
          { send_message: { channel: 'general', content: 'Test' } } as any,
        ],
      });

      await router.emit('normalize', mockContext, mockExecutor, mockEvaluator);

      expect(mockExecutor.executeSequence).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ action: 'reply', content: 'Hello!' }),
          expect.objectContaining({
            action: 'send_message',
            channel: 'general',
            content: 'Test',
          }),
        ]),
        mockContext
      );
    });

    it('should preserve already normalized actions', async () => {
      router.register({
        event: 'already_normal',
        actions: [{ action: 'log', message: 'test' }],
      });

      await router.emit('already_normal', mockContext, mockExecutor, mockEvaluator);

      expect(mockExecutor.executeSequence).toHaveBeenCalledWith(
        [{ action: 'log', message: 'test' }],
        mockContext
      );
    });

    it('should preserve when and error_handler in shorthand', async () => {
      router.register({
        event: 'preserve_meta',
        actions: [
          {
            log: { message: 'test' },
            when: 'condition',
            error_handler: [{ action: 'log', message: 'error' }],
          } as any,
        ],
      });

      await router.emit('preserve_meta', mockContext, mockExecutor, mockEvaluator);

      expect(mockExecutor.executeSequence).toHaveBeenCalledWith(
        [
          expect.objectContaining({
            action: 'log',
            message: 'test',
            when: 'condition',
            error_handler: [{ action: 'log', message: 'error' }],
          }),
        ],
        mockContext
      );
    });
  });

  describe('getRegisteredEvents', () => {
    it('should return all event names', () => {
      router.register({ event: 'event_a', actions: [] });
      router.register({ event: 'event_b', actions: [] });
      router.register({ event: 'event_c', actions: [] });

      const events = router.getRegisteredEvents();

      expect(events).toHaveLength(3);
      expect(events).toContain('event_a');
      expect(events).toContain('event_b');
      expect(events).toContain('event_c');
    });

    it('should return unique events', () => {
      router.register({ event: 'same', actions: [] });
      router.register({ event: 'same', actions: [] });

      const events = router.getRegisteredEvents();

      expect(events).toHaveLength(1);
    });

    it('should return empty array when no handlers', () => {
      expect(router.getRegisteredEvents()).toEqual([]);
    });
  });

  describe('getHandlers', () => {
    it('should return handlers for event', () => {
      router.register({ event: 'test', actions: [] });
      router.register({ event: 'test', actions: [] });

      const handlers = router.getHandlers('test');

      expect(handlers).toHaveLength(2);
    });

    it('should return empty array for unregistered event', () => {
      expect(router.getHandlers('unknown')).toEqual([]);
    });
  });

  describe('clear', () => {
    it('should remove all handlers', () => {
      router.register({ event: 'e1', actions: [] });
      router.register({ event: 'e2', actions: [] });

      router.clear();

      expect(router.getRegisteredEvents()).toEqual([]);
    });

    it('should clear debounce timers', async () => {
      router.register({
        event: 'debounced',
        debounce: '1s',
        actions: [],
      });

      await router.emit('debounced', mockContext, mockExecutor, mockEvaluator);

      router.clear();

      await vi.advanceTimersByTimeAsync(2000);

      // Should not execute after clear
      expect(mockExecutor.executeSequence).not.toHaveBeenCalled();
    });

    it('should clear throttle state', async () => {
      router.register({
        event: 'throttled',
        throttle: '10s',
        actions: [],
      });

      await router.emit('throttled', mockContext, mockExecutor, mockEvaluator);

      router.clear();

      // Re-register after clear
      router.register({
        event: 'throttled',
        throttle: '10s',
        actions: [],
      });

      await router.emit('throttled', mockContext, mockExecutor, mockEvaluator);

      // Should execute because throttle state was cleared
      expect(mockExecutor.executeSequence).toHaveBeenCalledTimes(2);
    });
  });

  describe('options', () => {
    it('should use default options', () => {
      const defaultRouter = createEventRouter();

      // Should allow up to 100 handlers
      for (let i = 0; i < 100; i++) {
        defaultRouter.register({ event: 'test', actions: [] });
      }

      expect(defaultRouter.getHandlers('test')).toHaveLength(100);
    });

    it('should accept custom maxHandlersPerEvent', () => {
      const customRouter = createEventRouter({ maxHandlersPerEvent: 5 });

      for (let i = 0; i < 5; i++) {
        customRouter.register({ event: 'limited', actions: [] });
      }

      expect(() => {
        customRouter.register({ event: 'limited', actions: [] });
      }).toThrow();
    });
  });
});

describe('createEventRouter', () => {
  it('should create a new EventRouter instance', () => {
    const router = createEventRouter();
    expect(router).toBeInstanceOf(EventRouter);
    expect(router.getRegisteredEvents()).toEqual([]);
  });

  it('should accept options', () => {
    const options: RouterOptions = {
      maxHandlersPerEvent: 10,
      defaultDebounce: 100,
      defaultThrottle: 200,
    };

    const router = createEventRouter(options);
    expect(router).toBeInstanceOf(EventRouter);
  });
});

describe('High-level Events', () => {
  let router: EventRouter;
  let mockExecutor: ActionExecutor;
  let mockEvaluator: ExpressionEvaluator;
  let mockContext: ActionContext;

  beforeEach(() => {
    router = createEventRouter();

    mockExecutor = {
      executeOne: vi.fn().mockResolvedValue({ success: true }),
      executeAll: vi.fn().mockResolvedValue([]),
      executeSequence: vi.fn().mockResolvedValue([]),
    } as unknown as ActionExecutor;

    mockEvaluator = {
      evaluate: vi.fn().mockResolvedValue(true),
      interpolate: vi.fn().mockImplementation(async (s) => s),
    } as unknown as ExpressionEvaluator;

    mockContext = {
      guildId: 'guild-123',
      channelId: 'channel-123',
      userId: 'user-123',
      client: {},
      stateManager: {},
      evaluator: mockEvaluator,
      flowExecutor: {},
    } as ActionContext;
  });

  afterEach(() => {
    router.clear();
  });

  describe('member ban events', () => {
    it('should emit member_ban event', async () => {
      router.register({
        event: 'member_ban',
        actions: [{ action: 'log', message: 'User banned' }],
      });

      const banContext = {
        ...mockContext,
        user: { id: 'banned-user', username: 'BadUser' },
        reason: 'Violation of rules',
      };

      await router.emit('member_ban', banContext as any, mockExecutor, mockEvaluator);
      expect(mockExecutor.executeSequence).toHaveBeenCalled();
    });

    it('should emit member_unban event', async () => {
      router.register({
        event: 'member_unban',
        actions: [{ action: 'log', message: 'User unbanned' }],
      });

      await router.emit('member_unban', mockContext, mockExecutor, mockEvaluator);
      expect(mockExecutor.executeSequence).toHaveBeenCalled();
    });

    it('should provide ban reason in context', async () => {
      router.register({
        event: 'member_ban',
        actions: [{ action: 'log', message: 'banned' }],
      });

      const banContext = {
        ...mockContext,
        reason: 'Spamming',
      };

      await router.emit('member_ban', banContext as any, mockExecutor, mockEvaluator);
      expect(mockExecutor.executeSequence).toHaveBeenCalledWith(
        expect.any(Array),
        expect.objectContaining({ reason: 'Spamming' })
      );
    });
  });

  describe('member boost events', () => {
    it('should emit member_boost when user starts boosting', async () => {
      router.register({
        event: 'member_boost',
        actions: [{ action: 'reply', content: 'Thanks for boosting!' }],
      });

      const boostContext = {
        ...mockContext,
        boost_since: new Date(),
      };

      await router.emit('member_boost', boostContext as any, mockExecutor, mockEvaluator);
      expect(mockExecutor.executeSequence).toHaveBeenCalled();
    });

    it('should emit member_unboost when user stops boosting', async () => {
      router.register({
        event: 'member_unboost',
        actions: [{ action: 'log', message: 'Boost ended' }],
      });

      await router.emit('member_unboost', mockContext, mockExecutor, mockEvaluator);
      expect(mockExecutor.executeSequence).toHaveBeenCalled();
    });

    it('should provide boost_since in context', async () => {
      router.register({
        event: 'member_boost',
        actions: [{ action: 'log', message: 'boosted' }],
      });

      const boostDate = new Date('2024-01-15');
      const boostContext = {
        ...mockContext,
        boost_since: boostDate,
      };

      await router.emit('member_boost', boostContext as any, mockExecutor, mockEvaluator);
      expect(mockExecutor.executeSequence).toHaveBeenCalledWith(
        expect.any(Array),
        expect.objectContaining({ boost_since: boostDate })
      );
    });
  });

  describe('voice streaming events', () => {
    it('should emit voice_stream_start when user starts streaming', async () => {
      router.register({
        event: 'voice_stream_start',
        actions: [{ action: 'log', message: 'Stream started' }],
      });

      const streamContext = {
        ...mockContext,
        streaming: true,
        voice_channel: { id: 'vc-123', name: 'General' },
      };

      await router.emit('voice_stream_start', streamContext as any, mockExecutor, mockEvaluator);
      expect(mockExecutor.executeSequence).toHaveBeenCalled();
    });

    it('should emit voice_stream_stop when user stops streaming', async () => {
      router.register({
        event: 'voice_stream_stop',
        actions: [{ action: 'log', message: 'Stream ended' }],
      });

      await router.emit('voice_stream_stop', mockContext, mockExecutor, mockEvaluator);
      expect(mockExecutor.executeSequence).toHaveBeenCalled();
    });

    it('should provide streaming status and voice_channel in context', async () => {
      router.register({
        event: 'voice_stream_start',
        actions: [{ action: 'log', message: 'streaming' }],
      });

      const streamContext = {
        ...mockContext,
        streaming: true,
        voice_channel: { id: 'vc-123', name: 'Gaming' },
      };

      await router.emit('voice_stream_start', streamContext as any, mockExecutor, mockEvaluator);
      expect(mockExecutor.executeSequence).toHaveBeenCalledWith(
        expect.any(Array),
        expect.objectContaining({
          streaming: true,
          voice_channel: { id: 'vc-123', name: 'Gaming' },
        })
      );
    });
  });
});
