/**
 * Giveaways builtin module
 * Handles giveaway creation, entries, and winner selection
 */

import type { FurlowSpec, CommandDefinition, EventHandler, TableDefinition } from '@furlow/schema';

export interface GiveawaysConfig {
  /** Default giveaway duration */
  defaultDuration?: string;
  /** Giveaway manager role */
  managerRole?: string;
  /** Require role to enter */
  requireRole?: string;
  /** Embed color */
  embedColor?: string;
  /** End emoji */
  emoji?: string;
}

export const giveawaysTables: Record<string, TableDefinition> = {
  giveaways: {
    columns: {
      id: { type: 'number', primary: true },
      guild_id: { type: 'string', index: true },
      channel_id: { type: 'string' },
      message_id: { type: 'string', unique: true },
      host_id: { type: 'string' },
      prize: { type: 'string' },
      winners_count: { type: 'number', default: 1 },
      ends_at: { type: 'timestamp', index: true },
      ended: { type: 'boolean', default: false },
      require_role: { type: 'string' },
      created_at: { type: 'timestamp' },
    },
  },
  giveaway_entries: {
    columns: {
      id: { type: 'number', primary: true },
      giveaway_id: { type: 'number', index: true },
      user_id: { type: 'string' },
      created_at: { type: 'timestamp' },
    },
  },
};

export const giveawaysEventHandlers: EventHandler[] = [
  // Handle giveaway button click
  {
    event: 'button_click',
    condition: 'interaction.customId.startsWith("giveaway_enter_")',
    actions: [
      {
        action: 'set',
        key: 'giveawayId',
        value: '${interaction.customId.replace("giveaway_enter_", "")}',
      },
      {
        action: 'db_query',
        table: 'giveaways',
        where: { id: '${giveawayId}' },
        as: 'giveaway',
      },
      {
        action: 'flow_if',
        condition: '!giveaway[0] || giveaway[0].ended',
        then: [
          { action: 'reply', content: 'This giveaway has ended!', ephemeral: true },
          { action: 'abort' },
        ],
      },
      // Check role requirement
      {
        action: 'flow_if',
        condition: 'giveaway[0].require_role && !member.roles.cache.has(giveaway[0].require_role)',
        then: [
          { action: 'reply', content: 'You need the <@&${giveaway[0].require_role}> role to enter!', ephemeral: true },
          { action: 'abort' },
        ],
      },
      // Check if already entered
      {
        action: 'db_query',
        table: 'giveaway_entries',
        where: { giveaway_id: '${giveawayId}', user_id: '${user.id}' },
        as: 'existing',
      },
      {
        action: 'flow_if',
        condition: 'existing.length > 0',
        then: [
          // Remove entry
          {
            action: 'db_delete',
            table: 'giveaway_entries',
            where: { giveaway_id: '${giveawayId}', user_id: '${user.id}' },
          },
          { action: 'reply', content: 'You have left the giveaway!', ephemeral: true },
        ],
        else: [
          // Add entry
          {
            action: 'db_insert',
            table: 'giveaway_entries',
            data: {
              giveaway_id: '${giveawayId}',
              user_id: '${user.id}',
              created_at: '${now()}',
            },
          },
          { action: 'reply', content: 'You have entered the giveaway!', ephemeral: true },
        ],
      },
      // Update entry count on message
      {
        action: 'db_query',
        table: 'giveaway_entries',
        where: { giveaway_id: '${giveawayId}' },
        as: 'entries',
      },
      {
        action: 'edit_message',
        channel: '${giveaway[0].channel_id}',
        message: '${giveaway[0].message_id}',
        embed: {
          title: '${config.giveaways?.emoji || "🎉"} GIVEAWAY ${config.giveaways?.emoji || "🎉"}',
          description: '**Prize:** ${giveaway[0].prize}\n**Hosted by:** <@${giveaway[0].host_id}>\n**Winners:** ${giveaway[0].winners_count}\n**Entries:** ${entries.length}\n\nEnds: ${timestamp(giveaway[0].ends_at, "R")}',
          color: '${config.giveaways?.embedColor || "#ff73fa"}',
          footer: { text: 'ID: ${giveaway[0].id}' },
        },
      },
    ],
  },
  // Scheduled giveaway end
  {
    event: 'scheduler_tick',
    actions: [
      {
        action: 'db_query',
        table: 'giveaways',
        where: { ended: false },
        as: 'activeGiveaways',
      },
      {
        action: 'batch',
        items: '${activeGiveaways.filter(g => new Date(g.ends_at) <= now())}',
        each: { action: 'emit', event: 'giveaway_end', data: { giveawayId: '${item.id}' } },
      },
    ],
  },
  // End giveaway
  {
    event: 'giveaway_end',
    actions: [
      {
        action: 'db_query',
        table: 'giveaways',
        where: { id: '${event.data.giveawayId}' },
        as: 'giveaway',
      },
      {
        action: 'db_query',
        table: 'giveaway_entries',
        where: { giveaway_id: '${event.data.giveawayId}' },
        as: 'entries',
      },
      // Select winners
      {
        action: 'set',
        key: 'shuffled',
        value: '${shuffle(entries)}',
      },
      {
        action: 'set',
        key: 'winners',
        value: '${shuffled.slice(0, giveaway[0].winners_count)}',
      },
      // Mark as ended
      {
        action: 'db_update',
        table: 'giveaways',
        where: { id: '${event.data.giveawayId}' },
        data: { ended: true },
      },
      // Update message
      {
        action: 'flow_if',
        condition: 'winners.length === 0',
        then: [
          {
            action: 'edit_message',
            channel: '${giveaway[0].channel_id}',
            message: '${giveaway[0].message_id}',
            embed: {
              title: 'GIVEAWAY ENDED',
              description: '**Prize:** ${giveaway[0].prize}\n\nNo valid entries.',
              color: '#72767d',
            },
            components: [],
          },
        ],
        else: [
          {
            action: 'set',
            key: 'winnerMentions',
            value: '${winners.map(w => "<@" + w.user_id + ">").join(", ")}',
          },
          {
            action: 'edit_message',
            channel: '${giveaway[0].channel_id}',
            message: '${giveaway[0].message_id}',
            embed: {
              title: 'GIVEAWAY ENDED',
              description: '**Prize:** ${giveaway[0].prize}\n\n**Winners:** ${winnerMentions}',
              color: '#57f287',
            },
            components: [],
          },
          {
            action: 'send_message',
            channel: '${giveaway[0].channel_id}',
            content: 'Congratulations ${winnerMentions}! You won **${giveaway[0].prize}**!',
          },
        ],
      },
    ],
  },
];

