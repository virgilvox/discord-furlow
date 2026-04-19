/**
 * Declarative Discord.js to FURLOW event bindings.
 *
 * Each binding is a pure function from Discord.js event arguments to zero or
 * more FURLOW event emissions. Adding a new event is additive: append a
 * binding here, and document it in docs/reference/events.md. No runtime
 * wiring changes are required.
 *
 * Covered events:
 *   guild, member, message, reaction, channel, thread, role, voice,
 *   interaction (components), presence, typing, emoji, sticker, invite,
 *   scheduled_event, stage_instance, bot lifecycle.
 */

import { type ClientEvents, GatewayIntentBits } from 'discord.js';

import {
  buildBaseContext,
  cloneContext,
  withChannel,
  withEmoji,
  withGuild,
  withInvite,
  withMember,
  withMessage,
  withPresence,
  withReaction,
  withRole,
  withScheduledEvent,
  withStageInstance,
  withSticker,
  withThread,
  withTyping,
  withUser,
  wrapDiscordObject,
  type Context,
  type ContextDependencies,
} from './contexts.js';

export interface EventEmission {
  /** Canonical FURLOW event name (snake_case, as documented in events reference). */
  event: string;
  /** Fully-built expression context. */
  context: Context;
}

export interface EventBinding {
  /** Discord.js ClientEvents key this binding listens to. */
  discordEvent: keyof ClientEvents;
  /** Intents required for the underlying Discord.js event to fire. */
  intents?: GatewayIntentBits[];
  /** One-line description for docs generation. */
  description: string;
  /** Discord.js args to zero or more FURLOW emissions. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handle: (args: any[], deps: ContextDependencies) => EventEmission[];
}

/**
 * The declarative table. Order is display-only; all bindings are registered
 * in a single pass by the router.
 */
export const BINDINGS: EventBinding[] = [
  // --- Bot lifecycle ---
  {
    // `clientReady` is the forward-compatible name for `ready`, which discord.js
    // v14.25 marked deprecated and will remove in v15.
    discordEvent: 'clientReady',
    description: 'Fired once the Discord client is ready to receive events.',
    handle: (_args, deps) => [{ event: 'ready', context: buildBaseContext(deps) }],
  },
  {
    discordEvent: 'shardReady',
    description: 'A specific shard connected successfully.',
    handle: ([shardId, unavailableGuilds], deps) => {
      const ctx = buildBaseContext(deps);
      (ctx as Record<string, unknown>).shard_id = shardId;
      (ctx as Record<string, unknown>).unavailable_guilds = unavailableGuilds
        ? Array.from(unavailableGuilds as Set<string>)
        : [];
      return [{ event: 'shard_ready', context: ctx }];
    },
  },
  {
    discordEvent: 'shardDisconnect',
    description: 'A shard disconnected from the gateway.',
    handle: ([closeEvent, shardId], deps) => {
      const ctx = buildBaseContext(deps);
      (ctx as Record<string, unknown>).shard_id = shardId;
      (ctx as Record<string, unknown>).close_code = (closeEvent as { code?: number })?.code;
      (ctx as Record<string, unknown>).close_reason = (closeEvent as { reason?: string })?.reason;
      return [{ event: 'shard_disconnect', context: ctx }];
    },
  },
  {
    discordEvent: 'shardError',
    description: 'A shard encountered a websocket error.',
    handle: ([error, shardId], deps) => {
      const ctx = buildBaseContext(deps);
      (ctx as Record<string, unknown>).shard_id = shardId;
      (ctx as Record<string, unknown>).error = {
        message: (error as Error)?.message,
        name: (error as Error)?.name,
      };
      return [{ event: 'shard_error', context: ctx }];
    },
  },

  // --- Guild lifecycle ---
  {
    discordEvent: 'guildCreate',
    description: 'Bot joined a guild.',
    handle: ([guild], deps) => [{ event: 'guild_create', context: withGuild(buildBaseContext(deps), guild) }],
  },
  {
    discordEvent: 'guildDelete',
    description: 'Bot was removed from a guild.',
    handle: ([guild], deps) => [{ event: 'guild_delete', context: withGuild(buildBaseContext(deps), guild) }],
  },
  {
    discordEvent: 'guildUpdate',
    description: 'Guild settings changed.',
    handle: ([oldGuild, newGuild], deps) => {
      const ctx = withGuild(buildBaseContext(deps), newGuild);
      (ctx as Record<string, unknown>).old_guild = wrapDiscordObject(oldGuild as object);
      return [{ event: 'guild_update', context: ctx }];
    },
  },

  // --- Member lifecycle ---
  {
    discordEvent: 'guildMemberAdd',
    intents: [GatewayIntentBits.GuildMembers],
    description: 'Member joined a guild.',
    handle: ([member], deps) => [{ event: 'member_join', context: withMember(buildBaseContext(deps), member) }],
  },
  {
    discordEvent: 'guildMemberRemove',
    intents: [GatewayIntentBits.GuildMembers],
    description: 'Member left or was kicked from a guild.',
    handle: ([member], deps) => [{ event: 'member_leave', context: withMember(buildBaseContext(deps), member) }],
  },
  {
    discordEvent: 'guildMemberUpdate',
    intents: [GatewayIntentBits.GuildMembers],
    description: 'Member roles, nickname, or boost status changed.',
    handle: ([oldMember, newMember], deps) => {
      const base = withMember(buildBaseContext(deps), newMember);
      (base as Record<string, unknown>).old_member = wrapDiscordObject(oldMember as object);

      const emissions: EventEmission[] = [{ event: 'member_update', context: base }];

      // Boost transitions. `premiumSince` is present when boosting.
      const wasBooster = Boolean((oldMember as { premiumSince?: unknown }).premiumSince);
      const isBooster = Boolean((newMember as { premiumSince?: unknown }).premiumSince);
      if (!wasBooster && isBooster) {
        const boostCtx = cloneContext(base);
        (boostCtx as Record<string, unknown>).boost_since = (newMember as { premiumSince?: Date }).premiumSince;
        emissions.push({ event: 'member_boost', context: boostCtx });
      } else if (wasBooster && !isBooster) {
        const unboostCtx = cloneContext(base);
        (unboostCtx as Record<string, unknown>).boost_ended = (oldMember as { premiumSince?: Date }).premiumSince;
        emissions.push({ event: 'member_unboost', context: unboostCtx });
      }
      return emissions;
    },
  },
  {
    discordEvent: 'guildBanAdd',
    intents: [GatewayIntentBits.GuildModeration],
    description: 'Member was banned.',
    handle: ([ban], deps) => {
      const ctx = withUser(buildBaseContext(deps), (ban as { user: unknown }).user as object);
      const guild = (ban as { guild: unknown }).guild as object;
      if (guild) {
        (ctx as Record<string, unknown>).guild = wrapDiscordObject(guild);
        (ctx as Record<string, unknown>).guildId = (guild as { id?: string }).id;
      }
      (ctx as Record<string, unknown>).reason = (ban as { reason?: string }).reason;
      return [{ event: 'member_ban', context: ctx }];
    },
  },
  {
    discordEvent: 'guildBanRemove',
    intents: [GatewayIntentBits.GuildModeration],
    description: 'Member was unbanned.',
    handle: ([ban], deps) => {
      const ctx = withUser(buildBaseContext(deps), (ban as { user: unknown }).user as object);
      const guild = (ban as { guild: unknown }).guild as object;
      if (guild) {
        (ctx as Record<string, unknown>).guild = wrapDiscordObject(guild);
        (ctx as Record<string, unknown>).guildId = (guild as { id?: string }).id;
      }
      return [{ event: 'member_unban', context: ctx }];
    },
  },

  // --- Messages ---
  {
    discordEvent: 'messageCreate',
    intents: [GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
    description: 'New message posted in a channel or DM.',
    handle: ([message], deps) => {
      if ((message as { author?: { bot?: boolean } }).author?.bot) return [];
      const ctx = withMessage(buildBaseContext(deps), message);
      (ctx as Record<string, unknown>).attachments =
        ((message as { attachments?: Map<string, { name?: string; size?: number; contentType?: string; url?: string }> }).attachments
          ? Array.from(
              (message as { attachments: Map<string, { name?: string; size?: number; contentType?: string; url?: string }> }).attachments.values(),
            ).map((a) => ({
              name: a.name,
              size: a.size,
              contentType: a.contentType,
              url: a.url,
            }))
          : []);
      return [{ event: 'message_create', context: ctx }];
    },
  },
  {
    discordEvent: 'messageUpdate',
    intents: [GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
    description: 'Message was edited.',
    handle: ([oldMessage, newMessage], deps) => {
      const ctx = withMessage(buildBaseContext(deps), newMessage);
      (ctx as Record<string, unknown>).old_message = oldMessage;
      return [{ event: 'message_update', context: ctx }];
    },
  },
  {
    discordEvent: 'messageDelete',
    intents: [GatewayIntentBits.GuildMessages],
    description: 'Message was deleted.',
    handle: ([message], deps) => [
      { event: 'message_delete', context: withMessage(buildBaseContext(deps), message) },
    ],
  },
  {
    discordEvent: 'messageDeleteBulk',
    intents: [GatewayIntentBits.GuildMessages],
    description: 'Multiple messages were deleted in one API call.',
    handle: ([messages, channel], deps) => {
      const ctx = buildBaseContext(deps);
      const messageArray = messages && typeof (messages as { values?: () => IterableIterator<unknown> }).values === 'function'
        ? Array.from((messages as { values: () => IterableIterator<unknown> }).values())
        : [];
      (ctx as Record<string, unknown>).messages = messageArray;
      (ctx as Record<string, unknown>).message_count = messageArray.length;
      if (channel) {
        withChannel(ctx, channel as object);
      }
      return [{ event: 'message_delete_bulk', context: ctx }];
    },
  },

  // --- Reactions ---
  {
    discordEvent: 'messageReactionAdd',
    intents: [GatewayIntentBits.GuildMessageReactions],
    description: 'User reacted to a message.',
    handle: ([reaction, user], deps) => {
      if ((user as { bot?: boolean })?.bot) return [];
      const ctx = withReaction(buildBaseContext(deps), reaction as object, user as object);
      // Back-compat: older specs listen for `reaction_add`.
      return [
        { event: 'message_reaction_add', context: ctx },
        { event: 'reaction_add', context: cloneContext(ctx) },
      ];
    },
  },
  {
    discordEvent: 'messageReactionRemove',
    intents: [GatewayIntentBits.GuildMessageReactions],
    description: 'User removed a reaction.',
    handle: ([reaction, user], deps) => {
      if ((user as { bot?: boolean })?.bot) return [];
      const ctx = withReaction(buildBaseContext(deps), reaction as object, user as object);
      return [
        { event: 'message_reaction_remove', context: ctx },
        { event: 'reaction_remove', context: cloneContext(ctx) },
      ];
    },
  },
  {
    discordEvent: 'messageReactionRemoveAll',
    intents: [GatewayIntentBits.GuildMessageReactions],
    description: 'All reactions removed from a message.',
    handle: ([message], deps) => [
      { event: 'message_reaction_remove_all', context: withMessage(buildBaseContext(deps), message) },
    ],
  },

  // --- Channels ---
  {
    discordEvent: 'channelCreate',
    description: 'Channel was created.',
    handle: ([channel], deps) => [
      { event: 'channel_create', context: withChannel(buildBaseContext(deps), channel) },
    ],
  },
  {
    discordEvent: 'channelDelete',
    description: 'Channel was deleted.',
    handle: ([channel], deps) => [
      { event: 'channel_delete', context: withChannel(buildBaseContext(deps), channel) },
    ],
  },
  {
    discordEvent: 'channelUpdate',
    description: 'Channel settings changed.',
    handle: ([oldChannel, newChannel], deps) => {
      const ctx = withChannel(buildBaseContext(deps), newChannel);
      (ctx as Record<string, unknown>).old_channel = wrapDiscordObject(oldChannel as object);
      return [{ event: 'channel_update', context: ctx }];
    },
  },
  {
    discordEvent: 'channelPinsUpdate',
    description: 'Pinned message list changed in a channel.',
    handle: ([channel, date], deps) => {
      const ctx = withChannel(buildBaseContext(deps), channel);
      (ctx as Record<string, unknown>).pins_updated_at = date;
      return [{ event: 'channel_pins_update', context: ctx }];
    },
  },

  // --- Threads ---
  {
    discordEvent: 'threadCreate',
    description: 'Thread was created.',
    handle: ([thread, newlyCreated], deps) => {
      const ctx = withThread(buildBaseContext(deps), thread);
      (ctx as Record<string, unknown>).newly_created = Boolean(newlyCreated);
      return [{ event: 'thread_create', context: ctx }];
    },
  },
  {
    discordEvent: 'threadDelete',
    description: 'Thread was deleted.',
    handle: ([thread], deps) => [
      { event: 'thread_delete', context: withThread(buildBaseContext(deps), thread) },
    ],
  },
  {
    discordEvent: 'threadUpdate',
    description: 'Thread settings changed.',
    handle: ([oldThread, newThread], deps) => {
      const ctx = withThread(buildBaseContext(deps), newThread);
      (ctx as Record<string, unknown>).old_thread = wrapDiscordObject(oldThread as object);
      return [{ event: 'thread_update', context: ctx }];
    },
  },
  {
    discordEvent: 'threadMemberUpdate',
    description: 'A thread member joined, left, or was updated.',
    handle: ([oldMember, newMember], deps) => {
      const ctx = buildBaseContext(deps);
      (ctx as Record<string, unknown>).old_thread_member = wrapDiscordObject(oldMember as object);
      (ctx as Record<string, unknown>).new_thread_member = wrapDiscordObject(newMember as object);
      const threadMember = newMember as { thread?: object; userId?: string };
      if (threadMember.thread) {
        withThread(ctx, threadMember.thread);
      }
      if (threadMember.userId) {
        (ctx as Record<string, unknown>).userId = threadMember.userId;
      }
      return [{ event: 'thread_member_update', context: ctx }];
    },
  },

  // --- Roles ---
  {
    discordEvent: 'roleCreate',
    description: 'Role was created in a guild.',
    handle: ([role], deps) => [
      { event: 'role_create', context: withRole(buildBaseContext(deps), role) },
    ],
  },
  {
    discordEvent: 'roleDelete',
    description: 'Role was deleted.',
    handle: ([role], deps) => [
      { event: 'role_delete', context: withRole(buildBaseContext(deps), role) },
    ],
  },
  {
    discordEvent: 'roleUpdate',
    description: 'Role settings changed.',
    handle: ([oldRole, newRole], deps) => {
      const ctx = withRole(buildBaseContext(deps), newRole);
      (ctx as Record<string, unknown>).old_role = wrapDiscordObject(oldRole as object);
      return [{ event: 'role_update', context: ctx }];
    },
  },

  // --- Emojis ---
  {
    discordEvent: 'emojiCreate',
    intents: [GatewayIntentBits.GuildEmojisAndStickers],
    description: 'Custom emoji created.',
    handle: ([emoji], deps) => [
      { event: 'emoji_create', context: withEmoji(buildBaseContext(deps), emoji) },
    ],
  },
  {
    discordEvent: 'emojiDelete',
    intents: [GatewayIntentBits.GuildEmojisAndStickers],
    description: 'Custom emoji deleted.',
    handle: ([emoji], deps) => [
      { event: 'emoji_delete', context: withEmoji(buildBaseContext(deps), emoji) },
    ],
  },
  {
    discordEvent: 'emojiUpdate',
    intents: [GatewayIntentBits.GuildEmojisAndStickers],
    description: 'Custom emoji updated.',
    handle: ([oldEmoji, newEmoji], deps) => {
      const ctx = withEmoji(buildBaseContext(deps), newEmoji);
      (ctx as Record<string, unknown>).old_emoji = wrapDiscordObject(oldEmoji as object);
      return [{ event: 'emoji_update', context: ctx }];
    },
  },

  // --- Stickers ---
  {
    discordEvent: 'stickerCreate',
    intents: [GatewayIntentBits.GuildEmojisAndStickers],
    description: 'Custom sticker created.',
    handle: ([sticker], deps) => [
      { event: 'sticker_create', context: withSticker(buildBaseContext(deps), sticker) },
    ],
  },
  {
    discordEvent: 'stickerDelete',
    intents: [GatewayIntentBits.GuildEmojisAndStickers],
    description: 'Custom sticker deleted.',
    handle: ([sticker], deps) => [
      { event: 'sticker_delete', context: withSticker(buildBaseContext(deps), sticker) },
    ],
  },
  {
    discordEvent: 'stickerUpdate',
    intents: [GatewayIntentBits.GuildEmojisAndStickers],
    description: 'Custom sticker updated.',
    handle: ([oldSticker, newSticker], deps) => {
      const ctx = withSticker(buildBaseContext(deps), newSticker);
      (ctx as Record<string, unknown>).old_sticker = wrapDiscordObject(oldSticker as object);
      return [{ event: 'sticker_update', context: ctx }];
    },
  },

  // --- Invites ---
  {
    discordEvent: 'inviteCreate',
    intents: [GatewayIntentBits.GuildInvites],
    description: 'Invite link created.',
    handle: ([invite], deps) => [
      { event: 'invite_create', context: withInvite(buildBaseContext(deps), invite) },
    ],
  },
  {
    discordEvent: 'inviteDelete',
    intents: [GatewayIntentBits.GuildInvites],
    description: 'Invite link revoked or expired.',
    handle: ([invite], deps) => [
      { event: 'invite_delete', context: withInvite(buildBaseContext(deps), invite) },
    ],
  },

  // --- Voice ---
  {
    discordEvent: 'voiceStateUpdate',
    intents: [GatewayIntentBits.GuildVoiceStates],
    description: 'Voice channel join, leave, move, mute, or stream state changed.',
    handle: ([oldState, newState], deps) => {
      const base = withMember(buildBaseContext(deps), (newState as { member?: object }).member as object);
      (base as Record<string, unknown>).old_voice_state = oldState;
      (base as Record<string, unknown>).new_voice_state = newState;

      const emissions: EventEmission[] = [];

      const oldChannel = (oldState as { channel?: { id?: string } }).channel;
      const newChannel = (newState as { channel?: { id?: string } }).channel;
      if (!oldChannel && newChannel) {
        emissions.push({ event: 'voice_join', context: cloneContext(base) });
      } else if (oldChannel && !newChannel) {
        emissions.push({ event: 'voice_leave', context: cloneContext(base) });
      } else if (oldChannel?.id !== newChannel?.id) {
        emissions.push({ event: 'voice_move', context: cloneContext(base) });
      }

      const wasStreaming = (oldState as { streaming?: boolean }).streaming;
      const isStreaming = (newState as { streaming?: boolean }).streaming;
      if (!wasStreaming && isStreaming) {
        const streamCtx = cloneContext(base);
        (streamCtx as Record<string, unknown>).streaming = true;
        (streamCtx as Record<string, unknown>).voice_channel = wrapDiscordObject(newChannel as object);
        emissions.push({ event: 'voice_stream_start', context: streamCtx });
      } else if (wasStreaming && !isStreaming) {
        const streamCtx = cloneContext(base);
        (streamCtx as Record<string, unknown>).streaming = false;
        emissions.push({ event: 'voice_stream_stop', context: streamCtx });
      }

      emissions.push({ event: 'voice_state_update', context: base });
      return emissions;
    },
  },

  // --- Presence ---
  {
    discordEvent: 'presenceUpdate',
    intents: [GatewayIntentBits.GuildPresences],
    description: 'Member presence (status, activity) changed.',
    handle: ([oldPresence, newPresence], deps) => {
      if (!newPresence) return [];
      const ctx = withPresence(buildBaseContext(deps), newPresence as object);
      (ctx as Record<string, unknown>).old_presence = oldPresence;
      return [{ event: 'presence_update', context: ctx }];
    },
  },

  // --- Typing ---
  {
    discordEvent: 'typingStart',
    intents: [GatewayIntentBits.GuildMessageTyping, GatewayIntentBits.DirectMessageTyping],
    description: 'User started typing in a channel.',
    handle: ([typing], deps) => [
      { event: 'typing_start', context: withTyping(buildBaseContext(deps), typing) },
    ],
  },

  // --- Scheduled events ---
  {
    discordEvent: 'guildScheduledEventCreate',
    intents: [GatewayIntentBits.GuildScheduledEvents],
    description: 'Guild scheduled event created.',
    handle: ([event], deps) => [
      { event: 'scheduled_event_create', context: withScheduledEvent(buildBaseContext(deps), event) },
    ],
  },
  {
    discordEvent: 'guildScheduledEventDelete',
    intents: [GatewayIntentBits.GuildScheduledEvents],
    description: 'Guild scheduled event cancelled.',
    handle: ([event], deps) => [
      { event: 'scheduled_event_delete', context: withScheduledEvent(buildBaseContext(deps), event) },
    ],
  },
  {
    discordEvent: 'guildScheduledEventUpdate',
    intents: [GatewayIntentBits.GuildScheduledEvents],
    description: 'Guild scheduled event updated.',
    handle: ([oldEvent, newEvent], deps) => {
      const ctx = withScheduledEvent(buildBaseContext(deps), newEvent as object);
      (ctx as Record<string, unknown>).old_scheduled_event = wrapDiscordObject(oldEvent as object);
      return [{ event: 'scheduled_event_update', context: ctx }];
    },
  },
  {
    discordEvent: 'guildScheduledEventUserAdd',
    intents: [GatewayIntentBits.GuildScheduledEvents],
    description: 'User subscribed to a scheduled event.',
    handle: ([event, user], deps) => {
      const ctx = withScheduledEvent(buildBaseContext(deps), event as object);
      withUser(ctx, user as object);
      return [{ event: 'scheduled_event_user_add', context: ctx }];
    },
  },
  {
    discordEvent: 'guildScheduledEventUserRemove',
    intents: [GatewayIntentBits.GuildScheduledEvents],
    description: 'User unsubscribed from a scheduled event.',
    handle: ([event, user], deps) => {
      const ctx = withScheduledEvent(buildBaseContext(deps), event as object);
      withUser(ctx, user as object);
      return [{ event: 'scheduled_event_user_remove', context: ctx }];
    },
  },

  // --- Stage instances ---
  {
    discordEvent: 'stageInstanceCreate',
    description: 'Stage instance started.',
    handle: ([stage], deps) => [
      { event: 'stage_instance_create', context: withStageInstance(buildBaseContext(deps), stage) },
    ],
  },
  {
    discordEvent: 'stageInstanceDelete',
    description: 'Stage instance ended.',
    handle: ([stage], deps) => [
      { event: 'stage_instance_delete', context: withStageInstance(buildBaseContext(deps), stage) },
    ],
  },
  {
    discordEvent: 'stageInstanceUpdate',
    description: 'Stage instance updated.',
    handle: ([oldStage, newStage], deps) => {
      const ctx = withStageInstance(buildBaseContext(deps), newStage as object);
      (ctx as Record<string, unknown>).old_stage_instance = wrapDiscordObject(oldStage as object);
      return [{ event: 'stage_instance_update', context: ctx }];
    },
  },
];

/**
 * Canonical FURLOW event names emitted by BINDINGS plus the component events
 * emitted by the router's interactionCreate handler. Documented in
 * `docs/reference/events.md`. Kept as a static list rather than derived from
 * BINDINGS because several handlers dereference entity fields at call time
 * and cannot be invoked without a real Discord.js payload.
 */
export const EMITTED_FURLOW_EVENTS: readonly string[] = [
  'ready',
  'shard_ready',
  'shard_disconnect',
  'shard_error',
  'guild_create',
  'guild_delete',
  'guild_update',
  'member_join',
  'member_leave',
  'member_update',
  'member_boost',
  'member_unboost',
  'member_ban',
  'member_unban',
  'message_create',
  'message_update',
  'message_delete',
  'message_delete_bulk',
  'message_reaction_add',
  'message_reaction_remove',
  'message_reaction_remove_all',
  'reaction_add',
  'reaction_remove',
  'channel_create',
  'channel_delete',
  'channel_update',
  'channel_pins_update',
  'thread_create',
  'thread_delete',
  'thread_update',
  'thread_member_update',
  'role_create',
  'role_delete',
  'role_update',
  'emoji_create',
  'emoji_delete',
  'emoji_update',
  'sticker_create',
  'sticker_delete',
  'sticker_update',
  'invite_create',
  'invite_delete',
  'voice_state_update',
  'voice_join',
  'voice_leave',
  'voice_move',
  'voice_stream_start',
  'voice_stream_stop',
  'presence_update',
  'typing_start',
  'scheduled_event_create',
  'scheduled_event_delete',
  'scheduled_event_update',
  'scheduled_event_user_add',
  'scheduled_event_user_remove',
  'stage_instance_create',
  'stage_instance_delete',
  'stage_instance_update',
  // Component interaction events (wired in router, not in BINDINGS).
  'button_click',
  'select_menu',
  'modal_submit',
];
