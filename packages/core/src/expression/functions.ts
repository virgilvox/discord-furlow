/**
 * Built-in expression functions
 */

import type Jexl from 'jexl';

/**
 * Register all built-in functions
 */
export function registerFunctions(jexl: Jexl.Jexl): void {
  // Date/Time functions
  jexl.addFunction('now', () => new Date());
  jexl.addFunction('timestamp', (date?: Date | string | number, format?: string) => {
    const d = date ? new Date(date) : new Date();
    if (format) {
      return formatDiscordTimestamp(d, format);
    }
    return Math.floor(d.getTime() / 1000);
  });
  jexl.addFunction('date', (value: string | number) => new Date(value));
  jexl.addFunction('dateAdd', (date: Date, amount: number, unit: string) => {
    const d = new Date(date);
    switch (unit) {
      case 's':
      case 'second':
      case 'seconds':
        d.setSeconds(d.getSeconds() + amount);
        break;
      case 'm':
      case 'minute':
      case 'minutes':
        d.setMinutes(d.getMinutes() + amount);
        break;
      case 'h':
      case 'hour':
      case 'hours':
        d.setHours(d.getHours() + amount);
        break;
      case 'd':
      case 'day':
      case 'days':
        d.setDate(d.getDate() + amount);
        break;
      case 'w':
      case 'week':
      case 'weeks':
        d.setDate(d.getDate() + amount * 7);
        break;
      case 'M':
      case 'month':
      case 'months':
        d.setMonth(d.getMonth() + amount);
        break;
      case 'y':
      case 'year':
      case 'years':
        d.setFullYear(d.getFullYear() + amount);
        break;
    }
    return d;
  });
  jexl.addFunction('addDuration', (date: Date | number | string, duration: string) => {
    const d = new Date(date);
    if (isNaN(d.getTime())) return d;
    const units: Record<string, number> = {
      s: 1000,
      m: 60 * 1000,
      h: 60 * 60 * 1000,
      d: 24 * 60 * 60 * 1000,
      w: 7 * 24 * 60 * 60 * 1000,
    };
    const matches = duration.match(/(\d+)([smhdw])/g) || [];
    for (const match of matches) {
      const parsed = match.match(/(\d+)([smhdw])/);
      if (parsed) {
        const [, num, unit] = parsed;
        d.setTime(d.getTime() + parseInt(num!, 10) * units[unit!]!);
      }
    }
    return d;
  });

  // Math functions
  jexl.addFunction('random', (min = 0, max = 1) => {
    if (min > max) [min, max] = [max, min];
    return Math.floor(Math.random() * (max - min + 1)) + min;
  });
  jexl.addFunction('randomFloat', (min = 0, max = 1) => {
    return Math.random() * (max - min) + min;
  });
  jexl.addFunction('round', (n: number, decimals = 0) => {
    const factor = Math.pow(10, decimals);
    return Math.round(n * factor) / factor;
  });
  jexl.addFunction('floor', Math.floor);
  jexl.addFunction('ceil', Math.ceil);
  jexl.addFunction('abs', Math.abs);
  jexl.addFunction('min', Math.min);
  jexl.addFunction('max', Math.max);
  jexl.addFunction('clamp', (value: number, min: number, max: number) => {
    return Math.min(Math.max(value, min), max);
  });

  // String functions
  jexl.addFunction('lower', (s: string) => s?.toLowerCase() ?? '');
  jexl.addFunction('upper', (s: string) => s?.toUpperCase() ?? '');
  jexl.addFunction('capitalize', (s: string) => {
    if (!s) return '';
    return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
  });
  jexl.addFunction('titleCase', (s: string) => {
    if (!s) return '';
    return s.replace(/\w\S*/g, (txt) =>
      txt.charAt(0).toUpperCase() + txt.slice(1).toLowerCase()
    );
  });
  jexl.addFunction('trim', (s: string) => s?.trim() ?? '');
  jexl.addFunction('truncate', (s: string, len: number, suffix = '...') => {
    if (!s || s.length <= len) return s ?? '';
    return s.slice(0, len - suffix.length) + suffix;
  });
  jexl.addFunction('padStart', (s: string, len: number, char = ' ') => {
    return String(s ?? '').padStart(len, char);
  });
  jexl.addFunction('padEnd', (s: string, len: number, char = ' ') => {
    return String(s ?? '').padEnd(len, char);
  });
  jexl.addFunction('replace', (s: string, search: string, replace: string) => {
    if (!s) return '';
    // Validate regex pattern to prevent ReDoS attacks
    const validatedPattern = validateRegexPattern(search);
    if (!validatedPattern.valid) {
      console.warn(`Invalid regex pattern in replace(): ${validatedPattern.error}`);
      // Fall back to literal string replacement
      return s.split(search).join(replace);
    }
    return s.replace(new RegExp(search, 'g'), replace);
  });
  jexl.addFunction('split', (s: string, delimiter: string) => {
    return s?.split(delimiter) ?? [];
  });
  jexl.addFunction('join', (arr: unknown[], delimiter = ', ') => {
    return arr?.join(delimiter) ?? '';
  });
  jexl.addFunction('includes', (s: string | unknown[], search: unknown) => {
    return s?.includes(search as never) ?? false;
  });
  jexl.addFunction('startsWith', (s: string, search: string) => {
    return s?.startsWith(search) ?? false;
  });
  jexl.addFunction('endsWith', (s: string, search: string) => {
    return s?.endsWith(search) ?? false;
  });
  jexl.addFunction('match', (s: string, pattern: string) => {
    if (!s) return false;
    // Validate regex pattern to prevent ReDoS attacks
    const validatedPattern = validateRegexPattern(pattern);
    if (!validatedPattern.valid) {
      console.warn(`Invalid regex pattern in match(): ${validatedPattern.error}`);
      return false;
    }
    return new RegExp(pattern).test(s);
  });

  // Array functions
  jexl.addFunction('length', (arr: unknown[] | string) => arr?.length ?? 0);
  jexl.addFunction('first', (arr: unknown[]) => arr?.[0]);
  jexl.addFunction('last', (arr: unknown[]) => arr?.[arr.length - 1]);
  jexl.addFunction('nth', (arr: unknown[], n: number) => arr?.[n]);
  jexl.addFunction('slice', (arr: unknown[], start: number, end?: number) => {
    return arr?.slice(start, end) ?? [];
  });
  jexl.addFunction('reverse', (arr: unknown[]) => [...(arr ?? [])].reverse());
  jexl.addFunction('sort', (arr: unknown[], key?: string) => {
    const copy = [...(arr ?? [])];
    if (key) {
      return copy.sort((a, b) => {
        const aVal = (a as Record<string, unknown>)?.[key] as string | number | null | undefined;
        const bVal = (b as Record<string, unknown>)?.[key] as string | number | null | undefined;
        if (aVal == null && bVal == null) return 0;
        if (aVal == null) return 1;
        if (bVal == null) return -1;
        if (aVal < bVal) return -1;
        if (aVal > bVal) return 1;
        return 0;
      });
    }
    return copy.sort();
  });
  jexl.addFunction('unique', (arr: unknown[]) => [...new Set(arr ?? [])]);
  jexl.addFunction('flatten', (arr: unknown[][]) => (arr ?? []).flat());
  jexl.addFunction('pick', (arr: unknown[]) => {
    if (!arr?.length) return undefined;
    return arr[Math.floor(Math.random() * arr.length)];
  });
  jexl.addFunction('shuffle', (arr: unknown[]) => {
    const copy = [...(arr ?? [])];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j]!, copy[i]!];
    }
    return copy;
  });
  jexl.addFunction('range', (start: number, end: number, step = 1) => {
    // Prevent unbounded memory allocation - cap at 10000 elements
    const MAX_RANGE_SIZE = 10000;
    const estimatedSize = Math.abs(Math.ceil((end - start) / (step || 1)));
    if (estimatedSize > MAX_RANGE_SIZE) {
      console.warn(`range() limited to ${MAX_RANGE_SIZE} elements (requested ~${estimatedSize})`);
    }
    const result: number[] = [];
    let iterations = 0;
    for (let i = start; step > 0 ? i < end : i > end; i += step) {
      if (iterations++ >= MAX_RANGE_SIZE) break;
      result.push(i);
    }
    return result;
  });
  jexl.addFunction('chunk', <T>(arr: T[], size: number): T[][] => {
    if (!arr || size < 1) return [];
    const chunks: T[][] = [];
    for (let i = 0; i < arr.length; i += size) {
      chunks.push(arr.slice(i, i + size));
    }
    return chunks;
  });

  // Object functions
  jexl.addFunction('keys', (obj: Record<string, unknown>) => Object.keys(obj ?? {}));
  jexl.addFunction('values', (obj: Record<string, unknown>) => Object.values(obj ?? {}));
  jexl.addFunction('entries', (obj: Record<string, unknown>) => Object.entries(obj ?? {}));
  jexl.addFunction('get', (obj: Record<string, unknown>, path: string, defaultValue?: unknown) => {
    if (!obj) return defaultValue;
    // Block prototype pollution paths
    const DANGEROUS_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
    const parts = path.split('.');
    for (const part of parts) {
      if (DANGEROUS_KEYS.has(part)) {
        console.warn(`Blocked access to dangerous key: ${part}`);
        return defaultValue;
      }
    }
    let current: unknown = obj;
    for (const part of parts) {
      if (current === null || current === undefined) return defaultValue;
      current = (current as Record<string, unknown>)[part];
    }
    return current ?? defaultValue;
  });
  jexl.addFunction('has', (obj: Record<string, unknown>, key: string) => {
    // Block prototype pollution - use hasOwnProperty instead of 'in' operator
    const DANGEROUS_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
    if (DANGEROUS_KEYS.has(key)) {
      return false;
    }
    return obj != null && Object.prototype.hasOwnProperty.call(obj, key);
  });
  jexl.addFunction('merge', (...objs: Record<string, unknown>[]) => {
    // Block prototype pollution by filtering dangerous keys
    const DANGEROUS_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
    const result: Record<string, unknown> = {};
    for (const obj of objs) {
      if (obj && typeof obj === 'object') {
        for (const key of Object.keys(obj)) {
          if (!DANGEROUS_KEYS.has(key)) {
            result[key] = obj[key];
          }
        }
      }
    }
    return result;
  });

  // Type functions
  jexl.addFunction('type', (value: unknown) => {
    if (value === null) return 'null';
    if (Array.isArray(value)) return 'array';
    return typeof value;
  });
  jexl.addFunction('isNull', (value: unknown) => value === null || value === undefined);
  jexl.addFunction('isArray', Array.isArray);
  jexl.addFunction('isString', (value: unknown) => typeof value === 'string');
  jexl.addFunction('isNumber', (value: unknown) => typeof value === 'number' && !isNaN(value));
  jexl.addFunction('isBoolean', (value: unknown) => typeof value === 'boolean');
  jexl.addFunction('isObject', (value: unknown) => {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
  });

  // Conversion functions
  jexl.addFunction('string', String);
  jexl.addFunction('number', (value: unknown) => {
    const n = Number(value);
    return isNaN(n) ? 0 : n;
  });
  jexl.addFunction('int', (value: unknown) => {
    const n = parseInt(String(value), 10);
    return isNaN(n) ? 0 : n;
  });
  jexl.addFunction('float', (value: unknown) => {
    const n = parseFloat(String(value));
    return isNaN(n) ? 0 : n;
  });
  jexl.addFunction('boolean', (value: unknown) => Boolean(value));
  jexl.addFunction('json', (value: unknown) => safeJsonStringify(value));
  jexl.addFunction('parseJson', (s: string) => {
    try {
      return JSON.parse(s);
    } catch {
      return null;
    }
  });

  // Discord-specific functions
  jexl.addFunction('mention', (type: string, id: string) => {
    switch (type) {
      case 'user':
        return `<@${id}>`;
      case 'role':
        return `<@&${id}>`;
      case 'channel':
        return `<#${id}>`;
      case 'emoji':
        return id.includes(':') ? `<${id}>` : id;
      default:
        return id;
    }
  });
  jexl.addFunction('formatNumber', (n: number, locale = 'en-US') => {
    return new Intl.NumberFormat(locale).format(n);
  });
  jexl.addFunction('ordinal', (n: number) => {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return n + (s[(v - 20) % 10] ?? s[v] ?? s[0]);
  });
  jexl.addFunction('pluralize', (count: number, singular: string, plural?: string) => {
    return count === 1 ? singular : (plural ?? singular + 's');
  });
  jexl.addFunction('duration', (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  });

  // Utility functions
  jexl.addFunction('default', (value: unknown, defaultValue: unknown) => {
    return value ?? defaultValue;
  });
  jexl.addFunction('coalesce', (...values: unknown[]) => {
    return values.find((v) => v !== null && v !== undefined);
  });
  jexl.addFunction('uuid', () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  });
  jexl.addFunction('hash', (s: string) => {
    let hash = 0;
    for (let i = 0; i < s.length; i++) {
      const char = s.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16);
  });
}

