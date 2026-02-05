/**
 * Expression transforms (pipe operators)
 */

import type Jexl from 'jexl';

/**
 * Register all built-in transforms
 */
export function registerTransforms(jexl: Jexl.Jexl): void {
  // String transforms
  jexl.addTransform('lower', (s: string) => s?.toLowerCase() ?? '');
  jexl.addTransform('upper', (s: string) => s?.toUpperCase() ?? '');
  jexl.addTransform('capitalize', (s: string) => {
    if (!s) return '';
    return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
  });
  jexl.addTransform('trim', (s: string) => s?.trim() ?? '');
  jexl.addTransform('truncate', (s: string, len: number, suffix = '...') => {
    if (!s || s.length <= len) return s ?? '';
    return s.slice(0, len - suffix.length) + suffix;
  });
  jexl.addTransform('split', (s: string, delimiter: string) => s?.split(delimiter) ?? []);
  jexl.addTransform('replace', (s: string, search: string, replace: string) => {
    if (!s) return '';
    // Validate regex to prevent ReDoS - fall back to literal replacement on invalid pattern
    if (!isValidRegexPattern(search)) {
      return s.split(search).join(replace);
    }
    return s.replace(new RegExp(search, 'g'), replace);
  });
  jexl.addTransform('padStart', (s: string, len: number, char = ' ') => {
    return String(s ?? '').padStart(len, char);
  });
  jexl.addTransform('padEnd', (s: string, len: number, char = ' ') => {
    return String(s ?? '').padEnd(len, char);
  });
  jexl.addTransform('includes', (s: string | unknown[], search: unknown) => {
    if (Array.isArray(s)) return s.includes(search);
    return String(s ?? '').includes(String(search));
  });
  jexl.addTransform('startsWith', (s: string, search: string) => {
    return String(s ?? '').startsWith(search);
  });
  jexl.addTransform('endsWith', (s: string, search: string) => {
    return String(s ?? '').endsWith(search);
  });
  jexl.addTransform('contains', (s: string | unknown[], search: unknown) => {
    if (Array.isArray(s)) return s.includes(search);
    return String(s ?? '').includes(String(search));
  });

  // Array transforms
  jexl.addTransform('join', (arr: unknown[], delimiter = ', ') => arr?.join(delimiter) ?? '');
  jexl.addTransform('first', (arr: unknown[]) => arr?.[0]);
  jexl.addTransform('last', (arr: unknown[]) => arr?.[arr.length - 1]);
  jexl.addTransform('nth', (arr: unknown[], n: number) => arr?.[n]);
  jexl.addTransform('slice', (arr: unknown[], start: number, end?: number) => arr?.slice(start, end) ?? []);
  jexl.addTransform('reverse', (arr: unknown[]) => [...(arr ?? [])].reverse());
  jexl.addTransform('sort', (arr: unknown[], key?: string) => {
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
  jexl.addTransform('unique', (arr: unknown[]) => [...new Set(arr ?? [])]);
  jexl.addTransform('flatten', (arr: unknown[][]) => (arr ?? []).flat());
  jexl.addTransform('filter', (arr: unknown[], key: string, value: unknown) => {
    return (arr ?? []).filter((item) => {
      return (item as Record<string, unknown>)?.[key] === value;
    });
  });
  jexl.addTransform('map', (arr: unknown[], key: string) => {
    return (arr ?? []).map((item) => (item as Record<string, unknown>)?.[key]);
  });
  jexl.addTransform('pluck', (arr: unknown[], key: string) => {
    return (arr ?? []).map((item) => (item as Record<string, unknown>)?.[key]);
  });
  jexl.addTransform('pick', (arr: unknown[]) => {
    if (!arr?.length) return undefined;
    return arr[Math.floor(Math.random() * arr.length)];
  });
  jexl.addTransform('shuffle', (arr: unknown[]) => {
    const copy = [...(arr ?? [])];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j]!, copy[i]!];
    }
    return copy;
  });

  // Number transforms
  jexl.addTransform('round', (n: number, decimals = 0) => {
    const factor = Math.pow(10, decimals);
    return Math.round(n * factor) / factor;
  });
  jexl.addTransform('floor', Math.floor);
  jexl.addTransform('ceil', Math.ceil);
  jexl.addTransform('abs', Math.abs);
  jexl.addTransform('format', (n: number, locale = 'en-US') => {
    return new Intl.NumberFormat(locale).format(n);
  });
  jexl.addTransform('ordinal', (n: number) => {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return n + (s[(v - 20) % 10] ?? s[v] ?? s[0]);
  });

  // Object transforms
  jexl.addTransform('keys', (obj: Record<string, unknown>) => Object.keys(obj ?? {}));
  jexl.addTransform('values', (obj: Record<string, unknown>) => Object.values(obj ?? {}));
  jexl.addTransform('entries', (obj: Record<string, unknown>) => Object.entries(obj ?? {}));
  jexl.addTransform('get', (obj: Record<string, unknown>, path: string, defaultValue?: unknown) => {
    if (!obj) return defaultValue;
    const parts = path.split('.');
    let current: unknown = obj;
    for (const part of parts) {
      if (current === null || current === undefined) return defaultValue;
      current = (current as Record<string, unknown>)[part];
    }
    return current ?? defaultValue;
  });

  // Type transforms
  jexl.addTransform('string', String);
  jexl.addTransform('number', (value: unknown) => Number(value) || 0);
  jexl.addTransform('int', (value: unknown) => parseInt(String(value), 10) || 0);
  jexl.addTransform('float', (value: unknown) => parseFloat(String(value)) || 0);
  jexl.addTransform('boolean', Boolean);
  jexl.addTransform('json', (value: unknown) => safeJsonStringify(value));

  // Utility transforms
  jexl.addTransform('default', (value: unknown, defaultValue: unknown) => value ?? defaultValue);
  jexl.addTransform('length', (value: string | unknown[]) => value?.length ?? 0);
  jexl.addTransform('size', (value: string | unknown[] | Record<string, unknown>) => {
    if (typeof value === 'string' || Array.isArray(value)) {
      return value.length;
    }
    if (value && typeof value === 'object') {
      return Object.keys(value).length;
    }
    return 0;
  });

  // Date transforms
  jexl.addTransform('timestamp', (date: Date, format?: string) => {
    const d = date instanceof Date ? date : new Date(date);
    if (format) {
      return formatDiscordTimestamp(d, format);
    }
    return Math.floor(d.getTime() / 1000);
  });
  jexl.addTransform('duration', (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  });

  // Discord transforms
  jexl.addTransform('mention', (id: string, type = 'user') => {
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
  jexl.addTransform('pluralize', (count: number, singular: string, plural?: string) => {
    return count === 1 ? singular : (plural ?? singular + 's');
  });
}

/**
 * Check if a regex pattern is safe (no ReDoS patterns)
 */
function isValidRegexPattern(pattern: string): boolean {
  if (pattern.length > 500) return false;
  // Check for dangerous nested quantifiers
  if (/\([^)]*[+*][^)]*\)[+*]/.test(pattern)) return false;
  if (/\([^)]*\|[^)]*\)[+*]/.test(pattern)) return false;
  try {
    new RegExp(pattern);
    return true;
  } catch {
    return false;
  }
}

/**
 * Safely stringify with circular reference handling
 */
function safeJsonStringify(value: unknown): string {
  const seen = new WeakSet();
  return JSON.stringify(value, (_key, val) => {
    if (typeof val === 'object' && val !== null) {
      if (seen.has(val)) return '[Circular]';
      seen.add(val);
    }
    if (typeof val === 'bigint') return val.toString();
    return val;
  });
}

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
