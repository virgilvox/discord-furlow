/**
 * Reaction Roles builtin module
 * Handles button roles, reaction roles, and select menu roles
 */

import type { FurlowSpec, CommandDefinition, EventHandler, TableDefinition } from '@furlow/schema';

export interface ReactionRolesConfig {
  /** Maximum roles a user can have from a single panel */
  maxRolesPerPanel?: number;
  /** Log channel for role assignments */
  logChannel?: string;
}

export const reactionRolesTables: Record<string, TableDefinition> = {
  reaction_role_panels: {
    columns: {
      id: { type: 'number', primary: true },
      guild_id: { type: 'string', index: true },
      channel_id: { type: 'string' },
      message_id: { type: 'string', unique: true },
      type: { type: 'string' }, // 'button', 'reaction', 'select'
      mode: { type: 'string', default: 'toggle' }, // 'toggle', 'give', 'take', 'unique'
      max_roles: { type: 'number' },
      created_at: { type: 'timestamp' },
    },
  },
  reaction_role_entries: {
    columns: {
      id: { type: 'number', primary: true },
      panel_id: { type: 'number', index: true },
      role_id: { type: 'string' },
      emoji: { type: 'string' },
      label: { type: 'string' },
      description: { type: 'string' },
      style: { type: 'string' }, // button style
    },
  },
};

