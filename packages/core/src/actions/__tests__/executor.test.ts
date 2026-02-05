/**
 * ActionExecutor Tests
 *
 * Comprehensive tests for the action executor covering:
 * - Single action execution with conditions and validation
 * - Sequence execution with stopOnError behavior
 * - Parallel execution with limits
 * - Batch processing with concurrency
 * - Abort signal handling
 * - Error propagation
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ActionExecutor, createActionExecutor } from '../executor.js';
import { ActionRegistry, createActionRegistry } from '../registry.js';
import { createEvaluator } from '../../expression/evaluator.js';
import type { Action, SimpleCondition } from '@furlow/schema';
import type { ActionContext, ActionResult, ActionHandler } from '../types.js';
import { ActionExecutionError, FlowAbortedError } from '../../errors/index.js';

/**
 * Create a mock action context for testing
 */
function createTestContext(overrides: Partial<ActionContext> = {}): ActionContext {
  return {
    guildId: 'test-guild',
    channelId: 'test-channel',
    userId: 'test-user',
    client: {},
    stateManager: {},
    evaluator: {},
    flowExecutor: {},
    user: { id: 'test-user', username: 'tester' },
    guild: { id: 'test-guild', name: 'Test Guild' },
    channel: { id: 'test-channel', name: 'test' },
    message: null,
    member: null,
    interaction: null,
    event: {},
    args: {},
    options: {},
    vars: {},
    ...overrides,
  } as ActionContext;
}

/**
 * Create a simple action handler for testing
 */
function createTestHandler(
  name: string,
  options: {
    execute?: (action: Action, context: ActionContext) => Promise<ActionResult>;
    validate?: (action: Action) => boolean | string;
    shouldThrow?: Error;
    delay?: number;
  } = {}
): ActionHandler {
  return {
    name,
    validate: options.validate,
    execute: async (action, context) => {
      if (options.delay) {
        await new Promise((r) => setTimeout(r, options.delay));
      }
      if (options.shouldThrow) {
        throw options.shouldThrow;
      }
      if (options.execute) {
        return options.execute(action, context);
      }
      return { success: true, data: { action: action.action } };
    },
  };
}

