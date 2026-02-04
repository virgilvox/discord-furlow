/**
 * Auto-Responder builtin module
 * Handles trigger-based automatic responses
 */

import type { FurlowSpec, CommandDefinition, EventHandler, TableDefinition } from '@furlow/schema';

export interface AutoResponderConfig {
  /** Maximum triggers per guild */
  maxTriggers?: number;
  /** Ignore bots */
  ignoreBots?: boolean;
  /** Global cooldown (seconds) */
  globalCooldown?: number;
}

export const autoResponderTables: Record<string, TableDefinition> = {
  auto_responses: {
    columns: {
      id: { type: 'number', primary: true },
      guild_id: { type: 'string', index: true },
      trigger: { type: 'string' },
      trigger_type: { type: 'string', default: 'contains' }, // exact, contains, startswith, endswith, regex
      response: { type: 'string' },
      response_type: { type: 'string', default: 'message' }, // message, embed, reaction
      embed_data: { type: 'json' },
      reaction: { type: 'string' },
      chance: { type: 'number', default: 100 }, // 0-100 percentage
      cooldown: { type: 'number', default: 0 }, // seconds
      ignore_case: { type: 'boolean', default: true },
      delete_trigger: { type: 'boolean', default: false },
      dm_response: { type: 'boolean', default: false },
      allowed_channels: { type: 'json' },
      ignored_channels: { type: 'json' },
      allowed_roles: { type: 'json' },
      ignored_roles: { type: 'json' },
      created_at: { type: 'timestamp' },
    },
  },
  auto_response_cooldowns: {
    columns: {
      id: { type: 'number', primary: true },
      response_id: { type: 'number', index: true },
      guild_id: { type: 'string' },
      last_triggered: { type: 'timestamp' },
    },
  },
};

export const autoResponderEventHandlers: EventHandler[] = [
  {
    event: 'message',
    condition: '!message.author.bot || !config.autoResponder?.ignoreBots',
    actions: [
      // Get all triggers for this guild
      {
        action: 'db_query',
        table: 'auto_responses',
        where: { guild_id: '${guild.id}' },
        as: 'triggers',
      },
      // Check each trigger
      {
        action: 'batch',
        items: '${triggers}',
        each: {
          action: 'flow_if',
          condition: '(() => { const t = item; const msg = t.ignore_case ? message.content.toLowerCase() : message.content; const trig = t.ignore_case ? t.trigger.toLowerCase() : t.trigger; switch(t.trigger_type) { case "exact": return msg === trig; case "contains": return msg.includes(trig); case "startswith": return msg.startsWith(trig); case "endswith": return msg.endsWith(trig); case "regex": return new RegExp(t.trigger, t.ignore_case ? "i" : "").test(message.content); default: return false; } })()',
          then: [
            // Check channel restrictions
            {
              action: 'flow_if',
              condition: 'item.allowed_channels?.length && !item.allowed_channels.includes(channel.id)',
              then: [{ action: 'abort' }],
            },
            {
              action: 'flow_if',
              condition: 'item.ignored_channels?.includes(channel.id)',
              then: [{ action: 'abort' }],
            },
            // Check role restrictions
            {
              action: 'flow_if',
              condition: 'item.allowed_roles?.length && !item.allowed_roles.some(r => member.roles.cache.has(r))',
              then: [{ action: 'abort' }],
            },
            {
              action: 'flow_if',
              condition: 'item.ignored_roles?.some(r => member.roles.cache.has(r))',
              then: [{ action: 'abort' }],
            },
            // Check cooldown
            {
              action: 'flow_if',
              condition: 'item.cooldown > 0',
              then: [
                {
                  action: 'db_query',
                  table: 'auto_response_cooldowns',
                  where: { response_id: '${item.id}', guild_id: '${guild.id}' },
                  as: 'cooldown',
                },
                {
                  action: 'flow_if',
                  condition: 'cooldown[0] && (now() - new Date(cooldown[0].last_triggered)) < item.cooldown * 1000',
                  then: [{ action: 'abort' }],
                },
              ],
            },
            // Check chance
            {
              action: 'flow_if',
              condition: 'item.chance < 100 && random(1, 100) > item.chance',
              then: [{ action: 'abort' }],
            },
            // Execute response
            {
              action: 'flow_switch',
              value: '${item.response_type}',
              cases: {
                message: [
                  {
                    action: 'flow_if',
                    condition: 'item.dm_response',
                    then: [
                      { action: 'send_dm', user: '${user.id}', content: '${item.response}' },
                    ],
                    else: [
                      { action: 'send_message', channel: '${channel.id}', content: '${item.response}' },
                    ],
                  },
                ],
                embed: [
                  {
                    action: 'flow_if',
                    condition: 'item.dm_response',
                    then: [
                      { action: 'send_dm', user: '${user.id}', embed: '${item.embed_data}' },
                    ],
                    else: [
                      { action: 'send_message', channel: '${channel.id}', embed: '${item.embed_data}' },
                    ],
                  },
                ],
                reaction: [
                  { action: 'add_reaction', message: '${message.id}', channel: '${channel.id}', emoji: '${item.reaction}' },
                ],
              },
            },
            // Delete trigger message if configured
            {
              action: 'flow_if',
              condition: 'item.delete_trigger',
              then: [
                { action: 'delete_message', channel: '${channel.id}', message: '${message.id}' },
              ],
            },
            // Update cooldown
            {
              action: 'flow_if',
              condition: 'item.cooldown > 0',
              then: [
                {
                  action: 'db_update',
                  table: 'auto_response_cooldowns',
                  where: { response_id: '${item.id}', guild_id: '${guild.id}' },
                  data: { last_triggered: '${now()}' },
                  upsert: true,
                },
              ],
            },
          ],
        },
      },
    ],
  },
];

