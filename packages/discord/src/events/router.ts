/**
 * DiscordEventRouter: wires every binding in `bindings.ts` exactly once onto
 * a Discord.js Client and forwards emissions to the core FURLOW EventRouter.
 *
 * Separation of concerns:
 *   - BINDINGS own the Discord.js -> FURLOW translation (what fields, what names).
 *   - The core EventRouter owns handler registration, condition evaluation,
 *     debounce/throttle, and action execution.
 *   - This class owns lifecycle (start/stop), error reporting, and the
 *     special routing for `interactionCreate` (which is split between
 *     command dispatch callbacks and component FURLOW events).
 *
 * Replaces roughly 500 lines of inline `client.on(...)` boilerplate that
 * previously lived in `apps/cli/src/commands/start.ts`.
 */

import {
  type AutocompleteInteraction,
  type ChatInputCommandInteraction,
  type Client,
  type ClientEvents,
  type Interaction,
  type MessageContextMenuCommandInteraction,
  type UserContextMenuCommandInteraction,
} from 'discord.js';

import { BINDINGS, type EventBinding, type EventEmission } from './bindings.js';
import { buildBaseContext, withInteraction, type Context, type ContextDependencies } from './contexts.js';

/**
 * Minimal surface we require of the core EventRouter. Kept structural so
 * @furlow/discord does not need to depend on @furlow/core's concrete class.
 */
export interface CoreEventRouterLike {
  emit(event: string, context: Context, executor: unknown, evaluator: unknown): Promise<void>;
}

export interface DiscordEventRouterOptions {
  client: Client;
  deps: ContextDependencies;
  coreRouter: CoreEventRouterLike;

  /** Called for `/slash` commands. The router does no FURLOW event emission. */
  onCommandInteraction?: (interaction: ChatInputCommandInteraction) => Promise<void> | void;
  /** Called for autocomplete interactions. */
  onAutocompleteInteraction?: (interaction: AutocompleteInteraction) => Promise<void> | void;
  /** Called for user / message context menu commands. */
  onContextMenuInteraction?: (
    interaction: UserContextMenuCommandInteraction | MessageContextMenuCommandInteraction,
  ) => Promise<void> | void;

  /** Verbose logger. Signature matches the `log(category, message, data)` pattern used across FURLOW. */
  log?: (category: string, message: string, data?: unknown) => void;
  /** Called when a binding throws; useful for metrics / tracing. */
  onError?: (error: unknown, discordEvent: keyof ClientEvents) => void;
}

type Listener = (...args: unknown[]) => void;

export class DiscordEventRouter {
  private readonly client: Client;
  private readonly deps: ContextDependencies;
  private readonly coreRouter: CoreEventRouterLike;
  private readonly options: DiscordEventRouterOptions;
  private readonly listeners: Map<keyof ClientEvents, Listener> = new Map();
  private interactionListener: Listener | null = null;
  private started = false;

  constructor(options: DiscordEventRouterOptions) {
    this.client = options.client;
    this.deps = options.deps;
    this.coreRouter = options.coreRouter;
    this.options = options;
  }

  /** Wire every binding onto the Discord client. Idempotent. */
  start(): void {
    if (this.started) return;

    for (const binding of BINDINGS) {
      const listener = this.createBindingListener(binding);
      this.client.on(binding.discordEvent, listener as unknown as (...a: ClientEvents[typeof binding.discordEvent]) => void);
      this.listeners.set(binding.discordEvent, listener);
    }

    this.interactionListener = this.createInteractionListener();
    this.client.on('interactionCreate', this.interactionListener as (interaction: Interaction) => void);

    this.started = true;
  }

  /** Detach every listener we added. Safe to call before start(). */
  stop(): void {
    for (const [event, listener] of this.listeners) {
      this.client.off(event, listener as unknown as (...a: ClientEvents[typeof event]) => void);
    }
    this.listeners.clear();
    if (this.interactionListener) {
      this.client.off('interactionCreate', this.interactionListener as (interaction: Interaction) => void);
      this.interactionListener = null;
    }
    this.started = false;
  }

  /**
   * Manually emit a FURLOW event with the base context plus `extra` fields.
   * Primarily used by callers that want to trigger synthetic events
   * (e.g. scheduler, pipes) via the same dispatch path.
   */
  async emit(event: string, extra?: Record<string, unknown>): Promise<void> {
    const ctx = buildBaseContext(this.deps);
    if (extra) Object.assign(ctx, extra);
    await this.dispatchEmission(event, ctx);
  }

  private createBindingListener(binding: EventBinding): Listener {
    return (...args: unknown[]) => {
      void this.runBinding(binding, args);
    };
  }

