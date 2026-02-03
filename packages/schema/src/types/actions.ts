/**
 * Action types
 */

import type { Expression, ExpressionValue, Duration, Snowflake, Color, SimpleCondition } from './common.js';
import type { EmbedDefinition } from './embeds.js';
import type { ComponentDefinition } from './components.js';

/** Base action interface */
export interface BaseAction {
  action: string;
  when?: SimpleCondition;
  error_handler?: string;
}

/** Send message action */
export interface SendMessageAction extends BaseAction {
  action: 'send_message';
  channel?: Expression;
  content?: Expression;
  embed?: EmbedDefinition | Expression;
  embeds?: EmbedDefinition[];
  components?: ComponentDefinition[] | Expression;
  reply?: boolean;
  ephemeral?: boolean;
  tts?: boolean;
  files?: (Expression | FileAttachment)[];
  allowed_mentions?: {
    parse?: ('users' | 'roles' | 'everyone')[];
    users?: Snowflake[];
    roles?: Snowflake[];
    replied_user?: boolean;
  };
  /** Store result in variable */
  as?: string;
}

/** File attachment */
export interface FileAttachment {
  attachment: Expression;
  name?: string;
  description?: string;
}

/** Reply action */
export interface ReplyAction extends BaseAction {
  action: 'reply';
  content?: Expression;
  embed?: EmbedDefinition;
  embeds?: EmbedDefinition[];
  components?: ComponentDefinition[];
  ephemeral?: boolean;
  /** File attachments */
  files?: (Expression | FileAttachment)[];
}

/** Defer action */
export interface DeferAction extends BaseAction {
  action: 'defer';
  ephemeral?: boolean;
}

/** Edit message action */
export interface EditMessageAction extends BaseAction {
  action: 'edit_message';
  /** Channel ID */
  channel?: Expression;
  /** Message ID - alias for 'message_id' */
  message?: Expression;
  /** Message ID - alias for 'message' */
  message_id?: Expression;
  content?: Expression;
  embed?: EmbedDefinition | Expression;
  embeds?: EmbedDefinition[];
  components?: ComponentDefinition[] | Expression;
}

/** Delete message action */
export interface DeleteMessageAction extends BaseAction {
  action: 'delete_message';
  /** Channel ID */
  channel?: Expression;
  /** Message ID - alias for 'message_id' */
  message?: Expression;
  /** Message ID - alias for 'message' */
  message_id?: Expression;
  delay?: Duration;
}

/** Bulk delete action */
export interface BulkDeleteAction extends BaseAction {
  action: 'bulk_delete';
  channel?: Expression;
  count?: number;
  filter?: SimpleCondition;
}

/** Add reaction action */
export interface AddReactionAction extends BaseAction {
  action: 'add_reaction';
  /** Channel ID */
  channel?: Expression;
  /** Message ID - alias for 'message_id' */
  message?: Expression;
  /** Message ID - alias for 'message' */
  message_id?: Expression;
  emoji: Expression;
}

/** Add reactions action */
export interface AddReactionsAction extends BaseAction {
  action: 'add_reactions';
  message_id?: Expression;
  emojis: Expression[];
}

/** Remove reaction action */
export interface RemoveReactionAction extends BaseAction {
  action: 'remove_reaction';
  message_id?: Expression;
  emoji: Expression;
  user_id?: Expression;
}

/** Clear reactions action */
export interface ClearReactionsAction extends BaseAction {
  action: 'clear_reactions';
  message_id?: Expression;
  emoji?: Expression;
}

/** Assign role action */
export interface AssignRoleAction extends BaseAction {
  action: 'assign_role';
  user?: Expression;
  role: Expression;
  reason?: Expression;
}

/** Remove role action */
export interface RemoveRoleAction extends BaseAction {
  action: 'remove_role';
  user?: Expression;
  role: Expression;
  reason?: Expression;
}

/** Toggle role action */
export interface ToggleRoleAction extends BaseAction {
  action: 'toggle_role';
  user?: Expression;
  role: Expression;
  reason?: Expression;
}

/** Set nickname action */
export interface SetNicknameAction extends BaseAction {
  action: 'set_nickname';
  user?: Expression;
  nickname: Expression;
  reason?: Expression;
}

