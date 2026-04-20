/**
 * Event types
 */

import type { SimpleCondition } from './common.js';
import type { Action } from './actions.js';

/** Discord gateway events */
export type DiscordEvent =
  // Guild events
  | 'guild_create'
  | 'guild_update'
  | 'guild_delete'
  | 'guild_available'
  | 'guild_unavailable'
  // Channel events
  | 'channel_create'
  | 'channel_update'
  | 'channel_delete'
  | 'channel_pins_update'
  // Thread events
  | 'thread_create'
  | 'thread_update'
  | 'thread_delete'
  | 'thread_list_sync'
  | 'thread_member_update'
  | 'thread_members_update'
  // Member events
  | 'guild_member_add'
  | 'guild_member_update'
  | 'guild_member_remove'
  | 'guild_members_chunk'
  // Role events
  | 'guild_role_create'
  | 'guild_role_update'
  | 'guild_role_delete'
  // Emoji/Sticker events
  | 'guild_emojis_update'
  | 'guild_stickers_update'
  // Ban events
  | 'guild_ban_add'
  | 'guild_ban_remove'
  // Message events
  | 'message_create'
  | 'message_update'
  | 'message_delete'
  | 'message_delete_bulk'
  // Reaction events
  | 'message_reaction_add'
  | 'message_reaction_remove'
  | 'message_reaction_remove_all'
  | 'message_reaction_remove_emoji'
  // Presence events
  | 'presence_update'
  | 'typing_start'
  // Voice events
  | 'voice_state_update'
  | 'voice_server_update'
  // Interaction events
  | 'interaction_create'
  // Invite events
  | 'invite_create'
  | 'invite_delete'
  // Integration events
  | 'integration_create'
  | 'integration_update'
  | 'integration_delete'
  // Webhook events
  | 'webhooks_update'
  // Stage events
  | 'stage_instance_create'
  | 'stage_instance_update'
  | 'stage_instance_delete'
  // Scheduled event events
  | 'guild_scheduled_event_create'
  | 'guild_scheduled_event_update'
  | 'guild_scheduled_event_delete'
  | 'guild_scheduled_event_user_add'
  | 'guild_scheduled_event_user_remove'
  // Automod events
  | 'auto_moderation_rule_create'
  | 'auto_moderation_rule_update'
  | 'auto_moderation_rule_delete'
  | 'auto_moderation_action_execution';

/** Custom FURLOW events (high-level abstractions) */
export type FurlowEvent =
  // Lifecycle
  | 'ready'
  | 'error'
  | 'warn'
  // Member lifecycle (convenience)
  | 'member_join'
  | 'member_leave'
  | 'member_ban'
  | 'member_unban'
  | 'member_boost'
  | 'member_unboost'
  // Message convenience
  | 'message'
  | 'message_edit'
  | 'message_delete'
  // Voice convenience
  | 'voice_join'
  | 'voice_leave'
  | 'voice_move'
  | 'voice_stream_start'
  | 'voice_stream_stop'
  // Timer events
  | 'timer_fire'
  // Custom events
  | 'custom';

/** Event handler definition */
export interface EventHandler {
  event: DiscordEvent | FurlowEvent | string;
  /** Condition expression - alias for 'when' */
  condition?: SimpleCondition;
  /** Condition expression - alias for 'condition' */
  when?: SimpleCondition;
  actions: Action[];
  debounce?: string;
  throttle?: string;
  once?: boolean;
  /**
   * Wallclock timeout for a single invocation of this handler. Accepts
   * duration strings like "30s", "500ms", "2m", or raw milliseconds.
   * When the timeout elapses, the context's AbortSignal is tripped so
   * in-flight actions can cooperate, and any further action dispatch is
   * refused. Defaults to the per-handler quota wallclock (30s).
   */
  timeout?: string | number;
  /**
   * Override the runtime fan-out cap for this event name. The router
   * only fires the first N matching handlers per emission, regardless
   * of how many are registered. Default 10 (set via `RouterOptions`).
   * When multiple handlers for the same event declare different values,
   * the first declaration wins.
   */
  maxHandlers?: number;
}

/** Events configuration */
export interface EventsConfig {
  handlers: EventHandler[];
}
