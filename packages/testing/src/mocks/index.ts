/**
 * Mock implementations for testing
 */

export interface MockUser {
  id: string;
  username: string;
  discriminator: string;
  tag: string;
  avatar: string | null;
  bot: boolean;
}

export interface MockMember extends MockUser {
  nickname: string | null;
  roles: string[];
  joinedAt: Date;
}

export interface MockGuild {
  id: string;
  name: string;
  ownerId: string;
  memberCount: number;
}

export interface MockChannel {
  id: string;
  name: string;
  type: string;
  guildId: string;
  parentId?: string | null;
  nsfw?: boolean;
  topic?: string | null;
  position?: number;
}

export interface MockRole {
  id: string;
  name: string;
  color: number;
  hoist: boolean;
  position: number;
  permissions: string;
  mentionable: boolean;
  guildId: string;
}

export interface MockVoiceChannel extends MockChannel {
  type: 'voice';
  bitrate: number;
  userLimit: number;
  rtcRegion: string | null;
}

export interface MockThread extends MockChannel {
  type: 'thread';
  ownerId: string;
  parentId: string;
  archived: boolean;
  locked: boolean;
  messageCount: number;
  memberCount: number;
}

export interface MockInteraction {
  id: string;
  type: number;
  guildId: string;
  channelId: string;
  userId: string;
  token: string;
  commandName?: string;
  customId?: string;
  values?: string[];
  replied: boolean;
  deferred: boolean;
}

export interface MockButton {
  customId: string;
  label: string;
  style: number;
  disabled: boolean;
  emoji?: { name: string; id?: string };
}

export interface MockSelectMenu {
  customId: string;
  placeholder?: string;
  minValues: number;
  maxValues: number;
  disabled: boolean;
  options: MockSelectOption[];
}

export interface MockSelectOption {
  label: string;
  value: string;
  description?: string;
  emoji?: { name: string; id?: string };
  default?: boolean;
}

export interface MockMessage {
  id: string;
  content: string;
  authorId: string;
  channelId: string;
  guildId: string;
  createdAt: Date;
}

/**
 * Create a mock user
 */
export function createMockUser(overrides: Partial<MockUser> = {}): MockUser {
  return {
    id: '123456789012345678',
    username: 'testuser',
    discriminator: '0001',
    tag: 'testuser#0001',
    avatar: null,
    bot: false,
    ...overrides,
  };
}

/**
 * Create a mock member
 */
export function createMockMember(overrides: Partial<MockMember> = {}): MockMember {
  return {
    ...createMockUser(),
    nickname: null,
    roles: [],
    joinedAt: new Date(),
    ...overrides,
  };
}

/**
 * Create a mock guild
 */
export function createMockGuild(overrides: Partial<MockGuild> = {}): MockGuild {
  return {
    id: '987654321098765432',
    name: 'Test Server',
    ownerId: '123456789012345678',
    memberCount: 100,
    ...overrides,
  };
}

/**
 * Create a mock channel
 */
export function createMockChannel(overrides: Partial<MockChannel> = {}): MockChannel {
  return {
    id: '111222333444555666',
    name: 'general',
    type: 'text',
    guildId: '987654321098765432',
    ...overrides,
  };
}

/**
 * Create a mock message
 */
export function createMockMessage(overrides: Partial<MockMessage> = {}): MockMessage {
  return {
    id: '999888777666555444',
    content: 'Hello, world!',
    authorId: '123456789012345678',
    channelId: '111222333444555666',
    guildId: '987654321098765432',
    createdAt: new Date(),
    ...overrides,
  };
}

/**
 * Create a mock role
 */
export function createMockRole(overrides: Partial<MockRole> = {}): MockRole {
  return {
    id: '444555666777888999',
    name: 'Test Role',
    color: 0x5865f2, // Discord blurple
    hoist: false,
    position: 1,
    permissions: '0',
    mentionable: false,
    guildId: '987654321098765432',
    ...overrides,
  };
}

/**
 * Create a mock voice channel
 */
export function createMockVoiceChannel(
  overrides: Partial<MockVoiceChannel> = {}
): MockVoiceChannel {
  return {
    id: '222333444555666777',
    name: 'General Voice',
    type: 'voice',
    guildId: '987654321098765432',
    parentId: null,
    bitrate: 64000,
    userLimit: 0,
    rtcRegion: null,
    ...overrides,
  };
}

/**
 * Create a mock thread
 */
export function createMockThread(overrides: Partial<MockThread> = {}): MockThread {
  return {
    id: '333444555666777888',
    name: 'Test Thread',
    type: 'thread',
    guildId: '987654321098765432',
    parentId: '111222333444555666',
    ownerId: '123456789012345678',
    archived: false,
    locked: false,
    messageCount: 10,
    memberCount: 3,
    ...overrides,
  };
}

/**
 * Create a mock interaction
 */
export function createMockInteraction(
  overrides: Partial<MockInteraction> = {}
): MockInteraction {
  return {
    id: '555666777888999000',
    type: 2, // APPLICATION_COMMAND
    guildId: '987654321098765432',
    channelId: '111222333444555666',
    userId: '123456789012345678',
    token: 'mock-interaction-token',
    commandName: 'test',
    replied: false,
    deferred: false,
    ...overrides,
  };
}

/**
 * Create a mock button
 */
export function createMockButton(overrides: Partial<MockButton> = {}): MockButton {
  return {
    customId: 'test-button',
    label: 'Click Me',
    style: 1, // PRIMARY
    disabled: false,
    ...overrides,
  };
}

/**
 * Create a mock select menu
 */
export function createMockSelectMenu(
  overrides: Partial<MockSelectMenu> = {}
): MockSelectMenu {
  return {
    customId: 'test-select',
    placeholder: 'Select an option',
    minValues: 1,
    maxValues: 1,
    disabled: false,
    options: [
      { label: 'Option 1', value: 'option1' },
      { label: 'Option 2', value: 'option2' },
    ],
    ...overrides,
  };
}

/**
 * Create a mock select option
 */
export function createMockSelectOption(
  overrides: Partial<MockSelectOption> = {}
): MockSelectOption {
  return {
    label: 'Option',
    value: 'option',
    ...overrides,
  };
}

/**
 * Mock Discord client for testing
 */
export class MockDiscordClient {
  public user = createMockUser({ bot: true, username: 'TestBot' });
  public guilds = new Map<string, MockGuild>();
  public channels = new Map<string, MockChannel>();
  private listeners = new Map<string, Function[]>();

  constructor() {
    // Add a default guild
    const guild = createMockGuild();
    this.guilds.set(guild.id, guild);

    // Add a default channel
    const channel = createMockChannel({ guildId: guild.id });
    this.channels.set(channel.id, channel);
  }

  on(event: string, listener: Function): this {
    const existing = this.listeners.get(event) ?? [];
    existing.push(listener);
    this.listeners.set(event, existing);
    return this;
  }

  emit(event: string, ...args: unknown[]): boolean {
    const listeners = this.listeners.get(event) ?? [];
    for (const listener of listeners) {
      listener(...args);
    }
    return listeners.length > 0;
  }

  async login(_token: string): Promise<string> {
    this.emit('ready');
    return 'mock-token';
  }

  async destroy(): Promise<void> {
    this.listeners.clear();
  }

  isReady(): boolean {
    return true;
  }
}
