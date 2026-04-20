/**
 * Security Tests
 *
 * Tests for security considerations:
 * - Expression evaluator prototype pollution
 * - ReDoS prevention
 * - Injection prevention
 * - Resource exhaustion limits
 * - Dangerous input handling
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createEvaluator } from '../expression/evaluator.js';
import { StateManager, createStateManager } from '../state/manager.js';
import { MemoryAdapter } from '@furlow/storage';

describe('Expression Evaluator Security', () => {
  let evaluator: ReturnType<typeof createEvaluator>;

  beforeEach(() => {
    evaluator = createEvaluator({ allowUndefined: true });
  });

  describe('Prototype Pollution Prevention', () => {
    it('should not allow __proto__ access', async () => {
      const context = { obj: { value: 1 } };
      // Jexl blocks __proto__ access by throwing an error
      await expect(
        evaluator.evaluate('obj.__proto__', context)
      ).rejects.toThrow();
    });

    it('should not allow constructor access', async () => {
      const context = { obj: { value: 1 } };
      // Jexl blocks constructor access by throwing an error
      await expect(
        evaluator.evaluate('obj.constructor', context)
      ).rejects.toThrow();
    });

    it('should not allow prototype access', async () => {
      const context = { str: 'test' };
      const result = await evaluator.evaluate('str.prototype', context);
      expect(result).toBeUndefined();
    });

    it('should not allow Function constructor access', async () => {
      const context = { obj: {} };
      // Attempting to access Function constructor throws
      await expect(
        evaluator.evaluate('obj.constructor.constructor', context)
      ).rejects.toThrow();
    });

    it('should not allow Object pollution via assignment', async () => {
      // Jexl does not support assignment, but verify it doesn't allow mutation
      const context = { obj: { safe: true } };

      // This should not pollute Object.prototype
      try {
        await evaluator.evaluate('__proto__.polluted = true', context);
      } catch {
        // Expected to fail
      }

      // Verify Object prototype is not polluted
      expect((Object.prototype as any).polluted).toBeUndefined();
    });
  });

  describe('Code Injection Prevention', () => {
    it('should not execute arbitrary JavaScript', async () => {
      // Jexl is a safe expression language, not JavaScript
      await expect(
        evaluator.evaluate('process.exit(1)')
      ).rejects.toThrow();
    });

    it('should not allow require/import', async () => {
      await expect(
        evaluator.evaluate('require("fs")')
      ).rejects.toThrow();
    });

    it('should not allow eval', async () => {
      await expect(
        evaluator.evaluate('eval("1 + 1")')
      ).rejects.toThrow();
    });

    it('should not allow Function constructor', async () => {
      await expect(
        evaluator.evaluate('Function("return 1")()')
      ).rejects.toThrow();
    });

    it('should not allow global access', async () => {
      const result = await evaluator.evaluate('global', {});
      expect(result).toBeUndefined();

      const windowResult = await evaluator.evaluate('window', {});
      expect(windowResult).toBeUndefined();
    });

    it('should not allow process access', async () => {
      const result = await evaluator.evaluate('process', {});
      expect(result).toBeUndefined();
    });
  });

  describe('Template Injection Prevention', () => {
    it('should not execute expressions in user-provided strings', async () => {
      const context = {
        userInput: '${process.env.SECRET}',
        secretValue: 'hidden',
      };

      // User input should be treated as literal string
      const result = await evaluator.evaluate('userInput', context);
      expect(result).toBe('${process.env.SECRET}');
    });

    it('should escape expressions in interpolation output', async () => {
      const context = {
        userInput: '${evil}',
        evil: 'HACKED',
      };

      // The userInput contains a literal ${}, not an expression
      const result = await evaluator.interpolate('You said: ${userInput}', context);
      expect(result).toBe('You said: ${evil}');
      expect(result).not.toContain('HACKED');
    });
  });

  describe('Dangerous Context Values', () => {
    it('should handle context with dangerous property names', async () => {
      const context = {
        '__proto__': { malicious: true },
        'constructor': { evil: true },
        'prototype': { bad: true },
      };

      // Should not pollute globals
      const result = await evaluator.evaluate('1 + 1', context);
      expect(result).toBe(2);
      expect((Object.prototype as any).malicious).toBeUndefined();
    });

    it('should handle context with function values safely', async () => {
      const context = {
        fn: () => 'executed',
      };

      // Jexl should not execute functions in context directly
      const result = await evaluator.evaluate('fn', context);
      // Should return the function itself, not execute it
      expect(typeof result).toBe('function');
    });
  });

  describe('Resource Exhaustion Prevention', () => {
    it('should handle very long expressions', async () => {
      // Very long but valid expression
      const longExpr = Array(100).fill('1').join(' + ');

      const result = await evaluator.evaluate(longExpr);
      expect(result).toBe(100);
    });

    it('should handle deeply nested parentheses', async () => {
      const depth = 50;
      const nested = '('.repeat(depth) + '1' + ')'.repeat(depth);

      const result = await evaluator.evaluate(nested);
      expect(result).toBe(1);
    });

    it('should handle very long strings in context', async () => {
      const longString = 'a'.repeat(100000);
      const context = { str: longString };

      const result = await evaluator.evaluate('length(str)', context);
      expect(result).toBe(100000);
    });

    it('should handle large arrays in context', async () => {
      const largeArray = Array(10000).fill(1);
      const context = { arr: largeArray };

      const result = await evaluator.evaluate('length(arr)', context);
      expect(result).toBe(10000);
    });

    it('should handle deeply nested objects', async () => {
      let obj: any = { value: 42 };
      for (let i = 0; i < 100; i++) {
        obj = { nested: obj };
      }
      const context = { deep: obj };

      // Build the path
      const path = 'deep' + '.nested'.repeat(100) + '.value';
      const result = await evaluator.evaluate(path, context);
      expect(result).toBe(42);
    });
  });

  describe('Integer Overflow Handling', () => {
    it('should handle large integer operations', async () => {
      const result = await evaluator.evaluate('999999999999999 * 999999999999999');
      // JavaScript converts to Infinity or uses floating point
      expect(typeof result).toBe('number');
      expect(Number.isFinite(result) || result === Infinity).toBe(true);
    });

    it('should handle negative integer boundaries', async () => {
      const result = await evaluator.evaluate('-999999999999999999999');
      expect(typeof result).toBe('number');
    });
  });
});

describe('StateManager Security', () => {
  let storage: MemoryAdapter;
  let manager: StateManager;

  beforeEach(() => {
    storage = new MemoryAdapter();
    manager = createStateManager(storage);
  });

  afterEach(async () => {
    await manager.close();
  });

  describe('Key Injection Prevention', () => {
    it('should handle malicious variable names', () => {
      // Variable names with special characters
      const maliciousNames = [
        '__proto__',
        'constructor',
        'prototype',
        '../../../etc/passwd',
        '<script>alert(1)</script>',
        '${process.env.SECRET}',
      ];

      for (const name of maliciousNames) {
        // Should not throw
        manager.registerVariables({
          [name]: { type: 'string', scope: 'guild' },
        });
      }
    });

    it('should isolate storage keys properly', async () => {
      manager.registerVariables({
        testVar: { type: 'string', scope: 'guild' },
      });

      // Malicious guild IDs
      const maliciousIds = [
        '../../../etc/passwd',
        'guild:other:key',
        'guild\x00evil',
      ];

      for (const guildId of maliciousIds) {
        await manager.set('testVar', 'value', { guildId });
        // Should only affect that specific key
        const result = await manager.get('testVar', { guildId });
        expect(result).toBe('value');
      }
    });
  });

  describe('Value Sanitization', () => {
    it('should store and retrieve objects with dangerous property names', async () => {
      manager.registerVariables({
        data: { type: 'json', scope: 'guild' },
      });

      const dangerousObject = {
        __proto__: { polluted: true },
        constructor: 'fake',
        normal: 'value',
      };

      await manager.set('data', dangerousObject, { guildId: 'test' });
      const retrieved = await manager.get<typeof dangerousObject>('data', { guildId: 'test' });

      expect(retrieved?.normal).toBe('value');
      // Should not have polluted Object.prototype
      expect((Object.prototype as any).polluted).toBeUndefined();
    });

    it('should handle circular reference attempts', async () => {
      manager.registerVariables({
        circular: { type: 'json', scope: 'guild' },
      });

      // Create circular reference
      const obj: any = { name: 'circular' };
      obj.self = obj;

      // This might throw or handle gracefully
      try {
        await manager.set('circular', obj, { guildId: 'test' });
        // If it succeeds, retrieval should work
        const retrieved = await manager.get('circular', { guildId: 'test' });
        expect(retrieved).toBeDefined();
      } catch (err) {
        // Circular reference error is acceptable
        expect(err).toBeDefined();
      }
    });
  });

  describe('Pattern Matching Security', () => {
    it('should handle malicious patterns in keys()', async () => {
      // Patterns that could cause ReDoS if not handled properly
      const maliciousPatterns = [
        '.*.*.*.*.*.*.*.*.*.*a',
        '(a+)+b',
        '(a|aa)+b',
        '[a-zA-Z]*[a-zA-Z]*[a-zA-Z]*',
      ];

      for (const pattern of maliciousPatterns) {
        // Should complete in reasonable time (not hang)
        const start = Date.now();
        try {
          await storage.keys(pattern);
        } catch {
          // Pattern error is acceptable
        }
        const elapsed = Date.now() - start;
        // Should not take more than 1 second
        expect(elapsed).toBeLessThan(1000);
      }
    });

    it('should limit pattern length', async () => {
      // Very long pattern
      const longPattern = '*'.repeat(200);

      // Should handle gracefully
      const start = Date.now();
      await storage.keys(longPattern);
      const elapsed = Date.now() - start;

      // Should not hang
      expect(elapsed).toBeLessThan(1000);
    });

    it('rejects catastrophic backtracking regex patterns in expressions', async () => {
      // The classic ReDoS pattern: `(a+)+b` against a long `aaaa...` input
      // that fails at the end. A naive regex engine exhibits exponential
      // backtracking and hangs. The FURLOW evaluator must either (a) refuse
      // the pattern up front via isValidRegexPattern, or (b) complete in
      // linear time because the underlying engine is safe. Either is fine;
      // what we must NOT have is the test completing because we never
      // actually ran a regex (the old version of this test used a glob).
      const evaluator = createEvaluator();
      const evilInput = 'a'.repeat(60) + '!';
      const vulnerablePattern = '(a+)+b';

      // Try to match via the `match` expression function, which is the
      // user-facing regex surface.
      const start = Date.now();
      try {
        await evaluator.evaluate(`match(${JSON.stringify(evilInput)}, ${JSON.stringify(vulnerablePattern)})`, {});
      } catch {
        // Refusing the pattern is a valid defense.
      }
      const elapsed = Date.now() - start;

      // 60 `a`s against `(a+)+b` backtracks ~2^60 steps in an unsafe engine.
      // We give ourselves a generous 1 second budget: a safe engine returns
      // no-match in microseconds; a pattern rejection returns immediately.
      expect(elapsed).toBeLessThan(1000);
    });

    it('match() with a clearly unsafe pattern does not hang', async () => {
      // A second, even nastier pattern with nested quantifiers. Same budget.
      const evaluator = createEvaluator();
      const evilInput = 'a'.repeat(50);
      const pattern = '(a|a)+$';

      const start = Date.now();
      try {
        await evaluator.evaluate(`match(${JSON.stringify(evilInput)}, ${JSON.stringify(pattern)})`, {});
      } catch {
        // Refusing is acceptable.
      }
      expect(Date.now() - start).toBeLessThan(1000);
    });
  });
});

describe('Table Query Security', () => {
  let storage: MemoryAdapter;
  let manager: StateManager;

  beforeEach(async () => {
    storage = new MemoryAdapter();
    manager = createStateManager(storage);

    await manager.registerTables({
      users: {
        columns: {
          id: { type: 'string', primary: true },
          name: { type: 'string' },
          role: { type: 'string' },
        },
      },
    });

    // Add test data
    await manager.insert('users', { id: '1', name: 'Alice', role: 'admin' });
    await manager.insert('users', { id: '2', name: 'Bob', role: 'user' });
  });

  afterEach(async () => {
    await manager.close();
  });

  describe('Query Limit Enforcement', () => {
    it('should enforce query limits', async () => {
      // Add many rows
      for (let i = 3; i <= 100; i++) {
        await manager.insert('users', { id: String(i), name: `User${i}`, role: 'user' });
      }

      // Query with limit
      const rows = await manager.query('users', { limit: 10 });
      expect(rows.length).toBeLessThanOrEqual(10);
    });

    it('should enforce offset limits', async () => {
      // Large offset should not cause issues
      const rows = await manager.query('users', { offset: 1000000 });
      expect(Array.isArray(rows)).toBe(true);
    });
  });

  describe('SQL Injection Prevention (MemoryAdapter)', () => {
    it('should handle malicious where values', async () => {
      // These would be SQL injection attempts in a real database
      const maliciousValues = [
        "'; DROP TABLE users; --",
        '1 OR 1=1',
        "' OR ''='",
        '1; DELETE FROM users',
      ];

      for (const value of maliciousValues) {
        const rows = await manager.query('users', {
          where: { name: value },
        });
        // Should return empty (no match), not cause errors or data loss
        expect(rows).toEqual([]);
      }

      // Verify table still has data
      const allRows = await manager.query('users');
      expect(allRows.length).toBeGreaterThan(0);
    });
  });
});

describe('SQLite Adapter SQL Injection Prevention', () => {
  // Import SQLiteAdapter for real SQL injection testing
  // Note: We dynamically import to avoid issues if SQLite is not available
  let SQLiteAdapter: typeof import('@furlow/storage').SQLiteAdapter;
  let sqliteAdapter: InstanceType<typeof SQLiteAdapter>;

  beforeEach(async () => {
    try {
      const storage = await import('@furlow/storage');
      SQLiteAdapter = storage.SQLiteAdapter;
      sqliteAdapter = new SQLiteAdapter({ memory: true });
    } catch {
      // SQLite not available - skip test
      return;
    }
  });

  afterEach(async () => {
    if (sqliteAdapter) {
      await sqliteAdapter.close();
    }
  });

  it('should escape SQL injection in key values', async () => {
    if (!sqliteAdapter) return; // Skip if SQLite unavailable

    // Try SQL injection via key
    const maliciousKey = "test'; DROP TABLE furlow_kv; --";
    await sqliteAdapter.set(maliciousKey, {
      value: 'test',
      type: 'string',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Table should still exist and work
    const result = await sqliteAdapter.get('safe_key');
    // No error means table wasn't dropped
    expect(result).toBeNull();

    // Original key should be retrievable (stored as literal string)
    const maliciousResult = await sqliteAdapter.get(maliciousKey);
    expect(maliciousResult?.value).toBe('test');
  });

  it('should handle SQL injection in table column values', async () => {
    if (!sqliteAdapter) return;

    // Create a test table with proper TableDefinition structure
    await sqliteAdapter.createTable('test_table', {
      columns: {
        id: { type: 'string', primary: true },
        name: { type: 'string' },
      },
    });

    // Insert with SQL injection attempt in value
    await sqliteAdapter.insert('test_table', {
      id: '1',
      name: "Robert'); DROP TABLE test_table; --",
    });

    // Table should still exist
    const rows = await sqliteAdapter.query('test_table', {});
    expect(rows.length).toBe(1);
    expect(rows[0].name).toBe("Robert'); DROP TABLE test_table; --");
  });

  it('should reject invalid table/column names', async () => {
    if (!sqliteAdapter) return;

    // Attempt to create table with SQL injection in name
    await expect(
      sqliteAdapter.createTable('test; DROP TABLE furlow_kv; --', {
        columns: {
          id: { type: 'string', primary: true },
        },
      })
    ).rejects.toThrow(/Invalid SQL identifier/);
  });
});

describe('Input Validation', () => {
  describe('Expression Input', () => {
    let evaluator: ReturnType<typeof createEvaluator>;

    beforeEach(() => {
      evaluator = createEvaluator();
    });

    it('should handle null byte in expression', async () => {
      const exprWithNull = 'x + 1\x00evil';

      // Should handle gracefully (error or strip null)
      try {
        await evaluator.evaluate(exprWithNull, { x: 1 });
      } catch {
        // Error is acceptable
      }
    });

    it('should handle unicode direction overrides', async () => {
      // Right-to-left override character
      const exprWithRTL = 'x + 1\u202E2';

      try {
        await evaluator.evaluate(exprWithRTL, { x: 1 });
      } catch {
        // Error is acceptable
      }
    });

    it('should handle zero-width characters', async () => {
      const exprWithZW = 'x\u200B + \u200B1';

      try {
        const result = await evaluator.evaluate(exprWithZW, { x: 1 });
        // May succeed or fail depending on implementation
        expect(result === 2 || result === undefined).toBe(true);
      } catch {
        // Error is acceptable
      }
    });
  });
});

describe('Memory Safety', () => {
  it('should handle repeated evaluations without memory leak', async () => {
    const evaluator = createEvaluator({ cacheSize: 100 });

    // Evaluate many unique expressions
    for (let i = 0; i < 1000; i++) {
      await evaluator.evaluate(`${i} + ${i + 1}`);
    }

    const stats = evaluator.getStats();
    // Cache should not exceed configured size
    expect(stats.cacheSize).toBeLessThanOrEqual(100);
  });

  it('should clean up on close', async () => {
    const storage = new MemoryAdapter();
    const manager = createStateManager(storage);

    // Add data
    manager.registerVariables({ test: { type: 'string', scope: 'guild' } });
    await manager.set('test', 'value', { guildId: 'test' });
    manager.cacheSet('key', 'value');

    // Close
    await manager.close();

    // Cache should be cleared
    expect(manager.cacheGet('key')).toBeUndefined();
  });
});