export const autoResponderCommands: CommandDefinition[] = [
  {
    name: 'autoresponder',
    description: 'Auto-responder management',
    subcommands: [
      {
        name: 'add',
        description: 'Add an auto-response',
        options: [
          { name: 'trigger', description: 'Trigger text', type: 'string', required: true },
          { name: 'response', description: 'Response text', type: 'string', required: true },
          { name: 'type', description: 'Match type', type: 'string', required: false, choices: [
            { name: 'Contains', value: 'contains' },
            { name: 'Exact match', value: 'exact' },
            { name: 'Starts with', value: 'startswith' },
            { name: 'Ends with', value: 'endswith' },
            { name: 'Regex', value: 'regex' },
          ]},
          { name: 'chance', description: 'Response chance (1-100)', type: 'integer', required: false },
        ],
        actions: [
          // Check max triggers
          {
            action: 'db_query',
            table: 'auto_responses',
            where: { guild_id: '${guild.id}' },
            as: 'existing',
          },
          {
            action: 'flow_if',
            condition: 'existing.length >= (config.autoResponder?.maxTriggers || 50)',
            then: [
              { action: 'reply', content: 'Maximum triggers reached!', ephemeral: true },
              { action: 'abort' },
            ],
          },
          {
            action: 'db_insert',
            table: 'auto_responses',
            data: {
              guild_id: '${guild.id}',
              trigger: '${args.trigger}',
              trigger_type: '${args.type || "contains"}',
              response: '${args.response}',
              chance: '${args.chance || 100}',
              created_at: '${now()}',
            },
            as: 'newTrigger',
          },
          {
            action: 'reply',
            content: 'Auto-response added! ID: ${newTrigger.id}',
            ephemeral: true,
          },
        ],
      },
      {
        name: 'list',
        description: 'List auto-responses',
        actions: [
          {
            action: 'db_query',
            table: 'auto_responses',
            where: { guild_id: '${guild.id}' },
            as: 'triggers',
          },
          {
            action: 'flow_if',
            condition: 'triggers.length === 0',
            then: [
              { action: 'reply', content: 'No auto-responses configured!', ephemeral: true },
              { action: 'abort' },
            ],
          },
          {
            action: 'set',
            key: 'triggerList',
            value: '${triggers.map(t => "**" + t.id + ".** `" + truncate(t.trigger, 30) + "` → `" + truncate(t.response, 30) + "` (" + t.trigger_type + ")").join("\\n")}',
          },
          {
            action: 'reply',
            embed: {
              title: 'Auto-Responses',
              description: '${triggerList}',
              color: '#5865f2',
              footer: { text: '${triggers.length} trigger(s)' },
            },
            ephemeral: true,
          },
        ],
      },
      {
        name: 'delete',
        description: 'Delete an auto-response',
        options: [
          { name: 'id', description: 'Trigger ID', type: 'integer', required: true },
        ],
        actions: [
          {
            action: 'db_query',
            table: 'auto_responses',
            where: { id: '${args.id}', guild_id: '${guild.id}' },
            as: 'trigger',
          },
          {
            action: 'flow_if',
            condition: 'trigger.length === 0',
            then: [
              { action: 'reply', content: 'Trigger not found!', ephemeral: true },
              { action: 'abort' },
            ],
          },
          {
            action: 'db_delete',
            table: 'auto_responses',
            where: { id: '${args.id}' },
          },
          {
            action: 'db_delete',
            table: 'auto_response_cooldowns',
            where: { response_id: '${args.id}' },
          },
          {
            action: 'reply',
            content: 'Auto-response deleted!',
            ephemeral: true,
          },
        ],
      },
      {
        name: 'edit',
        description: 'Edit an auto-response',
        options: [
          { name: 'id', description: 'Trigger ID', type: 'integer', required: true },
          { name: 'trigger', description: 'New trigger', type: 'string', required: false },
          { name: 'response', description: 'New response', type: 'string', required: false },
          { name: 'cooldown', description: 'Cooldown in seconds', type: 'integer', required: false },
          { name: 'chance', description: 'Response chance (1-100)', type: 'integer', required: false },
        ],
        actions: [
          {
            action: 'db_query',
            table: 'auto_responses',
            where: { id: '${args.id}', guild_id: '${guild.id}' },
            as: 'trigger',
          },
          {
            action: 'flow_if',
            condition: 'trigger.length === 0',
            then: [
              { action: 'reply', content: 'Trigger not found!', ephemeral: true },
              { action: 'abort' },
            ],
          },
          {
            action: 'set',
            key: 'updates',
            value: '${Object.fromEntries(Object.entries({ trigger: args.trigger, response: args.response, cooldown: args.cooldown, chance: args.chance }).filter(([_, v]) => v !== undefined))}',
          },
          {
            action: 'db_update',
            table: 'auto_responses',
            where: { id: '${args.id}' },
            data: '${updates}',
          },
          {
            action: 'reply',
            content: 'Auto-response updated!',
            ephemeral: true,
          },
        ],
      },
    ],
  },
];

export function getAutoResponderSpec(config: AutoResponderConfig = {}): Partial<FurlowSpec> {
  return {
    commands: autoResponderCommands,
    events: autoResponderEventHandlers,
    state: {
      tables: autoResponderTables,
    },
  };
}
