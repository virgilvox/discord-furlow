/**
 * Voice and music action handlers
 */

import type { ActionRegistry } from '../registry.js';
import type { ActionHandler, ActionContext, ActionResult } from '../types.js';
import type { HandlerDependencies } from './index.js';
import type {
  VoiceJoinAction,
  VoiceLeaveAction,
  VoicePlayAction,
  VoicePauseAction,
  VoiceResumeAction,
  VoiceStopAction,
  VoiceSkipAction,
  VoiceSeekAction,
  VoiceVolumeAction,
  VoiceSetFilterAction,
  VoiceSearchAction,
  QueueAddAction,
  QueueRemoveAction,
  QueueClearAction,
  QueueShuffleAction,
  QueueLoopAction,
  QueueGetAction,
} from '@furlow/schema';
import { ChannelType, type VoiceChannel, type StageChannel } from 'discord.js';

/**
 * Parse duration string to milliseconds
 * Supports: "1m30s", "90s", "5m", "1h", "1h30m", "1500ms", or plain numbers (ms)
 */
function parseDuration(duration: string | number): number {
  if (typeof duration === 'number') return duration;

  // Handle compound formats like "1m30s" or "1h30m"
  const compoundMatch = duration.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?(?:(\d+)ms)?$/);
  if (compoundMatch && (compoundMatch[1] || compoundMatch[2] || compoundMatch[3] || compoundMatch[4])) {
    const hours = parseInt(compoundMatch[1] || '0', 10);
    const minutes = parseInt(compoundMatch[2] || '0', 10);
    const seconds = parseInt(compoundMatch[3] || '0', 10);
    const ms = parseInt(compoundMatch[4] || '0', 10);
    return (hours * 60 * 60 * 1000) + (minutes * 60 * 1000) + (seconds * 1000) + ms;
  }

  // Handle simple formats like "90s", "5m", etc.
  const simpleMatch = duration.match(/^(\d+)(ms|s|m|h)?$/);
  if (!simpleMatch) return 0;

  const value = parseInt(simpleMatch[1]!, 10);
  const unit = simpleMatch[2] ?? 'ms';

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

/**
 * Get voice manager from context
 */
function getVoiceManager(context: ActionContext): any {
  return context._voiceManager || (context._deps as any)?.voiceManager;
}

/**
 * Voice join action handler
 */
