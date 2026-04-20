import { describe, it, expect } from 'vitest';
import {
  MAX_STATE_VALUE_BYTES,
  MAX_ARRAY_LENGTH,
  MAX_LOG_MESSAGE_BYTES,
  ValueTooLargeError,
  ArrayTooLongError,
  assertValueWithinCap,
  assertArrayWithinCap,
  measureBytes,
} from '../limits.js';
import { MemoryAdapter } from '../memory/index.js';

describe('storage size caps', () => {
  describe('measureBytes', () => {
    it('returns 0 for null and undefined', () => {
      expect(measureBytes(null)).toBe(0);
      expect(measureBytes(undefined)).toBe(0);
    });

    it('returns the utf-8 byte length of a string directly', () => {
      expect(measureBytes('abc')).toBe(3);
      expect(measureBytes('€')).toBe(3);
    });

    it('serializes objects via JSON.stringify', () => {
      expect(measureBytes({ a: 1 })).toBe(7); // {"a":1}
    });
  });

  describe('assertValueWithinCap', () => {
    it('accepts values below the cap', () => {
      expect(() => assertValueWithinCap('small value')).not.toThrow();
      expect(() => assertValueWithinCap({ a: 1, b: 2 })).not.toThrow();
    });

    it('throws ValueTooLargeError on oversize string values', () => {
      const big = 'x'.repeat(MAX_STATE_VALUE_BYTES + 1);
      expect(() => assertValueWithinCap(big)).toThrow(ValueTooLargeError);
    });

    it('throws ValueTooLargeError on oversize object values', () => {
      const big = { blob: 'x'.repeat(MAX_STATE_VALUE_BYTES + 1) };
      expect(() => assertValueWithinCap(big)).toThrow(ValueTooLargeError);
    });

    it('accepts a custom limit parameter', () => {
      expect(() => assertValueWithinCap('12345', 4)).toThrow(ValueTooLargeError);
      expect(() => assertValueWithinCap('1234', 4)).not.toThrow();
    });

    it('error surfaces observed and limit', () => {
      try {
        assertValueWithinCap('xxxxxxx', 3);
        throw new Error('should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(ValueTooLargeError);
        const e = err as ValueTooLargeError;
        expect(e.limit).toBe(3);
        expect(e.observed).toBe(7);
        expect(e.code).toBe('E_VALUE_TOO_LARGE');
      }
    });
  });

  describe('assertArrayWithinCap', () => {
    it('accepts arrays below the cap', () => {
      expect(() => assertArrayWithinCap(new Array(100))).not.toThrow();
      expect(() => assertArrayWithinCap(new Array(MAX_ARRAY_LENGTH))).not.toThrow();
    });

    it('throws ArrayTooLongError when exceeded', () => {
      expect(() => assertArrayWithinCap(new Array(MAX_ARRAY_LENGTH + 1))).toThrow(ArrayTooLongError);
    });

    it('exposes observed and limit on the error', () => {
      try {
        assertArrayWithinCap(new Array(5), 3);
        throw new Error('should have thrown');
      } catch (err) {
        const e = err as ArrayTooLongError;
        expect(e.limit).toBe(3);
        expect(e.observed).toBe(5);
        expect(e.code).toBe('E_ARRAY_TOO_LONG');
      }
    });
  });

  describe('MemoryAdapter enforces the cap on set()', () => {
    it('allows values under the cap', async () => {
      const a = new MemoryAdapter();
      await a.set('ok', {
        value: { payload: 'small' },
        type: 'object',
        createdAt: 0,
        updatedAt: 0,
      });
      const fetched = await a.get('ok');
      expect(fetched?.value).toEqual({ payload: 'small' });
    });

    it('rejects values over the cap', async () => {
      const a = new MemoryAdapter();
      const big = 'x'.repeat(MAX_STATE_VALUE_BYTES + 1);
      await expect(
        a.set('bad', { value: big, type: 'string', createdAt: 0, updatedAt: 0 }),
      ).rejects.toBeInstanceOf(ValueTooLargeError);
    });
  });

  it('MAX_LOG_MESSAGE_BYTES is exported and is 25000', () => {
    expect(MAX_LOG_MESSAGE_BYTES).toBe(25_000);
  });
});
