/**
 * Normalize YAML shorthand actions to schema format
 *
 * YAML allows shorthand: { reply: { content: "..." } }
 * Schema expects explicit: { action: "reply", content: "..." }
 *
 * This normalization happens BEFORE schema validation so that
 * shorthand syntax passes validation.
 *
 * Processing Pipeline:
 *   1. Load YAML file(s) with import resolution
 *   2. Resolve environment variables
 *   3. **Normalize** shorthand to schema format (THIS MODULE)
 *   4. Validate against JSON schema
 *   5. Execute at runtime
 *
 * Normalization is IDEMPOTENT - calling it multiple times on already-normalized
 * data produces the same result.
 */

import type { FurlowSpec, Action, EventHandler, FlowDefinition, FlowParameter } from '@furlow/schema';

/** Reserved keys that are not action names */
const RESERVED_KEYS = new Set(['when', 'error_handler']);

/**
 * Normalize actions from YAML shorthand format to schema format, recursively.
 *
 * YAML allows: { reply: { content: "..." } }
 * Schema expects: { action: "reply", content: "..." }
 *
 * This function is IDEMPOTENT - safe to call on already-normalized actions.
 *
 * @param actions - Array of actions (shorthand or schema format)
 * @returns Array of actions in schema format
 */
export function normalizeActionsDeep(actions: Action[]): Action[] {
  // Handle null, undefined, or non-array inputs gracefully
  // Always return an array to maintain type safety
  if (!Array.isArray(actions)) {
    return [];
  }

  return actions.map((action) => normalizeAction(action));
}

/**
 * Normalize a single action from shorthand to schema format.
 * @internal
 */
function normalizeAction(action: Action): Action {
  // Handle null, undefined, or non-object inputs
  if (!action || typeof action !== 'object') {
    return action;
  }

  // Cast to record for property access
  const actionObj = action as unknown as Record<string, unknown>;

  // If action already has 'action' property, it's in schema format
  // Still need to normalize nested actions for control flow
  if (actionObj.action) {
    return normalizeNestedActions(actionObj) as unknown as Action;
  }

  // Convert shorthand to schema format
  // Find the first key that's not a reserved key - that's the action name
  for (const [key, value] of Object.entries(actionObj)) {
    if (RESERVED_KEYS.has(key)) continue;

    // Found the action type - build normalized action
    const normalized: Record<string, unknown> = {
      action: key,
    };

    // Spread value properties if it's an object, otherwise ignore
    // (handles cases like { voice_stop: null } or { voice_stop: true })
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(normalized, value);
    }

    // Copy over reserved properties if present
    if (actionObj.when !== undefined) normalized.when = actionObj.when;
    if (actionObj.error_handler !== undefined) normalized.error_handler = actionObj.error_handler;

    // Normalize nested actions in control flow structures
    return normalizeNestedActions(normalized) as unknown as Action;
  }

  // No action key found - return as-is (will fail validation with clear error)
  return action;
}

/**
 * Normalize nested actions within control flow structures.
 *
 * Control flow actions can contain nested action arrays in various properties.
 * This function recursively normalizes all such nested arrays.
 *
 * @internal
 */
function normalizeNestedActions(action: Record<string, unknown>): Record<string, unknown> {
  const result = { ...action };

  // Helper to safely normalize an action array property
  const normalizeArrayProp = (prop: string) => {
    const value = action[prop];
    if (value && Array.isArray(value)) {
      result[prop] = normalizeActionsDeep(value as Action[]);
    }
  };

  // flow_if - then/else branches
  normalizeArrayProp('then');
  normalizeArrayProp('else');

  // flow_switch - cases (object of arrays) and default
  if (action.cases && typeof action.cases === 'object' && !Array.isArray(action.cases)) {
    const normalizedCases: Record<string, Action[]> = {};
    for (const [key, caseActions] of Object.entries(action.cases as Record<string, unknown>)) {
      if (Array.isArray(caseActions)) {
        normalizedCases[key] = normalizeActionsDeep(caseActions as Action[]);
      } else {
        // Preserve non-array values (shouldn't happen, but be safe)
        normalizedCases[key] = caseActions as Action[];
      }
    }
    result.cases = normalizedCases;
  }
  normalizeArrayProp('default');

  // flow_while, repeat - do actions
  normalizeArrayProp('do');

  // parallel, batch - actions array
  normalizeArrayProp('actions');

  // batch - each (actions for each item)
  normalizeArrayProp('each');

  // try - try/catch/finally
  normalizeArrayProp('try');
  normalizeArrayProp('catch');
  normalizeArrayProp('finally');

  return result;
}

/**
 * Normalize a full FURLOW spec, converting all shorthand actions to schema format.
 *
 * This function handles:
 * - commands[].actions and subcommands
 * - context_menus[].actions
 * - events[].actions (both array and object format)
 * - flows[].actions (both array and object format)
 * - scheduler.jobs[].actions
 * - automod.rules[].actions and escalation.actions
 * - components.buttons/selects/modals[].actions
 *
 * This function is IDEMPOTENT - safe to call on already-normalized specs.
 *
 * @param spec - The FURLOW specification (may contain shorthand actions)
 * @returns Normalized specification with all actions in schema format
 */
