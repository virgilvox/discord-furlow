/**
 * Discord client wrapper
 */

import {
  Client,
  GatewayIntentBits,
  Partials,
  type ClientOptions,
  type ClientEvents,
} from 'discord.js';
import type { FurlowSpec, IntentsConfig, GatewayConfig, Identity, Presence } from '@furlow/schema';

export interface FurlowClientOptions {
  token: string;
  spec: FurlowSpec;
}

const INTENT_MAP: Record<string, GatewayIntentBits> = {
  guilds: GatewayIntentBits.Guilds,
  guild_members: GatewayIntentBits.GuildMembers,
  guild_moderation: GatewayIntentBits.GuildModeration,
  guild_emojis_and_stickers: GatewayIntentBits.GuildEmojisAndStickers,
  guild_integrations: GatewayIntentBits.GuildIntegrations,
  guild_webhooks: GatewayIntentBits.GuildWebhooks,
  guild_invites: GatewayIntentBits.GuildInvites,
  guild_voice_states: GatewayIntentBits.GuildVoiceStates,
  guild_presences: GatewayIntentBits.GuildPresences,
  guild_messages: GatewayIntentBits.GuildMessages,
  guild_message_reactions: GatewayIntentBits.GuildMessageReactions,
  guild_message_typing: GatewayIntentBits.GuildMessageTyping,
  direct_messages: GatewayIntentBits.DirectMessages,
  direct_message_reactions: GatewayIntentBits.DirectMessageReactions,
  direct_message_typing: GatewayIntentBits.DirectMessageTyping,
  message_content: GatewayIntentBits.MessageContent,
  guild_scheduled_events: GatewayIntentBits.GuildScheduledEvents,
  auto_moderation_configuration: GatewayIntentBits.AutoModerationConfiguration,
  auto_moderation_execution: GatewayIntentBits.AutoModerationExecution,
};

export class FurlowClient {
  private client: Client;
  private token: string;
  private spec: FurlowSpec;

  constructor(options: FurlowClientOptions) {
    this.token = options.token;
    this.spec = options.spec;

    const intents = this.resolveIntents(options.spec.intents);

    const clientOptions: ClientOptions = {
      intents,
      partials: [
        Partials.Message,
        Partials.Channel,
        Partials.Reaction,
        Partials.User,
        Partials.GuildMember,
      ],
    };

    this.client = new Client(clientOptions);
  }

  /**
   * Resolve intents from spec
   */
  private resolveIntents(config?: IntentsConfig): GatewayIntentBits[] {
    if (!config) {
      // Default intents
      return [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.MessageContent,
      ];
    }

    if (config.auto) {
      // Auto-detect required intents from spec
      return this.autoDetectIntents();
    }

    if (config.explicit) {
      return config.explicit
        .map((intent) => INTENT_MAP[intent])
        .filter((i): i is GatewayIntentBits => i !== undefined);
    }

    return [GatewayIntentBits.Guilds];
  }

  /**
   * Auto-detect required intents from spec
   */
  private autoDetectIntents(): GatewayIntentBits[] {
    const intents = new Set<GatewayIntentBits>();

    // Always need Guilds
    intents.add(GatewayIntentBits.Guilds);

    // Check events
    if (this.spec.events) {
      for (const handler of this.spec.events) {
        switch (handler.event) {
          case 'message_create':
          case 'message':
          case 'message_update':
          case 'message_delete':
            intents.add(GatewayIntentBits.GuildMessages);
            intents.add(GatewayIntentBits.MessageContent);
            break;
          case 'guild_member_add':
          case 'guild_member_remove':
          case 'guild_member_update':
          case 'member_join':
          case 'member_leave':
            intents.add(GatewayIntentBits.GuildMembers);
            break;
          case 'voice_state_update':
          case 'voice_join':
          case 'voice_leave':
            intents.add(GatewayIntentBits.GuildVoiceStates);
            break;
          case 'message_reaction_add':
          case 'message_reaction_remove':
            intents.add(GatewayIntentBits.GuildMessageReactions);
            break;
          case 'presence_update':
            intents.add(GatewayIntentBits.GuildPresences);
            break;
        }
      }
    }

    // Check if commands exist
    if (this.spec.commands?.length) {
      intents.add(GatewayIntentBits.GuildMessages);
    }

    // Check if voice features are used
    if (this.spec.voice) {
      intents.add(GatewayIntentBits.GuildVoiceStates);
    }

    return [...intents];
  }

