/**
 * Database pipe for reactive database operations
 */

import type {
  Pipe,
  PipeResponse,
  DatabasePipeConfig,
  DatabaseEvent,
  DatabaseEventType,
} from '../types.js';

// Pool type for pg (dynamically imported at runtime)
type PgPool = {
  query: (sql: string, params?: unknown[]) => Promise<{ rows: unknown[]; rowCount: number | null }>;
  end: () => Promise<void>;
};

export interface DatabasePipeOptions {
  name: string;
  config: DatabasePipeConfig;
}

/**
 * Escape a SQL identifier (table/column name) to prevent SQL injection
 */
function escapeIdentifier(name: string): string {
  // Validate identifier - only allow alphanumeric and underscores
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) {
    throw new Error(`Invalid SQL identifier: ${name}`);
  }
  return `"${name}"`;
}

export type DatabaseEventHandler = (event: DatabaseEvent) => void | Promise<void>;

export class DatabasePipe implements Pipe {
  public readonly name: string;
  public readonly type = 'database';
  private config: DatabasePipeConfig;
  private connected = false;
  private db: any = null;
  private eventHandlers: Map<string, DatabaseEventHandler[]> = new Map();

  constructor(options: DatabasePipeOptions) {
    this.name = options.name;
    this.config = options.config;
  }

