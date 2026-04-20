/**
 * Synthesize scheduler jobs from event handlers that declare `cron:` or
 * `interval:`. Parity plan M6.
 *
 * A handler with `cron: "0 * * * *"` runs hourly; with `interval: "5m"`,
 * every 5 minutes. The existing CronScheduler runs jobs; this helper bridges
 * spec-level event handlers into that job registry.
 *
 * Minute granularity only (the scheduler checks once per minute). Intervals
 * below 60 seconds snap up to 60. Intervals over 24h fall back to daily.
 */

import type { CronJob, EventHandler } from '@furlow/schema';

/**
 * Parse an interval string like "30s", "5m", "1h" into minutes, capped at
 * whole minutes >= 1. Returns null for unparseable strings so the caller
 * can skip the handler and log.
 */
export function intervalToMinutes(interval: string | number): number | null {
  if (typeof interval === 'number' && Number.isFinite(interval)) {
    const mins = Math.ceil(interval / 60_000);
    return Math.max(1, mins);
  }
  if (typeof interval !== 'string') return null;

  const match = interval.match(/^(\d+)(ms|s|m|h|d)?$/);
  if (!match) return null;

  const value = parseInt(match[1]!, 10);
  const unit = match[2] ?? 'ms';

  let minutes: number;
  switch (unit) {
    case 'ms': minutes = Math.ceil(value / 60_000); break;
    case 's':  minutes = Math.ceil(value / 60); break;
    case 'm':  minutes = value; break;
    case 'h':  minutes = value * 60; break;
    case 'd':  minutes = value * 60 * 24; break;
    default:   return null;
  }
  return Math.max(1, minutes);
}

/**
 * Convert an interval-in-minutes into a 5-field cron expression.
 */
export function minutesToCron(minutes: number): string {
  if (minutes <= 0) minutes = 1;
  if (minutes < 60) return `*/${minutes} * * * *`;
  if (minutes < 60 * 24) {
    const hours = Math.ceil(minutes / 60);
    return `0 */${hours} * * *`;
  }
  const days = Math.ceil(minutes / (60 * 24));
  return `0 0 */${days} * *`;
}

export interface CronEventHandler {
  event: string;
  handler: EventHandler;
  cron: string;
}

/**
 * Extract handlers with `cron:` or `interval:` and return them paired with
 * their cron expression. Returns an empty array if no handlers need
 * scheduling.
 */
export function collectCronHandlers(
  events: readonly EventHandler[] | undefined,
): CronEventHandler[] {
  if (!events || events.length === 0) return [];
  const result: CronEventHandler[] = [];

  for (const handler of events) {
    const h = handler as EventHandler & { cron?: string; interval?: string | number };
    let cron: string | null = null;

    if (typeof h.cron === 'string' && h.cron.trim().length > 0) {
      cron = h.cron;
    } else if (h.interval !== undefined) {
      const mins = intervalToMinutes(h.interval);
      if (mins === null) {
        console.warn(`[scheduler] Invalid interval "${h.interval}" on event "${handler.event}", ignoring`);
        continue;
      }
      cron = minutesToCron(mins);
    }

    if (cron) result.push({ event: handler.event, handler, cron });
  }

  return result;
}

/**
 * Build a synthetic CronJob spec for each cron-triggered event handler.
 * Job names are stable per (event, index) so restarts reuse the same ID.
 */
export function synthesizeCronJobs(
  entries: readonly CronEventHandler[],
): CronJob[] {
  return entries.map((entry, index) => ({
    name: `event:${entry.event}#${index}`,
    cron: entry.cron,
    enabled: true,
    actions: entry.handler.actions,
    when: entry.handler.when ?? entry.handler.condition,
  }));
}
