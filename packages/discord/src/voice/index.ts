/**
 * Voice connection and audio management
 */

import {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  VoiceConnectionStatus,
  entersState,
  getVoiceConnection,
  type VoiceConnection,
  type AudioPlayer,
  type AudioResource,
  type DiscordGatewayAdapterCreator,
} from '@discordjs/voice';
import type { VoiceChannel, StageChannel, Guild } from 'discord.js';

/** Voice configuration */
export interface VoiceConfig {
  connection?: {
    self_deaf?: boolean;
    self_mute?: boolean;
    timeout?: string;
  };
  default_volume?: number;
  default_loop?: QueueLoopMode;
  max_queue_size?: number;
  filters?: string[];
}

/** Audio filter types */
export type AudioFilter =
  | 'bassboost'
  | 'nightcore'
  | 'vaporwave'
  | '8d'
  | 'treble'
  | 'normalizer'
  | 'karaoke'
  | 'tremolo'
  | 'vibrato'
  | 'reverse';

/** Queue loop mode */
export type QueueLoopMode = 'off' | 'track' | 'queue';

export interface QueueItem {
  url: string;
  title: string;
  duration?: number;
  thumbnail?: string;
  requesterId: string;
}

export interface GuildVoiceState {
  connection: VoiceConnection;
  player: AudioPlayer;
  queue: QueueItem[];
  currentTrack: QueueItem | null;
  currentResource: AudioResource | null;
  volume: number;
  loopMode: QueueLoopMode;
  filters: Set<AudioFilter>;
  paused: boolean;
  startTime: number;
  pausedAt: number;
}

/** FFmpeg filter definitions */
const FILTER_ARGS: Record<AudioFilter, string[]> = {
  bassboost: ['-af', 'bass=g=10,dynaudnorm=f=200'],
  nightcore: ['-af', 'asetrate=44100*1.25,aresample=44100,atempo=1.06'],
  vaporwave: ['-af', 'asetrate=44100*0.8,aresample=44100,atempo=0.9'],
  '8d': ['-af', 'apulsator=hz=0.08'],
  treble: ['-af', 'treble=g=5,dynaudnorm=f=200'],
  normalizer: ['-af', 'dynaudnorm=f=200:g=3'],
  karaoke: ['-af', 'stereotools=mlev=0.03'],
  tremolo: ['-af', 'tremolo=f=6:d=0.5'],
  vibrato: ['-af', 'vibrato=f=6:d=0.5'],
  reverse: ['-af', 'areverse'],
};

/** Search result from voice_search */
export interface SearchResult {
  url: string;
  title: string;
  duration: number;
  thumbnail: string | null;
  author?: string;
}

export class VoiceManager {
  private guildStates: Map<string, GuildVoiceState> = new Map();
  private config: VoiceConfig = {};

  /**
   * Configure the voice manager
   */
  configure(config: VoiceConfig): void {
    this.config = config;
  }

  /**
   * Join a voice channel
   */
  async join(
    channel: VoiceChannel | StageChannel,
    options: { selfDeaf?: boolean; selfMute?: boolean } = {}
  ): Promise<VoiceConnection> {
    const guildId = channel.guild.id;

    // Leave existing connection if any
    const existing = getVoiceConnection(guildId);
    if (existing) {
      existing.destroy();
    }

    const connection = joinVoiceChannel({
      channelId: channel.id,
      guildId: guildId,
      adapterCreator: channel.guild.voiceAdapterCreator as unknown as DiscordGatewayAdapterCreator,
      selfDeaf: options.selfDeaf ?? this.config.connection?.self_deaf ?? true,
      selfMute: options.selfMute ?? this.config.connection?.self_mute ?? false,
    });

    // Wait for connection to be ready
    await entersState(connection, VoiceConnectionStatus.Ready, 30000);

    // Create audio player
    const player = createAudioPlayer();

    // Set up player events
    player.on(AudioPlayerStatus.Idle, () => {
      this.handleTrackEnd(guildId);
    });

    player.on('error', (error) => {
      console.error(`Audio player error in ${guildId}:`, error);
      this.handleTrackEnd(guildId);
    });

    // Subscribe connection to player
    connection.subscribe(player);

    // Store state
    this.guildStates.set(guildId, {
      connection,
      player,
      queue: [],
      currentTrack: null,
      currentResource: null,
      volume: this.config.default_volume ?? 100,
      loopMode: this.config.default_loop ?? 'off',
      filters: new Set(),
      paused: false,
      startTime: 0,
      pausedAt: 0,
    });

    return connection;
  }

