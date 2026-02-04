/**
 * Moderation builtin module tests
 */

import { describe, it, expect } from 'vitest';
import {
  moderationCommands,
  moderationTables,
  getModerationSpec,
  type ModerationConfig,
} from '../moderation/index.js';

describe('Moderation Builtin', () => {
  describe('Exports', () => {
    it('should export moderationCommands array', () => {
      expect(moderationCommands).toBeDefined();
      expect(Array.isArray(moderationCommands)).toBe(true);
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

  describe('Commands', () => {
    it('should have expected command names', () => {
      const commandNames = moderationCommands.map((c) => c.name);
      expect(commandNames).toContain('warn');
      expect(commandNames).toContain('kick');
      expect(commandNames).toContain('ban');
      expect(commandNames).toContain('unban');
      expect(commandNames).toContain('timeout');
      expect(commandNames).toContain('warnings');
      expect(commandNames).toContain('purge');
    });

    it('should have required fields for each command', () => {
      for (const cmd of moderationCommands) {
        expect(cmd.name).toBeDefined();
        expect(typeof cmd.name).toBe('string');
        expect(cmd.description).toBeDefined();
        expect(typeof cmd.description).toBe('string');
        expect(cmd.actions).toBeDefined();
        expect(Array.isArray(cmd.actions)).toBe(true);
        expect(cmd.actions.length).toBeGreaterThan(0);
      }
    });

    describe('warn command', () => {
      it('should have user and reason options', () => {
        const warnCmd = moderationCommands.find((c) => c.name === 'warn');
        expect(warnCmd).toBeDefined();
        expect(warnCmd!.options).toBeDefined();

        const userOpt = warnCmd!.options!.find((o) => o.name === 'user');
        expect(userOpt).toBeDefined();
        expect(userOpt!.type).toBe('user');
        expect(userOpt!.required).toBe(true);

        const reasonOpt = warnCmd!.options!.find((o) => o.name === 'reason');
        expect(reasonOpt).toBeDefined();
        expect(reasonOpt!.type).toBe('string');
        expect(reasonOpt!.required).toBe(true);
      });

      it('should include db_insert, reply, and send_dm actions', () => {
        const warnCmd = moderationCommands.find((c) => c.name === 'warn');
        const actionTypes = warnCmd!.actions.map((a) => a.action);
        expect(actionTypes).toContain('db_insert');
        expect(actionTypes).toContain('reply');
        expect(actionTypes).toContain('send_dm');
      });
    });

    describe('kick command', () => {
      it('should have user option required and reason optional', () => {
        const kickCmd = moderationCommands.find((c) => c.name === 'kick');
        expect(kickCmd).toBeDefined();

        const userOpt = kickCmd!.options!.find((o) => o.name === 'user');
        expect(userOpt!.required).toBe(true);

        const reasonOpt = kickCmd!.options!.find((o) => o.name === 'reason');
        expect(reasonOpt!.required).toBe(false);
      });

      it('should include kick action with dm_user enabled', () => {
        const kickCmd = moderationCommands.find((c) => c.name === 'kick');
        const kickAction = kickCmd!.actions.find((a) => a.action === 'kick') as {
          action: string;
          dm_user?: boolean;
        };
        expect(kickAction).toBeDefined();
        expect(kickAction!.dm_user).toBe(true);
      });
    });

    describe('ban command', () => {
      it('should have user, reason, and delete_days options', () => {
        const banCmd = moderationCommands.find((c) => c.name === 'ban');
        expect(banCmd).toBeDefined();
        expect(banCmd!.options).toHaveLength(3);

        const deleteOpt = banCmd!.options!.find((o) => o.name === 'delete_days');
        expect(deleteOpt!.type).toBe('integer');
      });
    });

    describe('timeout command', () => {
      it('should have user, duration, and reason options', () => {
        const timeoutCmd = moderationCommands.find((c) => c.name === 'timeout');
        expect(timeoutCmd).toBeDefined();

        const durationOpt = timeoutCmd!.options!.find((o) => o.name === 'duration');
        expect(durationOpt).toBeDefined();
        expect(durationOpt!.required).toBe(true);
      });
    });

    describe('warnings command', () => {
      it('should query warnings table and display results', () => {
        const warningsCmd = moderationCommands.find((c) => c.name === 'warnings');
        expect(warningsCmd).toBeDefined();

        const dbQuery = warningsCmd!.actions.find((a) => a.action === 'db_query');
        expect(dbQuery).toBeDefined();
      });
    });

    describe('purge command', () => {
      it('should have count and user options', () => {
        const purgeCmd = moderationCommands.find((c) => c.name === 'purge');
        expect(purgeCmd).toBeDefined();

        const countOpt = purgeCmd!.options!.find((o) => o.name === 'count');
        expect(countOpt).toBeDefined();
        expect(countOpt!.type).toBe('integer');
        expect(countOpt!.required).toBe(true);

        const userOpt = purgeCmd!.options!.find((o) => o.name === 'user');
        expect(userOpt).toBeDefined();
        expect(userOpt!.required).toBe(false);
      });

      it('should include bulk_delete action', () => {
        const purgeCmd = moderationCommands.find((c) => c.name === 'purge');
        const bulkDelete = purgeCmd!.actions.find((a) => a.action === 'bulk_delete');
        expect(bulkDelete).toBeDefined();
      });
    });
  });

  describe('Tables', () => {
    it('should define warnings table', () => {
      expect(moderationTables.warnings).toBeDefined();
      expect(moderationTables.warnings.columns).toBeDefined();
    });

    it('should define mod_cases table', () => {
      expect(moderationTables.mod_cases).toBeDefined();
      expect(moderationTables.mod_cases.columns).toBeDefined();
    });

    describe('warnings table', () => {
      it('should have required columns', () => {
        const cols = moderationTables.warnings.columns;
        expect(cols.id).toBeDefined();
        expect(cols.id.type).toBe('number');
        expect(cols.id.primary).toBe(true);

        expect(cols.user_id).toBeDefined();
        expect(cols.user_id.type).toBe('string');
        expect(cols.user_id.index).toBe(true);

        expect(cols.guild_id).toBeDefined();
        expect(cols.guild_id.index).toBe(true);

        expect(cols.moderator_id).toBeDefined();
        expect(cols.reason).toBeDefined();
        expect(cols.created_at).toBeDefined();
        expect(cols.created_at.type).toBe('timestamp');
      });
    });

    describe('mod_cases table', () => {
      it('should have required columns', () => {
        const cols = moderationTables.mod_cases.columns;
        expect(cols.id).toBeDefined();
        expect(cols.id.primary).toBe(true);

        expect(cols.guild_id).toBeDefined();
        expect(cols.user_id).toBeDefined();
        expect(cols.moderator_id).toBeDefined();
        expect(cols.action).toBeDefined();
        expect(cols.reason).toBeDefined();
        expect(cols.created_at).toBeDefined();
      });
    });
  });

  describe('getModerationSpec', () => {
    it('should return valid spec with default config', () => {
      const spec = getModerationSpec();

      expect(spec.commands).toBeDefined();
      expect(spec.commands).toBe(moderationCommands);

      expect(spec.state).toBeDefined();
      expect(spec.state!.tables).toBe(moderationTables);
    });

    it('should return valid spec with custom config', () => {
      const config: ModerationConfig = {
        logChannel: '123456789',
        dmOnAction: true,
        exemptRoles: ['admin', 'mod'],
        warnings: {
          enabled: true,
          maxWarnings: 5,
          escalation: [
            { count: 3, action: 'kick' },
            { count: 5, action: 'ban' },
          ],
        },
      };

      const spec = getModerationSpec(config);

      expect(spec.commands).toBe(moderationCommands);
      expect(spec.state!.tables).toBe(moderationTables);
    });

    it('should not include events property', () => {
      const spec = getModerationSpec();
      expect(spec.events).toBeUndefined();
    });
  });
});
