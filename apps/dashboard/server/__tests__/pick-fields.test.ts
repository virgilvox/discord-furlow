/**
 * Tests for the `pickFields` settings validator. It sits between
 * authenticated POSTs and the storage adapter, so regressions here are
 * how a compromised client bends the stored shape. The contract:
 *
 *   - Unknown keys are dropped silently.
 *   - Known keys with wrong types reject the whole body (null return).
 *   - `null` is accepted for any known key (nullable by design —
 *     settings like `welcome.channel` are genuinely optional).
 *   - `__proto__`, `constructor`, `prototype` anywhere in the payload
 *     cause a rejection, so downstream Object.assign / spread can't ever
 *     touch the prototype chain.
 *   - Non-object bodies (arrays, strings, null, numbers) reject.
 */

import { describe, it, expect } from 'vitest';
import { pickFields } from '../routes/api.js';

describe('pickFields', () => {
  it('keeps only known keys with matching types', () => {
    const out = pickFields(
      { prefix: '!', language: 'en', extra: 'nope' },
      { prefix: 'string', language: 'string' }
    );
    expect(out).toEqual({ prefix: '!', language: 'en' });
  });

  it('rejects the whole body when a known key has the wrong type', () => {
    expect(
      pickFields({ prefix: 42 }, { prefix: 'string' })
    ).toBeNull();
  });

  it('accepts null for known keys', () => {
    const out = pickFields(
      { channel: null, enabled: true },
      { channel: 'string', enabled: 'boolean' }
    );
    expect(out).toEqual({ channel: null, enabled: true });
  });

  it('distinguishes arrays from objects', () => {
    expect(
      pickFields({ roles: [] }, { roles: 'array' })
    ).toEqual({ roles: [] });
    expect(
      pickFields({ roles: {} }, { roles: 'array' })
    ).toBeNull();
    expect(
      pickFields({ modules: [] }, { modules: 'object' })
    ).toBeNull();
  });

  it('rejects non-object bodies', () => {
    expect(pickFields(null, { a: 'string' })).toBeNull();
    expect(pickFields(undefined, { a: 'string' })).toBeNull();
    expect(pickFields('hello', { a: 'string' })).toBeNull();
    expect(pickFields(42, { a: 'string' })).toBeNull();
    expect(pickFields([], { a: 'string' })).toBeNull();
  });

  it('rejects payloads with __proto__ at the top level', () => {
    const raw = JSON.parse('{"prefix":"!","__proto__":{"admin":true}}');
    expect(
      pickFields(raw, { prefix: 'string' })
    ).toBeNull();
  });

  it('rejects payloads with __proto__ inside a nested object', () => {
    const raw = JSON.parse(
      '{"modules":{"moderation":{"__proto__":{"admin":true}}}}'
    );
    expect(
      pickFields(raw, { modules: 'object' })
    ).toBeNull();
  });

  it('rejects payloads with constructor or prototype keys', () => {
    expect(
      pickFields(
        JSON.parse('{"modules":{"constructor":{}}}'),
        { modules: 'object' }
      )
    ).toBeNull();
    expect(
      pickFields(
        JSON.parse('{"modules":{"prototype":{}}}'),
        { modules: 'object' }
      )
    ).toBeNull();
  });

  it('rejects pathologically deep payloads', () => {
    let deep: Record<string, unknown> = {};
    const root = { modules: deep };
    for (let i = 0; i < 20; i++) {
      const next = {};
      deep.child = next;
      deep = next as Record<string, unknown>;
    }
    expect(pickFields(root, { modules: 'object' })).toBeNull();
  });
});
