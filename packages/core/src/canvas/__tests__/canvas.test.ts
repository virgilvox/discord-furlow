/**
 * Canvas system tests
 *
 * Note: These tests focus on generator definitions, configuration, and structure.
 * Actual rendering requires the canvas native module which may not be available
 * in all environments. Rendering tests are in integration tests.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  createCanvasRenderer,
  type CanvasRenderer,
  createWelcomeGenerator,
  createRankGenerator,
  welcomeGenerator,
  welcomeDarkGenerator,
  welcomeLightGenerator,
  welcomeMinimalGenerator,
  rankGenerator,
  rankDarkGenerator,
  rankGradientGenerator,
  rankMinimalGenerator,
} from '../index.js';
import type { CanvasGenerator } from '@furlow/schema';

describe('CanvasRenderer', () => {
  let renderer: CanvasRenderer;

  beforeEach(() => {
    renderer = createCanvasRenderer();
  });

  describe('initialization', () => {
    it('should create a canvas renderer', () => {
      expect(renderer).toBeDefined();
      expect(typeof renderer.render).toBe('function');
      expect(typeof renderer.renderGenerator).toBe('function');
      expect(typeof renderer.renderLayers).toBe('function');
    });

    it('should have generator management methods', () => {
      expect(typeof renderer.registerGenerator).toBe('function');
      expect(typeof renderer.getGenerator).toBe('function');
      expect(typeof renderer.getGeneratorNames).toBe('function');
    });

    it('should have configuration methods', () => {
      expect(typeof renderer.configure).toBe('function');
      expect(typeof renderer.setEvaluator).toBe('function');
      expect(typeof renderer.registerFont).toBe('function');
    });

    it('should have availability check', () => {
      expect(typeof renderer.isAvailable).toBe('function');
    });
  });

  describe('generator management', () => {
    it('should register a generator', () => {
      const generator: CanvasGenerator = {
        width: 800,
        height: 300,
        background: '#000000',
        layers: [],
      };

      renderer.registerGenerator('test', generator);
      expect(renderer.getGenerator('test')).toBe(generator);
    });

    it('should return undefined for non-existent generator', () => {
      expect(renderer.getGenerator('non-existent')).toBeUndefined();
    });

    it('should get all generator names', () => {
      renderer.registerGenerator('gen1', { width: 100, height: 100, layers: [] });
      renderer.registerGenerator('gen2', { width: 200, height: 200, layers: [] });

      const names = renderer.getGeneratorNames();
      expect(names).toContain('gen1');
      expect(names).toContain('gen2');
      expect(names.length).toBe(2);
    });

    it('should overwrite existing generator', () => {
      const gen1: CanvasGenerator = { width: 100, height: 100, layers: [] };
      const gen2: CanvasGenerator = { width: 200, height: 200, layers: [] };

      renderer.registerGenerator('test', gen1);
      renderer.registerGenerator('test', gen2);

      expect(renderer.getGenerator('test')).toBe(gen2);
      expect(renderer.getGenerator('test')?.width).toBe(200);
    });
  });

  describe('configuration', () => {
    it('should configure with generators', () => {
      renderer.configure({
        generators: {
          card: {
            width: 600,
            height: 400,
            layers: [],
          },
          banner: {
            width: 1200,
            height: 300,
            layers: [],
          },
        },
      });

      expect(renderer.getGenerator('card')).toBeDefined();
      expect(renderer.getGenerator('banner')).toBeDefined();
      expect(renderer.getGenerator('card')?.width).toBe(600);
      expect(renderer.getGenerator('banner')?.width).toBe(1200);
    });

    it('should configure with fonts', () => {
      // Should not throw
      renderer.configure({
        fonts: {
          CustomFont: './fonts/custom.ttf',
          AnotherFont: './fonts/another.ttf',
        },
      });
    });

    it('should configure with both fonts and generators', () => {
      renderer.configure({
        fonts: {
          MyFont: './fonts/my.ttf',
        },
        generators: {
          myCard: {
            width: 500,
            height: 300,
            layers: [],
          },
        },
      });

      expect(renderer.getGenerator('myCard')).toBeDefined();
    });

    it('should register font manually', () => {
      // Should not throw
      renderer.registerFont('TestFont', './test-font.ttf');
    });

    it('should set evaluator', () => {
      const mockEvaluator = {
        interpolate: async (s: string) => s,
        evaluate: async (s: string) => s,
      };

      // Should not throw
      renderer.setEvaluator(mockEvaluator as any);
    });
  });

  describe('render method validation', () => {
    it('should throw for non-existent generator', async () => {
      await expect(renderer.render('non-existent', {})).rejects.toThrow(
        'Canvas generator not found'
      );
    });
  });
});

describe('Built-in Welcome Generators', () => {
  describe('welcomeGenerator (default)', () => {
    it('should have correct dimensions', () => {
      expect(welcomeGenerator.width).toBe(800);
      expect(welcomeGenerator.height).toBe(300);
    });

    it('should have background color', () => {
      expect(welcomeGenerator.background).toBe('#23272A');
    });

    it('should have layers array', () => {
      expect(Array.isArray(welcomeGenerator.layers)).toBe(true);
      expect(welcomeGenerator.layers.length).toBeGreaterThan(0);
    });

    it('should include accent bar layer', () => {
      const rectLayers = welcomeGenerator.layers.filter((l: any) => l.type === 'rect');
      expect(rectLayers.length).toBeGreaterThan(0);
    });

    it('should include circle_image layer for avatar', () => {
      const avatarLayer = welcomeGenerator.layers.find(
        (l: any) => l.type === 'circle_image'
      );
      expect(avatarLayer).toBeDefined();
      expect((avatarLayer as any).src).toBe('${user.avatar}');
    });

    it('should include text layers', () => {
      const textLayers = welcomeGenerator.layers.filter(
        (l: any) => l.type === 'text'
      );
      expect(textLayers.length).toBeGreaterThan(0);
    });

    it('should have welcome text with interpolation', () => {
      const welcomeText = welcomeGenerator.layers.find(
        (l: any) => l.type === 'text' && (l as any).text?.includes('Welcome')
      );
      expect(welcomeText).toBeDefined();
      expect((welcomeText as any).text).toContain('${member.display_name}');
    });
  });

  describe('welcomeDarkGenerator', () => {
    it('should have dark background', () => {
      expect(welcomeDarkGenerator.background).toBe('#1a1a2e');
    });

    it('should have same dimensions as default', () => {
      expect(welcomeDarkGenerator.width).toBe(welcomeGenerator.width);
      expect(welcomeDarkGenerator.height).toBe(welcomeGenerator.height);
    });
  });

  describe('welcomeLightGenerator', () => {
    it('should have light background', () => {
      expect(welcomeLightGenerator.background).toBe('#f5f5f5');
    });
  });

  describe('welcomeMinimalGenerator', () => {
    it('should have smaller dimensions', () => {
      expect(welcomeMinimalGenerator.width).toBe(600);
      expect(welcomeMinimalGenerator.height).toBe(200);
    });
  });

  describe('createWelcomeGenerator', () => {
    it('should create with default options', () => {
      const gen = createWelcomeGenerator();
      expect(gen.width).toBe(800);
      expect(gen.height).toBe(300);
      expect(gen.background).toBe('#23272A');
    });

    it('should create with custom dimensions', () => {
      const gen = createWelcomeGenerator({ width: 1000, height: 400 });
      expect(gen.width).toBe(1000);
      expect(gen.height).toBe(400);
    });

    it('should create with custom background', () => {
      const gen = createWelcomeGenerator({ background: '#ff0000' });
      expect(gen.background).toBe('#ff0000');
    });

    it('should create with custom colors', () => {
      const gen = createWelcomeGenerator({
        primaryColor: '#ff0000',
        textColor: '#00ff00',
        subtitleColor: '#0000ff',
        avatarBorderColor: '#ffff00',
      });
      expect(gen.layers).toBeDefined();
    });

    it('should create with custom text', () => {
      const gen = createWelcomeGenerator({
        welcomeText: 'Hello, ${user.username}!',
        subtitleText: 'Welcome to ${guild.name}',
        memberCountText: '#${guild.member_count}',
      });

      const welcomeTextLayer = gen.layers.find(
        (l: any) => l.type === 'text' && (l as any).text?.includes('Hello')
      );
      expect(welcomeTextLayer).toBeDefined();
    });

    it('should create with custom avatar radius', () => {
      const gen = createWelcomeGenerator({ avatarRadius: 100 });
      const avatarLayer = gen.layers.find(
        (l: any) => l.type === 'circle_image'
      );
      expect((avatarLayer as any).radius).toBe(100);
    });

    it('should create with custom font family', () => {
      const gen = createWelcomeGenerator({ fontFamily: 'Roboto' });
      const textLayers = gen.layers.filter((l: any) => l.type === 'text');
      textLayers.forEach((layer: any) => {
        expect(layer.font).toBe('Roboto');
      });
    });
  });
});

describe('Built-in Rank Generators', () => {
  describe('rankGenerator (default)', () => {
    it('should have correct dimensions', () => {
      expect(rankGenerator.width).toBe(934);
      expect(rankGenerator.height).toBe(282);
    });

    it('should have background', () => {
      expect(rankGenerator.background).toBeDefined();
    });

    it('should have layers', () => {
      expect(Array.isArray(rankGenerator.layers)).toBe(true);
      expect(rankGenerator.layers.length).toBeGreaterThan(0);
    });

    it('should include progress_bar layer', () => {
      const progressBar = rankGenerator.layers.find(
        (l: any) => l.type === 'progress_bar'
      );
      expect(progressBar).toBeDefined();
      expect((progressBar as any).progress).toBe('${xp / xpRequired}');
    });

    it('should include avatar layer', () => {
      const avatarLayer = rankGenerator.layers.find(
        (l: any) => l.type === 'circle_image'
      );
      expect(avatarLayer).toBeDefined();
    });

    it('should include rank text', () => {
      const rankText = rankGenerator.layers.find(
        (l: any) => l.type === 'text' && (l as any).text?.includes('${rank}')
      );
      expect(rankText).toBeDefined();
    });

    it('should include level text', () => {
      const levelText = rankGenerator.layers.find(
        (l: any) => l.type === 'text' && (l as any).text?.includes('${level}')
      );
      expect(levelText).toBeDefined();
    });

    it('should include username text', () => {
      const usernameText = rankGenerator.layers.find(
        (l: any) => l.type === 'text' && (l as any).text?.includes('${member.display_name}')
      );
      expect(usernameText).toBeDefined();
    });
  });

  describe('rankDarkGenerator', () => {
    it('should have dark background', () => {
      expect(rankDarkGenerator.background).toBe('#0d1117');
    });
  });

  describe('rankGradientGenerator', () => {
    it('should have gradient layer', () => {
      const gradientLayer = rankGradientGenerator.layers.find(
        (l: any) => l.type === 'gradient'
      );
      expect(gradientLayer).toBeDefined();
    });

    it('should have gradient stops', () => {
      const gradientLayer = rankGradientGenerator.layers.find(
        (l: any) => l.type === 'gradient'
      ) as any;
      expect(gradientLayer.stops).toBeDefined();
      expect(gradientLayer.stops.length).toBe(2);
      expect(gradientLayer.stops[0].offset).toBe(0);
      expect(gradientLayer.stops[1].offset).toBe(1);
    });

    it('should have diagonal direction', () => {
      const gradientLayer = rankGradientGenerator.layers.find(
        (l: any) => l.type === 'gradient'
      ) as any;
      expect(gradientLayer.direction).toBe('diagonal');
    });
  });

  describe('rankMinimalGenerator', () => {
    it('should have smaller dimensions', () => {
      expect(rankMinimalGenerator.width).toBe(600);
      expect(rankMinimalGenerator.height).toBe(180);
    });
  });

  describe('createRankGenerator', () => {
    it('should create with default options', () => {
      const gen = createRankGenerator();
      expect(gen.width).toBe(934);
      expect(gen.height).toBe(282);
    });

    it('should create with custom dimensions', () => {
      const gen = createRankGenerator({ width: 800, height: 250 });
      expect(gen.width).toBe(800);
      expect(gen.height).toBe(250);
    });

    it('should create with custom progress colors', () => {
      const gen = createRankGenerator({
        progressColor: '#ff0000',
        progressBackground: '#333333',
      });
      const progressBar = gen.layers.find(
        (l: any) => l.type === 'progress_bar'
      ) as any;
      expect(progressBar.fill).toBe('#ff0000');
      expect(progressBar.background).toBe('#333333');
    });

    it('should optionally show discriminator', () => {
      const genWithDiscrim = createRankGenerator({ showDiscriminator: true });
      const genWithoutDiscrim = createRankGenerator({ showDiscriminator: false });

      // With discriminator should have more layers
      expect(genWithDiscrim.layers.length).toBeGreaterThan(
        genWithoutDiscrim.layers.length
      );
    });

    it('should create with custom labels', () => {
      const gen = createRankGenerator({
        levelLabel: 'LVL',
        rankLabel: 'POS',
      });

      const levelLabel = gen.layers.find(
        (l: any) => l.type === 'text' && (l as any).text === 'LVL'
      );
      const rankLabel = gen.layers.find(
        (l: any) => l.type === 'text' && (l as any).text === 'POS'
      );
      expect(levelLabel).toBeDefined();
      expect(rankLabel).toBeDefined();
    });

    it('should create with custom XP text format', () => {
      const gen = createRankGenerator({
        xpText: '${xp}/${xpRequired}',
      });

      const xpTextLayer = gen.layers.find(
        (l: any) => l.type === 'text' && (l as any).text === '${xp}/${xpRequired}'
      );
      expect(xpTextLayer).toBeDefined();
    });
  });
});

describe('Generator Layer Structure', () => {
  it('should have valid layer types', () => {
    const validTypes = ['image', 'circle_image', 'text', 'rect', 'progress_bar', 'gradient'];

    const checkLayers = (gen: CanvasGenerator) => {
      gen.layers.forEach((layer: any) => {
        expect(validTypes).toContain(layer.type);
      });
    };

    checkLayers(welcomeGenerator);
    checkLayers(rankGenerator);
    checkLayers(rankGradientGenerator);
  });

  it('should have x and y positions for all layers', () => {
    const checkLayers = (gen: CanvasGenerator) => {
      gen.layers.forEach((layer: any) => {
        expect(typeof layer.x).toBe('number');
        expect(typeof layer.y).toBe('number');
      });
    };

    checkLayers(welcomeGenerator);
    checkLayers(rankGenerator);
  });

  it('should have valid text layer properties', () => {
    const textLayers = [
      ...welcomeGenerator.layers.filter((l: any) => l.type === 'text'),
      ...rankGenerator.layers.filter((l: any) => l.type === 'text'),
    ];

    textLayers.forEach((layer: any) => {
      expect(layer.text).toBeDefined();
      // Optional properties should be strings or numbers if present
      if (layer.font) expect(typeof layer.font).toBe('string');
      if (layer.size) expect(typeof layer.size).toBe('number');
      if (layer.align) expect(['left', 'center', 'right']).toContain(layer.align);
    });
  });

  it('should have valid rect layer properties', () => {
    const rectLayers = [
      ...welcomeGenerator.layers.filter((l: any) => l.type === 'rect'),
      ...rankGenerator.layers.filter((l: any) => l.type === 'rect'),
    ];

    rectLayers.forEach((layer: any) => {
      expect(layer.width).toBeDefined();
      expect(layer.height).toBeDefined();
    });
  });

  it('should have valid circle_image layer properties', () => {
    const circleLayers = [
      ...welcomeGenerator.layers.filter((l: any) => l.type === 'circle_image'),
      ...rankGenerator.layers.filter((l: any) => l.type === 'circle_image'),
    ];

    circleLayers.forEach((layer: any) => {
      expect(layer.radius).toBeDefined();
      expect(layer.src || layer.url).toBeDefined();
    });
  });

  it('should have valid progress_bar layer properties', () => {
    const progressLayers = [
      ...rankGenerator.layers.filter((l: any) => l.type === 'progress_bar'),
    ];

    progressLayers.forEach((layer: any) => {
      expect(layer.width).toBeDefined();
      expect(layer.height).toBeDefined();
      expect(layer.progress || layer.value).toBeDefined();
    });
  });

  it('should have valid gradient layer properties', () => {
    const gradientLayers = [
      ...rankGradientGenerator.layers.filter((l: any) => l.type === 'gradient'),
    ];

    gradientLayers.forEach((layer: any) => {
      expect(layer.width).toBeDefined();
      expect(layer.height).toBeDefined();
      expect(Array.isArray(layer.stops)).toBe(true);
      expect(layer.stops.length).toBeGreaterThan(0);
      layer.stops.forEach((stop: any) => {
        expect(typeof stop.offset).toBe('number');
        expect(stop.color).toBeDefined();
      });
    });
  });
});

describe('Conditional Rendering', () => {
  it('should support when property on rank card status indicator', () => {
    // Rank generator has a conditional status indicator
    const conditionalLayer = rankGenerator.layers.find(
      (l: any) => l.when !== undefined
    );
    expect(conditionalLayer).toBeDefined();
    // when fields use raw JEXL expressions (evaluated), not ${} syntax (interpolated)
    expect(typeof (conditionalLayer as any).when).toBe('string');
    expect((conditionalLayer as any).when.length).toBeGreaterThan(0);
  });
});

describe('Expression Interpolation Patterns', () => {
  it('should use ${} syntax for user properties', () => {
    const allLayers = [
      ...welcomeGenerator.layers,
      ...rankGenerator.layers,
    ];

    const userExpressions = allLayers
      .filter((l: any) => l.src?.includes('${user') || l.text?.includes('${user'))
      .map((l: any) => l.src || l.text);

    expect(userExpressions.length).toBeGreaterThan(0);
    userExpressions.forEach((expr: string) => {
      expect(expr).toMatch(/\$\{user\.\w+\}/);
    });
  });

  it('should use ${} syntax for guild properties', () => {
    const welcomeTexts = welcomeGenerator.layers
      .filter((l: any) => l.text?.includes('${guild'))
      .map((l: any) => l.text);

    expect(welcomeTexts.length).toBeGreaterThan(0);
  });

  it('should use ${} syntax for level/xp properties', () => {
    const rankTexts = rankGenerator.layers
      .filter((l: any) => {
        const text = l.text || l.progress;
        return text?.includes('${level}') || text?.includes('${xp}') || text?.includes('${rank}');
      });

    expect(rankTexts.length).toBeGreaterThan(0);
  });
});