export function normalizeSpec(spec: FurlowSpec): FurlowSpec {
  if (!spec || typeof spec !== 'object') {
    return spec;
  }

  const normalized = { ...spec };

  // Normalize commands[].actions and commands[].subcommands[].actions
  if (normalized.commands) {
    normalized.commands = normalized.commands.map((cmd) => {
      const normalizedCmd = { ...cmd };

      if (cmd.actions) {
        normalizedCmd.actions = normalizeActionsDeep(cmd.actions);
      }

      if (cmd.subcommands) {
        normalizedCmd.subcommands = cmd.subcommands.map((sub) => ({
          ...sub,
          actions: normalizeActionsDeep(sub.actions),
        }));
      }

      if (cmd.subcommand_groups) {
        normalizedCmd.subcommand_groups = cmd.subcommand_groups.map((group) => ({
          ...group,
          subcommands: group.subcommands.map((sub) => ({
            ...sub,
            actions: normalizeActionsDeep(sub.actions),
          })),
        }));
      }

      return normalizedCmd;
    });
  }

  // Normalize context_menus[].actions
  if (normalized.context_menus) {
    normalized.context_menus = normalized.context_menus.map((menu) => ({
      ...menu,
      actions: normalizeActionsDeep(menu.actions),
    }));
  }

  // Normalize events[].actions
  // Events can be either an array or an object keyed by event name
  if (normalized.events) {
    const events = normalized.events;
    if (Array.isArray(events)) {
      normalized.events = events.map((event) => ({
        ...event,
        actions: normalizeActionsDeep(event.actions),
      }));
    } else {
      // Object format: { ready: { actions: [...] }, member_join: { actions: [...] } }
      const eventsObj = events as unknown as Record<string, { actions: Action[] }>;
      const normalizedEvents: EventHandler[] = [];
      for (const [eventName, eventDef] of Object.entries(eventsObj)) {
        normalizedEvents.push({
          event: eventName,
          ...eventDef,
          actions: normalizeActionsDeep(eventDef.actions),
        });
      }
      normalized.events = normalizedEvents;
    }
  }

  // Normalize flows[].actions
  // Flows can be either an array or an object keyed by flow name
  if (normalized.flows) {
    const flows = normalized.flows;
    if (Array.isArray(flows)) {
      normalized.flows = flows.map((flow) => ({
        ...flow,
        actions: normalizeActionsDeep(flow.actions),
      }));
    } else {
      // Object format: { log_command: { parameters: [...], actions: [...] } }
      const flowsObj = flows as unknown as Record<string, { actions: Action[], parameters?: FlowParameter[] }>;
      const normalizedFlows: FlowDefinition[] = [];
      for (const [flowName, flowDef] of Object.entries(flowsObj)) {
        normalizedFlows.push({
          name: flowName,
          ...flowDef,
          actions: normalizeActionsDeep(flowDef.actions),
        });
      }
      normalized.flows = normalizedFlows;
    }
  }

  // Normalize scheduler.jobs[].actions
  if (normalized.scheduler?.jobs) {
    normalized.scheduler = {
      ...normalized.scheduler,
      jobs: normalized.scheduler.jobs.map((job) => ({
        ...job,
        actions: normalizeActionsDeep(job.actions),
      })),
    };
  }

  // Normalize automod.rules[].actions and escalation.actions
  if (normalized.automod?.rules) {
    normalized.automod = {
      ...normalized.automod,
      rules: normalized.automod.rules.map((rule) => {
        const normalizedRule = {
          ...rule,
          actions: normalizeActionsDeep(rule.actions),
        };
        if (rule.escalation?.actions) {
          normalizedRule.escalation = {
            ...rule.escalation,
            actions: normalizeActionsDeep(rule.escalation.actions),
          };
        }
        return normalizedRule;
      }),
    };
  }

  // Normalize components.buttons[].actions
  if (normalized.components?.buttons) {
    const normalizedButtons: typeof normalized.components.buttons = {};
    for (const [name, button] of Object.entries(normalized.components.buttons)) {
      normalizedButtons[name] = {
        ...button,
        actions: button.actions ? normalizeActionsDeep(button.actions) : undefined,
      };
    }
    normalized.components = {
      ...normalized.components,
      buttons: normalizedButtons,
    };
  }

  // Normalize components.selects[].actions
  if (normalized.components?.selects) {
    const normalizedSelects: typeof normalized.components.selects = {};
    for (const [name, select] of Object.entries(normalized.components.selects)) {
      normalizedSelects[name] = {
        ...select,
        actions: select.actions ? normalizeActionsDeep(select.actions) : undefined,
      };
    }
    normalized.components = {
      ...normalized.components,
      selects: normalizedSelects,
    };
  }

  // Normalize components.modals[].actions
  if (normalized.components?.modals) {
    const normalizedModals: typeof normalized.components.modals = {};
    for (const [name, modal] of Object.entries(normalized.components.modals)) {
      normalizedModals[name] = {
        ...modal,
        actions: modal.actions ? normalizeActionsDeep(modal.actions) : undefined,
      };
    }
    normalized.components = {
      ...normalized.components,
      modals: normalizedModals,
    };
  }

  return normalized;
}
