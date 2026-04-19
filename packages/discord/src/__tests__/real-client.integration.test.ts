/**
 * Integration test: DiscordEventRouter against an actual discord.js Client.
 *
 * The unit tests use a plain EventEmitter, which proves the routing logic but
 * not that our bindings' Discord.js event names are actually valid keys on the
 * Client. Here we construct a real `Client` (never calling `.login()`), emit
 * events on it directly, and verify that the router observes them and forwards
 * them to the core EventRouter.
 *
 * This catches:
 *   - Typos in discord.js event names (would fail silently against a generic EventEmitter).
 *   - Private-field access issues with the Proxy wrapping real Discord.js class instances.
 *   - Regressions when discord.js renames events (we would notice when the test breaks).
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { Client, GatewayIntentBits } from 'discord.js';

import {
  DiscordEventRouter,
  type ContextDependencies,
  type CoreEventRouterLike,
} from '../events/index.js';

function setupClient(): {
  client: Client;
  router: DiscordEventRouter;
  emitted: Array<{ event: string; context: Record<string, unknown> }>;
} {
  const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
  });

  const emitted: Array<{ event: string; context: Record<string, unknown> }> = [];
  const coreRouter: CoreEventRouterLike = {
    emit: vi.fn(async (event, context) => {
      emitted.push({ event, context: context as Record<string, unknown> });
    }),
  };

  const deps: ContextDependencies = {
    client,
    evaluator: {},
    stateManager: {},
    flowEngine: {},
    voiceManager: null,
    actionExecutor: {},
    eventRouter: coreRouter,
    spec: {} as ContextDependencies['spec'],
  };

  const router = new DiscordEventRouter({ client, deps, coreRouter });
  router.start();
  return { client, router, emitted };
}

describe('DiscordEventRouter with real discord.js Client', () => {
  let cleanup: (() => void) | null = null;

  afterEach(() => {
    cleanup?.();
    cleanup = null;
  });

  it('attaches listeners on the real Client and forwards ready', async () => {
    const { client, router, emitted } = setupClient();
    cleanup = () => {
      router.stop();
      client.destroy();
    };

    expect(client.listenerCount('clientReady')).toBe(1);
    expect(client.listenerCount('messageCreate')).toBe(1);
    expect(client.listenerCount('interactionCreate')).toBe(1);

    // Emit a synthetic clientReady; real Client extends EventEmitter so this works.
    client.emit('clientReady', client as Parameters<Client['emit']>[1] extends infer T ? T : never);
    await new Promise((r) => setImmediate(r));

    expect(emitted.map((e) => e.event)).toContain('ready');
  });

  it('forwards messageCreate through the real client with a minimal message payload', async () => {
    const { client, router, emitted } = setupClient();
    cleanup = () => {
      router.stop();
      client.destroy();
    };

    const message = {
      id: 'm1',
      author: { id: 'u1', username: 'alice', bot: false },
      channel: { id: 'c1' },
      guild: { id: 'g1' },
      guildId: 'g1',
      channelId: 'c1',
      attachments: new Map(),
    };
    // Cast: ClientEvents['messageCreate'] expects an OmitPartialGroupDMChannel<Message>,
    // but the runtime binding does not reach for private fields so the plain object works.
    client.emit('messageCreate', message as never);
    await new Promise((r) => setImmediate(r));

    expect(emitted.map((e) => e.event)).toContain('message_create');
    expect(emitted[0]?.context.messageId).toBe('m1');
  });

  it('stop() cleanly detaches all listeners from the real Client', () => {
    const { client, router } = setupClient();
    expect(client.listenerCount('clientReady')).toBe(1);

    router.stop();

    expect(client.listenerCount('clientReady')).toBe(0);
    expect(client.listenerCount('messageCreate')).toBe(0);
    expect(client.listenerCount('interactionCreate')).toBe(0);

    client.destroy();
  });

  it('double start() is idempotent against the real Client', () => {
    const { client, router } = setupClient();
    const firstCount = client.listenerCount('messageCreate');
    router.start();
    const secondCount = client.listenerCount('messageCreate');
    expect(secondCount).toBe(firstCount);
    router.stop();
    client.destroy();
  });
});
