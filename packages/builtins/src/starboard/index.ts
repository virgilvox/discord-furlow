/**
 * Starboard builtin module
 * Handles star reactions and hall of fame
 */

import type { FurlowSpec, CommandDefinition, EventHandler, TableDefinition } from '@furlow/schema';

export interface StarboardConfig {
  /** Starboard channel */
  channel?: string;
  /** Minimum stars required */
  threshold?: number;
  /** Emoji to use (default: star) */
  emoji?: string;
  /** Self-starring allowed */
  selfStar?: boolean;
  /** Bot messages can be starred */
  botMessages?: boolean;
  /** Ignored channels */
  ignoredChannels?: string[];
  /** NSFW channel handling */
  nsfwAllowed?: boolean;
  /** Star tiers with different thresholds */
  tiers?: Array<{
    threshold: number;
    emoji: string;
    color?: string;
  }>;
}

export const starboardTables: Record<string, TableDefinition> = {
  starboard_messages: {
    columns: {
      id: { type: 'number', primary: true },
      guild_id: { type: 'string', index: true },
      source_channel_id: { type: 'string' },
      source_message_id: { type: 'string', unique: true },
      starboard_message_id: { type: 'string' },
      author_id: { type: 'string', index: true },
      star_count: { type: 'number', default: 0 },
      created_at: { type: 'timestamp' },
    },
  },
  starboard_stars: {
    columns: {
      id: { type: 'number', primary: true },
      message_id: { type: 'string', index: true },
      user_id: { type: 'string' },
      created_at: { type: 'timestamp' },
    },
  },
};

export const starboardEventHandlers: EventHandler[] = [
  // Handle star reactions
  {
    event: 'reaction_add',
    condition: '(reaction.emoji.name === (config.starboard?.emoji || "⭐") || reaction.emoji.name === "🌟") && config.starboard?.channel',
    actions: [
      // Check if channel is ignored
      {
        action: 'flow_if',
        condition: 'config.starboard.ignoredChannels?.includes(channel.id)',
        then: [{ action: 'abort' }],
      },
      // Check NSFW
      {
        action: 'flow_if',
        condition: 'channel.nsfw && !config.starboard.nsfwAllowed',
        then: [{ action: 'abort' }],
      },
      // Check self-star
      {
        action: 'flow_if',
        condition: '!config.starboard.selfStar && user.id === message.author.id',
        then: [{ action: 'abort' }],
      },
      // Check bot messages
      {
        action: 'flow_if',
        condition: '!config.starboard.botMessages && message.author.bot',
        then: [{ action: 'abort' }],
      },
      // Check if already starred by this user
      {
        action: 'db_query',
        table: 'starboard_stars',
        where: { message_id: '${message.id}', user_id: '${user.id}' },
        as: 'existingStar',
      },
      {
        action: 'flow_if',
        condition: 'existingStar.length > 0',
        then: [{ action: 'abort' }],
      },
      // Add star
      {
        action: 'db_insert',
        table: 'starboard_stars',
        data: {
          message_id: '${message.id}',
          user_id: '${user.id}',
          created_at: '${now()}',
        },
      },
      // Count stars
      {
        action: 'db_query',
        table: 'starboard_stars',
        where: { message_id: '${message.id}' },
        as: 'allStars',
      },
      {
        action: 'set',
        key: 'starCount',
        value: '${allStars.length}',
      },
      // Get threshold
      {
        action: 'set',
        key: 'threshold',
        value: '${config.starboard.threshold || 3}',
      },
      // Get appropriate tier
      {
        action: 'set',
        key: 'tier',
        value: '${config.starboard.tiers ? config.starboard.tiers.filter(t => starCount >= t.threshold).pop() : null}',
      },
      {
        action: 'set',
        key: 'displayEmoji',
        value: '${tier?.emoji || config.starboard.emoji || "⭐"}',
      },
      {
        action: 'set',
        key: 'embedColor',
        value: '${tier?.color || "#ffd700"}',
      },
      // Check if already on starboard
      {
        action: 'db_query',
        table: 'starboard_messages',
        where: { source_message_id: '${message.id}' },
        as: 'existing',
      },
      {
        action: 'flow_if',
        condition: 'existing.length > 0',
        then: [
          // Update existing starboard message
          {
            action: 'db_update',
            table: 'starboard_messages',
            where: { source_message_id: '${message.id}' },
            data: { star_count: '${starCount}' },
          },
          {
            action: 'edit_message',
            channel: '${config.starboard.channel}',
            message: '${existing[0].starboard_message_id}',
            content: '${displayEmoji} **${starCount}** | <#${channel.id}>',
          },
        ],
        else: [
          // Create new starboard entry if threshold met
          {
            action: 'flow_if',
            condition: 'starCount >= threshold',
            then: [
              // Build embed
              {
                action: 'set',
                key: 'imageUrl',
                value: '${message.attachments.first()?.url || message.embeds[0]?.image?.url || message.embeds[0]?.thumbnail?.url}',
              },
              {
                action: 'send_message',
                channel: '${config.starboard.channel}',
                content: '${displayEmoji} **${starCount}** | <#${channel.id}>',
                embed: {
                  author: {
                    name: '${message.author.tag}',
                    icon_url: '${message.author.avatar}',
                  },
                  description: '${message.content}\n\n[Jump to message](${message.url})',
                  color: '${embedColor}',
                  image: '${imageUrl ? { url: imageUrl } : null}',
                  timestamp: '${message.created_at}',
                  footer: {
                    text: 'ID: ${message.id}',
                  },
                },
                as: 'starboardMessage',
              },
              {
                action: 'db_insert',
                table: 'starboard_messages',
                data: {
                  guild_id: '${guild.id}',
                  source_channel_id: '${channel.id}',
                  source_message_id: '${message.id}',
                  starboard_message_id: '${starboardMessage.id}',
                  author_id: '${message.author.id}',
                  star_count: '${starCount}',
                  created_at: '${now()}',
                },
              },
            ],
          },
        ],
      },
    ],
  },
  // Handle star removal
  {
    event: 'reaction_remove',
    condition: '(reaction.emoji.name === (config.starboard?.emoji || "⭐") || reaction.emoji.name === "🌟") && config.starboard?.channel',
    actions: [
      // Remove star record
      {
        action: 'db_delete',
        table: 'starboard_stars',
        where: { message_id: '${message.id}', user_id: '${user.id}' },
      },
      // Count remaining stars
      {
        action: 'db_query',
        table: 'starboard_stars',
        where: { message_id: '${message.id}' },
        as: 'allStars',
      },
      {
        action: 'set',
        key: 'starCount',
        value: '${allStars.length}',
      },
      // Check if on starboard
      {
        action: 'db_query',
        table: 'starboard_messages',
        where: { source_message_id: '${message.id}' },
        as: 'existing',
      },
      {
        action: 'flow_if',
        condition: 'existing.length > 0',
        then: [
          {
            action: 'flow_if',
            condition: 'starCount < (config.starboard.threshold || 3)',
            then: [
              // Remove from starboard
              {
                action: 'delete_message',
                channel: '${config.starboard.channel}',
                message: '${existing[0].starboard_message_id}',
              },
              {
                action: 'db_delete',
                table: 'starboard_messages',
                where: { source_message_id: '${message.id}' },
              },
            ],
            else: [
              // Update count
              {
                action: 'set',
                key: 'tier',
                value: '${config.starboard.tiers ? config.starboard.tiers.filter(t => starCount >= t.threshold).pop() : null}',
              },
              {
                action: 'set',
                key: 'displayEmoji',
                value: '${tier?.emoji || config.starboard.emoji || "⭐"}',
              },
              {
                action: 'db_update',
                table: 'starboard_messages',
                where: { source_message_id: '${message.id}' },
                data: { star_count: '${starCount}' },
              },
              {
                action: 'edit_message',
                channel: '${config.starboard.channel}',
                message: '${existing[0].starboard_message_id}',
                content: '${displayEmoji} **${starCount}** | <#${channel.id}>',
              },
            ],
          },
        ],
      },
    ],
  },
];

