# Changelog

All notable changes to FURLOW will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## 2026-04-19 follow-up

Published as `@furlow/testing@1.0.7`, `@furlow/dashboard@1.0.4`.

### Added (tests)

- Per-builtin behavioral integration test (`@furlow/testing`). Each builtin
  spec is loaded into the E2E runtime and the trigger event is simulated;
  the test asserts at least one action from the handler chain executed.
  Catches the "handler registered against an event the runtime never
  emits" bug class at runtime, not just by name.
- E2E runtime now registers stub flow-control handlers (`flow_if`,
  `flow_switch`, `flow_while`, `repeat`, `parallel`, `batch`, `try`,
  `abort`, `return`). Specs that mix flow control with concrete actions in
  event handler lists now run end-to-end instead of throwing
  `ActionNotFoundError` after the first action.

### Fixed (dashboard security)

- `apps/dashboard` WebSocket connections now require an authenticated
  session. Anonymous clients were previously accepted and could
  `subscribe_guild` to any guild ID; the upgrade handler now reads the
  express-session and rejects with HTTP 401 when no passport user is
  present. `subscribe_guild` additionally checks that the user has
  `MANAGE_GUILD` on the requested guild.
- `apps/dashboard` settings POST endpoints (`/settings`, `/welcome`,
  `/logging`, `/automod`, `/levels/:userId`) previously merged the raw
  request body into stored state. They now whitelist allowed fields with
  per-key type checks and reject unknown or wrong-typed keys with 400.

### Documentation

- README gained a Production deployment section covering required env,
  storage, scheduler, voice prerequisites, process supervision, dashboard
  TLS/OAuth setup, and observability endpoints.

## 2026-04-19 audit pass

Published as `@furlow/core@1.0.12`, `@furlow/discord@1.0.7`,
`@furlow/builtins@1.0.8`, `@furlow/testing@1.0.6`, `@furlow/cli@1.0.15`,
`@furlow/schema@1.0.5`.

### Fixed (shipping bugs)

- Five builtins declared event names the runtime never emitted, which
  rendered their message-triggered handlers non-functional. Fixed in
  `@furlow/builtins@1.0.7` hotfix (`afk`, `auto-responder`, `leveling`,
  `tickets` now listen for `message_create`; `logging` now listens for
  `message_delete_bulk`).
- `examples/multi-file-bot/events/message.yaml` had the same
  `event: 'message'` bug teaching new users the wrong pattern.
- `specs/compliance/minimal.furlow.yaml` used `params:` instead of
  `parameters:` in five flow definitions; the engine silently dropped
  them.
- `moderation` builtin declared a `mod_cases` audit-log table that no
  command ever wrote to. `kick`, `ban`, `unban`, `timeout` now insert
  into `mod_cases`.
- `apps/dashboard` session secret fell back to a hardcoded string when
  `DASHBOARD_SECRET` was unset. Production now refuses to start without
  an explicit secret; development uses a per-process random.

### Added (runtime)

- `@furlow/discord/events` declarative event module. 59 canonical
  FURLOW events wired via a single table. `start.ts` dropped from 1,128
  to 464 lines.
- `CronScheduler.setTickHandler` + CLI wiring emits `scheduler_tick`
  every 60s. Unblocks `giveaways`, `polls`, `reminders` builtins.
- `CronScheduler` is now actually instantiated by the CLI; user
  `scheduler:` blocks used to be silently ignored.
- `VoiceManager` emits `track_start` / `track_end`. CLI forwards as
  FURLOW `voice_track_start` / `voice_track_end` events. Unblocks the
  `music` builtin.
- `mass_ping` automod trigger implemented.
- Flow engine `MaxFlowDepthError` now propagates as an abort from the
  outer flow instead of being silently truncated.
- Action field aliases: `add_reactions`, `remove_reaction`,
  `clear_reactions` accept `channel`, `message`, `user`. `bulk_delete`
  accepts `user` to restrict deletion to one author.
- `clientReady` binding replaces deprecated `ready` listener
  (Discord.js v14.25 deprecated it).

### Added (tests)

- Cross-builtin event-name guard prevents regression of the event-name
  bug class.
- Real-evaluator automod `when` tests (mocks always returning true
  could not catch condition inversion).
- SQL-injection test suite for the database pipe (13 malicious
  identifiers plus column-name injection).
- Real catastrophic-backtracking ReDoS test (glob-based pseudo-test
  removed).
- VoiceManager track lifecycle listener tests.
- Scheduler tick-handler lifecycle tests.
- CLI smoke tests for `validate` and `export`.
- Real-Client `DiscordEventRouter` integration tests.
- Complex-bot integration test (13 cases exercising every subsystem).
- E2E runtime registers stub handlers for all 85 production actions.

### Fixed (test quality)

- Flow-engine depth-limit tests flipped from `success === true` (which
  encoded silent failure as correct) to `success === false` with error
  messaging.
- Builtin event-name assertions pinned the buggy names; updated to
  reference the corrected names.

### Documentation

- Full rewrite of `HANDOFF.md`, `RUNTIME_SPEC.md` event section,
  `docs/reference/llm-reference.md`, `docs/reference/events.md`,
  `docs/manifest.json` badges.
