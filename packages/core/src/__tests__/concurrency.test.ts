/**
 * Concurrency Tests
 *
 * Tests for race conditions and concurrent access patterns:
 * - State manager concurrent writes
 * - Flow engine reentrant calls
 * - Expression evaluator concurrent evaluations
 * - Lock contention
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { StateManager, createStateManager } from '../state/manager.js';
import { FlowEngine, createFlowEngine } from '../flows/engine.js';
import { createEvaluator } from '../expression/evaluator.js';
import { MemoryAdapter } from '@furlow/storage';
import type { ActionContext, ActionResult } from '../actions/types.js';
import type { Action } from '@furlow/schema';

/**
 * Helper to create test action context
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
    message: undefined,
    member: undefined,
    interaction: undefined,
    event: {},
    args: {},
    options: {},
    vars: {},
    ...overrides,
  } as ActionContext;
}

/**
 * Simple test executor that tracks executions
 */
function createTestExecutor() {
  return {
    async executeOne(action: Action, context: ActionContext): Promise<ActionResult> {
      // Simulate async work
      await new Promise(resolve => setTimeout(resolve, Math.random() * 10));
      return { success: true, data: action };
    },
    async executeParallel(actions: Action[], context: ActionContext): Promise<ActionResult[]> {
      return Promise.all(actions.map(a => this.executeOne(a, context)));
    },
  };
}

