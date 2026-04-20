/**
 * Plugin system for FURLOW.
 *
 * Plugins are user-supplied JavaScript modules that extend the runtime with
 * custom actions, expression functions, and expression transforms. They run
 * in-process with full access to Node.js APIs; only load plugins you trust.
 *
 * Plugin files are referenced either from `spec.plugins:` in the YAML or
 * passed to the CLI via `--plugins <path>`. Paths resolve relative to the
 * directory of the spec file the runtime loaded.
 *
 * The CLI calls `loadPlugins()` once at boot, after the action registry and
 * evaluator are constructed but before any events fire. Plugins therefore
 * see a registry that already contains the 85 built-in actions and an
 * evaluator already populated with the 71 built-in functions and 50
 * transforms. Registering a name that collides with a built-in logs a
 * warning and overwrites.
 */

import { pathToFileURL } from 'node:url';
import { dirname, isAbsolute, resolve as resolvePath } from 'node:path';
import type { ActionHandler } from '../actions/types.js';
import type { ActionRegistry } from '../actions/registry.js';
import type { ExpressionEvaluator } from '../expression/evaluator.js';

export interface PluginContext {
  /** Register a custom action handler. Must provide `name` and `execute`. */
  registerAction(handler: ActionHandler): void;
  /** Register a custom expression function. Callable from `${myFn(x)}`. */
  registerFunction(name: string, fn: (...args: unknown[]) => unknown): void;
  /** Register a custom expression transform. Usable via pipe syntax `${x | myTransform}`. */
  registerTransform(name: string, fn: (value: unknown, ...args: unknown[]) => unknown): void;
  /** Plugin-scoped logger. Prefixed with the plugin name when verbose mode is on. */
  log(message: string, data?: unknown): void;
  /** Read-only view of process.env for config access. */
  readonly env: NodeJS.ProcessEnv;
}

export interface Plugin {
  /** Plugin name. Shown in logs and error messages. */
  name: string;
  /** Optional semver for the plugin itself. */
  version?: string;
  /** Called once at startup to register handlers, functions, and transforms. */
  register(ctx: PluginContext): void | Promise<void>;
}

/**
 * Supported export shapes for a plugin module. Pick whichever is most natural
 * for your authoring style.
 */
export type PluginExport =
  | Plugin
  | ((ctx: PluginContext) => void | Promise<void>);

export interface PluginModule {
  default?: PluginExport;
  plugin?: PluginExport;
}

export interface PluginLoadOptions {
  /** The spec file (or spec directory). Relative plugin paths resolve from here. */
  baseDir: string;
  /** Where to write lifecycle logs. Usually the CLI's verbose logger. */
  log?: (category: string, message: string, data?: unknown) => void;
}

export interface LoadedPlugin {
  /** Plugin path as declared in the spec or CLI flag. */
  source: string;
  /** Resolved absolute filesystem path. */
  resolved: string;
  /** Plugin name (from the export's `name`, or the source path if anonymous). */
  name: string;
}

export class PluginLoadError extends Error {
  constructor(source: string, cause: unknown) {
    const causeMessage = cause instanceof Error ? cause.message : String(cause);
    super(`Failed to load plugin "${source}": ${causeMessage}`);
    this.name = 'PluginLoadError';
    (this as { cause?: unknown }).cause = cause;
  }
}

function coerceExport(source: string, mod: PluginModule): PluginExport {
  if (mod.plugin !== undefined) return mod.plugin;
  if (mod.default !== undefined) return mod.default;
  throw new PluginLoadError(
    source,
    new Error('plugin module must export a default function, a default `Plugin` object, or a named `plugin` export'),
  );
}

function resolvePluginPath(baseDir: string, source: string): string {
  if (isAbsolute(source)) return source;
  const base = baseDir.endsWith('.yaml') || baseDir.endsWith('.yml')
    ? dirname(baseDir)
    : baseDir;
  return resolvePath(base, source);
}

function buildContext(
  pluginName: string,
  actionRegistry: ActionRegistry,
  evaluator: ExpressionEvaluator,
  log?: (category: string, message: string, data?: unknown) => void,
): PluginContext {
  return {
    registerAction(handler) {
      if (!handler || typeof handler.name !== 'string' || typeof handler.execute !== 'function') {
        throw new Error(`[${pluginName}] registerAction expects { name: string, execute: async fn }`);
      }
      actionRegistry.register(handler);
    },
    registerFunction(name, fn) {
      if (typeof name !== 'string' || !name) {
        throw new Error(`[${pluginName}] registerFunction requires a non-empty name`);
      }
      if (typeof fn !== 'function') {
        throw new Error(`[${pluginName}] registerFunction requires a function`);
      }
      evaluator.addFunction(name, fn);
    },
    registerTransform(name, fn) {
      if (typeof name !== 'string' || !name) {
        throw new Error(`[${pluginName}] registerTransform requires a non-empty name`);
      }
      if (typeof fn !== 'function') {
        throw new Error(`[${pluginName}] registerTransform requires a function`);
      }
      evaluator.addTransform(name, fn);
    },
    log(message, data) {
      log?.(`plugin:${pluginName}`, message, data);
    },
    get env() {
      return process.env;
    },
  };
}

/**
 * Load a single plugin file and invoke its register hook.
 */
export async function loadPlugin(
  source: string,
  actionRegistry: ActionRegistry,
  evaluator: ExpressionEvaluator,
  options: PluginLoadOptions,
): Promise<LoadedPlugin> {
  const resolved = resolvePluginPath(options.baseDir, source);
  let mod: PluginModule;
  try {
    const href = pathToFileURL(resolved).href;
    mod = (await import(href)) as PluginModule;
  } catch (err) {
    throw new PluginLoadError(source, err);
  }

  let exportValue: PluginExport;
  try {
    exportValue = coerceExport(source, mod);
  } catch (err) {
    if (err instanceof PluginLoadError) throw err;
    throw new PluginLoadError(source, err);
  }

  const pluginName =
    typeof exportValue === 'object' && exportValue !== null && 'name' in exportValue
      ? (exportValue as Plugin).name || source
      : source;

  const ctx = buildContext(pluginName, actionRegistry, evaluator, options.log);

  try {
    if (typeof exportValue === 'function') {
      await exportValue(ctx);
    } else if (exportValue && typeof exportValue.register === 'function') {
      await exportValue.register(ctx);
    } else {
      throw new Error('plugin export is neither a function nor a Plugin object with `register`');
    }
  } catch (err) {
    throw new PluginLoadError(source, err);
  }

  return { source, resolved, name: pluginName };
}

/**
 * Load multiple plugins in declaration order. Fails fast: if any plugin
 * throws, subsequent plugins are not loaded and the error propagates.
 */
export async function loadPlugins(
  sources: readonly string[],
  actionRegistry: ActionRegistry,
  evaluator: ExpressionEvaluator,
  options: PluginLoadOptions,
): Promise<LoadedPlugin[]> {
  const loaded: LoadedPlugin[] = [];
  for (const source of sources) {
    const result = await loadPlugin(source, actionRegistry, evaluator, options);
    loaded.push(result);
  }
  return loaded;
}
