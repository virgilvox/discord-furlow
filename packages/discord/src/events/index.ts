/**
 * @furlow/discord/events
 *
 * Declarative Discord.js -> FURLOW event bindings plus a router that wires
 * them onto a Client and forwards dispatch to the core EventRouter.
 */

export {
  buildBaseContext,
  cloneContext,
  wrapDiscordObject,
  withChannel,
  withEmoji,
  withGuild,
  withInteraction,
  withInvite,
  withMember,
  withMessage,
  withPresence,
  withReaction,
  withRole,
  withScheduledEvent,
  withStageInstance,
  withSticker,
  withThread,
  withTyping,
  withUser,
  type Context,
  type ContextDependencies,
} from './contexts.js';

export { BINDINGS, EMITTED_FURLOW_EVENTS, type EventBinding, type EventEmission } from './bindings.js';

export {
  DiscordEventRouter,
  createDiscordEventRouter,
  type CoreEventRouterLike,
  type DiscordEventRouterOptions,
} from './router.js';