/**
 * Validate a regex pattern to prevent ReDoS attacks
 * Checks for patterns known to cause exponential backtracking
 */
function validateRegexPattern(pattern: string): { valid: boolean; error?: string } {
  // Check pattern length
  if (pattern.length > 500) {
    return { valid: false, error: 'Pattern too long (max 500 characters)' };
  }

  // Check for common ReDoS patterns:
  // - Nested quantifiers: (a+)+, (a*)*
  // - Overlapping alternatives: (a|a)+
  const dangerousPatterns = [
    /\([^)]*[+*][^)]*\)[+*]/, // Nested quantifiers like (a+)+
    /\([^)]*\|[^)]*\)[+*]/, // Alternation with quantifier like (a|b)+
    /(.+)\1+[+*]/, // Backreference with quantifier
  ];

  for (const dangerous of dangerousPatterns) {
    if (dangerous.test(pattern)) {
      return { valid: false, error: 'Pattern contains potentially dangerous constructs' };
    }
  }

  // Try to compile the regex to catch syntax errors
  try {
    new RegExp(pattern);
  } catch (e) {
    return { valid: false, error: e instanceof Error ? e.message : 'Invalid regex syntax' };
  }

  return { valid: true };
}

/**
 * Safely stringify a value, handling circular references
 */
function safeJsonStringify(value: unknown): string {
  const seen = new WeakSet();
  return JSON.stringify(value, (_key, val) => {
    if (typeof val === 'object' && val !== null) {
      if (seen.has(val)) {
        return '[Circular]';
      }
      seen.add(val);
    }
    // Handle BigInt
    if (typeof val === 'bigint') {
      return val.toString();
    }
    return val;
  });
}

/**
 * Format a date as a Discord timestamp
 */
function formatDiscordTimestamp(date: Date, format: string): string {
  const timestamp = Math.floor(date.getTime() / 1000);
  const formatMap: Record<string, string> = {
    short_time: 't',
    long_time: 'T',
    short_date: 'd',
    long_date: 'D',
    short_datetime: 'f',
    long_datetime: 'F',
    relative: 'R',
  };
  const style = formatMap[format] ?? format;
  return `<t:${timestamp}:${style}>`;
}
