/**
 * SQLite storage adapter
 */

import Database from 'better-sqlite3';
import type { StorageAdapter, StoredValue, QueryOptions, TableDefinition, TableColumn } from '../types.js';

export interface SQLiteOptions {
  path?: string;
  memory?: boolean;
  readonly?: boolean;
  verbose?: boolean;
}

/**
 * Escape a SQLite identifier (table/column name) to prevent SQL injection
 */
function escapeIdentifier(name: string): string {
  // Validate identifier - only allow alphanumeric and underscores
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) {
    throw new Error(`Invalid SQL identifier: ${name}`);
  }
  return `"${name}"`;
}

export class SQLiteAdapter implements StorageAdapter {
  private db: Database.Database;
  private tables: Set<string> = new Set();

  constructor(options: SQLiteOptions = {}) {
    const dbPath = options.memory ? ':memory:' : (options.path ?? 'furlow.db');

    const dbOptions: { readonly?: boolean; verbose?: (...args: unknown[]) => void } = {};
    if (options.readonly !== undefined) {
      dbOptions.readonly = options.readonly;
    }
    if (options.verbose) {
      dbOptions.verbose = console.log;
    }

    this.db = new Database(dbPath, dbOptions);

    // Enable WAL mode for better performance
    this.db.pragma('journal_mode = WAL');

    // Create key-value store table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS furlow_kv (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        type TEXT NOT NULL,
        expires_at INTEGER,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )
    `);

    // Create index for expiration
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_furlow_kv_expires
      ON furlow_kv(expires_at)
      WHERE expires_at IS NOT NULL
    `);
  }

  async get(key: string): Promise<StoredValue | null> {
    const row = this.db
      .prepare('SELECT * FROM furlow_kv WHERE key = ?')
      .get(key) as {
        key: string;
        value: string;
        type: string;
        expires_at: number | null;
        created_at: number;
        updated_at: number;
      } | undefined;

    if (!row) return null;

    // Check expiration
    if (row.expires_at && row.expires_at < Date.now()) {
      this.db.prepare('DELETE FROM furlow_kv WHERE key = ?').run(key);
      return null;
    }

    const result: StoredValue = {
      value: JSON.parse(row.value),
      type: row.type,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
    if (row.expires_at != null) {
      result.expiresAt = row.expires_at;
    }
    return result;
  }

  async set(key: string, value: StoredValue): Promise<void> {
    this.db
      .prepare(`
        INSERT OR REPLACE INTO furlow_kv (key, value, type, expires_at, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `)
      .run(
        key,
        JSON.stringify(value.value),
        value.type,
        value.expiresAt ?? null,
        value.createdAt,
        value.updatedAt
      );
  }

  async delete(key: string): Promise<boolean> {
    const result = this.db
      .prepare('DELETE FROM furlow_kv WHERE key = ?')
      .run(key);
    return result.changes > 0;
  }

  async has(key: string): Promise<boolean> {
    const row = this.db
      .prepare('SELECT 1 FROM furlow_kv WHERE key = ? AND (expires_at IS NULL OR expires_at > ?)')
      .get(key, Date.now());
    return !!row;
  }

  async keys(pattern?: string): Promise<string[]> {
    let query = 'SELECT key FROM furlow_kv WHERE (expires_at IS NULL OR expires_at > ?)';
    const params: (string | number)[] = [Date.now()];

    if (pattern) {
      // Convert glob pattern to SQL LIKE
      const sqlPattern = pattern.replace(/\*/g, '%').replace(/\?/g, '_');
      query += ' AND key LIKE ?';
      params.push(sqlPattern);
    }

    const rows = this.db.prepare(query).all(...params) as { key: string }[];
    return rows.map((r) => r.key);
  }

  async clear(): Promise<void> {
    this.db.exec('DELETE FROM furlow_kv');
  }

  async createTable(name: string, definition: TableDefinition): Promise<void> {
    if (this.tables.has(name)) return;

    const columns: string[] = [];
    const indexes: string[] = [];

    for (const [colName, columnDef] of Object.entries(definition.columns)) {
      const col = columnDef as TableColumn;
      let sqlType: string;
      switch (col.type) {
        case 'string':
          sqlType = 'TEXT';
          break;
        case 'number':
          sqlType = 'REAL';
          break;
        case 'boolean':
          sqlType = 'INTEGER';
          break;
        case 'json':
          sqlType = 'TEXT';
          break;
        case 'timestamp':
          sqlType = 'INTEGER';
          break;
        default:
          sqlType = 'TEXT';
      }

      const escapedColName = escapeIdentifier(colName);
      let colDef = `${escapedColName} ${sqlType}`;

      if (col.primary) {
        colDef += ' PRIMARY KEY';
      }

      if (!col.nullable) {
        colDef += ' NOT NULL';
      }

      if (col.unique) {
        colDef += ' UNIQUE';
      }

      if (col.default !== undefined) {
        // Only allow safe primitive types as defaults to prevent SQL injection
        const defaultType = typeof col.default;
        if (defaultType === 'string') {
          // Escape single quotes for SQLite string literals
          const escaped = String(col.default).replace(/'/g, "''");
          colDef += ` DEFAULT '${escaped}'`;
        } else if (defaultType === 'number' && Number.isFinite(col.default)) {
          colDef += ` DEFAULT ${col.default}`;
        } else if (defaultType === 'boolean') {
          colDef += ` DEFAULT ${col.default ? 1 : 0}`;
        } else if (col.default === null) {
          colDef += ` DEFAULT NULL`;
        }
        // Silently skip complex types (objects, functions) to prevent injection
      }

      columns.push(colDef);

      if (col.index && !col.primary && !col.unique) {
        const escapedTableName = escapeIdentifier(name);
        indexes.push(`CREATE INDEX IF NOT EXISTS "idx_${name}_${colName}" ON ${escapedTableName}(${escapedColName})`);
      }
    }

    // Add composite indexes
    if (definition.indexes) {
      for (const idx of definition.indexes) {
        const idxName = `idx_${name}_${idx.join('_')}`;
        const escapedTableName = escapeIdentifier(name);
        const escapedCols = idx.map(c => escapeIdentifier(c)).join(', ');
        indexes.push(`CREATE INDEX IF NOT EXISTS "${idxName}" ON ${escapedTableName}(${escapedCols})`);
      }
    }

    const escapedTableName = escapeIdentifier(name);
    this.db.exec(`CREATE TABLE IF NOT EXISTS ${escapedTableName} (${columns.join(', ')})`);

    for (const idx of indexes) {
      this.db.exec(idx);
    }

    this.tables.add(name);
  }

  async insert(table: string, data: Record<string, unknown>): Promise<void> {
    const escapedTable = escapeIdentifier(table);
    const columns = Object.keys(data);
    const escapedColumns = columns.map(c => escapeIdentifier(c)).join(', ');
    const placeholders = columns.map(() => '?').join(', ');
    const values = columns.map((col) => {
      const val = data[col];
      if (typeof val === 'object' && val !== null) {
        return JSON.stringify(val);
      }
      if (typeof val === 'boolean') {
        return val ? 1 : 0;
      }
      return val;
    });

    this.db
      .prepare(`INSERT INTO ${escapedTable} (${escapedColumns}) VALUES (${placeholders})`)
      .run(...values);
  }

  async update(
    table: string,
    where: Record<string, unknown>,
    data: Record<string, unknown>
  ): Promise<number> {
    const escapedTable = escapeIdentifier(table);
    const setClauses = Object.keys(data).map((col) => `${escapeIdentifier(col)} = ?`);
    const whereClauses = Object.keys(where).map((col) => `${escapeIdentifier(col)} = ?`);

    const values = [
      ...Object.values(data).map((v) =>
        typeof v === 'object' && v !== null ? JSON.stringify(v) :
        typeof v === 'boolean' ? (v ? 1 : 0) : v
      ),
      ...Object.values(where),
    ];

    const result = this.db
      .prepare(`UPDATE ${escapedTable} SET ${setClauses.join(', ')} WHERE ${whereClauses.join(' AND ')}`)
      .run(...values);

    return result.changes;
  }

  async deleteRows(table: string, where: Record<string, unknown>): Promise<number> {
    const escapedTable = escapeIdentifier(table);
    const whereClauses = Object.keys(where).map((col) => `${escapeIdentifier(col)} = ?`);
    const values = Object.values(where);

    const result = this.db
      .prepare(`DELETE FROM ${escapedTable} WHERE ${whereClauses.join(' AND ')}`)
      .run(...values);

    return result.changes;
  }

  async query(table: string, options: QueryOptions): Promise<Record<string, unknown>[]> {
    const escapedTable = escapeIdentifier(table);
    const columns = options.select
      ? options.select.map(c => escapeIdentifier(c)).join(', ')
      : '*';
    let query = `SELECT ${columns} FROM ${escapedTable}`;
    const params: unknown[] = [];

    if (options.where && Object.keys(options.where).length > 0) {
      const whereClauses = Object.keys(options.where).map((col) => `${escapeIdentifier(col)} = ?`);
      query += ` WHERE ${whereClauses.join(' AND ')}`;
      params.push(...Object.values(options.where));
    }

    if (options.orderBy) {
      // Validate and escape orderBy to prevent SQL injection
      const orderMatch = options.orderBy.match(/^([a-zA-Z_][a-zA-Z0-9_]*)(\s+(ASC|DESC))?$/i);
      if (orderMatch) {
        query += ` ORDER BY ${escapeIdentifier(orderMatch[1]!)}${orderMatch[2] ?? ''}`;
      }
    }

    if (options.limit) {
      // Cap limit to prevent resource exhaustion (max 10000 rows)
      const MAX_LIMIT = 10000;
      const limit = Math.min(MAX_LIMIT, Math.max(0, Math.floor(Number(options.limit))));
      query += ` LIMIT ${limit}`;
    }

    if (options.offset) {
      // Cap offset to prevent extreme pagination (max 1 million)
      const MAX_OFFSET = 1000000;
      const offset = Math.min(MAX_OFFSET, Math.max(0, Math.floor(Number(options.offset))));
      query += ` OFFSET ${offset}`;
    }

    return this.db.prepare(query).all(...params) as Record<string, unknown>[];
  }

  async close(): Promise<void> {
    this.db.close();
  }

  /**
   * Run cleanup for expired keys
   */
  cleanup(): number {
    const result = this.db
      .prepare('DELETE FROM furlow_kv WHERE expires_at IS NOT NULL AND expires_at < ?')
      .run(Date.now());
    return result.changes;
  }

  /**
   * Get the underlying database instance
   */
  getDatabase(): Database.Database {
    return this.db;
  }
}

/**
 * Create a SQLite storage adapter
 */
export function createSQLiteAdapter(options?: SQLiteOptions): SQLiteAdapter {
  return new SQLiteAdapter(options);
}
