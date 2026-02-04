/**
 * Music builtin module
 * Handles audio playback, queue management, and filters
 */

import type { FurlowSpec, CommandDefinition, EventHandler, TableDefinition } from '@furlow/schema';

export interface MusicConfig {
  /** Default volume (0-100) */
  defaultVolume?: number;
  /** Maximum queue size */
  maxQueueSize?: number;
  /** DJ role (required for some commands) */
  djRole?: string;
  /** Stay in channel when queue empty */
  stayInChannel?: boolean;
  /** Leave after idle (seconds) */
  leaveAfterIdle?: number;
  /** Allow seeking */
  allowSeeking?: boolean;
  /** Allow filters */
  allowFilters?: boolean;
  /** Show now playing messages */
  announceNowPlaying?: boolean;
  /** Announce channel */
  announceChannel?: string;
}

export const musicTables: Record<string, TableDefinition> = {
  music_playlists: {
    columns: {
      id: { type: 'number', primary: true },
      guild_id: { type: 'string', index: true },
      user_id: { type: 'string', index: true },
      name: { type: 'string' },
      tracks: { type: 'json' },
      created_at: { type: 'timestamp' },
    },
  },
};

export const musicCommands: CommandDefinition[] = [
  {
    name: 'play',
    description: 'Play a song or add to queue',
    options: [
      { name: 'query', description: 'Song URL or search query', type: 'string', required: true },
    ],
    actions: [
      // Check if user is in voice channel
      {
        action: 'flow_if',
        condition: '!member.voice.channel',
        then: [
          { action: 'reply', content: 'You must be in a voice channel!', ephemeral: true },
          { action: 'abort' },
        ],
      },
      // Join voice channel if not already
      {
        action: 'voice_join',
        channel: '${member.voice.channel.id}',
      },
      // Search/resolve track
      {
        action: 'voice_search',
        query: '${args.query}',
        as: 'track',
      },
      {
        action: 'flow_if',
        condition: '!track',
        then: [
          { action: 'reply', content: 'No results found for: ${args.query}', ephemeral: true },
          { action: 'abort' },
        ],
      },
      // Add to queue
      {
        action: 'queue_add',
        track: '${track}',
        requester: '${user.id}',
      },
      {
        action: 'reply',
        embed: {
          title: 'Added to Queue',
          description: '[${track.title}](${track.url})',
          thumbnail: '${track.thumbnail}',
          color: '#57f287',
          fields: [
            { name: 'Duration', value: '${formatDuration(track.duration)}', inline: true },
            { name: 'Requested by', value: '${user}', inline: true },
          ],
        },
      },
    ],
  },
  {
    name: 'skip',
    description: 'Skip the current song',
    actions: [
      {
        action: 'voice_skip',
      },
      {
        action: 'reply',
        content: 'Skipped the current song.',
        ephemeral: true,
      },
    ],
  },
  {
    name: 'stop',
    description: 'Stop playback and clear the queue',
    actions: [
      {
        action: 'voice_stop',
      },
      {
        action: 'queue_clear',
      },
      {
        action: 'reply',
        content: 'Stopped playback and cleared the queue.',
        ephemeral: true,
      },
    ],
  },
  {
    name: 'pause',
    description: 'Pause playback',
    actions: [
      {
        action: 'voice_pause',
      },
      {
        action: 'reply',
        content: 'Paused playback.',
        ephemeral: true,
      },
    ],
  },
  {
    name: 'resume',
    description: 'Resume playback',
    actions: [
      {
        action: 'voice_resume',
      },
      {
        action: 'reply',
        content: 'Resumed playback.',
        ephemeral: true,
      },
    ],
  },
  {
    name: 'queue',
    description: 'View the current queue',
    options: [
      { name: 'page', description: 'Page number', type: 'integer', required: false },
    ],
    actions: [
      {
        action: 'queue_get',
        as: 'queue',
      },
      {
        action: 'flow_if',
        condition: 'queue.tracks.length === 0',
        then: [
          { action: 'reply', content: 'The queue is empty!', ephemeral: true },
          { action: 'abort' },
        ],
      },
      {
        action: 'set',
        key: 'page',
        value: '${args.page || 1}',
      },
      {
        action: 'set',
        key: 'perPage',
        value: 10,
      },
      {
        action: 'set',
        key: 'start',
        value: '${(page - 1) * perPage}',
      },
      {
        action: 'set',
        key: 'queueList',
        value: '${queue.tracks.slice(start, start + perPage).map((t, i) => (start + i + 1) + ". [" + truncate(t.title, 40) + "](" + t.url + ") - " + formatDuration(t.duration)).join("\\n")}',
      },
      {
        action: 'reply',
        embed: {
          title: 'Queue',
          description: '**Now Playing:**\n[${queue.current.title}](${queue.current.url})\n\n**Up Next:**\n${queueList}',
          color: '#5865f2',
          footer: {
            text: 'Page ${page} | ${queue.tracks.length} tracks | Total: ${formatDuration(queue.totalDuration)}',
          },
        },
      },
    ],
  },
  {
    name: 'nowplaying',
    description: 'Show the currently playing song',
    actions: [
      {
        action: 'queue_get',
        as: 'queue',
      },
      {
        action: 'flow_if',
        condition: '!queue.current',
        then: [
          { action: 'reply', content: 'Nothing is playing!', ephemeral: true },
          { action: 'abort' },
        ],
      },
      {
        action: 'set',
        key: 'progress',
        value: '${queue.position / queue.current.duration}',
      },
      {
        action: 'set',
        key: 'progressBar',
        value: '${repeat("▓", floor(progress * 20)) + repeat("░", 20 - floor(progress * 20))}',
      },
      {
        action: 'reply',
        embed: {
          title: 'Now Playing',
          description: '[${queue.current.title}](${queue.current.url})',
          thumbnail: '${queue.current.thumbnail}',
          color: '#5865f2',
          fields: [
            { name: 'Progress', value: '${progressBar}\n${formatDuration(queue.position)} / ${formatDuration(queue.current.duration)}' },
            { name: 'Requested by', value: '<@${queue.current.requester}>', inline: true },
            { name: 'Volume', value: '${queue.volume}%', inline: true },
          ],
        },
      },
    ],
  },
  {
    name: 'volume',
    description: 'Set the volume',
    options: [
      { name: 'level', description: 'Volume level (0-100)', type: 'integer', required: true },
    ],
    actions: [
      {
        action: 'flow_if',
        condition: 'args.level < 0 || args.level > 100',
        then: [
          { action: 'reply', content: 'Volume must be between 0 and 100!', ephemeral: true },
          { action: 'abort' },
        ],
      },
      {
        action: 'voice_volume',
        level: '${args.level}',
      },
      {
        action: 'reply',
        content: 'Volume set to ${args.level}%',
        ephemeral: true,
      },
    ],
  },
  {
    name: 'shuffle',
    description: 'Shuffle the queue',
    actions: [
      {
        action: 'queue_shuffle',
      },
      {
        action: 'reply',
        content: 'Shuffled the queue!',
        ephemeral: true,
      },
    ],
  },
  {
    name: 'loop',
    description: 'Set loop mode',
    options: [
      { name: 'mode', description: 'Loop mode', type: 'string', required: true, choices: [
        { name: 'Off', value: 'off' },
        { name: 'Track', value: 'track' },
        { name: 'Queue', value: 'queue' },
      ]},
    ],
    actions: [
      {
        action: 'queue_loop',
        mode: '${args.mode}',
      },
      {
        action: 'reply',
        content: 'Loop mode set to: ${args.mode}',
        ephemeral: true,
      },
    ],
  },
  {
    name: 'seek',
    description: 'Seek to a position in the song',
    options: [
      { name: 'position', description: 'Position (e.g., 1:30, 90)', type: 'string', required: true },
    ],
    actions: [
      {
        action: 'flow_if',
        condition: '!config.music?.allowSeeking',
        then: [
          { action: 'reply', content: 'Seeking is disabled!', ephemeral: true },
          { action: 'abort' },
        ],
      },
      {
        action: 'voice_seek',
        position: '${parseDuration(args.position)}',
      },
      {
        action: 'reply',
        content: 'Seeked to ${args.position}',
        ephemeral: true,
      },
    ],
  },
  {
    name: 'filter',
    description: 'Apply an audio filter',
    options: [
      { name: 'filter', description: 'Filter to apply', type: 'string', required: true, choices: [
        { name: 'None', value: 'none' },
        { name: 'Bass Boost', value: 'bassboost' },
        { name: 'Nightcore', value: 'nightcore' },
        { name: 'Vaporwave', value: 'vaporwave' },
        { name: '8D', value: '8d' },
        { name: 'Tremolo', value: 'tremolo' },
        { name: 'Vibrato', value: 'vibrato' },
      ]},
    ],
    actions: [
      {
        action: 'flow_if',
        condition: '!config.music?.allowFilters',
        then: [
          { action: 'reply', content: 'Filters are disabled!', ephemeral: true },
          { action: 'abort' },
        ],
      },
      {
        action: 'voice_set_filter',
        filter: '${args.filter}',
      },
      {
        action: 'reply',
        content: 'Applied filter: ${args.filter}',
        ephemeral: true,
      },
    ],
  },
  {
    name: 'leave',
    description: 'Leave the voice channel',
    actions: [
      {
        action: 'voice_leave',
      },
      {
        action: 'reply',
        content: 'Left the voice channel.',
        ephemeral: true,
      },
    ],
  },
];

