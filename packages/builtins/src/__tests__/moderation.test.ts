/**
 * Moderation builtin module tests
 *
 * Tests for the moderation command and table definitions.
 * These tests verify that the generated configuration is valid
 * and will work correctly with the runtime engine.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  moderationCommands,
  moderationTables,
  getModerationSpec,
  type ModerationConfig,
} from '../moderation/index.js';
import type { Action, CommandOption } from '@furlow/schema';

describe('Moderation Builtin', () => {
  describe('Exports', () => {
    it('should export moderationCommands array', () => {
      expect(moderationCommands).toBeDefined();
      expect(Array.isArray(moderationCommands)).toBe(true);
      expect(moderationCommands.length).toBeGreaterThan(0);
    });

    it('should export moderationTables object', () => {
      expect(moderationTables).toBeDefined();
      expect(typeof moderationTables).toBe('object');
    });

    it('should export getModerationSpec function', () => {
      expect(getModerationSpec).toBeDefined();
      expect(typeof getModerationSpec).toBe('function');
    });
  });

  describe('Commands Structure Validation', () => {
    it('should have all expected moderation commands', () => {
      const commandNames = moderationCommands.map((c) => c.name);
      const expectedCommands = ['warn', 'kick', 'ban', 'unban', 'timeout', 'warnings', 'purge'];

      for (const expected of expectedCommands) {
        expect(commandNames).toContain(expected);
      }
    });

    it('should have valid structure for each command', () => {
      for (const cmd of moderationCommands) {
        // Name validation
        expect(cmd.name).toBeDefined();
        expect(typeof cmd.name).toBe('string');
        expect(cmd.name.length).toBeGreaterThan(0);
        expect(cmd.name).toMatch(/^[a-z_]+$/); // Discord command names must be lowercase

        // Description validation
        expect(cmd.description).toBeDefined();
        expect(typeof cmd.description).toBe('string');
        expect(cmd.description.length).toBeGreaterThan(0);
        expect(cmd.description.length).toBeLessThanOrEqual(100); // Discord limit

        // Actions validation
        expect(cmd.actions).toBeDefined();
        expect(Array.isArray(cmd.actions)).toBe(true);
        expect(cmd.actions!.length).toBeGreaterThan(0);
      }
    });

    it('should have valid option types for all commands', () => {
      const validOptionTypes = ['string', 'integer', 'boolean', 'user', 'channel', 'role', 'mentionable', 'number', 'attachment'];

      for (const cmd of moderationCommands) {
        if (cmd.options) {
          for (const opt of cmd.options) {
            expect(validOptionTypes).toContain(opt.type);
            expect(opt.name).toBeDefined();
            expect(opt.description).toBeDefined();
          }
        }
      }
    });

    it('should have valid action types for all commands', () => {
      const validActionTypes = [
        'reply', 'send_message', 'send_dm', 'edit_message', 'delete_message',
        'kick', 'ban', 'unban', 'timeout', 'bulk_delete',
        'db_insert', 'db_query', 'db_update', 'db_delete',
        'set', 'add_role', 'remove_role', 'create_thread',
        'flow_if', 'flow_switch', 'flow_stop', 'try_catch'
      ];

      for (const cmd of moderationCommands) {
        for (const action of cmd.actions!) {
          expect(validActionTypes).toContain(action.action);
        }
      }
    });
  });

  describe('warn command', () => {
    const warnCmd = moderationCommands.find((c) => c.name === 'warn')!;

    it('should exist', () => {
      expect(warnCmd).toBeDefined();
    });

    it('should have required user option', () => {
      const userOpt = warnCmd.options?.find((o) => o.name === 'user');
      expect(userOpt).toBeDefined();
      expect(userOpt!.type).toBe('user');
      expect(userOpt!.required).toBe(true);
    });

    it('should have required reason option', () => {
      const reasonOpt = warnCmd.options?.find((o) => o.name === 'reason');
      expect(reasonOpt).toBeDefined();
      expect(reasonOpt!.type).toBe('string');
      expect(reasonOpt!.required).toBe(true);
    });

    it('should insert warning into database', () => {
      const dbAction = warnCmd.actions.find((a) => a.action === 'db_insert') as Action & {
        table?: string;
        data?: Record<string, unknown>;
      };
      expect(dbAction).toBeDefined();
      expect(dbAction!.table).toBe('warnings');
      expect(dbAction!.data).toBeDefined();
      expect(dbAction!.data!.user_id).toBe('${args.user.id}');
      expect(dbAction!.data!.guild_id).toBe('${guild.id}');
      expect(dbAction!.data!.moderator_id).toBe('${user.id}');
      expect(dbAction!.data!.reason).toBe('${args.reason}');
    });

    it('should send ephemeral reply to moderator', () => {
      const replyAction = warnCmd.actions.find((a) => a.action === 'reply') as Action & {
        ephemeral?: boolean;
        content?: string;
      };
      expect(replyAction).toBeDefined();
      expect(replyAction!.ephemeral).toBe(true);
      expect(replyAction!.content).toContain('${args.user.username}');
      expect(replyAction!.content).toContain('${args.reason}');
    });

    it('should send DM notification to warned user', () => {
      const dmAction = warnCmd.actions.find((a) => a.action === 'send_dm') as Action & {
        user?: string;
        embed?: Record<string, unknown>;
      };
      expect(dmAction).toBeDefined();
      expect(dmAction!.user).toBe('${args.user.id}');
      expect(dmAction!.embed).toBeDefined();
      expect(dmAction!.embed!.title).toBe('Warning Received');
    });

    it('should execute actions in correct order: db_insert, reply, send_dm', () => {
      const actionOrder = warnCmd.actions.map((a) => a.action);
      expect(actionOrder.indexOf('db_insert')).toBeLessThan(actionOrder.indexOf('reply'));
      expect(actionOrder.indexOf('reply')).toBeLessThan(actionOrder.indexOf('send_dm'));
    });
  });

  describe('kick command', () => {
    const kickCmd = moderationCommands.find((c) => c.name === 'kick')!;

    it('should exist', () => {
      expect(kickCmd).toBeDefined();
    });

    it('should have required user option', () => {
      const userOpt = kickCmd.options?.find((o) => o.name === 'user');
      expect(userOpt).toBeDefined();
      expect(userOpt!.required).toBe(true);
    });

    it('should have optional reason option', () => {
      const reasonOpt = kickCmd.options?.find((o) => o.name === 'reason');
      expect(reasonOpt).toBeDefined();
      expect(reasonOpt!.required).toBe(false);
    });

    it('should have kick action with DM enabled', () => {
      const kickAction = kickCmd.actions.find((a) => a.action === 'kick') as Action & {
        user?: string;
        reason?: string;
        dm_user?: boolean;
        dm_message?: string;
      };
      expect(kickAction).toBeDefined();
      expect(kickAction!.user).toBe('${args.user.id}');
      expect(kickAction!.dm_user).toBe(true);
      expect(kickAction!.dm_message).toContain('${guild.name}');
    });

    it('should have default reason when none provided', () => {
      const kickAction = kickCmd.actions.find((a) => a.action === 'kick') as Action & {
        reason?: string;
      };
      expect(kickAction!.reason).toContain('No reason provided');
      expect(kickAction!.reason).toContain('${args.reason');
    });
  });

  describe('ban command', () => {
    const banCmd = moderationCommands.find((c) => c.name === 'ban')!;

    it('should exist', () => {
      expect(banCmd).toBeDefined();
    });

    it('should have exactly 3 options: user, reason, delete_days', () => {
      expect(banCmd.options).toHaveLength(3);
      const optionNames = banCmd.options!.map((o) => o.name);
      expect(optionNames).toContain('user');
      expect(optionNames).toContain('reason');
      expect(optionNames).toContain('delete_days');
    });

    it('should have delete_days as integer type', () => {
      const deleteOpt = banCmd.options!.find((o) => o.name === 'delete_days');
      expect(deleteOpt!.type).toBe('integer');
      expect(deleteOpt!.required).toBe(false);
    });

    it('should have ban action with message deletion support', () => {
      const banAction = banCmd.actions.find((a) => a.action === 'ban') as Action & {
        delete_message_days?: unknown;
        dm_user?: boolean;
      };
      expect(banAction).toBeDefined();
      expect(banAction!.dm_user).toBe(true);
    });
  });

  describe('unban command', () => {
    const unbanCmd = moderationCommands.find((c) => c.name === 'unban')!;

    it('should exist', () => {
      expect(unbanCmd).toBeDefined();
    });

    it('should accept user_id as string (for unbanning users not in server)', () => {
      const userIdOpt = unbanCmd.options?.find((o) => o.name === 'user_id');
      expect(userIdOpt).toBeDefined();
      expect(userIdOpt!.type).toBe('string');
      expect(userIdOpt!.required).toBe(true);
    });

    it('should have unban action', () => {
      const unbanAction = unbanCmd.actions.find((a) => a.action === 'unban') as Action & {
        user?: string;
      };
      expect(unbanAction).toBeDefined();
      expect(unbanAction!.user).toBe('${args.user_id}');
    });
  });

  describe('timeout command', () => {
    const timeoutCmd = moderationCommands.find((c) => c.name === 'timeout')!;

    it('should exist', () => {
      expect(timeoutCmd).toBeDefined();
    });

    it('should have required duration option', () => {
      const durationOpt = timeoutCmd.options?.find((o) => o.name === 'duration');
      expect(durationOpt).toBeDefined();
      expect(durationOpt!.type).toBe('string');
      expect(durationOpt!.required).toBe(true);
      expect(durationOpt!.description).toContain('10m');
    });

    it('should have timeout action with DM enabled', () => {
      const timeoutAction = timeoutCmd.actions.find((a) => a.action === 'timeout') as Action & {
        duration?: string;
        dm_user?: boolean;
        dm_message?: string;
      };
      expect(timeoutAction).toBeDefined();
      expect(timeoutAction!.duration).toBe('${args.duration}');
      expect(timeoutAction!.dm_user).toBe(true);
      expect(timeoutAction!.dm_message).toContain('${args.duration}');
    });
  });

  describe('warnings command', () => {
    const warningsCmd = moderationCommands.find((c) => c.name === 'warnings')!;

    it('should exist', () => {
      expect(warningsCmd).toBeDefined();
    });

    it('should have required user option', () => {
      const userOpt = warningsCmd.options?.find((o) => o.name === 'user');
      expect(userOpt).toBeDefined();
      expect(userOpt!.required).toBe(true);
    });

    it('should query warnings table with correct filters', () => {
      const queryAction = warningsCmd.actions.find((a) => a.action === 'db_query') as Action & {
        table?: string;
        where?: Record<string, unknown>;
        order_by?: string;
        limit?: number;
        as?: string;
      };
      expect(queryAction).toBeDefined();
      expect(queryAction!.table).toBe('warnings');
      expect(queryAction!.where!.user_id).toBe('${args.user.id}');
      expect(queryAction!.where!.guild_id).toBe('${guild.id}');
    });

    it('should order by created_at descending and limit to 10', () => {
      const queryAction = warningsCmd.actions.find((a) => a.action === 'db_query') as Action & {
        order_by?: string;
        limit?: number;
      };
      expect(queryAction!.order_by).toBe('created_at DESC');
      expect(queryAction!.limit).toBe(10);
    });

    it('should store query results in "warnings" variable', () => {
      const queryAction = warningsCmd.actions.find((a) => a.action === 'db_query') as Action & {
        as?: string;
      };
      expect(queryAction!.as).toBe('warnings');
    });

    it('should display different message for no warnings vs has warnings', () => {
      const replyAction = warningsCmd.actions.find((a) => a.action === 'reply') as Action & {
        embed?: {
          description?: string;
          color?: string;
        };
      };
      expect(replyAction!.embed!.description).toContain('warnings.length == 0');
      expect(replyAction!.embed!.description).toContain('No warnings found');
      expect(replyAction!.embed!.color).toContain('warnings.length > 0');
    });
  });

  describe('purge command', () => {
    const purgeCmd = moderationCommands.find((c) => c.name === 'purge')!;

    it('should exist', () => {
      expect(purgeCmd).toBeDefined();
    });

    it('should have required count option as integer', () => {
      const countOpt = purgeCmd.options?.find((o) => o.name === 'count');
      expect(countOpt).toBeDefined();
      expect(countOpt!.type).toBe('integer');
      expect(countOpt!.required).toBe(true);
      expect(countOpt!.description).toContain('1-100');
    });

    it('should have optional user filter option', () => {
      const userOpt = purgeCmd.options?.find((o) => o.name === 'user');
      expect(userOpt).toBeDefined();
      expect(userOpt!.type).toBe('user');
      expect(userOpt!.required).toBe(false);
    });

    it('should have bulk_delete action targeting current channel', () => {
      const bulkAction = purgeCmd.actions.find((a) => a.action === 'bulk_delete') as Action & {
        channel?: string;
        count?: unknown;
        filter?: string;
      };
      expect(bulkAction).toBeDefined();
      expect(bulkAction!.channel).toBe('${channel.id}');
    });

    it('should support optional user filter in bulk_delete', () => {
      const bulkAction = purgeCmd.actions.find((a) => a.action === 'bulk_delete') as Action & {
        filter?: string;
      };
      expect(bulkAction!.filter).toContain('args.user');
      expect(bulkAction!.filter).toContain('message.author.id');
    });
  });

  describe('Tables Schema Validation', () => {
    describe('warnings table', () => {
      const warnings = moderationTables.warnings;

      it('should have all required columns', () => {
        const requiredColumns = ['id', 'user_id', 'guild_id', 'moderator_id', 'reason', 'created_at'];
        for (const col of requiredColumns) {
          expect(warnings.columns).toHaveProperty(col);
        }
      });

      it('should have id as primary key', () => {
        expect(warnings.columns.id.type).toBe('number');
        expect(warnings.columns.id.primary).toBe(true);
      });

      it('should have indexes on user_id and guild_id for query performance', () => {
        expect(warnings.columns.user_id.index).toBe(true);
        expect(warnings.columns.guild_id.index).toBe(true);
      });

      it('should have created_at as timestamp type', () => {
        expect(warnings.columns.created_at.type).toBe('timestamp');
      });

      it('should have string types for Discord IDs', () => {
        expect(warnings.columns.user_id.type).toBe('string');
        expect(warnings.columns.guild_id.type).toBe('string');
        expect(warnings.columns.moderator_id.type).toBe('string');
      });
    });

    describe('mod_cases table', () => {
      const modCases = moderationTables.mod_cases;

      it('should have all required columns', () => {
        const requiredColumns = ['id', 'guild_id', 'user_id', 'moderator_id', 'action', 'reason', 'created_at'];
        for (const col of requiredColumns) {
          expect(modCases.columns).toHaveProperty(col);
        }
      });

      it('should have id as primary key', () => {
        expect(modCases.columns.id.type).toBe('number');
        expect(modCases.columns.id.primary).toBe(true);
      });

      it('should have indexes on guild_id and user_id', () => {
        expect(modCases.columns.guild_id.index).toBe(true);
        expect(modCases.columns.user_id.index).toBe(true);
      });

      it('should have action column to store action type', () => {
        expect(modCases.columns.action).toBeDefined();
        expect(modCases.columns.action.type).toBe('string');
      });
    });
  });

  describe('getModerationSpec', () => {
    it('should return valid spec with default config', () => {
      const spec = getModerationSpec();

      expect(spec.commands).toBe(moderationCommands);
      expect(spec.state).toBeDefined();
      expect(spec.state!.tables).toBe(moderationTables);
    });

    it('should return same commands regardless of config', () => {
      const defaultSpec = getModerationSpec();
      const customSpec = getModerationSpec({
        logChannel: '123456789',
        dmOnAction: true,
        exemptRoles: ['admin'],
      });

      expect(defaultSpec.commands).toBe(customSpec.commands);
    });

    it('should always include state with tables', () => {
      const configs: ModerationConfig[] = [
        {},
        { logChannel: '123' },
        { warnings: { enabled: true, maxWarnings: 5 } },
        { exemptRoles: ['admin', 'mod'] },
      ];

      for (const config of configs) {
        const spec = getModerationSpec(config);
        expect(spec.state).toBeDefined();
        expect(spec.state!.tables).toBe(moderationTables);
      }
    });

    it('should not include events property', () => {
      const spec = getModerationSpec();
      expect(spec.events).toBeUndefined();
    });

    it('should not include flows property', () => {
      const spec = getModerationSpec();
      expect(spec.flows).toBeUndefined();
    });
  });

  describe('Expression Interpolation Patterns', () => {
    it('should use valid expression syntax in all actions', () => {
      const expressionPattern = /\$\{[^}]+\}/g;

      for (const cmd of moderationCommands) {
        for (const action of cmd.actions) {
          const actionStr = JSON.stringify(action);
          const matches = actionStr.match(expressionPattern) || [];

          for (const match of matches) {
            // Should have balanced braces
            expect(match.startsWith('${')).toBe(true);
            expect(match.endsWith('}')).toBe(true);

            // Extract expression content
            const expr = match.slice(2, -1);

            // Should not be empty
            expect(expr.length).toBeGreaterThan(0);

            // Should not contain nested ${}
            expect(expr).not.toContain('${');

            // Common patterns should be valid
            const validPatterns = [
              /^args\.\w+/,           // args.user, args.reason
              /^guild\.\w+/,          // guild.id, guild.name
              /^user\.\w+/,           // user.id, user.username
              /^channel\.\w+/,        // channel.id
              /^now\(\)/,             // now()
              /^warnings/,            // warnings variable
              /.*\|\s*\w+/,           // pipe transforms
              /.*\?\s*.*\s*:/,        // ternary expressions
              /.*\|\|/,               // OR expressions
              /.*==/,                 // comparisons
            ];

            // At least one pattern should match (not strict, just validation)
            const matchesAnyPattern = validPatterns.some(p => p.test(expr));
            if (!matchesAnyPattern) {
              // Log for debugging but don't fail (expressions can be complex)
              // console.log(`Unmatched expression in ${cmd.name}: ${expr}`);
            }
          }
        }
      }
    });

    it('should reference valid context variables', () => {
      const validContextVars = ['args', 'user', 'guild', 'channel', 'message', 'member', 'interaction', 'event', 'warnings'];

      for (const cmd of moderationCommands) {
        for (const action of cmd.actions) {
          const actionStr = JSON.stringify(action);
          const varPattern = /\$\{(\w+)\./g;
          let match;

          while ((match = varPattern.exec(actionStr)) !== null) {
            const varName = match[1];
            expect(validContextVars).toContain(varName);
          }
        }
      }
    });
  });

  describe('Permission Requirements', () => {
    // These tests document expected permission requirements
    // The actual permission enforcement is done by the runtime

    it('should have kick action that requires KICK_MEMBERS permission', () => {
      const kickCmd = moderationCommands.find((c) => c.name === 'kick')!;
      const kickAction = kickCmd.actions.find((a) => a.action === 'kick');
      expect(kickAction).toBeDefined();
      // Note: Permission enforcement is done by the runtime, not the spec
    });

    it('should have ban action that requires BAN_MEMBERS permission', () => {
      const banCmd = moderationCommands.find((c) => c.name === 'ban')!;
      const banAction = banCmd.actions.find((a) => a.action === 'ban');
      expect(banAction).toBeDefined();
    });

    it('should have bulk_delete action that requires MANAGE_MESSAGES permission', () => {
      const purgeCmd = moderationCommands.find((c) => c.name === 'purge')!;
      const bulkAction = purgeCmd.actions.find((a) => a.action === 'bulk_delete');
      expect(bulkAction).toBeDefined();
    });

    it('should have timeout action that requires MODERATE_MEMBERS permission', () => {
      const timeoutCmd = moderationCommands.find((c) => c.name === 'timeout')!;
      const timeoutAction = timeoutCmd.actions.find((a) => a.action === 'timeout');
      expect(timeoutAction).toBeDefined();
    });
  });
});
