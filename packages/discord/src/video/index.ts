/**
 * Video/streaming detection and notifications
 */

import type { Client, VoiceState, GuildMember, TextChannel, Role } from 'discord.js';
import type { VideoConfig } from '@furlow/schema';

export interface StreamEvent {
  type: 'start' | 'stop';
  member: GuildMember;
  channelId: string;
  guildId: string;
  timestamp: Date;
}

export interface StreamInfo {
  memberId: string;
  username: string;
  channelId: string;
  startedAt: Date;
}

export type StreamEventCallback = (event: StreamEvent) => void | Promise<void>;

export class VideoManager {
  private client: Client;
  private config: VideoConfig = {};
  private streamingMembers: Map<string, Map<string, StreamInfo>> = new Map(); // guildId -> Map<memberId, StreamInfo>
  private listeners: StreamEventCallback[] = [];
  private initialized = false;

  constructor(client: Client) {
    this.client = client;
  }

  /**
   * Configure and initialize the video manager
   */
  configure(config: VideoConfig): void {
    this.config = config;

    if (config.stream_detection && !this.initialized) {
      this.setupListener();
      this.initialized = true;
    }
  }

  /**
   * Set up voice state update listener for stream detection
   */
  private setupListener(): void {
    this.client.on('voiceStateUpdate', (oldState, newState) => {
      this.handleVoiceStateUpdate(oldState, newState).catch((err) => {
        console.error('Error handling voice state update for stream detection:', err);
      });
    });
  }

  /**
   * Handle voice state update for stream detection
   */
  private async handleVoiceStateUpdate(
    oldState: VoiceState,
    newState: VoiceState
  ): Promise<void> {
    const guildId = newState.guild.id;
    const memberId = newState.member?.id;

    if (!memberId || !newState.member) return;

    // Get or create streaming map for guild
    if (!this.streamingMembers.has(guildId)) {
      this.streamingMembers.set(guildId, new Map());
    }
    const streaming = this.streamingMembers.get(guildId)!;

    const wasStreaming = oldState.streaming;
    const isStreaming = newState.streaming;

    // Stream started
    if (!wasStreaming && isStreaming && newState.channelId) {
      const streamInfo: StreamInfo = {
        memberId,
        username: newState.member.user.username,
        channelId: newState.channelId,
        startedAt: new Date(),
      };
      streaming.set(memberId, streamInfo);

      const event: StreamEvent = {
        type: 'start',
        member: newState.member,
        channelId: newState.channelId,
        guildId,
        timestamp: new Date(),
      };

      await this.emit(event);
      await this.sendNotification(event);
    }

    // Stream stopped
    if (wasStreaming && !isStreaming) {
      streaming.delete(memberId);
      const event: StreamEvent = {
        type: 'stop',
        member: newState.member,
        channelId: oldState.channelId ?? '',
        guildId,
        timestamp: new Date(),
      };
      await this.emit(event);
    }

    // Left voice while streaming
    if (wasStreaming && !newState.channelId) {
      streaming.delete(memberId);
      const event: StreamEvent = {
        type: 'stop',
        member: newState.member,
        channelId: oldState.channelId ?? '',
        guildId,
        timestamp: new Date(),
      };
      await this.emit(event);
    }
  }

  /**
   * Emit a stream event to all listeners
   */
  private async emit(event: StreamEvent): Promise<void> {
    for (const listener of this.listeners) {
      try {
        await listener(event);
      } catch (error) {
        console.error('Stream event listener error:', error);
      }
    }
  }

  /**
   * Send notification when a stream starts
   */
  private async sendNotification(event: StreamEvent): Promise<void> {
    if (event.type !== 'start' || !this.config.notify_channel) {
      return;
    }

    try {
      const guild = this.client.guilds.cache.get(event.guildId);
      if (!guild) return;

      // Resolve channel (could be an ID or expression result)
      const channelId = typeof this.config.notify_channel === 'string'
        ? this.config.notify_channel.replace(/[<#>]/g, '') // Handle mention format
        : String(this.config.notify_channel);

      const channel = guild.channels.cache.get(channelId) as TextChannel | undefined;
      if (!channel || !channel.isTextBased()) return;

      // Build notification message
      const voiceChannel = guild.channels.cache.get(event.channelId);
      const voiceChannelName = voiceChannel?.name ?? 'Unknown Channel';

      let content = `**${event.member.displayName}** started streaming in **${voiceChannelName}**!`;

      // Add role mention if configured
      if (this.config.notify_role) {
        const roleId = typeof this.config.notify_role === 'string'
          ? this.config.notify_role.replace(/[<@&>]/g, '')
          : String(this.config.notify_role);

        const role = guild.roles.cache.get(roleId);
        if (role) {
          content = `${role.toString()} ${content}`;
        }
      }

      await channel.send({
        content,
        allowedMentions: {
          roles: this.config.notify_role ? [String(this.config.notify_role).replace(/[<@&>]/g, '')] : [],
        },
      });
    } catch (error) {
      console.error('Failed to send stream notification:', error);
    }
  }

  /**
   * Register a stream event listener
   */
  onStreamEvent(callback: StreamEventCallback): () => void {
    this.listeners.push(callback);
    return () => {
      const index = this.listeners.indexOf(callback);
      if (index !== -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * Get all members currently streaming in a guild
   */
  getStreamingMembers(guildId: string): StreamInfo[] {
    const streaming = this.streamingMembers.get(guildId);
    if (!streaming) return [];
    return [...streaming.values()];
  }

  /**
   * Get streaming info for a specific member
   */
  getStreamInfo(guildId: string, memberId: string): StreamInfo | null {
    return this.streamingMembers.get(guildId)?.get(memberId) ?? null;
  }

  /**
   * Check if a member is streaming
   */
  isStreaming(guildId: string, memberId: string): boolean {
    return this.streamingMembers.get(guildId)?.has(memberId) ?? false;
  }

  /**
   * Get stream count in a guild
   */
  getStreamCount(guildId: string): number {
    return this.streamingMembers.get(guildId)?.size ?? 0;
  }

  /**
   * Get total active streams across all guilds
   */
  getTotalStreamCount(): number {
    let count = 0;
    for (const streaming of this.streamingMembers.values()) {
      count += streaming.size;
    }
    return count;
  }

  /**
   * Get all active streams across all guilds
   */
  getAllActiveStreams(): Array<{ guildId: string; streams: StreamInfo[] }> {
    const result: Array<{ guildId: string; streams: StreamInfo[] }> = [];
    for (const [guildId, streaming] of this.streamingMembers) {
      if (streaming.size > 0) {
        result.push({ guildId, streams: [...streaming.values()] });
      }
    }
    return result;
  }

  /**
   * Check if stream detection is enabled
   */
  isEnabled(): boolean {
    return this.config.stream_detection ?? false;
  }

  /**
   * Get current configuration
   */
  getConfig(): VideoConfig {
    return { ...this.config };
  }
}

/**
 * Create a video manager
 */
export function createVideoManager(client: Client): VideoManager {
  return new VideoManager(client);
}
