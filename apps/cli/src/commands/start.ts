/**
 * Start command - run the FURLOW bot
 */

import { resolve } from 'node:path';
import chalk from 'chalk';
import ora from 'ora';
import { config as loadEnv } from 'dotenv';

interface StartOptions {
  env: string;
  validate: boolean;
  guild?: string;
  verbose?: boolean;
}

// Global verbose flag for logging
let verboseMode = false;

function log(category: string, message: string, data?: unknown) {
  if (!verboseMode) return;
  const timestamp = new Date().toISOString().split('T')[1]?.slice(0, 12);
  console.log(chalk.dim(`[${timestamp}]`), chalk.cyan(`[${category}]`), message);
  if (data !== undefined) {
    if (typeof data === 'object' && data !== null) {
      const str = JSON.stringify(data, (key, value) => {
        // Truncate long strings and buffers
        if (typeof value === 'string' && value.length > 200) {
          return value.slice(0, 200) + '... (truncated)';
        }
        if (value?.type === 'Buffer') {
          return `<Buffer ${value.data?.length || 0} bytes>`;
        }
        return value;
      }, 2);
      console.log(chalk.dim(str));
    } else {
      console.log(chalk.dim(String(data)));
    }
  }
}

export async function startCommand(
  path: string | undefined,
  options: StartOptions
): Promise<void> {
  const specPath = resolve(path ?? 'furlow.yaml');
  verboseMode = options.verbose ?? false;

  console.log(chalk.bold.cyan('\n  FURLOW Bot Runner\n'));

  if (verboseMode) {
    console.log(chalk.yellow('  Verbose mode enabled\n'));
  }

  // Load environment variables
  const envResult = loadEnv({ path: resolve(options.env) });
  if (envResult.error) {
    console.log(chalk.yellow(`  Warning: Could not load ${options.env}`));
  }

  // Check required environment variables
  const token = process.env.DISCORD_TOKEN;
  const clientId = process.env.DISCORD_CLIENT_ID;
  const guildId = options.guild ?? process.env.DISCORD_GUILD_ID;

  if (!token) {
    console.error(chalk.red('  Error: DISCORD_TOKEN is not set'));
    console.log(chalk.dim('  Set it in your .env file or environment'));
    process.exit(1);
  }

  if (!clientId) {
    console.error(chalk.red('  Error: DISCORD_CLIENT_ID is not set'));
    console.log(chalk.dim('  Set it in your .env file or environment'));
    process.exit(1);
  }

  const spinner = ora('Loading specification...').start();

  try {
    // Dynamic import of core modules
    const { loadSpec } = await import('@furlow/core/parser');
    const { validateFurlowSpec } = await import('@furlow/schema');
    const { createEvaluator } = await import('@furlow/core/expression');
    const { createActionRegistry, createActionExecutor } = await import('@furlow/core/actions');
    const { createEventRouter } = await import('@furlow/core/events');
    const { createFlowEngine } = await import('@furlow/core/flows');
    const { createStateManager } = await import('@furlow/core/state');
    const { registerCoreHandlers } = await import('@furlow/core/actions/handlers');
    const { createMemoryAdapter } = await import('@furlow/storage');

    // Load the spec
    const { spec, files } = await loadSpec(specPath, {
      validate: options.validate,
    });

    spinner.succeed(`Loaded ${files.length} file(s)`);

    // Validate if enabled
    if (options.validate) {
      const validationSpinner = ora('Validating specification...').start();
      const result = validateFurlowSpec(spec);
      if (!result.valid) {
        validationSpinner.fail('Validation failed');
        for (const error of result.errors) {
          console.log(chalk.red(`    ${error.path}: ${error.message}`));
        }
        process.exit(1);
      }
      validationSpinner.succeed('Specification valid');
    }

    // Create and start the bot
    const connectSpinner = ora('Connecting to Discord...').start();

    const { createClient } = await import('@furlow/discord/client');
    const { createInteractionHandler } = await import('@furlow/discord/interactions');

    const client = createClient({ token, spec });

    await client.start();

    connectSpinner.succeed('Connected to Discord');

    // Initialize core systems
    const initSpinner = ora('Initializing systems...').start();

    // Create expression evaluator
    const evaluator = createEvaluator();

    // Create storage adapter based on spec configuration
    let storage;
    const storageConfig = spec.state?.storage;

    if (storageConfig?.type === 'sqlite') {
      try {
        const { createSQLiteAdapter } = await import('@furlow/storage/sqlite');
        storage = createSQLiteAdapter({ path: storageConfig.path || './furlow.db' });
        console.log(chalk.dim(`  Using SQLite storage: ${storageConfig.path || './furlow.db'}`));
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        console.error(chalk.red(`  Failed to load SQLite adapter: ${errorMsg}`));
        console.log(chalk.yellow('  Install better-sqlite3: npm install better-sqlite3'));
        console.log(chalk.dim('  Falling back to memory storage'));
        storage = createMemoryAdapter();
      }
    } else if (storageConfig?.type === 'postgres') {
      try {
        const { createPostgresAdapter } = await import('@furlow/storage/postgres');
        const connectionString = typeof storageConfig.connection === 'string'
          ? storageConfig.connection
          : process.env.DATABASE_URL;
        storage = createPostgresAdapter({ connectionString });
        console.log(chalk.dim('  Using PostgreSQL storage'));
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        console.error(chalk.red(`  Failed to load PostgreSQL adapter: ${errorMsg}`));
        console.log(chalk.yellow('  Install pg: npm install pg'));
        console.log(chalk.dim('  Falling back to memory storage'));
        storage = createMemoryAdapter();
      }
    } else {
      storage = createMemoryAdapter();
    }

    // Create state manager
    const stateManager = createStateManager(storage);

    // Register variables if defined
    if (spec.state?.variables) {
      stateManager.registerVariables(spec.state.variables);
    }

    // Register tables if defined
    if (spec.state?.tables) {
      await stateManager.registerTables(spec.state.tables);
    }

    // Create flow engine
    const flowEngine = createFlowEngine();

    // Register flows if defined
    if (spec.flows) {
      flowEngine.registerAll(spec.flows);
    }

    // Create action registry and register core handlers
    const actionRegistry = createActionRegistry();

    // Create voice manager if voice config present
    let voiceManager: any = null;
    if (spec.voice) {
      try {
        const { createVoiceManager } = await import('@furlow/discord/voice');
        voiceManager = createVoiceManager();
        voiceManager.configure(spec.voice);
      } catch (err) {
        console.log(chalk.yellow('  Voice support not available (missing @discordjs/voice)'));
      }
    }

    // Register core handlers
    registerCoreHandlers(actionRegistry, {
      client: client.getClient(),
      evaluator,
      stateManager,
      flowEngine,
      voiceManager,
    });

    // Create action executor
    const actionExecutor = createActionExecutor(actionRegistry, evaluator);

    // Create event router
    const eventRouter = createEventRouter();

    // Register event handlers from spec
    if (spec.events) {
      eventRouter.registerAll(spec.events);
    }

    initSpinner.succeed('Systems initialized');

    // Register commands
    if (spec.commands && spec.commands.length > 0) {
      const cmdSpinner = ora('Registering slash commands...').start();

      // Get all guild IDs the bot is in
      const guilds = client.getClient().guilds.cache;
      const guildIds = guildId ? [guildId] : [...guilds.keys()];

      // Register to each guild for instant updates
      const { REST, Routes } = await import('discord.js');
      const rest = new REST({ version: '10' }).setToken(token);

      // Create interaction handler
      const interactionHandler = createInteractionHandler({
        client: client.getClient(),
        token,
        clientId,
        guildId: guildIds[0], // Use first guild for handler setup
      });

      // Build command data
      const slashCommands = spec.commands.map((cmd: any) => ({
        name: cmd.name,
        description: cmd.description,
        options: cmd.options?.map((opt: any) => ({
          name: opt.name,
          description: opt.description,
          type: getOptionType(opt.type),
          required: opt.required ?? false,
          choices: opt.choices,
        })),
      }));

      // Register commands to all guilds
      for (const gId of guildIds) {
        await rest.put(
          Routes.applicationGuildCommands(clientId, gId),
          { body: slashCommands }
        );
      }

      // Set up command handlers
      for (const cmd of spec.commands) {
        interactionHandler.onCommand(cmd.name, async (interaction) => {
          log('command', `Executing command: /${cmd.name}`);

          try {
            // Build context for expression evaluation
            const context = buildActionContext({
              interaction,
              client: client.getClient(),
              evaluator,
              stateManager,
              flowEngine,
              voiceManager,
              actionExecutor,
              eventRouter,
              spec,
            });

            // Extract options
            if (cmd.options) {
              for (const opt of cmd.options) {
                const value = interaction.options.get(opt.name)?.value;
                (context.options as Record<string, unknown>)[opt.name] = value;

                // Handle user/channel/role types
                if (opt.type === 'user') {
                  (context.options as Record<string, unknown>)[opt.name] = interaction.options.getUser(opt.name);
                } else if (opt.type === 'channel') {
                  (context.options as Record<string, unknown>)[opt.name] = interaction.options.getChannel(opt.name);
                } else if (opt.type === 'role') {
                  (context.options as Record<string, unknown>)[opt.name] = interaction.options.getRole(opt.name);
                }
              }
            }

            // Log context in verbose mode
            log('context', 'Command context:', {
              user: { id: context.user?.id, username: context.user?.username, avatar: context.user?.avatar },
              guild: { id: context.guild?.id, name: context.guild?.name },
              options: context.options,
            });

            // Execute actions using the action executor
            if (cmd.actions) {
              const actions = normalizeActions(cmd.actions);
              log('actions', `Executing ${actions.length} action(s):`);
              actions.forEach((a, i) => log('actions', `  ${i + 1}. ${a.action}`));

              const results = await actionExecutor.executeSequence(actions, context);

              // Log action results in verbose mode
              results.forEach((r, i) => {
                const actionName = actions[i]?.action || 'unknown';
                if (r.success) {
                  // For canvas_render, show the evaluated context
                  if (actionName === 'canvas_render' && (context as any)._canvasContextDebug) {
                    log('canvas', 'Canvas render context evaluation:', (context as any)._canvasContextDebug);
                  }
                  log('result', `Action "${actionName}" succeeded`, r.data instanceof Buffer ? `<Buffer ${r.data.length} bytes>` : r.data);
                } else {
                  log('result', `Action "${actionName}" FAILED: ${r.error?.message}`);
                }
              });

              // Check for failed actions
              const failedResult = results.find(r => !r.success);
              if (failedResult && failedResult.error) {
                console.error(chalk.red(`Action failed in command ${cmd.name}:`), failedResult.error.message);

                // If interaction was deferred but not replied, send error message
                if (interaction.deferred && !interaction.replied) {
                  await interaction.editReply({
                    content: `Error: ${failedResult.error.message}`,
                  }).catch(() => {});
                }
              }
            }
          } catch (err) {
            console.error(chalk.red(`Error in command ${cmd.name}:`), err);
            // Handle both deferred and non-deferred interactions
            if (interaction.deferred && !interaction.replied) {
              await interaction.editReply({
                content: 'An error occurred while executing this command.',
              }).catch(() => {});
            } else if (!interaction.replied && !interaction.deferred) {
              await interaction.reply({
                content: 'An error occurred while executing this command.',
                ephemeral: true
              }).catch(() => {});
            }
          }
        });
      }

      cmdSpinner.succeed(`Registered ${spec.commands.length} command(s) to ${guildIds.length} guild(s)`);
    }

    // Wire Discord events to event router
    const discordClient = client.getClient();

    // Ready event handler function
    const handleReadyEvent = async () => {
      try {
        const context = buildActionContext({
          client: discordClient,
          evaluator,
          stateManager,
          flowEngine,
          voiceManager,
          actionExecutor,
          eventRouter,
          spec,
        });

        await eventRouter.emit('ready', context, actionExecutor, evaluator);
      } catch (err) {
        console.error(chalk.red('Error in ready event:'), err);
      }
    };

    // Client is already ready after client.start() returns, so invoke immediately
    // Also register for future ready events (reconnections)
    if (discordClient.isReady()) {
      // Invoke in next tick to ensure all event handlers are registered
      setImmediate(handleReadyEvent);
    }
    discordClient.on('ready', handleReadyEvent);

    // Message events
    discordClient.on('messageCreate', async (message) => {
      if (message.author.bot) return;

      try {
        const context = buildActionContext({
          message,
          client: discordClient,
          evaluator,
          stateManager,
          flowEngine,
          voiceManager,
          actionExecutor,
          eventRouter,
          spec,
        });

        await eventRouter.emit('message_create', context, actionExecutor, evaluator);
      } catch (err) {
        console.error(chalk.red('Error in messageCreate event:'), err);
      }
    });

    discordClient.on('messageDelete', async (message) => {
      try {
        const context = buildActionContext({
          message,
          client: discordClient,
          evaluator,
          stateManager,
          flowEngine,
          voiceManager,
          actionExecutor,
          eventRouter,
          spec,
        });

        await eventRouter.emit('message_delete', context, actionExecutor, evaluator);
      } catch (err) {
        console.error(chalk.red('Error in messageDelete event:'), err);
      }
    });

    discordClient.on('messageUpdate', async (oldMessage, newMessage) => {
      try {
        const context = buildActionContext({
          message: newMessage,
          client: discordClient,
          evaluator,
          stateManager,
          flowEngine,
          voiceManager,
          actionExecutor,
          eventRouter,
          spec,
        });
        (context as any).old_message = oldMessage;

        await eventRouter.emit('message_update', context, actionExecutor, evaluator);
      } catch (err) {
        console.error(chalk.red('Error in messageUpdate event:'), err);
      }
    });

    // Member events
    discordClient.on('guildMemberAdd', async (member) => {
      try {
        const context = buildActionContext({
          member,
          client: discordClient,
          evaluator,
          stateManager,
          flowEngine,
          voiceManager,
          actionExecutor,
          eventRouter,
          spec,
        });

        await eventRouter.emit('member_join', context, actionExecutor, evaluator);
      } catch (err) {
        console.error(chalk.red('Error in guildMemberAdd event:'), err);
      }
    });

    discordClient.on('guildMemberRemove', async (member) => {
      try {
        const context = buildActionContext({
          member,
          client: discordClient,
          evaluator,
          stateManager,
          flowEngine,
          voiceManager,
          actionExecutor,
          eventRouter,
          spec,
        });

        await eventRouter.emit('member_leave', context, actionExecutor, evaluator);
      } catch (err) {
        console.error(chalk.red('Error in guildMemberRemove event:'), err);
      }
    });

    discordClient.on('guildMemberUpdate', async (oldMember, newMember) => {
      try {
        const context = buildActionContext({
          member: newMember,
          client: discordClient,
          evaluator,
          stateManager,
          flowEngine,
          voiceManager,
          actionExecutor,
          eventRouter,
          spec,
        });
        (context as any).old_member = oldMember;

        await eventRouter.emit('member_update', context, actionExecutor, evaluator);
      } catch (err) {
        console.error(chalk.red('Error in guildMemberUpdate event:'), err);
      }
    });

    // Reaction events
    discordClient.on('messageReactionAdd', async (reaction, user) => {
      if (user.bot) return;

      try {
        const context = buildActionContext({
          reaction,
          user,
          client: discordClient,
          evaluator,
          stateManager,
          flowEngine,
          voiceManager,
          actionExecutor,
          eventRouter,
          spec,
        });

        await eventRouter.emit('reaction_add', context, actionExecutor, evaluator);
      } catch (err) {
        console.error(chalk.red('Error in messageReactionAdd event:'), err);
      }
    });

    discordClient.on('messageReactionRemove', async (reaction, user) => {
      if (user.bot) return;

      try {
        const context = buildActionContext({
          reaction,
          user,
          client: discordClient,
          evaluator,
          stateManager,
          flowEngine,
          voiceManager,
          actionExecutor,
          eventRouter,
          spec,
        });

        await eventRouter.emit('reaction_remove', context, actionExecutor, evaluator);
      } catch (err) {
        console.error(chalk.red('Error in messageReactionRemove event:'), err);
      }
    });

    // Voice state events
    discordClient.on('voiceStateUpdate', async (oldState, newState) => {
      try {
        const context = buildActionContext({
          member: newState.member,
          client: discordClient,
          evaluator,
          stateManager,
          flowEngine,
          voiceManager,
          actionExecutor,
          eventRouter,
          spec,
        });
        (context as any).old_voice_state = oldState;
        (context as any).new_voice_state = newState;

        // Determine event type
        if (!oldState.channel && newState.channel) {
          await eventRouter.emit('voice_join', context, actionExecutor, evaluator);
        } else if (oldState.channel && !newState.channel) {
          await eventRouter.emit('voice_leave', context, actionExecutor, evaluator);
        } else if (oldState.channel?.id !== newState.channel?.id) {
          await eventRouter.emit('voice_move', context, actionExecutor, evaluator);
        }

        await eventRouter.emit('voice_state_update', context, actionExecutor, evaluator);
      } catch (err) {
        console.error(chalk.red('Error in voiceStateUpdate event:'), err);
      }
    });

    // Role events
    discordClient.on('roleCreate', async (role) => {
      try {
        const context = buildActionContext({
          role,
          client: discordClient,
          evaluator,
          stateManager,
          flowEngine,
          voiceManager,
          actionExecutor,
          eventRouter,
          spec,
        });

        await eventRouter.emit('role_create', context, actionExecutor, evaluator);
      } catch (err) {
        console.error(chalk.red('Error in roleCreate event:'), err);
      }
    });

    discordClient.on('roleDelete', async (role) => {
      try {
        const context = buildActionContext({
          role,
          client: discordClient,
          evaluator,
          stateManager,
          flowEngine,
          voiceManager,
          actionExecutor,
          eventRouter,
          spec,
        });

        await eventRouter.emit('role_delete', context, actionExecutor, evaluator);
      } catch (err) {
        console.error(chalk.red('Error in roleDelete event:'), err);
      }
    });

    // Channel events
    discordClient.on('channelCreate', async (channel) => {
      try {
        const context = buildActionContext({
          channel,
          client: discordClient,
          evaluator,
          stateManager,
          flowEngine,
          voiceManager,
          actionExecutor,
          eventRouter,
          spec,
        });

        await eventRouter.emit('channel_create', context, actionExecutor, evaluator);
      } catch (err) {
        console.error(chalk.red('Error in channelCreate event:'), err);
      }
    });

    discordClient.on('channelDelete', async (channel) => {
      try {
        const context = buildActionContext({
          channel,
          client: discordClient,
          evaluator,
          stateManager,
          flowEngine,
          voiceManager,
          actionExecutor,
          eventRouter,
          spec,
        });

        await eventRouter.emit('channel_delete', context, actionExecutor, evaluator);
      } catch (err) {
        console.error(chalk.red('Error in channelDelete event:'), err);
      }
    });

    // Thread events
    discordClient.on('threadCreate', async (thread) => {
      try {
        const context = buildActionContext({
          thread,
          client: discordClient,
          evaluator,
          stateManager,
          flowEngine,
          voiceManager,
          actionExecutor,
          eventRouter,
          spec,
        });

        await eventRouter.emit('thread_create', context, actionExecutor, evaluator);
      } catch (err) {
        console.error(chalk.red('Error in threadCreate event:'), err);
      }
    });

    // Component interaction events (buttons, select menus, modals)
    // These are forwarded to the EventRouter for YAML-defined handlers
    discordClient.on('interactionCreate', async (interaction) => {
      // Skip command interactions (handled by interactionHandler)
      if (interaction.isChatInputCommand()) return;
      if (interaction.isUserContextMenuCommand()) return;
      if (interaction.isMessageContextMenuCommand()) return;
      if (interaction.isAutocomplete()) return;

      try {
        const context = buildActionContext({
          interaction,
          client: discordClient,
          evaluator,
          stateManager,
          flowEngine,
          voiceManager,
          actionExecutor,
          eventRouter,
          spec,
        });

        // Add component-specific context
        if ('customId' in interaction) {
          (context as any).custom_id = interaction.customId;
          (context as any).customId = interaction.customId;
        }

        // Determine event type and emit
        if (interaction.isButton()) {
          (context as any).component_type = 'button';
          await eventRouter.emit('button_click', context, actionExecutor, evaluator);
        } else if (interaction.isStringSelectMenu()) {
          (context as any).component_type = 'select_menu';
          (context as any).values = interaction.values;
          (context as any).selected = interaction.values;
          await eventRouter.emit('select_menu', context, actionExecutor, evaluator);
        } else if (interaction.isModalSubmit()) {
          (context as any).component_type = 'modal';
          // Extract modal field values
          const fields: Record<string, string> = {};
          for (const [key, component] of interaction.fields.fields) {
            // Only TextInputModalData has a value property
            if ('value' in component) {
              fields[key] = component.value;
            }
          }
          (context as any).fields = fields;
          (context as any).modal_values = fields;
          await eventRouter.emit('modal_submit', context, actionExecutor, evaluator);
        }
      } catch (err) {
        console.error(chalk.red('Error in interactionCreate event:'), err);
        // Try to respond with error if possible
        if (interaction.isRepliable() && !interaction.replied && !interaction.deferred) {
          await interaction.reply({
            content: 'An error occurred while processing this interaction.',
            ephemeral: true,
          }).catch(() => {});
        }
      }
    });

    console.log('\n' + chalk.green('  Bot is running!'));
    console.log(chalk.dim(`    Guilds: ${client.guildCount}`));
    console.log(chalk.dim(`    Commands: ${spec.commands?.length ?? 0}`));
    console.log(chalk.dim(`    Events: ${spec.events?.length ?? 0}`));
    console.log(chalk.dim(`    Flows: ${spec.flows?.length ?? 0}`));
    console.log(chalk.dim(`    Press Ctrl+C to stop\n`));

    // Handle graceful shutdown
    const shutdown = async () => {
      console.log('\n' + chalk.yellow('  Shutting down...'));

      // Disconnect voice connections
      if (voiceManager) {
        voiceManager.disconnectAll();
      }

      // Close state manager
      await stateManager.close();

      // Stop client
      await client.stop();

      process.exit(0);
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);

  } catch (error) {
    spinner.fail('Failed to start bot');

    if (error instanceof Error) {
      console.error(chalk.red(`\n  ${error.message}`));

      if ('code' in error) {
        console.log(chalk.dim(`  Error code: ${(error as any).code}`));
      }
    }

    process.exit(1);
  }
}

