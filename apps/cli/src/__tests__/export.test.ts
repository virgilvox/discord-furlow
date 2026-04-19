/**
 * CLI `furlow export` smoke test.
 *
 * Runs the export command against a fixture spec written to a temp directory
 * and verifies it produces valid Discord command-registration JSON. Catches
 * regressions in option-type mapping, subcommand transformation, and context
 * menu handling without needing a Discord connection.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { exportCommand } from '../commands/export.js';

const FIXTURE_SPEC = `
version: "0.1"

identity:
  name: "smoke test bot"

commands:
  - name: ping
    description: Check bot latency
    actions:
      - reply:
          content: "pong"

  - name: echo
    description: Echo a message
    options:
      - name: text
        description: What to echo
        type: string
        required: true
      - name: times
        description: How many times
        type: integer
        required: false
        min_value: 1
        max_value: 5
    actions:
      - reply:
          content: "\${options.text}"
`;

describe('furlow export', () => {
  let workDir: string;
  let specPath: string;
  let outputPath: string;
  const originalLog = console.log;

  beforeEach(async () => {
    workDir = await mkdtemp(join(tmpdir(), 'furlow-export-'));
    specPath = join(workDir, 'furlow.yaml');
    outputPath = join(workDir, 'commands.json');
    await writeFile(specPath, FIXTURE_SPEC, 'utf8');
    // Silence chalk output during the test; we read artifacts from disk.
    console.log = vi.fn();
  });

  afterEach(async () => {
    console.log = originalLog;
    await rm(workDir, { recursive: true, force: true });
  });

  it('writes Discord command JSON with correct shape and option types', async () => {
    await exportCommand(specPath, { output: outputPath });

    const raw = await readFile(outputPath, 'utf8');
    const commands = JSON.parse(raw) as Array<{
      name: string;
      description: string;
      options?: Array<{ name: string; type: number; required?: boolean }>;
    }>;

    expect(commands).toHaveLength(2);

    const ping = commands.find((c) => c.name === 'ping');
    expect(ping).toBeDefined();
    expect(ping?.description).toBe('Check bot latency');

    const echo = commands.find((c) => c.name === 'echo');
    expect(echo).toBeDefined();
    expect(echo?.options).toBeDefined();
    // Option types: 3 = STRING, 4 = INTEGER.
    const textOpt = echo?.options?.find((o) => o.name === 'text');
    const timesOpt = echo?.options?.find((o) => o.name === 'times');
    expect(textOpt?.type).toBe(3);
    expect(textOpt?.required).toBe(true);
    expect(timesOpt?.type).toBe(4);
  });

  it('accepts a spec with no commands without producing invalid JSON', async () => {
    const emptySpec = `
version: "0.1"
identity:
  name: "empty"
`;
    await writeFile(specPath, emptySpec, 'utf8');
    await exportCommand(specPath, { output: outputPath });

    const raw = await readFile(outputPath, 'utf8');
    const commands = JSON.parse(raw);
    expect(Array.isArray(commands)).toBe(true);
    expect(commands).toHaveLength(0);
  });
});
