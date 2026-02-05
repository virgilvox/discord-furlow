/**
 * State manager tests - using real MemoryAdapter for behavioral testing
 *
 * These tests verify actual state management behavior:
 * - Scope isolation (guild vs user vs channel vs member)
 * - Concurrent write safety
 * - TTL expiration
 * - Default value handling
 * - Table operations with real data
 * - Cache eviction behavior
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { StateManager, createStateManager } from '../manager.js';
import { MemoryAdapter } from '@furlow/storage';
import type { VariableDefinition, TableDefinition } from '@furlow/schema';

describe('StateManager with Real MemoryAdapter', () => {
  let storage: MemoryAdapter;
  let manager: StateManager;

  beforeEach(() => {
    storage = new MemoryAdapter();
    manager = createStateManager(storage);
  });

  afterEach(async () => {
    await manager.close();
  });

  describe('Variable Scope Isolation', () => {
    beforeEach(() => {
      manager.registerVariables({
        guildVar: { type: 'string', scope: 'guild' },
        userVar: { type: 'string', scope: 'user' },
        channelVar: { type: 'string', scope: 'channel' },
        memberVar: { type: 'string', scope: 'member' },
        globalVar: { type: 'string', scope: 'global' },
      });
    });

    it('should isolate guild-scoped variables between different guilds', async () => {
      const guild1 = { guildId: 'guild-1' };
      const guild2 = { guildId: 'guild-2' };

      await manager.set('guildVar', 'guild1-value', guild1);
      await manager.set('guildVar', 'guild2-value', guild2);

      expect(await manager.get('guildVar', guild1)).toBe('guild1-value');
      expect(await manager.get('guildVar', guild2)).toBe('guild2-value');
    });

    it('should isolate user-scoped variables between different users', async () => {
      const user1 = { userId: 'user-1' };
      const user2 = { userId: 'user-2' };

      await manager.set('userVar', 'preference-A', user1);
      await manager.set('userVar', 'preference-B', user2);

      expect(await manager.get('userVar', user1)).toBe('preference-A');
      expect(await manager.get('userVar', user2)).toBe('preference-B');
    });

    it('should isolate channel-scoped variables between different channels', async () => {
      const channel1 = { channelId: 'channel-1' };
      const channel2 = { channelId: 'channel-2' };

      await manager.set('channelVar', 'setting-X', channel1);
      await manager.set('channelVar', 'setting-Y', channel2);

      expect(await manager.get('channelVar', channel1)).toBe('setting-X');
      expect(await manager.get('channelVar', channel2)).toBe('setting-Y');
    });

    it('should isolate member-scoped variables by guild+user combination', async () => {
      const member1 = { guildId: 'guild-1', userId: 'user-1' };
      const member2 = { guildId: 'guild-1', userId: 'user-2' };
      const member3 = { guildId: 'guild-2', userId: 'user-1' }; // Same user, different guild

      await manager.set('memberVar', 'score-100', member1);
      await manager.set('memberVar', 'score-200', member2);
      await manager.set('memberVar', 'score-50', member3);

      expect(await manager.get('memberVar', member1)).toBe('score-100');
      expect(await manager.get('memberVar', member2)).toBe('score-200');
      expect(await manager.get('memberVar', member3)).toBe('score-50');
    });

    it('should share global-scoped variables across all contexts', async () => {
      await manager.set('globalVar', 'shared-value', {});

      // Can access from any context
      expect(await manager.get('globalVar', {})).toBe('shared-value');
      expect(await manager.get('globalVar', { guildId: 'any-guild' })).toBe('shared-value');
      expect(await manager.get('globalVar', { userId: 'any-user' })).toBe('shared-value');
    });
  });

  describe('Scope Context Validation', () => {
    beforeEach(() => {
      manager.registerVariables({
        guildVar: { type: 'string', scope: 'guild' },
        memberVar: { type: 'string', scope: 'member' },
      });
    });

    it('should throw when accessing guild-scoped variable without guildId', async () => {
      await expect(manager.get('guildVar', {})).rejects.toThrow();
      await expect(manager.get('guildVar', { userId: 'user-1' })).rejects.toThrow();
    });

    it('should throw when accessing member-scoped variable without both guildId and userId', async () => {
      await expect(manager.get('memberVar', {})).rejects.toThrow();
      await expect(manager.get('memberVar', { guildId: 'guild-1' })).rejects.toThrow();
      await expect(manager.get('memberVar', { userId: 'user-1' })).rejects.toThrow();
    });

    it('should succeed when correct context is provided', async () => {
      await manager.set('guildVar', 'value', { guildId: 'guild-1' });
      expect(await manager.get('guildVar', { guildId: 'guild-1' })).toBe('value');
    });
  });

  describe('Default Values', () => {
    it('should return default value when variable is not set', async () => {
      manager.registerVariables({
        counter: { type: 'number', scope: 'guild', default: 0 },
        enabled: { type: 'boolean', scope: 'guild', default: true },
        message: { type: 'string', scope: 'guild', default: 'Hello' },
      });

      const ctx = { guildId: 'guild-1' };

      expect(await manager.get('counter', ctx)).toBe(0);
      expect(await manager.get('enabled', ctx)).toBe(true);
      expect(await manager.get('message', ctx)).toBe('Hello');
    });

    it('should return undefined when no default is set and value not stored', async () => {
      manager.registerVariables({
        noDefault: { type: 'string', scope: 'guild' },
      });

      const ctx = { guildId: 'guild-1' };
      expect(await manager.get('noDefault', ctx)).toBeUndefined();
    });

    it('should return stored value even when default exists', async () => {
      manager.registerVariables({
        counter: { type: 'number', scope: 'guild', default: 0 },
      });

      const ctx = { guildId: 'guild-1' };
      await manager.set('counter', 42, ctx);

      expect(await manager.get('counter', ctx)).toBe(42);
    });

    it('should return default after value is deleted', async () => {
      manager.registerVariables({
        counter: { type: 'number', scope: 'guild', default: 0 },
      });

      const ctx = { guildId: 'guild-1' };
      await manager.set('counter', 42, ctx);
      await manager.delete('counter', ctx);

      expect(await manager.get('counter', ctx)).toBe(0);
    });
  });

  describe('TTL Expiration', () => {
    it('should expire values after TTL when cache is cleared', async () => {
      // Use real timers with short TTL values for actual expiration testing
      manager.registerVariables({
        tempVar: { type: 'string', scope: 'guild', ttl: 50 }, // 50ms TTL
      });

      const ctx = { guildId: 'guild-1' };
      await manager.set('tempVar', 'temporary', ctx);

      // Value exists immediately
      expect(await manager.get('tempVar', ctx)).toBe('temporary');

      // Wait for TTL to expire
      await new Promise(resolve => setTimeout(resolve, 60));

      // Clear cache to force storage lookup (cache has its own TTL)
      manager.cacheClear();

      // Value should be expired in storage
      expect(await manager.get('tempVar', ctx)).toBeUndefined();
    });

    it('should parse string duration TTLs', async () => {
      manager.registerVariables({
        shortVar: { type: 'string', scope: 'guild', ttl: '100ms' }, // Use milliseconds for quick test
      });

      const ctx = { guildId: 'guild-1' };
      await manager.set('shortVar', 'value', ctx);

      // Value exists immediately
      expect(await manager.get('shortVar', ctx)).toBe('value');

      // Wait for TTL to expire
      await new Promise(resolve => setTimeout(resolve, 120));

      // Clear cache to force storage lookup
      manager.cacheClear();

      // Value should be expired in storage
      expect(await manager.get('shortVar', ctx)).toBeUndefined();
    });
  });

  describe('Increment and Decrement Operations', () => {
    beforeEach(() => {
      manager.registerVariables({
        counter: { type: 'number', scope: 'guild', default: 0 },
        noDefault: { type: 'string', scope: 'guild' },
      });
    });

    it('should increment from default value', async () => {
      const ctx = { guildId: 'guild-1' };

      const result = await manager.increment('counter', 5, ctx);
      expect(result).toBe(5);

      const value = await manager.get('counter', ctx);
      expect(value).toBe(5);
    });

    it('should increment from undefined (treated as 0)', async () => {
      const ctx = { guildId: 'guild-1' };

      const result = await manager.increment('noDefault', 1, ctx);
      expect(result).toBe(1);
    });

    it('should decrement correctly', async () => {
      const ctx = { guildId: 'guild-1' };

      await manager.set('counter', 10, ctx);
      const result = await manager.decrement('counter', 3, ctx);

      expect(result).toBe(7);
      expect(await manager.get('counter', ctx)).toBe(7);
    });

    it('should allow negative results', async () => {
      const ctx = { guildId: 'guild-1' };

      await manager.set('counter', 5, ctx);
      const result = await manager.decrement('counter', 10, ctx);

      expect(result).toBe(-5);
    });

    it('should handle concurrent increments safely', async () => {
      const ctx = { guildId: 'guild-1' };
      await manager.set('counter', 0, ctx);

      // Perform 10 concurrent increments of 1
      const increments = Array(10).fill(null).map(() =>
        manager.increment('counter', 1, ctx)
      );

      await Promise.all(increments);

      // All increments should be applied (no race conditions)
      const finalValue = await manager.get('counter', ctx);
      expect(finalValue).toBe(10);
    });
  });

  describe('Table Operations', () => {
    const usersTable: TableDefinition = {
      columns: {
        id: { type: 'string', primary: true },
        name: { type: 'string' },
        score: { type: 'number' },
        active: { type: 'boolean' },
      },
    };

    beforeEach(async () => {
      await manager.registerTables({ users: usersTable });
    });

    it('should insert and query rows', async () => {
      await manager.insert('users', { id: '1', name: 'Alice', score: 100, active: true });
      await manager.insert('users', { id: '2', name: 'Bob', score: 85, active: true });

      const rows = await manager.query('users');

      expect(rows).toHaveLength(2);
      expect(rows).toContainEqual({ id: '1', name: 'Alice', score: 100, active: true });
      expect(rows).toContainEqual({ id: '2', name: 'Bob', score: 85, active: true });
    });

    it('should query with where clause', async () => {
      await manager.insert('users', { id: '1', name: 'Alice', score: 100, active: true });
      await manager.insert('users', { id: '2', name: 'Bob', score: 85, active: false });
      await manager.insert('users', { id: '3', name: 'Charlie', score: 90, active: true });

      const activeUsers = await manager.query('users', { where: { active: true } });

      expect(activeUsers).toHaveLength(2);
      expect(activeUsers.map(u => u.name)).toContain('Alice');
      expect(activeUsers.map(u => u.name)).toContain('Charlie');
      expect(activeUsers.map(u => u.name)).not.toContain('Bob');
    });

    it('should query with select (projection)', async () => {
      await manager.insert('users', { id: '1', name: 'Alice', score: 100, active: true });

      const rows = await manager.query('users', { select: ['name', 'score'] });

      expect(rows[0]).toEqual({ name: 'Alice', score: 100 });
      expect(rows[0]).not.toHaveProperty('id');
      expect(rows[0]).not.toHaveProperty('active');
    });

    it('should query with limit and offset', async () => {
      for (let i = 1; i <= 10; i++) {
        await manager.insert('users', { id: String(i), name: `User${i}`, score: i * 10, active: true });
      }

      const page2 = await manager.query('users', { limit: 3, offset: 3 });

      expect(page2).toHaveLength(3);
    });

    it('should update rows matching where clause', async () => {
      await manager.insert('users', { id: '1', name: 'Alice', score: 100, active: true });
      await manager.insert('users', { id: '2', name: 'Bob', score: 85, active: true });

      const updatedCount = await manager.update('users', { id: '1' }, { score: 150 });

      expect(updatedCount).toBe(1);

      const rows = await manager.query('users', { where: { id: '1' } });
      expect(rows[0]?.score).toBe(150);
    });

    it('should delete rows matching where clause', async () => {
      await manager.insert('users', { id: '1', name: 'Alice', score: 100, active: true });
      await manager.insert('users', { id: '2', name: 'Bob', score: 85, active: true });

      const deletedCount = await manager.deleteRows('users', { id: '1' });

      expect(deletedCount).toBe(1);

      const rows = await manager.query('users');
      expect(rows).toHaveLength(1);
      expect(rows[0]?.id).toBe('2');
    });

    it('should throw for unknown table', async () => {
      await expect(manager.insert('nonexistent', { id: '1' }))
        .rejects.toThrow('Table not found: nonexistent');

      await expect(manager.query('nonexistent'))
        .rejects.toThrow('Table not found: nonexistent');
    });
  });

  describe('Cache Operations', () => {
    it('should cache and retrieve values synchronously', () => {
      manager.cacheSet('key1', 'value1');
      expect(manager.cacheGet('key1')).toBe('value1');
    });

    it('should return undefined for missing cache keys', () => {
      expect(manager.cacheGet('nonexistent')).toBeUndefined();
    });

    it('should delete cache entries', () => {
      manager.cacheSet('key1', 'value1');
      expect(manager.cacheGet('key1')).toBe('value1');

      const deleted = manager.cacheDelete('key1');
      expect(deleted).toBe(true);
      expect(manager.cacheGet('key1')).toBeUndefined();
    });

    it('should clear all cache entries', () => {
      manager.cacheSet('key1', 'value1');
      manager.cacheSet('key2', 'value2');

      manager.cacheClear();

      expect(manager.cacheGet('key1')).toBeUndefined();
      expect(manager.cacheGet('key2')).toBeUndefined();
    });

    it('should expire cache entries after TTL', () => {
      vi.useFakeTimers();
      try {
        manager.cacheSet('shortLived', 'value', 100); // 100ms TTL

        expect(manager.cacheGet('shortLived')).toBe('value');

        vi.advanceTimersByTime(150);

        expect(manager.cacheGet('shortLived')).toBeUndefined();
      } finally {
        vi.useRealTimers();
      }
    });

    it('should evict oldest entries when cache is full (LRU)', () => {
      const smallCacheManager = createStateManager(storage, {
        maxCacheSize: 3,
        defaultCacheTTL: 60000,
      });

      smallCacheManager.cacheSet('key1', 'value1');
      smallCacheManager.cacheSet('key2', 'value2');
      smallCacheManager.cacheSet('key3', 'value3');
      // Cache is now full

      smallCacheManager.cacheSet('key4', 'value4'); // Should evict key1

      expect(smallCacheManager.cacheGet('key1')).toBeUndefined();
      expect(smallCacheManager.cacheGet('key2')).toBe('value2');
      expect(smallCacheManager.cacheGet('key3')).toBe('value3');
      expect(smallCacheManager.cacheGet('key4')).toBe('value4');
    });
  });

  describe('Variable Registration and Introspection', () => {
    it('should return all registered variable names', () => {
      manager.registerVariables({
        varA: { type: 'string', scope: 'guild' },
        varB: { type: 'string', scope: 'user' },
        varC: { type: 'string', scope: 'global' },
      });

      const names = manager.getVariableNames();
      expect(names).toContain('varA');
      expect(names).toContain('varB');
      expect(names).toContain('varC');
    });

    it('should filter variables by scope', () => {
      manager.registerVariables({
        guild1: { type: 'string', scope: 'guild' },
        guild2: { type: 'string', scope: 'guild' },
        user1: { type: 'string', scope: 'user' },
        global1: { type: 'string', scope: 'global' },
      });

      expect(manager.getVariableNames('guild')).toEqual(['guild1', 'guild2']);
      expect(manager.getVariableNames('user')).toEqual(['user1']);
      expect(manager.getVariableNames('global')).toEqual(['global1']);
    });

    it('should return all registered table names', async () => {
      await manager.registerTables({
        table1: { columns: { id: { type: 'string' } } },
        table2: { columns: { id: { type: 'string' } } },
      });

      const names = manager.getTableNames();
      expect(names).toContain('table1');
      expect(names).toContain('table2');
    });
  });

  describe('Close and Cleanup', () => {
    it('should clear cache on close', async () => {
      manager.cacheSet('key', 'value');
      expect(manager.cacheGet('key')).toBe('value');

      await manager.close();

      expect(manager.cacheGet('key')).toBeUndefined();
    });

    it('should be safe to call close multiple times', async () => {
      await manager.close();
      await manager.close(); // Should not throw
    });
  });

  describe('Edge Cases', () => {
    it('should handle storing and retrieving complex objects', async () => {
      manager.registerVariables({
        complexData: { type: 'string', scope: 'guild' },
      });

      const complexValue = {
        nested: { deep: { value: 42 } },
        array: [1, 2, { key: 'val' }],
        nullVal: null,
        boolVal: false,
      };

      const ctx = { guildId: 'guild-1' };
      await manager.set('complexData', complexValue, ctx);
      const retrieved = await manager.get('complexData', ctx);

      expect(retrieved).toEqual(complexValue);
    });

    it('should handle empty string values', async () => {
      manager.registerVariables({
        strVar: { type: 'string', scope: 'guild' },
      });

      const ctx = { guildId: 'guild-1' };
      await manager.set('strVar', '', ctx);

      const value = await manager.get('strVar', ctx);
      expect(value).toBe('');
    });

    it('should handle zero values distinctly from undefined', async () => {
      manager.registerVariables({
        numVar: { type: 'string', scope: 'guild' },
      });

      const ctx = { guildId: 'guild-1' };
      await manager.set('numVar', 0, ctx);

      const value = await manager.get('numVar', ctx);
      expect(value).toBe(0);
      expect(value).not.toBeUndefined();
    });

    it('should handle false values distinctly from undefined', async () => {
      manager.registerVariables({
        boolVar: { type: 'string', scope: 'guild' },
      });

      const ctx = { guildId: 'guild-1' };
      await manager.set('boolVar', false, ctx);

      const value = await manager.get('boolVar', ctx);
      expect(value).toBe(false);
      expect(value).not.toBeUndefined();
    });

    it('should handle unregistered variables with default guild scope', async () => {
      // Variable not registered, should default to guild scope
      const ctx = { guildId: 'guild-1' };
      await manager.set('unregisteredVar', 'value', ctx);

      const value = await manager.get('unregisteredVar', ctx);
      expect(value).toBe('value');
    });
  });
});

describe('createStateManager factory', () => {
  it('should create manager with default options', () => {
    const storage = new MemoryAdapter();
    const manager = createStateManager(storage);
    expect(manager).toBeInstanceOf(StateManager);
  });

  it('should create manager with custom options', () => {
    const storage = new MemoryAdapter();
    const manager = createStateManager(storage, {
      defaultCacheTTL: 60000,
      maxCacheSize: 5000,
    });
    expect(manager).toBeInstanceOf(StateManager);
  });
});
