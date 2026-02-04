/**
 * Polls builtin module
 * Handles poll creation and voting
 */

import type { FurlowSpec, CommandDefinition, EventHandler, TableDefinition } from '@furlow/schema';

export interface PollsConfig {
  /** Maximum poll options */
  maxOptions?: number;
  /** Default poll duration */
  defaultDuration?: string;
  /** Allow anonymous polls */
  allowAnonymous?: boolean;
}

export const pollsTables: Record<string, TableDefinition> = {
  polls: {
    columns: {
      id: { type: 'number', primary: true },
      guild_id: { type: 'string', index: true },
      channel_id: { type: 'string' },
      message_id: { type: 'string', unique: true },
      creator_id: { type: 'string' },
      question: { type: 'string' },
      options: { type: 'json' },
      multiple_choice: { type: 'boolean', default: false },
      anonymous: { type: 'boolean', default: false },
      ends_at: { type: 'timestamp' },
      ended: { type: 'boolean', default: false },
      created_at: { type: 'timestamp' },
    },
  },
  poll_votes: {
    columns: {
      id: { type: 'number', primary: true },
      poll_id: { type: 'number', index: true },
      user_id: { type: 'string' },
      option_index: { type: 'number' },
      created_at: { type: 'timestamp' },
    },
  },
};