  /**
   * Connect to the database
   */
  async connect(): Promise<void> {
    if (this.connected) {
      return;
    }

    try {
      if (this.config.adapter === 'sqlite') {
        // Dynamic import to avoid bundling issues
        const BetterSqlite3 = (await import('better-sqlite3')).default;
        const connectionString =
          typeof this.config.connection === 'string'
            ? this.config.connection
            : ':memory:';
        this.db = new BetterSqlite3(connectionString);
      } else if (this.config.adapter === 'postgres') {
        // Dynamic import to avoid bundling issues - use Function constructor to hide from TS
        const pgModuleName = 'pg';
        const pg = await (new Function('m', 'return import(m)')(pgModuleName) as Promise<{ Pool: new (config?: unknown) => PgPool }>).catch(() => null);
        if (!pg) {
          throw new Error('PostgreSQL adapter requires the "pg" package. Install it with: npm install pg');
        }
        const { Pool } = pg;
        const connectionString =
          typeof this.config.connection === 'string'
            ? this.config.connection
            : undefined;
        const connectionOptions =
          typeof this.config.connection === 'object'
            ? this.config.connection
            : undefined;
        this.db = new PostgresWrapper(
          connectionString
            ? new Pool({ connectionString })
            : new Pool(connectionOptions)
        );
      } else if (this.config.adapter === 'memory') {
        // In-memory storage using a simple object
        this.db = new MemoryDatabase();
      } else {
        throw new Error(`Unsupported adapter: ${this.config.adapter}`);
      }

      this.connected = true;
      this.emit('connected', {
        type: 'insert',
        table: '',
        data: {},
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to connect to database: ${message}`);
    }
  }

  /**
   * Disconnect from the database
   */
  async disconnect(): Promise<void> {
    if (!this.connected) {
      return;
    }

    try {
      if (this.config.adapter === 'sqlite' && this.db) {
        this.db.close();
      } else if (this.config.adapter === 'postgres' && this.db) {
        await this.db.close();
      }
      this.db = null;
      this.connected = false;
      this.emit('disconnected', {
        type: 'delete',
        table: '',
        data: {},
      });
    } catch {
      // Ignore close errors
      this.db = null;
      this.connected = false;
    }
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.connected;
  }

  /**
   * Execute a raw SQL query
   */
  async query<T = Record<string, unknown>[]>(
    sql: string,
    params: unknown[] = []
  ): Promise<PipeResponse<T>> {
    if (!this.isConnected()) {
      return { success: false, error: 'Not connected' };
    }

    try {
      if (this.config.adapter === 'sqlite') {
        const stmt = this.db.prepare(sql);
        // Check if it's a SELECT query
        if (sql.trim().toUpperCase().startsWith('SELECT')) {
          const rows = stmt.all(...params);
          return { success: true, data: rows as T };
        } else {
          const result = stmt.run(...params);
          return { success: true, data: result as T };
        }
      } else if (this.config.adapter === 'postgres') {
        const result = await this.db.query(sql, params);
        return { success: true, data: result as T };
      } else if (this.config.adapter === 'memory') {
        const result = this.db.query(sql, params);
        return { success: true, data: result as T };
      }

      return { success: false, error: 'Unsupported adapter' };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: message };
    }
  }

  /**
   * Insert a row into a table
   */
  async insert(
    table: string,
    data: Record<string, unknown>
  ): Promise<PipeResponse<{ lastInsertRowid?: number | bigint }>> {
    if (!this.isConnected()) {
      return { success: false, error: 'Not connected' };
    }

    try {
      const columns = Object.keys(data);
      const values = Object.values(data);
      const placeholders = columns.map(() => '?').join(', ');
      const escapedTable = escapeIdentifier(table);
      const escapedColumns = columns.map(c => escapeIdentifier(c)).join(', ');
      const sql = `INSERT INTO ${escapedTable} (${escapedColumns}) VALUES (${placeholders})`;

      let result: { lastInsertRowid?: number | bigint } = {};

      if (this.config.adapter === 'sqlite') {
        const stmt = this.db.prepare(sql);
        result = stmt.run(...values);
      } else if (this.config.adapter === 'postgres') {
        result = await this.db.insert(table, data);
      } else if (this.config.adapter === 'memory') {
        result = this.db.insert(table, data);
      }

      // Emit insert event
      const event: DatabaseEvent = {
        type: 'insert',
        table,
        data,
      };
      this.emit('insert', event);
      this.emit('change', event);

      return { success: true, data: result };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: message };
    }
  }

  /**
   * Update rows in a table
   */
  async update(
    table: string,
    where: Record<string, unknown>,
    data: Record<string, unknown>
  ): Promise<PipeResponse<{ changes?: number }>> {
    if (!this.isConnected()) {
      return { success: false, error: 'Not connected' };
    }

    try {
      const escapedTable = escapeIdentifier(table);
      const setClauses = Object.keys(data)
        .map((key) => `${escapeIdentifier(key)} = ?`)
        .join(', ');
      const whereClauses = Object.keys(where)
        .map((key) => `${escapeIdentifier(key)} = ?`)
        .join(' AND ');
      const sql = `UPDATE ${escapedTable} SET ${setClauses} WHERE ${whereClauses}`;
      const params = [...Object.values(data), ...Object.values(where)];

      let result: { changes?: number } = {};

      if (this.config.adapter === 'sqlite') {
        const stmt = this.db.prepare(sql);
        result = stmt.run(...params);
      } else if (this.config.adapter === 'postgres') {
        result = await this.db.update(table, where, data);
      } else if (this.config.adapter === 'memory') {
        result = this.db.update(table, where, data);
      }

      // Emit update event
      const event: DatabaseEvent = {
        type: 'update',
        table,
        data,
        oldData: where,
      };
      this.emit('update', event);
      this.emit('change', event);

      return { success: true, data: result };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: message };
    }
  }

  /**
   * Delete rows from a table
   */
  async delete(
    table: string,
    where: Record<string, unknown>
  ): Promise<PipeResponse<{ changes?: number }>> {
    if (!this.isConnected()) {
      return { success: false, error: 'Not connected' };
    }

    try {
      const escapedTable = escapeIdentifier(table);
      const whereClauses = Object.keys(where)
        .map((key) => `${escapeIdentifier(key)} = ?`)
        .join(' AND ');
      const sql = `DELETE FROM ${escapedTable} WHERE ${whereClauses}`;
      const params = Object.values(where);

      let result: { changes?: number } = {};

      if (this.config.adapter === 'sqlite') {
        const stmt = this.db.prepare(sql);
        result = stmt.run(...params);
      } else if (this.config.adapter === 'postgres') {
        result = await this.db.delete(table, where);
      } else if (this.config.adapter === 'memory') {
        result = this.db.delete(table, where);
      }

      // Emit delete event
      const event: DatabaseEvent = {
        type: 'delete',
        table,
        data: where,
      };
      this.emit('delete', event);
      this.emit('change', event);

      return { success: true, data: result };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: message };
    }
  }

  /**
   * Register an event handler
   */
  on(event: DatabaseEventType | 'change' | 'connected' | 'disconnected', handler: DatabaseEventHandler): void {
    const handlers = this.eventHandlers.get(event) ?? [];
    handlers.push(handler);
    this.eventHandlers.set(event, handlers);
  }

  /**
   * Remove an event handler
   */
  off(event: DatabaseEventType | 'change' | 'connected' | 'disconnected', handler: DatabaseEventHandler): void {
    const handlers = this.eventHandlers.get(event) ?? [];
    const index = handlers.indexOf(handler);
    if (index !== -1) {
      handlers.splice(index, 1);
    }
  }

  /**
   * Emit an event
   */
  private emit(event: string, data: DatabaseEvent): void {
    const handlers = this.eventHandlers.get(event) ?? [];
    for (const handler of handlers) {
      try {
        handler(data);
      } catch (error) {
        console.error(`Database handler error for "${event}":`, error);
      }
    }
  }
}

/**
 * Simple in-memory database for testing and development
 * Supports basic SQL operations: SELECT with WHERE, ORDER BY, LIMIT
 *
 * Limitations:
 * - No JOIN support
 * - No complex expressions in WHERE (only simple equality)
 * - No aggregate functions
 * - For production, use SQLite or PostgreSQL
 */
class MemoryDatabase {
  private tables: Map<string, Record<string, unknown>[]> = new Map();
  private autoIncrements: Map<string, number> = new Map();

  query(sql: string, params: unknown[]): Record<string, unknown>[] {
    // Parse SELECT queries with basic WHERE, ORDER BY, LIMIT support
    const selectMatch = sql.match(
      /SELECT\s+(\*|[\w,\s]+)\s+FROM\s+["']?(\w+)["']?(?:\s+WHERE\s+(.+?))?(?:\s+ORDER\s+BY\s+([\w\s,]+?)(?:\s+(ASC|DESC))?)?(?:\s+LIMIT\s+(\d+))?(?:\s+OFFSET\s+(\d+))?$/i
    );

    if (selectMatch) {
      const [, columns, table, whereClause, orderBy, orderDir, limitStr, offsetStr] = selectMatch;
      let rows = [...(this.tables.get(table!) ?? [])];

      // Apply WHERE clause
      if (whereClause) {
        const where = this.parseWhereClause(whereClause, params);
        rows = rows.filter((row) => this.matchesWhere(row, where));
      }

      // Apply ORDER BY
      if (orderBy) {
        const col = orderBy.trim();
        const direction = orderDir?.toUpperCase() === 'DESC' ? -1 : 1;
        rows.sort((a, b) => {
          const aVal = a[col];
          const bVal = b[col];
          if (aVal === bVal) return 0;
          if (aVal === null || aVal === undefined) return direction;
          if (bVal === null || bVal === undefined) return -direction;
          return (aVal < bVal ? -1 : 1) * direction;
        });
      }

      // Apply OFFSET
      if (offsetStr) {
        const offset = parseInt(offsetStr, 10);
        rows = rows.slice(offset);
      }

      // Apply LIMIT
      if (limitStr) {
        const limit = parseInt(limitStr, 10);
        rows = rows.slice(0, limit);
      }

      // Select specific columns if not *
      if (columns !== '*') {
        const cols = columns!.split(',').map((c) => c.trim());
        rows = rows.map((row) => {
          const result: Record<string, unknown> = {};
          for (const col of cols) {
            result[col] = row[col];
          }
          return result;
        });
      }

      return rows;
    }

    // Fallback for unsupported queries
    console.warn(`MemoryDatabase: Unsupported query: ${sql}`);
    return [];
  }

  /**
   * Parse a simple WHERE clause into key-value pairs
   * Supports: col = ? AND col2 = ?
   */
  private parseWhereClause(
    whereClause: string,
    params: unknown[]
  ): Record<string, unknown> {
    const where: Record<string, unknown> = {};
    let paramIndex = 0;

    // Split by AND (case insensitive)
    const conditions = whereClause.split(/\s+AND\s+/i);

    for (const condition of conditions) {
      // Match: column = ? or "column" = ?
      const match = condition.match(/["']?(\w+)["']?\s*=\s*\?/);
      if (match) {
        where[match[1]!] = params[paramIndex++];
      }
    }

    return where;
  }

  insert(table: string, data: Record<string, unknown>): { lastInsertRowid: number } {
    if (!this.tables.has(table)) {
      this.tables.set(table, []);
    }

    const id = (this.autoIncrements.get(table) ?? 0) + 1;
    this.autoIncrements.set(table, id);

    const row = { id, ...data };
    this.tables.get(table)!.push(row);

    return { lastInsertRowid: id };
  }

  update(
    table: string,
    where: Record<string, unknown>,
    data: Record<string, unknown>
  ): { changes: number } {
    const rows = this.tables.get(table) ?? [];
    let changes = 0;

    for (const row of rows) {
      if (this.matchesWhere(row, where)) {
        Object.assign(row, data);
        changes++;
      }
    }

    return { changes };
  }

  delete(table: string, where: Record<string, unknown>): { changes: number } {
    const rows = this.tables.get(table) ?? [];
    const initialLength = rows.length;

    const remaining = rows.filter((row) => !this.matchesWhere(row, where));
    this.tables.set(table, remaining);

    return { changes: initialLength - remaining.length };
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
}

/**
 * PostgreSQL wrapper for consistent interface with other adapters
 */
class PostgresWrapper {
  private pool: PgPool;

  constructor(pool: PgPool) {
    this.pool = pool;
  }

  async query(sql: string, params: unknown[]): Promise<Record<string, unknown>[]> {
    // Convert ? placeholders to $1, $2, etc for pg
    let paramIndex = 0;
    const pgSql = sql.replace(/\?/g, () => `$${++paramIndex}`);
    const result = await this.pool.query(pgSql, params);
    return result.rows as Record<string, unknown>[];
  }

  async insert(
    table: string,
    data: Record<string, unknown>
  ): Promise<{ lastInsertRowid?: number }> {
    const columns = Object.keys(data);
    const values = Object.values(data);
    const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
    const escapedTable = escapeIdentifier(table);
    const escapedColumns = columns.map(c => escapeIdentifier(c)).join(', ');

    const result = await this.pool.query(
      `INSERT INTO ${escapedTable} (${escapedColumns}) VALUES (${placeholders}) RETURNING id`,
      values
    );

    const row = result.rows[0] as Record<string, unknown> | undefined;
    return { lastInsertRowid: row?.id as number | undefined };
  }

  async update(
    table: string,
    where: Record<string, unknown>,
    data: Record<string, unknown>
  ): Promise<{ changes: number }> {
    const escapedTable = escapeIdentifier(table);
    const setClauses = Object.keys(data)
      .map((key, i) => `${escapeIdentifier(key)} = $${i + 1}`)
      .join(', ');
    const whereClauses = Object.keys(where)
      .map((key, i) => `${escapeIdentifier(key)} = $${Object.keys(data).length + i + 1}`)
      .join(' AND ');

    const params = [...Object.values(data), ...Object.values(where)];
    const result = await this.pool.query(
      `UPDATE ${escapedTable} SET ${setClauses} WHERE ${whereClauses}`,
      params
    );

    return { changes: result.rowCount ?? 0 };
  }

  async delete(
    table: string,
    where: Record<string, unknown>
  ): Promise<{ changes: number }> {
    const escapedTable = escapeIdentifier(table);
    const whereClauses = Object.keys(where)
      .map((key, i) => `${escapeIdentifier(key)} = $${i + 1}`)
      .join(' AND ');

    const result = await this.pool.query(
      `DELETE FROM ${escapedTable} WHERE ${whereClauses}`,
      Object.values(where)
    );

    return { changes: result.rowCount ?? 0 };
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}

/**
 * Create a database pipe
 */
export function createDatabasePipe(options: DatabasePipeOptions): DatabasePipe {
  return new DatabasePipe(options);
}
