/**
 * Utilities builtin module tests
 */

import { describe, it, expect } from 'vitest';
import {
  utilitiesCommands,
  getUtilitiesSpec,
  type UtilitiesConfig,
} from '../utilities/index.js';

describe('Utilities Builtin', () => {
  describe('Exports', () => {
    it('should export utilitiesCommands array', () => {
      expect(utilitiesCommands).toBeDefined();
      expect(Array.isArray(utilitiesCommands)).toBe(true);
    });

    it('should export getUtilitiesSpec function', () => {
      expect(getUtilitiesSpec).toBeDefined();
      expect(typeof getUtilitiesSpec).toBe('function');
    });
  });

  describe('Commands', () => {
    it('should have expected command names', () => {
      const commandNames = utilitiesCommands.map((c) => c.name);
      expect(commandNames).toContain('serverinfo');
      expect(commandNames).toContain('userinfo');
      expect(commandNames).toContain('avatar');
      expect(commandNames).toContain('banner');
      expect(commandNames).toContain('roleinfo');
      expect(commandNames).toContain('channelinfo');
      expect(commandNames).toContain('ping');
      expect(commandNames).toContain('invite');
      expect(commandNames).toContain('membercount');
      expect(commandNames).toContain('emojis');
      expect(commandNames).toContain('roles');
    });

    describe('serverinfo command', () => {
      const cmd = utilitiesCommands.find((c) => c.name === 'serverinfo')!;

      it('should have no required options', () => {
        expect(cmd.options).toBeUndefined();
      });

      it('should display server information in embed', () => {
        const replyAction = cmd.actions!.find((a) => a.action === 'reply');
        expect(replyAction).toBeDefined();
        expect((replyAction as { embed?: unknown }).embed).toBeDefined();
      });
    });

    describe('userinfo command', () => {
      const cmd = utilitiesCommands.find((c) => c.name === 'userinfo')!;

      it('should have optional user option', () => {
        const userOpt = cmd.options!.find((o) => o.name === 'user');
        expect(userOpt).toBeDefined();
        expect(userOpt!.required).toBe(false);
      });

      it('should default to command author', () => {
        const targetSet = cmd.actions!.find(
          (a) =>
            a.action === 'set' &&
            (a as { key?: string }).key === 'targetUser'
        );
        expect(targetSet).toBeDefined();
        expect((targetSet as { value?: string }).value).toContain('args.user || user');
      });
    });

    describe('avatar command', () => {
      const cmd = utilitiesCommands.find((c) => c.name === 'avatar')!;

      it('should have optional user option', () => {
        const userOpt = cmd.options!.find((o) => o.name === 'user');
        expect(userOpt!.required).toBe(false);
      });

      it('should display avatar image in embed', () => {
        const replyAction = cmd.actions!.find((a) => a.action === 'reply');
        const embed = (replyAction as { embed?: { image?: string; description?: string } }).embed;
        expect(embed?.image).toContain('avatar');
        expect(embed?.description).toBe('Click the image to view full size');
      });
    });

    describe('banner command', () => {
      const cmd = utilitiesCommands.find((c) => c.name === 'banner')!;

      it('should check if user has banner', () => {
        const bannerCheck = cmd.actions!.find(
          (a) =>
            a.action === 'flow_if' &&
            (a as { condition?: string }).condition?.includes('banner')
        );
        expect(bannerCheck).toBeDefined();
      });
    });

    describe('roleinfo command', () => {
      const cmd = utilitiesCommands.find((c) => c.name === 'roleinfo')!;

      it('should require role option', () => {
        const roleOpt = cmd.options!.find((o) => o.name === 'role');
        expect(roleOpt!.required).toBe(true);
        expect(roleOpt!.type).toBe('role');
      });
    });

    describe('channelinfo command', () => {
      const cmd = utilitiesCommands.find((c) => c.name === 'channelinfo')!;

      it('should have optional channel option', () => {
        const channelOpt = cmd.options!.find((o) => o.name === 'channel');
        expect(channelOpt!.required).toBe(false);
      });
    });

    describe('ping command', () => {
      const cmd = utilitiesCommands.find((c) => c.name === 'ping')!;

      it('should display latency', () => {
        const replyAction = cmd.actions!.find((a) => a.action === 'reply');
        expect((replyAction as { content?: string }).content).toContain('client.ws.ping');
      });
    });

    describe('invite command', () => {
      const cmd = utilitiesCommands.find((c) => c.name === 'invite')!;

      it('should provide invite link in embed', () => {
        const replyAction = cmd.actions!.find((a) => a.action === 'reply');
        const embed = (replyAction as { embed?: { description?: string } }).embed;
        expect(embed?.description).toContain('oauth2/authorize');
      });
    });

    describe('membercount command', () => {
      const cmd = utilitiesCommands.find((c) => c.name === 'membercount')!;

      it('should calculate humans and bots', () => {
        const humansSet = cmd.actions!.find(
          (a) =>
            a.action === 'set' &&
            (a as { key?: string }).key === 'humans'
        );
        expect(humansSet).toBeDefined();

        const botsSet = cmd.actions!.find(
          (a) =>
            a.action === 'set' &&
            (a as { key?: string }).key === 'bots'
        );
        expect(botsSet).toBeDefined();
      });
    });

    describe('emojis command', () => {
      const cmd = utilitiesCommands.find((c) => c.name === 'emojis')!;

      it('should separate static and animated emojis', () => {
        const staticSet = cmd.actions!.find(
          (a) =>
            a.action === 'set' &&
            (a as { key?: string }).key === 'staticEmojis'
        );
        expect(staticSet).toBeDefined();

        const animatedSet = cmd.actions!.find(
          (a) =>
            a.action === 'set' &&
            (a as { key?: string }).key === 'animatedEmojis'
        );
        expect(animatedSet).toBeDefined();
      });
    });

    describe('roles command', () => {
      const cmd = utilitiesCommands.find((c) => c.name === 'roles')!;

      it('should list server roles', () => {
        const roleListSet = cmd.actions!.find(
          (a) =>
            a.action === 'set' &&
            (a as { key?: string }).key === 'roleList'
        );
        expect(roleListSet).toBeDefined();
      });
    });
  });

  describe('getUtilitiesSpec', () => {
    it('should return valid spec with default config', () => {
      const spec = getUtilitiesSpec();

      expect(spec.commands).toBe(utilitiesCommands);
    });

    it('should return valid spec with custom config', () => {
      const config: UtilitiesConfig = {
        enabledCommands: ['serverinfo', 'userinfo', 'ping'],
      };

      const spec = getUtilitiesSpec(config);

      expect(spec.commands).toBe(utilitiesCommands);
    });

    it('should not include events or tables', () => {
      const spec = getUtilitiesSpec();
      expect(spec.events).toBeUndefined();
      expect(spec.state).toBeUndefined();
    });

    it('should not include canvas property', () => {
      const spec = getUtilitiesSpec();
      expect(spec.canvas).toBeUndefined();
    });
  });
});
