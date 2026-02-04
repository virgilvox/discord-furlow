/**
 * Logging builtin module
 * Handles comprehensive server logging for messages, members, voice, and moderation
 */

import type { FurlowSpec, CommandDefinition, EventHandler } from '@furlow/schema';

export interface LoggingConfig {
  /** Default log channel */
  channel?: string;
  /** Separate channels per category */
  channels?: {
    messages?: string;
    members?: string;
    voice?: string;
    server?: string;
    moderation?: string;
  };
  /** Ignored channels */
  ignoredChannels?: string[];
  /** Ignored roles (users with these roles won't be logged) */
  ignoredRoles?: string[];
  /** Events to log */
  events?: {
    messageDelete?: boolean;
    messageEdit?: boolean;
    messageBulkDelete?: boolean;
    memberJoin?: boolean;
    memberLeave?: boolean;
    memberUpdate?: boolean;
    memberBan?: boolean;
    memberUnban?: boolean;
    voiceJoin?: boolean;
    voiceLeave?: boolean;
    voiceMove?: boolean;
    channelCreate?: boolean;
    channelDelete?: boolean;
    channelUpdate?: boolean;
    roleCreate?: boolean;
    roleDelete?: boolean;
    roleUpdate?: boolean;
    inviteCreate?: boolean;
    inviteDelete?: boolean;
  };
  /** Include images in logs */
  includeImages?: boolean;
}

