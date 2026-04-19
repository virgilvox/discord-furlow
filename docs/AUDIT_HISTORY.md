# FURLOW Audit History

This document contains the detailed session-by-session audit logs from the FURLOW development process (2026-02-03 through 2026-02-06). These are preserved for historical reference.

For the current project state, see [HANDOFF.md](../HANDOFF.md).

---

## Expression Syntax Comprehensive Audit (2026-02-03)

**Critical Bug Fixed: Evaluated vs Interpolated Field Syntax**

The documentation incorrectly showed `${}` wrapper syntax for condition fields, but the code actually expects raw JEXL expressions:

```yaml
# WRONG - causes ExpressionSyntaxError at runtime
when: "${!message.author.bot}"

# CORRECT - raw JEXL expression
when: "!message.author.bot"
```

**Root Cause**: `when:`, `condition:`, `if:`, and `while:` fields use `evaluator.evaluate()` which expects raw JEXL. Other fields like `content:`, `title:`, `description:` use `evaluator.interpolate()` which expects `${}` wrapper syntax.

**Field Types**:
| Field Type | Syntax | Examples |
|------------|--------|----------|
| **Evaluated** (raw JEXL) | `"expression"` | `when`, `condition`, `if`, `while`, `loop.while`, `loop.count` |
| **Interpolated** (`${}`) | `"${expression}"` | `content`, `title`, `description`, `reason`, `name` |

**Files Modified (38 total)**: Documentation, runtime error detection, context additions, transform fixes, Discord.js deprecation fixes, and all 13 builtin condition fixes.

**Property Name Standardization**: Context properties now consistently use snake_case (`member.joined_at`, `member.display_name`, etc.)

**Runtime Error Enhancement**: Added helpful error messages when users accidentally use `${}` in condition fields.

---

## Deep Audit #3 (2026-02-03)

**Critical fixes:**
- Compliance specs: CamelCase to snake_case (`selfDeaf`/`selfMute` → `self_deaf`/`self_mute`)
- Schema violation: `db_query` fields corrected (`orderBy` → `order_by`)
- Expression syntax: Removed `${}` from `if:` and `while:` fields across all compliance specs
- Context variable fix: `member.roles|includes()` → `member.role_ids|includes()`

---

## Deep Audit #4 (2026-02-04)

**Context Variable Naming Convention**. Discovered widespread use of Discord.js camelCase naming instead of FURLOW context snake_case naming across documentation, examples, and production code. Fixed 45+ files.

| Discord.js (Wrong) | FURLOW Context (Correct) |
|-------------------|--------------------------|
| `member.displayName` | `member.display_name` |
| `user.displayName` | `user.display_name` |
| `displayAvatarURL` | `avatar` |
| `guild.member_count` | `guild.member_count` |

---

## Deep Audit #5 (2026-02-04)

Final test alignment fix. updated `welcome.test.ts` assertion from `guild.memberCount` to `guild.member_count`. Standardized action count to 85 across 15 files.

---

## Deep Audit #6 (2026-02-04)

**Comprehensive Multi-Agent Audit**. 6 parallel agents examining schema definitions, context variables, builtins, compliance specs, examples, and documentation.

Key fixes:
- `create_thread`: Removed non-existent `channel` field, added correct `type: public | private`
- `show_modal`: Fixed to use correct `modal:` wrapper structure
- `queue_add/remove/clear/shuffle/loop`: Fixed fields to match schema
- Example YAML files: Fixed Discord.js method syntax to FURLOW context properties
- Removed invalid `as: "created_role"` from `create_role`

---

## Deep Audit #7 (2026-02-04)

**Extended Multi-Agent Deep Audit. 47+ Additional Issues Found**

- LLM reference fixes: Removed invalid properties, fixed undefined variables
- Builtin module fixes: `avatarURL` → `avatar` across welcome, leveling, logging
- 30+ example YAML files fixed for context property naming
- Invalid context properties removed: `guild.systemChannelId`, `user.avatarURL`, `guild.iconURL`

---

## Deep Audit #8 (2026-02-04)

**55+ Additional Issues Fixed** across RUNTIME_SPEC.md, README.md, CLI README, builtin modules (logging, utilities, welcome, starboard), documentation, and example YAML files.

Key pattern corrections established:
- Evaluated fields use raw JEXL (no `${}`)
- Interpolated fields use `${}` wrapper
- Context properties use snake_case
- Collections use transforms (not `.cache.has()`)

---

## Security & Stability Audit #9 (2026-02-04)

**Security Fixes:**
- ReDoS vulnerability prevention in regex patterns
- Circular reference crash protection in `json()`
- SQL injection prevention in table/column names

**Memory Leak Fixes:**
- Timeout cleanup after Promise.race in evaluator
- Reconnect timer tracking in TCP and WebSocket pipes

**Race Condition Fixes:**
- Key-level locking for atomic state operations
- Cache expiration off-by-one fix
- Double-close vulnerability prevention
- Request timeout race condition fixes

**Validation Fixes:**
- `repeat.times` type/range validation
- Ready event timeout (30s) to prevent infinite hang

**Schema Fixes:**
- Added `channel_types` to commandOption
- Added `subcommandGroup` definition

---

## Super Deep Security Audit #10 (2026-02-04)

**67+ vulnerabilities discovered, 20 critical/high fixes applied.**

