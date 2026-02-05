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

  // ==========================================
  // Edge Cases
  // ==========================================

  describe('Edge Cases', () => {
    describe('Unicode Handling', () => {
      it('should handle unicode in string values', async () => {
        const now = Date.now();
        const unicodeValue = '你好世界 🎉 مرحبا العالم 🌍';

        await adapter.set('unicode-key', {
          value: unicodeValue,
          type: 'string',
          createdAt: now,
          updatedAt: now,
        });

        const result = await adapter.get('unicode-key');
        expect(result?.value).toBe(unicodeValue);
      });

      it('should handle unicode in JSON values', async () => {
        const now = Date.now();
        const unicodeData = {
          greeting: '你好',
          emoji: '🎉🎊🎈',
          arabic: 'مرحبا',
          mixed: 'Hello 世界 🌍',
          nested: { value: '日本語' },
        };

        await adapter.set('unicode-json', {
          value: unicodeData,
          type: 'json',
          createdAt: now,
          updatedAt: now,
        });

        const result = await adapter.get('unicode-json');
        expect(result?.value).toEqual(unicodeData);
      });

      it('should handle unicode in keys', async () => {
        const now = Date.now();
        const unicodeKey = 'キー:emoji:🔑';

        await adapter.set(unicodeKey, {
          value: 'unicode key test',
          type: 'string',
          createdAt: now,
          updatedAt: now,
        });

        const result = await adapter.get(unicodeKey);
        expect(result?.value).toBe('unicode key test');
      });

      it('should handle emoji-only values', async () => {
        const now = Date.now();

        await adapter.set('emoji-only', {
          value: '🎉🎊🎈🎁🎀',
          type: 'string',
          createdAt: now,
          updatedAt: now,
        });

        const result = await adapter.get('emoji-only');
        expect(result?.value).toBe('🎉🎊🎈🎁🎀');
      });
    });

    describe('Special Characters', () => {
      it('should handle keys with colons', async () => {
        const now = Date.now();

        await adapter.set('guild:123:user:456:xp', {
          value: 100,
          type: 'number',
          createdAt: now,
          updatedAt: now,
        });

        const result = await adapter.get('guild:123:user:456:xp');
        expect(result?.value).toBe(100);
      });

      it('should handle keys with slashes', async () => {
        const now = Date.now();

        await adapter.set('path/to/resource', {
          value: 'resource',
          type: 'string',
          createdAt: now,
          updatedAt: now,
        });

        const result = await adapter.get('path/to/resource');
        expect(result?.value).toBe('resource');
      });

      it('should handle values with quotes', async () => {
        const now = Date.now();
        const quotedValue = 'He said "Hello" and \'Goodbye\'';

        await adapter.set('quoted', {
          value: quotedValue,
          type: 'string',
          createdAt: now,
          updatedAt: now,
        });

        const result = await adapter.get('quoted');
        expect(result?.value).toBe(quotedValue);
      });

      it('should handle values with backslashes', async () => {
        const now = Date.now();
        const backslashValue = 'C:\\Users\\Name\\Documents';

        await adapter.set('backslash', {
          value: backslashValue,
          type: 'string',
          createdAt: now,
          updatedAt: now,
        });

        const result = await adapter.get('backslash');
        expect(result?.value).toBe(backslashValue);
      });

      it('should handle newlines and tabs', async () => {
        const now = Date.now();
        const multilineValue = 'Line 1\nLine 2\n\tIndented';

        await adapter.set('multiline', {
          value: multilineValue,
          type: 'string',
          createdAt: now,
          updatedAt: now,
        });

        const result = await adapter.get('multiline');
        expect(result?.value).toBe(multilineValue);
      });

      it('should handle null byte in strings', async () => {
        const now = Date.now();
        const nullByteValue = 'before\x00after';

        await adapter.set('null-byte', {
          value: nullByteValue,
          type: 'string',
          createdAt: now,
          updatedAt: now,
        });

        const result = await adapter.get('null-byte');
        expect(result?.value).toBe(nullByteValue);
      });
    });

    describe('Large Data', () => {
      it('should handle very long strings', async () => {
        const now = Date.now();
        const longString = 'x'.repeat(100000);

        await adapter.set('long-string', {
          value: longString,
          type: 'string',
          createdAt: now,
          updatedAt: now,
        });

        const result = await adapter.get('long-string');
        expect(result?.value).toBe(longString);
        expect((result?.value as string).length).toBe(100000);
      });

      it('should handle large JSON objects', async () => {
        const now = Date.now();
        const largeObject = {
          items: Array(1000).fill(null).map((_, i) => ({
            id: i,
            name: `Item ${i}`,
            data: 'x'.repeat(100),
          })),
        };

        await adapter.set('large-json', {
          value: largeObject,
          type: 'json',
          createdAt: now,
          updatedAt: now,
        });

        const result = await adapter.get('large-json');
        expect(result?.value).toEqual(largeObject);
      });

      it('should handle deeply nested objects', async () => {
        const now = Date.now();
        let nested: any = { value: 'deep' };
        for (let i = 0; i < 50; i++) {
          nested = { level: i, nested };
        }

        await adapter.set('deep-nested', {
          value: nested,
          type: 'json',
          createdAt: now,
          updatedAt: now,
        });

        const result = await adapter.get('deep-nested');
        expect(result?.value).toEqual(nested);
      });
    });

    describe('Boundary Values', () => {
      it('should handle empty string value', async () => {
        const now = Date.now();

        await adapter.set('empty-string', {
          value: '',
          type: 'string',
          createdAt: now,
          updatedAt: now,
        });

        const result = await adapter.get('empty-string');
        expect(result?.value).toBe('');
      });

      it('should handle zero number value', async () => {
        const now = Date.now();

        await adapter.set('zero', {
          value: 0,
          type: 'number',
          createdAt: now,
          updatedAt: now,
        });

        const result = await adapter.get('zero');
        expect(result?.value).toBe(0);
      });

      it('should handle negative numbers', async () => {
        const now = Date.now();

        await adapter.set('negative', {
          value: -12345.67,
          type: 'number',
          createdAt: now,
          updatedAt: now,
        });

        const result = await adapter.get('negative');
        expect(result?.value).toBe(-12345.67);
      });

      it('should handle very large numbers', async () => {
        const now = Date.now();
        const largeNumber = Number.MAX_SAFE_INTEGER;

        await adapter.set('large-number', {
          value: largeNumber,
          type: 'number',
          createdAt: now,
          updatedAt: now,
        });

        const result = await adapter.get('large-number');
        expect(result?.value).toBe(largeNumber);
      });

      it('should handle very small numbers', async () => {
        const now = Date.now();
        const smallNumber = Number.MIN_SAFE_INTEGER;

        await adapter.set('small-number', {
          value: smallNumber,
          type: 'number',
          createdAt: now,
          updatedAt: now,
        });

        const result = await adapter.get('small-number');
        expect(result?.value).toBe(smallNumber);
      });

      it('should handle empty array', async () => {
        const now = Date.now();

        await adapter.set('empty-array', {
          value: [],
          type: 'array',
          createdAt: now,
          updatedAt: now,
        });

        const result = await adapter.get('empty-array');
        expect(result?.value).toEqual([]);
      });

      it('should handle empty object', async () => {
        const now = Date.now();

        await adapter.set('empty-object', {
          value: {},
          type: 'object',
          createdAt: now,
          updatedAt: now,
        });

        const result = await adapter.get('empty-object');
        expect(result?.value).toEqual({});
      });

      it('should handle null values in objects', async () => {
        const now = Date.now();
        const objWithNulls = {
          field: null,
          nested: { inner: null },
          array: [null, 'value', null],
        };

        await adapter.set('nulls-in-object', {
          value: objWithNulls,
          type: 'json',
          createdAt: now,
          updatedAt: now,
        });

        const result = await adapter.get('nulls-in-object');
        expect(result?.value).toEqual(objWithNulls);
      });
    });

    describe('Concurrent Operations', () => {
      it('should handle concurrent writes to different keys', async () => {
        const now = Date.now();
        const writes = Array(50).fill(null).map((_, i) =>
          adapter.set(`concurrent-${i}`, {
            value: `value-${i}`,
            type: 'string',
            createdAt: now,
            updatedAt: now,
          })
        );

        await Promise.all(writes);

        const keys = await adapter.keys('concurrent-*');
        expect(keys).toHaveLength(50);
      });

      it('should handle concurrent reads and writes', async () => {
        const now = Date.now();

        // Pre-populate
        for (let i = 0; i < 10; i++) {
          await adapter.set(`rw-${i}`, {
            value: `initial-${i}`,
            type: 'string',
            createdAt: now,
            updatedAt: now,
          });
        }

        // Mix of reads and writes concurrently
        const operations = Array(30).fill(null).map((_, i) => {
          if (i % 2 === 0) {
            return adapter.get(`rw-${i % 10}`);
          } else {
            return adapter.set(`rw-${i % 10}`, {
              value: `updated-${i}`,
              type: 'string',
              createdAt: now,
              updatedAt: now + i,
            });
          }
        });

        const results = await Promise.all(operations);
        expect(results.length).toBe(30);
      });

      it('should handle concurrent table operations', async () => {
        await adapter.createTable('concurrent_items', {
          columns: {
            id: { type: 'number', primary: true },
            value: { type: 'string' },
          },
        });

        // Concurrent inserts
        const inserts = Array(20).fill(null).map((_, i) =>
          adapter.insert('concurrent_items', { id: i, value: `item-${i}` })
        );

        await Promise.all(inserts);

        const rows = await adapter.query('concurrent_items', {});
        expect(rows).toHaveLength(20);
      });
    });

    describe('Table Edge Cases', () => {
      it('should handle table with many columns', async () => {
        const columns: Record<string, { type: 'string' | 'number' }> = {};
        for (let i = 0; i < 50; i++) {
          columns[`col_${i}`] = { type: 'string' };
        }
        columns['id'] = { type: 'number' };

        await adapter.createTable('many_columns', { columns });

        const row: Record<string, unknown> = { id: 1 };
        for (let i = 0; i < 50; i++) {
          row[`col_${i}`] = `value_${i}`;
        }

        await adapter.insert('many_columns', row);
        const result = await adapter.query('many_columns', { where: { id: 1 } });

        expect(result).toHaveLength(1);
        expect(result[0]!.col_0).toBe('value_0');
        expect(result[0]!.col_49).toBe('value_49');
      });

      it('should handle many rows in a table', async () => {
        await adapter.createTable('many_rows', {
          columns: {
            id: { type: 'number', primary: true },
            value: { type: 'string' },
          },
        });

        // Insert 1000 rows
        for (let i = 0; i < 1000; i++) {
          await adapter.insert('many_rows', { id: i, value: `value-${i}` });
        }

        const allRows = await adapter.query('many_rows', {});
        expect(allRows).toHaveLength(1000);

        const limited = await adapter.query('many_rows', { limit: 10 });
        expect(limited).toHaveLength(10);
      });

      it('should handle query with large offset', async () => {
        await adapter.createTable('offset_test', {
          columns: {
            id: { type: 'number', primary: true },
          },
        });

        for (let i = 0; i < 100; i++) {
          await adapter.insert('offset_test', { id: i });
        }

        // Large offset beyond data
        const result = await adapter.query('offset_test', { offset: 1000, limit: 10 });
        expect(result).toHaveLength(0);
      });
    });

    describe('Error Handling', () => {
      it('should handle querying non-existent table gracefully', async () => {
        // SQLite will throw an error for non-existent table
        await expect(
          adapter.query('nonexistent_table', {})
        ).rejects.toThrow();
      });

      it('should handle inserting into non-existent table gracefully', async () => {
        await expect(
          adapter.insert('nonexistent_table', { id: 1 })
        ).rejects.toThrow();
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
