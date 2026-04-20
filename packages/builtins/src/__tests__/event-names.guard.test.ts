/**
 * Cross-builtin event-name guard.
 *
 * Structure-only tests per builtin historically encoded the BUGGY event
 * name as the invariant (e.g. afk asserted `event === 'message'` while the
 * runtime emits `message_create`). This single test walks every builtin's
 * `EventHandler[]` and asserts every `event` is one of:
 *
 *   1. A Discord-gateway-derived event emitted by `@furlow/discord/events`
 *      (`EMITTED_FURLOW_EVENTS`), or
 *   2. A core-emitted event (`automod_triggered`, `timer_fire`), or
 *   3. A custom event the runtime host emits (`scheduler_tick`,
 *      `voice_track_start`, `voice_track_end`), or
 *   4. A builtin's own internal emit (`giveaway_end`, `poll_end`,
 *      `reminder_due`, `ticket_create_confirmed`).
 *
 * If a builtin adds a handler for an event name outside this closed set the
 * test fails, which is what should have happened the first time `'message'`
 * was introduced.
 */

import { describe, it, expect } from 'vitest';
import { EMITTED_FURLOW_EVENTS } from '@furlow/discord/events';

import { afkEventHandlers } from '../afk/index.js';
import { autoResponderEventHandlers } from '../auto-responder/index.js';
import { giveawaysEventHandlers } from '../giveaways/index.js';
import { levelingEventHandlers } from '../leveling/index.js';
import { loggingEventHandlers } from '../logging/index.js';
import { musicEventHandlers } from '../music/index.js';
import { pollsEventHandlers } from '../polls/index.js';
import { reactionRolesEventHandlers } from '../reaction-roles/index.js';
import { remindersEventHandlers } from '../reminders/index.js';
import { starboardEventHandlers } from '../starboard/index.js';
import { ticketsEventHandlers } from '../tickets/index.js';
import { welcomeEventHandlers } from '../welcome/index.js';

// moderation and utilities have commands only, no event handlers.

/**
 * Events emitted outside `@furlow/discord/events` that builtins may listen
 * for. Adding one here is an explicit acknowledgment that the runtime host
 * (or a builtin itself) emits it.
 */
const RUNTIME_CUSTOM_EVENTS = new Set<string>([
  'automod_triggered',
  'timer_fire',
  'scheduler_tick',
  'voice_track_start',
  'voice_track_end',
]);

/** Events builtins emit themselves via the `emit` action. */
const BUILTIN_CUSTOM_EVENTS = new Set<string>([
  'giveaway_end',
  'poll_end',
  'reminder_due',
  'ticket_create_confirmed',
  'welcome',
  'member_welcomed',
  'warning_threshold_reached',
  'member_leveled_up',
]);

const ALLOWED = new Set<string>([
  ...EMITTED_FURLOW_EVENTS,
  ...RUNTIME_CUSTOM_EVENTS,
  ...BUILTIN_CUSTOM_EVENTS,
]);

const BUILTINS: Record<string, Array<{ event: string }>> = {
  afk: afkEventHandlers,
  'auto-responder': autoResponderEventHandlers,
  giveaways: giveawaysEventHandlers,
  leveling: levelingEventHandlers,
  logging: loggingEventHandlers,
  music: musicEventHandlers,
  polls: pollsEventHandlers,
  'reaction-roles': reactionRolesEventHandlers,
  reminders: remindersEventHandlers,
  starboard: starboardEventHandlers,
  tickets: ticketsEventHandlers,
  welcome: welcomeEventHandlers,
};

describe('builtin event-name guard', () => {
  for (const [name, handlers] of Object.entries(BUILTINS)) {
    it(`${name} listens only to events the runtime can emit`, () => {
      const unknown = handlers
        .map((h) => h.event)
        .filter((e) => !ALLOWED.has(e));
      expect(
        unknown,
        `${name} listens for events not emitted by the runtime: ${unknown.join(', ')}`,
      ).toEqual([]);
    });
  }
});
