/**
 * Interaction handling (commands, buttons, modals)
 */

import {
  Client,
  REST,
  Routes,
  MessageFlags,
  type Interaction,
  type ChatInputCommandInteraction,
  type ButtonInteraction,
  type StringSelectMenuInteraction,
  type ModalSubmitInteraction,
  type UserContextMenuCommandInteraction,
  type MessageContextMenuCommandInteraction,
  SlashCommandBuilder,
  ContextMenuCommandBuilder,
  ApplicationCommandType,
  type RESTPostAPIChatInputApplicationCommandsJSONBody,
  type RESTPostAPIContextMenuApplicationCommandsJSONBody,
} from 'discord.js';
import type { CommandDefinition, ContextMenuCommand, CommandOption } from '@furlow/schema';

export interface InteractionHandlerOptions {
  client: Client;
  token: string;
  clientId: string;
  guildId?: string;
}

export type InteractionCallback<T extends Interaction = Interaction> = (
  interaction: T
) => Promise<void>;

export class InteractionHandler {
  private client: Client;
  private rest: REST;
  private clientId: string;
  private guildId?: string;

  private commandHandlers: Map<string, InteractionCallback<ChatInputCommandInteraction>> = new Map();
  private buttonHandlers: Map<string, InteractionCallback<ButtonInteraction>> = new Map();
  private selectHandlers: Map<string, InteractionCallback<StringSelectMenuInteraction>> = new Map();
  private modalHandlers: Map<string, InteractionCallback<ModalSubmitInteraction>> = new Map();
  private userContextHandlers: Map<string, InteractionCallback<UserContextMenuCommandInteraction>> = new Map();
  private messageContextHandlers: Map<string, InteractionCallback<MessageContextMenuCommandInteraction>> = new Map();

  constructor(options: InteractionHandlerOptions) {
    this.client = options.client;
    this.clientId = options.clientId;
    this.guildId = options.guildId;
    this.rest = new REST({ version: '10' }).setToken(options.token);

    this.setupListener();
  }

  /**
   * Set up the interaction listener
   */
  private setupListener(): void {
    this.client.on('interactionCreate', async (interaction) => {
      try {
        await this.handleInteraction(interaction);
      } catch (error) {
        console.error('Interaction error:', error);

        if (interaction.isRepliable() && !interaction.replied && !interaction.deferred) {
          await interaction.reply({
            content: 'An error occurred while processing this interaction.',
            flags: MessageFlags.Ephemeral,
          }).catch(() => {});
        }
      }
    });
  }

  /**
   * Handle an interaction
   */
  private async handleInteraction(interaction: Interaction): Promise<void> {
    if (interaction.isChatInputCommand()) {
      const handler = this.commandHandlers.get(interaction.commandName);
      if (handler) {
        await handler(interaction);
      }
    } else if (interaction.isButton()) {
      // Check for exact match first, then prefix match
      const handler =
        this.buttonHandlers.get(interaction.customId) ??
        this.findPrefixHandler(this.buttonHandlers, interaction.customId);
      if (handler) {
        await handler(interaction);
      }
    } else if (interaction.isStringSelectMenu()) {
      const handler =
        this.selectHandlers.get(interaction.customId) ??
        this.findPrefixHandler(this.selectHandlers, interaction.customId);
      if (handler) {
        await handler(interaction);
      }
    } else if (interaction.isModalSubmit()) {
      const handler =
        this.modalHandlers.get(interaction.customId) ??
        this.findPrefixHandler(this.modalHandlers, interaction.customId);
      if (handler) {
        await handler(interaction);
      }
    } else if (interaction.isUserContextMenuCommand()) {
      const handler = this.userContextHandlers.get(interaction.commandName);
      if (handler) {
        await handler(interaction);
      }
    } else if (interaction.isMessageContextMenuCommand()) {
      const handler = this.messageContextHandlers.get(interaction.commandName);
      if (handler) {
        await handler(interaction);
      }
    }
  }

  /**
   * Find a handler by prefix (for dynamic IDs like "button_123")
   */
  private findPrefixHandler<T>(
    handlers: Map<string, T>,
    customId: string
  ): T | undefined {
    for (const [key, handler] of handlers) {
      if (key.endsWith('*') && customId.startsWith(key.slice(0, -1))) {
        return handler;
      }
    }
    return undefined;
  }

  /**
   * Register a command handler
   */
  onCommand(
    name: string,
    handler: InteractionCallback<ChatInputCommandInteraction>
  ): void {
    this.commandHandlers.set(name, handler);
  }

  /**
   * Register a button handler
   */
  onButton(
    customId: string,
    handler: InteractionCallback<ButtonInteraction>
  ): void {
    this.buttonHandlers.set(customId, handler);
  }

  /**
   * Register a select menu handler
   */
  onSelect(
    customId: string,
    handler: InteractionCallback<StringSelectMenuInteraction>
  ): void {
    this.selectHandlers.set(customId, handler);
  }

  /**
   * Register a modal handler
   */
  onModal(
    customId: string,
    handler: InteractionCallback<ModalSubmitInteraction>
  ): void {
    this.modalHandlers.set(customId, handler);
  }

