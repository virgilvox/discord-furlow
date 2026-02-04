/**
 * Welcome builtin module tests
 */

import { describe, it, expect } from 'vitest';
import {
  welcomeEventHandlers,
  welcomeCommands,
  welcomeCanvasGenerators,
  getWelcomeSpec,
  type WelcomeConfig,
} from '../welcome/index.js';

describe('Welcome Builtin', () => {
  describe('Exports', () => {
    it('should export welcomeEventHandlers array', () => {
      expect(welcomeEventHandlers).toBeDefined();
      expect(Array.isArray(welcomeEventHandlers)).toBe(true);
    });

    it('should export welcomeCommands array', () => {
      expect(welcomeCommands).toBeDefined();
      expect(Array.isArray(welcomeCommands)).toBe(true);
    });

    it('should export welcomeCanvasGenerators object', () => {
      expect(welcomeCanvasGenerators).toBeDefined();
      expect(typeof welcomeCanvasGenerators).toBe('object');
    });

    it('should export getWelcomeSpec function', () => {
      expect(getWelcomeSpec).toBeDefined();
      expect(typeof getWelcomeSpec).toBe('function');
    });
  });

  describe('Event Handlers', () => {
    it('should handle member_join event', () => {
      const joinHandler = welcomeEventHandlers.find((h) => h.event === 'member_join');
      expect(joinHandler).toBeDefined();
      expect(joinHandler!.actions).toBeDefined();
      expect(joinHandler!.actions.length).toBeGreaterThan(0);
    });

    it('should handle member_leave event', () => {
      const leaveHandler = welcomeEventHandlers.find((h) => h.event === 'member_leave');
      expect(leaveHandler).toBeDefined();
      expect(leaveHandler!.actions).toBeDefined();
    });

    describe('member_join handler', () => {
      it('should include auto-role assignment logic', () => {
        const joinHandler = welcomeEventHandlers.find((h) => h.event === 'member_join');
        const autoRoleAction = joinHandler!.actions.find(
          (a) =>
            a.action === 'flow_if' &&
            (a as { condition?: string }).condition?.includes('autoRoles')
        );
        expect(autoRoleAction).toBeDefined();
      });

      it('should include DM new member logic', () => {
        const joinHandler = welcomeEventHandlers.find((h) => h.event === 'member_join');
        const dmAction = joinHandler!.actions.find(
          (a) =>
            a.action === 'flow_if' &&
            (a as { condition?: string }).condition?.includes('dmNewMembers')
        );
        expect(dmAction).toBeDefined();
      });

      it('should include welcome image logic', () => {
        const joinHandler = welcomeEventHandlers.find((h) => h.event === 'member_join');
        const imageAction = joinHandler!.actions.find(
          (a) =>
            a.action === 'flow_if' &&
            (a as { condition?: string }).condition?.includes('useImage')
        );
        expect(imageAction).toBeDefined();
      });
    });

    describe('member_leave handler', () => {
      it('should send leave message to configured channel', () => {
        const leaveHandler = welcomeEventHandlers.find((h) => h.event === 'member_leave');
        expect(leaveHandler!.actions.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Commands', () => {
    it('should have welcome command with subcommands', () => {
      const welcomeCmd = welcomeCommands.find((c) => c.name === 'welcome');
      expect(welcomeCmd).toBeDefined();
      expect(welcomeCmd!.subcommands).toBeDefined();
      expect(welcomeCmd!.subcommands!.length).toBeGreaterThan(0);
    });

    describe('welcome command subcommands', () => {
      const welcomeCmd = welcomeCommands.find((c) => c.name === 'welcome')!;

      it('should have test subcommand', () => {
        const testSub = welcomeCmd.subcommands!.find((s) => s.name === 'test');
        expect(testSub).toBeDefined();
        expect(testSub!.description).toBeDefined();

        const emitAction = testSub!.actions.find((a) => a.action === 'emit');
        expect(emitAction).toBeDefined();
      });

      it('should have set-channel subcommand', () => {
        const setChannelSub = welcomeCmd.subcommands!.find((s) => s.name === 'set-channel');
        expect(setChannelSub).toBeDefined();

        const channelOpt = setChannelSub!.options!.find((o) => o.name === 'channel');
        expect(channelOpt).toBeDefined();
        expect(channelOpt!.type).toBe('channel');
        expect(channelOpt!.required).toBe(true);
      });

      it('should have set-message subcommand', () => {
        const setMsgSub = welcomeCmd.subcommands!.find((s) => s.name === 'set-message');
        expect(setMsgSub).toBeDefined();

        const messageOpt = setMsgSub!.options!.find((o) => o.name === 'message');
        expect(messageOpt).toBeDefined();
        expect(messageOpt!.type).toBe('string');
      });

      it('should have add-autorole subcommand', () => {
        const addRoleSub = welcomeCmd.subcommands!.find((s) => s.name === 'add-autorole');
        expect(addRoleSub).toBeDefined();

        const roleOpt = addRoleSub!.options!.find((o) => o.name === 'role');
        expect(roleOpt).toBeDefined();
        expect(roleOpt!.type).toBe('role');

        const listPushAction = addRoleSub!.actions.find((a) => a.action === 'list_push');
        expect(listPushAction).toBeDefined();
      });

      it('should have remove-autorole subcommand', () => {
        const removeRoleSub = welcomeCmd.subcommands!.find((s) => s.name === 'remove-autorole');
        expect(removeRoleSub).toBeDefined();

        const listRemoveAction = removeRoleSub!.actions.find((a) => a.action === 'list_remove');
        expect(listRemoveAction).toBeDefined();
      });
    });
  });

  describe('Canvas Generators', () => {
    it('should define welcome_card generator', () => {
      expect(welcomeCanvasGenerators.welcome_card).toBeDefined();
    });

    describe('welcome_card generator', () => {
      const generator = welcomeCanvasGenerators.welcome_card;

      it('should have required dimensions', () => {
        expect(generator.width).toBeDefined();
        expect(generator.height).toBeDefined();
        expect(typeof generator.width).toBe('number');
        expect(typeof generator.height).toBe('number');
      });

      it('should have background color', () => {
        expect(generator.background).toBeDefined();
      });

      it('should have layers array', () => {
        expect(generator.layers).toBeDefined();
        expect(Array.isArray(generator.layers)).toBe(true);
        expect(generator.layers.length).toBeGreaterThan(0);
      });

      it('should include background rect layer', () => {
        const bgLayer = generator.layers.find((l) => l.type === 'rect');
        expect(bgLayer).toBeDefined();
      });

      it('should include avatar circle image layer', () => {
        const avatarLayer = generator.layers.find((l) => l.type === 'circle_image');
        expect(avatarLayer).toBeDefined();
        expect((avatarLayer as { url?: string }).url).toBeDefined();
      });

      it('should include text layers', () => {
        const textLayers = generator.layers.filter((l) => l.type === 'text');
        expect(textLayers.length).toBeGreaterThanOrEqual(3);
      });

      it('should have Welcome! text', () => {
        const welcomeText = generator.layers.find(
          (l) => l.type === 'text' && (l as { text?: string }).text === 'Welcome!'
        );
        expect(welcomeText).toBeDefined();
      });

      it('should display member name dynamically', () => {
        const memberNameLayer = generator.layers.find(
          (l) =>
            l.type === 'text' && (l as { text?: string }).text?.includes('member.display_name')
        );
        expect(memberNameLayer).toBeDefined();
      });

      it('should display member count', () => {
        const memberCountLayer = generator.layers.find(
          (l) =>
            l.type === 'text' && (l as { text?: string }).text?.includes('guild.member_count')
        );
        expect(memberCountLayer).toBeDefined();
      });
    });
  });

  describe('getWelcomeSpec', () => {
    it('should return valid spec with default config', () => {
      const spec = getWelcomeSpec();

      expect(spec.events).toBeDefined();
      expect(spec.events).toBe(welcomeEventHandlers);

      expect(spec.commands).toBeDefined();
      expect(spec.commands).toBe(welcomeCommands);

      expect(spec.canvas).toBeDefined();
      expect(spec.canvas!.generators).toBe(welcomeCanvasGenerators);
    });

    it('should return valid spec with custom config', () => {
      const config: WelcomeConfig = {
        channel: '123456789',
        message: 'Welcome to the server!',
        useImage: true,
        autoRoles: ['role1', 'role2'],
        dmNewMembers: true,
        dmMessage: 'Thanks for joining!',
      };

      const spec = getWelcomeSpec(config);

      expect(spec.events).toBe(welcomeEventHandlers);
      expect(spec.commands).toBe(welcomeCommands);
      expect(spec.canvas!.generators).toBe(welcomeCanvasGenerators);
    });

    it('should not include tables property', () => {
      const spec = getWelcomeSpec();
      expect(spec.state).toBeUndefined();
    });
  });
});
