# FURLOW Development Handoff

## Project Overview

FURLOW (**F**lexible **U**ser **R**ules for **L**ive **O**nline **W**orkers) is a declarative Discord bot framework that allows building bots using YAML specifications. The project is a TypeScript monorepo using pnpm workspaces and Turborepo.

## Current State: v1.0.0 PUBLISHED - FEATURE COMPLETE

As of 2026-02-03, all 9 packages are published to npm with comprehensive test coverage. **All code features are 100% implemented.**

| Package | Version | Status | Tests | Notes |
|---------|---------|--------|-------|-------|
| `@furlow/schema` | 1.0.0 | ✅ Published | - | Type definitions and JSON schemas |
| `@furlow/storage` | 1.0.0 | ✅ Published | 41 | SQLite, PostgreSQL, Memory adapters |
| `@furlow/core` | 1.0.0 | ✅ Published | 283 | Parser, expression, **84 action handlers**, flows, normalization |
| `@furlow/discord` | 1.0.0 | ✅ Published | 53 | Discord.js wrapper, voice, video, interactions |
| `@furlow/pipes` | 1.0.0 | ✅ Published | 234 | HTTP, WebSocket, Webhook, MQTT, TCP, UDP, File, Database |
| `@furlow/testing` | 1.0.0 | ✅ Published | 142 | Mocks, fixtures, E2E tests, bot lifecycle |
| `@furlow/builtins` | 1.0.0 | ✅ Published | - | 14 builtin modules |
| `@furlow/dashboard` | 1.0.0 | ✅ Published | - | Express server + React client + 18 API endpoints |
| `@furlow/cli` | 1.0.0 | ✅ Published | - | Command-line interface (init, start, validate, add, export) |

**Total Tests: 753 (All Passing)**

## Implementation Status: 100% Feature Complete

```
┌─────────────────────────────────────────────────────────┐
│                  FURLOW v1.0.0 STATUS                   │
├─────────────────────────────────────────────────────────┤
│ Core Runtime          ████████████████████████  100%    │
│ Action Handlers       ████████████████████████  100%    │
│ Storage Adapters      ████████████████████████  100%    │
│ External Pipes        ████████████████████████  100%    │
│ Voice System          ████████████████████████  100%    │
│ Canvas System         ████████████████████████  100%    │
│ Video/Streaming       ████████████████████████  100%    │
│ Dashboard API         ████████████████████████  100%    │
│ CLI Commands          ████████████████████████  100%    │
│ Runtime Spec          ████████████████████████  100%    │
│ Compliance Tests      ████████████████████████  100%    │
│ Documentation         ████████░░░░░░░░░░░░░░░░   33%    │
└─────────────────────────────────────────────────────────┘
```

## Complete Feature List

### Action System (84 Actions)

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
| **Integration** | 8 | pipe_request, pipe_send, webhook_send, create_timer, cancel_timer, counter_increment, record_metric, canvas_render |

### Voice System

- **Playback**: Join, leave, play, pause, resume, stop, skip
- **Seeking**: Seek to any position with duration string support (`1m30s`, `90s`)
- **Volume**: 0-200% volume control with inline volume
- **Filters**: 10 audio filters (bassboost, nightcore, vaporwave, 8d, treble, normalizer, karaoke, tremolo, vibrato, reverse)
- **Search**: YouTube search via optional `play-dl` or `youtube-sr`, fallback to ytsearch URLs
- **Queue**: Add, remove, clear, shuffle, loop (off/track/queue)

### Canvas System

- **Welcome Cards**: 4 themes (default, dark, light, minimal)
- **Rank Cards**: 4 themes (default, dark, gradient, minimal)
- **Layer Types**: 6 types (image, circle_image, text, rect, progress_bar, gradient)
- **Features**: Conditional rendering, expression interpolation, customizable colors/fonts

### Video/Stream Detection

- **Stream Events**: Automatic detection of streaming start/stop
- **Notifications**: Channel notifications with optional role mentions
- **Tracking**: Per-guild streaming member tracking

### Dashboard

