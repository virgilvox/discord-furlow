/**
 * CLI `furlow validate` smoke test.
 *
 * Validates fixtures against the real schema and parser. Catches regressions
 * where schema changes diverge from example YAML. Does not exercise the
 * `process.exit(1)` failure path because it would terminate the test runner.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { validateCommand } from '../commands/validate.js';

const VALID_SPEC = `
version: "0.1"

identity:
  name: "valid smoke bot"

commands:
  - name: ping
    description: Check bot latency
    actions:
      - reply:
          content: "pong"

events:
  - event: member_join
    actions:
      - log:
          message: "member joined"
`;

describe('furlow validate', () => {
  let workDir: string;
  let specPath: string;
  const originalLog = console.log;

  beforeEach(async () => {
    workDir = await mkdtemp(join(tmpdir(), 'furlow-validate-'));
    specPath = join(workDir, 'furlow.yaml');
    await writeFile(specPath, VALID_SPEC, 'utf8');
    console.log = vi.fn();
  });

  afterEach(async () => {
    console.log = originalLog;
    await rm(workDir, { recursive: true, force: true });
  });

  it('accepts a well-formed spec without exiting', async () => {
    // Success path: no process.exit, no throw.
    await expect(validateCommand(specPath, { strict: false })).resolves.toBeUndefined();
  });

  it('accepts strict mode on the same fixture', async () => {
    await expect(validateCommand(specPath, { strict: true })).resolves.toBeUndefined();
  });
});
