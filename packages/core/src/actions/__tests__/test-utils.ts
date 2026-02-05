/**
 * Shared test utilities for action handler tests
 */

import { vi } from 'vitest';
import type { ActionContext, ActionResult } from '../types.js';
import { ChannelType } from 'discord.js';

/**
 * Create a mock evaluator with common functionality
 */
export function createMockEvaluator() {
  const interpolate = vi.fn(async (str: string, ctx: Record<string, unknown>) => {
    // Simple template interpolation
    return str.replace(/\$\{(\w+(?:\.\w+)*)\}/g, (_, key) => {
      const parts = key.split('.');
      let value: unknown = ctx;
      for (const part of parts) {
        value = (value as Record<string, unknown>)?.[part];
      }
      return value !== undefined ? String(value) : '';
    });
  });

  const evaluate = vi.fn(async <T>(expr: string, ctx: Record<string, unknown>): Promise<T> => {
    if (expr === 'true') return true as T;
    if (expr === 'false') return false as T;
    if (/^\d+$/.test(expr)) return parseInt(expr, 10) as T;
    // Check for simple property access
    if (ctx[expr] !== undefined) return ctx[expr] as T;
    return expr as T;
  });

  return {
    interpolate,
    evaluate,
    evaluateSync: vi.fn((expr: string, ctx: Record<string, unknown>) => {
      if (expr === 'true') return true;
      if (expr === 'false') return false;
      if (/^\d+$/.test(expr)) return parseInt(expr, 10);
      return ctx[expr] ?? expr;
    }),
    interpolateSync: vi.fn((str: string, ctx: Record<string, unknown>) => {
      return str.replace(/\$\{(\w+)\}/g, (_, key) => ctx[key] ? String(ctx[key]) : '');
    }),
    // evaluateTemplate: Returns raw value for exact ${expr} match, otherwise interpolates as string
    // Pass through non-strings directly
    evaluateTemplate: vi.fn(async (template: unknown, ctx: Record<string, unknown>) => {
      if (typeof template !== 'string') {
        return template;
      }
      const exactMatch = template.match(/^\$\{([^}]+)\}$/);
      if (exactMatch) {
        const expr = exactMatch[1]!.trim();
        return evaluate(expr, ctx);
      }
      return interpolate(template, ctx);
    }),
    hasExpressions: vi.fn().mockReturnValue(false),
    addFunction: vi.fn(),
    addTransform: vi.fn(),
    compile: vi.fn(),
  };
}

/**
 * Create a mock Discord client
 */
export function createMockClient() {
  const mockMessage = createMockMessage();
  const mockChannel = createMockChannel();
  const mockGuild = createMockGuild();
  const mockMember = createMockMember();
  const mockUser = createMockUser();
  const mockRole = createMockRole();

  return {
    channels: {
      fetch: vi.fn().mockResolvedValue(mockChannel),
      cache: new Map([[mockChannel.id, mockChannel]]),
    },
    guilds: {
      fetch: vi.fn().mockResolvedValue(mockGuild),
      cache: new Map([[mockGuild.id, mockGuild]]),
    },
    users: {
      fetch: vi.fn().mockResolvedValue(mockUser),
      cache: new Map([[mockUser.id, mockUser]]),
    },
    user: { id: 'bot-123', username: 'TestBot', bot: true },
    isReady: vi.fn().mockReturnValue(true),
    on: vi.fn().mockReturnThis(),
    once: vi.fn().mockReturnThis(),
    emit: vi.fn().mockReturnValue(true),
    login: vi.fn().mockResolvedValue('mock-token'),
    destroy: vi.fn().mockResolvedValue(undefined),
    // Store mocks for test access
    _mocks: {
      message: mockMessage,
      channel: mockChannel,
      guild: mockGuild,
      member: mockMember,
      user: mockUser,
      role: mockRole,
    },
  };
}

/**
 * Create a mock state manager
 */