/** Kick action */
export interface KickAction extends BaseAction {
  action: 'kick';
  user: Expression;
  reason?: Expression;
  dm_user?: boolean;
  dm_message?: Expression;
}

/** Ban action */
export interface BanAction extends BaseAction {
  action: 'ban';
  user: Expression;
  reason?: Expression;
  delete_message_days?: number;
  dm_user?: boolean;
  dm_message?: Expression;
}

/** Unban action */
export interface UnbanAction extends BaseAction {
  action: 'unban';
  user: Expression;
  reason?: Expression;
}

/** Timeout action */
export interface TimeoutAction extends BaseAction {
  action: 'timeout';
  user: Expression;
  duration: Duration;
  reason?: Expression;
  dm_user?: boolean;
  dm_message?: Expression;
}

/** Remove timeout action */
export interface RemoveTimeoutAction extends BaseAction {
  action: 'remove_timeout';
  user: Expression;
  reason?: Expression;
}

/** Send DM action */
export interface SendDMAction extends BaseAction {
  action: 'send_dm';
  user: Expression;
  content?: Expression;
  embed?: EmbedDefinition | Expression;
  embeds?: EmbedDefinition[];
}

/** Move member action */
export interface MoveMemberAction extends BaseAction {
  action: 'move_member';
  user: Expression;
  channel: Expression;
}

/** Disconnect member action */
export interface DisconnectMemberAction extends BaseAction {
  action: 'disconnect_member';
  user: Expression;
  reason?: Expression;
}

/** Server mute action */
export interface ServerMuteAction extends BaseAction {
  action: 'server_mute';
  user: Expression;
  muted: boolean;
  reason?: Expression;
}

/** Server deafen action */
export interface ServerDeafenAction extends BaseAction {
  action: 'server_deafen';
  user: Expression;
  deafened: boolean;
  reason?: Expression;
}

/** Permission overwrite definition */
export interface PermissionOverwrite {
  id: Expression;
  type?: 'role' | 'member';
  allow?: string[] | Expression;
  deny?: string[] | Expression;
}

/** Create channel action */
export interface CreateChannelAction extends BaseAction {
  action: 'create_channel';
  name: Expression;
  type: 'text' | 'voice' | 'category' | 'announcement' | 'stage' | 'forum';
  parent?: Expression;
  topic?: Expression;
  nsfw?: boolean;
  rate_limit?: number;
  bitrate?: number;
  user_limit?: number;
  position?: number;
  permission_overwrites?: (PermissionOverwrite | Expression)[] | Record<string, Record<string, boolean>>;
  as?: string;
}

/** Edit channel action */
export interface EditChannelAction extends BaseAction {
  action: 'edit_channel';
  channel: Expression;
  name?: Expression;
  topic?: Expression;
  nsfw?: boolean;
  rate_limit?: number;
  bitrate?: number;
  user_limit?: number;
  position?: number;
  parent?: Expression;
}

/** Delete channel action */
export interface DeleteChannelAction extends BaseAction {
  action: 'delete_channel';
  channel: Expression;
  reason?: Expression;
}

/** Create thread action */
export interface CreateThreadAction extends BaseAction {
  action: 'create_thread';
  name: Expression;
  message?: Expression;
  auto_archive_duration?: 60 | 1440 | 4320 | 10080;
  type?: 'public' | 'private';
  invitable?: boolean;
}

/** Archive thread action */
export interface ArchiveThreadAction extends BaseAction {
  action: 'archive_thread';
  thread: Expression;
  locked?: boolean;
}

/** Set channel permissions action */
export interface SetChannelPermissionsAction extends BaseAction {
  action: 'set_channel_permissions';
  channel: Expression;
  user?: Expression;
  role?: Expression;
  allow?: string[] | Expression;
  deny?: string[] | Expression;
}

/** Create role action */
export interface CreateRoleAction extends BaseAction {
  action: 'create_role';
  name: Expression;
  color?: Color;
  hoist?: boolean;
  mentionable?: boolean;
  permissions?: string[];
  position?: number;
}