describe('StateManager Concurrency', () => {
  let storage: MemoryAdapter;
  let manager: StateManager;

  beforeEach(() => {
    storage = new MemoryAdapter();
    manager = createStateManager(storage);
    manager.registerVariables({
      counter: { type: 'number', scope: 'guild', default: 0 },
      value: { type: 'string', scope: 'guild' },
    });
  });

  afterEach(async () => {
    await manager.close();
  });

  describe('Concurrent Increments', () => {
    it('should handle 10 concurrent increments without data loss', async () => {
      const ctx = { guildId: 'guild-1' };
      await manager.set('counter', 0, ctx);

      // Fire 10 concurrent increments
      const increments = Array(10).fill(null).map(() =>
        manager.increment('counter', 1, ctx)
      );

      await Promise.all(increments);

      const finalValue = await manager.get<number>('counter', ctx);
      expect(finalValue).toBe(10);
    });

    it('should handle 50 concurrent increments without data loss', async () => {
      const ctx = { guildId: 'guild-1' };
      await manager.set('counter', 0, ctx);

      const increments = Array(50).fill(null).map(() =>
        manager.increment('counter', 1, ctx)
      );

      await Promise.all(increments);

      const finalValue = await manager.get<number>('counter', ctx);
      expect(finalValue).toBe(50);
    });

    it('should handle concurrent increments and decrements', async () => {
      const ctx = { guildId: 'guild-1' };
      await manager.set('counter', 50, ctx);

      const operations = [
        ...Array(20).fill(null).map(() => manager.increment('counter', 1, ctx)),
        ...Array(10).fill(null).map(() => manager.decrement('counter', 1, ctx)),
      ];

      await Promise.all(operations);

      const finalValue = await manager.get<number>('counter', ctx);
      expect(finalValue).toBe(60); // 50 + 20 - 10 = 60
    });

    it('should handle concurrent increments across different guilds', async () => {
      const ctx1 = { guildId: 'guild-1' };
      const ctx2 = { guildId: 'guild-2' };

      await manager.set('counter', 0, ctx1);
      await manager.set('counter', 0, ctx2);

      const operations = [
        ...Array(20).fill(null).map(() => manager.increment('counter', 1, ctx1)),
        ...Array(30).fill(null).map(() => manager.increment('counter', 1, ctx2)),
      ];

      await Promise.all(operations);

      expect(await manager.get<number>('counter', ctx1)).toBe(20);
      expect(await manager.get<number>('counter', ctx2)).toBe(30);
    });
  });

  describe('Concurrent Reads and Writes', () => {
    it('should handle interleaved reads and writes', async () => {
      const ctx = { guildId: 'guild-1' };
      await manager.set('value', 'initial', ctx);

      const writes = Array(10).fill(null).map((_, i) =>
        manager.set('value', `write-${i}`, ctx)
      );

      const reads = Array(20).fill(null).map(() =>
        manager.get('value', ctx)
      );

      // Interleave reads and writes
      const operations = [];
      for (let i = 0; i < 10; i++) {
        operations.push(reads[i * 2]);
        operations.push(writes[i]);
        operations.push(reads[i * 2 + 1]);
      }

      const results = await Promise.all(operations);

      // All reads should return valid values (either initial or one of the writes)
      const validValues = ['initial', ...Array(10).fill(null).map((_, i) => `write-${i}`)];
      for (const result of results) {
        if (result !== undefined) {
          expect(validValues).toContain(result);
        }
      }
    });
  });

  describe('Cache Concurrent Access', () => {
    it('should handle concurrent cache writes using Promise.all', async () => {
      // Actually concurrent operations using Promise.all
      const writes = await Promise.all(
        Array(100).fill(null).map(async (_, i) => {
          // Simulate async operation
          await new Promise(r => setImmediate(r));
          manager.cacheSet(`key-${i}`, `value-${i}`);
          return i;
        })
      );

      expect(writes).toHaveLength(100);

      // All writes should succeed
      for (let i = 0; i < 100; i++) {
        const value = manager.cacheGet(`key-${i}`);
        expect(value).toBe(`value-${i}`);
      }
    });

    it('should handle concurrent cache writes and reads using Promise.all', async () => {
      // Pre-populate cache
      for (let i = 0; i < 50; i++) {
        manager.cacheSet(`key-${i}`, `value-${i}`);
      }

      // Actually concurrent reads and new writes
      const operations = Array(100).fill(null).map(async (_, i) => {
        // Simulate async operation
        await new Promise(r => setImmediate(r));
        if (i % 2 === 0) {
          return { type: 'read', value: manager.cacheGet(`key-${i % 50}`) };
        } else {
          manager.cacheSet(`new-key-${i}`, `new-value-${i}`);
          return { type: 'write', value: undefined };
        }
      });

      const results = await Promise.all(operations);

      // Reads should return expected values
      const validReads = results.filter(r => r.type === 'read' && r.value !== undefined);
      expect(validReads.length).toBeGreaterThan(0);
    });

    it('should handle concurrent writes to the SAME key', async () => {
      const ctx = { guildId: 'guild-1' };
      await manager.set('counter', 0, ctx);

      // Many concurrent writes to the same key with different values
      const writes = await Promise.all(
        Array(20).fill(null).map(async (_, i) => {
          await new Promise(r => setTimeout(r, Math.random() * 5));
          await manager.set('counter', i, ctx);
          return i;
        })
      );

      // Final value should be one of the written values
      const finalValue = await manager.get<number>('counter', ctx);
      expect(writes).toContain(finalValue);
    });
  });

  describe('Table Concurrent Operations', () => {
    beforeEach(async () => {
      await manager.registerTables({
        items: {
          columns: {
            id: { type: 'string', primary: true },
            count: { type: 'number' },
          },
        },
      });
    });

    it('should handle concurrent inserts', async () => {
      const inserts = Array(20).fill(null).map((_, i) =>
        manager.insert('items', { id: `item-${i}`, count: i })
      );

      await Promise.all(inserts);

      const rows = await manager.query('items');
      expect(rows).toHaveLength(20);
    });

    it('should handle concurrent updates to different rows', async () => {
      // Create rows
      for (let i = 0; i < 10; i++) {
        await manager.insert('items', { id: `item-${i}`, count: 0 });
      }

      // Concurrent updates to different rows
      const updates = Array(10).fill(null).map((_, i) =>
        manager.update('items', { id: `item-${i}` }, { count: i * 10 })
      );

      await Promise.all(updates);

      const rows = await manager.query('items');
      for (let i = 0; i < 10; i++) {
        const row = rows.find((r: Record<string, unknown>) => r.id === `item-${i}`);
        expect(row?.count).toBe(i * 10);
      }
    });

    it('should handle concurrent updates to the SAME row', async () => {
      // Create a single row
      await manager.insert('items', { id: 'contested-item', count: 0 });

      // Concurrent updates to the same row with different values
      const updates = await Promise.all(
        Array(20).fill(null).map(async (_, i) => {
          await new Promise(r => setTimeout(r, Math.random() * 5));
          await manager.update('items', { id: 'contested-item' }, { count: i + 1 });
          return i + 1;
        })
      );

      // Final value should be one of the written values
      const rows = await manager.query('items', { where: { id: 'contested-item' } });
      expect(rows.length).toBe(1);
      const finalCount = (rows[0] as Record<string, unknown>).count as number;
      expect(updates).toContain(finalCount);
    });

    it('should handle concurrent inserts and queries', async () => {
      // Concurrent inserts and queries
      const operations = await Promise.all([
        // Inserts
        ...Array(10).fill(null).map(async (_, i) => {
          await new Promise(r => setTimeout(r, Math.random() * 10));
          await manager.insert('items', { id: `concurrent-${i}`, count: i });
          return { type: 'insert', id: `concurrent-${i}` };
        }),
        // Queries
        ...Array(5).fill(null).map(async () => {
          await new Promise(r => setTimeout(r, Math.random() * 10));
          const rows = await manager.query('items');
          return { type: 'query', count: rows.length };
        }),
      ]);

      // All inserts should complete
      const inserts = operations.filter(o => o.type === 'insert');
      expect(inserts.length).toBe(10);

      // Final query should show all items
      const finalRows = await manager.query('items');
      expect(finalRows.length).toBeGreaterThanOrEqual(10);
    });
  });
});