export const loggingEventHandlers: EventHandler[] = [
  // Message Delete
  {
    event: 'message_delete',
    condition: 'config.logging.events?.messageDelete !== false && !config.logging.ignoredChannels?.includes(channel.id)',
    actions: [
      {
        action: 'send_message',
        channel: '${config.logging.channels?.messages || config.logging.channel}',
        embed: {
          title: 'Message Deleted',
          description: '${message.content || "*No text content*"}',
          color: '#ed4245',
          fields: [
            { name: 'Author', value: '${message.author ? "<@" + message.author.id + ">" : "Unknown"}', inline: true },
            { name: 'Channel', value: '<#${channel.id}>', inline: true },
            { name: 'Message ID', value: '${message.id}', inline: true },
          ],
          footer: {
            text: 'User ID: ${message.author?.id || "Unknown"}',
          },
          timestamp: '${now()}',
        },
      },
    ],
  },
  // Message Edit
  {
    event: 'message_update',
    condition: 'config.logging.events?.messageEdit !== false && oldMessage.content !== newMessage.content && !config.logging.ignoredChannels?.includes(channel.id)',
    actions: [
      {
        action: 'send_message',
        channel: '${config.logging.channels?.messages || config.logging.channel}',
        embed: {
          title: 'Message Edited',
          color: '#fee75c',
          fields: [
            { name: 'Before', value: '${truncate(oldMessage.content || "*Empty*", 1024)}' },
            { name: 'After', value: '${truncate(newMessage.content || "*Empty*", 1024)}' },
            { name: 'Author', value: '<@${newMessage.author.id}>', inline: true },
            { name: 'Channel', value: '<#${channel.id}>', inline: true },
            { name: 'Jump to Message', value: '[Click here](${newMessage.url})', inline: true },
          ],
          footer: {
            text: 'User ID: ${newMessage.author.id}',
          },
          timestamp: '${now()}',
        },
      },
    ],
  },
  // Bulk Message Delete
  {
    event: 'message_bulk_delete',
    condition: 'config.logging.events?.messageBulkDelete !== false',
    actions: [
      {
        action: 'set',
        key: 'logContent',
        value: '${messages | map(m => "[" + (m.author?.tag || "Unknown") + "]: " + (m.content || "*attachment/embed*")) | join("\\n")}',
      },
      {
        action: 'send_message',
        channel: '${config.logging.channels?.messages || config.logging.channel}',
        embed: {
          title: 'Bulk Messages Deleted',
          description: '${messages.length} messages were deleted in <#${channel.id}>',
          color: '#ed4245',
          timestamp: '${now()}',
        },
        files: [
          {
            attachment: '${Buffer.from(logContent)}',
            name: 'deleted-messages.txt',
          },
        ],
      },
    ],
  },
  // Member Join
  {
    event: 'member_join',
    condition: 'config.logging.events?.memberJoin !== false',
    actions: [
      {
        action: 'set',
        key: 'accountAge',
        value: '${floor((now() - member.joined_at) / (1000 * 60 * 60 * 24))}',
      },
      {
        action: 'send_message',
        channel: '${config.logging.channels?.members || config.logging.channel}',
        embed: {
          title: 'Member Joined',
          description: '<@${member.id}> joined the server',
          color: '#57f287',
          thumbnail: '${member.avatar}',
          fields: [
            { name: 'Username', value: '${member.user.tag}', inline: true },
            { name: 'Account Age', value: '${accountAge} days', inline: true },
            { name: 'Member Count', value: '${guild.member_count}', inline: true },
          ],
          footer: {
            text: 'User ID: ${member.id}',
          },
          timestamp: '${now()}',
        },
      },
    ],
  },
  // Member Leave
  {
    event: 'member_leave',
    condition: 'config.logging.events?.memberLeave !== false',
    actions: [
      {
        action: 'set',
        key: 'roles',
        value: '${member.roles?.cache?.filter(r => r.id !== guild.id)?.map(r => r.name)?.join(", ") || "None"}',
      },
      {
        action: 'send_message',
        channel: '${config.logging.channels?.members || config.logging.channel}',
        embed: {
          title: 'Member Left',
          description: '<@${member.id}> left the server',
          color: '#ed4245',
          thumbnail: '${member.avatar}',
          fields: [
            { name: 'Username', value: '${member.user.tag}', inline: true },
            { name: 'Roles', value: '${truncate(roles, 1024)}', inline: false },
            { name: 'Joined At', value: '${timestamp(member.joined_at, "R")}', inline: true },
          ],
          footer: {
            text: 'User ID: ${member.id}',
          },
          timestamp: '${now()}',
        },
      },
    ],
  },
  // Member Update (roles, nickname)
  {
    event: 'member_update',
    condition: 'config.logging.events?.memberUpdate !== false',
    actions: [
      // Role changes
      {
        action: 'flow_if',
        condition: 'oldMember.roles.cache.size !== newMember.roles.cache.size',
        then: [
          {
            action: 'set',
            key: 'addedRoles',
            value: '${newMember.roles.cache.filter(r => !oldMember.roles.cache.has(r.id)).map(r => r.name).join(", ")}',
          },
          {
            action: 'set',
            key: 'removedRoles',
            value: '${oldMember.roles.cache.filter(r => !newMember.roles.cache.has(r.id)).map(r => r.name).join(", ")}',
          },
          {
            action: 'send_message',
            channel: '${config.logging.channels?.members || config.logging.channel}',
            embed: {
              title: 'Member Roles Updated',
              description: '<@${newMember.id}>\'s roles were changed',
              color: '#5865f2',
              fields: [
                { name: 'Added Roles', value: '${addedRoles || "None"}', inline: true },
                { name: 'Removed Roles', value: '${removedRoles || "None"}', inline: true },
              ],
              footer: {
                text: 'User ID: ${newMember.id}',
              },
              timestamp: '${now()}',
            },
          },
        ],
      },
      // Nickname changes
      {
        action: 'flow_if',
        condition: 'oldMember.nickname !== newMember.nickname',
        then: [
          {
            action: 'send_message',
            channel: '${config.logging.channels?.members || config.logging.channel}',
            embed: {
              title: 'Nickname Changed',
              description: '<@${newMember.id}>\'s nickname was changed',
              color: '#5865f2',
              fields: [
                { name: 'Before', value: '${oldMember.nickname || oldMember.user.username}', inline: true },
                { name: 'After', value: '${newMember.nickname || newMember.user.username}', inline: true },
              ],
              footer: {
                text: 'User ID: ${newMember.id}',
              },
              timestamp: '${now()}',
            },
          },
        ],
      },
    ],
  },
  // Member Ban
  {
    event: 'member_ban',
    condition: 'config.logging.events?.memberBan !== false',
    actions: [
      {
        action: 'send_message',
        channel: '${config.logging.channels?.moderation || config.logging.channel}',
        embed: {
          title: 'Member Banned',
          description: '<@${user.id}> was banned',
          color: '#ed4245',
          thumbnail: '${user.avatar}',
          fields: [
            { name: 'Username', value: '${user.tag}', inline: true },
            { name: 'Reason', value: '${ban.reason || "No reason provided"}', inline: false },
          ],
          footer: {
            text: 'User ID: ${user.id}',
          },
          timestamp: '${now()}',
        },
      },
    ],
  },
  // Member Unban
  {
    event: 'member_unban',
    condition: 'config.logging.events?.memberUnban !== false',
    actions: [
      {
        action: 'send_message',
        channel: '${config.logging.channels?.moderation || config.logging.channel}',
        embed: {
          title: 'Member Unbanned',
          description: '<@${user.id}> was unbanned',
          color: '#57f287',
          thumbnail: '${user.avatar}',
          fields: [
            { name: 'Username', value: '${user.tag}', inline: true },
          ],
          footer: {
            text: 'User ID: ${user.id}',
          },
          timestamp: '${now()}',
        },
      },
    ],
  },
  // Voice Join
  {
    event: 'voice_join',
    condition: 'config.logging.events?.voiceJoin !== false',
    actions: [
      {
        action: 'send_message',
        channel: '${config.logging.channels?.voice || config.logging.channel}',
        embed: {
          title: 'Voice Channel Joined',
          description: '<@${member.id}> joined <#${channel.id}>',
          color: '#57f287',
          footer: {
            text: 'User ID: ${member.id}',
          },
          timestamp: '${now()}',
        },
      },
    ],
  },
  // Voice Leave
  {
    event: 'voice_leave',
    condition: 'config.logging.events?.voiceLeave !== false',
    actions: [
      {
        action: 'send_message',
        channel: '${config.logging.channels?.voice || config.logging.channel}',
        embed: {
          title: 'Voice Channel Left',
          description: '<@${member.id}> left <#${channel.id}>',
          color: '#ed4245',
          footer: {
            text: 'User ID: ${member.id}',
          },
          timestamp: '${now()}',
        },
      },
    ],
  },
  // Voice Move
  {
    event: 'voice_move',
    condition: 'config.logging.events?.voiceMove !== false',
    actions: [
      {
        action: 'send_message',
        channel: '${config.logging.channels?.voice || config.logging.channel}',
        embed: {
          title: 'Voice Channel Switch',
          description: '<@${member.id}> switched voice channels',
          color: '#5865f2',
          fields: [
            { name: 'From', value: '<#${oldChannel.id}>', inline: true },
            { name: 'To', value: '<#${newChannel.id}>', inline: true },
          ],
          footer: {
            text: 'User ID: ${member.id}',
          },
          timestamp: '${now()}',
        },
      },
    ],
  },
  // Channel Create
  {
    event: 'channel_create',
    condition: 'config.logging.events?.channelCreate !== false',
    actions: [
      {
        action: 'send_message',
        channel: '${config.logging.channels?.server || config.logging.channel}',
        embed: {
          title: 'Channel Created',
          description: '<#${channel.id}> was created',
          color: '#57f287',
          fields: [
            { name: 'Name', value: '${channel.name}', inline: true },
            { name: 'Type', value: '${channel.type}', inline: true },
          ],
          timestamp: '${now()}',
        },
      },
    ],
  },
  // Channel Delete
  {
    event: 'channel_delete',
    condition: 'config.logging.events?.channelDelete !== false',
    actions: [
      {
        action: 'send_message',
        channel: '${config.logging.channels?.server || config.logging.channel}',
        embed: {
          title: 'Channel Deleted',
          description: '#${channel.name} was deleted',
          color: '#ed4245',
          fields: [
            { name: 'Type', value: '${channel.type}', inline: true },
          ],
          timestamp: '${now()}',
        },
      },
    ],
  },
  // Role Create
  {
    event: 'role_create',
    condition: 'config.logging.events?.roleCreate !== false',
    actions: [
      {
        action: 'send_message',
        channel: '${config.logging.channels?.server || config.logging.channel}',
        embed: {
          title: 'Role Created',
          description: '${role.name} was created',
          color: '${role.hexColor || "#57f287"}',
          fields: [
            { name: 'Color', value: '${role.hexColor || "None"}', inline: true },
            { name: 'Hoisted', value: '${role.hoist ? "Yes" : "No"}', inline: true },
            { name: 'Mentionable', value: '${role.mentionable ? "Yes" : "No"}', inline: true },
          ],
          footer: {
            text: 'Role ID: ${role.id}',
          },
          timestamp: '${now()}',
        },
      },
    ],
  },
  // Role Delete
  {
    event: 'role_delete',
    condition: 'config.logging.events?.roleDelete !== false',
    actions: [
      {
        action: 'send_message',
        channel: '${config.logging.channels?.server || config.logging.channel}',
        embed: {
          title: 'Role Deleted',
          description: '${role.name} was deleted',
          color: '#ed4245',
          footer: {
            text: 'Role ID: ${role.id}',
          },
          timestamp: '${now()}',
        },
      },
    ],
  },
];

