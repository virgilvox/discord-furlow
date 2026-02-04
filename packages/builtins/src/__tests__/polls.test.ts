/**
 * Polls builtin module tests
 */

import { describe, it, expect } from 'vitest';
import {
  pollsTables,
  pollsEventHandlers,
  pollsCommands,
  getPollsSpec,
  type PollsConfig,
} from '../polls/index.js';

describe('Polls Builtin', () => {
  describe('Exports', () => {
    it('should export pollsTables object', () => {
      expect(pollsTables).toBeDefined();
      expect(typeof pollsTables).toBe('object');
    });

    it('should export pollsEventHandlers array', () => {
      expect(pollsEventHandlers).toBeDefined();
      expect(Array.isArray(pollsEventHandlers)).toBe(true);
    });

    it('should export pollsCommands array', () => {
      expect(pollsCommands).toBeDefined();
      expect(Array.isArray(pollsCommands)).toBe(true);
    });

    it('should export getPollsSpec function', () => {
      expect(getPollsSpec).toBeDefined();
      expect(typeof getPollsSpec).toBe('function');
    });
  });

  describe('Tables', () => {
    it('should define polls table', () => {
      expect(pollsTables.polls).toBeDefined();
    });

    it('should define poll_votes table', () => {
      expect(pollsTables.poll_votes).toBeDefined();
    });

    describe('polls table', () => {
      const cols = pollsTables.polls.columns;

      it('should have required columns', () => {
        expect(cols.id.primary).toBe(true);
        expect(cols.guild_id.index).toBe(true);
        expect(cols.message_id.unique).toBe(true);
        expect(cols.question).toBeDefined();
        expect(cols.options.type).toBe('json');
        expect(cols.multiple_choice.type).toBe('boolean');
        expect(cols.anonymous.type).toBe('boolean');
        expect(cols.ends_at.type).toBe('timestamp');
        expect(cols.ended.default).toBe(false);
      });
    });

    describe('poll_votes table', () => {
      const cols = pollsTables.poll_votes.columns;

      it('should have required columns', () => {
        expect(cols.id.primary).toBe(true);
        expect(cols.poll_id.index).toBe(true);
        expect(cols.user_id).toBeDefined();
        expect(cols.option_index.type).toBe('number');
      });
    });
  });

  describe('Event Handlers', () => {
    it('should handle vote button click', () => {
      const handler = pollsEventHandlers.find(
        (h) =>
          h.event === 'button_click' &&
          h.condition?.includes('poll_vote_')
      );
      expect(handler).toBeDefined();
    });

    it('should handle scheduler_tick for poll end', () => {
      const handler = pollsEventHandlers.find((h) => h.event === 'scheduler_tick');
      expect(handler).toBeDefined();
    });

    it('should handle poll_end event', () => {
      const handler = pollsEventHandlers.find((h) => h.event === 'poll_end');
      expect(handler).toBeDefined();
    });

    describe('vote handler', () => {
      const handler = pollsEventHandlers.find(
        (h) =>
          h.event === 'button_click' &&
          h.condition?.includes('poll_vote_')
      )!;

      it('should check if poll has ended', () => {
        const endCheck = handler.actions.find(
          (a) =>
            a.action === 'flow_if' &&
            (a as { condition?: string }).condition?.includes('ended')
        );
        expect(endCheck).toBeDefined();
      });

      it('should handle multiple choice logic', () => {
        const multipleCheck = handler.actions.find(
          (a) =>
            a.action === 'flow_if' &&
            (a as { condition?: string }).condition?.includes('multiple_choice')
        );
        expect(multipleCheck).toBeDefined();
      });
    });
  });

  describe('Commands', () => {
    it('should have poll command', () => {
      const cmd = pollsCommands.find((c) => c.name === 'poll');
      expect(cmd).toBeDefined();
    });

    it('should have endpoll command', () => {
      const cmd = pollsCommands.find((c) => c.name === 'endpoll');
      expect(cmd).toBeDefined();
    });

    describe('poll command', () => {
      const cmd = pollsCommands.find((c) => c.name === 'poll')!;

      it('should have required options', () => {
        const questionOpt = cmd.options!.find((o) => o.name === 'question');
        expect(questionOpt!.required).toBe(true);

        const optionsOpt = cmd.options!.find((o) => o.name === 'options');
        expect(optionsOpt!.required).toBe(true);

        const durationOpt = cmd.options!.find((o) => o.name === 'duration');
        expect(durationOpt!.required).toBe(false);

        const multipleOpt = cmd.options!.find((o) => o.name === 'multiple');
        expect(multipleOpt!.type).toBe('boolean');
      });

      it('should validate minimum options', () => {
        const minCheck = cmd.actions.find(
          (a) =>
            a.action === 'flow_if' &&
            (a as { condition?: string }).condition?.includes('length < 2')
        );
        expect(minCheck).toBeDefined();
      });

      it('should validate maximum options', () => {
        const maxCheck = cmd.actions.find(
          (a) =>
            a.action === 'flow_if' &&
            (a as { condition?: string }).condition?.includes('maxOptions')
        );
        expect(maxCheck).toBeDefined();
      });
    });

    describe('endpoll command', () => {
      const cmd = pollsCommands.find((c) => c.name === 'endpoll')!;

      it('should require message_id', () => {
        const msgOpt = cmd.options!.find((o) => o.name === 'message_id');
        expect(msgOpt!.required).toBe(true);
      });

      it('should check permissions', () => {
        const permCheck = cmd.actions.find(
          (a) =>
            a.action === 'flow_if' &&
            (a as { condition?: string }).condition?.includes('creator_id')
        );
        expect(permCheck).toBeDefined();
      });
    });
  });

  describe('getPollsSpec', () => {
    it('should return valid spec with default config', () => {
      const spec = getPollsSpec();

      expect(spec.commands).toBe(pollsCommands);
      expect(spec.events).toBe(pollsEventHandlers);
      expect(spec.state!.tables).toBe(pollsTables);
    });

    it('should return valid spec with custom config', () => {
      const config: PollsConfig = {
        maxOptions: 5,
        defaultDuration: '1d',
        allowAnonymous: true,
      };

      const spec = getPollsSpec(config);

      expect(spec.commands).toBe(pollsCommands);
      expect(spec.events).toBe(pollsEventHandlers);
    });
  });
});
