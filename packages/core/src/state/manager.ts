/**
 * State manager - manages variables, tables, and caches
 */

import type { StateScope, VariableDefinition, TableDefinition } from '@furlow/schema';
import type { StateKey, StoredValue, StorageAdapter, CacheEntry } from './types.js';
import { buildStorageKey, validateScopeContext } from './scopes.js';
import { StateVariableNotFoundError } from '../errors/index.js';

export interface StateManagerOptions {
  /** Default TTL for cache entries in ms */
  defaultCacheTTL?: number;
  /** Maximum cache size */
  maxCacheSize?: number;
}

const DEFAULT_OPTIONS: Required<StateManagerOptions> = {
  defaultCacheTTL: 300000, // 5 minutes
  maxCacheSize: 10000,
};

export class StateManager {
  private storage: StorageAdapter;
  private variables: Map<string, VariableDefinition> = new Map();
  private tables: Map<string, TableDefinition> = new Map();
  private cache: Map<string, CacheEntry> = new Map();
  private options: Required<StateManagerOptions>;
  private locks: Map<string, Promise<void>> = new Map();
  private closed = false;

  constructor(storage: StorageAdapter, options: StateManagerOptions = {}) {
    this.storage = storage;
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * Acquire a lock for a key to prevent race conditions
   */
  private async acquireLock(key: string): Promise<() => void> {
    // Wait for any existing lock
    while (this.locks.has(key)) {
      await this.locks.get(key);
    }

    // Create a new lock
    let releaseLock: () => void;
    const lockPromise = new Promise<void>((resolve) => {
      releaseLock = resolve;
    });
    this.locks.set(key, lockPromise);

    return () => {
      this.locks.delete(key);
      releaseLock!();
    };
  }

  /**
   * Register variable definitions
   */
  registerVariables(variables: Record<string, VariableDefinition>): void {
    for (const [name, def] of Object.entries(variables)) {
      this.variables.set(name, def);
    }
  }

  /**
   * Register table definitions
   */
  async registerTables(tables: Record<string, TableDefinition>): Promise<void> {
    for (const [name, def] of Object.entries(tables)) {
      this.tables.set(name, def);
      await this.storage.createTable(name, def);
    }
  }

  /**
   * Get a variable value
   */
  async get<T = unknown>(
    name: string,
    context: { guildId?: string; channelId?: string; userId?: string }
  ): Promise<T | undefined> {
    const def = this.variables.get(name);
    const scope = def?.scope ?? 'guild';

    if (!validateScopeContext(scope, context)) {
      throw new Error(`Invalid context for scope "${scope}"`);
    }

    const key = buildStorageKey({
      name,
      scope,
      guildId: context.guildId,
      channelId: context.channelId,
      userId: context.userId,
    });

    // Check cache first
    const cached = this.cache.get(key);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.value as T;
    }

    // Get from storage
    const stored = await this.storage.get(key);

    if (!stored) {
      // Return default if defined
      return def?.default as T | undefined;
    }

    // Check expiration
    if (stored.expiresAt && stored.expiresAt < Date.now()) {
      await this.storage.delete(key);
      return def?.default as T | undefined;
    }

    return stored.value as T;
  }

  /**
   * Set a variable value. The optional third-argument `options.ttl`
   * overrides any TTL declared on the variable definition. Values pass
   * through `parseDuration`; numbers are treated as milliseconds.
   */
  async set(
    name: string,
    value: unknown,
    context: { guildId?: string; channelId?: string; userId?: string },
    options: { ttl?: string | number } = {}
  ): Promise<void> {
    const def = this.variables.get(name);
    const scope = def?.scope ?? 'guild';

    if (!validateScopeContext(scope, context)) {
      throw new Error(`Invalid context for scope "${scope}"`);
    }

    const key = buildStorageKey({
      name,
      scope,
      guildId: context.guildId,
      channelId: context.channelId,
      userId: context.userId,
    });

    const now = Date.now();
    const stored: StoredValue = {
      value,
      type: typeof value,
      createdAt: now,
      updatedAt: now,
    };

    // Per-call TTL wins; fall back to the variable definition's TTL.
    const ttlSource = options.ttl ?? def?.ttl;
    let effectiveTtlMs: number | undefined;
    if (ttlSource !== undefined && ttlSource !== null) {
      const ttlMs = typeof ttlSource === 'number' ? ttlSource : parseDuration(ttlSource);
      if (ttlMs > 0) {
        stored.expiresAt = now + ttlMs;
        effectiveTtlMs = ttlMs;
      }
    }

    // Save to storage if persistent
    if (def?.persist !== false) {
      await this.storage.set(key, stored);
    }

    // Update cache. When a storage-level TTL applies, pass the same TTL to
    // the in-memory cache so reads do not see stale values after storage
    // expiration.
    this.updateCache(key, value, effectiveTtlMs);
  }

  /**
   * Raw key/value set bypassing variable-definition lookup. Used by
   * infrastructure that manages its own key namespace (cooldowns, M5). The
   * `ttlMs` is required; pass 0 for no expiration.
   */
  async setRaw(key: string, value: unknown, ttlMs: number = 0): Promise<void> {
    const now = Date.now();
    const stored: StoredValue = {
      value,
      type: typeof value,
      createdAt: now,
      updatedAt: now,
    };
    if (ttlMs > 0) stored.expiresAt = now + ttlMs;
    await this.storage.set(key, stored);
    this.updateCache(key, value, ttlMs > 0 ? ttlMs : undefined);
  }