export const loggingCommands: CommandDefinition[] = [
  {
    name: 'logging',
    description: 'Logging configuration commands',
    subcommands: [
      {
        name: 'set-channel',
        description: 'Set the logging channel',
        options: [
          { name: 'channel', description: 'Channel for logs', type: 'channel', required: true },
          { name: 'category', description: 'Log category', type: 'string', required: false, choices: [
            { name: 'All', value: 'all' },
            { name: 'Messages', value: 'messages' },
            { name: 'Members', value: 'members' },
            { name: 'Voice', value: 'voice' },
            { name: 'Server', value: 'server' },
            { name: 'Moderation', value: 'moderation' },
          ]},
        ],
        actions: [
          {
            action: 'flow_if',
            condition: '!args.category || args.category === "all"',
            then: [
              {
                action: 'set',
                key: 'config.logging.channel',
                value: '${args.channel.id}',
                scope: 'guild',
              },
            ],
            else: [
              {
                action: 'set',
                key: 'config.logging.channels.${args.category}',
                value: '${args.channel.id}',
                scope: 'guild',
              },
            ],
          },
          {
            action: 'reply',
            content: 'Logging channel updated!',
            ephemeral: true,
          },
        ],
      },
      {
        name: 'toggle',
        description: 'Toggle a logging event',
        options: [
          { name: 'event', description: 'Event to toggle', type: 'string', required: true, choices: [
            { name: 'Message Delete', value: 'messageDelete' },
            { name: 'Message Edit', value: 'messageEdit' },
            { name: 'Member Join', value: 'memberJoin' },
            { name: 'Member Leave', value: 'memberLeave' },
            { name: 'Member Ban', value: 'memberBan' },
            { name: 'Voice Join', value: 'voiceJoin' },
            { name: 'Voice Leave', value: 'voiceLeave' },
          ]},
          { name: 'enabled', description: 'Enable or disable', type: 'boolean', required: true },
        ],
        actions: [
          {
            action: 'set',
            key: 'config.logging.events.${args.event}',
            value: '${args.enabled}',
            scope: 'guild',
          },
          {
            action: 'reply',
            content: '${args.event} logging ${args.enabled ? "enabled" : "disabled"}!',
            ephemeral: true,
          },
        ],
      },
      {
        name: 'ignore-channel',
        description: 'Ignore a channel from logging',
        options: [
          { name: 'channel', description: 'Channel to ignore', type: 'channel', required: true },
        ],
        actions: [
          {
            action: 'list_push',
            key: 'config.logging.ignoredChannels',
            value: '${args.channel.id}',
            scope: 'guild',
          },
          {
            action: 'reply',
            content: '${args.channel} will now be ignored from logs.',
            ephemeral: true,
          },
        ],
      },
    ],
  },
];

export function getLoggingSpec(config: LoggingConfig = {}): Partial<FurlowSpec> {
  return {
    events: loggingEventHandlers,
    commands: loggingCommands,
  };
}
