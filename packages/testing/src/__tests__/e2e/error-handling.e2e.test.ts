/**
 * E2E Tests: Error Handling
 *
 * Tests the full pipeline for error handling:
 * - Invalid action configs
 * - Expression evaluation errors
 * - stopOnError behavior
 * - Flow abort scenarios
 * - Malformed YAML
 */

import { describe, it, expect, afterEach } from 'vitest';
import { createE2ERuntime, type E2ETestRuntime } from '../../e2e/index.js';

describe('E2E: Error Handling', () => {
  let runtime: E2ETestRuntime;

  afterEach(async () => {
    if (runtime) {
      await runtime.stop();
    }
  });

  describe('Action Errors', () => {
    it('should capture action execution errors', async () => {
      runtime = await createE2ERuntime(`
version: "0.1"
commands:
  - name: fail
    description: Failing command
    actions:
      - action: throw_error
        message: "Intentional failure"
      `);

      await runtime.start();
      await runtime.simulateCommand('fail');

      const errors = runtime.tracker.getErrors();
      expect(errors).toHaveLength(1);
      expect(errors[0]?.action).toBe('throw_error');
      expect(errors[0]?.result.error?.message).toBe('Intentional failure');
    });

    it('should continue execution after action error (errors are non-fatal)', async () => {
      // Note: FlowEngine does NOT stop on error by default - it continues executing
      // subsequent actions. Use try/catch for error handling.
      runtime = await createE2ERuntime(`
version: "0.1"
commands:
  - name: sequence
    description: Sequence with error
    actions:
      - action: log
        message: "Step 1"
      - action: throw_error
        message: "Error at step 2"
      - action: log
        message: "Step 3 - executes despite error"
      `);

      await runtime.start();
      await runtime.simulateCommand('sequence');

      // Both log actions should execute (errors don't stop execution)
      runtime.assertActionExecuted('log');
      runtime.assertActionExecutedTimes('log', 2);

      // Error should be tracked
      const errors = runtime.tracker.getErrors();
      expect(errors).toHaveLength(1);
    });

    it('should track multiple errors in try block', async () => {
      runtime = await createE2ERuntime(`
version: "0.1"
commands:
  - name: multierror
    description: Multiple errors
    actions:
      - action: try
        do:
          - action: throw_error
            message: "First error"
        catch:
          - action: log
            message: "Caught first error"
      - action: try
        do:
          - action: throw_error
            message: "Second error"
        catch:
          - action: log
            message: "Caught second error"
      `);

      await runtime.start();
      await runtime.simulateCommand('multierror');

      // Both errors should be caught and logged
      runtime.assertActionExecutedTimes('log', 2);
    });
  });

  describe('Expression Errors', () => {
    it('should handle undefined variable access gracefully', async () => {
      runtime = await createE2ERuntime(`
version: "0.1"
commands:
  - name: undefined
    description: Access undefined
    actions:
      - action: reply
        content: "Value: \${nonexistent || 'default'}"
      `);

      await runtime.start();
      await runtime.simulateCommand('undefined');

      // Should use default value
      runtime.assertReplyContains('Value: default');
    });

    it('should handle null values in expressions', async () => {
      runtime = await createE2ERuntime(`
version: "0.1"
commands:
  - name: nulltest
    description: Test null handling
    options:
      - name: value
        type: string
        description: The value to test
        required: false
    actions:
      - action: reply
        content: "Got: \${args.value || 'nothing'}"
      `);

      await runtime.start();
      await runtime.simulateCommand('nulltest', {});

      runtime.assertReplyContains('Got: nothing');
    });
  });

  describe('Try/Catch/Finally', () => {
    it('should execute catch block on error', async () => {
      runtime = await createE2ERuntime(`
version: "0.1"
commands:
  - name: trycatch
    description: Try catch test
    actions:
      - action: try
        do:
          - action: throw_error
            message: "Oops!"
        catch:
          - action: reply
            content: "Error was caught!"
      `);

      await runtime.start();
      await runtime.simulateCommand('trycatch');

      runtime.assertReplyContains('Error was caught!');
    });

    it('should execute finally block always', async () => {
      runtime = await createE2ERuntime(`
version: "0.1"
state:
  variables:
    cleaned:
      type: boolean
      scope: guild
      default: false
commands:
  - name: cleanup
    description: Cleanup test
    actions:
      - action: try
        do:
          - action: throw_error
            message: "Error!"
        catch:
          - action: log
            message: "Caught"
        finally:
          - action: set_variable
            name: cleaned
            value: "true"
      `);

      await runtime.start();
      await runtime.simulateCommand('cleanup');

      const cleaned = await runtime.getState<boolean>('cleaned');
      expect(cleaned).toBe(true);
    });

    it('should execute finally even with successful try', async () => {
      runtime = await createE2ERuntime(`
version: "0.1"
state:
  variables:
    finalized:
      type: boolean
      scope: guild
      default: false
commands:
  - name: success
    description: Successful with finally
    actions:
      - action: try
        do:
          - action: reply
            content: "Success!"
        finally:
          - action: set_variable
            name: finalized
            value: "true"
      `);

      await runtime.start();
      await runtime.simulateCommand('success');

      runtime.assertReplyContains('Success!');
      const finalized = await runtime.getState<boolean>('finalized');
      expect(finalized).toBe(true);
    });
  });

  describe('Flow Abort', () => {
    it('should stop flow on abort', async () => {
      runtime = await createE2ERuntime(`
version: "0.1"
flows:
  - name: aborting
    actions:
      - action: log
        message: "Before abort"
      - action: abort
        reason: "User requested"
      - action: log
        message: "After abort - should not run"
commands:
  - name: test
    description: Test abort
    actions:
      - action: call_flow
        flow: aborting
      - action: reply
        content: "Flow completed"
      `);

      await runtime.start();
      await runtime.simulateCommand('test');

      // Only the first log should execute
      runtime.assertActionExecutedTimes('log', 1);
    });

    it('should propagate abort through nested flows', async () => {
      runtime = await createE2ERuntime(`
version: "0.1"
flows:
  - name: inner
    actions:
      - action: abort
        reason: "Inner abort"
  - name: outer
    actions:
      - action: log
        message: "Outer start"
      - action: call_flow
        flow: inner
      - action: log
        message: "Outer end - should not run"
commands:
  - name: test
    description: Test nested abort
    actions:
      - action: call_flow
        flow: outer
      `);

      await runtime.start();
      await runtime.simulateCommand('test');

      runtime.assertActionExecutedTimes('log', 1);
    });
  });

  describe('Malformed YAML', () => {
    it('should reject invalid YAML syntax', async () => {
      await expect(
        createE2ERuntime(`
version: "0.1"
commands:
  - name: test
    description: [invalid yaml here
    actions:
      - action: reply
        `)
      ).rejects.toThrow();
    });

    it('should reject invalid spec schema', async () => {
      await expect(
        createE2ERuntime(`
version: "0.1"
commands:
  - name: test
    # missing required 'description' field
    actions:
      - action: reply
        content: "test"
        `)
      ).rejects.toThrow();
    });

    it('should accept minimal valid spec', async () => {
      // This should not throw
      runtime = await createE2ERuntime(`
version: "0.1"
      `);

      expect(runtime.spec.version).toBe('0.1');
    });
  });

  describe('Error Recovery', () => {
    it('should continue after caught error', async () => {
      runtime = await createE2ERuntime(`
version: "0.1"
commands:
  - name: recover
    description: Recovery test
    actions:
      - action: try
        do:
          - action: throw_error
            message: "First error"
        catch:
          - action: log
            message: "Recovered from first"
      - action: reply
        content: "Continued after error"
      `);

      await runtime.start();
      await runtime.simulateCommand('recover');

      runtime.assertActionExecuted('log');
      runtime.assertReplyContains('Continued after error');
    });

    it('should accumulate errors in tracker', async () => {
      runtime = await createE2ERuntime(`
version: "0.1"
commands:
  - name: multi
    description: Multiple recoverable errors
    actions:
      - action: try
        do:
          - action: throw_error
            message: "Error 1"
        catch:
          - action: log
            message: "Caught 1"
      - action: try
        do:
          - action: throw_error
            message: "Error 2"
        catch:
          - action: log
            message: "Caught 2"
      - action: reply
        content: "Done"
      `);

      await runtime.start();
      await runtime.simulateCommand('multi');

      const errors = runtime.tracker.getErrors();
      expect(errors).toHaveLength(2);
      runtime.assertReplyContains('Done');
    });
  });

  describe('Conditional Error Handling', () => {
    it('should handle errors in conditional branches', async () => {
      runtime = await createE2ERuntime(`
version: "0.1"
commands:
  - name: conditional
    description: Conditional error
    options:
      - name: fail
        type: boolean
        description: Whether to fail
        required: true
    actions:
      - action: try
        do:
          - action: flow_if
            if: "args.fail"
            then:
              - action: throw_error
                message: "Conditional failure"
            else:
              - action: reply
                content: "Success path"
        catch:
          - action: reply
            content: "Error caught"
      `);

      await runtime.start();

      // Test failure path
      await runtime.simulateCommand('conditional', { fail: true });
      runtime.assertReplyContains('Error caught');

      runtime.tracker.clear();

      // Test success path
      await runtime.simulateCommand('conditional', { fail: false });
      runtime.assertReplyContains('Success path');
    });
  });
});
