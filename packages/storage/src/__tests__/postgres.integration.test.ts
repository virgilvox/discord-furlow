/**
 * PostgreSQL Storage Adapter Integration Tests
 *
 * Uses testcontainers to run tests against a real PostgreSQL database.
 * These tests verify actual database behavior, not mocked internals.
 *
 * NOTE: These tests require Docker to be running.
 * Run with: INTEGRATION_TESTS=true pnpm vitest run postgres.integration.test.ts
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';

// Only run integration tests when explicitly enabled
const SKIP_INTEGRATION = process.env.INTEGRATION_TESTS !== 'true';

// Use describe.skipIf to skip all tests when Docker/integration not enabled
describe.skipIf(SKIP_INTEGRATION)('PostgresAdapter Integration Tests', async () => {
  // Dynamic imports to avoid loading testcontainers when skipped
  const { PostgreSqlContainer } = await import('@testcontainers/postgresql');
  const { createPostgresAdapter, PostgresAdapter } = await import('../postgres/index.js');

  type StartedPostgreSqlContainer = Awaited<ReturnType<InstanceType<typeof PostgreSqlContainer>['start']>>;

  // Timeout for container startup
  const CONTAINER_TIMEOUT = 60000;

  let container: StartedPostgreSqlContainer;
  let adapter: InstanceType<typeof PostgresAdapter>;

  beforeAll(async () => {
    container = await new PostgreSqlContainer('postgres:15-alpine')
      .withStartupTimeout(CONTAINER_TIMEOUT)
      .start();

    adapter = createPostgresAdapter({
      host: container.getHost(),
      port: container.getPort(),
      database: container.getDatabase(),
      user: container.getUsername(),
      password: container.getPassword(),
    });
  }, CONTAINER_TIMEOUT + 10000);

  afterAll(async () => {
    if (adapter) {
      await adapter.close();
    }
    if (container) {
      await container.stop();
    }
  });

  beforeEach(async () => {
    // Clear all data before each test
    if (adapter) {
      await adapter.clear();
    }
  });

  describe('Key-Value Operations', () => {
    describe('Basic CRUD', () => {
      it('should set and get a string value', async () => {
        const now = Date.now();
        await adapter.set('test-key', {
          value: 'test-value',
          type: 'string',
          createdAt: now,
          updatedAt: now,
        });

        const result = await adapter.get('test-key');

        expect(result).not.toBeNull();
        expect(result?.value).toBe('test-value');
        expect(result?.type).toBe('string');
      });

      it('should set and get a JSON object', async () => {
        const now = Date.now();
        const data = { name: 'Alice', roles: ['admin', 'user'], nested: { level: 1 } };

        await adapter.set('json-key', {
          value: data,
          type: 'json',
          createdAt: now,
          updatedAt: now,
        });

        const result = await adapter.get('json-key');

        expect(result).not.toBeNull();
        expect(result?.value).toEqual(data);
        expect(result?.type).toBe('json');
      });

      it('should set and get a number value', async () => {
        const now = Date.now();
        await adapter.set('number-key', {
          value: 42.5,
          type: 'number',
          createdAt: now,
          updatedAt: now,
        });

        const result = await adapter.get('number-key');

        expect(result?.value).toBe(42.5);
        expect(result?.type).toBe('number');
      });

      it('should set and get a boolean value', async () => {
        const now = Date.now();
        await adapter.set('bool-key', {
          value: true,
          type: 'boolean',
          createdAt: now,
          updatedAt: now,
        });

        const result = await adapter.get('bool-key');

        expect(result?.value).toBe(true);
        expect(result?.type).toBe('boolean');
      });

      it('should return null for non-existent key', async () => {
        const result = await adapter.get('non-existent');
        expect(result).toBeNull();
      });

      it('should update existing key', async () => {
        const now = Date.now();
        await adapter.set('update-key', {
          value: 'original',
          type: 'string',
          createdAt: now,
          updatedAt: now,
        });

        await adapter.set('update-key', {
          value: 'updated',
          type: 'string',
          createdAt: now,
          updatedAt: now + 1000,
        });

        const result = await adapter.get('update-key');
        expect(result?.value).toBe('updated');
      });

      it('should delete existing key', async () => {
        const now = Date.now();
        await adapter.set('delete-key', {
          value: 'to-delete',
          type: 'string',
          createdAt: now,
          updatedAt: now,
        });

        const deleted = await adapter.delete('delete-key');
        expect(deleted).toBe(true);

        const result = await adapter.get('delete-key');
        expect(result).toBeNull();
      });

      it('should return false when deleting non-existent key', async () => {
        const deleted = await adapter.delete('non-existent');
        expect(deleted).toBe(false);
      });
    });

    describe('has()', () => {
      it('should return true for existing key', async () => {
        const now = Date.now();
        await adapter.set('exists-key', {
          value: 'exists',
          type: 'string',
          createdAt: now,
          updatedAt: now,
        });

        const exists = await adapter.has('exists-key');
        expect(exists).toBe(true);
      });

      it('should return false for non-existent key', async () => {
        const exists = await adapter.has('non-existent');
        expect(exists).toBe(false);
      });
    });

    describe('TTL Expiration', () => {
      it('should set value with expiration', async () => {
        const now = Date.now();
        const expiresAt = now + 60000; // 1 minute from now

        await adapter.set('ttl-key', {
          value: 'expires-soon',
          type: 'string',
          createdAt: now,
          updatedAt: now,
          expiresAt,
        });

        const result = await adapter.get('ttl-key');
        expect(result?.value).toBe('expires-soon');
        expect(result?.expiresAt).toBe(expiresAt);
      });

      it('should return null and delete expired value', async () => {
        const now = Date.now();
        const expiredTime = now - 1000; // Already expired

        // Directly insert an expired value
        const pool = adapter.getPool();
        await pool.query(
          `INSERT INTO furlow_kv (key, value, type, expires_at, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          ['expired-key', '"expired-value"', 'string', expiredTime, now, now]
        );

        // Getting it should return null and delete it
        const result = await adapter.get('expired-key');
        expect(result).toBeNull();

        // Verify it was deleted
        const checkResult = await pool.query(
          'SELECT * FROM furlow_kv WHERE key = $1',
          ['expired-key']
        );
        expect(checkResult.rows).toHaveLength(0);
      });

      it('should not include expired keys in has()', async () => {
        const now = Date.now();
        const expiredTime = now - 1000;

        const pool = adapter.getPool();
        await pool.query(
          `INSERT INTO furlow_kv (key, value, type, expires_at, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          ['expired-has', '"value"', 'string', expiredTime, now, now]
        );

        const exists = await adapter.has('expired-has');
        expect(exists).toBe(false);
      });
    });

    describe('keys()', () => {
      beforeEach(async () => {
        const now = Date.now();
        // Insert test data
        await adapter.set('user:1:name', { value: 'Alice', type: 'string', createdAt: now, updatedAt: now });
        await adapter.set('user:2:name', { value: 'Bob', type: 'string', createdAt: now, updatedAt: now });
        await adapter.set('user:1:email', { value: 'alice@test.com', type: 'string', createdAt: now, updatedAt: now });
        await adapter.set('guild:1:name', { value: 'Test Guild', type: 'string', createdAt: now, updatedAt: now });
      });

      it('should return all keys without pattern', async () => {
        const keys = await adapter.keys();

        expect(keys).toHaveLength(4);
        expect(keys).toContain('user:1:name');
        expect(keys).toContain('user:2:name');
        expect(keys).toContain('user:1:email');
        expect(keys).toContain('guild:1:name');
      });

      it('should filter keys with wildcard pattern', async () => {
        const keys = await adapter.keys('user:*');

        expect(keys).toHaveLength(3);
        expect(keys).toContain('user:1:name');
        expect(keys).toContain('user:2:name');
        expect(keys).toContain('user:1:email');
        expect(keys).not.toContain('guild:1:name');
      });

      it('should filter keys with single character wildcard', async () => {
        const keys = await adapter.keys('user:?:name');

        expect(keys).toHaveLength(2);
        expect(keys).toContain('user:1:name');
        expect(keys).toContain('user:2:name');
      });

      it('should not include expired keys', async () => {
        const now = Date.now();
        const pool = adapter.getPool();
        await pool.query(
          `INSERT INTO furlow_kv (key, value, type, expires_at, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          ['user:expired:name', '"Expired"', 'string', now - 1000, now, now]
        );

        const keys = await adapter.keys('user:*');
        expect(keys).not.toContain('user:expired:name');
      });
    });

    describe('clear()', () => {
      it('should delete all keys', async () => {
        const now = Date.now();
        await adapter.set('key1', { value: 'a', type: 'string', createdAt: now, updatedAt: now });
        await adapter.set('key2', { value: 'b', type: 'string', createdAt: now, updatedAt: now });
        await adapter.set('key3', { value: 'c', type: 'string', createdAt: now, updatedAt: now });

        await adapter.clear();

        const keys = await adapter.keys();
        expect(keys).toHaveLength(0);
      });
    });
  });

  describe('Table Operations', () => {
    const userTableDef = {
      columns: {
        id: { type: 'number' as const, primary: true },
        name: { type: 'string' as const },
        email: { type: 'string' as const, unique: true },
        active: { type: 'boolean' as const, default: true },
        data: { type: 'json' as const },
        created_at: { type: 'timestamp' as const, index: true },
      },
      indexes: [['name', 'email']] as [string, string][],
    };

    beforeEach(async () => {
      // Drop the users table if it exists for a clean slate
      const pool = adapter.getPool();
      await pool.query('DROP TABLE IF EXISTS "users"');
      // Reset internal table tracking
      (adapter as any).tables = new Set();
    });

    describe('createTable', () => {
      it('should create a table with correct schema', async () => {
        await adapter.createTable('users', userTableDef);

        // Verify table exists by inserting a row
        await adapter.insert('users', {
          id: 1,
          name: 'Alice',
          email: 'alice@test.com',
          active: true,
          data: { role: 'admin' },
          created_at: Date.now(),
        });

        const rows = await adapter.query('users', { where: { id: 1 } });
        expect(rows).toHaveLength(1);
        expect(rows[0]!.name).toBe('Alice');
      });

      it('should enforce unique constraint', async () => {
        await adapter.createTable('users', userTableDef);

        await adapter.insert('users', {
          id: 1,
          name: 'Alice',
          email: 'alice@test.com',
        });

        // Try to insert duplicate email
        await expect(
          adapter.insert('users', {
            id: 2,
            name: 'Bob',
            email: 'alice@test.com', // Same email
          })
        ).rejects.toThrow();
      });

      it('should enforce primary key constraint', async () => {
        await adapter.createTable('users', userTableDef);

        await adapter.insert('users', { id: 1, name: 'Alice', email: 'alice@test.com' });

        await expect(
          adapter.insert('users', { id: 1, name: 'Bob', email: 'bob@test.com' })
        ).rejects.toThrow();
      });

      it('should not recreate existing table', async () => {
        await adapter.createTable('users', userTableDef);
        await adapter.insert('users', { id: 1, name: 'Alice', email: 'alice@test.com' });

        // Calling createTable again should not drop data
        await adapter.createTable('users', userTableDef);

        const rows = await adapter.query('users', {});
        expect(rows).toHaveLength(1);
      });
    });

    describe('insert', () => {
      beforeEach(async () => {
        await adapter.createTable('users', userTableDef);
      });

      it('should insert row with all fields', async () => {
        const now = Date.now();
        await adapter.insert('users', {
          id: 1,
          name: 'Alice',
          email: 'alice@test.com',
          active: true,
          data: { role: 'admin', permissions: ['read', 'write'] },
          created_at: now,
        });

        const rows = await adapter.query('users', { where: { id: 1 } });
        expect(rows).toHaveLength(1);
        expect(rows[0]).toMatchObject({
          id: 1,
          name: 'Alice',
          email: 'alice@test.com',
          active: true,
        });
        // JSON is returned as object
        expect(rows[0]!.data).toEqual({ role: 'admin', permissions: ['read', 'write'] });
      });

      it('should insert multiple rows', async () => {
        await adapter.insert('users', { id: 1, name: 'Alice', email: 'alice@test.com' });
        await adapter.insert('users', { id: 2, name: 'Bob', email: 'bob@test.com' });
        await adapter.insert('users', { id: 3, name: 'Charlie', email: 'charlie@test.com' });

        const rows = await adapter.query('users', {});
        expect(rows).toHaveLength(3);
      });
    });

    describe('update', () => {
      beforeEach(async () => {
        await adapter.createTable('users', userTableDef);
        await adapter.insert('users', { id: 1, name: 'Alice', email: 'alice@test.com', active: true });
        await adapter.insert('users', { id: 2, name: 'Bob', email: 'bob@test.com', active: true });
        await adapter.insert('users', { id: 3, name: 'Charlie', email: 'charlie@test.com', active: false });
      });

      it('should update matching rows', async () => {
        const count = await adapter.update('users', { id: 1 }, { name: 'Alicia' });

        expect(count).toBe(1);

        const rows = await adapter.query('users', { where: { id: 1 } });
        expect(rows[0]!.name).toBe('Alicia');
      });

      it('should update multiple rows with matching condition', async () => {
        const count = await adapter.update('users', { active: true }, { active: false });

        expect(count).toBe(2);

        const rows = await adapter.query('users', { where: { active: true } });
        expect(rows).toHaveLength(0);
      });

      it('should return 0 for no matches', async () => {
        const count = await adapter.update('users', { id: 999 }, { name: 'Nobody' });
        expect(count).toBe(0);
      });
    });

    describe('deleteRows', () => {
      beforeEach(async () => {
        await adapter.createTable('users', userTableDef);
        await adapter.insert('users', { id: 1, name: 'Alice', email: 'alice@test.com', active: true });
        await adapter.insert('users', { id: 2, name: 'Bob', email: 'bob@test.com', active: true });
        await adapter.insert('users', { id: 3, name: 'Charlie', email: 'charlie@test.com', active: false });
      });

      it('should delete matching rows', async () => {
        const count = await adapter.deleteRows('users', { id: 1 });

        expect(count).toBe(1);

        const rows = await adapter.query('users', {});
        expect(rows).toHaveLength(2);
      });

      it('should delete multiple matching rows', async () => {
        const count = await adapter.deleteRows('users', { active: true });

        expect(count).toBe(2);

        const rows = await adapter.query('users', {});
        expect(rows).toHaveLength(1);
      });

      it('should return 0 for no matches', async () => {
        const count = await adapter.deleteRows('users', { id: 999 });
        expect(count).toBe(0);
      });
    });

    describe('query', () => {
      beforeEach(async () => {
        await adapter.createTable('users', userTableDef);
        await adapter.insert('users', { id: 1, name: 'Alice', email: 'alice@test.com', active: true, created_at: 1000 });
        await adapter.insert('users', { id: 2, name: 'Bob', email: 'bob@test.com', active: true, created_at: 2000 });
        await adapter.insert('users', { id: 3, name: 'Charlie', email: 'charlie@test.com', active: false, created_at: 3000 });
      });

      it('should query all rows', async () => {
        const rows = await adapter.query('users', {});
        expect(rows).toHaveLength(3);
      });

      it('should filter with where clause', async () => {
        const rows = await adapter.query('users', { where: { active: true } });
        expect(rows).toHaveLength(2);
        expect(rows.every((r) => r.active === true)).toBe(true);
      });

      it('should select specific columns', async () => {
        const rows = await adapter.query('users', { select: ['name', 'email'] });

        expect(rows).toHaveLength(3);
        expect(rows[0]).toHaveProperty('name');
        expect(rows[0]).toHaveProperty('email');
        expect(rows[0]).not.toHaveProperty('id');
        expect(rows[0]).not.toHaveProperty('active');
      });

      it('should order results ascending', async () => {
        const rows = await adapter.query('users', { orderBy: 'name ASC' });

        expect(rows[0]!.name).toBe('Alice');
        expect(rows[1]!.name).toBe('Bob');
        expect(rows[2]!.name).toBe('Charlie');
      });

      it('should order results descending', async () => {
        const rows = await adapter.query('users', { orderBy: 'created_at DESC' });

        expect(rows[0]!.name).toBe('Charlie');
        expect(rows[1]!.name).toBe('Bob');
        expect(rows[2]!.name).toBe('Alice');
      });

      it('should limit results', async () => {
        const rows = await adapter.query('users', { limit: 2 });
        expect(rows).toHaveLength(2);
      });

      it('should offset results', async () => {
        const rows = await adapter.query('users', { orderBy: 'id ASC', offset: 1 });

        expect(rows).toHaveLength(2);
        expect(rows[0]!.id).toBe(2);
      });

      it('should combine all query options', async () => {
        const rows = await adapter.query('users', {
          select: ['name'],
          where: { active: true },
          orderBy: 'name DESC',
          limit: 1,
          offset: 0,
        });

        expect(rows).toHaveLength(1);
        expect(rows[0]).toEqual({ name: 'Bob' });
      });
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle concurrent key-value writes', async () => {
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

      // Pre-populate some data
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

      // Should complete without errors
      const results = await Promise.all(operations);
      expect(results.length).toBe(30);
    });

    it('should handle concurrent table operations', async () => {
      await adapter.createTable('items', {
        columns: {
          id: { type: 'number', primary: true },
          value: { type: 'string' },
        },
      });

      // Concurrent inserts
      const inserts = Array(20).fill(null).map((_, i) =>
        adapter.insert('items', { id: i, value: `item-${i}` })
      );

      await Promise.all(inserts);

      const rows = await adapter.query('items', {});
      expect(rows).toHaveLength(20);
    });
  });

  describe('Edge Cases', () => {
    it('should handle unicode in values', async () => {
      const now = Date.now();
      await adapter.set('unicode-key', {
        value: { message: '你好世界 🎉 مرحبا' },
        type: 'json',
        createdAt: now,
        updatedAt: now,
      });

      const result = await adapter.get('unicode-key');
      expect(result?.value).toEqual({ message: '你好世界 🎉 مرحبا' });
    });

    it('should handle very long strings', async () => {
      const now = Date.now();
      const longString = 'x'.repeat(100000);

      await adapter.set('long-key', {
        value: longString,
        type: 'string',
        createdAt: now,
        updatedAt: now,
      });

      const result = await adapter.get('long-key');
      expect(result?.value).toBe(longString);
    });

    it('should handle special characters in keys', async () => {
      const now = Date.now();
      const key = 'test:key:with:colons:and/slashes';

      await adapter.set(key, {
        value: 'special',
        type: 'string',
        createdAt: now,
        updatedAt: now,
      });

      const result = await adapter.get(key);
      expect(result?.value).toBe('special');
    });

    it('should handle null values in JSON', async () => {
      const now = Date.now();
      await adapter.set('null-json', {
        value: { field: null, nested: { inner: null } },
        type: 'json',
        createdAt: now,
        updatedAt: now,
      });

      const result = await adapter.get('null-json');
      expect(result?.value).toEqual({ field: null, nested: { inner: null } });
    });

    it('should handle empty arrays and objects', async () => {
      const now = Date.now();
      await adapter.set('empty-json', {
        value: { array: [], object: {} },
        type: 'json',
        createdAt: now,
        updatedAt: now,
      });

      const result = await adapter.get('empty-json');
      expect(result?.value).toEqual({ array: [], object: {} });
    });

    it('should handle deeply nested JSON', async () => {
      const now = Date.now();
      let nested: any = { value: 'deep' };
      for (let i = 0; i < 50; i++) {
        nested = { level: i, nested };
      }

      await adapter.set('deep-json', {
        value: nested,
        type: 'json',
        createdAt: now,
        updatedAt: now,
      });

      const result = await adapter.get('deep-json');
      expect(result?.value).toEqual(nested);
    });

    it('should reject invalid table names', async () => {
      await expect(
        adapter.createTable('users; DROP TABLE--', {
          columns: { id: { type: 'number', primary: true } },
        })
      ).rejects.toThrow();
    });

    it('should reject invalid column names', async () => {
      await expect(
        adapter.createTable('safe_table', {
          columns: { 'id; DROP TABLE--': { type: 'number', primary: true } },
        })
      ).rejects.toThrow();
    });
  });

  describe('Connection Management', () => {
    it('should handle multiple sequential operations', async () => {
      const now = Date.now();

      // Many sequential operations
      for (let i = 0; i < 100; i++) {
        await adapter.set(`seq-${i}`, {
          value: i,
          type: 'number',
          createdAt: now,
          updatedAt: now,
        });
        await adapter.get(`seq-${i}`);
      }

      const keys = await adapter.keys('seq-*');
      expect(keys).toHaveLength(100);
    });
  });
});
