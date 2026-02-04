/**
 * AFK builtin module tests
 */

import { describe, it, expect } from 'vitest';
import {
  afkTables,
  afkEventHandlers,
  afkCommands,
  getAfkSpec,
  type AfkConfig,
} from '../afk/index.js';

describe('AFK Builtin', () => {
  describe('Exports', () => {
    it('should export afkTables object', () => {
      expect(afkTables).toBeDefined();
      expect(typeof afkTables).toBe('object');
    });

    it('should export afkEventHandlers array', () => {
      expect(afkEventHandlers).toBeDefined();
      expect(Array.isArray(afkEventHandlers)).toBe(true);
    });

    it('should export afkCommands array', () => {
      expect(afkCommands).toBeDefined();
      expect(Array.isArray(afkCommands)).toBe(true);
    });

    it('should export getAfkSpec function', () => {
      expect(getAfkSpec).toBeDefined();
      expect(typeof getAfkSpec).toBe('function');
    });
  });

  describe('Tables', () => {
    it('should define afk_users table', () => {
      expect(afkTables.afk_users).toBeDefined();
    });

    describe('afk_users table', () => {
      const cols = afkTables.afk_users.columns;

      it('should have required columns', () => {
        expect(cols.id.primary).toBe(true);
        expect(cols.guild_id.index).toBe(true);
        expect(cols.user_id.index).toBe(true);
        expect(cols.reason).toBeDefined();
        expect(cols.set_at.type).toBe('timestamp');
      });
    });
  });

  describe('Event Handlers', () => {
    it('should have message handlers', () => {
      const handlers = afkEventHandlers.filter((h) => h.event === 'message');
      expect(handlers.length).toBe(2);
    });

    describe('AFK removal handler', () => {
      const handler = afkEventHandlers.find(
        (h) =>
          h.event === 'message' &&
          h.condition === '!message.author.bot'
      )!;

      it('should check for bot messages', () => {
        expect(handler.condition).toContain('!message.author.bot');
      });

      it('should query user AFK status', () => {
        const dbQuery = handler.actions.find(
          (a) =>
            a.action === 'db_query' &&
            (a as { table?: string }).table === 'afk_users'
        );
        expect(dbQuery).toBeDefined();
      });

      it('should delete AFK status when user speaks', () => {
        const deleteAction = handler.actions.find(
          (a) =>
            a.action === 'flow_if' &&
            Array.isArray((a as { then?: unknown[] }).then) &&
            (a as { then: { action: string }[] }).then.some(t => t.action === 'db_delete')
        );
        expect(deleteAction).toBeDefined();
      });

      it('should handle nickname prefix if configured', () => {
        // The nickname handling is nested inside a flow_if, verify the flow_if structure exists
        const flowIf = handler.actions.find((a) => a.action === 'flow_if');
        expect(flowIf).toBeDefined();
        // The set_nickname action is nested in the then branch of the nested flow_if
        const handlerJson = JSON.stringify(handler.actions);
        expect(handlerJson).toContain('set_nickname');
      });
    });

    describe('AFK mention notification handler', () => {
      const handler = afkEventHandlers.find(
        (h) =>
          h.event === 'message' &&
          h.condition?.includes('mentions.users.size')
      )!;

      it('should check for mentions', () => {
        expect(handler.condition).toContain('mentions.users.size > 0');
      });

      it('should query all AFK users in guild', () => {
        const dbQuery = handler.actions.find(
          (a) =>
            a.action === 'db_query' &&
            (a as { table?: string }).table === 'afk_users'
        );
        expect(dbQuery).toBeDefined();
      });

      it('should notify about AFK mentions', () => {
        const notifyCheck = handler.actions.find(
          (a) =>
            a.action === 'flow_if' &&
            (a as { condition?: string }).condition?.includes('afkMentioned.length > 0')
        );
        expect(notifyCheck).toBeDefined();
      });

      it('should include wait and delete_message actions', () => {
        // The wait and delete_message actions are nested in flow_if
        const handlerJson = JSON.stringify(handler.actions);
        expect(handlerJson).toContain('"action":"wait"');
        expect(handlerJson).toContain('"action":"delete_message"');
      });
    });
  });

  describe('Commands', () => {
    it('should have afk command', () => {
      const cmd = afkCommands.find((c) => c.name === 'afk');
      expect(cmd).toBeDefined();
    });

    describe('afk command', () => {
      const cmd = afkCommands.find((c) => c.name === 'afk')!;

      it('should have optional reason option', () => {
        const reasonOpt = cmd.options!.find((o) => o.name === 'reason');
        expect(reasonOpt).toBeDefined();
        expect(reasonOpt!.required).toBe(false);
      });

      it('should truncate reason to max length', () => {
        const truncateAction = cmd.actions.find(
          (a) =>
            a.action === 'set' &&
            (a as { value?: string }).value?.includes('truncate')
        );
        expect(truncateAction).toBeDefined();
      });

      it('should handle existing AFK status', () => {
        const existingCheck = cmd.actions.find(
          (a) =>
            a.action === 'flow_if' &&
            (a as { condition?: string }).condition?.includes('existing.length > 0')
        );
        expect(existingCheck).toBeDefined();
      });

      it('should add nickname prefix if configured', () => {
        const nicknameCheck = cmd.actions.find(
          (a) =>
            a.action === 'flow_if' &&
            (a as { condition?: string }).condition?.includes('nicknamePrefix')
        );
        expect(nicknameCheck).toBeDefined();
      });
    });
  });

  describe('getAfkSpec', () => {
    it('should return valid spec with default config', () => {
      const spec = getAfkSpec();

      expect(spec.commands).toBe(afkCommands);
      expect(spec.events).toBe(afkEventHandlers);
      expect(spec.state!.tables).toBe(afkTables);
    });

    it('should return valid spec with custom config', () => {
      const config: AfkConfig = {
        maxReasonLength: 200,
        nicknamePrefix: '[AFK] ',
        ignoreBots: true,
      };

      const spec = getAfkSpec(config);

      expect(spec.commands).toBe(afkCommands);
      expect(spec.events).toBe(afkEventHandlers);
    });
  });
});
