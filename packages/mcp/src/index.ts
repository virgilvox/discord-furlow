/**
 * @furlow/mcp
 *
 * Model Context Protocol server that exposes FURLOW spec-authoring helpers
 * to LLM clients (Claude Desktop, Cursor, Continue, etc). Lets a model
 * validate specs, enumerate actions / events / builtins, and scaffold new
 * bots without hallucinating action names.
 *
 * Usage (from a client's MCP config):
 *
 *   "furlow": {
 *     "command": "npx",
 *     "args": ["-y", "@furlow/mcp"]
 *   }
 *
 * Or install globally and run `furlow-mcp`.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  type Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { parse as parseYaml } from 'yaml';
import { validateFurlowSpec } from '@furlow/schema';

/**
 * Canonical lists used by the reference runtime. Kept in sync with the
 * HANDOFF.md feature table. Exposed as MCP tool responses so LLMs do not
 * have to scrape docs.
 */
export const FURLOW_ACTIONS: readonly string[] = [
  'reply', 'send_message', 'edit_message', 'delete_message', 'defer',
  'update_message', 'add_reaction', 'add_reactions', 'remove_reaction',
  'clear_reactions', 'bulk_delete',
  'assign_role', 'remove_role', 'toggle_role', 'kick', 'ban', 'unban',
  'timeout', 'remove_timeout', 'send_dm', 'set_nickname', 'move_member',
  'disconnect_member', 'server_mute', 'server_deafen',
  'set', 'increment', 'decrement', 'list_push', 'list_remove', 'set_map', 'delete_map',
  'call_flow', 'abort', 'return', 'flow_if', 'flow_switch', 'flow_while',
  'repeat', 'parallel', 'batch', 'try', 'wait', 'log', 'emit',
  'create_channel', 'edit_channel', 'delete_channel', 'create_thread',
  'archive_thread', 'set_channel_permissions', 'create_role', 'edit_role',
  'delete_role',
  'show_modal',
  'voice_join', 'voice_leave', 'voice_play', 'voice_pause', 'voice_resume',
  'voice_stop', 'voice_skip', 'voice_seek', 'voice_volume', 'voice_set_filter',
  'voice_search', 'queue_get', 'queue_add', 'queue_remove', 'queue_clear',
  'queue_shuffle', 'queue_loop',
  'db_insert', 'db_update', 'db_delete', 'db_query',
  'pipe_request', 'pipe_send', 'webhook_send', 'create_timer', 'cancel_timer',
  'counter_increment', 'record_metric', 'canvas_render', 'render_layers',
];

export const FURLOW_EVENTS: readonly string[] = [
  'ready', 'shard_ready', 'shard_disconnect', 'shard_error',
  'guild_create', 'guild_delete', 'guild_update',
  'member_join', 'member_leave', 'member_update', 'member_boost',
  'member_unboost', 'member_ban', 'member_unban',
  'message_create', 'message_update', 'message_delete', 'message_delete_bulk',
  'message_reaction_add', 'message_reaction_remove', 'message_reaction_remove_all',
  'channel_create', 'channel_delete', 'channel_update', 'channel_pins_update',
  'thread_create', 'thread_delete', 'thread_update', 'thread_member_update',
  'role_create', 'role_delete', 'role_update',
  'emoji_create', 'emoji_delete', 'emoji_update',
  'sticker_create', 'sticker_delete', 'sticker_update',
  'invite_create', 'invite_delete',
  'voice_state_update', 'voice_join', 'voice_leave', 'voice_move',
  'voice_stream_start', 'voice_stream_stop',
  'presence_update', 'typing_start',
  'scheduled_event_create', 'scheduled_event_delete', 'scheduled_event_update',
  'scheduled_event_user_add', 'scheduled_event_user_remove',
  'stage_instance_create', 'stage_instance_delete', 'stage_instance_update',
  'button_click', 'select_menu', 'modal_submit',
  // high-level
  'automod_triggered', 'timer_fire', 'scheduler_tick',
  'voice_track_start', 'voice_track_end',
];

export interface BuiltinInfo {
  name: string;
  description: string;
}

export const FURLOW_BUILTINS: readonly BuiltinInfo[] = [
  { name: 'moderation',      description: 'Warnings, kicks, bans, mutes, case system' },
  { name: 'welcome',         description: 'Welcome and goodbye messages, auto-roles' },
  { name: 'logging',         description: 'Message, member, voice, and moderation event logging' },
  { name: 'tickets',         description: 'Support tickets with transcripts' },
  { name: 'reaction-roles',  description: 'Role assignment via reactions or buttons' },
  { name: 'leveling',        description: 'XP and levels with rank cards and rewards' },
  { name: 'music',           description: 'Voice playback with queue and filters' },
  { name: 'starboard',       description: 'Highlight starred messages' },
  { name: 'polls',           description: 'Voting and timed polls' },
  { name: 'giveaways',       description: 'Giveaways with requirements and reroll' },
  { name: 'auto-responder',  description: 'Pattern-based automatic responses' },
  { name: 'afk',             description: 'AFK status with mention notifications' },
  { name: 'reminders',       description: 'Personal reminders with DM delivery' },
  { name: 'utilities',       description: 'serverinfo, userinfo, avatar helpers, etc.' },
];