export const giveawaysCommands: CommandDefinition[] = [
  {
    name: 'giveaway',
    description: 'Giveaway management',
    subcommands: [
      {
        name: 'start',
        description: 'Start a giveaway',
        options: [
          { name: 'prize', description: 'Prize to give away', type: 'string', required: true },
          { name: 'duration', description: 'Duration (e.g., 1h, 1d, 1w)', type: 'string', required: true },
          { name: 'winners', description: 'Number of winners', type: 'integer', required: false },
          { name: 'require_role', description: 'Required role to enter', type: 'role', required: false },
        ],
        actions: [
          {
            action: 'set',
            key: 'endsAt',
            value: '${addDuration(now(), args.duration)}',
          },
          {
            action: 'send_message',
            channel: '${channel.id}',
            embed: {
              title: '${config.giveaways?.emoji || "🎉"} GIVEAWAY ${config.giveaways?.emoji || "🎉"}',
              description: '**Prize:** ${args.prize}\n**Hosted by:** ${user}\n**Winners:** ${args.winners || 1}\n**Entries:** 0\n\nEnds: ${timestamp(endsAt, "R")}',
              color: '${config.giveaways?.embedColor || "#ff73fa"}',
            },
            components: [
              {
                type: 'action_row',
                components: [
                  {
                    type: 'button',
                    style: 'primary',
                    label: 'Enter',
                    emoji: '🎉',
                    custom_id: 'giveaway_enter_PLACEHOLDER',
                  },
                ],
              },
            ],
            as: 'giveawayMessage',
          },
          {
            action: 'db_insert',
            table: 'giveaways',
            data: {
              guild_id: '${guild.id}',
              channel_id: '${channel.id}',
              message_id: '${giveawayMessage.id}',
              host_id: '${user.id}',
              prize: '${args.prize}',
              winners_count: '${args.winners || 1}',
              ends_at: '${endsAt}',
              require_role: '${args.require_role?.id}',
              created_at: '${now()}',
            },
            as: 'giveaway',
          },
          // Update button with correct ID
          {
            action: 'edit_message',
            channel: '${channel.id}',
            message: '${giveawayMessage.id}',
            embed: {
              title: '${config.giveaways?.emoji || "🎉"} GIVEAWAY ${config.giveaways?.emoji || "🎉"}',
              description: '**Prize:** ${args.prize}\n**Hosted by:** ${user}\n**Winners:** ${args.winners || 1}\n**Entries:** 0\n\nEnds: ${timestamp(endsAt, "R")}',
              color: '${config.giveaways?.embedColor || "#ff73fa"}',
              footer: { text: 'ID: ${giveaway.id}' },
            },
            components: [
              {
                type: 'action_row',
                components: [
                  {
                    type: 'button',
                    style: 'primary',
                    label: 'Enter',
                    emoji: '🎉',
                    custom_id: 'giveaway_enter_${giveaway.id}',
                  },
                ],
              },
            ],
          },
          {
            action: 'reply',
            content: 'Giveaway started!',
            ephemeral: true,
          },
        ],
      },
      {
        name: 'end',
        description: 'End a giveaway early',
        options: [
          { name: 'message_id', description: 'Giveaway message ID', type: 'string', required: true },
        ],
        actions: [
          {
            action: 'db_query',
            table: 'giveaways',
            where: { message_id: '${args.message_id}' },
            as: 'giveaway',
          },
          {
            action: 'flow_if',
            condition: '!giveaway[0]',
            then: [
              { action: 'reply', content: 'Giveaway not found!', ephemeral: true },
              { action: 'abort' },
            ],
          },
          {
            action: 'emit',
            event: 'giveaway_end',
            data: { giveawayId: '${giveaway[0].id}' },
          },
          {
            action: 'reply',
            content: 'Giveaway ended!',
            ephemeral: true,
          },
        ],
      },
      {
        name: 'reroll',
        description: 'Reroll winners for an ended giveaway',
        options: [
          { name: 'message_id', description: 'Giveaway message ID', type: 'string', required: true },
          { name: 'winners', description: 'Number of new winners', type: 'integer', required: false },
        ],
        actions: [
          {
            action: 'db_query',
            table: 'giveaways',
            where: { message_id: '${args.message_id}' },
            as: 'giveaway',
          },
          {
            action: 'flow_if',
            condition: '!giveaway[0] || !giveaway[0].ended',
            then: [
              { action: 'reply', content: 'Giveaway not found or not ended!', ephemeral: true },
              { action: 'abort' },
            ],
          },
          {
            action: 'db_query',
            table: 'giveaway_entries',
            where: { giveaway_id: '${giveaway[0].id}' },
            as: 'entries',
          },
          {
            action: 'set',
            key: 'shuffled',
            value: '${shuffle(entries)}',
          },
          {
            action: 'set',
            key: 'winners',
            value: '${shuffled.slice(0, args.winners || 1)}',
          },
          {
            action: 'flow_if',
            condition: 'winners.length === 0',
            then: [
              { action: 'reply', content: 'No valid entries to reroll!', ephemeral: true },
              { action: 'abort' },
            ],
          },
          {
            action: 'set',
            key: 'winnerMentions',
            value: '${winners.map(w => "<@" + w.user_id + ">").join(", ")}',
          },
          {
            action: 'send_message',
            channel: '${giveaway[0].channel_id}',
            content: 'New winner(s): ${winnerMentions}! Congratulations on winning **${giveaway[0].prize}**!',
          },
          {
            action: 'reply',
            content: 'Rerolled successfully!',
            ephemeral: true,
          },
        ],
      },
    ],
  },
];

export function getGiveawaysSpec(config: GiveawaysConfig = {}): Partial<FurlowSpec> {
  return {
    commands: giveawaysCommands,
    events: giveawaysEventHandlers,
    state: {
      tables: giveawaysTables,
    },
  };
}
