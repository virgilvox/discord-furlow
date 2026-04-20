/**
 * Declarative cooldowns (M5).
 *
 * Commands and event handlers can declare a `cooldown:` block:
 *
 *   cooldown:
 *     per: user        # user | channel | guild | global
 *     duration: 24h
 *     message: "You already claimed today."
 *
 * Before the handler runs, `checkCooldown` looks up a state key scoped to the
 * (handler, per, scope-id) tuple. If the key exists and has not expired, the
 * handler is blocked and the caller is expected to surface `message` or a
 * default response. If not, the key is written with a TTL equal to the
 * cooldown duration, leveraging M4's state-layer TTL so expiration is
 * automatic.
 *
 * The key format is:
 *
 *   cooldown:{handlerId}:{per}:{scopeId}
 *
 * where `scopeId` is empty for `per: global`. State is written on the
 * GLOBAL scope because cooldowns are per-handler and share a namespace
 * across every invocation.
 */

import type { StateManager } from '../state/manager.js';

export type CooldownScope = 'user' | 'channel' | 'guild' | 'global';

export interface CooldownDefinition {
  /** What the cooldown is scoped to. */
  per: CooldownScope;
  /** Duration string ("24h", "1m") or raw milliseconds. */
  duration: string | number;
  /**
   * Optional message shown to the blocked user. Caller interpolates it if
   * it contains `${...}`. Left as a passthrough so this module stays
   * independent of the expression evaluator.
   */
  message?: string;
}

export interface CooldownContext {
  /** User id. Required when `per === 'user'`. */
  userId?: string;
  /** Channel id. Required when `per === 'channel'`. */
  channelId?: string;
  /** Guild id. Required when `per === 'guild'`. */
  guildId?: string;
}

export interface CooldownCheckResult {
  /** True if the handler should run; false if the user is on cooldown. */
  allowed: boolean;
  /** When blocked, how many ms are left before the cooldown lifts. */
  remainingMs?: number;
  /** When blocked, the unmodified message from the definition (if any). */
  message?: string;
}

/**
 * Parse a duration string like "24h", "5m", "90s", "500ms" into milliseconds.
 * Raw numbers are returned as-is.
 */
export function parseCooldownDuration(value: string | number): number {
  if (typeof value === 'number' && Number.isFinite(value) && value >= 0) return value;
  if (typeof value !== 'string') return 0;
  const match = value.match(/^(\d+)(ms|s|m|h|d)?$/);
  if (!match) return 0;
  const n = parseInt(match[1]!, 10);
  switch (match[2] ?? 'ms') {
    case 'ms': return n;
    case 's':  return n * 1000;
    case 'm':  return n * 60_000;
    case 'h':  return n * 3_600_000;
    case 'd':  return n * 86_400_000;
    default:   return 0;
  }
}

/**
 * Build the state key for a cooldown entry.
 */
export function buildCooldownKey(
  handlerId: string,
  per: CooldownScope,
  context: CooldownContext,
): string {
  let scopeId = '';
  if (per === 'user') scopeId = context.userId ?? '';
  else if (per === 'channel') scopeId = context.channelId ?? '';
  else if (per === 'guild') scopeId = context.guildId ?? '';
  return `cooldown:${handlerId}:${per}:${scopeId}`;
}

/**
 * Check the cooldown. If allowed, atomically set the cooldown key with a TTL
 * equal to the duration and return `{ allowed: true }`. If blocked, return
 * the remaining time and the definition's message.
 *
 * `now` is injectable for deterministic tests.
 */
export async function checkAndConsumeCooldown(
  stateManager: StateManager,
  handlerId: string,
  definition: CooldownDefinition,
  context: CooldownContext,
  now: () => number = Date.now,
): Promise<CooldownCheckResult> {
  const durationMs = parseCooldownDuration(definition.duration);
  if (durationMs <= 0) return { allowed: true };

  const key = buildCooldownKey(handlerId, definition.per, context);

  // Cooldowns live on the GLOBAL scope so the key itself carries all the
  // routing information. We bypass variable-definition lookup by writing
  // directly with a per-call TTL.
  const existing = await stateManager.getRaw(key).catch(() => null);
  const nowMs = now();

  if (existing && typeof existing === 'object' && 'until' in existing) {
    const until = (existing as { until: number }).until;
    if (until > nowMs) {
      return {
        allowed: false,
        remainingMs: until - nowMs,
        message: definition.message,
      };
    }
  }

  // Write the new cooldown entry with a TTL equal to the duration.
  const until = nowMs + durationMs;
  await stateManager.setRaw(key, { until }, durationMs);

  return { allowed: true };
}
