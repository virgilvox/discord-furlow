/**
 * Storage Adapter Contract Tests
 *
 * These tests verify that all storage adapters implement the StorageAdapter
 * interface consistently and produce the same behavior.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MemoryAdapter, createMemoryAdapter } from '../memory/index.js';
import { SQLiteAdapter, createSQLiteAdapter } from '../sqlite/index.js';
import type { StorageAdapter, StoredValue, TableDefinition } from '../types.js';

/**
 * Contract test suite that runs against any StorageAdapter implementation.
 */
function runContractTests(
  name: string,
  createAdapter: () => StorageAdapter,
  closeAdapter: (adapter: StorageAdapter) => Promise<void>
) {
  describe(`${name} Contract Tests`, () => {
    let adapter: StorageAdapter;

    beforeEach(() => {
      adapter = createAdapter();
    });

    afterEach(async () => {
      await closeAdapter(adapter);
    });

    // ==========================================
    // Key-Value Contract
    // ==========================================

    describe('Key-Value Contract', () => {
      describe('get/set', () => {
        it('should return null for non-existent key', async () => {
          const result = await adapter.get('nonexistent');
          expect(result).toBeNull();
        });

        it('should store and retrieve string value', async () => {
          const value: StoredValue = {
            value: 'hello world',
            type: 'string',
            createdAt: Date.now(),
            updatedAt: Date.now(),
          };

          await adapter.set('string-key', value);
          const result = await adapter.get('string-key');

          expect(result?.value).toBe('hello world');
          expect(result?.type).toBe('string');
        });

        it('should store and retrieve number value', async () => {
          const value: StoredValue = {
            value: 42.5,
            type: 'number',
            createdAt: Date.now(),
            updatedAt: Date.now(),
          };

          await adapter.set('number-key', value);
          const result = await adapter.get('number-key');

          expect(result?.value).toBe(42.5);
        });

        it('should store and retrieve boolean value', async () => {
          const value: StoredValue = {
            value: true,
            type: 'boolean',
            createdAt: Date.now(),
            updatedAt: Date.now(),
          };

          await adapter.set('bool-key', value);
          const result = await adapter.get('bool-key');

          expect(result?.value).toBe(true);
        });

        it('should store and retrieve object value', async () => {
          const objValue = { name: 'test', items: [1, 2, 3], nested: { deep: true } };
          const value: StoredValue = {
            value: objValue,
            type: 'object',
            createdAt: Date.now(),
            updatedAt: Date.now(),
          };

          await adapter.set('obj-key', value);
          const result = await adapter.get('obj-key');

          expect(result?.value).toEqual(objValue);
        });

        it('should store and retrieve array value', async () => {
          const arrValue = [1, 'two', { three: 3 }];
          const value: StoredValue = {
            value: arrValue,
            type: 'array',
            createdAt: Date.now(),
            updatedAt: Date.now(),
          };

          await adapter.set('arr-key', value);
          const result = await adapter.get('arr-key');

          expect(result?.value).toEqual(arrValue);
        });

        it('should store and retrieve null value', async () => {
          const value: StoredValue = {
            value: null,
            type: 'null',
            createdAt: Date.now(),
            updatedAt: Date.now(),
          };

          await adapter.set('null-key', value);
          const result = await adapter.get('null-key');

          expect(result?.value).toBeNull();
        });

        it('should overwrite existing value', async () => {
          const value1: StoredValue = { value: 'first', type: 'string', createdAt: Date.now(), updatedAt: Date.now() };
          const value2: StoredValue = { value: 'second', type: 'string', createdAt: Date.now(), updatedAt: Date.now() };

          await adapter.set('overwrite-key', value1);
          await adapter.set('overwrite-key', value2);
          const result = await adapter.get('overwrite-key');

          expect(result?.value).toBe('second');
        });

        it('should preserve timestamps', async () => {
          const createdAt = 1000000000000;
          const updatedAt = 1000000001000;
          const value: StoredValue = {
            value: 'test',
            type: 'string',
            createdAt,
            updatedAt,
          };

          await adapter.set('ts-key', value);
          const result = await adapter.get('ts-key');

          expect(result?.createdAt).toBe(createdAt);
          expect(result?.updatedAt).toBe(updatedAt);
        });
      });

      describe('expiration', () => {
        it('should return null for expired value', async () => {
          const value: StoredValue = {
            value: 'expired',
            type: 'string',
            createdAt: Date.now(),
            updatedAt: Date.now(),
            expiresAt: Date.now() - 1000,
          };

          await adapter.set('expired-key', value);
          const result = await adapter.get('expired-key');

          expect(result).toBeNull();
        });

        it('should return value that has not expired', async () => {
          const value: StoredValue = {
            value: 'valid',
            type: 'string',
            createdAt: Date.now(),
            updatedAt: Date.now(),
            expiresAt: Date.now() + 60000,
          };

          await adapter.set('valid-key', value);
          const result = await adapter.get('valid-key');

          expect(result?.value).toBe('valid');
        });
      });

      describe('has', () => {
        it('should return true for existing key', async () => {
          await adapter.set('exists', { value: 'x', type: 'string', createdAt: Date.now(), updatedAt: Date.now() });
          expect(await adapter.has('exists')).toBe(true);
        });

        it('should return false for non-existent key', async () => {
          expect(await adapter.has('nonexistent')).toBe(false);
        });

        it('should return false for expired key', async () => {
          await adapter.set('expired', {
            value: 'x',
            type: 'string',
            createdAt: Date.now(),
            updatedAt: Date.now(),
            expiresAt: Date.now() - 1000,
          });
          expect(await adapter.has('expired')).toBe(false);
        });
      });

      describe('delete', () => {
        it('should delete existing key and return true', async () => {
          await adapter.set('to-delete', { value: 'x', type: 'string', createdAt: Date.now(), updatedAt: Date.now() });

          const deleted = await adapter.delete('to-delete');

          expect(deleted).toBe(true);
          expect(await adapter.get('to-delete')).toBeNull();
        });

        it('should return false for non-existent key', async () => {
          const deleted = await adapter.delete('nonexistent');
          expect(deleted).toBe(false);
        });
      });

      describe('keys', () => {
        beforeEach(async () => {
          const now = Date.now();
          await adapter.set('user:1', { value: 'a', type: 'string', createdAt: now, updatedAt: now });
          await adapter.set('user:2', { value: 'b', type: 'string', createdAt: now, updatedAt: now });
          await adapter.set('guild:1', { value: 'c', type: 'string', createdAt: now, updatedAt: now });
        });

        it('should return all keys without pattern', async () => {
          const keys = await adapter.keys();
          expect(keys).toHaveLength(3);
          expect(keys.sort()).toEqual(['guild:1', 'user:1', 'user:2']);
        });

        it('should filter keys with wildcard pattern', async () => {
          const keys = await adapter.keys('user:*');
          expect(keys).toHaveLength(2);
          expect(keys.sort()).toEqual(['user:1', 'user:2']);
        });

        it('should exclude expired keys', async () => {
          await adapter.set('expired', {
            value: 'x',
            type: 'string',
            createdAt: Date.now(),
            updatedAt: Date.now(),
            expiresAt: Date.now() - 1000,
          });

          const keys = await adapter.keys();
          expect(keys).not.toContain('expired');
        });
      });

      describe('clear', () => {
        it('should remove all keys', async () => {
          const now = Date.now();
          await adapter.set('key1', { value: 'a', type: 'string', createdAt: now, updatedAt: now });
          await adapter.set('key2', { value: 'b', type: 'string', createdAt: now, updatedAt: now });

          await adapter.clear();

          const keys = await adapter.keys();
          expect(keys).toHaveLength(0);
        });
      });
    });

    // ==========================================
    // Table Contract
    // ==========================================

    describe('Table Contract', () => {
      const testTableDef: TableDefinition = {
        columns: {
          id: { type: 'number', primary: true },
          name: { type: 'string' },
          active: { type: 'boolean' },
        },
      };

      describe('createTable', () => {
        it('should create a table', async () => {
          await adapter.createTable('test_table', testTableDef);
          const result = await adapter.query('test_table', {});
          expect(result).toEqual([]);
        });

        it('should be idempotent (no error on duplicate)', async () => {
          await adapter.createTable('test_table', testTableDef);
          await adapter.createTable('test_table', testTableDef);
          // Should not throw
        });
      });

      describe('insert', () => {
        beforeEach(async () => {
          await adapter.createTable('test_table', testTableDef);
        });

        it('should insert a row', async () => {
          await adapter.insert('test_table', { id: 1, name: 'Alice', active: true });

          const result = await adapter.query('test_table', {});
          expect(result).toHaveLength(1);
        });

        it('should insert multiple rows', async () => {
          await adapter.insert('test_table', { id: 1, name: 'Alice', active: true });
          await adapter.insert('test_table', { id: 2, name: 'Bob', active: false });

          const result = await adapter.query('test_table', {});
          expect(result).toHaveLength(2);
        });
      });

      describe('update', () => {
        beforeEach(async () => {
          await adapter.createTable('test_table', testTableDef);
          await adapter.insert('test_table', { id: 1, name: 'Alice', active: true });
          await adapter.insert('test_table', { id: 2, name: 'Bob', active: true });
        });

        it('should update matching rows and return count', async () => {
          const count = await adapter.update('test_table', { id: 1 }, { name: 'Updated' });
          expect(count).toBe(1);
        });

        it('should return 0 for no matches', async () => {
          const count = await adapter.update('test_table', { id: 999 }, { name: 'Nobody' });
          expect(count).toBe(0);
        });
      });

      describe('deleteRows', () => {
        beforeEach(async () => {
          await adapter.createTable('test_table', testTableDef);
          await adapter.insert('test_table', { id: 1, name: 'Alice', active: true });
          await adapter.insert('test_table', { id: 2, name: 'Bob', active: true });
        });

        it('should delete matching rows and return count', async () => {
          const count = await adapter.deleteRows('test_table', { id: 1 });
          expect(count).toBe(1);

          const result = await adapter.query('test_table', {});
          expect(result).toHaveLength(1);
        });

        it('should return 0 for no matches', async () => {
          const count = await adapter.deleteRows('test_table', { id: 999 });
          expect(count).toBe(0);
        });
      });

      describe('query', () => {
        beforeEach(async () => {
          await adapter.createTable('test_table', testTableDef);
          await adapter.insert('test_table', { id: 1, name: 'Alice', active: true });
          await adapter.insert('test_table', { id: 2, name: 'Bob', active: false });
          await adapter.insert('test_table', { id: 3, name: 'Charlie', active: true });
        });

        it('should return all rows without options', async () => {
          const result = await adapter.query('test_table', {});
          expect(result).toHaveLength(3);
        });

        it('should filter with where clause', async () => {
          const result = await adapter.query('test_table', { where: { id: 2 } });
          expect(result).toHaveLength(1);
        });

        it('should limit results', async () => {
          const result = await adapter.query('test_table', { limit: 2 });
          expect(result).toHaveLength(2);
        });

        it('should offset results', async () => {
          // SQLite requires LIMIT when using OFFSET, so we use a high limit
          const result = await adapter.query('test_table', { offset: 1, limit: 100, orderBy: 'id' });
          expect(result).toHaveLength(2);
        });

        it('should select specific columns', async () => {
          const result = await adapter.query('test_table', { select: ['name'] });
          expect(result[0]).toHaveProperty('name');
          expect(result[0]).not.toHaveProperty('id');
        });
      });
    });

    // ==========================================
    // Close Contract
    // ==========================================

    describe('Close Contract', () => {
      it('should close without error', async () => {
        await adapter.close();
        // Should not throw
      });
    });
  });
}

// Run contract tests for Memory adapter
runContractTests(
  'MemoryAdapter',
  () => createMemoryAdapter(),
  async (adapter) => await adapter.close()
);

// Run contract tests for SQLite adapter
runContractTests(
  'SQLiteAdapter',
  () => createSQLiteAdapter({ memory: true }),
  async (adapter) => await adapter.close()
);