export function createMockStateManager() {
  const storage = new Map<string, unknown>();
  const tables = new Map<string, unknown[]>();

  return {
    get: vi.fn(async <T>(key: string): Promise<T | undefined> => {
      return storage.get(key) as T | undefined;
    }),
    set: vi.fn(async (key: string, value: unknown): Promise<void> => {
      storage.set(key, value);
    }),
    delete: vi.fn(async (key: string): Promise<boolean> => {
      return storage.delete(key);
    }),
    has: vi.fn(async (key: string): Promise<boolean> => {
      return storage.has(key);
    }),
    increment: vi.fn(async (key: string, by: number = 1): Promise<number> => {
      const current = (storage.get(key) as number) || 0;
      const newValue = current + by;
      storage.set(key, newValue);
      return newValue;
    }),
    decrement: vi.fn(async (key: string, by: number = 1): Promise<number> => {
      const current = (storage.get(key) as number) || 0;
      const newValue = current - by;
      storage.set(key, newValue);
      return newValue;
    }),
    insert: vi.fn(async (table: string, data: Record<string, unknown>): Promise<void> => {
      const tableData = tables.get(table) || [];
      tableData.push(data);
      tables.set(table, tableData);
    }),
    update: vi.fn(async (table: string, where: Record<string, unknown>, data: Record<string, unknown>): Promise<number> => {
      const tableData = tables.get(table) || [];
      let count = 0;
      for (const row of tableData) {
        let matches = true;
        for (const [key, value] of Object.entries(where)) {
          if ((row as Record<string, unknown>)[key] !== value) {
            matches = false;
            break;
          }
        }
        if (matches) {
          Object.assign(row as object, data);
          count++;
        }
      }
      return count;
    }),
    deleteRows: vi.fn(async (table: string, where: Record<string, unknown>): Promise<number> => {
      const tableData = tables.get(table) || [];
      const initialLength = tableData.length;
      const filtered = tableData.filter((row) => {
        for (const [key, value] of Object.entries(where)) {
          if ((row as Record<string, unknown>)[key] === value) {
            return false;
          }
        }
        return true;
      });
      tables.set(table, filtered);
      return initialLength - filtered.length;
    }),
    query: vi.fn(async (table: string, options?: { where?: Record<string, unknown>; limit?: number; offset?: number; select?: string[]; orderBy?: string }): Promise<unknown[]> => {
      let results = [...(tables.get(table) || [])];

      if (options?.where) {
        results = results.filter((row) => {
          for (const [key, value] of Object.entries(options.where!)) {
            if ((row as Record<string, unknown>)[key] !== value) {
              return false;
            }
          }
          return true;
        });
      }

      if (options?.offset) {
        results = results.slice(options.offset);
      }

      if (options?.limit) {
        results = results.slice(0, options.limit);
      }

      return results;
    }),
    // For test access
    _storage: storage,
    _tables: tables,
  };
}

/**
 * Create a mock voice manager
 */
export function createMockVoiceManager() {
  const queues = new Map<string, unknown[]>();
  const currentTracks = new Map<string, unknown>();
  const loopModes = new Map<string, string>();

  return {
    join: vi.fn().mockResolvedValue(undefined),
    leave: vi.fn(),
    play: vi.fn().mockResolvedValue(undefined),
    pause: vi.fn(),
    resume: vi.fn(),
    stop: vi.fn(),
    skip: vi.fn(),
    seek: vi.fn().mockResolvedValue(true),
    setVolume: vi.fn(),
    setFilter: vi.fn().mockResolvedValue(true),
    search: vi.fn().mockResolvedValue([{ url: 'https://example.com/video', title: 'Test Track', duration: 180 }]),
    getQueue: vi.fn((guildId: string) => queues.get(guildId) || []),
    getCurrentTrack: vi.fn((guildId: string) => currentTracks.get(guildId)),
    addToQueue: vi.fn((guildId: string, track: unknown, position?: number) => {
      const queue = queues.get(guildId) || [];
      if (position !== undefined) {
        queue.splice(position, 0, track);
      } else {
        queue.push(track);
      }
      queues.set(guildId, queue);
      return position ?? queue.length - 1;
    }),
    removeFromQueue: vi.fn((guildId: string, position: number) => {
      const queue = queues.get(guildId) || [];
      const removed = queue.splice(position, 1);
      return removed[0];
    }),
    clearQueue: vi.fn((guildId: string) => {
      const queue = queues.get(guildId) || [];
      const count = queue.length;
      queues.set(guildId, []);
      return count;
    }),
    shuffleQueue: vi.fn(),
    setLoopMode: vi.fn((guildId: string, mode: string) => {
      loopModes.set(guildId, mode);
    }),
    // For test access
    _queues: queues,
    _currentTracks: currentTracks,
    _loopModes: loopModes,
  };
}

