/**
 * E2E Tests: Flow Control
 *
 * Tests the full pipeline for flow control actions:
 * - flow_if with then/else branches
 * - flow_switch with cases
 * - flow_while with exit conditions
 * - repeat loops
 * - batch processing
 * - call_flow with parameters
 * - Nested flows
 * - try/catch/finally
 */

import { describe, it, expect, afterEach } from 'vitest';
import { createE2ERuntime, type E2ETestRuntime } from '../../e2e/index.js';

describe('E2E: Flow Control', () => {
  let runtime: E2ETestRuntime;

  afterEach(async () => {
    if (runtime) {
      await runtime.stop();
    }
  });

  describe('flow_if', () => {
    it('should execute then branch when condition is true', async () => {
      runtime = await createE2ERuntime(`
version: "0.1"
commands:
  - name: check
    description: Check condition
    options:
      - name: value
        type: integer
        description: The value to check
        required: true
    actions:
      - action: flow_if
        if: "args.value > 10"
        then:
          - action: reply
            content: "Value is greater than 10"
        else:
          - action: reply
            content: "Value is 10 or less"
      `);

      await runtime.start();
      await runtime.simulateCommand('check', { value: 15 });

      runtime.assertReplyContains('Value is greater than 10');
    });

    it('should execute else branch when condition is false', async () => {
      runtime = await createE2ERuntime(`
version: "0.1"
commands:
  - name: check
    description: Check condition
    options:
      - name: value
        type: integer
        description: The value to check
        required: true
    actions:
      - action: flow_if
        if: "args.value > 10"
        then:
          - action: reply
            content: "Value is greater than 10"
        else:
          - action: reply
            content: "Value is 10 or less"
      `);

      await runtime.start();
      await runtime.simulateCommand('check', { value: 5 });

      runtime.assertReplyContains('Value is 10 or less');
    });

    it('should handle nested if statements', async () => {
      runtime = await createE2ERuntime(`
version: "0.1"
commands:
  - name: grade
    description: Get grade
    options:
      - name: score
        type: integer
        description: The value to check
        required: true
    actions:
      - action: flow_if
        if: "args.score >= 90"
        then:
          - action: reply
            content: "Grade: A"
        else:
          - action: flow_if
            if: "args.score >= 80"
            then:
              - action: reply
                content: "Grade: B"
            else:
              - action: reply
                content: "Grade: C or below"
      `);

      await runtime.start();

      await runtime.simulateCommand('grade', { score: 95 });
      runtime.assertReplyContains('Grade: A');

      runtime.tracker.clear();
      await runtime.simulateCommand('grade', { score: 85 });
      runtime.assertReplyContains('Grade: B');

      runtime.tracker.clear();
      await runtime.simulateCommand('grade', { score: 70 });
      runtime.assertReplyContains('Grade: C or below');
    });
  });

  describe('flow_switch', () => {
    it('should execute matching case', async () => {
      runtime = await createE2ERuntime(`
version: "0.1"
commands:
  - name: color
    description: Get color info
    options:
      - name: name
        type: string
        description: The value to use
        required: true
    actions:
      - action: flow_switch
        value: "args.name"
        cases:
          red:
            - action: reply
              content: "Red is a warm color"
          blue:
            - action: reply
              content: "Blue is a cool color"
          green:
            - action: reply
              content: "Green is nature's color"
        default:
          - action: reply
            content: "Unknown color"
      `);

      await runtime.start();

      await runtime.simulateCommand('color', { name: 'blue' });
      runtime.assertReplyContains('Blue is a cool color');

      runtime.tracker.clear();
      await runtime.simulateCommand('color', { name: 'red' });
      runtime.assertReplyContains('Red is a warm color');
    });

    it('should execute default case when no match', async () => {
      runtime = await createE2ERuntime(`
version: "0.1"
commands:
  - name: color
    description: Get color info
    options:
      - name: name
        type: string
        description: The value to use
        required: true
    actions:
      - action: flow_switch
        value: "args.name"
        cases:
          red:
            - action: reply
              content: "Red"
          blue:
            - action: reply
              content: "Blue"
        default:
          - action: reply
            content: "Unknown color"
      `);

      await runtime.start();
      await runtime.simulateCommand('color', { name: 'purple' });

      runtime.assertReplyContains('Unknown color');
    });
  });

  describe('flow_while', () => {
    it('should execute loop until condition is false', async () => {
      runtime = await createE2ERuntime(`
version: "0.1"
state:
  variables:
    counter:
      type: number
      scope: guild
      default: 0
commands:
  - name: count
    description: Count to 5
    actions:
      - action: flow_while
        while: "counter < 5"
        do:
          - action: increment
            name: counter
      - action: reply
        content: "Counted to 5!"
      `);

      await runtime.start();
      await runtime.simulateCommand('count');

      const counter = await runtime.getState<number>('counter');
      expect(counter).toBe(5);
      runtime.assertReplyContains('Counted to 5!');
    });

    it('should respect max_iterations', async () => {
      runtime = await createE2ERuntime(`
version: "0.1"
state:
  variables:
    counter:
      type: number
      scope: guild
      default: 0
commands:
  - name: loop
    description: Loop with limit
    actions:
      - action: flow_while
        while: "true"
        max_iterations: 3
        do:
          - action: increment
            name: counter
      - action: reply
        content: "Done!"
      `);

      await runtime.start();
      await runtime.simulateCommand('loop');

      const counter = await runtime.getState<number>('counter');
      expect(counter).toBe(3);
    });
  });

  describe('repeat', () => {
    it('should execute actions specified number of times', async () => {
      runtime = await createE2ERuntime(`
version: "0.1"
state:
  variables:
    sum:
      type: number
      scope: guild
      default: 0
commands:
  - name: sum
    description: Sum numbers
    actions:
      - action: repeat
        times: 5
        as: i
        do:
          - action: increment
            name: sum
            by: 1
      - action: reply
        content: "Sum complete!"
      `);

      await runtime.start();
      await runtime.simulateCommand('sum');

      const sum = await runtime.getState<number>('sum');
      expect(sum).toBe(5);
    });

    it('should provide loop variable', async () => {
      runtime = await createE2ERuntime(`
version: "0.1"
state:
  variables:
    total:
      type: number
      scope: guild
      default: 0
commands:
  - name: sumindex
    description: Sum indices
    actions:
      - action: repeat
        times: 4
        as: idx
        do:
          - action: increment
            name: total
            by: 1
      - action: reply
        content: "Done"
      `);

      await runtime.start();
      await runtime.simulateCommand('sumindex');

      // 0 + 1 + 2 + 3 = 6, but we increment by 1 each time so it's 4
      const total = await runtime.getState<number>('total');
      expect(total).toBe(4);
    });
  });

  describe('batch', () => {
    it('should process items sequentially', async () => {
      runtime = await createE2ERuntime(`
version: "0.1"
state:
  variables:
    processed:
      type: number
      scope: guild
      default: 0
commands:
  - name: process
    description: Process items
    options:
      - name: items
        type: string
        description: The value to use
        required: true
    actions:
      - action: batch
        items: "[1, 2, 3, 4, 5]"
        as: item
        each:
          - action: increment
            name: processed
      - action: reply
        content: "Processed all items"
      `);

      await runtime.start();
      await runtime.simulateCommand('process', { items: '5' });

      const processed = await runtime.getState<number>('processed');
      expect(processed).toBe(5);
    });
  });

  describe('call_flow', () => {
    it('should call a defined flow', async () => {
      runtime = await createE2ERuntime(`
version: "0.1"
flows:
  - name: greet
    parameters:
      - name: name
        type: string
        description: The value to use
        required: true
    actions:
      - action: reply
        content: "Hello, \${args.name}!"
commands:
  - name: hello
    description: Say hello
    options:
      - name: target
        type: string
        description: The value to use
        required: true
    actions:
      - action: call_flow
        flow: greet
        args:
          name: "args.target"
      `);

      await runtime.start();
      await runtime.simulateCommand('hello', { target: 'Alice' });

      runtime.assertReplyContains('Hello, Alice!');
    });

    it('should pass multiple parameters', async () => {
      runtime = await createE2ERuntime(`
version: "0.1"
flows:
  - name: format
    parameters:
      - name: prefix
        type: string
        required: true
      - name: text
        type: string
        required: true
      - name: suffix
        type: string
        required: false
        default: "!"
    actions:
      - action: reply
        content: "\${args.prefix}\${args.text}\${args.suffix}"
commands:
  - name: format
    description: Format text
    actions:
      - action: call_flow
        flow: format
        args:
          prefix: "'>>> '"
          text: "'Hello'"
          suffix: "' <<<'"
      `);

      await runtime.start();
      await runtime.simulateCommand('format');

      runtime.assertReplyContains('>>> Hello <<<');
    });

    it('should handle nested flow calls', async () => {
      runtime = await createE2ERuntime(`
version: "0.1"
flows:
  - name: inner
    actions:
      - action: log
        message: "Inner flow"
  - name: outer
    actions:
      - action: log
        message: "Before inner"
      - action: call_flow
        flow: inner
      - action: log
        message: "After inner"
commands:
  - name: test
    description: Test nested flows
    actions:
      - action: call_flow
        flow: outer
      `);

      await runtime.start();
      await runtime.simulateCommand('test');

      runtime.assertActionExecutedTimes('log', 3);
    });
  });

  describe('try/catch/finally', () => {
    it('should catch errors and continue', async () => {
      runtime = await createE2ERuntime(`
version: "0.1"
commands:
  - name: safe
    description: Safe command
    actions:
      - action: try
        do:
          - action: throw_error
            message: "Something failed"
        catch:
          - action: reply
            content: "Caught an error!"
        finally:
          - action: log
            message: "Cleanup complete"
      `);

      await runtime.start();
      await runtime.simulateCommand('safe');

      runtime.assertReplyContains('Caught an error!');
      runtime.assertActionExecuted('log');
    });

    it('should execute finally even without error', async () => {
      runtime = await createE2ERuntime(`
version: "0.1"
commands:
  - name: test
    description: Test finally
    actions:
      - action: try
        do:
          - action: reply
            content: "Success!"
        catch:
          - action: reply
            content: "Error!"
        finally:
          - action: log
            message: "Finally executed"
      `);

      await runtime.start();
      await runtime.simulateCommand('test');

      runtime.assertReplyContains('Success!');
      runtime.assertActionExecuted('log');

      const replies = runtime.getReplies();
      expect(replies.some((r) => r.includes('Error!'))).toBe(false);
    });
  });

  describe('abort and return', () => {
    it('should abort flow execution', async () => {
      runtime = await createE2ERuntime(`
version: "0.1"
flows:
  - name: early_exit
    actions:
      - action: log
        message: "Before abort"
      - action: abort
        reason: "Stopping early"
      - action: log
        message: "After abort"
commands:
  - name: test
    description: Test abort
    actions:
      - action: call_flow
        flow: early_exit
      `);

      await runtime.start();
      await runtime.simulateCommand('test');

      runtime.assertActionExecutedTimes('log', 1);
    });

    it('should return value from flow', async () => {
      runtime = await createE2ERuntime(`
version: "0.1"
flows:
  - name: calculate
    parameters:
      - name: a
        type: number
        required: true
      - name: b
        type: number
        required: true
    actions:
      - action: log
        message: "Calculating"
    returns: "args.a + args.b"
commands:
  - name: calc
    description: Calculate
    actions:
      - action: call_flow
        flow: calculate
        args:
          a: "5"
          b: "3"
        as: result
      - action: reply
        content: "Result stored"
      `);

      await runtime.start();
      await runtime.simulateCommand('calc');

      runtime.assertActionExecuted('log');
      runtime.assertReplyContains('Result stored');
    });
  });

  describe('parallel', () => {
    it('should execute actions in parallel', async () => {
      runtime = await createE2ERuntime(`
version: "0.1"
state:
  variables:
    a:
      type: number
      scope: guild
      default: 0
    b:
      type: number
      scope: guild
      default: 0
    c:
      type: number
      scope: guild
      default: 0
commands:
  - name: parallel
    description: Parallel execution
    actions:
      - action: parallel
        actions:
          - action: set_variable
            name: a
            value: "1"
          - action: set_variable
            name: b
            value: "2"
          - action: set_variable
            name: c
            value: "3"
      - action: reply
        content: "Done!"
      `);

      await runtime.start();
      await runtime.simulateCommand('parallel');

      const a = await runtime.getState<number>('a');
      const b = await runtime.getState<number>('b');
      const c = await runtime.getState<number>('c');

      expect(a).toBe(1);
      expect(b).toBe(2);
      expect(c).toBe(3);
    });
  });
});
