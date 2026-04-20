# FURLOW parity and hardening plan

Source audit: 2026-04-20. Delta study against Kite (open-source Go,
visual nodes), YAGPDB (open-source Go, Go-template custom commands,
production-proven at 2M+ servers), Inventor, Discord Bot Engine, BDScript,
and the decorator-first TypeScript crowd (discordx, Discordia).

This is not a wish list. Every item below traces to a concrete pattern
in a shipping competitor, with the evidence cited so future reviewers
can check the claim. Wherever FURLOW already covers the ground, it is
called out.

## House rules (do not violate)

These apply to every change, commit, and PR description generated while
executing this plan:

- Never author or co-author commits as Claude, Assistant, or any AI.
  The sole author is the human developer, using their configured
  `git config user.name` / `user.email`. Do not add
  `Co-Authored-By: Claude`, `Generated with Claude Code`, or any
  similar trailer, footer, or author credit to commits, PR bodies,
  issues, comments, CHANGELOG entries, or documentation.
- No emojis in code, comments, commit messages, PR descriptions, docs,
  YAML examples, or console output. Emojis inside functional bot
  content (e.g., reactions, canvas labels) are fine.
- No em-dashes (U+2014), en-dashes (U+2013), or double-dash `--` used
  as prose punctuation. CLI flags such as `--help` are fine because
  they are code.
- Plain ASCII hyphen-minus `-` only where a hyphen is grammatically
  required.

The CLAUDE.md at repo root is the authoritative version of these rules.
If it conflicts with this file, CLAUDE.md wins.

## Executive summary

FURLOW's core thesis (YAML + Jexl + scoped state + builtin catalog) is
uncontested by peers. Nobody else combines those four. Kite is visual-
only and explicitly admits "complex logic is hard." YAGPDB is Go
templates with all the syntax friction that implies. Inventor and BDScript
are proprietary.

Where FURLOW is genuinely behind is not the language model. It is the
safety rails, triggers, and observability that production frameworks
build around the language. Closing those gaps is what moves FURLOW from
"works on the happy path" to "safe to let untrusted operators write
specs."

## Tier 1: safety and correctness

These gaps are the difference between a framework that works on the
happy path and a framework that does not melt your Discord bot at 3 AM.
Ship these first.

### 1.1 Per-handler execution quotas

**What competitors do.** Kite's `FlowContextLimits` struct
(`kite-service/pkg/flow/context.go`) enforces three independent limits
per handler invocation:

```go
type FlowContextLimits struct {
    MaxStackDepth int
    MaxOperations int
    MaxCredits    int
}
```

`startOperation(creditsCost)` is called before every node execution;
it increments the counter and returns `FlowNodeErrorMaxOperationsReached`
or `FlowNodeErrorMaxCreditsReached` when exceeded. Each node type has
its own `CreditsCost()` so expensive calls (HTTP, AI) count more than
`set_variable`.

YAGPDB enforces a template-level op count at
`common/templates/context.go`:

```go
MaxOpsNormal      = 1000000
MaxOpsPremium     = 2500000
MaxOpsEvalNormal  = 200000
MaxOpsEvalPremium = 500000
MaxSliceLength    = 10000
```

`parsed.MaxOps(MaxOpsNormal)` is wired into the Go template engine so
a runaway `{{range}}` aborts cleanly.

**What FURLOW has.** `@furlow/core` has `MAX_FLOW_DEPTH` for recursion,
so `call_flow` cycles abort. That is the only quota.

**What is missing.** A spec with `repeat: { times: 1000000 }`,
`flow_while: { condition: "true" }`, or `batch: { items: "${huge_list}" }`
runs to completion (or until Node eats the heap). A stuck `pipe_request`
never returns. Nothing caps the number of Discord API calls per
invocation.

**Implementation.**

1. Add a `FlowQuota` object threaded through `ActionContext`. Default
   constants in `packages/core/src/flows/quota.ts`:
   ```ts
   export const DEFAULT_QUOTA = {
     maxStackDepth: 32,       // matches current MAX_FLOW_DEPTH
     maxOperations: 10_000,   // total action executions
     maxCredits: 100_000,     // weighted cost
     wallclockMs: 30_000,     // per event handler invocation
   };
   ```
2. Each registered action handler declares a `cost: number` (default 1).
   Expensive handlers override: `pipe_request` cost 20, `canvas_render`
   cost 50, `voice_play` cost 10, `send_dm` cost 5, Discord API writes
   cost 3.
