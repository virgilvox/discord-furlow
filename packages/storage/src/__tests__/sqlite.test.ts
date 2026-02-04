/**
 * SQLite Storage Adapter Tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SQLiteAdapter, createSQLiteAdapter } from '../sqlite/index.js';
import type { StoredValue, TableDefinition } from '../types.js';

describe('SQLiteAdapter', () => {
  let adapter: SQLiteAdapter;

  beforeEach(() => {
    adapter = createSQLiteAdapter({ memory: true });
  });

  afterEach(async () => {
    await adapter.close();
  });

  // ==========================================
  // Key-Value Operations
  // ==========================================

  describe('Key-Value Operations', () => {
    describe('get/set', () => {
      it('should set and get a value', async () => {
        const value: StoredValue = {
          value: 'test',
          type: 'string',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };

        await adapter.set('key1', value);
        const result = await adapter.get('key1');

        expect(result).toEqual(value);
      });

      it('should return null for non-existent key', async () => {
        const result = await adapter.get('nonexistent');
        expect(result).toBeNull();
      });

      it('should overwrite existing value', async () => {
        const value1: StoredValue = {
          value: 'first',
          type: 'string',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        const value2: StoredValue = {
          value: 'second',
          type: 'string',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };

        await adapter.set('key1', value1);
        await adapter.set('key1', value2);
        const result = await adapter.get('key1');

        expect(result?.value).toBe('second');
      });

      it('should handle different value types', async () => {
        const values = [
          { value: 123, type: 'number' },
          { value: true, type: 'boolean' },
          { value: { foo: 'bar' }, type: 'object' },
          { value: [1, 2, 3], type: 'array' },
          { value: null, type: 'null' },
        ];

        for (const v of values) {
          const stored: StoredValue = {
            value: v.value,
            type: v.type,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          };
          await adapter.set(`key_${v.type}`, stored);
          const result = await adapter.get(`key_${v.type}`);
          expect(result?.value).toEqual(v.value);
        }
      });

      it('should store and retrieve complex nested objects', async () => {
        const complexValue = {
          users: [
            { id: 1, name: 'Alice', tags: ['admin', 'user'] },
            { id: 2, name: 'Bob', tags: ['user'] },
          ],
          metadata: {
            version: '1.0',
            nested: { deep: { value: true } },
          },
        };

        const stored: StoredValue = {
          value: complexValue,
          type: 'json',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };

        await adapter.set('complex', stored);
        const result = await adapter.get('complex');

        expect(result?.value).toEqual(complexValue);
      });
    });

    describe('expiration', () => {
      it('should return null for expired values', async () => {
        const value: StoredValue = {
          value: 'expired',
          type: 'string',
          createdAt: Date.now(),
          updatedAt: Date.now(),
          expiresAt: Date.now() - 1000, // Already expired
        };

        await adapter.set('expired_key', value);
        const result = await adapter.get('expired_key');

        expect(result).toBeNull();
      });

      it('should return value that has not expired', async () => {
        const value: StoredValue = {
          value: 'not_expired',
          type: 'string',
          createdAt: Date.now(),
          updatedAt: Date.now(),
          expiresAt: Date.now() + 60000, // Expires in 1 minute
        };

        await adapter.set('not_expired_key', value);
        const result = await adapter.get('not_expired_key');

        expect(result?.value).toBe('not_expired');
      });

      it('should delete expired value on get', async () => {
        const value: StoredValue = {
          value: 'expired',
          type: 'string',
          createdAt: Date.now(),
          updatedAt: Date.now(),
          expiresAt: Date.now() - 1000,
        };

        await adapter.set('expired_key', value);
        await adapter.get('expired_key');

        // Key should be deleted from database
        const keys = await adapter.keys();
        expect(keys).not.toContain('expired_key');
      });

      it('should preserve expiresAt when set', async () => {
        const expiresAt = Date.now() + 60000;
        const value: StoredValue = {
          value: 'test',
          type: 'string',
          createdAt: Date.now(),
          updatedAt: Date.now(),
          expiresAt,
        };

        await adapter.set('ttl_key', value);
        const result = await adapter.get('ttl_key');

        expect(result?.expiresAt).toBe(expiresAt);
      });
    });

    describe('delete', () => {
      it('should delete an existing key', async () => {
        const value: StoredValue = {
          value: 'test',
          type: 'string',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };

        await adapter.set('key1', value);
        const deleted = await adapter.delete('key1');
        const result = await adapter.get('key1');

        expect(deleted).toBe(true);
        expect(result).toBeNull();
      });

      it('should return false for non-existent key', async () => {
        const deleted = await adapter.delete('nonexistent');
        expect(deleted).toBe(false);
      });
    });

    describe('has', () => {
      it('should return true for existing key', async () => {
        const value: StoredValue = {
          value: 'test',
          type: 'string',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };

        await adapter.set('key1', value);
        const exists = await adapter.has('key1');

        expect(exists).toBe(true);
      });

      it('should return false for non-existent key', async () => {
        const exists = await adapter.has('nonexistent');
        expect(exists).toBe(false);
      });

      it('should return false for expired key', async () => {
        const value: StoredValue = {
          value: 'expired',
          type: 'string',
          createdAt: Date.now(),
          updatedAt: Date.now(),
          expiresAt: Date.now() - 1000,
        };

        await adapter.set('expired_key', value);
        const exists = await adapter.has('expired_key');

        expect(exists).toBe(false);
      });
    });

    describe('keys', () => {
      beforeEach(async () => {
        const now = Date.now();
        await adapter.set('user:1', { value: 'a', type: 'string', createdAt: now, updatedAt: now });
        await adapter.set('user:2', { value: 'b', type: 'string', createdAt: now, updatedAt: now });
        await adapter.set('guild:1', { value: 'c', type: 'string', createdAt: now, updatedAt: now });
        await adapter.set('settings', { value: 'd', type: 'string', createdAt: now, updatedAt: now });
      });

      it('should return all keys without pattern', async () => {
        const keys = await adapter.keys();
        expect(keys).toHaveLength(4);
        expect(keys).toContain('user:1');
        expect(keys).toContain('user:2');
        expect(keys).toContain('guild:1');
        expect(keys).toContain('settings');
      });

      it('should filter keys with wildcard pattern', async () => {
        const keys = await adapter.keys('user:*');
        expect(keys).toHaveLength(2);
        expect(keys).toContain('user:1');
        expect(keys).toContain('user:2');
      });

      it('should filter keys with single character wildcard', async () => {
        const keys = await adapter.keys('user:?');
        expect(keys).toHaveLength(2);
      });

      it('should exclude expired keys', async () => {
        await adapter.set('expired', {
          value: 'expired',
          type: 'string',
          createdAt: Date.now(),
          updatedAt: Date.now(),
          expiresAt: Date.now() - 1000,
        });

        const keys = await adapter.keys();
        expect(keys).not.toContain('expired');
      });

      it('should handle complex patterns', async () => {
        await adapter.set('app:module:feature', { value: 'x', type: 'string', createdAt: Date.now(), updatedAt: Date.now() });

        const keys = await adapter.keys('app:*:feature');
        expect(keys).toContain('app:module:feature');
      });
    });

    describe('clear', () => {
      it('should clear all data', async () => {
        const now = Date.now();
        await adapter.set('key1', { value: 'a', type: 'string', createdAt: now, updatedAt: now });
        await adapter.set('key2', { value: 'b', type: 'string', createdAt: now, updatedAt: now });

        await adapter.clear();

        const keys = await adapter.keys();
        expect(keys).toHaveLength(0);
      });
    });

    describe('cleanup', () => {
      it('should remove expired keys', async () => {
        const now = Date.now();
        await adapter.set('valid', { value: 'valid', type: 'string', createdAt: now, updatedAt: now });
        await adapter.set('expired1', { value: 'a', type: 'string', createdAt: now, updatedAt: now, expiresAt: now - 1000 });
        await adapter.set('expired2', { value: 'b', type: 'string', createdAt: now, updatedAt: now, expiresAt: now - 2000 });

        const cleaned = adapter.cleanup();

        expect(cleaned).toBe(2);
        const keys = await adapter.keys();
        expect(keys).toEqual(['valid']);
      });

      it('should return 0 when no expired keys', async () => {
        const now = Date.now();
        await adapter.set('valid', { value: 'valid', type: 'string', createdAt: now, updatedAt: now });

        const cleaned = adapter.cleanup();
        expect(cleaned).toBe(0);
      });
    });
  });

  // ==========================================
  // Table Operations
  // ==========================================

  describe('Table Operations', () => {
    const userTableDef: TableDefinition = {
      columns: {
        id: { type: 'number', primary: true },
        name: { type: 'string' },
        email: { type: 'string', unique: true },
        active: { type: 'boolean', default: true },
        score: { type: 'number', index: true },
      },
    };

    describe('createTable', () => {
      it('should create a table', async () => {
        await adapter.createTable('users', userTableDef);
        const result = await adapter.query('users', {});
        expect(result).toEqual([]);
      });

      it('should not error on duplicate table creation', async () => {
        await adapter.createTable('users', userTableDef);
        await adapter.insert('users', { id: 1, name: 'Alice', email: 'alice@example.com', score: 100 });

        // Creating again should not throw or clear data
        await adapter.createTable('users', userTableDef);
        const result = await adapter.query('users', {});
        expect(result).toHaveLength(1);
      });

      it('should create table with all column types', async () => {
        const tableDef: TableDefinition = {
          columns: {
            id: { type: 'number', primary: true },
            name: { type: 'string' },
            active: { type: 'boolean' },
            data: { type: 'json' },
            created: { type: 'timestamp' },
          },
        };

        await adapter.createTable('all_types', tableDef);
        await adapter.insert('all_types', {
          id: 1,
          name: 'test',
          active: true,
          data: { foo: 'bar' },
          created: Date.now(),
        });

        const result = await adapter.query('all_types', {});
        expect(result).toHaveLength(1);
      });

      it('should create composite indexes', async () => {
        const tableDef: TableDefinition = {
          columns: {
            guild_id: { type: 'string' },
            user_id: { type: 'string' },
            level: { type: 'number' },
          },
          indexes: [['guild_id', 'user_id']],
        };

        await adapter.createTable('levels', tableDef);
        await adapter.insert('levels', { guild_id: 'g1', user_id: 'u1', level: 5 });

        const result = await adapter.query('levels', { where: { guild_id: 'g1', user_id: 'u1' } });
        expect(result).toHaveLength(1);
      });
    });

    describe('insert', () => {
      beforeEach(async () => {
        await adapter.createTable('users', userTableDef);
      });

      it('should insert a row', async () => {
        await adapter.insert('users', { id: 1, name: 'Alice', email: 'alice@example.com', score: 100 });
        const result = await adapter.query('users', {});

        expect(result).toHaveLength(1);
        expect(result[0]).toMatchObject({ id: 1, name: 'Alice' });
      });

      it('should insert multiple rows', async () => {
        await adapter.insert('users', { id: 1, name: 'Alice', email: 'alice@example.com', score: 100 });
        await adapter.insert('users', { id: 2, name: 'Bob', email: 'bob@example.com', score: 200 });

        const result = await adapter.query('users', {});
        expect(result).toHaveLength(2);
      });

      it('should handle boolean values correctly', async () => {
        await adapter.insert('users', { id: 1, name: 'Alice', email: 'a@test.com', active: true, score: 100 });
        await adapter.insert('users', { id: 2, name: 'Bob', email: 'b@test.com', active: false, score: 100 });

        const result = await adapter.query('users', {});
        // SQLite stores booleans as 0/1
        expect(result.find((r) => r.id === 1)?.active).toBe(1);
        expect(result.find((r) => r.id === 2)?.active).toBe(0);
      });

      it('should handle JSON values correctly', async () => {
        const tableDef: TableDefinition = {
          columns: {
            id: { type: 'number', primary: true },
            data: { type: 'json' },
          },
        };
        await adapter.createTable('json_test', tableDef);

        const jsonData = { nested: { value: [1, 2, 3] } };
        await adapter.insert('json_test', { id: 1, data: jsonData });

        const result = await adapter.query('json_test', {});
        // JSON is stored as stringified
        expect(typeof result[0]?.data).toBe('string');
        expect(JSON.parse(result[0]?.data as string)).toEqual(jsonData);
      });
    });

    describe('update', () => {
      beforeEach(async () => {
        await adapter.createTable('users', userTableDef);
        await adapter.insert('users', { id: 1, name: 'Alice', email: 'alice@example.com', active: 1, score: 100 });
        await adapter.insert('users', { id: 2, name: 'Bob', email: 'bob@example.com', active: 1, score: 200 });
      });

      it('should update matching rows', async () => {
        const count = await adapter.update('users', { id: 1 }, { name: 'Alice Updated' });

        expect(count).toBe(1);
        const result = await adapter.query('users', { where: { id: 1 } });
        expect(result[0]?.name).toBe('Alice Updated');
      });

      it('should update multiple matching rows', async () => {
        const count = await adapter.update('users', { active: 1 }, { active: 0 });

        expect(count).toBe(2);
        const result = await adapter.query('users', { where: { active: 0 } });
        expect(result).toHaveLength(2);
      });

      it('should return 0 for no matches', async () => {
        const count = await adapter.update('users', { id: 999 }, { name: 'Nobody' });
        expect(count).toBe(0);
      });

      it('should update multiple fields', async () => {
        await adapter.update('users', { id: 1 }, { name: 'Updated', score: 999 });

        const result = await adapter.query('users', { where: { id: 1 } });
        expect(result[0]).toMatchObject({ name: 'Updated', score: 999 });
      });
    });

    describe('deleteRows', () => {
      beforeEach(async () => {
        await adapter.createTable('users', userTableDef);
        await adapter.insert('users', { id: 1, name: 'Alice', email: 'alice@example.com', score: 100 });
        await adapter.insert('users', { id: 2, name: 'Bob', email: 'bob@example.com', score: 200 });
        await adapter.insert('users', { id: 3, name: 'Charlie', email: 'charlie@example.com', score: 150 });
      });

      it('should delete matching rows', async () => {
        const count = await adapter.deleteRows('users', { id: 1 });

        expect(count).toBe(1);
        const result = await adapter.query('users', {});
        expect(result).toHaveLength(2);
      });

      it('should delete multiple matching rows', async () => {
        await adapter.update('users', { id: 1 }, { active: 0 });
        await adapter.update('users', { id: 2 }, { active: 0 });

        const count = await adapter.deleteRows('users', { active: 0 });

        expect(count).toBe(2);
        const result = await adapter.query('users', {});
        expect(result).toHaveLength(1);
      });

      it('should return 0 for no matches', async () => {
        const count = await adapter.deleteRows('users', { id: 999 });
        expect(count).toBe(0);
      });
    });

    describe('query', () => {
      beforeEach(async () => {
        await adapter.createTable('users', userTableDef);
        await adapter.insert('users', { id: 1, name: 'Alice', email: 'alice@example.com', score: 100 });
        await adapter.insert('users', { id: 2, name: 'Bob', email: 'bob@example.com', score: 200 });
        await adapter.insert('users', { id: 3, name: 'Charlie', email: 'charlie@example.com', score: 150 });
      });

      it('should return all rows without options', async () => {
        const result = await adapter.query('users', {});
        expect(result).toHaveLength(3);
      });

      it('should filter with where clause', async () => {
        const result = await adapter.query('users', { where: { id: 2 } });
        expect(result).toHaveLength(1);
        expect(result[0]?.name).toBe('Bob');
      });

      it('should filter with multiple where conditions', async () => {
        await adapter.insert('users', { id: 4, name: 'Alice', email: 'alice2@example.com', score: 300 });

        const result = await adapter.query('users', { where: { name: 'Alice', score: 300 } });
        expect(result).toHaveLength(1);
        expect(result[0]?.id).toBe(4);
      });

      it('should order by field ascending', async () => {
        const result = await adapter.query('users', { orderBy: 'score' });
        expect(result[0]?.name).toBe('Alice');
        expect(result[2]?.name).toBe('Bob');
      });

      it('should order by field descending', async () => {
        const result = await adapter.query('users', { orderBy: 'score DESC' });
        expect(result[0]?.name).toBe('Bob');
        expect(result[2]?.name).toBe('Alice');
      });

      it('should limit results', async () => {
        const result = await adapter.query('users', { limit: 2 });
        expect(result).toHaveLength(2);
      });

      it('should offset results', async () => {
        // SQLite requires LIMIT when using OFFSET
        const result = await adapter.query('users', { offset: 1, limit: 100, orderBy: 'id' });
        expect(result).toHaveLength(2);
        expect(result[0]?.id).toBe(2);
      });

      it('should combine limit and offset', async () => {
        const result = await adapter.query('users', { offset: 1, limit: 1, orderBy: 'id' });
        expect(result).toHaveLength(1);
        expect(result[0]?.id).toBe(2);
      });

      it('should select specific columns', async () => {
        const result = await adapter.query('users', { select: ['name', 'email'] });
        expect(result[0]).toHaveProperty('name');
        expect(result[0]).toHaveProperty('email');
        expect(result[0]).not.toHaveProperty('id');
        expect(result[0]).not.toHaveProperty('score');
      });

      it('should combine all query options', async () => {
        await adapter.insert('users', { id: 4, name: 'Dave', email: 'dave@example.com', score: 180 });
        await adapter.insert('users', { id: 5, name: 'Eve', email: 'eve@example.com', score: 160 });

        const result = await adapter.query('users', {
          select: ['name', 'score'],
          orderBy: 'score DESC',
          offset: 1,
          limit: 2,
        });

        expect(result).toHaveLength(2);
        expect(result[0]?.name).toBe('Dave'); // Second highest (180)
        expect(result[1]?.name).toBe('Eve');  // Third highest (160)
      });
    });
  });

  // ==========================================
  // SQLite-Specific Features
  // ==========================================

  describe('SQLite-Specific Features', () => {
    describe('getDatabase', () => {
      it('should return the underlying database instance', () => {
        const db = adapter.getDatabase();
        expect(db).toBeDefined();
        expect(typeof db.prepare).toBe('function');
      });
    });

    describe('WAL mode', () => {
      it('should attempt to enable WAL journal mode', () => {
        const db = adapter.getDatabase();
        const result = db.pragma('journal_mode') as { journal_mode: string }[];
        // In-memory databases use 'memory' mode, file-based would use 'wal'
        expect(['wal', 'memory']).toContain(result[0]?.journal_mode);
      });
    });
  });
});

describe('createSQLiteAdapter', () => {
  it('should create a new SQLiteAdapter instance', () => {
    const adapter = createSQLiteAdapter({ memory: true });
    expect(adapter).toBeInstanceOf(SQLiteAdapter);
    adapter.close();
  });

  it('should accept memory option', async () => {
    const adapter = createSQLiteAdapter({ memory: true });
    await adapter.set('test', { value: 'test', type: 'string', createdAt: Date.now(), updatedAt: Date.now() });
    const result = await adapter.get('test');
    expect(result?.value).toBe('test');
    await adapter.close();
  });
});
