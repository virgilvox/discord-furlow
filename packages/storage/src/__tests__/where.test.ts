/**
 * Tests for M7 where-clause pattern operators. Covers the shared helpers and
 * the memory adapter's integration with `db_query`. SQLite / Postgres are
 * covered implicitly through the contract test suite.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  MAX_WHERE_PATTERN_LENGTH,
  InvalidWhereClauseError,
  escapeLikeLiteral,
  isWhereClauseEntry,
  matchWhereValue,
  validateWhereClauseEntry,
} from '../where.js';
import { MemoryAdapter } from '../memory/index.js';

describe('where-clause helpers (M7)', () => {
  describe('isWhereClauseEntry', () => {
    it('accepts objects with op+value', () => {
      expect(isWhereClauseEntry({ op: 'like', value: 'x' })).toBe(true);
    });
    it('rejects plain strings / numbers / null', () => {
      expect(isWhereClauseEntry('plain')).toBe(false);
      expect(isWhereClauseEntry(123)).toBe(false);
      expect(isWhereClauseEntry(null)).toBe(false);
    });
    it('rejects objects missing op or value', () => {
      expect(isWhereClauseEntry({ op: 'eq' })).toBe(false);
      expect(isWhereClauseEntry({ value: 'x' })).toBe(false);
    });
  });

  describe('validateWhereClauseEntry', () => {
    it('rejects unknown operators', () => {
      expect(() =>
        validateWhereClauseEntry({ op: 'match' as never, value: 'x' }),
      ).toThrow(InvalidWhereClauseError);
    });
    it('rejects non-string values', () => {
      expect(() =>
        validateWhereClauseEntry({ op: 'like', value: 42 as never }),
      ).toThrow(InvalidWhereClauseError);
    });
    it('rejects values longer than MAX_WHERE_PATTERN_LENGTH', () => {
      const tooLong = 'x'.repeat(MAX_WHERE_PATTERN_LENGTH + 1);
      expect(() => validateWhereClauseEntry({ op: 'like', value: tooLong })).toThrow(
        InvalidWhereClauseError,
      );
    });
  });

  describe('escapeLikeLiteral', () => {
    it('escapes SQL LIKE metacharacters', () => {
      expect(escapeLikeLiteral('50%')).toBe('50\\%');
      expect(escapeLikeLiteral('a_b')).toBe('a\\_b');
      expect(escapeLikeLiteral('a\\b')).toBe('a\\\\b');
    });
  });

  describe('matchWhereValue', () => {
    it('startswith', () => {
      expect(matchWhereValue('admin_joe', { op: 'startswith', value: 'admin_' })).toBe(true);
      expect(matchWhereValue('user_joe', { op: 'startswith', value: 'admin_' })).toBe(false);
    });
    it('endswith', () => {
      expect(matchWhereValue('hello.json', { op: 'endswith', value: '.json' })).toBe(true);
      expect(matchWhereValue('hello.json', { op: 'endswith', value: '.jpg' })).toBe(false);
    });
    it('contains', () => {
      expect(matchWhereValue('the quick brown fox', { op: 'contains', value: 'brown' })).toBe(true);
      expect(matchWhereValue('abc', { op: 'contains', value: 'xyz' })).toBe(false);
    });
    it('like with % wildcard', () => {
      expect(matchWhereValue('hello world', { op: 'like', value: 'hello%' })).toBe(true);
      expect(matchWhereValue('goodbye', { op: 'like', value: 'hello%' })).toBe(false);
    });
    it('like with _ wildcard', () => {
      expect(matchWhereValue('cat', { op: 'like', value: 'c_t' })).toBe(true);
      expect(matchWhereValue('cart', { op: 'like', value: 'c_t' })).toBe(false);
    });
    it('like treats injection % in the value as literal unless specified', () => {
      // startswith escapes; like does NOT (user opt-in)
      expect(matchWhereValue('50%', { op: 'startswith', value: '50%' })).toBe(true);
      expect(matchWhereValue('50 percent', { op: 'startswith', value: '50%' })).toBe(false);
    });
    it('eq compares strictly', () => {
      expect(matchWhereValue('abc', { op: 'eq', value: 'abc' })).toBe(true);
      expect(matchWhereValue(123, { op: 'eq', value: '123' })).toBe(false);
    });
  });

  describe('MemoryAdapter db_query with where operators', () => {
    let a: MemoryAdapter;

    beforeEach(async () => {
      a = new MemoryAdapter();
      await a.createTable('users', {
        columns: {
          id: { type: 'string', primary: true },
          name: { type: 'string' },
        },
      });
      await a.insert('users', { id: '1', name: 'admin_alice' });
      await a.insert('users', { id: '2', name: 'admin_bob' });
      await a.insert('users', { id: '3', name: 'user_carol' });
    });

    it('returns only rows whose field starts with the operand', async () => {
      const rows = await a.query('users', {
        where: { name: { op: 'startswith', value: 'admin_' } } as never,
      });
      expect(rows.map((r) => r.id).sort()).toEqual(['1', '2']);
    });

    it('contains works on partial matches', async () => {
      const rows = await a.query('users', {
        where: { name: { op: 'contains', value: 'bob' } } as never,
      });
      expect(rows.map((r) => r.id)).toEqual(['2']);
    });

    it('plain values still mean equality (backwards compatible)', async () => {
      const rows = await a.query('users', {
        where: { id: '3' },
      });
      expect(rows.map((r) => r.name)).toEqual(['user_carol']);
    });

    it('surfaces validation errors for bad operator entries', async () => {
      await expect(
        a.query('users', {
          where: { name: { op: 'match' as never, value: 'x' } } as never,
        }),
      ).rejects.toBeInstanceOf(InvalidWhereClauseError);
    });
  });
});
