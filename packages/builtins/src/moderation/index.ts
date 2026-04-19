/**
 * Moderation builtin module
 */

import type { FurlowSpec, CommandDefinition, EventHandler } from '@furlow/schema';

export interface ModerationConfig {
  /** Log channel for moderation actions */
  logChannel?: string;
  /** Whether to DM users on moderation actions */
  dmOnAction?: boolean;
  /** Roles exempt from moderation */
  exemptRoles?: string[];
  /** Enable warning system */
  warnings?: {
    enabled?: boolean;
    maxWarnings?: number;
    escalation?: Array<{
      count: number;
      action: 'kick' | 'ban' | 'timeout';
      duration?: string;
    }>;
  };
}

export const moderationCommands: CommandDefinition[] = [
  {
    name: 'warn',
    description: 'Warn a user',
    options: [
      { name: 'user', description: 'User to warn', type: 'user', required: true },
      { name: 'reason', description: 'Reason for warning', type: 'string', required: true },
    ],
    actions: [
      {
        action: 'db_insert',
        table: 'warnings',
        data: {
          user_id: '${args.user.id}',
          guild_id: '${guild.id}',
          moderator_id: '${user.id}',
          reason: '${args.reason}',
          created_at: '${now()}',
        },
      },
      {
        action: 'reply',
        content: 'Warned ${args.user.username} for: ${args.reason}',
        ephemeral: true,
      },
      {
        action: 'send_dm',
        user: '${args.user.id}',
        embed: {
          title: 'Warning Received',
          description: 'You have been warned in ${guild.name}',
          fields: [
            { name: 'Reason', value: '${args.reason}' },
            { name: 'Moderator', value: '${user.username}' },
          ],
          color: '#ffa500',
        },
      },
    ],
  },
  {
    name: 'kick',
    description: 'Kick a user from the server',
    options: [
      { name: 'user', description: 'User to kick', type: 'user', required: true },
      { name: 'reason', description: 'Reason for kick', type: 'string', required: false },
    ],
    actions: [
      {
        action: 'kick',
        user: '${args.user.id}',
        reason: '${args.reason || "No reason provided"}',
        dm_user: true,
        dm_message: 'You have been kicked from ${guild.name}. Reason: ${args.reason || "No reason provided"}',
      },
      {
        action: 'reply',
        content: 'Kicked ${args.user.username}',
        ephemeral: true,
      },
    ],
  },
  {
    name: 'ban',
    description: 'Ban a user from the server',
    options: [
      { name: 'user', description: 'User to ban', type: 'user', required: true },
      { name: 'reason', description: 'Reason for ban', type: 'string', required: false },
      { name: 'delete_days', description: 'Days of messages to delete (0-7)', type: 'integer', required: false },
    ],
    actions: [
      {
        action: 'ban',
        user: '${args.user.id}',
        reason: '${args.reason || "No reason provided"}',
        delete_message_days: '${args.delete_days || 0}' as unknown as number,
        dm_user: true,
        dm_message: 'You have been banned from ${guild.name}. Reason: ${args.reason || "No reason provided"}',
      },
      {
        action: 'reply',
        content: 'Banned ${args.user.username}',
        ephemeral: true,
      },
    ],
  },
  {
    name: 'unban',
    description: 'Unban a user',
    options: [
      { name: 'user_id', description: 'User ID to unban', type: 'string', required: true },
      { name: 'reason', description: 'Reason for unban', type: 'string', required: false },
    ],
    actions: [
      {
        action: 'unban',
        user: '${args.user_id}',
        reason: '${args.reason || "No reason provided"}',
      },
      {
        action: 'reply',
        content: 'Unbanned user ${args.user_id}',
        ephemeral: true,
      },
    ],
  },
  {
    name: 'timeout',
    description: 'Timeout a user',
    options: [
      { name: 'user', description: 'User to timeout', type: 'user', required: true },
      { name: 'duration', description: 'Duration (e.g., 10m, 1h, 1d)', type: 'string', required: true },
      { name: 'reason', description: 'Reason for timeout', type: 'string', required: false },
    ],
    actions: [
      {
        action: 'timeout',
        user: '${args.user.id}',
        duration: '${args.duration}',
        reason: '${args.reason || "No reason provided"}',
        dm_user: true,
        dm_message: 'You have been timed out in ${guild.name} for ${args.duration}. Reason: ${args.reason || "No reason provided"}',
      },
      {
        action: 'reply',
        content: 'Timed out ${args.user.username} for ${args.duration}',
        ephemeral: true,
      },
    ],
  },
  {
    name: 'warnings',
    description: 'View warnings for a user',
    options: [
      { name: 'user', description: 'User to check', type: 'user', required: true },
    ],
    actions: [
      {
        action: 'db_query',
        table: 'warnings',
        where: {
          user_id: '${args.user.id}',
          guild_id: '${guild.id}',
        },
        order_by: 'created_at DESC',
        limit: 10,
        as: 'warnings',
      },
      {
        action: 'reply',
        embed: {
          title: 'Warnings for ${args.user.username}',
          description: '${warnings.length == 0 ? "No warnings found" : warnings | map("- " + .reason) | join("\\n")}',
          color: '${warnings.length > 0 ? "#ffa500" : "#00ff00"}',
          footer: {
            text: 'Total: ${warnings.length} warnings',
          },
        },
      },
    ],
  },
  {
    name: 'purge',
    description: 'Delete multiple messages',
    options: [
      { name: 'count', description: 'Number of messages to delete (1-100)', type: 'integer', required: true },
      { name: 'user', description: 'Only delete messages from this user', type: 'user', required: false },
    ],
    actions: [
      {
        action: 'bulk_delete',
        channel: '${channel.id}',
        count: '${args.count}' as unknown as number,
        user: '${args.user ? args.user.id : null}',
      },
      {
        action: 'reply',
        content: 'Deleted messages',
        ephemeral: true,
      },
    ],
  },
];

export const moderationTables = {
  warnings: {
    columns: {
      id: { type: 'number' as const, primary: true },
      user_id: { type: 'string' as const, index: true },
      guild_id: { type: 'string' as const, index: true },
      moderator_id: { type: 'string' as const },
      reason: { type: 'string' as const },
      created_at: { type: 'timestamp' as const },
    },
  },
  mod_cases: {
    columns: {
      id: { type: 'number' as const, primary: true },
      guild_id: { type: 'string' as const, index: true },
      user_id: { type: 'string' as const, index: true },
      moderator_id: { type: 'string' as const },
      action: { type: 'string' as const },
      reason: { type: 'string' as const },
      created_at: { type: 'timestamp' as const },
    },
  },
};

export function getModerationSpec(config: ModerationConfig = {}): Partial<FurlowSpec> {
  return {
    commands: moderationCommands,
    state: {
      tables: moderationTables,
    },
  };
}
