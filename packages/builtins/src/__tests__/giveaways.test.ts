/**
 * Giveaways builtin module tests
 */

import { describe, it, expect } from 'vitest';
import {
  giveawaysTables,
  giveawaysEventHandlers,
  giveawaysCommands,
  getGiveawaysSpec,
  type GiveawaysConfig,
} from '../giveaways/index.js';

describe('Giveaways Builtin', () => {
  describe('Exports', () => {
    it('should export giveawaysTables object', () => {
      expect(giveawaysTables).toBeDefined();
      expect(typeof giveawaysTables).toBe('object');
    });

    it('should export giveawaysEventHandlers array', () => {
      expect(giveawaysEventHandlers).toBeDefined();
      expect(Array.isArray(giveawaysEventHandlers)).toBe(true);
    });

    it('should export giveawaysCommands array', () => {
      expect(giveawaysCommands).toBeDefined();
      expect(Array.isArray(giveawaysCommands)).toBe(true);
    });

    it('should export getGiveawaysSpec function', () => {
      expect(getGiveawaysSpec).toBeDefined();
      expect(typeof getGiveawaysSpec).toBe('function');
    });
  });

  describe('Tables', () => {
    it('should define giveaways table', () => {
      expect(giveawaysTables.giveaways).toBeDefined();
    });

    it('should define giveaway_entries table', () => {
      expect(giveawaysTables.giveaway_entries).toBeDefined();
    });

    describe('giveaways table', () => {
      const cols = giveawaysTables.giveaways.columns;

      it('should have required columns', () => {
        expect(cols.id.primary).toBe(true);
        expect(cols.guild_id.index).toBe(true);
        expect(cols.message_id.unique).toBe(true);
        expect(cols.host_id).toBeDefined();
        expect(cols.prize).toBeDefined();
        expect(cols.winners_count.default).toBe(1);
        expect(cols.ends_at.index).toBe(true);
        expect(cols.ended.default).toBe(false);
        expect(cols.require_role).toBeDefined();
      });
    });

    describe('giveaway_entries table', () => {
      const cols = giveawaysTables.giveaway_entries.columns;

      it('should have required columns', () => {
        expect(cols.id.primary).toBe(true);
        expect(cols.giveaway_id.index).toBe(true);
        expect(cols.user_id).toBeDefined();
        expect(cols.created_at.type).toBe('timestamp');
      });
    });
  });

  describe('Event Handlers', () => {
    it('should handle giveaway_enter button click', () => {
      const handler = giveawaysEventHandlers.find(
        (h) =>
          h.event === 'button_click' &&
          h.condition?.includes('giveaway_enter_')
      );
      expect(handler).toBeDefined();
    });

    it('should handle scheduler_tick for giveaway end', () => {
      const handler = giveawaysEventHandlers.find((h) => h.event === 'scheduler_tick');
      expect(handler).toBeDefined();
    });

    it('should handle giveaway_end event', () => {
      const handler = giveawaysEventHandlers.find((h) => h.event === 'giveaway_end');
      expect(handler).toBeDefined();
    });

    describe('entry handler', () => {
      const handler = giveawaysEventHandlers.find(
        (h) =>
          h.event === 'button_click' &&
          h.condition?.includes('giveaway_enter_')
      )!;

      it('should check if giveaway has ended', () => {
        const endCheck = handler.actions.find(
          (a) =>
            a.action === 'flow_if' &&
            (a as { condition?: string }).condition?.includes('ended')
        );
        expect(endCheck).toBeDefined();
      });

      it('should check role requirement', () => {
        const roleCheck = handler.actions.find(
          (a) =>
            a.action === 'flow_if' &&
            (a as { condition?: string }).condition?.includes('require_role')
        );
        expect(roleCheck).toBeDefined();
      });

      it('should toggle entry status', () => {
        const toggleCheck = handler.actions.find(
          (a) =>
            a.action === 'flow_if' &&
            (a as { condition?: string }).condition?.includes('existing.length > 0')
        );
        expect(toggleCheck).toBeDefined();
      });
    });

    describe('giveaway_end handler', () => {
      const handler = giveawaysEventHandlers.find((h) => h.event === 'giveaway_end')!;

      it('should select winners', () => {
        const shuffleSet = handler.actions.find(
          (a) =>
            a.action === 'set' &&
            (a as { key?: string }).key === 'shuffled'
        );
        expect(shuffleSet).toBeDefined();

        const winnersSet = handler.actions.find(
          (a) =>
            a.action === 'set' &&
            (a as { key?: string }).key === 'winners'
        );
        expect(winnersSet).toBeDefined();
      });

      it('should handle no valid entries', () => {
        const noEntriesCheck = handler.actions.find(
          (a) =>
            a.action === 'flow_if' &&
            (a as { condition?: string }).condition?.includes('winners.length === 0')
        );
        expect(noEntriesCheck).toBeDefined();
      });
    });
  });

  describe('Commands', () => {
    it('should have giveaway command with subcommands', () => {
      const cmd = giveawaysCommands.find((c) => c.name === 'giveaway');
      expect(cmd).toBeDefined();
      expect(cmd!.subcommands).toBeDefined();
    });

    describe('giveaway subcommands', () => {
      const cmd = giveawaysCommands.find((c) => c.name === 'giveaway')!;

      it('should have start subcommand', () => {
        const start = cmd.subcommands!.find((s) => s.name === 'start');
        expect(start).toBeDefined();

        const prizeOpt = start!.options!.find((o) => o.name === 'prize');
        expect(prizeOpt!.required).toBe(true);

        const durationOpt = start!.options!.find((o) => o.name === 'duration');
        expect(durationOpt!.required).toBe(true);

        const winnersOpt = start!.options!.find((o) => o.name === 'winners');
        expect(winnersOpt!.type).toBe('integer');

        const roleOpt = start!.options!.find((o) => o.name === 'require_role');
        expect(roleOpt!.type).toBe('role');
      });

      it('should have end subcommand', () => {
        const end = cmd.subcommands!.find((s) => s.name === 'end');
        expect(end).toBeDefined();

        const msgOpt = end!.options!.find((o) => o.name === 'message_id');
        expect(msgOpt!.required).toBe(true);
      });

      it('should have reroll subcommand', () => {
        const reroll = cmd.subcommands!.find((s) => s.name === 'reroll');
        expect(reroll).toBeDefined();

        const msgOpt = reroll!.options!.find((o) => o.name === 'message_id');
        expect(msgOpt!.required).toBe(true);

        const winnersOpt = reroll!.options!.find((o) => o.name === 'winners');
        expect(winnersOpt!.required).toBe(false);
      });
    });
  });

  describe('getGiveawaysSpec', () => {
    it('should return valid spec with default config', () => {
      const spec = getGiveawaysSpec();

      expect(spec.commands).toBe(giveawaysCommands);
      expect(spec.events).toBe(giveawaysEventHandlers);
      expect(spec.state!.tables).toBe(giveawaysTables);
    });

    it('should return valid spec with custom config', () => {
      const config: GiveawaysConfig = {
        defaultDuration: '7d',
        managerRole: '123',
        requireRole: '456',
        embedColor: '#ff0000',
        emoji: '🎁',
      };

      const spec = getGiveawaysSpec(config);

      expect(spec.commands).toBe(giveawaysCommands);
      expect(spec.events).toBe(giveawaysEventHandlers);
    });
  });
});