/** Edit role action */
export interface EditRoleAction extends BaseAction {
  action: 'edit_role';
  role: Expression;
  name?: Expression;
  color?: Color;
  hoist?: boolean;
  mentionable?: boolean;
  permissions?: string[];
  position?: number;
}

/** Delete role action */
export interface DeleteRoleAction extends BaseAction {
  action: 'delete_role';
  role: Expression;
  reason?: Expression;
}

/** Set state action */
export interface SetAction extends BaseAction {
  action: 'set';
  /** Variable name - alias for 'var' */
  key?: string;
  /** Variable name - alias for 'key' */
  var?: string;
  value: ExpressionValue;
  scope?: 'global' | 'guild' | 'channel' | 'user' | 'member';
  /** Store result in variable */
  as?: string;
}

/** Increment action */
export interface IncrementAction extends BaseAction {
  action: 'increment';
  var: string;
  by?: number;
  scope?: 'global' | 'guild' | 'channel' | 'user' | 'member';
}

/** Decrement action */
export interface DecrementAction extends BaseAction {
  action: 'decrement';
  var: string;
  by?: number;
  scope?: 'global' | 'guild' | 'channel' | 'user' | 'member';
}

/** List push action */
export interface ListPushAction extends BaseAction {
  action: 'list_push';
  var?: string;
  key?: string;
  value: ExpressionValue;
  scope?: 'global' | 'guild' | 'channel' | 'user' | 'member';
}

/** List remove action */
export interface ListRemoveAction extends BaseAction {
  action: 'list_remove';
  var?: string;
  key?: string;
  value?: ExpressionValue;
  index?: number | Expression;
  scope?: 'global' | 'guild' | 'channel' | 'user' | 'member';
}

/** Set map action */
export interface SetMapAction extends BaseAction {
  action: 'set_map';
  var?: string;
  key?: string;
  map_key: Expression;
  value: ExpressionValue;
  scope?: 'global' | 'guild' | 'channel' | 'user' | 'member';
}

/** Delete map action */
export interface DeleteMapAction extends BaseAction {
  action: 'delete_map';
  var?: string;
  key?: string;
  map_key: Expression;
  scope?: 'global' | 'guild' | 'channel' | 'user' | 'member';
}

/** Database insert action */
export interface DbInsertAction extends BaseAction {
  action: 'db_insert';
  table: string;
  data: Record<string, ExpressionValue>;
  /** Store result in variable */
  as?: string;
}

/** Database update action */
export interface DbUpdateAction extends BaseAction {
  action: 'db_update';
  table: string;
  where: Record<string, ExpressionValue>;
  data: Record<string, ExpressionValue> | Expression;
  /** Upsert mode - insert if not exists */
  upsert?: boolean;
  /** Store result in variable */
  as?: string;
}

/** Database delete action */
export interface DbDeleteAction extends BaseAction {
  action: 'db_delete';
  table: string;
  where: Record<string, ExpressionValue>;
}

/** Database query action */
export interface DbQueryAction extends BaseAction {
  action: 'db_query';
  table: string;
  where?: Record<string, ExpressionValue>;
  select?: string[];
  order_by?: string;
  limit?: number | Expression;
  offset?: number | Expression;
  as: string;
}

/** Wait action */
export interface WaitAction extends BaseAction {
  action: 'wait';
  duration: Duration;
}

/** Log action */
export interface LogAction extends BaseAction {
  action: 'log';
  level?: 'debug' | 'info' | 'warn' | 'error';
  message: Expression;
}

/** Emit event action */
export interface EmitAction extends BaseAction {
  action: 'emit';
  event: string;
  data?: Record<string, Expression>;
}

/** Call flow action */
export interface CallFlowAction extends BaseAction {
  action: 'call_flow';
  flow: string;
  args?: Record<string, Expression>;
  as?: string;
}

/** Abort action */
export interface AbortAction extends BaseAction {
  action: 'abort';
  reason?: Expression;
}

/** Return action */
export interface ReturnAction extends BaseAction {
  action: 'return';
  value?: Expression;
}

/** Parallel action */
export interface ParallelAction extends BaseAction {
  action: 'parallel';
  actions: Action[];
}