/**
 * Create a mock flow engine
 */
export function createMockFlowEngine() {
  return {
    execute: vi.fn().mockResolvedValue({ success: true, value: undefined }),
    register: vi.fn(),
    has: vi.fn().mockReturnValue(true),
    get: vi.fn().mockReturnValue(undefined),
  };
}

/**
 * Create a mock channel
 */
export function createMockChannel(overrides: Partial<{
  id: string;
  name: string;
  type: ChannelType;
  guildId: string;
  send: ReturnType<typeof vi.fn>;
  messages: unknown;
  delete: ReturnType<typeof vi.fn>;
  edit: ReturnType<typeof vi.fn>;
  bulkDelete: ReturnType<typeof vi.fn>;
  threads: unknown;
  permissionOverwrites: unknown;
  isThread: ReturnType<typeof vi.fn>;
  setArchived: ReturnType<typeof vi.fn>;
  setLocked: ReturnType<typeof vi.fn>;
}> = {}) {
  const mockMessage = createMockMessage();

  return {
    id: '111222333444555666',
    name: 'general',
    type: ChannelType.GuildText,
    guildId: '987654321098765432',
    send: vi.fn().mockResolvedValue(mockMessage),
    messages: {
      fetch: vi.fn().mockResolvedValue(mockMessage),
      cache: new Map([[mockMessage.id, mockMessage]]),
    },
    delete: vi.fn().mockResolvedValue(undefined),
    edit: vi.fn().mockResolvedValue(undefined),
    bulkDelete: vi.fn().mockResolvedValue(new Map([[mockMessage.id, mockMessage]])),
    threads: {
      create: vi.fn().mockResolvedValue({ id: 'thread-123', name: 'Test Thread' }),
    },
    permissionOverwrites: {
      edit: vi.fn().mockResolvedValue(undefined),
    },
    isThread: vi.fn().mockReturnValue(false),
    setArchived: vi.fn().mockResolvedValue(undefined),
    setLocked: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

/**
 * Create a mock message
 */
export function createMockMessage(overrides: Partial<{
  id: string;
  content: string;
  channelId: string;
  guildId: string;
  author: unknown;
  member: unknown;
  edit: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
  react: ReturnType<typeof vi.fn>;
  reactions: unknown;
  startThread: ReturnType<typeof vi.fn>;
}> = {}) {
  return {
    id: '999888777666555444',
    content: 'Hello, world!',
    channelId: '111222333444555666',
    guildId: '987654321098765432',
    author: { id: '123456789012345678', username: 'testuser', bot: false },
    member: null,
    edit: vi.fn().mockResolvedValue({ id: '999888777666555444', content: 'Edited!' }),
    delete: vi.fn().mockResolvedValue(undefined),
    react: vi.fn().mockResolvedValue(undefined),
    reactions: {
      cache: new Map(),
      removeAll: vi.fn().mockResolvedValue(undefined),
    },
    startThread: vi.fn().mockResolvedValue({ id: 'thread-123', name: 'Test Thread' }),
    createdAt: new Date(),
    ...overrides,
  };
}

/**
 * Create a mock guild
 */
export function createMockGuild(overrides: Partial<{
  id: string;
  name: string;
  ownerId: string;
  memberCount: number;
  members: unknown;
  channels: unknown;
  roles: unknown;
}> = {}) {
  const mockMember = createMockMember();
  const mockRole = createMockRole();

  return {
    id: '987654321098765432',
    name: 'Test Server',
    ownerId: '123456789012345678',
    memberCount: 100,
    members: {
      fetch: vi.fn().mockResolvedValue(mockMember),
      ban: vi.fn().mockResolvedValue(undefined),
      unban: vi.fn().mockResolvedValue(undefined),
      cache: new Map([[mockMember.id, mockMember]]),
    },
    channels: {
      create: vi.fn().mockResolvedValue(createMockChannel()),
      fetch: vi.fn().mockResolvedValue(createMockChannel()),
      cache: new Map(),
    },
    roles: {
      fetch: vi.fn().mockResolvedValue(mockRole),
      create: vi.fn().mockResolvedValue(mockRole),
      cache: new Map([[mockRole.id, mockRole]]),
    },
    ...overrides,
  };
}

/**
 * Create a mock member
 */
export function createMockMember(overrides: Partial<{
  id: string;
  user: unknown;
  nickname: string | null;
  roles: unknown;
  send: ReturnType<typeof vi.fn>;
  kick: ReturnType<typeof vi.fn>;
  ban: ReturnType<typeof vi.fn>;
  timeout: ReturnType<typeof vi.fn>;
  setNickname: ReturnType<typeof vi.fn>;
  voice: unknown;
}> = {}) {
  const roleCache = new Map<string, unknown>();

  return {
    id: '123456789012345678',
    user: { id: '123456789012345678', username: 'testuser', bot: false },
    nickname: null,
    roles: {
      add: vi.fn().mockResolvedValue(undefined),
      remove: vi.fn().mockResolvedValue(undefined),
      cache: roleCache,
      has: (id: string) => roleCache.has(id),
    },
    send: vi.fn().mockResolvedValue({ id: 'dm-message-123' }),
    kick: vi.fn().mockResolvedValue(undefined),
    ban: vi.fn().mockResolvedValue(undefined),
    timeout: vi.fn().mockResolvedValue(undefined),
    setNickname: vi.fn().mockResolvedValue(undefined),
    voice: {
      setChannel: vi.fn().mockResolvedValue(undefined),
      disconnect: vi.fn().mockResolvedValue(undefined),
      setMute: vi.fn().mockResolvedValue(undefined),
      setDeaf: vi.fn().mockResolvedValue(undefined),
    },
    ...overrides,
  };
}

/**
 * Create a mock user
 */
export function createMockUser(overrides: Partial<{
  id: string;
  username: string;
  discriminator: string;
  tag: string;
  avatar: string | null;
  bot: boolean;
  send: ReturnType<typeof vi.fn>;
}> = {}) {
  return {
    id: '123456789012345678',
    username: 'testuser',
    discriminator: '0001',
    tag: 'testuser#0001',
    avatar: null,
    bot: false,
    send: vi.fn().mockResolvedValue({ id: 'dm-message-123' }),
    ...overrides,
  };
}

/**
 * Create a mock role
 */
export function createMockRole(overrides: Partial<{
  id: string;
  name: string;
  color: number;
  hoist: boolean;
  mentionable: boolean;
  position: number;
  permissions: unknown;
  edit: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
}> = {}) {
  return {
    id: '444555666777888999',
    name: 'Test Role',
    color: 0x5865F2,
    hoist: false,
    mentionable: false,
    position: 1,
    permissions: { bitfield: 0n },
    edit: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

/**
 * Create a mock interaction
 */
export function createMockInteraction(overrides: Partial<{
  id: string;
  type: number;
  guildId: string;
  channelId: string;
  user: unknown;
  member: unknown;
  replied: boolean;
  deferred: boolean;
  reply: ReturnType<typeof vi.fn>;
  followUp: ReturnType<typeof vi.fn>;
  deferReply: ReturnType<typeof vi.fn>;
  editReply: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
}> = {}) {
  return {
    id: 'interaction-123',
    type: 2, // ApplicationCommand
    guildId: '987654321098765432',
    channelId: '111222333444555666',
    user: createMockUser(),
    member: createMockMember(),
    replied: false,
    deferred: false,
    reply: vi.fn().mockResolvedValue({ id: 'reply-message-123' }),
    followUp: vi.fn().mockResolvedValue({ id: 'followup-message-123' }),
    deferReply: vi.fn().mockResolvedValue(undefined),
    editReply: vi.fn().mockResolvedValue({ id: 'edited-reply-123' }),
    update: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

/**
 * Create a mock voice channel
 */
export function createMockVoiceChannel(overrides: Partial<{
  id: string;
  name: string;
  type: ChannelType;
  guildId: string;
  bitrate: number;
  userLimit: number;
}> = {}) {
  return {
    id: '222333444555666777',
    name: 'General Voice',
    type: ChannelType.GuildVoice,
    guildId: '987654321098765432',
    bitrate: 64000,
    userLimit: 0,
    ...overrides,
  };
}

/**
 * Create a mock thread channel
 */
export function createMockThread(overrides: Partial<{
  id: string;
  name: string;
  type: ChannelType;
  guildId: string;
  parentId: string;
  archived: boolean;
  locked: boolean;
  setArchived: ReturnType<typeof vi.fn>;
  setLocked: ReturnType<typeof vi.fn>;
  isThread: ReturnType<typeof vi.fn>;
}> = {}) {
  return {
    id: 'thread-123',
    name: 'Test Thread',
    type: ChannelType.PublicThread,
    guildId: '987654321098765432',
    parentId: '111222333444555666',
    archived: false,
    locked: false,
    setArchived: vi.fn().mockResolvedValue(undefined),
    setLocked: vi.fn().mockResolvedValue(undefined),
    isThread: vi.fn().mockReturnValue(true),
    ...overrides,
  };
}

/**
 * Create handler dependencies
 */
export function createHandlerDependencies(overrides: Partial<{
  client: ReturnType<typeof createMockClient>;
  evaluator: ReturnType<typeof createMockEvaluator>;
  stateManager: ReturnType<typeof createMockStateManager>;
  flowEngine: ReturnType<typeof createMockFlowEngine>;
  voiceManager: ReturnType<typeof createMockVoiceManager>;
}> = {}) {
  return {
    client: overrides.client ?? createMockClient(),
    evaluator: overrides.evaluator ?? createMockEvaluator(),
    stateManager: overrides.stateManager ?? createMockStateManager(),
    flowEngine: overrides.flowEngine ?? createMockFlowEngine(),
    voiceManager: overrides.voiceManager ?? createMockVoiceManager(),
  };
}

/**
 * Create a handler context (ActionContext)
 */
export function createHandlerContext(overrides: Partial<ActionContext> = {}): ActionContext {
  const deps = createHandlerDependencies();
  const user = createMockUser();
  const member = createMockMember();
  const guild = createMockGuild();
  const channel = createMockChannel();

  return {
    now: new Date(),
    random: Math.random(),
    guildId: guild.id,
    channelId: channel.id,
    userId: user.id,
    messageId: '999888777666555444',
    user: {
      id: user.id,
      username: user.username,
      discriminator: user.discriminator,
      tag: user.tag,
      avatar: user.avatar,
      bot: user.bot,
      created_at: new Date(),
      mention: `<@${user.id}>`,
    },
    member: {
      id: member.id,
      username: (member.user as any).username,
      discriminator: '0001',
      tag: 'testuser#0001',
      avatar: null,
      bot: false,
      created_at: new Date(),
      mention: `<@${member.id}>`,
      nickname: member.nickname,
      display_name: member.nickname ?? (member.user as any).username,
      joined_at: new Date(),
      boosting_since: null,
      is_boosting: false,
      roles: [],
      role_ids: [],
      highest_role: 'everyone',
      permissions: [],
      is_owner: false,
    },
    guild: {
      id: guild.id,
      name: guild.name,
      icon: null,
      owner_id: guild.ownerId,
      member_count: guild.memberCount,
      created_at: new Date(),
      premium_tier: 0,
      premium_subscription_count: 0,
      boost_count: 0,
    },
    channel: {
      id: channel.id,
      name: channel.name,
      type: 'text',
      mention: `<#${channel.id}>`,
    },
    client: deps.client,
    stateManager: deps.stateManager,
    evaluator: deps.evaluator,
    flowExecutor: {},
    _deps: deps,
    ...overrides,
  } as ActionContext;
}

/**
 * Create a context with an interaction
 */
export function createInteractionContext(overrides: Partial<ActionContext> = {}): ActionContext {
  const interaction = createMockInteraction();
  const context = createHandlerContext({
    interaction,
    ...overrides,
  });
  return context;
}

/**
 * Helper to assert action success
 */
export function expectSuccess(result: ActionResult): void {
  if (!result.success) {
    throw new Error(`Expected success but got error: ${result.error?.message}`);
  }
}

/**
 * Helper to assert action failure
 */
export function expectFailure(result: ActionResult, messageContains?: string): void {
  if (result.success) {
    throw new Error('Expected failure but got success');
  }
  if (messageContains && !result.error?.message.includes(messageContains)) {
    throw new Error(`Expected error message to contain "${messageContains}" but got: ${result.error?.message}`);
  }
}