- **Server**: Express with Discord OAuth, session management, WebSocket
- **Client**: React with real-time bot status updates
- **API Endpoints**: 18 endpoints with full storage integration
  - User: `/api/user`
  - Guilds: `/api/guilds`, `/api/guilds/:id`, `/api/guilds/:id/settings`, `/api/guilds/:id/stats`
  - Moderation: `/api/guilds/:id/warnings`, `/api/guilds/:id/warnings/:caseId`
  - Leveling: `/api/guilds/:id/levels`, `/api/guilds/:id/levels/:userId`
  - Modules: `/api/guilds/:id/welcome`, `/api/guilds/:id/logging`, `/api/guilds/:id/automod`

### CLI Commands

| Command | Description |
|---------|-------------|
| `furlow init [name]` | Scaffold new bot project with templates |
| `furlow start <spec>` | Run bot from YAML specification |
| `furlow validate <spec>` | Validate YAML with colored error output |
| `furlow add <builtin>` | Add builtin module to project |
| `furlow export <spec>` | Export Discord API command JSON |

### Expression System

- **69 Functions**: Date/time, math, string, array, object, type, conversion, Discord, utility
- **48 Transforms**: Pipe-based operators for data transformation
- **Caching**: LRU cache with configurable size and timeout
- **Interpolation**: `${expression}` syntax in strings

### Storage Adapters

| Adapter | Features |
|---------|----------|
| **Memory** | In-memory storage, no persistence |
| **SQLite** | File-based, better-sqlite3 |
| **PostgreSQL** | Full SQL support, connection pooling |

### External Pipes (8 Types)

| Pipe | Protocol | Features |
|------|----------|----------|
| **HTTP** | REST | GET, POST, PUT, PATCH, DELETE, auth, rate limiting, retry |
| **WebSocket** | WS | Bidirectional messaging, auto-reconnect, heartbeat |
| **Webhook** | HTTP | Receive/send webhooks, HMAC verification |
| **MQTT** | MQTT | Pub/sub, QoS levels, wildcards, Last Will |
| **TCP** | TCP | Client/server modes, request-response pattern |
| **UDP** | UDP | Broadcast, multicast, datagram messaging |
| **Database** | SQL | SQLite/PostgreSQL/Memory, CRUD, change events |
| **File** | FS | File watching, glob patterns, hot reload |

### Builtin Modules (14)

| Module | Features |
|--------|----------|
| **moderation** | warn, kick, ban, mute, case management |
| **welcome** | Join/leave messages, auto-role, DM welcome |
| **logging** | Message, member, server event logging |
| **tickets** | Support tickets, claiming, transcripts |
| **reaction-roles** | Role assignment via reactions/buttons |
| **leveling** | XP, levels, rewards, leaderboards |
| **music** | Voice playback, queue, filters |
| **starboard** | Star reactions, hall of fame |
| **polls** | Voting, multiple choice |
| **giveaways** | Requirements, reroll, winners |
| **auto-responder** | Custom triggers, responses |
| **afk** | AFK status, mention notifications |
| **reminders** | Personal reminders, DM delivery |
| **utilities** | Serverinfo, userinfo, avatar, etc. |

## Design Principles

### State Access Pattern

State is accessed in expressions using scoped notation:
```yaml
# Set state with scope
- set:
    name: counter
    value: 10
    scope: global

# Access in expressions uses: state.{scope}.{name}
- log:
    message: "Counter: ${state.global.counter}"
```

**Available scopes:**
- `state.global.X` - Shared across all guilds
- `state.guild.X` - Per-guild state (requires guild context)
- `state.channel.X` - Per-channel state
- `state.user.X` - Per-user state (across guilds)
- `state.member.X` - Per-guild-member state

### Action Shorthand

Users write intuitive YAML shorthand:
```yaml
# User writes:
- reply:
    content: "Hello!"

# System normalizes to schema format:
- action: reply
  content: "Hello!"
```

This normalization happens **before** schema validation, allowing user-friendly syntax while maintaining strict schema compliance.

### Long-Running Commands