export const pollsEventHandlers: EventHandler[] = [
  // Handle vote button
  {
    event: 'button_click',
    condition: 'interaction.customId.startsWith("poll_vote_")',
    actions: [
      {
        action: 'set',
        key: 'parts',
        value: '${interaction.customId.split("_")}',
      },
      {
        action: 'set',
        key: 'pollId',
        value: '${parts[2]}',
      },
      {
        action: 'set',
        key: 'optionIndex',
        value: '${parseInt(parts[3])}',
      },
      {
        action: 'db_query',
        table: 'polls',
        where: { id: '${pollId}' },
        as: 'poll',
      },
      {
        action: 'flow_if',
        condition: '!poll[0] || poll[0].ended',
        then: [
          { action: 'reply', content: 'This poll has ended!', ephemeral: true },
          { action: 'abort' },
        ],
      },
      // Check existing vote
      {
        action: 'db_query',
        table: 'poll_votes',
        where: { poll_id: '${pollId}', user_id: '${user.id}' },
        as: 'existingVotes',
      },
      {
        action: 'flow_if',
        condition: '!poll[0].multiple_choice && existingVotes.length > 0',
        then: [
          // Change vote
          {
            action: 'db_update',
            table: 'poll_votes',
            where: { poll_id: '${pollId}', user_id: '${user.id}' },
            data: { option_index: '${optionIndex}' },
          },
          { action: 'reply', content: 'Vote changed!', ephemeral: true },
        ],
        else: [
          // Add vote
          {
            action: 'db_insert',
            table: 'poll_votes',
            data: {
              poll_id: '${pollId}',
              user_id: '${user.id}',
              option_index: '${optionIndex}',
              created_at: '${now()}',
            },
          },
          { action: 'reply', content: 'Vote recorded!', ephemeral: true },
        ],
      },
      // Update poll message
      {
        action: 'db_query',
        table: 'poll_votes',
        where: { poll_id: '${pollId}' },
        as: 'allVotes',
      },
      {
        action: 'set',
        key: 'totalVotes',
        value: '${allVotes.length}',
      },
      {
        action: 'set',
        key: 'options',
        value: '${poll[0].options}',
      },
      {
        action: 'set',
        key: 'voteCounts',
        value: '${options.map((_, i) => allVotes.filter(v => v.option_index === i).length)}',
      },
      {
        action: 'set',
        key: 'optionText',
        value: '${options.map((opt, i) => opt.emoji + " " + opt.text + " - **" + voteCounts[i] + "** (" + (totalVotes > 0 ? floor(voteCounts[i] / totalVotes * 100) : 0) + "%)").join("\\n")}',
      },
      {
        action: 'edit_message',
        channel: '${poll[0].channel_id}',
        message: '${poll[0].message_id}',
        embed: {
          title: '📊 ${poll[0].question}',
          description: '${optionText}\n\n**Total votes:** ${totalVotes}',
          color: '#5865f2',
          footer: { text: '${poll[0].ends_at ? "Ends " + timestamp(poll[0].ends_at, "R") : "No end time"}' },
        },
      },
    ],
  },
  // Poll end scheduler
  {
    event: 'scheduler_tick',
    actions: [
      {
        action: 'db_query',
        table: 'polls',
        where: { ended: false },
        as: 'activePolls',
      },
      {
        action: 'batch',
        items: '${activePolls.filter(p => p.ends_at && new Date(p.ends_at) <= now())}',
        each: { action: 'emit', event: 'poll_end', data: { pollId: '${item.id}' } },
      },
    ],
  },
  // End poll
  {
    event: 'poll_end',
    actions: [
      {
        action: 'db_query',
        table: 'polls',
        where: { id: '${event.data.pollId}' },
        as: 'poll',
      },
      {
        action: 'db_query',
        table: 'poll_votes',
        where: { poll_id: '${event.data.pollId}' },
        as: 'allVotes',
      },
      {
        action: 'db_update',
        table: 'polls',
        where: { id: '${event.data.pollId}' },
        data: { ended: true },
      },
      {
        action: 'set',
        key: 'options',
        value: '${poll[0].options}',
      },
      {
        action: 'set',
        key: 'totalVotes',
        value: '${allVotes.length}',
      },
      {
        action: 'set',
        key: 'voteCounts',
        value: '${options.map((_, i) => allVotes.filter(v => v.option_index === i).length)}',
      },
      {
        action: 'set',
        key: 'maxVotes',
        value: '${Math.max(...voteCounts)}',
      },
      {
        action: 'set',
        key: 'winners',
        value: '${options.filter((_, i) => voteCounts[i] === maxVotes).map(o => o.text)}',
      },
      {
        action: 'set',
        key: 'optionText',
        value: '${options.map((opt, i) => (voteCounts[i] === maxVotes ? "🏆 " : "") + opt.emoji + " " + opt.text + " - **" + voteCounts[i] + "** (" + (totalVotes > 0 ? floor(voteCounts[i] / totalVotes * 100) : 0) + "%)").join("\\n")}',
      },
      {
        action: 'edit_message',
        channel: '${poll[0].channel_id}',
        message: '${poll[0].message_id}',
        embed: {
          title: '📊 ${poll[0].question} (ENDED)',
          description: '${optionText}\n\n**Total votes:** ${totalVotes}',
          color: '#72767d',
          footer: { text: 'Poll ended' },
        },
        components: [],
      },
    ],
  },
];

