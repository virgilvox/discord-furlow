/**
 * State action handlers
 */

import type { ActionRegistry } from '../registry.js';
import type { ActionHandler, ActionContext, ActionResult } from '../types.js';
import type { HandlerDependencies } from './index.js';
import type {
  SetAction,
  IncrementAction,
  DecrementAction,
  ListPushAction,
  ListRemoveAction,
  SetMapAction,
  DeleteMapAction,
} from '@furlow/schema';
import type { StateManager } from '../../state/manager.js';

/**
 * Get the state context for a given scope
 */
function getStateContext(
  scope: string | undefined,
  context: ActionContext
): { guildId?: string; channelId?: string; userId?: string } {
  const guildId = context.guildId || (context.guild as any)?.id;
  const channelId = context.channelId || (context.channel as any)?.id;
  const userId = context.userId || (context.user as any)?.id;

  switch (scope) {
    case 'global':
      return {};
    case 'guild':
      return { guildId };
    case 'channel':
      return { guildId, channelId };
    case 'user':
      return { userId };
    case 'member':
      return { guildId, userId };
    default:
      return { guildId };
  }
}

/**
 * Set a value in context.state with proper scoping
 * State is stored as state.{scope}.{key} for expression access
 */
function setContextState(
  context: ActionContext,
  scope: string | undefined,
  key: string,
  value: unknown
): void {
  const scopeName = scope || 'global';
  if (!context.state) {
    (context as any).state = {};
  }
  if (!(context.state as Record<string, unknown>)[scopeName]) {
    (context.state as Record<string, unknown>)[scopeName] = {};
  }
  ((context.state as Record<string, unknown>)[scopeName] as Record<string, unknown>)[key] = value;
}

/**
 * Get a value from context.state with proper scoping
 */
function getContextState(
  context: ActionContext,
  scope: string | undefined,
  key: string
): unknown {
  const scopeName = scope || 'global';
  if (!context.state) {
    return undefined;
  }
  const scopeObj = (context.state as Record<string, unknown>)[scopeName];
  if (!scopeObj || typeof scopeObj !== 'object') {
    return undefined;
  }
  return (scopeObj as Record<string, unknown>)[key];
}

/**
 * Set action handler
 */
const setHandler: ActionHandler<SetAction> = {
  name: 'set',
  async execute(config, context): Promise<ActionResult> {
    const deps = context._deps as HandlerDependencies;
    const { evaluator, stateManager } = deps;

    const key = config.key || config.var;
    if (!key) {
      return { success: false, error: new Error('Variable name (key or var) is required') };
    }

    // Evaluate the value
    let value: unknown;
    if (typeof config.value === 'string' && config.value.includes('${')) {
      // It's a template string
      value = await evaluator.interpolate(config.value, context);
    } else if (typeof config.value === 'string' && !config.value.startsWith('"')) {
      // It might be an expression
      try {
        value = await evaluator.evaluate(config.value, context);
      } catch {
        // If evaluation fails, use as literal string
        value = config.value;
      }
    } else {
      value = config.value;
    }

    // If we have a state manager, use it for persistent state
    if (stateManager) {
      const stateContext = getStateContext(config.scope, context);
      await stateManager.set(key, value, stateContext);
    }

    // Also set in context.state for immediate access (scoped structure)
    setContextState(context, config.scope, key, value);

    // Store result in variable if requested
    if (config.as) {
      (context as Record<string, unknown>)[config.as] = value;
    }

    return { success: true, data: value };
  },
};

/**
 * Increment action handler
 */
const incrementHandler: ActionHandler<IncrementAction> = {
  name: 'increment',
  async execute(config, context): Promise<ActionResult> {
    const deps = context._deps as HandlerDependencies;
    const { stateManager } = deps;

    const key = config.var;
    const by = config.by ?? 1;

    // If we have a state manager, use it
    if (stateManager) {
      const stateContext = getStateContext(config.scope, context);
      const newValue = await stateManager.increment(key, by, stateContext);

      // Update context.state with scoped access
      setContextState(context, config.scope, key, newValue);

      return { success: true, data: newValue };
    }

    // Fallback to context.state only
    const current = (getContextState(context, config.scope, key) as number) || 0;
    const newValue = current + by;
    setContextState(context, config.scope, key, newValue);

    return { success: true, data: newValue };
  },
};