For commands that take more than 3 seconds (Discord's timeout), use `defer`:
```yaml
commands:
  - name: slow-command
    actions:
      - defer:
          ephemeral: true
      - call_flow:
          flow: long_running_test
      - reply:  # Uses followUp after defer
          content: "Done!"
```

### Building Blocks

| Block | Purpose |
|-------|---------|
| **Actions** | Atomic operations (84 total) |
| **Flows** | Reusable action sequences |
| **State** | Persistent data across 5 scopes |
| **Events** | Reactive handlers for Discord events |
| **Pipes** | External integrations (HTTP, WS, MQTT, etc.) |

## Architecture

```
furlow/
├── apps/
│   ├── cli/                      # `furlow` CLI tool
│   │   └── src/commands/
│   │       ├── start.ts          # Full runtime with all features
│   │       ├── init.ts           # Project scaffolding
│   │       ├── validate.ts       # YAML validation
│   │       ├── add.ts            # Add builtins
│   │       └── export.ts         # Discord API export
│   └── dashboard/                # Web dashboard
│       ├── server/               # Express + WebSocket
│       │   ├── index.ts          # Server with storage injection
│       │   ├── routes/api.ts     # 18 API endpoints
│       │   └── websocket.ts      # Real-time updates
│       └── src/                  # React client
├── packages/
│   ├── schema/                   # TypeScript types & JSON schemas
│   │   └── src/types/
│   │       ├── spec.ts           # FurlowSpec top-level
│   │       ├── actions.ts        # 84 action types
│   │       ├── events.ts         # Event types
│   │       └── ...
│   ├── storage/                  # Database adapters
│   │   ├── memory/               # In-memory
│   │   ├── sqlite/               # SQLite
│   │   └── postgres/             # PostgreSQL
│   ├── core/
│   │   ├── parser/               # YAML loading, normalization & validation
│   │   │   ├── loader.ts         # loadSpec() with import resolution
│   │   │   ├── normalize.ts      # Shorthand → schema action normalization
│   │   │   ├── env.ts            # Environment variable resolution
│   │   │   └── resolver.ts       # Import path resolution
│   │   ├── expression/           # Jexl evaluator + 69 functions + caching
│   │   ├── actions/
│   │   │   ├── handlers/         # 84 action handlers
│   │   │   ├── registry.ts       # Action registration
│   │   │   └── executor.ts       # Action execution
│   │   ├── events/               # EventRouter with normalization
│   │   ├── flows/                # FlowEngine with recursion protection
│   │   ├── state/                # 5-scope state management
│   │   ├── automod/              # AutomodEngine
│   │   ├── scheduler/            # CronScheduler
│   │   └── canvas/               # Image generation
│   │       ├── index.ts          # CanvasRenderer
│   │       ├── layers.ts         # 6 layer types
│   │       └── generators/       # Welcome & Rank cards
│   ├── discord/                  # Discord.js adapter
│   │   ├── client/               # Client wrapper
│   │   ├── interactions/         # Commands, buttons, modals
│   │   ├── voice/                # VoiceManager (seek, filters, search)
│   │   ├── video/                # VideoManager (stream detection)
│   │   └── gateway/              # Gateway events
│   ├── pipes/                    # External integrations
│   │   ├── http/                 # REST client
│   │   ├── websocket/            # WebSocket client
│   │   ├── webhook/              # Discord webhooks
│   │   ├── mqtt/                 # MQTT pub/sub
│   │   └── tcp/                  # TCP/UDP sockets
│   ├── builtins/                 # 14 pre-built modules
│   └── testing/                  # Test utilities
├── specs/
│   └── compliance/               # Runtime compliance tests
│       ├── minimal.furlow.yaml   # 20 actions
│       ├── standard.furlow.yaml  # 63 actions
│       └── full.furlow.yaml      # 84 actions
├── RUNTIME_SPEC.md               # Language-agnostic runtime spec
└── HANDOFF.md                    # This file
```

## Runtime Specification

The `RUNTIME_SPEC.md` document (2,346 lines) defines the complete FURLOW runtime specification for building alternative implementations:

| Section | Description |
|---------|-------------|
| **Compliance Levels** | Minimal (20), Standard (63), Full (84) action tiers |
| **YAML Format** | Top-level schema, version rules, action normalization |
| **Expression Language** | 69 functions, 48 transforms, interpolation syntax |
| **State Management** | 5 scope levels (global, guild, channel, user, member) |
| **Action System** | Complete reference for all 84 actions with schemas |
| **Event System** | Discord gateway events + FURLOW high-level events |
| **Flow System** | Flow definitions, parameters, control flow semantics |

### Processing Pipeline

FURLOW specs are processed in this order (see `RUNTIME_SPEC.md` Section 2.4):

```
Load YAML → Resolve Imports → Resolve Env Vars → NORMALIZE → Validate Schema → Execute
```

**Critical**: Action normalization (shorthand → schema format) happens **before** schema validation. This allows user-friendly YAML syntax while maintaining strict schema compliance.

### Compliance Test Specs

| File | Actions | Purpose |
|------|---------|---------|
| `minimal.furlow.yaml` | 20 | State + Flow control only |
| `standard.furlow.yaml` | 63 | + Message, Member, Channel, Component, Database, Pipes |
| `full.furlow.yaml` | 84 | + Voice, Canvas, Metrics |

## Development Commands

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm run build

# Run all tests (753 tests)
pnpm run test

# Development mode (watch)
pnpm run dev

# Clean all builds
pnpm run clean

# Publish (after version bump)
pnpm -r publish --access public --no-git-checks
```

## Known Issues

### 1. TypeScript Project References (Non-blocking)
- `composite: true` not set in tsconfig files
- Affects `pnpm typecheck` but NOT builds or tests
- Build and all 753 tests pass successfully

### 2. Optional Dependencies for Voice Search
- Full music search requires optional packages: `play-dl` or `youtube-sr`
- Without them, `voice_search` returns ytsearch URLs for yt-dlp resolution
- This is by design for flexibility and reduced dependencies

### 3. Duplicate Key Warnings in Builtins
- Several builtin modules have duplicate `action` keys in object literals
- Non-blocking, just warnings during development

## Remaining Work

### Documentation (Only Remaining Task)

The codebase is 100% feature complete. The only remaining work is user-facing documentation:

| Document | Purpose | Status |
|----------|---------|--------|
| README.md | Project overview, quick start | ✅ Complete |
| CLI README | @furlow/cli npm package docs | ✅ Complete |
| Pipes Reference | @furlow/pipes documentation | ✅ Complete (~850 lines) |
| Getting Started | Tutorial for new users | ❌ Needs writing |
| YAML Reference | Complete spec syntax | ❌ Needs writing |
| Actions Reference | All 84 actions | ❌ Needs writing |
| Expression Reference | 69 functions, 48 transforms | ❌ Needs writing |
| CLI Reference | All commands | ❌ Needs writing |
| API Reference | Package APIs | ❌ Needs writing |
| Examples | Bot examples | ❌ Needs writing |

#### Recently Completed Documentation

**CLI README** (`apps/cli/README.md`):
- Complete npm package documentation for `@furlow/cli`
- All 7 CLI commands documented with options tables
- Quick start guide and example bot
- Links to main repo and related packages
- Fixed main README to use correct install command (`@furlow/cli`)

**Pipes Reference** (`docs/packages/pipes.md`):
- Complete documentation for all 8 pipe types (HTTP, WebSocket, Webhook, MQTT, TCP, UDP, Database, File)
- Configuration tables, auth types, events, and options for each pipe
- Practical YAML examples for common use cases
- Added to README features list and documentation table
- Added Packages section to sidebar

## Git History

```
f5b13fc fix: add defer to compliance tests and fix state access pattern
69b3cd6 v1.0.0: Fix action normalization, bump all packages
f770958 v0.2.1: Complete documentation and voice features
7dc56bb docs: update HANDOFF.md with v0.2.0 status and remaining work audit
fed98ce feat: implement complete action system with 84 handlers
39f1388 feat: implement remaining features and polish for npm publish
ba44633 3
194b67a 2
f67756a 2
b621745 initial
```

## Recent Fixes (v1.0.0)

### State Scoping Fix
State handlers now properly store values in scoped structure for expression access:
- Before: `context.state[key]` (flat) - expressions like `${state.global.X}` failed
- After: `context.state[scope][key]` (scoped) - expressions work correctly

### Normalization Before Validation
Action shorthand is normalized BEFORE schema validation:
- Allows user-friendly YAML syntax like `{ reply: { content: "Hi" } }`
- Converts to schema format `{ action: "reply", content: "Hi" }`
- Fixed batch action normalization (`each` field, not `template`)

### Compliance Spec Fixes
- Added `defer` action to standard and full compliance specs
- Long-running tests now properly defer before executing

## Resources

- **npm**: https://www.npmjs.com/org/furlow
- **Runtime Spec**: `RUNTIME_SPEC.md`
- **Compliance Tests**: `specs/compliance/`
- **Changelog**: `CHANGELOG.md`
