/**
 * Reminders builtin module
 * Handles scheduled reminders with DM delivery
 */

import type { FurlowSpec, CommandDefinition, EventHandler, TableDefinition } from '@furlow/schema';

export interface RemindersConfig {
  /** Maximum reminders per user */
  maxRemindersPerUser?: number;
  /** Minimum reminder duration */
  minDuration?: string;
  /** Maximum reminder duration */
  maxDuration?: string;
  /** Allow DM reminders */
  allowDM?: boolean;
}

export const remindersTables: Record<string, TableDefinition> = {
  reminders: {
    columns: {
      id: { type: 'number', primary: true },
      guild_id: { type: 'string', index: true },
      channel_id: { type: 'string' },
      user_id: { type: 'string', index: true },
      message: { type: 'string' },
      remind_at: { type: 'timestamp', index: true },
      dm: { type: 'boolean', default: false },
      created_at: { type: 'timestamp' },
    },
  },
};

export const remindersEventHandlers: EventHandler[] = [
  // Check reminders on scheduler tick
  {
    event: 'scheduler_tick',
    actions: [
      {
        action: 'db_query',
        table: 'reminders',
        where: {},
        as: 'allReminders',
      },
      {
        action: 'set',
        key: 'dueReminders',
        value: '${allReminders.filter(r => new Date(r.remind_at) <= now())}',
      },
      {
        action: 'batch',
        items: '${dueReminders}',
        each: { action: 'emit', event: 'reminder_due', data: { reminder: '${item}' } },
      },
    ],
  },
  // Handle due reminder
  {
    event: 'reminder_due',
    actions: [
      {
        action: 'set',
        key: 'reminder',
        value: '${event.data.reminder}',
      },
      // Delete the reminder
      {
        action: 'db_delete',
        table: 'reminders',
        where: { id: '${reminder.id}' },
      },
      // Send reminder
      {
        action: 'flow_if',
        condition: 'reminder.dm',
        then: [
          {
            action: 'send_dm',
            user: '${reminder.user_id}',
            embed: {
              title: 'Reminder',
              description: '${reminder.message}',
              color: '#5865f2',
              footer: { text: 'Set ${timestamp(reminder.created_at, "R")}' },
            },
          },
        ],
        else: [
          {
            action: 'send_message',
            channel: '${reminder.channel_id}',
            content: '<@${reminder.user_id}> Reminder: ${reminder.message}',
          },
        ],
      },
    ],
  },
];

export const remindersCommands: CommandDefinition[] = [
  {
    name: 'remind',
    description: 'Set a reminder',
    options: [
      { name: 'time', description: 'When to remind (e.g., 10m, 2h, 1d)', type: 'string', required: true },
      { name: 'message', description: 'Reminder message', type: 'string', required: true },
      { name: 'dm', description: 'Send reminder via DM', type: 'boolean', required: false },
    ],
    actions: [
      // Check max reminders
      {
        action: 'db_query',
        table: 'reminders',
        where: { user_id: '${user.id}' },
        as: 'userReminders',
      },
      {
        action: 'flow_if',
        condition: 'userReminders.length >= (config.reminders?.maxRemindersPerUser || 25)',
        then: [
          { action: 'reply', content: 'You have too many reminders! Delete some first.', ephemeral: true },
          { action: 'abort' },
        ],
      },
      // Calculate remind time
      {
        action: 'set',
        key: 'remindAt',
        value: '${addDuration(now(), args.time)}',
      },
      // Create reminder
      {
        action: 'db_insert',
        table: 'reminders',
        data: {
          guild_id: '${guild.id}',
          channel_id: '${channel.id}',
          user_id: '${user.id}',
          message: '${args.message}',
          remind_at: '${remindAt}',
          dm: '${args.dm || false}',
          created_at: '${now()}',
        },
        as: 'reminder',
      },
      {
        action: 'reply',
        embed: {
          title: 'Reminder Set',
          description: 'I\'ll remind you ${timestamp(remindAt, "R")}: ${args.message}',
          color: '#57f287',
          footer: { text: 'ID: ${reminder.id}' },
        },
        ephemeral: true,
      },
    ],
  },
  {
    name: 'reminders',
    description: 'View your reminders',
    actions: [
      {
        action: 'db_query',
        table: 'reminders',
        where: { user_id: '${user.id}' },
        order_by: 'remind_at ASC',
        as: 'reminders',
      },
      {
        action: 'flow_if',
        condition: 'reminders.length === 0',
        then: [
          { action: 'reply', content: 'You have no reminders!', ephemeral: true },
          { action: 'abort' },
        ],
      },
      {
        action: 'set',
        key: 'reminderList',
        value: '${reminders.map((r, i) => "**" + (i + 1) + ".** " + truncate(r.message, 50) + " - " + timestamp(r.remind_at, "R") + " (ID: " + r.id + ")").join("\\n")}',
      },
      {
        action: 'reply',
        embed: {
          title: 'Your Reminders',
          description: '${reminderList}',
          color: '#5865f2',
          footer: { text: '${reminders.length} reminder(s)' },
        },
        ephemeral: true,
      },
    ],
  },
  {
    name: 'delreminder',
    description: 'Delete a reminder',
    options: [
      { name: 'id', description: 'Reminder ID', type: 'integer', required: true },
    ],
    actions: [
      {
        action: 'db_query',
        table: 'reminders',
        where: { id: '${args.id}', user_id: '${user.id}' },
        as: 'reminder',
      },
      {
        action: 'flow_if',
        condition: 'reminder.length === 0',
        then: [
          { action: 'reply', content: 'Reminder not found or not yours!', ephemeral: true },
          { action: 'abort' },
        ],
      },
      {
        action: 'db_delete',
        table: 'reminders',
        where: { id: '${args.id}' },
      },
      {
        action: 'reply',
        content: 'Reminder deleted!',
        ephemeral: true,
      },
    ],
  },
];

export function getRemindersSpec(config: RemindersConfig = {}): Partial<FurlowSpec> {
  return {
    commands: remindersCommands,
    events: remindersEventHandlers,
    state: {
      tables: remindersTables,
    },
  };
}
