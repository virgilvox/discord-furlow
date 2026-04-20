import { describe, it, expect } from 'vitest';
import {
  FURLOW_ACTIONS,
  FURLOW_EVENTS,
  FURLOW_BUILTINS,
  validateSpec,
  scaffoldBot,
  createServer,
} from '../index.js';

describe('@furlow/mcp', () => {
  it('exposes 85 canonical actions', () => {
    expect(FURLOW_ACTIONS).toHaveLength(85);
    // Unique
    expect(new Set(FURLOW_ACTIONS).size).toBe(FURLOW_ACTIONS.length);
  });

  it('exposes canonical events including runtime-emitted ones', () => {
    expect(FURLOW_EVENTS).toContain('member_join');
    expect(FURLOW_EVENTS).toContain('voice_track_start');
    expect(FURLOW_EVENTS).toContain('scheduler_tick');
    expect(FURLOW_EVENTS).not.toContain('guild_member_add'); // not canonical
  });

  it('exposes 14 builtins with descriptions', () => {
    expect(FURLOW_BUILTINS).toHaveLength(14);
    for (const b of FURLOW_BUILTINS) {
      expect(b.name).toMatch(/^[a-z-]+$/);
      expect(b.description.length).toBeGreaterThan(0);
    }
  });

  describe('validateSpec', () => {
    it('accepts a minimal valid spec (normalized action form)', () => {
      const body = `
version: "0.1"
identity:
  name: smoke
commands:
  - name: ping
    description: Ping
    actions:
      - action: reply
        content: "Pong"
`;
      const result = validateSpec(body);
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('reports YAML parse errors', () => {
      const result = validateSpec(':\n- invalid yaml: [[[');
      expect(result.valid).toBe(false);
      expect(result.errors[0]?.path).toBe('<yaml>');
    });
  });

  describe('scaffoldBot', () => {
    it('emits a valid spec for a bare bot', () => {
      const yaml = scaffoldBot({ name: 'test bot' });
      const result = validateSpec(yaml);
      expect(result.valid).toBe(true);
    });

    it('includes requested builtins', () => {
      const yaml = scaffoldBot({ name: 'mod bot', builtins: ['moderation', 'welcome'] });
      expect(yaml).toContain('- module: moderation');
      expect(yaml).toContain('- module: welcome');
      const result = validateSpec(yaml);
      expect(result.valid).toBe(true);
    });
  });

  describe('createServer', () => {
    it('returns a server instance with tools registered', () => {
      const server = createServer();
      // Server is opaque from the SDK's public API; we just verify it
      // constructs without throwing. Full protocol smoke tests would
      // require an in-memory transport pair.
      expect(server).toBeDefined();
    });
  });
});
