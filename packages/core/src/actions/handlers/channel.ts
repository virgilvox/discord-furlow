/**
 * Channel and role action handlers
 */

import type { ActionRegistry } from '../registry.js';
import type { ActionHandler, ActionContext, ActionResult } from '../types.js';
import type { HandlerDependencies } from './index.js';
import type {
  CreateChannelAction,
  EditChannelAction,
  DeleteChannelAction,
  CreateThreadAction,
  ArchiveThreadAction,
  SetChannelPermissionsAction,
  CreateRoleAction,
  EditRoleAction,
  DeleteRoleAction,
} from '@furlow/schema';
import {
  type Guild,
  type TextChannel,
  type ThreadChannel,
  type Role,
  ChannelType,
  OverwriteType,
  PermissionFlagsBits,
} from 'discord.js';

/**
 * Helper to resolve a guild from context
 */
async function resolveGuild(
  context: ActionContext,
  deps: HandlerDependencies
): Promise<Guild | null> {
  const { client } = deps;
  const guildId = context.guildId || (context.guild as any)?.id;
  if (!guildId) return null;
  return client.guilds.fetch(guildId);
}

/**
 * Helper to get channel type enum from string
 */
function getChannelType(type: string): ChannelType {
  switch (type) {
    case 'text':
      return ChannelType.GuildText;
    case 'voice':
      return ChannelType.GuildVoice;
    case 'category':
      return ChannelType.GuildCategory;
    case 'announcement':
      return ChannelType.GuildAnnouncement;
    case 'stage':
      return ChannelType.GuildStageVoice;
    case 'forum':
      return ChannelType.GuildForum;
    default:
      return ChannelType.GuildText;
  }
}

/**
 * Helper to resolve permission overwrites
 */
