/**
 * `furlow start` command: boot the runtime against a FURLOW specification.
 *
 * This file is intentionally coordinator-only. It does not know about the 56
 * Discord events individually: that knowledge lives in
 * `@furlow/discord/events`, which maps each Discord.js event to one or more
 * FURLOW events and builds expression contexts. All we do here is:
 *
 *   1. Load + validate the spec.
 *   2. Construct runtime dependencies (evaluator, storage, state, flows, actions, event router, voice).
 *   3. Register slash commands and wire a single command dispatcher.
 *   4. Start `DiscordEventRouter`, which wires every declared Discord event onto the core EventRouter.
 *   5. Handle graceful shutdown.
 */

import { resolve } from 'node:path';
import chalk from 'chalk';
import ora from 'ora';
import { config as loadEnv } from 'dotenv';
import type { ChatInputCommandInteraction } from 'discord.js';
import type { StorageAdapter } from '@furlow/storage';
import type { ActionExecutor } from '@furlow/core/actions';
import { FlowQuota, parseQuotaDuration, QuotaExceededError } from '@furlow/core';
import type { Action } from '@furlow/schema';

interface StartOptions {
  env: string;
  validate: boolean;
  guild?: string;
  verbose?: boolean;
}

let verboseMode = false;

function log(category: string, message: string, data?: unknown): void {
  if (!verboseMode) return;
  const timestamp = new Date().toISOString().split('T')[1]?.slice(0, 12);
  console.log(chalk.dim(`[${timestamp}]`), chalk.cyan(`[${category}]`), message);
  if (data === undefined) return;
  if (typeof data === 'object' && data !== null) {
    const str = JSON.stringify(
      data,
      (_key, value) => {
        if (typeof value === 'string' && value.length > 200) return value.slice(0, 200) + '... (truncated)';
        if ((value as { type?: string })?.type === 'Buffer') return `<Buffer ${(value as { data?: { length?: number } }).data?.length ?? 0} bytes>`;
        return value;
      },
      2,
    );
    console.log(chalk.dim(str));
  } else {
    console.log(chalk.dim(String(data)));
  }
}