  /**
   * Raw key/value get bypassing variable-definition lookup. Returns the
   * stored `value` payload (not the `StoredValue` envelope), or `null` when
   * the key does not exist or has expired.
   */
  async getRaw<T = unknown>(key: string): Promise<T | null> {
    const cached = this.cache.get(key);
    if (cached && cached.expiresAt > Date.now()) return cached.value as T;

    const stored = await this.storage.get(key);
    if (!stored) return null;
    if (stored.expiresAt && stored.expiresAt < Date.now()) return null;

    this.updateCache(key, stored.value);
    return stored.value as T;
  }

  /**
   * Delete a variable
   */
  async delete(
    name: string,
    context: { guildId?: string; channelId?: string; userId?: string }
  ): Promise<boolean> {
    const def = this.variables.get(name);
    const scope = def?.scope ?? 'guild';

    const key = buildStorageKey({
      name,
      scope,
      guildId: context.guildId,
      channelId: context.channelId,
      userId: context.userId,
    });

    this.cache.delete(key);
    return this.storage.delete(key);
  }

  /**
   * Increment a numeric variable (atomic operation)
   */
  async increment(
    name: string,
    by: number,
    context: { guildId?: string; channelId?: string; userId?: string }
  ): Promise<number> {
    const def = this.variables.get(name);
    const scope = def?.scope ?? 'guild';

    const key = buildStorageKey({
      name,
      scope,
      guildId: context.guildId,
      channelId: context.channelId,
      userId: context.userId,
    });

    // Acquire lock to prevent race conditions
    const releaseLock = await this.acquireLock(key);
    try {
      const current = await this.get<number>(name, context);
      const newValue = (current ?? 0) + by;
      await this.set(name, newValue, context);
      return newValue;
    } finally {
      releaseLock();
    }
  }

  /**
   * Decrement a numeric variable
   */
  async decrement(
    name: string,
    by: number,
    context: { guildId?: string; channelId?: string; userId?: string }
  ): Promise<number> {
    return this.increment(name, -by, context);
  }

  // Table operations

  /**
   * Insert a row into a table
   */
  async insert(table: string, data: Record<string, unknown>): Promise<void> {
    if (!this.tables.has(table)) {
      throw new Error(`Table not found: ${table}`);
    }
    await this.storage.insert(table, data);
  }

  /**
   * Update rows in a table
   */
  async update(
    table: string,
    where: Record<string, unknown>,
    data: Record<string, unknown>
  ): Promise<number> {
    if (!this.tables.has(table)) {
      throw new Error(`Table not found: ${table}`);
    }
    return this.storage.update(table, where, data);
  }

  /**
   * Delete rows from a table
   */
  async deleteRows(
    table: string,
    where: Record<string, unknown>
  ): Promise<number> {
    if (!this.tables.has(table)) {
      throw new Error(`Table not found: ${table}`);
    }
    return this.storage.deleteRows(table, where);
  }

  /**
   * Query rows from a table
   */
  async query(
    table: string,
    options: {
      where?: Record<string, unknown>;
      select?: string[];
      orderBy?: string;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<Record<string, unknown>[]> {
    if (!this.tables.has(table)) {
      throw new Error(`Table not found: ${table}`);
    }
    return this.storage.query(table, options);
  }

  // Cache operations

  /**
   * Get a value from cache
   */
  cacheGet<T = unknown>(key: string): T | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;

    // Check if expired (expiresAt is in the past)
    if (entry.expiresAt <= Date.now()) {
      this.cache.delete(key);
      return undefined;
    }

    return entry.value as T;
  }

  /**
   * Set a value in cache
   */
  cacheSet(key: string, value: unknown, ttl?: number): void {
    this.updateCache(key, value, ttl);
  }

  /**
   * Delete a value from cache
   */
  cacheDelete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clear all cached values
   */
  cacheClear(): void {
    this.cache.clear();
  }

  /**
   * Update cache with LRU eviction
   */
  private updateCache(key: string, value: unknown, ttl?: number): void {
    // Evict oldest entries if at capacity
    if (this.cache.size >= this.options.maxCacheSize) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(key, {
      value,
      expiresAt: Date.now() + (ttl ?? this.options.defaultCacheTTL),
    });
  }

  /**
   * Get all variable names for a scope
   */
  getVariableNames(scope?: StateScope): string[] {
    if (!scope) {
      return [...this.variables.keys()];
    }
    return [...this.variables.entries()]
      .filter(([, def]) => def.scope === scope)
      .map(([name]) => name);
  }

  /**
   * Get all table names
   */
  getTableNames(): string[] {
    return [...this.tables.keys()];
  }

  /**
   * Close the state manager
   */
  async close(): Promise<void> {
    if (this.closed) return;
    this.closed = true;
    this.cache.clear();
    this.locks.clear();
    await this.storage.close();
  }
}

/**
 * Parse a duration string to milliseconds
 */
function parseDuration(duration: string): number {
  const match = duration.match(/^(\d+)(ms|s|m|h|d)?$/);
  if (!match) return 0;

  const value = parseInt(match[1]!, 10);
  const unit = match[2] ?? 'ms';

  switch (unit) {
    case 'ms':
      return value;
    case 's':
      return value * 1000;
    case 'm':
      return value * 60 * 1000;
    case 'h':
      return value * 60 * 60 * 1000;
    case 'd':
      return value * 24 * 60 * 60 * 1000;
    default:
      return value;
  }
}

/**
 * Create a state manager
 */
export function createStateManager(
  storage: StorageAdapter,
  options?: StateManagerOptions
): StateManager {
  return new StateManager(storage, options);
}
