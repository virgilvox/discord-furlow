/**
 * In-memory storage adapter (for testing)
 */

import type { StorageAdapter, StoredValue, QueryOptions, TableDefinition } from '../types.js';

export class MemoryAdapter implements StorageAdapter {
  private store: Map<string, StoredValue> = new Map();
  private tables: Map<string, {
    definition: TableDefinition;
    rows: Record<string, unknown>[];
  }> = new Map();

  async get(key: string): Promise<StoredValue | null> {
    const value = this.store.get(key);
    if (!value) return null;

    // Check expiration
    if (value.expiresAt && value.expiresAt < Date.now()) {
      this.store.delete(key);
      return null;
    }

    return value;
  }

  async set(key: string, value: StoredValue): Promise<void> {
    this.store.set(key, value);
  }

  async delete(key: string): Promise<boolean> {
    return this.store.delete(key);
  }

  async has(key: string): Promise<boolean> {
    const value = this.store.get(key);
    if (!value) return false;

    if (value.expiresAt && value.expiresAt < Date.now()) {
      this.store.delete(key);
      return false;
    }

    return true;
  }

  async keys(pattern?: string): Promise<string[]> {
    const now = Date.now();
    const allKeys: string[] = [];

    for (const [key, value] of this.store) {
      // Skip expired
      if (value.expiresAt && value.expiresAt < now) {
        continue;
      }

      // Match pattern if provided
      if (pattern) {
        // Limit pattern length to prevent ReDoS
        if (pattern.length > 100) {
          console.warn('Pattern too long (max 100 chars), skipping pattern match');
          continue;
        }
        // Escape all regex special characters FIRST, then convert glob wildcards
        // This prevents ReDoS by ensuring the pattern only has simple .* and . wildcards
        const escaped = pattern
          .replace(/[.+^${}()|[\]\\]/g, '\\$&')  // Escape regex special chars
          .replace(/\*/g, '.*')                    // Convert glob * to .*
          .replace(/\?/g, '.');                    // Convert glob ? to .
        const regex = new RegExp('^' + escaped + '$');
        if (!regex.test(key)) {
          continue;
        }
      }

      allKeys.push(key);
    }

    return allKeys;
  }

  async clear(): Promise<void> {
    this.store.clear();
  }

  async createTable(name: string, definition: TableDefinition): Promise<void> {
    if (!this.tables.has(name)) {
      this.tables.set(name, { definition, rows: [] });
    }
  }

  async insert(table: string, data: Record<string, unknown>): Promise<void> {
    const t = this.tables.get(table);
    if (!t) {
      throw new Error(`Table not found: ${table}`);
    }
    t.rows.push({ ...data });
  }

  async update(
    table: string,
    where: Record<string, unknown>,
    data: Record<string, unknown>
  ): Promise<number> {
    const t = this.tables.get(table);
    if (!t) {
      throw new Error(`Table not found: ${table}`);
    }

    let updated = 0;
    for (const row of t.rows) {
      if (this.matchesWhere(row, where)) {
        Object.assign(row, data);
        updated++;
      }
    }

    return updated;
  }

  async deleteRows(table: string, where: Record<string, unknown>): Promise<number> {
    const t = this.tables.get(table);
    if (!t) {
      throw new Error(`Table not found: ${table}`);
    }

    const originalLength = t.rows.length;
    t.rows = t.rows.filter((row) => !this.matchesWhere(row, where));

    return originalLength - t.rows.length;
  }

  async query(table: string, options: QueryOptions): Promise<Record<string, unknown>[]> {
    const t = this.tables.get(table);
    if (!t) {
      throw new Error(`Table not found: ${table}`);
    }

    let results = [...t.rows];

    // Filter by where
    if (options.where) {
      results = results.filter((row) => this.matchesWhere(row, options.where!));
    }

    // Sort
    if (options.orderBy) {
      const [field, dir] = options.orderBy.split(' ');
      const descending = dir?.toLowerCase() === 'desc';
      results.sort((a, b) => {
        const aVal = a[field!] as string | number | boolean | null | undefined;
        const bVal = b[field!] as string | number | boolean | null | undefined;
        if (aVal == null && bVal == null) return 0;
        if (aVal == null) return descending ? -1 : 1;
        if (bVal == null) return descending ? 1 : -1;
        if (aVal < bVal) return descending ? 1 : -1;
        if (aVal > bVal) return descending ? -1 : 1;
        return 0;
      });
    }

    // Offset and limit (with caps to prevent resource exhaustion)
    const MAX_OFFSET = 1000000;
    const MAX_LIMIT = 10000;
    if (options.offset) {
      const offset = Math.min(MAX_OFFSET, Math.max(0, options.offset));
      results = results.slice(offset);
    }
    if (options.limit) {
      const limit = Math.min(MAX_LIMIT, Math.max(0, options.limit));
      results = results.slice(0, limit);
    }

    // Select specific columns
    if (options.select) {
      results = results.map((row) => {
        const selected: Record<string, unknown> = {};
        for (const col of options.select!) {
          selected[col] = row[col];
        }
        return selected;
      });
    }

    return results;
  }

  async close(): Promise<void> {
    this.store.clear();
    this.tables.clear();
  }

  private matchesWhere(
    row: Record<string, unknown>,
    where: Record<string, unknown>
  ): boolean {
    for (const [key, value] of Object.entries(where)) {
      if (row[key] !== value) {
        return false;
      }
    }
    return true;
  }

  /**
   * Get all data (for debugging)
   */
  getAllData(): {
    store: Record<string, StoredValue>;
    tables: Record<string, Record<string, unknown>[]>;
  } {
    return {
      store: Object.fromEntries(this.store),
      tables: Object.fromEntries(
        [...this.tables].map(([name, t]) => [name, t.rows])
      ),
    };
  }
}

/**
 * Create a memory storage adapter
 */
export function createMemoryAdapter(): MemoryAdapter {
  return new MemoryAdapter();
}