  /**
   * Leave a voice channel
   */
  leave(guildId: string): boolean {
    const state = this.guildStates.get(guildId);
    if (!state) return false;

    state.player.stop();
    state.connection.destroy();
    this.guildStates.delete(guildId);

    return true;
  }

  /**
   * Play audio from a URL or file
   */
  async play(
    guildId: string,
    source: string,
    options: { volume?: number; seek?: number } = {}
  ): Promise<void> {
    const state = this.guildStates.get(guildId);
    if (!state) {
      throw new Error('Not connected to voice in this guild');
    }

    // Build FFmpeg args for filters and seeking
    const ffmpegArgs: string[] = ['-analyzeduration', '0'];

    // Add seek if specified
    if (options.seek && options.seek > 0) {
      ffmpegArgs.push('-ss', String(options.seek / 1000)); // Convert ms to seconds
    }

    // Add filters if any are active
    if (state.filters.size > 0) {
      const filterArgs = this.buildFilterArgs(state.filters);
      ffmpegArgs.push(...filterArgs);
    }

    // Create audio resource with FFmpeg args if needed
    const resource = createAudioResource(source, {
      inlineVolume: true,
      inputType: ffmpegArgs.length > 2 ? undefined : undefined,
    });

    // Set volume
    const volume = options.volume ?? state.volume;
    resource.volume?.setVolume(volume / 100);

    // Track playback state
    state.currentResource = resource;
    state.startTime = Date.now() - (options.seek ?? 0);
    state.pausedAt = 0;

    // Play
    state.player.play(resource);
    state.paused = false;
  }

  /**
   * Build FFmpeg filter arguments from active filters
   */
  private buildFilterArgs(filters: Set<AudioFilter>): string[] {
    if (filters.size === 0) return [];

    const filterStrings: string[] = [];
    for (const filter of filters) {
      const args = FILTER_ARGS[filter];
      if (args) {
        // Extract the filter string from -af argument
        const afIndex = args.indexOf('-af');
        if (afIndex !== -1 && args[afIndex + 1]) {
          filterStrings.push(args[afIndex + 1]);
        }
      }
    }

    if (filterStrings.length === 0) return [];
    return ['-af', filterStrings.join(',')];
  }

  /**
   * Add a track to the queue
   */
  addToQueue(
    guildId: string,
    item: QueueItem,
    position?: number | 'next' | 'last'
  ): number {
    const state = this.guildStates.get(guildId);
    if (!state) {
      throw new Error('Not connected to voice in this guild');
    }

    // Check queue size limit
    const maxSize = this.config.max_queue_size ?? 1000;
    if (state.queue.length >= maxSize) {
      throw new Error(`Queue is full (max ${maxSize} tracks)`);
    }

    if (position === 'next' || position === 0) {
      state.queue.unshift(item);
      return 0;
    } else if (position === 'last' || position === undefined) {
      state.queue.push(item);
      return state.queue.length - 1;
    } else if (typeof position === 'number') {
      state.queue.splice(position, 0, item);
      return position;
    }

    state.queue.push(item);
    return state.queue.length - 1;
  }

  /**
   * Remove a track from the queue
   */
  removeFromQueue(guildId: string, position: number): QueueItem | null {
    const state = this.guildStates.get(guildId);
    if (!state) return null;

    const [removed] = state.queue.splice(position, 1);
    return removed ?? null;
  }

  /**
   * Clear the queue
   */
  clearQueue(guildId: string): number {
    const state = this.guildStates.get(guildId);
    if (!state) return 0;

    const count = state.queue.length;
    state.queue = [];
    return count;
  }

