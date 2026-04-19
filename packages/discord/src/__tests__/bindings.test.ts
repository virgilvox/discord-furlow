/**
 * Exhaustive per-binding coverage.
 *
 * `bindings.ts` is the single source of truth for how Discord.js events turn
 * into FURLOW events. A gap here means a user's YAML handler silently never
 * fires. This test iterates every binding, constructs a plausible Discord.js
 * payload, runs it through the binding, and asserts the FURLOW event name(s)
 * match what `EMITTED_FURLOW_EVENTS` advertises.
 *
 * Discord.js v14 ClientEvents payload shapes (abridged) are reproduced in
 * `fixtures` below. Each entry maps one `discordEvent` to a payload tuple
 * and a list of expected FURLOW emissions.
 *
 * If you add a new binding, add it here too. The test asserts coverage by
 * checking that every binding in BINDINGS is exercised.
 */

import { describe, it, expect } from 'vitest';
import { EventEmitter } from 'node:events';
import type { ClientEvents } from 'discord.js';

import { BINDINGS, EMITTED_FURLOW_EVENTS, type ContextDependencies } from '../events/index.js';

function makeDeps(): ContextDependencies {
  const client = new EventEmitter();
  return {
    client: client as unknown as ContextDependencies['client'],
    evaluator: {},
    stateManager: {},
    flowEngine: {},
    voiceManager: null,
    actionExecutor: {},
    eventRouter: {},
    spec: {} as ContextDependencies['spec'],
  };
}

// Shared stub entities.
const guild = { id: 'g1', name: 'g' };
const user = { id: 'u1', username: 'alice', bot: false };
const botUser = { id: 'b1', username: 'bot', bot: true };
const member = { id: 'u1', user, guild, premiumSince: null as Date | null };
const channel = { id: 'c1', guild };
const role = { id: 'r1', name: 'role', guild };
const thread = { id: 't1', guild, guildId: 'g1' };

/**
 * Payload fixtures keyed by Discord.js event name. Payloads are the tuple
 * `ClientEvents[K]` (wrapped so we can pass as `...args`). Each entry also
 * declares which FURLOW events should emit.
 */
interface Fixture {
  args: unknown[];
  expect: string[];
}