  /**
   * Register a user context menu handler
   */
  onUserContext(
    name: string,
    handler: InteractionCallback<UserContextMenuCommandInteraction>
  ): void {
    this.userContextHandlers.set(name, handler);
  }

  /**
   * Register a message context menu handler
   */
  onMessageContext(
    name: string,
    handler: InteractionCallback<MessageContextMenuCommandInteraction>
  ): void {
    this.messageContextHandlers.set(name, handler);
  }

  /**
   * Register slash commands with Discord
   */
  async registerCommands(
    commands: CommandDefinition[],
    contextMenus?: ContextMenuCommand[]
  ): Promise<void> {
    const slashCommands = commands.map((cmd) => this.buildSlashCommand(cmd));
    const contextCommands = (contextMenus ?? []).map((cmd) => this.buildContextMenu(cmd));

    const allCommands = [...slashCommands, ...contextCommands];

    if (this.guildId) {
      // Guild-specific commands (instant)
      await this.rest.put(
        Routes.applicationGuildCommands(this.clientId, this.guildId),
        { body: allCommands }
      );
    } else {
      // Global commands (can take up to an hour)
      await this.rest.put(Routes.applicationCommands(this.clientId), {
        body: allCommands,
      });
    }
  }

  /**
   * Build a slash command from definition
   */
  private buildSlashCommand(
    cmd: CommandDefinition
  ): RESTPostAPIChatInputApplicationCommandsJSONBody {
    const builder = new SlashCommandBuilder()
      .setName(cmd.name)
      .setDescription(cmd.description);

    if (cmd.dm_permission !== undefined) {
      builder.setDMPermission(cmd.dm_permission);
    }

    if (cmd.nsfw) {
      builder.setNSFW(true);
    }

    // Add options
    if (cmd.options) {
      for (const opt of cmd.options) {
        this.addOption(builder, opt);
      }
    }

    // Add subcommands
    if (cmd.subcommands) {
      for (const sub of cmd.subcommands) {
        builder.addSubcommand((subBuilder) => {
          subBuilder.setName(sub.name).setDescription(sub.description);
          if (sub.options) {
            for (const opt of sub.options) {
              this.addOption(subBuilder, opt);
            }
          }
          return subBuilder;
        });
      }
    }

    // Add subcommand groups
    if (cmd.subcommand_groups) {
      for (const group of cmd.subcommand_groups) {
        builder.addSubcommandGroup((groupBuilder) => {
          groupBuilder.setName(group.name).setDescription(group.description);
          for (const sub of group.subcommands) {
            groupBuilder.addSubcommand((subBuilder) => {
              subBuilder.setName(sub.name).setDescription(sub.description);
              if (sub.options) {
                for (const opt of sub.options) {
                  this.addOption(subBuilder, opt);
                }
              }
              return subBuilder;
            });
          }
          return groupBuilder;
        });
      }
    }

    return builder.toJSON();
  }

  /**
   * Add an option to a command builder
   */
  private addOption(builder: any, opt: CommandOption): void {
    const addMethod = `add${this.getOptionMethodName(opt.type)}Option`;

    if (typeof builder[addMethod] !== 'function') {
      console.warn(`Unknown option type: ${opt.type}`);
      return;
    }

    builder[addMethod]((optBuilder: any) => {
      optBuilder.setName(opt.name).setDescription(opt.description);

      if (opt.required) {
        optBuilder.setRequired(true);
      }

      if (opt.choices && optBuilder.addChoices) {
        optBuilder.addChoices(...opt.choices);
      }

      if (opt.min_value !== undefined && optBuilder.setMinValue) {
        optBuilder.setMinValue(opt.min_value);
      }

      if (opt.max_value !== undefined && optBuilder.setMaxValue) {
        optBuilder.setMaxValue(opt.max_value);
      }

      if (opt.min_length !== undefined && optBuilder.setMinLength) {
        optBuilder.setMinLength(opt.min_length);
      }

      if (opt.max_length !== undefined && optBuilder.setMaxLength) {
        optBuilder.setMaxLength(opt.max_length);
      }

      if (opt.autocomplete && optBuilder.setAutocomplete) {
        optBuilder.setAutocomplete(true);
      }

      return optBuilder;
    });
  }

  /**
   * Get the method name for an option type
   */
  private getOptionMethodName(type: string): string {
    const map: Record<string, string> = {
      string: 'String',
      integer: 'Integer',
      number: 'Number',
      boolean: 'Boolean',
      user: 'User',
      channel: 'Channel',
      role: 'Role',
      mentionable: 'Mentionable',
      attachment: 'Attachment',
    };
    return map[type] ?? 'String';
  }

  /**
   * Build a context menu command
   */
  private buildContextMenu(
    cmd: ContextMenuCommand
  ): RESTPostAPIContextMenuApplicationCommandsJSONBody {
    const builder = new ContextMenuCommandBuilder()
      .setName(cmd.name)
      .setType(
        cmd.type === 'user'
          ? ApplicationCommandType.User
          : ApplicationCommandType.Message
      );

    return builder.toJSON();
  }
}

/**
 * Create an interaction handler
 */
export function createInteractionHandler(
  options: InteractionHandlerOptions
): InteractionHandler {
  return new InteractionHandler(options);
}
