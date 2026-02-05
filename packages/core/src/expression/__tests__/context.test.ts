/**
 * Context Builder Tests
 *
 * Tests for building expression contexts from Discord.js objects
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  buildBaseContext,
  buildUserContext,
  buildMemberContext,
  buildGuildContext,
  buildChannelContext,
  buildMessageContext,
  buildFullContext,
} from '../context.js';
import type { User, GuildMember, Guild, TextChannel, Message, Collection } from 'discord.js';

/**
 * Create a mock Discord.js User
 */
function createMockUser(overrides: Partial<User> = {}): User {
  return {
    id: '123456789012345678',
    username: 'testuser',
    discriminator: '0001',
    tag: 'testuser#0001',
    avatarURL: vi.fn().mockReturnValue('https://cdn.discordapp.com/avatars/123/abc.png'),
    avatar: 'abc',
    bot: false,
    createdAt: new Date('2020-01-01'),
    createdTimestamp: new Date('2020-01-01').getTime(),
    ...overrides,
  } as unknown as User;
}

/**
 * Create a mock Discord.js Role
 */
function createMockRole(overrides: Partial<{ id: string; name: string; position: number }> = {}) {
  return {
    id: '444555666777888999',
    name: 'Test Role',
    position: 1,
    ...overrides,
  };
}

/**
 * Create a mock Discord.js GuildMember
 */
function createMockMember(overrides: Partial<GuildMember> = {}): GuildMember {
  const user = createMockUser();
  const role1 = createMockRole({ id: 'role1', name: 'Admin', position: 10 });
  const role2 = createMockRole({ id: 'role2', name: 'Member', position: 1 });

  const rolesCache = new Map([
    [role1.id, role1],
    [role2.id, role2],
  ]);

  return {
    id: user.id,
    user,
    nickname: 'testnick',
    displayName: 'testnick',
    joinedAt: new Date('2021-01-01'),
    premiumSince: new Date('2022-01-01'),
    roles: {
      cache: {
        map: vi.fn((fn) => [...rolesCache.values()].map(fn)),
      },
      highest: role1,
    },
    permissions: {
      toArray: vi.fn().mockReturnValue(['Administrator', 'ManageMessages']),
    },
    guild: {
      ownerId: '111111111111111111',
    },
    ...overrides,
  } as unknown as GuildMember;
}

/**
 * Create a mock Discord.js Guild
 */
function createMockGuild(overrides: Partial<Guild> = {}): Guild {
  return {
    id: '987654321098765432',
    name: 'Test Server',
    iconURL: vi.fn().mockReturnValue('https://cdn.discordapp.com/icons/987/xyz.png'),
    icon: 'xyz',
    ownerId: '123456789012345678',
    memberCount: 150,
    createdAt: new Date('2019-01-01'),
    premiumTier: 2,
    premiumSubscriptionCount: 15,
    ...overrides,
  } as unknown as Guild;
}

/**
 * Create a mock Discord.js TextChannel
 */
function createMockChannel(overrides: Partial<TextChannel> = {}): TextChannel {
  return {
    id: '111222333444555666',
    name: 'general',
    type: 0, // GuildText
    topic: 'General discussion',
    nsfw: false,
    parentId: '000111222333444555',
    ...overrides,
  } as unknown as TextChannel;
}

/**
 * Create a mock Discord.js Message
 */
function createMockMessage(overrides: Partial<Message> = {}): Message {
  const author = createMockUser();

  return {
    id: '999888777666555444',
    content: 'Hello world!',
    cleanContent: 'Hello world!',
    createdAt: new Date('2023-06-15'),
    editedAt: null,
    pinned: false,
    tts: false,
    mentions: {
      everyone: false,
      users: { map: vi.fn().mockReturnValue(['user1', 'user2']) },
      roles: { map: vi.fn().mockReturnValue(['role1']) },
    },
    attachments: { size: 2 },
    embeds: [{}],
    url: 'https://discord.com/channels/987/111/999',
    author,
    ...overrides,
  } as unknown as Message;
}

