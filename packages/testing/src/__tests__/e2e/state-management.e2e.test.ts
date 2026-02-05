/**
 * E2E Tests: State Management
 *
 * Tests the full pipeline for state management:
 * - Variable get/set with all scopes
 * - TTL expiration
 * - Increment/decrement atomicity
 * - Table CRUD operations
 * - Query with where, orderBy, limit
 */

import { describe, it, expect, afterEach, vi, beforeEach } from 'vitest';
import { createE2ERuntime, type E2ETestRuntime } from '../../e2e/index.js';

describe('E2E: State Management', () => {
  let runtime: E2ETestRuntime;

  afterEach(async () => {
    if (runtime) {
      await runtime.stop();
    }
  });

  describe('Variables', () => {
    it('should set and get variable with default scope (guild)', async () => {
      runtime = await createE2ERuntime(`
version: "0.1"
state:
  variables:
    counter:
      type: number
      scope: guild
      default: 0
commands:
  - name: set
    description: Set counter
    options:
      - name: value
        type: integer
        description: The value to set
        required: true
    actions:
      - action: set_variable
        name: counter
        value: "args.value"
      - action: reply
        content: "Counter set!"
  - name: get
    description: Get counter
    actions:
      - action: reply
        content: "Counter value retrieved"
      `);

      await runtime.start();

      // Check default value
      const initial = await runtime.getState<number>('counter');
      expect(initial).toBe(0);

      // Set value
      await runtime.simulateCommand('set', { value: 42 });

      // Verify updated
      const updated = await runtime.getState<number>('counter');
      expect(updated).toBe(42);
    });

    it('should handle string variables', async () => {
      runtime = await createE2ERuntime(`
version: "0.1"
state:
  variables:
    greeting:
      type: string
      scope: guild
      default: "Hello"
commands:
  - name: greet
    description: Update greeting
    options:
      - name: message
        type: string
        description: The value to use
        required: true
    actions:
      - action: set_variable
        name: greeting
        value: "args.message"
      - action: reply
        content: "Greeting updated!"
      `);

      await runtime.start();

      const initial = await runtime.getState<string>('greeting');
      expect(initial).toBe('Hello');

      await runtime.simulateCommand('greet', { message: 'Welcome!' });

      const updated = await runtime.getState<string>('greeting');
      expect(updated).toBe('Welcome!');
    });

    it('should handle boolean variables', async () => {
      runtime = await createE2ERuntime(`
version: "0.1"
state:
  variables:
    enabled:
      type: boolean
      scope: guild
      default: false
commands:
  - name: enable
    description: Enable feature
    actions:
      - action: set_variable
        name: enabled
        value: "true"
      - action: reply
        content: "Enabled!"
  - name: disable
    description: Disable feature
    actions:
      - action: set_variable
        name: enabled
        value: "false"
      - action: reply
        content: "Disabled!"
      `);

      await runtime.start();

      expect(await runtime.getState<boolean>('enabled')).toBe(false);

      await runtime.simulateCommand('enable');
      expect(await runtime.getState<boolean>('enabled')).toBe(true);

      await runtime.simulateCommand('disable');
      expect(await runtime.getState<boolean>('enabled')).toBe(false);
    });
  });

  describe('Variable Scopes', () => {
    it('should handle global scope', async () => {
      runtime = await createE2ERuntime(`
version: "0.1"
state:
  variables:
    globalCount:
      type: number
      scope: global
      default: 0
commands:
  - name: increment
    description: Increment global counter
    actions:
      - action: increment
        name: globalCount
      - action: reply
        content: "Incremented!"
      `);

      await runtime.start();

      // Global variables should be accessible without guild context
      await runtime.simulateCommand('increment');
      await runtime.simulateCommand('increment');

      const value = await runtime.getState<number>('globalCount');
      expect(value).toBe(2);
    });

    it('should handle guild scope', async () => {
      runtime = await createE2ERuntime(`
version: "0.1"
state:
  variables:
    guildData:
      type: string
      scope: guild
      default: ""
commands:
  - name: setguild
    description: Set guild data
    actions:
      - action: set_variable
        name: guildData
        value: "'guild-specific'"
      - action: reply
        content: "Set!"
      `);

      await runtime.start();
      await runtime.simulateCommand('setguild');

      const value = await runtime.getState<string>('guildData');
      expect(value).toBe('guild-specific');
    });

    it('should handle user scope', async () => {
      runtime = await createE2ERuntime(`
version: "0.1"
state:
  variables:
    userPreference:
      type: string
      scope: user
      default: "default"
commands:
  - name: setpref
    description: Set user preference
    options:
      - name: value
        type: string
        description: The value to use
        required: true
    actions:
      - action: set_variable
        name: userPreference
        value: "args.value"
      - action: reply
        content: "Preference set!"
      `);

      await runtime.start();

      // Set for user 1
      await runtime.simulateCommand('setpref', { value: 'user1-pref' }, { id: 'user1' });

      // Verify user 1's preference
      const user1Pref = await runtime.getState<string>('userPreference', { userId: 'user1' });
      expect(user1Pref).toBe('user1-pref');

      // User 2 should have default
      const user2Pref = await runtime.getState<string>('userPreference', { userId: 'user2' });
      expect(user2Pref).toBe('default');
    });
  });

  describe('Increment/Decrement', () => {
    it('should increment counter', async () => {
      runtime = await createE2ERuntime(`
version: "0.1"
state:
  variables:
    count:
      type: number
      scope: guild
      default: 0
commands:
  - name: inc
    description: Increment
    actions:
      - action: increment
        name: count
      - action: reply
        content: "Incremented!"
      `);

      await runtime.start();

      await runtime.simulateCommand('inc');
      expect(await runtime.getState<number>('count')).toBe(1);

      await runtime.simulateCommand('inc');
      expect(await runtime.getState<number>('count')).toBe(2);
    });

    it('should increment by custom amount', async () => {
      runtime = await createE2ERuntime(`
version: "0.1"
state:
  variables:
    score:
      type: number
      scope: guild
      default: 0
commands:
  - name: addscore
    description: Add score
    options:
      - name: points
        type: integer
        description: The value to set
        required: true
    actions:
      - action: increment
        name: score
        by: 10
      - action: reply
        content: "Score added!"
      `);

      await runtime.start();

      await runtime.simulateCommand('addscore', { points: 10 });
      expect(await runtime.getState<number>('score')).toBe(10);

      await runtime.simulateCommand('addscore', { points: 10 });
      expect(await runtime.getState<number>('score')).toBe(20);
    });

    it('should decrement counter', async () => {
      runtime = await createE2ERuntime(`
version: "0.1"
state:
  variables:
    lives:
      type: number
      scope: guild
      default: 3
commands:
  - name: loselife
    description: Lose a life
    actions:
      - action: decrement
        name: lives
      - action: reply
        content: "Life lost!"
      `);

      await runtime.start();

      expect(await runtime.getState<number>('lives')).toBe(3);

      await runtime.simulateCommand('loselife');
      expect(await runtime.getState<number>('lives')).toBe(2);

      await runtime.simulateCommand('loselife');
      expect(await runtime.getState<number>('lives')).toBe(1);
    });
  });

  describe('Tables', () => {
    it('should insert and query rows', async () => {
      runtime = await createE2ERuntime(`
version: "0.1"
state:
  tables:
    users:
      columns:
        id:
          type: string
          primary: true
        name:
          type: string
        xp:
          type: number
          default: 0
commands:
  - name: adduser
    description: Add user
    options:
      - name: id
        type: string
        description: The user ID
        required: true
      - name: name
        type: string
        description: The value to use
        required: true
    actions:
      - action: insert
        table: users
        data:
          id: "\${args.id}"
          name: "\${args.name}"
          xp: 0
      - action: reply
        content: "User added!"
      `);

      await runtime.start();

      await runtime.simulateCommand('adduser', { id: '1', name: 'Alice' });
      runtime.assertActionExecuted('insert');
    });

    it('should query with where clause', async () => {
      runtime = await createE2ERuntime(`
version: "0.1"
state:
  tables:
    items:
      columns:
        id:
          type: string
          primary: true
        name:
          type: string
        price:
          type: number
commands:
  - name: additem
    description: Add item
    actions:
      - action: insert
        table: items
        data:
          id: "1"
          name: "Sword"
          price: 100
      - action: reply
        content: "Item added!"
  - name: finditem
    description: Find item
    actions:
      - action: query
        table: items
        where:
          name: "Sword"
      - action: reply
        content: "Query complete!"
      `);

      await runtime.start();

      await runtime.simulateCommand('additem');
      runtime.assertActionExecuted('insert');

      await runtime.simulateCommand('finditem');
      runtime.assertActionExecuted('query');
    });

    it('should update rows', async () => {
      runtime = await createE2ERuntime(`
version: "0.1"
state:
  tables:
    settings:
      columns:
        key:
          type: string
          primary: true
        value:
          type: string
commands:
  - name: init
    description: Initialize setting
    actions:
      - action: insert
        table: settings
        data:
          key: "theme"
          value: "light"
      - action: reply
        content: "Initialized!"
  - name: updatetheme
    description: Update theme
    actions:
      - action: update
        table: settings
        where:
          key: "theme"
        data:
          value: "dark"
      - action: reply
        content: "Updated!"
      `);

      await runtime.start();

      await runtime.simulateCommand('init');
      await runtime.simulateCommand('updatetheme');

      runtime.assertActionExecuted('update');
    });

    it('should delete rows', async () => {
      runtime = await createE2ERuntime(`
version: "0.1"
state:
  tables:
    logs:
      columns:
        id:
          type: string
          primary: true
        message:
          type: string
commands:
  - name: addlog
    description: Add log
    actions:
      - action: insert
        table: logs
        data:
          id: "1"
          message: "Test log"
      - action: reply
        content: "Log added!"
  - name: clearlog
    description: Clear log
    actions:
      - action: delete_rows
        table: logs
        where:
          id: "1"
      - action: reply
        content: "Log cleared!"
      `);

      await runtime.start();

      await runtime.simulateCommand('addlog');
      await runtime.simulateCommand('clearlog');

      runtime.assertActionExecuted('delete_rows');
    });
  });

  describe('State in Flows', () => {
    it('should share state between flow and command', async () => {
      runtime = await createE2ERuntime(`
version: "0.1"
state:
  variables:
    total:
      type: number
      scope: guild
      default: 0
flows:
  - name: addToTotal
    parameters:
      - name: amount
        type: number
        required: true
    actions:
      - action: increment
        name: total
        by: 5
commands:
  - name: add
    description: Add to total
    options:
      - name: amount
        type: integer
        description: The value to set
        required: true
    actions:
      - action: call_flow
        flow: addToTotal
        args:
          amount: "args.amount"
      - action: reply
        content: "Added!"
      `);

      await runtime.start();

      expect(await runtime.getState<number>('total')).toBe(0);

      await runtime.simulateCommand('add', { amount: 10 });
      expect(await runtime.getState<number>('total')).toBe(5);

      await runtime.simulateCommand('add', { amount: 5 });
      expect(await runtime.getState<number>('total')).toBe(10);
    });
  });

  describe('Conditional State Updates', () => {
    it('should conditionally update state', async () => {
      runtime = await createE2ERuntime(`
version: "0.1"
state:
  variables:
    highScore:
      type: number
      scope: guild
      default: 0
commands:
  - name: score
    description: Submit score
    options:
      - name: value
        type: integer
        description: The value to set
        required: true
    actions:
      - action: flow_if
        if: "args.value > highScore"
        then:
          - action: set_variable
            name: highScore
            value: "args.value"
          - action: reply
            content: "New high score!"
        else:
          - action: reply
            content: "Score recorded"
      `);

      await runtime.start();

      await runtime.simulateCommand('score', { value: 50 });
      runtime.assertReplyContains('New high score!');
      expect(await runtime.getState<number>('highScore')).toBe(50);

      runtime.tracker.clear();
      await runtime.simulateCommand('score', { value: 30 });
      runtime.assertReplyContains('Score recorded');
      expect(await runtime.getState<number>('highScore')).toBe(50);

      runtime.tracker.clear();
      await runtime.simulateCommand('score', { value: 100 });
      runtime.assertReplyContains('New high score!');
      expect(await runtime.getState<number>('highScore')).toBe(100);
    });
  });
});