describe('FlowEngine Concurrency', () => {
  let engine: FlowEngine;
  let evaluator: ReturnType<typeof createEvaluator>;
  let executor: ReturnType<typeof createTestExecutor>;
  let context: ActionContext;

  beforeEach(() => {
    engine = createFlowEngine();
    evaluator = createEvaluator({ allowUndefined: true });
    executor = createTestExecutor();
    context = createTestContext();
  });

  describe('Concurrent Flow Executions', () => {
    it('should handle concurrent executions of the same flow', async () => {
      engine.register({
        name: 'simple',
        actions: [
          { action: 'step1' } as any,
          { action: 'step2' } as any,
        ],
      });

      // Execute same flow 10 times concurrently
      const executions = Array(10).fill(null).map(() =>
        engine.execute('simple', {}, context, executor as any, evaluator)
      );

      const results = await Promise.all(executions);

      // All executions should succeed
      for (const result of results) {
        expect(result.success).toBe(true);
      }
    });

    it('should handle concurrent executions of different flows', async () => {
      engine.registerAll([
        { name: 'flow_a', actions: [{ action: 'a1' } as any, { action: 'a2' } as any] },
        { name: 'flow_b', actions: [{ action: 'b1' } as any, { action: 'b2' } as any] },
        { name: 'flow_c', actions: [{ action: 'c1' } as any, { action: 'c2' } as any] },
      ]);

      const executions = [
        ...Array(5).fill(null).map(() => engine.execute('flow_a', {}, context, executor as any, evaluator)),
        ...Array(5).fill(null).map(() => engine.execute('flow_b', {}, context, executor as any, evaluator)),
        ...Array(5).fill(null).map(() => engine.execute('flow_c', {}, context, executor as any, evaluator)),
      ];

      const results = await Promise.all(executions);

      for (const result of results) {
        expect(result.success).toBe(true);
      }
    });

    it('should isolate flow contexts between concurrent executions', async () => {
      const executionIds: number[] = [];

      const trackingExecutor = {
        async executeOne(action: Action, ctx: ActionContext): Promise<ActionResult> {
          if (ctx.executionId !== undefined) {
            executionIds.push(ctx.executionId as number);
          }
          await new Promise(resolve => setTimeout(resolve, Math.random() * 10));
          return { success: true };
        },
        async executeParallel(actions: Action[], ctx: ActionContext): Promise<ActionResult[]> {
          return Promise.all(actions.map(a => this.executeOne(a, ctx)));
        },
      };

      engine.register({
        name: 'tracked',
        actions: [{ action: 'track' } as any],
      });

      // Each execution gets a unique ID
      const executions = Array(10).fill(null).map((_, i) => {
        const uniqueContext = { ...context, executionId: i };
        return engine.execute('tracked', {}, uniqueContext, trackingExecutor as any, evaluator);
      });

      await Promise.all(executions);

      // All 10 unique IDs should be tracked
      expect(executionIds).toHaveLength(10);
      const uniqueIds = new Set(executionIds);
      expect(uniqueIds.size).toBe(10);
    });
  });

  describe('Nested Flow Calls Under Concurrency', () => {
    it('should handle concurrent flows that call nested flows', async () => {
      engine.register({
        name: 'inner',
        actions: [{ action: 'inner_action' } as any],
      });

      engine.register({
        name: 'outer',
        actions: [
          { action: 'call_flow', flow: 'inner' } as Action,
        ],
      });

      const executions = Array(10).fill(null).map(() =>
        engine.execute('outer', {}, context, executor as any, evaluator)
      );

      const results = await Promise.all(executions);

      for (const result of results) {
        expect(result.success).toBe(true);
      }
    });
  });
});

