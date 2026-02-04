/**
 * AFK builtin module
 * Handles AFK status and mention notifications
 */

import type { FurlowSpec, CommandDefinition, EventHandler, TableDefinition } from '@furlow/schema';

export interface AfkConfig {
  /** Maximum AFK reason length */
  maxReasonLength?: number;
  /** Add prefix to nickname */
  nicknamePrefix?: string;
  /** Ignore bot mentions */
  ignoreBots?: boolean;
}

export const afkTables: Record<string, TableDefinition> = {
  afk_users: {
    columns: {
      id: { type: 'number', primary: true },
      guild_id: { type: 'string', index: true },
      user_id: { type: 'string', index: true },
      reason: { type: 'string' },
      set_at: { type: 'timestamp' },
    },
  },
};

export const afkEventHandlers: EventHandler[] = [
  // Remove AFK when user sends message
  {
    event: 'message',
    condition: '!message.author.bot',
    actions: [
      {
        action: 'db_query',
        table: 'afk_users',
        where: { guild_id: '${guild.id}', user_id: '${user.id}' },
        as: 'afkStatus',
      },
      {
        action: 'flow_if',
        condition: 'afkStatus.length > 0',
        then: [
          // Remove AFK
          {
            action: 'db_delete',
            table: 'afk_users',
            where: { guild_id: '${guild.id}', user_id: '${user.id}' },
          },
          // Remove nickname prefix if set
          {
            action: 'flow_if',
            condition: 'config.afk?.nicknamePrefix && member.nickname?.startsWith(config.afk.nicknamePrefix)',
            then: [
              {
                action: 'set_nickname',
                user: '${user.id}',
                nickname: '${member.nickname.replace(config.afk.nicknamePrefix, "")}',
              },
            ],
          },
          {
            action: 'send_message',
            channel: '${channel.id}',
            content: 'Welcome back ${user}! I removed your AFK status.',
            as: 'welcomeBack',
          },
          {
            action: 'wait',
            duration: 5000,
          },
          {
            action: 'delete_message',
            channel: '${channel.id}',
            message: '${welcomeBack.id}',
          },
        ],
      },
    ],
  },
  // Notify when AFK user is mentioned
  {
    event: 'message',
    condition: 'message.mentions.users.size > 0 && !message.author.bot',
    actions: [
      {
        action: 'set',
        key: 'mentionedIds',
        value: '${[...message.mentions.users.keys()]}',
      },
      {
        action: 'db_query',
        table: 'afk_users',
        where: { guild_id: '${guild.id}' },
        as: 'allAfk',
      },
      {
        action: 'set',
        key: 'afkMentioned',
        value: '${allAfk.filter(a => mentionedIds.includes(a.user_id))}',
      },
      {
        action: 'flow_if',
        condition: 'afkMentioned.length > 0',
        then: [
          {
            action: 'set',
            key: 'afkMessages',
            value: '${afkMentioned.map(a => "<@" + a.user_id + "> is AFK: " + a.reason + " (since " + timestamp(a.set_at, "R") + ")").join("\\n")}',
          },
          {
            action: 'send_message',
            channel: '${channel.id}',
            content: '${afkMessages}',
            as: 'afkNotice',
          },
          {
            action: 'wait',
            duration: 10000,
          },
          {
            action: 'delete_message',
            channel: '${channel.id}',
            message: '${afkNotice.id}',
          },
        ],
      },
    ],
  },
];

export const afkCommands: CommandDefinition[] = [
  {
    name: 'afk',
    description: 'Set your AFK status',
    options: [
      { name: 'reason', description: 'AFK reason', type: 'string', required: false },
    ],
    actions: [
      {
        action: 'set',
        key: 'reason',
        value: '${truncate(args.reason || "AFK", config.afk?.maxReasonLength || 100)}',
      },
      // Check if already AFK
      {
        action: 'db_query',
        table: 'afk_users',
        where: { guild_id: '${guild.id}', user_id: '${user.id}' },
        as: 'existing',
      },
      {
        action: 'flow_if',
        condition: 'existing.length > 0',
        then: [
          {
            action: 'db_update',
            table: 'afk_users',
            where: { guild_id: '${guild.id}', user_id: '${user.id}' },
            data: { reason: '${reason}', set_at: '${now()}' },
          },
        ],
        else: [
          {
            action: 'db_insert',
            table: 'afk_users',
            data: {
              guild_id: '${guild.id}',
              user_id: '${user.id}',
              reason: '${reason}',
              set_at: '${now()}',
            },
          },
        ],
      },
      // Add nickname prefix if configured
      {
        action: 'flow_if',
        condition: 'config.afk?.nicknamePrefix && !member.nickname?.startsWith(config.afk.nicknamePrefix)',
        then: [
          {
            action: 'set_nickname',
            user: '${user.id}',
            nickname: '${config.afk.nicknamePrefix + (member.nickname || user.username)}',
          },
        ],
      },
      {
        action: 'reply',
        content: 'I set your AFK: ${reason}',
        ephemeral: false,
      },
    ],
  },
];

export function getAfkSpec(config: AfkConfig = {}): Partial<FurlowSpec> {
  return {
    commands: afkCommands,
    events: afkEventHandlers,
    state: {
      tables: afkTables,
    },
  };
}
