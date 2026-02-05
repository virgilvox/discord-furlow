/**
 * E2E Tests: Command Execution
 *
 * Tests the full pipeline for slash command handling:
 * - Simple commands with replies
 * - Commands with various option types
 * - Subcommands
 * - Deferred responses
 * - Ephemeral responses
 * - Error handling in commands
 */

import { describe, it, expect, afterEach } from 'vitest';
import { createE2ERuntime, type E2ETestRuntime } from '../../e2e/index.js';

describe('E2E: Command Execution', () => {
  let runtime: E2ETestRuntime;

  afterEach(async () => {
    if (runtime) {
      await runtime.stop();
    }
  });

  describe('Simple Commands', () => {
    it('should execute a simple command and reply', async () => {
      runtime = await createE2ERuntime(`
version: "0.1"
commands:
  - name: ping
    description: Check bot latency
    actions:
      - action: reply
        content: "Pong!"
      `);

      await runtime.start();
      await runtime.simulateCommand('ping');

      runtime.assertActionExecuted('reply');
      runtime.assertReplyContains('Pong!');
      runtime.assertNoErrors();
    });

    it('should execute multiple commands independently', async () => {
      runtime = await createE2ERuntime(`
version: "0.1"
commands:
  - name: ping
    description: Ping command
    actions:
      - action: reply
        content: "Pong!"
  - name: hello
    description: Greet
    actions:
      - action: reply
        content: "Hello there!"
      `);

      await runtime.start();

      await runtime.simulateCommand('ping');
      runtime.assertReplyContains('Pong!');

      await runtime.simulateCommand('hello');
      runtime.assertReplyContains('Hello there!');
    });

    it('should execute multiple actions in a command', async () => {
      runtime = await createE2ERuntime(`
version: "0.1"
commands:
  - name: multi
    description: Multiple actions
    actions:
      - action: log
        message: "Command started"
      - action: reply
        content: "Processing..."
      - action: log
        message: "Command finished"
      `);

      await runtime.start();
      await runtime.simulateCommand('multi');

      runtime.assertActionExecutedTimes('log', 2);
      runtime.assertActionExecuted('reply');
      runtime.assertReplyEquals('Processing...');
    });
  });

  describe('Command Options', () => {
    it('should handle string option', async () => {
      runtime = await createE2ERuntime(`
version: "0.1"
commands:
  - name: echo
    description: Echo message
    options:
      - name: text
        description: Text to echo
        type: string
        required: true
    actions:
      - action: reply
        content: "You said: \${args.text}"
      `);

      await runtime.start();
      await runtime.simulateCommand('echo', { text: 'Hello World' });

      runtime.assertReplyContains('You said: Hello World');
    });

    it('should handle integer option', async () => {
      runtime = await createE2ERuntime(`
version: "0.1"
commands:
  - name: roll
    description: Roll dice
    options:
      - name: sides
        description: Number of sides
        type: integer
        required: true
    actions:
      - action: reply
        content: "Rolling d\${args.sides}..."
      `);

      await runtime.start();
      await runtime.simulateCommand('roll', { sides: 20 });

      runtime.assertReplyContains('Rolling d20...');
    });

    it('should handle boolean option', async () => {
      runtime = await createE2ERuntime(`
version: "0.1"
commands:
  - name: announce
    description: Make announcement
    options:
      - name: loud
        description: Whether to be loud
        type: boolean
        required: false
    actions:
      - action: reply
        content: "Loud mode: \${args.loud}"
      `);

      await runtime.start();
      await runtime.simulateCommand('announce', { loud: true });

      runtime.assertReplyContains('Loud mode: true');
    });

    it('should handle user option', async () => {
      runtime = await createE2ERuntime(`
version: "0.1"
commands:
  - name: greet
    description: Greet a user
    options:
      - name: target
        description: User to greet
        type: user
        required: true
    actions:
      - action: reply
        content: "Hello, \${args.target.username}!"
      `);

      await runtime.start();
      const user = runtime.createUser({ username: 'Alice' });
      await runtime.simulateCommand('greet', { target: user });

      runtime.assertReplyContains('Hello, Alice!');
    });

    it('should handle multiple options', async () => {
      runtime = await createE2ERuntime(`
version: "0.1"
commands:
  - name: config
    description: Configure settings
    options:
      - name: name
        description: Setting name
        type: string
        required: true
      - name: value
        description: Setting value
        type: string
        required: true
      - name: persist
        description: Persist setting
        type: boolean
        required: false
    actions:
      - action: reply
        content: "Set \${args.name} = \${args.value} (persist: \${args.persist})"
      `);

      await runtime.start();
      await runtime.simulateCommand('config', {
        name: 'theme',
        value: 'dark',
        persist: true,
      });

      runtime.assertReplyContains('Set theme = dark (persist: true)');
    });

    it('should handle optional parameters with defaults', async () => {
      runtime = await createE2ERuntime(`
version: "0.1"
commands:
  - name: countdown
    description: Start countdown
    options:
      - name: seconds
        description: Seconds to count
        type: integer
        required: false
    actions:
      - action: reply
        content: "Counting from \${args.seconds || 10}..."
      `);

      await runtime.start();
      await runtime.simulateCommand('countdown', {});

      runtime.assertReplyContains('Counting from 10...');
    });
  });

  describe('Context Variables', () => {
    it('should have access to user context', async () => {
      runtime = await createE2ERuntime(`
version: "0.1"
commands:
  - name: whoami
    description: Show user info
    actions:
      - action: reply
        content: "You are \${user.username} (\${user.id})"
      `);

      await runtime.start();
      await runtime.simulateCommand('whoami', {}, { username: 'TestUser', id: '12345' });

      runtime.assertReplyContains('You are TestUser');
      runtime.assertReplyContains('12345');
    });

    it('should have access to guild context', async () => {
      runtime = await createE2ERuntime(`
version: "0.1"
commands:
  - name: serverinfo
    description: Show server info
    actions:
      - action: reply
        content: "Server: \${guild.name} (members: \${guild.member_count})"
      `);

      await runtime.start();
      await runtime.simulateCommand('serverinfo');

      runtime.assertReplyContains('Server: Test Server');
      runtime.assertReplyContains('members: 100');
    });

    it('should have access to channel context', async () => {
      runtime = await createE2ERuntime(`
version: "0.1"
commands:
  - name: channelinfo
    description: Show channel info
    actions:
      - action: reply
        content: "Channel: \${channel.name}"
      `);

      await runtime.start();
      await runtime.simulateCommand('channelinfo');

      runtime.assertReplyContains('Channel: general');
    });
  });

  describe('Deferred Responses', () => {
    it('should handle deferred reply', async () => {
      runtime = await createE2ERuntime(`
version: "0.1"
commands:
  - name: slow
    description: Slow command
    actions:
      - action: defer
      - action: log
        message: "Processing..."
      - action: reply
        content: "Done processing!"
      `);

      await runtime.start();
      await runtime.simulateCommand('slow');

      runtime.assertActionExecuted('defer');
      runtime.assertActionExecuted('reply');
      runtime.assertReplyContains('Done processing!');
    });

    it('should handle ephemeral deferred reply', async () => {
      runtime = await createE2ERuntime(`
version: "0.1"
commands:
  - name: secret
    description: Secret command
    actions:
      - action: defer
        ephemeral: true
      - action: reply
        content: "This is a secret!"
        ephemeral: true
      `);

      await runtime.start();
      await runtime.simulateCommand('secret');

      const calls = runtime.getDiscordCalls();
      const deferCall = calls.find((c) => c.method === 'defer');
      expect(deferCall?.args[0]).toBe(true);
    });
  });

  describe('Conditional Execution', () => {
    it('should execute action when condition is true', async () => {
      runtime = await createE2ERuntime(`
version: "0.1"
commands:
  - name: admin
    description: Admin command
    actions:
      - action: reply
        content: "Admin access granted"
        when: "user.id == '12345'"
      - action: reply
        content: "Access denied"
        when: "user.id != '12345'"
      `);

      await runtime.start();
      await runtime.simulateCommand('admin', {}, { id: '12345' });

      runtime.assertReplyContains('Admin access granted');
    });

    it('should skip action when condition is false', async () => {
      runtime = await createE2ERuntime(`
version: "0.1"
commands:
  - name: test
    description: Test command
    actions:
      - action: reply
        content: "Should not appear"
        when: "false"
      - action: reply
        content: "This should appear"
      `);

      await runtime.start();
      await runtime.simulateCommand('test');

      const replies = runtime.getReplies();
      expect(replies).toHaveLength(1);
      expect(replies[0]).toBe('This should appear');
    });
  });

  describe('Error Handling', () => {
    it('should handle action errors gracefully', async () => {
      runtime = await createE2ERuntime(`
version: "0.1"
commands:
  - name: risky
    description: Risky command
    actions:
      - action: throw_error
        message: "Something went wrong"
      `);

      await runtime.start();
      await runtime.simulateCommand('risky');

      const errors = runtime.tracker.getErrors();
      expect(errors).toHaveLength(1);
      expect(errors[0]?.result.error?.message).toBe('Something went wrong');
    });

    it('should continue after error (errors are non-fatal without try/catch)', async () => {
      // Note: FlowEngine does NOT stop on error by default - it continues executing
      // subsequent actions. Use try/catch for error handling.
      runtime = await createE2ERuntime(`
version: "0.1"
commands:
  - name: failing
    description: Failing command
    actions:
      - action: log
        message: "Before error"
      - action: throw_error
        message: "Error here"
      - action: reply
        content: "Still executes despite error"
      `);

      await runtime.start();
      await runtime.simulateCommand('failing');

      runtime.assertActionExecuted('log');
      runtime.assertActionExecuted('reply');

      // Error should be tracked
      const errors = runtime.tracker.getErrors();
      expect(errors).toHaveLength(1);
    });
  });

  describe('Command with State', () => {
    it('should read and write state in command', async () => {
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
    description: Increment counter
    actions:
      - action: increment
        name: counter
      - action: reply
        content: "Counter incremented"
      `);

      await runtime.start();

      // Initial state
      const initial = await runtime.getState<number>('counter');
      expect(initial).toBe(0);

      // Execute command
      await runtime.simulateCommand('count');

      // Check state was updated
      const after = await runtime.getState<number>('counter');
      expect(after).toBe(1);
    });
  });
});
