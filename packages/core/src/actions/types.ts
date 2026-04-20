/**
 * Action system types
 */

import type { Action } from '@furlow/schema';
import type { FullContext } from '../expression/context.js';
import type { FlowQuota } from '../flows/quota.js';

export interface ActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: Error;
}

export interface ActionContext extends FullContext {
  /** Current guild ID */
  guildId?: string;
  /** Current channel ID */
  channelId?: string;
  /** Current user ID */
  userId?: string;
  /** Current message ID */
  messageId?: string;
  /** The Discord client */
  client: unknown;
  /** State manager */
  stateManager: unknown;
  /** Expression evaluator */
  evaluator: unknown;
  /** Flow executor */
  flowExecutor: unknown;
  /** Abort signal for cancellation */
  signal?: AbortSignal;
  /** Per-invocation execution quota (operations, credits, wallclock, api buckets) */
  quota?: FlowQuota;
}

export interface ActionHandler<TConfig extends Action = Action, TResult = unknown> {
  /** Action name (matches the 'action' field in YAML) */
  name: string;
  /** JSON Schema for action configuration */
  schema?: object;
  /**
   * Weighted credit cost for quota accounting. Defaults to 1. Expensive
   * handlers (HTTP, AI, canvas, voice) override upward.
   */
  cost?: number;
  /** Execute the action */
  execute(config: TConfig, context: ActionContext): Promise<ActionResult<TResult>>;
  /** Validate action configuration */
  validate?(config: TConfig): boolean | string;
}

export type ActionHandlerMap = Map<string, ActionHandler>;
