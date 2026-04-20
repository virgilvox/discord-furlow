/**
 * Action schemas for all 84 FURLOW actions
 * Organized by category for the Schema Builder
 */

export interface ActionField {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'expression' | 'select' | 'duration' | 'color' | 'actions';
  label: string;
  description?: string;
  required?: boolean;
  default?: unknown;
  options?: Array<{ label: string; value: string }>;
}

export interface ActionDefinition {
  name: string;
  description: string;
  fields: ActionField[];
}

export interface ActionCategory {
  name: string;
  icon: string;
  actions: ActionDefinition[];
}

export const actionCategories: ActionCategory[] = [
  {
    name: 'Message',
    icon: 'fas fa-message',
    actions: [
      {
        name: 'send_message',
        description: 'Send a message to a channel',
        fields: [
          { name: 'channel', type: 'expression', label: 'Channel' },
          { name: 'content', type: 'expression', label: 'Content' },
          { name: 'reply', type: 'boolean', label: 'Reply to trigger' },
          { name: 'ephemeral', type: 'boolean', label: 'Ephemeral' },
          { name: 'tts', type: 'boolean', label: 'Text-to-Speech' },
          { name: 'as', type: 'string', label: 'Store as variable' },
        ],
      },
      {
        name: 'reply',
        description: 'Reply to the current interaction',
        fields: [
          { name: 'content', type: 'expression', label: 'Content' },
          { name: 'ephemeral', type: 'boolean', label: 'Ephemeral' },
        ],
      },
      {
        name: 'defer',
        description: 'Defer the interaction response',
        fields: [
          { name: 'ephemeral', type: 'boolean', label: 'Ephemeral' },
        ],
      },
      {
        name: 'edit_message',
        description: 'Edit an existing message',
        fields: [
          { name: 'channel', type: 'expression', label: 'Channel' },
          { name: 'message', type: 'expression', label: 'Message ID' },
          { name: 'content', type: 'expression', label: 'New Content' },
        ],
      },
      {
        name: 'delete_message',
        description: 'Delete a message',
        fields: [
          { name: 'channel', type: 'expression', label: 'Channel' },
          { name: 'message', type: 'expression', label: 'Message ID' },
          { name: 'delay', type: 'duration', label: 'Delay' },
        ],
      },
      {
        name: 'bulk_delete',
        description: 'Bulk delete messages',
        fields: [
          { name: 'channel', type: 'expression', label: 'Channel' },
          { name: 'count', type: 'number', label: 'Count' },
        ],
      },
      {
        name: 'add_reaction',
        description: 'Add a reaction to a message',
        fields: [
          { name: 'message', type: 'expression', label: 'Message ID' },
          { name: 'emoji', type: 'expression', label: 'Emoji', required: true },
        ],
      },
      {
        name: 'add_reactions',
        description: 'Add multiple reactions to a message',
        fields: [
          { name: 'message_id', type: 'expression', label: 'Message ID' },
          { name: 'emojis', type: 'expression', label: 'Emojis (array)', required: true },
        ],
      },
      {
        name: 'remove_reaction',
        description: 'Remove a reaction from a message',
        fields: [
          { name: 'message_id', type: 'expression', label: 'Message ID' },
          { name: 'emoji', type: 'expression', label: 'Emoji', required: true },
          { name: 'user_id', type: 'expression', label: 'User ID' },
        ],
      },
      {
        name: 'clear_reactions',
        description: 'Clear reactions from a message',
        fields: [
          { name: 'message_id', type: 'expression', label: 'Message ID' },
          { name: 'emoji', type: 'expression', label: 'Specific Emoji' },
        ],
      },
    ],
  },
  {
    name: 'Member',
    icon: 'fas fa-user',
    actions: [
      {
        name: 'assign_role',
        description: 'Assign a role to a member',
        fields: [
          { name: 'user', type: 'expression', label: 'User' },
          { name: 'role', type: 'expression', label: 'Role', required: true },
          { name: 'reason', type: 'expression', label: 'Reason' },
        ],
      },
      {
        name: 'remove_role',
        description: 'Remove a role from a member',
        fields: [
          { name: 'user', type: 'expression', label: 'User' },
          { name: 'role', type: 'expression', label: 'Role', required: true },
          { name: 'reason', type: 'expression', label: 'Reason' },
        ],
      },
      {
        name: 'toggle_role',
        description: 'Toggle a role on a member',
        fields: [
          { name: 'user', type: 'expression', label: 'User' },
          { name: 'role', type: 'expression', label: 'Role', required: true },
          { name: 'reason', type: 'expression', label: 'Reason' },
        ],
      },
      {
        name: 'set_nickname',
        description: 'Set a member nickname',
        fields: [
          { name: 'user', type: 'expression', label: 'User' },
          { name: 'nickname', type: 'expression', label: 'Nickname', required: true },
          { name: 'reason', type: 'expression', label: 'Reason' },
        ],
      },
      {
        name: 'kick',
        description: 'Kick a member from the server',
        fields: [
          { name: 'user', type: 'expression', label: 'User', required: true },
          { name: 'reason', type: 'expression', label: 'Reason' },
          { name: 'dm_user', type: 'boolean', label: 'DM User' },
          { name: 'dm_message', type: 'expression', label: 'DM Message' },
        ],
      },
      {
        name: 'ban',
        description: 'Ban a member from the server',
        fields: [
          { name: 'user', type: 'expression', label: 'User', required: true },
          { name: 'reason', type: 'expression', label: 'Reason' },
          { name: 'delete_message_days', type: 'number', label: 'Delete Message Days' },
          { name: 'dm_user', type: 'boolean', label: 'DM User' },
          { name: 'dm_message', type: 'expression', label: 'DM Message' },
        ],
      },
      {
        name: 'unban',
        description: 'Unban a user',
        fields: [
          { name: 'user', type: 'expression', label: 'User', required: true },
          { name: 'reason', type: 'expression', label: 'Reason' },
        ],
      },
      {
        name: 'timeout',
        description: 'Timeout a member',
        fields: [
          { name: 'user', type: 'expression', label: 'User', required: true },
          { name: 'duration', type: 'duration', label: 'Duration', required: true },
          { name: 'reason', type: 'expression', label: 'Reason' },
          { name: 'dm_user', type: 'boolean', label: 'DM User' },
          { name: 'dm_message', type: 'expression', label: 'DM Message' },
        ],
      },
      {
        name: 'remove_timeout',
        description: 'Remove timeout from a member',
        fields: [
          { name: 'user', type: 'expression', label: 'User', required: true },
          { name: 'reason', type: 'expression', label: 'Reason' },
        ],
      },
      {
        name: 'send_dm',
        description: 'Send a direct message to a user',
        fields: [
          { name: 'user', type: 'expression', label: 'User', required: true },
          { name: 'content', type: 'expression', label: 'Content' },
        ],
      },
      {
        name: 'move_member',
        description: 'Move a member to a voice channel',
        fields: [
          { name: 'user', type: 'expression', label: 'User', required: true },
          { name: 'channel', type: 'expression', label: 'Channel', required: true },
        ],
      },
      {
        name: 'disconnect_member',
        description: 'Disconnect a member from voice',
        fields: [
          { name: 'user', type: 'expression', label: 'User', required: true },
          { name: 'reason', type: 'expression', label: 'Reason' },
        ],
      },
      {
        name: 'server_mute',
        description: 'Server mute a member',
        fields: [
          { name: 'user', type: 'expression', label: 'User', required: true },
          { name: 'muted', type: 'boolean', label: 'Muted', required: true },
          { name: 'reason', type: 'expression', label: 'Reason' },
        ],
      },
      {
        name: 'server_deafen',
        description: 'Server deafen a member',
        fields: [
          { name: 'user', type: 'expression', label: 'User', required: true },
          { name: 'deafened', type: 'boolean', label: 'Deafened', required: true },
          { name: 'reason', type: 'expression', label: 'Reason' },
        ],
      },
    ],
  },
  {
    name: 'Channel',
    icon: 'fas fa-hashtag',
    actions: [
      {
        name: 'create_channel',
        description: 'Create a new channel',
        fields: [
          { name: 'name', type: 'expression', label: 'Name', required: true },
          {
            name: 'type',
            type: 'select',
            label: 'Type',
            required: true,
            options: [
              { label: 'Text', value: 'text' },
              { label: 'Voice', value: 'voice' },
              { label: 'Category', value: 'category' },
              { label: 'Announcement', value: 'announcement' },
              { label: 'Stage', value: 'stage' },
              { label: 'Forum', value: 'forum' },
            ],
          },
          { name: 'parent', type: 'expression', label: 'Parent Category' },
          { name: 'topic', type: 'expression', label: 'Topic' },
          { name: 'as', type: 'string', label: 'Store as variable' },
        ],
      },
      {
        name: 'edit_channel',
        description: 'Edit a channel',
        fields: [
          { name: 'channel', type: 'expression', label: 'Channel', required: true },
          { name: 'name', type: 'expression', label: 'Name' },
          { name: 'topic', type: 'expression', label: 'Topic' },
          { name: 'nsfw', type: 'boolean', label: 'NSFW' },
        ],
      },
      {
        name: 'delete_channel',
        description: 'Delete a channel',
        fields: [
          { name: 'channel', type: 'expression', label: 'Channel', required: true },
          { name: 'reason', type: 'expression', label: 'Reason' },
        ],
      },
      {
        name: 'create_thread',
        description: 'Create a thread',
        fields: [
          { name: 'name', type: 'expression', label: 'Name', required: true },
          { name: 'message', type: 'expression', label: 'Message ID' },
          {
            name: 'type',
            type: 'select',
            label: 'Type',
            options: [
              { label: 'Public', value: 'public' },
              { label: 'Private', value: 'private' },
            ],
          },
        ],
      },
      {
        name: 'archive_thread',
        description: 'Archive a thread',
        fields: [
          { name: 'thread', type: 'expression', label: 'Thread', required: true },
          { name: 'locked', type: 'boolean', label: 'Lock' },
        ],
      },
      {
        name: 'set_channel_permissions',
        description: 'Set channel permissions',
        fields: [
          { name: 'channel', type: 'expression', label: 'Channel', required: true },
          { name: 'user', type: 'expression', label: 'User' },
          { name: 'role', type: 'expression', label: 'Role' },
          { name: 'allow', type: 'expression', label: 'Allow Permissions' },
          { name: 'deny', type: 'expression', label: 'Deny Permissions' },
        ],
      },
    ],
  },
  {
    name: 'Role',
    icon: 'fas fa-id-badge',
    actions: [
      {
        name: 'create_role',
        description: 'Create a new role',
        fields: [
          { name: 'name', type: 'expression', label: 'Name', required: true },
          { name: 'color', type: 'color', label: 'Color' },
          { name: 'hoist', type: 'boolean', label: 'Hoist' },
          { name: 'mentionable', type: 'boolean', label: 'Mentionable' },
        ],
      },
      {
        name: 'edit_role',
        description: 'Edit a role',
        fields: [
          { name: 'role', type: 'expression', label: 'Role', required: true },
          { name: 'name', type: 'expression', label: 'Name' },
          { name: 'color', type: 'color', label: 'Color' },
          { name: 'hoist', type: 'boolean', label: 'Hoist' },
          { name: 'mentionable', type: 'boolean', label: 'Mentionable' },
        ],
      },
      {
        name: 'delete_role',
        description: 'Delete a role',
        fields: [
          { name: 'role', type: 'expression', label: 'Role', required: true },
          { name: 'reason', type: 'expression', label: 'Reason' },
        ],
      },
    ],
  },
  {
    name: 'State',
    icon: 'fas fa-database',
    actions: [
      {
        name: 'set',
        description: 'Set a state variable',
        fields: [
          { name: 'var', type: 'string', label: 'Variable', required: true },
          { name: 'value', type: 'expression', label: 'Value', required: true },
          {
            name: 'scope',
            type: 'select',
            label: 'Scope',
            options: [
              { label: 'Global', value: 'global' },
              { label: 'Guild', value: 'guild' },
              { label: 'Channel', value: 'channel' },
              { label: 'User', value: 'user' },
              { label: 'Member', value: 'member' },
            ],
          },
        ],
      },
      {
        name: 'increment',
        description: 'Increment a numeric variable',
        fields: [
          { name: 'var', type: 'string', label: 'Variable', required: true },
          { name: 'by', type: 'number', label: 'By', default: 1 },
          {
            name: 'scope',
            type: 'select',
            label: 'Scope',
            options: [
              { label: 'Guild', value: 'guild' },
              { label: 'Channel', value: 'channel' },
              { label: 'User', value: 'user' },
              { label: 'Member', value: 'member' },
            ],
          },
        ],
      },
      {
        name: 'decrement',
        description: 'Decrement a numeric variable',
        fields: [
          { name: 'var', type: 'string', label: 'Variable', required: true },
          { name: 'by', type: 'number', label: 'By', default: 1 },
          {
            name: 'scope',
            type: 'select',
            label: 'Scope',
            options: [
              { label: 'Guild', value: 'guild' },
              { label: 'Channel', value: 'channel' },
              { label: 'User', value: 'user' },
              { label: 'Member', value: 'member' },
            ],
          },
        ],
      },
      {
        name: 'list_push',
        description: 'Push to a list variable',
        fields: [
          { name: 'var', type: 'string', label: 'Variable', required: true },
          { name: 'value', type: 'expression', label: 'Value', required: true },
          {
            name: 'scope',
            type: 'select',
            label: 'Scope',
            options: [
              { label: 'Guild', value: 'guild' },
              { label: 'Channel', value: 'channel' },
              { label: 'User', value: 'user' },
              { label: 'Member', value: 'member' },
            ],
          },
        ],
      },
      {
        name: 'list_remove',
        description: 'Remove from a list variable',
        fields: [
          { name: 'var', type: 'string', label: 'Variable', required: true },
          { name: 'value', type: 'expression', label: 'Value' },
          { name: 'index', type: 'number', label: 'Index' },
        ],
      },
      {
        name: 'set_map',
        description: 'Set a map entry',
        fields: [
          { name: 'var', type: 'string', label: 'Variable', required: true },
          { name: 'map_key', type: 'expression', label: 'Map Key', required: true },
          { name: 'value', type: 'expression', label: 'Value', required: true },
        ],
      },
      {
        name: 'delete_map',
        description: 'Delete a map entry',
        fields: [
          { name: 'var', type: 'string', label: 'Variable', required: true },
          { name: 'map_key', type: 'expression', label: 'Map Key', required: true },
        ],
      },
    ],
  },
  {
    name: 'Database',
    icon: 'fas fa-table',
    actions: [
      {
        name: 'db_insert',
        description: 'Insert into database',
        fields: [
          { name: 'table', type: 'string', label: 'Table', required: true },
          { name: 'as', type: 'string', label: 'Store as variable' },
        ],
      },
      {
        name: 'db_update',
        description: 'Update database records',
        fields: [
          { name: 'table', type: 'string', label: 'Table', required: true },
          { name: 'upsert', type: 'boolean', label: 'Upsert' },
          { name: 'as', type: 'string', label: 'Store as variable' },
        ],
      },
      {
        name: 'db_delete',
        description: 'Delete database records',
        fields: [
          { name: 'table', type: 'string', label: 'Table', required: true },
        ],
      },
      {
        name: 'db_query',
        description: 'Query the database',
        fields: [
          { name: 'table', type: 'string', label: 'Table', required: true },
          { name: 'limit', type: 'number', label: 'Limit' },
          { name: 'offset', type: 'number', label: 'Offset' },
          { name: 'as', type: 'string', label: 'Store as variable', required: true },
        ],
      },
    ],
  },
  {
    name: 'Flow Control',
    icon: 'fas fa-diagram-project',
    actions: [
      {
        name: 'call_flow',
        description: 'Call another flow',
        fields: [
          { name: 'flow', type: 'string', label: 'Flow Name', required: true },
          { name: 'as', type: 'string', label: 'Store result as' },
        ],
      },
      {
        name: 'abort',
        description: 'Abort execution',
        fields: [
          { name: 'reason', type: 'expression', label: 'Reason' },
        ],
      },
      {
        name: 'return',
        description: 'Return from flow',
        fields: [
          { name: 'value', type: 'expression', label: 'Return Value' },
        ],
      },
      {
        name: 'wait',
        description: 'Wait for a duration',
        fields: [
          { name: 'duration', type: 'duration', label: 'Duration', required: true },
        ],
      },
      {
        name: 'log',
        description: 'Log a message',
        fields: [
          {
            name: 'level',
            type: 'select',
            label: 'Level',
            options: [
              { label: 'Debug', value: 'debug' },
              { label: 'Info', value: 'info' },
              { label: 'Warn', value: 'warn' },
              { label: 'Error', value: 'error' },
            ],
          },
          { name: 'message', type: 'expression', label: 'Message', required: true },
        ],
      },
      {
        name: 'emit',
        description: 'Emit a custom event',
        fields: [
          { name: 'event', type: 'string', label: 'Event Name', required: true },
        ],
      },
      {
        name: 'flow_if',
        description: 'Conditional execution',
        fields: [
          { name: 'condition', type: 'expression', label: 'Condition', required: true },
          { name: 'then', type: 'actions', label: 'Then Actions' },
          { name: 'else', type: 'actions', label: 'Else Actions' },
        ],
      },
      {
        name: 'flow_switch',
        description: 'Switch case execution',
        fields: [
          { name: 'value', type: 'expression', label: 'Value', required: true },
        ],
      },
      {
        name: 'flow_while',
        description: 'While loop',
        fields: [
          { name: 'while', type: 'expression', label: 'Condition', required: true },
          { name: 'max_iterations', type: 'number', label: 'Max Iterations', default: 100 },
        ],
      },
      {
        name: 'parallel',
        description: 'Execute actions in parallel',
        fields: [],
      },
      {
        name: 'batch',
        description: 'Execute actions for each item',
        fields: [
          { name: 'items', type: 'expression', label: 'Items', required: true },
          { name: 'as', type: 'string', label: 'Item Variable' },
          { name: 'concurrency', type: 'number', label: 'Concurrency' },
        ],
      },
      {
        name: 'repeat',
        description: 'Repeat actions',
        fields: [
          { name: 'times', type: 'number', label: 'Times', required: true },
          { name: 'as', type: 'string', label: 'Index Variable' },
        ],
      },
      {
        name: 'try',
        description: 'Try-catch block',
        fields: [],
      },
    ],
  },
  {
    name: 'Voice',
    icon: 'fas fa-microphone',
    actions: [
      {
        name: 'voice_join',
        description: 'Join a voice channel',
        fields: [
          { name: 'channel', type: 'expression', label: 'Channel', required: true },
          { name: 'self_deaf', type: 'boolean', label: 'Self Deaf' },
          { name: 'self_mute', type: 'boolean', label: 'Self Mute' },
        ],
      },
      {
        name: 'voice_leave',
        description: 'Leave the voice channel',
        fields: [
          { name: 'guild', type: 'expression', label: 'Guild' },
        ],
      },
      {
        name: 'voice_play',
        description: 'Play audio',
        fields: [
          { name: 'source', type: 'expression', label: 'Source', required: true },
          { name: 'volume', type: 'number', label: 'Volume (0-100)' },
          { name: 'seek', type: 'duration', label: 'Start Position' },
        ],
      },
      {
        name: 'voice_pause',
        description: 'Pause playback',
        fields: [],
      },
      {
        name: 'voice_resume',
        description: 'Resume playback',
        fields: [],
      },
      {
        name: 'voice_stop',
        description: 'Stop playback',
        fields: [],
      },
      {
        name: 'voice_skip',
        description: 'Skip current track',
        fields: [],
      },
      {
        name: 'voice_seek',
        description: 'Seek to position',
        fields: [
          { name: 'position', type: 'duration', label: 'Position', required: true },
        ],
      },
      {
        name: 'voice_volume',
        description: 'Set volume',
        fields: [
          { name: 'volume', type: 'number', label: 'Volume (0-100)', required: true },
        ],
      },
      {
        name: 'voice_set_filter',
        description: 'Set audio filter',
        fields: [
          { name: 'filter', type: 'expression', label: 'Filter', required: true },
          { name: 'enabled', type: 'boolean', label: 'Enabled' },
        ],
      },
      {
        name: 'voice_search',
        description: 'Search for tracks',
        fields: [
          { name: 'query', type: 'expression', label: 'Query', required: true },
          { name: 'limit', type: 'number', label: 'Limit' },
          { name: 'source', type: 'expression', label: 'Source' },
          { name: 'as', type: 'string', label: 'Store as variable' },
        ],
      },
      {
        name: 'queue_add',
        description: 'Add to queue',
        fields: [
          { name: 'source', type: 'expression', label: 'Source' },
          { name: 'track', type: 'expression', label: 'Track' },
          { name: 'position', type: 'number', label: 'Position' },
        ],
      },
      {
        name: 'queue_remove',
        description: 'Remove from queue',
        fields: [
          { name: 'position', type: 'number', label: 'Position', required: true },
        ],
      },
      {
        name: 'queue_clear',
        description: 'Clear the queue',
        fields: [],
      },
      {
        name: 'queue_shuffle',
        description: 'Shuffle the queue',
        fields: [],
      },
      {
        name: 'queue_loop',
        description: 'Set loop mode',
        fields: [
          {
            name: 'mode',
            type: 'select',
            label: 'Mode',
            required: true,
            options: [
              { label: 'Off', value: 'off' },
              { label: 'Track', value: 'track' },
              { label: 'Queue', value: 'queue' },
            ],
          },
        ],
      },
      {
        name: 'queue_get',
        description: 'Get the queue',
        fields: [
          { name: 'as', type: 'string', label: 'Store as variable' },
        ],
      },
    ],
  },
  {
    name: 'Miscellaneous',
    icon: 'fas fa-ellipsis',
    actions: [
      {
        name: 'show_modal',
        description: 'Show a modal dialog',
        fields: [
          { name: 'modal', type: 'string', label: 'Modal ID', required: true },
        ],
      },
      {
        name: 'update_message',
        description: 'Update the interaction message',
        fields: [
          { name: 'content', type: 'expression', label: 'Content' },
        ],
      },
      {
        name: 'pipe_request',
        description: 'Make an HTTP request via pipe',
        fields: [
          { name: 'pipe', type: 'string', label: 'Pipe Name', required: true },
          {
            name: 'method',
            type: 'select',
            label: 'Method',
            options: [
              { label: 'GET', value: 'GET' },
              { label: 'POST', value: 'POST' },
              { label: 'PUT', value: 'PUT' },
              { label: 'PATCH', value: 'PATCH' },
              { label: 'DELETE', value: 'DELETE' },
            ],
          },
          { name: 'path', type: 'string', label: 'Path' },
          { name: 'as', type: 'string', label: 'Store as variable' },
        ],
      },
      {
        name: 'pipe_send',
        description: 'Send data via pipe',
        fields: [
          { name: 'pipe', type: 'string', label: 'Pipe Name', required: true },
        ],
      },
      {
        name: 'webhook_send',
        description: 'Send to webhook',
        fields: [
          { name: 'url', type: 'expression', label: 'URL', required: true },
          { name: 'content', type: 'expression', label: 'Content' },
          { name: 'username', type: 'expression', label: 'Username' },
          { name: 'avatar_url', type: 'expression', label: 'Avatar URL' },
        ],
      },
      {
        name: 'create_timer',
        description: 'Create a timer',
        fields: [
          { name: 'id', type: 'string', label: 'Timer ID', required: true },
          { name: 'duration', type: 'duration', label: 'Duration', required: true },
          { name: 'event', type: 'string', label: 'Event Name', required: true },
        ],
      },
      {
        name: 'cancel_timer',
        description: 'Cancel a timer',
        fields: [
          { name: 'id', type: 'string', label: 'Timer ID', required: true },
        ],
      },
      {
        name: 'counter_increment',
        description: 'Increment a counter metric',
        fields: [
          { name: 'name', type: 'string', label: 'Counter Name', required: true },
          { name: 'value', type: 'number', label: 'Value' },
        ],
      },
      {
        name: 'record_metric',
        description: 'Record a metric',
        fields: [
          { name: 'name', type: 'string', label: 'Metric Name', required: true },
          {
            name: 'type',
            type: 'select',
            label: 'Type',
            required: true,
            options: [
              { label: 'Counter', value: 'counter' },
              { label: 'Gauge', value: 'gauge' },
              { label: 'Histogram', value: 'histogram' },
            ],
          },
          { name: 'value', type: 'number', label: 'Value', required: true },
        ],
      },
      {
        name: 'canvas_render',
        description: 'Render a canvas image',
        fields: [
          { name: 'generator', type: 'expression', label: 'Generator', required: true },
          { name: 'as', type: 'string', label: 'Store as variable' },
        ],
      },
      {
        name: 'render_layers',
        description: 'Render canvas layers inline without a named generator',
        fields: [
          { name: 'width', type: 'number', label: 'Width', required: true },
          { name: 'height', type: 'number', label: 'Height', required: true },
          { name: 'background', type: 'expression', label: 'Background color' },
          { name: 'layers', type: 'expression', label: 'Layers (expression returning array)', required: true },
          { name: 'as', type: 'string', label: 'Store as variable' },
        ],
      },
    ],
  },
];

// Export a flat list of all action names
export const allActionNames = actionCategories.flatMap((cat) =>
  cat.actions.map((a) => a.name)
);

// Get action by name
export const getActionDefinition = (name: string): ActionDefinition | undefined => {
  for (const category of actionCategories) {
    const action = category.actions.find((a) => a.name === name);
    if (action) return action;
  }
  return undefined;
};
