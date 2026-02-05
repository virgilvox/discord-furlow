/**
 * Tickets builtin module tests
 */

import { describe, it, expect } from 'vitest';
import {
  ticketsTables,
  ticketPanelComponents,
  ticketControlComponents,
  ticketsEventHandlers,
  ticketsCommands,
  getTicketsSpec,
  type TicketsConfig,
} from '../tickets/index.js';

describe('Tickets Builtin', () => {
  describe('Exports', () => {
    it('should export ticketsTables object', () => {
      expect(ticketsTables).toBeDefined();
      expect(typeof ticketsTables).toBe('object');
    });

    it('should export ticketPanelComponents array', () => {
      expect(ticketPanelComponents).toBeDefined();
      expect(Array.isArray(ticketPanelComponents)).toBe(true);
    });

    it('should export ticketControlComponents array', () => {
      expect(ticketControlComponents).toBeDefined();
      expect(Array.isArray(ticketControlComponents)).toBe(true);
    });

    it('should export ticketsEventHandlers array', () => {
      expect(ticketsEventHandlers).toBeDefined();
      expect(Array.isArray(ticketsEventHandlers)).toBe(true);
    });

    it('should export ticketsCommands array', () => {
      expect(ticketsCommands).toBeDefined();
      expect(Array.isArray(ticketsCommands)).toBe(true);
    });

    it('should export getTicketsSpec function', () => {
      expect(getTicketsSpec).toBeDefined();
      expect(typeof getTicketsSpec).toBe('function');
    });
  });

  describe('Tables', () => {
    it('should define tickets table', () => {
      expect(ticketsTables.tickets).toBeDefined();
      expect(ticketsTables.tickets.columns).toBeDefined();
    });

    it('should define ticket_messages table', () => {
      expect(ticketsTables.ticket_messages).toBeDefined();
      expect(ticketsTables.ticket_messages.columns).toBeDefined();
    });

    describe('tickets table', () => {
      const cols = ticketsTables.tickets.columns;

      it('should have primary key id', () => {
        expect(cols.id).toBeDefined();
        expect(cols.id.type).toBe('number');
        expect(cols.id.primary).toBe(true);
      });

      it('should have channel_id with unique constraint', () => {
        expect(cols.channel_id).toBeDefined();
        expect(cols.channel_id.type).toBe('string');
        expect(cols.channel_id.unique).toBe(true);
      });

      it('should have guild_id with index', () => {
        expect(cols.guild_id).toBeDefined();
        expect(cols.guild_id.index).toBe(true);
      });

      it('should have user_id with index', () => {
        expect(cols.user_id).toBeDefined();
        expect(cols.user_id.index).toBe(true);
      });

      it('should have category column', () => {
        expect(cols.category).toBeDefined();
        expect(cols.category.type).toBe('string');
      });

      it('should have claimed_by column', () => {
        expect(cols.claimed_by).toBeDefined();
      });

      it('should have status column with default', () => {
        expect(cols.status).toBeDefined();
        expect(cols.status.default).toBe('open');
      });

      it('should have timestamp columns', () => {
        expect(cols.created_at).toBeDefined();
        expect(cols.created_at.type).toBe('timestamp');
        expect(cols.closed_at).toBeDefined();
        expect(cols.closed_at.type).toBe('timestamp');
      });
    });

    describe('ticket_messages table', () => {
      const cols = ticketsTables.ticket_messages.columns;

      it('should have required columns', () => {
        expect(cols.id).toBeDefined();
        expect(cols.id.primary).toBe(true);

        expect(cols.ticket_id).toBeDefined();
        expect(cols.ticket_id.index).toBe(true);

        expect(cols.author_id).toBeDefined();
        expect(cols.author_name).toBeDefined();
        expect(cols.content).toBeDefined();

        expect(cols.attachments).toBeDefined();
        expect(cols.attachments.type).toBe('json');

        expect(cols.created_at).toBeDefined();
      });
    });
  });

  describe('Components', () => {
    describe('ticketPanelComponents', () => {
      it('should have action row with create ticket button', () => {
        expect(ticketPanelComponents).toHaveLength(1);
        expect(ticketPanelComponents[0].type).toBe('action_row');
        expect(ticketPanelComponents[0].components).toHaveLength(1);

        const button = ticketPanelComponents[0].components[0];
        expect(button.type).toBe('button');
        expect(button.custom_id).toBe('ticket_create');
        expect(button.style).toBe('primary');
      });
    });

    describe('ticketControlComponents', () => {
      it('should have action row with control buttons', () => {
        expect(ticketControlComponents).toHaveLength(1);
        expect(ticketControlComponents[0].type).toBe('action_row');
        const actionRow = ticketControlComponents[0] as { type: string; components: { custom_id?: string; style?: string }[] };
        expect(actionRow.components.length).toBeGreaterThanOrEqual(3);
      });

      it('should have claim button', () => {
        const actionRow = ticketControlComponents[0] as { type: string; components: { custom_id?: string; style?: string }[] };
        const claimBtn = actionRow.components.find(
          (c) => c.custom_id === 'ticket_claim'
        );
        expect(claimBtn).toBeDefined();
        expect(claimBtn!.style).toBe('secondary');
      });

      it('should have close button', () => {
        const actionRow = ticketControlComponents[0] as { type: string; components: { custom_id?: string; style?: string }[] };
        const closeBtn = actionRow.components.find(
          (c) => c.custom_id === 'ticket_close'
        );
        expect(closeBtn).toBeDefined();
        expect(closeBtn!.style).toBe('danger');
      });

      it('should have transcript button', () => {
        const actionRow = ticketControlComponents[0] as { type: string; components: { custom_id?: string; style?: string }[] };
        const transcriptBtn = actionRow.components.find(
          (c) => c.custom_id === 'ticket_transcript'
        );
        expect(transcriptBtn).toBeDefined();
      });
    });
  });

  describe('Event Handlers', () => {
    // Helper to check if condition string includes a substring
    const conditionIncludes = (condition: unknown, str: string): boolean => {
      return typeof condition === 'string' && condition.includes(str);
    };

    it('should handle ticket_create button click', () => {
      const handler = ticketsEventHandlers.find(
        (h) =>
          h.event === 'button_click' &&
          conditionIncludes(h.condition, 'ticket_create')
      );
      expect(handler).toBeDefined();
    });

    it('should handle ticket category selection', () => {
      const handler = ticketsEventHandlers.find(
        (h) =>
          h.event === 'select_menu' &&
          conditionIncludes(h.condition, 'ticket_category_select')
      );
      expect(handler).toBeDefined();
    });

    it('should handle ticket_create_confirmed event', () => {
      const handler = ticketsEventHandlers.find(
        (h) => h.event === 'ticket_create_confirmed'
      );
      expect(handler).toBeDefined();

      const createChannelAction = handler!.actions!.find((a) => a.action === 'create_channel');
      expect(createChannelAction).toBeDefined();
    });

    it('should handle ticket_claim button click', () => {
      const handler = ticketsEventHandlers.find(
        (h) =>
          h.event === 'button_click' &&
          conditionIncludes(h.condition, 'ticket_claim')
      );
      expect(handler).toBeDefined();
    });

    it('should handle ticket_close button click', () => {
      const handler = ticketsEventHandlers.find(
        (h) =>
          h.event === 'button_click' &&
          conditionIncludes(h.condition, 'ticket_close"')
      );
      expect(handler).toBeDefined();
    });

    it('should handle ticket_close_confirm button click', () => {
      const handler = ticketsEventHandlers.find(
        (h) =>
          h.event === 'button_click' &&
          conditionIncludes(h.condition, 'ticket_close_confirm')
      );
      expect(handler).toBeDefined();

      // Should delete channel after delay
      const waitAction = handler!.actions!.find((a) => a.action === 'wait');
      expect(waitAction).toBeDefined();

      const deleteAction = handler!.actions!.find((a) => a.action === 'delete_channel');
      expect(deleteAction).toBeDefined();
    });

    it('should handle ticket_transcript button click', () => {
      const handler = ticketsEventHandlers.find(
        (h) =>
          h.event === 'button_click' &&
          conditionIncludes(h.condition, 'ticket_transcript')
      );
      expect(handler).toBeDefined();
    });

    it('should log messages in ticket channels', () => {
      const handler = ticketsEventHandlers.find(
        (h) =>
          h.event === 'message' &&
          conditionIncludes(h.condition, 'parentId')
      );
      expect(handler).toBeDefined();
    });
  });

  describe('Commands', () => {
    it('should have ticket command with subcommands', () => {
      const ticketCmd = ticketsCommands.find((c) => c.name === 'ticket');
      expect(ticketCmd).toBeDefined();
      expect(ticketCmd!.subcommands).toBeDefined();
    });

    describe('ticket command subcommands', () => {
      const ticketCmd = ticketsCommands.find((c) => c.name === 'ticket')!;

      it('should have panel subcommand', () => {
        const panel = ticketCmd.subcommands!.find((s) => s.name === 'panel');
        expect(panel).toBeDefined();

        const channelOpt = panel!.options!.find((o) => o.name === 'channel');
        expect(channelOpt).toBeDefined();
        expect(channelOpt!.required).toBe(false);
      });

      it('should have add subcommand', () => {
        const add = ticketCmd.subcommands!.find((s) => s.name === 'add');
        expect(add).toBeDefined();

        const userOpt = add!.options!.find((o) => o.name === 'user');
        expect(userOpt).toBeDefined();
        expect(userOpt!.type).toBe('user');
        expect(userOpt!.required).toBe(true);

        const setPermAction = add!.actions.find((a) => a.action === 'set_channel_permissions');
        expect(setPermAction).toBeDefined();
      });

      it('should have remove subcommand', () => {
        const remove = ticketCmd.subcommands!.find((s) => s.name === 'remove');
        expect(remove).toBeDefined();

        const userOpt = remove!.options!.find((o) => o.name === 'user');
        expect(userOpt).toBeDefined();
        expect(userOpt!.required).toBe(true);
      });

      it('should have rename subcommand', () => {
        const rename = ticketCmd.subcommands!.find((s) => s.name === 'rename');
        expect(rename).toBeDefined();

        const nameOpt = rename!.options!.find((o) => o.name === 'name');
        expect(nameOpt).toBeDefined();
        expect(nameOpt!.type).toBe('string');

        const editChannelAction = rename!.actions.find((a) => a.action === 'edit_channel');
        expect(editChannelAction).toBeDefined();
      });
    });
  });

  describe('getTicketsSpec', () => {
    it('should return valid spec with default config', () => {
      const spec = getTicketsSpec();

      expect(spec.events).toBeDefined();
      expect(spec.events).toBe(ticketsEventHandlers);

      expect(spec.commands).toBeDefined();
      expect(spec.commands).toBe(ticketsCommands);

      expect(spec.state).toBeDefined();
      expect(spec.state!.tables).toBe(ticketsTables);
    });

    it('should return valid spec with custom config', () => {
      const config: TicketsConfig = {
        category: '123456789',
        supportRoles: ['support', 'admin'],
        channelPattern: 'ticket-{number}',
        maxTicketsPerUser: 2,
        logChannel: '987654321',
        autoCloseAfter: 24,
        dmOnClose: true,
        includeTranscript: true,
        categories: [
          { id: 'support', name: 'Support', emoji: '📩' },
          { id: 'billing', name: 'Billing', emoji: '💳' },
        ],
      };

      const spec = getTicketsSpec(config);

      expect(spec.events).toBe(ticketsEventHandlers);
      expect(spec.commands).toBe(ticketsCommands);
      expect(spec.state!.tables).toBe(ticketsTables);
    });

    it('should not include canvas property', () => {
      const spec = getTicketsSpec();
      expect(spec.canvas).toBeUndefined();
    });
  });
});
