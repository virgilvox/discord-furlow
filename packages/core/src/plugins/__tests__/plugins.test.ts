import { describe, it, expect, beforeEach } from 'vitest';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { createActionRegistry } from '../../actions/index.js';
import { createEvaluator } from '../../expression/index.js';
import { loadPlugin, loadPlugins, PluginLoadError } from '../index.js';

describe('plugin loader', () => {
  let tmp: string;

  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), 'furlow-plugin-test-'));
  });

  function writePlugin(filename: string, source: string): string {
    const path = join(tmp, filename);
    writeFileSync(path, source, 'utf8');
    return path;
  }

  it('loads a plugin exported as a default function', async () => {
    writePlugin('plugin-fn.mjs', `
      export default function (ctx) {
        ctx.registerAction({
          name: 'my_custom',
          execute: async () => ({ success: true, data: 'ok' }),
        });
      }
    `);

    const registry = createActionRegistry();
    const evaluator = createEvaluator();

    const result = await loadPlugin('./plugin-fn.mjs', registry, evaluator, { baseDir: tmp });

    expect(result.source).toBe('./plugin-fn.mjs');
    expect(registry.has('my_custom')).toBe(true);
  });

  it('loads a plugin exported as a default Plugin object', async () => {
    writePlugin('plugin-obj.mjs', `
      export default {
        name: 'demo-plugin',
        version: '1.0.0',
        register(ctx) {
          ctx.registerFunction('double', (x) => x * 2);
        },
      };
    `);

    const registry = createActionRegistry();
    const evaluator = createEvaluator();

    const result = await loadPlugin('./plugin-obj.mjs', registry, evaluator, { baseDir: tmp });

    expect(result.name).toBe('demo-plugin');
    const value = await evaluator.evaluate<number>('double(21)');
    expect(value).toBe(42);
  });

  it('loads a plugin exported as a named `plugin` export', async () => {
    writePlugin('plugin-named.mjs', `
      export const plugin = {
        name: 'named-plugin',
        register(ctx) {
          ctx.registerTransform('bracket', (value) => '[' + value + ']');
        },
      };
    `);

    const registry = createActionRegistry();
    const evaluator = createEvaluator();

    await loadPlugin('./plugin-named.mjs', registry, evaluator, { baseDir: tmp });

    const value = await evaluator.evaluate<string>("'hello' | bracket");
    expect(value).toBe('[hello]');
  });

  it('resolves paths relative to a spec file', async () => {
    writePlugin('my-plugin.mjs', `
      export default function (ctx) {
        ctx.registerFunction('speak', () => 'spoken');
      }
    `);

    const registry = createActionRegistry();
    const evaluator = createEvaluator();
    const specFile = join(tmp, 'furlow.yaml');

    await loadPlugin('./my-plugin.mjs', registry, evaluator, { baseDir: specFile });

    const value = await evaluator.evaluate<string>('speak()');
    expect(value).toBe('spoken');
  });

  it('supports async register hooks', async () => {
    writePlugin('plugin-async.mjs', `
      export default async function (ctx) {
        await new Promise((r) => setTimeout(r, 5));
        ctx.registerAction({
          name: 'async_registered',
          execute: async () => ({ success: true }),
        });
      }
    `);

    const registry = createActionRegistry();
    const evaluator = createEvaluator();

    await loadPlugin('./plugin-async.mjs', registry, evaluator, { baseDir: tmp });

    expect(registry.has('async_registered')).toBe(true);
  });

  it('wraps registration errors in PluginLoadError with the source name', async () => {
    writePlugin('plugin-boom.mjs', `
      export default function () { throw new Error('user code failure'); }
    `);

    const registry = createActionRegistry();
    const evaluator = createEvaluator();

    await expect(
      loadPlugin('./plugin-boom.mjs', registry, evaluator, { baseDir: tmp }),
    ).rejects.toBeInstanceOf(PluginLoadError);
  });

  it('rejects a module with no recognised plugin export', async () => {
    writePlugin('plugin-bare.mjs', `
      export const unrelated = 42;
    `);

    const registry = createActionRegistry();
    const evaluator = createEvaluator();

    await expect(
      loadPlugin('./plugin-bare.mjs', registry, evaluator, { baseDir: tmp }),
    ).rejects.toThrow(/default.*function.*Plugin/);
  });

  it('validates registerAction arguments', async () => {
    writePlugin('plugin-bad-action.mjs', `
      export default function (ctx) { ctx.registerAction({}); }
    `);

    const registry = createActionRegistry();
    const evaluator = createEvaluator();

    await expect(
      loadPlugin('./plugin-bad-action.mjs', registry, evaluator, { baseDir: tmp }),
    ).rejects.toThrow(/name.*execute/);
  });

  it('loadPlugins runs sources in declaration order', async () => {
    writePlugin('a.mjs', `
      export default function (ctx) { ctx.registerAction({ name: 'first', execute: async () => ({ success: true }) }); }
    `);
    writePlugin('b.mjs', `
      export default function (ctx) { ctx.registerAction({ name: 'second', execute: async () => ({ success: true }) }); }
    `);

    const registry = createActionRegistry();
    const evaluator = createEvaluator();

    const loaded = await loadPlugins(['./a.mjs', './b.mjs'], registry, evaluator, { baseDir: tmp });

    expect(loaded.map((p) => p.source)).toEqual(['./a.mjs', './b.mjs']);
    expect(registry.has('first')).toBe(true);
    expect(registry.has('second')).toBe(true);
  });

  it('supports absolute plugin paths', async () => {
    const absolute = writePlugin('plugin-absolute.mjs', `
      export default function (ctx) { ctx.registerFunction('absolute_fn', () => 'yes'); }
    `);

    const registry = createActionRegistry();
    const evaluator = createEvaluator();

    await loadPlugin(absolute, registry, evaluator, { baseDir: '/nonexistent' });

    const value = await evaluator.evaluate<string>('absolute_fn()');
    expect(value).toBe('yes');
  });
});