export async function startCommand(path: string | undefined, options: StartOptions): Promise<void> {
  const specPath = resolve(path ?? 'furlow.yaml');
  verboseMode = options.verbose ?? false;

  console.log(chalk.bold.cyan('\n  FURLOW Bot Runner\n'));
  if (verboseMode) console.log(chalk.yellow('  Verbose mode enabled\n'));

  const envResult = loadEnv({ path: resolve(options.env) });
  if (envResult.error) console.log(chalk.yellow(`  Warning: Could not load ${options.env}`));

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
    const { loadSpec } = await import('@furlow/core/parser');
    const { validateFurlowSpec } = await import('@furlow/schema');
    const { createEvaluator } = await import('@furlow/core/expression');
    const { createActionRegistry, createActionExecutor } = await import('@furlow/core/actions');
    const { createEventRouter } = await import('@furlow/core/events');
    const { createFlowEngine } = await import('@furlow/core/flows');
    const { createStateManager } = await import('@furlow/core/state');
    const { createCronScheduler } = await import('@furlow/core/scheduler');
    const { registerCoreHandlers } = await import('@furlow/core/actions/handlers');
    const { createMemoryAdapter } = await import('@furlow/storage');

    const { spec, files } = await loadSpec(specPath, { validate: options.validate });
    spinner.succeed(`Loaded ${files.length} file(s)`);

    if (options.validate) {
      const validationSpinner = ora('Validating specification...').start();
      const result = validateFurlowSpec(spec);
      if (!result.valid) {
        validationSpinner.fail('Validation failed');
        for (const error of result.errors) console.log(chalk.red(`    ${error.path}: ${error.message}`));
        process.exit(1);
      }
      validationSpinner.succeed('Specification valid');
    }

    const connectSpinner = ora('Connecting to Discord...').start();

    const { createClient } = await import('@furlow/discord/client');
    const { createInteractionHandler } = await import('@furlow/discord/interactions');
    const { DiscordEventRouter } = await import('@furlow/discord/events');

    const client = createClient({ token, spec });
    await client.start();
    connectSpinner.succeed('Connected to Discord');

    const initSpinner = ora('Initializing systems...').start();

    const evaluator = createEvaluator();
    const storage = await createStorageAdapter(spec, createMemoryAdapter);
    const stateManager = createStateManager(storage);

    if (spec.state?.variables) stateManager.registerVariables(spec.state.variables);
    if (spec.state?.tables) await stateManager.registerTables(spec.state.tables);

    const flowEngine = createFlowEngine();
    if (spec.flows) flowEngine.registerAll(spec.flows);

    const actionRegistry = createActionRegistry();

    let voiceManager: unknown = null;
    if (spec.voice) {
      try {
        const { createVoiceManager } = await import('@furlow/discord/voice');
        voiceManager = createVoiceManager();
        (voiceManager as { configure: (c: unknown) => void }).configure(spec.voice);
      } catch {
        console.log(chalk.yellow('  Voice support not available (missing @discordjs/voice)'));
      }
    }

    // Placeholder reference so we can subscribe voice events after the
    // DiscordEventRouter is created. Actual wiring happens below.
    let subscribeVoiceTrackEvents: null | (() => void) = null;
    if (voiceManager) {
      subscribeVoiceTrackEvents = () => {
        const vm = voiceManager as {
          on: (event: 'track_start' | 'track_end',
               listener: (payload: { guildId: string; track: unknown }) => void) => () => void;
        };
        vm.on('track_start', ({ guildId, track }) => {
          void discordEventRouter.emit('voice_track_start', { guildId, track });
        });
        vm.on('track_end', ({ guildId, track }) => {
          void discordEventRouter.emit('voice_track_end', { guildId, track });
        });
      };
    }

    const discordClient = client.getClient();

    registerCoreHandlers(actionRegistry, {
      client: discordClient,
      evaluator,
      stateManager,
      flowEngine,
      voiceManager,
    });

    const actionExecutor = createActionExecutor(actionRegistry, evaluator);

    const coreEventRouter = createEventRouter();
    if (spec.events) coreEventRouter.registerAll(spec.events);

    initSpinner.succeed('Systems initialized');

    // Slash command registration + command dispatcher.
    const interactionHandler = createInteractionHandler({
      client: discordClient,
      token,
      clientId,
      guildId,
    });

    if (spec.commands && spec.commands.length > 0) {
      const cmdSpinner = ora('Registering slash commands...').start();

      const guilds = discordClient.guilds.cache;
      const guildIds = guildId ? [guildId] : [...guilds.keys()];

      const { REST, Routes } = await import('discord.js');
      const rest = new REST({ version: '10' }).setToken(token);

      const slashCommands = spec.commands.map((cmd) => ({
        name: cmd.name,
        description: cmd.description,
        options: cmd.options?.map((opt) => ({
          name: opt.name,
          description: opt.description,
          type: getOptionType(opt.type),
          required: opt.required ?? false,
          choices: opt.choices,
        })),
      }));

      for (const gId of guildIds) {
        await rest.put(Routes.applicationGuildCommands(clientId, gId), { body: slashCommands });
      }

      const dispatcher = createCommandDispatcher({
        spec,
        evaluator,
        stateManager,
        flowEngine,
        voiceManager,
        actionExecutor,
        coreEventRouter,
        client: discordClient,
      });

      for (const cmd of spec.commands) {
        interactionHandler.onCommand(cmd.name, (interaction) => dispatcher(cmd, interaction));
      }

      cmdSpinner.succeed(`Registered ${spec.commands.length} command(s) to ${guildIds.length} guild(s)`);
    }

    // Wire the cron scheduler. Even without user-declared jobs, the
    // scheduler's periodic tick emission is required by builtins (giveaways,
    // polls, reminders) that poll state tables via `event: 'scheduler_tick'`.
    const scheduler = createCronScheduler();
    if (spec.scheduler) scheduler.configure(spec.scheduler);

    const discordEventRouter = new DiscordEventRouter({
      client: discordClient,
      coreRouter: coreEventRouter,
      deps: {
        client: discordClient,
        evaluator,
        stateManager,
        flowEngine,
        voiceManager,
        actionExecutor,
        eventRouter: coreEventRouter,
        spec,
      },
      log: verboseMode ? log : undefined,
    });
    discordEventRouter.start();

    // Forward VoiceManager track lifecycle events to the FURLOW event bus.
    subscribeVoiceTrackEvents?.();

    // Emit `scheduler_tick` every minute so time-polling builtins run.
    scheduler.setTickHandler(() => {
      void discordEventRouter.emit('scheduler_tick');
    }, 60_000);

    // Build a base context for scheduled cron jobs.
    const { buildBaseContext } = await import('@furlow/discord/events');
    const schedulerContextBuilder = () =>
      buildBaseContext({
        client: discordClient,
        evaluator,
        stateManager,
        flowEngine,
        voiceManager,
        actionExecutor,
        eventRouter: coreEventRouter,
        spec,
      });

    scheduler.start(actionExecutor, evaluator, schedulerContextBuilder as never);

    // Ready fires immediately if the client connected before we registered.
    if (discordClient.isReady()) {
      setImmediate(() => {
        void discordEventRouter.emit('ready');
      });
    }

    console.log('\n' + chalk.green('  Bot is running!'));
    console.log(chalk.dim(`    Guilds: ${client.guildCount}`));
    console.log(chalk.dim(`    Commands: ${spec.commands?.length ?? 0}`));
    console.log(chalk.dim(`    Events: ${spec.events?.length ?? 0}`));
    console.log(chalk.dim(`    Flows: ${spec.flows?.length ?? 0}`));
    console.log(chalk.dim(`    Press Ctrl+C to stop\n`));

    const shutdown = async (): Promise<void> => {
      console.log('\n' + chalk.yellow('  Shutting down...'));
      scheduler.stop();
      discordEventRouter.stop();
      if (voiceManager) (voiceManager as { disconnectAll: () => void }).disconnectAll();
      await stateManager.close();
      await client.stop();
      process.exit(0);
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  } catch (error) {
    spinner.fail('Failed to start bot');

    if (error instanceof Error) {
      console.error(chalk.red(`\n  ${error.message}`));
      if ('code' in error) console.log(chalk.dim(`  Error code: ${(error as { code: string }).code}`));
    }

    process.exit(1);
  }
}

