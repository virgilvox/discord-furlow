# FURLOW Runtime Specification

**Version:** 1.0.0
**Status:** Draft
**Last Updated:** 2026-02-03

This document defines the requirements for a compliant FURLOW runtime implementation. It is **language-agnostic** and uses pseudocode/interface definitions to enable implementations in any language (TypeScript, Rust, Go, Python, etc.).

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [YAML Specification Format](#2-yaml-specification-format)
   - 2.1 File Extension
   - 2.2 Top-Level Schema
   - 2.3 Spec Version
   - 2.4 Processing Pipeline *(load → normalize → validate)*
   - 2.5 Action Normalization
   - 2.6 Import Resolution
3. [Expression Language](#3-expression-language)
4. [State Management](#4-state-management)
5. [Action System](#5-action-system)
6. [Event System](#6-event-system)
7. [Flow System](#7-flow-system)
8. [Compliance Levels](#8-compliance-levels)
9. [Appendix A: Complete Action Reference](#appendix-a-complete-action-reference)
10. [Appendix B: Complete Function Reference](#appendix-b-complete-function-reference)
11. [Appendix C: Complete Transform Reference](#appendix-c-complete-transform-reference)

---

## 1. Introduction

### 1.1 What is FURLOW?

FURLOW (**F**lexible **U**ser **R**ules for **L**ive **O**nline **W**orkers) is a declarative Discord bot framework. Bot behavior is defined in YAML specifications, not code. The runtime interprets these specifications to create fully functional Discord bots.

### 1.2 What is a FURLOW Runtime?

A FURLOW runtime is any software that:
1. Parses FURLOW YAML specifications
2. Connects to Discord's gateway
3. Executes actions in response to events
4. Manages state according to scope rules
5. Evaluates expressions using the Jexl-based expression language

### 1.3 Compliance Levels

FURLOW defines three compliance levels to accommodate different use cases:

| Level | Actions | Use Case |
|-------|---------|----------|
| **Minimal** | 20 | Testing, embedding, simple automation |
| **Standard** | 64 | Most production bots (no voice/canvas) |
| **Full** | 85 | Feature-complete implementation |

A runtime MUST declare which compliance level it implements.

### 1.4 Terminology

- **MUST** / **REQUIRED**: Absolute requirement
- **SHOULD** / **RECOMMENDED**: Best practice, may be omitted with reason
- **MAY** / **OPTIONAL**: Truly optional feature

---

## 2. YAML Specification Format

### 2.1 File Extension

FURLOW specifications use the following extensions:
- `.furlow.yaml` (preferred)
- `.furlow.yml`
- `.bolt.yaml` / `.bolt.yml` (legacy, for migration)

### 2.2 Top-Level Schema

```yaml
# FurlowSpec - Top-level specification structure
version: "1"                    # REQUIRED: Spec version
name: "my-bot"                  # REQUIRED: Bot identifier
description: "A cool bot"       # OPTIONAL: Human description

# OPTIONAL: Global configuration
config:
  prefix: "!"                   # Command prefix
  defaultCooldown: "5s"         # Default cooldown for commands

# OPTIONAL: State variable definitions
state:
  variables:
    counter:
      scope: guild
      type: number
      default: 0
      persist: true

  # OPTIONAL: Database table definitions
  tables:
    warnings:
      columns:
        userId: string
        reason: string
        timestamp: number

# OPTIONAL: Reusable flows
flows:
  - name: greet_user
    parameters:
      - name: user
        type: object
        required: true
    actions:
      - reply:
          content: "Hello, ${user.username}!"

# OPTIONAL: Slash commands
commands:
  - name: ping
    description: "Check bot latency"
    actions:
      - reply:
          content: "Pong! Latency: ${client.ws.ping}ms"

# OPTIONAL: Event handlers
events:
  - event: guild_member_add
    actions:
      - send_message:
          channel: "${env.WELCOME_CHANNEL}"
          content: "Welcome, ${member.display_name}!"

# OPTIONAL: Button handlers
buttons:
  - customId: "confirm_*"       # Supports wildcards
    actions:
      - reply:
          content: "Confirmed!"

# OPTIONAL: Component handlers live under `components:` keyed by custom_id.
components:
  selects:
    role_select:
      actions:
        - assign_role:
            user: "${user.id}"
            role: "${values[0]}"

  modals:
    feedback_modal:
      actions:
        - send_message:
            channel: "${config.feedbackChannel}"
            content: "${fields.feedback}"

# OPTIONAL: Scheduled tasks
cron:
  - schedule: "0 0 * * *"       # Daily at midnight
    actions:
      - log:
          message: "Daily task running"

# OPTIONAL: Auto-moderation rules
automod:
  - name: no_spam
    triggers:
      - type: message
        conditions:
          maxMessages: 5
          timeWindow: "10s"
    actions:
      - timeout:
          user: "${user.id}"
          duration: "5m"
          reason: "Spam detected"

# OPTIONAL: External pipe definitions (flat map, not array)
pipes:
  api:
    type: http
    base_url: "https://api.example.com"
    headers:
      Authorization: "Bearer ${env.API_TOKEN}"

# OPTIONAL: Import other specs
imports:
  - path: "./moderation.furlow.yaml"
  - path: "./welcome.furlow.yaml"
```

### 2.3 Version Compatibility

| Spec Version | Runtime Requirement |
|--------------|---------------------|
| `"1"` | Any v1.x runtime |

Runtimes MUST reject specs with incompatible versions and provide a clear error message.

### 2.4 Processing Pipeline

Runtimes MUST process FURLOW specifications in the following order:

```
┌─────────────────────────────────────────────────────────────┐
│                   FURLOW Processing Pipeline                 │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. LOAD         Parse YAML file(s)                         │
│       ↓                                                      │
│  2. RESOLVE      Process imports, merge specs               │
│       ↓                                                      │
│  3. ENV          Resolve environment variables              │
│       ↓                                                      │
│  4. NORMALIZE    Convert shorthand → schema format  ←────┐  │
│       ↓                                              │  │
│  5. VALIDATE     Check against JSON schema           │  │
│       ↓                                              │  │
│  6. EXECUTE      Run at runtime                      │  │
│                                                      │  │
│  Note: Normalization MUST happen BEFORE validation ──┘  │
│        This allows shorthand syntax in YAML files.      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Critical**: Normalization (step 4) MUST occur BEFORE validation (step 5). This ensures that user-friendly shorthand syntax in YAML files passes schema validation.

### 2.5 Action Normalization

FURLOW supports two action formats. Runtimes MUST normalize shorthand to schema format **before schema validation**.

**Shorthand format** (YAML-friendly):
```yaml
- reply:
    content: "Hello!"
    ephemeral: true
```

**Schema format** (normalized):
```yaml
- action: reply
  content: "Hello!"
  ephemeral: true
```

**Normalization algorithm:**
```
function normalizeAction(action):
    if action has "action" key:
        return normalizeNestedActions(action)  # Already normalized, check nested

    for key in action.keys():
        if key not in ["when", "error_handler"]:
            config = action[key] if isObject(action[key]) else {}
            normalized = { action: key, ...config }
            if action.when: normalized.when = action.when
            if action.error_handler: normalized.error_handler = action.error_handler
            return normalizeNestedActions(normalized)

    return action  # No action key found, will fail validation
```

**Nested action normalization:**
Control flow actions (`flow_if`, `flow_switch`, `flow_while`, `repeat`, `parallel`, `batch`, `try`) contain nested action arrays. Runtimes MUST recursively normalize these:
- `then`, `else` (flow_if)
- `cases`, `default` (flow_switch)
- `do` (flow_while, repeat, try)
- `actions` (parallel)
- `each` (batch)
- `catch`, `finally` (try)

**Idempotency requirement:**
Normalization MUST be idempotent. Calling normalize on already-normalized actions MUST produce identical output. This allows safe double-normalization without side effects.

**Locations requiring normalization:**
- `commands[].actions` and `commands[].subcommands[].actions`
- `context_menus[].actions`
- `events[].actions`
- `flows[].actions`
- `scheduler.jobs[].actions`
- `automod.rules[].actions` and `automod.rules[].escalation.actions`
- `components.buttons[].actions`
- `components.selects[].actions`
- `components.modals[].actions`

### 2.6 Import Resolution

When processing `imports`:
1. Resolve path relative to current spec file
2. Detect and reject circular imports
3. Parse imported YAML (do NOT validate yet)
4. Merge definitions (later imports override earlier)
5. After all imports merged, normalize the complete spec
6. Validate the normalized spec against schema

---

## 3. Expression Language

FURLOW uses a Jexl-based expression language for dynamic values. All string values support expression interpolation using `${expression}` syntax.

### 3.1 Syntax

The expression language supports:

**Literals:**
```
42                    # Integer
3.14                  # Float
"hello"               # String
true / false          # Boolean
null                  # Null
[1, 2, 3]             # Array
{ key: "value" }      # Object
```

**Operators:**
```
# Arithmetic
a + b    a - b    a * b    a / b    a % b

# Comparison
a == b   a != b   a < b    a > b    a <= b   a >= b

# Logical
a && b   a || b   !a

# Ternary
condition ? trueValue : falseValue

# Property access
object.property
object["property"]
array[0]

# Pipe (transforms)
value | transform
value | transform(arg1, arg2)
```

**String interpolation:**
```yaml
content: "Hello, ${user.username}! You have ${count} messages."
```

### 3.2 Expression Context

During action execution, expressions have access to:

| Variable | Description |
|----------|-------------|
| `event` | Current event data |
| `args` | Command arguments / flow parameters |
| `state` | State manager accessor |
| `client` | Discord client reference |
| `guild` | Current guild (if applicable) |
| `channel` | Current channel (if applicable) |
| `user` | Current user (if applicable) |
| `member` | Current member (if applicable) |
| `env` | Environment variables |
| `config` | Spec configuration |
| `result` | Result of previous action |

### 3.3 Required Functions (69)

Runtimes MUST implement all functions for their compliance level. All runtimes MUST implement at least the Minimal level functions.

#### 3.3.1 Date/Time Functions (8)

| Function | Signature | Description |
|----------|-----------|-------------|
| `now` | `now() → Date` | Current date/time |
| `timestamp` | `timestamp(date?, format?) → number\|string` | Unix timestamp, optionally formatted as Discord timestamp |
| `date` | `date(value) → Date` | Parse string/number to Date |
| `dateAdd` | `dateAdd(date, amount, unit) → Date` | Add time to date (units: s/m/h/d/w/M/y) |
| `addDuration` | `addDuration(date, duration) → Date` | Add duration string (e.g., "1d 2h 30m") |
| `formatNumber` | `formatNumber(n, locale?) → string` | Format number for locale |
| `ordinal` | `ordinal(n) → string` | Convert to ordinal (1st, 2nd, 3rd) |
| `duration` | `duration(ms) → string` | Format milliseconds as duration |

#### 3.3.2 Math Functions (9)

| Function | Signature | Description |
|----------|-----------|-------------|
| `random` | `random(min, max) → number` | Random integer in range [min, max] |
| `randomFloat` | `randomFloat(min, max) → number` | Random float in range [min, max) |
| `round` | `round(n, decimals?) → number` | Round to decimal places |
| `floor` | `floor(n) → number` | Floor |
| `ceil` | `ceil(n) → number` | Ceiling |
| `abs` | `abs(n) → number` | Absolute value |
| `min` | `min(...nums) → number` | Minimum value |
| `max` | `max(...nums) → number` | Maximum value |
| `clamp` | `clamp(value, min, max) → number` | Clamp between min/max |

#### 3.3.3 String Functions (13)

| Function | Signature | Description |
|----------|-----------|-------------|
| `lower` | `lower(s) → string` | Lowercase |
| `upper` | `upper(s) → string` | Uppercase |
| `capitalize` | `capitalize(s) → string` | Capitalize first letter |
| `titleCase` | `titleCase(s) → string` | Title case all words |
| `trim` | `trim(s) → string` | Trim whitespace |
| `truncate` | `truncate(s, len, suffix?) → string` | Truncate with suffix (default "...") |
| `padStart` | `padStart(s, len, char?) → string` | Pad from start |
| `padEnd` | `padEnd(s, len, char?) → string` | Pad from end |
| `replace` | `replace(s, search, replace) → string` | Replace (supports regex) |
| `split` | `split(s, delimiter) → array` | Split string |
| `includes` | `includes(s, search) → boolean` | Check if contains |
| `startsWith` | `startsWith(s, search) → boolean` | Check if starts with |
| `endsWith` | `endsWith(s, search) → boolean` | Check if ends with |
| `match` | `match(s, pattern) → boolean` | Test regex match |

#### 3.3.4 Array Functions (14)

| Function | Signature | Description |
|----------|-----------|-------------|
| `length` | `length(arr) → number` | Get array/string length |
| `first` | `first(arr) → any` | Get first element |
| `last` | `last(arr) → any` | Get last element |
| `nth` | `nth(arr, n) → any` | Get nth element (0-indexed) |
| `slice` | `slice(arr, start, end?) → array` | Slice array |
| `reverse` | `reverse(arr) → array` | Reverse array |
| `sort` | `sort(arr, key?) → array` | Sort array (optionally by key) |
| `unique` | `unique(arr) → array` | Get unique elements |
| `flatten` | `flatten(arr) → array` | Flatten one level |
| `pick` | `pick(arr) → any` | Pick random element |
| `shuffle` | `shuffle(arr) → array` | Shuffle array |
| `range` | `range(start, end, step?) → array` | Create range array |
| `chunk` | `chunk(arr, size) → array` | Split into chunks |
| `join` | `join(arr, delimiter?) → string` | Join array with delimiter |

#### 3.3.5 Object Functions (6)

| Function | Signature | Description |
|----------|-----------|-------------|
| `keys` | `keys(obj) → array` | Get object keys |
| `values` | `values(obj) → array` | Get object values |
| `entries` | `entries(obj) → array` | Get key-value pairs |
| `get` | `get(obj, path, default?) → any` | Get nested property by path |
| `has` | `has(obj, key) → boolean` | Check if has key |
| `merge` | `merge(...objs) → object` | Merge objects (shallow) |

#### 3.3.6 Type Functions (7)

| Function | Signature | Description |
|----------|-----------|-------------|
| `type` | `type(value) → string` | Get type name |
| `isNull` | `isNull(value) → boolean` | Check if null/undefined |
| `isArray` | `isArray(value) → boolean` | Check if array |
| `isString` | `isString(value) → boolean` | Check if string |
| `isNumber` | `isNumber(value) → boolean` | Check if number |
| `isBoolean` | `isBoolean(value) → boolean` | Check if boolean |
| `isObject` | `isObject(value) → boolean` | Check if plain object |

#### 3.3.7 Conversion Functions (7)

| Function | Signature | Description |
|----------|-----------|-------------|
| `string` | `string(value) → string` | Convert to string |
| `number` | `number(value) → number` | Convert to number |
| `int` | `int(value) → number` | Convert to integer |
| `float` | `float(value) → number` | Convert to float |
| `boolean` | `boolean(value) → boolean` | Convert to boolean |
| `json` | `json(value) → string` | Stringify to JSON |
| `parseJson` | `parseJson(s) → any` | Parse JSON string |

#### 3.3.8 Discord Functions (4)

| Function | Signature | Description |
|----------|-----------|-------------|
| `mention` | `mention(type, id) → string` | Create mention (user/role/channel/emoji) |
| `pluralize` | `pluralize(count, singular, plural?) → string` | Pluralize text |
| `hash` | `hash(s) → string` | Hash string to hex |
| `snowflakeToDate` | `snowflakeToDate(id) → Date` | Extract timestamp from Discord snowflake |

#### 3.3.9 Utility Functions (4)

| Function | Signature | Description |
|----------|-----------|-------------|
| `default` | `default(value, defaultValue) → any` | Return default if falsy |
| `coalesce` | `coalesce(...values) → any` | Return first non-null value |
| `uuid` | `uuid() → string` | Generate UUID v4 |
| `env` | `env(key) → string` | Get environment variable |

### 3.4 Required Transforms (48)

Transforms are applied using pipe syntax: `value | transform(args)`.

#### String Transforms
`lower`, `upper`, `capitalize`, `titleCase`, `trim`, `truncate`, `split`, `replace`, `padStart`, `padEnd`, `includes`, `startsWith`, `endsWith`, `contains`

#### Array Transforms
`join`, `first`, `last`, `nth`, `slice`, `reverse`, `sort`, `unique`, `flatten`, `filter`, `map`, `pluck`, `pick`, `shuffle`, `length`, `size`

#### Number Transforms
`round`, `floor`, `ceil`, `abs`, `format`, `ordinal`

#### Object Transforms
`keys`, `values`, `entries`, `get`

#### Type Transforms
`string`, `number`, `int`, `float`, `boolean`, `json`, `parseJson`

#### Utility Transforms
`default`, `timestamp`, `duration`, `mention`, `pluralize`

### 3.5 Expression Caching

Runtimes SHOULD implement expression caching:
- Cache compiled expressions using LRU strategy
- Default cache size: 1000 expressions
- Cache key: expression string
- Invalidate on context changes that affect compilation

### 3.6 Expression Timeouts

Runtimes MUST implement expression evaluation timeouts:
- Default timeout: 5000ms
- Configurable per-spec
- Abort expression and return error on timeout

### 3.7 Error Handling

Expression errors MUST be caught and reported with:
- Original expression string
- Error message
- Position in expression (if available)
- Surrounding context (action/event name)

---

## 4. State Management

### 4.1 Scope Levels

FURLOW defines 5 scope levels for state variables:

| Scope | Context Required | Key Format | Example |
|-------|------------------|------------|---------|
| `global` | None | `global:{name}` | App-wide settings |
| `guild` | `guildId` | `guild:{name}:{guildId}` | Per-server config |
| `channel` | `channelId` | `channel:{name}:{channelId}` | Per-channel settings |
| `user` | `userId` | `user:{name}:{userId}` | User preferences |
| `member` | `guildId` + `userId` | `member:{name}:{guildId}:{userId}` | Per-member data |

### 4.2 State Definition

```yaml
state:
  variables:
    counter:                  # Variable name as key
      scope: guild            # REQUIRED: Scope level
      type: number            # OPTIONAL: string|number|boolean|array|object
      default: 0              # OPTIONAL: Default value
      persist: true           # OPTIONAL: Persist to storage (default: true)
      ttl: "1h"               # OPTIONAL: Time-to-live

  tables:
    warnings:                 # Table name as key
      columns:
        id:
          type: number
          primary: true
        userId:
          type: string
          index: true
        reason:
          type: string
        timestamp:
          type: timestamp

  storage:                    # OPTIONAL: Storage backend
    type: sqlite              # sqlite|postgres|memory
    path: ./data/bot.db       # For sqlite

  cache:                      # OPTIONAL: Cache settings
    enabled: true
    max_size: 10000
    ttl: "5m"
```

### 4.3 State Operations

#### 4.3.1 Variable Operations

```
interface StateManager:
    # Get variable value
    get(name: string, context: ScopeContext) → any

    # Set variable value
    set(name: string, value: any, context: ScopeContext) → void

    # Delete variable
    delete(name: string, context: ScopeContext) → void

    # Increment numeric variable
    increment(name: string, by: number, context: ScopeContext) → number

    # Decrement numeric variable
    decrement(name: string, by: number, context: ScopeContext) → number

interface ScopeContext:
    guildId?: string
    channelId?: string
    userId?: string
```

#### 4.3.2 List Operations

```
# Push item to list
listPush(name: string, value: any, context: ScopeContext) → void

# Remove item from list
listRemove(name: string, value: any, context: ScopeContext) → void
```

#### 4.3.3 Map Operations

```
# Set map key
setMap(name: string, key: string, value: any, context: ScopeContext) → void

# Delete map key
deleteMap(name: string, key: string, context: ScopeContext) → void
```

### 4.4 Table Operations

For database tables defined in the spec:

```
interface TableManager:
    # Insert row
    insert(table: string, data: object) → object

    # Update rows
    update(table: string, where: object, data: object, upsert?: boolean) → number

    # Delete rows
    delete(table: string, where: object) → number

    # Query rows
    query(table: string, options: QueryOptions) → array

interface QueryOptions:
    where?: object          # Filter conditions
    orderBy?: string        # Sort field
    order?: "asc" | "desc"  # Sort direction
    limit?: number          # Max rows
    offset?: number         # Skip rows
```

### 4.5 Cache Operations

Runtimes MUST implement a cache layer for temporary data:

```
interface CacheManager:
    # Get cached value
    get(key: string) → any

    # Set cached value with TTL
    set(key: string, value: any, ttl?: number) → void

    # Delete cached value
    delete(key: string) → void

    # Clear all cache
    clear() → void
```

### 4.6 Storage Adapter Interface

Runtimes MUST support pluggable storage backends:

```
interface StorageAdapter:
    # Connect to storage
    connect() → Promise<void>

    # Disconnect from storage
    disconnect() → Promise<void>

    # Get value by key
    get(key: string) → Promise<any>

    # Set value with optional TTL
    set(key: string, value: any, ttl?: number) → Promise<void>

    # Delete value
    delete(key: string) → Promise<void>

    # Check if key exists
    has(key: string) → Promise<boolean>

    # List keys matching pattern
    keys(pattern: string) → Promise<string[]>

    # Execute table query
    query(sql: string, params: any[]) → Promise<any[]>

    # Execute table mutation
    execute(sql: string, params: any[]) → Promise<number>
```

Standard adapters:
- **Memory**: In-process storage (non-persistent)
- **SQLite**: File-based SQL database
- **PostgreSQL**: Production SQL database

---

## 5. Action System

### 5.1 Action Handler Interface

```
interface ActionHandler:
    # Action identifier (e.g., "reply", "send_message")
    name: string

    # JSON Schema for configuration validation
    schema: JSONSchema

    # Execute the action
    execute(config: object, context: ActionContext) → Promise<ActionResult>

interface ActionContext:
    # Discord client
    client: DiscordClient

    # Expression evaluator
    evaluator: ExpressionEvaluator

    # State manager
    stateManager: StateManager

    # Flow engine (for call_flow)
    flowEngine: FlowEngine

    # Current event data
    event: object

    # Current guild (if applicable)
    guild?: Guild

    # Current channel (if applicable)
    channel?: Channel

    # Current user (if applicable)
    user?: User

    # Current member (if applicable)
    member?: Member

    # Evaluate expression string
    evaluate(expr: string) → Promise<any>

    # Interpolate string with expressions
    interpolate(str: string) → Promise<string>

interface ActionResult:
    success: boolean
    data?: any              # Result data (e.g., sent message)
    error?: string          # Error message if failed
```

### 5.2 Action Execution Flow

```
function executeAction(action, context):
    # 1. Normalize action format
    action = normalizeAction(action)

    # 2. Evaluate "when" condition if present
    if action.when:
        condition = await context.evaluate(action.when)
        if not condition:
            return { success: true, skipped: true }

    # 3. Get handler
    handler = registry.get(action.action)
    if not handler:
        throw UnknownActionError(action.action)

    # 4. Validate config against schema
    validate(action, handler.schema)

    # 5. Execute with error handling
    try:
        result = await handler.execute(action, context)

        # 6. Store result if "as" specified
        if action.as:
            context.setResult(action.as, result.data)

        return result
    catch error:
        # 7. Call error handler if specified
        if action.error_handler:
            await context.flowEngine.call(action.error_handler, { error })
        throw error
```

### 5.3 Action Categories

FURLOW defines 85 actions in 9 categories:

| Category | Count | Description |
|----------|-------|-------------|
| Message | 11 | Send, edit, delete messages and reactions |
| Member | 14 | Role management, moderation, DMs |
| Channel | 9 | Channel and role management |
| State | 7 | Variable manipulation |
| Flow | 13 | Control flow and utility |
| Database | 4 | Table CRUD operations |
| Voice | 17 | Audio playback and queue |
| Component | 1 | Modal dialogs |
| Misc | 9 | Pipes, webhooks, timers, metrics, canvas |

See [Appendix A](#appendix-a-complete-action-reference) for complete action reference.

### 5.4 Common Action Properties

All actions support these properties:

| Property | Type | Description |
|----------|------|-------------|
| `action` | string | Action name (required) |
| `when` | string | Condition expression (skip if false) |
| `as` | string | Store result in named variable |
| `error_handler` | string | Flow to call on error |

---

## 6. Event System

### 6.1 Event Types

FURLOW emits canonical snake_case event names. User YAML binds to these
names, not to Discord.js's camelCase event names. A runtime implementation
MUST emit the events listed below. The complete, authoritative list lives in
`@furlow/discord/events` (`EMITTED_FURLOW_EVENTS`) and is documented for
end users in `docs/reference/events.md`.

#### Bot Lifecycle (4)

`ready`, `shard_ready`, `shard_disconnect`, `shard_error`

#### Guild (3)

`guild_create`, `guild_delete`, `guild_update`

#### Members (7)

`member_join`, `member_leave`, `member_update`, `member_boost`,
`member_unboost`, `member_ban`, `member_unban`

`member_boost` / `member_unboost` are derived from `guildMemberUpdate` by
comparing `premiumSince` on old vs new member.

#### Messages (4)

`message_create`, `message_update`, `message_delete`, `message_delete_bulk`

`message_create` skips bot authors.

#### Reactions (3 plus 2 legacy aliases)

`message_reaction_add`, `message_reaction_remove`,
`message_reaction_remove_all`

Legacy aliases still emitted for backward compatibility: `reaction_add`,
`reaction_remove`.

#### Channels (4)

`channel_create`, `channel_delete`, `channel_update`, `channel_pins_update`

#### Threads (4)

`thread_create`, `thread_delete`, `thread_update`, `thread_member_update`

#### Roles (3)

`role_create`, `role_delete`, `role_update`

#### Emojis (3)

`emoji_create`, `emoji_delete`, `emoji_update`

#### Stickers (3)

`sticker_create`, `sticker_delete`, `sticker_update`

#### Invites (2)

`invite_create`, `invite_delete`

#### Voice (6)

`voice_state_update`, `voice_join`, `voice_leave`, `voice_move`,
`voice_stream_start`, `voice_stream_stop`

`voice_join` / `voice_leave` / `voice_move` / `voice_stream_*` are derived
from `voiceStateUpdate` by comparing old vs new state.

#### Presence and Typing (2)

`presence_update`, `typing_start`

#### Scheduled Events (5)

`scheduled_event_create`, `scheduled_event_delete`,
`scheduled_event_update`, `scheduled_event_user_add`,
`scheduled_event_user_remove`

#### Stage Instances (3)

`stage_instance_create`, `stage_instance_delete`, `stage_instance_update`

#### Component Interactions (3)

`button_click`, `select_menu`, `modal_submit`

Autocomplete interactions are handled by the command dispatcher, not the
event router, and are bound via `autocomplete` options on command
parameters (source: `static`, `query`, or `expression`).

#### Total

59 canonical FURLOW event names (plus 2 legacy reaction aliases). Emitted
from 28 underlying Discord.js `ClientEvents` bindings. See
`docs/reference/events.md` for per-event context field inventory.

### 6.2 Event Handler Definition

```yaml
events:
  - event: message_create         # REQUIRED: Canonical FURLOW event name (snake_case)
    when: "!message.author.bot"   # OPTIONAL: Raw JEXL expression (no ${})
    debounce: "500ms"             # OPTIONAL: Debounce delay
    throttle: "1s"                # OPTIONAL: Rate limit
    once: false                   # OPTIONAL: Execute once only
    actions:                      # REQUIRED: Actions to execute
      - log:
          message: "New message from ${message.author.username}"
```

### 6.3 Handler Registration

```
interface EventRouter:
    # Register event handler
    register(event: string, handler: EventHandler) → string  # Returns handler ID

    # Unregister handler
    unregister(handlerId: string) → void

    # Dispatch event to handlers
    dispatch(event: string, data: object) → Promise<void>

interface EventHandler:
    id: string
    event: string
    when?: string               # Condition expression
    debounce?: number           # Debounce ms
    throttle?: number           # Throttle ms
    once?: boolean              # Execute once
    actions: Action[]
```

### 6.4 Timing Controls

**Debounce:** Delay handler execution. If event fires again within delay, reset timer.
```
Handler fires only after N ms of no events
```

**Throttle:** Rate limit handler execution. Execute at most once per interval.
```
Handler fires at most once per N ms
```

**Duration parsing:**
```
"500ms" → 500
"5s"    → 5000
"1m"    → 60000
"1h"    → 3600000
"1d"    → 86400000
"1d 2h 30m" → 95400000
```

### 6.5 Once-Only Handlers

Handlers with `once: true`:
1. Execute on first matching event
2. Automatically unregister after execution
3. Useful for one-time setup or confirmation flows

### 6.6 Condition Evaluation

The `when` condition:
1. Is evaluated before handler execution
2. Has access to `event` context
3. MUST return truthy value to proceed
4. Falsy result skips handler silently

---

## 7. Flow System

### 7.1 Flow Definition

```yaml
flows:
  - name: greet_user              # REQUIRED: Unique name
    description: "Greet a user"   # OPTIONAL: Documentation
    parameters:                   # OPTIONAL: Parameters
      - name: user
        type: object
        required: true
      - name: greeting
        type: string
        default: "Hello"
    returns: string               # OPTIONAL: Return type hint
    actions:                      # REQUIRED: Actions
      - reply:
          content: "${args.greeting}, ${args.user.username}!"
      - return:
          value: "Greeted ${args.user.username}"
```

### 7.2 Parameter Types

| Type | Description |
|------|-------------|
| `string` | Text value |
| `number` | Numeric value |
| `boolean` | True/false |
| `array` | Array of any type |
| `object` | Object/map |
| `any` | Any type (no validation) |

### 7.3 Flow Invocation

```yaml
- call_flow:
    flow: greet_user
    args:
      # `args.*` values are raw JEXL expressions (no ${}) or literals.
      user: "user.id"
      greeting: "Welcome"
    as: greetResult
```

### 7.4 Recursion Protection

Runtimes MUST implement recursion limits:

| Limit | Default | Description |
|-------|---------|-------------|
| Max depth | 50 | Maximum nested flow calls |
| Max iterations | 10000 | Maximum loop iterations |

When limits are exceeded:
1. Abort current flow
2. Return error result
3. Log warning

### 7.5 Control Flow Actions

#### 7.5.1 `call_flow` - Invoke a Flow

```yaml
- call_flow:
    flow: "flow_name"         # REQUIRED: Flow to call
    args:                     # OPTIONAL: Arguments
      key: value
    as: resultVar             # OPTIONAL: Store result
```

#### 7.5.2 `return` - Return from Flow

```yaml
- return:
    value: "${computed_result}"  # OPTIONAL: Return value
```

#### 7.5.3 `abort` - Abort Execution

```yaml
- abort:
    reason: "Invalid input"   # OPTIONAL: Abort reason
```

#### 7.5.4 `flow_if` - Conditional Branching

```yaml
- flow_if:
    if: "count > 10"          # REQUIRED: Condition (raw expression, no ${})
    then:                     # REQUIRED: Actions if true
      - log:
          message: "Count is high"
    else:                     # OPTIONAL: Actions if false
      - log:
          message: "Count is low"
```

#### 7.5.5 `flow_switch` - Multi-way Branching

```yaml
- flow_switch:
    value: "${status}"        # REQUIRED: Value to switch on
    cases:                    # REQUIRED: Case definitions
      - match: "active"
        actions:
          - log: { message: "Active" }
      - match: "pending"
        actions:
          - log: { message: "Pending" }
    default:                  # OPTIONAL: Default actions
      - log: { message: "Unknown status" }
```

#### 7.5.6 `flow_while` - Loop While True

```yaml
- flow_while:
    while: "counter < 10"     # REQUIRED: Loop condition (raw expression, no ${})
    do:                       # REQUIRED: Loop body
      - increment:
          var: counter
          by: 1
          scope: global
```

#### 7.5.7 `repeat` - Fixed Iteration Loop

```yaml
- repeat:
    times: 5                  # REQUIRED: Iteration count
    as: i                     # OPTIONAL: Loop counter variable
    do:                       # REQUIRED: Loop body
      - log:
          message: "Iteration ${i}"
```

#### 7.5.8 `parallel` - Concurrent Execution

```yaml
- parallel:
    actions:                  # REQUIRED: Actions to run in parallel
      - send_message:
          channel: "${channel1}"
          content: "Message 1"
      - send_message:
          channel: "${channel2}"
          content: "Message 2"
    as: results               # OPTIONAL: Store array of results
```

#### 7.5.9 `batch` - Process Items

```yaml
- batch:
    items: "${users}"         # REQUIRED: Items to process
    as: user                  # OPTIONAL: Item variable name
    each:                     # REQUIRED: Actions per item (or single action)
      - send_dm:
          user: "${user.id}"
          content: "Hello!"
    concurrency: 5            # OPTIONAL: Max concurrent (default: 10)
```

#### 7.5.10 `try` - Error Handling

```yaml
- try:
    do:                       # REQUIRED: Actions to try
      - send_message:
          channel: "${channelId}"
          content: "Hello"
    catch:                    # OPTIONAL: Actions on error
      - log:
          level: error
          message: "Failed: ${error.message}"
    finally:                  # OPTIONAL: Always execute
      - log:
          message: "Cleanup"
```

#### 7.5.11 `wait` - Delay Execution

```yaml
- wait:
    duration: "5s"            # REQUIRED: Duration to wait
```

#### 7.5.12 `log` - Log Message

```yaml
- log:
    message: "Debug info"     # REQUIRED: Message
    level: info               # OPTIONAL: debug|info|warn|error
    data:                     # OPTIONAL: Additional data
      userId: "${user.id}"
```

#### 7.5.13 `emit` - Emit Custom Event

```yaml
- emit:
    event: "user_leveled_up"  # REQUIRED: Event name
    data:                     # OPTIONAL: Event data
      userId: "${user.id}"
      level: "${newLevel}"
```

### 7.6 Flow Execution Context

```
interface FlowContext:
    # Flow name
    name: string

    # Arguments passed to flow
    args: object

    # Current recursion depth
    depth: number

    # Parent flow (if nested)
    parent?: FlowContext

    # Abort flag
    aborted: boolean

    # Abort reason
    abortReason?: string

    # Return value
    returnValue?: any
```

---

## 8. Compliance Levels

### 8.1 Minimal Runtime (20 Actions)

A minimal runtime supports testing and simple automation without Discord interaction.

**Required Actions:**
| Category | Actions |
|----------|---------|
| State (7) | `set`, `increment`, `decrement`, `list_push`, `list_remove`, `set_map`, `delete_map` |
| Flow (13) | `call_flow`, `abort`, `return`, `flow_if`, `flow_switch`, `flow_while`, `repeat`, `parallel`, `batch`, `try`, `wait`, `log`, `emit` |

**Required Functions:**
All functions in categories: Math, String, Array, Object, Type, Conversion, Utility

**Not Required:**
- Discord connection
- Discord-specific functions
- Message/Member/Channel/Voice/Component actions

### 8.2 Standard Runtime (64 Actions)

A standard runtime supports most production use cases.

**Required Actions:**
| Category | Actions |
|----------|---------|
| Minimal (20) | All minimal actions |
| Message (11) | `reply`, `send_message`, `edit_message`, `delete_message`, `defer`, `update_message`, `add_reaction`, `add_reactions`, `remove_reaction`, `clear_reactions`, `bulk_delete` |
| Member (14) | `assign_role`, `remove_role`, `toggle_role`, `kick`, `ban`, `unban`, `timeout`, `remove_timeout`, `send_dm`, `set_nickname`, `move_member`, `disconnect_member`, `server_mute`, `server_deafen` |
| Channel (9) | `create_channel`, `edit_channel`, `delete_channel`, `create_thread`, `archive_thread`, `set_channel_permissions`, `create_role`, `edit_role`, `delete_role` |
| Component (1) | `show_modal` |
| Database (4) | `db_insert`, `db_update`, `db_delete`, `db_query` |
| Misc (5) | `pipe_request`, `pipe_send`, `webhook_send`, `create_timer`, `cancel_timer` |

**Required Functions:**
All 71 functions

**Not Required:**
- Voice actions (17)
- Canvas actions (2): `canvas_render`, `render_layers`
- Metrics actions (2): `counter_increment`, `record_metric`

### 8.3 Full Runtime (85 Actions)

A full runtime implements all FURLOW features.

**Required Actions:**
| Category | Actions |
|----------|---------|
| Standard (64) | All standard actions |
| Voice (17) | `voice_join`, `voice_leave`, `voice_play`, `voice_pause`, `voice_resume`, `voice_stop`, `voice_skip`, `voice_seek`, `voice_volume`, `voice_set_filter`, `voice_search`, `queue_get`, `queue_add`, `queue_remove`, `queue_clear`, `queue_shuffle`, `queue_loop` |
| Canvas/Metrics (4) | `counter_increment`, `record_metric`, `canvas_render`, `render_layers` |

**Required Functions:**
All 71 functions

### 8.4 Compliance Testing

Runtimes SHOULD pass the official compliance test suite:
- `specs/compliance/minimal.furlow.yaml`
- `specs/compliance/standard.furlow.yaml`
- `specs/compliance/full.furlow.yaml`

---

## Appendix A: Complete Action Reference

### A.1 Message Actions (11)

#### `reply`
Reply to an interaction with a message.

```yaml
- reply:
    content: "Hello!"           # Message content
    embeds:                     # Optional embeds
      - title: "Embed Title"
        description: "Embed content"
        color: 0x5865F2
    components:                 # Optional components
      - type: "row"
        components:
          - type: "button"
            style: "primary"
            label: "Click me"
            customId: "my_button"
    ephemeral: false            # Only visible to user
    files:                      # Optional attachments
      - path: "./image.png"
        name: "image.png"
```

#### `send_message`
Send a message to a channel.

```yaml
- send_message:
    channel: "${channelId}"     # Target channel ID
    content: "Hello!"           # Message content
    embeds: []                  # Optional embeds
    components: []              # Optional components
    files: []                   # Optional attachments
    reply_to: "${messageId}"    # Optional reply reference
```

#### `edit_message`
Edit an existing message.

```yaml
- edit_message:
    channel: "${channelId}"     # Channel ID
    message: "${messageId}"     # Message ID to edit
    content: "Updated!"         # New content
    embeds: []                  # New embeds (replaces existing)
    components: []              # New components
```

#### `delete_message`
Delete a message.

```yaml
- delete_message:
    channel: "${channelId}"     # Channel ID
    message: "${messageId}"     # Message ID
    delay: "0s"                 # Optional delay before delete
```

#### `defer`
Defer an interaction response. Shows "Bot is thinking..." to the user.

**CRITICAL**: Discord requires interaction responses within 3 seconds. Use `defer` as the first action for any command that may take longer.

```yaml
- defer:
    ephemeral: false            # Whether reply will be ephemeral
```

| Property | Type | Required | Default | Description |
|----------|------|----------|---------|-------------|
| `ephemeral` | boolean | No | `false` | If true, only the invoking user sees the response |

After deferring:
- You have 15 minutes to send a response
- Use `reply` (which automatically calls followUp when deferred)
- Or use `update_message` for component interactions

#### `update_message`
Update a component interaction's message (buttons, select menus).

```yaml
- update_message:
    content: "Loaded!"          # New content
    embeds: []                  # New embeds
    components: []              # New components
```

#### `add_reaction`
Add a single reaction to a message.

```yaml
- add_reaction:
    channel: "${channelId}"     # Channel ID
    message: "${messageId}"     # Message ID
    emoji: "👍"                 # Emoji (unicode or custom)
```

#### `add_reactions`
Add multiple reactions to a message.

```yaml
- add_reactions:
    channel: "${channelId}"     # Channel ID
    message: "${messageId}"     # Message ID
    emojis:                     # Array of emojis
      - "👍"
      - "👎"
      - "<:custom:123456789>"
```

#### `remove_reaction`
Remove a specific reaction.

```yaml
- remove_reaction:
    channel: "${channelId}"     # Channel ID
    message: "${messageId}"     # Message ID
    emoji: "👍"                 # Emoji to remove
    user: "${userId}"           # Optional: specific user's reaction
```

#### `clear_reactions`
Clear reactions from a message.

```yaml
- clear_reactions:
    channel: "${channelId}"     # Channel ID
    message: "${messageId}"     # Message ID
    emoji: "👍"                 # Optional: specific emoji only
```

#### `bulk_delete`
Delete multiple messages.

```yaml
- bulk_delete:
    channel: "${channelId}"     # Channel ID
    messages:                   # Message IDs to delete
      - "${msgId1}"
      - "${msgId2}"
    # OR
    count: 10                   # Delete last N messages
    filter: "msg.author.bot"    # Optional filter expression
```

### A.2 Member Actions (14)

#### `assign_role`
Assign a role to a member.

```yaml
- assign_role:
    user: "${memberId}"         # Member/User ID
    role: "${roleId}"           # Role ID
    reason: "Verified"          # Optional audit log reason
```

#### `remove_role`
Remove a role from a member.

```yaml
- remove_role:
    user: "${memberId}"         # Member/User ID
    role: "${roleId}"           # Role ID
    reason: "Expired"           # Optional audit log reason
```

#### `toggle_role`
Toggle a role on/off.

```yaml
- toggle_role:
    user: "${memberId}"         # Member/User ID
    role: "${roleId}"           # Role ID
    reason: "Toggled"           # Optional audit log reason
```

#### `kick`
Kick a member from the guild.

```yaml
- kick:
    user: "${memberId}"         # Member/User ID
    reason: "Violation"         # Optional audit log reason
```

#### `ban`
Ban a member from the guild.

```yaml
- ban:
    user: "${memberId}"         # Member/User ID
    reason: "Severe violation"  # Optional audit log reason
    delete_message_days: 7      # Optional: delete message history (0-7)
```

#### `unban`
Unban a user.

```yaml
- unban:
    user: "${userId}"           # User ID
    reason: "Appeal accepted"   # Optional audit log reason
```

#### `timeout`
Timeout (mute) a member.

```yaml
- timeout:
    user: "${memberId}"         # Member/User ID
    duration: "5m"              # Timeout duration
    reason: "Spam"              # Optional audit log reason
```

#### `remove_timeout`
Remove timeout from a member.

```yaml
- remove_timeout:
    user: "${memberId}"         # Member/User ID
    reason: "Forgiven"          # Optional audit log reason
```

#### `send_dm`
Send a direct message to a user.

```yaml
- send_dm:
    user: "${userId}"           # User ID
    content: "Hello!"           # Message content
    embeds: []                  # Optional embeds
```

#### `set_nickname`
Set a member's nickname.

```yaml
- set_nickname:
    user: "${memberId}"         # Member/User ID
    nickname: "New Name"        # New nickname (null to reset)
    reason: "Name change"       # Optional audit log reason
```

#### `move_member`
Move a member to a different voice channel.

```yaml
- move_member:
    user: "${memberId}"         # Member/User ID
    channel: "${voiceChannelId}"  # Target voice channel
```

#### `disconnect_member`
Disconnect a member from voice.

```yaml
- disconnect_member:
    user: "${memberId}"         # Member/User ID
```

#### `server_mute`
Server mute a member in voice.

```yaml
- server_mute:
    user: "${memberId}"         # Member/User ID
    muted: true                 # Mute state
    reason: "Moderation"        # Optional audit log reason
```

#### `server_deafen`
Server deafen a member in voice.

```yaml
- server_deafen:
    user: "${memberId}"         # Member/User ID
    deafened: true              # Deafen state
    reason: "Moderation"        # Optional audit log reason
```

### A.3 Channel Actions (9)

#### `create_channel`
Create a new channel.

```yaml
- create_channel:
    name: "new-channel"         # Channel name
    type: "text"                # text|voice|category|announcement|stage|forum
    parent: "${categoryId}"     # Optional parent category
    topic: "Channel topic"      # Optional topic
    nsfw: false                 # Optional NSFW flag
    position: 0                 # Optional position
    permission_overwrites: []   # Optional permissions
    as: newChannel              # Store created channel
```

#### `edit_channel`
Edit a channel.

```yaml
- edit_channel:
    channel: "${channelId}"     # Channel ID
    name: "new-name"            # Optional new name
    topic: "New topic"          # Optional new topic
    nsfw: false                 # Optional NSFW flag
    position: 1                 # Optional position
    parent: "${categoryId}"     # Optional new parent
    reason: "Update"            # Optional audit log reason
```

#### `delete_channel`
Delete a channel.

```yaml
- delete_channel:
    channel: "${channelId}"     # Channel ID
    reason: "Cleanup"           # Optional audit log reason
```

#### `create_thread`
Create a thread.

```yaml
- create_thread:
    channel: "${channelId}"     # Parent channel ID
    name: "Thread Name"         # Thread name
    message: "${messageId}"     # Optional: create from message
    auto_archive_duration: 1440 # Minutes: 60|1440|4320|10080
    type: "public"              # public|private
    as: newThread               # Store created thread
```

#### `archive_thread`
Archive a thread.

```yaml
- archive_thread:
    thread: "${threadId}"       # Thread ID
    locked: false               # Optional: also lock thread
    reason: "Resolved"          # Optional audit log reason
```

#### `set_channel_permissions`
Set channel permission overwrites.

```yaml
- set_channel_permissions:
    channel: "${channelId}"     # Channel ID
    overwrites:
      - id: "${roleId}"
        type: "role"            # role|member
        allow:
          - "ViewChannel"
          - "SendMessages"
        deny:
          - "MentionEveryone"
    reason: "Permission update"
```

#### `create_role`
Create a new role.

```yaml
- create_role:
    name: "New Role"            # Role name
    color: 0x5865F2             # Optional color
    hoist: false                # Optional display separately
    mentionable: false          # Optional allow mentions
    permissions:                # Optional permissions
      - "SendMessages"
      - "ViewChannel"
    reason: "New role"          # Optional audit log reason
    as: newRole                 # Store created role
```

#### `edit_role`
Edit a role.

```yaml
- edit_role:
    role: "${roleId}"           # Role ID
    name: "Updated Role"        # Optional new name
    color: 0xFF0000             # Optional new color
    hoist: true                 # Optional display separately
    mentionable: true           # Optional allow mentions
    permissions: []             # Optional new permissions
    reason: "Update"            # Optional audit log reason
```

#### `delete_role`
Delete a role.

```yaml
- delete_role:
    role: "${roleId}"           # Role ID
    reason: "Cleanup"           # Optional audit log reason
```

### A.4 State Actions (7)

#### `set`
Set a state variable.

```yaml
- set:
    var: "counter"              # Variable name (or use 'key')
    value: 42                   # Value to set
    scope: guild                # Scope: global|guild|channel|user|member
```

#### `increment`
Increment a numeric variable.

```yaml
- increment:
    var: "counter"              # Variable name
    by: 1                       # Amount to increment (default: 1)
    scope: guild                # Scope
```

#### `decrement`
Decrement a numeric variable.

```yaml
- decrement:
    var: "counter"              # Variable name
    by: 1                       # Amount to decrement (default: 1)
    scope: guild                # Scope
```

#### `list_push`
Add item to a list variable.

```yaml
- list_push:
    var: "history"              # Variable name (or use 'key')
    value: "${item}"            # Value to add
    scope: user                 # Scope
```

#### `list_remove`
Remove item from a list variable.

```yaml
- list_remove:
    var: "history"              # Variable name (or use 'key')
    value: "${item}"            # Value to remove
    scope: user                 # Scope
```

#### `set_map`
Set a key in a map variable.

```yaml
- set_map:
    var: "settings"             # Variable name (or use 'key')
    map_key: "theme"            # Map key
    value: "dark"               # Value to set
    scope: member               # Scope
```

#### `delete_map`
Delete a key from a map variable.

```yaml
- delete_map:
    var: "settings"             # Variable name (or use 'key')
    map_key: "theme"            # Map key to delete
    scope: member               # Scope
```

### A.5 Flow Actions (13)

#### `call_flow`
Call a named flow.

```yaml
- call_flow:
    flow: "greet_user"          # Flow name
    args:                       # Arguments (raw expressions, no ${})
      user: "user.id"
    as: result                  # Store return value
```

#### `abort`
Abort flow execution.

```yaml
- abort:
    reason: "Invalid input"     # Optional abort reason
```

#### `return`
Return a value from a flow.

```yaml
- return:
    value: "${computed}"        # Optional return value
```

#### `flow_if`
Conditional branching.

```yaml
- flow_if:
    if: "${condition}"          # Condition expression
    then:                       # Actions if true
      - log: { message: "True" }
    else:                       # Optional actions if false
      - log: { message: "False" }
```

#### `flow_switch`
Multi-way branching.

```yaml
- flow_switch:
    value: "${status}"          # Value to switch on
    cases:
      - match: "active"
        actions: [...]
      - match: "pending"
        actions: [...]
    default: [...]              # Optional default actions
```

#### `flow_while`
Loop while condition is true.

```yaml
- flow_while:
    while: "${i < 10}"          # Loop condition
    do:                         # Loop body
      - increment:
          var: i
          scope: global
```

#### `repeat`
Fixed iteration loop.

```yaml
- repeat:
    times: 5                    # Iteration count
    as: i                       # Loop counter variable
    do: [...]                   # Loop body
```

#### `parallel`
Execute actions concurrently.

```yaml
- parallel:
    actions: [...]              # Actions to run in parallel
    as: results                 # Store array of results
```

#### `batch`
Process items.

```yaml
- batch:
    items: "${users}"           # Items to process
    as: user                    # Item variable name
    each: [...]                 # Actions per item
    concurrency: 5              # Max concurrent
```

#### `try`
Error handling.

```yaml
- try:
    do: [...]                   # Actions to try
    catch: [...]                # Actions on error
    finally: [...]              # Always execute
```

#### `wait`
Delay execution.

```yaml
- wait:
    duration: "5s"              # Wait duration
```

#### `log`
Log a message.

```yaml
- log:
    message: "Info"             # Log message
    level: info                 # debug|info|warn|error
    data: {}                    # Optional data
```

#### `emit`
Emit custom event.

```yaml
- emit:
    event: "custom_event"       # Event name
    data: {}                    # Event data
```

### A.6 Database Actions (4)

#### `db_insert`
Insert a row.

```yaml
- db_insert:
    table: "warnings"           # Table name
    data:                       # Row data
      userId: "${user.id}"
      reason: "${reason}"
      timestamp: "${now()}"
    as: insertedRow             # Store result
```

#### `db_update`
Update rows.

```yaml
- db_update:
    table: "warnings"           # Table name
    where:                      # Filter conditions
      id: "${warningId}"
    data:                       # Update data
      resolved: true
    upsert: false               # Insert if not exists
    as: updatedCount            # Store affected count
```

#### `db_delete`
Delete rows.

```yaml
- db_delete:
    table: "warnings"           # Table name
    where:                      # Filter conditions
      userId: "${user.id}"
    as: deletedCount            # Store affected count
```

#### `db_query`
Query rows.

```yaml
- db_query:
    table: "warnings"           # Table name
    where:                      # Optional filter
      userId: "${user.id}"
    order_by: "timestamp DESC"  # Optional sort field with direction
    limit: 10                   # Optional limit
    offset: 0                   # Optional offset
    as: warnings                # Store results
```

### A.7 Voice Actions (17)

#### `voice_join`
Join a voice channel.

```yaml
- voice_join:
    channel: "${voiceChannelId}"  # Voice channel ID
    self_deaf: true             # Self deafen
    self_mute: false            # Self mute
```

#### `voice_leave`
Leave voice channel.

```yaml
- voice_leave:
    guild: "${guildId}"         # Guild ID
```

#### `voice_play`
Play audio.

```yaml
- voice_play:
    source: "https://..."       # Audio URL or search query
    type: "url"                 # url|search|file
    volume: 100                 # Volume 0-200
```

#### `voice_pause`
Pause playback.

```yaml
- voice_pause: {}
```

#### `voice_resume`
Resume playback.

```yaml
- voice_resume: {}
```

#### `voice_stop`
Stop playback.

```yaml
- voice_stop: {}
```

#### `voice_skip`
Skip current track.

```yaml
- voice_skip: {}
```

#### `voice_seek`
Seek to position.

```yaml
- voice_seek:
    position: "1m30s"           # Position to seek to
```

#### `voice_volume`
Set volume.

```yaml
- voice_volume:
    volume: 80                  # Volume 0-200
```

#### `voice_set_filter`
Apply audio filter.

```yaml
- voice_set_filter:
    filter: "bassboost"         # Filter name
    options: {}                 # Filter options
```

Available filters: `bassboost`, `nightcore`, `vaporwave`, `8d`, `treble`, `normalizer`, `none`

#### `voice_search`
Search for audio.

```yaml
- voice_search:
    query: "song name"          # Search query
    source: "youtube"           # youtube|spotify|soundcloud
    limit: 10                   # Max results
    as: searchResults           # Store results
```

#### `queue_get`
Get queue status.

```yaml
- queue_get:
    as: queueInfo               # Store queue data
```

Returns: `{ current, queue, position, loop }`

#### `queue_add`
Add to queue.

```yaml
- queue_add:
    tracks:                     # Tracks to add
      - "${track}"
    position: "end"             # end|next|number
```

#### `queue_remove`
Remove from queue.

```yaml
- queue_remove:
    position: 0                 # Queue position to remove
```

#### `queue_clear`
Clear queue.

```yaml
- queue_clear: {}
```

#### `queue_shuffle`
Shuffle queue.

```yaml
- queue_shuffle: {}
```

#### `queue_loop`
Set loop mode.

```yaml
- queue_loop:
    mode: "queue"               # off|track|queue
```

### A.8 Component Actions (1)

#### `show_modal`
Display a modal form.

```yaml
- show_modal:
    customId: "feedback_modal"  # Modal ID for handling
    title: "Feedback"           # Modal title
    fields:                     # Form fields
      - customId: "feedback"
        label: "Your Feedback"
        style: "paragraph"      # short|paragraph
        placeholder: "Enter..."
        required: true
        minLength: 10
        maxLength: 1000
```

### A.9 Miscellaneous Actions (9)

#### `pipe_request`
Make HTTP request.

```yaml
- pipe_request:
    pipe: "api"                 # Pipe name
    method: "GET"               # HTTP method
    path: "/users/${userId}"    # Request path
    headers: {}                 # Additional headers
    body: {}                    # Request body
    as: response                # Store response
```

#### `pipe_send`
Send through WebSocket/MQTT.

```yaml
- pipe_send:
    pipe: "websocket"           # Pipe name
    data: {}                    # Data to send
```

#### `webhook_send`
Send via Discord webhook.

```yaml
- webhook_send:
    url: "${webhookUrl}"        # Webhook URL
    content: "Hello"            # Message content
    username: "Bot"             # Optional username override
    avatar_url: "https://..."   # Optional avatar override
    embeds: []                  # Optional embeds
```

#### `create_timer`
Create a timer.

```yaml
- create_timer:
    id: "reminder_${user.id}"   # Timer ID
    duration: "1h"              # Timer duration
    event: "reminder"           # Event name to emit when timer fires
    data:                       # Data for timer_fire event
      userId: "${user.id}"
      message: "${message}"
```

#### `cancel_timer`
Cancel a timer.

```yaml
- cancel_timer:
    id: "reminder_${user.id}"   # Timer ID to cancel
```

#### `counter_increment`
Increment a metric counter.

```yaml
- counter_increment:
    name: "commands_executed"   # Counter name
    value: 1                    # Increment amount
    labels:                     # Optional labels
      command: "ping"
```

#### `record_metric`
Record a metric value.

```yaml
- record_metric:
    name: "response_time"       # Metric name
    value: "${duration}"        # Metric value
    type: "histogram"           # counter|gauge|histogram
    labels: {}                  # Optional labels
```

#### `canvas_render`
Render a canvas image using a named generator.

```yaml
- canvas_render:
    generator: "welcome_card"   # Canvas generator name
    context:                    # Context data for generator
      avatar: "${user.avatar}"
      username: "${user.username}"
    as: imageBuffer             # Store rendered image buffer
```

#### `render_layers`
Render inline canvas layers without a pre-defined generator.

```yaml
- render_layers:
    width: 800                  # Canvas width
    height: 400                 # Canvas height
    background: "#5865F2"       # Background color
    layers:                     # Layer definitions
      - type: text
        text: "Welcome!"
        x: 400
        y: 200
    format: "png"               # png|jpeg
    as: imageBuffer             # Store rendered image buffer
```

---

## Appendix B: Complete Function Reference

### B.1 Date/Time Functions

| Function | Description | Example |
|----------|-------------|---------|
| `now()` | Current date/time | `now()` → `Date` |
| `timestamp(date?, format?)` | Unix timestamp | `timestamp()` → `1706918400` |
| `date(value)` | Parse to Date | `date("2024-02-03")` → `Date` |
| `dateAdd(date, n, unit)` | Add to date | `dateAdd(now(), 1, "d")` → tomorrow |
| `addDuration(date, dur)` | Add duration | `addDuration(now(), "1h 30m")` |
| `formatNumber(n, locale?)` | Format number | `formatNumber(1234.5, "en-US")` → `"1,234.5"` |
| `ordinal(n)` | Ordinal suffix | `ordinal(1)` → `"1st"` |
| `duration(ms)` | Format duration | `duration(90000)` → `"1m 30s"` |

### B.2 Math Functions

| Function | Description | Example |
|----------|-------------|---------|
| `random(min, max)` | Random integer | `random(1, 10)` → `7` |
| `randomFloat(min, max)` | Random float | `randomFloat(0, 1)` → `0.42` |
| `round(n, dec?)` | Round | `round(3.456, 2)` → `3.46` |
| `floor(n)` | Floor | `floor(3.7)` → `3` |
| `ceil(n)` | Ceiling | `ceil(3.2)` → `4` |
| `abs(n)` | Absolute | `abs(-5)` → `5` |
| `min(...n)` | Minimum | `min(1, 2, 3)` → `1` |
| `max(...n)` | Maximum | `max(1, 2, 3)` → `3` |
| `clamp(v, min, max)` | Clamp | `clamp(15, 0, 10)` → `10` |

### B.3 String Functions

| Function | Description | Example |
|----------|-------------|---------|
| `lower(s)` | Lowercase | `lower("HELLO")` → `"hello"` |
| `upper(s)` | Uppercase | `upper("hello")` → `"HELLO"` |
| `capitalize(s)` | Capitalize | `capitalize("hello")` → `"Hello"` |
| `titleCase(s)` | Title case | `titleCase("hello world")` → `"Hello World"` |
| `trim(s)` | Trim whitespace | `trim("  hi  ")` → `"hi"` |
| `truncate(s, n, suf?)` | Truncate | `truncate("hello world", 8)` → `"hello..."` |
| `padStart(s, n, c?)` | Pad start | `padStart("5", 3, "0")` → `"005"` |
| `padEnd(s, n, c?)` | Pad end | `padEnd("hi", 5)` → `"hi   "` |
| `replace(s, p, r)` | Replace | `replace("hello", "l", "L")` → `"heLLo"` |
| `split(s, d)` | Split | `split("a,b,c", ",")` → `["a","b","c"]` |
| `includes(s, p)` | Contains | `includes("hello", "ell")` → `true` |
| `startsWith(s, p)` | Starts with | `startsWith("hello", "he")` → `true` |
| `endsWith(s, p)` | Ends with | `endsWith("hello", "lo")` → `true` |
| `match(s, p)` | Regex match | `match("test123", "\\d+")` → `true` |

### B.4 Array Functions

| Function | Description | Example |
|----------|-------------|---------|
| `length(a)` | Length | `length([1,2,3])` → `3` |
| `first(a)` | First element | `first([1,2,3])` → `1` |
| `last(a)` | Last element | `last([1,2,3])` → `3` |
| `nth(a, n)` | Nth element | `nth([1,2,3], 1)` → `2` |
| `slice(a, s, e?)` | Slice | `slice([1,2,3,4], 1, 3)` → `[2,3]` |
| `reverse(a)` | Reverse | `reverse([1,2,3])` → `[3,2,1]` |
| `sort(a, k?)` | Sort | `sort([3,1,2])` → `[1,2,3]` |
| `unique(a)` | Unique | `unique([1,1,2])` → `[1,2]` |
| `flatten(a)` | Flatten | `flatten([[1,2],[3]])` → `[1,2,3]` |
| `pick(a)` | Random pick | `pick([1,2,3])` → `2` |
| `shuffle(a)` | Shuffle | `shuffle([1,2,3])` → `[3,1,2]` |
| `range(s, e, st?)` | Range | `range(1, 5)` → `[1,2,3,4]` |
| `chunk(a, n)` | Chunk | `chunk([1,2,3,4], 2)` → `[[1,2],[3,4]]` |
| `join(a, d?)` | Join | `join(["a","b"], ",")` → `"a,b"` |

### B.5 Object Functions

| Function | Description | Example |
|----------|-------------|---------|
| `keys(o)` | Get keys | `keys({a:1,b:2})` → `["a","b"]` |
| `values(o)` | Get values | `values({a:1,b:2})` → `[1,2]` |
| `entries(o)` | Get entries | `entries({a:1})` → `[["a",1]]` |
| `get(o, p, d?)` | Get nested | `get({a:{b:1}}, "a.b")` → `1` |
| `has(o, k)` | Has key | `has({a:1}, "a")` → `true` |
| `merge(...o)` | Merge | `merge({a:1}, {b:2})` → `{a:1,b:2}` |

### B.6 Type Functions

| Function | Description | Example |
|----------|-------------|---------|
| `type(v)` | Get type | `type([])` → `"array"` |
| `isNull(v)` | Is null | `isNull(null)` → `true` |
| `isArray(v)` | Is array | `isArray([])` → `true` |
| `isString(v)` | Is string | `isString("")` → `true` |
| `isNumber(v)` | Is number | `isNumber(42)` → `true` |
| `isBoolean(v)` | Is boolean | `isBoolean(true)` → `true` |
| `isObject(v)` | Is object | `isObject({})` → `true` |

### B.7 Conversion Functions

| Function | Description | Example |
|----------|-------------|---------|
| `string(v)` | To string | `string(42)` → `"42"` |
| `number(v)` | To number | `number("42")` → `42` |
| `int(v)` | To integer | `int("3.7")` → `3` |
| `float(v)` | To float | `float("3.14")` → `3.14` |
| `boolean(v)` | To boolean | `boolean(1)` → `true` |
| `json(v)` | To JSON | `json({a:1})` → `"{\"a\":1}"` |
| `parseJson(s)` | Parse JSON | `parseJson("{\"a\":1}")` → `{a:1}` |

### B.8 Discord Functions

| Function | Description | Example |
|----------|-------------|---------|
| `mention(t, id)` | Create mention | `mention("user", "123")` → `"<@123>"` |
| `pluralize(n, s, p?)` | Pluralize | `pluralize(5, "item", "items")` → `"5 items"` |
| `hash(s)` | Hash string | `hash("test")` → `"9f86d08..."` |
| `snowflakeToDate(id)` | ID to date | `snowflakeToDate("123...")` → `Date` |

### B.9 Utility Functions

| Function | Description | Example |
|----------|-------------|---------|
| `default(v, d)` | Default value | `default(null, "hi")` → `"hi"` |
| `coalesce(...v)` | First non-null | `coalesce(null, "a")` → `"a"` |
| `uuid()` | Generate UUID | `uuid()` → `"550e8400-..."` |
| `env(k)` | Get env var | `env("TOKEN")` → `"..."` |

---

## Appendix C: Complete Transform Reference

Transforms use pipe syntax: `value | transform(args)`

### C.1 String Transforms

| Transform | Description | Example |
|-----------|-------------|---------|
| `lower` | Lowercase | `"HELLO" \| lower` → `"hello"` |
| `upper` | Uppercase | `"hello" \| upper` → `"HELLO"` |
| `capitalize` | Capitalize | `"hello" \| capitalize` → `"Hello"` |
| `titleCase` | Title case | `"hello world" \| titleCase` |
| `trim` | Trim whitespace | `"  hi  " \| trim` → `"hi"` |
| `truncate` | Truncate | `"hello" \| truncate(3)` → `"hel..."` |
| `split` | Split | `"a,b" \| split(",")` → `["a","b"]` |
| `replace` | Replace | `"hello" \| replace("l", "L")` |
| `padStart` | Pad start | `"5" \| padStart(3, "0")` → `"005"` |
| `padEnd` | Pad end | `"hi" \| padEnd(5)` → `"hi   "` |
| `includes` | Contains | `"hello" \| includes("ell")` → `true` |
| `startsWith` | Starts with | `"hello" \| startsWith("he")` |
| `endsWith` | Ends with | `"hello" \| endsWith("lo")` |
| `contains` | Alias for includes | `"hello" \| contains("ell")` |

### C.2 Array Transforms

| Transform | Description | Example |
|-----------|-------------|---------|
| `join` | Join with delimiter | `[1,2,3] \| join(",")` → `"1,2,3"` |
| `first` | First element | `[1,2,3] \| first` → `1` |
| `last` | Last element | `[1,2,3] \| last` → `3` |
| `nth` | Nth element | `[1,2,3] \| nth(1)` → `2` |
| `slice` | Slice array | `[1,2,3,4] \| slice(1, 3)` → `[2,3]` |
| `reverse` | Reverse | `[1,2,3] \| reverse` → `[3,2,1]` |
| `sort` | Sort | `[3,1,2] \| sort` → `[1,2,3]` |
| `unique` | Unique values | `[1,1,2] \| unique` → `[1,2]` |
| `flatten` | Flatten | `[[1],[2]] \| flatten` → `[1,2]` |
| `filter` | Filter by expr | `items \| filter("x > 5")` |
| `map` | Map by expr | `items \| map("x * 2")` |
| `pluck` | Extract property | `users \| pluck("name")` |
| `pick` | Random element | `[1,2,3] \| pick` |
| `shuffle` | Shuffle | `[1,2,3] \| shuffle` |
| `length` | Array length | `[1,2,3] \| length` → `3` |
| `size` | Alias for length | `[1,2,3] \| size` → `3` |

### C.3 Number Transforms

| Transform | Description | Example |
|-----------|-------------|---------|
| `round` | Round | `3.456 \| round(2)` → `3.46` |
| `floor` | Floor | `3.7 \| floor` → `3` |
| `ceil` | Ceiling | `3.2 \| ceil` → `4` |
| `abs` | Absolute | `-5 \| abs` → `5` |
| `format` | Format number | `1234 \| format("en-US")` |
| `ordinal` | Ordinal suffix | `1 \| ordinal` → `"1st"` |

### C.4 Object Transforms

| Transform | Description | Example |
|-----------|-------------|---------|
| `keys` | Get keys | `{a:1} \| keys` → `["a"]` |
| `values` | Get values | `{a:1} \| values` → `[1]` |
| `entries` | Get entries | `{a:1} \| entries` |
| `get` | Get nested | `obj \| get("a.b.c")` |

### C.5 Type Transforms

| Transform | Description | Example |
|-----------|-------------|---------|
| `string` | To string | `42 \| string` → `"42"` |
| `number` | To number | `"42" \| number` → `42` |
| `int` | To integer | `"3.7" \| int` → `3` |
| `float` | To float | `"3.14" \| float` → `3.14` |
| `boolean` | To boolean | `1 \| boolean` → `true` |
| `json` | To JSON | `{a:1} \| json` |
| `parseJson` | Parse JSON | `'{"a":1}' \| parseJson` |

### C.6 Utility Transforms

| Transform | Description | Example |
|-----------|-------------|---------|
| `default` | Default value | `null \| default("hi")` |
| `timestamp` | To timestamp | `date \| timestamp` |
| `duration` | Format ms | `90000 \| duration` → `"1m 30s"` |
| `mention` | Create mention | `userId \| mention("user")` |
| `pluralize` | Pluralize | `count \| pluralize("item")` |

---

## Document History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-02-03 | Initial specification |

---

*This specification is maintained by the FURLOW project team. For questions or contributions, see the project repository.*