export const starboardCommands: CommandDefinition[] = [
  {
    name: 'starboard',
    description: 'Starboard commands',
    subcommands: [
      {
        name: 'setup',
        description: 'Set up the starboard',
        options: [
          { name: 'channel', description: 'Starboard channel', type: 'channel', required: true },
          { name: 'threshold', description: 'Minimum stars required', type: 'integer', required: false },
          { name: 'emoji', description: 'Star emoji', type: 'string', required: false },
        ],
        actions: [
          {
            action: 'set',
            key: 'config.starboard.channel',
            value: '${args.channel.id}',
            scope: 'guild',
          },
          {
            action: 'flow_if',
            condition: 'args.threshold',
            then: [
              {
                action: 'set',
                key: 'config.starboard.threshold',
                value: '${args.threshold}',
                scope: 'guild',
              },
            ],
          },
          {
            action: 'flow_if',
            condition: 'args.emoji',
            then: [
              {
                action: 'set',
                key: 'config.starboard.emoji',
                value: '${args.emoji}',
                scope: 'guild',
              },
            ],
          },
          {
            action: 'reply',
            content: 'Starboard set up in ${args.channel}!',
            ephemeral: true,
          },
        ],
      },
      {
        name: 'stats',
        description: 'View starboard statistics',
        actions: [
          {
            action: 'db_query',
            table: 'starboard_messages',
            where: { guild_id: '${guild.id}' },
            order_by: 'star_count DESC',
            limit: 5,
            as: 'topMessages',
          },
          {
            action: 'db_query',
            table: 'starboard_messages',
            where: { guild_id: '${guild.id}' },
            as: 'allMessages',
          },
          {
            action: 'set',
            key: 'totalStars',
            value: '${allMessages.reduce((sum, m) => sum + m.star_count, 0)}',
          },
          {
            action: 'reply',
            embed: {
              title: 'Starboard Statistics',
              color: '#ffd700',
              fields: [
                { name: 'Total Starred Messages', value: '${allMessages.length}', inline: true },
                { name: 'Total Stars', value: '${totalStars}', inline: true },
                { name: 'Top Starred Messages', value: '${topMessages.map((m, i) => (i + 1) + ". " + m.star_count + " stars - <@" + m.author_id + ">").join("\\n") || "None yet!"}' },
              ],
            },
          },
        ],
      },
      {
        name: 'random',
        description: 'Get a random starred message',
        actions: [
          {
            action: 'db_query',
            table: 'starboard_messages',
            where: { guild_id: '${guild.id}' },
            as: 'allMessages',
          },
          {
            action: 'flow_if',
            condition: 'allMessages.length === 0',
            then: [
              { action: 'reply', content: 'No starred messages yet!', ephemeral: true },
              { action: 'abort' },
            ],
          },
          {
            action: 'set',
            key: 'randomMessage',
            value: '${allMessages[floor(random(0, allMessages.length))]}',
          },
          {
            action: 'reply',
            content: '⭐ **${randomMessage.star_count}** - https://discord.com/channels/${guild.id}/${randomMessage.source_channel_id}/${randomMessage.source_message_id}',
          },
        ],
      },
    ],
  },
];

export function getStarboardSpec(config: StarboardConfig = {}): Partial<FurlowSpec> {
  return {
    events: starboardEventHandlers,
    commands: starboardCommands,
    state: {
      tables: starboardTables,
    },
  };
}