export const musicEventHandlers: EventHandler[] = [
  // Announce now playing
  {
    event: 'voice_track_start',
    condition: 'config.music?.announceNowPlaying',
    actions: [
      {
        action: 'send_message',
        channel: '${config.music.announceChannel || channel.id}',
        embed: {
          title: 'Now Playing',
          description: '[${track.title}](${track.url})',
          thumbnail: '${track.thumbnail}',
          color: '#5865f2',
          fields: [
            { name: 'Duration', value: '${formatDuration(track.duration)}', inline: true },
            { name: 'Requested by', value: '<@${track.requester}>', inline: true },
          ],
        },
      },
    ],
  },
  // Auto-leave when alone
  {
    event: 'voice_leave',
    condition: 'voiceChannel.members.filter(m => !m.user.bot).size === 0 && !config.music?.stayInChannel',
    actions: [
      { action: 'wait', duration: 30000 },
      {
        action: 'flow_if',
        condition: 'voiceChannel.members.filter(m => !m.user.bot).size === 0',
        then: [
          { action: 'voice_leave' },
        ],
      },
    ],
  },
];

export function getMusicSpec(config: MusicConfig = {}): Partial<FurlowSpec> {
  return {
    commands: musicCommands,
    events: musicEventHandlers,
    state: {
      tables: musicTables,
    },
  };
}