/** Batch action */
export interface BatchAction extends BaseAction {
  action: 'batch';
  items: Expression;
  each: Action | Action[];
  as?: string;
  concurrency?: number;
}

/** Repeat action */
export interface RepeatAction extends BaseAction {
  action: 'repeat';
  times: number;
  do: Action[];
  as?: string;
}

/** While action */
export interface FlowWhileAction extends BaseAction {
  action: 'flow_while';
  while: SimpleCondition;
  do: Action[];
  max_iterations?: number;
}

/** If action */
export interface FlowIfAction extends BaseAction {
  action: 'flow_if';
  /** Condition - alias for 'if' */
  condition?: SimpleCondition;
  /** Condition - alias for 'condition' */
  if?: SimpleCondition;
  then: Action[];
  else?: Action[];
}

/** Switch action */
export interface FlowSwitchAction extends BaseAction {
  action: 'flow_switch';
  value: Expression;
  cases: Record<string, Action[]>;
  default?: Action[];
}

/** Try action */
export interface TryAction extends BaseAction {
  action: 'try';
  do: Action[];
  catch?: Action[];
  finally?: Action[];
}

/** Show modal action */
export interface ShowModalAction extends BaseAction {
  action: 'show_modal';
  modal: string | ComponentDefinition;
}

/** Update message action */
export interface UpdateMessageAction extends BaseAction {
  action: 'update_message';
  content?: Expression;
  embed?: EmbedDefinition;
  embeds?: EmbedDefinition[];
  components?: ComponentDefinition[];
}

/** Voice join action */
export interface VoiceJoinAction extends BaseAction {
  action: 'voice_join';
  channel: Expression;
  self_deaf?: boolean;
  self_mute?: boolean;
}

/** Voice leave action */
export interface VoiceLeaveAction extends BaseAction {
  action: 'voice_leave';
  guild?: Expression;
}

/** Voice play action */
export interface VoicePlayAction extends BaseAction {
  action: 'voice_play';
  source: Expression;
  volume?: number;
  seek?: Duration;
}

/** Voice pause action */
export interface VoicePauseAction extends BaseAction {
  action: 'voice_pause';
}

/** Voice resume action */
export interface VoiceResumeAction extends BaseAction {
  action: 'voice_resume';
}

/** Voice stop action */
export interface VoiceStopAction extends BaseAction {
  action: 'voice_stop';
}

/** Voice skip action */
export interface VoiceSkipAction extends BaseAction {
  action: 'voice_skip';
}

/** Voice seek action */
export interface VoiceSeekAction extends BaseAction {
  action: 'voice_seek';
  position: Duration;
}

/** Voice volume action */
export interface VoiceVolumeAction extends BaseAction {
  action: 'voice_volume';
  /** Volume level - alias for 'level' */
  volume?: number | Expression;
  /** Volume level - alias for 'volume' */
  level?: number | Expression;
}

/** Voice set filter action */
export interface VoiceSetFilterAction extends BaseAction {
  action: 'voice_set_filter';
  filter: string | Expression;
  enabled?: boolean;
  options?: Record<string, unknown>;
}

/** Voice search action */
export interface VoiceSearchAction extends BaseAction {
  action: 'voice_search';
  query: Expression;
  /** Maximum number of results to return */
  limit?: number | Expression;
  /** Source to search (youtube, spotify, soundcloud) */
  source?: string | Expression;
  as?: string;
}

/** Queue get action */
export interface QueueGetAction extends BaseAction {
  action: 'queue_get';
  as?: string;
}

/** Queue add action */
export interface QueueAddAction extends BaseAction {
  action: 'queue_add';
  /** Track source URL or search query */
  source?: Expression;
  /** Track object from voice_search */
  track?: Expression;
  /** User who requested the track */
  requester?: Expression;
  position?: number | 'next' | 'last';
}

/** Queue remove action */
export interface QueueRemoveAction extends BaseAction {
  action: 'queue_remove';
  position: number;
}

/** Queue clear action */
export interface QueueClearAction extends BaseAction {
  action: 'queue_clear';
}