- Legacy flat docs replaced with redirects to canonical pages.
- Site landing counts corrected (84 -> 85 actions, 76 -> 59 events).
- `render_layers` added to site builder action schemas.

### Tooling

- Strict typecheck excludes test files. Vitest + esbuild still runs
  them. Closes the long-standing "typecheck errors in tests" known
  issue.
- Root `pnpm test` uses `--concurrency=1` to prevent OOM between
  storage and core test runs.

## [0.1.0] - 2026-02-03

### Added

#### Core Framework
- **YAML-based bot specification** - Define Discord bots declaratively without code
- **Expression language** - Jexl-based expressions with 50+ built-in functions
- **Pipe transforms** - String manipulation (`upper`, `lower`, `truncate`, `replace`, etc.)
- **Expression caching** - LRU cache for compiled expressions with performance stats
- **Action registry** - 100+ actions for Discord operations
- **Flow engine** - Reusable action sequences with parameters and control flow
- **State management** - Scoped variables (global, guild, channel, user, member)
- **Event routing** - Gateway event handling with conditions

#### Packages
- `@furlow/core` - Runtime engine (parser, evaluator, actions, flows, state)
- `@furlow/discord` - Discord.js v14 adapter (client, gateway, interactions, voice)
- `@furlow/schema` - JSON Schema definitions and TypeScript types
- `@furlow/storage` - Database adapters (SQLite, PostgreSQL, memory)
- `@furlow/builtins` - 14 pre-built bot components
- `@furlow/pipes` - External integrations (HTTP, WebSocket, webhooks)
- `@furlow/testing` - Test utilities and mocks
- `furlow` (CLI) - Command-line interface

#### Builtins
- **Moderation** - Warn, kick, ban, mute with escalation system
- **Welcome** - Welcome/goodbye messages with embeds and auto-roles
- **Logging** - Message, member, voice, and moderation event logging
- **Tickets** - Support ticket system with transcripts
- **Reaction Roles** - Button and reaction-based role assignment
- **Leveling** - XP system with level rewards and rank cards
- **Music** - Voice playback with queue, filters, and playlists
- **Starboard** - Star reactions to highlight messages
- **Polls** - Voting system with anonymous and timed options
- **Giveaways** - Giveaway system with requirements
- **Auto-responder** - Pattern-based automatic responses
- **AFK** - Away status with mention detection
- **Reminders** - Personal reminders with DM delivery
- **Utilities** - Server info, user info, avatar, and more

#### CLI Commands
- `furlow init` - Scaffold a new bot project
- `furlow start` - Run the bot in production
- `furlow dev` - Development mode with hot reload
- `furlow validate` - Validate YAML specification
- `furlow add` - Add builtin modules
- `furlow build` - Bundle for deployment

#### Dashboard
- React-based web dashboard
- Discord OAuth2 authentication
- Guild overview and statistics
- Settings editor by section
- Moderation case viewer
- Leveling leaderboard
- WebSocket real-time updates

#### Pipes
- **HTTP** - REST API integration with auth and rate limiting
- **WebSocket** - Bidirectional communication with reconnection
- **Webhook** - Incoming webhooks with HMAC verification
- **Database** - External database connections
- **MQTT** - IoT messaging protocol
- **TCP/UDP** - Raw socket connections
- **File** - Filesystem watching

#### Canvas
- Image generation for welcome and rank cards
- Layer system (image, text, shapes, progress bars)
- Custom generator definitions

#### Documentation
- Getting Started guide
- CLI Reference
- Expression Language reference (50+ functions)
- Actions Reference (100+ actions)
- Events Reference
- Builtin documentation (moderation, welcome, leveling)

#### Examples
- Simple bot - Basic commands
- Moderation bot - Full moderation setup
- Music bot - Voice playback with favorites
- Full-featured bot - 11 builtins combined

### Technical Details

#### Architecture
- Monorepo with pnpm workspaces and Turborepo
- TypeScript 5.3+ with strict mode
- ESM modules throughout
- discord.js v14 for Discord API
- Vitest for testing (443 tests)
- tsup for bundling

#### Storage
- SQLite (better-sqlite3) for single-server bots
- PostgreSQL for multi-server deployments
- In-memory adapter for testing

#### Expression Functions
Categories: Math, String, Date/Time, Array, Logic, Discord, Format

Notable functions:
- `now()`, `timestamp()`, `duration()` - Time operations
- `random()`, `range()`, `clamp()` - Math utilities
- `if()`, `coalesce()`, `switch()` - Conditionals
- `json()`, `entries()`, `keys()` - Object manipulation

#### State Scopes
- `global` - Shared across all guilds
- `guild` - Per-guild storage
- `channel` - Per-channel storage
- `user` - Per-user (follows across guilds)
- `member` - Per-user-per-guild

### Dependencies
- Node.js 20+ LTS required
- discord.js ^14.0.0
- jexl for expressions
- yaml for parsing
- ajv for schema validation
- better-sqlite3 / pg for storage

---

## Future Plans

### 0.2.0 (Planned)
- Plugin system for custom actions
- Dashboard improvements
- More canvas generators
- i18n support
- Audit logging

### 0.3.0 (Planned)
- Cluster support
- Sharding
- Redis storage adapter
- Rate limit management
- Analytics dashboard