const fixtures: Partial<Record<keyof ClientEvents, Fixture>> = {
  clientReady: {
    args: [],
    expect: ['ready'],
  },
  shardReady: {
    args: [0, new Set(['g1', 'g2'])],
    expect: ['shard_ready'],
  },
  shardDisconnect: {
    args: [{ code: 1000, reason: 'bye' }, 0],
    expect: ['shard_disconnect'],
  },
  shardError: {
    args: [new Error('ws failed'), 0],
    expect: ['shard_error'],
  },
  guildCreate: {
    args: [guild],
    expect: ['guild_create'],
  },
  guildDelete: {
    args: [guild],
    expect: ['guild_delete'],
  },
  guildUpdate: {
    args: [guild, { ...guild, name: 'g renamed' }],
    expect: ['guild_update'],
  },
  guildMemberAdd: {
    args: [member],
    expect: ['member_join'],
  },
  guildMemberRemove: {
    args: [member],
    expect: ['member_leave'],
  },
  guildMemberUpdate: {
    args: [member, member],
    expect: ['member_update'],
  },
  guildBanAdd: {
    args: [{ user, guild, reason: 'spam' }],
    expect: ['member_ban'],
  },
  guildBanRemove: {
    args: [{ user, guild }],
    expect: ['member_unban'],
  },
  messageCreate: {
    args: [{ id: 'm1', author: user, channel, guild, guildId: 'g1', channelId: 'c1', attachments: new Map() }],
    expect: ['message_create'],
  },
  messageUpdate: {
    args: [
      { id: 'm1', author: user, channel, guild, guildId: 'g1', channelId: 'c1' },
      { id: 'm1', author: user, channel, guild, guildId: 'g1', channelId: 'c1', content: 'edited' },
    ],
    expect: ['message_update'],
  },
  messageDelete: {
    args: [{ id: 'm1', author: user, channel, guild, guildId: 'g1', channelId: 'c1' }],
    expect: ['message_delete'],
  },
  messageDeleteBulk: {
    args: [new Map([['m1', { id: 'm1' }]]), channel],
    expect: ['message_delete_bulk'],
  },
  messageReactionAdd: {
    args: [
      { emoji: { name: '👍' }, message: { id: 'm1', channelId: 'c1', guildId: 'g1', channel, guild } },
      user,
    ],
    expect: ['message_reaction_add', 'reaction_add'],
  },
  messageReactionRemove: {
    args: [
      { emoji: { name: '👍' }, message: { id: 'm1', channelId: 'c1', guildId: 'g1', channel, guild } },
      user,
    ],
    expect: ['message_reaction_remove', 'reaction_remove'],
  },
  messageReactionRemoveAll: {
    args: [{ id: 'm1', author: user, channel, guild, guildId: 'g1', channelId: 'c1' }],
    expect: ['message_reaction_remove_all'],
  },
  channelCreate: {
    args: [channel],
    expect: ['channel_create'],
  },
  channelDelete: {
    args: [channel],
    expect: ['channel_delete'],
  },
  channelUpdate: {
    args: [channel, { ...channel, name: 'renamed' }],
    expect: ['channel_update'],
  },
  channelPinsUpdate: {
    args: [channel, new Date()],
    expect: ['channel_pins_update'],
  },
  threadCreate: {
    args: [thread, true],
    expect: ['thread_create'],
  },
  threadDelete: {
    args: [thread],
    expect: ['thread_delete'],
  },
  threadUpdate: {
    args: [thread, { ...thread, name: 't renamed' }],
    expect: ['thread_update'],
  },
  threadMemberUpdate: {
    args: [
      { thread, userId: 'u1' },
      { thread, userId: 'u1' },
    ],
    expect: ['thread_member_update'],
  },
  roleCreate: {
    args: [role],
    expect: ['role_create'],
  },
  roleDelete: {
    args: [role],
    expect: ['role_delete'],
  },
  roleUpdate: {
    args: [role, { ...role, name: 'r renamed' }],
    expect: ['role_update'],
  },
  emojiCreate: {
    args: [{ id: 'e1', name: 'party', guild }],
    expect: ['emoji_create'],
  },
  emojiDelete: {
    args: [{ id: 'e1', name: 'party', guild }],
    expect: ['emoji_delete'],
  },
  emojiUpdate: {
    args: [
      { id: 'e1', name: 'party', guild },
      { id: 'e1', name: 'PARTY', guild },
    ],
    expect: ['emoji_update'],
  },
  stickerCreate: {
    args: [{ id: 's1', name: 'hi', guild }],
    expect: ['sticker_create'],
  },
  stickerDelete: {
    args: [{ id: 's1', name: 'hi', guild }],
    expect: ['sticker_delete'],
  },
  stickerUpdate: {
    args: [
      { id: 's1', name: 'hi', guild },
      { id: 's1', name: 'howdy', guild },
    ],
    expect: ['sticker_update'],
  },
  inviteCreate: {
    args: [{ code: 'abc', guild, channel, inviter: user }],
    expect: ['invite_create'],
  },
  inviteDelete: {
    args: [{ code: 'abc', guild, channel }],
    expect: ['invite_delete'],
  },
  voiceStateUpdate: {
    args: [
      { channel: null, streaming: false, member },
      { channel: { id: 'vc1' }, streaming: false, member },
    ],
    expect: ['voice_join', 'voice_state_update'],
  },
  presenceUpdate: {
    args: [null, { user, guild, status: 'online', activities: [] }],
    expect: ['presence_update'],
  },
  typingStart: {
    args: [{ user, channel, guild }],
    expect: ['typing_start'],
  },
  guildScheduledEventCreate: {
    args: [{ id: 'se1', guild, channel, name: 'e' }],
    expect: ['scheduled_event_create'],
  },
  guildScheduledEventDelete: {
    args: [{ id: 'se1', guild, channel, name: 'e' }],
    expect: ['scheduled_event_delete'],
  },
  guildScheduledEventUpdate: {
    args: [
      { id: 'se1', guild, channel, name: 'e' },
      { id: 'se1', guild, channel, name: 'renamed' },
    ],
    expect: ['scheduled_event_update'],
  },
  guildScheduledEventUserAdd: {
    args: [{ id: 'se1', guild, channel }, user],
    expect: ['scheduled_event_user_add'],
  },
  guildScheduledEventUserRemove: {
    args: [{ id: 'se1', guild, channel }, user],
    expect: ['scheduled_event_user_remove'],
  },
  stageInstanceCreate: {
    args: [{ id: 'si1', guild, channel }],
    expect: ['stage_instance_create'],
  },
  stageInstanceDelete: {
    args: [{ id: 'si1', guild, channel }],
    expect: ['stage_instance_delete'],
  },
  stageInstanceUpdate: {
    args: [
      { id: 'si1', guild, channel },
      { id: 'si1', guild, channel, topic: 'new' },
    ],
    expect: ['stage_instance_update'],
  },
};