/**
 * Build action context from Discord objects
 */
function buildActionContext(options: {
  interaction?: any;
  message?: any;
  member?: any;
  reaction?: any;
  user?: any;
  role?: any;
  channel?: any;
  thread?: any;
  client: any;
  evaluator: any;
  stateManager: any;
  flowEngine: any;
  voiceManager?: any;
  actionExecutor: any;
  eventRouter: any;
  spec: any;
}): any {
  // Create shared options object - args is an alias for options (used by builtins)
  const commandOptions: Record<string, unknown> = {};
  const context: any = {
    now: new Date(),
    random: Math.random(),
    options: commandOptions,
    args: commandOptions,  // Alias for options - used by builtins
    state: {},

    // Store dependencies for handlers
    _deps: {
      client: options.client,
      evaluator: options.evaluator,
      stateManager: options.stateManager,
      flowEngine: options.flowEngine,
      voiceManager: options.voiceManager,
    },
    _actionExecutor: options.actionExecutor,
    _eventRouter: options.eventRouter,
    _components: options.spec.components,
    _pipes: options.spec.pipes,
    _canvasGenerators: options.spec.canvas?.generators,
  };

  // Add interaction context
  if (options.interaction) {
    const interaction = options.interaction;
    context.interaction = interaction;
    context.user = interaction.user;
    context.member = interaction.member;
    context.channel = interaction.channel;
    context.guild = interaction.guild;
    context.client = options.client;

    context.guildId = interaction.guildId;
    context.channelId = interaction.channelId;
    context.userId = interaction.user?.id;
  }

  // Add message context
  if (options.message) {
    const message = options.message;
    context.message = message;
    context.user = message.author;
    context.member = message.member;
    context.channel = message.channel;
    context.guild = message.guild;
    context.client = options.client;

    context.guildId = message.guildId;
    context.channelId = message.channelId;
    context.userId = message.author?.id;
    context.messageId = message.id;
  }

  // Add member context
  if (options.member) {
    const member = options.member;
    context.member = member;
    context.user = member.user;
    context.guild = member.guild;
    context.client = options.client;

    context.guildId = member.guild?.id;
    context.userId = member.user?.id || member.id;
  }

  // Add reaction context
  if (options.reaction) {
    const reaction = options.reaction;
    context.reaction = reaction;
    context.emoji = reaction.emoji;
    context.message = reaction.message;
    context.channel = reaction.message?.channel;
    context.guild = reaction.message?.guild;
    context.client = options.client;

    context.guildId = reaction.message?.guildId;
    context.channelId = reaction.message?.channelId;
    context.messageId = reaction.message?.id;
  }

  // Add user context (for reactions)
  if (options.user) {
    context.user = options.user;
    context.userId = options.user.id;
  }

  // Add role context
  if (options.role) {
    context.role = options.role;
    context.guild = options.role.guild;
    context.guildId = options.role.guild?.id;
  }

  // Add channel context
  if (options.channel) {
    context.channel = options.channel;
    context.channelId = options.channel.id;
    if ('guild' in options.channel) {
      context.guild = options.channel.guild;
      context.guildId = options.channel.guild?.id;
    }
  }

  // Add thread context
  if (options.thread) {
    context.thread = options.thread;
    context.channel = options.thread;
    context.channelId = options.thread.id;
    context.guild = options.thread.guild;
    context.guildId = options.thread.guildId;
  }

  return context;
}

/**
 * Normalize actions from YAML format to schema format
 * YAML allows shorthand: { reply: { content: "..." } }
 * Schema expects: { action: "reply", content: "..." }
 */
function normalizeActions(actions: any[]): any[] {
  return actions.map((action) => {
    // If action already has 'action' property, it's in schema format
    if (action.action) {
      return action;
    }

    // Convert shorthand to schema format
    for (const [key, value] of Object.entries(action)) {
      if (key === 'when' || key === 'error_handler') continue;

      // Found the action type
      const normalized: any = {
        action: key,
        ...((typeof value === 'object' && value !== null) ? value : {}),
      };

      // Copy over when and error_handler if present
      if (action.when) normalized.when = action.when;
      if (action.error_handler) normalized.error_handler = action.error_handler;

      return normalized;
    }

    return action;
  });
}

/**
 * Get Discord option type number from string
 */
function getOptionType(type: string): number {
  const types: Record<string, number> = {
    string: 3,
    integer: 4,
    boolean: 5,
    user: 6,
    channel: 7,
    role: 8,
    mentionable: 9,
    number: 10,
    attachment: 11,
  };
  return types[type] ?? 3;
}
