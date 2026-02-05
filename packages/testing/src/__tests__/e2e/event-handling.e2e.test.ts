/**
 * E2E Tests: Event Handling
 *
 * Tests the full pipeline for Discord event handling:
 * - message_create with conditions
 * - member_join / member_leave
 * - reaction_add / reaction_remove
 * - Event conditions (when clause)
 * - Debounce and throttle
 * - Multiple handlers for same event
 */

import { describe, it, expect, afterEach, vi, beforeEach } from 'vitest';
import { createE2ERuntime, type E2ETestRuntime } from '../../e2e/index.js';

describe('E2E: Event Handling', () => {
  let runtime: E2ETestRuntime;

  afterEach(async () => {
    if (runtime) {
      await runtime.stop();
    }
  });

  describe('Message Events', () => {
    it('should handle message_create event', async () => {
      runtime = await createE2ERuntime(`
version: "0.1"
events:
  - event: message_create
    actions:
      - action: log
        message: "Message received: \${message.content}"
      `);

      await runtime.start();
      await runtime.simulateMessage('Hello bot!');

      runtime.assertActionExecuted('log');
    });

    it('should filter out bot messages', async () => {
      runtime = await createE2ERuntime(`
version: "0.1"
events:
  - event: message_create
    when: "!message.author.bot"
    actions:
      - action: reply
        content: "I see your message!"
      `);

      await runtime.start();

      // User message - should trigger
      await runtime.simulateMessage('Hello!', { authorBot: false });
      runtime.assertReplyContains('I see your message!');

      // Clear tracker
      runtime.tracker.clear();

      // Bot message - should not trigger
      await runtime.simulateMessage('Bot message', { authorBot: true });
      runtime.assertActionNotExecuted('reply');
    });

    it('should respond to specific content', async () => {
      runtime = await createE2ERuntime(`
version: "0.1"
events:
  - event: message_create
    when: "message.content == 'hello'"
    actions:
      - action: reply
        content: "Hello back!"
      `);

      await runtime.start();

      // Matching message
      await runtime.simulateMessage('hello');
      runtime.assertReplyContains('Hello back!');

      // Clear
      runtime.tracker.clear();

      // Non-matching message
      await runtime.simulateMessage('hi there');
      runtime.assertActionNotExecuted('reply');
    });

    it('should handle content pattern matching', async () => {
      runtime = await createE2ERuntime(`
version: "0.1"
events:
  - event: message_create
    when: "message.content|startsWith('!')"
    actions:
      - action: log
        message: "Command detected"
      `);

      await runtime.start();

      await runtime.simulateMessage('!help');
      runtime.assertActionExecuted('log');

      runtime.tracker.clear();

      await runtime.simulateMessage('regular message');
      runtime.assertActionNotExecuted('log');
    });
  });

  describe('Member Events', () => {
    it('should handle member_join event', async () => {
      runtime = await createE2ERuntime(`
version: "0.1"
events:
  - event: member_join
    actions:
      - action: reply
        content: "Welcome, \${user.username}!"
      `);

      await runtime.start();
      await runtime.simulateMemberJoin({ username: 'NewUser' });

      runtime.assertReplyContains('Welcome, NewUser!');
    });

    it('should handle guild_member_add event (alternative name)', async () => {
      runtime = await createE2ERuntime(`
version: "0.1"
events:
  - event: guild_member_add
    actions:
      - action: log
        message: "New member joined"
      `);

      await runtime.start();
      await runtime.simulateMemberJoin();

      runtime.assertActionExecuted('log');
    });

    it('should handle member_leave event', async () => {
      runtime = await createE2ERuntime(`
version: "0.1"
events:
  - event: member_leave
    actions:
      - action: log
        message: "Goodbye, \${user.username}"
      `);

      await runtime.start();
      await runtime.simulateMemberLeave({ username: 'LeavingUser' });

      runtime.assertActionExecuted('log');
    });

    it('should execute multiple actions on member join', async () => {
      runtime = await createE2ERuntime(`
version: "0.1"
events:
  - event: member_join
    actions:
      - action: log
        message: "Processing new member"
      - action: assign_role
        role: "newcomer"
      - action: send_message
        content: "Please read the rules!"
      `);

      await runtime.start();
      await runtime.simulateMemberJoin();

      runtime.assertActionExecuted('log');
      runtime.assertActionExecuted('assign_role');
      runtime.assertActionExecuted('send_message');
    });
  });

  describe('Reaction Events', () => {
    it('should handle reaction_add event', async () => {
      runtime = await createE2ERuntime(`
version: "0.1"
events:
  - event: reaction_add
    actions:
      - action: log
        message: "Reaction added: \${reaction.emoji}"
      `);

      await runtime.start();
      await runtime.simulateReactionAdd('👍');

      runtime.assertActionExecuted('log');
    });

    it('should handle reaction_remove event', async () => {
      runtime = await createE2ERuntime(`
version: "0.1"
events:
  - event: reaction_remove
    actions:
      - action: log
        message: "Reaction removed"
      `);

      await runtime.start();
      await runtime.simulateReactionRemove('👎');

      runtime.assertActionExecuted('log');
    });

    it('should filter reactions by emoji', async () => {
      runtime = await createE2ERuntime(`
version: "0.1"
events:
  - event: reaction_add
    when: "reaction.emoji == '⭐'"
    actions:
      - action: log
        message: "Star reaction!"
      `);

      await runtime.start();

      await runtime.simulateReactionAdd('⭐');
      runtime.assertActionExecuted('log');

      runtime.tracker.clear();

      await runtime.simulateReactionAdd('👍');
      runtime.assertActionNotExecuted('log');
    });
  });

  describe('Event Conditions', () => {
    it('should evaluate complex conditions', async () => {
      runtime = await createE2ERuntime(`
version: "0.1"
events:
  - event: message_create
    when:
      all:
        - "!message.author.bot"
        - "message.content|length > 5"
    actions:
      - action: log
        message: "Valid message"
      `);

      await runtime.start();

      // Long user message - should trigger
      await runtime.simulateMessage('Hello, this is a long message');
      runtime.assertActionExecuted('log');

      runtime.tracker.clear();

      // Short message - should not trigger
      await runtime.simulateMessage('Hi');
      runtime.assertActionNotExecuted('log');
    });

    it('should handle any condition', async () => {
      runtime = await createE2ERuntime(`
version: "0.1"
events:
  - event: message_create
    when:
      any:
        - "message.content == 'hello'"
        - "message.content == 'hi'"
    actions:
      - action: reply
        content: "Greetings!"
      `);

      await runtime.start();

      await runtime.simulateMessage('hello');
      runtime.assertReplyContains('Greetings!');

      runtime.tracker.clear();

      await runtime.simulateMessage('hi');
      runtime.assertReplyContains('Greetings!');

      runtime.tracker.clear();

      await runtime.simulateMessage('hey');
      runtime.assertActionNotExecuted('reply');
    });

    it('should handle not condition', async () => {
      runtime = await createE2ERuntime(`
version: "0.1"
events:
  - event: message_create
    when:
      not: "message.author.bot"
    actions:
      - action: log
        message: "Human message"
      `);

      await runtime.start();

      await runtime.simulateMessage('Hello', { authorBot: false });
      runtime.assertActionExecuted('log');

      runtime.tracker.clear();

      await runtime.simulateMessage('Bot says hi', { authorBot: true });
      runtime.assertActionNotExecuted('log');
    });
  });

  describe('Multiple Handlers', () => {
    it('should execute multiple handlers for same event', async () => {
      runtime = await createE2ERuntime(`
version: "0.1"
events:
  - event: message_create
    actions:
      - action: log
        message: "Handler 1"
  - event: message_create
    actions:
      - action: log
        message: "Handler 2"
      `);

      await runtime.start();
      await runtime.simulateMessage('test');

      runtime.assertActionExecutedTimes('log', 2);
    });

    it('should execute handlers with different conditions independently', async () => {
      runtime = await createE2ERuntime(`
version: "0.1"
events:
  - event: message_create
    when: "message.content|startsWith('!')"
    actions:
      - action: log
        message: "Command handler"
  - event: message_create
    when: "message.content|startsWith('@')"
    actions:
      - action: log
        message: "Mention handler"
      `);

      await runtime.start();

      // Only command handler
      await runtime.simulateMessage('!help');
      runtime.assertActionExecutedTimes('log', 1);

      runtime.tracker.clear();

      // Only mention handler
      await runtime.simulateMessage('@someone');
      runtime.assertActionExecutedTimes('log', 1);

      runtime.tracker.clear();

      // Neither
      await runtime.simulateMessage('regular message');
      runtime.assertActionNotExecuted('log');
    });
  });

  describe('Ready Event', () => {
    it('should execute ready event on start', async () => {
      runtime = await createE2ERuntime(`
version: "0.1"
events:
  - event: ready
    actions:
      - action: log
        message: "Bot is online!"
      `);

      await runtime.start();

      // Ready event is auto-executed on start
      runtime.assertActionExecuted('log');
    });

    it('should initialize state on ready', async () => {
      runtime = await createE2ERuntime(`
version: "0.1"
state:
  variables:
    initialized:
      type: boolean
      scope: global
      default: false
events:
  - event: ready
    actions:
      - action: set_variable
        name: initialized
        value: "true"
      `);

      await runtime.start();

      const initialized = await runtime.getState<boolean>('initialized');
      expect(initialized).toBe(true);
    });
  });

  describe('Button and Select Interactions', () => {
    it('should handle button click', async () => {
      runtime = await createE2ERuntime(`
version: "0.1"
components:
  buttons:
    confirm:
      label: Confirm
      style: success
      actions:
        - action: reply
          content: "Confirmed!"
      `);

      await runtime.start();
      await runtime.simulateButton('confirm');

      runtime.assertReplyContains('Confirmed!');
    });

    it('should handle select menu', async () => {
      runtime = await createE2ERuntime(`
version: "0.1"
components:
  selects:
    color_picker:
      placeholder: Choose a color
      options:
        - label: Red
          value: red
        - label: Blue
          value: blue
      actions:
        - action: reply
          content: "You selected: \${args.values[0]}"
      `);

      await runtime.start();
      await runtime.simulateSelectMenu('color_picker', ['blue']);

      runtime.assertReplyContains('You selected: blue');
    });

    it('should handle modal submit', async () => {
      runtime = await createE2ERuntime(`
version: "0.1"
components:
  modals:
    feedback_form:
      title: Feedback
      components:
        - type: text
          custom_id: feedback_text
          label: Your feedback
      actions:
        - action: reply
          content: "Thanks for your feedback!"
      `);

      await runtime.start();
      await runtime.simulateModalSubmit('feedback_form', {
        feedback_text: 'Great bot!',
      });

      runtime.assertReplyContains('Thanks for your feedback!');
    });
  });
});