async function createStorageAdapter(
  spec: { state?: { storage?: { type?: string; path?: string; url?: string } } },
  createMemoryAdapter: () => StorageAdapter,
): Promise<StorageAdapter> {
  const storageConfig = spec.state?.storage;

  if (storageConfig?.type === 'sqlite') {
    try {
      const { createSQLiteAdapter } = await import('@furlow/storage/sqlite');
      const dbPath = storageConfig.path || './furlow.db';
      console.log(chalk.dim(`  Using SQLite storage: ${dbPath}`));
      return createSQLiteAdapter({ path: dbPath });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(chalk.red(`  Failed to load SQLite adapter: ${msg}`));
      console.log(chalk.yellow('  Install better-sqlite3: npm install better-sqlite3'));
      console.log(chalk.dim('  Falling back to memory storage'));
      return createMemoryAdapter();
    }
  }

  if (storageConfig?.type === 'postgres') {
    try {
      const { createPostgresAdapter } = await import('@furlow/storage/postgres');
      const url = storageConfig.url ?? process.env.DATABASE_URL;
      console.log(chalk.dim('  Using PostgreSQL storage'));
      return createPostgresAdapter({ url });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(chalk.red(`  Failed to load PostgreSQL adapter: ${msg}`));
      console.log(chalk.yellow('  Install pg: npm install pg'));
      console.log(chalk.dim('  Falling back to memory storage'));
      return createMemoryAdapter();
    }
  }

  return createMemoryAdapter();
}

interface CommandDispatcherDeps {
  spec: { components?: unknown; pipes?: unknown; canvas?: { generators?: unknown } };
  evaluator: unknown;
  stateManager: unknown;
  flowEngine: unknown;
  voiceManager: unknown;
  actionExecutor: ActionExecutor;
  coreEventRouter: unknown;
  client: unknown;
}

/**
 * Build a command dispatcher bound to the runtime dependencies. Returning a
 * function per command lets us keep all the option-extraction and action-
 * execution logic in one place without leaking it into the event router.
 */