/** Queue shuffle action */
export interface QueueShuffleAction extends BaseAction {
  action: 'queue_shuffle';
}

/** Queue loop action */
export interface QueueLoopAction extends BaseAction {
  action: 'queue_loop';
  mode: 'off' | 'track' | 'queue' | Expression;
}

/** Pipe request action */
export interface PipeRequestAction extends BaseAction {
  action: 'pipe_request';
  pipe: string;
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path?: string;
  body?: Record<string, Expression>;
  headers?: Record<string, Expression>;
  as?: string;
}

/** Pipe send action */
export interface PipeSendAction extends BaseAction {
  action: 'pipe_send';
  pipe: string;
  data: Record<string, Expression>;
}

/** Webhook send action */
export interface WebhookSendAction extends BaseAction {
  action: 'webhook_send';
  url: Expression;
  content?: Expression;
  username?: Expression;
  avatar_url?: Expression;
  embeds?: EmbedDefinition[];
}

/** Create timer action */
export interface CreateTimerAction extends BaseAction {
  action: 'create_timer';
  id: string;
  duration: Duration;
  event: string;
  data?: Record<string, Expression>;
}

/** Cancel timer action */
export interface CancelTimerAction extends BaseAction {
  action: 'cancel_timer';
  id: string;
}

/** Counter increment action */
export interface CounterIncrementAction extends BaseAction {
  action: 'counter_increment';
  name: string;
  value?: number;
  labels?: Record<string, Expression>;
}

/** Record metric action */
export interface RecordMetricAction extends BaseAction {
  action: 'record_metric';
  name: string;
  type: 'counter' | 'gauge' | 'histogram';
  value: number;
  labels?: Record<string, Expression>;
}

/** Canvas render action */
export interface CanvasRenderAction extends BaseAction {
  action: 'canvas_render';
  generator: Expression;
  context?: Record<string, Expression>;
  as?: string;
}

/** Union of all action types */
export type Action =
  | SendMessageAction
  | ReplyAction
  | DeferAction
  | EditMessageAction
  | DeleteMessageAction
  | BulkDeleteAction
  | AddReactionAction
  | AddReactionsAction
  | RemoveReactionAction
  | ClearReactionsAction
  | AssignRoleAction
  | RemoveRoleAction
  | ToggleRoleAction
  | SetNicknameAction
  | KickAction
  | BanAction
  | UnbanAction
  | TimeoutAction
  | RemoveTimeoutAction
  | SendDMAction
  | MoveMemberAction
  | DisconnectMemberAction
  | ServerMuteAction
  | ServerDeafenAction
  | CreateChannelAction
  | EditChannelAction
  | DeleteChannelAction
  | CreateThreadAction
  | ArchiveThreadAction
  | SetChannelPermissionsAction
  | CreateRoleAction
  | EditRoleAction
  | DeleteRoleAction
  | SetAction
  | IncrementAction
  | DecrementAction
  | ListPushAction
  | ListRemoveAction
  | SetMapAction
  | DeleteMapAction
  | DbInsertAction
  | DbUpdateAction
  | DbDeleteAction
  | DbQueryAction
  | WaitAction
  | LogAction
  | EmitAction
  | CallFlowAction
  | AbortAction
  | ReturnAction
  | ParallelAction
  | BatchAction
  | RepeatAction
  | FlowWhileAction
  | FlowIfAction
  | FlowSwitchAction
  | TryAction
  | ShowModalAction
  | UpdateMessageAction
  | VoiceJoinAction
  | VoiceLeaveAction
  | VoicePlayAction
  | VoicePauseAction
  | VoiceResumeAction
  | VoiceStopAction
  | VoiceSkipAction
  | VoiceSeekAction
  | VoiceVolumeAction
  | VoiceSetFilterAction
  | QueueAddAction
  | QueueRemoveAction
  | QueueClearAction
  | QueueShuffleAction
  | QueueLoopAction
  | PipeRequestAction
  | PipeSendAction
  | WebhookSendAction
  | CreateTimerAction
  | CancelTimerAction
  | CounterIncrementAction
  | RecordMetricAction
  | CanvasRenderAction
  | VoiceSearchAction
  | QueueGetAction;
