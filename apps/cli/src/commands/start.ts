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
}

export async function startCommand(
  path: string | undefined,
  options: StartOptions
): Promise<void> {
  const specPath = resolve(path ?? 'furlow.yaml');

  console.log(chalk.bold.cyan('\n  FURLOW Bot Runner\n'));

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

    // Create storage adapter (memory by default)
    const storage = createMemoryAdapter();

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

            // Execute actions using the action executor
            if (cmd.actions) {
              const actions = normalizeActions(cmd.actions);
              await actionExecutor.executeSequence(actions, context);
            }
          } catch (err) {
            console.error(chalk.red(`Error in command ${cmd.name}:`), err);
            if (!interaction.replied && !interaction.deferred) {
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

    // Message events
    discordClient.on('messageCreate', async (message) => {
      if (message.author.bot) return;

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
    });

    discordClient.on('messageDelete', async (message) => {
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
    });

    discordClient.on('messageUpdate', async (oldMessage, newMessage) => {
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
    });

    // Member events
    discordClient.on('guildMemberAdd', async (member) => {
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
    });

    discordClient.on('guildMemberRemove', async (member) => {
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
    });

    discordClient.on('guildMemberUpdate', async (oldMember, newMember) => {
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
    });

    // Reaction events
    discordClient.on('messageReactionAdd', async (reaction, user) => {
      if (user.bot) return;

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
    });

    discordClient.on('messageReactionRemove', async (reaction, user) => {
      if (user.bot) return;

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
    });

    // Voice state events
    discordClient.on('voiceStateUpdate', async (oldState, newState) => {
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
    });

    // Role events
    discordClient.on('roleCreate', async (role) => {
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
    });

    discordClient.on('roleDelete', async (role) => {
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
    });

    // Channel events
    discordClient.on('channelCreate', async (channel) => {
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
    });

    discordClient.on('channelDelete', async (channel) => {
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
    });

    // Thread events
    discordClient.on('threadCreate', async (thread) => {
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
  const context: any = {
    now: new Date(),
    random: Math.random(),
    options: {},
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