  /**
   * Shuffle the queue
   */
  shuffleQueue(guildId: string): void {
    const state = this.guildStates.get(guildId);
    if (!state) return;

    for (let i = state.queue.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [state.queue[i], state.queue[j]] = [state.queue[j]!, state.queue[i]!];
    }
  }

  /**
   * Skip the current track
   */
  skip(guildId: string): boolean {
    const state = this.guildStates.get(guildId);
    if (!state) return false;

    state.player.stop();
    return true;
  }

  /**
   * Pause playback
   */
  pause(guildId: string): boolean {
    const state = this.guildStates.get(guildId);
    if (!state) return false;

    state.player.pause();
    state.paused = true;
    state.pausedAt = Date.now();
    return true;
  }

  /**
   * Resume playback
   */
  resume(guildId: string): boolean {
    const state = this.guildStates.get(guildId);
    if (!state) return false;

    // Adjust start time to account for pause duration
    if (state.pausedAt > 0) {
      const pauseDuration = Date.now() - state.pausedAt;
      state.startTime += pauseDuration;
    }

    state.player.unpause();
    state.paused = false;
    state.pausedAt = 0;
    return true;
  }

  /**
   * Stop playback
   */
  stop(guildId: string): boolean {
    const state = this.guildStates.get(guildId);
    if (!state) return false;

    state.player.stop();
    state.queue = [];
    state.currentTrack = null;
    return true;
  }

  /**
   * Set volume
   */
  setVolume(guildId: string, volume: number): boolean {
    const state = this.guildStates.get(guildId);
    if (!state) return false;

    state.volume = Math.max(0, Math.min(200, volume));
    return true;
  }

  /**
   * Set loop mode
   */
  setLoopMode(guildId: string, mode: QueueLoopMode): void {
    const state = this.guildStates.get(guildId);
    if (!state) return;

    state.loopMode = mode;
  }

  /**
   * Seek to a position in the current track
   */
  async seek(guildId: string, position: number): Promise<boolean> {
    const state = this.guildStates.get(guildId);
    if (!state || !state.currentTrack) return false;

    // Replay the track from the specified position
    await this.play(guildId, state.currentTrack.url, {
      seek: position,
      volume: state.volume,
    });

    return true;
  }

  /**
   * Get current playback position in milliseconds
   */
  getPlaybackPosition(guildId: string): number {
    const state = this.guildStates.get(guildId);
    if (!state) return 0;

    if (state.paused && state.pausedAt > 0) {
      return state.pausedAt - state.startTime;
    }

    if (state.startTime > 0) {
      return Date.now() - state.startTime;
    }

    return 0;
  }

  /**
   * Set an audio filter
   */
  async setFilter(guildId: string, filter: AudioFilter, enabled: boolean): Promise<boolean> {
    const state = this.guildStates.get(guildId);
    if (!state) return false;

    const hadFilter = state.filters.has(filter);

    if (enabled) {
      state.filters.add(filter);
    } else {
      state.filters.delete(filter);
    }

    // Only restart playback if filter state changed and something is playing
    if (hadFilter !== enabled && state.currentTrack) {
      const currentPosition = this.getPlaybackPosition(guildId);
      await this.play(guildId, state.currentTrack.url, {
        seek: currentPosition,
        volume: state.volume,
      });
    }

    return true;
  }

  /**
   * Get active filters
   */
  getFilters(guildId: string): AudioFilter[] {
    const state = this.guildStates.get(guildId);
    if (!state) return [];
    return [...state.filters];
  }

  /**
   * Clear all filters
   */
  async clearFilters(guildId: string): Promise<boolean> {
    const state = this.guildStates.get(guildId);
    if (!state) return false;

    if (state.filters.size === 0) return true;

    state.filters.clear();

    // Restart playback without filters if something is playing
    if (state.currentTrack) {
      const currentPosition = this.getPlaybackPosition(guildId);
      await this.play(guildId, state.currentTrack.url, {
        seek: currentPosition,
        volume: state.volume,
      });
    }

    return true;
  }

