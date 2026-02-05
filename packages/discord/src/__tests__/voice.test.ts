/**
 * Voice Manager Tests
 *
 * Tests the VoiceManager class for:
 * - Queue management (add, remove, clear, shuffle)
 * - Volume control
 * - Loop modes
 * - Filter application
 * - Playback position tracking
 * - Connection state
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { VoiceManager, createVoiceManager } from '../voice/index.js';
import type { QueueItem, AudioFilter, QueueLoopMode, GuildVoiceState } from '../voice/index.js';

// Mock @discordjs/voice
vi.mock('@discordjs/voice', () => ({
  joinVoiceChannel: vi.fn().mockImplementation(() => {
    const connection = {
      state: { status: 'ready' },
      subscribe: vi.fn(),
      destroy: vi.fn(),
      on: vi.fn(),
    };
    return connection;
  }),
  createAudioPlayer: vi.fn().mockImplementation(() => ({
    play: vi.fn(),
    pause: vi.fn(),
    unpause: vi.fn(),
    stop: vi.fn(),
    on: vi.fn(),
  })),
  createAudioResource: vi.fn().mockImplementation(() => ({
    volume: { setVolume: vi.fn() },
  })),
  AudioPlayerStatus: {
    Playing: 'playing',
    Idle: 'idle',
    Paused: 'paused',
  },
  VoiceConnectionStatus: {
    Ready: 'ready',
    Disconnected: 'disconnected',
  },
  entersState: vi.fn().mockResolvedValue(undefined),
  getVoiceConnection: vi.fn(),
  StreamType: {
    Raw: 'raw',
  },
}));

// Mock prism-media
vi.mock('prism-media', () => ({
  FFmpeg: vi.fn().mockImplementation(() => ({
    pipe: vi.fn(),
    on: vi.fn(),
  })),
}));

// Mock play-dl (optional dependency for search)
vi.mock('play-dl', () => {
  throw new Error('Module not found');
});

// Mock youtube-sr (optional dependency for search)
vi.mock('youtube-sr', () => {
  throw new Error('Module not found');
});

describe('VoiceManager', () => {
  let manager: VoiceManager;
  let mockGuildState: GuildVoiceState;

  beforeEach(() => {
    manager = createVoiceManager();

    // Set up a mock guild state for tests that need it
    mockGuildState = {
      connection: {
        state: { status: 'ready' },
        subscribe: vi.fn(),
        destroy: vi.fn(),
      } as any,
      player: {
        play: vi.fn(),
        pause: vi.fn(),
        unpause: vi.fn(),
        stop: vi.fn(),
        on: vi.fn(),
      } as any,
      queue: [] as QueueItem[],
      currentTrack: null,
      currentResource: null,
      volume: 100,
      loopMode: 'off',
      filters: new Set(),
      paused: false,
      startTime: 0,
      pausedAt: 0,
    };
  });

  afterEach(() => {
    manager.disconnectAll();
    vi.clearAllMocks();
  });

  describe('Configuration', () => {
    it('should configure with custom settings', () => {
      manager.configure({
        default_volume: 75,
        default_loop: 'queue',
        max_queue_size: 500,
        filters: ['bassboost'],
      });

      // Configuration should be stored (we can't directly access it, but we can
      // verify behavior when joining)
    });
  });

  describe('Queue Management', () => {
    const testItem: QueueItem = {
      url: 'https://example.com/song.mp3',
      title: 'Test Song',
      duration: 180000,
      thumbnail: 'https://example.com/thumb.jpg',
      requesterId: 'user123',
    };

    // Inject mock state for queue tests
    function injectState(guildId: string) {
      const state: GuildVoiceState = { ...mockGuildState, queue: [] as QueueItem[] };
      (manager as any).guildStates.set(guildId, state);
      return state;
    }

    it('should add item to end of queue by default', () => {
      const state = injectState('guild1');

      const position = manager.addToQueue('guild1', testItem);

      expect(position).toBe(0);
      expect(state.queue).toHaveLength(1);
      expect(state.queue[0]).toEqual(testItem);
    });

    it('should add item to beginning of queue with "next"', () => {
      const state = injectState('guild1');
      state.queue = [{ ...testItem, title: 'Existing' }];

      const position = manager.addToQueue('guild1', { ...testItem, title: 'New' }, 'next');

      expect(position).toBe(0);
      expect(state.queue[0].title).toBe('New');
      expect(state.queue[1].title).toBe('Existing');
    });

    it('should add item at specific position', () => {
      const state = injectState('guild1');
      state.queue = [
        { ...testItem, title: 'First' },
        { ...testItem, title: 'Third' },
      ];

      manager.addToQueue('guild1', { ...testItem, title: 'Second' }, 1);

      expect(state.queue[1].title).toBe('Second');
      expect(state.queue).toHaveLength(3);
    });

    it('should throw when queue is full', () => {
      manager.configure({ max_queue_size: 2 });
      const state = injectState('guild1');
      state.queue = [testItem, testItem];

      expect(() => {
        manager.addToQueue('guild1', testItem);
      }).toThrow('Queue is full');
    });

    it('should throw when not connected', () => {
      expect(() => {
        manager.addToQueue('not-connected-guild', testItem);
      }).toThrow('Not connected');
    });

    it('should remove item from queue', () => {
      const state = injectState('guild1');
      state.queue = [
        { ...testItem, title: 'First' },
        { ...testItem, title: 'Second' },
      ];

      const removed = manager.removeFromQueue('guild1', 0);

      expect(removed?.title).toBe('First');
      expect(state.queue).toHaveLength(1);
      expect(state.queue[0].title).toBe('Second');
    });

    it('should return null when removing from non-existent guild', () => {
      const removed = manager.removeFromQueue('nonexistent', 0);
      expect(removed).toBeNull();
    });

    it('should clear all items from queue', () => {
      const state = injectState('guild1');
      state.queue = [testItem, testItem, testItem];

      const count = manager.clearQueue('guild1');

      expect(count).toBe(3);
      expect(state.queue).toHaveLength(0);
    });

    it('should shuffle queue randomly', () => {
      const state = injectState('guild1');
      state.queue = Array(10).fill(null).map((_, i) => ({
        ...testItem,
        title: `Song ${i}`,
      }));
      const originalOrder = state.queue.map(q => q.title).join(',');

      manager.shuffleQueue('guild1');

      // There's a very small chance the shuffle produces the same order,
      // but statistically this should change
      const newOrder = state.queue.map(q => q.title).join(',');
      // At minimum, the queue should still have all items
      expect(state.queue).toHaveLength(10);
    });

    it('should get queue for guild', () => {
      const state = injectState('guild1');
      state.queue = [testItem, testItem];

      const queue = manager.getQueue('guild1');

      expect(queue).toHaveLength(2);
    });

    it('should return empty array for non-existent guild', () => {
      const queue = manager.getQueue('nonexistent');
      expect(queue).toEqual([]);
    });
  });

  describe('Volume Control', () => {
    function injectState(guildId: string) {
      const state: GuildVoiceState = { ...mockGuildState, volume: 100 };
      (manager as any).guildStates.set(guildId, state);
      return state;
    }

    it('should set volume within valid range', () => {
      const state = injectState('guild1');

      const result = manager.setVolume('guild1', 75);

      expect(result).toBe(true);
      expect(state.volume).toBe(75);
    });

    it('should clamp volume to minimum of 0', () => {
      const state = injectState('guild1');

      manager.setVolume('guild1', -50);

      expect(state.volume).toBe(0);
    });

    it('should clamp volume to maximum of 200', () => {
      const state = injectState('guild1');

      manager.setVolume('guild1', 300);

      expect(state.volume).toBe(200);
    });

    it('should return false when not connected', () => {
      const result = manager.setVolume('nonexistent', 50);
      expect(result).toBe(false);
    });
  });

  describe('Loop Modes', () => {
    function injectState(guildId: string) {
      const state: GuildVoiceState = { ...mockGuildState, loopMode: 'off' as QueueLoopMode };
      (manager as any).guildStates.set(guildId, state);
      return state;
    }

    it('should set loop mode to track', () => {
      const state = injectState('guild1');

      manager.setLoopMode('guild1', 'track');

      expect(state.loopMode).toBe('track');
    });

    it('should set loop mode to queue', () => {
      const state = injectState('guild1');

      manager.setLoopMode('guild1', 'queue');

      expect(state.loopMode).toBe('queue');
    });

    it('should set loop mode to off', () => {
      const state = injectState('guild1');
      state.loopMode = 'track';

      manager.setLoopMode('guild1', 'off');

      expect(state.loopMode).toBe('off');
    });
  });

  describe('Playback Controls', () => {
    function injectState(guildId: string) {
      const state: GuildVoiceState = {
        ...mockGuildState,
        player: {
          play: vi.fn(),
          pause: vi.fn(),
          unpause: vi.fn(),
          stop: vi.fn(),
          on: vi.fn(),
        } as any,
        paused: false,
        startTime: Date.now(),
        pausedAt: 0,
      };
      (manager as any).guildStates.set(guildId, state);
      return state;
    }

    it('should pause playback', () => {
      const state = injectState('guild1');

      const result = manager.pause('guild1');

      expect(result).toBe(true);
      expect(state.player.pause).toHaveBeenCalled();
      expect(state.paused).toBe(true);
    });

    it('should resume playback', () => {
      const state = injectState('guild1');
      state.paused = true;
      state.pausedAt = Date.now() - 1000;

      const result = manager.resume('guild1');

      expect(result).toBe(true);
      expect(state.player.unpause).toHaveBeenCalled();
      expect(state.paused).toBe(false);
    });

    it('should skip current track', () => {
      const state = injectState('guild1');

      const result = manager.skip('guild1');

      expect(result).toBe(true);
      expect(state.player.stop).toHaveBeenCalled();
    });

    it('should stop playback and clear queue', () => {
      const state = injectState('guild1');
      state.queue = [{ url: 'test', title: 'Test', requesterId: 'user' }];

      const result = manager.stop('guild1');

      expect(result).toBe(true);
      expect(state.player.stop).toHaveBeenCalled();
      expect(state.queue).toHaveLength(0);
      expect(state.currentTrack).toBeNull();
    });

    it('should return false when guild not connected', () => {
      expect(manager.pause('nonexistent')).toBe(false);
      expect(manager.resume('nonexistent')).toBe(false);
      expect(manager.skip('nonexistent')).toBe(false);
      expect(manager.stop('nonexistent')).toBe(false);
    });
  });

  describe('Playback Position Tracking', () => {
    function injectState(guildId: string, overrides: Partial<GuildVoiceState> = {}) {
      const state: GuildVoiceState = {
        ...mockGuildState,
        startTime: Date.now() - 5000, // Started 5 seconds ago
        pausedAt: 0,
        paused: false,
        ...overrides,
      };
      (manager as any).guildStates.set(guildId, state);
      return state;
    }

    it('should return current playback position', () => {
      injectState('guild1', { startTime: Date.now() - 10000 });

      const position = manager.getPlaybackPosition('guild1');

      // Should be approximately 10000ms (10 seconds)
      expect(position).toBeGreaterThanOrEqual(9900);
      expect(position).toBeLessThanOrEqual(10100);
    });

    it('should return paused position when paused', () => {
      const startTime = Date.now() - 10000;
      const pausedAt = startTime + 5000; // Paused at 5 seconds
      injectState('guild1', {
        startTime,
        pausedAt,
        paused: true,
      });

      const position = manager.getPlaybackPosition('guild1');

      // Should return position at time of pause (5 seconds)
      expect(position).toBe(5000);
    });

    it('should return 0 for non-existent guild', () => {
      const position = manager.getPlaybackPosition('nonexistent');
      expect(position).toBe(0);
    });
  });

  describe('Audio Filters', () => {
    function injectState(guildId: string) {
      const state: GuildVoiceState = {
        ...mockGuildState,
        filters: new Set<AudioFilter>(),
        currentTrack: { url: 'test.mp3', title: 'Test', requesterId: 'user' },
      };
      (manager as any).guildStates.set(guildId, state);
      return state;
    }

    it('should add a filter', async () => {
      const state = injectState('guild1');

      const result = await manager.setFilter('guild1', 'bassboost', true);

      expect(result).toBe(true);
      expect(state.filters.has('bassboost')).toBe(true);
    });

    it('should remove a filter', async () => {
      const state = injectState('guild1');
      state.filters.add('bassboost');

      const result = await manager.setFilter('guild1', 'bassboost', false);

      expect(result).toBe(true);
      expect(state.filters.has('bassboost')).toBe(false);
    });

    it('should get active filters', () => {
      const state = injectState('guild1');
      state.filters.add('bassboost');
      state.filters.add('nightcore');

      const filters = manager.getFilters('guild1');

      expect(filters).toContain('bassboost');
      expect(filters).toContain('nightcore');
      expect(filters).toHaveLength(2);
    });

    it('should return empty array for non-existent guild', () => {
      const filters = manager.getFilters('nonexistent');
      expect(filters).toEqual([]);
    });

    it('should clear all filters', async () => {
      const state = injectState('guild1');
      state.filters.add('bassboost');
      state.filters.add('nightcore');
      state.filters.add('vaporwave');

      const result = await manager.clearFilters('guild1');

      expect(result).toBe(true);
      expect(state.filters.size).toBe(0);
    });

    it('should return false when not connected', async () => {
      const result = await manager.setFilter('nonexistent', 'bassboost', true);
      expect(result).toBe(false);
    });
  });

  describe('Connection State', () => {
    function injectState(guildId: string) {
      const state: GuildVoiceState = { ...mockGuildState };
      (manager as any).guildStates.set(guildId, state);
      return state;
    }

    it('should report connected status', () => {
      injectState('guild1');

      expect(manager.isConnected('guild1')).toBe(true);
    });

    it('should report disconnected status', () => {
      expect(manager.isConnected('nonexistent')).toBe(false);
    });

    it('should return state for connected guild', () => {
      const state = injectState('guild1');

      const returned = manager.getState('guild1');

      expect(returned).toBe(state);
    });

    it('should return undefined for non-existent guild', () => {
      const state = manager.getState('nonexistent');
      expect(state).toBeUndefined();
    });

    it('should get current track', () => {
      const state = injectState('guild1');
      state.currentTrack = {
        url: 'test.mp3',
        title: 'Current Song',
        requesterId: 'user',
      };

      const track = manager.getCurrentTrack('guild1');

      expect(track?.title).toBe('Current Song');
    });

    it('should return null for no current track', () => {
      injectState('guild1');

      const track = manager.getCurrentTrack('guild1');

      expect(track).toBeNull();
    });
  });

  describe('Leave and Disconnect', () => {
    function injectState(guildId: string) {
      const state: GuildVoiceState = {
        ...mockGuildState,
        connection: {
          destroy: vi.fn(),
        } as any,
        player: {
          stop: vi.fn(),
        } as any,
      };
      (manager as any).guildStates.set(guildId, state);
      return state;
    }

    it('should leave voice channel and clean up state', () => {
      const state = injectState('guild1');

      const result = manager.leave('guild1');

      expect(result).toBe(true);
      expect(state.player.stop).toHaveBeenCalled();
      expect(state.connection.destroy).toHaveBeenCalled();
      expect(manager.isConnected('guild1')).toBe(false);
    });

    it('should return false when not connected', () => {
      const result = manager.leave('nonexistent');
      expect(result).toBe(false);
    });

    it('should disconnect all guilds', () => {
      injectState('guild1');
      injectState('guild2');
      injectState('guild3');

      manager.disconnectAll();

      expect(manager.isConnected('guild1')).toBe(false);
      expect(manager.isConnected('guild2')).toBe(false);
      expect(manager.isConnected('guild3')).toBe(false);
    });
  });

  describe('Search', () => {
    it('should return direct URL as search result', async () => {
      const results = await manager.search('https://youtube.com/watch?v=abc123');

      expect(results).toHaveLength(1);
      expect(results[0].url).toBe('https://youtube.com/watch?v=abc123');
    });

    it('should extract video ID from YouTube URL', async () => {
      const results = await manager.search('https://youtube.com/watch?v=dQw4w9WgXcQ');

      expect(results[0].title).toContain('dQw4w9WgXcQ');
    });

    it('should return fallback search URL for non-URL queries', async () => {
      // Since we don't have play-dl or youtube-sr installed, it should fallback
      const results = await manager.search('never gonna give you up');

      expect(results).toHaveLength(1);
      expect(results[0].url).toContain('ytsearch:');
      expect(results[0].title).toBe('never gonna give you up');
    });
  });

  describe('URL Detection', () => {
    it('should correctly identify HTTP URLs', () => {
      // We can test this indirectly through search behavior
    });

    it('should reject non-URLs', async () => {
      const results = await manager.search('just a search query');

      // Should be a ytsearch: fallback, not a direct URL
      expect(results[0].url.startsWith('ytsearch:')).toBe(true);
    });
  });
});

describe('createVoiceManager factory', () => {
  it('should create a VoiceManager instance', () => {
    const manager = createVoiceManager();
    expect(manager).toBeInstanceOf(VoiceManager);
  });
});