describe('buildBaseContext', () => {
  it('should include current timestamp', () => {
    const before = new Date();
    const context = buildBaseContext();
    const after = new Date();

    expect(context.now).toBeInstanceOf(Date);
    expect(context.now.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(context.now.getTime()).toBeLessThanOrEqual(after.getTime());
  });

  it('should include random number between 0 and 1', () => {
    const context = buildBaseContext();

    expect(typeof context.random).toBe('number');
    expect(context.random).toBeGreaterThanOrEqual(0);
    expect(context.random).toBeLessThan(1);
  });

  it('should generate different random values on each call', () => {
    const context1 = buildBaseContext();
    const context2 = buildBaseContext();

    // Technically could be equal but astronomically unlikely
    // Run multiple times to increase confidence
    let foundDifferent = false;
    for (let i = 0; i < 10; i++) {
      const c1 = buildBaseContext();
      const c2 = buildBaseContext();
      if (c1.random !== c2.random) {
        foundDifferent = true;
        break;
      }
    }
    expect(foundDifferent).toBe(true);
  });
});

describe('buildUserContext', () => {
  it('should extract all user properties', () => {
    const user = createMockUser();
    const context = buildUserContext(user);

    expect(context.id).toBe('123456789012345678');
    expect(context.username).toBe('testuser');
    expect(context.discriminator).toBe('0001');
    expect(context.tag).toBe('testuser#0001');
    expect(context.bot).toBe(false);
  });

  it('should include avatar URL', () => {
    const user = createMockUser();
    const context = buildUserContext(user);

    expect(context.avatar).toBe('https://cdn.discordapp.com/avatars/123/abc.png');
  });

  it('should handle null avatar', () => {
    const user = createMockUser({
      avatarURL: vi.fn().mockReturnValue(null),
    } as any);
    const context = buildUserContext(user);

    expect(context.avatar).toBeNull();
  });

  it('should include created_at date', () => {
    const user = createMockUser();
    const context = buildUserContext(user);

    expect(context.created_at).toBeInstanceOf(Date);
    // The mock user has createdAt as new Date('2020-01-01')
    expect(context.created_at).toEqual(user.createdAt);
  });

  it('should generate mention string', () => {
    const user = createMockUser();
    const context = buildUserContext(user);

    expect(context.mention).toBe('<@123456789012345678>');
  });

  it('should identify bot users', () => {
    const botUser = createMockUser({ bot: true } as any);
    const context = buildUserContext(botUser);

    expect(context.bot).toBe(true);
  });
});

describe('buildMemberContext', () => {
  it('should include all user properties', () => {
    const member = createMockMember();
    const context = buildMemberContext(member);

    expect(context.id).toBe('123456789012345678');
    expect(context.username).toBe('testuser');
    expect(context.tag).toBe('testuser#0001');
  });

  it('should include member-specific properties', () => {
    const member = createMockMember();
    const context = buildMemberContext(member);

    expect(context.nickname).toBe('testnick');
    expect(context.display_name).toBe('testnick');
    expect(context.joined_at).toBeInstanceOf(Date);
  });

  it('should include role information', () => {
    const member = createMockMember();
    const context = buildMemberContext(member);

    expect(context.roles).toContain('Admin');
    expect(context.roles).toContain('Member');
    expect(context.role_ids).toContain('role1');
    expect(context.role_ids).toContain('role2');
    expect(context.highest_role).toBe('Admin');
  });

  it('should include permissions', () => {
    const member = createMockMember();
    const context = buildMemberContext(member);

    expect(context.permissions).toContain('Administrator');
    expect(context.permissions).toContain('ManageMessages');
  });

  it('should detect boosting status', () => {
    const boostingMember = createMockMember();
    const context = buildMemberContext(boostingMember);

    expect(context.is_boosting).toBe(true);
    expect(context.boosting_since).toBeInstanceOf(Date);
  });

  it('should detect non-boosting members', () => {
    const nonBoostingMember = createMockMember({
      premiumSince: null,
    } as any);
    const context = buildMemberContext(nonBoostingMember);

    expect(context.is_boosting).toBe(false);
    expect(context.boosting_since).toBeNull();
  });

  it('should detect server owner', () => {
    const ownerMember = createMockMember({
      guild: { ownerId: '123456789012345678' },
    } as any);
    const context = buildMemberContext(ownerMember);

    expect(context.is_owner).toBe(true);
  });

  it('should detect non-owner members', () => {
    const normalMember = createMockMember();
    const context = buildMemberContext(normalMember);

    expect(context.is_owner).toBe(false);
  });
});

describe('buildGuildContext', () => {
  it('should extract guild properties', () => {
    const guild = createMockGuild();
    const context = buildGuildContext(guild);

    expect(context.id).toBe('987654321098765432');
    expect(context.name).toBe('Test Server');
    expect(context.owner_id).toBe('123456789012345678');
    expect(context.member_count).toBe(150);
  });

  it('should include icon URL', () => {
    const guild = createMockGuild();
    const context = buildGuildContext(guild);

    expect(context.icon).toBe('https://cdn.discordapp.com/icons/987/xyz.png');
  });

  it('should include boost information', () => {
    const guild = createMockGuild();
    const context = buildGuildContext(guild);

    expect(context.premium_tier).toBe(2);
    expect(context.premium_subscription_count).toBe(15);
    expect(context.boost_count).toBe(15);
  });

  it('should handle guild without boosts', () => {
    const guild = createMockGuild({
      premiumTier: 0,
      premiumSubscriptionCount: null,
    } as any);
    const context = buildGuildContext(guild);

    expect(context.premium_tier).toBe(0);
    expect(context.premium_subscription_count).toBe(0);
  });
});

describe('buildChannelContext', () => {
  it('should extract channel properties', () => {
    const channel = createMockChannel();
    const context = buildChannelContext(channel);

    expect(context.id).toBe('111222333444555666');
    expect(context.name).toBe('general');
    expect(context.type).toBe('0');
  });

  it('should generate mention string', () => {
    const channel = createMockChannel();
    const context = buildChannelContext(channel);

    expect(context.mention).toBe('<#111222333444555666>');
  });

  it('should include topic if present', () => {
    const channel = createMockChannel();
    const context = buildChannelContext(channel);

    expect(context.topic).toBe('General discussion');
  });

  it('should include nsfw flag', () => {
    const nsfwChannel = createMockChannel({ nsfw: true } as any);
    const context = buildChannelContext(nsfwChannel);

    expect(context.nsfw).toBe(true);
  });

  it('should include parent ID', () => {
    const channel = createMockChannel();
    const context = buildChannelContext(channel);

    expect(context.parent_id).toBe('000111222333444555');
  });
});

describe('buildMessageContext', () => {
  it('should extract message properties', () => {
    const message = createMockMessage();
    const context = buildMessageContext(message);

    expect(context.id).toBe('999888777666555444');
    expect(context.content).toBe('Hello world!');
    expect(context.clean_content).toBe('Hello world!');
  });

  it('should include timestamps', () => {
    const message = createMockMessage();
    const context = buildMessageContext(message);

    expect(context.created_at).toBeInstanceOf(Date);
    expect(context.edited_at).toBeNull();
  });

  it('should include edit timestamp when edited', () => {
    const editedMessage = createMockMessage({
      editedAt: new Date('2023-06-16'),
    } as any);
    const context = buildMessageContext(editedMessage);

    expect(context.edited_at).toBeInstanceOf(Date);
  });

  it('should include mention information', () => {
    const message = createMockMessage();
    const context = buildMessageContext(message);

    expect(context.mention_everyone).toBe(false);
    expect(context.mentions).toEqual(['user1', 'user2']);
    expect(context.mention_roles).toEqual(['role1']);
  });

  it('should count attachments and embeds', () => {
    const message = createMockMessage();
    const context = buildMessageContext(message);

    expect(context.attachments).toBe(2);
    expect(context.embeds).toBe(1);
  });

  it('should include message URL', () => {
    const message = createMockMessage();
    const context = buildMessageContext(message);

    expect(context.url).toBe('https://discord.com/channels/987/111/999');
  });

  it('should include author information', () => {
    const message = createMockMessage();
    const context = buildMessageContext(message);

    expect(context.author.id).toBe('123456789012345678');
    expect(context.author.username).toBe('testuser');
    expect(context.author.bot).toBe(false);
  });
});

describe('buildFullContext', () => {
  it('should include base context', () => {
    const context = buildFullContext({});

    expect(context.now).toBeInstanceOf(Date);
    expect(typeof context.random).toBe('number');
  });

  it('should include user context when provided', () => {
    const user = createMockUser();
    const context = buildFullContext({ user });

    expect(context.user?.id).toBe('123456789012345678');
    expect(context.user?.username).toBe('testuser');
  });

  it('should include member context when provided', () => {
    const member = createMockMember();
    const context = buildFullContext({ member });

    expect(context.member?.nickname).toBe('testnick');
    expect(context.member?.roles).toContain('Admin');
  });

  it('should auto-populate user from member if not provided', () => {
    const member = createMockMember();
    const context = buildFullContext({ member });

    expect(context.user?.id).toBe('123456789012345678');
  });

  it('should include guild context when provided', () => {
    const guild = createMockGuild();
    const context = buildFullContext({ guild });

    expect(context.guild?.id).toBe('987654321098765432');
    expect(context.guild?.name).toBe('Test Server');
  });

  it('should include channel context when provided', () => {
    const channel = createMockChannel();
    const context = buildFullContext({ channel });

    expect(context.channel?.id).toBe('111222333444555666');
    expect(context.channel?.name).toBe('general');
  });

  it('should include message context when provided', () => {
    const message = createMockMessage();
    const context = buildFullContext({ message });

    expect(context.message?.content).toBe('Hello world!');
  });

  it('should include args when provided', () => {
    const context = buildFullContext({
      args: { target: 'user1', reason: 'spam' },
    });

    expect(context.args?.target).toBe('user1');
    expect(context.args?.reason).toBe('spam');
  });

  it('should include state when provided', () => {
    const context = buildFullContext({
      state: { counter: 42, enabled: true },
    });

    expect(context.state?.counter).toBe(42);
    expect(context.state?.enabled).toBe(true);
  });

  it('should include extra properties', () => {
    const context = buildFullContext({
      extra: { customField: 'customValue', level: 5 },
    });

    expect(context.customField).toBe('customValue');
    expect(context.level).toBe(5);
  });

  it('should build complete context with all options', () => {
    const user = createMockUser();
    const member = createMockMember();
    const guild = createMockGuild();
    const channel = createMockChannel();
    const message = createMockMessage();

    const context = buildFullContext({
      user,
      member,
      guild,
      channel,
      message,
      args: { command: 'test' },
      state: { count: 10 },
      extra: { custom: 'value' },
    });

    expect(context.now).toBeInstanceOf(Date);
    expect(context.user).toBeDefined();
    expect(context.member).toBeDefined();
    expect(context.guild).toBeDefined();
    expect(context.channel).toBeDefined();
    expect(context.message).toBeDefined();
    expect(context.args?.command).toBe('test');
    expect(context.state?.count).toBe(10);
    expect(context.custom).toBe('value');
  });
});
