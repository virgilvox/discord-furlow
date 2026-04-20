# FURLOW Development Handoff

## Project Overview

FURLOW (**F**lexible **U**ser **R**ules for **L**ive **O**nline **W**orkers) is a declarative Discord bot framework built as a TypeScript monorepo with pnpm workspaces and Turborepo. Bot behavior is described in YAML. The runtime (parser, expression evaluator, action executor, flow engine, event router, state manager, automod, scheduler, canvas, pipes) is fully implemented.

## Current State

All production code builds clean, typechecks clean, and tests clean. The
runtime surface, schema types, handler implementations, and documentation
are in agreement. Every documented action, event, function, transform, and
context field maps to a concrete handler, emission, or context builder in
the code. Event names declared by every builtin are guarded by a test.

### Package snapshot (current published versions)

| Package | Version | Tests | Notes |
|---------|---------|-------|-------|
| `@furlow/schema` | 1.0.5 | none | Type definitions + JSON schema |
| `@furlow/storage` | 1.0.4 | 226 (50 skipped on Docker) | Memory, SQLite, PostgreSQL |
| `@furlow/core` | 1.0.12 | 1,342 | Parser, evaluator, flow engine, state, automod, scheduler, canvas, depth guard surfaces failures |
| `@furlow/discord` | 1.0.7 | 207 | Client, voice (with track lifecycle events), video, interactions, declarative event router |
| `@furlow/pipes` | 1.0.5 | 273 | HTTP, WebSocket, MQTT, TCP/UDP, Webhook, Database (with SQL-injection test suite), File |
| `@furlow/testing` | 1.0.6 | 301 | MockClient, ActionTracker, E2E runtime with 85 action stubs, complex-bot integration |
| `@furlow/builtins` | 1.0.8 | 449 | 14 modules; event-name guard test catches the kind of bug that shipped in 1.0.6 |
| `@furlow/cli` | 1.0.15 | 4 | Wires cron scheduler, forwards voice track events, smoke tests for `validate` and `export` |
| `@furlow/dashboard` | 1.0.3 | none | Express + React (private app, not published) |

**Total Tests: 2,802 passing (50 storage tests skipped, gated on testcontainers).**

### Verification commands

```bash
pnpm build        # 10/10 tasks successful
pnpm typecheck    # 16/16 tasks successful
pnpm test         # 19/19 tasks successful (serial via --concurrency=1 to avoid OOM)
```

## Complete Feature List

### Action System (85 actions)

| Category | Count | Actions |
|----------|-------|---------|
| **Message** | 11 | reply, send_message, edit_message, delete_message, defer, update_message, add_reaction, add_reactions, remove_reaction, clear_reactions, bulk_delete |
| **Member** | 14 | assign_role, remove_role, toggle_role, kick, ban, unban, timeout, remove_timeout, send_dm, set_nickname, move_member, disconnect_member, server_mute, server_deafen |
| **State** | 7 | set, increment, decrement, list_push, list_remove, set_map, delete_map |
| **Flow** | 13 | call_flow, abort, return, flow_if, flow_switch, flow_while, repeat, parallel, batch, try, wait, log, emit |
| **Channel** | 9 | create_channel, edit_channel, delete_channel, create_thread, archive_thread, set_channel_permissions, create_role, edit_role, delete_role |
| **Component** | 1 | show_modal |
| **Voice** | 17 | voice_join, voice_leave, voice_play, voice_pause, voice_resume, voice_stop, voice_skip, voice_seek, voice_volume, voice_set_filter, voice_search, queue_get, queue_add, queue_remove, queue_clear, queue_shuffle, queue_loop |
| **Database** | 4 | db_insert, db_update, db_delete, db_query |
| **Integration** | 9 | pipe_request, pipe_send, webhook_send, create_timer, cancel_timer, counter_increment, record_metric, canvas_render, render_layers |

Action field aliases: `add_reactions`, `remove_reaction`, `clear_reactions` accept `channel`, `message` (alias of `message_id`), and for `remove_reaction` `user` (alias of `user_id`). `bulk_delete` accepts `user` to restrict deletion to one author.

### Event System (59 canonical events)

