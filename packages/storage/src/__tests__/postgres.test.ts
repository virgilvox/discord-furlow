/**
 * PostgreSQL Storage Adapter Tests
 *
 * Uses mocked pg library for unit testing without requiring a real database.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { StoredValue, TableDefinition } from '../types.js';

// Mock pg module
vi.mock('pg', () => {
  const mockClient = {
    query: vi.fn(),
    release: vi.fn(),
  };

  const mockPool = {
    query: vi.fn(),
    connect: vi.fn().mockResolvedValue(mockClient),
    end: vi.fn().mockResolvedValue(undefined),
  };

  return {
    Pool: vi.fn(() => mockPool),
    default: { Pool: vi.fn(() => mockPool) },
  };
});

// Import after mocking
import { PostgresAdapter, createPostgresAdapter } from '../postgres/index.js';
import { Pool } from 'pg';

describe('PostgresAdapter', () => {
  let adapter: PostgresAdapter;
  let mockPool: InstanceType<typeof Pool>;

  beforeEach(() => {
    vi.clearAllMocks();
    adapter = createPostgresAdapter({ host: 'localhost', database: 'test' });
    mockPool = adapter.getPool();

    // Default mock for init query (table creation)
    (mockPool.query as ReturnType<typeof vi.fn>).mockImplementation(async (query: string) => {
      if (query.includes('CREATE TABLE') || query.includes('CREATE INDEX')) {
        return { rows: [], rowCount: 0 };
      }
      return { rows: [], rowCount: 0 };
    });
  });

  afterEach(async () => {
    await adapter.close();
  });

  // ==========================================
  // Key-Value Operations
  // ==========================================

  describe('Key-Value Operations', () => {
    describe('get', () => {
      it('should return stored value', async () => {
        const now = Date.now();
        (mockPool.query as ReturnType<typeof vi.fn>).mockImplementation(async (query: string) => {
          if (query.includes('SELECT * FROM furlow_kv')) {
            return {
              rows: [{
                key: 'test-key',
                value: 'test-value',
                type: 'string',
                expires_at: null,
                created_at: now,
                updated_at: now,
              }],
            };
          }
          return { rows: [], rowCount: 0 };
        });

        const result = await adapter.get('test-key');

        expect(result).toEqual({
          value: 'test-value',
          type: 'string',
          expiresAt: undefined,
          createdAt: now,
          updatedAt: now,
        });
      });

      it('should return null for non-existent key', async () => {
        (mockPool.query as ReturnType<typeof vi.fn>).mockImplementation(async (query: string) => {
          if (query.includes('SELECT * FROM furlow_kv')) {
            return { rows: [] };
          }
          return { rows: [], rowCount: 0 };
        });

        const result = await adapter.get('nonexistent');
        expect(result).toBeNull();
      });

      it('should return null and delete expired value', async () => {
        const expiredTime = Date.now() - 1000;
        let deleteCalled = false;

        (mockPool.query as ReturnType<typeof vi.fn>).mockImplementation(async (query: string) => {
          if (query.includes('SELECT * FROM furlow_kv')) {
            return {
              rows: [{
                key: 'expired-key',
                value: '"expired"',
                type: 'string',
                expires_at: expiredTime,
                created_at: Date.now(),
                updated_at: Date.now(),
              }],
            };
          }
          if (query.includes('DELETE FROM furlow_kv WHERE key')) {
            deleteCalled = true;
            return { rowCount: 1 };
          }
          return { rows: [], rowCount: 0 };
        });

        const result = await adapter.get('expired-key');

        expect(result).toBeNull();
        expect(deleteCalled).toBe(true);
      });

      it('should initialize tables on first get', async () => {
        let createTableCalled = false;
        (mockPool.query as ReturnType<typeof vi.fn>).mockImplementation(async (query: string) => {
          if (query.includes('CREATE TABLE IF NOT EXISTS furlow_kv')) {
            createTableCalled = true;
          }
          return { rows: [], rowCount: 0 };
        });

        await adapter.get('any-key');

        expect(createTableCalled).toBe(true);
      });
    });

    describe('set', () => {
      it('should insert or update value', async () => {
        let queryParams: unknown[] = [];
        (mockPool.query as ReturnType<typeof vi.fn>).mockImplementation(async (query: string, params?: unknown[]) => {
          if (query.includes('INSERT INTO furlow_kv')) {
            queryParams = params ?? [];
            return { rowCount: 1 };
          }
          return { rows: [], rowCount: 0 };
        });

        const now = Date.now();
        await adapter.set('test-key', {
          value: { foo: 'bar' },
          type: 'json',
          createdAt: now,
          updatedAt: now,
        });

        expect(queryParams[0]).toBe('test-key');
        expect(queryParams[1]).toBe('{"foo":"bar"}');
        expect(queryParams[2]).toBe('json');
      });

      it('should handle expiration', async () => {
        let queryParams: unknown[] = [];
        const expiresAt = Date.now() + 60000;

        (mockPool.query as ReturnType<typeof vi.fn>).mockImplementation(async (query: string, params?: unknown[]) => {
          if (query.includes('INSERT INTO furlow_kv')) {
            queryParams = params ?? [];
            return { rowCount: 1 };
          }
          return { rows: [], rowCount: 0 };
        });

        await adapter.set('ttl-key', {
          value: 'test',
          type: 'string',
          createdAt: Date.now(),
          updatedAt: Date.now(),
          expiresAt,
        });

        expect(queryParams[3]).toBe(expiresAt);
      });
    });

    describe('delete', () => {
      it('should delete existing key and return true', async () => {
        (mockPool.query as ReturnType<typeof vi.fn>).mockImplementation(async (query: string) => {
          if (query.includes('DELETE FROM furlow_kv WHERE key')) {
            return { rowCount: 1 };
          }
          return { rows: [], rowCount: 0 };
        });

        const result = await adapter.delete('test-key');
        expect(result).toBe(true);
      });

      it('should return false for non-existent key', async () => {
        (mockPool.query as ReturnType<typeof vi.fn>).mockImplementation(async (query: string) => {
          if (query.includes('DELETE FROM furlow_kv WHERE key')) {
            return { rowCount: 0 };
          }
          return { rows: [], rowCount: 0 };
        });

        const result = await adapter.delete('nonexistent');
        expect(result).toBe(false);
      });
    });

    describe('has', () => {
      it('should return true for existing key', async () => {
        (mockPool.query as ReturnType<typeof vi.fn>).mockImplementation(async (query: string) => {
          if (query.includes('SELECT 1 FROM furlow_kv')) {
            return { rows: [{ '?column?': 1 }] };
          }
          return { rows: [], rowCount: 0 };
        });

        const result = await adapter.has('test-key');
        expect(result).toBe(true);
      });

      it('should return false for non-existent key', async () => {
        (mockPool.query as ReturnType<typeof vi.fn>).mockImplementation(async (query: string) => {
          if (query.includes('SELECT 1 FROM furlow_kv')) {
            return { rows: [] };
          }
          return { rows: [], rowCount: 0 };
        });

        const result = await adapter.has('nonexistent');
        expect(result).toBe(false);
      });

      it('should check expiration in query', async () => {
        let queryText = '';
        (mockPool.query as ReturnType<typeof vi.fn>).mockImplementation(async (query: string) => {
          queryText = query;
          return { rows: [], rowCount: 0 };
        });

        await adapter.has('test-key');

        expect(queryText).toContain('expires_at IS NULL OR expires_at >');
      });
    });

    describe('keys', () => {
      it('should return all keys without pattern', async () => {
        (mockPool.query as ReturnType<typeof vi.fn>).mockImplementation(async (query: string) => {
          if (query.includes('SELECT key FROM furlow_kv')) {
            return {
              rows: [
                { key: 'user:1' },
                { key: 'user:2' },
                { key: 'guild:1' },
              ],
            };
          }
          return { rows: [], rowCount: 0 };
        });

        const keys = await adapter.keys();

        expect(keys).toHaveLength(3);
        expect(keys).toContain('user:1');
        expect(keys).toContain('user:2');
        expect(keys).toContain('guild:1');
      });

      it('should filter keys with pattern', async () => {
        let queryParams: unknown[] = [];
        (mockPool.query as ReturnType<typeof vi.fn>).mockImplementation(async (query: string, params?: unknown[]) => {
          if (query.includes('SELECT key FROM furlow_kv') && query.includes('LIKE')) {
            queryParams = params ?? [];
            return {
              rows: [
                { key: 'user:1' },
                { key: 'user:2' },
              ],
            };
          }
          if (query.includes('SELECT key FROM furlow_kv')) {
            return { rows: [] };
          }
          return { rows: [], rowCount: 0 };
        });

        const keys = await adapter.keys('user:*');

        expect(keys).toHaveLength(2);
        expect(queryParams[1]).toBe('user:%');
      });

      it('should convert glob patterns to SQL LIKE', async () => {
        let queryParams: unknown[] = [];
        (mockPool.query as ReturnType<typeof vi.fn>).mockImplementation(async (query: string, params?: unknown[]) => {
          if (query.includes('LIKE')) {
            queryParams = params ?? [];
          }
          return { rows: [], rowCount: 0 };
        });

        await adapter.keys('user:?:*');

        expect(queryParams[1]).toBe('user:_:%');
      });
    });

    describe('clear', () => {
      it('should delete all keys', async () => {
        let deleteCalled = false;
        (mockPool.query as ReturnType<typeof vi.fn>).mockImplementation(async (query: string) => {
          if (query === 'DELETE FROM furlow_kv') {
            deleteCalled = true;
          }
          return { rows: [], rowCount: 0 };
        });

        await adapter.clear();

        expect(deleteCalled).toBe(true);
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
        data: { type: 'json' },
        created: { type: 'timestamp', index: true },
      },
      indexes: [['name', 'email']],
    };

    describe('createTable', () => {
      it('should generate correct SQL for table creation', async () => {
        let createQuery = '';
        (mockPool.query as ReturnType<typeof vi.fn>).mockImplementation(async (query: string) => {
          if (query.includes('CREATE TABLE IF NOT EXISTS "users"')) {
            createQuery = query;
          }
          return { rows: [], rowCount: 0 };
        });

        await adapter.createTable('users', userTableDef);

        // Check that SQL contains all expected column definitions
        // Order may vary depending on object key iteration
        expect(createQuery).toContain('CREATE TABLE IF NOT EXISTS "users"');
        expect(createQuery).toContain('"id" DOUBLE PRECISION PRIMARY KEY');
        expect(createQuery).toContain('"name" TEXT');
        expect(createQuery).toMatch(/"email" TEXT[^,]*UNIQUE/);
        expect(createQuery).toContain('BOOLEAN');
        expect(createQuery).toContain('JSONB');
        expect(createQuery).toContain('BIGINT');
      });

      it('should create indexes', async () => {
        const indexQueries: string[] = [];
        (mockPool.query as ReturnType<typeof vi.fn>).mockImplementation(async (query: string) => {
          if (query.includes('CREATE INDEX IF NOT EXISTS')) {
            indexQueries.push(query);
          }
          return { rows: [], rowCount: 0 };
        });

        await adapter.createTable('users', userTableDef);

        expect(indexQueries.some((q) => q.includes('idx_users_created'))).toBe(true);
        expect(indexQueries.some((q) => q.includes('idx_users_name_email'))).toBe(true);
      });

      it('should not recreate existing table', async () => {
        let createCount = 0;
        (mockPool.query as ReturnType<typeof vi.fn>).mockImplementation(async (query: string) => {
          if (query.includes('CREATE TABLE IF NOT EXISTS "users"')) {
            createCount++;
          }
          return { rows: [], rowCount: 0 };
        });

        await adapter.createTable('users', userTableDef);
        await adapter.createTable('users', userTableDef);

        expect(createCount).toBe(1);
      });
    });

    describe('insert', () => {
      beforeEach(async () => {
        await adapter.createTable('users', userTableDef);
      });

      it('should insert row with correct parameters', async () => {
        let insertParams: unknown[] = [];
        (mockPool.query as ReturnType<typeof vi.fn>).mockImplementation(async (query: string, params?: unknown[]) => {
          if (query.includes('INSERT INTO "users"')) {
            insertParams = params ?? [];
          }
          return { rows: [], rowCount: 1 };
        });

        await adapter.insert('users', { id: 1, name: 'Alice', email: 'alice@test.com' });

        expect(insertParams).toContain(1);
        expect(insertParams).toContain('Alice');
        expect(insertParams).toContain('alice@test.com');
      });

      it('should stringify JSON values', async () => {
        let insertParams: unknown[] = [];
        (mockPool.query as ReturnType<typeof vi.fn>).mockImplementation(async (query: string, params?: unknown[]) => {
          if (query.includes('INSERT INTO "users"')) {
            insertParams = params ?? [];
          }
          return { rows: [], rowCount: 1 };
        });

        await adapter.insert('users', { id: 1, name: 'Alice', email: 'a@test.com', data: { role: 'admin' } });

        expect(insertParams).toContain('{"role":"admin"}');
      });
    });

    describe('update', () => {
      beforeEach(async () => {
        await adapter.createTable('users', userTableDef);
      });

      it('should update matching rows', async () => {
        let updateQuery = '';
        let updateParams: unknown[] = [];
        (mockPool.query as ReturnType<typeof vi.fn>).mockImplementation(async (query: string, params?: unknown[]) => {
          if (query.includes('UPDATE') && query.includes('SET')) {
            updateQuery = query;
            updateParams = params ?? [];
            return { rowCount: 1 };
          }
          return { rows: [], rowCount: 0 };
        });

        const count = await adapter.update('users', { id: 1 }, { name: 'Updated' });

        expect(count).toBe(1);
        expect(updateQuery).toContain('"name" = $1');
        expect(updateQuery).toContain('"id" = $2');
        expect(updateParams).toEqual(['Updated', 1]);
      });

      it('should return count of updated rows', async () => {
        (mockPool.query as ReturnType<typeof vi.fn>).mockImplementation(async (query: string) => {
          if (query.includes('UPDATE "users" SET')) {
            return { rowCount: 5 };
          }
          return { rows: [], rowCount: 0 };
        });

        const count = await adapter.update('users', { active: true }, { active: false });
        expect(count).toBe(5);
      });
    });

    describe('deleteRows', () => {
      beforeEach(async () => {
        await adapter.createTable('users', userTableDef);
      });

      it('should delete matching rows', async () => {
        let deleteQuery = '';
        (mockPool.query as ReturnType<typeof vi.fn>).mockImplementation(async (query: string) => {
          if (query.includes('DELETE FROM') && query.includes('WHERE')) {
            deleteQuery = query;
            return { rowCount: 2 };
          }
          return { rows: [], rowCount: 0 };
        });

        const count = await adapter.deleteRows('users', { active: false });

        expect(count).toBe(2);
        expect(deleteQuery).toContain('"active" = $1');
      });

      it('should return 0 for no matches', async () => {
        (mockPool.query as ReturnType<typeof vi.fn>).mockImplementation(async () => {
          return { rowCount: 0 };
        });

        const count = await adapter.deleteRows('users', { id: 999 });
        expect(count).toBe(0);
      });
    });

    describe('query', () => {
      beforeEach(async () => {
        await adapter.createTable('users', userTableDef);
      });

      it('should query all rows without options', async () => {
        (mockPool.query as ReturnType<typeof vi.fn>).mockImplementation(async (query: string) => {
          if (query.includes('SELECT * FROM "users"')) {
            return {
              rows: [
                { id: 1, name: 'Alice' },
                { id: 2, name: 'Bob' },
              ],
            };
          }
          return { rows: [], rowCount: 0 };
        });

        const result = await adapter.query('users', {});

        expect(result).toHaveLength(2);
      });

      it('should filter with where clause', async () => {
        let queryText = '';
        let queryParams: unknown[] = [];
        (mockPool.query as ReturnType<typeof vi.fn>).mockImplementation(async (query: string, params?: unknown[]) => {
          if (query.includes('SELECT') && query.includes('WHERE')) {
            queryText = query;
            queryParams = params ?? [];
            return { rows: [{ id: 1, name: 'Alice' }] };
          }
          return { rows: [], rowCount: 0 };
        });

        await adapter.query('users', { where: { id: 1 } });

        expect(queryText).toContain('WHERE "id" = $1');
        expect(queryParams).toEqual([1]);
      });

      it('should select specific columns', async () => {
        let queryText = '';
        (mockPool.query as ReturnType<typeof vi.fn>).mockImplementation(async (query: string) => {
          queryText = query;
          return { rows: [] };
        });

        await adapter.query('users', { select: ['name', 'email'] });

        expect(queryText).toContain('SELECT "name", "email" FROM "users"');
      });

      it('should order results', async () => {
        let queryText = '';
        (mockPool.query as ReturnType<typeof vi.fn>).mockImplementation(async (query: string) => {
          queryText = query;
          return { rows: [] };
        });

        await adapter.query('users', { orderBy: 'name DESC' });

        expect(queryText).toContain('ORDER BY "name" DESC');
      });

      it('should limit results', async () => {
        let queryText = '';
        (mockPool.query as ReturnType<typeof vi.fn>).mockImplementation(async (query: string) => {
          queryText = query;
          return { rows: [] };
        });

        await adapter.query('users', { limit: 10 });

        expect(queryText).toContain('LIMIT 10');
      });

      it('should offset results', async () => {
        let queryText = '';
        (mockPool.query as ReturnType<typeof vi.fn>).mockImplementation(async (query: string) => {
          queryText = query;
          return { rows: [] };
        });

        await adapter.query('users', { offset: 5 });

        expect(queryText).toContain('OFFSET 5');
      });

      it('should combine all query options', async () => {
        let queryText = '';
        let queryParams: unknown[] = [];
        (mockPool.query as ReturnType<typeof vi.fn>).mockImplementation(async (query: string, params?: unknown[]) => {
          if (query.includes('SELECT "name", "email"')) {
            queryText = query;
            queryParams = params ?? [];
          }
          return { rows: [] };
        });

        await adapter.query('users', {
          select: ['name', 'email'],
          where: { active: true },
          orderBy: 'name ASC',
          limit: 10,
          offset: 5,
        });

        expect(queryText).toContain('SELECT "name", "email" FROM "users"');
        expect(queryText).toContain('WHERE "active" = $1');
        expect(queryText).toContain('ORDER BY "name" ASC');
        expect(queryText).toContain('LIMIT 10');
        expect(queryText).toContain('OFFSET 5');
        expect(queryParams).toEqual([true]);
      });
    });
  });

  // ==========================================
  // Connection Management
  // ==========================================

  describe('Connection Management', () => {
    describe('close', () => {
      it('should end the pool connection', async () => {
        await adapter.close();
        expect(mockPool.end).toHaveBeenCalled();
      });
    });

    describe('getPool', () => {
      it('should return the underlying pool', () => {
        const pool = adapter.getPool();
        expect(pool).toBeDefined();
        expect(pool).toBe(mockPool);
      });
    });

    describe('lazy initialization', () => {
      it('should not initialize until first operation', async () => {
        // Reset mock to track calls
        vi.clearAllMocks();
        const freshAdapter = createPostgresAdapter({ host: 'localhost' });

        // No queries should have been made yet
        expect(mockPool.query).not.toHaveBeenCalled();

        // Now trigger initialization
        await freshAdapter.get('test');

        // Should have created table
        expect(mockPool.query).toHaveBeenCalled();
      });
    });
  });
});

describe('createPostgresAdapter', () => {
  it('should create adapter with URL', () => {
    const adapter = createPostgresAdapter({ url: 'postgres://localhost/test' });
    expect(adapter).toBeInstanceOf(PostgresAdapter);
  });

  it('should create adapter with config options', () => {
    const adapter = createPostgresAdapter({
      host: 'localhost',
      port: 5432,
      database: 'test',
      user: 'postgres',
      password: 'secret',
    });
    expect(adapter).toBeInstanceOf(PostgresAdapter);
  });

  it('should create adapter with default options', () => {
    const adapter = createPostgresAdapter();
    expect(adapter).toBeInstanceOf(PostgresAdapter);
  });
});
