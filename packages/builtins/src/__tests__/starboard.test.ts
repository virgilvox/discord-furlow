/**
 * Starboard builtin module tests
 */

import { describe, it, expect } from 'vitest';
import {
  starboardTables,
  starboardEventHandlers,
  starboardCommands,
  getStarboardSpec,
  type StarboardConfig,
} from '../starboard/index.js';

describe('Starboard Builtin', () => {
  describe('Exports', () => {
    it('should export starboardTables object', () => {
      expect(starboardTables).toBeDefined();
      expect(typeof starboardTables).toBe('object');
    });

    it('should export starboardEventHandlers array', () => {
      expect(starboardEventHandlers).toBeDefined();
      expect(Array.isArray(starboardEventHandlers)).toBe(true);
    });

    it('should export starboardCommands array', () => {
      expect(starboardCommands).toBeDefined();
      expect(Array.isArray(starboardCommands)).toBe(true);
    });

    it('should export getStarboardSpec function', () => {
      expect(getStarboardSpec).toBeDefined();
      expect(typeof getStarboardSpec).toBe('function');
    });
  });

  describe('Tables', () => {
    it('should define starboard_messages table', () => {
      expect(starboardTables.starboard_messages).toBeDefined();
      expect(starboardTables.starboard_messages.columns).toBeDefined();
    });

    it('should define starboard_stars table', () => {
      expect(starboardTables.starboard_stars).toBeDefined();
      expect(starboardTables.starboard_stars.columns).toBeDefined();
    });

    describe('starboard_messages table', () => {
      const cols = starboardTables.starboard_messages.columns;

      it('should have primary key id', () => {
        expect(cols.id).toBeDefined();
        expect(cols.id.type).toBe('number');
        expect(cols.id.primary).toBe(true);
      });

      it('should have guild_id with index', () => {
        expect(cols.guild_id).toBeDefined();
        expect(cols.guild_id.index).toBe(true);
      });

      it('should have source_channel_id', () => {
        expect(cols.source_channel_id).toBeDefined();
      });

      it('should have source_message_id with unique constraint', () => {
        expect(cols.source_message_id).toBeDefined();
        expect(cols.source_message_id.unique).toBe(true);
      });

      it('should have starboard_message_id', () => {
        expect(cols.starboard_message_id).toBeDefined();
      });

      it('should have author_id with index', () => {
        expect(cols.author_id).toBeDefined();
        expect(cols.author_id.index).toBe(true);
      });

      it('should have star_count with default', () => {
        expect(cols.star_count).toBeDefined();
        expect(cols.star_count.type).toBe('number');
        expect(cols.star_count.default).toBe(0);
      });

      it('should have created_at timestamp', () => {
        expect(cols.created_at).toBeDefined();
        expect(cols.created_at.type).toBe('timestamp');
      });
    });

    describe('starboard_stars table', () => {
      const cols = starboardTables.starboard_stars.columns;

      it('should have primary key id', () => {
        expect(cols.id).toBeDefined();
        expect(cols.id.primary).toBe(true);
      });

      it('should have message_id with index', () => {
        expect(cols.message_id).toBeDefined();
        expect(cols.message_id.index).toBe(true);
      });

      it('should have user_id', () => {
        expect(cols.user_id).toBeDefined();
      });

      it('should have created_at timestamp', () => {
        expect(cols.created_at).toBeDefined();
      });
    });
  });

  describe('Event Handlers', () => {
    it('should handle reaction_add event', () => {
      const handler = starboardEventHandlers.find((h) => h.event === 'reaction_add');
      expect(handler).toBeDefined();
    });

    it('should handle reaction_remove event', () => {
      const handler = starboardEventHandlers.find((h) => h.event === 'reaction_remove');
      expect(handler).toBeDefined();
    });

    describe('reaction_add handler', () => {
      const handler = starboardEventHandlers.find((h) => h.event === 'reaction_add')!;

      it('should check for star emoji', () => {
        expect(handler.condition).toContain('emoji.name');
      });

      it('should check for starboard channel config', () => {
        expect(handler.condition).toContain('config.starboard');
      });

      it('should check for ignored channels', () => {
        const ignoredCheck = handler.actions.find(
          (a) =>
            a.action === 'flow_if' &&
            (a as { condition?: string }).condition?.includes('ignoredChannels')
        );
        expect(ignoredCheck).toBeDefined();
      });

      it('should check NSFW setting', () => {
        const nsfwCheck = handler.actions.find(
          (a) =>
            a.action === 'flow_if' &&
            (a as { condition?: string }).condition?.includes('nsfw')
        );
        expect(nsfwCheck).toBeDefined();
      });

      it('should check self-star setting', () => {
        const selfStarCheck = handler.actions.find(
          (a) =>
            a.action === 'flow_if' &&
            (a as { condition?: string }).condition?.includes('selfStar')
        );
        expect(selfStarCheck).toBeDefined();
      });

      it('should check bot message setting', () => {
        const botCheck = handler.actions.find(
          (a) =>
            a.action === 'flow_if' &&
            (a as { condition?: string }).condition?.includes('botMessages')
        );
        expect(botCheck).toBeDefined();
      });

      it('should prevent duplicate stars', () => {
        const existingCheck = handler.actions.find(
          (a) =>
            a.action === 'db_query' &&
            (a as { table?: string }).table === 'starboard_stars'
        );
        expect(existingCheck).toBeDefined();
      });

      it('should insert star record', () => {
        const insertAction = handler.actions.find(
          (a) =>
            a.action === 'db_insert' &&
            (a as { table?: string }).table === 'starboard_stars'
        );
        expect(insertAction).toBeDefined();
      });

      it('should handle tier system', () => {
        const tierSet = handler.actions.find(
          (a) =>
            a.action === 'set' &&
            (a as { key?: string }).key === 'tier'
        );
        expect(tierSet).toBeDefined();
      });
    });

    describe('reaction_remove handler', () => {
      const handler = starboardEventHandlers.find((h) => h.event === 'reaction_remove')!;

      it('should delete star record', () => {
        const deleteAction = handler.actions.find(
          (a) =>
            a.action === 'db_delete' &&
            (a as { table?: string }).table === 'starboard_stars'
        );
        expect(deleteAction).toBeDefined();
      });

      it('should handle threshold logic for removal or update', () => {
        // The threshold check and db_update are nested in flow_if branches
        const handlerJson = JSON.stringify(handler.actions);
        expect(handlerJson).toContain('threshold');
        expect(handlerJson).toContain('db_update');
        expect(handlerJson).toContain('starboard_messages');
      });
    });
  });

  describe('Commands', () => {
    it('should have starboard command with subcommands', () => {
      const cmd = starboardCommands.find((c) => c.name === 'starboard');
      expect(cmd).toBeDefined();
      expect(cmd!.subcommands).toBeDefined();
    });

    describe('starboard command subcommands', () => {
      const cmd = starboardCommands.find((c) => c.name === 'starboard')!;

      it('should have setup subcommand', () => {
        const setup = cmd.subcommands!.find((s) => s.name === 'setup');
        expect(setup).toBeDefined();

        const channelOpt = setup!.options!.find((o) => o.name === 'channel');
        expect(channelOpt).toBeDefined();
        expect(channelOpt!.type).toBe('channel');
        expect(channelOpt!.required).toBe(true);

        const thresholdOpt = setup!.options!.find((o) => o.name === 'threshold');
        expect(thresholdOpt).toBeDefined();
        expect(thresholdOpt!.type).toBe('integer');
        expect(thresholdOpt!.required).toBe(false);

        const emojiOpt = setup!.options!.find((o) => o.name === 'emoji');
        expect(emojiOpt).toBeDefined();
      });

      it('should have stats subcommand', () => {
        const stats = cmd.subcommands!.find((s) => s.name === 'stats');
        expect(stats).toBeDefined();

        const dbQueries = stats!.actions.filter((a) => a.action === 'db_query');
        expect(dbQueries.length).toBeGreaterThanOrEqual(1);

        const replyAction = stats!.actions.find((a) => a.action === 'reply');
        expect(replyAction).toBeDefined();
        expect((replyAction as { embed?: unknown }).embed).toBeDefined();
      });

      it('should have random subcommand', () => {
        const random = cmd.subcommands!.find((s) => s.name === 'random');
        expect(random).toBeDefined();

        const dbQuery = random!.actions.find(
          (a) =>
            a.action === 'db_query' &&
            (a as { table?: string }).table === 'starboard_messages'
        );
        expect(dbQuery).toBeDefined();

        const emptyCheck = random!.actions.find(
          (a) =>
            a.action === 'flow_if' &&
            (a as { condition?: string }).condition?.includes('length === 0')
        );
        expect(emptyCheck).toBeDefined();
      });
    });
  });

  describe('getStarboardSpec', () => {
    it('should return valid spec with default config', () => {
      const spec = getStarboardSpec();

      expect(spec.events).toBeDefined();
      expect(spec.events).toBe(starboardEventHandlers);

      expect(spec.commands).toBeDefined();
      expect(spec.commands).toBe(starboardCommands);

      expect(spec.state).toBeDefined();
      expect(spec.state!.tables).toBe(starboardTables);
    });

    it('should return valid spec with custom config', () => {
      const config: StarboardConfig = {
        channel: '123456789',
        threshold: 5,
        emoji: '🌟',
        selfStar: false,
        botMessages: false,
        ignoredChannels: ['spam'],
        nsfwAllowed: false,
        tiers: [
          { threshold: 5, emoji: '⭐', color: '#ffd700' },
          { threshold: 10, emoji: '🌟', color: '#ffaa00' },
          { threshold: 25, emoji: '💫', color: '#ff8800' },
        ],
      };

      const spec = getStarboardSpec(config);

      expect(spec.events).toBe(starboardEventHandlers);
      expect(spec.commands).toBe(starboardCommands);
      expect(spec.state!.tables).toBe(starboardTables);
    });

    it('should not include canvas property', () => {
      const spec = getStarboardSpec();
      expect(spec.canvas).toBeUndefined();
    });
  });
});
