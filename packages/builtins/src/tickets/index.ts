/**
 * Tickets builtin module
 * Handles ticket creation, claiming, closing, and transcripts
 */

import type { FurlowSpec, CommandDefinition, EventHandler, TableDefinition, ComponentDefinition } from '@furlow/schema';

export interface TicketsConfig {
  /** Category to create tickets in */
  category?: string;
  /** Support roles that can see tickets */
  supportRoles?: string[];
  /** Ticket channel naming pattern */
  channelPattern?: string;
  /** Maximum open tickets per user */
  maxTicketsPerUser?: number;
  /** Ticket panel channel */
  panelChannel?: string;
  /** Log channel for ticket transcripts */
  logChannel?: string;
  /** Auto-close inactive tickets (hours) */
  autoCloseAfter?: number;
  /** Ticket categories/types */
  categories?: Array<{
    id: string;
    name: string;
    description?: string;
    emoji?: string;
    supportRoles?: string[];
  }>;
  /** DM user on ticket close */
  dmOnClose?: boolean;
  /** Include transcript on close */
  includeTranscript?: boolean;
}

export const ticketsTables: Record<string, TableDefinition> = {
  tickets: {
    columns: {
      id: { type: 'number', primary: true },
      channel_id: { type: 'string', unique: true },
      guild_id: { type: 'string', index: true },
      user_id: { type: 'string', index: true },
      category: { type: 'string' },
      claimed_by: { type: 'string' },
      status: { type: 'string', default: 'open' },
      created_at: { type: 'timestamp' },
      closed_at: { type: 'timestamp' },
    },
  },
  ticket_messages: {
    columns: {
      id: { type: 'number', primary: true },
      ticket_id: { type: 'number', index: true },
      author_id: { type: 'string' },
      author_name: { type: 'string' },
      content: { type: 'string' },
      attachments: { type: 'json' },
      created_at: { type: 'timestamp' },
    },
  },
};

export const ticketPanelComponents: ComponentDefinition[] = [
  {
    type: 'action_row',
    components: [
      {
        type: 'button',
        style: 'primary',
        label: 'Create Ticket',
        emoji: '📩',
        custom_id: 'ticket_create',
      },
    ],
  },
];

export const ticketControlComponents: ComponentDefinition[] = [
  {
    type: 'action_row',
    components: [
      {
        type: 'button',
        style: 'secondary',
        label: 'Claim',
        emoji: '🙋',
        custom_id: 'ticket_claim',
      },
      {
        type: 'button',
        style: 'danger',
        label: 'Close',
        emoji: '🔒',
        custom_id: 'ticket_close',
      },
      {
        type: 'button',
        style: 'secondary',
        label: 'Transcript',
        emoji: '📜',
        custom_id: 'ticket_transcript',
      },
    ],
  },
];

