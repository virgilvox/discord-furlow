/**
 * Context construction for Discord events.
 *
 * Each FURLOW event handler receives a JSON-like context object that its
 * expressions and actions can read. The shape must stay stable, since user
 * YAML specs access fields like `${member.display_name}` or `${old_member.nickname}`.
 *
 * Responsibilities of this module:
 *   1. Build the base context (dependencies, `now`, `random`, option bags).
 *   2. Merge entity-specific fields onto the context (message, member, reaction, etc.).
 *   3. Wrap Discord.js objects in a Proxy that exposes URL methods as properties,
 *      so expressions can read `${user.displayAvatarURL}` without calling it.
 */

import type { Client } from 'discord.js';
import type { FurlowSpec } from '@furlow/schema';

/**
 * Anything passed to an action handler or event expression. Intentionally
 * broad: YAML users access arbitrary Discord.js properties through this shape.
 */
export type Context = Record<string, unknown>;

/**
 * Runtime dependencies wired once at bot startup and available to every
 * event's context.
 */
export interface ContextDependencies {
  client: Client;
  evaluator: unknown;
  stateManager: unknown;
  flowEngine: unknown;
  voiceManager?: unknown;
  actionExecutor: unknown;
  eventRouter: unknown;
  spec: FurlowSpec;
}

/**
 * Discord.js exposes asset URLs as methods (`displayAvatarURL()`). JEXL cannot
 * call methods inside expressions, so we proxy known URL methods to look like
 * properties. Other method access is bound to preserve `this`.
 *
 * Must match the behavior previously inlined in `apps/cli/src/commands/start.ts`.
 */
export function wrapDiscordObject<T extends object>(obj: T | null | undefined): T | null | undefined {
  if (!obj) return obj;

  return new Proxy(obj, {
    get(target, prop, receiver) {
      const value = Reflect.get(target, prop, receiver);

      if (URL_METHOD_NAMES.has(prop as string) && typeof value === 'function') {
        return (value as (options: { size: number; dynamic: boolean }) => string).call(
          target,
          { size: 512, dynamic: true },
        );
      }

      if (typeof value === 'function') {
        return (value as (...args: unknown[]) => unknown).bind(target);
      }

      return value;
    },
  }) as T;
}

const URL_METHOD_NAMES = new Set([
  'displayAvatarURL',
  'avatarURL',
  'bannerURL',
  'iconURL',
  'splashURL',
  'discoverySplashURL',
]);

/**
 * Build the base context shared by every event. Specific events layer
 * additional entity fields on top via the `with*` helpers below.
 */
export function buildBaseContext(deps: ContextDependencies): Context {
  const sharedOptions: Record<string, unknown> = {};
  return {
    now: new Date(),
    random: Math.random(),
    options: sharedOptions,
    // `args` is an alias for `options`, used by several builtin modules.
    args: sharedOptions,
    state: {},
    client: deps.client,
    _deps: {
      client: deps.client,
      evaluator: deps.evaluator,
      stateManager: deps.stateManager,
      flowEngine: deps.flowEngine,
      voiceManager: deps.voiceManager,
    },
    _actionExecutor: deps.actionExecutor,
    _eventRouter: deps.eventRouter,
    _components: deps.spec.components,
    _pipes: deps.spec.pipes,
    _canvasGenerators: deps.spec.canvas?.generators,
  };
}

/**
 * Shallow-clone a context so per-emission mutations (e.g. multiple FURLOW
 * events from a single Discord event) do not leak between emissions.
 */
export function cloneContext(ctx: Context): Context {
  return { ...ctx };
}

// Helpers mutate and return ctx for chaining. Shape must remain identical to
// the previous `buildActionContext()` logic in start.ts, since existing YAML
// specs access these exact field names.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRecord = Record<string, any>;

export function withInteraction(ctx: Context, interaction: AnyRecord): Context {
  const c = ctx as AnyRecord;
  c.interaction = interaction;
  c.user = wrapDiscordObject(interaction.user);
  c.member = wrapDiscordObject(interaction.member);
  c.channel = wrapDiscordObject(interaction.channel);
  c.guild = wrapDiscordObject(interaction.guild);
  c.guildId = interaction.guildId;
  c.channelId = interaction.channelId;
  c.userId = interaction.user?.id;
  return ctx;
}

export function withMessage(ctx: Context, message: AnyRecord): Context {
  const c = ctx as AnyRecord;
  c.message = message;
  c.user = wrapDiscordObject(message.author);
  c.member = wrapDiscordObject(message.member);
  c.channel = wrapDiscordObject(message.channel);
  c.guild = wrapDiscordObject(message.guild);
  c.guildId = message.guildId;
  c.channelId = message.channelId;
  c.userId = message.author?.id;
  c.messageId = message.id;
  return ctx;
}

export function withMember(ctx: Context, member: AnyRecord): Context {
  const c = ctx as AnyRecord;
  c.member = wrapDiscordObject(member);
  c.user = wrapDiscordObject(member.user);
  c.guild = wrapDiscordObject(member.guild);
  c.guildId = member.guild?.id;
  c.userId = member.user?.id ?? member.id;
  return ctx;
}

