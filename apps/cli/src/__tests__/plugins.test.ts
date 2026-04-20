/**
 * CLI plugin loading smoke test.
 *
 * Exercises the real plugin loader end-to-end: create a temp spec + plugin
 * file, ask the loader to register them, and verify the action registry sees
 * the custom action. The CLI's `startCommand` itself needs a running Discord
 * connection, so we call the underlying loader directly rather than through
 * `start`. Catches regressions in the `@furlow/core/plugins` exports the CLI
 * depends on.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { createActionRegistry, createEvaluator, loadPlugins } from '@furlow/core';

describe('plugin loader (CLI integration surface)', () => {
  let workDir: string;

  beforeEach(async () => {
    workDir = await mkdtemp(join(tmpdir(), 'furlow-cli-plugin-'));
  });

  afterEach(async () => {
    await rm(workDir, { recursive: true, force: true });
  });

  it('resolves plugin paths relative to the spec file', async () => {
    const specPath = join(workDir, 'furlow.yaml');
    await writeFile(specPath, 'version: "0.1"\n', 'utf8');

    const pluginPath = join(workDir, 'plugin.mjs');
    await writeFile(pluginPath, `
      export default function (ctx) {
        ctx.registerAction({
          name: 'greet_user',
          cost: 1,
          execute: async () => ({ success: true, data: 'hi' }),
        });
        ctx.registerFunction('shout', (s) => String(s).toUpperCase() + '!');
      }
    `, 'utf8');

    const registry = createActionRegistry();
    const evaluator = createEvaluator();

    const loaded = await loadPlugins(['./plugin.mjs'], registry, evaluator as never, {
      baseDir: specPath,
    });

    expect(loaded).toHaveLength(1);
    expect(registry.has('greet_user')).toBe(true);
    expect(await evaluator.evaluate('shout("hey")')).toBe('HEY!');
  });
});