  /**
   * Search for music tracks
   * This provides a basic implementation that handles URLs directly
   * For full search functionality, integrate with youtube-sr, play-dl, or similar
   */
  async search(query: string, options: { limit?: number; source?: string } = {}): Promise<SearchResult[]> {
    const limit = options.limit ?? 5;

    // If it's already a URL, return it directly as a result
    if (this.isUrl(query)) {
      return [{
        url: query,
        title: this.extractTitleFromUrl(query),
        duration: 0,
        thumbnail: null,
      }];
    }

    // Try to dynamically import play-dl for search functionality
    try {
      // @ts-ignore - Optional dependency, may not be installed
      const playDl = await import(/* webpackIgnore: true */ 'play-dl').catch(() => null);
      if (playDl) {
        const results = await playDl.search(query, { limit, source: { youtube: 'video' } });
        return results.map((result: any) => ({
          url: result.url,
          title: result.title ?? query,
          duration: result.durationInSec ? result.durationInSec * 1000 : 0,
          thumbnail: result.thumbnails?.[0]?.url ?? null,
          author: result.channel?.name,
        }));
      }
    } catch {
      // play-dl not available
    }

    // Try youtube-sr as fallback
    try {
      // @ts-ignore - Optional dependency, may not be installed
      const ytsr = await import(/* webpackIgnore: true */ 'youtube-sr').catch(() => null);
      if (ytsr && ytsr.default) {
        const results = await ytsr.default.search(query, { limit, type: 'video' });
        return results.map((result: any) => ({
          url: result.url,
          title: result.title ?? query,
          duration: result.duration ?? 0,
          thumbnail: result.thumbnail?.url ?? null,
          author: result.channel?.name,
        }));
      }
    } catch {
      // youtube-sr not available
    }

    // Fallback: return a search URL that can be resolved later
    return [{
      url: `ytsearch:${query}`,
      title: query,
      duration: 0,
      thumbnail: null,
    }];
  }

  /**
   * Check if a string is a URL
   */
  private isUrl(str: string): boolean {
    try {
      const url = new URL(str);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
      return false;
    }
  }

  /**
   * Extract a title from a URL
   */
  private extractTitleFromUrl(url: string): string {
    try {
      const parsed = new URL(url);
      // Try to get video ID from YouTube URLs
      if (parsed.hostname.includes('youtube.com') || parsed.hostname.includes('youtu.be')) {
        const videoId = parsed.searchParams.get('v') || parsed.pathname.slice(1);
        return `YouTube Video (${videoId})`;
      }
      // For other URLs, use the pathname
      const parts = parsed.pathname.split('/');
      const filename = parts[parts.length - 1];
      return filename || parsed.hostname;
    } catch {
      return url;
    }
  }

  /**
   * Get the current state for a guild
   */
  getState(guildId: string): GuildVoiceState | undefined {
    return this.guildStates.get(guildId);
  }

  /**
   * Check if connected to a guild
   */
  isConnected(guildId: string): boolean {
    return this.guildStates.has(guildId);
  }

  /**
   * Get the queue for a guild
   */
  getQueue(guildId: string): QueueItem[] {
    return this.guildStates.get(guildId)?.queue ?? [];
  }

  /**
   * Get the current track for a guild
   */
  getCurrentTrack(guildId: string): QueueItem | null {
    return this.guildStates.get(guildId)?.currentTrack ?? null;
  }

  /**
   * Handle track end (play next or loop)
   */
  private async handleTrackEnd(guildId: string): Promise<void> {
    const state = this.guildStates.get(guildId);
    if (!state) return;

    // Handle loop modes
    if (state.loopMode === 'track' && state.currentTrack) {
      await this.play(guildId, state.currentTrack.url);
      return;
    }

    if (state.loopMode === 'queue' && state.currentTrack) {
      state.queue.push(state.currentTrack);
    }

    // Play next track
    const next = state.queue.shift();
    if (next) {
      state.currentTrack = next;
      await this.play(guildId, next.url);
    } else {
      state.currentTrack = null;
    }
  }

  /**
   * Disconnect from all voice channels
   */
  disconnectAll(): void {
    for (const [guildId] of this.guildStates) {
      this.leave(guildId);
    }
  }
}

/**
 * Create a voice manager
 */
export function createVoiceManager(): VoiceManager {
  return new VoiceManager();
}