| Component | CRITICAL | HIGH | MEDIUM | LOW | Fixed |
|-----------|----------|------|--------|-----|-------|
| Expression Functions | 4 | 0 | 0 | 0 | 4 |
| Storage (SQLite/PG) | 3 | 4 | 4 | 1 | 5 |
| Storage (Memory) | 0 | 1 | 2 | 1 | 3 |
| Parser | 0 | 1 | 2 | 0 | 1 |
| Events | 0 | 2 | 2 | 1 | 1 |
| Scheduler | 0 | 2 | 2 | 0 | 1 |
| CLI | 5 | 3 | 4 | 0 | 5 |
| **Total** | **12** | **13** | **16** | **3** | **20** |

**Security Patterns Implemented:**
1. Prototype pollution prevention (dangerous key blocklists)
2. ReDoS prevention (length limits and pattern validation)
3. SQL injection prevention (safe primitives only for defaults)
4. Resource exhaustion prevention (caps on range, limit, offset, pattern)
5. Path traversal prevention (symlink detection and boundary verification)
6. Import depth limiting (max 50 levels)

---

## 100% Accuracy Audit (2026-02-04)

Comprehensive audit ensuring all documentation, examples, and YAML files match schema definitions exactly.

**Critical Parameter Corrections Applied (71 files modified):**

| Action Type | Incorrect | Correct |
|-------------|-----------|---------|
| State actions | `name:` | `var:` (or `key:`) |
| Map actions | `key:` for map key | `map_key:` |
| Member actions (12) | `member:` | `user:` |
| `server_mute` | `mute:` | `muted:` |
| `call_flow` | `name:` | `flow:` |
| `flow_while` | `condition:`, `actions:` | `while:`, `do:` |
| `repeat` | `actions:` | `do:` |
| `batch` | `actions:`, `delay:` | `each:`, `concurrency:` |
| `try` | `actions:` | `do:` |
| `create_timer`, `cancel_timer` | `name:` | `id:` |
| `pipe_request` | `url:` | `pipe:` + `path:` |

---

## Critical Implementation Fix Pass (2026-02-04)

Deep audit revealed hidden implementation gaps:
1. **Voice FFmpeg Filters**. Were silently ignored; now uses prism-media FFmpeg for processing
2. **Webhook Signature Verification**. Was always returning true; now fail-closed with proper HMAC verification
3. **PostgreSQL Database Pipe**. Was throwing "unsupported" error; full support added
4. **Memory Database WHERE Clause**. Was returning empty for all queries; supports WHERE/ORDER BY/LIMIT/OFFSET
5. **Error Handler Infrastructure**. New centralized error handling with severity levels and category routing
6. **Silent Failures**. Now properly propagate through error handler system

---

## Test Suite Overhaul (2026-02-04)

**310 new behavioral tests added for previously untested critical paths:**

| Module | Tests Added |
|--------|-------------|
| ActionExecutor | 38 |
| YAML Loader | 38 |
| Context Builder | 44 |
| Component Manager | 44 |
| Embed Builder | 49 |
| Locale Manager | 45 |
| Analytics/Metrics | 52 |

**Also fixed:** FlowEngine exception handling, WebSocket per-instance failure tracking, Discord voice search mocks.

---

## E2E Test Suite Implementation (2026-02-04)

75 end-to-end tests validating the complete runtime pipeline (YAML → Parse → Execute → Verify Discord API calls):

| Test Suite | Tests | Coverage |
|------------|-------|----------|
| Command Execution | 19 | Simple commands, options, context, conditions, state |
| Event Handling | 21 | message_create, member_join/leave, reactions, buttons, selects, modals |
| Flow Control | 18 | flow_if, flow_switch, flow_while, repeat, batch, call_flow, try/catch |
| State Management | 15 | Variables, scopes, increment/decrement, table CRUD |
| Error Handling | 16 | Action errors, expression errors, try/catch, abort propagation |

---

## Dashboard TypeScript Fixes (2026-02-04)

Fixed 10 TypeScript errors in @furlow/dashboard production code: missing DOM types, Vite types, unknown type handling, event handler typing, and useEffect return path.

---

## Discord.js URL Methods Fix (2026-02-05)

Added Proxy wrapper in CLI runtime to auto-call Discord.js URL methods (`displayAvatarURL`, `avatarURL`, `bannerURL`, `iconURL`, `splashURL`, `discoverySplashURL`) when accessed as properties, returning URL strings instead of function references.

---

## Automod Triggers & High-Level Events (2026-02-05)

New automod triggers: `attachment`, `spam`, `duplicate`. New events: `member_ban`/`member_unban`, `member_boost`/`member_unboost`, `voice_stream_start`/`voice_stream_stop`.

---

## LLM Reference Documentation Audit (2026-02-05)

Comprehensive line-by-line audit of `docs/reference/llm-reference.md`:
- Fixed voice_set_filter list, context variables, URL methods, array transforms
- Added field aliases, action shorthand, subcommands, component interaction context
- Added state access patterns, automod triggers, Discord permissions reference
- Fixed function count (69 not 71)

---

## Canvas & Expression Gotchas Documentation (2026-02-06)

Added "Common Pitfalls & Gotchas" section to LLM reference covering 10 documented issues including canvas context passing, method calls in expressions, WebP limitations, batch.items syntax, and state variable scoping.
