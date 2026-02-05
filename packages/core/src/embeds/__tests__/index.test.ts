/**
 * Embed Builder Tests
 *
 * Tests for Discord embed building with templates and theming
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EmbedBuilder, createEmbedBuilder } from '../index.js';
import type { ExpressionEvaluator } from '../../expression/evaluator.js';
import type { EmbedDefinition } from '@furlow/schema';

/**
 * Create a mock expression evaluator
 */
function createMockEvaluator(): ExpressionEvaluator {
  return {
    evaluate: vi.fn().mockImplementation((expr: string, context: Record<string, unknown>) => {
      if (context[expr]) return context[expr];
      return expr;
    }),
    interpolate: vi.fn().mockImplementation((template: string, context: Record<string, unknown>) => {
      return template.replace(/\$\{(\w+)\}/g, (_, key) => String(context[key] ?? ''));
    }),
  } as unknown as ExpressionEvaluator;
}

describe('EmbedBuilder', () => {
  let builder: EmbedBuilder;
  let evaluator: ExpressionEvaluator;
  const context = { username: 'TestUser', count: 42, status: 'active' };

  beforeEach(() => {
    builder = new EmbedBuilder();
    evaluator = createMockEvaluator();
  });

  describe('createEmbedBuilder', () => {
    it('should create a new EmbedBuilder instance', () => {
      const created = createEmbedBuilder();
      expect(created).toBeInstanceOf(EmbedBuilder);
    });
  });

  describe('configure', () => {
    it('should configure theme colors', () => {
      builder.configure({
        theme: {
          colors: {
            primary: 0x5865f2,
            success: 0x57f287,
            error: 0xed4245,
          },
        },
      });

      expect(builder.getThemeColors()?.primary).toBe(0x5865f2);
    });

    it('should configure templates', () => {
      builder.configure({
        templates: {
          welcome: {
            title: 'Welcome!',
            description: 'Hello there',
            color: 'blurple',
          },
        },
      });

      expect(builder.getTemplate('welcome')).toBeDefined();
      expect(builder.getTemplateNames()).toContain('welcome');
    });

    it('should configure both theme and templates', () => {
      builder.configure({
        theme: { colors: { brand: 0x123456 } },
        templates: { test: { title: 'Test' } },
      });

      expect(builder.getThemeColors()?.brand).toBe(0x123456);
      expect(builder.getTemplate('test')).toBeDefined();
    });

    it('should overwrite existing templates', () => {
      builder.configure({
        templates: { test: { title: 'Old' } },
      });
      builder.configure({
        templates: { test: { title: 'New' } },
      });

      expect(builder.getTemplate('test')?.title).toBe('New');
    });
  });

  describe('getTemplate', () => {
    it('should return undefined for non-existent template', () => {
      expect(builder.getTemplate('nonexistent')).toBeUndefined();
    });

    it('should return configured template', () => {
      builder.configure({
        templates: { test: { title: 'Test Title', description: 'Test Desc' } },
      });

      const template = builder.getTemplate('test');
      expect(template?.title).toBe('Test Title');
    });
  });

  describe('getTemplateNames', () => {
    it('should return empty array when no templates', () => {
      expect(builder.getTemplateNames()).toEqual([]);
    });

    it('should return all template names', () => {
      builder.configure({
        templates: {
          alpha: { title: 'A' },
          beta: { title: 'B' },
          gamma: { title: 'C' },
        },
      });

      const names = builder.getTemplateNames();
      expect(names).toContain('alpha');
      expect(names).toContain('beta');
      expect(names).toContain('gamma');
      expect(names).toHaveLength(3);
    });
  });

  describe('getThemeColors', () => {
    it('should return undefined when no theme configured', () => {
      expect(builder.getThemeColors()).toBeUndefined();
    });

    it('should return configured colors', () => {
      builder.configure({
        theme: { colors: { primary: 0xff0000 } },
      });

      expect(builder.getThemeColors()?.primary).toBe(0xff0000);
    });
  });

  describe('build', () => {
    describe('template lookup', () => {
      it('should build from template name string', async () => {
        builder.configure({
          templates: { greeting: { title: 'Hello!' } },
        });

        const embed = await builder.build('greeting', context, evaluator);
        expect(embed.title).toBe('Hello!');
      });

      it('should throw for non-existent template', async () => {
        await expect(builder.build('nonexistent', context, evaluator)).rejects.toThrow(
          'Embed template not found: nonexistent'
        );
      });

      it('should build from definition object directly', async () => {
        const embed = await builder.build(
          { title: 'Direct Build', description: 'Works' },
          context,
          evaluator
        );

        expect(embed.title).toBe('Direct Build');
        expect(embed.description).toBe('Works');
      });
    });

    describe('title and description', () => {
      it('should interpolate title', async () => {
        const embed = await builder.build(
          { title: 'Hello ${username}!' },
          context,
          evaluator
        );

        expect(embed.title).toBe('Hello TestUser!');
      });

      it('should interpolate description', async () => {
        const embed = await builder.build(
          { description: 'You have ${count} items' },
          context,
          evaluator
        );

        expect(embed.description).toBe('You have 42 items');
      });

      it('should not include title if not provided', async () => {
        const embed = await builder.build({ description: 'Only desc' }, context, evaluator);

        expect(embed.title).toBeUndefined();
      });
    });

    describe('url', () => {
      it('should include URL without interpolation', async () => {
        const embed = await builder.build(
          { title: 'Link', url: 'https://example.com' },
          context,
          evaluator
        );

        expect(embed.url).toBe('https://example.com');
      });

      it('should not include url if not provided', async () => {
        const embed = await builder.build({ title: 'No URL' }, context, evaluator);

        expect(embed.url).toBeUndefined();
      });
    });

    describe('color resolution', () => {
      it('should use direct number color', async () => {
        const embed = await builder.build(
          { title: 'Test', color: 0xff0000 },
          context,
          evaluator
        );

        expect(embed.color).toBe(0xff0000);
      });

      it('should convert RGB object to number', async () => {
        const embed = await builder.build(
          { title: 'Test', color: { r: 255, g: 128, b: 64 } },
          context,
          evaluator
        );

        // (255 << 16) | (128 << 8) | 64 = 16744512
        expect(embed.color).toBe((255 << 16) | (128 << 8) | 64);
      });

      it('should parse hex color string', async () => {
        const embed = await builder.build(
          { title: 'Test', color: '#5865f2' },
          context,
          evaluator
        );

        expect(embed.color).toBe(0x5865f2);
      });

      it('should resolve named colors', async () => {
        const namedColors = [
          { name: 'red', expected: 0xff0000 },
          { name: 'green', expected: 0x00ff00 },
          { name: 'blue', expected: 0x0000ff },
          { name: 'blurple', expected: 0x5865f2 },
          { name: 'gold', expected: 0xffd700 },
        ];

        for (const { name, expected } of namedColors) {
          const embed = await builder.build(
            { title: 'Test', color: name },
            context,
            evaluator
          );
          expect(embed.color).toBe(expected);
        }
      });

      it('should handle case-insensitive named colors', async () => {
        const embed = await builder.build(
          { title: 'Test', color: 'RED' },
          context,
          evaluator
        );

        expect(embed.color).toBe(0xff0000);
      });

      it('should resolve theme color by name', async () => {
        builder.configure({
          theme: { colors: { brand: 0x123456 } },
        });

        const embed = await builder.build(
          { title: 'Test', color: 'brand' },
          context,
          evaluator
        );

        expect(embed.color).toBe(0x123456);
      });

      it('should resolve theme color as string to hex', async () => {
        builder.configure({
          theme: { colors: { accent: '#abcdef' } as any },
        });

        const embed = await builder.build(
          { title: 'Test', color: 'accent' },
          context,
          evaluator
        );

        expect(embed.color).toBe(0xabcdef);
      });

      it('should interpolate color expression', async () => {
        const customEvaluator = {
          ...evaluator,
          interpolate: vi.fn().mockResolvedValue('#ff5500'),
        } as unknown as ExpressionEvaluator;

        const embed = await builder.build(
          { title: 'Test', color: '${dynamicColor}' },
          context,
          customEvaluator
        );

        expect(embed.color).toBe(0xff5500);
      });

      it('should default to black for unknown color', async () => {
        const embed = await builder.build(
          { title: 'Test', color: 'unknowncolor' },
          context,
          evaluator
        );

        expect(embed.color).toBe(0x000000);
      });
    });

    describe('timestamp', () => {
      it('should use current time for "now"', async () => {
        const before = new Date();
        const embed = await builder.build(
          { title: 'Test', timestamp: 'now' },
          context,
          evaluator
        );
        const after = new Date();

        const embedTime = new Date(embed.timestamp as string);
        expect(embedTime.getTime()).toBeGreaterThanOrEqual(before.getTime());
        expect(embedTime.getTime()).toBeLessThanOrEqual(after.getTime());
      });

      it('should interpolate and parse timestamp', async () => {
        const customEvaluator = {
          ...evaluator,
          interpolate: vi.fn().mockResolvedValue('2023-06-15T12:00:00Z'),
        } as unknown as ExpressionEvaluator;

        const embed = await builder.build(
          { title: 'Test', timestamp: '${date}' },
          context,
          customEvaluator
        );

        expect(embed.timestamp).toBe('2023-06-15T12:00:00.000Z');
      });
    });

    describe('author', () => {
      it('should build author with all fields', async () => {
        const embed = await builder.build(
          {
            title: 'Test',
            author: {
              name: '${username}',
              url: 'https://example.com',
              icon_url: 'https://example.com/icon.png',
            },
          },
          context,
          evaluator
        );

        expect(embed.author).toEqual({
          name: 'TestUser',
          url: 'https://example.com',
          icon_url: 'https://example.com/icon.png',
        });
      });

      it('should use default author from theme when not provided', async () => {
        builder.configure({
          theme: {
            default_author: {
              name: 'Bot Name',
              icon_url: 'https://bot.icon/png',
            },
          },
        });

        const embed = await builder.build({ title: 'Test' }, context, evaluator);

        expect(embed.author).toEqual({
          name: 'Bot Name',
          url: undefined,
          icon_url: 'https://bot.icon/png',
        });
      });

      it('should override default author with explicit author', async () => {
        builder.configure({
          theme: { default_author: { name: 'Default' } },
        });

        const embed = await builder.build(
          { title: 'Test', author: { name: 'Custom' } },
          context,
          evaluator
        );

        expect((embed.author as any).name).toBe('Custom');
      });
    });

    describe('footer', () => {
      it('should build footer with all fields', async () => {
        const embed = await builder.build(
          {
            title: 'Test',
            footer: {
              text: 'Count: ${count}',
              icon_url: 'https://example.com/footer.png',
            },
          },
          context,
          evaluator
        );

        expect(embed.footer).toEqual({
          text: 'Count: 42',
          icon_url: 'https://example.com/footer.png',
        });
      });

      it('should use default footer from theme when not provided', async () => {
        builder.configure({
          theme: {
            default_footer: {
              text: 'Powered by FURLOW',
              icon_url: 'https://footer.icon/png',
            },
          },
        });

        const embed = await builder.build({ title: 'Test' }, context, evaluator);

        expect(embed.footer).toEqual({
          text: 'Powered by FURLOW',
          icon_url: 'https://footer.icon/png',
        });
      });

      it('should override default footer with explicit footer', async () => {
        builder.configure({
          theme: { default_footer: { text: 'Default Footer' } },
        });

        const embed = await builder.build(
          { title: 'Test', footer: { text: 'Custom Footer' } },
          context,
          evaluator
        );

        expect((embed.footer as any).text).toBe('Custom Footer');
      });
    });

    describe('fields', () => {
      it('should build fields array', async () => {
        const embed = await builder.build(
          {
            title: 'Test',
            fields: [
              { name: 'Field 1', value: 'Value 1' },
              { name: 'Field 2', value: 'Value 2' },
            ],
          },
          context,
          evaluator
        );

        expect(embed.fields).toHaveLength(2);
      });

      it('should interpolate field names and values', async () => {
        const embed = await builder.build(
          {
            title: 'Test',
            fields: [
              { name: 'User: ${username}', value: 'Status: ${status}' },
            ],
          },
          context,
          evaluator
        );

        const fields = embed.fields as any[];
        expect(fields[0].name).toBe('User: TestUser');
        expect(fields[0].value).toBe('Status: active');
      });

      it('should default inline to false', async () => {
        const embed = await builder.build(
          {
            title: 'Test',
            fields: [{ name: 'Field', value: 'Value' }],
          },
          context,
          evaluator
        );

        expect((embed.fields as any[])[0].inline).toBe(false);
      });

      it('should respect inline flag', async () => {
        const embed = await builder.build(
          {
            title: 'Test',
            fields: [
              { name: 'Inline', value: 'Yes', inline: true },
              { name: 'Not Inline', value: 'No', inline: false },
            ],
          },
          context,
          evaluator
        );

        const fields = embed.fields as any[];
        expect(fields[0].inline).toBe(true);
        expect(fields[1].inline).toBe(false);
      });
    });

    describe('image', () => {
      it('should handle string image URL', async () => {
        const embed = await builder.build(
          { title: 'Test', image: 'https://example.com/image.png' },
          context,
          evaluator
        );

        expect(embed.image).toEqual({ url: 'https://example.com/image.png' });
      });

      it('should handle image object with dimensions', async () => {
        const embed = await builder.build(
          {
            title: 'Test',
            image: {
              url: 'https://example.com/image.png',
              width: 400,
              height: 300,
            },
          },
          context,
          evaluator
        );

        expect(embed.image).toEqual({
          url: 'https://example.com/image.png',
          width: 400,
          height: 300,
        });
      });
    });

    describe('thumbnail', () => {
      it('should handle string thumbnail URL', async () => {
        const embed = await builder.build(
          { title: 'Test', thumbnail: 'https://example.com/thumb.png' },
          context,
          evaluator
        );

        expect(embed.thumbnail).toEqual({ url: 'https://example.com/thumb.png' });
      });

      it('should handle thumbnail object with dimensions', async () => {
        const embed = await builder.build(
          {
            title: 'Test',
            thumbnail: {
              url: 'https://example.com/thumb.png',
              width: 100,
              height: 100,
            },
          },
          context,
          evaluator
        );

        expect(embed.thumbnail).toEqual({
          url: 'https://example.com/thumb.png',
          width: 100,
          height: 100,
        });
      });
    });

    describe('complete embed', () => {
      it('should build complete embed with all fields', async () => {
        const definition: EmbedDefinition = {
          title: 'Complete Embed',
          description: 'All fields present',
          url: 'https://example.com',
          color: 0x5865f2,
          timestamp: 'now',
          author: { name: 'Author', url: 'https://author.com' },
          footer: { text: 'Footer text' },
          fields: [
            { name: 'Field 1', value: 'Value 1', inline: true },
            { name: 'Field 2', value: 'Value 2' },
          ],
          image: 'https://example.com/image.png',
          thumbnail: 'https://example.com/thumb.png',
        };

        const embed = await builder.build(definition, context, evaluator);

        expect(embed.title).toBe('Complete Embed');
        expect(embed.description).toBe('All fields present');
        expect(embed.url).toBe('https://example.com');
        expect(embed.color).toBe(0x5865f2);
        expect(embed.timestamp).toBeDefined();
        expect(embed.author).toBeDefined();
        expect(embed.footer).toBeDefined();
        expect(embed.fields).toHaveLength(2);
        expect(embed.image).toBeDefined();
        expect(embed.thumbnail).toBeDefined();
      });
    });
  });

  describe('buildMany', () => {
    it('should build multiple embeds', async () => {
      const embeds = await builder.buildMany(
        [
          { title: 'Embed 1' },
          { title: 'Embed 2' },
          { title: 'Embed 3' },
        ],
        context,
        evaluator
      );

      expect(embeds).toHaveLength(3);
      expect(embeds[0].title).toBe('Embed 1');
      expect(embeds[1].title).toBe('Embed 2');
      expect(embeds[2].title).toBe('Embed 3');
    });

    it('should build mixed templates and definitions', async () => {
      builder.configure({
        templates: { tmpl: { title: 'From Template' } },
      });

      const embeds = await builder.buildMany(
        ['tmpl', { title: 'Direct' }],
        context,
        evaluator
      );

      expect(embeds).toHaveLength(2);
      expect(embeds[0].title).toBe('From Template');
      expect(embeds[1].title).toBe('Direct');
    });

    it('should return empty array for empty input', async () => {
      const embeds = await builder.buildMany([], context, evaluator);
      expect(embeds).toEqual([]);
    });

    it('should build embeds concurrently', async () => {
      const startTime = Date.now();

      // Create slow evaluator
      const slowEvaluator = {
        ...evaluator,
        interpolate: vi.fn().mockImplementation(async (str: string) => {
          await new Promise((r) => setTimeout(r, 50));
          return str;
        }),
      } as unknown as ExpressionEvaluator;

      await builder.buildMany(
        [
          { title: 'E1', description: 'D1' },
          { title: 'E2', description: 'D2' },
          { title: 'E3', description: 'D3' },
        ],
        context,
        slowEvaluator
      );

      const elapsed = Date.now() - startTime;
      // Should complete faster than sequential (3 * 50ms = 150ms)
      expect(elapsed).toBeLessThan(150);
    });
  });
});
