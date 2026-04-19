/**
 * DiscordEventRouter + context builder tests.
 *
 * The router's value is structural: given a Discord.js event, it emits the
 * documented FURLOW events with a context containing the expected keys.
 * These tests exercise that contract using a lightweight EventEmitter stand-in
 * for discord.js Client.
 */

import { describe, expect, it, vi, beforeEach } from 'vitest';
import { EventEmitter } from 'node:events';

import {
  DiscordEventRouter,
  buildBaseContext,
  withMember,
  withMessage,
  wrapDiscordObject,
  type ContextDependencies,
  type CoreEventRouterLike,
} from '../events/index.js';

function makeDeps(client: EventEmitter): { deps: ContextDependencies; core: CoreEventRouterLike; emitted: Array<{ event: string; context: Record<string, unknown> }> } {
  const emitted: Array<{ event: string; context: Record<string, unknown> }> = [];
  const core: CoreEventRouterLike = {
    emit: vi.fn(async (event, context) => {
      emitted.push({ event, context: context as Record<string, unknown> });
    }),
  };
  const deps: ContextDependencies = {
    client: client as unknown as ContextDependencies['client'],
    evaluator: {},
    stateManager: {},
    flowEngine: {},
    voiceManager: null,
    actionExecutor: {},
    eventRouter: core,
    spec: {} as ContextDependencies['spec'],
  };
  return { deps, core, emitted };
}

describe('wrapDiscordObject', () => {
  it('returns null/undefined unchanged', () => {
    expect(wrapDiscordObject(null)).toBeNull();
    expect(wrapDiscordObject(undefined)).toBeUndefined();
  });

  it('exposes URL methods as properties', () => {
    const obj = {
      displayAvatarURL: (opts: { size: number; dynamic: boolean }) => `url?size=${opts.size}`,
      username: 'alice',
    };
    const wrapped = wrapDiscordObject(obj) as { displayAvatarURL: string; username: string };
    expect(wrapped.displayAvatarURL).toBe('url?size=512');
    expect(wrapped.username).toBe('alice');
  });

  it('binds non-URL methods to preserve `this`', () => {
    const obj = {
      name: 'alice',
      greet(this: { name: string }) {
        return `hi ${this.name}`;
      },
    };
    const wrapped = wrapDiscordObject(obj) as typeof obj;
    expect(wrapped.greet()).toBe('hi alice');
  });
});

describe('buildBaseContext', () => {
  it('populates dependencies and option bags', () => {
    const client = new EventEmitter();
    const { deps } = makeDeps(client);
    const ctx = buildBaseContext(deps) as Record<string, unknown>;
    expect(ctx.now).toBeInstanceOf(Date);
    expect(typeof ctx.random).toBe('number');
    expect(ctx.options).toEqual({});
    // `args` is an alias for `options` and must share the same reference.
    expect(ctx.args).toBe(ctx.options);
    expect(ctx.state).toEqual({});
    expect((ctx._deps as { client: unknown }).client).toBe(client);
  });
});

describe('withMessage / withMember', () => {
  it('copies message fields into context', () => {
    const message = {
      id: 'm1',
      author: { id: 'u1', bot: false },
      member: { id: 'u1' },
      channel: { id: 'c1' },
      guild: { id: 'g1' },
      guildId: 'g1',
      channelId: 'c1',
    };
    const ctx = withMessage({} as Record<string, unknown>, message) as Record<string, unknown>;
    expect(ctx.messageId).toBe('m1');
    expect(ctx.guildId).toBe('g1');
    expect(ctx.channelId).toBe('c1');
    expect(ctx.userId).toBe('u1');
  });

  it('copies member fields into context', () => {
    const member = {
      id: 'u1',
      user: { id: 'u1' },
      guild: { id: 'g1' },
    };
    const ctx = withMember({} as Record<string, unknown>, member) as Record<string, unknown>;
    expect(ctx.guildId).toBe('g1');
    expect(ctx.userId).toBe('u1');
  });
});

