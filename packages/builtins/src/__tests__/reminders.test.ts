/**
 * Reminders builtin module tests
 */

import { describe, it, expect } from 'vitest';
import {
  remindersTables,
  remindersEventHandlers,
  remindersCommands,
  getRemindersSpec,
  type RemindersConfig,
} from '../reminders/index.js';

describe('Reminders Builtin', () => {
  describe('Exports', () => {
    it('should export remindersTables object', () => {
      expect(remindersTables).toBeDefined();
      expect(typeof remindersTables).toBe('object');
    });

    it('should export remindersEventHandlers array', () => {
      expect(remindersEventHandlers).toBeDefined();
      expect(Array.isArray(remindersEventHandlers)).toBe(true);
    });

    it('should export remindersCommands array', () => {
      expect(remindersCommands).toBeDefined();
      expect(Array.isArray(remindersCommands)).toBe(true);
    });

    it('should export getRemindersSpec function', () => {
      expect(getRemindersSpec).toBeDefined();
      expect(typeof getRemindersSpec).toBe('function');
    });
  });

  describe('Tables', () => {
    it('should define reminders table', () => {
      expect(remindersTables.reminders).toBeDefined();
    });

    describe('reminders table', () => {
      const cols = remindersTables.reminders.columns;

      it('should have required columns', () => {
        expect(cols.id.primary).toBe(true);
        expect(cols.guild_id.index).toBe(true);
        expect(cols.channel_id).toBeDefined();
        expect(cols.user_id.index).toBe(true);
        expect(cols.message).toBeDefined();
        expect(cols.remind_at.index).toBe(true);
        expect(cols.dm.default).toBe(false);
        expect(cols.created_at.type).toBe('timestamp');
      });
    });
  });

  describe('Event Handlers', () => {
    it('should handle scheduler_tick event', () => {
      const handler = remindersEventHandlers.find((h) => h.event === 'scheduler_tick');
      expect(handler).toBeDefined();
    });

    it('should handle reminder_due event', () => {
      const handler = remindersEventHandlers.find((h) => h.event === 'reminder_due');
      expect(handler).toBeDefined();
    });

    describe('scheduler_tick handler', () => {
      const handler = remindersEventHandlers.find((h) => h.event === 'scheduler_tick')!;

      it('should query all reminders', () => {
        const dbQuery = handler.actions.find(
          (a) =>
            a.action === 'db_query' &&
            (a as { table?: string }).table === 'reminders'
        );
        expect(dbQuery).toBeDefined();
      });

      it('should filter due reminders', () => {
        const filterAction = handler.actions.find(
          (a) =>
            a.action === 'set' &&
            (a as { key?: string }).key === 'dueReminders'
        );
        expect(filterAction).toBeDefined();
      });

      it('should batch emit reminder_due events', () => {
        const batchAction = handler.actions.find((a) => a.action === 'batch');
        expect(batchAction).toBeDefined();
      });
    });

    describe('reminder_due handler', () => {
      const handler = remindersEventHandlers.find((h) => h.event === 'reminder_due')!;

      it('should delete the reminder', () => {
        const deleteAction = handler.actions.find((a) => a.action === 'db_delete');
        expect(deleteAction).toBeDefined();
      });

      it('should support DM delivery', () => {
        const dmCheck = handler.actions.find(
          (a) =>
            a.action === 'flow_if' &&
            (a as { condition?: string }).condition?.includes('reminder.dm')
        );
        expect(dmCheck).toBeDefined();
      });

      it('should support channel delivery', () => {
        const dmCheck = handler.actions.find(
          (a) =>
            a.action === 'flow_if' &&
            (a as { else?: unknown[] }).else
        );
        expect(dmCheck).toBeDefined();
      });
    });
  });

  describe('Commands', () => {
    it('should have remind command', () => {
      const cmd = remindersCommands.find((c) => c.name === 'remind');
      expect(cmd).toBeDefined();
    });

    it('should have reminders command', () => {
      const cmd = remindersCommands.find((c) => c.name === 'reminders');
      expect(cmd).toBeDefined();
    });

    it('should have delreminder command', () => {
      const cmd = remindersCommands.find((c) => c.name === 'delreminder');
      expect(cmd).toBeDefined();
    });

    describe('remind command', () => {
      const cmd = remindersCommands.find((c) => c.name === 'remind')!;

      it('should have required time and message options', () => {
        const timeOpt = cmd.options!.find((o) => o.name === 'time');
        expect(timeOpt!.required).toBe(true);

        const messageOpt = cmd.options!.find((o) => o.name === 'message');
        expect(messageOpt!.required).toBe(true);
      });

      it('should have optional dm option', () => {
        const dmOpt = cmd.options!.find((o) => o.name === 'dm');
        expect(dmOpt).toBeDefined();
        expect(dmOpt!.type).toBe('boolean');
        expect(dmOpt!.required).toBe(false);
      });

      it('should check max reminders per user', () => {
        const maxCheck = cmd.actions.find(
          (a) =>
            a.action === 'flow_if' &&
            (a as { condition?: string }).condition?.includes('maxRemindersPerUser')
        );
        expect(maxCheck).toBeDefined();
      });
    });

    describe('reminders command', () => {
      const cmd = remindersCommands.find((c) => c.name === 'reminders')!;

      it('should query user reminders ordered by time', () => {
        const dbQuery = cmd.actions.find(
          (a) =>
            a.action === 'db_query' &&
            (a as { order_by?: string }).order_by === 'remind_at ASC'
        );
        expect(dbQuery).toBeDefined();
      });

      it('should handle empty reminders', () => {
        const emptyCheck = cmd.actions.find(
          (a) =>
            a.action === 'flow_if' &&
            (a as { condition?: string }).condition?.includes('length === 0')
        );
        expect(emptyCheck).toBeDefined();
      });
    });

    describe('delreminder command', () => {
      const cmd = remindersCommands.find((c) => c.name === 'delreminder')!;

      it('should require id option', () => {
        const idOpt = cmd.options!.find((o) => o.name === 'id');
        expect(idOpt!.required).toBe(true);
        expect(idOpt!.type).toBe('integer');
      });

      it('should verify ownership before deleting', () => {
        const ownerCheck = cmd.actions.find(
          (a) =>
            a.action === 'db_query' &&
            (a as { where?: { user_id?: string } }).where?.user_id
        );
        expect(ownerCheck).toBeDefined();
      });
    });
  });

  describe('getRemindersSpec', () => {
    it('should return valid spec with default config', () => {
      const spec = getRemindersSpec();

      expect(spec.commands).toBe(remindersCommands);
      expect(spec.events).toBe(remindersEventHandlers);
      expect(spec.state!.tables).toBe(remindersTables);
    });

    it('should return valid spec with custom config', () => {
      const config: RemindersConfig = {
        maxRemindersPerUser: 50,
        minDuration: '1m',
        maxDuration: '30d',
        allowDM: true,
      };

      const spec = getRemindersSpec(config);

      expect(spec.commands).toBe(remindersCommands);
      expect(spec.events).toBe(remindersEventHandlers);
    });
  });
});
