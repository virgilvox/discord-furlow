/**
 * Welcome builtin module
 * Handles member join/leave messages, auto-role assignment, and welcome images
 */

import type { FurlowSpec, CommandDefinition, EventHandler, CanvasGenerator } from '@furlow/schema';

export interface WelcomeConfig {
  /** Channel to send welcome messages */
  channel?: string;
  /** Welcome message template */
  message?: string;
  /** Embed for welcome messages */
  embed?: {
    title?: string;
    description?: string;
    color?: string;
    thumbnail?: string;
    image?: string;
    footer?: string;
  };
  /** Use welcome image */
  useImage?: boolean;
  /** Welcome image generator name */
  imageGenerator?: string;
  /** Roles to assign on join */
  autoRoles?: string[];
  /** Leave channel (defaults to welcome channel) */
  leaveChannel?: string;
  /** Leave message template */
  leaveMessage?: string;
  /** Leave embed */
  leaveEmbed?: {
    title?: string;
    description?: string;
    color?: string;
  };
  /** DM new members */
  dmNewMembers?: boolean;
  /** DM message */
  dmMessage?: string;
}

export const welcomeEventHandlers: EventHandler[] = [
  {
    event: 'member_join',
    actions: [
      // Auto-role assignment
      {
        action: 'flow_if',
        condition: 'config.welcome.autoRoles && config.welcome.autoRoles.length > 0',
        then: [
          {
            action: 'assign_role',
            user: '${member.id}',
            role: '${config.welcome.autoRoles}',
          },
        ],
      },
      // DM new member
      {
        action: 'flow_if',
        condition: 'config.welcome.dmNewMembers',
        then: [
          {
            action: 'send_dm',
            user: '${member.id}',
            content: '${config.welcome.dmMessage || "Welcome to " + guild.name + "!"}',
          },
        ],
      },
      // Welcome message with image
      {
        action: 'flow_if',
        condition: 'config.welcome.useImage',
        then: [
          {
            action: 'canvas_render',
            generator: '${config.welcome.imageGenerator || "welcome_card"}',
            context: {
              member: '${member}',
              guild: '${guild}',
              memberCount: '${guild.member_count}',
            },
            as: 'welcomeImage',
          },
          {
            action: 'send_message',
            channel: '${config.welcome.channel}',
            content: '${config.welcome.message || "Welcome to the server, " + member.display_name + "!"}',
            files: [
              {
                attachment: '${welcomeImage}',
                name: 'welcome.png',
              },
            ],
          },
        ],
        else: [
          // Welcome message without image
          {
            action: 'flow_if',
            condition: 'config.welcome.embed',
            then: [
              {
                action: 'send_message',
                channel: '${config.welcome.channel}',
                content: '${config.welcome.message}',
                embed: {
                  title: '${config.welcome.embed.title || "Welcome!"}',
                  description: '${config.welcome.embed.description || "Welcome to " + guild.name + ", " + member.display_name + "!"}',
                  color: '${config.welcome.embed.color || "#5865f2"}',
                  thumbnail: '${config.welcome.embed.thumbnail || member.avatar}',
                  footer: {
                    text: '${config.welcome.embed.footer || "Member #" + guild.member_count}',
                  },
                },
              },
            ],
            else: [
              {
                action: 'send_message',
                channel: '${config.welcome.channel}',
                content: '${config.welcome.message || "Welcome to the server, " + member.display_name + "!"}',
              },
            ],
          },
        ],
      },
    ],
  },
  {
    event: 'member_leave',
    actions: [
      {
        action: 'flow_if',
        condition: 'config.welcome.leaveChannel || config.welcome.channel',
        then: [
          {
            action: 'flow_if',
            condition: 'config.welcome.leaveEmbed',
            then: [
              {
                action: 'send_message',
                channel: '${config.welcome.leaveChannel || config.welcome.channel}',
                embed: {
                  title: '${config.welcome.leaveEmbed.title || "Goodbye!"}',
                  description: '${config.welcome.leaveEmbed.description || member.display_name + " has left the server."}',
                  color: '${config.welcome.leaveEmbed.color || "#ed4245"}',
                },
              },
            ],
            else: [
              {
                action: 'send_message',
                channel: '${config.welcome.leaveChannel || config.welcome.channel}',
                content: '${config.welcome.leaveMessage || member.display_name + " has left the server."}',
              },
            ],
          },
        ],
      },
    ],
  },
];

