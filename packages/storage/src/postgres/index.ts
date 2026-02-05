/**
 * PostgreSQL storage adapter
 */

import { Pool, type PoolConfig } from 'pg';
import type { StorageAdapter, StoredValue, QueryOptions, TableDefinition, TableColumn } from '../types.js';

export interface PostgresOptions extends PoolConfig {
  url?: string;
}

/**
 * Escape a PostgreSQL identifier (table/column name) to prevent SQL injection
 */
function escapeIdentifier(name: string): string {
  // Validate identifier - only allow alphanumeric and underscores
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) {
    throw new Error(`Invalid SQL identifier: ${name}`);
  }
  return `"${name}"`;
}

export class PostgresAdapter implements StorageAdapter {
  private pool: Pool;
  private tables: Set<string> = new Set();
  private initialized = false;
  private initPromise: Promise<void> | null = null;

  constructor(options: PostgresOptions = {}) {
    if (options.url) {
      this.pool = new Pool({ connectionString: options.url });
    } else {
      this.pool = new Pool(options);
    }
  }

  private async init(): Promise<void> {
    if (this.initialized) return;

    // Prevent race condition - use a shared promise for concurrent init calls
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = (async () => {
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS furlow_kv (
          key TEXT PRIMARY KEY,
          value JSONB NOT NULL,
          type TEXT NOT NULL,
          expires_at BIGINT,
          created_at BIGINT NOT NULL,
          updated_at BIGINT NOT NULL
        )
      `);

      await this.pool.query(`
        CREATE INDEX IF NOT EXISTS idx_furlow_kv_expires
        ON furlow_kv(expires_at)
        WHERE expires_at IS NOT NULL
      `);

      this.initialized = true;
    })();

    return this.initPromise;
  }

  async get(key: string): Promise<StoredValue | null> {
    await this.init();

    const result = await this.pool.query(
      'SELECT * FROM furlow_kv WHERE key = $1',
      [key]
    );

    if (result.rows.length === 0) return null;

    const row = result.rows[0];

    // Check expiration
    if (row.expires_at && row.expires_at < Date.now()) {
      await this.pool.query('DELETE FROM furlow_kv WHERE key = $1', [key]);
      return null;
    }

    return {
      value: row.value,
      type: row.type,
      expiresAt: row.expires_at ?? undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async set(key: string, value: StoredValue): Promise<void> {
    await this.init();

    await this.pool.query(
      `
      INSERT INTO furlow_kv (key, value, type, expires_at, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (key) DO UPDATE SET
        value = EXCLUDED.value,
        type = EXCLUDED.type,
        expires_at = EXCLUDED.expires_at,
        updated_at = EXCLUDED.updated_at
      `,
      [
        key,
        JSON.stringify(value.value),
        value.type,
        value.expiresAt ?? null,
        value.createdAt,
        value.updatedAt,
      ]
    );
  }

  async delete(key: string): Promise<boolean> {
    await this.init();

    const result = await this.pool.query(
      'DELETE FROM furlow_kv WHERE key = $1',
      [key]
    );
    return (result.rowCount ?? 0) > 0;
  }

  async has(key: string): Promise<boolean> {
    await this.init();

    const result = await this.pool.query(
      'SELECT 1 FROM furlow_kv WHERE key = $1 AND (expires_at IS NULL OR expires_at > $2)',
      [key, Date.now()]
    );
    return result.rows.length > 0;
  }

  async keys(pattern?: string): Promise<string[]> {
    await this.init();

    let query = 'SELECT key FROM furlow_kv WHERE (expires_at IS NULL OR expires_at > $1)';
    const params: (string | number)[] = [Date.now()];

    if (pattern) {
      // Convert glob to SQL LIKE
      const sqlPattern = pattern.replace(/\*/g, '%').replace(/\?/g, '_');
      query += ' AND key LIKE $2';
      params.push(sqlPattern);
    }

    const result = await this.pool.query(query, params);
    return result.rows.map((r) => r.key);
  }

  async clear(): Promise<void> {
    await this.init();
    await this.pool.query('DELETE FROM furlow_kv');
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
          sqlType = 'DOUBLE PRECISION';
          break;
        case 'boolean':
          sqlType = 'BOOLEAN';
          break;
        case 'json':
          sqlType = 'JSONB';
          break;
        case 'timestamp':
          sqlType = 'BIGINT';
          break;
        default:
          sqlType = 'TEXT';
      }

      const escapedColName = escapeIdentifier(colName);
      let colStr = `${escapedColName} ${sqlType}`;

      if (col.primary) {
        colStr += ' PRIMARY KEY';
      }

      if (!col.nullable) {
        colStr += ' NOT NULL';
      }

      if (col.unique) {
        colStr += ' UNIQUE';
      }

      if (col.default !== undefined) {
        // Only allow safe primitive types as defaults to prevent SQL injection
        const defaultType = typeof col.default;
        if (defaultType === 'string') {
          // Use dollar quoting for strings to prevent injection
          colStr += ` DEFAULT $str$${String(col.default)}$str$`;
        } else if (defaultType === 'number' && Number.isFinite(col.default)) {
          colStr += ` DEFAULT ${col.default}`;
        } else if (defaultType === 'boolean') {
          colStr += ` DEFAULT ${col.default ? 'TRUE' : 'FALSE'}`;
        } else if (col.default === null) {
          colStr += ` DEFAULT NULL`;
        }
        // Silently skip complex types (objects, functions) to prevent injection
      }

      columns.push(colStr);

      if (col.index && !col.primary && !col.unique) {
        const escapedTableName = escapeIdentifier(name);
        indexes.push(`CREATE INDEX IF NOT EXISTS "idx_${name}_${colName}" ON ${escapedTableName}(${escapedColName})`);
      }
    }

    if (definition.indexes) {
      for (const idx of definition.indexes) {
        const idxName = `idx_${name}_${idx.join('_')}`;
        const escapedTableName = escapeIdentifier(name);
        const escapedCols = idx.map(c => escapeIdentifier(c)).join(', ');
        indexes.push(`CREATE INDEX IF NOT EXISTS "${idxName}" ON ${escapedTableName}(${escapedCols})`);
      }
    }

    const escapedTableName = escapeIdentifier(name);
    await this.pool.query(`CREATE TABLE IF NOT EXISTS ${escapedTableName} (${columns.join(', ')})`);

    for (const idx of indexes) {
      await this.pool.query(idx);
    }

    this.tables.add(name);
  }

  async insert(table: string, data: Record<string, unknown>): Promise<void> {
    const escapedTable = escapeIdentifier(table);
    const columns = Object.keys(data);
    const escapedColumns = columns.map(c => escapeIdentifier(c)).join(', ');
    const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
    const values = Object.values(data).map((v) =>
      typeof v === 'object' && v !== null ? JSON.stringify(v) : v
    );

    await this.pool.query(
      `INSERT INTO ${escapedTable} (${escapedColumns}) VALUES (${placeholders})`,
      values
    );
  }

  async update(
    table: string,
    where: Record<string, unknown>,
    data: Record<string, unknown>
  ): Promise<number> {
    const escapedTable = escapeIdentifier(table);
    const dataEntries = Object.entries(data);
    const whereEntries = Object.entries(where);

    const setClauses = dataEntries.map(([col], i) => `${escapeIdentifier(col)} = $${i + 1}`);
    const whereClauses = whereEntries.map(
      ([col], i) => `${escapeIdentifier(col)} = $${dataEntries.length + i + 1}`
    );

    const values = [
      ...dataEntries.map(([, v]) =>
        typeof v === 'object' && v !== null ? JSON.stringify(v) : v
      ),
      ...whereEntries.map(([, v]) => v),
    ];

    const result = await this.pool.query(
      `UPDATE ${escapedTable} SET ${setClauses.join(', ')} WHERE ${whereClauses.join(' AND ')}`,
      values
    );

    return result.rowCount ?? 0;
  }

  async deleteRows(table: string, where: Record<string, unknown>): Promise<number> {
    const escapedTable = escapeIdentifier(table);
    const whereEntries = Object.entries(where);
    const whereClauses = whereEntries.map(([col], i) => `${escapeIdentifier(col)} = $${i + 1}`);
    const values = whereEntries.map(([, v]) => v);

    const result = await this.pool.query(
      `DELETE FROM ${escapedTable} WHERE ${whereClauses.join(' AND ')}`,
      values
    );

    return result.rowCount ?? 0;
  }

  async query(table: string, options: QueryOptions): Promise<Record<string, unknown>[]> {
    const escapedTable = escapeIdentifier(table);
    const columns = options.select
      ? options.select.map(c => escapeIdentifier(c)).join(', ')
      : '*';
    let query = `SELECT ${columns} FROM ${escapedTable}`;
    const params: unknown[] = [];
    let paramIndex = 1;

    if (options.where && Object.keys(options.where).length > 0) {
      const whereClauses = Object.keys(options.where).map(
        (col) => `${escapeIdentifier(col)} = $${paramIndex++}`
      );
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

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  async close(): Promise<void> {
    await this.pool.end();
  }

  /**
   * Get the underlying pool
   */
  getPool(): Pool {
    return this.pool;
  }
}

/**
 * Create a PostgreSQL storage adapter
 */
export function createPostgresAdapter(options?: PostgresOptions): PostgresAdapter {
  return new PostgresAdapter(options);
}
