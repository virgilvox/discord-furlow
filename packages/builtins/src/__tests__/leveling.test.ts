/**
 * Leveling builtin module tests
 */

import { describe, it, expect } from 'vitest';
import {
  levelingTables,
  levelingEventHandlers,
  levelingCommands,
  levelingCanvasGenerators,
  getLevelingSpec,
  type LevelingConfig,
} from '../leveling/index.js';

describe('Leveling Builtin', () => {
  describe('Exports', () => {
    it('should export levelingTables object', () => {
      expect(levelingTables).toBeDefined();
      expect(typeof levelingTables).toBe('object');
    });

    it('should export levelingEventHandlers array', () => {
      expect(levelingEventHandlers).toBeDefined();
      expect(Array.isArray(levelingEventHandlers)).toBe(true);
    });

    it('should export levelingCommands array', () => {
      expect(levelingCommands).toBeDefined();
      expect(Array.isArray(levelingCommands)).toBe(true);
    });

    it('should export levelingCanvasGenerators object', () => {
      expect(levelingCanvasGenerators).toBeDefined();
      expect(typeof levelingCanvasGenerators).toBe('object');
    });

    it('should export getLevelingSpec function', () => {
      expect(getLevelingSpec).toBeDefined();
      expect(typeof getLevelingSpec).toBe('function');
    });
  });

  describe('Tables', () => {
    it('should define levels table', () => {
      expect(levelingTables.levels).toBeDefined();
      expect(levelingTables.levels.columns).toBeDefined();
    });

    describe('levels table', () => {
      const cols = levelingTables.levels.columns;

      it('should have primary key id', () => {
        expect(cols.id).toBeDefined();
        expect(cols.id.type).toBe('number');
        expect(cols.id.primary).toBe(true);
      });

      it('should have user_id with index', () => {
        expect(cols.user_id).toBeDefined();
        expect(cols.user_id.type).toBe('string');
        expect(cols.user_id.index).toBe(true);
      });

      it('should have guild_id with index', () => {
        expect(cols.guild_id).toBeDefined();
        expect(cols.guild_id.index).toBe(true);
      });

      it('should have xp column with default', () => {
        expect(cols.xp).toBeDefined();
        expect(cols.xp.type).toBe('number');
        expect(cols.xp.default).toBe(0);
      });

      it('should have level column with default', () => {
        expect(cols.level).toBeDefined();
        expect(cols.level.type).toBe('number');
        expect(cols.level.default).toBe(0);
      });

      it('should have total_messages column', () => {
        expect(cols.total_messages).toBeDefined();
        expect(cols.total_messages.type).toBe('number');
        expect(cols.total_messages.default).toBe(0);
      });

      it('should have last_xp_at timestamp', () => {
        expect(cols.last_xp_at).toBeDefined();
        expect(cols.last_xp_at.type).toBe('timestamp');
      });
    });
  });

  describe('Event Handlers', () => {
    it('should have message event handler', () => {
      const handler = levelingEventHandlers.find((h) => h.event === 'message');
      expect(handler).toBeDefined();
    });

    describe('message handler', () => {
      const handler = levelingEventHandlers.find((h) => h.event === 'message')!;

      it('should exclude bot messages', () => {
        expect(handler.condition).toContain('!message.author.bot');
      });

      it('should check for ignored channels', () => {
        expect(handler.condition).toContain('ignoredChannels');
      });

      it('should query user data', () => {
        const dbQuery = handler.actions.find(
          (a) =>
            a.action === 'db_query' &&
            (a as { table?: string }).table === 'levels'
        );
        expect(dbQuery).toBeDefined();
      });

      it('should initialize new users', () => {
        const initCheck = handler.actions.find(
          (a) =>
            a.action === 'flow_if' &&
            (a as { condition?: string }).condition?.includes('!userData')
        );
        expect(initCheck).toBeDefined();
      });

      it('should check cooldown', () => {
        const cooldownSet = handler.actions.find(
          (a) =>
            a.action === 'set' &&
            (a as { key?: string }).key === 'cooldownPassed'
        );
        expect(cooldownSet).toBeDefined();
      });

      it('should calculate XP gain with multipliers', () => {
        const xpActions = handler.actions.filter(
          (a) => a.action === 'set' || a.action === 'flow_if'
        );
        expect(xpActions.length).toBeGreaterThan(0);
      });

      it('should handle level up logic', () => {
        // The leveledUp check is nested inside the cooldown flow_if
        const handlerJson = JSON.stringify(handler.actions);
        expect(handlerJson).toContain('leveledUp');
      });
    });
  });

  describe('Commands', () => {
    it('should have rank command', () => {
      const rankCmd = levelingCommands.find((c) => c.name === 'rank');
      expect(rankCmd).toBeDefined();
    });

    it('should have leaderboard command', () => {
      const lbCmd = levelingCommands.find((c) => c.name === 'leaderboard');
      expect(lbCmd).toBeDefined();
    });

    it('should have setxp command', () => {
      const setxpCmd = levelingCommands.find((c) => c.name === 'setxp');
      expect(setxpCmd).toBeDefined();
    });

    it('should have setlevel command', () => {
      const setlevelCmd = levelingCommands.find((c) => c.name === 'setlevel');
      expect(setlevelCmd).toBeDefined();
    });

    describe('rank command', () => {
      const cmd = levelingCommands.find((c) => c.name === 'rank')!;

      it('should have optional user option', () => {
        const userOpt = cmd.options!.find((o) => o.name === 'user');
        expect(userOpt).toBeDefined();
        expect(userOpt!.required).toBe(false);
      });

      it('should query levels table', () => {
        const dbQuery = cmd.actions.find((a) => a.action === 'db_query');
        expect(dbQuery).toBeDefined();
      });

      it('should handle rank card rendering', () => {
        // The useRankCard check is nested inside the else branch
        const cmdJson = JSON.stringify(cmd.actions);
        expect(cmdJson).toContain('useRankCard');
        expect(cmdJson).toContain('canvas_render');
      });
    });

    describe('leaderboard command', () => {
      const cmd = levelingCommands.find((c) => c.name === 'leaderboard')!;

      it('should have optional page option', () => {
        const pageOpt = cmd.options!.find((o) => o.name === 'page');
        expect(pageOpt).toBeDefined();
        expect(pageOpt!.type).toBe('integer');
        expect(pageOpt!.required).toBe(false);
      });

      it('should query with pagination', () => {
        const dbQuery = cmd.actions.find(
          (a) =>
            a.action === 'db_query' &&
            (a as { order_by?: string }).order_by !== undefined
        );
        expect(dbQuery).toBeDefined();
      });
    });

    describe('setxp command', () => {
      const cmd = levelingCommands.find((c) => c.name === 'setxp')!;

      it('should require user and xp options', () => {
        const userOpt = cmd.options!.find((o) => o.name === 'user');
        expect(userOpt!.required).toBe(true);

        const xpOpt = cmd.options!.find((o) => o.name === 'xp');
        expect(xpOpt!.required).toBe(true);
        expect(xpOpt!.type).toBe('integer');
      });

      it('should use db_update action', () => {
        const updateAction = cmd.actions.find((a) => a.action === 'db_update');
        expect(updateAction).toBeDefined();
      });
    });

    describe('setlevel command', () => {
      const cmd = levelingCommands.find((c) => c.name === 'setlevel')!;

      it('should require user and level options', () => {
        const userOpt = cmd.options!.find((o) => o.name === 'user');
        expect(userOpt!.required).toBe(true);

        const levelOpt = cmd.options!.find((o) => o.name === 'level');
        expect(levelOpt!.required).toBe(true);
        expect(levelOpt!.type).toBe('integer');
      });
    });
  });

  describe('Canvas Generators', () => {
    it('should define rank_card generator', () => {
      expect(levelingCanvasGenerators.rank_card).toBeDefined();
    });

    describe('rank_card generator', () => {
      const generator = levelingCanvasGenerators.rank_card;

      it('should have required dimensions', () => {
        expect(generator.width).toBe(934);
        expect(generator.height).toBe(282);
      });

      it('should have background color', () => {
        expect(generator.background).toBeDefined();
      });

      it('should have layers array', () => {
        expect(generator.layers).toBeDefined();
        expect(Array.isArray(generator.layers)).toBe(true);
        expect(generator.layers.length).toBeGreaterThan(0);
      });

      it('should include background gradient rect', () => {
        const bgLayer = generator.layers.find(
          (l) => l.type === 'rect' && (l as { color?: string }).color?.includes('gradient')
        );
        expect(bgLayer).toBeDefined();
      });

      it('should include avatar circle image', () => {
        const avatarLayer = generator.layers.find((l) => l.type === 'circle_image');
        expect(avatarLayer).toBeDefined();
      });

      it('should include username text', () => {
        const usernameLayer = generator.layers.find(
          (l) =>
            l.type === 'text' && (l as { text?: string }).text?.includes('user.username')
        );
        expect(usernameLayer).toBeDefined();
      });

      it('should include rank display', () => {
        const rankLayer = generator.layers.find(
          (l) => l.type === 'text' && (l as { text?: string }).text?.includes('RANK')
        );
        expect(rankLayer).toBeDefined();
      });

      it('should include level display', () => {
        const levelLayer = generator.layers.find(
          (l) => l.type === 'text' && (l as { text?: string }).text?.includes('LEVEL')
        );
        expect(levelLayer).toBeDefined();
      });

      it('should include XP progress bar', () => {
        const progressBar = generator.layers.find((l) => l.type === 'progress_bar');
        expect(progressBar).toBeDefined();
      });

      it('should include XP text', () => {
        const xpText = generator.layers.find(
          (l) => l.type === 'text' && (l as { text?: string }).text?.includes('XP')
        );
        expect(xpText).toBeDefined();
      });

      it('should include messages count', () => {
        const messagesLayer = generator.layers.find(
          (l) =>
            l.type === 'text' && (l as { text?: string }).text?.includes('totalMessages')
        );
        expect(messagesLayer).toBeDefined();
      });
    });
  });

  describe('getLevelingSpec', () => {
    it('should return valid spec with default config', () => {
      const spec = getLevelingSpec();

      expect(spec.events).toBeDefined();
      expect(spec.events).toBe(levelingEventHandlers);

      expect(spec.commands).toBeDefined();
      expect(spec.commands).toBe(levelingCommands);

      expect(spec.state).toBeDefined();
      expect(spec.state!.tables).toBe(levelingTables);

      expect(spec.canvas).toBeDefined();
      expect(spec.canvas!.generators).toBe(levelingCanvasGenerators);
    });

    it('should return valid spec with custom config', () => {
      const config: LevelingConfig = {
        xpPerMessage: [10, 20],
        xpCooldown: 30,
        roleMultipliers: { 'booster': 1.5 },
        ignoredChannels: ['spam'],
        announceChannel: '123',
        levelUpEmbed: true,
        rewards: {
          5: ['role1'],
          10: ['role2'],
        },
        stackRewards: true,
        useRankCard: true,
        xpCurve: 'exponential',
        baseXP: 100,
        xpMultiplier: 1.5,
      };

      const spec = getLevelingSpec(config);

      expect(spec.events).toBe(levelingEventHandlers);
      expect(spec.commands).toBe(levelingCommands);
      expect(spec.state!.tables).toBe(levelingTables);
      expect(spec.canvas!.generators).toBe(levelingCanvasGenerators);
    });
  });
});