  private async runBinding(binding: EventBinding, args: unknown[]): Promise<void> {
    try {
      const emissions = binding.handle(args, this.deps);
      for (const emission of emissions) {
        await this.dispatchEmission(emission.event, emission.context);
      }
    } catch (err) {
      this.reportError(err, binding.discordEvent);
    }
  }

  private async dispatchEmission(event: string, context: Context): Promise<void> {
    this.options.log?.('event', `emit ${event}`);
    await this.coreRouter.emit(event, context, this.deps.actionExecutor, this.deps.evaluator);
  }

  private createInteractionListener(): Listener {
    return (interaction: unknown) => {
      void this.routeInteraction(interaction as Interaction);
    };
  }

  private async routeInteraction(interaction: Interaction): Promise<void> {
    try {
      if (interaction.isChatInputCommand()) {
        await this.options.onCommandInteraction?.(interaction);
        return;
      }
      if (interaction.isAutocomplete()) {
        await this.options.onAutocompleteInteraction?.(interaction);
        return;
      }
      if (interaction.isUserContextMenuCommand() || interaction.isMessageContextMenuCommand()) {
        await this.options.onContextMenuInteraction?.(interaction);
        return;
      }

      // Component interactions flow through the FURLOW event router so user
      // YAML specs can handle them declaratively.
      const emissions = this.buildComponentEmissions(interaction);
      for (const emission of emissions) {
        await this.dispatchEmission(emission.event, emission.context);
      }
    } catch (err) {
      this.reportError(err, 'interactionCreate');

      // Best-effort error reply so the interaction does not hang. Match the
      // pre-refactor behavior exactly.
      if (
        'isRepliable' in interaction &&
        typeof (interaction as { isRepliable?: () => boolean }).isRepliable === 'function' &&
        (interaction as { isRepliable: () => boolean }).isRepliable() &&
        !(interaction as { replied?: boolean }).replied &&
        !(interaction as { deferred?: boolean }).deferred
      ) {
        const repliable = interaction as {
          reply: (opts: { content: string; ephemeral: boolean }) => Promise<unknown>;
        };
        await repliable
          .reply({
            content: 'An error occurred while processing this interaction.',
            ephemeral: true,
          })
          .catch(() => {});
      }
    }
  }

  private buildComponentEmissions(interaction: Interaction): EventEmission[] {
    const base = withInteraction(buildBaseContext(this.deps), interaction as unknown as Record<string, unknown>);

    if ('customId' in interaction && typeof interaction.customId === 'string') {
      (base as Record<string, unknown>).custom_id = interaction.customId;
      // Back-compat alias: some older specs read context.customId.
      (base as Record<string, unknown>).customId = interaction.customId;
    }

    if (interaction.isButton()) {
      (base as Record<string, unknown>).component_type = 'button';
      return [{ event: 'button_click', context: base }];
    }

    if (interaction.isStringSelectMenu()) {
      (base as Record<string, unknown>).component_type = 'select_menu';
      (base as Record<string, unknown>).values = interaction.values;
      // Back-compat alias.
      (base as Record<string, unknown>).selected = interaction.values;
      return [{ event: 'select_menu', context: base }];
    }

    if (
      interaction.isUserSelectMenu() ||
      interaction.isRoleSelectMenu() ||
      interaction.isChannelSelectMenu() ||
      interaction.isMentionableSelectMenu()
    ) {
      (base as Record<string, unknown>).component_type = 'select_menu';
      const values = (interaction as unknown as { values: string[] }).values;
      (base as Record<string, unknown>).values = values;
      (base as Record<string, unknown>).selected = values;
      return [{ event: 'select_menu', context: base }];
    }

    if (interaction.isModalSubmit()) {
      (base as Record<string, unknown>).component_type = 'modal';
      const fields: Record<string, string> = {};
      for (const [key, component] of interaction.fields.fields) {
        if ('value' in component && typeof (component as { value?: unknown }).value === 'string') {
          fields[key] = (component as { value: string }).value;
        }
      }
      (base as Record<string, unknown>).fields = fields;
      // Back-compat alias.
      (base as Record<string, unknown>).modal_values = fields;
      return [{ event: 'modal_submit', context: base }];
    }

    return [];
  }

  private reportError(err: unknown, discordEvent: keyof ClientEvents): void {
    this.options.onError?.(err, discordEvent);
    const msg = err instanceof Error ? err.message : String(err);
    // Keep parity with prior console output so existing operators searching
    // logs find the same phrasing.
    console.error(`Error in ${discordEvent} event:`, msg);
  }
}

export function createDiscordEventRouter(options: DiscordEventRouterOptions): DiscordEventRouter {
  return new DiscordEventRouter(options);
}
