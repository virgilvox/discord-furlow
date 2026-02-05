/**
 * E2E Testing Framework
 *
 * Provides end-to-end testing utilities for FURLOW specs.
 * Tests the full pipeline: YAML Spec -> Parse -> Execute Actions -> Verify
 */

export {
  createE2ERuntime,
  type E2ETestRuntime,
  type E2ETestRuntimeOptions,
  // Mock Discord classes for E2E testing (prefixed to avoid collision with mocks/index.ts)
  MockUser as E2EMockUser,
  MockMember as E2EMockMember,
  MockGuild as E2EMockGuild,
  MockChannel as E2EMockChannel,
  MockMessage as E2EMockMessage,
  MockRole as E2EMockRole,
  MockRoleManager as E2EMockRoleManager,
  MockPermissions as E2EMockPermissions,
  MockCommandInteraction as E2EMockCommandInteraction,
  MockButtonInteraction as E2EMockButtonInteraction,
  MockSelectMenuInteraction as E2EMockSelectMenuInteraction,
  MockModalSubmitInteraction as E2EMockModalSubmitInteraction,
  MockReaction as E2EMockReaction,
} from './runtime.js';

export {
  ActionTracker,
  createActionTracker,
  createTrackedHandler,
  createTrackedRegistry,
  type ActionExecutionRecord,
  type DiscordApiCall,
} from './action-tracker.js';
