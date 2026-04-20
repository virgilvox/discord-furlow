/**
 * Tests for M4 state TTL. Verifies that per-call TTL on `StateManager.set`
 * overrides any declared variable-level TTL and that expired values become
 * invisible to reads.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { StateManager } from '../manager.js';
import { MemoryAdapter } from '@furlow/storage';

describe('StateManager TTL (M4)', () => {
  let storage: MemoryAdapter;
  let manager: StateManager;

  beforeEach(() => {
    storage = new MemoryAdapter();
    manager = new StateManager(storage);
    // Register without defaults so an expired read returns undefined,
    // not the variable's default value.
    manager.registerVariables({
      counter: { scope: 'global', type: 'number' } as never,
      cooldown: { scope: 'user', type: 'string' } as never,
    });
  });

  it('writes with no TTL when none is declared or passed', async () => {
    await manager.set('counter', 1, {});
    expect(await manager.get('counter', {})).toBe(1);
  });

  it('accepts TTL as a duration string ("100ms")', async () => {
    await manager.set('cooldown', 'hot', { userId: 'u1' }, { ttl: '100ms' });
    expect(await manager.get('cooldown', { userId: 'u1' })).toBe('hot');

    await new Promise((r) => setTimeout(r, 150));
    expect(await manager.get('cooldown', { userId: 'u1' })).toBe(undefined);
  });

  it('accepts TTL as raw milliseconds', async () => {
    await manager.set('cooldown', 'raw', { userId: 'u2' }, { ttl: 50 });
    expect(await manager.get('cooldown', { userId: 'u2' })).toBe('raw');

    await new Promise((r) => setTimeout(r, 100));
    expect(await manager.get('cooldown', { userId: 'u2' })).toBe(undefined);
  });

  it('overrides variable-level TTL when per-call TTL is provided', async () => {
    // Variable decl says 1 day TTL, per-call overrides to 50 ms.
    manager.registerVariables({
      longlived: { scope: 'global', type: 'string', ttl: '1d' } as never,
    });
    await manager.set('longlived', 'oops', {}, { ttl: 50 });

    await new Promise((r) => setTimeout(r, 120));
    expect(await manager.get('longlived', {})).toBe(undefined);
  });

  it('respects variable-level TTL when no per-call TTL is given', async () => {
    manager.registerVariables({
      short: { scope: 'global', type: 'string', ttl: '50ms' } as never,
    });
    await manager.set('short', 'bye', {});
    await new Promise((r) => setTimeout(r, 120));
    expect(await manager.get('short', {})).toBe(undefined);
  });

  it('treats TTL of 0 as "no expiration"', async () => {
    await manager.set('counter', 42, {}, { ttl: 0 });
    expect(await manager.get('counter', {})).toBe(42);
  });
});
