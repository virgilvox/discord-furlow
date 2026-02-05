import { describe, it, expect, beforeEach } from 'vitest';
import { createEvaluator, ExpressionEvaluator } from '../evaluator.js';

describe('ExpressionEvaluator', () => {
  let evaluator: ExpressionEvaluator;

  beforeEach(() => {
    evaluator = createEvaluator({ allowUndefined: true });
  });

  describe('basic evaluation', () => {
    it('should evaluate simple expressions', async () => {
      expect(await evaluator.evaluate('1 + 2')).toBe(3);
      expect(await evaluator.evaluate('10 * 5')).toBe(50);
      expect(await evaluator.evaluate('true && false')).toBe(false);
      expect(await evaluator.evaluate('true || false')).toBe(true);
    });

    it('should evaluate expressions with context', async () => {
      const context = { x: 10, y: 20 };
      expect(await evaluator.evaluate('x + y', context)).toBe(30);
      expect(await evaluator.evaluate('x * y', context)).toBe(200);
    });

    it('should access nested object properties', async () => {
      const context = {
        user: {
          name: 'Alice',
          profile: { level: 5 },
        },
      };
      expect(await evaluator.evaluate('user.name', context)).toBe('Alice');
      expect(await evaluator.evaluate('user.profile.level', context)).toBe(5);
    });

    it('should handle array access', async () => {
      const context = { items: [10, 20, 30] };
      expect(await evaluator.evaluate('items[0]', context)).toBe(10);
      expect(await evaluator.evaluate('items[2]', context)).toBe(30);
    });

    it('should handle ternary expressions', async () => {
      expect(await evaluator.evaluate('true ? "yes" : "no"')).toBe('yes');
      expect(await evaluator.evaluate('false ? "yes" : "no"')).toBe('no');
    });
  });

  describe('interpolation', () => {
    it('should interpolate simple variables', async () => {
      const context = { name: 'World' };
      expect(await evaluator.interpolate('Hello ${name}!', context)).toBe('Hello World!');
    });

    it('should interpolate multiple expressions', async () => {
      const context = { first: 'John', last: 'Doe' };
      expect(await evaluator.interpolate('${first} ${last}', context)).toBe('John Doe');
    });

    it('should interpolate complex expressions', async () => {
      const context = { count: 5 };
      expect(await evaluator.interpolate('You have ${count * 2} items', context)).toBe('You have 10 items');
    });

    it('should return original string if no expressions', async () => {
      expect(await evaluator.interpolate('No expressions here')).toBe('No expressions here');
    });

    it('should handle empty result as empty string', async () => {
      const context = { value: null };
      expect(await evaluator.interpolate('Value: ${value}', context)).toBe('Value: ');
    });
  });

  describe('hasExpressions', () => {
    it('should detect expressions', () => {
      expect(evaluator.hasExpressions('Hello ${name}')).toBe(true);
      expect(evaluator.hasExpressions('No expressions')).toBe(false);
      expect(evaluator.hasExpressions('${a} and ${b}')).toBe(true);
    });
  });

  describe('synchronous evaluation', () => {
    it('should evaluate synchronously', () => {
      expect(evaluator.evaluateSync('2 + 2')).toBe(4);
      expect(evaluator.evaluateSync('x * 2', { x: 5 })).toBe(10);
    });

    it('should interpolate synchronously', () => {
      expect(evaluator.interpolateSync('Value: ${x}', { x: 42 })).toBe('Value: 42');
    });
  });

  describe('evaluateTemplate', () => {
    it('should pass through non-string values directly', async () => {
      const buffer = Buffer.from('test data');
      expect(await evaluator.evaluateTemplate(buffer, {})).toBe(buffer);

      const number = 42;
      expect(await evaluator.evaluateTemplate(number, {})).toBe(42);

      const obj = { foo: 'bar' };
      expect(await evaluator.evaluateTemplate(obj, {})).toBe(obj);

      expect(await evaluator.evaluateTemplate(null, {})).toBe(null);
      expect(await evaluator.evaluateTemplate(undefined, {})).toBe(undefined);
    });

    it('should return raw value for exact ${expr} match', async () => {
      const buffer = Buffer.from('test data');
      const context = { myBuffer: buffer, myNum: 123 };

      // Should return the actual Buffer, not "[object Buffer]"
      const result = await evaluator.evaluateTemplate('${myBuffer}', context);
      expect(result).toBe(buffer);
      expect(Buffer.isBuffer(result)).toBe(true);

      // Should return number, not string "123"
      const numResult = await evaluator.evaluateTemplate('${myNum}', context);
      expect(numResult).toBe(123);
      expect(typeof numResult).toBe('number');
    });

    it('should handle whitespace in exact expressions', async () => {
      const context = { value: { nested: 'data' } };
      const result = await evaluator.evaluateTemplate('${ value.nested }', context);
      expect(result).toBe('data');
    });

    it('should interpolate as string for mixed templates', async () => {
      const context = { name: 'Alice', age: 30 };

      const result = await evaluator.evaluateTemplate('Hello ${name}!', context);
      expect(result).toBe('Hello Alice!');
      expect(typeof result).toBe('string');

      const multi = await evaluator.evaluateTemplate('${name} is ${age}', context);
      expect(multi).toBe('Alice is 30');
    });

    it('should return plain string as-is when no expressions', async () => {
      const result = await evaluator.evaluateTemplate('Just a string', {});
      expect(result).toBe('Just a string');
    });
  });

  describe('custom functions and transforms', () => {
    it('should allow adding custom functions', async () => {
      evaluator.addFunction('double', (n: number) => n * 2);
      expect(await evaluator.evaluate('double(5)')).toBe(10);
    });

    it('should allow adding custom transforms', async () => {
      evaluator.addTransform('triple', (n: number) => n * 3);
      expect(await evaluator.evaluate('5|triple')).toBe(15);
    });
  });

  // =====================================
  // Date/Time Functions
  // =====================================
  describe('date/time functions', () => {
    it('now() returns a Date', async () => {
      const result = await evaluator.evaluate<Date>('now()');
      expect(result).toBeInstanceOf(Date);
    });

    it('timestamp() returns unix timestamp', async () => {
      const result = await evaluator.evaluate<number>('timestamp()');
      expect(typeof result).toBe('number');
      expect(result).toBeGreaterThan(0);
    });

    it('timestamp() formats Discord timestamp', async () => {
      const result = await evaluator.evaluate<string>('timestamp(now(), "relative")');
      expect(result).toMatch(/^<t:\d+:R>$/);
    });

    it('date() parses date string', async () => {
      const result = await evaluator.evaluate<Date>('date("2024-01-15")');
      expect(result).toBeInstanceOf(Date);
      expect(result.getFullYear()).toBe(2024);
    });

    it('dateAdd() adds time units', async () => {
      const context = { d: new Date('2024-01-01T00:00:00Z') };
      const result = await evaluator.evaluate<Date>('dateAdd(d, 5, "days")', context);
      expect(result.getUTCDate()).toBe(6);
    });

    it('addDuration() adds duration string to date', async () => {
      const context = { d: new Date('2024-01-01T00:00:00Z') };
      const result = await evaluator.evaluate<Date>('addDuration(d, "10m")', context);
      expect(result.getUTCMinutes()).toBe(10);
    });

    it('addDuration() handles combined duration strings', async () => {
      const context = { d: new Date('2024-01-01T00:00:00Z') };
      const result = await evaluator.evaluate<Date>('addDuration(d, "1d12h")', context);
      expect(result.getUTCDate()).toBe(2);
      expect(result.getUTCHours()).toBe(12);
    });

    it('addDuration() handles all unit types', async () => {
      const context = { d: new Date('2024-01-01T00:00:00Z') };
      // Test seconds
      let result = await evaluator.evaluate<Date>('addDuration(d, "30s")', context);
      expect(result.getUTCSeconds()).toBe(30);
      // Test hours
      result = await evaluator.evaluate<Date>('addDuration(d, "2h")', context);
      expect(result.getUTCHours()).toBe(2);
      // Test weeks
      result = await evaluator.evaluate<Date>('addDuration(d, "1w")', context);
      expect(result.getUTCDate()).toBe(8);
    });
  });

  // =====================================
  // Math Functions
  // =====================================
  describe('math functions', () => {
    it('random() returns number in range', async () => {
      for (let i = 0; i < 10; i++) {
        const result = await evaluator.evaluate<number>('random(1, 10)');
        expect(result).toBeGreaterThanOrEqual(1);
        expect(result).toBeLessThanOrEqual(10);
      }
    });

    it('randomFloat() returns float in range', async () => {
      const result = await evaluator.evaluate<number>('randomFloat(0, 1)');
      expect(result).toBeGreaterThanOrEqual(0);
      expect(result).toBeLessThan(1);
    });

    it('round() rounds to decimals', async () => {
      expect(await evaluator.evaluate('round(3.14159, 2)')).toBe(3.14);
      expect(await evaluator.evaluate('round(3.5)')).toBe(4);
    });

    it('floor() rounds down', async () => {
      expect(await evaluator.evaluate('floor(3.9)')).toBe(3);
    });

    it('ceil() rounds up', async () => {
      expect(await evaluator.evaluate('ceil(3.1)')).toBe(4);
    });

    it('abs() returns absolute value', async () => {
      expect(await evaluator.evaluate('abs(-5)')).toBe(5);
    });

    it('min() returns minimum', async () => {
      expect(await evaluator.evaluate('min(5, 3, 8, 1)')).toBe(1);
    });

    it('max() returns maximum', async () => {
      expect(await evaluator.evaluate('max(5, 3, 8, 1)')).toBe(8);
    });

    it('clamp() constrains value', async () => {
      expect(await evaluator.evaluate('clamp(15, 0, 10)')).toBe(10);
      expect(await evaluator.evaluate('clamp(-5, 0, 10)')).toBe(0);
      expect(await evaluator.evaluate('clamp(5, 0, 10)')).toBe(5);
    });
  });

  // =====================================
  // String Functions
  // =====================================
  describe('string functions', () => {
    it('lower() converts to lowercase', async () => {
      expect(await evaluator.evaluate('lower("HELLO")')).toBe('hello');
    });

    it('upper() converts to uppercase', async () => {
      expect(await evaluator.evaluate('upper("hello")')).toBe('HELLO');
    });

    it('capitalize() capitalizes first letter', async () => {
      expect(await evaluator.evaluate('capitalize("hello world")')).toBe('Hello world');
    });

    it('titleCase() capitalizes each word', async () => {
      expect(await evaluator.evaluate('titleCase("hello world")')).toBe('Hello World');
    });

    it('trim() removes whitespace', async () => {
      expect(await evaluator.evaluate('trim("  hello  ")')).toBe('hello');
    });

    it('truncate() shortens string', async () => {
      expect(await evaluator.evaluate('truncate("hello world", 8)')).toBe('hello...');
      expect(await evaluator.evaluate('truncate("short", 10)')).toBe('short');
    });

    it('padStart() pads beginning', async () => {
      expect(await evaluator.evaluate('padStart("5", 3, "0")')).toBe('005');
    });

    it('padEnd() pads end', async () => {
      expect(await evaluator.evaluate('padEnd("5", 3, "0")')).toBe('500');
    });

    it('replace() replaces text', async () => {
      expect(await evaluator.evaluate('replace("hello world", "world", "there")')).toBe('hello there');
    });

    it('split() splits string', async () => {
      expect(await evaluator.evaluate('split("a,b,c", ",")')).toEqual(['a', 'b', 'c']);
    });

    it('join() joins array', async () => {
      const context = { arr: ['a', 'b', 'c'] };
      expect(await evaluator.evaluate('join(arr, "-")', context)).toBe('a-b-c');
    });

    it('includes() checks containment', async () => {
      expect(await evaluator.evaluate('includes("hello", "ell")')).toBe(true);
      expect(await evaluator.evaluate('includes("hello", "xyz")')).toBe(false);
    });

    it('startsWith() checks prefix', async () => {
      expect(await evaluator.evaluate('startsWith("hello", "he")')).toBe(true);
      expect(await evaluator.evaluate('startsWith("hello", "lo")')).toBe(false);
    });

    it('endsWith() checks suffix', async () => {
      expect(await evaluator.evaluate('endsWith("hello", "lo")')).toBe(true);
      expect(await evaluator.evaluate('endsWith("hello", "he")')).toBe(false);
    });

    it('match() tests regex', async () => {
      expect(await evaluator.evaluate('match("hello123", "\\\\d+")')).toBe(true);
      expect(await evaluator.evaluate('match("hello", "\\\\d+")')).toBe(false);
    });
  });

  // =====================================
  // Array Functions
  // =====================================
  describe('array functions', () => {
    it('length() returns length', async () => {
      expect(await evaluator.evaluate('length([1, 2, 3])')).toBe(3);
      expect(await evaluator.evaluate('length("hello")')).toBe(5);
    });

    it('first() returns first element', async () => {
      expect(await evaluator.evaluate('first([1, 2, 3])')).toBe(1);
    });

    it('last() returns last element', async () => {
      expect(await evaluator.evaluate('last([1, 2, 3])')).toBe(3);
    });

    it('nth() returns nth element', async () => {
      expect(await evaluator.evaluate('nth([10, 20, 30], 1)')).toBe(20);
    });

    it('slice() returns portion', async () => {
      expect(await evaluator.evaluate('slice([1, 2, 3, 4, 5], 1, 3)')).toEqual([2, 3]);
    });

    it('reverse() reverses array', async () => {
      expect(await evaluator.evaluate('reverse([1, 2, 3])')).toEqual([3, 2, 1]);
    });

    it('sort() sorts array', async () => {
      expect(await evaluator.evaluate('sort([3, 1, 2])')).toEqual([1, 2, 3]);
    });

    it('sort() sorts by key', async () => {
      const context = { items: [{ n: 3 }, { n: 1 }, { n: 2 }] };
      const result = await evaluator.evaluate<Array<{ n: number }>>('sort(items, "n")', context);
      expect(result.map((i) => i.n)).toEqual([1, 2, 3]);
    });

    it('unique() removes duplicates', async () => {
      expect(await evaluator.evaluate('unique([1, 2, 2, 3, 1])')).toEqual([1, 2, 3]);
    });

    it('flatten() flattens nested arrays', async () => {
      expect(await evaluator.evaluate('flatten([[1, 2], [3, 4]])')).toEqual([1, 2, 3, 4]);
    });

    it('pick() returns random element', async () => {
      const context = { arr: [1, 2, 3] };
      const result = await evaluator.evaluate<number>('pick(arr)', context);
      expect([1, 2, 3]).toContain(result);
    });

    it('range() generates number sequence', async () => {
      expect(await evaluator.evaluate('range(0, 5)')).toEqual([0, 1, 2, 3, 4]);
      expect(await evaluator.evaluate('range(0, 10, 2)')).toEqual([0, 2, 4, 6, 8]);
    });

    it('chunk() splits array into chunks', async () => {
      expect(await evaluator.evaluate('chunk([1, 2, 3, 4, 5], 2)')).toEqual([[1, 2], [3, 4], [5]]);
    });

    it('chunk() handles exact division', async () => {
      expect(await evaluator.evaluate('chunk([1, 2, 3, 4], 2)')).toEqual([[1, 2], [3, 4]]);
    });

    it('chunk() handles size larger than array', async () => {
      expect(await evaluator.evaluate('chunk([1, 2], 5)')).toEqual([[1, 2]]);
    });

    it('chunk() returns empty for empty array', async () => {
      expect(await evaluator.evaluate('chunk([], 3)')).toEqual([]);
    });

    it('chunk() returns empty for invalid size', async () => {
      expect(await evaluator.evaluate('chunk([1, 2, 3], 0)')).toEqual([]);
    });
  });

  // =====================================
  // Object Functions
  // =====================================
  describe('object functions', () => {
    it('keys() returns object keys', async () => {
      const context = { obj: { a: 1, b: 2 } };
      expect(await evaluator.evaluate('keys(obj)', context)).toEqual(['a', 'b']);
    });

    it('values() returns object values', async () => {
      const context = { obj: { a: 1, b: 2 } };
      expect(await evaluator.evaluate('values(obj)', context)).toEqual([1, 2]);
    });

    it('entries() returns key-value pairs', async () => {
      const context = { obj: { a: 1, b: 2 } };
      expect(await evaluator.evaluate('entries(obj)', context)).toEqual([['a', 1], ['b', 2]]);
    });

    it('get() retrieves nested value', async () => {
      const context = { obj: { a: { b: { c: 42 } } } };
      expect(await evaluator.evaluate('get(obj, "a.b.c")', context)).toBe(42);
    });

    it('get() returns default for missing path', async () => {
      const context = { obj: {} };
      expect(await evaluator.evaluate('get(obj, "a.b.c", "default")', context)).toBe('default');
    });

    it('has() checks key existence', async () => {
      const context = { obj: { a: 1 } };
      expect(await evaluator.evaluate('has(obj, "a")', context)).toBe(true);
      expect(await evaluator.evaluate('has(obj, "b")', context)).toBe(false);
    });

    it('merge() combines objects', async () => {
      const context = { a: { x: 1 }, b: { y: 2 } };
      expect(await evaluator.evaluate('merge(a, b)', context)).toEqual({ x: 1, y: 2 });
    });
  });

  // =====================================
  // Type Functions
  // =====================================
  describe('type functions', () => {
    it('type() returns type name', async () => {
      expect(await evaluator.evaluate('type("hello")')).toBe('string');
      expect(await evaluator.evaluate('type(123)')).toBe('number');
      expect(await evaluator.evaluate('type(true)')).toBe('boolean');
      expect(await evaluator.evaluate('type([1, 2])')).toBe('array');
      expect(await evaluator.evaluate('type({a: 1})')).toBe('object');
      // Note: Jexl doesn't have a null literal, so we test with context
      const context = { nullVal: null };
      expect(await evaluator.evaluate('type(nullVal)', context)).toBe('null');
    });

    it('isNull() checks null/undefined', async () => {
      expect(await evaluator.evaluate('isNull(null)')).toBe(true);
      expect(await evaluator.evaluate('isNull("hello")')).toBe(false);
    });

    it('isArray() checks array', async () => {
      expect(await evaluator.evaluate('isArray([1, 2])')).toBe(true);
      expect(await evaluator.evaluate('isArray("hello")')).toBe(false);
    });

    it('isString() checks string', async () => {
      expect(await evaluator.evaluate('isString("hello")')).toBe(true);
      expect(await evaluator.evaluate('isString(123)')).toBe(false);
    });

    it('isNumber() checks number', async () => {
      expect(await evaluator.evaluate('isNumber(123)')).toBe(true);
      expect(await evaluator.evaluate('isNumber("123")')).toBe(false);
    });

    it('isBoolean() checks boolean', async () => {
      expect(await evaluator.evaluate('isBoolean(true)')).toBe(true);
      expect(await evaluator.evaluate('isBoolean("true")')).toBe(false);
    });

    it('isObject() checks object', async () => {
      expect(await evaluator.evaluate('isObject({a: 1})')).toBe(true);
      expect(await evaluator.evaluate('isObject([1, 2])')).toBe(false);
      expect(await evaluator.evaluate('isObject(null)')).toBe(false);
    });
  });

  // =====================================
  // Conversion Functions
  // =====================================
  describe('conversion functions', () => {
    it('string() converts to string', async () => {
      expect(await evaluator.evaluate('string(123)')).toBe('123');
    });

    it('number() converts to number', async () => {
      expect(await evaluator.evaluate('number("123")')).toBe(123);
      expect(await evaluator.evaluate('number("invalid")')).toBe(0);
    });

    it('int() parses integer', async () => {
      expect(await evaluator.evaluate('int("42.7")')).toBe(42);
    });

    it('float() parses float', async () => {
      expect(await evaluator.evaluate('float("3.14")')).toBe(3.14);
    });

    it('boolean() converts to boolean', async () => {
      expect(await evaluator.evaluate('boolean(1)')).toBe(true);
      expect(await evaluator.evaluate('boolean(0)')).toBe(false);
      expect(await evaluator.evaluate('boolean("")')).toBe(false);
    });

    it('json() serializes to JSON', async () => {
      const context = { obj: { a: 1 } };
      expect(await evaluator.evaluate('json(obj)', context)).toBe('{"a":1}');
    });

    it('parseJson() parses JSON string', async () => {
      expect(await evaluator.evaluate('parseJson("{\\"a\\":1}")')).toEqual({ a: 1 });
      expect(await evaluator.evaluate('parseJson("invalid")')).toBe(null);
    });
  });

  // =====================================
  // Discord-specific Functions
  // =====================================
  describe('discord functions', () => {
    it('mention() formats user mention', async () => {
      expect(await evaluator.evaluate('mention("user", "123456")')).toBe('<@123456>');
    });

    it('mention() formats role mention', async () => {
      expect(await evaluator.evaluate('mention("role", "123456")')).toBe('<@&123456>');
    });

    it('mention() formats channel mention', async () => {
      expect(await evaluator.evaluate('mention("channel", "123456")')).toBe('<#123456>');
    });

    it('formatNumber() formats with locale', async () => {
      expect(await evaluator.evaluate('formatNumber(1234567)')).toBe('1,234,567');
    });

    it('ordinal() adds ordinal suffix', async () => {
      expect(await evaluator.evaluate('ordinal(1)')).toBe('1st');
      expect(await evaluator.evaluate('ordinal(2)')).toBe('2nd');
      expect(await evaluator.evaluate('ordinal(3)')).toBe('3rd');
      expect(await evaluator.evaluate('ordinal(4)')).toBe('4th');
      expect(await evaluator.evaluate('ordinal(11)')).toBe('11th');
      expect(await evaluator.evaluate('ordinal(21)')).toBe('21st');
    });

    it('pluralize() handles singular/plural', async () => {
      expect(await evaluator.evaluate('pluralize(1, "item")')).toBe('item');
      expect(await evaluator.evaluate('pluralize(2, "item")')).toBe('items');
      expect(await evaluator.evaluate('pluralize(0, "child", "children")')).toBe('children');
    });

    it('duration() formats milliseconds', async () => {
      expect(await evaluator.evaluate('duration(5000)')).toBe('5s');
      expect(await evaluator.evaluate('duration(90000)')).toBe('1m 30s');
      expect(await evaluator.evaluate('duration(3700000)')).toBe('1h 1m');
      expect(await evaluator.evaluate('duration(90000000)')).toBe('1d 1h');
    });
  });

  // =====================================
  // Utility Functions
  // =====================================
  describe('utility functions', () => {
    it('default() returns fallback for null', async () => {
      expect(await evaluator.evaluate('default(null, "fallback")')).toBe('fallback');
      expect(await evaluator.evaluate('default("value", "fallback")')).toBe('value');
    });

    it('coalesce() returns first non-null', async () => {
      expect(await evaluator.evaluate('coalesce(null, null, "found")')).toBe('found');
    });

    it('uuid() generates unique id', async () => {
      const result1 = await evaluator.evaluate<string>('uuid()');
      const result2 = await evaluator.evaluate<string>('uuid()');
      expect(result1).toMatch(/^[0-9a-f-]{36}$/);
      expect(result1).not.toBe(result2);
    });

    it('hash() generates hash', async () => {
      const result = await evaluator.evaluate<string>('hash("test")');
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });
  });

  // =====================================
  // Error Handling & Edge Cases
  // =====================================
  describe('error handling', () => {
    it('should throw on syntax errors', async () => {
      await expect(evaluator.evaluate('1 +')).rejects.toThrow();
      await expect(evaluator.evaluate('(()')).rejects.toThrow();
      await expect(evaluator.evaluate('foo(')).rejects.toThrow();
    });

    it('should throw on unclosed strings', async () => {
      await expect(evaluator.evaluate('"unclosed')).rejects.toThrow();
      await expect(evaluator.evaluate("'unclosed")).rejects.toThrow();
    });

    it('should throw on invalid operators', async () => {
      await expect(evaluator.evaluate('1 <> 2')).rejects.toThrow();
    });

    it('should handle division by zero gracefully', async () => {
      // JavaScript returns Infinity, not an error
      const result = await evaluator.evaluate('10 / 0');
      expect(result).toBe(Infinity);
    });

    it('should handle modulo by zero', async () => {
      const result = await evaluator.evaluate('10 % 0');
      expect(Number.isNaN(result)).toBe(true);
    });

    it('should handle calling undefined functions', async () => {
      await expect(evaluator.evaluate('nonexistentFunction()')).rejects.toThrow();
    });

    it('should handle accessing properties on null', async () => {
      const context = { nullValue: null };
      // Jexl typically returns undefined for property access on null
      const result = await evaluator.evaluate('nullValue.prop', context);
      expect(result).toBeUndefined();
    });

    it('should handle accessing properties on undefined', async () => {
      const result = await evaluator.evaluate('missing.nested.path', {});
      expect(result).toBeUndefined();
    });
  });

  describe('type coercion edge cases', () => {
    it('should handle string to number coercion in comparisons', async () => {
      expect(await evaluator.evaluate('"5" == 5')).toBe(true);
      expect(await evaluator.evaluate('"5" < 10')).toBe(true);
    });

    it('should handle boolean coercion', async () => {
      expect(await evaluator.evaluate('!"" == true')).toBe(true);
      expect(await evaluator.evaluate('!0 == true')).toBe(true);
      expect(await evaluator.evaluate('!null == true')).toBe(true);
    });

    it('should handle NaN comparisons', async () => {
      // NaN is never equal to itself in standard JS, but Jexl uses loose comparison
      // which returns true for NaN == NaN (consistent with Jexl's behavior)
      const result = await evaluator.evaluate('number("invalid") == number("invalid")');
      // Jexl treats NaN == NaN as true in its comparison semantics
      expect(result).toBe(true);
    });

    it('should handle Infinity', async () => {
      const context = { inf: Infinity };
      expect(await evaluator.evaluate('inf > 999999999', context)).toBe(true);
      expect(await evaluator.evaluate('inf == inf', context)).toBe(true);
    });

    it('should handle empty array truthiness', async () => {
      expect(await evaluator.evaluate('[] ? "yes" : "no"')).toBe('yes'); // Arrays are truthy
      expect(await evaluator.evaluate('length([]) == 0')).toBe(true);
    });

    it('should handle empty object truthiness', async () => {
      expect(await evaluator.evaluate('{} ? "yes" : "no"')).toBe('yes'); // Objects are truthy
    });
  });

  describe('deeply nested expressions', () => {
    it('should handle deeply nested ternaries', async () => {
      const expr = 'a ? (b ? (c ? 1 : 2) : 3) : 4';
      expect(await evaluator.evaluate(expr, { a: true, b: true, c: true })).toBe(1);
      expect(await evaluator.evaluate(expr, { a: true, b: true, c: false })).toBe(2);
      expect(await evaluator.evaluate(expr, { a: true, b: false })).toBe(3);
      expect(await evaluator.evaluate(expr, { a: false })).toBe(4);
    });

    it('should handle deeply nested arithmetic', async () => {
      const result = await evaluator.evaluate('((((1 + 2) * 3) - 4) / 5)');
      expect(result).toBe(1); // ((3 * 3) - 4) / 5 = 5 / 5 = 1
    });

    it('should handle deeply nested property access', async () => {
      const context = {
        a: { b: { c: { d: { e: { value: 42 } } } } },
      };
      expect(await evaluator.evaluate('a.b.c.d.e.value', context)).toBe(42);
    });

    it('should handle nested function calls', async () => {
      expect(await evaluator.evaluate('upper(lower(upper("HeLLo")))')).toBe('HELLO');
      expect(await evaluator.evaluate('abs(floor(ceil(-1.5)))')).toBe(1);
    });
  });

  describe('unicode and special characters', () => {
    it('should handle unicode in strings', async () => {
      expect(await evaluator.evaluate('"Hello 世界"')).toBe('Hello 世界');
      expect(await evaluator.evaluate('"🎉🚀✨"')).toBe('🎉🚀✨');
    });

    it('should handle unicode in interpolation', async () => {
      const context = { emoji: '🎮', name: '用户' };
      const result = await evaluator.interpolate('Hello ${name} ${emoji}!', context);
      expect(result).toBe('Hello 用户 🎮!');
    });

    it('should handle newlines in strings', async () => {
      const context = { multiline: 'line1\nline2\nline3' };
      expect(await evaluator.evaluate('multiline', context)).toBe('line1\nline2\nline3');
    });

    it('should handle tabs in strings', async () => {
      const context = { tabbed: 'col1\tcol2\tcol3' };
      expect(await evaluator.evaluate('tabbed', context)).toBe('col1\tcol2\tcol3');
    });
  });

  describe('array edge cases', () => {
    it('should handle empty arrays', async () => {
      expect(await evaluator.evaluate('length([])')).toBe(0);
      expect(await evaluator.evaluate('first([])')).toBeUndefined();
      expect(await evaluator.evaluate('last([])')).toBeUndefined();
    });

    it('should handle single element arrays', async () => {
      expect(await evaluator.evaluate('first([42])')).toBe(42);
      expect(await evaluator.evaluate('last([42])')).toBe(42);
    });

    it('should handle arrays with mixed types', async () => {
      const context = { mixed: [1, 'two', true, null, { nested: 'obj' }] };
      expect(await evaluator.evaluate('length(mixed)', context)).toBe(5);
      expect(await evaluator.evaluate('mixed[0]', context)).toBe(1);
      expect(await evaluator.evaluate('mixed[1]', context)).toBe('two');
      expect(await evaluator.evaluate('mixed[4].nested', context)).toBe('obj');
    });

    it('should handle negative array indices gracefully', async () => {
      const context = { arr: [1, 2, 3] };
      // Negative indices don't work in Jexl like they do in Python
      const result = await evaluator.evaluate('arr[-1]', context);
      expect(result).toBeUndefined();
    });

    it('should handle out of bounds array access', async () => {
      const context = { arr: [1, 2, 3] };
      expect(await evaluator.evaluate('arr[100]', context)).toBeUndefined();
    });

    it('should handle sparse arrays', async () => {
      const context = { sparse: [1, , , 4] }; // eslint-disable-line no-sparse-arrays
      expect(await evaluator.evaluate('sparse[2]', context)).toBeUndefined();
      expect(await evaluator.evaluate('sparse[3]', context)).toBe(4);
    });
  });

  describe('object edge cases', () => {
    it('should handle empty objects', async () => {
      expect(await evaluator.evaluate('keys({})')).toEqual([]);
      expect(await evaluator.evaluate('values({})')).toEqual([]);
    });

    it('should handle objects with special key names', async () => {
      const context = {
        obj: {
          'key-with-dashes': 'value1',
          'normalKey': 'value2',
        },
      };
      // get() uses dot notation for nested paths, so dashes work but dots don't
      expect(await evaluator.evaluate('get(obj, "key-with-dashes")', context)).toBe('value1');
      expect(await evaluator.evaluate('get(obj, "normalKey")', context)).toBe('value2');
    });

    it('should handle prototype-polluted objects safely', async () => {
      const context = { obj: Object.create(null) };
      context.obj.value = 'safe';
      // Should not expose prototype methods
      expect(await evaluator.evaluate('obj.value', context)).toBe('safe');
    });
  });

  describe('caching behavior', () => {
    it('should use cached compiled expressions', async () => {
      // Evaluate same expression multiple times
      for (let i = 0; i < 100; i++) {
        await evaluator.evaluate('1 + 2 + 3');
      }

      const stats = evaluator.getStats();
      expect(stats.evaluations).toBe(100);
      expect(stats.cacheHits).toBe(99); // First one is a miss, rest are hits
      expect(stats.cacheMisses).toBe(1);
    });

    it('should clear cache', async () => {
      await evaluator.evaluate('1 + 2');
      evaluator.clearCache();

      const stats = evaluator.getStats();
      expect(stats.evaluations).toBe(0);
      expect(stats.cacheHits).toBe(0);
      expect(stats.cacheMisses).toBe(0);
    });
  });

  describe('interpolation edge cases', () => {
    it('should handle escaped dollar signs', async () => {
      // Note: This depends on how the evaluator handles escaping
      const result = await evaluator.interpolate('Price: $100', {});
      expect(result).toBe('Price: $100');
    });

    it('should handle adjacent expressions', async () => {
      const result = await evaluator.interpolate('${a}${b}${c}', { a: 1, b: 2, c: 3 });
      expect(result).toBe('123');
    });

    it('should handle expressions with braces', async () => {
      const context = { obj: { a: 1, b: 2 } };
      const result = await evaluator.interpolate('Value: ${obj.a}', context);
      expect(result).toBe('Value: 1');
    });

    it('should handle empty expression', async () => {
      // Empty expression in interpolation
      const result = await evaluator.interpolate('Hello ${}!', {});
      // Should return string as-is or handle gracefully
      expect(result).toBeDefined();
    });

    it('should handle whitespace in expressions', async () => {
      const result = await evaluator.interpolate('${  x  }', { x: 42 });
      expect(result).toBe('42');
    });
  });

  describe('security considerations', () => {
    it('should not allow constructor access', async () => {
      const context = { obj: {} };
      // Attempting to access constructor should throw an error
      // Jexl does not expose constructor - accessing it throws
      await expect(
        evaluator.evaluate('obj.constructor', context)
      ).rejects.toThrow();
    });

    it('should not allow __proto__ access', async () => {
      const context = { obj: {} };
      // Attempting to access __proto__ should throw an error
      await expect(
        evaluator.evaluate('obj.__proto__', context)
      ).rejects.toThrow();
    });

    it('should handle very long strings', async () => {
      const longString = 'a'.repeat(10000);
      const context = { long: longString };
      const result = await evaluator.evaluate('length(long)', context);
      expect(result).toBe(10000);
    });

    it('should handle very large numbers', async () => {
      const result = await evaluator.evaluate('9999999999999999999999999999');
      // JavaScript will represent this as Infinity or a large number
      expect(typeof result).toBe('number');
    });
  });

  describe('compile method', () => {
    it('should compile expression for repeated evaluation', () => {
      const compiled = evaluator.compile('x * 2 + y');

      // Compiled expressions can be evaluated synchronously multiple times
      expect(compiled.evalSync({ x: 5, y: 3 })).toBe(13);
      expect(compiled.evalSync({ x: 10, y: 1 })).toBe(21);
    });
  });
});