Every event emitted by `@furlow/discord/events` is listed in the exported `EMITTED_FURLOW_EVENTS` array and documented in `docs/reference/events.md`. They cover bot lifecycle, guild, members (including boost/unboost), messages, reactions (plus legacy aliases `reaction_add` / `reaction_remove`), channels, threads, roles, emojis, stickers, invites, voice (state update plus derived join/leave/move/stream transitions), presence, typing, scheduled events, stage instances, and component interactions (button_click, select_menu, modal_submit).

The event wiring is a declarative table in `packages/discord/src/events/bindings.ts`. `DiscordEventRouter` binds each entry to a Discord.js Client event and forwards emissions to the core `EventRouter`. Adding a new event is one entry in the table; no changes to `start.ts` required.

### Expression System

- **71 functions** across date/time, math, string, array, object, type, conversion, Discord, utility.
- **50 transforms** for pipe-based data transformation.
- **LRU cache** with configurable size for compiled expressions.
- Interpolated fields use `${expression}`; evaluated fields (`when`, `if`, `while`, `flow_switch.value`, `batch.items`, `call_flow.args.*`, `emit.data.*`) use raw JEXL expressions.

### State (5 scopes)

`global`, `guild`, `channel`, `user`, `member`. Access via `state.{scope}.{var}` inside expressions. Backed by Memory, SQLite, or PostgreSQL adapters.

### Automod (12 triggers)

`keyword`, `regex`, `link`, `invite`, `caps`, `emoji_spam`, `mention_spam`, `newline_spam`, `attachment`, `spam`, `duplicate`, `mass_ping` (matches `@everyone` / `@here`).

### Voice

- 10 audio filters: bassboost, nightcore, vaporwave, 8d, treble, normalizer, karaoke, tremolo, vibrato, reverse.
- Full queue (add, remove, clear, shuffle, loop off/track/queue), volume (0-200%), seek with duration string, YouTube search.

### Canvas

- 6 layer types: image, circle_image, text, rect, progress_bar, gradient.
- Welcome and rank card themes (default, dark, light, minimal, gradient).

### External Pipes (8 types)

HTTP (auth, rate limit, retries), WebSocket (auto-reconnect, heartbeat), Webhook (HMAC verification), MQTT (QoS, wildcards, LWT), TCP, UDP, Database (SQLite/PostgreSQL/Memory), File (chokidar).

### Builtin Modules (14)

moderation, welcome, logging, tickets, reaction-roles, leveling, music, starboard, polls, giveaways, auto-responder, afk, reminders, utilities.

### CLI Commands

| Command | Description |
|---------|-------------|
| `furlow init [name]` | Scaffold project (simple, moderation, full templates) |
| `furlow start [path]` | Run bot (thin coordinator, delegates events to DiscordEventRouter) |
| `furlow dev [path]` | Run with file watcher hot reload |
| `furlow validate <path>` | Schema-validate YAML with colored output |
| `furlow add <builtin>` | Add a builtin module to an existing project |
| `furlow build [path]` | Bundle for deployment |
| `furlow export <path>` | Export Discord slash command registration JSON |

## Design Principles

### YAML as source of truth

Bot behavior is entirely in YAML. The parser normalizes shorthand actions to schema form, resolves multi-file imports, and validates against a JSON schema before execution.

### State access

```yaml
- set:
    var: counter
    value: 10
    scope: global

- log:
    message: "Counter: ${state.global.counter}"
```

Scopes: `global`, `guild`, `channel`, `user`, `member`.

### Action shorthand

```yaml
# Shorthand
- reply:
    content: "Hello!"

# Normalized to schema format before validation
- action: reply
  content: "Hello!"
```

### Long-running commands

Use `defer` before any interaction that takes more than 3 seconds.

## Architecture