export const ticketsEventHandlers: EventHandler[] = [
  // Handle ticket creation button
  {
    event: 'button_click',
    condition: 'interaction.customId === "ticket_create"',
    actions: [
      // Check max tickets
      {
        action: 'db_query',
        table: 'tickets',
        where: {
          guild_id: '${guild.id}',
          user_id: '${user.id}',
          status: 'open',
        },
        as: 'userTickets',
      },
      {
        action: 'flow_if',
        condition: 'userTickets.length >= (config.tickets.maxTicketsPerUser || 1)',
        then: [
          {
            action: 'reply',
            content: 'You already have the maximum number of open tickets!',
            ephemeral: true,
          },
          { action: 'abort' },
        ],
      },
      // Show category selector if configured
      {
        action: 'flow_if',
        condition: 'config.tickets.categories && config.tickets.categories.length > 0',
        then: [
          {
            action: 'reply',
            content: 'Select a ticket category:',
            ephemeral: true,
            components: [
              {
                type: 'action_row',
                components: [
                  {
                    type: 'select_menu',
                    custom_id: 'ticket_category_select',
                    placeholder: 'Select category...',
                    options: '${config.tickets.categories | map(c => ({ label: c.name, value: c.id, description: c.description, emoji: c.emoji }))}',
                  },
                ],
              },
            ],
          },
        ],
        else: [
          { action: 'emit', event: 'ticket_create_confirmed', data: { category: 'general' } },
        ],
      },
    ],
  },
  // Handle category selection
  {
    event: 'select_menu',
    condition: 'interaction.customId === "ticket_category_select"',
    actions: [
      {
        action: 'emit',
        event: 'ticket_create_confirmed',
        data: { category: '${interaction.values[0]}' },
      },
    ],
  },
  // Create the ticket channel
  {
    event: 'ticket_create_confirmed',
    actions: [
      {
        action: 'db_query',
        table: 'tickets',
        where: { guild_id: '${guild.id}' },
        order_by: 'id DESC',
        limit: 1,
        as: 'lastTicket',
      },
      {
        action: 'set',
        key: 'ticketNumber',
        value: '${(lastTicket[0]?.id || 0) + 1}',
      },
      {
        action: 'set',
        key: 'channelName',
        value: '${(config.tickets.channelPattern || "ticket-{number}") | replace("{number}", ticketNumber) | replace("{user}", user.username) | replace("{category}", event.data.category)}',
      },
      // Get support roles for this category
      {
        action: 'set',
        key: 'categoryConfig',
        value: '${config.tickets.categories?.find(c => c.id === event.data.category)}',
      },
      {
        action: 'set',
        key: 'supportRoles',
        value: '${categoryConfig?.supportRoles || config.tickets.supportRoles || []}',
      },
      // Create channel with permissions
      {
        action: 'create_channel',
        name: '${channelName}',
        type: 'text',
        parent: '${config.tickets.category}',
        permission_overwrites: [
          {
            id: '${guild.id}',
            type: 'role',
            deny: ['VIEW_CHANNEL'],
          },
          {
            id: '${user.id}',
            type: 'member',
            allow: ['VIEW_CHANNEL', 'SEND_MESSAGES', 'READ_MESSAGE_HISTORY', 'ATTACH_FILES'],
          },
          '${supportRoles | map(r => ({ id: r, type: "role", allow: ["VIEW_CHANNEL", "SEND_MESSAGES", "READ_MESSAGE_HISTORY", "ATTACH_FILES", "MANAGE_MESSAGES"] }))}',
        ],
        as: 'ticketChannel',
      },
      // Store in database
      {
        action: 'db_insert',
        table: 'tickets',
        data: {
          channel_id: '${ticketChannel.id}',
          guild_id: '${guild.id}',
          user_id: '${user.id}',
          category: '${event.data.category}',
          status: 'open',
          created_at: '${now()}',
        },
      },
      // Send opening message
      {
        action: 'send_message',
        channel: '${ticketChannel.id}',
        content: 'Welcome ${user}! Support will be with you shortly.',
        embed: {
          title: 'Ticket #${ticketNumber}',
          description: 'Please describe your issue and a staff member will assist you.',
          color: '#5865f2',
          fields: [
            { name: 'Category', value: '${categoryConfig?.name || "General"}', inline: true },
            { name: 'Created by', value: '${user}', inline: true },
          ],
          timestamp: '${now()}',
        },
        components: '${ticketControlComponents}',
      },
      // Reply to original interaction
      {
        action: 'update_message',
        content: 'Your ticket has been created: ${ticketChannel}',
        components: [],
      },
    ],
  },
  // Handle claim button
  {
    event: 'button_click',
    condition: 'interaction.customId === "ticket_claim"',
    actions: [
      {
        action: 'db_query',
        table: 'tickets',
        where: { channel_id: '${channel.id}' },
        as: 'ticket',
      },
      {
        action: 'flow_if',
        condition: '!ticket[0]',
        then: [
          { action: 'reply', content: 'This is not a ticket channel!', ephemeral: true },
          { action: 'abort' },
        ],
      },
      {
        action: 'flow_if',
        condition: 'ticket[0].claimed_by',
        then: [
          { action: 'reply', content: 'This ticket is already claimed by <@${ticket[0].claimed_by}>!', ephemeral: true },
          { action: 'abort' },
        ],
      },
      {
        action: 'db_update',
        table: 'tickets',
        where: { channel_id: '${channel.id}' },
        data: { claimed_by: '${user.id}' },
      },
      {
        action: 'send_message',
        channel: '${channel.id}',
        embed: {
          description: '${user} has claimed this ticket.',
          color: '#57f287',
        },
      },
      { action: 'reply', content: 'You have claimed this ticket!', ephemeral: true },
    ],
  },
  // Handle close button
  {
    event: 'button_click',
    condition: 'interaction.customId === "ticket_close"',
    actions: [
      {
        action: 'db_query',
        table: 'tickets',
        where: { channel_id: '${channel.id}' },
        as: 'ticket',
      },
      {
        action: 'flow_if',
        condition: '!ticket[0]',
        then: [
          { action: 'reply', content: 'This is not a ticket channel!', ephemeral: true },
          { action: 'abort' },
        ],
      },
      // Confirm close
      {
        action: 'reply',
        content: 'Are you sure you want to close this ticket?',
        ephemeral: true,
        components: [
          {
            type: 'action_row',
            components: [
              { type: 'button', style: 'danger', label: 'Close Ticket', custom_id: 'ticket_close_confirm' },
              { type: 'button', style: 'secondary', label: 'Cancel', custom_id: 'ticket_close_cancel' },
            ],
          },
        ],
      },
    ],
  },
  // Handle close confirmation
  {
    event: 'button_click',
    condition: 'interaction.customId === "ticket_close_confirm"',
    actions: [
      {
        action: 'db_query',
        table: 'tickets',
        where: { channel_id: '${channel.id}' },
        as: 'ticket',
      },
      // Generate transcript if configured
      {
        action: 'flow_if',
        condition: 'config.tickets.includeTranscript && config.tickets.logChannel',
        then: [
          {
            action: 'db_query',
            table: 'ticket_messages',
            where: { ticket_id: '${ticket[0].id}' },
            order_by: 'created_at ASC',
            as: 'messages',
          },
          {
            action: 'set',
            key: 'transcriptText',
            value: '${messages | map(m => "[" + formatDate(m.created_at, "YYYY-MM-DD HH:mm:ss") + "] " + m.author_name + ": " + m.content) | join("\\n")}',
          },
          {
            action: 'send_message',
            channel: '${config.tickets.logChannel}',
            embed: {
              title: 'Ticket Closed',
              fields: [
                { name: 'Ticket ID', value: '${ticket[0].id}', inline: true },
                { name: 'Opened by', value: '<@${ticket[0].user_id}>', inline: true },
                { name: 'Closed by', value: '${user}', inline: true },
                { name: 'Category', value: '${ticket[0].category}', inline: true },
              ],
              color: '#ed4245',
              timestamp: '${now()}',
            },
            files: [
              {
                attachment: '${Buffer.from(transcriptText)}',
                name: 'transcript-${ticket[0].id}.txt',
              },
            ],
          },
        ],
      },
      // Update database
      {
        action: 'db_update',
        table: 'tickets',
        where: { channel_id: '${channel.id}' },
        data: { status: 'closed', closed_at: '${now()}' },
      },
      // DM user if configured
      {
        action: 'flow_if',
        condition: 'config.tickets.dmOnClose',
        then: [
          {
            action: 'send_dm',
            user: '${ticket[0].user_id}',
            embed: {
              title: 'Ticket Closed',
              description: 'Your ticket in ${guild.name} has been closed.',
              color: '#ed4245',
            },
          },
        ],
      },
      // Delete channel after delay
      {
        action: 'send_message',
        channel: '${channel.id}',
        content: 'This ticket will be deleted in 5 seconds...',
      },
      { action: 'wait', duration: 5000 },
      { action: 'delete_channel', channel: '${channel.id}' },
    ],
  },
  // Handle transcript button
  {
    event: 'button_click',
    condition: 'interaction.customId === "ticket_transcript"',
    actions: [
      {
        action: 'db_query',
        table: 'tickets',
        where: { channel_id: '${channel.id}' },
        as: 'ticket',
      },
      {
        action: 'db_query',
        table: 'ticket_messages',
        where: { ticket_id: '${ticket[0].id}' },
        order_by: 'created_at ASC',
        as: 'messages',
      },
      {
        action: 'set',
        key: 'transcriptText',
        value: '${messages | map(m => "[" + formatDate(m.created_at, "YYYY-MM-DD HH:mm:ss") + "] " + m.author_name + ": " + m.content) | join("\\n")}',
      },
      {
        action: 'reply',
        content: 'Here is the transcript:',
        ephemeral: true,
        files: [
          {
            attachment: '${Buffer.from(transcriptText)}',
            name: 'transcript-${ticket[0].id}.txt',
          },
        ],
      },
    ],
  },
  // Log ticket messages
  {
    event: 'message',
    condition: 'channel.parentId === config.tickets.category',
    actions: [
      {
        action: 'db_query',
        table: 'tickets',
        where: { channel_id: '${channel.id}' },
        as: 'ticket',
      },
      {
        action: 'flow_if',
        condition: 'ticket[0]',
        then: [
          {
            action: 'db_insert',
            table: 'ticket_messages',
            data: {
              ticket_id: '${ticket[0].id}',
              author_id: '${user.id}',
              author_name: '${user.tag}',
              content: '${message.content}',
              attachments: '${message.attachments | map(a => a.url)}',
              created_at: '${now()}',
            },
          },
        ],
      },
    ],
  },
];