export const reactionRolesEventHandlers: EventHandler[] = [
  // Handle button clicks
  {
    event: 'button_click',
    condition: 'interaction.customId.startsWith("rr_")',
    actions: [
      {
        action: 'set',
        key: 'roleId',
        value: '${interaction.customId.replace("rr_", "")}',
      },
      {
        action: 'db_query',
        table: 'reaction_role_panels',
        where: { message_id: '${interaction.message.id}' },
        as: 'panel',
      },
      {
        action: 'flow_if',
        condition: '!panel[0]',
        then: [
          { action: 'reply', content: 'This role panel is no longer valid.', ephemeral: true },
          { action: 'abort' },
        ],
      },
      {
        action: 'set',
        key: 'hasRole',
        value: '${member.roles.cache.has(roleId)}',
      },
      // Handle based on mode
      {
        action: 'flow_switch',
        value: '${panel[0].mode}',
        cases: {
          toggle: [
            {
              action: 'flow_if',
              condition: 'hasRole',
              then: [
                { action: 'remove_role', user: '${member.id}', role: '${roleId}' },
                { action: 'reply', content: 'Removed <@&${roleId}>', ephemeral: true },
              ],
              else: [
                { action: 'assign_role', user: '${member.id}', role: '${roleId}' },
                { action: 'reply', content: 'Added <@&${roleId}>', ephemeral: true },
              ],
            },
          ],
          give: [
            {
              action: 'flow_if',
              condition: 'hasRole',
              then: [
                { action: 'reply', content: 'You already have <@&${roleId}>', ephemeral: true },
              ],
              else: [
                { action: 'assign_role', user: '${member.id}', role: '${roleId}' },
                { action: 'reply', content: 'Added <@&${roleId}>', ephemeral: true },
              ],
            },
          ],
          take: [
            {
              action: 'flow_if',
              condition: '!hasRole',
              then: [
                { action: 'reply', content: 'You don\'t have <@&${roleId}>', ephemeral: true },
              ],
              else: [
                { action: 'remove_role', user: '${member.id}', role: '${roleId}' },
                { action: 'reply', content: 'Removed <@&${roleId}>', ephemeral: true },
              ],
            },
          ],
          unique: [
            // Remove other roles from this panel first
            {
              action: 'db_query',
              table: 'reaction_role_entries',
              where: { panel_id: '${panel[0].id}' },
              as: 'entries',
            },
            {
              action: 'batch',
              items: '${entries.filter(e => e.role_id !== roleId && member.roles.cache.has(e.role_id))}',
              each: { action: 'remove_role', user: '${member.id}', role: '${item.role_id}' },
            },
            { action: 'assign_role', user: '${member.id}', role: '${roleId}' },
            { action: 'reply', content: 'Set role to <@&${roleId}>', ephemeral: true },
          ],
        },
      },
      // Log if configured
      {
        action: 'flow_if',
        condition: 'config.reactionRoles?.logChannel',
        then: [
          {
            action: 'send_message',
            channel: '${config.reactionRoles.logChannel}',
            embed: {
              description: '${member} ${hasRole ? "removed" : "added"} <@&${roleId}>',
              color: '${hasRole ? "#ed4245" : "#57f287"}',
              timestamp: '${now()}',
            },
          },
        ],
      },
    ],
  },
  // Handle select menu
  {
    event: 'select_menu',
    condition: 'interaction.customId.startsWith("rr_select_")',
    actions: [
      {
        action: 'set',
        key: 'panelId',
        value: '${interaction.customId.replace("rr_select_", "")}',
      },
      {
        action: 'db_query',
        table: 'reaction_role_panels',
        where: { id: '${panelId}' },
        as: 'panel',
      },
      {
        action: 'db_query',
        table: 'reaction_role_entries',
        where: { panel_id: '${panelId}' },
        as: 'entries',
      },
      // Get selected role IDs
      {
        action: 'set',
        key: 'selectedRoles',
        value: '${interaction.values}',
      },
      // Remove roles not selected
      {
        action: 'batch',
        items: '${entries.filter(e => !selectedRoles.includes(e.role_id) && member.roles.cache.has(e.role_id))}',
        each: { action: 'remove_role', user: '${member.id}', role: '${item.role_id}' },
      },
      // Add selected roles
      {
        action: 'batch',
        items: '${selectedRoles.filter(r => !member.roles.cache.has(r))}',
        each: { action: 'assign_role', user: '${member.id}', role: '${item}' },
      },
      {
        action: 'reply',
        content: 'Roles updated!',
        ephemeral: true,
      },
    ],
  },
  // Handle reactions
  {
    event: 'reaction_add',
    actions: [
      {
        action: 'db_query',
        table: 'reaction_role_panels',
        where: { message_id: '${message.id}', type: 'reaction' },
        as: 'panel',
      },
      {
        action: 'flow_if',
        condition: 'panel[0]',
        then: [
          {
            action: 'db_query',
            table: 'reaction_role_entries',
            where: { panel_id: '${panel[0].id}', emoji: '${reaction.emoji.name || reaction.emoji.id}' },
            as: 'entry',
          },
          {
            action: 'flow_if',
            condition: 'entry[0]',
            then: [
              { action: 'assign_role', user: '${user.id}', role: '${entry[0].role_id}' },
            ],
          },
        ],
      },
    ],
  },
  // Handle reaction remove
  {
    event: 'reaction_remove',
    actions: [
      {
        action: 'db_query',
        table: 'reaction_role_panels',
        where: { message_id: '${message.id}', type: 'reaction' },
        as: 'panel',
      },
      {
        action: 'flow_if',
        condition: 'panel[0] && panel[0].mode !== "give"',
        then: [
          {
            action: 'db_query',
            table: 'reaction_role_entries',
            where: { panel_id: '${panel[0].id}', emoji: '${reaction.emoji.name || reaction.emoji.id}' },
            as: 'entry',
          },
          {
            action: 'flow_if',
            condition: 'entry[0]',
            then: [
              { action: 'remove_role', user: '${user.id}', role: '${entry[0].role_id}' },
            ],
          },
        ],
      },
    ],
  },
];