describe('ExpressionEvaluator Concurrency', () => {
  let evaluator: ReturnType<typeof createEvaluator>;

  beforeEach(() => {
    evaluator = createEvaluator();
  });

  describe('Concurrent Evaluations', () => {
    it('should handle 100 concurrent evaluations', async () => {
      const evaluations = Array(100).fill(null).map((_, i) =>
        evaluator.evaluate(`${i} * 2 + 1`)
      );

      const results = await Promise.all(evaluations);

      for (let i = 0; i < 100; i++) {
        expect(results[i]).toBe(i * 2 + 1);
      }
    });

    it('should handle concurrent evaluations with shared context', async () => {
      const sharedContext = {
        x: 10,
        y: 20,
        items: [1, 2, 3, 4, 5],
      };

      const evaluations = [
        evaluator.evaluate('x + y', sharedContext),
        evaluator.evaluate('x * y', sharedContext),
        evaluator.evaluate('length(items)', sharedContext),
        evaluator.evaluate('first(items)', sharedContext),
        evaluator.evaluate('last(items)', sharedContext),
        evaluator.evaluate('x > y', sharedContext),
        evaluator.evaluate('x < y', sharedContext),
      ];

      const results = await Promise.all(evaluations);

      expect(results[0]).toBe(30); // x + y
      expect(results[1]).toBe(200); // x * y
      expect(results[2]).toBe(5); // length(items)
      expect(results[3]).toBe(1); // first(items)
      expect(results[4]).toBe(5); // last(items)
      expect(results[5]).toBe(false); // x > y
      expect(results[6]).toBe(true); // x < y
    });

    it('should not have cache collisions under concurrent access', async () => {
      // Use different expressions that could potentially collide
      const expressions = [
        'a + b',
        'a - b',
        'a * b',
        'a / b',
        'a + b + c',
        'a * b * c',
      ];

      const evaluations = expressions.flatMap((expr, i) =>
        Array(10).fill(null).map(() =>
          evaluator.evaluate(expr, { a: i + 1, b: i + 2, c: i + 3 })
        )
      );

      const results = await Promise.all(evaluations);

      // Results should be deterministic
      let idx = 0;
      for (let i = 0; i < expressions.length; i++) {
        const a = i + 1, b = i + 2, c = i + 3;
        const expectedValues: Record<string, number> = {
          'a + b': a + b,
          'a - b': a - b,
          'a * b': a * b,
          'a / b': a / b,
          'a + b + c': a + b + c,
          'a * b * c': a * b * c,
        };
        const expected = expectedValues[expressions[i]];

        for (let j = 0; j < 10; j++) {
          expect(results[idx]).toBe(expected);
          idx++;
        }
      }
    });
  });

  describe('Concurrent Interpolations', () => {
    it('should handle concurrent interpolations', async () => {
      const interpolations = Array(50).fill(null).map((_, i) =>
        evaluator.interpolate('Hello ${name}, you are #${rank}!', {
          name: `User${i}`,
          rank: i + 1,
        })
      );

      const results = await Promise.all(interpolations);

      for (let i = 0; i < 50; i++) {
        expect(results[i]).toBe(`Hello User${i}, you are #${i + 1}!`);
      }
    });
  });
});

describe('Mixed Concurrency Scenarios', () => {
  it('should handle state updates during flow execution', async () => {
    const storage = new MemoryAdapter();
    const stateManager = createStateManager(storage);
    stateManager.registerVariables({
      counter: { type: 'number', scope: 'guild', default: 0 },
    });

    const engine = createFlowEngine();
    const evaluator = createEvaluator({ allowUndefined: true });
    const context = createTestContext();

    // Executor that increments state
    const statefulExecutor = {
      async executeOne(action: Action, ctx: ActionContext): Promise<ActionResult> {
        if (action.action === 'increment') {
          await stateManager.increment('counter', 1, { guildId: ctx.guildId! });
        }
        return { success: true };
      },
      async executeParallel(actions: Action[], ctx: ActionContext): Promise<ActionResult[]> {
        return Promise.all(actions.map(a => this.executeOne(a, ctx)));
      },
    };

    engine.register({
      name: 'increment_flow',
      actions: [{ action: 'increment' } as any],
    });

    // Run 10 concurrent flow executions, each incrementing the counter
    const executions = Array(10).fill(null).map(() =>
      engine.execute('increment_flow', {}, context, statefulExecutor as any, evaluator)
    );

    await Promise.all(executions);

    const finalValue = await stateManager.get<number>('counter', { guildId: 'test-guild' });
    expect(finalValue).toBe(10);

    await stateManager.close();
  });
});