describe('DiscordEventRouter', () => {
  let client: EventEmitter;
  let deps: ContextDependencies;
  let core: CoreEventRouterLike;
  let emitted: Array<{ event: string; context: Record<string, unknown> }>;

  beforeEach(() => {
    client = new EventEmitter();
    ({ deps, core, emitted } = makeDeps(client));
  });

  it('wires every binding when started', () => {
    const router = new DiscordEventRouter({ client: client as unknown as never, deps, coreRouter: core });
    expect(client.eventNames()).toHaveLength(0);
    router.start();
    // Every binding plus the interactionCreate listener must be wired.
    expect(client.eventNames().length).toBeGreaterThan(10);
    router.stop();
    expect(client.eventNames()).toHaveLength(0);
  });

  it('is idempotent: start() twice does not double-wire', () => {
    const router = new DiscordEventRouter({ client: client as unknown as never, deps, coreRouter: core });
    router.start();
    const count1 = client.listenerCount('messageCreate');
    router.start();
    const count2 = client.listenerCount('messageCreate');
    expect(count2).toBe(count1);
    router.stop();
  });

  it('emits `ready` when the client fires ready', async () => {
    const router = new DiscordEventRouter({ client: client as unknown as never, deps, coreRouter: core });
    router.start();

    client.emit('clientReady');
    await new Promise((r) => setImmediate(r));

    const names = emitted.map((e) => e.event);
    expect(names).toContain('ready');
  });

  it('emits `message_create` with a message context and skips bots', async () => {
    const router = new DiscordEventRouter({ client: client as unknown as never, deps, coreRouter: core });
    router.start();

    const botMessage = { id: 'm0', author: { id: 'bot', bot: true } };
    client.emit('messageCreate', botMessage);
    await new Promise((r) => setImmediate(r));
    expect(emitted).toHaveLength(0);

    const userMessage = {
      id: 'm1',
      author: { id: 'u1', bot: false },
      channel: { id: 'c1' },
      guild: { id: 'g1' },
      guildId: 'g1',
      channelId: 'c1',
      attachments: new Map<string, { name: string; size: number; contentType: string; url: string }>(),
    };
    client.emit('messageCreate', userMessage);
    await new Promise((r) => setImmediate(r));

    expect(emitted).toHaveLength(1);
    expect(emitted[0]?.event).toBe('message_create');
    expect(emitted[0]?.context.messageId).toBe('m1');
    expect(emitted[0]?.context.attachments).toEqual([]);
  });

  it('emits both `message_reaction_add` and legacy `reaction_add`', async () => {
    const router = new DiscordEventRouter({ client: client as unknown as never, deps, coreRouter: core });
    router.start();

    const reaction = { emoji: { name: '👍' }, message: { id: 'm1', channelId: 'c1', guildId: 'g1' } };
    const user = { id: 'u1', bot: false };
    client.emit('messageReactionAdd', reaction, user);
    await new Promise((r) => setImmediate(r));

    const names = emitted.map((e) => e.event);
    expect(names).toContain('message_reaction_add');
    expect(names).toContain('reaction_add');
  });

  it('emits voice transition events on voiceStateUpdate', async () => {
    const router = new DiscordEventRouter({ client: client as unknown as never, deps, coreRouter: core });
    router.start();

    const member = { id: 'u1', user: { id: 'u1' }, guild: { id: 'g1' } };
    const oldState = { channel: null, streaming: false, member };
    const newState = { channel: { id: 'vc1' }, streaming: false, member };
    client.emit('voiceStateUpdate', oldState, newState);
    await new Promise((r) => setImmediate(r));

    const names = emitted.map((e) => e.event);
    expect(names).toContain('voice_join');
    expect(names).toContain('voice_state_update');
  });

  it('detects boost transitions on guildMemberUpdate', async () => {
    const router = new DiscordEventRouter({ client: client as unknown as never, deps, coreRouter: core });
    router.start();

    const oldMember = { id: 'u1', user: { id: 'u1' }, guild: { id: 'g1' }, premiumSince: null };
    const newMember = { id: 'u1', user: { id: 'u1' }, guild: { id: 'g1' }, premiumSince: new Date() };
    client.emit('guildMemberUpdate', oldMember, newMember);
    await new Promise((r) => setImmediate(r));

    const names = emitted.map((e) => e.event);
    expect(names).toContain('member_update');
    expect(names).toContain('member_boost');
  });

  it('routes component interactions to FURLOW events', async () => {
    const router = new DiscordEventRouter({ client: client as unknown as never, deps, coreRouter: core });
    router.start();

    const buttonInteraction = {
      isChatInputCommand: () => false,
      isAutocomplete: () => false,
      isUserContextMenuCommand: () => false,
      isMessageContextMenuCommand: () => false,
      isButton: () => true,
      isStringSelectMenu: () => false,
      isUserSelectMenu: () => false,
      isRoleSelectMenu: () => false,
      isChannelSelectMenu: () => false,
      isMentionableSelectMenu: () => false,
      isModalSubmit: () => false,
      customId: 'click_me',
      user: { id: 'u1' },
      channel: { id: 'c1' },
      guild: { id: 'g1' },
      guildId: 'g1',
      channelId: 'c1',
    };
    client.emit('interactionCreate', buttonInteraction);
    await new Promise((r) => setImmediate(r));

    expect(emitted.map((e) => e.event)).toContain('button_click');
    const ctx = emitted[0]?.context;
    expect(ctx?.custom_id).toBe('click_me');
    expect(ctx?.component_type).toBe('button');
  });

  it('delegates chat input commands to onCommandInteraction without emitting', async () => {
    const onCommand = vi.fn();
    const router = new DiscordEventRouter({
      client: client as unknown as never,
      deps,
      coreRouter: core,
      onCommandInteraction: onCommand,
    });
    router.start();

    const commandInteraction = {
      isChatInputCommand: () => true,
      isAutocomplete: () => false,
      isUserContextMenuCommand: () => false,
      isMessageContextMenuCommand: () => false,
    };
    client.emit('interactionCreate', commandInteraction);
    await new Promise((r) => setImmediate(r));

    expect(onCommand).toHaveBeenCalledWith(commandInteraction);
    expect(emitted).toHaveLength(0);
  });

  it('manual emit() dispatches with base context plus extras', async () => {
    const router = new DiscordEventRouter({ client: client as unknown as never, deps, coreRouter: core });
    router.start();

    await router.emit('custom_event', { foo: 'bar' });
    expect(emitted).toHaveLength(1);
    expect(emitted[0]?.event).toBe('custom_event');
    expect(emitted[0]?.context.foo).toBe('bar');
  });
});