describe('ActionExecutor', () => {
  let registry: ActionRegistry;
  let evaluator: ReturnType<typeof createEvaluator>;
  let executor: ActionExecutor;
  let context: ActionContext;

  beforeEach(() => {
    registry = createActionRegistry();
    evaluator = createEvaluator({ allowUndefined: true });
    executor = createActionExecutor(registry, evaluator);
    context = createTestContext();

    // Register common test handlers
    registry.register(createTestHandler('test_action'));
    registry.register(createTestHandler('action_a'));
    registry.register(createTestHandler('action_b'));
    registry.register(createTestHandler('action_c'));
  });

  describe('executeOne', () => {
    it('should execute action and return result', async () => {
      const action: Action = { action: 'test_action' };
      const result = await executor.executeOne(action, context);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ action: 'test_action' });
    });

    it('should return handler result data', async () => {
      registry.register(
        createTestHandler('custom_action', {
          execute: async () => ({
            success: true,
            data: { customField: 'custom value', count: 42 },
          }),
        })
      );

      const action: Action = { action: 'custom_action' };
      const result = await executor.executeOne(action, context);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ customField: 'custom value', count: 42 });
    });

    describe('when condition', () => {
      it('should evaluate string condition and skip if false', async () => {
        const action: Action = { action: 'test_action', when: 'false' };
        const result = await executor.executeOne(action, context);

        expect(result.success).toBe(true);
        expect(result.data).toBeNull();
      });

      it('should execute if string condition is true', async () => {
        const action: Action = { action: 'test_action', when: 'true' };
        const result = await executor.executeOne(action, context);

        expect(result.success).toBe(true);
        expect(result.data).toEqual({ action: 'test_action' });
      });

      it('should evaluate { expr } condition', async () => {
        const action: Action = {
          action: 'test_action',
          when: { expr: 'value > 5' },
        };

        const resultTrue = await executor.executeOne(action, {
          ...context,
          value: 10,
        } as ActionContext);
        expect(resultTrue.data).toEqual({ action: 'test_action' });

        const resultFalse = await executor.executeOne(action, {
          ...context,
          value: 3,
        } as ActionContext);
        expect(resultFalse.data).toBeNull();
      });

      it('should evaluate { all: [] } condition - all must be true', async () => {
        const action: Action = {
          action: 'test_action',
          when: { all: ['a > 0', 'b > 0'] } as SimpleCondition,
        };

        const resultAllTrue = await executor.executeOne(action, {
          ...context,
          a: 5,
          b: 5,
        } as ActionContext);
        expect(resultAllTrue.data).toEqual({ action: 'test_action' });

        const resultOneFalse = await executor.executeOne(action, {
          ...context,
          a: 5,
          b: -1,
        } as ActionContext);
        expect(resultOneFalse.data).toBeNull();
      });

      it('should evaluate { any: [] } condition - any must be true', async () => {
        const action: Action = {
          action: 'test_action',
          when: { any: ['a > 10', 'b > 10'] } as SimpleCondition,
        };

        const resultOneTrue = await executor.executeOne(action, {
          ...context,
          a: 15,
          b: 5,
        } as ActionContext);
        expect(resultOneTrue.data).toEqual({ action: 'test_action' });

        const resultNoneTrue = await executor.executeOne(action, {
          ...context,
          a: 5,
          b: 5,
        } as ActionContext);
        expect(resultNoneTrue.data).toBeNull();
      });

      it('should evaluate { not: condition } - negation', async () => {
        const action: Action = {
          action: 'test_action',
          when: { not: 'isBlocked' } as SimpleCondition,
        };

        const resultNotBlocked = await executor.executeOne(action, {
          ...context,
          isBlocked: false,
        } as ActionContext);
        expect(resultNotBlocked.data).toEqual({ action: 'test_action' });

        const resultBlocked = await executor.executeOne(action, {
          ...context,
          isBlocked: true,
        } as ActionContext);
        expect(resultBlocked.data).toBeNull();
      });

      it('should handle nested condition combinations', async () => {
        const action: Action = {
          action: 'test_action',
          when: {
            all: [{ any: ['a', 'b'] }, { not: 'blocked' }],
          } as SimpleCondition,
        };

        // a=true, b=false, blocked=false -> should execute
        const result1 = await executor.executeOne(action, {
          ...context,
          a: true,
          b: false,
          blocked: false,
        } as ActionContext);
        expect(result1.data).toEqual({ action: 'test_action' });

        // a=true, b=false, blocked=true -> should skip
        const result2 = await executor.executeOne(action, {
          ...context,
          a: true,
          b: false,
          blocked: true,
        } as ActionContext);
        expect(result2.data).toBeNull();

        // a=false, b=false, blocked=false -> should skip (any fails)
        const result3 = await executor.executeOne(action, {
          ...context,
          a: false,
          b: false,
          blocked: false,
        } as ActionContext);
        expect(result3.data).toBeNull();
      });
    });

    describe('validation', () => {
      it('should call handler validation if present', async () => {
        const validateFn = vi.fn().mockReturnValue(true);
        registry.register(
          createTestHandler('validated_action', {
            validate: validateFn,
          })
        );

        const action: Action = { action: 'validated_action' };
        await executor.executeOne(action, context);

        expect(validateFn).toHaveBeenCalledWith(action);
      });

      it('should return ActionExecutionError if validation fails with false', async () => {
        registry.register(
          createTestHandler('invalid_action', {
            validate: () => false,
          })
        );

        const action: Action = { action: 'invalid_action' };
        const result = await executor.executeOne(action, context);

        expect(result.success).toBe(false);
        expect(result.error).toBeInstanceOf(ActionExecutionError);
        expect(result.error?.message).toContain('Invalid action configuration');
      });

      it('should return ActionExecutionError with custom message if validation returns string', async () => {
        registry.register(
          createTestHandler('invalid_action', {
            validate: () => 'Missing required field: target',
          })
        );

        const action: Action = { action: 'invalid_action' };
        const result = await executor.executeOne(action, context);

        expect(result.success).toBe(false);
        expect(result.error?.message).toContain('Missing required field: target');
      });
    });

    describe('error handling', () => {
      it('should catch handler exceptions and wrap in ActionExecutionError', async () => {
        const handlerError = new Error('Handler exploded');
        registry.register(
          createTestHandler('throwing_action', {
            shouldThrow: handlerError,
          })
        );

        const action: Action = { action: 'throwing_action' };
        const result = await executor.executeOne(action, context);

        expect(result.success).toBe(false);
        expect(result.error).toBeInstanceOf(ActionExecutionError);
        expect(result.error?.message).toContain('Handler exploded');
      });

      it('should handle non-Error throws', async () => {
        registry.register({
          name: 'string_throw',
          execute: async () => {
            throw 'string error';
          },
        });

        const action: Action = { action: 'string_throw' };
        const result = await executor.executeOne(action, context);

        expect(result.success).toBe(false);
        expect(result.error?.message).toContain('string error');
      });
    });

    describe('abort signal', () => {
      it('should respect abort signal', async () => {
        const controller = new AbortController();
        controller.abort();

        const action: Action = { action: 'test_action' };
        const result = await executor.executeOne(action, {
          ...context,
          signal: controller.signal,
        });

        expect(result.success).toBe(false);
        expect(result.error).toBeInstanceOf(FlowAbortedError);
      });

      it('should check abort before executing', async () => {
        const executeFn = vi.fn().mockResolvedValue({ success: true });
        registry.register(createTestHandler('abort_test', { execute: executeFn }));

        const controller = new AbortController();
        controller.abort();

        const action: Action = { action: 'abort_test' };
        await executor.executeOne(action, {
          ...context,
          signal: controller.signal,
        });

        expect(executeFn).not.toHaveBeenCalled();
      });
    });
  });

  describe('executeSequence', () => {
    it('should execute actions in order', async () => {
      const order: string[] = [];
      registry.register(
        createTestHandler('track_a', {
          execute: async () => {
            order.push('a');
            return { success: true };
          },
        })
      );
      registry.register(
        createTestHandler('track_b', {
          execute: async () => {
            order.push('b');
            return { success: true };
          },
        })
      );
      registry.register(
        createTestHandler('track_c', {
          execute: async () => {
            order.push('c');
            return { success: true };
          },
        })
      );

      const actions: Action[] = [
        { action: 'track_a' },
        { action: 'track_b' },
        { action: 'track_c' },
      ];

      const results = await executor.executeSequence(actions, context);

      expect(results).toHaveLength(3);
      expect(order).toEqual(['a', 'b', 'c']);
    });

    it('should stop on first error when stopOnError: true (default)', async () => {
      const executorWithStop = createActionExecutor(registry, evaluator, {
        stopOnError: true,
      });

      registry.register(
        createTestHandler('fail_action', {
          execute: async () => ({
            success: false,
            error: new Error('Intentional failure'),
          }),
        })
      );

      const actions: Action[] = [
        { action: 'action_a' },
        { action: 'fail_action' },
        { action: 'action_c' },
      ];

      const results = await executorWithStop.executeSequence(actions, context);

      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(false);
    });

    it('should continue on error when stopOnError: false', async () => {
      const executorContinue = createActionExecutor(registry, evaluator, {
        stopOnError: false,
      });

      registry.register(
        createTestHandler('fail_action', {
          execute: async () => ({
            success: false,
            error: new Error('Intentional failure'),
          }),
        })
      );

      const actions: Action[] = [
        { action: 'action_a' },
        { action: 'fail_action' },
        { action: 'action_c' },
      ];

      const results = await executorContinue.executeSequence(actions, context);

      expect(results).toHaveLength(3);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(false);
      expect(results[2].success).toBe(true);
    });

    it('should throw if actions exceed maxActions limit', async () => {
      const limitedExecutor = createActionExecutor(registry, evaluator, {
        maxActions: 3,
      });

      const actions: Action[] = [
        { action: 'action_a' },
        { action: 'action_b' },
        { action: 'action_c' },
        { action: 'test_action' },
      ];

      await expect(
        limitedExecutor.executeSequence(actions, context)
      ).rejects.toThrow(/Too many actions: 4 exceeds limit of 3/);
    });

    it('should respect abort signal mid-sequence', async () => {
      const controller = new AbortController();
      const executed: string[] = [];

      registry.register(
        createTestHandler('abort_trigger', {
          execute: async () => {
            executed.push('trigger');
            controller.abort();
            return { success: true };
          },
        })
      );
      registry.register(
        createTestHandler('after_abort', {
          execute: async () => {
            executed.push('after');
            return { success: true };
          },
        })
      );

      const actions: Action[] = [
        { action: 'action_a' },
        { action: 'abort_trigger' },
        { action: 'after_abort' },
      ];

      await executor.executeSequence(actions, {
        ...context,
        signal: controller.signal,
      });

      expect(executed).toContain('trigger');
      expect(executed).not.toContain('after');
    });

    it('should handle empty actions array', async () => {
      const results = await executor.executeSequence([], context);
      expect(results).toEqual([]);
    });
  });

  describe('executeParallel', () => {
    it('should execute all actions concurrently', async () => {
      const startTimes: number[] = [];
      const endTimes: number[] = [];

      for (let i = 0; i < 3; i++) {
        registry.register(
          createTestHandler(`parallel_${i}`, {
            execute: async () => {
              startTimes.push(Date.now());
              await new Promise((r) => setTimeout(r, 50));
              endTimes.push(Date.now());
              return { success: true, data: { index: i } };
            },
          })
        );
      }

      const actions: Action[] = [
        { action: 'parallel_0' },
        { action: 'parallel_1' },
        { action: 'parallel_2' },
      ];

      const start = Date.now();
      const results = await executor.executeParallel(actions, context);
      const totalTime = Date.now() - start;

      expect(results).toHaveLength(3);
      results.forEach((r) => expect(r.success).toBe(true));

      // If truly parallel, should take ~50ms, not ~150ms
      expect(totalTime).toBeLessThan(100);

      // All should start at approximately the same time
      const maxStartDiff = Math.max(...startTimes) - Math.min(...startTimes);
      expect(maxStartDiff).toBeLessThan(30);
    });

    it('should throw if exceeds maxParallel limit', async () => {
      const limitedExecutor = createActionExecutor(registry, evaluator, {
        maxParallel: 2,
      });

      const actions: Action[] = [
        { action: 'action_a' },
        { action: 'action_b' },
        { action: 'action_c' },
      ];

      await expect(
        limitedExecutor.executeParallel(actions, context)
      ).rejects.toThrow(/Too many parallel actions: 3 exceeds limit of 2/);
    });

    it('should return all results even with failures', async () => {
      registry.register(
        createTestHandler('fail_parallel', {
          execute: async () => ({
            success: false,
            error: new Error('Parallel failure'),
          }),
        })
      );

      const actions: Action[] = [
        { action: 'action_a' },
        { action: 'fail_parallel' },
        { action: 'action_c' },
      ];

      const results = await executor.executeParallel(actions, context);

      expect(results).toHaveLength(3);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(false);
      expect(results[2].success).toBe(true);
    });

    it('should respect abort signal', async () => {
      const controller = new AbortController();
      controller.abort();

      const actions: Action[] = [{ action: 'action_a' }, { action: 'action_b' }];

      const results = await executor.executeParallel(actions, {
        ...context,
        signal: controller.signal,
      });

      // Each action should return aborted error
      results.forEach((r) => {
        expect(r.success).toBe(false);
        expect(r.error).toBeInstanceOf(FlowAbortedError);
      });
    });
  });

  describe('executeBatch', () => {
    it('should process items with action templates', async () => {
      const processed: unknown[] = [];
      registry.register(
        createTestHandler('process_item', {
          execute: async (action, ctx) => {
            processed.push((ctx as Record<string, unknown>).item);
            return { success: true };
          },
        })
      );

      const items = ['apple', 'banana', 'cherry'];
      const template: Action[] = [{ action: 'process_item' }];

      await executor.executeBatch(items, template, context, { as: 'item' });

      expect(processed).toEqual(['apple', 'banana', 'cherry']);
    });

    it('should set item context variable with custom name', async () => {
      const captured: unknown[] = [];
      registry.register(
        createTestHandler('capture_fruit', {
          execute: async (action, ctx) => {
            captured.push((ctx as Record<string, unknown>).fruit);
            return { success: true };
          },
        })
      );

      const items = ['apple', 'banana'];
      const template: Action[] = [{ action: 'capture_fruit' }];

      await executor.executeBatch(items, template, context, { as: 'fruit' });

      expect(captured).toEqual(['apple', 'banana']);
    });

    it('should set index variable', async () => {
      const indices: number[] = [];
      registry.register(
        createTestHandler('capture_index', {
          execute: async (action, ctx) => {
            indices.push((ctx as Record<string, unknown>).item_index as number);
            return { success: true };
          },
        })
      );

      const items = ['a', 'b', 'c'];
      const template: Action[] = [{ action: 'capture_index' }];

      await executor.executeBatch(items, template, context, { as: 'item' });

      expect(indices).toEqual([0, 1, 2]);
    });

    it('should support concurrency parameter', async () => {
      const inProgress: number[] = [];
      let maxConcurrent = 0;
      let currentConcurrent = 0;

      registry.register(
        createTestHandler('concurrent_item', {
          execute: async () => {
            currentConcurrent++;
            inProgress.push(currentConcurrent);
            maxConcurrent = Math.max(maxConcurrent, currentConcurrent);
            await new Promise((r) => setTimeout(r, 50));
            currentConcurrent--;
            return { success: true };
          },
        })
      );

      const items = [1, 2, 3, 4, 5, 6];
      const template: Action[] = [{ action: 'concurrent_item' }];

      await executor.executeBatch(items, template, context, {
        concurrency: 2,
      });

      // With concurrency=2, max concurrent should be 2
      expect(maxConcurrent).toBe(2);
    });

    it('should respect abort during batch', async () => {
      const controller = new AbortController();
      const processed: number[] = [];

      registry.register(
        createTestHandler('batch_item', {
          execute: async (action, ctx) => {
            const item = (ctx as Record<string, unknown>).item as number;
            processed.push(item);
            if (item === 2) {
              controller.abort();
            }
            return { success: true };
          },
        })
      );

      const items = [1, 2, 3, 4, 5];
      const template: Action[] = [{ action: 'batch_item' }];

      await executor.executeBatch(items, template, {
        ...context,
        signal: controller.signal,
      });

      // Should stop after abort
      expect(processed).not.toContain(4);
      expect(processed).not.toContain(5);
    });

    it('should handle empty items array', async () => {
      const template: Action[] = [{ action: 'test_action' }];
      const results = await executor.executeBatch([], template, context);

      expect(results).toEqual([]);
    });

    it('should default item variable name to "item"', async () => {
      const captured: unknown[] = [];
      registry.register(
        createTestHandler('default_item', {
          execute: async (action, ctx) => {
            captured.push((ctx as Record<string, unknown>).item);
            return { success: true };
          },
        })
      );

      const items = ['x', 'y'];
      const template: Action[] = [{ action: 'default_item' }];

      await executor.executeBatch(items, template, context);

      expect(captured).toEqual(['x', 'y']);
    });
  });

  describe('factory function', () => {
    it('should create executor with default options', () => {
      const exec = createActionExecutor(registry, evaluator);
      expect(exec).toBeInstanceOf(ActionExecutor);
    });

    it('should create executor with custom options', () => {
      const exec = createActionExecutor(registry, evaluator, {
        maxActions: 500,
        maxParallel: 25,
        stopOnError: false,
      });
      expect(exec).toBeInstanceOf(ActionExecutor);
    });

    it('should apply custom maxActions limit', async () => {
      const exec = createActionExecutor(registry, evaluator, {
        maxActions: 2,
      });

      const actions: Action[] = [
        { action: 'action_a' },
        { action: 'action_b' },
        { action: 'action_c' },
      ];

      await expect(exec.executeSequence(actions, context)).rejects.toThrow(
        /exceeds limit of 2/
      );
    });
  });

  describe('handler result types', () => {
    it('should preserve complex data structures in result', async () => {
      registry.register(
        createTestHandler('complex_result', {
          execute: async () => ({
            success: true,
            data: {
              nested: { deeply: { value: 42 } },
              array: [1, 2, 3],
              string: 'test',
              boolean: true,
              null: null,
            },
          }),
        })
      );

      const action: Action = { action: 'complex_result' };
      const result = await executor.executeOne(action, context);

      expect(result.data).toEqual({
        nested: { deeply: { value: 42 } },
        array: [1, 2, 3],
        string: 'test',
        boolean: true,
        null: null,
      });
    });

    it('should handle undefined result data', async () => {
      registry.register(
        createTestHandler('undefined_result', {
          execute: async () => ({
            success: true,
          }),
        })
      );

      const action: Action = { action: 'undefined_result' };
      const result = await executor.executeOne(action, context);

      expect(result.success).toBe(true);
      expect(result.data).toBeUndefined();
    });
  });
});
