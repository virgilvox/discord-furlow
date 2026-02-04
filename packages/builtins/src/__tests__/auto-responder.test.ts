/**
 * Auto-Responder builtin module tests
 */

import { describe, it, expect } from 'vitest';
import {
  autoResponderTables,
  autoResponderEventHandlers,
  autoResponderCommands,
  getAutoResponderSpec,
  type AutoResponderConfig,
} from '../auto-responder/index.js';

describe('Auto-Responder Builtin', () => {
  describe('Exports', () => {
    it('should export autoResponderTables object', () => {
      expect(autoResponderTables).toBeDefined();
      expect(typeof autoResponderTables).toBe('object');
    });

    it('should export autoResponderEventHandlers array', () => {
      expect(autoResponderEventHandlers).toBeDefined();
      expect(Array.isArray(autoResponderEventHandlers)).toBe(true);
    });

    it('should export autoResponderCommands array', () => {
      expect(autoResponderCommands).toBeDefined();
      expect(Array.isArray(autoResponderCommands)).toBe(true);
    });

    it('should export getAutoResponderSpec function', () => {
      expect(getAutoResponderSpec).toBeDefined();
      expect(typeof getAutoResponderSpec).toBe('function');
    });
  });

  describe('Tables', () => {
    it('should define auto_responses table', () => {
      expect(autoResponderTables.auto_responses).toBeDefined();
    });

    it('should define auto_response_cooldowns table', () => {
      expect(autoResponderTables.auto_response_cooldowns).toBeDefined();
    });

    describe('auto_responses table', () => {
      const cols = autoResponderTables.auto_responses.columns;

      it('should have required columns', () => {
        expect(cols.id.primary).toBe(true);
        expect(cols.guild_id.index).toBe(true);
        expect(cols.trigger).toBeDefined();
        expect(cols.trigger_type.default).toBe('contains');
        expect(cols.response).toBeDefined();
        expect(cols.response_type.default).toBe('message');
        expect(cols.embed_data.type).toBe('json');
        expect(cols.reaction).toBeDefined();
        expect(cols.chance.default).toBe(100);
        expect(cols.cooldown.default).toBe(0);
        expect(cols.ignore_case.default).toBe(true);
        expect(cols.delete_trigger.default).toBe(false);
        expect(cols.dm_response.default).toBe(false);
      });

      it('should have channel and role restriction columns', () => {
        expect(cols.allowed_channels.type).toBe('json');
        expect(cols.ignored_channels.type).toBe('json');
        expect(cols.allowed_roles.type).toBe('json');
        expect(cols.ignored_roles.type).toBe('json');
      });
    });

    describe('auto_response_cooldowns table', () => {
      const cols = autoResponderTables.auto_response_cooldowns.columns;

      it('should have required columns', () => {
        expect(cols.id.primary).toBe(true);
        expect(cols.response_id.index).toBe(true);
        expect(cols.guild_id).toBeDefined();
        expect(cols.last_triggered.type).toBe('timestamp');
      });
    });
  });

  describe('Event Handlers', () => {
    it('should have message event handler', () => {
      const handler = autoResponderEventHandlers.find((h) => h.event === 'message');
      expect(handler).toBeDefined();
    });

    describe('message handler', () => {
      const handler = autoResponderEventHandlers.find((h) => h.event === 'message')!;

      it('should check for bot ignore setting', () => {
        expect(handler.condition).toContain('ignoreBots');
      });

      it('should query triggers for guild', () => {
        const dbQuery = handler.actions.find(
          (a) =>
            a.action === 'db_query' &&
            (a as { table?: string }).table === 'auto_responses'
        );
        expect(dbQuery).toBeDefined();
      });

      it('should batch process triggers', () => {
        const batch = handler.actions.find((a) => a.action === 'batch');
        expect(batch).toBeDefined();
      });

      it('should support multiple trigger types', () => {
        const batch = handler.actions.find((a) => a.action === 'batch');
        const condition = (batch as { each?: { condition?: string } }).each?.condition;
        expect(condition).toContain('exact');
        expect(condition).toContain('contains');
        expect(condition).toContain('startswith');
        expect(condition).toContain('endswith');
        expect(condition).toContain('regex');
      });

      it('should support multiple response types', () => {
        const batch = handler.actions.find((a) => a.action === 'batch');
        const flowIf = (batch as { each?: { then?: unknown[] } }).each?.then?.find(
          (a: { action?: string }) => a.action === 'flow_switch'
        );
        const cases = (flowIf as { cases?: Record<string, unknown> })?.cases;
        expect(cases?.message).toBeDefined();
        expect(cases?.embed).toBeDefined();
        expect(cases?.reaction).toBeDefined();
      });
    });
  });

  describe('Commands', () => {
    it('should have autoresponder command with subcommands', () => {
      const cmd = autoResponderCommands.find((c) => c.name === 'autoresponder');
      expect(cmd).toBeDefined();
      expect(cmd!.subcommands).toBeDefined();
    });

    describe('autoresponder subcommands', () => {
      const cmd = autoResponderCommands.find((c) => c.name === 'autoresponder')!;

      it('should have add subcommand', () => {
        const add = cmd.subcommands!.find((s) => s.name === 'add');
        expect(add).toBeDefined();

        const triggerOpt = add!.options!.find((o) => o.name === 'trigger');
        expect(triggerOpt!.required).toBe(true);

        const responseOpt = add!.options!.find((o) => o.name === 'response');
        expect(responseOpt!.required).toBe(true);

        const typeOpt = add!.options!.find((o) => o.name === 'type');
        expect(typeOpt!.choices).toBeDefined();
        expect(typeOpt!.choices!.length).toBe(5);
      });

      it('should have list subcommand', () => {
        const list = cmd.subcommands!.find((s) => s.name === 'list');
        expect(list).toBeDefined();
      });

      it('should have delete subcommand', () => {
        const del = cmd.subcommands!.find((s) => s.name === 'delete');
        expect(del).toBeDefined();

        const idOpt = del!.options!.find((o) => o.name === 'id');
        expect(idOpt!.required).toBe(true);
        expect(idOpt!.type).toBe('integer');
      });

      it('should have edit subcommand', () => {
        const edit = cmd.subcommands!.find((s) => s.name === 'edit');
        expect(edit).toBeDefined();

        const idOpt = edit!.options!.find((o) => o.name === 'id');
        expect(idOpt!.required).toBe(true);

        const triggerOpt = edit!.options!.find((o) => o.name === 'trigger');
        expect(triggerOpt!.required).toBe(false);

        const cooldownOpt = edit!.options!.find((o) => o.name === 'cooldown');
        expect(cooldownOpt).toBeDefined();
      });
    });
  });

  describe('getAutoResponderSpec', () => {
    it('should return valid spec with default config', () => {
      const spec = getAutoResponderSpec();

      expect(spec.commands).toBe(autoResponderCommands);
      expect(spec.events).toBe(autoResponderEventHandlers);
      expect(spec.state!.tables).toBe(autoResponderTables);
    });

    it('should return valid spec with custom config', () => {
      const config: AutoResponderConfig = {
        maxTriggers: 100,
        ignoreBots: true,
        globalCooldown: 5,
      };

      const spec = getAutoResponderSpec(config);

      expect(spec.commands).toBe(autoResponderCommands);
      expect(spec.events).toBe(autoResponderEventHandlers);
    });
  });
});