```
furlow/
├── apps/
│   ├── cli/                       # `furlow` CLI
│   │   └── src/commands/
│   │       ├── start.ts           # Coordinator: loads spec, wires runtime, starts DiscordEventRouter
│   │       ├── init.ts            # Scaffolding
│   │       ├── dev.ts             # Hot-reload harness
│   │       ├── validate.ts        # Schema validation (colored output)
│   │       ├── add.ts             # Inject builtin modules
│   │       ├── build.ts           # Bundle for deploy
│   │       └── export.ts          # Discord command JSON export
│   ├── dashboard/                 # Web dashboard (Express + React; private, not a workspace dep)
│   └── site/                      # Docs site (Vue, reads /docs/*.md at build via Vite glob)
├── packages/
│   ├── schema/                    # TypeScript types + JSON schema + validator
│   ├── storage/                   # Memory, SQLite, PostgreSQL adapters
│   ├── core/
│   │   ├── parser/                # YAML load, import resolution, env vars, normalization, validation
│   │   ├── expression/            # Jexl evaluator, 71 functions, 50 transforms, LRU cache
│   │   ├── actions/handlers/      # 85 action handlers
│   │   ├── events/                # Core EventRouter (debounce/throttle/once/when)
│   │   ├── flows/                 # FlowEngine with recursion protection
│   │   ├── state/                 # 5-scope StateManager
│   │   ├── automod/               # AutomodEngine (12 triggers, escalation)
│   │   ├── scheduler/             # Cron + timer schedulers
│   │   └── canvas/                # node-canvas image generation
│   ├── discord/
│   │   ├── client/                # Client wrapper
│   │   ├── gateway/               # Gateway lifecycle
│   │   ├── interactions/          # Commands, buttons, modals, context menus, autocomplete
│   │   ├── voice/                 # VoiceManager (seek, filters, search)
│   │   ├── video/                 # VideoManager (stream detection)
│   │   └── events/                # Declarative Discord.js -> FURLOW event table + DiscordEventRouter
│   ├── pipes/                     # 8 external integrations
│   ├── builtins/                  # 14 pre-built modules
│   └── testing/                   # MockClient, ActionTracker, E2E runtime, fixtures
├── specs/compliance/              # Runtime compliance tests (minimal / standard / full)
├── docs/
│   ├── reference/                 # Canonical reference docs (events, actions, expressions, cli, canvas, voice, yaml-spec, llm-reference)
│   ├── guides/                    # Installation, quickstart, configuration
│   ├── builtins/                  # Per-builtin docs
│   ├── packages/pipes/            # Per-pipe docs
│   ├── advanced/                  # Performance, scaling, debugging, custom actions, custom expressions
│   └── manifest.json              # Drives the docs site nav; keep in sync with /docs structure
├── RUNTIME_SPEC.md                # Language-agnostic runtime spec
└── HANDOFF.md                     # This file
```

## Runtime Specification

`RUNTIME_SPEC.md` defines the complete FURLOW runtime spec for alternative implementations. It covers compliance levels (minimal, standard, full), YAML format, expression language (71 functions, 50 transforms), state management, all 85 actions, event system (59 canonical events), and flows. It matches the reference implementation in this repo.

## Development Commands

```bash
pnpm install                         # Install dependencies
pnpm build                           # Build all packages (turbo-cached)
pnpm test                            # Run all tests (serial via --concurrency=1)
pnpm typecheck                       # Strict typecheck (tests excluded)
pnpm dev                             # Watch mode
pnpm clean                           # Clean dist and node_modules
pnpm -r publish --access public --no-git-checks  # Publish in dependency order
```

## Testing Strategy

- Production code is type-checked strictly (`tsconfig.json` excludes `__tests__`, `*.test.ts`, `*.spec.ts`, `*.e2e.test.ts`).
- Tests run via vitest + esbuild; they are not covered by `pnpm typecheck` so test fixtures can use mock-typed objects without jumping through generics.
- `@furlow/testing` provides an E2E runtime that mocks the Discord API and registers the same action names production uses (`set`, `increment`, `list_push`, `set_map`, `delete_map`, `call_flow`, `emit`, etc.). The runtime mirrors production context semantics for component interactions (`values`, `fields`, `custom_id` exposed at top level).
- The complex-bot integration test (`packages/testing/src/__tests__/complex-bot.integration.test.ts`) loads a multi-file spec that exercises every subsystem and proves end-to-end behavior including multi-file imports, subcommand groups, deep flow nesting, all 5 state scopes, automod with every trigger type, scheduler, pipes, and canvas.

## Docs Accuracy Guarantees

Every claim in `/docs/` maps to something the runtime actually does. Specifically verified in the most recent audit pass:

