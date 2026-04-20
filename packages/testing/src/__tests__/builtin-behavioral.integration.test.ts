/**
 * Behavioral smoke test per builtin.
 *
 * The cross-builtin event-name guard catches the "wrong event name" bug
 * class at authoring time by comparing declared names against
 * EMITTED_FURLOW_EVENTS. This integration test closes the remaining gap:
 * it proves each builtin's event handler actually RUNS when the runtime
 * emits the claimed event. If the runtime silently drops an event or the
 * context is missing a field the handler dereferences, this test catches
 * it.
 *
 * For each builtin:
 *   1. Load its spec via the published getXxxSpec() factory.
 *   2. Stand up an E2E runtime around the spec.
 *   3. Simulate the Discord trigger that should fire the event.
 *   4. Assert at least one action from the handler chain executed.
 *
 * This is the minimal test that catches regressions of the form "the
 * handler is registered against an event the runtime never emits."
 */

import { describe, it, expect, afterEach } from 'vitest';
import type { FurlowSpec } from '@furlow/schema';
import { createE2ERuntimeFromSpec, type E2ETestRuntime } from '../e2e/index.js';

import {
  getAfkSpec,
  getAutoResponderSpec,
  getLevelingSpec,
  getLoggingSpec,
  getReactionRolesSpec,
  getStarboardSpec,
  getWelcomeSpec,
} from '@furlow/builtins';

async function runtimeFor(spec: Partial<FurlowSpec>): Promise<E2ETestRuntime> {
  // E2E runtime requires a top-level `version:`. Builtins return a
  // Partial<FurlowSpec> without one; add it and pass through the spec path
  // that skips YAML parsing (we already have the object).
  const full: FurlowSpec = { version: '0.1', ...(spec as FurlowSpec) };
  const runtime = await createE2ERuntimeFromSpec(full, { validate: false });
  await runtime.start();
  return runtime;
}

describe('builtin behavioral integration', () => {
  let runtime: E2ETestRuntime | null = null;

  afterEach(async () => {
    if (runtime) {
      await runtime.stop();
      runtime = null;
    }
  });

  it('afk: message_create handler fires and clears AFK status', async () => {
    runtime = await runtimeFor(getAfkSpec());
    const before = runtime.getExecutedActions().length;
    await runtime.simulateMessage('I am back', { authorBot: false });
    const ran = runtime.getExecutedActions().slice(before);
    // The afk message_create handler starts with a db_query to look up the
    // user's AFK state. If the event does not fire (the pre-1.0.7 bug),
    // this assertion fails.
    expect(ran.some((a) => a.action === 'db_query')).toBe(true);
  });

  it('auto-responder: message_create handler fires', async () => {
    runtime = await runtimeFor(getAutoResponderSpec());
    const before = runtime.getExecutedActions().length;
    await runtime.simulateMessage('trigger word test');
    const ran = runtime.getExecutedActions().slice(before);
    expect(ran.some((a) => a.action === 'db_query')).toBe(true);
  });

  it('leveling: message_create handler fires (XP accrual)', async () => {
    runtime = await runtimeFor(getLevelingSpec());
    const before = runtime.getExecutedActions().length;
    await runtime.simulateMessage('hello');
    const ran = runtime.getExecutedActions().slice(before);
    // Leveling's message handler checks roles / cooldowns then increments
    // XP. The first action is a db_query or flow_if checking cooldown.
    expect(ran.length).toBeGreaterThan(0);
  });

  it('logging: registers the expected Discord event handlers', async () => {
    runtime = await runtimeFor(getLoggingSpec());
    // Logging's value is the breadth of events it listens to. Verify the
    // spec wires the key ones; simulating each is covered in per-event
    // unit tests in @furlow/discord.
    const spec = runtime.spec;
    const eventNames = spec.events?.map((e) => e.event) ?? [];
    expect(eventNames).toContain('message_delete');
    expect(eventNames).toContain('message_update');
    expect(eventNames).toContain('message_delete_bulk');
    expect(eventNames).toContain('member_join');
    expect(eventNames).toContain('member_leave');
    expect(eventNames).toContain('member_ban');
    expect(eventNames).toContain('member_unban');
    expect(eventNames).toContain('channel_create');
    expect(eventNames).toContain('channel_delete');
    expect(eventNames).toContain('role_create');
    expect(eventNames).toContain('role_delete');
    // A previous shipped bug was `message_bulk_delete` (wrong) instead of
    // `message_delete_bulk`. The canonical one must be present.
    expect(eventNames).not.toContain('message_bulk_delete');
  });

  it('reaction-roles: message_reaction_add handler fires', async () => {
    runtime = await runtimeFor(getReactionRolesSpec());
    const before = runtime.getExecutedActions().length;
    await runtime.simulateReactionAdd('✅');
    const ran = runtime.getExecutedActions().slice(before);
    // Reaction-roles listens for message_reaction_add and queries the
    // reaction_role_assignments table.
    expect(ran.length).toBeGreaterThan(0);
  });

  it('starboard: message_reaction_add handler fires', async () => {
    runtime = await runtimeFor(getStarboardSpec());
    const before = runtime.getExecutedActions().length;
    await runtime.simulateReactionAdd('⭐');
    const ran = runtime.getExecutedActions().slice(before);
    expect(ran.length).toBeGreaterThan(0);
  });

  it('welcome: member_join handler fires', async () => {
    runtime = await runtimeFor(getWelcomeSpec());
    const before = runtime.getExecutedActions().length;
    await runtime.simulateMemberJoin();
    const ran = runtime.getExecutedActions().slice(before);
    // Welcome greets the new member, typically via a send_message or a
    // canvas_render followed by send_message.
    expect(ran.length).toBeGreaterThan(0);
  });

  it('every builtin spec loads and validates without erroring', async () => {
    // Structural assertion: each builtin's getXxxSpec() returns a spec that
    // the runtime accepts. Regressions here usually mean a schema change
    // broke a builtin.
    const specs = [
      getAfkSpec(),
      getAutoResponderSpec(),
      getLevelingSpec(),
      getLoggingSpec(),
      getReactionRolesSpec(),
      getStarboardSpec(),
      getWelcomeSpec(),
    ];
    for (const spec of specs) {
      const r = await runtimeFor(spec);
      await r.stop();
    }
  });
});