  /** Default timeout for ready event (30 seconds) */
  private static readonly READY_TIMEOUT_MS = 30000;

  /**
   * Start the client
   */
  async start(): Promise<void> {
    await this.client.login(this.token);

    // Wait for ready with timeout
    if (!this.client.isReady()) {
      await new Promise<void>((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          reject(new Error('Client ready timeout - Discord client did not become ready within 30 seconds'));
        }, FurlowClient.READY_TIMEOUT_MS);

        this.client.once('ready', () => {
          clearTimeout(timeoutId);
          resolve();
        });
      });
    }

    // Apply identity
    await this.applyIdentity();

    // Apply presence
    await this.applyPresence();
  }

  /**
   * Stop the client
   */
  async stop(): Promise<void> {
    await this.client.destroy();
  }

  /**
   * Apply bot identity
   */
  private async applyIdentity(): Promise<void> {
    if (!this.spec.identity) return;

    const identity = this.spec.identity;

    // Set username if different
    if (identity.name && this.client.user?.username !== identity.name) {
      try {
        await this.client.user?.setUsername(identity.name);
      } catch (err) {
        // Username changes are rate limited - log but don't fail startup
        console.warn('Failed to set bot username (may be rate limited):', err instanceof Error ? err.message : String(err));
      }
    }

    // Set avatar
    if (identity.avatar) {
      try {
        await this.client.user?.setAvatar(identity.avatar);
      } catch (err) {
        // Avatar might be rate limited - log but don't fail startup
        console.warn('Failed to set bot avatar (may be rate limited):', err instanceof Error ? err.message : String(err));
      }
    }
  }

  /**
   * Apply presence
   */
  private async applyPresence(): Promise<void> {
    if (!this.spec.presence) return;

    const presence = this.spec.presence;

    try {
      this.client.user?.setPresence({
        status: presence.status ?? 'online',
        activities: presence.activity
          ? [
              {
                type: this.getActivityType(presence.activity.type),
                name: presence.activity.text,
                url: presence.activity.url,
                state: presence.activity.state,
              },
            ]
          : undefined,
      });
    } catch (err) {
      console.error('Failed to set presence:', err);
    }
  }

  /**
   * Get Discord.js activity type
   */
  private getActivityType(type: string): number {
    const types: Record<string, number> = {
      playing: 0,
      streaming: 1,
      listening: 2,
      watching: 3,
      custom: 4,
      competing: 5,
    };
    return types[type] ?? 0;
  }

  /**
   * Register event listener
   */
  on<K extends keyof ClientEvents>(
    event: K,
    listener: (...args: ClientEvents[K]) => void
  ): this {
    this.client.on(event, listener);
    return this;
  }

  /**
   * Register one-time event listener
   */
  once<K extends keyof ClientEvents>(
    event: K,
    listener: (...args: ClientEvents[K]) => void
  ): this {
    this.client.once(event, listener);
    return this;
  }

  /**
   * Get the underlying Discord.js client
   */
  getClient(): Client {
    return this.client;
  }

  /**
   * Get the spec
   */
  getSpec(): FurlowSpec {
    return this.spec;
  }

  /**
   * Check if client is ready
   */
  isReady(): boolean {
    return this.client.isReady();
  }

  /**
   * Get guild count
   */
  get guildCount(): number {
    return this.client.guilds.cache.size;
  }

  /**
   * Get user count (approximate)
   */
  get userCount(): number {
    return this.client.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0);
  }
}

/**
 * Create a FURLOW client
 */
export function createClient(options: FurlowClientOptions): FurlowClient {
  return new FurlowClient(options);
}
