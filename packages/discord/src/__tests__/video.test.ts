/**
 * Video/streaming detection tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { VideoManager, createVideoManager } from '../video/index.js';
import type { Client, VoiceState, GuildMember, Guild, TextChannel } from 'discord.js';

// Create mock objects
function createMockClient() {
  const listeners: Map<string, ((...args: any[]) => void)[]> = new Map();

  return {
    on: vi.fn((event: string, callback: (...args: any[]) => void) => {
      if (!listeners.has(event)) {
        listeners.set(event, []);
      }
      listeners.get(event)!.push(callback);
    }),
    emit: (event: string, ...args: any[]) => {
      const handlers = listeners.get(event) || [];
      handlers.forEach(h => h(...args));
    },
    guilds: {
      cache: new Map(),
    },
  } as unknown as Client & { emit: (event: string, ...args: any[]) => void };
}

function createMockVoiceState(options: {
  guildId: string;
  memberId: string;
  channelId?: string | null;
  streaming?: boolean;
  member?: Partial<GuildMember>;
}): VoiceState {
  return {
    guild: {
      id: options.guildId,
      channels: {
        cache: new Map<string, any>([
          ['voice-123', { name: 'General Voice', isTextBased: () => false }],
          ['text-123', { name: 'General', isTextBased: () => true, send: vi.fn() }],
        ]),
      },
      roles: {
        cache: new Map([
          ['role-123', { toString: () => '<@&role-123>' }],
        ]),
      },
    } as any,
    member: {
      id: options.memberId,
      user: {
        id: options.memberId,
        username: 'TestUser',
      },
      displayName: 'Test User',
      ...options.member,
    } as GuildMember,
    channelId: options.channelId ?? null,
    streaming: options.streaming ?? false,
  } as VoiceState;
}

describe('VideoManager', () => {
  let client: Client & { emit: (event: string, ...args: any[]) => void };
  let videoManager: VideoManager;

  beforeEach(() => {
    client = createMockClient();
    videoManager = createVideoManager(client);
  });

  describe('initialization', () => {
    it('should create a video manager', () => {
      expect(videoManager).toBeDefined();
      expect(typeof videoManager.configure).toBe('function');
      expect(typeof videoManager.isEnabled).toBe('function');
    });

    it('should not be enabled by default', () => {
      expect(videoManager.isEnabled()).toBe(false);
    });

    it('should enable stream detection when configured', () => {
      videoManager.configure({ stream_detection: true });
      expect(videoManager.isEnabled()).toBe(true);
    });

    it('should set up listener when stream detection enabled', () => {
      videoManager.configure({ stream_detection: true });
      expect(client.on).toHaveBeenCalledWith('voiceStateUpdate', expect.any(Function));
    });

    it('should not set up duplicate listeners', () => {
      videoManager.configure({ stream_detection: true });
      videoManager.configure({ stream_detection: true });
      // Should only call on() once
      expect(client.on).toHaveBeenCalledTimes(1);
    });
  });

  describe('configuration', () => {
    it('should store configuration', () => {
      videoManager.configure({
        stream_detection: true,
        notify_channel: 'channel-123',
        notify_role: 'role-123',
      });

      const config = videoManager.getConfig();
      expect(config.stream_detection).toBe(true);
      expect(config.notify_channel).toBe('channel-123');
      expect(config.notify_role).toBe('role-123');
    });

    it('should return config copy to prevent mutation', () => {
      videoManager.configure({ stream_detection: true });
      const config = videoManager.getConfig();
      config.stream_detection = false;
      expect(videoManager.isEnabled()).toBe(true);
    });
  });

  describe('stream tracking', () => {
    beforeEach(() => {
      videoManager.configure({ stream_detection: true });
    });

    it('should track stream start', () => {
      const oldState = createMockVoiceState({
        guildId: 'guild-1',
        memberId: 'user-1',
        channelId: 'voice-123',
        streaming: false,
      });

      const newState = createMockVoiceState({
        guildId: 'guild-1',
        memberId: 'user-1',
        channelId: 'voice-123',
        streaming: true,
      });

      // Trigger voice state update
      client.emit('voiceStateUpdate', oldState, newState);

      expect(videoManager.isStreaming('guild-1', 'user-1')).toBe(true);
      expect(videoManager.getStreamCount('guild-1')).toBe(1);
    });

    it('should track stream stop', () => {
      // First start streaming
      const startOld = createMockVoiceState({
        guildId: 'guild-1',
        memberId: 'user-1',
        channelId: 'voice-123',
        streaming: false,
      });
      const startNew = createMockVoiceState({
        guildId: 'guild-1',
        memberId: 'user-1',
        channelId: 'voice-123',
        streaming: true,
      });
      client.emit('voiceStateUpdate', startOld, startNew);

      // Then stop streaming
      const stopOld = createMockVoiceState({
        guildId: 'guild-1',
        memberId: 'user-1',
        channelId: 'voice-123',
        streaming: true,
      });
      const stopNew = createMockVoiceState({
        guildId: 'guild-1',
        memberId: 'user-1',
        channelId: 'voice-123',
        streaming: false,
      });
      client.emit('voiceStateUpdate', stopOld, stopNew);

      expect(videoManager.isStreaming('guild-1', 'user-1')).toBe(false);
      expect(videoManager.getStreamCount('guild-1')).toBe(0);
    });

    it('should track stream stop when leaving voice', () => {
      // Start streaming
      const startOld = createMockVoiceState({
        guildId: 'guild-1',
        memberId: 'user-1',
        channelId: 'voice-123',
        streaming: false,
      });
      const startNew = createMockVoiceState({
        guildId: 'guild-1',
        memberId: 'user-1',
        channelId: 'voice-123',
        streaming: true,
      });
      client.emit('voiceStateUpdate', startOld, startNew);

      // Leave voice while streaming
      const leaveOld = createMockVoiceState({
        guildId: 'guild-1',
        memberId: 'user-1',
        channelId: 'voice-123',
        streaming: true,
      });
      const leaveNew = createMockVoiceState({
        guildId: 'guild-1',
        memberId: 'user-1',
        channelId: null,
        streaming: false,
      });
      client.emit('voiceStateUpdate', leaveOld, leaveNew);

      expect(videoManager.isStreaming('guild-1', 'user-1')).toBe(false);
    });

    it('should track multiple streamers', () => {
      // User 1 starts streaming
      client.emit(
        'voiceStateUpdate',
        createMockVoiceState({ guildId: 'guild-1', memberId: 'user-1', channelId: 'voice-123', streaming: false }),
        createMockVoiceState({ guildId: 'guild-1', memberId: 'user-1', channelId: 'voice-123', streaming: true })
      );

      // User 2 starts streaming
      client.emit(
        'voiceStateUpdate',
        createMockVoiceState({ guildId: 'guild-1', memberId: 'user-2', channelId: 'voice-123', streaming: false }),
        createMockVoiceState({ guildId: 'guild-1', memberId: 'user-2', channelId: 'voice-123', streaming: true })
      );

      expect(videoManager.getStreamCount('guild-1')).toBe(2);
      expect(videoManager.isStreaming('guild-1', 'user-1')).toBe(true);
      expect(videoManager.isStreaming('guild-1', 'user-2')).toBe(true);
    });

    it('should track streams across guilds', () => {
      client.emit(
        'voiceStateUpdate',
        createMockVoiceState({ guildId: 'guild-1', memberId: 'user-1', channelId: 'voice-123', streaming: false }),
        createMockVoiceState({ guildId: 'guild-1', memberId: 'user-1', channelId: 'voice-123', streaming: true })
      );

      client.emit(
        'voiceStateUpdate',
        createMockVoiceState({ guildId: 'guild-2', memberId: 'user-2', channelId: 'voice-456', streaming: false }),
        createMockVoiceState({ guildId: 'guild-2', memberId: 'user-2', channelId: 'voice-456', streaming: true })
      );

      expect(videoManager.getStreamCount('guild-1')).toBe(1);
      expect(videoManager.getStreamCount('guild-2')).toBe(1);
      expect(videoManager.getTotalStreamCount()).toBe(2);
    });
  });

  describe('stream info', () => {
    beforeEach(() => {
      videoManager.configure({ stream_detection: true });
    });

    it('should return stream info for streaming member', () => {
      client.emit(
        'voiceStateUpdate',
        createMockVoiceState({ guildId: 'guild-1', memberId: 'user-1', channelId: 'voice-123', streaming: false }),
        createMockVoiceState({ guildId: 'guild-1', memberId: 'user-1', channelId: 'voice-123', streaming: true })
      );

      const info = videoManager.getStreamInfo('guild-1', 'user-1');
      expect(info).not.toBeNull();
      expect(info?.memberId).toBe('user-1');
      expect(info?.channelId).toBe('voice-123');
      expect(info?.startedAt).toBeInstanceOf(Date);
    });

    it('should return null for non-streaming member', () => {
      const info = videoManager.getStreamInfo('guild-1', 'user-1');
      expect(info).toBeNull();
    });

    it('should get all streaming members in guild', () => {
      client.emit(
        'voiceStateUpdate',
        createMockVoiceState({ guildId: 'guild-1', memberId: 'user-1', channelId: 'voice-123', streaming: false }),
        createMockVoiceState({ guildId: 'guild-1', memberId: 'user-1', channelId: 'voice-123', streaming: true })
      );
      client.emit(
        'voiceStateUpdate',
        createMockVoiceState({ guildId: 'guild-1', memberId: 'user-2', channelId: 'voice-123', streaming: false }),
        createMockVoiceState({ guildId: 'guild-1', memberId: 'user-2', channelId: 'voice-123', streaming: true })
      );

      const members = videoManager.getStreamingMembers('guild-1');
      expect(members).toHaveLength(2);
      expect(members.map(m => m.memberId)).toContain('user-1');
      expect(members.map(m => m.memberId)).toContain('user-2');
    });

    it('should return empty array for guild with no streams', () => {
      const members = videoManager.getStreamingMembers('guild-1');
      expect(members).toHaveLength(0);
    });

    it('should get all active streams', () => {
      client.emit(
        'voiceStateUpdate',
        createMockVoiceState({ guildId: 'guild-1', memberId: 'user-1', channelId: 'voice-123', streaming: false }),
        createMockVoiceState({ guildId: 'guild-1', memberId: 'user-1', channelId: 'voice-123', streaming: true })
      );
      client.emit(
        'voiceStateUpdate',
        createMockVoiceState({ guildId: 'guild-2', memberId: 'user-2', channelId: 'voice-456', streaming: false }),
        createMockVoiceState({ guildId: 'guild-2', memberId: 'user-2', channelId: 'voice-456', streaming: true })
      );

      const allStreams = videoManager.getAllActiveStreams();
      expect(allStreams).toHaveLength(2);
    });
  });

  describe('event listeners', () => {
    beforeEach(() => {
      videoManager.configure({ stream_detection: true });
    });

    it('should call listeners on stream start', async () => {
      const listener = vi.fn();
      videoManager.onStreamEvent(listener);

      client.emit(
        'voiceStateUpdate',
        createMockVoiceState({ guildId: 'guild-1', memberId: 'user-1', channelId: 'voice-123', streaming: false }),
        createMockVoiceState({ guildId: 'guild-1', memberId: 'user-1', channelId: 'voice-123', streaming: true })
      );

      // Give async handlers time to run
      await new Promise(r => setTimeout(r, 10));

      expect(listener).toHaveBeenCalledWith(expect.objectContaining({
        type: 'start',
        guildId: 'guild-1',
        channelId: 'voice-123',
      }));
    });

    it('should call listeners on stream stop', async () => {
      const listener = vi.fn();
      videoManager.onStreamEvent(listener);

      // Start
      client.emit(
        'voiceStateUpdate',
        createMockVoiceState({ guildId: 'guild-1', memberId: 'user-1', channelId: 'voice-123', streaming: false }),
        createMockVoiceState({ guildId: 'guild-1', memberId: 'user-1', channelId: 'voice-123', streaming: true })
      );

      // Stop
      client.emit(
        'voiceStateUpdate',
        createMockVoiceState({ guildId: 'guild-1', memberId: 'user-1', channelId: 'voice-123', streaming: true }),
        createMockVoiceState({ guildId: 'guild-1', memberId: 'user-1', channelId: 'voice-123', streaming: false })
      );

      await new Promise(r => setTimeout(r, 10));

      expect(listener).toHaveBeenCalledTimes(2);
      expect(listener).toHaveBeenLastCalledWith(expect.objectContaining({
        type: 'stop',
      }));
    });

    it('should allow unregistering listeners', async () => {
      const listener = vi.fn();
      const unregister = videoManager.onStreamEvent(listener);

      unregister();

      client.emit(
        'voiceStateUpdate',
        createMockVoiceState({ guildId: 'guild-1', memberId: 'user-1', channelId: 'voice-123', streaming: false }),
        createMockVoiceState({ guildId: 'guild-1', memberId: 'user-1', channelId: 'voice-123', streaming: true })
      );

      await new Promise(r => setTimeout(r, 10));

      expect(listener).not.toHaveBeenCalled();
    });

    it('should handle listener errors gracefully', async () => {
      const errorListener = vi.fn(() => {
        throw new Error('Listener error');
      });
      const goodListener = vi.fn();

      videoManager.onStreamEvent(errorListener);
      videoManager.onStreamEvent(goodListener);

      // Should not throw
      client.emit(
        'voiceStateUpdate',
        createMockVoiceState({ guildId: 'guild-1', memberId: 'user-1', channelId: 'voice-123', streaming: false }),
        createMockVoiceState({ guildId: 'guild-1', memberId: 'user-1', channelId: 'voice-123', streaming: true })
      );

      await new Promise(r => setTimeout(r, 10));

      expect(errorListener).toHaveBeenCalled();
      expect(goodListener).toHaveBeenCalled();
    });
  });

  describe('edge cases', () => {
    beforeEach(() => {
      videoManager.configure({ stream_detection: true });
    });

    it('should handle missing member', () => {
      const state = createMockVoiceState({
        guildId: 'guild-1',
        memberId: 'user-1',
        channelId: 'voice-123',
        streaming: true,
      });
      (state as any).member = undefined;

      // Should not throw
      client.emit('voiceStateUpdate', state, state);
      expect(videoManager.getStreamCount('guild-1')).toBe(0);
    });

    it('should return 0 for non-existent guild stream count', () => {
      expect(videoManager.getStreamCount('non-existent')).toBe(0);
    });

    it('should return false for non-existent member streaming check', () => {
      expect(videoManager.isStreaming('guild-1', 'non-existent')).toBe(false);
    });

    it('should handle rapid stream start/stop', async () => {
      // Run 11 iterations (0-10) so final iteration is even (i=10)
      for (let i = 0; i <= 10; i++) {
        client.emit(
          'voiceStateUpdate',
          createMockVoiceState({ guildId: 'guild-1', memberId: 'user-1', channelId: 'voice-123', streaming: i % 2 === 1 }),
          createMockVoiceState({ guildId: 'guild-1', memberId: 'user-1', channelId: 'voice-123', streaming: i % 2 === 0 })
        );
      }

      // Final state should be streaming (i=10 is even, so newState.streaming = true)
      expect(videoManager.isStreaming('guild-1', 'user-1')).toBe(true);
    });
  });
});

describe('createVideoManager', () => {
  it('should create a VideoManager instance', () => {
    const client = createMockClient();
    const manager = createVideoManager(client);
    expect(manager).toBeInstanceOf(VideoManager);
  });
});