export function withReaction(ctx: Context, reaction: AnyRecord, user: AnyRecord): Context {
  const c = ctx as AnyRecord;
  c.reaction = reaction;
  c.emoji = reaction.emoji;
  c.message = reaction.message;
  c.channel = wrapDiscordObject(reaction.message?.channel);
  c.guild = wrapDiscordObject(reaction.message?.guild);
  c.guildId = reaction.message?.guildId;
  c.channelId = reaction.message?.channelId;
  c.messageId = reaction.message?.id;
  c.user = wrapDiscordObject(user);
  c.userId = user?.id;
  return ctx;
}

export function withUser(ctx: Context, user: AnyRecord): Context {
  const c = ctx as AnyRecord;
  c.user = wrapDiscordObject(user);
  c.userId = user?.id;
  return ctx;
}

export function withRole(ctx: Context, role: AnyRecord): Context {
  const c = ctx as AnyRecord;
  c.role = role;
  c.guild = wrapDiscordObject(role.guild);
  c.guildId = role.guild?.id;
  return ctx;
}

export function withChannel(ctx: Context, channel: AnyRecord): Context {
  const c = ctx as AnyRecord;
  c.channel = wrapDiscordObject(channel);
  c.channelId = channel.id;
  if ('guild' in channel && channel.guild) {
    c.guild = wrapDiscordObject(channel.guild);
    c.guildId = channel.guild.id;
  }
  return ctx;
}

export function withThread(ctx: Context, thread: AnyRecord): Context {
  const c = ctx as AnyRecord;
  c.thread = thread;
  c.channel = wrapDiscordObject(thread);
  c.channelId = thread.id;
  c.guild = wrapDiscordObject(thread.guild);
  c.guildId = thread.guildId;
  return ctx;
}

export function withGuild(ctx: Context, guild: AnyRecord): Context {
  const c = ctx as AnyRecord;
  c.guild = wrapDiscordObject(guild);
  c.guildId = guild.id;
  return ctx;
}

export function withEmoji(ctx: Context, emoji: AnyRecord): Context {
  const c = ctx as AnyRecord;
  c.emoji = emoji;
  if (emoji.guild) {
    c.guild = wrapDiscordObject(emoji.guild);
    c.guildId = emoji.guild.id;
  }
  return ctx;
}

export function withSticker(ctx: Context, sticker: AnyRecord): Context {
  const c = ctx as AnyRecord;
  c.sticker = sticker;
  if (sticker.guild) {
    c.guild = wrapDiscordObject(sticker.guild);
    c.guildId = sticker.guild.id;
  }
  return ctx;
}

export function withInvite(ctx: Context, invite: AnyRecord): Context {
  const c = ctx as AnyRecord;
  c.invite = invite;
  if (invite.guild) {
    c.guild = wrapDiscordObject(invite.guild);
    c.guildId = invite.guild.id;
  }
  if (invite.channel) {
    c.channel = wrapDiscordObject(invite.channel);
    c.channelId = invite.channel.id;
  }
  if (invite.inviter) {
    c.user = wrapDiscordObject(invite.inviter);
    c.userId = invite.inviter.id;
  }
  return ctx;
}

export function withScheduledEvent(ctx: Context, scheduledEvent: AnyRecord): Context {
  const c = ctx as AnyRecord;
  c.scheduled_event = scheduledEvent;
  if (scheduledEvent.guild) {
    c.guild = wrapDiscordObject(scheduledEvent.guild);
    c.guildId = scheduledEvent.guild.id;
  }
  if (scheduledEvent.channel) {
    c.channel = wrapDiscordObject(scheduledEvent.channel);
    c.channelId = scheduledEvent.channel.id;
  }
  return ctx;
}

export function withStageInstance(ctx: Context, stageInstance: AnyRecord): Context {
  const c = ctx as AnyRecord;
  c.stage_instance = stageInstance;
  if (stageInstance.guild) {
    c.guild = wrapDiscordObject(stageInstance.guild);
    c.guildId = stageInstance.guild.id;
  }
  if (stageInstance.channel) {
    c.channel = wrapDiscordObject(stageInstance.channel);
    c.channelId = stageInstance.channel.id;
  }
  return ctx;
}

export function withPresence(ctx: Context, presence: AnyRecord): Context {
  const c = ctx as AnyRecord;
  c.presence = presence;
  if (presence.user) {
    c.user = wrapDiscordObject(presence.user);
    c.userId = presence.user.id;
  }
  if (presence.guild) {
    c.guild = wrapDiscordObject(presence.guild);
    c.guildId = presence.guild.id;
  }
  return ctx;
}

export function withTyping(ctx: Context, typing: AnyRecord): Context {
  const c = ctx as AnyRecord;
  c.user = wrapDiscordObject(typing.user);
  c.userId = typing.user?.id;
  c.channel = wrapDiscordObject(typing.channel);
  c.channelId = typing.channel?.id;
  if (typing.guild) {
    c.guild = wrapDiscordObject(typing.guild);
    c.guildId = typing.guild.id;
  }
  return ctx;
}