const voiceJoinHandler: ActionHandler<VoiceJoinAction> = {
  name: 'voice_join',
  async execute(config, context): Promise<ActionResult> {
    const deps = context._deps as HandlerDependencies;
    const { evaluator, client } = deps;
    const voiceManager = getVoiceManager(context);

    if (!voiceManager) {
      return { success: false, error: new Error('Voice manager not available') };
    }

    const channelId = await evaluator.interpolate(String(config.channel), context);
    const channel = await client.channels.fetch(channelId.replace(/[<#>]/g, ''));

    if (!channel || (channel.type !== ChannelType.GuildVoice && channel.type !== ChannelType.GuildStageVoice)) {
      return { success: false, error: new Error('Voice channel not found') };
    }

    try {
      await voiceManager.join(channel as VoiceChannel | StageChannel, {
        selfDeaf: config.self_deaf,
        selfMute: config.self_mute,
      });
      return { success: true };
    } catch (err) {
      return { success: false, error: err as Error };
    }
  },
};

/**
 * Voice leave action handler
 */
const voiceLeaveHandler: ActionHandler<VoiceLeaveAction> = {
  name: 'voice_leave',
  async execute(config, context): Promise<ActionResult> {
    const deps = context._deps as HandlerDependencies;
    const { evaluator } = deps;
    const voiceManager = getVoiceManager(context);

    if (!voiceManager) {
      return { success: false, error: new Error('Voice manager not available') };
    }

    let guildId: string;
    if (config.guild) {
      guildId = await evaluator.interpolate(String(config.guild), context);
    } else {
      guildId = context.guildId || (context.guild as any)?.id;
    }

    if (!guildId) {
      return { success: false, error: new Error('Guild not found') };
    }

    try {
      voiceManager.leave(guildId);
      return { success: true };
    } catch (err) {
      return { success: false, error: err as Error };
    }
  },
};

/**
 * Voice play action handler
 */
const voicePlayHandler: ActionHandler<VoicePlayAction> = {
  name: 'voice_play',
  async execute(config, context): Promise<ActionResult> {
    const deps = context._deps as HandlerDependencies;
    const { evaluator } = deps;
    const voiceManager = getVoiceManager(context);

    if (!voiceManager) {
      return { success: false, error: new Error('Voice manager not available') };
    }

    const guildId = context.guildId || (context.guild as any)?.id;
    if (!guildId) {
      return { success: false, error: new Error('Guild not found') };
    }

    const source = await evaluator.interpolate(String(config.source), context);

    try {
      await voiceManager.play(guildId, source, {
        volume: config.volume,
        seek: config.seek ? parseDuration(String(config.seek)) : undefined,
      });
      return { success: true };
    } catch (err) {
      return { success: false, error: err as Error };
    }
  },
};

/**
 * Voice pause action handler
 */
const voicePauseHandler: ActionHandler<VoicePauseAction> = {
  name: 'voice_pause',
  async execute(config, context): Promise<ActionResult> {
    const voiceManager = getVoiceManager(context);

    if (!voiceManager) {
      return { success: false, error: new Error('Voice manager not available') };
    }

    const guildId = context.guildId || (context.guild as any)?.id;
    if (!guildId) {
      return { success: false, error: new Error('Guild not found') };
    }

    try {
      voiceManager.pause(guildId);
      return { success: true };
    } catch (err) {
      return { success: false, error: err as Error };
    }
  },
};

/**
 * Voice resume action handler
 */
const voiceResumeHandler: ActionHandler<VoiceResumeAction> = {
  name: 'voice_resume',
  async execute(config, context): Promise<ActionResult> {
    const voiceManager = getVoiceManager(context);

    if (!voiceManager) {
      return { success: false, error: new Error('Voice manager not available') };
    }

    const guildId = context.guildId || (context.guild as any)?.id;
    if (!guildId) {
      return { success: false, error: new Error('Guild not found') };
    }

    try {
      voiceManager.resume(guildId);
      return { success: true };
    } catch (err) {
      return { success: false, error: err as Error };
    }
  },
};

/**
 * Voice stop action handler
 */
const voiceStopHandler: ActionHandler<VoiceStopAction> = {
  name: 'voice_stop',
  async execute(config, context): Promise<ActionResult> {
    const voiceManager = getVoiceManager(context);

    if (!voiceManager) {
      return { success: false, error: new Error('Voice manager not available') };
    }

    const guildId = context.guildId || (context.guild as any)?.id;
    if (!guildId) {
      return { success: false, error: new Error('Guild not found') };
    }

    try {
      voiceManager.stop(guildId);
      return { success: true };
    } catch (err) {
      return { success: false, error: err as Error };
    }
  },
};

/**
 * Voice skip action handler
 */
const voiceSkipHandler: ActionHandler<VoiceSkipAction> = {
  name: 'voice_skip',
  async execute(config, context): Promise<ActionResult> {
    const voiceManager = getVoiceManager(context);

    if (!voiceManager) {
      return { success: false, error: new Error('Voice manager not available') };
    }

    const guildId = context.guildId || (context.guild as any)?.id;
    if (!guildId) {
      return { success: false, error: new Error('Guild not found') };
    }

    try {
      voiceManager.skip(guildId);
      return { success: true };
    } catch (err) {
      return { success: false, error: err as Error };
    }
  },
};

/**
 * Voice seek action handler
 */
const voiceSeekHandler: ActionHandler<VoiceSeekAction> = {
  name: 'voice_seek',
  async execute(config, context): Promise<ActionResult> {
    const deps = context._deps as HandlerDependencies;
    const { evaluator } = deps;
    const voiceManager = getVoiceManager(context);

    if (!voiceManager) {
      return { success: false, error: new Error('Voice manager not available') };
    }

    const guildId = context.guildId || (context.guild as any)?.id;
    if (!guildId) {
      return { success: false, error: new Error('Guild not found') };
    }

    // Parse position - can be duration string or expression
    let position: number;
    const positionValue = config.position;
    if (typeof positionValue === 'string') {
      // Check if it's a duration string (e.g., "1m30s", "90s")
      if (/^\d+[smh]?$/.test(positionValue) || /^\d+m\d+s$/.test(positionValue)) {
        position = parseDuration(positionValue);
      } else {
        position = await evaluator.evaluate<number>(positionValue, context);
      }
    } else {
      position = positionValue as number;
    }

    try {
      const success = await voiceManager.seek(guildId, position);
      if (!success) {
        return { success: false, error: new Error('No track currently playing') };
      }
      return { success: true, data: { position } };
    } catch (err) {
      return { success: false, error: err as Error };
    }
  },
};

/**
 * Voice volume action handler
 */
const voiceVolumeHandler: ActionHandler<VoiceVolumeAction> = {
  name: 'voice_volume',
  async execute(config, context): Promise<ActionResult> {
    const deps = context._deps as HandlerDependencies;
    const { evaluator } = deps;
    const voiceManager = getVoiceManager(context);

    if (!voiceManager) {
      return { success: false, error: new Error('Voice manager not available') };
    }

    const guildId = context.guildId || (context.guild as any)?.id;
    if (!guildId) {
      return { success: false, error: new Error('Guild not found') };
    }

    let volume: number;
    const volumeVal = config.volume || config.level;
    if (typeof volumeVal === 'string') {
      volume = await evaluator.evaluate<number>(volumeVal, context);
    } else {
      volume = volumeVal as number;
    }

    try {
      voiceManager.setVolume(guildId, volume);
      return { success: true };
    } catch (err) {
      return { success: false, error: err as Error };
    }
  },
};

/**
 * Voice set filter action handler
 */
const voiceSetFilterHandler: ActionHandler<VoiceSetFilterAction> = {
  name: 'voice_set_filter',
  async execute(config, context): Promise<ActionResult> {
    const deps = context._deps as HandlerDependencies;
    const { evaluator } = deps;
    const voiceManager = getVoiceManager(context);

    if (!voiceManager) {
      return { success: false, error: new Error('Voice manager not available') };
    }

    const guildId = context.guildId || (context.guild as any)?.id;
    if (!guildId) {
      return { success: false, error: new Error('Guild not found') };
    }

    const filter = await evaluator.interpolate(String(config.filter), context);
    const enabled = config.enabled !== false;

    // Validate filter name
    const validFilters = ['bassboost', 'nightcore', 'vaporwave', '8d', 'treble', 'normalizer', 'karaoke', 'tremolo', 'vibrato', 'reverse'];
    if (!validFilters.includes(filter)) {
      return { success: false, error: new Error(`Invalid filter: ${filter}. Valid filters: ${validFilters.join(', ')}`) };
    }

    try {
      const success = await voiceManager.setFilter(guildId, filter as any, enabled);
      if (!success) {
        return { success: false, error: new Error('Not connected to voice') };
      }
      return { success: true, data: { filter, enabled } };
    } catch (err) {
      return { success: false, error: err as Error };
    }
  },
};

/**
 * Voice search action handler
 */
const voiceSearchHandler: ActionHandler<VoiceSearchAction> = {
  name: 'voice_search',
  async execute(config, context): Promise<ActionResult> {
    const deps = context._deps as HandlerDependencies;
    const { evaluator } = deps;
    const voiceManager = getVoiceManager(context);

    const query = await evaluator.interpolate(String(config.query), context);

    // Determine limit
    let limit = 5;
    if (config.limit !== undefined) {
      if (typeof config.limit === 'number') {
        limit = config.limit;
      } else {
        limit = await evaluator.evaluate<number>(String(config.limit), context);
      }
    }

    // Determine source if specified
    let source: string | undefined;
    if (config.source) {
      source = await evaluator.interpolate(String(config.source), context);
    }

    try {
      let results: any[];

      // Use voiceManager.search if available (full implementation)
      if (voiceManager && typeof voiceManager.search === 'function') {
        results = await voiceManager.search(query, { limit, source });
      } else {
        // Fallback: Check if query is a URL
        const isUrl = /^https?:\/\//i.test(query);
        if (isUrl) {
          results = [{
            url: query,
            title: query,
            duration: 0,
            thumbnail: null,
          }];
        } else {
          // Return ytsearch format that can be resolved by yt-dlp or similar
          results = [{
            url: `ytsearch:${query}`,
            title: query,
            duration: 0,
            thumbnail: null,
          }];
        }
      }

      if (config.as) {
        (context as Record<string, unknown>)[config.as] = results;
      }

      return { success: true, data: results };
    } catch (err) {
      return { success: false, error: err as Error };
    }
  },
};

/**
 * Queue get action handler
 */
const queueGetHandler: ActionHandler<QueueGetAction> = {
  name: 'queue_get',
  async execute(config, context): Promise<ActionResult> {
    const voiceManager = getVoiceManager(context);

    if (!voiceManager) {
      return { success: false, error: new Error('Voice manager not available') };
    }

    const guildId = context.guildId || (context.guild as any)?.id;
    if (!guildId) {
      return { success: false, error: new Error('Guild not found') };
    }

    const queue = voiceManager.getQueue(guildId);
    const currentTrack = voiceManager.getCurrentTrack(guildId);

    const result = {
      queue,
      currentTrack,
      length: queue.length,
    };

    if (config.as) {
      (context as Record<string, unknown>)[config.as] = result;
    }

    return { success: true, data: result };
  },
};

/**
 * Queue add action handler
 */
const queueAddHandler: ActionHandler<QueueAddAction> = {
  name: 'queue_add',
  async execute(config, context): Promise<ActionResult> {
    const deps = context._deps as HandlerDependencies;
    const { evaluator } = deps;
    const voiceManager = getVoiceManager(context);

    if (!voiceManager) {
      return { success: false, error: new Error('Voice manager not available') };
    }

    const guildId = context.guildId || (context.guild as any)?.id;
    if (!guildId) {
      return { success: false, error: new Error('Guild not found') };
    }

    let track: any;

    if (config.track) {
      // Track object from voice_search
      track = await evaluator.evaluate(String(config.track), context);
    } else if (config.source) {
      // URL or search query
      const source = await evaluator.interpolate(String(config.source), context);
      track = {
        url: source,
        title: source,
        requesterId: context.userId || (context.user as any)?.id,
      };
    } else {
      return { success: false, error: new Error('Either track or source is required') };
    }

    // Set requester if provided
    if (config.requester) {
      const requesterId = await evaluator.interpolate(String(config.requester), context);
      track.requesterId = requesterId.replace(/[<@!>]/g, '');
    }

    try {
      const position = voiceManager.addToQueue(guildId, track, config.position);
      return { success: true, data: { position } };
    } catch (err) {
      return { success: false, error: err as Error };
    }
  },
};

/**
 * Queue remove action handler
 */
const queueRemoveHandler: ActionHandler<QueueRemoveAction> = {
  name: 'queue_remove',
  async execute(config, context): Promise<ActionResult> {
    const voiceManager = getVoiceManager(context);

    if (!voiceManager) {
      return { success: false, error: new Error('Voice manager not available') };
    }

    const guildId = context.guildId || (context.guild as any)?.id;
    if (!guildId) {
      return { success: false, error: new Error('Guild not found') };
    }

    try {
      const removed = voiceManager.removeFromQueue(guildId, config.position);
      return { success: true, data: removed };
    } catch (err) {
      return { success: false, error: err as Error };
    }
  },
};

/**
 * Queue clear action handler
 */
const queueClearHandler: ActionHandler<QueueClearAction> = {
  name: 'queue_clear',
  async execute(config, context): Promise<ActionResult> {
    const voiceManager = getVoiceManager(context);

    if (!voiceManager) {
      return { success: false, error: new Error('Voice manager not available') };
    }

    const guildId = context.guildId || (context.guild as any)?.id;
    if (!guildId) {
      return { success: false, error: new Error('Guild not found') };
    }

    try {
      const count = voiceManager.clearQueue(guildId);
      return { success: true, data: { cleared: count } };
    } catch (err) {
      return { success: false, error: err as Error };
    }
  },
};

/**
 * Queue shuffle action handler
 */
const queueShuffleHandler: ActionHandler<QueueShuffleAction> = {
  name: 'queue_shuffle',
  async execute(config, context): Promise<ActionResult> {
    const voiceManager = getVoiceManager(context);

    if (!voiceManager) {
      return { success: false, error: new Error('Voice manager not available') };
    }

    const guildId = context.guildId || (context.guild as any)?.id;
    if (!guildId) {
      return { success: false, error: new Error('Guild not found') };
    }

    try {
      voiceManager.shuffleQueue(guildId);
      return { success: true };
    } catch (err) {
      return { success: false, error: err as Error };
    }
  },
};

/**
 * Queue loop action handler
 */
const queueLoopHandler: ActionHandler<QueueLoopAction> = {
  name: 'queue_loop',
  async execute(config, context): Promise<ActionResult> {
    const deps = context._deps as HandlerDependencies;
    const { evaluator } = deps;
    const voiceManager = getVoiceManager(context);

    if (!voiceManager) {
      return { success: false, error: new Error('Voice manager not available') };
    }

    const guildId = context.guildId || (context.guild as any)?.id;
    if (!guildId) {
      return { success: false, error: new Error('Guild not found') };
    }

    let mode: 'off' | 'track' | 'queue';
    if (typeof config.mode === 'string' && ['off', 'track', 'queue'].includes(config.mode)) {
      mode = config.mode as 'off' | 'track' | 'queue';
    } else {
      mode = await evaluator.evaluate<'off' | 'track' | 'queue'>(String(config.mode), context);
    }

    try {
      voiceManager.setLoopMode(guildId, mode);
      return { success: true };
    } catch (err) {
      return { success: false, error: err as Error };
    }
  },
};

/**
 * Register all voice handlers
 */
export function registerVoiceHandlers(
  registry: ActionRegistry,
  deps: HandlerDependencies
): void {
  registry.register(voiceJoinHandler);
  registry.register(voiceLeaveHandler);
  registry.register(voicePlayHandler);
  registry.register(voicePauseHandler);
  registry.register(voiceResumeHandler);
  registry.register(voiceStopHandler);
  registry.register(voiceSkipHandler);
  registry.register(voiceSeekHandler);
  registry.register(voiceVolumeHandler);
  registry.register(voiceSetFilterHandler);
  registry.register(voiceSearchHandler);
  registry.register(queueGetHandler);
  registry.register(queueAddHandler);
  registry.register(queueRemoveHandler);
  registry.register(queueClearHandler);
  registry.register(queueShuffleHandler);
  registry.register(queueLoopHandler);
}