/**
 * Validate a FURLOW spec (JSON or YAML). Returns structured errors.
 */
export function validateSpec(body: string): {
  valid: boolean;
  errors: Array<{ path: string; message: string }>;
} {
  let parsed: unknown;
  try {
    parsed = parseYaml(body);
  } catch (err) {
    return {
      valid: false,
      errors: [{ path: '<yaml>', message: err instanceof Error ? err.message : String(err) }],
    };
  }
  const result = validateFurlowSpec(parsed as never);
  return {
    valid: result.valid,
    errors: result.errors.map((e) => ({ path: e.path, message: e.message })),
  };
}

/**
 * Scaffold a minimal FURLOW YAML spec. Takes a bot name and an array of
 * builtin names to include. Returned string is ready to drop into
 * `furlow.yaml`.
 */
export function scaffoldBot(opts: { name: string; builtins?: string[] }): string {
  // Scaffold is emitted in the normalized `action:` form because the MCP
  // server validates against the JSON schema directly, which requires that
  // form. The runtime CLI accepts both `- reply:` shorthand and the
  // normalized form; we pick the one that passes `validateFurlowSpec`.
  const lines: string[] = [
    'version: "0.1"',
    '',
    'identity:',
    `  name: "${opts.name}"`,
    '',
    'presence:',
    '  status: online',
    '  activity:',
    '    type: playing',
    '    text: "with FURLOW"',
    '',
    'commands:',
    '  - name: ping',
    '    description: Check bot latency',
    '    actions:',
    '      - action: reply',
    '        content: "Pong! ${client.ws.ping}ms"',
    '',
  ];
  if (opts.builtins && opts.builtins.length > 0) {
    lines.push('builtins:');
    for (const b of opts.builtins) {
      lines.push(`  - module: ${b}`);
    }
    lines.push('');
  }
  return lines.join('\n');
}

const TOOLS: Tool[] = [
  {
    name: 'validate_spec',
    description: 'Validate a FURLOW YAML specification string. Returns structured errors with paths.',
    inputSchema: {
      type: 'object',
      properties: {
        yaml: { type: 'string', description: 'The YAML body of the spec' },
      },
      required: ['yaml'],
    },
  },
  {
    name: 'list_actions',
    description: 'List every action name the FURLOW runtime supports (85 actions).',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'list_events',
    description: 'List every event name the FURLOW runtime emits.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'list_builtins',
    description: 'List the 14 builtin modules available via `builtins:` in a spec.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'scaffold_bot',
    description: 'Generate a minimal, valid FURLOW YAML spec. Optionally includes builtins.',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Bot identity name' },
        builtins: {
          type: 'array',
          items: { type: 'string' },
          description: 'Builtin module names to include (see list_builtins)',
        },
      },
      required: ['name'],
    },
  },
];

/**
 * Build a fully-wired MCP server. Caller is responsible for connecting a
 * transport (see `bin.ts` for the stdio default).
 */
export function createServer(): Server {
  const server = new Server(
    { name: '@furlow/mcp', version: '1.0.0' },
    { capabilities: { tools: {} } },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));

  server.setRequestHandler(CallToolRequestSchema, async (req) => {
    const name = req.params.name;
    const args = (req.params.arguments ?? {}) as Record<string, unknown>;

    switch (name) {
      case 'validate_spec': {
        const body = typeof args.yaml === 'string' ? args.yaml : '';
        const result = validateSpec(body);
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      }
      case 'list_actions':
        return { content: [{ type: 'text', text: JSON.stringify(FURLOW_ACTIONS) }] };
      case 'list_events':
        return { content: [{ type: 'text', text: JSON.stringify(FURLOW_EVENTS) }] };
      case 'list_builtins':
        return { content: [{ type: 'text', text: JSON.stringify(FURLOW_BUILTINS) }] };
      case 'scaffold_bot': {
        const botName = typeof args.name === 'string' ? args.name : 'My Bot';
        const builtins = Array.isArray(args.builtins)
          ? (args.builtins as string[]).filter((b) => typeof b === 'string')
          : undefined;
        const yaml = scaffoldBot({ name: botName, builtins });
        return { content: [{ type: 'text', text: yaml }] };
      }
      default:
        return {
          content: [{ type: 'text', text: `Unknown tool: ${name}` }],
          isError: true,
        };
    }
  });

  return server;
}
