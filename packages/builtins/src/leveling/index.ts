/**
 * Leveling builtin module
 * Handles XP, levels, rewards, leaderboards, and rank cards
 */

import type { FurlowSpec, CommandDefinition, EventHandler, CanvasGenerator, TableDefinition } from '@furlow/schema';

export interface LevelingConfig {
  /** XP per message range [min, max] */
  xpPerMessage?: [number, number];
  /** Cooldown between XP gains (seconds) */
  xpCooldown?: number;
  /** XP multiplier for roles */
  roleMultipliers?: Record<string, number>;
  /** Channels where XP is disabled */
  ignoredChannels?: string[];
  /** Roles that don't earn XP */
  ignoredRoles?: string[];
  /** Channel for level up announcements */
  announceChannel?: string;
  /** Level up message */
  levelUpMessage?: string;
  /** Use embed for level up */
  levelUpEmbed?: boolean;
  /** Level rewards (level -> role IDs) */
  rewards?: Record<number, string[]>;
  /** Stack rewards or remove previous */
  stackRewards?: boolean;
  /** Use rank card images */
  useRankCard?: boolean;
  /** Rank card generator name */
  rankCardGenerator?: string;
  /** XP curve formula */
  xpCurve?: 'linear' | 'exponential' | 'custom';
  /** Base XP for level 1 */
  baseXP?: number;
  /** XP multiplier per level */
  xpMultiplier?: number;
}

export const levelingTables: Record<string, TableDefinition> = {
  levels: {
    columns: {
      id: { type: 'number', primary: true },
      user_id: { type: 'string', index: true },
      guild_id: { type: 'string', index: true },
      xp: { type: 'number', default: 0 },
      level: { type: 'number', default: 0 },
      total_messages: { type: 'number', default: 0 },
      last_xp_at: { type: 'timestamp' },
    },
  },
};

