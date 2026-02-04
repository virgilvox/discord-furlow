# Configuration Guide

Complete reference for FURLOW YAML specification.

## Top-Level Structure

```yaml
version: "0.1"          # Required: Specification version

identity:               # Bot identity
  name: "Bot Name"
  avatar: ./avatar.png  # Local path or URL

presence:               # Bot presence/status
  status: online
  activity:
    type: playing
    text: "with FURLOW"

intents:                # Gateway intents
  auto: true            # Auto-detect from events

state:                  # State configuration
  storage:
    type: memory        # memory | sqlite | postgres

commands: []            # Slash commands
events: []              # Event handlers
flows: {}               # Reusable flows

imports: []             # Import other YAML files
```

## Identity

```yaml
identity:
  name: "My Bot"
  avatar: ./assets/avatar.png   # Local file
  avatar: https://...           # Or URL
  banner: ./assets/banner.png
  about: "A cool bot"           # Bio text
```

## Presence

```yaml
presence:
  status: online  # online | idle | dnd | invisible
  activity:
    type: playing       # playing | streaming | listening | watching | competing
    text: "with fire"
    url: https://...    # Required for streaming type
```

### Dynamic Presence

```yaml
presence:
  dynamic:
    - when: "client.guilds.size > 100"
      status: online
      activity:
        type: watching
        text: "${client.guilds.size} servers"
    - default:
        status: online
        activity:
          type: playing
          text: "with FURLOW"
```

## Intents

```yaml
intents:
  auto: true  # Recommended: auto-detect from events/commands

# Or explicit:
intents:
  explicit:
    - guilds
    - guild_messages
    - message_content        # Privileged
    - guild_members          # Privileged
```

## State

```yaml
state:
  storage:
    type: memory  # In-memory (lost on restart)

  # Or SQLite:
  storage:
    type: sqlite
    path: ./data.db

  # Or PostgreSQL:
  storage:
    type: postgres
    url: $env.DATABASE_URL

  variables:
    counter:
      scope: global
      type: number
      default: 0

    user_prefs:
      scope: user
      type: object
      default: {}
```

### Variable Scopes

| Scope | Key | Description |
|-------|-----|-------------|
| `global` | `name` | Shared across all contexts |
| `guild` | `guild:name` | Per-server |
| `channel` | `channel:name` | Per-channel |
| `user` | `user:name` | Per-user globally |
| `member` | `member:name` | Per-user per-server |

## Commands

```yaml
commands:
  - name: example
    description: An example command

    # Guild-specific registration (optional)
    guilds:
      - "123456789"

    # Options
    options:
      - name: text
        type: string
        description: Some text
        required: true
        choices:              # Optional fixed choices
          - name: Option A
            value: a
          - name: Option B
            value: b
        min_length: 1         # String length limits
        max_length: 100
        autocomplete: true    # Enable autocomplete

      - name: count
        type: integer
        description: A number
        min_value: 1
        max_value: 100

      - name: user
        type: user
        description: A user

    # Subcommands
    subcommands:
      - name: sub
        description: A subcommand
        options: []
        actions: []

    # Subcommand groups
    groups:
      - name: group
        description: A group
        subcommands:
          - name: nested
            description: Nested subcommand
            actions: []

    actions:
      - reply:
          content: "Response"
```

### Option Types

| Type | Description | Additional Properties |
|------|-------------|----------------------|
| `string` | Text | `min_length`, `max_length`, `choices`, `autocomplete` |
| `integer` | Whole number | `min_value`, `max_value`, `choices`, `autocomplete` |
| `number` | Decimal | `min_value`, `max_value`, `choices`, `autocomplete` |
| `boolean` | True/false | — |
| `user` | User mention | — |
| `channel` | Channel | `channel_types` |
| `role` | Role | — |
| `mentionable` | User or role | — |
| `attachment` | File | — |

## Events

```yaml
events:
  - event: message_create
    condition: "message.content.startsWith('!')"
    actions:
      - reply:
          content: "Prefix commands are not supported"

    # Rate limiting
    debounce: 5s    # Ignore repeated triggers within 5 seconds
    throttle: 1m    # Max once per minute
    once: true      # Only trigger once ever
```

See [Events Reference](../reference/events.md) for all event types.

## Flows

```yaml
flows:
  send_log:
    params:
      - name: message
        type: string
      - name: level
        type: string
        default: "info"
    actions:
      - send_message:
          channel: "${guild.logChannel}"
          content: "[${level | upper}] ${message}"

commands:
  - name: test
    actions:
      - call_flow:
          flow: send_log
          args:
            message: "Command executed"
```

## Imports

Split configuration across files:

```yaml
# furlow.yaml
imports:
  - ./commands/moderation.yaml
  - ./commands/fun.yaml
  - ./events/member.yaml
```

```yaml
# commands/moderation.yaml
commands:
  - name: ban
    # ...
```

## Environment Variables

Reference environment variables with `$env.`:

```yaml
token: $env.DISCORD_TOKEN

pipes:
  openai:
    api_key: $env.OPENAI_API_KEY
```

Never put secrets directly in YAML files.

## Full Reference

- [Actions Reference](../reference/actions/) - All 84 actions
- [Expressions Reference](../reference/expressions/) - Functions and transforms
- [Events Reference](../reference/events.md) - Event types