async function resolvePermissionOverwrites(
  overwrites: unknown,
  context: ActionContext,
  deps: HandlerDependencies
): Promise<Record<string, unknown>[]> {
  const { evaluator } = deps;

  if (!overwrites) return [];

  // Handle object format: { "role_id": { "SendMessages": true, "ViewChannel": false } }
  if (!Array.isArray(overwrites)) {
    const result: Record<string, unknown>[] = [];
    for (const [id, perms] of Object.entries(overwrites as Record<string, Record<string, boolean>>)) {
      const allow: bigint[] = [];
      const deny: bigint[] = [];

      for (const [perm, value] of Object.entries(perms as Record<string, boolean>)) {
        const permBit = PermissionFlagsBits[perm as keyof typeof PermissionFlagsBits];
        if (permBit) {
          if (value) {
            allow.push(permBit);
          } else {
            deny.push(permBit);
          }
        }
      }

      result.push({
        id,
        allow: allow.reduce((a, b) => a | b, 0n),
        deny: deny.reduce((a, b) => a | b, 0n),
      });
    }
    return result;
  }

  // Handle array format
  const result: Record<string, unknown>[] = [];
  for (const overwrite of overwrites as Array<Record<string, unknown>>) {
    const id = await evaluator.interpolate(String(overwrite.id), context);

    let allow: bigint = 0n;
    let deny: bigint = 0n;

    if (overwrite.allow) {
      const allowPerms = Array.isArray(overwrite.allow)
        ? overwrite.allow
        : [overwrite.allow];
      for (const perm of allowPerms) {
        const permBit = PermissionFlagsBits[perm as keyof typeof PermissionFlagsBits];
        if (permBit) allow |= permBit;
      }
    }

    if (overwrite.deny) {
      const denyPerms = Array.isArray(overwrite.deny)
        ? overwrite.deny
        : [overwrite.deny];
      for (const perm of denyPerms) {
        const permBit = PermissionFlagsBits[perm as keyof typeof PermissionFlagsBits];
        if (permBit) deny |= permBit;
      }
    }

    result.push({
      id: id.replace(/[<@&#>]/g, ''),
      type: overwrite.type === 'member' ? OverwriteType.Member : OverwriteType.Role,
      allow,
      deny,
    });
  }

  return result;
}

/**
 * Create channel action handler
 */
const createChannelHandler: ActionHandler<CreateChannelAction> = {
  name: 'create_channel',
  cost: 10,
  async execute(config, context): Promise<ActionResult> {
    context.quota?.chargeApi('edit_channel');
    const deps = context._deps as HandlerDependencies;
    const { evaluator } = deps;

    const guild = await resolveGuild(context, deps);
    if (!guild) {
      return { success: false, error: new Error('Guild not found') };
    }

    const name = await evaluator.interpolate(String(config.name), context);
    const type = getChannelType(config.type);

    const options: Record<string, unknown> = {
      name,
      type,
    };

    if (config.parent) {
      const parentId = await evaluator.interpolate(String(config.parent), context);
      options.parent = parentId.replace(/[<#>]/g, '');
    }

    if (config.topic) {
      options.topic = await evaluator.interpolate(String(config.topic), context);
    }

    if (config.nsfw !== undefined) {
      options.nsfw = config.nsfw;
    }

    if (config.rate_limit !== undefined) {
      options.rateLimitPerUser = config.rate_limit;
    }

    if (config.bitrate !== undefined) {
      options.bitrate = config.bitrate;
    }

    if (config.user_limit !== undefined) {
      options.userLimit = config.user_limit;
    }

    if (config.position !== undefined) {
      options.position = config.position;
    }

    if (config.permission_overwrites) {
      options.permissionOverwrites = await resolvePermissionOverwrites(
        config.permission_overwrites,
        context,
        deps
      );
    }

    try {
      const channel = await guild.channels.create(options as unknown as Parameters<typeof guild.channels.create>[0]);

      // Store in variable if requested
      if (config.as) {
        (context as Record<string, unknown>)[config.as] = channel;
      }

      return { success: true, data: channel };
    } catch (err) {
      return { success: false, error: err as Error };
    }
  },
};

/**
 * Edit channel action handler
 */
const editChannelHandler: ActionHandler<EditChannelAction> = {
  name: 'edit_channel',
  cost: 10,
  async execute(config, context): Promise<ActionResult> {
    context.quota?.chargeApi('edit_channel');
    const deps = context._deps as HandlerDependencies;
    const { evaluator, client } = deps;

    const channelId = await evaluator.interpolate(String(config.channel), context);
    const channel = await client.channels.fetch(channelId.replace(/[<#>]/g, ''));

    if (!channel || !('edit' in channel)) {
      return { success: false, error: new Error('Channel not found or cannot be edited') };
    }

    const options: Record<string, unknown> = {};

    if (config.name) {
      options.name = await evaluator.interpolate(String(config.name), context);
    }

    if (config.topic) {
      options.topic = await evaluator.interpolate(String(config.topic), context);
    }

    if (config.nsfw !== undefined) {
      options.nsfw = config.nsfw;
    }

    if (config.rate_limit !== undefined) {
      options.rateLimitPerUser = config.rate_limit;
    }

    if (config.bitrate !== undefined) {
      options.bitrate = config.bitrate;
    }

    if (config.user_limit !== undefined) {
      options.userLimit = config.user_limit;
    }

    if (config.position !== undefined) {
      options.position = config.position;
    }

    if (config.parent) {
      const parentId = await evaluator.interpolate(String(config.parent), context);
      options.parent = parentId.replace(/[<#>]/g, '');
    }

    try {
      const edited = await (channel as any).edit(options);
      return { success: true, data: edited };
    } catch (err) {
      return { success: false, error: err as Error };
    }
  },
};

/**
 * Delete channel action handler
 */
const deleteChannelHandler: ActionHandler<DeleteChannelAction> = {
  name: 'delete_channel',
  cost: 10,
  async execute(config, context): Promise<ActionResult> {
    context.quota?.chargeApi('edit_channel');
    const deps = context._deps as HandlerDependencies;
    const { evaluator, client } = deps;

    const channelId = await evaluator.interpolate(String(config.channel), context);
    const channel = await client.channels.fetch(channelId.replace(/[<#>]/g, ''));

    if (!channel || !('delete' in channel)) {
      return { success: false, error: new Error('Channel not found or cannot be deleted') };
    }

    const reason = config.reason
      ? await evaluator.interpolate(String(config.reason), context)
      : undefined;

    try {
      await (channel as any).delete(reason);
      return { success: true };
    } catch (err) {
      return { success: false, error: err as Error };
    }
  },
};

/**
 * Create thread action handler
 */
const createThreadHandler: ActionHandler<CreateThreadAction> = {
  name: 'create_thread',
  async execute(config, context): Promise<ActionResult> {
    const deps = context._deps as HandlerDependencies;
    const { evaluator, client } = deps;

    const channelId = context.channelId || (context.channel as any)?.id;
    if (!channelId) {
      return { success: false, error: new Error('Channel not found') };
    }

    const channel = await client.channels.fetch(channelId);
    if (!channel || channel.type !== ChannelType.GuildText) {
      return { success: false, error: new Error('Invalid channel type for thread creation') };
    }

    const name = await evaluator.interpolate(String(config.name), context);

    const options: Record<string, unknown> = {
      name,
      autoArchiveDuration: config.auto_archive_duration || 1440,
      type: config.type === 'private'
        ? ChannelType.PrivateThread
        : ChannelType.PublicThread,
    };

    if (config.invitable !== undefined) {
      options.invitable = config.invitable;
    }

    try {
      let thread: ThreadChannel;

      if (config.message) {
        // Create thread from message
        const messageId = await evaluator.interpolate(String(config.message), context);
        const message = await (channel as TextChannel).messages.fetch(messageId);
        thread = await message.startThread(options as unknown as Parameters<typeof message.startThread>[0]);
      } else {
        // Create standalone thread
        thread = await (channel as TextChannel).threads.create(options as unknown as Parameters<(typeof channel)['threads']['create']>[0]);
      }

      return { success: true, data: thread };
    } catch (err) {
      return { success: false, error: err as Error };
    }
  },
};

/**
 * Archive thread action handler
 */
const archiveThreadHandler: ActionHandler<ArchiveThreadAction> = {
  name: 'archive_thread',
  async execute(config, context): Promise<ActionResult> {
    const deps = context._deps as HandlerDependencies;
    const { evaluator, client } = deps;

    const threadId = await evaluator.interpolate(String(config.thread), context);
    const thread = await client.channels.fetch(threadId.replace(/[<#>]/g, ''));

    if (!thread || !thread.isThread()) {
      return { success: false, error: new Error('Thread not found') };
    }

    try {
      await thread.setArchived(true);
      if (config.locked) {
        await thread.setLocked(true);
      }
      return { success: true };
    } catch (err) {
      return { success: false, error: err as Error };
    }
  },
};

/**
 * Set channel permissions action handler
 */
const setChannelPermissionsHandler: ActionHandler<SetChannelPermissionsAction> = {
  name: 'set_channel_permissions',
  async execute(config, context): Promise<ActionResult> {
    const deps = context._deps as HandlerDependencies;
    const { evaluator, client } = deps;

    const channelId = await evaluator.interpolate(String(config.channel), context);
    const channel = await client.channels.fetch(channelId.replace(/[<#>]/g, ''));

    if (!channel || !('permissionOverwrites' in channel)) {
      return { success: false, error: new Error('Channel not found or cannot set permissions') };
    }

    let targetId: string;
    let targetType: OverwriteType;

    if (config.user) {
      const userId = await evaluator.interpolate(String(config.user), context);
      targetId = userId.replace(/[<@!>]/g, '');
      targetType = OverwriteType.Member;
    } else if (config.role) {
      const roleId = await evaluator.interpolate(String(config.role), context);
      targetId = roleId.replace(/[<@&>]/g, '');
      targetType = OverwriteType.Role;
    } else {
      return { success: false, error: new Error('Either user or role is required') };
    }

    let allow: bigint = 0n;
    let deny: bigint = 0n;

    if (config.allow) {
      const allowPerms = Array.isArray(config.allow)
        ? config.allow
        : [config.allow];
      for (const perm of allowPerms) {
        const permBit = PermissionFlagsBits[perm as keyof typeof PermissionFlagsBits];
        if (permBit) allow |= permBit;
      }
    }

    if (config.deny) {
      const denyPerms = Array.isArray(config.deny)
        ? config.deny
        : [config.deny];
      for (const perm of denyPerms) {
        const permBit = PermissionFlagsBits[perm as keyof typeof PermissionFlagsBits];
        if (permBit) deny |= permBit;
      }
    }

    try {
      await (channel as any).permissionOverwrites.edit(targetId, {
        allow,
        deny,
      });
      return { success: true };
    } catch (err) {
      return { success: false, error: err as Error };
    }
  },
};

/**
 * Create role action handler
 */
const createRoleHandler: ActionHandler<CreateRoleAction> = {
  name: 'create_role',
  async execute(config, context): Promise<ActionResult> {
    const deps = context._deps as HandlerDependencies;
    const { evaluator } = deps;

    const guild = await resolveGuild(context, deps);
    if (!guild) {
      return { success: false, error: new Error('Guild not found') };
    }

    const name = await evaluator.interpolate(String(config.name), context);

    const options: Record<string, unknown> = {
      name,
    };

    if (config.color) {
      options.color = config.color;
    }

    if (config.hoist !== undefined) {
      options.hoist = config.hoist;
    }

    if (config.mentionable !== undefined) {
      options.mentionable = config.mentionable;
    }

    if (config.position !== undefined) {
      options.position = config.position;
    }

    if (config.permissions) {
      let permissions: bigint = 0n;
      for (const perm of config.permissions) {
        const permBit = PermissionFlagsBits[perm as keyof typeof PermissionFlagsBits];
        if (permBit) permissions |= permBit;
      }
      options.permissions = permissions;
    }

    try {
      const role = await guild.roles.create(options);
      return { success: true, data: role };
    } catch (err) {
      return { success: false, error: err as Error };
    }
  },
};

/**
 * Edit role action handler
 */
const editRoleHandler: ActionHandler<EditRoleAction> = {
  name: 'edit_role',
  async execute(config, context): Promise<ActionResult> {
    const deps = context._deps as HandlerDependencies;
    const { evaluator } = deps;

    const guild = await resolveGuild(context, deps);
    if (!guild) {
      return { success: false, error: new Error('Guild not found') };
    }

    const roleId = await evaluator.interpolate(String(config.role), context);
    const role = await guild.roles.fetch(roleId.replace(/[<@&>]/g, ''));

    if (!role) {
      return { success: false, error: new Error('Role not found') };
    }

    const options: Record<string, unknown> = {};

    if (config.name) {
      options.name = await evaluator.interpolate(String(config.name), context);
    }

    if (config.color !== undefined) {
      options.color = config.color;
    }

    if (config.hoist !== undefined) {
      options.hoist = config.hoist;
    }

    if (config.mentionable !== undefined) {
      options.mentionable = config.mentionable;
    }

    if (config.position !== undefined) {
      options.position = config.position;
    }

    if (config.permissions) {
      let permissions: bigint = 0n;
      for (const perm of config.permissions) {
        const permBit = PermissionFlagsBits[perm as keyof typeof PermissionFlagsBits];
        if (permBit) permissions |= permBit;
      }
      options.permissions = permissions;
    }

    try {
      const edited = await role.edit(options);
      return { success: true, data: edited };
    } catch (err) {
      return { success: false, error: err as Error };
    }
  },
};

/**
 * Delete role action handler
 */
const deleteRoleHandler: ActionHandler<DeleteRoleAction> = {
  name: 'delete_role',
  async execute(config, context): Promise<ActionResult> {
    const deps = context._deps as HandlerDependencies;
    const { evaluator } = deps;

    const guild = await resolveGuild(context, deps);
    if (!guild) {
      return { success: false, error: new Error('Guild not found') };
    }

    const roleId = await evaluator.interpolate(String(config.role), context);
    const role = await guild.roles.fetch(roleId.replace(/[<@&>]/g, ''));

    if (!role) {
      return { success: false, error: new Error('Role not found') };
    }

    const reason = config.reason
      ? await evaluator.interpolate(String(config.reason), context)
      : undefined;

    try {
      await role.delete(reason);
      return { success: true };
    } catch (err) {
      return { success: false, error: err as Error };
    }
  },
};

/**
 * Register all channel handlers
 */
export function registerChannelHandlers(
  registry: ActionRegistry,
  deps: HandlerDependencies
): void {
  registry.register(createChannelHandler);
  registry.register(editChannelHandler);
  registry.register(deleteChannelHandler);
  registry.register(createThreadHandler);
  registry.register(archiveThreadHandler);
  registry.register(setChannelPermissionsHandler);
  registry.register(createRoleHandler);
  registry.register(editRoleHandler);
  registry.register(deleteRoleHandler);
}
