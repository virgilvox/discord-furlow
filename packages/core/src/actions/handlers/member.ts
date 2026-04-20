/**
 * Member and role action handlers
 */

import type { ActionRegistry } from '../registry.js';
import type { ActionHandler, ActionContext, ActionResult } from '../types.js';
import type { HandlerDependencies } from './index.js';
import type {
  AssignRoleAction,
  RemoveRoleAction,
  ToggleRoleAction,
  KickAction,
  BanAction,
  UnbanAction,
  TimeoutAction,
  RemoveTimeoutAction,
  SendDMAction,
  SetNicknameAction,
  MoveMemberAction,
  DisconnectMemberAction,
  ServerMuteAction,
  ServerDeafenAction,
} from '@furlow/schema';
import {
  type Guild,
  type GuildMember,
  type Role,
  type User,
  ChannelType,
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
 * Helper to resolve a member from expression or context
 */
async function resolveMember(
  userExpr: string | undefined,
  context: ActionContext,
  deps: HandlerDependencies
): Promise<GuildMember | null> {
  const { evaluator } = deps;
  const guild = await resolveGuild(context, deps);
  if (!guild) return null;

  if (!userExpr) {
    // Use current user from context
    const userId = context.userId || (context.user as any)?.id || (context.member as any)?.id;
    if (!userId) return null;
    return guild.members.fetch(userId);
  }

  // Evaluate expression to get user ID
  const resolved = await evaluator.interpolate(userExpr, context);
  // Extract ID from mention or use directly
  const userId = resolved.replace(/[<@!>]/g, '');
  return guild.members.fetch(userId);
}

/**
 * Helper to resolve a role from expression
 */
async function resolveRole(
  roleExpr: string,
  context: ActionContext,
  deps: HandlerDependencies
): Promise<Role | null> {
  const { evaluator } = deps;
  const guild = await resolveGuild(context, deps);
  if (!guild) return null;

  const resolved = await evaluator.interpolate(roleExpr, context);
  // Extract ID from mention or use directly
  const roleId = resolved.replace(/[<@&>]/g, '');
  return guild.roles.fetch(roleId);
}

/**
 * Helper to resolve a user from expression
 */
async function resolveUser(
  userExpr: string,
  context: ActionContext,
  deps: HandlerDependencies
): Promise<User | null> {
  const { evaluator, client } = deps;
  const resolved = await evaluator.interpolate(userExpr, context);
  const userId = resolved.replace(/[<@!>]/g, '');
  return client.users.fetch(userId);
}

/**
 * Parse duration string to milliseconds
 */
function parseDuration(duration: string): number {
  const match = duration.match(/^(\d+)(ms|s|m|h|d)?$/);
  if (!match) return 0;

  const value = parseInt(match[1]!, 10);
  const unit = match[2] ?? 'ms';

  switch (unit) {
    case 'ms':
      return value;
    case 's':
      return value * 1000;
    case 'm':
      return value * 60 * 1000;
    case 'h':
      return value * 60 * 60 * 1000;
    case 'd':
      return value * 24 * 60 * 60 * 1000;
    default:
      return value;
  }
}

/**
 * Assign role action handler
 */
const assignRoleHandler: ActionHandler<AssignRoleAction> = {
  name: 'assign_role',
  async execute(config, context): Promise<ActionResult> {
    const deps = context._deps as HandlerDependencies;
    const { evaluator } = deps;

    const member = await resolveMember(config.user as string | undefined, context, deps);
    if (!member) {
      return { success: false, error: new Error('Member not found') };
    }

    const role = await resolveRole(String(config.role), context, deps);
    if (!role) {
      return { success: false, error: new Error('Role not found') };
    }

    const reason = config.reason
      ? await evaluator.interpolate(String(config.reason), context)
      : undefined;

    try {
      await member.roles.add(role, reason);
      return { success: true };
    } catch (err) {
      return { success: false, error: err as Error };
    }
  },
};

/**
 * Remove role action handler
 */
const removeRoleHandler: ActionHandler<RemoveRoleAction> = {
  name: 'remove_role',
  async execute(config, context): Promise<ActionResult> {
    const deps = context._deps as HandlerDependencies;
    const { evaluator } = deps;

    const member = await resolveMember(config.user as string | undefined, context, deps);
    if (!member) {
      return { success: false, error: new Error('Member not found') };
    }

    const role = await resolveRole(String(config.role), context, deps);
    if (!role) {
      return { success: false, error: new Error('Role not found') };
    }

    const reason = config.reason
      ? await evaluator.interpolate(String(config.reason), context)
      : undefined;

    try {
      await member.roles.remove(role, reason);
      return { success: true };
    } catch (err) {
      return { success: false, error: err as Error };
    }
  },
};

/**
 * Toggle role action handler
 */
const toggleRoleHandler: ActionHandler<ToggleRoleAction> = {
  name: 'toggle_role',
  async execute(config, context): Promise<ActionResult> {
    const deps = context._deps as HandlerDependencies;
    const { evaluator } = deps;

    const member = await resolveMember(config.user as string | undefined, context, deps);
    if (!member) {
      return { success: false, error: new Error('Member not found') };
    }

    const role = await resolveRole(String(config.role), context, deps);
    if (!role) {
      return { success: false, error: new Error('Role not found') };
    }

    const reason = config.reason
      ? await evaluator.interpolate(String(config.reason), context)
      : undefined;

    try {
      if (member.roles.cache.has(role.id)) {
        await member.roles.remove(role, reason);
      } else {
        await member.roles.add(role, reason);
      }
      return { success: true };
    } catch (err) {
      return { success: false, error: err as Error };
    }
  },
};

/**
 * Kick action handler
 */
const kickHandler: ActionHandler<KickAction> = {
  name: 'kick',
  cost: 5,
  async execute(config, context): Promise<ActionResult> {
    const deps = context._deps as HandlerDependencies;
    const { evaluator } = deps;

    const member = await resolveMember(String(config.user), context, deps);
    if (!member) {
      return { success: false, error: new Error('Member not found') };
    }

    const reason = config.reason
      ? await evaluator.interpolate(String(config.reason), context)
      : undefined;

    // DM user before kick if requested
    if (config.dm_user && config.dm_message) {
      try {
        const dmContent = await evaluator.interpolate(String(config.dm_message), context);
        await member.send(dmContent);
      } catch {
        // Ignore DM errors (user may have DMs disabled)
      }
    }

    try {
      await member.kick(reason);
      return { success: true };
    } catch (err) {
      return { success: false, error: err as Error };
    }
  },
};

/**
 * Ban action handler
 */
const banHandler: ActionHandler<BanAction> = {
  name: 'ban',
  cost: 5,
  async execute(config, context): Promise<ActionResult> {
    const deps = context._deps as HandlerDependencies;
    const { evaluator } = deps;

    const member = await resolveMember(String(config.user), context, deps);
    const guild = await resolveGuild(context, deps);
    if (!guild) {
      return { success: false, error: new Error('Guild not found') };
    }

    const reason = config.reason
      ? await evaluator.interpolate(String(config.reason), context)
      : undefined;

    // DM user before ban if requested
    if (config.dm_user && config.dm_message && member) {
      try {
        const dmContent = await evaluator.interpolate(String(config.dm_message), context);
        await member.send(dmContent);
      } catch {
        // Ignore DM errors
      }
    }

    // If we couldn't find the member, try to ban by user ID directly
    const userId = member?.id || String(config.user).replace(/[<@!>]/g, '');

    try {
      await guild.members.ban(userId, {
        reason,
        deleteMessageSeconds: config.delete_message_days
          ? config.delete_message_days * 24 * 60 * 60
          : undefined,
      });
      return { success: true };
    } catch (err) {
      return { success: false, error: err as Error };
    }
  },
};

/**
 * Unban action handler
 */
const unbanHandler: ActionHandler<UnbanAction> = {
  name: 'unban',
  async execute(config, context): Promise<ActionResult> {
    const deps = context._deps as HandlerDependencies;
    const { evaluator } = deps;

    const guild = await resolveGuild(context, deps);
    if (!guild) {
      return { success: false, error: new Error('Guild not found') };
    }

    const resolved = await evaluator.interpolate(String(config.user), context);
    const userId = resolved.replace(/[<@!>]/g, '');

    const reason = config.reason
      ? await evaluator.interpolate(String(config.reason), context)
      : undefined;

    try {
      await guild.members.unban(userId, reason);
      return { success: true };
    } catch (err) {
      return { success: false, error: err as Error };
    }
  },
};

/**
 * Timeout action handler
 */
const timeoutHandler: ActionHandler<TimeoutAction> = {
  name: 'timeout',
  cost: 3,
  async execute(config, context): Promise<ActionResult> {
    const deps = context._deps as HandlerDependencies;
    const { evaluator } = deps;

    const member = await resolveMember(String(config.user), context, deps);
    if (!member) {
      return { success: false, error: new Error('Member not found') };
    }

    const durationMs = parseDuration(String(config.duration));
    const reason = config.reason
      ? await evaluator.interpolate(String(config.reason), context)
      : undefined;

    // DM user if requested
    if (config.dm_user && config.dm_message) {
      try {
        const dmContent = await evaluator.interpolate(String(config.dm_message), context);
        await member.send(dmContent);
      } catch {
        // Ignore DM errors
      }
    }

    try {
      await member.timeout(durationMs, reason);
      return { success: true };
    } catch (err) {
      return { success: false, error: err as Error };
    }
  },
};

/**
 * Remove timeout action handler
 */
const removeTimeoutHandler: ActionHandler<RemoveTimeoutAction> = {
  name: 'remove_timeout',
  async execute(config, context): Promise<ActionResult> {
    const deps = context._deps as HandlerDependencies;
    const { evaluator } = deps;

    const member = await resolveMember(String(config.user), context, deps);
    if (!member) {
      return { success: false, error: new Error('Member not found') };
    }

    const reason = config.reason
      ? await evaluator.interpolate(String(config.reason), context)
      : undefined;

    try {
      await member.timeout(null, reason);
      return { success: true };
    } catch (err) {
      return { success: false, error: err as Error };
    }
  },
};

/**
 * Send DM action handler
 */
const sendDMHandler: ActionHandler<SendDMAction> = {
  name: 'send_dm',
  cost: 5,
  async execute(config, context): Promise<ActionResult> {
    const deps = context._deps as HandlerDependencies;
    const { evaluator } = deps;

    const user = await resolveUser(String(config.user), context, deps);
    if (!user) {
      return { success: false, error: new Error('User not found') };
    }

    context.quota?.chargeApi('send_dm');

    const options: Record<string, unknown> = {};

    if (config.content) {
      options.content = await evaluator.interpolate(String(config.content), context);
    }

    if (config.embed) {
      options.embeds = [await evaluateEmbed(config.embed as Record<string, unknown>, context, evaluator)];
    }
    if (config.embeds) {
      options.embeds = await Promise.all(
        config.embeds.map((e) => evaluateEmbed(e as Record<string, unknown>, context, evaluator))
      );
    }

    try {
      const message = await user.send(options);
      return { success: true, data: message };
    } catch (err) {
      return { success: false, error: err as Error };
    }
  },
};

/**
 * Helper to evaluate embed objects
 */
async function evaluateEmbed(
  obj: Record<string, unknown>,
  context: ActionContext,
  evaluator: { interpolate: (s: string, ctx: Record<string, unknown>) => Promise<string> }
): Promise<Record<string, unknown>> {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      result[key] = await evaluator.interpolate(value, context);
    } else if (Array.isArray(value)) {
      result[key] = await Promise.all(
        value.map(async (item) => {
          if (typeof item === 'object' && item !== null) {
            return evaluateEmbed(item as Record<string, unknown>, context, evaluator);
          }
          if (typeof item === 'string') {
            return evaluator.interpolate(item, context);
          }
          return item;
        })
      );
    } else if (typeof value === 'object' && value !== null) {
      result[key] = await evaluateEmbed(value as Record<string, unknown>, context, evaluator);
    } else {
      result[key] = value;
    }
  }

  return result;
}