/**
 * Decrement action handler
 */
const decrementHandler: ActionHandler<DecrementAction> = {
  name: 'decrement',
  async execute(config, context): Promise<ActionResult> {
    const deps = context._deps as HandlerDependencies;
    const { stateManager } = deps;

    const key = config.var;
    const by = config.by ?? 1;

    // If we have a state manager, use it
    if (stateManager) {
      const stateContext = getStateContext(config.scope, context);
      const newValue = await stateManager.decrement(key, by, stateContext);

      // Update context.state with scoped access
      setContextState(context, config.scope, key, newValue);

      return { success: true, data: newValue };
    }

    // Fallback to context.state only
    const current = (getContextState(context, config.scope, key) as number) || 0;
    const newValue = current - by;
    setContextState(context, config.scope, key, newValue);

    return { success: true, data: newValue };
  },
};

/**
 * List push action handler
 */
const listPushHandler: ActionHandler<ListPushAction> = {
  name: 'list_push',
  async execute(config, context): Promise<ActionResult> {
    const deps = context._deps as HandlerDependencies;
    const { evaluator, stateManager } = deps;

    const key = config.key || config.var;
    if (!key) {
      return { success: false, error: new Error('Variable name (key or var) is required') };
    }

    // Evaluate the value
    let value: unknown;
    if (typeof config.value === 'string') {
      try {
        value = await evaluator.evaluate(String(config.value), context);
      } catch {
        value = config.value;
      }
    } else {
      value = config.value;
    }

    // Get current list
    let list: unknown[];
    if (stateManager) {
      const stateContext = getStateContext(config.scope, context);
      const current = await stateManager.get<unknown[]>(key, stateContext);
      list = Array.isArray(current) ? [...current] : [];
    } else {
      const current = getContextState(context, config.scope, key);
      list = Array.isArray(current) ? [...current] : [];
    }

    // Push value
    list.push(value);

    // Save
    if (stateManager) {
      const stateContext = getStateContext(config.scope, context);
      await stateManager.set(key, list, stateContext);
    }

    setContextState(context, config.scope, key, list);

    return { success: true, data: list };
  },
};

/**
 * List remove action handler
 */
const listRemoveHandler: ActionHandler<ListRemoveAction> = {
  name: 'list_remove',
  async execute(config, context): Promise<ActionResult> {
    const deps = context._deps as HandlerDependencies;
    const { evaluator, stateManager } = deps;

    const key = config.key || config.var;
    if (!key) {
      return { success: false, error: new Error('Variable name (key or var) is required') };
    }

    // Get current list
    let list: unknown[];
    if (stateManager) {
      const stateContext = getStateContext(config.scope, context);
      const current = await stateManager.get<unknown[]>(key, stateContext);
      list = Array.isArray(current) ? [...current] : [];
    } else {
      const current = getContextState(context, config.scope, key);
      list = Array.isArray(current) ? [...current] : [];
    }

    // Remove by index or value
    if (config.index !== undefined) {
      let index: number;
      if (typeof config.index === 'string') {
        index = await evaluator.evaluate<number>(config.index, context);
      } else {
        index = config.index;
      }
      // Bounds checking for array index
      if (index >= 0 && index < list.length) {
        list.splice(index, 1);
      } else if (index < 0 && Math.abs(index) <= list.length) {
        // Support negative indexing like Python
        list.splice(list.length + index, 1);
      }
      // Silently ignore out-of-bounds indices
    } else if (config.value !== undefined) {
      let value: unknown;
      if (typeof config.value === 'string') {
        try {
          value = await evaluator.evaluate(String(config.value), context);
        } catch {
          value = config.value;
        }
      } else {
        value = config.value;
      }
      const index = list.indexOf(value);
      if (index !== -1) {
        list.splice(index, 1);
      }
    }

    // Save
    if (stateManager) {
      const stateContext = getStateContext(config.scope, context);
      await stateManager.set(key, list, stateContext);
    }

    setContextState(context, config.scope, key, list);

    return { success: true, data: list };
  },
};

