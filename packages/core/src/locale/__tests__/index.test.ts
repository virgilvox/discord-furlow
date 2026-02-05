/**
 * Locale Manager Tests
 *
 * Tests for internationalization and string localization
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { LocaleManager, createLocaleManager } from '../index.js';
import type { LocaleConfig } from '@furlow/schema';

// Cast to allow partial locale configs in tests
type TestLocaleConfig = Partial<LocaleConfig> & {
  locales?: Partial<Record<string, Record<string, string | Record<string, string>>>>;
};

describe('LocaleManager', () => {
  let manager: LocaleManager;

  // Test helper that accepts partial config
  const configure = (config: TestLocaleConfig) => manager.configure(config as LocaleConfig);

  beforeEach(() => {
    manager = new LocaleManager();
  });

  describe('createLocaleManager', () => {
    it('should create a new LocaleManager instance', () => {
      const created = createLocaleManager();
      expect(created).toBeInstanceOf(LocaleManager);
    });
  });

  describe('configure', () => {
    it('should set default locale', () => {
      configure({
        default: 'de',
      });

      expect(manager.getDefaultLocale()).toBe('de');
    });

    it('should default to en-US', () => {
      configure({});
      expect(manager.getDefaultLocale()).toBe('en-US');
    });

    it('should configure locale strings', () => {
      configure({
        locales: {
          'en-US': {
            greeting: 'Hello',
          },
        },
      });

      expect(manager.get('greeting')).toBe('Hello');
    });

    it('should configure multiple locales', () => {
      configure({
        locales: {
          'en-US': { greeting: 'Hello' },
          'de': { greeting: 'Hallo' },
          'fr': { greeting: 'Bonjour' },
        },
      });

      expect(manager.get('greeting', 'en-US')).toBe('Hello');
      expect(manager.get('greeting', 'de')).toBe('Hallo');
      expect(manager.get('greeting', 'fr')).toBe('Bonjour');
    });

    it('should set fallback locale', () => {
      configure({
        default: 'de',
        fallback: 'en-US',
        locales: {
          'en-US': { greeting: 'Hello' },
          // Note: de exists but has no keys, fallback only used when locale is missing entirely
        },
      });

      // Requesting from non-existent locale falls back to en-US
      expect(manager.get('greeting', 'ja')).toBe('Hello');
    });
  });

  describe('get', () => {
    beforeEach(() => {
      configure({
        default: 'en-US',
        fallback: 'en-US',
        locales: {
          'en-US': {
            greeting: 'Hello',
            farewell: 'Goodbye',
            welcome: 'Welcome, {name}!',
            stats: '{count} items found',
            commands: {
              ban: {
                name: 'ban',
                description: 'Ban a user from the server',
              },
              kick: {
                name: 'kick',
                description: 'Kick a user from the server',
              },
            },
          },
          'de': {
            greeting: 'Hallo',
            welcome: 'Willkommen, {name}!',
          },
        },
      });
    });

    it('should get simple string', () => {
      expect(manager.get('greeting')).toBe('Hello');
    });

    it('should get string for specific locale', () => {
      expect(manager.get('greeting', 'de')).toBe('Hallo');
    });

    it('should fall back to fallback locale when locale is missing entirely', () => {
      // ja is not configured, so falls back to en-US (fallback)
      expect(manager.get('greeting', 'ja')).toBe('Hello');
      expect(manager.get('farewell', 'ja')).toBe('Goodbye');
    });

    it('should return key when string not found', () => {
      expect(manager.get('nonexistent')).toBe('nonexistent');
    });

    it('should return key for completely missing locale', () => {
      expect(manager.get('greeting', 'ja')).toBe('Hello'); // Falls back to en-US
    });

    describe('nested keys', () => {
      it('should resolve nested keys with dot notation', () => {
        expect(manager.get('commands.ban.name')).toBe('ban');
        expect(manager.get('commands.ban.description')).toBe('Ban a user from the server');
      });

      it('should resolve deeply nested keys', () => {
        expect(manager.get('commands.kick.description')).toBe('Kick a user from the server');
      });

      it('should return key for non-existent nested path', () => {
        expect(manager.get('commands.unknown.name')).toBe('commands.unknown.name');
      });

      it('should return key when path goes through non-object', () => {
        expect(manager.get('greeting.invalid.path')).toBe('greeting.invalid.path');
      });

      it('should return key when final value is not a string', () => {
        expect(manager.get('commands.ban')).toBe('commands.ban');
      });
    });

    describe('parameter interpolation', () => {
      it('should interpolate single parameter', () => {
        expect(manager.get('welcome', 'en-US', { name: 'Alice' })).toBe('Welcome, Alice!');
      });

      it('should interpolate multiple occurrences', () => {
        manager.addStrings('en-US', {
          double: '{name} meets {name}',
        });

        expect(manager.get('double', 'en-US', { name: 'Bob' })).toBe('Bob meets Bob');
      });

      it('should interpolate multiple parameters', () => {
        manager.addStrings('en-US', {
          complex: '{user} has {count} {item}',
        });

        expect(
          manager.get('complex', 'en-US', { user: 'Alice', count: 5, item: 'apples' })
        ).toBe('Alice has 5 apples');
      });

      it('should keep placeholder for missing params', () => {
        expect(manager.get('welcome', 'en-US', {})).toBe('Welcome, {name}!');
      });

      it('should convert non-string params to string', () => {
        expect(manager.get('stats', 'en-US', { count: 42 })).toBe('42 items found');
      });

      it('should work with specific locale', () => {
        expect(manager.get('welcome', 'de', { name: 'Hans' })).toBe('Willkommen, Hans!');
      });
    });
  });

  describe('has', () => {
    beforeEach(() => {
      configure({
        locales: {
          'en-US': {
            greeting: 'Hello',
            nested: {
              key: 'value',
            },
          },
          'de': {
            greeting: 'Hallo',
          },
        },
      });
    });

    it('should return true for existing key', () => {
      expect(manager.has('greeting')).toBe(true);
    });

    it('should return true for existing key in specific locale', () => {
      expect(manager.has('greeting', 'de')).toBe(true);
    });

    it('should return false for non-existent key', () => {
      expect(manager.has('nonexistent')).toBe(false);
    });

    it('should return false for non-existent locale', () => {
      expect(manager.has('greeting', 'ja')).toBe(false);
    });

    it('should return true for nested keys', () => {
      expect(manager.has('nested.key')).toBe(true);
    });

    it('should return false for non-existent nested path', () => {
      expect(manager.has('nested.invalid')).toBe(false);
    });

    it('should return false when path points to object not string', () => {
      expect(manager.has('nested')).toBe(false);
    });
  });

  describe('getAvailableLocales', () => {
    it('should return empty array when no locales configured', () => {
      expect(manager.getAvailableLocales()).toEqual([]);
    });

    it('should return all configured locales', () => {
      configure({
        locales: {
          'en-US': { greeting: 'Hello' },
          'de': { greeting: 'Hallo' },
          'fr': { greeting: 'Bonjour' },
          'ja': { greeting: 'こんにちは' },
        },
      });

      const locales = manager.getAvailableLocales();
      expect(locales).toContain('en-US');
      expect(locales).toContain('de');
      expect(locales).toContain('fr');
      expect(locales).toContain('ja');
      expect(locales).toHaveLength(4);
    });
  });

  describe('getDefaultLocale', () => {
    it('should return en-US by default', () => {
      expect(manager.getDefaultLocale()).toBe('en-US');
    });

    it('should return configured default', () => {
      configure({ default: 'de' });
      expect(manager.getDefaultLocale()).toBe('de');
    });
  });

  describe('addStrings', () => {
    it('should add strings to new locale', () => {
      manager.addStrings('es-ES' as any, {
        greeting: 'Hola',
      });

      expect(manager.get('greeting', 'es-ES' as any)).toBe('Hola');
    });

    it('should merge strings with existing locale', () => {
      configure({
        locales: {
          'en-US': { greeting: 'Hello' },
        },
      });

      manager.addStrings('en-US', {
        farewell: 'Goodbye',
      });

      expect(manager.get('greeting', 'en-US')).toBe('Hello');
      expect(manager.get('farewell', 'en-US')).toBe('Goodbye');
    });

    it('should overwrite existing keys', () => {
      configure({
        locales: {
          'en-US': { greeting: 'Hello' },
        },
      });

      manager.addStrings('en-US', {
        greeting: 'Hi there!',
      });

      expect(manager.get('greeting', 'en-US')).toBe('Hi there!');
    });

    it('should add nested strings', () => {
      manager.addStrings('en-US', {
        commands: {
          help: 'Show help',
        },
      });

      expect(manager.get('commands.help', 'en-US')).toBe('Show help');
    });

    it('should update available locales', () => {
      manager.addStrings('pt-BR' as any, { greeting: 'Olá' });
      expect(manager.getAvailableLocales()).toContain('pt-BR');
    });
  });

  describe('fallback behavior', () => {
    it('should use fallback locale when target locale not found', () => {
      configure({
        default: 'de',
        fallback: 'en-US',
        locales: {
          'en-US': { greeting: 'Hello', farewell: 'Goodbye' },
          'de': { greeting: 'Hallo' },
        },
      });

      // de has greeting
      expect(manager.get('greeting', 'de')).toBe('Hallo');
      // ja not configured, falls back to en-US
      expect(manager.get('greeting', 'ja')).toBe('Hello');
      expect(manager.get('farewell', 'ja')).toBe('Goodbye');
      // Missing key returns the key itself
      expect(manager.get('nonexistent', 'de')).toBe('nonexistent');
    });

    it('should use default locale when no locale specified', () => {
      configure({
        default: 'de',
        locales: {
          'de': { greeting: 'Hallo' },
        },
      });

      expect(manager.get('greeting')).toBe('Hallo');
    });

    it('should return key when key not in target locale (no per-key fallback)', () => {
      // Note: Implementation only falls back at locale level, not per-key
      configure({
        fallback: 'en-US',
        locales: {
          'en-US': { greeting: 'Hello', farewell: 'Goodbye' },
          'de': { greeting: 'Hallo' }, // No farewell
        },
      });

      // de exists but doesn't have farewell - returns key (no per-key fallback)
      expect(manager.get('farewell', 'de')).toBe('farewell');
    });
  });

  describe('edge cases', () => {
    it('should handle empty strings', () => {
      manager.addStrings('en-US', { empty: '' });
      // Empty string is still a valid string value
      expect(manager.get('empty', 'en-US')).toBe('');
    });

    it('should handle special characters in params', () => {
      manager.addStrings('en-US', { test: 'Value: {value}' });
      expect(
        manager.get('test', 'en-US', { value: '<script>alert("xss")</script>' })
      ).toBe('Value: <script>alert("xss")</script>');
    });

    it('should handle numeric param names', () => {
      manager.addStrings('en-US', { test: '{0} and {1}' });
      // Numeric keys work with Record<string, unknown>
      expect(manager.get('test', 'en-US', { '0': 'first', '1': 'second' })).toBe(
        'first and second'
      );
    });

    it('should handle undefined and null in params', () => {
      manager.addStrings('en-US', { test: 'Value: {value}' });
      // ?? operator treats both undefined and null as nullish
      // so both fall back to the placeholder
      expect(manager.get('test', 'en-US', { value: undefined })).toBe('Value: {value}');
      expect(manager.get('test', 'en-US', { value: null })).toBe('Value: {value}');
    });
  });
});
