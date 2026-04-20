/**
 * End-to-end test for M7 LIKE operators against a real SQLite database.
 * The contract test covers equality. This exercises the operator path with
 * a live `better-sqlite3` instance so escape handling and pattern logic
 * can be verified against a real engine, not just the in-memory adapter.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SQLiteAdapter, createSQLiteAdapter } from '../sqlite/index.js';
import { InvalidWhereClauseError } from '../where.js';

describe('SQLite where-clause operators (M7)', () => {
  let adapter: SQLiteAdapter;

  beforeEach(async () => {
    adapter = createSQLiteAdapter({ memory: true });
    await adapter.createTable('users', {
      columns: {
        id: { type: 'string', primary: true },
        name: { type: 'string' },
        email: { type: 'string' },
      },
    });
    await adapter.insert('users', { id: '1', name: 'admin_alice', email: 'alice@example.com' });
    await adapter.insert('users', { id: '2', name: 'admin_bob',   email: 'bob@example.org' });
    await adapter.insert('users', { id: '3', name: 'user_carol',  email: 'carol@example.com' });
    await adapter.insert('users', { id: '4', name: '50%_discount', email: 'sale@example.com' });
  });

  afterEach(async () => {
    await adapter.close();
  });

  it('startswith narrows to the prefix', async () => {
    const rows = await adapter.query('users', {
      where: { name: { op: 'startswith', value: 'admin_' } } as never,
    });
    expect(rows.map((r) => r.id).sort()).toEqual(['1', '2']);
  });

  it('endswith narrows to the suffix', async () => {
    const rows = await adapter.query('users', {
      where: { email: { op: 'endswith', value: '.com' } } as never,
    });
    expect(rows.map((r) => r.id).sort()).toEqual(['1', '3', '4']);
  });

  it('contains narrows to the substring', async () => {
    const rows = await adapter.query('users', {
      where: { name: { op: 'contains', value: 'bo' } } as never,
    });
    expect(rows.map((r) => r.id)).toEqual(['2']);
  });

  it('escapes % and _ in user-supplied startswith values', async () => {
    // Row 4's name starts with "50%". A correct escape treats the `%` as a
    // literal, not the SQL LIKE wildcard. If escaping were broken the
    // filter would match every row whose name starts with "50".
    const rows = await adapter.query('users', {
      where: { name: { op: 'startswith', value: '50%' } } as never,
    });
    expect(rows.map((r) => r.id)).toEqual(['4']);
  });

  it('like with raw % wildcard matches', async () => {
    const rows = await adapter.query('users', {
      where: { name: { op: 'like', value: 'admin_%' } } as never,
    });
    // `_` is a LIKE wildcard for a single char; "admin_" itself matches
    // "admin_alice" and "admin_bob".
    expect(rows.map((r) => r.id).sort()).toEqual(['1', '2']);
  });

  it('rejects pattern strings longer than 256 characters', async () => {
    await expect(
      adapter.query('users', {
        where: { name: { op: 'like', value: 'a'.repeat(300) } } as never,
      }),
    ).rejects.toBeInstanceOf(InvalidWhereClauseError);
  });

  it('plain equality still works alongside operator entries', async () => {
    const rows = await adapter.query('users', {
      where: {
        id: '1',
        email: { op: 'endswith', value: '.com' },
      } as never,
    });
    expect(rows.map((r) => r.name)).toEqual(['admin_alice']);
  });
});