/**
 * Set map action handler
 */
const setMapHandler: ActionHandler<SetMapAction> = {
  name: 'set_map',
  async execute(config, context): Promise<ActionResult> {
    const deps = context._deps as HandlerDependencies;
    const { evaluator, stateManager } = deps;

    const key = config.key || config.var;
    if (!key) {
      return { success: false, error: new Error('Variable name (key or var) is required') };
    }

    // Evaluate the map key
    const mapKey = await evaluator.interpolate(String(config.map_key), context);

    // Protect against prototype pollution
    if (mapKey === '__proto__' || mapKey === 'constructor' || mapKey === 'prototype') {
      return { success: false, error: new Error(`Invalid map key: ${mapKey}`) };
    }

    // Evaluate the value
    let value: unknown;
    if (typeof config.value === 'string') {
      try {
        value = await evaluator.evaluate(String(config.value), context);
      } catch {
        value = config.value;
      }
    } else {
      value = config.value;
    }

    // Get current map
    let map: Record<string, unknown>;
    if (stateManager) {
      const stateContext = getStateContext(config.scope, context);
      const current = await stateManager.get<Record<string, unknown>>(key, stateContext);
      map = typeof current === 'object' && current !== null ? { ...current } : {};
    } else {
      const current = getContextState(context, config.scope, key);
      map = typeof current === 'object' && current !== null ? { ...(current as Record<string, unknown>) } : {};
    }

    // Set value using Object.defineProperty for safety
    Object.defineProperty(map, mapKey, {
      value,
      writable: true,
      enumerable: true,
      configurable: true,
    });

    // Save
    if (stateManager) {
      const stateContext = getStateContext(config.scope, context);
      await stateManager.set(key, map, stateContext);
    }

    setContextState(context, config.scope, key, map);

    return { success: true, data: map };
  },
};

/**
 * Delete map action handler
 */
const deleteMapHandler: ActionHandler<DeleteMapAction> = {
  name: 'delete_map',
  async execute(config, context): Promise<ActionResult> {
    const deps = context._deps as HandlerDependencies;
    const { evaluator, stateManager } = deps;

    const key = config.key || config.var;
    if (!key) {
      return { success: false, error: new Error('Variable name (key or var) is required') };
    }

    // Evaluate the map key
    const mapKey = await evaluator.interpolate(String(config.map_key), context);

    // Protect against prototype pollution
    if (mapKey === '__proto__' || mapKey === 'constructor' || mapKey === 'prototype') {
      return { success: false, error: new Error(`Invalid map key: ${mapKey}`) };
    }

    // Get current map
    let map: Record<string, unknown>;
    if (stateManager) {
      const stateContext = getStateContext(config.scope, context);
      const current = await stateManager.get<Record<string, unknown>>(key, stateContext);
      map = typeof current === 'object' && current !== null ? { ...current } : {};
    } else {
      const current = getContextState(context, config.scope, key);
      map = typeof current === 'object' && current !== null ? { ...(current as Record<string, unknown>) } : {};
    }

    // Delete value (only if it's an own property)
    if (Object.prototype.hasOwnProperty.call(map, mapKey)) {
      delete map[mapKey];
    }

    // Save
    if (stateManager) {
      const stateContext = getStateContext(config.scope, context);
      await stateManager.set(key, map, stateContext);
    }

    setContextState(context, config.scope, key, map);

    return { success: true, data: map };
  },
};

/**
 * Register all state handlers
 */
export function registerStateHandlers(
  registry: ActionRegistry,
  deps: HandlerDependencies
): void {
  registry.register(setHandler);
  registry.register(incrementHandler);
  registry.register(decrementHandler);
  registry.register(listPushHandler);
  registry.register(listRemoveHandler);
  registry.register(setMapHandler);
  registry.register(deleteMapHandler);
}