export const pollsCommands: CommandDefinition[] = [
  {
    name: 'poll',
    description: 'Create a poll',
    options: [
      { name: 'question', description: 'Poll question', type: 'string', required: true },
      { name: 'options', description: 'Options separated by |', type: 'string', required: true },
      { name: 'duration', description: 'Poll duration (e.g., 1h, 1d)', type: 'string', required: false },
      { name: 'multiple', description: 'Allow multiple choices', type: 'boolean', required: false },
    ],
    actions: [
      {
        action: 'set',
        key: 'optionTexts',
        value: '${args.options.split("|").map(o => o.trim()).filter(o => o)}',
      },
      {
        action: 'flow_if',
        condition: 'optionTexts.length < 2',
        then: [
          { action: 'reply', content: 'You need at least 2 options!', ephemeral: true },
          { action: 'abort' },
        ],
      },
      {
        action: 'flow_if',
        condition: 'optionTexts.length > (config.polls?.maxOptions || 10)',
        then: [
          { action: 'reply', content: 'Maximum ${config.polls?.maxOptions || 10} options allowed!', ephemeral: true },
          { action: 'abort' },
        ],
      },
      {
        action: 'set',
        key: 'emojis',
        value: '["1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣", "🔟"]',
      },
      {
        action: 'set',
        key: 'options',
        value: '${optionTexts.map((text, i) => ({ text, emoji: emojis[i] }))}',
      },
      {
        action: 'set',
        key: 'endsAt',
        value: '${args.duration ? addDuration(now(), args.duration) : null}',
      },
      {
        action: 'set',
        key: 'optionDisplay',
        value: '${options.map(o => o.emoji + " " + o.text + " - **0** (0%)").join("\\n")}',
      },
      // Create buttons
      {
        action: 'set',
        key: 'buttons',
        value: '${options.map((o, i) => ({ type: "button", style: "secondary", emoji: o.emoji, custom_id: "poll_vote_PLACEHOLDER_" + i }))}',
      },
      {
        action: 'set',
        key: 'rows',
        value: '${chunk(buttons, 5).map(row => ({ type: "action_row", components: row }))}',
      },
      {
        action: 'send_message',
        channel: '${channel.id}',
        embed: {
          title: '📊 ${args.question}',
          description: '${optionDisplay}\n\n**Total votes:** 0',
          color: '#5865f2',
          footer: { text: '${endsAt ? "Ends " + timestamp(endsAt, "R") : "No end time"}' },
        },
        components: '${rows}',
        as: 'pollMessage',
      },
      {
        action: 'db_insert',
        table: 'polls',
        data: {
          guild_id: '${guild.id}',
          channel_id: '${channel.id}',
          message_id: '${pollMessage.id}',
          creator_id: '${user.id}',
          question: '${args.question}',
          options: '${options}',
          multiple_choice: '${args.multiple || false}',
          ends_at: '${endsAt}',
          created_at: '${now()}',
        },
        as: 'poll',
      },
      // Update buttons with correct poll ID
      {
        action: 'set',
        key: 'buttons',
        value: '${options.map((o, i) => ({ type: "button", style: "secondary", emoji: o.emoji, custom_id: "poll_vote_" + poll.id + "_" + i }))}',
      },
      {
        action: 'set',
        key: 'rows',
        value: '${chunk(buttons, 5).map(row => ({ type: "action_row", components: row }))}',
      },
      {
        action: 'edit_message',
        channel: '${channel.id}',
        message: '${pollMessage.id}',
        components: '${rows}',
      },
      {
        action: 'reply',
        content: 'Poll created!',
        ephemeral: true,
      },
    ],
  },
  {
    name: 'endpoll',
    description: 'End a poll early',
    options: [
      { name: 'message_id', description: 'Poll message ID', type: 'string', required: true },
    ],
    actions: [
      {
        action: 'db_query',
        table: 'polls',
        where: { message_id: '${args.message_id}' },
        as: 'poll',
      },
      {
        action: 'flow_if',
        condition: '!poll[0]',
        then: [
          { action: 'reply', content: 'Poll not found!', ephemeral: true },
          { action: 'abort' },
        ],
      },
      {
        action: 'flow_if',
        condition: 'poll[0].creator_id !== user.id && !member.permissions.has("MANAGE_MESSAGES")',
        then: [
          { action: 'reply', content: 'You can only end your own polls!', ephemeral: true },
          { action: 'abort' },
        ],
      },
      {
        action: 'emit',
        event: 'poll_end',
        data: { pollId: '${poll[0].id}' },
      },
      {
        action: 'reply',
        content: 'Poll ended!',
        ephemeral: true,
      },
    ],
  },
];

export function getPollsSpec(config: PollsConfig = {}): Partial<FurlowSpec> {
  return {
    commands: pollsCommands,
    events: pollsEventHandlers,
    state: {
      tables: pollsTables,
    },
  };
}
