/**
 * Test helpers and utilities
 */

import type { ActionContext } from '@furlow/core';
import {
  createMockUser,
  createMockMember,
  createMockGuild,
  createMockChannel,
  createMockMessage,
} from '../mocks/index.js';

// Re-export database helpers
export * from './database.js';

/**
 * Create a mock action context for testing
 */
export function createMockContext(
  overrides: Partial<ActionContext> = {}
): ActionContext {
  const user = createMockUser();
  const member = createMockMember();
  const guild = createMockGuild();
  const channel = createMockChannel();

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
      created_at: new Date(),
      mention: `<@${user.id}>`,
    },
    member: {
      id: member.id,
      username: member.username,
      discriminator: member.discriminator,
      tag: member.tag,
      avatar: member.avatar,
      bot: member.bot,
      created_at: new Date(),
      mention: `<@${member.id}>`,
      nickname: member.nickname,
      display_name: member.nickname ?? member.username,
      joined_at: member.joinedAt,
      boosting_since: null,
      is_boosting: false,
      roles: [],
      role_ids: member.roles,
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
      type: channel.type,
      mention: `<#${channel.id}>`,
    },
    guildId: guild.id,
    channelId: channel.id,
    userId: user.id,
    client: {},
    stateManager: {},
    evaluator: {},
    flowExecutor: {},
    ...overrides,
  } as ActionContext;
}

/**
 * Wait for a condition to be true
 */
export async function waitFor(
  condition: () => boolean | Promise<boolean>,
  options: { timeout?: number; interval?: number } = {}
): Promise<void> {
  const { timeout = 5000, interval = 50 } = options;
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    if (await condition()) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, interval));
  }

  throw new Error('Timeout waiting for condition');
}

/**
 * Assert that a function throws an error
 */
export async function assertThrows(
  fn: () => unknown | Promise<unknown>,
  errorType?: new (...args: any[]) => Error
): Promise<Error> {
  try {
    await fn();
    throw new Error('Expected function to throw');
  } catch (error) {
    if (error instanceof Error && error.message === 'Expected function to throw') {
      throw error;
    }
    if (errorType && !(error instanceof errorType)) {
      throw new Error(
        `Expected error of type ${errorType.name}, got ${(error as Error).constructor.name}`
      );
    }
    return error as Error;
  }
}

/**
 * Create a deferred promise for testing async flows
 */
export function createDeferred<T = void>(): {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason?: unknown) => void;
} {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;

  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
}

/**
 * Spy on a function and track calls
 */
export function createSpy<T extends (...args: any[]) => any>(
  fn?: T
): T & {
  calls: Parameters<T>[];
  returnValues: ReturnType<T>[];
  reset: () => void;
} {
  const calls: Parameters<T>[] = [];
  const returnValues: ReturnType<T>[] = [];

  const spy = ((...args: Parameters<T>) => {
    calls.push(args);
    const result = fn?.(...args);
    returnValues.push(result);
    return result;
  }) as T & {
    calls: Parameters<T>[];
    returnValues: ReturnType<T>[];
    reset: () => void;
  };

  spy.calls = calls;
  spy.returnValues = returnValues;
  spy.reset = () => {
    calls.length = 0;
    returnValues.length = 0;
  };

  return spy;
}
