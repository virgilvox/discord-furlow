/**
 * E2E Test Runtime
 *
 * Provides a complete test environment for end-to-end testing of FURLOW specs.
 * Wires real components (parser, evaluator, executor, flow engine, event router)
 * with mocked Discord API for verification.
 */

import { EventEmitter } from 'events';
import type { Action, FurlowSpec, StateScope } from '@furlow/schema';
import type { ActionContext, ActionResult, ActionHandler } from '@furlow/core';
import {
  loadSpecFromString,
  createEvaluator,
  createActionRegistry,
  createActionExecutor,
  createFlowEngine,
  createEventRouter,
  createStateManager,
} from '@furlow/core';
import { createMemoryAdapter } from '@furlow/storage';
import {
  ActionTracker,
  createActionTracker,
  createTrackedRegistry,
  type ActionExecutionRecord,
  type DiscordApiCall,
} from './action-tracker.js';

// ==========================================
// Mock Discord Classes
// ==========================================

export class MockUser {
  id: string;
  username: string;
  discriminator: string;
  bot: boolean;
  tag: string;
  avatar: string | null;
  createdAt: Date;

  constructor(data: Partial<MockUser> = {}) {
    this.id = data.id ?? '123456789012345678';
    this.username = data.username ?? 'TestUser';
    this.discriminator = data.discriminator ?? '0001';
    this.bot = data.bot ?? false;
    this.tag = `${this.username}#${this.discriminator}`;
    this.avatar = data.avatar ?? null;
    this.createdAt = data.createdAt ?? new Date();
  }

  toString(): string {
    return `<@${this.id}>`;
  }
}

export class MockMember {
  user: MockUser;
  nickname: string | null;
  roles: MockRoleManager;
  permissions: MockPermissions;
  joinedAt: Date;
  guild: MockGuild;

  constructor(user: MockUser, guild: MockGuild, data: Partial<MockMember> = {}) {
    this.user = user;
    this.guild = guild;
    this.nickname = data.nickname ?? null;
    this.roles = new MockRoleManager();
    this.permissions = new MockPermissions();
    this.joinedAt = data.joinedAt ?? new Date();
  }

  get displayName(): string {
    return this.nickname ?? this.user.username;
  }

  get id(): string {
    return this.user.id;
  }
}

export class MockRoleManager {
  cache = new Map<string, MockRole>();
  private _ids: string[] = [];

  add(roleId: string): Promise<this> {
    this._ids.push(roleId);
    return Promise.resolve(this);
  }

  remove(roleId: string): Promise<this> {
    const idx = this._ids.indexOf(roleId);
    if (idx > -1) this._ids.splice(idx, 1);
    return Promise.resolve(this);
  }

  has(roleId: string): boolean {
    return this._ids.includes(roleId);
  }

  get ids(): string[] {
    return [...this._ids];
  }
}

export class MockRole {
  id: string;
  name: string;
  color: number;
  position: number;

  constructor(data: Partial<MockRole> = {}) {
    this.id = data.id ?? '444555666777888999';
    this.name = data.name ?? 'Test Role';
    this.color = data.color ?? 0x5865f2;
    this.position = data.position ?? 1;
  }
}

export class MockPermissions {
  private perms = new Set<string>();

  has(permission: string): boolean {
    return this.perms.has(permission);
  }

  add(permission: string): void {
    this.perms.add(permission);
  }

  toArray(): string[] {
    return [...this.perms];
  }
}

export class MockChannel {
  id: string;
  name: string;
  type: number;
  guildId: string;
  messages: MockMessage[] = [];
  private tracker?: ActionTracker;

  constructor(data: Partial<MockChannel> = {}, tracker?: ActionTracker) {
    this.id = data.id ?? '111222333444555666';
    this.name = data.name ?? 'general';
    this.type = data.type ?? 0;
    this.guildId = data.guildId ?? '987654321098765432';
    this.tracker = tracker;
  }

  async send(content: string | { content?: string; embeds?: unknown[] }): Promise<MockMessage> {
    const messageContent = typeof content === 'string' ? content : content.content ?? '';
    const message = new MockMessage({
      content: messageContent,
      channelId: this.id,
      guildId: this.guildId,
    });
    this.messages.push(message);
    this.tracker?.recordDiscordCall('send', [content]);
    return message;
  }

  toString(): string {
    return `<#${this.id}>`;
  }
}

export class MockMessage {
  id: string;
  content: string;
  author: MockUser;
  member: MockMember | null;
  channelId: string;
  guildId: string | null;
  createdAt: Date;
  replied = false;
  replyContent: string | null = null;
  private tracker?: ActionTracker;

  constructor(data: Partial<MockMessage & { authorBot?: boolean }> = {}, tracker?: ActionTracker) {
    this.id = data.id ?? String(Date.now());
    this.content = data.content ?? '';
    this.author = data.author ?? new MockUser({ bot: data.authorBot ?? false });
    this.member = data.member ?? null;
    this.channelId = data.channelId ?? '111222333444555666';
    this.guildId = data.guildId ?? '987654321098765432';
    this.createdAt = data.createdAt ?? new Date();
    this.tracker = tracker;
  }

  async reply(content: string | { content?: string }): Promise<MockMessage> {
    this.replied = true;
    this.replyContent = typeof content === 'string' ? content : content.content ?? '';
    this.tracker?.recordDiscordCall('reply', [content]);
    return new MockMessage({
      content: this.replyContent,
      channelId: this.channelId,
      guildId: this.guildId ?? undefined,
    });
  }

  async react(emoji: string): Promise<void> {
    this.tracker?.recordDiscordCall('react', [emoji]);
  }

  async delete(): Promise<void> {
    this.tracker?.recordDiscordCall('delete', [this.id]);
  }
}

export class MockGuild {
  id: string;
  name: string;
  ownerId: string;
  memberCount: number;
  channels = new Map<string, MockChannel>();
  members = new Map<string, MockMember>();
  roles = new Map<string, MockRole>();

  constructor(data: Partial<MockGuild> = {}) {
    this.id = data.id ?? '987654321098765432';
    this.name = data.name ?? 'Test Server';
    this.ownerId = data.ownerId ?? '123456789012345678';
    this.memberCount = data.memberCount ?? 100;
  }
}

interface MockInteractionReply {
  content?: string;
  embeds?: unknown[];
  ephemeral?: boolean;
  components?: unknown[];
}

export class MockCommandInteraction {
  id: string;
  commandName: string;
  options: Map<string, unknown>;
  user: MockUser;
  member: MockMember;
  channelId: string;
  guildId: string;
  guild: MockGuild;
  replied = false;
  deferred = false;
  replyData: MockInteractionReply | null = null;
  private tracker?: ActionTracker;

  constructor(
    commandName: string,
    options: Record<string, unknown> = {},
    guild: MockGuild,
    tracker?: ActionTracker
  ) {
    this.id = String(Date.now());
    this.commandName = commandName;
    this.options = new Map(Object.entries(options));
    this.user = new MockUser();
    this.guild = guild;
    this.member = new MockMember(this.user, guild);
    this.channelId = '111222333444555666';
    this.guildId = guild.id;
    this.tracker = tracker;
  }

  isChatInputCommand(): boolean {
    return true;
  }
  isButton(): boolean {
    return false;
  }
  isStringSelectMenu(): boolean {
    return false;
  }
  isModalSubmit(): boolean {
    return false;
  }
  isUserContextMenuCommand(): boolean {
    return false;
  }
  isMessageContextMenuCommand(): boolean {
    return false;
  }
  isRepliable(): boolean {
    return true;
  }

  async reply(data: string | MockInteractionReply): Promise<this> {
    this.replied = true;
    this.replyData = typeof data === 'string' ? { content: data } : data;
    this.tracker?.recordDiscordCall('reply', [data]);
    return this;
  }

  async deferReply(options?: { ephemeral?: boolean }): Promise<this> {
    this.deferred = true;
    this.tracker?.recordDiscordCall('deferReply', [options]);
    return this;
  }

  async editReply(data: string | MockInteractionReply): Promise<MockMessage> {
    this.replyData = typeof data === 'string' ? { content: data } : data;
    this.tracker?.recordDiscordCall('editReply', [data]);
    return new MockMessage({ content: this.replyData?.content });
  }

  async followUp(data: string | MockInteractionReply): Promise<MockMessage> {
    this.tracker?.recordDiscordCall('followUp', [data]);
    return new MockMessage({
      content: typeof data === 'string' ? data : data.content,
    });
  }

  getOption(name: string): unknown {
    return this.options.get(name);
  }
}

export class MockButtonInteraction {
  id: string;
  customId: string;
  user: MockUser;
  member: MockMember;
  channelId: string;
  guildId: string;
  guild: MockGuild;
  replied = false;
  deferred = false;
  replyData: MockInteractionReply | null = null;
  message: MockMessage;
  private tracker?: ActionTracker;

