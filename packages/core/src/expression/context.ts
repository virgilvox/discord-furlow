/**
 * Expression context builders
 */

import type {
  Message,
  GuildMember,
  User,
  Guild,
  TextChannel,
  VoiceChannel,
  Interaction,
  Role,
} from 'discord.js';

export interface BaseContext {
  /** Current timestamp */
  now: Date;
  /** Random number between 0 and 1 */
  random: number;
}

export interface UserContext {
  id: string;
  username: string;
  discriminator: string;
  tag: string;
  avatar: string | null;
  bot: boolean;
  created_at: Date;
  mention: string;
}

export interface MemberContext extends UserContext {
  nickname: string | null;
  display_name: string;
  joined_at: Date | null;
  boosting_since: Date | null;
  is_boosting: boolean;
  roles: string[];
  role_ids: string[];
  highest_role: string;
  permissions: string[];
  is_owner: boolean;
}

export interface GuildContext {
  id: string;
  name: string;
  icon: string | null;
  owner_id: string;
  member_count: number;
  created_at: Date;
  premium_tier: number;
  premium_subscription_count: number;
  boost_count: number;
}

export interface ChannelContext {
  id: string;
  name: string;
  type: string;
  mention: string;
  topic?: string | null;
  nsfw?: boolean;
  parent_id?: string | null;
}

export interface MessageAuthorContext {
  id: string;
  username: string;
  tag: string;
  bot: boolean;
  avatar: string | null;
}

export interface MessageContext {
  id: string;
  content: string;
  clean_content: string;
  created_at: Date;
  edited_at: Date | null;
  pinned: boolean;
  tts: boolean;
  mention_everyone: boolean;
  mentions: string[];
  mention_roles: string[];
  attachments: number;
  embeds: number;
  url: string;
  author: MessageAuthorContext;
}

export interface InteractionContext {
  id: string;
  type: string;
  command_name?: string;
  custom_id?: string;
  options: Record<string, unknown>;
}

export interface FullContext extends BaseContext {
  user?: UserContext;
  member?: MemberContext;
  guild?: GuildContext;
  channel?: ChannelContext;
  message?: MessageContext;
  interaction?: InteractionContext;
  args?: Record<string, unknown>;
  state?: Record<string, unknown>;
  [key: string]: unknown;
}

/**
 * Build base context with common values
 */
export function buildBaseContext(): BaseContext {
  return {
    now: new Date(),
    random: Math.random(),
  };
}

/**
 * Build user context from Discord.js User
 */
export function buildUserContext(user: User): UserContext {
  return {
    id: user.id,
    username: user.username,
    discriminator: user.discriminator,
    tag: user.tag,
    avatar: user.avatarURL(),
    bot: user.bot,
    created_at: user.createdAt,
    mention: `<@${user.id}>`,
  };
}

/**
 * Build member context from Discord.js GuildMember
 */
export function buildMemberContext(member: GuildMember): MemberContext {
  const user = buildUserContext(member.user);
  return {
    ...user,
    nickname: member.nickname,
    display_name: member.displayName,
    joined_at: member.joinedAt,
    boosting_since: member.premiumSince,
    is_boosting: member.premiumSince !== null,
    roles: member.roles.cache.map((r) => r.name),
    role_ids: member.roles.cache.map((r) => r.id),
    highest_role: member.roles.highest.name,
    permissions: member.permissions.toArray(),
    is_owner: member.id === member.guild.ownerId,
  };
}

/**
 * Build guild context from Discord.js Guild
 */
export function buildGuildContext(guild: Guild): GuildContext {
  return {
    id: guild.id,
    name: guild.name,
    icon: guild.iconURL(),
    owner_id: guild.ownerId,
    member_count: guild.memberCount,
    created_at: guild.createdAt,
    premium_tier: guild.premiumTier,
    premium_subscription_count: guild.premiumSubscriptionCount ?? 0,
    boost_count: guild.premiumSubscriptionCount ?? 0,
  };
}

/**
 * Build channel context from Discord.js Channel
 */
export function buildChannelContext(channel: TextChannel | VoiceChannel): ChannelContext {
  const base: ChannelContext = {
    id: channel.id,
    name: channel.name,
    type: channel.type.toString(),
    mention: `<#${channel.id}>`,
    parent_id: channel.parentId,
  };

  if ('topic' in channel) {
    base.topic = channel.topic;
  }
  if ('nsfw' in channel) {
    base.nsfw = channel.nsfw;
  }

  return base;
}

/**
 * Build message context from Discord.js Message
 */
export function buildMessageContext(message: Message): MessageContext {
  return {
    id: message.id,
    content: message.content,
    clean_content: message.cleanContent,
    created_at: message.createdAt,
    edited_at: message.editedAt,
    pinned: message.pinned,
    tts: message.tts,
    mention_everyone: message.mentions.everyone,
    mentions: message.mentions.users.map((u) => u.id),
    mention_roles: message.mentions.roles.map((r) => r.id),
    attachments: message.attachments.size,
    embeds: message.embeds.length,
    url: message.url,
    author: {
      id: message.author.id,
      username: message.author.username,
      tag: message.author.tag,
      bot: message.author.bot,
      avatar: message.author.avatarURL(),
    },
  };
}

/**
 * Build full context from Discord.js objects
 */
export function buildFullContext(options: {
  user?: User;
  member?: GuildMember;
  guild?: Guild;
  channel?: TextChannel | VoiceChannel;
  message?: Message;
  interaction?: Interaction;
  args?: Record<string, unknown>;
  state?: Record<string, unknown>;
  extra?: Record<string, unknown>;
}): FullContext {
  const context: FullContext = buildBaseContext() as FullContext;

  if (options.user) {
    context.user = buildUserContext(options.user);
  }

  if (options.member) {
    context.member = buildMemberContext(options.member);
    if (!context.user) {
      context.user = buildUserContext(options.member.user);
    }
  }

  if (options.guild) {
    context.guild = buildGuildContext(options.guild);
  }

  if (options.channel) {
    context.channel = buildChannelContext(options.channel);
  }

  if (options.message) {
    context.message = buildMessageContext(options.message);
  }

  if (options.interaction) {
    context.interaction = {
      id: options.interaction.id,
      type: options.interaction.type.toString(),
      command_name: options.interaction.isCommand() ? options.interaction.commandName : undefined,
      custom_id: options.interaction.isMessageComponent() ? options.interaction.customId : undefined,
      options: {},
    };

    if (options.interaction.isCommand() && 'options' in options.interaction) {
      const opts: Record<string, unknown> = {};
      const cmdInteraction = options.interaction as unknown as { options: { data: Array<{ name: string; value: unknown }> } };
      for (const opt of cmdInteraction.options.data) {
        opts[opt.name] = opt.value;
      }
      context.interaction.options = opts;
    }
  }

  if (options.args) {
    context.args = options.args;
  }

  if (options.state) {
    context.state = options.state;
  }

  if (options.extra) {
    Object.assign(context, options.extra);
  }

  return context;
}