/**
 * Set nickname action handler
 */
const setNicknameHandler: ActionHandler<SetNicknameAction> = {
  name: 'set_nickname',
  async execute(config, context): Promise<ActionResult> {
    const deps = context._deps as HandlerDependencies;
    const { evaluator } = deps;

    const member = await resolveMember(config.user as string | undefined, context, deps);
    if (!member) {
      return { success: false, error: new Error('Member not found') };
    }

    const nickname = await evaluator.interpolate(String(config.nickname), context);
    const reason = config.reason
      ? await evaluator.interpolate(String(config.reason), context)
      : undefined;

    try {
      await member.setNickname(nickname || null, reason);
      return { success: true };
    } catch (err) {
      return { success: false, error: err as Error };
    }
  },
};

/**
 * Move member action handler
 */
const moveMemberHandler: ActionHandler<MoveMemberAction> = {
  name: 'move_member',
  async execute(config, context): Promise<ActionResult> {
    const deps = context._deps as HandlerDependencies;
    const { evaluator, client } = deps;

    const member = await resolveMember(String(config.user), context, deps);
    if (!member) {
      return { success: false, error: new Error('Member not found') };
    }

    const channelResolved = await evaluator.interpolate(String(config.channel), context);
    const channelId = channelResolved.replace(/[<#>]/g, '');
    const channel = await client.channels.fetch(channelId);

    if (!channel || channel.type !== ChannelType.GuildVoice) {
      return { success: false, error: new Error('Voice channel not found') };
    }

    try {
      await member.voice.setChannel(channel);
      return { success: true };
    } catch (err) {
      return { success: false, error: err as Error };
    }
  },
};

/**
 * Disconnect member action handler
 */
const disconnectMemberHandler: ActionHandler<DisconnectMemberAction> = {
  name: 'disconnect_member',
  async execute(config, context): Promise<ActionResult> {
    const deps = context._deps as HandlerDependencies;
    const { evaluator } = deps;

    const member = await resolveMember(String(config.user), context, deps);
    if (!member) {
      return { success: false, error: new Error('Member not found') };
    }

    const reason = config.reason
      ? await evaluator.interpolate(String(config.reason), context)
      : undefined;

    try {
      await member.voice.disconnect(reason);
      return { success: true };
    } catch (err) {
      return { success: false, error: err as Error };
    }
  },
};

/**
 * Server mute action handler
 */
const serverMuteHandler: ActionHandler<ServerMuteAction> = {
  name: 'server_mute',
  async execute(config, context): Promise<ActionResult> {
    const deps = context._deps as HandlerDependencies;
    const { evaluator } = deps;

    const member = await resolveMember(String(config.user), context, deps);
    if (!member) {
      return { success: false, error: new Error('Member not found') };
    }

    const reason = config.reason
      ? await evaluator.interpolate(String(config.reason), context)
      : undefined;

    try {
      await member.voice.setMute(config.muted, reason);
      return { success: true };
    } catch (err) {
      return { success: false, error: err as Error };
    }
  },
};

/**
 * Server deafen action handler
 */
const serverDeafenHandler: ActionHandler<ServerDeafenAction> = {
  name: 'server_deafen',
  async execute(config, context): Promise<ActionResult> {
    const deps = context._deps as HandlerDependencies;
    const { evaluator } = deps;

    const member = await resolveMember(String(config.user), context, deps);
    if (!member) {
      return { success: false, error: new Error('Member not found') };
    }

    const reason = config.reason
      ? await evaluator.interpolate(String(config.reason), context)
      : undefined;

    try {
      await member.voice.setDeaf(config.deafened, reason);
      return { success: true };
    } catch (err) {
      return { success: false, error: err as Error };
    }
  },
};

/**
 * Register all member handlers
 */
export function registerMemberHandlers(
  registry: ActionRegistry,
  deps: HandlerDependencies
): void {
  registry.register(assignRoleHandler);
  registry.register(removeRoleHandler);
  registry.register(toggleRoleHandler);
  registry.register(kickHandler);
  registry.register(banHandler);
  registry.register(unbanHandler);
  registry.register(timeoutHandler);
  registry.register(removeTimeoutHandler);
  registry.register(sendDMHandler);
  registry.register(setNicknameHandler);
  registry.register(moveMemberHandler);
  registry.register(disconnectMemberHandler);
  registry.register(serverMuteHandler);
  registry.register(serverDeafenHandler);
}
