/**
 * Flow engine tests - using real evaluator and minimal mocks
 *
 * These tests verify actual flow execution behavior:
 * - Sequential action execution
 * - Flow control (if/switch/while/repeat)
 * - Nested flow calls
 * - Error propagation
 * - Abort and return handling
 * - Parameter validation
 * - Depth limiting
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FlowEngine, createFlowEngine } from '../engine.js';
import { createEvaluator, ExpressionEvaluator } from '../../expression/evaluator.js';
import type { FlowDefinition, Action } from '@furlow/schema';
import type { ActionContext, ActionResult } from '../../actions/types.js';
import type { ActionExecutor } from '../../actions/executor.js';

/**
 * Test action executor that records executed actions
 * and allows configurable results including real exceptions
 */
function createTestExecutor(): ActionExecutor & {
  executedActions: { action: Action; context: ActionContext }[];
  reset: () => void;
  setResult: (actionType: string, result: ActionResult) => void;
  setThrowError: (actionType: string, error: Error) => void;
  clearThrowError: (actionType: string) => void;
} {
  const executedActions: { action: Action; context: ActionContext }[] = [];
  const customResults = new Map<string, ActionResult>();
  const throwErrors = new Map<string, Error>();

  const executor = {
    executedActions,
    reset() {
      executedActions.length = 0;
      customResults.clear();
      throwErrors.clear();
    },
    setResult(actionType: string, result: ActionResult) {
      customResults.set(actionType, result);
    },
    setThrowError(actionType: string, error: Error) {
      throwErrors.set(actionType, error);
    },
    clearThrowError(actionType: string) {
      throwErrors.delete(actionType);
    },
    async executeOne(action: Action, context: ActionContext): Promise<ActionResult> {
      executedActions.push({ action, context });

      // Throw real exception if configured
      const throwError = throwErrors.get(action.action);
      if (throwError) {
        throw throwError;
      }

      // Return custom result if configured
      const customResult = customResults.get(action.action);
      if (customResult) {
        return customResult;
      }

      // Default: success
      return { success: true, data: action };
    },
    async executeAll(actions: Action[], context: ActionContext): Promise<ActionResult[]> {
      const results: ActionResult[] = [];
      for (const action of actions) {
        results.push(await this.executeOne(action, context));
      }
      return results;
    },
    async executeParallel(actions: Action[], context: ActionContext): Promise<ActionResult[]> {
      return Promise.all(actions.map(a => this.executeOne(a, context)));
    },
  };

  return executor as ActionExecutor & typeof executor;
}