export const welcomeCommands: CommandDefinition[] = [
  {
    name: 'welcome',
    description: 'Welcome system commands',
    subcommands: [
      {
        name: 'test',
        description: 'Test the welcome message',
        actions: [
          {
            action: 'emit',
            event: 'member_join',
            data: {
              member: '${member}',
              guild: '${guild}',
            },
          },
          {
            action: 'reply',
            content: 'Welcome message test triggered!',
            ephemeral: true,
          },
        ],
      },
      {
        name: 'set-channel',
        description: 'Set the welcome channel',
        options: [
          { name: 'channel', description: 'Channel for welcome messages', type: 'channel', required: true },
        ],
        actions: [
          {
            action: 'set',
            key: 'config.welcome.channel',
            value: '${args.channel.id}',
            scope: 'guild',
          },
          {
            action: 'reply',
            content: 'Welcome channel set to ${args.channel}',
            ephemeral: true,
          },
        ],
      },
      {
        name: 'set-message',
        description: 'Set the welcome message',
        options: [
          { name: 'message', description: 'Welcome message (use {member} and {guild})', type: 'string', required: true },
        ],
        actions: [
          {
            action: 'set',
            key: 'config.welcome.message',
            value: '${args.message}',
            scope: 'guild',
          },
          {
            action: 'reply',
            content: 'Welcome message updated!',
            ephemeral: true,
          },
        ],
      },
      {
        name: 'add-autorole',
        description: 'Add an auto-role',
        options: [
          { name: 'role', description: 'Role to assign on join', type: 'role', required: true },
        ],
        actions: [
          {
            action: 'list_push',
            key: 'config.welcome.autoRoles',
            value: '${args.role.id}',
            scope: 'guild',
          },
          {
            action: 'reply',
            content: 'Auto-role ${args.role.name} added!',
            ephemeral: true,
          },
        ],
      },
      {
        name: 'remove-autorole',
        description: 'Remove an auto-role',
        options: [
          { name: 'role', description: 'Role to remove', type: 'role', required: true },
        ],
        actions: [
          {
            action: 'list_remove',
            key: 'config.welcome.autoRoles',
            value: '${args.role.id}',
            scope: 'guild',
          },
          {
            action: 'reply',
            content: 'Auto-role ${args.role.name} removed!',
            ephemeral: true,
          },
        ],
      },
    ],
  },
];

export const welcomeCanvasGenerators: Record<string, CanvasGenerator> = {
  welcome_card: {
    width: 800,
    height: 300,
    background: '#2f3136',
    layers: [
      {
        type: 'rect',
        x: 0,
        y: 0,
        width: 800,
        height: 300,
        color: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        radius: 16,
      },
      {
        type: 'circle_image',
        url: '${member.avatar}',
        x: 400,
        y: 100,
        radius: 64,
        border: {
          width: 4,
          color: '#ffffff',
        },
      },
      {
        type: 'text',
        text: 'Welcome!',
        x: 400,
        y: 200,
        font: '32px "Poppins", sans-serif',
        color: '#ffffff',
        align: 'center',
      },
      {
        type: 'text',
        text: '${member.display_name}',
        x: 400,
        y: 240,
        font: 'bold 28px "Poppins", sans-serif',
        color: '#ffffff',
        align: 'center',
      },
      {
        type: 'text',
        text: 'Member #${guild.member_count}',
        x: 400,
        y: 275,
        font: '16px "Poppins", sans-serif',
        color: 'rgba(255, 255, 255, 0.8)',
        align: 'center',
      },
    ],
  },
};

export function getWelcomeSpec(config: WelcomeConfig = {}): Partial<FurlowSpec> {
  return {
    events: welcomeEventHandlers,
    commands: welcomeCommands,
    canvas: {
      generators: welcomeCanvasGenerators,
    },
  };
}