export const reactionRolesCommands: CommandDefinition[] = [
  {
    name: 'reactionroles',
    description: 'Reaction roles management',
    subcommands: [
      {
        name: 'create-button',
        description: 'Create a button role panel',
        options: [
          { name: 'title', description: 'Panel title', type: 'string', required: false },
          { name: 'description', description: 'Panel description', type: 'string', required: false },
          { name: 'mode', description: 'Role mode', type: 'string', required: false, choices: [
            { name: 'Toggle (add/remove)', value: 'toggle' },
            { name: 'Give only', value: 'give' },
            { name: 'Take only', value: 'take' },
            { name: 'Unique (one at a time)', value: 'unique' },
          ]},
        ],
        actions: [
          {
            action: 'send_message',
            channel: '${channel.id}',
            embed: {
              title: '${args.title || "Role Selection"}',
              description: '${args.description || "Click a button to get a role!"}',
              color: '#5865f2',
            },
            as: 'panelMessage',
          },
          {
            action: 'db_insert',
            table: 'reaction_role_panels',
            data: {
              guild_id: '${guild.id}',
              channel_id: '${channel.id}',
              message_id: '${panelMessage.id}',
              type: 'button',
              mode: '${args.mode || "toggle"}',
              created_at: '${now()}',
            },
            as: 'panel',
          },
          {
            action: 'reply',
            content: 'Button role panel created! Use `/reactionroles add-button` to add roles.\nPanel ID: ${panel.id}',
            ephemeral: true,
          },
        ],
      },
      {
        name: 'add-button',
        description: 'Add a button to a role panel',
        options: [
          { name: 'message_id', description: 'Panel message ID', type: 'string', required: true },
          { name: 'role', description: 'Role to assign', type: 'role', required: true },
          { name: 'label', description: 'Button label', type: 'string', required: false },
          { name: 'emoji', description: 'Button emoji', type: 'string', required: false },
          { name: 'style', description: 'Button style', type: 'string', required: false, choices: [
            { name: 'Blue (Primary)', value: 'primary' },
            { name: 'Gray (Secondary)', value: 'secondary' },
            { name: 'Green (Success)', value: 'success' },
            { name: 'Red (Danger)', value: 'danger' },
          ]},
        ],
        actions: [
          {
            action: 'db_query',
            table: 'reaction_role_panels',
            where: { message_id: '${args.message_id}' },
            as: 'panel',
          },
          {
            action: 'flow_if',
            condition: '!panel[0]',
            then: [
              { action: 'reply', content: 'Panel not found!', ephemeral: true },
              { action: 'abort' },
            ],
          },
          {
            action: 'db_insert',
            table: 'reaction_role_entries',
            data: {
              panel_id: '${panel[0].id}',
              role_id: '${args.role.id}',
              label: '${args.label || args.role.name}',
              emoji: '${args.emoji}',
              style: '${args.style || "primary"}',
            },
          },
          // Get all entries for this panel
          {
            action: 'db_query',
            table: 'reaction_role_entries',
            where: { panel_id: '${panel[0].id}' },
            as: 'entries',
          },
          // Build components
          {
            action: 'set',
            key: 'buttons',
            value: '${entries.map(e => ({ type: "button", style: e.style, label: e.label, emoji: e.emoji, custom_id: "rr_" + e.role_id }))}',
          },
          {
            action: 'set',
            key: 'rows',
            value: '${chunk(buttons, 5).map(row => ({ type: "action_row", components: row }))}',
          },
          // Update message
          {
            action: 'edit_message',
            channel: '${panel[0].channel_id}',
            message: '${panel[0].message_id}',
            components: '${rows}',
          },
          {
            action: 'reply',
            content: 'Added ${args.role.name} to the panel!',
            ephemeral: true,
          },
        ],
      },
      {
        name: 'create-select',
        description: 'Create a select menu role panel',
        options: [
          { name: 'title', description: 'Panel title', type: 'string', required: false },
          { name: 'description', description: 'Panel description', type: 'string', required: false },
          { name: 'max_roles', description: 'Maximum roles that can be selected', type: 'integer', required: false },
        ],
        actions: [
          {
            action: 'send_message',
            channel: '${channel.id}',
            embed: {
              title: '${args.title || "Role Selection"}',
              description: '${args.description || "Select your roles from the menu below!"}',
              color: '#5865f2',
            },
            as: 'panelMessage',
          },
          {
            action: 'db_insert',
            table: 'reaction_role_panels',
            data: {
              guild_id: '${guild.id}',
              channel_id: '${channel.id}',
              message_id: '${panelMessage.id}',
              type: 'select',
              mode: 'toggle',
              max_roles: '${args.max_roles}',
              created_at: '${now()}',
            },
            as: 'panel',
          },
          {
            action: 'reply',
            content: 'Select menu role panel created! Use `/reactionroles add-option` to add roles.\nPanel ID: ${panel.id}',
            ephemeral: true,
          },
        ],
      },
      {
        name: 'add-option',
        description: 'Add an option to a select menu panel',
        options: [
          { name: 'message_id', description: 'Panel message ID', type: 'string', required: true },
          { name: 'role', description: 'Role to assign', type: 'role', required: true },
          { name: 'label', description: 'Option label', type: 'string', required: false },
          { name: 'description', description: 'Option description', type: 'string', required: false },
          { name: 'emoji', description: 'Option emoji', type: 'string', required: false },
        ],
        actions: [
          {
            action: 'db_query',
            table: 'reaction_role_panels',
            where: { message_id: '${args.message_id}', type: 'select' },
            as: 'panel',
          },
          {
            action: 'flow_if',
            condition: '!panel[0]',
            then: [
              { action: 'reply', content: 'Select menu panel not found!', ephemeral: true },
              { action: 'abort' },
            ],
          },
          {
            action: 'db_insert',
            table: 'reaction_role_entries',
            data: {
              panel_id: '${panel[0].id}',
              role_id: '${args.role.id}',
              label: '${args.label || args.role.name}',
              description: '${args.description}',
              emoji: '${args.emoji}',
            },
          },
          // Get all entries for this panel
          {
            action: 'db_query',
            table: 'reaction_role_entries',
            where: { panel_id: '${panel[0].id}' },
            as: 'entries',
          },
          // Build select menu
          {
            action: 'set',
            key: 'options',
            value: '${entries.map(e => ({ label: e.label, value: e.role_id, description: e.description, emoji: e.emoji }))}',
          },
          // Update message
          {
            action: 'edit_message',
            channel: '${panel[0].channel_id}',
            message: '${panel[0].message_id}',
            components: [
              {
                type: 'action_row',
                components: [
                  {
                    type: 'select_menu',
                    custom_id: 'rr_select_${panel[0].id}',
                    placeholder: 'Select roles...',
                    min_values: 0,
                    max_values: '${panel[0].max_roles || entries.length}',
                    options: '${options}',
                  },
                ],
              },
            ],
          },
          {
            action: 'reply',
            content: 'Added ${args.role.name} to the panel!',
            ephemeral: true,
          },
        ],
      },
      {
        name: 'delete',
        description: 'Delete a role panel',
        options: [
          { name: 'message_id', description: 'Panel message ID', type: 'string', required: true },
        ],
        actions: [
          {
            action: 'db_query',
            table: 'reaction_role_panels',
            where: { message_id: '${args.message_id}' },
            as: 'panel',
          },
          {
            action: 'flow_if',
            condition: '!panel[0]',
            then: [
              { action: 'reply', content: 'Panel not found!', ephemeral: true },
              { action: 'abort' },
            ],
          },
          {
            action: 'db_delete',
            table: 'reaction_role_entries',
            where: { panel_id: '${panel[0].id}' },
          },
          {
            action: 'db_delete',
            table: 'reaction_role_panels',
            where: { id: '${panel[0].id}' },
          },
          {
            action: 'delete_message',
            channel: '${panel[0].channel_id}',
            message: '${panel[0].message_id}',
          },
          {
            action: 'reply',
            content: 'Panel deleted!',
            ephemeral: true,
          },
        ],
      },
    ],
  },
];

export function getReactionRolesSpec(config: ReactionRolesConfig = {}): Partial<FurlowSpec> {
  return {
    events: reactionRolesEventHandlers,
    commands: reactionRolesCommands,
    state: {
      tables: reactionRolesTables,
    },
  };
}