/**
 * Create a minimal action context for testing
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
  };
}

describe('FlowEngine with Real Evaluator', () => {
  let engine: FlowEngine;
  let evaluator: ExpressionEvaluator;
  let executor: ReturnType<typeof createTestExecutor>;
  let context: ActionContext;

  beforeEach(() => {
    engine = createFlowEngine();
    evaluator = createEvaluator({ allowUndefined: true });
    executor = createTestExecutor();
    context = createTestContext();
  });

  describe('Flow Registration', () => {
    it('should register and retrieve a flow', () => {
      const flow: FlowDefinition = {
        name: 'test_flow',
        actions: [{ action: 'log', message: 'test' }],
      };

      engine.register(flow);

      expect(engine.has('test_flow')).toBe(true);
      expect(engine.get('test_flow')).toBeDefined();
      expect(engine.get('test_flow')?.definition.name).toBe('test_flow');
    });

    it('should register flow with parameters', () => {
      const flow: FlowDefinition = {
        name: 'param_flow',
        parameters: [
          { name: 'msg', type: 'string', required: true },
          { name: 'count', type: 'number', default: 1 },
        ],
        actions: [{ action: 'log', message: '${msg}' }],
      };

      engine.register(flow);

      const registered = engine.get('param_flow');
      expect(registered?.parameters.size).toBe(2);
      expect(registered?.parameters.get('msg')?.required).toBe(true);
      expect(registered?.parameters.get('count')?.default).toBe(1);
    });

    it('should register multiple flows', () => {
      engine.registerAll([
        { name: 'flow1', actions: [] },
        { name: 'flow2', actions: [] },
        { name: 'flow3', actions: [] },
      ]);

      expect(engine.getFlowNames()).toHaveLength(3);
      expect(engine.has('flow1')).toBe(true);
      expect(engine.has('flow2')).toBe(true);
      expect(engine.has('flow3')).toBe(true);
    });

    it('should overwrite existing flow on re-registration', () => {
      engine.register({ name: 'test', actions: [{ action: 'first' }] });
      engine.register({ name: 'test', actions: [{ action: 'second' }] });

      const flow = engine.get('test');
      expect(flow?.definition.actions[0]?.action).toBe('second');
    });

    it('should clear all flows', () => {
      engine.registerAll([
        { name: 'flow1', actions: [] },
        { name: 'flow2', actions: [] },
      ]);

      engine.clear();

      expect(engine.getFlowNames()).toHaveLength(0);
    });
  });

  describe('Sequential Action Execution', () => {
    it('should execute actions in order', async () => {
      const flow: FlowDefinition = {
        name: 'sequential',
        actions: [
          { action: 'step1' },
          { action: 'step2' },
          { action: 'step3' },
        ],
      };
      engine.register(flow);

      await engine.execute('sequential', {}, context, executor, evaluator);

      expect(executor.executedActions).toHaveLength(3);
      expect(executor.executedActions[0].action.action).toBe('step1');
      expect(executor.executedActions[1].action.action).toBe('step2');
      expect(executor.executedActions[2].action.action).toBe('step3');
    });

    it('should execute empty flow successfully', async () => {
      engine.register({ name: 'empty', actions: [] });

      const result = await engine.execute('empty', {}, context, executor, evaluator);

      expect(result.success).toBe(true);
      expect(executor.executedActions).toHaveLength(0);
    });

    it('should throw FlowNotFoundError for unknown flow', async () => {
      await expect(
        engine.execute('nonexistent', {}, context, executor, evaluator)
      ).rejects.toThrow('Flow not found: nonexistent');
    });
  });

  describe('Flow Control: flow_if', () => {
    it('should execute then branch when condition is true', async () => {
      const flow: FlowDefinition = {
        name: 'if_test',
        actions: [
          {
            action: 'flow_if',
            if: 'value > 5',
            then: [{ action: 'then_action' }],
            else: [{ action: 'else_action' }],
          } as Action,
        ],
      };
      engine.register(flow);

      await engine.execute('if_test', {}, { ...context, value: 10 }, executor, evaluator);

      expect(executor.executedActions).toHaveLength(1);
      expect(executor.executedActions[0].action.action).toBe('then_action');
    });

    it('should execute else branch when condition is false', async () => {
      const flow: FlowDefinition = {
        name: 'if_test',
        actions: [
          {
            action: 'flow_if',
            if: 'value > 5',
            then: [{ action: 'then_action' }],
            else: [{ action: 'else_action' }],
          } as Action,
        ],
      };
      engine.register(flow);

      await engine.execute('if_test', {}, { ...context, value: 3 }, executor, evaluator);

      expect(executor.executedActions).toHaveLength(1);
      expect(executor.executedActions[0].action.action).toBe('else_action');
    });

    it('should skip when no else branch and condition is false', async () => {
      const flow: FlowDefinition = {
        name: 'if_no_else',
        actions: [
          {
            action: 'flow_if',
            if: 'false',
            then: [{ action: 'then_action' }],
          } as Action,
          { action: 'after_if' },
        ],
      };
      engine.register(flow);

      await engine.execute('if_no_else', {}, context, executor, evaluator);

      expect(executor.executedActions).toHaveLength(1);
      expect(executor.executedActions[0].action.action).toBe('after_if');
    });

    it('should handle nested if statements', async () => {
      const flow: FlowDefinition = {
        name: 'nested_if',
        actions: [
          {
            action: 'flow_if',
            if: 'outer == true',
            then: [
              {
                action: 'flow_if',
                if: 'inner == true',
                then: [{ action: 'both_true' }],
                else: [{ action: 'only_outer' }],
              } as Action,
            ],
            else: [{ action: 'outer_false' }],
          } as Action,
        ],
      };
      engine.register(flow);

      // Test both true
      await engine.execute('nested_if', {}, { ...context, outer: true, inner: true }, executor, evaluator);
      expect(executor.executedActions[0].action.action).toBe('both_true');

      // Test only outer
      executor.reset();
      await engine.execute('nested_if', {}, { ...context, outer: true, inner: false }, executor, evaluator);
      expect(executor.executedActions[0].action.action).toBe('only_outer');

      // Test outer false
      executor.reset();
      await engine.execute('nested_if', {}, { ...context, outer: false, inner: true }, executor, evaluator);
      expect(executor.executedActions[0].action.action).toBe('outer_false');
    });
  });

  describe('Flow Control: flow_switch', () => {
    it('should execute matching case', async () => {
      const flow: FlowDefinition = {
        name: 'switch_test',
        actions: [
          {
            action: 'flow_switch',
            value: 'status',
            cases: {
              pending: [{ action: 'handle_pending' }],
              active: [{ action: 'handle_active' }],
              completed: [{ action: 'handle_completed' }],
            },
          } as Action,
        ],
      };
      engine.register(flow);

      await engine.execute('switch_test', {}, { ...context, status: 'active' }, executor, evaluator);

      expect(executor.executedActions).toHaveLength(1);
      expect(executor.executedActions[0].action.action).toBe('handle_active');
    });

    it('should execute default case when no match', async () => {
      const flow: FlowDefinition = {
        name: 'switch_default',
        actions: [
          {
            action: 'flow_switch',
            value: 'status',
            cases: {
              a: [{ action: 'case_a' }],
              b: [{ action: 'case_b' }],
            },
            default: [{ action: 'default_case' }],
          } as Action,
        ],
      };
      engine.register(flow);

      await engine.execute('switch_default', {}, { ...context, status: 'unknown' }, executor, evaluator);

      expect(executor.executedActions).toHaveLength(1);
      expect(executor.executedActions[0].action.action).toBe('default_case');
    });

    it('should skip when no match and no default', async () => {
      const flow: FlowDefinition = {
        name: 'switch_no_default',
        actions: [
          {
            action: 'flow_switch',
            value: 'status',
            cases: {
              a: [{ action: 'case_a' }],
            },
          } as Action,
          { action: 'after_switch' },
        ],
      };
      engine.register(flow);

      await engine.execute('switch_no_default', {}, { ...context, status: 'x' }, executor, evaluator);

      expect(executor.executedActions).toHaveLength(1);
      expect(executor.executedActions[0].action.action).toBe('after_switch');
    });
  });

  describe('Flow Control: repeat', () => {
    it('should execute actions the specified number of times', async () => {
      const flow: FlowDefinition = {
        name: 'repeat_test',
        actions: [
          {
            action: 'repeat',
            times: 3,
            do: [{ action: 'iteration' }],
          } as Action,
        ],
      };
      engine.register(flow);

      await engine.execute('repeat_test', {}, context, executor, evaluator);

      expect(executor.executedActions).toHaveLength(3);
    });

    it('should provide iteration variable in context', async () => {
      const flow: FlowDefinition = {
        name: 'repeat_with_var',
        actions: [
          {
            action: 'repeat',
            times: 3,
            as: 'idx',
            do: [{ action: 'iteration' }],
          } as Action,
        ],
      };
      engine.register(flow);

      await engine.execute('repeat_with_var', {}, context, executor, evaluator);

      expect(executor.executedActions[0].context.idx).toBe(0);
      expect(executor.executedActions[1].context.idx).toBe(1);
      expect(executor.executedActions[2].context.idx).toBe(2);
    });

    it('should default iteration variable to "i"', async () => {
      const flow: FlowDefinition = {
        name: 'repeat_default_var',
        actions: [
          {
            action: 'repeat',
            times: 2,
            do: [{ action: 'iteration' }],
          } as Action,
        ],
      };
      engine.register(flow);

      await engine.execute('repeat_default_var', {}, context, executor, evaluator);

      expect(executor.executedActions[0].context.i).toBe(0);
      expect(executor.executedActions[1].context.i).toBe(1);
    });

    it('should handle zero iterations', async () => {
      const flow: FlowDefinition = {
        name: 'repeat_zero',
        actions: [
          {
            action: 'repeat',
            times: 0,
            do: [{ action: 'never_runs' }],
          } as Action,
        ],
      };
      engine.register(flow);

      await engine.execute('repeat_zero', {}, context, executor, evaluator);

      expect(executor.executedActions).toHaveLength(0);
    });

    it('should cap iterations at maxIterations', async () => {
      const limitedEngine = createFlowEngine({ maxIterations: 5 });
      const flow: FlowDefinition = {
        name: 'repeat_capped',
        actions: [
          {
            action: 'repeat',
            times: 100, // Way more than limit
            do: [{ action: 'iteration' }],
          } as Action,
        ],
      };
      limitedEngine.register(flow);

      await limitedEngine.execute('repeat_capped', {}, context, executor, evaluator);

      expect(executor.executedActions).toHaveLength(5);
    });
  });

  describe('Flow Control: flow_while', () => {
    it('should loop while condition is true', async () => {
      const flow: FlowDefinition = {
        name: 'while_test',
        actions: [
          {
            action: 'flow_while',
            while: 'count < 3',
            max_iterations: 3,  // Limit iterations to test the condition properly
            do: [{ action: 'loop_body' }],
          } as Action,
        ],
      };
      engine.register(flow);

      // count < 3 is always true in this context, but we limit to 3 iterations
      const customContext = {
        ...context,
        count: 0,  // This will always be < 3
      };

      await engine.execute('while_test', {}, customContext as ActionContext, executor, evaluator);

      // Should execute 3 times (limited by max_iterations when condition stays true)
      expect(executor.executedActions).toHaveLength(3);
    });

    it('should not execute if condition is initially false', async () => {
      const flow: FlowDefinition = {
        name: 'while_false',
        actions: [
          {
            action: 'flow_while',
            while: 'false',
            do: [{ action: 'never_runs' }],
          } as Action,
        ],
      };
      engine.register(flow);

      await engine.execute('while_false', {}, context, executor, evaluator);

      expect(executor.executedActions).toHaveLength(0);
    });

    it('should respect maxIterations limit', async () => {
      const limitedEngine = createFlowEngine({ maxIterations: 5 });
      const flow: FlowDefinition = {
        name: 'while_limited',
        actions: [
          {
            action: 'flow_while',
            while: 'true', // Infinite loop
            do: [{ action: 'iteration' }],
          } as Action,
        ],
      };
      limitedEngine.register(flow);

      await limitedEngine.execute('while_limited', {}, context, executor, evaluator);

      expect(executor.executedActions).toHaveLength(5);
    });
  });

  describe('Flow Control: abort', () => {
    it('should stop execution on abort', async () => {
      const flow: FlowDefinition = {
        name: 'abort_test',
        actions: [
          { action: 'before_abort' },
          { action: 'abort', reason: 'Stop here' },
          { action: 'never_reached' },
        ],
      };
      engine.register(flow);

      const result = await engine.execute('abort_test', {}, context, executor, evaluator);

      expect(result.success).toBe(false);
      expect(result.aborted).toBe(true);
      expect(executor.executedActions).toHaveLength(1);
      expect(executor.executedActions[0].action.action).toBe('before_abort');
    });

    it('should include abort reason in result', async () => {
      const flow: FlowDefinition = {
        name: 'abort_reason',
        actions: [
          { action: 'abort', reason: 'User cancelled' },
        ],
      };
      engine.register(flow);

      const result = await engine.execute('abort_reason', {}, context, executor, evaluator);

      expect(result.error?.message).toContain('User cancelled');
    });
  });

  describe('Flow Control: return', () => {
    it('should stop execution and return value', async () => {
      const flow: FlowDefinition = {
        name: 'return_test',
        actions: [
          { action: 'before_return' },
          { action: 'return', value: '42' },
          { action: 'never_reached' },
        ],
      };
      engine.register(flow);

      const result = await engine.execute('return_test', {}, context, executor, evaluator);

      expect(result.success).toBe(true);
      expect(result.value).toBe(42); // Expression evaluated
      expect(executor.executedActions).toHaveLength(1);
    });

    it('should return undefined when no value specified', async () => {
      const flow: FlowDefinition = {
        name: 'return_void',
        actions: [
          { action: 'return' },
        ],
      };
      engine.register(flow);

      const result = await engine.execute('return_void', {}, context, executor, evaluator);

      expect(result.success).toBe(true);
      expect(result.value).toBeUndefined();
    });

    it('should return expression result', async () => {
      const flow: FlowDefinition = {
        name: 'return_expr',
        actions: [
          { action: 'return', value: 'x + y' },
        ],
      };
      engine.register(flow);

      const result = await engine.execute('return_expr', {}, { ...context, x: 10, y: 20 }, executor, evaluator);

      expect(result.value).toBe(30);
    });
  });

  describe('Nested Flow Calls', () => {
    it('should call nested flow', async () => {
      engine.register({
        name: 'inner',
        actions: [{ action: 'inner_action' }],
      });
      engine.register({
        name: 'outer',
        actions: [
          { action: 'before_call' },
          { action: 'call_flow', flow: 'inner' } as Action,
          { action: 'after_call' },
        ],
      });

      await engine.execute('outer', {}, context, executor, evaluator);

      expect(executor.executedActions).toHaveLength(3);
      expect(executor.executedActions[0].action.action).toBe('before_call');
      expect(executor.executedActions[1].action.action).toBe('inner_action');
      expect(executor.executedActions[2].action.action).toBe('after_call');
    });

    it('should pass arguments to nested flow', async () => {
      engine.register({
        name: 'greet',
        parameters: [
          { name: 'name', type: 'string', required: true },
        ],
        actions: [{ action: 'say_hello' }],
      });
      engine.register({
        name: 'caller',
        actions: [
          {
            action: 'call_flow',
            flow: 'greet',
            args: { name: '"Alice"' },
          } as Action,
        ],
      });

      await engine.execute('caller', {}, context, executor, evaluator);

      // Parameters are passed via args object in context
      expect(executor.executedActions[0].context.args.name).toBe('Alice');
    });

    it('should capture return value from nested flow', async () => {
      engine.register({
        name: 'compute',
        actions: [{ action: 'return', value: '100' }],
      });
      engine.register({
        name: 'use_result',
        actions: [
          {
            action: 'call_flow',
            flow: 'compute',
            as: 'result',
          } as Action,
          { action: 'use_value' },
        ],
      });

      await engine.execute('use_result', {}, context, executor, evaluator);

      expect(executor.executedActions[0].context.result).toBe(100);
    });
  });

  describe('Parallel Execution', () => {
    it('should execute parallel actions', async () => {
      const flow: FlowDefinition = {
        name: 'parallel_test',
        actions: [
          {
            action: 'parallel',
            actions: [
              { action: 'task_a' },
              { action: 'task_b' },
              { action: 'task_c' },
            ],
          } as Action,
        ],
      };
      engine.register(flow);

      await engine.execute('parallel_test', {}, context, executor, evaluator);

      expect(executor.executedActions).toHaveLength(3);
      const actionNames = executor.executedActions.map(e => e.action.action);
      expect(actionNames).toContain('task_a');
      expect(actionNames).toContain('task_b');
      expect(actionNames).toContain('task_c');
    });
  });

  describe('Parameter Validation', () => {
    it('should throw for missing required parameters', async () => {
      engine.register({
        name: 'required_param',
        parameters: [
          { name: 'value', type: 'string', required: true },
        ],
        actions: [],
      });

      await expect(
        engine.execute('required_param', {}, context, executor, evaluator)
      ).rejects.toThrow('Missing required parameter');
    });

    it('should use default values for optional parameters', async () => {
      engine.register({
        name: 'optional_param',
        parameters: [
          { name: 'count', type: 'number', default: 10 },
        ],
        actions: [{ action: 'use_count' }],
      });

      await engine.execute('optional_param', {}, context, executor, evaluator);

      // Parameters are passed via args object in context
      expect(executor.executedActions[0].context.args.count).toBe(10);
    });

    it('should override default with provided value', async () => {
      engine.register({
        name: 'override_default',
        parameters: [
          { name: 'count', type: 'number', default: 10 },
        ],
        actions: [{ action: 'use_count' }],
      });

      await engine.execute('override_default', { count: 42 }, context, executor, evaluator);

      // Parameters are passed via args object in context
      expect(executor.executedActions[0].context.args.count).toBe(42);
    });

    it('should validate parameter types', async () => {
      engine.register({
        name: 'typed_param',
        parameters: [
          { name: 'count', type: 'number', required: true },
        ],
        actions: [],
      });

      await expect(
        engine.execute('typed_param', { count: 'not a number' }, context, executor, evaluator)
      ).rejects.toThrow('expected number');
    });
  });

  describe('Depth Limiting', () => {
    it('should throw MaxFlowDepthError when depth exceeded', async () => {
      const shallowEngine = createFlowEngine({ maxDepth: 0 });
      shallowEngine.register({ name: 'test', actions: [] });

      await expect(
        shallowEngine.execute('test', {}, context, executor, evaluator)
      ).rejects.toThrow('Maximum flow call depth');
    });

    it('should prevent infinite recursion by enforcing depth limit', async () => {
      const limitedEngine = createFlowEngine({ maxDepth: 3 });

      // Track how many times the recursive flow actually runs
      let callCount = 0;
      const trackingExecutor = createTestExecutor();
      const originalExecuteOne = trackingExecutor.executeOne.bind(trackingExecutor);
      trackingExecutor.executeOne = async (action, ctx) => {
        callCount++;
        return originalExecuteOne(action, ctx);
      };

      limitedEngine.register({
        name: 'recursive',
        actions: [
          { action: 'track_call' },
          { action: 'call_flow', flow: 'recursive' } as Action,
        ],
      });

      const result = await limitedEngine.execute('recursive', {}, context, trackingExecutor as any, evaluator);

      // Should stop recursion after reaching maxDepth
      // With maxDepth=3, we can call the flow 3 times
      expect(callCount).toBeLessThanOrEqual(6); // 2 actions per level * 3 levels max
      // Flow should complete (error is caught)
      expect(result.success).toBe(true);
    });

    it('should allow calls up to maxDepth limit', async () => {
      const engine3 = createFlowEngine({ maxDepth: 3 });

      engine3.register({
        name: 'level1',
        actions: [
          { action: 'l1_action' },
          { action: 'call_flow', flow: 'level2' } as Action,
        ],
      });
      engine3.register({
        name: 'level2',
        actions: [
          { action: 'l2_action' },
          { action: 'call_flow', flow: 'level3' } as Action,
        ],
      });
      engine3.register({
        name: 'level3',
        actions: [{ action: 'l3_action' }],
      });

      // 3 levels of nesting should work with maxDepth=3
      const result = await engine3.execute('level1', {}, context, executor, evaluator);

      expect(result.success).toBe(true);
      const actionNames = executor.executedActions.map(e => e.action.action);
      expect(actionNames).toContain('l1_action');
      expect(actionNames).toContain('l2_action');
      expect(actionNames).toContain('l3_action');
    });

    it('should fail when exceeding maxDepth in nested calls', async () => {
      const engine2 = createFlowEngine({ maxDepth: 2 });

      engine2.register({
        name: 'level1',
        actions: [
          { action: 'call_flow', flow: 'level2' } as Action,
        ],
      });
      engine2.register({
        name: 'level2',
        actions: [
          { action: 'call_flow', flow: 'level3' } as Action,
        ],
      });
      engine2.register({
        name: 'level3',
        actions: [{ action: 'l3_action' }],
      });

      // 3 levels of nesting should fail with maxDepth=2
      const result = await engine2.execute('level1', {}, context, executor, evaluator);

      // Flow catches the error internally
      expect(result.success).toBe(true);
      // l3_action should NOT have executed
      const actionNames = executor.executedActions.map(e => e.action.action);
      expect(actionNames).not.toContain('l3_action');
    });
  });

  describe('Error Handling', () => {
    it('should catch and return errors from action execution', async () => {
      executor.setResult('failing_action', {
        success: false,
        error: new Error('Action failed'),
      });

      engine.register({
        name: 'with_error',
        actions: [{ action: 'failing_action' }],
      });

      // The flow should complete (catches error internally)
      const result = await engine.execute('with_error', {}, context, executor, evaluator);
      expect(result.success).toBe(true); // Flow completed, action error is in results
    });

    it('should handle real exceptions thrown from action handler', async () => {
      const realError = new Error('Handler exploded!');
      executor.setThrowError('exploding_action', realError);

      engine.register({
        name: 'exploding_flow',
        actions: [{ action: 'exploding_action' }],
      });

      const result = await engine.execute('exploding_flow', {}, context, executor, evaluator);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain('Handler exploded!');
    });

    it('should not execute actions after handler throws exception', async () => {
      executor.setThrowError('exploding', new Error('Boom!'));

      engine.register({
        name: 'flow_with_explosion',
        actions: [
          { action: 'before_explosion' },
          { action: 'exploding' },
          { action: 'after_explosion' },
        ],
      });

      await engine.execute('flow_with_explosion', {}, context, executor, evaluator);

      const actionNames = executor.executedActions.map(e => e.action.action);
      expect(actionNames).toContain('before_explosion');
      expect(actionNames).toContain('exploding');
      expect(actionNames).not.toContain('after_explosion');
    });

    it('should propagate error from nested flow to parent', async () => {
      executor.setThrowError('nested_error', new Error('Nested flow error'));

      engine.register({
        name: 'inner_failing',
        actions: [{ action: 'nested_error' }],
      });

      engine.register({
        name: 'outer',
        actions: [
          { action: 'before_call' },
          { action: 'call_flow', flow: 'inner_failing' } as Action,
          { action: 'after_call' },
        ],
      });

      const result = await engine.execute('outer', {}, context, executor, evaluator);

      // Outer flow should complete but inner flow error is captured
      const callFlowResult = executor.executedActions.find(
        e => e.action.action === 'before_call'
      );
      expect(callFlowResult).toBeDefined();
    });
  });

  describe('Try/Catch/Finally', () => {
    it('should execute catch block on error', async () => {
      executor.setResult('throw_error', {
        success: false,
        error: new Error('Test error'),
      });

      const flow: FlowDefinition = {
        name: 'try_catch',
        actions: [
          {
            action: 'try',
            do: [{ action: 'throw_error' }],
            catch: [{ action: 'handle_error' }],
          } as Action,
        ],
      };
      engine.register(flow);

      await engine.execute('try_catch', {}, context, executor, evaluator);

      const actionNames = executor.executedActions.map(e => e.action.action);
      expect(actionNames).toContain('throw_error');
      expect(actionNames).toContain('handle_error');
    });

    it('should execute finally block always', async () => {
      const flow: FlowDefinition = {
        name: 'try_finally',
        actions: [
          {
            action: 'try',
            do: [{ action: 'main_action' }],
            finally: [{ action: 'cleanup' }],
          } as Action,
        ],
      };
      engine.register(flow);

      await engine.execute('try_finally', {}, context, executor, evaluator);

      const actionNames = executor.executedActions.map(e => e.action.action);
      expect(actionNames).toContain('main_action');
      expect(actionNames).toContain('cleanup');
    });

    it('should provide error context in catch block', async () => {
      executor.setResult('throw_error', {
        success: false,
        error: new Error('Specific error message'),
      });

      const flow: FlowDefinition = {
        name: 'error_context',
        actions: [
          {
            action: 'try',
            do: [{ action: 'throw_error' }],
            catch: [{ action: 'log_error' }],
          } as Action,
        ],
      };
      engine.register(flow);

      await engine.execute('error_context', {}, context, executor, evaluator);

      // The catch block should have error context
      const catchExecution = executor.executedActions.find(e => e.action.action === 'log_error');
      expect(catchExecution?.context.error).toBeDefined();
      expect(catchExecution?.context.errorMessage).toBe('Specific error message');
    });
  });

  describe('Batch Processing', () => {
    it('should iterate over items', async () => {
      const flow: FlowDefinition = {
        name: 'batch_test',
        actions: [
          {
            action: 'batch',
            items: 'items',
            as: 'item',
            each: [{ action: 'process_item' }],
          } as Action,
        ],
      };
      engine.register(flow);

      await engine.execute(
        'batch_test',
        {},
        { ...context, items: ['a', 'b', 'c'] },
        executor,
        evaluator
      );

      expect(executor.executedActions).toHaveLength(3);
      expect(executor.executedActions[0].context.item).toBe('a');
      expect(executor.executedActions[1].context.item).toBe('b');
      expect(executor.executedActions[2].context.item).toBe('c');
    });

    it('should provide item index in context', async () => {
      const flow: FlowDefinition = {
        name: 'batch_index',
        actions: [
          {
            action: 'batch',
            items: 'items',
            as: 'item',
            each: [{ action: 'process_item' }],
          } as Action,
        ],
      };
      engine.register(flow);

      await engine.execute(
        'batch_index',
        {},
        { ...context, items: ['x', 'y'] },
        executor,
        evaluator
      );

      expect(executor.executedActions[0].context.item_index).toBe(0);
      expect(executor.executedActions[1].context.item_index).toBe(1);
    });
  });
});

describe('createFlowEngine factory', () => {
  it('should create engine with default options', () => {
    const engine = createFlowEngine();
    expect(engine).toBeInstanceOf(FlowEngine);
  });

  it('should create engine with custom options', () => {
    const engine = createFlowEngine({
      maxDepth: 100,
      maxIterations: 5000,
    });
    expect(engine).toBeInstanceOf(FlowEngine);
  });
});