export const ticketsCommands: CommandDefinition[] = [
  {
    name: 'ticket',
    description: 'Ticket management commands',
    subcommands: [
      {
        name: 'panel',
        description: 'Create a ticket panel',
        options: [
          { name: 'channel', description: 'Channel to send panel', type: 'channel', required: false },
          { name: 'message', description: 'Custom panel message', type: 'string', required: false },
        ],
        actions: [
          {
            action: 'send_message',
            channel: '${args.channel?.id || channel.id}',
            embed: {
              title: 'Support Tickets',
              description: '${args.message || "Need help? Click the button below to create a support ticket."}',
              color: '#5865f2',
            },
            components: '${ticketPanelComponents}',
          },
          {
            action: 'reply',
            content: 'Ticket panel created!',
            ephemeral: true,
          },
        ],
      },
      {
        name: 'add',
        description: 'Add a user to the ticket',
        options: [
          { name: 'user', description: 'User to add', type: 'user', required: true },
        ],
        actions: [
          {
            action: 'db_query',
            table: 'tickets',
            where: { channel_id: '${channel.id}' },
            as: 'ticket',
          },
          {
            action: 'flow_if',
            condition: '!ticket[0]',
            then: [
              { action: 'reply', content: 'This is not a ticket channel!', ephemeral: true },
              { action: 'abort' },
            ],
          },
          {
            action: 'set_channel_permissions',
            channel: '${channel.id}',
            user: '${args.user.id}',
            allow: ['VIEW_CHANNEL', 'SEND_MESSAGES', 'READ_MESSAGE_HISTORY'],
          },
          {
            action: 'send_message',
            channel: '${channel.id}',
            content: '${args.user} has been added to the ticket.',
          },
          { action: 'reply', content: 'User added!', ephemeral: true },
        ],
      },
      {
        name: 'remove',
        description: 'Remove a user from the ticket',
        options: [
          { name: 'user', description: 'User to remove', type: 'user', required: true },
        ],
        actions: [
          {
            action: 'db_query',
            table: 'tickets',
            where: { channel_id: '${channel.id}' },
            as: 'ticket',
          },
          {
            action: 'flow_if',
            condition: '!ticket[0]',
            then: [
              { action: 'reply', content: 'This is not a ticket channel!', ephemeral: true },
              { action: 'abort' },
            ],
          },
          {
            action: 'set_channel_permissions',
            channel: '${channel.id}',
            user: '${args.user.id}',
            deny: ['VIEW_CHANNEL'],
          },
          {
            action: 'send_message',
            channel: '${channel.id}',
            content: '${args.user.username} has been removed from the ticket.',
          },
          { action: 'reply', content: 'User removed!', ephemeral: true },
        ],
      },
      {
        name: 'rename',
        description: 'Rename the ticket channel',
        options: [
          { name: 'name', description: 'New channel name', type: 'string', required: true },
        ],
        actions: [
          {
            action: 'db_query',
            table: 'tickets',
            where: { channel_id: '${channel.id}' },
            as: 'ticket',
          },
          {
            action: 'flow_if',
            condition: '!ticket[0]',
            then: [
              { action: 'reply', content: 'This is not a ticket channel!', ephemeral: true },
              { action: 'abort' },
            ],
          },
          {
            action: 'edit_channel',
            channel: '${channel.id}',
            name: '${args.name}',
          },
          { action: 'reply', content: 'Ticket renamed!', ephemeral: true },
        ],
      },
    ],
  },
];

export function getTicketsSpec(config: TicketsConfig = {}): Partial<FurlowSpec> {
  return {
    events: ticketsEventHandlers,
    commands: ticketsCommands,
    state: {
      tables: ticketsTables,
    },
  };
}