export const levelingEventHandlers: EventHandler[] = [
  {
    event: 'message',
    condition: '!message.author.bot && !config.leveling.ignoredChannels?.includes(channel.id)',
    actions: [
      // Check cooldown
      {
        action: 'db_query',
        table: 'levels',
        where: {
          user_id: '${user.id}',
          guild_id: '${guild.id}',
        },
        as: 'userData',
      },
      // Initialize if new user
      {
        action: 'flow_if',
        condition: '!userData || userData.length === 0',
        then: [
          {
            action: 'db_insert',
            table: 'levels',
            data: {
              user_id: '${user.id}',
              guild_id: '${guild.id}',
              xp: 0,
              level: 0,
              total_messages: 0,
              last_xp_at: '${now()}',
            },
          },
          {
            action: 'set',
            key: 'userData',
            value: [{ xp: 0, level: 0, total_messages: 0, last_xp_at: null }],
          },
        ],
      },
      // Check cooldown
      {
        action: 'set',
        key: 'cooldownPassed',
        value: '${!userData[0].last_xp_at || (now() - userData[0].last_xp_at) > (config.leveling.xpCooldown || 60) * 1000}',
      },
      {
        action: 'flow_if',
        condition: 'cooldownPassed',
        then: [
          // Calculate XP gain
          {
            action: 'set',
            key: 'xpRange',
            value: '${config.leveling.xpPerMessage || [15, 25]}',
          },
          {
            action: 'set',
            key: 'baseXpGain',
            value: '${random(xpRange[0], xpRange[1])}',
          },
          // Apply role multiplier
          {
            action: 'set',
            key: 'multiplier',
            value: '${config.leveling.roleMultipliers ? (member.roles | map(r => config.leveling.roleMultipliers[r.id] || 1) | max) : 1}',
          },
          {
            action: 'set',
            key: 'xpGain',
            value: '${floor(baseXpGain * multiplier)}',
          },
          // Calculate new XP and level
          {
            action: 'set',
            key: 'newXP',
            value: '${userData[0].xp + xpGain}',
          },
          {
            action: 'set',
            key: 'currentLevel',
            value: '${userData[0].level}',
          },
          // Calculate XP needed for next level
          {
            action: 'set',
            key: 'xpForNextLevel',
            value: '${config.leveling.xpCurve === "exponential" ? floor((config.leveling.baseXP || 100) * pow(config.leveling.xpMultiplier || 1.5, currentLevel)) : (config.leveling.baseXP || 100) * (currentLevel + 1)}',
          },
          // Check for level up
          {
            action: 'set',
            key: 'newLevel',
            value: '${newXP >= xpForNextLevel ? currentLevel + 1 : currentLevel}',
          },
          {
            action: 'set',
            key: 'leveledUp',
            value: '${newLevel > currentLevel}',
          },
          // Update database
          {
            action: 'db_update',
            table: 'levels',
            where: {
              user_id: '${user.id}',
              guild_id: '${guild.id}',
            },
            data: {
              xp: '${leveledUp ? newXP - xpForNextLevel : newXP}',
              level: '${newLevel}',
              total_messages: '${userData[0].total_messages + 1}',
              last_xp_at: '${now()}',
            },
          },
          // Handle level up
          {
            action: 'flow_if',
            condition: 'leveledUp',
            then: [
              // Announce level up
              {
                action: 'flow_if',
                condition: 'config.leveling.announceChannel',
                then: [
                  {
                    action: 'flow_if',
                    condition: 'config.leveling.levelUpEmbed',
                    then: [
                      {
                        action: 'send_message',
                        channel: '${config.leveling.announceChannel}',
                        embed: {
                          title: 'Level Up!',
                          description: '${config.leveling.levelUpMessage || member.display_name + " has reached level " + newLevel + "!"}',
                          color: '#ffd700',
                          thumbnail: '${member.avatar}',
                        },
                      },
                    ],
                    else: [
                      {
                        action: 'send_message',
                        channel: '${config.leveling.announceChannel}',
                        content: '${config.leveling.levelUpMessage || "Congratulations " + member.display_name + "! You reached level " + newLevel + "!"}',
                      },
                    ],
                  },
                ],
              },
              // Award role rewards
              {
                action: 'flow_if',
                condition: 'config.leveling.rewards && config.leveling.rewards[newLevel]',
                then: [
                  // Remove previous rewards if not stacking
                  {
                    action: 'flow_if',
                    condition: '!config.leveling.stackRewards && currentLevel > 0 && config.leveling.rewards[currentLevel]',
                    then: [
                      {
                        action: 'remove_role',
                        user: '${member.id}',
                        role: '${config.leveling.rewards[currentLevel]}',
                      },
                    ],
                  },
                  {
                    action: 'assign_role',
                    user: '${member.id}',
                    role: '${config.leveling.rewards[newLevel]}',
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
];

export const levelingCommands: CommandDefinition[] = [
  {
    name: 'rank',
    description: 'View your rank or another user\'s rank',
    options: [
      { name: 'user', description: 'User to check', type: 'user', required: false },
    ],
    actions: [
      {
        action: 'set',
        key: 'targetUser',
        value: '${args.user || user}',
      },
      {
        action: 'db_query',
        table: 'levels',
        where: {
          user_id: '${targetUser.id}',
          guild_id: '${guild.id}',
        },
        as: 'userData',
      },
      {
        action: 'flow_if',
        condition: '!userData || userData.length === 0',
        then: [
          {
            action: 'reply',
            content: '${targetUser.username} has no XP yet!',
            ephemeral: true,
          },
        ],
        else: [
          // Get leaderboard position
          {
            action: 'db_query',
            table: 'levels',
            where: {
              guild_id: '${guild.id}',
            },
            order_by: 'level DESC, xp DESC',
            as: 'leaderboard',
          },
          {
            action: 'set',
            key: 'rank',
            value: '${(leaderboard | findIndex(u => u.user_id === targetUser.id)) + 1}',
          },
          {
            action: 'set',
            key: 'xpForNextLevel',
            value: '${config.leveling.xpCurve === "exponential" ? floor((config.leveling.baseXP || 100) * pow(config.leveling.xpMultiplier || 1.5, userData[0].level)) : (config.leveling.baseXP || 100) * (userData[0].level + 1)}',
          },
          // Render rank card or embed
          {
            action: 'flow_if',
            condition: 'config.leveling.useRankCard',
            then: [
              {
                action: 'canvas_render',
                generator: '${config.leveling.rankCardGenerator || "rank_card"}',
                context: {
                  user: '${targetUser}',
                  member: '${guild.members.cache.get(targetUser.id)}',
                  level: '${userData[0].level}',
                  xp: '${userData[0].xp}',
                  xpNeeded: '${xpForNextLevel}',
                  rank: '${rank}',
                  totalMessages: '${userData[0].total_messages}',
                },
                as: 'rankCard',
              },
              {
                action: 'reply',
                files: [
                  {
                    attachment: '${rankCard}',
                    name: 'rank.png',
                  },
                ],
              },
            ],
            else: [
              {
                action: 'reply',
                embed: {
                  title: '${targetUser.username}\'s Rank',
                  color: '#5865f2',
                  thumbnail: '${targetUser.avatar}',
                  fields: [
                    { name: 'Rank', value: '#${rank}', inline: true },
                    { name: 'Level', value: '${userData[0].level}', inline: true },
                    { name: 'XP', value: '${userData[0].xp}/${xpForNextLevel}', inline: true },
                    { name: 'Messages', value: '${userData[0].total_messages}', inline: true },
                  ],
                },
              },
            ],
          },
        ],
      },
    ],
  },
  {
    name: 'leaderboard',
    description: 'View the server leaderboard',
    options: [
      { name: 'page', description: 'Page number', type: 'integer', required: false },
    ],
    actions: [
      {
        action: 'set',
        key: 'page',
        value: '${args.page || 1}',
      },
      {
        action: 'set',
        key: 'perPage',
        value: 10,
      },
      {
        action: 'db_query',
        table: 'levels',
        where: {
          guild_id: '${guild.id}',
        },
        order_by: 'level DESC, xp DESC',
        limit: '${perPage}',
        offset: '${(page - 1) * perPage}',
        as: 'leaderboard',
      },
      {
        action: 'set',
        key: 'leaderboardText',
        value: '${leaderboard | mapIndex((entry, i) => "#" + ((page - 1) * perPage + i + 1) + " <@" + entry.user_id + "> - Level " + entry.level + " (" + entry.xp + " XP)") | join("\\n")}',
      },
      {
        action: 'reply',
        embed: {
          title: '${guild.name} Leaderboard',
          description: '${leaderboardText || "No entries yet!"}',
          color: '#ffd700',
          footer: {
            text: 'Page ${page}',
          },
        },
      },
    ],
  },
  {
    name: 'setxp',
    description: 'Set a user\'s XP (admin)',
    options: [
      { name: 'user', description: 'User to modify', type: 'user', required: true },
      { name: 'xp', description: 'XP amount', type: 'integer', required: true },
    ],
    actions: [
      {
        action: 'db_update',
        table: 'levels',
        where: {
          user_id: '${args.user.id}',
          guild_id: '${guild.id}',
        },
        data: {
          xp: '${args.xp}',
        },
        upsert: true,
      },
      {
        action: 'reply',
        content: 'Set ${args.user.username}\'s XP to ${args.xp}',
        ephemeral: true,
      },
    ],
  },
  {
    name: 'setlevel',
    description: 'Set a user\'s level (admin)',
    options: [
      { name: 'user', description: 'User to modify', type: 'user', required: true },
      { name: 'level', description: 'Level', type: 'integer', required: true },
    ],
    actions: [
      {
        action: 'db_update',
        table: 'levels',
        where: {
          user_id: '${args.user.id}',
          guild_id: '${guild.id}',
        },
        data: {
          level: '${args.level}',
          xp: 0,
        },
        upsert: true,
      },
      {
        action: 'reply',
        content: 'Set ${args.user.username}\'s level to ${args.level}',
        ephemeral: true,
      },
    ],
  },
];

export const levelingCanvasGenerators: Record<string, CanvasGenerator> = {
  rank_card: {
    width: 934,
    height: 282,
    background: '#23272a',
    layers: [
      // Background gradient
      {
        type: 'rect',
        x: 0,
        y: 0,
        width: 934,
        height: 282,
        color: 'linear-gradient(135deg, #1a1c20 0%, #2c2f33 100%)',
        radius: 20,
      },
      // User avatar
      {
        type: 'circle_image',
        url: '${user.avatar}',
        x: 120,
        y: 141,
        radius: 80,
        border: {
          width: 5,
          color: '#5865f2',
        },
      },
      // Username
      {
        type: 'text',
        text: '${user.username}',
        x: 260,
        y: 120,
        font: 'bold 36px "Poppins", sans-serif',
        color: '#ffffff',
        align: 'left',
      },
      // Rank badge
      {
        type: 'text',
        text: 'RANK #${rank}',
        x: 850,
        y: 60,
        font: 'bold 24px "Poppins", sans-serif',
        color: '#7289da',
        align: 'right',
      },
      // Level badge
      {
        type: 'text',
        text: 'LEVEL ${level}',
        x: 850,
        y: 90,
        font: 'bold 32px "Poppins", sans-serif',
        color: '#ffffff',
        align: 'right',
      },
      // XP Progress bar background
      {
        type: 'rect',
        x: 260,
        y: 180,
        width: 600,
        height: 30,
        color: '#484b4e',
        radius: 15,
      },
      // XP Progress bar fill
      {
        type: 'progress_bar',
        x: 260,
        y: 180,
        width: 600,
        height: 30,
        progress: '${xp / xpNeeded}',
        color: 'linear-gradient(90deg, #5865f2 0%, #7289da 100%)',
        radius: 15,
      },
      // XP Text
      {
        type: 'text',
        text: '${xp} / ${xpNeeded} XP',
        x: 560,
        y: 160,
        font: '18px "Poppins", sans-serif',
        color: '#99aab5',
        align: 'center',
      },
      // Messages count
      {
        type: 'text',
        text: '${totalMessages} messages',
        x: 260,
        y: 240,
        font: '16px "Poppins", sans-serif',
        color: '#72767d',
        align: 'left',
      },
    ],
  },
};

export function getLevelingSpec(config: LevelingConfig = {}): Partial<FurlowSpec> {
  return {
    events: levelingEventHandlers,
    commands: levelingCommands,
    state: {
      tables: levelingTables,
    },
    canvas: {
      generators: levelingCanvasGenerators,
    },
  };
}
