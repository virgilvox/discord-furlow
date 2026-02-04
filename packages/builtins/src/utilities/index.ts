/**
 * Utilities builtin module
 * Common utility commands: serverinfo, userinfo, avatar, etc.
 */

import type { FurlowSpec, CommandDefinition } from '@furlow/schema';

export interface UtilitiesConfig {
  /** Commands to enable/disable */
  enabledCommands?: string[];
}

export const utilitiesCommands: CommandDefinition[] = [
  {
    name: 'serverinfo',
    description: 'View server information',
    actions: [
      {
        action: 'set',
        key: 'boostLevel',
        value: '${["None", "Level 1", "Level 2", "Level 3"][guild.premium_tier]}',
      },
      {
        action: 'set',
        key: 'verificationLevel',
        value: '${["None", "Low", "Medium", "High", "Highest"][guild.verificationLevel]}',
      },
      {
        action: 'reply',
        embed: {
          title: '${guild.name}',
          thumbnail: '${guild.icon}',
          color: '#5865f2',
          fields: [
            { name: 'Owner', value: '<@${guild.owner_id}>', inline: true },
            { name: 'Created', value: '${timestamp(guild.created_at, "R")}', inline: true },
            { name: 'Members', value: '${guild.member_count}', inline: true },
            { name: 'Channels', value: '${guild.channel_count}', inline: true },
            { name: 'Roles', value: '${guild.role_count}', inline: true },
            { name: 'Emojis', value: '${guild.emoji_count}', inline: true },
            { name: 'Boost Level', value: '${boostLevel}', inline: true },
            { name: 'Boosts', value: '${guild.boost_count || 0}', inline: true },
            { name: 'Verification', value: '${verificationLevel}', inline: true },
          ],
          footer: { text: 'ID: ${guild.id}' },
        },
      },
    ],
  },
  {
    name: 'userinfo',
    description: 'View user information',
    options: [
      { name: 'user', description: 'User to view', type: 'user', required: false },
    ],
    actions: [
      {
        action: 'set',
        key: 'targetUser',
        value: '${args.user || user}',
      },
      {
        action: 'set',
        key: 'targetMember',
        value: '${options.member || member}',
      },
      {
        action: 'set',
        key: 'roles',
        value: '${targetMember.roles | slice(0, 10) | join(", ") || "None"}',
      },
      {
        action: 'reply',
        embed: {
          title: '${targetUser.tag}',
          thumbnail: '${targetUser.avatar}',
          color: '#5865f2',
          fields: [
            { name: 'Username', value: '${targetUser.username}', inline: true },
            { name: 'Nickname', value: '${targetMember.nickname || "None"}', inline: true },
            { name: 'Bot', value: '${targetUser.bot ? "Yes" : "No"}', inline: true },
            { name: 'Created', value: '${timestamp(targetUser.created_at, "R")}', inline: true },
            { name: 'Joined', value: '${timestamp(targetMember.joined_at, "R")}', inline: true },
            { name: 'Highest Role', value: '${targetMember.highest_role || "None"}', inline: true },
            { name: 'Roles', value: '${roles}', inline: false },
          ],
          footer: { text: 'ID: ${targetUser.id}' },
        },
      },
    ],
  },
  {
    name: 'avatar',
    description: 'View user avatar',
    options: [
      { name: 'user', description: 'User to view', type: 'user', required: false },
    ],
    actions: [
      {
        action: 'set',
        key: 'targetUser',
        value: '${args.user || user}',
      },
      {
        action: 'reply',
        embed: {
          title: '${targetUser.tag}\'s Avatar',
          image: '${targetUser.avatar}',
          color: '#5865f2',
          description: 'Click the image to view full size',
        },
      },
    ],
  },
  {
    name: 'banner',
    description: 'View user banner',
    options: [
      { name: 'user', description: 'User to view', type: 'user', required: false },
    ],
    actions: [
      {
        action: 'set',
        key: 'targetUser',
        value: '${args.user || user}',
      },
      {
        action: 'flow_if',
        condition: '!targetUser.banner',
        then: [
          { action: 'reply', content: 'This user has no banner!', ephemeral: true },
          { action: 'abort' },
        ],
      },
      {
        action: 'reply',
        embed: {
          title: '${targetUser.tag}\'s Banner',
          image: '${targetUser.banner}',
          color: '#5865f2',
        },
      },
    ],
  },
  {
    name: 'roleinfo',
    description: 'View role information',
    options: [
      { name: 'role', description: 'Role to view', type: 'role', required: true },
    ],
    actions: [
      {
        action: 'reply',
        embed: {
          title: '${args.role.name}',
          color: '${args.role.hexColor}',
          fields: [
            { name: 'Color', value: '${args.role.hexColor}', inline: true },
            { name: 'Position', value: '${args.role.position}', inline: true },
            { name: 'Members', value: '${args.role.members.size}', inline: true },
            { name: 'Hoisted', value: '${args.role.hoist ? "Yes" : "No"}', inline: true },
            { name: 'Mentionable', value: '${args.role.mentionable ? "Yes" : "No"}', inline: true },
            { name: 'Managed', value: '${args.role.managed ? "Yes" : "No"}', inline: true },
            { name: 'Created', value: '${timestamp(args.role.createdAt, "R")}', inline: true },
          ],
          footer: { text: 'ID: ${args.role.id}' },
        },
      },
    ],
  },
  {
    name: 'channelinfo',
    description: 'View channel information',
    options: [
      { name: 'channel', description: 'Channel to view', type: 'channel', required: false },
    ],
    actions: [
      {
        action: 'set',
        key: 'targetChannel',
        value: '${args.channel || channel}',
      },
      {
        action: 'reply',
        embed: {
          title: '#${targetChannel.name}',
          color: '#5865f2',
          fields: [
            { name: 'Type', value: '${targetChannel.type}', inline: true },
            { name: 'Category', value: '${targetChannel.parent?.name || "None"}', inline: true },
            { name: 'Position', value: '${targetChannel.position}', inline: true },
            { name: 'NSFW', value: '${targetChannel.nsfw ? "Yes" : "No"}', inline: true },
            { name: 'Created', value: '${timestamp(targetChannel.createdAt, "R")}', inline: true },
            { name: 'Topic', value: '${targetChannel.topic || "None"}', inline: false },
          ],
          footer: { text: 'ID: ${targetChannel.id}' },
        },
      },
    ],
  },
  {
    name: 'ping',
    description: 'Check bot latency',
    actions: [
      {
        action: 'reply',
        content: 'Pong! Latency: ${client.ws.ping}ms',
      },
    ],
  },
  {
    name: 'invite',
    description: 'Get bot invite link',
    actions: [
      {
        action: 'reply',
        embed: {
          title: 'Invite ${client.user.username}',
          description: '[Click here to invite](https://discord.com/oauth2/authorize?client_id=${client.user.id}&permissions=8&scope=bot%20applications.commands)',
          color: '#5865f2',
        },
        ephemeral: true,
      },
    ],
  },
  {
    name: 'membercount',
    description: 'View member count',
    actions: [
      {
        action: 'set',
        key: 'humans',
        value: '${guild.members.cache.filter(m => !m.user.bot).size}',
      },
      {
        action: 'set',
        key: 'bots',
        value: '${guild.members.cache.filter(m => m.user.bot).size}',
      },
      {
        action: 'reply',
        embed: {
          title: 'Member Count',
          color: '#5865f2',
          fields: [
            { name: 'Total', value: '${guild.member_count}', inline: true },
            { name: 'Humans', value: '${humans}', inline: true },
            { name: 'Bots', value: '${bots}', inline: true },
          ],
        },
      },
    ],
  },
  {
    name: 'emojis',
    description: 'List server emojis',
    actions: [
      {
        action: 'set',
        key: 'staticEmojis',
        value: '${guild.emojis.cache.filter(e => !e.animated).map(e => e.toString()).slice(0, 50).join(" ")}',
      },
      {
        action: 'set',
        key: 'animatedEmojis',
        value: '${guild.emojis.cache.filter(e => e.animated).map(e => e.toString()).slice(0, 50).join(" ")}',
      },
      {
        action: 'reply',
        embed: {
          title: '${guild.name} Emojis',
          color: '#5865f2',
          fields: [
            { name: 'Static (${guild.emojis.cache.filter(e => !e.animated).size})', value: '${staticEmojis || "None"}' },
            { name: 'Animated (${guild.emojis.cache.filter(e => e.animated).size})', value: '${animatedEmojis || "None"}' },
          ],
        },
      },
    ],
  },
  {
    name: 'roles',
    description: 'List server roles',
    actions: [
      {
        action: 'set',
        key: 'roleList',
        value: '${guild.roles.cache.filter(r => r.id !== guild.id).sort((a, b) => b.position - a.position).map(r => r.toString()).slice(0, 40).join(", ")}',
      },
      {
        action: 'reply',
        embed: {
          title: '${guild.name} Roles (${guild.roles.cache.size - 1})',
          description: '${roleList}',
          color: '#5865f2',
        },
      },
    ],
  },
];

export function getUtilitiesSpec(config: UtilitiesConfig = {}): Partial<FurlowSpec> {
  return {
    commands: utilitiesCommands,
  };
}
