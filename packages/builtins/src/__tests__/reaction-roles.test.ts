/**
 * Reaction Roles builtin module tests
 */

import { describe, it, expect } from 'vitest';
import {
  reactionRolesTables,
  reactionRolesEventHandlers,
  reactionRolesCommands,
  getReactionRolesSpec,
  type ReactionRolesConfig,
} from '../reaction-roles/index.js';

// Helper to safely check if condition includes a substring
const conditionIncludes = (condition: unknown, str: string): boolean => {
  return typeof condition === 'string' && condition.includes(str);
};

describe('Reaction Roles Builtin', () => {
  describe('Exports', () => {
    it('should export reactionRolesTables object', () => {
      expect(reactionRolesTables).toBeDefined();
      expect(typeof reactionRolesTables).toBe('object');
    });

    it('should export reactionRolesEventHandlers array', () => {
      expect(reactionRolesEventHandlers).toBeDefined();
      expect(Array.isArray(reactionRolesEventHandlers)).toBe(true);
    });

    it('should export reactionRolesCommands array', () => {
      expect(reactionRolesCommands).toBeDefined();
      expect(Array.isArray(reactionRolesCommands)).toBe(true);
    });

    it('should export getReactionRolesSpec function', () => {
      expect(getReactionRolesSpec).toBeDefined();
      expect(typeof getReactionRolesSpec).toBe('function');
    });
  });

  describe('Tables', () => {
    it('should define reaction_role_panels table', () => {
      expect(reactionRolesTables.reaction_role_panels).toBeDefined();
      expect(reactionRolesTables.reaction_role_panels.columns).toBeDefined();
    });

    it('should define reaction_role_entries table', () => {
      expect(reactionRolesTables.reaction_role_entries).toBeDefined();
      expect(reactionRolesTables.reaction_role_entries.columns).toBeDefined();
    });

    describe('reaction_role_panels table', () => {
      const cols = reactionRolesTables.reaction_role_panels.columns;

      it('should have primary key id', () => {
        expect(cols.id).toBeDefined();
        expect(cols.id.type).toBe('number');
        expect(cols.id.primary).toBe(true);
      });

      it('should have guild_id with index', () => {
        expect(cols.guild_id).toBeDefined();
        expect(cols.guild_id.index).toBe(true);
      });

      it('should have channel_id', () => {
        expect(cols.channel_id).toBeDefined();
      });

      it('should have message_id with unique constraint', () => {
        expect(cols.message_id).toBeDefined();
        expect(cols.message_id.unique).toBe(true);
      });

      it('should have type column', () => {
        expect(cols.type).toBeDefined();
        expect(cols.type.type).toBe('string');
      });

      it('should have mode column with default', () => {
        expect(cols.mode).toBeDefined();
        expect(cols.mode.default).toBe('toggle');
      });

      it('should have max_roles and created_at columns', () => {
        expect(cols.max_roles).toBeDefined();
        expect(cols.created_at).toBeDefined();
      });
    });

    describe('reaction_role_entries table', () => {
      const cols = reactionRolesTables.reaction_role_entries.columns;

      it('should have primary key id', () => {
        expect(cols.id).toBeDefined();
        expect(cols.id.primary).toBe(true);
      });

      it('should have panel_id with index', () => {
        expect(cols.panel_id).toBeDefined();
        expect(cols.panel_id.index).toBe(true);
      });

      it('should have role_id, emoji, label, description, style columns', () => {
        expect(cols.role_id).toBeDefined();
        expect(cols.emoji).toBeDefined();
        expect(cols.label).toBeDefined();
        expect(cols.description).toBeDefined();
        expect(cols.style).toBeDefined();
      });
    });
  });

  describe('Event Handlers', () => {
    it('should handle button clicks starting with rr_', () => {
      const handler = reactionRolesEventHandlers.find(
        (h) =>
          h.event === 'button_click' &&
          conditionIncludes(h.condition, 'startsWith("rr_")')
      );
      expect(handler).toBeDefined();
    });

    it('should handle select menu starting with rr_select_', () => {
      const handler = reactionRolesEventHandlers.find(
        (h) =>
          h.event === 'select_menu' &&
          conditionIncludes(h.condition, 'rr_select_')
      );
      expect(handler).toBeDefined();
    });

    it('should handle reaction_add event', () => {
      const handler = reactionRolesEventHandlers.find((h) => h.event === 'reaction_add');
      expect(handler).toBeDefined();
    });

    it('should handle reaction_remove event', () => {
      const handler = reactionRolesEventHandlers.find((h) => h.event === 'reaction_remove');
      expect(handler).toBeDefined();
    });

    describe('button click handler', () => {
      const handler = reactionRolesEventHandlers.find(
        (h) =>
          h.event === 'button_click' &&
          conditionIncludes(h.condition, 'startsWith("rr_")')
      )!;

      it('should support toggle mode', () => {
        const switchAction = handler.actions.find((a) => a.action === 'flow_switch');
        expect(switchAction).toBeDefined();
        expect((switchAction as { cases?: Record<string, unknown> }).cases?.toggle).toBeDefined();
      });

      it('should support give mode', () => {
        const switchAction = handler.actions.find((a) => a.action === 'flow_switch');
        expect((switchAction as { cases?: Record<string, unknown> }).cases?.give).toBeDefined();
      });

      it('should support take mode', () => {
        const switchAction = handler.actions.find((a) => a.action === 'flow_switch');
        expect((switchAction as { cases?: Record<string, unknown> }).cases?.take).toBeDefined();
      });

      it('should support unique mode', () => {
        const switchAction = handler.actions.find((a) => a.action === 'flow_switch');
        expect((switchAction as { cases?: Record<string, unknown> }).cases?.unique).toBeDefined();
      });

      it('should log role changes if configured', () => {
        const logCheck = handler.actions.find(
          (a) =>
            a.action === 'flow_if' &&
            (a as { condition?: string }).condition?.includes('logChannel')
        );
        expect(logCheck).toBeDefined();
      });
    });

    describe('select menu handler', () => {
      const handler = reactionRolesEventHandlers.find(
        (h) =>
          h.event === 'select_menu' &&
          conditionIncludes(h.condition, 'rr_select_')
      )!;

      it('should batch remove unselected roles', () => {
        const batchRemove = handler.actions.find(
          (a) =>
            a.action === 'batch' &&
            (a as { each?: { action?: string } }).each?.action === 'remove_role'
        );
        expect(batchRemove).toBeDefined();
      });

      it('should batch add selected roles', () => {
        const batchAdd = handler.actions.find(
          (a) =>
            a.action === 'batch' &&
            (a as { each?: { action?: string } }).each?.action === 'assign_role'
        );
        expect(batchAdd).toBeDefined();
      });
    });
  });

  describe('Commands', () => {
    it('should have reactionroles command with subcommands', () => {
      const cmd = reactionRolesCommands.find((c) => c.name === 'reactionroles');
      expect(cmd).toBeDefined();
      expect(cmd!.subcommands).toBeDefined();
    });

    describe('reactionroles command subcommands', () => {
      const cmd = reactionRolesCommands.find((c) => c.name === 'reactionroles')!;

      it('should have create-button subcommand', () => {
        const createBtn = cmd.subcommands!.find((s) => s.name === 'create-button');
        expect(createBtn).toBeDefined();

        const titleOpt = createBtn!.options!.find((o) => o.name === 'title');
        expect(titleOpt).toBeDefined();

        const modeOpt = createBtn!.options!.find((o) => o.name === 'mode');
        expect(modeOpt).toBeDefined();
        expect(modeOpt!.choices).toBeDefined();
        expect(modeOpt!.choices!.length).toBe(4);
      });

      it('should have add-button subcommand', () => {
        const addBtn = cmd.subcommands!.find((s) => s.name === 'add-button');
        expect(addBtn).toBeDefined();

        const messageIdOpt = addBtn!.options!.find((o) => o.name === 'message_id');
        expect(messageIdOpt).toBeDefined();
        expect(messageIdOpt!.required).toBe(true);

        const roleOpt = addBtn!.options!.find((o) => o.name === 'role');
        expect(roleOpt).toBeDefined();
        expect(roleOpt!.type).toBe('role');
        expect(roleOpt!.required).toBe(true);

        const styleOpt = addBtn!.options!.find((o) => o.name === 'style');
        expect(styleOpt).toBeDefined();
        expect(styleOpt!.choices).toBeDefined();
      });

      it('should have create-select subcommand', () => {
        const createSelect = cmd.subcommands!.find((s) => s.name === 'create-select');
        expect(createSelect).toBeDefined();

        const maxRolesOpt = createSelect!.options!.find((o) => o.name === 'max_roles');
        expect(maxRolesOpt).toBeDefined();
        expect(maxRolesOpt!.type).toBe('integer');
      });

      it('should have add-option subcommand', () => {
        const addOption = cmd.subcommands!.find((s) => s.name === 'add-option');
        expect(addOption).toBeDefined();

        const messageIdOpt = addOption!.options!.find((o) => o.name === 'message_id');
        expect(messageIdOpt!.required).toBe(true);

        const roleOpt = addOption!.options!.find((o) => o.name === 'role');
        expect(roleOpt!.required).toBe(true);

        const descOpt = addOption!.options!.find((o) => o.name === 'description');
        expect(descOpt).toBeDefined();
      });

      it('should have delete subcommand', () => {
        const deleteCmd = cmd.subcommands!.find((s) => s.name === 'delete');
        expect(deleteCmd).toBeDefined();

        const dbDeleteActions = deleteCmd!.actions.filter((a) => a.action === 'db_delete');
        expect(dbDeleteActions.length).toBeGreaterThanOrEqual(1);

        const deleteMessageAction = deleteCmd!.actions.find((a) => a.action === 'delete_message');
        expect(deleteMessageAction).toBeDefined();
      });
    });
  });

  describe('getReactionRolesSpec', () => {
    it('should return valid spec with default config', () => {
      const spec = getReactionRolesSpec();

      expect(spec.events).toBeDefined();
      expect(spec.events).toBe(reactionRolesEventHandlers);

      expect(spec.commands).toBeDefined();
      expect(spec.commands).toBe(reactionRolesCommands);

      expect(spec.state).toBeDefined();
      expect(spec.state!.tables).toBe(reactionRolesTables);
    });

    it('should return valid spec with custom config', () => {
      const config: ReactionRolesConfig = {
        maxRolesPerPanel: 10,
        logChannel: '123456789',
      };

      const spec = getReactionRolesSpec(config);

      expect(spec.events).toBe(reactionRolesEventHandlers);
      expect(spec.commands).toBe(reactionRolesCommands);
      expect(spec.state!.tables).toBe(reactionRolesTables);
    });

    it('should not include canvas property', () => {
      const spec = getReactionRolesSpec();
      expect(spec.canvas).toBeUndefined();
    });
  });
});