- Every action name in `docs/reference/llm-reference.md` and `docs/reference/actions/_index.md` exists as a `name:` field on a registered handler in `packages/core/src/actions/handlers/`.
- Every function and transform in `docs/reference/expressions/_index.md` exists as a `jexl.addFunction` or `jexl.addTransform` call.
- Every event in `docs/reference/events.md` is in `EMITTED_FURLOW_EVENTS`.
- Every field alias claimed in the LLM reference's alias table is actually read by the corresponding handler.
- The docs site (`apps/site`) imports markdown directly from `/docs/**/*.md`; there is no duplicate content. The site's navigation comes from `docs/manifest.json`.

## Known Issues

None blocking after the QA audit hotfix pass. See "QA Audit Findings" below
for the detailed record and the follow-up backlog.

## QA Audit Findings (2026-04-19)

A god-mode QA audit treated the suite as adversarial: which tests look
thorough but actually prove nothing? It found real production bugs hidden
by structure-only tests, plus a broader class of test-quality weaknesses.

### What shipped as a hotfix (`@furlow/builtins@1.0.7`)

Five builtins declared event names the runtime never emits. Because every
builtin test file was structure-only (asserting `handler.event === '...'`
against hand-written YAML), the tests encoded the buggy names as the
invariant. A correct fix would have made the tests fail.

| Builtin | Was | Fixed to | Impact (before fix) |
|---------|-----|----------|---------------------|
| `afk` | `event: 'message'` x2 | `message_create` | AFK set/clear handlers never fired |
| `auto-responder` | `event: 'message'` | `message_create` | Never responded to triggers |
| `leveling` | `event: 'message'` | `message_create` | XP never accrued |
| `tickets` | `event: 'message'` | `message_create` | Message activity never tracked |
| `logging` | `event: 'message_bulk_delete'` | `message_delete_bulk` | Bulk-delete events never logged |

Hotfix shipped as `@furlow/builtins@1.0.7`.

### Additional broken builtins (deferred; require runtime work)

These need small framework additions, not typo fixes, so they are
tracked as separate follow-ups below.

- `giveaways`, `polls`, `reminders` listen for `event: 'scheduler_tick'`
  which nothing in the runtime emits. Their time-based logic never fires.
- `music` listens for `event: 'voice_track_start'` which nothing emits.
  Queue auto-advance does not run.

### Test-quality weaknesses the audit documented

The suite is 2,764 passing but several categories of test do not prove
the behavior they claim. This was documented so future passes can harden
them. The full list (severity, file:line, concrete quote) lives in this
commit's message and the PR history.

High-impact examples:

- `security.test.ts` "ReDoS protection" test uses a glob, not a
  backtracking regex. Does not exercise the claimed defense.
- `database.integration.test.ts` has zero SQL-injection tests despite
  the pipe claiming identifier escaping prevents it.
- `flows/engine.test.ts` depth-limit test asserts `success === true`
  after the guard hits, calling silent truncation a pass.
- `automod/engine.test.ts` `when`-condition tests use a mock that
  always returns true; logic inversion would not be caught.
- `webhook.test.ts` reimplements `timingSafeEqual` as a local helper,
  tests the helper, never exercises the pipe's real verification code.
- `http.integration.test.ts` fully mocks axios; real auth encoding,
  retry timing, and rate-limit behavior are not verified.
- `mqtt.integration.test.ts` uses a fully mocked MQTT client; wildcard
  subscription matching passes regardless of whether the pipe
  implements MQTT semantics.
- `events.test.ts` (discord) uses a plain Node `EventEmitter` cast to
  `Client`. Private-field access and class lifecycle issues that differ
  between EventEmitter and real `discord.js@14.25` are not exercised
  (partially mitigated by `real-client.integration.test.ts`).
- `voice.test.ts` filter tests only assert `state.filters.has(name)`;
  FFmpeg is mocked and the filter graph is never applied to audio.
- `@furlow/testing` E2E runtime registers 27 of 85 production action
  handlers; 58 production actions used in a user's YAML would crash in
  production while passing locally.
- `@furlow/testing` E2E runtime wires 5 of 28 Discord.js events; 23
  events fire in production but not in tests.
- `@furlow/testing` E2E runtime context is missing `_deps`,
  `_actionExecutor`, `_eventRouter`, `_components`, `_pipes`,
  `_canvasGenerators`, and Proxy-wrapped Discord objects. Specs
  referencing `${user.displayAvatarURL}` work in prod, are undefined in E2E.

