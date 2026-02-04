/**
 * Database helpers tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  seedDatabase,
  cleanupDatabase,
  snapshotDatabase,
  compareSnapshots,
  trackDatabaseState,
  DatabaseTracker,
} from '../helpers/database.js';
import type { StorageAdapter } from '@furlow/storage';

/**
 * Create a mock storage adapter for testing
 */
function createMockStorage(): StorageAdapter & {
  _tables: Map<string, Record<string, unknown>[]>;
  _kv: Map<string, unknown>;
} {
  const tables = new Map<string, Record<string, unknown>[]>();
  const kv = new Map<string, unknown>();

  return {
    _tables: tables,
    _kv: kv,

    async get(key: string): Promise<unknown> {
      return kv.get(key);
    },

    async set(key: string, value: unknown): Promise<void> {
      kv.set(key, value);
    },

    async delete(key: string): Promise<boolean> {
      return kv.delete(key);
    },

    async has(key: string): Promise<boolean> {
      return kv.has(key);
    },

    async keys(pattern: string): Promise<string[]> {
      const allKeys = [...kv.keys()];
      if (pattern === '*') return allKeys;
      const regex = new RegExp(pattern.replace(/\*/g, '.*'));
      return allKeys.filter((k) => regex.test(k));
    },

    async clear(): Promise<void> {
      kv.clear();
      tables.clear();
    },

    async createTable(name: string): Promise<void> {
      if (!tables.has(name)) {
        tables.set(name, []);
      }
    },

    async insert(table: string, data: Record<string, unknown>): Promise<void> {
      if (!tables.has(table)) {
        tables.set(table, []);
      }
      tables.get(table)!.push({ ...data });
    },

    async update(
      table: string,
      where: Record<string, unknown>,
      data: Record<string, unknown>
    ): Promise<number> {
      const rows = tables.get(table) ?? [];
      let updated = 0;
      for (const row of rows) {
        const matches = Object.entries(where).every(
          ([k, v]) => row[k] === v
        );
        if (matches) {
          Object.assign(row, data);
          updated++;
        }
      }
      return updated;
    },

    async deleteRows(
      table: string,
      where: Record<string, unknown>
    ): Promise<number> {
      if (!tables.has(table)) return 0;
      const rows = tables.get(table)!;
      const initial = rows.length;
      const whereKeys = Object.keys(where);

      if (whereKeys.length === 0) {
        tables.set(table, []);
        return initial;
      }

      const remaining = rows.filter((row) => {
        return !Object.entries(where).every(([k, v]) => row[k] === v);
      });
      tables.set(table, remaining);
      return initial - remaining.length;
    },

    async query(
      table: string,
      _conditions?: Record<string, unknown>
    ): Promise<Record<string, unknown>[]> {
      return tables.get(table) ?? [];
    },

    async close(): Promise<void> {},
  };
}