function createCommandDispatcher(deps: CommandDispatcherDeps) {
  return async function dispatch(
    cmd: { name: string; options?: Array<{ name: string; type: string }>; actions?: unknown[] },
    interaction: ChatInputCommandInteraction,
  ): Promise<void> {
    log('command', `Executing command: /${cmd.name}`);

    try {
      const { buildBaseContext, withInteraction } = await import('@furlow/discord/events');
      const context = withInteraction(
        buildBaseContext({
          client: deps.client as never,
          evaluator: deps.evaluator,
          stateManager: deps.stateManager,
          flowEngine: deps.flowEngine,
          voiceManager: deps.voiceManager,
          actionExecutor: deps.actionExecutor,
          eventRouter: deps.coreEventRouter,
          spec: deps.spec as never,
        }),
        interaction as unknown as Record<string, unknown>,
      ) as Record<string, unknown>;

      // Extract command options. Resolved entities are wrapped through the
      // interaction context, which already handles URL method proxying.
      if (cmd.options) {
        const commandOptions = context.options as Record<string, unknown>;
        const { wrapDiscordObject } = await import('@furlow/discord/events');
        for (const opt of cmd.options) {
          const rawValue = interaction.options.get(opt.name)?.value;
          commandOptions[opt.name] = rawValue;

          if (opt.type === 'user') {
            commandOptions[opt.name] = wrapDiscordObject(interaction.options.getUser(opt.name) as object);
          } else if (opt.type === 'channel') {
            commandOptions[opt.name] = wrapDiscordObject(
              interaction.options.getChannel(opt.name) as object,
            );
          } else if (opt.type === 'role') {
            commandOptions[opt.name] = interaction.options.getRole(opt.name);
          }
        }
      }

      log('context', 'Command context:', {
        user: {
          id: (context.user as { id?: string })?.id,
          username: (context.user as { username?: string })?.username,
          avatar: (context.user as { avatar?: string })?.avatar,
        },
        guild: {
          id: (context.guild as { id?: string })?.id,
          name: (context.guild as { name?: string })?.name,
        },
        options: context.options,
      });

      if (!cmd.actions) return;

      const actions = normalizeActions(cmd.actions);
      log('actions', `Executing ${actions.length} action(s):`);
      actions.forEach((a, i) => log('actions', `  ${i + 1}. ${(a as { action: string }).action}`));

      const timeoutMs = parseQuotaDuration((cmd as { timeout?: string | number }).timeout);
      const quota = new FlowQuota({
        limits: timeoutMs !== undefined ? { wallclockMs: timeoutMs } : {},
      });
      const ctxRecord = context as unknown as Record<string, unknown>;
      ctxRecord.quota = quota;
      ctxRecord.signal = quota.signal;
      quota.startWallclock();

      let results: Awaited<ReturnType<ActionExecutor['executeSequence']>> = [];
      try {
        results = await deps.actionExecutor.executeSequence(actions as unknown as Action[], context as never);
      } catch (err) {
        if (err instanceof QuotaExceededError) {
          console.error(
            chalk.red(`Command "${cmd.name}" aborted: quota ${err.metric} exceeded (${err.observed} > ${err.limit})`),
          );
          if (interaction.deferred && !interaction.replied) {
            await interaction.editReply({ content: 'Command aborted: execution limit exceeded.' }).catch(() => {});
          }
          return;
        }
        throw err;
      } finally {
        quota.dispose();
        delete ctxRecord.quota;
        delete ctxRecord.signal;
      }

      results.forEach((r, i) => {
        const actionName = (actions[i] as { action?: string })?.action ?? 'unknown';
        if (r.success) {
          if (actionName === 'canvas_render' && (context as { _canvasContextDebug?: unknown })._canvasContextDebug) {
            log('canvas', 'Canvas render context evaluation:', (context as { _canvasContextDebug?: unknown })._canvasContextDebug);
          }
          log(
            'result',
            `Action "${actionName}" succeeded`,
            r.data instanceof Buffer ? `<Buffer ${r.data.length} bytes>` : r.data,
          );
        } else {
          log('result', `Action "${actionName}" FAILED: ${r.error?.message}`);
        }
      });

      const failedResult = results.find((r) => !r.success);
      if (failedResult && failedResult.error) {
        console.error(chalk.red(`Action failed in command ${cmd.name}:`), failedResult.error.message);
        if (interaction.deferred && !interaction.replied) {
          await interaction.editReply({ content: `Error: ${failedResult.error.message}` }).catch(() => {});
        }
      }
    } catch (err) {
      console.error(chalk.red(`Error in command ${cmd.name}:`), err);
      if (interaction.deferred && !interaction.replied) {
        await interaction
          .editReply({ content: 'An error occurred while executing this command.' })
          .catch(() => {});
      } else if (!interaction.replied && !interaction.deferred) {
        await interaction
          .reply({ content: 'An error occurred while executing this command.', ephemeral: true })
          .catch(() => {});
      }
    }
  };
}

/**
 * Normalize YAML shorthand actions to schema format.
 *   { reply: { content: "..." } } -> { action: "reply", content: "..." }
 *
 * Kept local to the command dispatcher because core actions flow through the
 * core EventRouter, which does its own normalization.
 */
function normalizeActions(actions: unknown[]): Array<Record<string, unknown>> {
  return actions.map((raw) => {
    const action = raw as Record<string, unknown>;
    if (typeof action.action === 'string') return action;

    for (const [key, value] of Object.entries(action)) {
      if (key === 'when' || key === 'error_handler') continue;
      const normalized: Record<string, unknown> = {
        action: key,
        ...(typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {}),
      };
      if (action.when) normalized.when = action.when;
      if (action.error_handler) normalized.error_handler = action.error_handler;
      return normalized;
    }
    return action;
  });
}

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