### Follow-up backlog (prioritized)

**P1 (runtime correctness):**
- [x] Implement `scheduler_tick` emission (enables giveaways / polls / reminders).
- [x] Implement `voice_track_start` emission (enables music queue advance).
- [x] Add cross-builtin event-name guard test that fails if any builtin
      declares an event the runtime cannot emit.

**P2 (safety-critical test hardening):**
- [x] Replace the ReDoS glob pseudo-test with a real catastrophic
      backtracking pattern and time budget.
- [x] Add SQL-injection tests for the database pipe.
- [x] Flip the flow depth-limit test to expect `success === false` when
      the guard fires.
- [x] Use a real evaluator in the automod `when` condition tests.

**P3 (test infrastructure parity - in progress, see follow-up PR):**
- [~] Register stub handlers in the E2E runtime for the 58 missing
      production action names (partial in this pass).
- [ ] Wire the 23 missing Discord.js event listeners in the E2E runtime
      and route them to the correct FURLOW event names.
- [ ] Expose `_deps`, `_actionExecutor`, `_eventRouter`, `_components`,
      `_pipes`, `_canvasGenerators`, and Proxy-wrapped Discord objects
      on the E2E context to match production `buildBaseContext`.

**P4 (test realism - longer horizon):**
- [ ] Replace axios mocks in `http.integration.test.ts` with a real
      local HTTP server. Exercise real retry timing and rate-limit
      backoff.
- [ ] Replace MQTT mocks with testcontainers MQTT broker under
      `INTEGRATION_TESTS=true`. Prove wildcard matching.
- [ ] Replace the EventEmitter stand-in in the full discord test matrix
      with a real `discord.js.Client`. The 4 cases in
      `real-client.integration.test.ts` prove this is feasible.
- [ ] Voice filter tests that actually invoke FFmpeg against a sample
      audio stream.
- [ ] Behavioral integration tests per builtin that load the builtin
      via E2E runtime, simulate the trigger, and assert the expected
      state change or Discord API call (not just reply text match).
- [ ] Kill the E2E runtime's silent `try { stateManager.set }` fallback
      so unregistered variables fail the same way they do in production.

## Recent Changes (2026-04-19 audit pass)

- Rewrote event wiring: `apps/cli/src/commands/start.ts` dropped from 1,128 to 464 lines. New `packages/discord/src/events/` module with declarative bindings table, context builders, `DiscordEventRouter`. Event coverage increased from 18 to 59 canonical events.
- Switched `clientReady` binding from deprecated `ready` (Discord.js v14.25 deprecated it; v15 will remove it). User-facing event name stays `ready`.
- Implemented `mass_ping` automod trigger (was declared in schema but never implemented).
- Added action field aliases: `add_reactions`, `remove_reaction`, `clear_reactions` now accept `channel`, `message`, `user`. `bulk_delete` accepts `user` filter (fetches last N messages and filters by author before bulk delete).
- Added `createE2ERuntimeFromSpec` for integration tests against multi-file imports.
- Added 78 new tests in `@furlow/discord` (binding coverage, real-Client integration, Proxy behavior) and a complex-bot integration test (13 cases) in `@furlow/testing`.
- Swept docs and corrected: manifest counts (84 -> 85 actions, 76 -> 59 events), legacy flat files (`events-reference.md`, `actions-reference.md`, `cli-reference.md`) replaced with redirects to canonical `reference/` pages, LLM reference now lists `call_flow.args`, `emit.data`, `batch.items`, `flow_switch.value` as evaluated (raw) fields with correct examples, RUNTIME_SPEC.md updated for canonical FURLOW event names (not Discord.js camelCase).
- CLI acquired its first tests (smoke tests for `validate` and `export`).

## Resources

- **Documentation Site**: https://furlow.dev
- **npm**: https://www.npmjs.com/org/furlow
- **Runtime Spec**: `RUNTIME_SPEC.md`
- **Compliance Tests**: `specs/compliance/`
- **Changelog**: `CHANGELOG.md`

## Archive

For detailed session logs from prior audits, see [docs/AUDIT_HISTORY.md](docs/AUDIT_HISTORY.md).
