/**
 * Logging builtin module tests
 */

import { describe, it, expect } from 'vitest';
import {
  loggingEventHandlers,
  loggingCommands,
  getLoggingSpec,
  type LoggingConfig,
} from '../logging/index.js';

describe('Logging Builtin', () => {
  describe('Exports', () => {
    it('should export loggingEventHandlers array', () => {
      expect(loggingEventHandlers).toBeDefined();
      expect(Array.isArray(loggingEventHandlers)).toBe(true);
    });

    it('should export loggingCommands array', () => {
      expect(loggingCommands).toBeDefined();
      expect(Array.isArray(loggingCommands)).toBe(true);
    });

    it('should export getLoggingSpec function', () => {
      expect(getLoggingSpec).toBeDefined();
      expect(typeof getLoggingSpec).toBe('function');
    });
  });

  describe('Event Handlers', () => {
    const eventNames = loggingEventHandlers.map((h) => h.event);

    it('should handle message_delete event', () => {
      expect(eventNames).toContain('message_delete');
    });

    it('should handle message_update event', () => {
      expect(eventNames).toContain('message_update');
    });

    it('should handle message_bulk_delete event', () => {
      expect(eventNames).toContain('message_bulk_delete');
    });

    it('should handle member_join event', () => {
      expect(eventNames).toContain('member_join');
    });

    it('should handle member_leave event', () => {
      expect(eventNames).toContain('member_leave');
    });

    it('should handle member_update event', () => {
      expect(eventNames).toContain('member_update');
    });

    it('should handle member_ban event', () => {
      expect(eventNames).toContain('member_ban');
    });

    it('should handle member_unban event', () => {
      expect(eventNames).toContain('member_unban');
    });

    it('should handle voice_join event', () => {
      expect(eventNames).toContain('voice_join');
    });

    it('should handle voice_leave event', () => {
      expect(eventNames).toContain('voice_leave');
    });

    it('should handle voice_move event', () => {
      expect(eventNames).toContain('voice_move');
    });

    it('should handle channel_create event', () => {
      expect(eventNames).toContain('channel_create');
    });

    it('should handle channel_delete event', () => {
      expect(eventNames).toContain('channel_delete');
    });

    it('should handle role_create event', () => {
      expect(eventNames).toContain('role_create');
    });

    it('should handle role_delete event', () => {
      expect(eventNames).toContain('role_delete');
    });

    describe('handler structure', () => {
      it('should have conditions for all handlers', () => {
        for (const handler of loggingEventHandlers) {
          expect(handler.condition).toBeDefined();
          expect(typeof handler.condition).toBe('string');
        }
      });

      it('should have actions for all handlers', () => {
        for (const handler of loggingEventHandlers) {
          expect(handler.actions).toBeDefined();
          expect(Array.isArray(handler.actions)).toBe(true);
          expect(handler.actions.length).toBeGreaterThan(0);
        }
      });

      it('should use send_message action in handlers', () => {
        for (const handler of loggingEventHandlers) {
          const hasSendMessage = handler.actions.some(
            (a) => a.action === 'send_message' || a.action === 'flow_if'
          );
          expect(hasSendMessage).toBe(true);
        }
      });
    });

    describe('message_delete handler', () => {
      const handler = loggingEventHandlers.find((h) => h.event === 'message_delete')!;

      it('should check config for messageDelete setting', () => {
        expect(handler.condition).toContain('messageDelete');
      });

      it('should check for ignored channels', () => {
        expect(handler.condition).toContain('ignoredChannels');
      });

      it('should send embed with delete information', () => {
        const sendAction = handler.actions.find((a) => a.action === 'send_message') as {
          embed?: { title?: string };
        };
        expect(sendAction).toBeDefined();
        expect(sendAction!.embed).toBeDefined();
        expect(sendAction!.embed!.title).toBe('Message Deleted');
      });
    });

    describe('message_update handler', () => {
      const handler = loggingEventHandlers.find((h) => h.event === 'message_update')!;

      it('should check if content actually changed', () => {
        expect(handler.condition).toContain('oldMessage.content !== newMessage.content');
      });
    });

    describe('member_join handler', () => {
      const handler = loggingEventHandlers.find((h) => h.event === 'member_join')!;

      it('should calculate account age', () => {
        const setAction = handler.actions.find(
          (a) => a.action === 'set' && (a as { key?: string }).key === 'accountAge'
        );
        expect(setAction).toBeDefined();
      });
    });

    describe('member_update handler', () => {
      const handler = loggingEventHandlers.find((h) => h.event === 'member_update')!;

      it('should handle role changes', () => {
        const roleCheck = handler.actions.find(
          (a) =>
            a.action === 'flow_if' &&
            (a as { condition?: string }).condition?.includes('roles.cache.size')
        );
        expect(roleCheck).toBeDefined();
      });

      it('should handle nickname changes', () => {
        const nicknameCheck = handler.actions.find(
          (a) =>
            a.action === 'flow_if' &&
            (a as { condition?: string }).condition?.includes('nickname')
        );
        expect(nicknameCheck).toBeDefined();
      });
    });
  });

  describe('Commands', () => {
    it('should have logging command with subcommands', () => {
      const loggingCmd = loggingCommands.find((c) => c.name === 'logging');
      expect(loggingCmd).toBeDefined();
      expect(loggingCmd!.subcommands).toBeDefined();
    });

    describe('logging command subcommands', () => {
      const loggingCmd = loggingCommands.find((c) => c.name === 'logging')!;

      it('should have set-channel subcommand', () => {
        const setChannel = loggingCmd.subcommands!.find((s) => s.name === 'set-channel');
        expect(setChannel).toBeDefined();

        const channelOpt = setChannel!.options!.find((o) => o.name === 'channel');
        expect(channelOpt).toBeDefined();
        expect(channelOpt!.type).toBe('channel');

        const categoryOpt = setChannel!.options!.find((o) => o.name === 'category');
        expect(categoryOpt).toBeDefined();
        expect(categoryOpt!.choices).toBeDefined();
        expect(categoryOpt!.choices!.length).toBeGreaterThan(0);
      });

      it('should have toggle subcommand', () => {
        const toggle = loggingCmd.subcommands!.find((s) => s.name === 'toggle');
        expect(toggle).toBeDefined();

        const eventOpt = toggle!.options!.find((o) => o.name === 'event');
        expect(eventOpt).toBeDefined();
        expect(eventOpt!.choices).toBeDefined();

        const enabledOpt = toggle!.options!.find((o) => o.name === 'enabled');
        expect(enabledOpt).toBeDefined();
        expect(enabledOpt!.type).toBe('boolean');
      });

      it('should have ignore-channel subcommand', () => {
        const ignoreChannel = loggingCmd.subcommands!.find((s) => s.name === 'ignore-channel');
        expect(ignoreChannel).toBeDefined();

        const channelOpt = ignoreChannel!.options!.find((o) => o.name === 'channel');
        expect(channelOpt).toBeDefined();

        const listPushAction = ignoreChannel!.actions.find((a) => a.action === 'list_push');
        expect(listPushAction).toBeDefined();
      });
    });
  });

  describe('getLoggingSpec', () => {
    it('should return valid spec with default config', () => {
      const spec = getLoggingSpec();

      expect(spec.events).toBeDefined();
      expect(spec.events).toBe(loggingEventHandlers);

      expect(spec.commands).toBeDefined();
      expect(spec.commands).toBe(loggingCommands);
    });

    it('should return valid spec with custom config', () => {
      const config: LoggingConfig = {
        channel: '123456789',
        channels: {
          messages: '111',
          members: '222',
          voice: '333',
        },
        ignoredChannels: ['ignored1', 'ignored2'],
        events: {
          messageDelete: true,
          memberJoin: false,
        },
      };

      const spec = getLoggingSpec(config);

      expect(spec.events).toBe(loggingEventHandlers);
      expect(spec.commands).toBe(loggingCommands);
    });

    it('should not include state/tables property', () => {
      const spec = getLoggingSpec();
      expect(spec.state).toBeUndefined();
    });

    it('should not include canvas property', () => {
      const spec = getLoggingSpec();
      expect(spec.canvas).toBeUndefined();
    });
  });
});