3. The `ActionExecutor.executeOne` path calls `quota.charge(handler.cost)`
   before dispatching. On exceeded, raise `QuotaExceededError` with the
   metric name and limit. The error propagates as an abort.
4. `EventRouter.executeHandler` wraps `executor.executeSequence` in a
   `Promise.race` with a wallclock timer. On timeout, an `AbortSignal`
   is set on the context so in-flight actions (HTTP pipes, voice calls)
   can cooperate. Timeout is configurable per handler via a new
   `timeout: 30s` field on the event/command definition.
5. Per-user API counters (like YAGPDB's `IncreaseCheckCallCounter`) get
   a minimal form: the context carries `apiCallCounts: Map<string, number>`,
   and handlers that call the Discord API key into it. Defaults:
   `send_dm` 1, `edit_channel` 10, `add_reaction` 20, `api_call` 20
   across all handlers.

**Acceptance.**
- New test: `repeat: { times: 100000, do: [{ action: "set", ... }] }`
  aborts with `QuotaExceededError` before completion.
- New test: handler with a stuck mock action is aborted after 100ms
  when `timeout: 100ms` is set.
- Existing flow/recursion tests still pass; `MAX_FLOW_DEPTH` is
  renamed/aliased to `DEFAULT_QUOTA.maxStackDepth` without changing the
  threshold.
- New error class `QuotaExceededError` with code `E_QUOTA_EXCEEDED`.

**Scope.** 2 core files (`flows/engine.ts`, `actions/executor.ts`) plus
a new `flows/quota.ts`. Zero external deps. Per-handler `cost` numbers
are added to existing handler objects as an optional property with
default 1.

### 1.2 Output and value size caps

**What competitors do.** YAGPDB at `common/templates/context.go:474`:

```go
w := LimitWriter(&buf, 25000)   // 25KB output per command
```

And `customcommands/bot.go:47`:

```go
CCMaxDataLimit = 1000000          // 1 MB max value in storage
```

Plus `MaxSliceLength = 10000` enforced inside cslice/sdict primitives.

**What FURLOW has.** Schema validation in `@furlow/schema` sets some
upper bounds (embed titles, button labels). Storage values are
unbounded.

**What is missing.** A spec that writes a 50MB blob into state on every
message is a disk-fill attack vector, even in self-host.

**Implementation.**

1. Add `MAX_STATE_VALUE_BYTES = 1_000_000` in
   `packages/storage/src/limits.ts`. All storage adapters check
   `Buffer.byteLength(JSON.stringify(value))` before `set()` and throw
   `ValueTooLargeError` on exceed.
2. Add `MAX_ARRAY_LENGTH = 10_000` checked by `list_push`, `set_map`,
   and flow actions that build slices (`batch.items`).
3. Add `MAX_LOG_MESSAGE_BYTES = 25_000` on the `log` action and on
   interpolated `reply` / `send_message` content.

**Acceptance.**
- New test: `set` with a 2MB string throws `ValueTooLargeError`.
- New test: `list_push` on a list already at 10k items throws
  `ArrayTooLongError`.
- Existing tests still pass with defaults.

**Scope.** `@furlow/storage/src/limits.ts` (new) and three call sites
in `@furlow/core`. Low risk.

### 1.3 Trigger concurrency limit

**What competitors do.** YAGPDB caps the number of custom commands that
fire on a single triggering event at 3 (normal) / 5 (premium), enforced
in `customcommands/bot.go`:

```go
CCActionExecLimitNormal  = 3
CCActionExecLimitPremium = 5
```

This is a cheap DoS prevention: one message event cannot fan out to
50 handlers that each do 20 API calls.

**What FURLOW has.** Every matching event handler fires concurrently.
`EventRouter` iterates all registered handlers without a cap.

**What is missing.** A spec with 50 `message_create` handlers on an
active server quickly hits rate limits and burns CPU.

**Implementation.**

1. Add `maxHandlersPerEvent = 10` default in `EventRouter`. The router
   matches handlers as before, then slices to the first N after
   `when`-condition filtering.
2. Warn once (per process) when truncation happens, with the event name
   and handler count.
3. Allow override via `emit.maxHandlers` in the FurlowSpec (advanced
   users who know what they are doing).

**Acceptance.**
- New test: 15 `message_create` handlers, only the first 10 run.
- New warning is emitted on stderr.

**Scope.** `@furlow/core/src/events/router.ts`. Trivial change.

## Tier 2: feature parity

These are genuine capability gaps. Users reach for them in real builds;
their absence shows up as workarounds littered across specs.

### 2.1 Native cron / interval triggers

**What competitors do.** YAGPDB custom commands have four trigger
modes stored per command (`customcommands/schema.go`):

- `CommandTriggerInterval`: every N minutes, with blacklisted days and
  hours. `MinIntervalTriggerDurationMinutes` and
  `MaxIntervalTriggerDurationMinutes` bound the range.
- `CommandTriggerCron`: full cron expression (robfig/cron parser),
  intersected with blacklisted days/hours bitsets.
- Plus the obvious text, reaction, component, role modes.

Each command stores `last_run`, `next_run` (indexed), `run_count`,
`last_error`, `last_error_time`.

**What FURLOW has.** A global `scheduler_tick` event fires every 60s.
Any "run every 5 minutes" behaviour requires a builtin to filter by
`${now() % 300000 < 60000}` or equivalent.

**What is missing.** Declarative `cron:` and `interval:` on event
handlers. Per-handler next-run tracking.

**Implementation.**

1. Extend `EventHandler` schema in `@furlow/schema`:
   ```yaml
   events:
     - cron: "0 */5 * * *"          # every 5 min, standard cron syntax
       actions: [...]
     - interval: "5m"                # shorthand for simple cases
       actions: [...]
   ```
2. Add dependency on `cron-parser` (small, well-maintained, no
   transitive bloat).
3. `CronScheduler.setTickHandler` already exists. Extend it: instead of
   just emitting a global `scheduler_tick`, resolve spec-declared cron
   handlers and emit `cron_fire` events scoped to the handler id.
4. Store `last_run` / `next_run` per cron handler in memory; optionally
   persist to state so restarts do not double-fire.

**Acceptance.**
- New integration test: handler with `cron: "*/1 * * * *"` fires on the
  minute boundary (with clock mocked).
- New test: invalid cron expression reports a spec parse error with
  line info.
- Legacy `scheduler_tick` event continues to fire.

**Scope.** `@furlow/schema` (type), `@furlow/core/src/scheduler`
(resolution), example builtin update (polls, reminders, giveaways can
simplify their cron math).

### 2.2 State entry TTL

**What competitors do.** YAGPDB's `templates_user_database` schema has
an explicit `expires_at TIMESTAMP WITH TIME ZONE` column with an
index on it; a background job prunes expired rows. Commands set TTL
at write time via `dbSetExpiring`.

**What FURLOW has.** State writes accept no TTL. Cleanup is manual
per builtin.

**What is missing.** A first-class TTL that every state scope respects.

**Implementation.**

1. Extend `StateManager.set()` to accept `{ ttl: number }` in options.
2. Storage adapters (SQLite, Postgres, memory) gain a new column
   `expires_at`. Migration ships in `@furlow/storage@next`.
3. Adapters add a cheap sweeper: run `DELETE FROM state WHERE
   expires_at < NOW()` every 5 minutes (configurable).
4. Expose as a new action `set` option and in the `set` Action
   schema:
   ```yaml
   - action: set
     scope: user
     key: cooldown
     value: "${now()}"
     ttl: 30s
   ```

**Acceptance.**
- New test: `set` with `ttl: 1s` disappears from `get` after 1s.
- New test: memory adapter sweeper runs on interval.
- Schema parser accepts duration strings (`"30s"`, `"5m"`, `"1h"`) or
  raw milliseconds.

**Scope.** `@furlow/storage` (adapter changes + migration), `@furlow/core`
(StateManager), `@furlow/schema` (Action schema for `set`).

### 2.3 LIKE / pattern matching in db_query

**What competitors do.** YAGPDB exposes PostgreSQL `LIKE` semantics
directly in template db queries (underscore and percent metacharacters).

**What FURLOW has.** `db_query` `where` takes exact matches only.

**What is missing.** A way to find records matching a pattern without
loading all rows and filtering client-side.

**Implementation.**

1. Extend `where` clause schema to accept `{ op: "like" | "startswith" |
   "endswith" | "contains", value: string }`. Backwards-compatible:
   plain values still mean equality.
2. Storage adapters translate. SQLite and Postgres use `LIKE` with
   sanitized patterns (reject `%` and `_` in the user's value, escape
   them into literals). Memory adapter falls back to `String.prototype`
   methods.
3. Cap pattern length at 256 characters.

**Acceptance.**
- New test: `db_query` with `where: { name: { op: "startswith", value:
  "admin_" } }` returns only prefixed rows.
- New test: injection attempt with literal `%` is escaped properly.

**Scope.** `@furlow/storage` (three adapters + where parser),
`@furlow/schema`.

### 2.4 Declarative cooldowns

**What competitors do.** YAGPDB has per-command cooldown enforcement
via the `multiratelimit` package. Discord Bot Engine exposes cooldown
as a node property. BDScript has `$cooldown`.

**What FURLOW has.** Users roll their own with `set` + `if` + `now()`
math. Every builtin's rate-limiting code is slightly different.

**What is missing.** A `cooldown:` field on commands and events.

**Implementation.**

1. Extend CommandDefinition and EventHandler schema:
   ```yaml
   - name: daily
     cooldown:
       per: user        # or guild | channel | global
       duration: 24h
       message: "You already claimed today."
     actions: [...]
   ```
2. Implement as middleware in `EventRouter.executeHandler`: before
   dispatching, check `state.get(`cooldown:${id}:${scope}:${scopeId}`)`.
   If set and within duration, short-circuit with the message (reply
   for commands, silent for events) and skip actions.
3. On successful completion, write the cooldown key with TTL equal to
   duration (ties into 2.2 TTL work).

**Acceptance.**
- New test: command with `cooldown.per: user, duration: 1s` rejects
  second invocation within the window.
- Works with `per: channel`, `per: guild`, `per: global`.
- `cooldown.message` is interpolated.

**Scope.** Schema, EventRouter, one new helper module. Depends on 2.2.

## Tier 3: observability and DX

These do not block production use but they close the polish gap against
SaaS competitors.

### 3.1 Per-handler observability

**What competitors do.** Kite has a full `LogStore` with typed log
entries, and every command/event is tagged with its ID. YAGPDB tracks
`run_count`, `last_error`, `last_error_time` per custom command. The
dashboard exposes both.

**What FURLOW has.** Prom `/metrics` returns hardcoded zeros. Console
logs are not retained.

**What is missing.** Real run counters, per-handler error visibility.

**Implementation.**

1. Wrap `EventRouter.executeHandler` in a small instrumentation layer
   that records `run_count`, `last_run_at`, `last_error`,
   `last_error_at` per handler ID. Stored in an in-memory ring buffer,
   optionally flushed to state every minute.
2. Replace the hardcoded `/metrics` endpoint with real counters from
   this layer. Use `prom-client` (already a dashboard dep).
3. Dashboard: add a Handlers page listing `{id, last_run, run_count,
   last_error}` per active handler.

**Acceptance.**
- `/metrics` returns a non-zero `furlow_handler_invocations_total`
  counter after a simulated event.
- Dashboard Handlers page renders.
- Stack traces on handler errors include the handler ID and the
  offending action.

**Scope.** `@furlow/core/src/observability` (new module), CLI wiring,
dashboard route.

### 3.2 Resume points for multi-step interactions

**What competitors do.** Kite has a `ResumePoint` abstraction
(`kite-service/pkg/flow/execute.go`): a flow node can call
`ctx.suspend(ResumePointTypeMessageComponents, ...)` to pause until
the user clicks a button, then resume with full state intact.

**What FURLOW has.** `interaction_create` events are the escape hatch
but the flow state is not preserved between send and click.

**What is missing.** A way to say "send this message with these
buttons, then when the user clicks, continue from here with my
variables still in scope."

**Implementation.**

Bigger scope. Design sketch only:

1. `suspend_flow` action: writes the current context's variables to
   state keyed by `resume_id` (from the component custom_id).
2. On `interaction_create`, match `custom_id` against a new
   `component_handlers:` registry in the spec. Load the saved state
   back into the new handler's context, then execute.

Defer this to a later round. It is valuable for multi-step forms but
the workaround (explicit `custom_id` + `interaction_create` handler)
is usable.

### 3.3 MCP server for spec authoring

**What competitors do.** Inventor v2 shipped an MCP server so LLMs can
author bots in their editor.

**What FURLOW has.** YAML is LLM-friendly out of the box; nothing
custom is exposed.

**What is missing.** A thin MCP server that exposes:
- `validate_spec(yaml): errors[]`
- `list_actions(): ActionSchema[]`
- `list_events(): EventName[]`
- `list_builtins(): BuiltinInfo[]`
- `scaffold_bot(name, builtins[]): yaml`

Lets Claude, Cursor, or any MCP-aware client author FURLOW bots without
hallucinating action names.

**Implementation.**

1. New `@furlow/mcp` package.
2. Use the official `@modelcontextprotocol/sdk`.
3. Wrap existing schema-validation + builtin registry.

Out of scope for the first parity pass. Ship tier 1 and 2 first.

## Tier 4: distribution

### 4.1 Plugin marketplace shape

**What competitors do.** Discord Bot Engine has a plugin marketplace.
YAGPDB has public custom command sharing via `public_id` + `public` +
`import_count`.

**What FURLOW has.** `furlow add <builtin>` only works for first-party
builtins shipped in `@furlow/builtins`.

**What is missing.** A pattern for third-party packages to contribute
builtins.

**Implementation.**

1. Document the contract: a third-party package exports a single
   `getXxxSpec(config?): Partial<FurlowSpec>` matching the existing
   builtin shape.
2. Extend `furlow add <name>`: if `<name>` does not match a built-in,
   try `npm install @furlow-community/<name>` and look for the export.
3. Optional: publish a registry at `furlow.dev/plugins` that lists
   published community packages.

Ship after tier 1 and 2. Not a bug, just a community-growth feature.

## Execution order

Recommended sequence. Each milestone is a commit-able chunk.

1. **M1: Quotas.** (1.1) New `FlowQuota`, timeout, per-API counters.
   Breaks nothing. Ships alone.
2. **M2: Size caps.** (1.2) Storage + log + array guards. Low risk.
3. **M3: Trigger concurrency.** (1.3) Tiny diff.
4. **M4: State TTL.** (2.2) Storage migration + adapter changes.
   Touches three storage adapters.
5. **M5: Cooldowns.** (2.4) Builds on M4.
6. **M6: Cron triggers.** (2.1) Adds `cron-parser` dep.
7. **M7: LIKE queries.** (2.3) Small storage change.
8. **M8: Observability.** (3.1) Dashboard + core instrumentation.
9. **M9 and later:** MCP server, resume points, plugin marketplace.

Each milestone:
- Branches off main.
- Ships a commit with message format `feat(core): ...` or
  `fix(storage): ...`, no AI trailers.
- Bumps the affected package patch version and adds a CHANGELOG entry
  under a new date-stamped heading.
- Full build + typecheck + test before push.
- Publish only after user confirms.

## Out of scope

- Rebuilding the visual editor. `apps/site` already has a builder;
  improving it is its own project.
- Live-debugger with breakpoints. Nice to have, months of work.
- Horizontal sharding. Discord.js handles single-process correctly;
  sharding is a v2.0 concern.
- Hosted SaaS mode. FURLOW's identity is self-host; changing that is
  a product decision, not an engineering one.

## Reference evidence

All code paths cited above, for future verification:

- Kite limits: `kite-service/pkg/flow/context.go` (FlowContextLimits,
  startOperation, increase\* methods).
- Kite engine loop: `kite-service/internal/core/engine/engine.go`
  (1s populate ticker, 60s dangling cleanup).
- Kite usage quotas: `kite-service/internal/core/usage/manager.go`
  (credits per month, disableAppsWithNoCredits).
- YAGPDB template ops: `common/templates/context.go` (MaxOpsNormal,
  MaxSliceLength, IncreaseCheckCallCounter).
- YAGPDB API counters: `common/templates/context_funcs.go` (dozens of
  call sites like `c.IncreaseCheckCallCounter("send_dm", 1)`).
- YAGPDB cron: `customcommands/interval.go` (CalcNextRunTime).
- YAGPDB schema: `customcommands/schema.go` (trigger types, public_id,
  templates_user_database with expires_at).
- YAGPDB CC exec limit: `customcommands/bot.go:525`
  (CCActionExecLimitNormal = 3).

## Handoff checklist

When starting a new session with this plan:

1. Read `CLAUDE.md` in the repo root for the full house rules.
2. Read this file in full.
3. Pick a milestone. Do not interleave.
4. Build and test before committing. `pnpm build` then `pnpm test`.
   Respect the `--concurrency=1` root test runner to avoid OOM.
5. Bump the changed package's patch version; add a dated CHANGELOG
   entry.
6. Commit with the human's git author. No AI trailer. No emoji.
7. Push to main only when the user confirms.
8. Publish to npm only when the user confirms.

Historical context: the last three rounds of work are captured in
`HANDOFF.md` and `CHANGELOG.md`. The `memory/MEMORY.md` in the user's
Claude project directory also tracks project state between sessions.