describe('BINDINGS coverage', () => {
  const deps = makeDeps();

  it('every binding has a fixture in this test', () => {
    const covered = new Set(Object.keys(fixtures));
    const missing = BINDINGS.filter((b) => !covered.has(b.discordEvent)).map((b) => b.discordEvent);
    expect(missing, 'bindings without test fixtures').toEqual([]);
  });

  it.each(BINDINGS.map((b) => [b.discordEvent, b] as const))(
    '%s emits the documented FURLOW events',
    (eventName, binding) => {
      const fixture = fixtures[eventName];
      if (!fixture) throw new Error(`missing fixture for ${eventName}`);

      const emissions = binding.handle(fixture.args, deps);
      const names = emissions.map((e) => e.event);
      for (const expected of fixture.expect) {
        expect(names, `binding ${eventName} should emit ${expected}`).toContain(expected);
      }

      // Every emitted event must be advertised in EMITTED_FURLOW_EVENTS.
      for (const name of names) {
        expect(EMITTED_FURLOW_EVENTS, `${name} must appear in EMITTED_FURLOW_EVENTS`).toContain(name);
      }

      // Every emitted context carries the base shared fields.
      for (const emission of emissions) {
        expect(emission.context).toHaveProperty('now');
        expect(emission.context).toHaveProperty('state');
        expect(emission.context).toHaveProperty('options');
      }
    },
  );

  it('messageCreate skips bot authors', () => {
    const binding = BINDINGS.find((b) => b.discordEvent === 'messageCreate');
    expect(binding).toBeDefined();
    const emissions = binding!.handle(
      [{ id: 'm1', author: botUser, channel, guild, guildId: 'g1', channelId: 'c1', attachments: new Map() }],
      deps,
    );
    expect(emissions).toHaveLength(0);
  });

  it('messageReactionAdd skips bot users', () => {
    const binding = BINDINGS.find((b) => b.discordEvent === 'messageReactionAdd');
    const emissions = binding!.handle(
      [{ emoji: { name: '👍' }, message: { id: 'm1' } }, botUser],
      deps,
    );
    expect(emissions).toHaveLength(0);
  });

  it('voiceStateUpdate emits voice_leave on disconnect', () => {
    const binding = BINDINGS.find((b) => b.discordEvent === 'voiceStateUpdate');
    const emissions = binding!.handle(
      [
        { channel: { id: 'vc1' }, streaming: false, member },
        { channel: null, streaming: false, member },
      ],
      deps,
    );
    const names = emissions.map((e) => e.event);
    expect(names).toContain('voice_leave');
  });

  it('voiceStateUpdate emits voice_move when switching channels', () => {
    const binding = BINDINGS.find((b) => b.discordEvent === 'voiceStateUpdate');
    const emissions = binding!.handle(
      [
        { channel: { id: 'vc1' }, streaming: false, member },
        { channel: { id: 'vc2' }, streaming: false, member },
      ],
      deps,
    );
    const names = emissions.map((e) => e.event);
    expect(names).toContain('voice_move');
  });

  it('voiceStateUpdate emits voice_stream_start and stop', () => {
    const binding = BINDINGS.find((b) => b.discordEvent === 'voiceStateUpdate');
    const startEmissions = binding!.handle(
      [
        { channel: { id: 'vc1' }, streaming: false, member },
        { channel: { id: 'vc1' }, streaming: true, member },
      ],
      deps,
    );
    expect(startEmissions.map((e) => e.event)).toContain('voice_stream_start');

    const stopEmissions = binding!.handle(
      [
        { channel: { id: 'vc1' }, streaming: true, member },
        { channel: { id: 'vc1' }, streaming: false, member },
      ],
      deps,
    );
    expect(stopEmissions.map((e) => e.event)).toContain('voice_stream_stop');
  });

  it('guildMemberUpdate emits member_unboost when premiumSince drops to null', () => {
    const binding = BINDINGS.find((b) => b.discordEvent === 'guildMemberUpdate');
    const wasBooster = { ...member, premiumSince: new Date() };
    const emissions = binding!.handle(
      [wasBooster, { ...member, premiumSince: null }],
      deps,
    );
    expect(emissions.map((e) => e.event)).toContain('member_unboost');
  });

  it('EMITTED_FURLOW_EVENTS contains every fixture-declared emission', () => {
    for (const fixture of Object.values(fixtures)) {
      if (!fixture) continue;
      for (const name of fixture.expect) {
        expect(EMITTED_FURLOW_EVENTS).toContain(name);
      }
    }
  });

  it('every binding declares a description', () => {
    for (const binding of BINDINGS) {
      expect(binding.description, `${binding.discordEvent} must have description`).toBeTruthy();
    }
  });
});