  constructor(customId: string, guild: MockGuild, tracker?: ActionTracker) {
    this.id = String(Date.now());
    this.customId = customId;
    this.user = new MockUser();
    this.guild = guild;
    this.member = new MockMember(this.user, guild);
    this.channelId = '111222333444555666';
    this.guildId = guild.id;
    this.message = new MockMessage();
    this.tracker = tracker;
  }

  isChatInputCommand(): boolean {
    return false;
  }
  isButton(): boolean {
    return true;
  }
  isStringSelectMenu(): boolean {
    return false;
  }
  isModalSubmit(): boolean {
    return false;
  }
  isUserContextMenuCommand(): boolean {
    return false;
  }
  isMessageContextMenuCommand(): boolean {
    return false;
  }
  isRepliable(): boolean {
    return true;
  }

  async reply(data: string | MockInteractionReply): Promise<this> {
    this.replied = true;
    this.replyData = typeof data === 'string' ? { content: data } : data;
    this.tracker?.recordDiscordCall('reply', [data]);
    return this;
  }

  async deferReply(options?: { ephemeral?: boolean }): Promise<this> {
    this.deferred = true;
    this.tracker?.recordDiscordCall('deferReply', [options]);
    return this;
  }

  async deferUpdate(): Promise<this> {
    this.deferred = true;
    this.tracker?.recordDiscordCall('deferUpdate', []);
    return this;
  }

  async update(data: MockInteractionReply): Promise<this> {
    this.replyData = data;
    this.tracker?.recordDiscordCall('update', [data]);
    return this;
  }
}

export class MockSelectMenuInteraction {
  id: string;
  customId: string;
  values: string[];
  user: MockUser;
  member: MockMember;
  channelId: string;
  guildId: string;
  guild: MockGuild;
  replied = false;
  deferred = false;
  replyData: MockInteractionReply | null = null;
  private tracker?: ActionTracker;

  constructor(
    customId: string,
    values: string[],
    guild: MockGuild,
    tracker?: ActionTracker
  ) {
    this.id = String(Date.now());
    this.customId = customId;
    this.values = values;
    this.user = new MockUser();
    this.guild = guild;
    this.member = new MockMember(this.user, guild);
    this.channelId = '111222333444555666';
    this.guildId = guild.id;
    this.tracker = tracker;
  }

  isChatInputCommand(): boolean {
    return false;
  }
  isButton(): boolean {
    return false;
  }
  isStringSelectMenu(): boolean {
    return true;
  }
  isModalSubmit(): boolean {
    return false;
  }
  isRepliable(): boolean {
    return true;
  }

  async reply(data: string | MockInteractionReply): Promise<this> {
    this.replied = true;
    this.replyData = typeof data === 'string' ? { content: data } : data;
    this.tracker?.recordDiscordCall('reply', [data]);
    return this;
  }

  async deferReply(options?: { ephemeral?: boolean }): Promise<this> {
    this.deferred = true;
    this.tracker?.recordDiscordCall('deferReply', [options]);
    return this;
  }

  async deferUpdate(): Promise<this> {
    this.deferred = true;
    this.tracker?.recordDiscordCall('deferUpdate', []);
    return this;
  }
}

export class MockModalSubmitInteraction {
  id: string;
  customId: string;
  fields: Map<string, string>;
  user: MockUser;
  member: MockMember;
  channelId: string;
  guildId: string;
  guild: MockGuild;
  replied = false;
  deferred = false;
  replyData: MockInteractionReply | null = null;
  private tracker?: ActionTracker;

  constructor(
    customId: string,
    fields: Record<string, string>,
    guild: MockGuild,
    tracker?: ActionTracker
  ) {
    this.id = String(Date.now());
    this.customId = customId;
    this.fields = new Map(Object.entries(fields));
    this.user = new MockUser();
    this.guild = guild;
    this.member = new MockMember(this.user, guild);
    this.channelId = '111222333444555666';
    this.guildId = guild.id;
    this.tracker = tracker;
  }

  isChatInputCommand(): boolean {
    return false;
  }
  isButton(): boolean {
    return false;
  }
  isStringSelectMenu(): boolean {
    return false;
  }
  isModalSubmit(): boolean {
    return true;
  }
  isRepliable(): boolean {
    return true;
  }

  getField(name: string): string | undefined {
    return this.fields.get(name);
  }

  async reply(data: string | MockInteractionReply): Promise<this> {
    this.replied = true;
    this.replyData = typeof data === 'string' ? { content: data } : data;
    this.tracker?.recordDiscordCall('reply', [data]);
    return this;
  }

  async deferReply(options?: { ephemeral?: boolean }): Promise<this> {
    this.deferred = true;
    this.tracker?.recordDiscordCall('deferReply', [options]);
    return this;
  }
}

export class MockReaction {
  emoji: { name: string; id: string | null };
  user: MockUser;
  message: MockMessage;

  constructor(
    emoji: string | { name: string; id?: string },
    user: MockUser,
    message: MockMessage
  ) {
    this.emoji =
      typeof emoji === 'string' ? { name: emoji, id: null } : { name: emoji.name, id: emoji.id ?? null };
    this.user = user;
    this.message = message;
  }
}

class MockDiscordClient extends EventEmitter {
  user: MockUser | null = null;
  guilds = {
    cache: new Map<string, MockGuild>(),
  };
  channels = {
    cache: new Map<string, MockChannel>(),
    fetch: async (id: string) => this.channels.cache.get(id),
  };
  private _isReady = false;

  async login(token: string): Promise<string> {
    this.user = new MockUser({ bot: true, username: 'TestBot' });
    this._isReady = true;
    this.emit('ready', this);
    return token;
  }

  isReady(): boolean {
    return this._isReady;
  }

  async destroy(): Promise<void> {
    this._isReady = false;
    this.removeAllListeners();
  }
}

// ==========================================
// E2E Test Runtime
// ==========================================

export interface E2ETestRuntimeOptions {
  /** Validate spec against schema (default: true) */
  validate?: boolean;
}

export interface E2ETestRuntime {
  // Core components
  spec: FurlowSpec;
  tracker: ActionTracker;

  // Lifecycle
  start(): Promise<void>;
  stop(): Promise<void>;

  // Event simulation
  simulateCommand(
    name: string,
    options?: Record<string, unknown>,
    user?: Partial<MockUser>
  ): Promise<MockCommandInteraction>;
  simulateMessage(content: string, options?: { authorBot?: boolean }): Promise<MockMessage>;
  simulateMemberJoin(member?: Partial<MockUser>): Promise<MockMember>;
  simulateMemberLeave(member?: Partial<MockUser>): Promise<MockMember>;
  simulateButton(customId: string, user?: Partial<MockUser>): Promise<MockButtonInteraction>;
  simulateSelectMenu(
    customId: string,
    values: string[],
    user?: Partial<MockUser>
  ): Promise<MockSelectMenuInteraction>;
  simulateModalSubmit(
    customId: string,
    fields: Record<string, string>,
    user?: Partial<MockUser>
  ): Promise<MockModalSubmitInteraction>;
  simulateReactionAdd(
    emoji: string,
    message?: MockMessage,
    user?: Partial<MockUser>
  ): Promise<MockReaction>;
  simulateReactionRemove(
    emoji: string,
    message?: MockMessage,
    user?: Partial<MockUser>
  ): Promise<MockReaction>;

  // Factory methods
  createUser(data?: Partial<MockUser>): MockUser;
  createMember(data?: Partial<MockUser>): MockMember;

  // Observability
  getExecutedActions(): ActionExecutionRecord[];
  getDiscordCalls(): DiscordApiCall[];
  getReplies(): string[];

  // Assertions
  assertActionExecuted(actionName: string, config?: Partial<Action>): void;
  assertActionNotExecuted(actionName: string): void;
  assertActionExecutedTimes(actionName: string, times: number): void;
  assertReplyContains(text: string): void;
  assertReplyEquals(text: string): void;
  assertStateEquals(
    name: string,
    value: unknown,
    scope?: StateScope,
    context?: { guildId?: string; channelId?: string; userId?: string }
  ): Promise<void>;
  assertNoErrors(): void;

  // State access
  getState<T>(
    name: string,
    context?: { guildId?: string; channelId?: string; userId?: string }
  ): Promise<T | undefined>;
  setState(
    name: string,
    value: unknown,
    context?: { guildId?: string; channelId?: string; userId?: string }
  ): Promise<void>;
}

/**
 * Create an E2E test runtime from a YAML spec string
 */
export async function createE2ERuntime(
  yamlSpec: string,
  options: E2ETestRuntimeOptions = {}
): Promise<E2ETestRuntime> {
  // Parse spec
  const spec = loadSpecFromString(yamlSpec, {
    validate: options.validate ?? true,
  });
  return createE2ERuntimeFromSpec(spec, options);
}

