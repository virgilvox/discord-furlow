/**
 * Database test helpers
 */

import type { StorageAdapter } from '@furlow/storage';

export interface TableData {
  [tableName: string]: Record<string, unknown>[];
}

export interface DatabaseSnapshot {
  tables: TableData;
  keys: Map<string, unknown>;
  timestamp: Date;
}

/**
 * Seed database tables with test data
 */
export async function seedDatabase(
  storage: StorageAdapter,
  data: TableData
): Promise<void> {
  for (const [tableName, rows] of Object.entries(data)) {
    for (const row of rows) {
      await storage.insert(tableName, row);
    }
  }
}

/**
 * Clean up all data from database tables
 */
export async function cleanupDatabase(
  storage: StorageAdapter,
  tableNames: string[]
): Promise<void> {
  for (const tableName of tableNames) {
    try {
      // Delete all rows from the table
      await storage.deleteRows(tableName, {});
    } catch {
      // Table may not exist, ignore
    }
  }
}

/**
 * Take a snapshot of database state for comparison
 */
export async function snapshotDatabase(
  storage: StorageAdapter,
  tableNames: string[]
): Promise<DatabaseSnapshot> {
  const tables: TableData = {};

  for (const tableName of tableNames) {
    try {
      const rows = await storage.query(tableName, {});
      // Deep copy rows to prevent mutation
      tables[tableName] = JSON.parse(JSON.stringify(rows));
    } catch {
      tables[tableName] = [];
    }
  }

  // Get all keys from key-value storage (deep copy values)
  const keys = new Map<string, unknown>();
  const allKeys = await storage.keys('*');
  for (const key of allKeys) {
    const value = await storage.get(key);
    // Deep copy to prevent mutation
    keys.set(key, value !== undefined ? JSON.parse(JSON.stringify(value)) : undefined);
  }

  return {
    tables,
    keys,
    timestamp: new Date(),
  };
}

/**
 * Compare two database snapshots
 */
export function compareSnapshots(
  before: DatabaseSnapshot,
  after: DatabaseSnapshot
): {
  addedRows: TableData;
  removedRows: TableData;
  modifiedRows: TableData;
  addedKeys: string[];
  removedKeys: string[];
  modifiedKeys: string[];
} {
  const addedRows: TableData = {};
  const removedRows: TableData = {};
  const modifiedRows: TableData = {};

  // Compare tables
  const allTables = new Set([
    ...Object.keys(before.tables),
    ...Object.keys(after.tables),
  ]);

  for (const tableName of allTables) {
    const beforeRows = before.tables[tableName] ?? [];
    const afterRows = after.tables[tableName] ?? [];

    const beforeIds = new Set(beforeRows.map((r) => r.id as string));
    const afterIds = new Set(afterRows.map((r) => r.id as string));

    // Find added rows
    const added = afterRows.filter((r) => !beforeIds.has(r.id as string));
    if (added.length > 0) {
      addedRows[tableName] = added;
    }

    // Find removed rows
    const removed = beforeRows.filter((r) => !afterIds.has(r.id as string));
    if (removed.length > 0) {
      removedRows[tableName] = removed;
    }

    // Find modified rows
    const modified: Record<string, unknown>[] = [];
    for (const afterRow of afterRows) {
      const beforeRow = beforeRows.find((r) => r.id === afterRow.id);
      if (beforeRow && JSON.stringify(beforeRow) !== JSON.stringify(afterRow)) {
        modified.push(afterRow);
      }
    }
    if (modified.length > 0) {
      modifiedRows[tableName] = modified;
    }
  }

  // Compare keys
  const beforeKeySet = new Set(before.keys.keys());
  const afterKeySet = new Set(after.keys.keys());

  const addedKeys = [...afterKeySet].filter((k) => !beforeKeySet.has(k));
  const removedKeys = [...beforeKeySet].filter((k) => !afterKeySet.has(k));
  const modifiedKeys = [...afterKeySet].filter((k) => {
    if (!beforeKeySet.has(k)) return false;
    return (
      JSON.stringify(before.keys.get(k)) !== JSON.stringify(after.keys.get(k))
    );
  });

  return {
    addedRows,
    removedRows,
    modifiedRows,
    addedKeys,
    removedKeys,
    modifiedKeys,
  };
}

/**
 * Track database state changes during a test
 */
export class DatabaseTracker {
  private storage: StorageAdapter;
  private tableNames: string[];
  private snapshots: DatabaseSnapshot[] = [];

  constructor(storage: StorageAdapter, tableNames: string[]) {
    this.storage = storage;
    this.tableNames = tableNames;
  }

  /**
   * Take a snapshot of the current state
   */
  async snapshot(): Promise<DatabaseSnapshot> {
    const snap = await snapshotDatabase(this.storage, this.tableNames);
    this.snapshots.push(snap);
    return snap;
  }

  /**
   * Get all snapshots taken
   */
  getSnapshots(): DatabaseSnapshot[] {
    return [...this.snapshots];
  }

  /**
   * Get the changes between the first and last snapshot
   */
  getChanges(): ReturnType<typeof compareSnapshots> | null {
    if (this.snapshots.length < 2) {
      return null;
    }
    return compareSnapshots(
      this.snapshots[0],
      this.snapshots[this.snapshots.length - 1]
    );
  }

  /**
   * Get the changes between two specific snapshots
   */
  getChangesBetween(
    beforeIndex: number,
    afterIndex: number
  ): ReturnType<typeof compareSnapshots> | null {
    if (
      beforeIndex < 0 ||
      afterIndex < 0 ||
      beforeIndex >= this.snapshots.length ||
      afterIndex >= this.snapshots.length
    ) {
      return null;
    }
    return compareSnapshots(
      this.snapshots[beforeIndex],
      this.snapshots[afterIndex]
    );
  }

  /**
   * Reset the tracker
   */
  reset(): void {
    this.snapshots = [];
  }
}

/**
 * Create a database tracker for a test
 */
export function trackDatabaseState(
  storage: StorageAdapter,
  tableNames: string[]
): DatabaseTracker {
  return new DatabaseTracker(storage, tableNames);
}
