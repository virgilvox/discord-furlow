/**
 * Automod engine tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AutomodEngine, createAutomodEngine } from '../engine.js';
import type { AutomodConfig, AutomodRule, AutomodTrigger } from '@furlow/schema';
import type { ActionContext } from '../../actions/types.js';
import type { ActionExecutor } from '../../actions/executor.js';
import type { ExpressionEvaluator } from '../../expression/evaluator.js';

describe('AutomodEngine', () => {
  let engine: AutomodEngine;
  let mockExecutor: ActionExecutor;
  let mockEvaluator: ExpressionEvaluator;
  let mockContext: ActionContext;

  beforeEach(() => {
    engine = createAutomodEngine();

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
      user: { id: 'user-123' },
      member: { role_ids: ['role-1'], permissions: ['SEND_MESSAGES'] },
      channel: { id: 'channel-123' },
    } as ActionContext;
  });

  describe('configure', () => {
    it('should configure with enabled true', () => {
      engine.configure({ enabled: true, rules: [] });
      expect(engine.isEnabled()).toBe(true);
    });

    it('should configure with enabled false', () => {
      engine.configure({ enabled: false, rules: [] });
      expect(engine.isEnabled()).toBe(false);
    });

    it('should default to enabled when not specified', () => {
      engine.configure({ rules: [] });
      expect(engine.isEnabled()).toBe(true);
    });

    it('should store rules from config', () => {
      const rules: AutomodRule[] = [
        { name: 'rule1', trigger: { type: 'keyword', keywords: ['bad'] }, actions: [] },
        { name: 'rule2', trigger: { type: 'invite' }, actions: [] },
      ];

      engine.configure({ rules });

      expect(engine.getRuleNames()).toEqual(['rule1', 'rule2']);
    });
  });

  describe('check', () => {
    describe('basic functionality', () => {
      it('should pass when no rules configured', async () => {
        engine.configure({ rules: [] });

        const result = await engine.check('test content', mockContext, mockEvaluator);

        expect(result.passed).toBe(true);
        expect(result.matches).toHaveLength(0);
      });

      it('should pass when engine is disabled', async () => {
        engine.configure({
          enabled: false,
          rules: [
            { name: 'test', trigger: { type: 'keyword', keywords: ['bad'] }, actions: [] },
          ],
        });

        const result = await engine.check('bad content', mockContext, mockEvaluator);

        expect(result.passed).toBe(true);
      });

      it('should skip disabled rules', async () => {
        engine.configure({
          rules: [
            {
              name: 'disabled',
              enabled: false,
              trigger: { type: 'keyword', keywords: ['bad'] },
              actions: [],
            },
          ],
        });

        const result = await engine.check('bad content', mockContext, mockEvaluator);

        expect(result.passed).toBe(true);
      });
    });

    describe('keyword trigger', () => {
      it('should match keywords case-insensitively', async () => {
        engine.configure({
          rules: [
            { name: 'keywords', trigger: { type: 'keyword', keywords: ['bad', 'word'] }, actions: [] },
          ],
        });

        const result = await engine.check('This is BAD content', mockContext, mockEvaluator);

        expect(result.passed).toBe(false);
        expect(result.matches).toHaveLength(1);
        expect(result.matches[0].matched).toContain('bad');
      });

      it('should match multiple keywords', async () => {
        engine.configure({
          rules: [
            { name: 'multi', trigger: { type: 'keyword', keywords: ['bad', 'evil'] }, actions: [] },
          ],
        });

        const result = await engine.check('bad and evil content', mockContext, mockEvaluator);

        expect(result.matches[0].matched).toContain('bad');
        expect(result.matches[0].matched).toContain('evil');
      });

      it('should respect allowed list', async () => {
        engine.configure({
          rules: [
            {
              name: 'allowed',
              trigger: { type: 'keyword', keywords: ['bad'], allowed: ['badminton'] },
              actions: [],
            },
          ],
        });

        const result = await engine.check('I love badminton', mockContext, mockEvaluator);

        expect(result.passed).toBe(true);
      });

      it('should not match when keyword not present', async () => {
        engine.configure({
          rules: [
            { name: 'miss', trigger: { type: 'keyword', keywords: ['banned'] }, actions: [] },
          ],
        });

        const result = await engine.check('This is clean content', mockContext, mockEvaluator);

        expect(result.passed).toBe(true);
      });
    });

    describe('regex trigger', () => {
      it('should match regex patterns', async () => {
        engine.configure({
          rules: [
            { name: 'regex', trigger: { type: 'regex', regex: ['\\d{3}-\\d{3}-\\d{4}'] }, actions: [] },
          ],
        });

        const result = await engine.check('Call me at 555-123-4567', mockContext, mockEvaluator);

        expect(result.passed).toBe(false);
        expect(result.matches[0].matched).toContain('555-123-4567');
      });

      it('should match multiple regex occurrences', async () => {
        engine.configure({
          rules: [
            { name: 'multi-regex', trigger: { type: 'regex', regex: ['\\b\\w+@\\w+\\.\\w+\\b'] }, actions: [] },
          ],
        });

        const result = await engine.check('Email: test@example.com and other@test.org', mockContext, mockEvaluator);

        expect(result.matches[0].matched).toHaveLength(2);
      });

      it('should handle invalid regex gracefully', async () => {
        engine.configure({
          rules: [
            { name: 'invalid', trigger: { type: 'regex', regex: ['[invalid('] }, actions: [] },
          ],
        });

        const result = await engine.check('any content', mockContext, mockEvaluator);

        expect(result.passed).toBe(true);
      });

      it('should match regex case-insensitively', async () => {
        engine.configure({
          rules: [
            { name: 'case', trigger: { type: 'regex', regex: ['forbidden'] }, actions: [] },
          ],
        });

        const result = await engine.check('FORBIDDEN content', mockContext, mockEvaluator);

        expect(result.passed).toBe(false);
      });
    });

    describe('link trigger', () => {
      it('should match blocked links', async () => {
        engine.configure({
          rules: [
            { name: 'links', trigger: { type: 'link', blocked: ['malicious.com'] }, actions: [] },
          ],
        });

        const result = await engine.check('Check out https://malicious.com/page', mockContext, mockEvaluator);

        expect(result.passed).toBe(false);
        expect(result.matches[0].matched).toContain('https://malicious.com/page');
      });

      it('should allow whitelisted links', async () => {
        engine.configure({
          rules: [
            { name: 'whitelist', trigger: { type: 'link', allowed: ['example.com'] }, actions: [] },
          ],
        });

        const result = await engine.check('Visit https://example.com', mockContext, mockEvaluator);

        expect(result.passed).toBe(true);
      });

      it('should block unlisted links when no allowed list', async () => {
        engine.configure({
          rules: [
            { name: 'block-all', trigger: { type: 'link' }, actions: [] },
          ],
        });

        const result = await engine.check('Visit https://random-site.com', mockContext, mockEvaluator);

        expect(result.passed).toBe(false);
      });

      it('should not match non-URLs', async () => {
        engine.configure({
          rules: [
            { name: 'no-url', trigger: { type: 'link', blocked: ['bad'] }, actions: [] },
          ],
        });

        const result = await engine.check('This is just text without URLs', mockContext, mockEvaluator);

        expect(result.passed).toBe(true);
      });
    });

    describe('invite trigger', () => {
      it('should match discord.gg invites', async () => {
        engine.configure({
          rules: [
            { name: 'invites', trigger: { type: 'invite' }, actions: [] },
          ],
        });

        const result = await engine.check('Join us at discord.gg/abc123', mockContext, mockEvaluator);

        expect(result.passed).toBe(false);
        expect(result.matches[0].matched).toContain('discord.gg/abc123');
      });

      it('should match discordapp.com invites', async () => {
        engine.configure({
          rules: [
            { name: 'invites', trigger: { type: 'invite' }, actions: [] },
          ],
        });

        const result = await engine.check('Join: discordapp.com/invite/xyz789', mockContext, mockEvaluator);

        expect(result.passed).toBe(false);
      });

      it('should not match non-invite text', async () => {
        engine.configure({
          rules: [
            { name: 'invites', trigger: { type: 'invite' }, actions: [] },
          ],
        });

        const result = await engine.check('Discord is great for gaming', mockContext, mockEvaluator);

        expect(result.passed).toBe(true);
      });
    });

    describe('caps trigger', () => {
      it('should detect excessive caps', async () => {
        engine.configure({
          rules: [
            { name: 'caps', trigger: { type: 'caps', threshold: 70 }, actions: [] },
          ],
        });

        const result = await engine.check('THIS IS ALL CAPS MESSAGE', mockContext, mockEvaluator);

        expect(result.passed).toBe(false);
        expect(result.matches[0].matched[0]).toMatch(/\d+% caps/);
      });

      it('should pass normal text', async () => {
        engine.configure({
          rules: [
            { name: 'caps', trigger: { type: 'caps', threshold: 70 }, actions: [] },
          ],
        });

        const result = await engine.check('This is normal text', mockContext, mockEvaluator);

        expect(result.passed).toBe(true);
      });

      it('should use default threshold of 70', async () => {
        engine.configure({
          rules: [
            { name: 'caps', trigger: { type: 'caps' }, actions: [] },
          ],
        });

        // 65% caps should pass
        const result = await engine.check('HELLO there friend', mockContext, mockEvaluator);
        expect(result.passed).toBe(true);
      });

      it('should handle text with no letters', async () => {
        engine.configure({
          rules: [
            { name: 'caps', trigger: { type: 'caps' }, actions: [] },
          ],
        });

        const result = await engine.check('12345 !@#$%', mockContext, mockEvaluator);

        expect(result.passed).toBe(true);
      });
    });

    describe('emoji_spam trigger', () => {
      it('should detect emoji spam', async () => {
        engine.configure({
          rules: [
            { name: 'emoji', trigger: { type: 'emoji_spam', threshold: 5 }, actions: [] },
          ],
        });

        const result = await engine.check('Hello 😀😀😀😀😀😀 world', mockContext, mockEvaluator);

        expect(result.passed).toBe(false);
        expect(result.matches[0].matched[0]).toMatch(/\d+ emojis/);
      });

      it('should pass with few emojis', async () => {
        engine.configure({
          rules: [
            { name: 'emoji', trigger: { type: 'emoji_spam', threshold: 10 }, actions: [] },
          ],
        });

        const result = await engine.check('Hello 😀 world 👋', mockContext, mockEvaluator);

        expect(result.passed).toBe(true);
      });

      it('should use default threshold of 10', async () => {
        engine.configure({
          rules: [
            { name: 'emoji', trigger: { type: 'emoji_spam' }, actions: [] },
          ],
        });

        const result = await engine.check('Test 😀😀😀😀😀😀😀😀😀', mockContext, mockEvaluator);

        // 9 emojis should pass with threshold 10
        expect(result.passed).toBe(true);
      });
    });

    describe('mention_spam trigger', () => {
      it('should detect user mention spam', async () => {
        engine.configure({
          rules: [
            { name: 'mention', trigger: { type: 'mention_spam', threshold: 3 }, actions: [] },
          ],
        });

        const result = await engine.check('Hey <@123> <@456> <@789> <@101>', mockContext, mockEvaluator);

        expect(result.passed).toBe(false);
        expect(result.matches[0].matched[0]).toMatch(/\d+ mentions/);
      });

      it('should detect role mention spam', async () => {
        engine.configure({
          rules: [
            { name: 'mention', trigger: { type: 'mention_spam', threshold: 3 }, actions: [] },
          ],
        });

        const result = await engine.check('Attention <@&111> <@&222> <@&333> <@&444>', mockContext, mockEvaluator);

        expect(result.passed).toBe(false);
      });

      it('should pass with few mentions', async () => {
        engine.configure({
          rules: [
            { name: 'mention', trigger: { type: 'mention_spam', threshold: 5 }, actions: [] },
          ],
        });

        const result = await engine.check('Hello <@123> and <@456>', mockContext, mockEvaluator);

        expect(result.passed).toBe(true);
      });
    });

    describe('newline_spam trigger', () => {
      it('should detect newline spam', async () => {
        engine.configure({
          rules: [
            { name: 'newline', trigger: { type: 'newline_spam', threshold: 5 }, actions: [] },
          ],
        });

        const result = await engine.check('Line1\nLine2\nLine3\nLine4\nLine5\nLine6', mockContext, mockEvaluator);

        expect(result.passed).toBe(false);
        expect(result.matches[0].matched[0]).toMatch(/\d+ newlines/);
      });

      it('should pass with few newlines', async () => {
        engine.configure({
          rules: [
            { name: 'newline', trigger: { type: 'newline_spam', threshold: 10 }, actions: [] },
          ],
        });

        const result = await engine.check('Line1\nLine2\nLine3', mockContext, mockEvaluator);

        expect(result.passed).toBe(true);
      });
    });

    describe('multiple triggers', () => {
      it('should check all triggers in array', async () => {
        engine.configure({
          rules: [
            {
              name: 'multi',
              trigger: [
                { type: 'keyword', keywords: ['bad'] },
                { type: 'caps', threshold: 80 },
              ],
              actions: [],
            },
          ],
        });

        const result = await engine.check('bad word here', mockContext, mockEvaluator);

        expect(result.passed).toBe(false);
        expect(result.matches).toHaveLength(1);
      });

      it('should report all matching triggers', async () => {
        engine.configure({
          rules: [
            {
              name: 'multi',
              trigger: [
                { type: 'keyword', keywords: ['bad'] },
                { type: 'invite' },
              ],
              actions: [],
            },
          ],
        });

        const result = await engine.check('bad content with discord.gg/invite', mockContext, mockEvaluator);

        expect(result.matches).toHaveLength(2);
      });
    });

    describe('exempt conditions', () => {
      it('should exempt users by ID', async () => {
        engine.configure({
          rules: [
            {
              name: 'exempt-user',
              trigger: { type: 'keyword', keywords: ['bad'] },
              exempt: { users: ['user-123'] },
              actions: [],
            },
          ],
        });

        const result = await engine.check('bad content', mockContext, mockEvaluator);

        expect(result.passed).toBe(true);
      });

      it('should exempt by role', async () => {
        engine.configure({
          rules: [
            {
              name: 'exempt-role',
              trigger: { type: 'keyword', keywords: ['bad'] },
              exempt: { roles: ['role-1'] },
              actions: [],
            },
          ],
        });

        const result = await engine.check('bad content', mockContext, mockEvaluator);

        expect(result.passed).toBe(true);
      });

      it('should exempt by channel', async () => {
        engine.configure({
          rules: [
            {
              name: 'exempt-channel',
              trigger: { type: 'keyword', keywords: ['bad'] },
              exempt: { channels: ['channel-123'] },
              actions: [],
            },
          ],
        });

        const result = await engine.check('bad content', mockContext, mockEvaluator);

        expect(result.passed).toBe(true);
      });

      it('should exempt by permission', async () => {
        engine.configure({
          rules: [
            {
              name: 'exempt-perm',
              trigger: { type: 'keyword', keywords: ['bad'] },
              exempt: { permissions: ['SEND_MESSAGES'] },
              actions: [],
            },
          ],
        });

        const result = await engine.check('bad content', mockContext, mockEvaluator);

        expect(result.passed).toBe(true);
      });

      it('should not exempt when conditions not met', async () => {
        engine.configure({
          rules: [
            {
              name: 'no-exempt',
              trigger: { type: 'keyword', keywords: ['bad'] },
              exempt: { users: ['other-user'] },
              actions: [],
            },
          ],
        });

        const result = await engine.check('bad content', mockContext, mockEvaluator);

        expect(result.passed).toBe(false);
      });
    });

    describe('when condition', () => {
      it('should evaluate when condition', async () => {
        engine.configure({
          rules: [
            {
              name: 'conditional',
              trigger: { type: 'keyword', keywords: ['bad'] },
              when: 'shouldCheck == true',
              actions: [],
            },
          ],
        });

        await engine.check('bad content', mockContext, mockEvaluator);

        expect(mockEvaluator.evaluate).toHaveBeenCalledWith(
          'shouldCheck == true',
          mockContext
        );
      });

      it('should skip rule when condition is false', async () => {
        (mockEvaluator.evaluate as ReturnType<typeof vi.fn>).mockResolvedValue(false);

        engine.configure({
          rules: [
            {
              name: 'skip',
              trigger: { type: 'keyword', keywords: ['bad'] },
              when: 'false',
              actions: [],
            },
          ],
        });

        const result = await engine.check('bad content', mockContext, mockEvaluator);

        expect(result.passed).toBe(true);
      });

      it('should handle object when condition', async () => {
        engine.configure({
          rules: [
            {
              name: 'obj-when',
              trigger: { type: 'keyword', keywords: ['bad'] },
              when: { expr: 'complex.condition' } as any,
              actions: [],
            },
          ],
        });

        await engine.check('bad content', mockContext, mockEvaluator);

        expect(mockEvaluator.evaluate).toHaveBeenCalledWith(
          'complex.condition',
          mockContext
        );
      });
    });
  });

  describe('executeActions', () => {
    it('should execute actions for matches', async () => {
      const matches = [
        {
          rule: {
            name: 'test-rule',
            trigger: { type: 'keyword' as const, keywords: ['bad'] },
            actions: [{ action: 'delete_message' }],
          },
          trigger: { type: 'keyword' as const },
          matched: ['bad'],
          content: 'bad content',
        },
      ];

      await engine.executeActions(matches, mockContext, mockExecutor);

      expect(mockExecutor.executeSequence).toHaveBeenCalledWith(
        [expect.objectContaining({ action: 'delete_message' })],
        expect.objectContaining({
          automod: {
            rule: 'test-rule',
            trigger: 'keyword',
            matched: ['bad'],
          },
        })
      );
    });

    it('should execute actions for each match', async () => {
      const matches = [
        {
          rule: { name: 'rule1', trigger: { type: 'keyword' as const }, actions: [] },
          trigger: { type: 'keyword' as const },
          matched: ['a'],
          content: 'test',
        },
        {
          rule: { name: 'rule2', trigger: { type: 'regex' as const }, actions: [] },
          trigger: { type: 'regex' as const },
          matched: ['b'],
          content: 'test',
        },
      ];

      await engine.executeActions(matches, mockContext, mockExecutor);

      expect(mockExecutor.executeSequence).toHaveBeenCalledTimes(2);
    });

    it('should normalize shorthand actions', async () => {
      const matches = [
        {
          rule: {
            name: 'shorthand',
            trigger: { type: 'keyword' as const },
            actions: [{ delete_message: {} }, { timeout: { duration: '5m' } }] as any[],
          },
          trigger: { type: 'keyword' as const },
          matched: ['test'],
          content: 'test',
        },
      ];

      await engine.executeActions(matches, mockContext, mockExecutor);

      expect(mockExecutor.executeSequence).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ action: 'delete_message' }),
          expect.objectContaining({ action: 'timeout', duration: '5m' }),
        ]),
        expect.any(Object)
      );
    });
  });

  describe('getRuleNames', () => {
    it('should return all rule names', () => {
      engine.configure({
        rules: [
          { name: 'rule-a', trigger: { type: 'keyword' }, actions: [] },
          { name: 'rule-b', trigger: { type: 'regex' }, actions: [] },
          { name: 'rule-c', trigger: { type: 'invite' }, actions: [] },
        ],
      });

      const names = engine.getRuleNames();

      expect(names).toEqual(['rule-a', 'rule-b', 'rule-c']);
    });

    it('should return empty array when no rules', () => {
      engine.configure({ rules: [] });
      expect(engine.getRuleNames()).toEqual([]);
    });
  });

  describe('setEnabled', () => {
    it('should enable the engine', () => {
      engine.configure({ enabled: false, rules: [] });
      engine.setEnabled(true);
      expect(engine.isEnabled()).toBe(true);
    });

    it('should disable the engine', () => {
      engine.configure({ enabled: true, rules: [] });
      engine.setEnabled(false);
      expect(engine.isEnabled()).toBe(false);
    });
  });

  describe('isEnabled', () => {
    it('should return current enabled state', () => {
      engine.configure({ enabled: true, rules: [] });
      expect(engine.isEnabled()).toBe(true);

      engine.setEnabled(false);
      expect(engine.isEnabled()).toBe(false);
    });
  });

  describe('attachment trigger', () => {
    it('should detect attachments', async () => {
      engine.configure({
        rules: [{ name: 'no-files', trigger: { type: 'attachment' }, actions: [] }],
      });
      const contextWithAttachments = {
        ...mockContext,
        attachments: [{ name: 'file.txt', size: 100 }],
      };
      const result = await engine.check('check this file', contextWithAttachments as any, mockEvaluator);
      expect(result.passed).toBe(false);
      expect(result.matches[0].matched[0]).toMatch(/1 attachment/);
    });

    it('should block specific file extensions', async () => {
      engine.configure({
        rules: [{ name: 'no-exe', trigger: { type: 'attachment', blocked: ['exe', 'dll'] }, actions: [] }],
      });
      const contextWithExe = {
        ...mockContext,
        attachments: [{ name: 'virus.exe', size: 100 }],
      };
      const result = await engine.check('', contextWithExe as any, mockEvaluator);
      expect(result.passed).toBe(false);
      expect(result.matches[0].matched[0]).toMatch(/blocked attachment.*virus\.exe/);
    });

    it('should allow safe extensions in whitelist mode', async () => {
      engine.configure({
        rules: [{ name: 'images-only', trigger: { type: 'attachment', allowed: ['png', 'jpg'] }, actions: [] }],
      });
      const contextWithPng = {
        ...mockContext,
        attachments: [{ name: 'image.png', size: 100 }],
      };
      const result = await engine.check('', contextWithPng as any, mockEvaluator);
      expect(result.passed).toBe(true);
    });

    it('should block non-whitelisted extensions in whitelist mode', async () => {
      engine.configure({
        rules: [{ name: 'images-only', trigger: { type: 'attachment', allowed: ['png', 'jpg'] }, actions: [] }],
      });
      const contextWithExe = {
        ...mockContext,
        attachments: [{ name: 'file.exe', size: 100 }],
      };
      const result = await engine.check('', contextWithExe as any, mockEvaluator);
      expect(result.passed).toBe(false);
      expect(result.matches[0].matched[0]).toMatch(/disallowed attachment.*file\.exe/);
    });

    it('should pass when no attachments present', async () => {
      engine.configure({
        rules: [{ name: 'no-files', trigger: { type: 'attachment' }, actions: [] }],
      });
      const result = await engine.check('just text', mockContext, mockEvaluator);
      expect(result.passed).toBe(true);
    });

    it('should respect threshold for attachment count', async () => {
      engine.configure({
        rules: [{ name: 'max-files', trigger: { type: 'attachment', threshold: 3 }, actions: [] }],
      });
      const contextWith2Files = {
        ...mockContext,
        attachments: [{ name: 'file1.txt' }, { name: 'file2.txt' }],
      };
      const result = await engine.check('', contextWith2Files as any, mockEvaluator);
      expect(result.passed).toBe(true);
    });
  });

  describe('spam trigger', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should detect rapid message spam', async () => {
      // Create fresh engine for this test to avoid shared state
      const spamEngine = createAutomodEngine();
      spamEngine.configure({
        rules: [{ name: 'spam', trigger: { type: 'spam', threshold: 3, window: '10s' }, actions: [] }],
      });

      // First two messages - OK
      let result = await spamEngine.check('message 1', mockContext, mockEvaluator);
      expect(result.passed).toBe(true);
      result = await spamEngine.check('message 2', mockContext, mockEvaluator);
      expect(result.passed).toBe(true);

      // Third message triggers spam detection
      result = await spamEngine.check('message 3', mockContext, mockEvaluator);
      expect(result.passed).toBe(false);
      expect(result.matches[0].matched[0]).toMatch(/3 messages in 10s/);
    });

    it('should reset after window expires', async () => {
      const spamEngine = createAutomodEngine();
      spamEngine.configure({
        rules: [{ name: 'spam', trigger: { type: 'spam', threshold: 3, window: '5s' }, actions: [] }],
      });

      await spamEngine.check('msg 1', mockContext, mockEvaluator);
      await spamEngine.check('msg 2', mockContext, mockEvaluator);

      // Advance time past window
      vi.advanceTimersByTime(6000);

      // Should not trigger (history expired)
      const result = await spamEngine.check('msg 3', mockContext, mockEvaluator);
      expect(result.passed).toBe(true);
    });

    it('should track separate users independently', async () => {
      const spamEngine = createAutomodEngine();
      spamEngine.configure({
        rules: [{ name: 'spam', trigger: { type: 'spam', threshold: 2, window: '10s' }, actions: [] }],
      });

      const user1Context = { ...mockContext, userId: 'user-1', channelId: 'channel-1' };
      const user2Context = { ...mockContext, userId: 'user-2', channelId: 'channel-1' };

      // User 1 sends 2 messages - triggers spam
      await spamEngine.check('msg', user1Context as any, mockEvaluator);
      const result1 = await spamEngine.check('msg', user1Context as any, mockEvaluator);
      expect(result1.passed).toBe(false);

      // User 2 sends 1 message - should be OK
      const result2 = await spamEngine.check('msg', user2Context as any, mockEvaluator);
      expect(result2.passed).toBe(true);
    });
  });

  describe('duplicate trigger', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should detect duplicate messages', async () => {
      const dupEngine = createAutomodEngine();
      dupEngine.configure({
        rules: [{ name: 'dupe', trigger: { type: 'duplicate', threshold: 3, window: '1m' }, actions: [] }],
      });

      let result = await dupEngine.check('same message', mockContext, mockEvaluator);
      expect(result.passed).toBe(true);
      result = await dupEngine.check('same message', mockContext, mockEvaluator);
      expect(result.passed).toBe(true);
      result = await dupEngine.check('same message', mockContext, mockEvaluator);
      expect(result.passed).toBe(false);
      expect(result.matches[0].matched[0]).toMatch(/3 duplicate/);
    });

    it('should ignore case when comparing', async () => {
      const dupEngine = createAutomodEngine();
      dupEngine.configure({
        rules: [{ name: 'dupe', trigger: { type: 'duplicate', threshold: 2 }, actions: [] }],
      });

      await dupEngine.check('HELLO WORLD', mockContext, mockEvaluator);
      const result = await dupEngine.check('hello world', mockContext, mockEvaluator);
      expect(result.passed).toBe(false);
    });

    it('should not trigger for different messages', async () => {
      const dupEngine = createAutomodEngine();
      dupEngine.configure({
        rules: [{ name: 'dupe', trigger: { type: 'duplicate', threshold: 2 }, actions: [] }],
      });

      await dupEngine.check('message one', mockContext, mockEvaluator);
      const result = await dupEngine.check('message two', mockContext, mockEvaluator);
      expect(result.passed).toBe(true);
    });

    it('should reset after window expires', async () => {
      const dupEngine = createAutomodEngine();
      dupEngine.configure({
        rules: [{ name: 'dupe', trigger: { type: 'duplicate', threshold: 2, window: '5s' }, actions: [] }],
      });

      await dupEngine.check('same', mockContext, mockEvaluator);

      // Advance time past window
      vi.advanceTimersByTime(6000);

      // Should not trigger (history expired)
      const result = await dupEngine.check('same', mockContext, mockEvaluator);
      expect(result.passed).toBe(true);
    });

    it('should track separate users independently', async () => {
      const dupEngine = createAutomodEngine();
      dupEngine.configure({
        rules: [{ name: 'dupe', trigger: { type: 'duplicate', threshold: 2 }, actions: [] }],
      });

      const user1Context = { ...mockContext, userId: 'user-1', channelId: 'channel-1' };
      const user2Context = { ...mockContext, userId: 'user-2', channelId: 'channel-1' };

      // User 1 sends same message twice - triggers duplicate
      await dupEngine.check('repeat', user1Context as any, mockEvaluator);
      const result1 = await dupEngine.check('repeat', user1Context as any, mockEvaluator);
      expect(result1.passed).toBe(false);

      // User 2 sends same message once - should be OK
      const result2 = await dupEngine.check('repeat', user2Context as any, mockEvaluator);
      expect(result2.passed).toBe(true);
    });
  });
});

describe('createAutomodEngine', () => {
  it('should create a new AutomodEngine instance', () => {
    const engine = createAutomodEngine();
    expect(engine).toBeInstanceOf(AutomodEngine);
    expect(engine.isEnabled()).toBe(true);
    expect(engine.getRuleNames()).toEqual([]);
  });
});