/**
 * Create an E2E test runtime from an already-parsed FurlowSpec. Use this when
 * the spec has been produced by `loadSpec()` with multi-file imports or any
 * other pre-processing that `loadSpecFromString` does not handle.
 */
export async function createE2ERuntimeFromSpec(
  parsedSpec: FurlowSpec,
  _options: E2ETestRuntimeOptions = {}
): Promise<E2ETestRuntime> {
  const spec = parsedSpec;

  // Create core components
  const evaluator = createEvaluator();
  const baseRegistry = createActionRegistry();
  const flowEngine = createFlowEngine();
  const eventRouter = createEventRouter();
  const storage = createMemoryAdapter();
  const stateManager = createStateManager(storage);

  // Create tracker
  const tracker = createActionTracker();
  const trackedRegistry = createTrackedRegistry(baseRegistry, tracker);

  // Create executor with tracked registry
  const executor = createActionExecutor(trackedRegistry, evaluator);

  // Track replies
  const replies: string[] = [];

  // Create mock Discord client and guild
  const client = new MockDiscordClient();
  const guild = new MockGuild();
  const channel = new MockChannel({ guildId: guild.id }, tracker);
  guild.channels.set(channel.id, channel);
  client.guilds.cache.set(guild.id, guild);
  client.channels.cache.set(channel.id, channel);

  // Register mock action handlers
  const registerHandler = (name: string, handler: ActionHandler): void => {
    trackedRegistry.register(handler);
  };

  // Reply handler
  registerHandler('reply', {
    name: 'reply',
    async execute(config: Action, context: ActionContext): Promise<ActionResult> {
      const content = await evaluator.interpolate((config as any).content ?? '', context);
      replies.push(content);
      tracker.recordDiscordCall('reply', [{ content, ephemeral: (config as any).ephemeral }]);
      return { success: true, data: { content } };
    },
  });

  // Send message handler
  registerHandler('send_message', {
    name: 'send_message',
    async execute(config: Action, context: ActionContext): Promise<ActionResult> {
      const content = await evaluator.interpolate((config as any).content ?? '', context);
      replies.push(content);
      tracker.recordDiscordCall('send_message', [{ content, channel: (config as any).channel }]);
      return { success: true, data: { content } };
    },
  });

  // Defer handler
  registerHandler('defer', {
    name: 'defer',
    async execute(config: Action, context: ActionContext): Promise<ActionResult> {
      tracker.recordDiscordCall('defer', [(config as any).ephemeral]);
      return { success: true };
    },
  });

  // Log handler
  registerHandler('log', {
    name: 'log',
    async execute(config: Action, context: ActionContext): Promise<ActionResult> {
      const message = await evaluator.interpolate((config as any).message ?? '', context);
      return { success: true, data: { message } };
    },
  });

  // Production-name state handlers. Each also accepts the legacy `name`
  // field so older test fixtures that used `set_variable { name }` keep
  // working. Besides writing through StateManager (for scope-aware
  // persistence), they mirror production by writing to `context.state[scope]
  // [key]` so expressions like `${state.global.counter}` can read the value
  // within the same action sequence.
  const readVarName = (cfg: Record<string, unknown>): string =>
    (cfg.var as string | undefined) ?? (cfg.key as string | undefined) ?? (cfg.name as string | undefined) ?? '';

  const scopedContext = (cfg: Record<string, unknown>, ctx: ActionContext) => ({
    scope: cfg.scope as string | undefined,
    guildId: ctx.guildId,
    channelId: ctx.channelId,
    userId: ctx.userId,
  });

  const writeContextState = (
    ctx: ActionContext,
    scope: string | undefined,
    key: string,
    value: unknown,
  ): void => {
    const scopeName = scope ?? 'global';
    const state = (ctx as Record<string, unknown>).state as Record<string, Record<string, unknown>> | undefined;
    if (!state) {
      (ctx as Record<string, unknown>).state = { [scopeName]: { [key]: value } };
      return;
    }
    if (!state[scopeName]) state[scopeName] = {};
    state[scopeName][key] = value;
  };

  const readContextState = (
    ctx: ActionContext,
    scope: string | undefined,
    key: string,
  ): unknown => {
    const scopeName = scope ?? 'global';
    const state = (ctx as Record<string, unknown>).state as Record<string, Record<string, unknown>> | undefined;
    return state?.[scopeName]?.[key];
  };

  // set (production) and set_variable (legacy alias)
  const setHandler: ActionHandler = {
    name: 'set',
    async execute(config: Action, context: ActionContext): Promise<ActionResult> {
      const cfg = config as unknown as Record<string, unknown>;
      const name = readVarName(cfg);
      let value = cfg.value as unknown;
      if (typeof value === 'string') {
        value = await evaluator.evaluate(value, context);
      }
      const scope = cfg.scope as string | undefined;
      try {
        await stateManager.set(name, value, scopedContext(cfg, context));
      } catch {
        // StateManager refuses if the variable is not registered. For ad hoc
        // scratch variables we still want the context.state update to happen
        // so expressions like `state.global._iterations` work within a flow.
      }
      writeContextState(context, scope, name, value);
      return { success: true, data: { name, value } };
    },
  };
  registerHandler('set', setHandler);
  registerHandler('set_variable', { ...setHandler, name: 'set_variable' });

  // get_variable (legacy helper; no production analogue because expressions
  // read state directly via state.{scope}.var).
  registerHandler('get_variable', {
    name: 'get_variable',
    async execute(config: Action, context: ActionContext): Promise<ActionResult> {
      const cfg = config as unknown as Record<string, unknown>;
      const name = readVarName(cfg);
      const value = await stateManager.get(name, scopedContext(cfg, context));
      return { success: true, data: { name, value } };
    },
  });

  registerHandler('increment', {
    name: 'increment',
    async execute(config: Action, context: ActionContext): Promise<ActionResult> {
      const cfg = config as unknown as Record<string, unknown>;
      const name = readVarName(cfg);
      const by = (cfg.by as number | undefined) ?? 1;
      const scope = cfg.scope as string | undefined;
      let newValue: number;
      try {
        newValue = await stateManager.increment(name, by, scopedContext(cfg, context));
      } catch {
        const current = (readContextState(context, scope, name) as number) ?? 0;
        newValue = current + by;
      }
      writeContextState(context, scope, name, newValue);
      return { success: true, data: { name, value: newValue } };
    },
  });

  registerHandler('decrement', {
    name: 'decrement',
    async execute(config: Action, context: ActionContext): Promise<ActionResult> {
      const cfg = config as unknown as Record<string, unknown>;
      const name = readVarName(cfg);
      const by = (cfg.by as number | undefined) ?? 1;
      const scope = cfg.scope as string | undefined;
      let newValue: number;
      try {
        newValue = await stateManager.decrement(name, by, scopedContext(cfg, context));
      } catch {
        const current = (readContextState(context, scope, name) as number) ?? 0;
        newValue = current - by;
      }
      writeContextState(context, scope, name, newValue);
      return { success: true, data: { name, value: newValue } };
    },
  });

  // list_push / list_remove / set_map / delete_map round out the production
  // state handler surface. The real StateManager from @furlow/core exposes
  // these primitives; here we call them through.
  registerHandler('list_push', {
    name: 'list_push',
    async execute(config: Action, context: ActionContext): Promise<ActionResult> {
      const cfg = config as unknown as Record<string, unknown>;
      const name = readVarName(cfg);
      const ctx = scopedContext(cfg, context);
      const current = ((await stateManager.get(name, ctx)) as unknown[] | undefined) ?? [];
      let value = cfg.value as unknown;
      if (typeof value === 'string') value = await evaluator.evaluate(value, context);
      const next = [...current, value];
      await stateManager.set(name, next, ctx);
      return { success: true, data: { name, length: next.length } };
    },
  });

  registerHandler('list_remove', {
    name: 'list_remove',
    async execute(config: Action, context: ActionContext): Promise<ActionResult> {
      const cfg = config as unknown as Record<string, unknown>;
      const name = readVarName(cfg);
      const ctx = scopedContext(cfg, context);
      const current = ((await stateManager.get(name, ctx)) as unknown[] | undefined) ?? [];
      let value = cfg.value as unknown;
      if (typeof value === 'string') value = await evaluator.evaluate(value, context);
      const next = current.filter((v) => v !== value);
      await stateManager.set(name, next, ctx);
      return { success: true, data: { name, length: next.length } };
    },
  });

  registerHandler('set_map', {
    name: 'set_map',
    async execute(config: Action, context: ActionContext): Promise<ActionResult> {
      const cfg = config as unknown as Record<string, unknown>;
      const name = readVarName(cfg);
      const ctx = scopedContext(cfg, context);
      const current = ((await stateManager.get(name, ctx)) as Record<string, unknown> | undefined) ?? {};
      const key = await evaluator.interpolate(String(cfg.key ?? ''), context);
      let value = cfg.value as unknown;
      if (typeof value === 'string') value = await evaluator.evaluate(value, context);
      const next = { ...current, [key]: value };
      await stateManager.set(name, next, ctx);
      return { success: true, data: { name, key, value } };
    },
  });

  registerHandler('delete_map', {
    name: 'delete_map',
    async execute(config: Action, context: ActionContext): Promise<ActionResult> {
      const cfg = config as unknown as Record<string, unknown>;
      const name = readVarName(cfg);
      const ctx = scopedContext(cfg, context);
      const current = ((await stateManager.get(name, ctx)) as Record<string, unknown> | undefined) ?? {};
      const key = await evaluator.interpolate(String(cfg.key ?? ''), context);
      const next = { ...current };
      delete next[key];
      await stateManager.set(name, next, ctx);
      return { success: true, data: { name, key } };
    },
  });

  // call_flow: dispatch a spec-defined flow from anywhere (events,
  // component handlers, other flows).
  registerHandler('call_flow', {
    name: 'call_flow',
    async execute(config: Action, context: ActionContext): Promise<ActionResult> {
      const cfg = config as unknown as Record<string, unknown>;
      const flowName = cfg.flow as string | undefined;
      if (!flowName) return { success: false, error: new Error('call_flow: flow name required') };
      const args: Record<string, unknown> = {};
      if (cfg.args && typeof cfg.args === 'object') {
        for (const [k, v] of Object.entries(cfg.args as Record<string, unknown>)) {
          args[k] = typeof v === 'string' ? await evaluator.evaluate(v, context) : v;
        }
      }
      try {
        const result = await flowEngine.execute(flowName, args, context, executor, evaluator);
        return {
          success: result.success,
          data: result.value,
          error: result.error,
        };
      } catch (err) {
        return { success: false, error: err as Error };
      }
    },
  });

  // emit: route through the core event router so listeners in the spec fire.
  registerHandler('emit', {
    name: 'emit',
    async execute(config: Action, context: ActionContext): Promise<ActionResult> {
      const cfg = config as unknown as Record<string, unknown>;
      const eventName = cfg.event as string | undefined;
      if (!eventName) return { success: false, error: new Error('emit: event name required') };
      const data: Record<string, unknown> = {};
      if (cfg.data && typeof cfg.data === 'object') {
        for (const [k, v] of Object.entries(cfg.data as Record<string, unknown>)) {
          data[k] = typeof v === 'string' ? await evaluator.evaluate(v, context) : v;
        }
      }
      await eventRouter.emit(eventName, { ...context, ...data }, executor, evaluator);
      return { success: true, data: { event: eventName } };
    },
  });

  // Table insert handler
  registerHandler('insert', {
    name: 'insert',
    async execute(config: Action, context: ActionContext): Promise<ActionResult> {
      const table = (config as any).table;
      const data = (config as any).data;
      await stateManager.insert(table, data);
      return { success: true };
    },
  });

  // Table update handler
  registerHandler('update', {
    name: 'update',
    async execute(config: Action, context: ActionContext): Promise<ActionResult> {
      const table = (config as any).table;
      const where = (config as any).where;
      const data = (config as any).data;
      const count = await stateManager.update(table, where, data);
      return { success: true, data: { updated: count } };
    },
  });

  // Table delete handler
  registerHandler('delete_rows', {
    name: 'delete_rows',
    async execute(config: Action, context: ActionContext): Promise<ActionResult> {
      const table = (config as any).table;
      const where = (config as any).where;
      const count = await stateManager.deleteRows(table, where);
      return { success: true, data: { deleted: count } };
    },
  });

  // Query handler
  registerHandler('query', {
    name: 'query',
    async execute(config: Action, context: ActionContext): Promise<ActionResult> {
      const table = (config as any).table;
      const options = {
        where: (config as any).where,
        select: (config as any).select,
        orderBy: (config as any).orderBy,
        limit: (config as any).limit,
        offset: (config as any).offset,
      };
      const results = await stateManager.query(table, options);
      return { success: true, data: { results } };
    },
  });

  // Role management handlers
  registerHandler('assign_role', {
    name: 'assign_role',
    async execute(config: Action, context: ActionContext): Promise<ActionResult> {
      tracker.recordDiscordCall('assign_role', [(config as any).role, (config as any).user]);
      return { success: true };
    },
  });

  registerHandler('remove_role', {
    name: 'remove_role',
    async execute(config: Action, context: ActionContext): Promise<ActionResult> {
      tracker.recordDiscordCall('remove_role', [(config as any).role, (config as any).user]);
      return { success: true };
    },
  });

  // Moderation handlers
  registerHandler('ban', {
    name: 'ban',
    async execute(config: Action, context: ActionContext): Promise<ActionResult> {
      tracker.recordDiscordCall('ban', [(config as any).user, (config as any).reason]);
      return { success: true };
    },
  });

  registerHandler('kick', {
    name: 'kick',
    async execute(config: Action, context: ActionContext): Promise<ActionResult> {
      tracker.recordDiscordCall('kick', [(config as any).user, (config as any).reason]);
      return { success: true };
    },
  });

  registerHandler('timeout', {
    name: 'timeout',
    async execute(config: Action, context: ActionContext): Promise<ActionResult> {
      tracker.recordDiscordCall('timeout', [
        (config as any).user,
        (config as any).duration,
        (config as any).reason,
      ]);
      return { success: true };
    },
  });

  // React handler
  registerHandler('react', {
    name: 'react',
    async execute(config: Action, context: ActionContext): Promise<ActionResult> {
      tracker.recordDiscordCall('react', [(config as any).emoji]);
      return { success: true };
    },
  });

  // Delete message handler
  registerHandler('delete_message', {
    name: 'delete_message',
    async execute(config: Action, context: ActionContext): Promise<ActionResult> {
      tracker.recordDiscordCall('delete_message', [(config as any).message_id]);
      return { success: true };
    },
  });

  // Wait handler
  registerHandler('wait', {
    name: 'wait',
    async execute(config: Action): Promise<ActionResult> {
      const duration = (config as any).duration;
      const ms = typeof duration === 'number' ? duration : parseDuration(duration);
      // For tests, we don't actually wait - just record
      return { success: true, data: { waited: ms } };
    },
  });

  // Error handler (for testing error scenarios)
  registerHandler('throw_error', {
    name: 'throw_error',
    async execute(config: Action): Promise<ActionResult> {
      const message = (config as any).message ?? 'Test error';
      return { success: false, error: new Error(message) };
    },
  });

  // Flow control handlers. Production registers these via registerCoreHandlers
  // with full _deps wiring. The E2E runtime needs them at the top level of
  // event handler action lists (where ActionExecutor dispatches via the
  // registry, not FlowEngine.executeActions). These stubs cover the surface
  // used by builtins so handlers run end-to-end instead of throwing
  // ActionNotFoundError after the first registered action.
  const runNested = async (
    actions: unknown,
    context: ActionContext
  ): Promise<ActionResult[]> => {
    if (!Array.isArray(actions) || actions.length === 0) return [];
    return executor.executeSequence(actions as Action[], context);
  };

  registerHandler('flow_if', {
    name: 'flow_if',
    async execute(config: Action, context: ActionContext): Promise<ActionResult> {
      const cfg = config as unknown as Record<string, unknown>;
      const conditionRaw = (cfg.condition ?? cfg.if) as string | undefined;
      let cond = false;
      if (conditionRaw) {
        try {
          cond = Boolean(await evaluator.evaluate(conditionRaw, context));
        } catch {
          cond = false;
        }
      }
      const branch = cond ? cfg.then : cfg.else;
      await runNested(branch, context);
      return { success: true, data: { condition: cond } };
    },
  });

  registerHandler('flow_switch', {
    name: 'flow_switch',
    async execute(config: Action, context: ActionContext): Promise<ActionResult> {
      const cfg = config as unknown as Record<string, unknown>;
      const value = await evaluator.evaluate(String(cfg.value ?? ''), context);
      const cases = (cfg.cases ?? {}) as Record<string, unknown>;
      const matched = cases[String(value)] ?? cfg.default;
      await runNested(matched, context);
      return { success: true, data: { value } };
    },
  });

  registerHandler('flow_while', {
    name: 'flow_while',
    async execute(config: Action, context: ActionContext): Promise<ActionResult> {
      const cfg = config as unknown as Record<string, unknown>;
      const conditionRaw = (cfg.condition ?? cfg.while) as string | undefined;
      const max = typeof cfg.max === 'number' ? cfg.max : 100;
      let iterations = 0;
      while (iterations < max) {
        let cond = false;
        try {
          cond = Boolean(await evaluator.evaluate(String(conditionRaw ?? 'false'), context));
        } catch {
          cond = false;
        }
        if (!cond) break;
        await runNested(cfg.do ?? cfg.actions, context);
        iterations++;
      }
      return { success: true, data: { iterations } };
    },
  });

  registerHandler('repeat', {
    name: 'repeat',
    async execute(config: Action, context: ActionContext): Promise<ActionResult> {
      const cfg = config as unknown as Record<string, unknown>;
      const timesRaw = cfg.times;
      const times = typeof timesRaw === 'number'
        ? timesRaw
        : Number(await evaluator.evaluate(String(timesRaw ?? 0), context)) || 0;
      for (let i = 0; i < times; i++) {
        await runNested(cfg.do ?? cfg.actions, context);
      }
      return { success: true, data: { times } };
    },
  });

  registerHandler('parallel', {
    name: 'parallel',
    async execute(config: Action, context: ActionContext): Promise<ActionResult> {
      const cfg = config as unknown as Record<string, unknown>;
      const actions = cfg.actions;
      if (Array.isArray(actions)) {
        await Promise.all(
          (actions as Action[]).map((a) =>
            executor.executeSequence([a], context).catch(() => undefined)
          )
        );
      }
      return { success: true };
    },
  });

  registerHandler('batch', {
    name: 'batch',
    async execute(config: Action, context: ActionContext): Promise<ActionResult> {
      const cfg = config as unknown as Record<string, unknown>;
      let items: unknown[] = [];
      const itemsRaw = cfg.items;
      if (Array.isArray(itemsRaw)) {
        items = itemsRaw;
      } else if (typeof itemsRaw === 'string') {
        try {
          const evaluated = await evaluator.evaluate(itemsRaw, context);
          items = Array.isArray(evaluated) ? evaluated : [];
        } catch {
          items = [];
        }
      }
      const itemKey = (cfg.as as string) ?? 'item';
      for (const item of items) {
        const childCtx = { ...context, [itemKey]: item } as ActionContext;
        await runNested(cfg.actions ?? cfg.do, childCtx);
      }
      return { success: true, data: { count: items.length } };
    },
  });

  registerHandler('try', {
    name: 'try',
    async execute(config: Action, context: ActionContext): Promise<ActionResult> {
      const cfg = config as unknown as Record<string, unknown>;
      try {
        await runNested(cfg.try ?? cfg.actions, context);
      } catch (err) {
        const errorCtx = { ...context, error: { message: (err as Error).message } } as ActionContext;
        await runNested(cfg.catch, errorCtx);
      } finally {
        if (cfg.finally) await runNested(cfg.finally, context);
      }
      return { success: true };
    },
  });

  registerHandler('abort', {
    name: 'abort',
    async execute(): Promise<ActionResult> {
      return { success: true };
    },
  });

  registerHandler('return', {
    name: 'return',
    async execute(): Promise<ActionResult> {
      return { success: true };
    },
  });

  // Stub handlers for the remaining production actions. These let E2E tests
  // exercise specs that use the full 85-action surface without every test
  // needing to register its own mocks. Each stub records a tracker entry
  // (so assertions can verify the action ran with its config) and returns
  // `{ success: true }`. Tests that need realistic behavior (state
  // manipulation, etc.) still have the production-name handlers registered
  // above (`set`, `increment`, `list_push`, `set_map`, `delete_map`,
  // `emit`, `call_flow`, and table primitives).
  const STUB_ACTIONS = [
    // Message
    'edit_message',
    'update_message',
    'bulk_delete',
    'add_reaction',
    'add_reactions',
    'remove_reaction',
    'clear_reactions',
    // Member
    'toggle_role',
    'server_mute',
    'server_deafen',
    'disconnect_member',
    'set_nickname',
    'move_member',
    'remove_timeout',
    'send_dm',
    // Channel / role
    'create_channel',
    'edit_channel',
    'delete_channel',
    'set_channel_permissions',
    'create_thread',
    'archive_thread',
    'create_role',
    'edit_role',
    'delete_role',
    // Component
    'show_modal',
    // Voice
    'voice_join',
    'voice_leave',
    'voice_play',
    'voice_pause',
    'voice_resume',
    'voice_stop',
    'voice_skip',
    'voice_seek',
    'voice_volume',
    'voice_set_filter',
    'voice_search',
    'queue_get',
    'queue_add',
    'queue_remove',
    'queue_clear',
    'queue_shuffle',
    'queue_loop',
    // Database pipe-style actions (real state handlers above cover `insert`,
    // `update`, `delete_rows`, `query`).
    'db_insert',
    'db_update',
    'db_delete',
    'db_query',
    // Integration
    'pipe_request',
    'pipe_send',
    'webhook_send',
    'create_timer',
    'cancel_timer',
    'counter_increment',
    'record_metric',
    'canvas_render',
    'render_layers',
  ];

  for (const name of STUB_ACTIONS) {
    registerHandler(name, {
      name,
      async execute(config: Action): Promise<ActionResult> {
        tracker.recordDiscordCall(name, [config]);
        return { success: true };
      },
    });
  }

  // Helper function to create action context
  function createContext(
    eventData: {
      user?: MockUser;
      member?: MockMember;
      message?: MockMessage;
      interaction?: unknown;
      args?: Record<string, unknown>;
    } = {}
  ): ActionContext {
    const user = eventData.user ?? new MockUser();
    const member = eventData.member ?? new MockMember(user, guild);

    return {
      now: new Date(),
      random: Math.random(),
      user: {
        id: user.id,
        username: user.username,
        discriminator: user.discriminator,
        tag: user.tag,
        avatar: user.avatar,
        bot: user.bot,
        created_at: user.createdAt,
        mention: `<@${user.id}>`,
      },
      member: {
        id: member.id,
        username: member.user.username,
        display_name: member.displayName,
        nickname: member.nickname,
        joined_at: member.joinedAt,
        roles: member.roles.ids,
        permissions: member.permissions.toArray(),
      },
      guild: {
        id: guild.id,
        name: guild.name,
        owner_id: guild.ownerId,
        member_count: guild.memberCount,
      },
      channel: {
        id: channel.id,
        name: channel.name,
        type: 'text',
        mention: `<#${channel.id}>`,
      },
      message: eventData.message
        ? {
            id: eventData.message.id,
            content: eventData.message.content,
            author: {
              id: eventData.message.author.id,
              username: eventData.message.author.username,
              bot: eventData.message.author.bot,
            },
          }
        : undefined,
      args: eventData.args ?? {},
      interaction: eventData.interaction,
      guildId: guild.id,
      channelId: channel.id,
      userId: user.id,
      client,
      stateManager,
      evaluator,
      flowExecutor: flowEngine,
    } as ActionContext;
  }

  // Map event names
  function mapEventName(event: string): string {
    const map: Record<string, string> = {
      ready: 'ready',
      message_create: 'messageCreate',
      message: 'messageCreate',
      guild_member_add: 'guildMemberAdd',
      guild_member_remove: 'guildMemberRemove',
      member_join: 'guildMemberAdd',
      member_leave: 'guildMemberRemove',
      interaction_create: 'interactionCreate',
      reaction_add: 'messageReactionAdd',
      reaction_remove: 'messageReactionRemove',
    };
    return map[event] ?? event;
  }

  // Runtime implementation
  const runtime: E2ETestRuntime = {
    spec,
    tracker,

    async start(): Promise<void> {
      // Login client
      await client.login('test-token');

      // Register state variables if defined
      if (spec.state?.variables) {
        stateManager.registerVariables(spec.state.variables);
      }

      // Register tables if defined
      if (spec.state?.tables) {
        await stateManager.registerTables(spec.state.tables);
      }

      // Register flows
      if (spec.flows) {
        flowEngine.registerAll(spec.flows);
      }

      // Set up event handlers from spec
      if (spec.events) {
        for (const handler of spec.events) {
          eventRouter.register(handler);
        }
      }

      // Set up Discord event listeners
      client.on('messageCreate', async (message: MockMessage) => {
        const context = createContext({ user: message.author, message });
        await eventRouter.emit('message_create', context, executor, evaluator);
      });

      client.on('guildMemberAdd', async (member: MockMember) => {
        const context = createContext({ user: member.user, member });
        await eventRouter.emit('member_join', context, executor, evaluator);
        await eventRouter.emit('guild_member_add', context, executor, evaluator);
      });

      client.on('guildMemberRemove', async (member: MockMember) => {
        const context = createContext({ user: member.user, member });
        await eventRouter.emit('member_leave', context, executor, evaluator);
        await eventRouter.emit('guild_member_remove', context, executor, evaluator);
      });

      client.on('messageReactionAdd', async (reaction: MockReaction) => {
        const context = createContext({
          user: reaction.user,
          message: reaction.message,
        });
        (context as any).reaction = {
          emoji: reaction.emoji.name,
          emojiId: reaction.emoji.id,
        };
        await eventRouter.emit('reaction_add', context, executor, evaluator);
      });

      client.on('messageReactionRemove', async (reaction: MockReaction) => {
        const context = createContext({
          user: reaction.user,
          message: reaction.message,
        });
        (context as any).reaction = {
          emoji: reaction.emoji.name,
          emojiId: reaction.emoji.id,
        };
        await eventRouter.emit('reaction_remove', context, executor, evaluator);
        await eventRouter.emit('message_reaction_remove', context, executor, evaluator);
      });

      // Emit both canonical and legacy reaction_add event names (parity with
      // production DiscordEventRouter bindings).
      client.on('messageReactionAddCanonical', async (reaction: MockReaction) => {
        const context = createContext({
          user: reaction.user,
          message: reaction.message,
        });
        (context as any).reaction = {
          emoji: reaction.emoji.name,
          emojiId: reaction.emoji.id,
        };
        await eventRouter.emit('message_reaction_add', context, executor, evaluator);
      });

      // Upgrade messageReactionAdd to also emit message_reaction_add alongside
      // the legacy reaction_add. Re-emit the same reaction event to the
      // canonical listener we just added.
      client.on('messageReactionAdd', (reaction: MockReaction) => {
        client.emit('messageReactionAddCanonical', reaction);
      });

      // === Missing Discord event wiring (parity with production BINDINGS) ===
      // Each block mirrors what @furlow/discord/events bindings do: build a
      // context appropriate to the event, then emit the canonical FURLOW
      // event through the core EventRouter.

      // Message events
      client.on('messageUpdate', async (oldMessage: MockMessage, newMessage: MockMessage) => {
        const context = createContext({ user: newMessage.author, message: newMessage });
        (context as any).old_message = oldMessage;
        await eventRouter.emit('message_update', context, executor, evaluator);
      });

      client.on('messageDelete', async (message: MockMessage) => {
        const context = createContext({ user: message.author, message });
        await eventRouter.emit('message_delete', context, executor, evaluator);
      });

      client.on('messageDeleteBulk', async (messages: unknown, channel: unknown) => {
        const context = createContext();
        const asArray = messages instanceof Map ? Array.from(messages.values()) : [];
        (context as any).messages = asArray;
        (context as any).message_count = asArray.length;
        if (channel) (context as any).channel = channel;
        await eventRouter.emit('message_delete_bulk', context, executor, evaluator);
      });

      client.on('messageReactionRemoveAll', async (message: MockMessage) => {
        const context = createContext({ user: message.author, message });
        await eventRouter.emit('message_reaction_remove_all', context, executor, evaluator);
      });

      // Member events
      client.on('guildMemberUpdate', async (oldMember: MockMember, newMember: MockMember) => {
        const context = createContext({ user: newMember.user, member: newMember });
        (context as any).old_member = oldMember;
        await eventRouter.emit('member_update', context, executor, evaluator);

        // Derived boost / unboost transitions, matching production bindings.
        const wasBooster = Boolean((oldMember as any).premiumSince);
        const isBooster = Boolean((newMember as any).premiumSince);
        if (!wasBooster && isBooster) {
          (context as any).boost_since = (newMember as any).premiumSince;
          await eventRouter.emit('member_boost', context, executor, evaluator);
        } else if (wasBooster && !isBooster) {
          (context as any).boost_ended = (oldMember as any).premiumSince;
          await eventRouter.emit('member_unboost', context, executor, evaluator);
        }
      });

      client.on('guildBanAdd', async (ban: { user: MockUser; guild: MockGuild; reason?: string }) => {
        const context = createContext({ user: ban.user });
        (context as any).guild = ban.guild;
        (context as any).guildId = ban.guild?.id;
        (context as any).reason = ban.reason;
        await eventRouter.emit('member_ban', context, executor, evaluator);
      });

      client.on('guildBanRemove', async (ban: { user: MockUser; guild: MockGuild }) => {
        const context = createContext({ user: ban.user });
        (context as any).guild = ban.guild;
        (context as any).guildId = ban.guild?.id;
        await eventRouter.emit('member_unban', context, executor, evaluator);
      });

      // Guild events
      client.on('guildCreate', async (targetGuild: MockGuild) => {
        const context = createContext();
        (context as any).guild = targetGuild;
        (context as any).guildId = targetGuild?.id;
        await eventRouter.emit('guild_create', context, executor, evaluator);
      });

      client.on('guildDelete', async (targetGuild: MockGuild) => {
        const context = createContext();
        (context as any).guild = targetGuild;
        (context as any).guildId = targetGuild?.id;
        await eventRouter.emit('guild_delete', context, executor, evaluator);
      });

      client.on('guildUpdate', async (oldGuild: MockGuild, newGuild: MockGuild) => {
        const context = createContext();
        (context as any).guild = newGuild;
        (context as any).old_guild = oldGuild;
        (context as any).guildId = newGuild?.id;
        await eventRouter.emit('guild_update', context, executor, evaluator);
      });

      // Channel events
      const emitChannelEvent = async (name: string, channelArg: unknown, oldChannelArg?: unknown) => {
        const context = createContext();
        (context as any).channel = channelArg;
        (context as any).channelId = (channelArg as { id?: string })?.id;
        if (oldChannelArg) (context as any).old_channel = oldChannelArg;
        await eventRouter.emit(name, context, executor, evaluator);
      };
      client.on('channelCreate', (ch: unknown) => emitChannelEvent('channel_create', ch));
      client.on('channelDelete', (ch: unknown) => emitChannelEvent('channel_delete', ch));
      client.on('channelUpdate', (oldCh: unknown, newCh: unknown) => emitChannelEvent('channel_update', newCh, oldCh));
      client.on('channelPinsUpdate', (ch: unknown, date: unknown) => {
        const context = createContext();
        (context as any).channel = ch;
        (context as any).channelId = (ch as { id?: string })?.id;
        (context as any).pins_updated_at = date;
        void eventRouter.emit('channel_pins_update', context, executor, evaluator);
      });

      // Thread events
      const emitThreadEvent = async (name: string, thread: unknown, oldThread?: unknown) => {
        const context = createContext();
        (context as any).thread = thread;
        (context as any).channel = thread;
        (context as any).channelId = (thread as { id?: string })?.id;
        if (oldThread) (context as any).old_thread = oldThread;
        await eventRouter.emit(name, context, executor, evaluator);
      };
      client.on('threadCreate', (t: unknown) => emitThreadEvent('thread_create', t));
      client.on('threadDelete', (t: unknown) => emitThreadEvent('thread_delete', t));
      client.on('threadUpdate', (oldT: unknown, newT: unknown) => emitThreadEvent('thread_update', newT, oldT));
      client.on('threadMemberUpdate', async (oldTM: unknown, newTM: unknown) => {
        const context = createContext();
        (context as any).old_thread_member = oldTM;
        (context as any).new_thread_member = newTM;
        await eventRouter.emit('thread_member_update', context, executor, evaluator);
      });

      // Role events
      const emitRoleEvent = async (name: string, role: unknown, oldRole?: unknown) => {
        const context = createContext();
        (context as any).role = role;
        if (oldRole) (context as any).old_role = oldRole;
        await eventRouter.emit(name, context, executor, evaluator);
      };
      client.on('roleCreate', (r: unknown) => emitRoleEvent('role_create', r));
      client.on('roleDelete', (r: unknown) => emitRoleEvent('role_delete', r));
      client.on('roleUpdate', (oldR: unknown, newR: unknown) => emitRoleEvent('role_update', newR, oldR));

      // Emoji events
      const emitEmojiEvent = async (name: string, emoji: unknown, oldEmoji?: unknown) => {
        const context = createContext();
        (context as any).emoji = emoji;
        if (oldEmoji) (context as any).old_emoji = oldEmoji;
        await eventRouter.emit(name, context, executor, evaluator);
      };
      client.on('emojiCreate', (e: unknown) => emitEmojiEvent('emoji_create', e));
      client.on('emojiDelete', (e: unknown) => emitEmojiEvent('emoji_delete', e));
      client.on('emojiUpdate', (oldE: unknown, newE: unknown) => emitEmojiEvent('emoji_update', newE, oldE));

      // Sticker events
      const emitStickerEvent = async (name: string, sticker: unknown, oldSticker?: unknown) => {
        const context = createContext();
        (context as any).sticker = sticker;
        if (oldSticker) (context as any).old_sticker = oldSticker;
        await eventRouter.emit(name, context, executor, evaluator);
      };
      client.on('stickerCreate', (s: unknown) => emitStickerEvent('sticker_create', s));
      client.on('stickerDelete', (s: unknown) => emitStickerEvent('sticker_delete', s));
      client.on('stickerUpdate', (oldS: unknown, newS: unknown) => emitStickerEvent('sticker_update', newS, oldS));

      // Invite events
      const emitInviteEvent = async (name: string, invite: unknown) => {
        const context = createContext();
        (context as any).invite = invite;
        await eventRouter.emit(name, context, executor, evaluator);
      };
      client.on('inviteCreate', (i: unknown) => emitInviteEvent('invite_create', i));
      client.on('inviteDelete', (i: unknown) => emitInviteEvent('invite_delete', i));

      // Voice events - voiceStateUpdate derives voice_join/leave/move/stream_*.
      client.on('voiceStateUpdate', async (oldState: unknown, newState: unknown) => {
        const oldChannel = (oldState as { channel?: unknown; streaming?: boolean })?.channel;
        const newChannel = (newState as { channel?: unknown; streaming?: boolean })?.channel;
        const wasStreaming = (oldState as { streaming?: boolean })?.streaming;
        const isStreaming = (newState as { streaming?: boolean })?.streaming;
        const member = (newState as { member?: MockMember })?.member;
        const context = createContext({ user: member?.user, member });
        (context as any).old_voice_state = oldState;
        (context as any).new_voice_state = newState;

        if (!oldChannel && newChannel) {
          await eventRouter.emit('voice_join', context, executor, evaluator);
        } else if (oldChannel && !newChannel) {
          await eventRouter.emit('voice_leave', context, executor, evaluator);
        } else if ((oldChannel as { id?: string })?.id !== (newChannel as { id?: string })?.id) {
          await eventRouter.emit('voice_move', context, executor, evaluator);
        }

        if (!wasStreaming && isStreaming) {
          (context as any).streaming = true;
          (context as any).voice_channel = newChannel;
          await eventRouter.emit('voice_stream_start', context, executor, evaluator);
        } else if (wasStreaming && !isStreaming) {
          (context as any).streaming = false;
          await eventRouter.emit('voice_stream_stop', context, executor, evaluator);
        }

        await eventRouter.emit('voice_state_update', context, executor, evaluator);
      });

      // Presence / typing
      client.on('presenceUpdate', async (oldPresence: unknown, newPresence: unknown) => {
        if (!newPresence) return;
        const context = createContext();
        (context as any).presence = newPresence;
        (context as any).old_presence = oldPresence;
        const user = (newPresence as { user?: MockUser })?.user;
        if (user) {
          (context as any).user = user;
          (context as any).userId = user.id;
        }
        await eventRouter.emit('presence_update', context, executor, evaluator);
      });

      client.on('typingStart', async (typing: { user?: MockUser; channel?: unknown; guild?: MockGuild }) => {
        const context = createContext({ user: typing.user });
        if (typing.channel) (context as any).channel = typing.channel;
        if (typing.guild) (context as any).guild = typing.guild;
        await eventRouter.emit('typing_start', context, executor, evaluator);
      });

      // Scheduled events
      const emitScheduledEvent = async (name: string, event: unknown, extra?: unknown) => {
        const context = createContext();
        (context as any).scheduled_event = event;
        if (extra) Object.assign(context as Record<string, unknown>, extra);
        await eventRouter.emit(name, context, executor, evaluator);
      };
      client.on('guildScheduledEventCreate', (e: unknown) => emitScheduledEvent('scheduled_event_create', e));
      client.on('guildScheduledEventDelete', (e: unknown) => emitScheduledEvent('scheduled_event_delete', e));
      client.on('guildScheduledEventUpdate', (oldE: unknown, newE: unknown) => emitScheduledEvent('scheduled_event_update', newE, { old_scheduled_event: oldE }));
      client.on('guildScheduledEventUserAdd', (e: unknown, user: MockUser) => emitScheduledEvent('scheduled_event_user_add', e, { user, userId: user?.id }));
      client.on('guildScheduledEventUserRemove', (e: unknown, user: MockUser) => emitScheduledEvent('scheduled_event_user_remove', e, { user, userId: user?.id }));

      // Stage instances
      const emitStageEvent = async (name: string, stage: unknown, oldStage?: unknown) => {
        const context = createContext();
        (context as any).stage_instance = stage;
        if (oldStage) (context as any).old_stage_instance = oldStage;
        await eventRouter.emit(name, context, executor, evaluator);
      };
      client.on('stageInstanceCreate', (s: unknown) => emitStageEvent('stage_instance_create', s));
      client.on('stageInstanceDelete', (s: unknown) => emitStageEvent('stage_instance_delete', s));
      client.on('stageInstanceUpdate', (oldS: unknown, newS: unknown) => emitStageEvent('stage_instance_update', newS, oldS));

      // Shard lifecycle
      client.on('shardReady', async (shardId: number, unavailableGuilds?: Set<string>) => {
        const context = createContext();
        (context as any).shard_id = shardId;
        (context as any).unavailable_guilds = unavailableGuilds ? Array.from(unavailableGuilds) : [];
        await eventRouter.emit('shard_ready', context, executor, evaluator);
      });
      client.on('shardDisconnect', async (closeEvent: { code?: number; reason?: string }, shardId: number) => {
        const context = createContext();
        (context as any).shard_id = shardId;
        (context as any).close_code = closeEvent?.code;
        (context as any).close_reason = closeEvent?.reason;
        await eventRouter.emit('shard_disconnect', context, executor, evaluator);
      });
      client.on('shardError', async (error: Error, shardId: number) => {
        const context = createContext();
        (context as any).shard_id = shardId;
        (context as any).error = { message: error?.message, name: error?.name };
        await eventRouter.emit('shard_error', context, executor, evaluator);
      });

      // Handle command interactions
      client.on('interactionCreate', async (interaction: unknown) => {
        if (interaction instanceof MockCommandInteraction) {
          const command = spec.commands?.find((c) => c.name === interaction.commandName);
          if (command && command.actions) {
            const args: Record<string, unknown> = {};
            for (const [key, value] of interaction.options) {
              args[key] = value;
            }
            const context = createContext({
              user: interaction.user,
              member: interaction.member,
              interaction,
              args,
            });
            // Use FlowEngine for action execution to support flow control actions
            // Register an internal flow for this command if not already registered
            const internalFlowName = `__command_${command.name}`;
            if (!flowEngine.has(internalFlowName)) {
              // Convert command options to flow parameters
              type ParamType = 'string' | 'number' | 'boolean' | 'object' | 'array' | 'any';
              const mapType = (t: string): ParamType => {
                if (t === 'integer') return 'number';
                if (t === 'user' || t === 'channel' || t === 'role' || t === 'mentionable' || t === 'attachment') return 'object';
                if (t === 'string' || t === 'number' || t === 'boolean') return t;
                return 'any';
              };
              const parameters = command.options?.map((opt) => ({
                name: opt.name,
                type: mapType(opt.type),
                required: opt.required ?? false,
              })) ?? [];
              flowEngine.register({
                name: internalFlowName,
                parameters,
                actions: command.actions,
              });
            }
            await flowEngine.execute(internalFlowName, args, context, executor, evaluator);
          }
        }

        // Handle button interactions
        if (interaction instanceof MockButtonInteraction) {
          const buttonHandler = spec.components?.buttons?.[interaction.customId];
          if (buttonHandler?.actions) {
            const context = createContext({
              user: interaction.user,
              member: interaction.member,
              interaction,
            });
            (context as Record<string, unknown>).custom_id = interaction.customId;
            (context as Record<string, unknown>).customId = interaction.customId;
            (context as Record<string, unknown>).component_type = 'button';
            // Use FlowEngine for action execution
            const internalFlowName = `__button_${interaction.customId}`;
            if (!flowEngine.has(internalFlowName)) {
              flowEngine.register({
                name: internalFlowName,
                actions: buttonHandler.actions,
              });
            }
            await flowEngine.execute(internalFlowName, {}, context, executor, evaluator);
          }
        }

        // Handle select menu interactions
        if (interaction instanceof MockSelectMenuInteraction) {
          const selectHandler = spec.components?.selects?.[interaction.customId];
          if (selectHandler?.actions) {
            const context = createContext({
              user: interaction.user,
              member: interaction.member,
              interaction,
              args: { values: interaction.values },
            });
            // Mirror production behavior: expose selected values at the top
            // level of the context so specs can reference `${values}`.
            (context as Record<string, unknown>).values = interaction.values;
            (context as Record<string, unknown>).selected = interaction.values;
            (context as Record<string, unknown>).custom_id = interaction.customId;
            (context as Record<string, unknown>).customId = interaction.customId;
            (context as Record<string, unknown>).component_type = 'select_menu';
            // Use FlowEngine for action execution
            const internalFlowName = `__select_${interaction.customId}`;
            if (!flowEngine.has(internalFlowName)) {
              flowEngine.register({
                name: internalFlowName,
                // Define values parameter so it gets passed through to the flow
                parameters: [{ name: 'values', type: 'array', required: false }],
                actions: selectHandler.actions,
              });
            }
            await flowEngine.execute(internalFlowName, { values: interaction.values }, context, executor, evaluator);
          }
        }

        // Handle modal interactions
        if (interaction instanceof MockModalSubmitInteraction) {
          const modalHandler = spec.components?.modals?.[interaction.customId];
          if (modalHandler?.actions) {
            const fields: Record<string, string> = {};
            for (const [key, value] of interaction.fields) {
              fields[key] = value;
            }
            const context = createContext({
              user: interaction.user,
              member: interaction.member,
              interaction,
              args: { fields },
            });
            // Mirror production: modal submissions surface `fields` and
            // `modal_values` directly on the context.
            (context as Record<string, unknown>).fields = fields;
            (context as Record<string, unknown>).modal_values = fields;
            (context as Record<string, unknown>).custom_id = interaction.customId;
            (context as Record<string, unknown>).customId = interaction.customId;
            (context as Record<string, unknown>).component_type = 'modal';
            // Use FlowEngine for action execution
            const internalFlowName = `__modal_${interaction.customId}`;
            if (!flowEngine.has(internalFlowName)) {
              flowEngine.register({
                name: internalFlowName,
                actions: modalHandler.actions,
              });
            }
            await flowEngine.execute(internalFlowName, { fields }, context, executor, evaluator);
          }
        }
      });

      // Emit ready event
      const readyHandler = spec.events?.find((e) => e.event === 'ready');
      if (readyHandler) {
        const context = createContext();
        await executor.executeSequence(readyHandler.actions, context);
      }
    },

    async stop(): Promise<void> {
      await client.destroy();
      await stateManager.close();
      eventRouter.clear();
    },

    // Simulation methods
    async simulateCommand(
      name: string,
      options: Record<string, unknown> = {},
      user?: Partial<MockUser>
    ): Promise<MockCommandInteraction> {
      const interaction = new MockCommandInteraction(name, options, guild, tracker);
      if (user) {
        Object.assign(interaction.user, user);
      }
      client.emit('interactionCreate', interaction);
      await tick();
      return interaction;
    },

    async simulateMessage(
      content: string,
      options: { authorBot?: boolean } = {}
    ): Promise<MockMessage> {
      const message = new MockMessage({ content, authorBot: options.authorBot }, tracker);
      message.member = new MockMember(message.author, guild);
      client.emit('messageCreate', message);
      await tick();
      return message;
    },

    async simulateMemberJoin(memberData?: Partial<MockUser>): Promise<MockMember> {
      const user = new MockUser(memberData);
      const member = new MockMember(user, guild);
      guild.members.set(user.id, member);
      client.emit('guildMemberAdd', member);
      await tick();
      return member;
    },

    async simulateMemberLeave(memberData?: Partial<MockUser>): Promise<MockMember> {
      const user = new MockUser(memberData);
      const member = new MockMember(user, guild);
      guild.members.delete(user.id);
      client.emit('guildMemberRemove', member);
      await tick();
      return member;
    },

    async simulateButton(
      customId: string,
      user?: Partial<MockUser>
    ): Promise<MockButtonInteraction> {
      const interaction = new MockButtonInteraction(customId, guild, tracker);
      if (user) {
        Object.assign(interaction.user, user);
      }
      client.emit('interactionCreate', interaction);
      await tick();
      return interaction;
    },

    async simulateSelectMenu(
      customId: string,
      values: string[],
      user?: Partial<MockUser>
    ): Promise<MockSelectMenuInteraction> {
      const interaction = new MockSelectMenuInteraction(customId, values, guild, tracker);
      if (user) {
        Object.assign(interaction.user, user);
      }
      client.emit('interactionCreate', interaction);
      await tick();
      return interaction;
    },

    async simulateModalSubmit(
      customId: string,
      fields: Record<string, string>,
      user?: Partial<MockUser>
    ): Promise<MockModalSubmitInteraction> {
      const interaction = new MockModalSubmitInteraction(customId, fields, guild, tracker);
      if (user) {
        Object.assign(interaction.user, user);
      }
      client.emit('interactionCreate', interaction);
      await tick();
      return interaction;
    },

    async simulateReactionAdd(
      emoji: string,
      message?: MockMessage,
      user?: Partial<MockUser>
    ): Promise<MockReaction> {
      const reactionUser = new MockUser(user);
      const reactionMessage = message ?? new MockMessage({}, tracker);
      const reaction = new MockReaction(emoji, reactionUser, reactionMessage);
      client.emit('messageReactionAdd', reaction);
      await tick();
      return reaction;
    },

    async simulateReactionRemove(
      emoji: string,
      message?: MockMessage,
      user?: Partial<MockUser>
    ): Promise<MockReaction> {
      const reactionUser = new MockUser(user);
      const reactionMessage = message ?? new MockMessage({}, tracker);
      const reaction = new MockReaction(emoji, reactionUser, reactionMessage);
      client.emit('messageReactionRemove', reaction);
      await tick();
      return reaction;
    },

    // Factory methods
    createUser(data?: Partial<MockUser>): MockUser {
      return new MockUser(data);
    },

    createMember(data?: Partial<MockUser>): MockMember {
      const user = new MockUser(data);
      return new MockMember(user, guild);
    },

    // Observability
    getExecutedActions(): ActionExecutionRecord[] {
      return tracker.getExecutions();
    },

    getDiscordCalls(): DiscordApiCall[] {
      return tracker.getDiscordCalls();
    },

    getReplies(): string[] {
      return [...replies];
    },

    // Assertions
    assertActionExecuted(actionName: string, config?: Partial<Action>): void {
      const executions = tracker.getExecutionsByAction(actionName);
      if (executions.length === 0) {
        throw new Error(`Expected action "${actionName}" to be executed, but it was not`);
      }
      if (config) {
        const match = executions.some((e) => {
          for (const [key, value] of Object.entries(config)) {
            if ((e.config as any)[key] !== value) {
              return false;
            }
          }
          return true;
        });
        if (!match) {
          throw new Error(
            `Expected action "${actionName}" with config ${JSON.stringify(config)}, but no matching execution found`
          );
        }
      }
    },

    assertActionNotExecuted(actionName: string): void {
      if (tracker.wasExecuted(actionName)) {
        throw new Error(`Expected action "${actionName}" to NOT be executed, but it was`);
      }
    },

    assertActionExecutedTimes(actionName: string, times: number): void {
      const count = tracker.getExecutionCount(actionName);
      if (count !== times) {
        throw new Error(
          `Expected action "${actionName}" to be executed ${times} times, but it was executed ${count} times`
        );
      }
    },

    assertReplyContains(text: string): void {
      const found = replies.some((r) => r.includes(text));
      if (!found) {
        throw new Error(
          `Expected a reply containing "${text}", but none found. Replies: ${JSON.stringify(replies)}`
        );
      }
    },

    assertReplyEquals(text: string): void {
      const found = replies.some((r) => r === text);
      if (!found) {
        throw new Error(
          `Expected reply "${text}", but none found. Replies: ${JSON.stringify(replies)}`
        );
      }
    },

    async assertStateEquals(
      name: string,
      value: unknown,
      scope?: StateScope,
      context?: { guildId?: string; channelId?: string; userId?: string }
    ): Promise<void> {
      const ctx = context ?? {
        guildId: guild.id,
        channelId: channel.id,
        userId: '123456789012345678',
      };
      const actual = await stateManager.get(name, ctx);
      if (actual !== value) {
        throw new Error(
          `Expected state "${name}" to equal ${JSON.stringify(value)}, but got ${JSON.stringify(actual)}`
        );
      }
    },

    assertNoErrors(): void {
      const errors = tracker.getErrors();
      if (errors.length > 0) {
        const errorMessages = errors
          .map((e) => `${e.action}: ${e.result.error?.message}`)
          .join('\n');
        throw new Error(`Expected no errors, but found ${errors.length}:\n${errorMessages}`);
      }
    },

    // State access
    async getState<T>(
      name: string,
      context?: { guildId?: string; channelId?: string; userId?: string }
    ): Promise<T | undefined> {
      const ctx = context ?? {
        guildId: guild.id,
        channelId: channel.id,
        userId: '123456789012345678',
      };
      return stateManager.get<T>(name, ctx);
    },

    async setState(
      name: string,
      value: unknown,
      context?: { guildId?: string; channelId?: string; userId?: string }
    ): Promise<void> {
      const ctx = context ?? {
        guildId: guild.id,
        channelId: channel.id,
        userId: '123456789012345678',
      };
      await stateManager.set(name, value, ctx);
    },
  };

  return runtime;
}

// Helper functions
function tick(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 10));
}

function parseDuration(duration: string): number {
  const match = duration.match(/^(\d+)(ms|s|m|h)?$/);
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
    default:
      return value;
  }
}