describe('Database Helpers', () => {
  let storage: ReturnType<typeof createMockStorage>;

  beforeEach(() => {
    storage = createMockStorage();
  });

  describe('seedDatabase', () => {
    it('should insert rows into tables', async () => {
      await seedDatabase(storage, {
        users: [
          { id: '1', name: 'Alice', xp: 100 },
          { id: '2', name: 'Bob', xp: 200 },
        ],
        levels: [{ id: '1', user_id: '1', level: 5 }],
      });

      const users = storage._tables.get('users');
      const levels = storage._tables.get('levels');

      expect(users).toHaveLength(2);
      expect(users![0]).toEqual({ id: '1', name: 'Alice', xp: 100 });
      expect(levels).toHaveLength(1);
    });

    it('should handle empty data', async () => {
      await seedDatabase(storage, {});
      expect(storage._tables.size).toBe(0);
    });
  });

  describe('cleanupDatabase', () => {
    it('should delete all rows from specified tables', async () => {
      storage._tables.set('users', [
        { id: '1', name: 'Alice' },
        { id: '2', name: 'Bob' },
      ]);
      storage._tables.set('levels', [{ id: '1', level: 5 }]);

      await cleanupDatabase(storage, ['users']);

      expect(storage._tables.get('users')).toHaveLength(0);
      expect(storage._tables.get('levels')).toHaveLength(1);
    });

    it('should handle non-existent tables gracefully', async () => {
      await expect(
        cleanupDatabase(storage, ['nonexistent'])
      ).resolves.not.toThrow();
    });
  });

  describe('snapshotDatabase', () => {
    it('should capture table state', async () => {
      storage._tables.set('users', [
        { id: '1', name: 'Alice' },
        { id: '2', name: 'Bob' },
      ]);

      const snapshot = await snapshotDatabase(storage, ['users']);

      expect(snapshot.tables.users).toHaveLength(2);
      expect(snapshot.tables.users[0]).toEqual({ id: '1', name: 'Alice' });
      expect(snapshot.timestamp).toBeInstanceOf(Date);
    });

    it('should capture key-value state', async () => {
      storage._kv.set('counter', 42);
      storage._kv.set('name', 'TestBot');

      const snapshot = await snapshotDatabase(storage, []);

      expect(snapshot.keys.get('counter')).toBe(42);
      expect(snapshot.keys.get('name')).toBe('TestBot');
    });

    it('should handle empty tables', async () => {
      const snapshot = await snapshotDatabase(storage, ['empty']);
      expect(snapshot.tables.empty).toEqual([]);
    });
  });

  describe('compareSnapshots', () => {
    it('should detect added rows', () => {
      const before = {
        tables: { users: [{ id: '1', name: 'Alice' }] },
        keys: new Map(),
        timestamp: new Date(),
      };

      const after = {
        tables: {
          users: [
            { id: '1', name: 'Alice' },
            { id: '2', name: 'Bob' },
          ],
        },
        keys: new Map(),
        timestamp: new Date(),
      };

      const diff = compareSnapshots(before, after);

      expect(diff.addedRows.users).toHaveLength(1);
      expect(diff.addedRows.users[0]).toEqual({ id: '2', name: 'Bob' });
    });

    it('should detect removed rows', () => {
      const before = {
        tables: {
          users: [
            { id: '1', name: 'Alice' },
            { id: '2', name: 'Bob' },
          ],
        },
        keys: new Map(),
        timestamp: new Date(),
      };

      const after = {
        tables: { users: [{ id: '1', name: 'Alice' }] },
        keys: new Map(),
        timestamp: new Date(),
      };

      const diff = compareSnapshots(before, after);

      expect(diff.removedRows.users).toHaveLength(1);
      expect(diff.removedRows.users[0]).toEqual({ id: '2', name: 'Bob' });
    });

    it('should detect modified rows', () => {
      const before = {
        tables: { users: [{ id: '1', name: 'Alice', xp: 100 }] },
        keys: new Map(),
        timestamp: new Date(),
      };

      const after = {
        tables: { users: [{ id: '1', name: 'Alice', xp: 200 }] },
        keys: new Map(),
        timestamp: new Date(),
      };

      const diff = compareSnapshots(before, after);

      expect(diff.modifiedRows.users).toHaveLength(1);
      expect(diff.modifiedRows.users[0].xp).toBe(200);
    });

    it('should detect added keys', () => {
      const before = {
        tables: {},
        keys: new Map([['existing', 'value']]),
        timestamp: new Date(),
      };

      const after = {
        tables: {},
        keys: new Map([
          ['existing', 'value'],
          ['new', 'new-value'],
        ]),
        timestamp: new Date(),
      };

      const diff = compareSnapshots(before, after);

      expect(diff.addedKeys).toContain('new');
    });

    it('should detect removed keys', () => {
      const before = {
        tables: {},
        keys: new Map([
          ['key1', 'value1'],
          ['key2', 'value2'],
        ]),
        timestamp: new Date(),
      };

      const after = {
        tables: {},
        keys: new Map([['key1', 'value1']]),
        timestamp: new Date(),
      };

      const diff = compareSnapshots(before, after);

      expect(diff.removedKeys).toContain('key2');
    });

    it('should detect modified keys', () => {
      const before = {
        tables: {},
        keys: new Map([['counter', 10]]),
        timestamp: new Date(),
      };

      const after = {
        tables: {},
        keys: new Map([['counter', 20]]),
        timestamp: new Date(),
      };

      const diff = compareSnapshots(before, after);

      expect(diff.modifiedKeys).toContain('counter');
    });
  });

  describe('DatabaseTracker', () => {
    it('should track snapshots over time', async () => {
      storage._tables.set('users', [{ id: '1', name: 'Alice' }]);

      const tracker = new DatabaseTracker(storage, ['users']);

      await tracker.snapshot();

      storage._tables.get('users')!.push({ id: '2', name: 'Bob' });

      await tracker.snapshot();

      const snapshots = tracker.getSnapshots();
      expect(snapshots).toHaveLength(2);
      expect(snapshots[0].tables.users).toHaveLength(1);
      expect(snapshots[1].tables.users).toHaveLength(2);
    });

    it('should calculate changes between first and last snapshot', async () => {
      storage._tables.set('users', []);

      const tracker = new DatabaseTracker(storage, ['users']);
      await tracker.snapshot();

      storage._tables.get('users')!.push({ id: '1', name: 'Alice' });
      await tracker.snapshot();

      const changes = tracker.getChanges();

      expect(changes).not.toBeNull();
      expect(changes!.addedRows.users).toHaveLength(1);
    });

    it('should return null for changes with less than 2 snapshots', async () => {
      const tracker = new DatabaseTracker(storage, ['users']);

      expect(tracker.getChanges()).toBeNull();

      await tracker.snapshot();
      expect(tracker.getChanges()).toBeNull();
    });

    it('should calculate changes between specific snapshots', async () => {
      storage._tables.set('users', []);

      const tracker = new DatabaseTracker(storage, ['users']);

      await tracker.snapshot(); // 0: empty

      storage._tables.get('users')!.push({ id: '1', name: 'Alice' });
      await tracker.snapshot(); // 1: Alice

      storage._tables.get('users')!.push({ id: '2', name: 'Bob' });
      await tracker.snapshot(); // 2: Alice, Bob

      const changes01 = tracker.getChangesBetween(0, 1);
      expect(changes01!.addedRows.users).toHaveLength(1);

      const changes12 = tracker.getChangesBetween(1, 2);
      expect(changes12!.addedRows.users).toHaveLength(1);
      expect(changes12!.addedRows.users[0]).toEqual({ id: '2', name: 'Bob' });
    });

    it('should return null for invalid snapshot indices', async () => {
      const tracker = new DatabaseTracker(storage, ['users']);
      await tracker.snapshot();

      expect(tracker.getChangesBetween(-1, 0)).toBeNull();
      expect(tracker.getChangesBetween(0, 5)).toBeNull();
    });

    it('should reset snapshots', async () => {
      const tracker = new DatabaseTracker(storage, ['users']);
      await tracker.snapshot();
      await tracker.snapshot();

      expect(tracker.getSnapshots()).toHaveLength(2);

      tracker.reset();
      expect(tracker.getSnapshots()).toHaveLength(0);
    });
  });

  describe('trackDatabaseState', () => {
    it('should create a DatabaseTracker instance', () => {
      const tracker = trackDatabaseState(storage, ['users', 'levels']);

      expect(tracker).toBeInstanceOf(DatabaseTracker);
    });
  });
});
