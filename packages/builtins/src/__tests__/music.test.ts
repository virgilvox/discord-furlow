/**
 * Music builtin module tests
 */

import { describe, it, expect } from 'vitest';
import {
  musicTables,
  musicCommands,
  musicEventHandlers,
  getMusicSpec,
  type MusicConfig,
} from '../music/index.js';

describe('Music Builtin', () => {
  describe('Exports', () => {
    it('should export musicTables object', () => {
      expect(musicTables).toBeDefined();
      expect(typeof musicTables).toBe('object');
    });

    it('should export musicCommands array', () => {
      expect(musicCommands).toBeDefined();
      expect(Array.isArray(musicCommands)).toBe(true);
    });

    it('should export musicEventHandlers array', () => {
      expect(musicEventHandlers).toBeDefined();
      expect(Array.isArray(musicEventHandlers)).toBe(true);
    });

    it('should export getMusicSpec function', () => {
      expect(getMusicSpec).toBeDefined();
      expect(typeof getMusicSpec).toBe('function');
    });
  });

  describe('Tables', () => {
    it('should define music_playlists table', () => {
      expect(musicTables.music_playlists).toBeDefined();
      expect(musicTables.music_playlists.columns).toBeDefined();
    });

    describe('music_playlists table', () => {
      const cols = musicTables.music_playlists.columns;

      it('should have required columns', () => {
        expect(cols.id.primary).toBe(true);
        expect(cols.guild_id.index).toBe(true);
        expect(cols.user_id.index).toBe(true);
        expect(cols.name).toBeDefined();
        expect(cols.tracks.type).toBe('json');
        expect(cols.created_at.type).toBe('timestamp');
      });
    });
  });

  describe('Commands', () => {
    it('should have expected command names', () => {
      const commandNames = musicCommands.map((c) => c.name);
      expect(commandNames).toContain('play');
      expect(commandNames).toContain('skip');
      expect(commandNames).toContain('stop');
      expect(commandNames).toContain('pause');
      expect(commandNames).toContain('resume');
      expect(commandNames).toContain('queue');
      expect(commandNames).toContain('nowplaying');
      expect(commandNames).toContain('volume');
      expect(commandNames).toContain('shuffle');
      expect(commandNames).toContain('loop');
      expect(commandNames).toContain('seek');
      expect(commandNames).toContain('filter');
      expect(commandNames).toContain('leave');
    });

    describe('play command', () => {
      const cmd = musicCommands.find((c) => c.name === 'play')!;

      it('should require query option', () => {
        const queryOpt = cmd.options!.find((o) => o.name === 'query');
        expect(queryOpt).toBeDefined();
        expect(queryOpt!.required).toBe(true);
      });

      it('should check voice channel membership', () => {
        const voiceCheck = cmd.actions.find(
          (a) =>
            a.action === 'flow_if' &&
            (a as { condition?: string }).condition?.includes('voice.channel')
        );
        expect(voiceCheck).toBeDefined();
      });

      it('should join voice and search', () => {
        expect(cmd.actions.find((a) => a.action === 'voice_join')).toBeDefined();
        expect(cmd.actions.find((a) => a.action === 'voice_search')).toBeDefined();
        expect(cmd.actions.find((a) => a.action === 'queue_add')).toBeDefined();
      });
    });

    describe('volume command', () => {
      const cmd = musicCommands.find((c) => c.name === 'volume')!;

      it('should validate volume range', () => {
        const rangeCheck = cmd.actions.find(
          (a) =>
            a.action === 'flow_if' &&
            (a as { condition?: string }).condition?.includes('args.level < 0')
        );
        expect(rangeCheck).toBeDefined();
      });
    });

    describe('loop command', () => {
      const cmd = musicCommands.find((c) => c.name === 'loop')!;

      it('should have mode choices', () => {
        const modeOpt = cmd.options!.find((o) => o.name === 'mode');
        expect(modeOpt!.choices).toBeDefined();
        expect(modeOpt!.choices!.length).toBe(3);
      });
    });

    describe('filter command', () => {
      const cmd = musicCommands.find((c) => c.name === 'filter')!;

      it('should have filter choices', () => {
        const filterOpt = cmd.options!.find((o) => o.name === 'filter');
        expect(filterOpt!.choices).toBeDefined();
        expect(filterOpt!.choices!.length).toBeGreaterThanOrEqual(5);
      });

      it('should check config for filter permission', () => {
        const permCheck = cmd.actions.find(
          (a) =>
            a.action === 'flow_if' &&
            (a as { condition?: string }).condition?.includes('allowFilters')
        );
        expect(permCheck).toBeDefined();
      });
    });
  });

  describe('Event Handlers', () => {
    it('should handle voice_track_start event', () => {
      const handler = musicEventHandlers.find((h) => h.event === 'voice_track_start');
      expect(handler).toBeDefined();
      expect(handler!.condition).toContain('announceNowPlaying');
    });

    it('should handle voice_leave event for auto-leave', () => {
      const handler = musicEventHandlers.find((h) => h.event === 'voice_leave');
      expect(handler).toBeDefined();
      expect(handler!.condition).toContain('stayInChannel');
    });
  });

  describe('getMusicSpec', () => {
    it('should return valid spec with default config', () => {
      const spec = getMusicSpec();

      expect(spec.commands).toBe(musicCommands);
      expect(spec.events).toBe(musicEventHandlers);
      expect(spec.state!.tables).toBe(musicTables);
    });

    it('should return valid spec with custom config', () => {
      const config: MusicConfig = {
        defaultVolume: 50,
        maxQueueSize: 100,
        djRole: '123',
        stayInChannel: false,
        leaveAfterIdle: 300,
        allowSeeking: true,
        allowFilters: true,
        announceNowPlaying: true,
        announceChannel: '456',
      };

      const spec = getMusicSpec(config);

      expect(spec.commands).toBe(musicCommands);
      expect(spec.events).toBe(musicEventHandlers);
    });
  });
});
