# YAML Specification Reference

Complete reference for the FURLOW YAML bot specification format.

## File Format

FURLOW specifications use YAML with the `.furlow.yaml` or `.furlow.yml` extension. Legacy `.bolt.yaml` files are also supported.

```yaml
# Required
version: "0.1"

# Bot configuration sections
identity:
  name: "My Bot"

# ... other sections
```

## Top-Level Keys

| Key | Required | Description |
|-----|----------|-------------|
| `version` | Yes | Spec version (currently `"0.1"`) |
| `identity` | No | Bot branding and identity |
| `presence` | No | Bot status and activity |
| `permissions` | No | Permission levels and roles |
| `state` | No | State storage configuration |
| `commands` | No | Slash commands |
| `context_menus` | No | Right-click context menus |
| `events` | No | Event handlers |
| `flows` | No | Reusable action sequences |
| `components` | No | Buttons, selects, modals |
| `embeds` | No | Reusable embed templates |
| `theme` | No | Color themes for embeds |
| `voice` | No | Voice/music configuration |
| `pipes` | No | External integrations |
| `automod` | No | Auto-moderation settings |
| `scheduler` | No | Scheduled tasks |
| `locale` | No | Localization settings |
| `canvas` | No | Image generation |
| `analytics` | No | Metrics and monitoring |
| `dashboard` | No | Web dashboard |
| `errors` | No | Error handling |
| `imports` | No | External file imports |

---

## Identity

Bot branding and profile configuration.

```yaml
identity:
  name: "My Bot"
  avatar: "https://example.com/avatar.png"
  banner: "https://example.com/banner.png"
  description: "A helpful Discord bot"
```

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Display name |
| `avatar` | string | Avatar image URL |
| `banner` | string | Banner image URL |
| `description` | string | Bot description |

---

## Presence

Bot online status and activity.

```yaml
presence:
  status: online  # online, idle, dnd, invisible
  activity:
    type: playing  # playing, streaming, listening, watching, competing
    name: "with YAML"
    url: "https://twitch.tv/..."  # For streaming type
```

| Field | Type | Description |
|-------|------|-------------|
| `status` | string | `online`, `idle`, `dnd`, `invisible` |
| `activity.type` | string | Activity type |
| `activity.name` | expression | Activity text (supports expressions) |
| `activity.url` | string | Stream URL (for streaming type) |

---

## Permissions

Permission levels and access control.

```yaml
permissions:
  default_level: 0
  levels:
    0: Everyone
    1: Moderator
    2: Admin
    3: Owner
  owner_ids:
    - "123456789"
  roles:
    admin:
      id: "987654321"
      level: 2
```

| Field | Type | Description |
|-------|------|-------------|
| `default_level` | number | Default permission level (0) |
| `levels` | object | Named permission levels |
| `owner_ids` | array | Bot owner Discord IDs |
| `roles` | object | Role to permission mappings |

---

## State

State storage and persistence.

```yaml
state:
  storage:
    type: sqlite  # memory, sqlite, postgres
    path: ./data.db
  variables:
    counter:
      scope: guild
      type: number
      default: 0
    settings:
      scope: guild
      type: object
      default:
        prefix: "!"
        logging: true
```

### Storage Types

| Type | Description | Options |
|------|-------------|---------|
| `memory` | In-memory only (lost on restart) | - |
| `sqlite` | SQLite database | `path` |
| `postgres` | PostgreSQL database | `connection` or `host`, `port`, `database`, `user`, `password` |

### Variable Scopes

| Scope | Context | Example Use |
|-------|---------|-------------|
| `global` | Bot-wide | Total command count |
| `guild` | Per server | Server settings |
| `channel` | Per channel | Channel configs |
| `user` | Per user globally | User preferences |
| `member` | Per user per server | XP, warnings |

### Variable Types

| Type | Description |
|------|-------------|
| `string` | Text values |
| `number` | Numeric values |
| `boolean` | True/false |
| `object` | JSON objects |
| `array` | Lists/arrays |

---

## Commands

Slash command definitions.

```yaml
commands:
  - name: ping
    description: Check bot latency
    actions:
      - reply:
          content: "Pong! ${client.ping}ms"

  - name: greet
    description: Greet a user
    options:
      - name: user
        type: user
        description: User to greet
        required: false
      - name: message
        type: string
        description: Custom message
        required: false
        choices:
          - name: Hello
            value: hello
          - name: Hi
            value: hi
    actions:
      - reply:
          content: "${options.message || 'Hello'}, ${options.user?.display_name || user.username}!"
```

### Command Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Command name (lowercase, no spaces) |
| `description` | string | Yes | Command description |
| `options` | array | No | Command options/arguments |
| `actions` | array | Yes | Actions to execute |
| `when` | expression | No | Condition to enable command |
| `cooldown` | object | No | Rate limiting: `{rate, per, duration, message?}` |
| `permissions` | string | No | Required Discord permissions |
| `level` | number | No | Required permission level |

### Option Types

| Type | Description |
|------|-------------|
| `string` | Text input |
| `integer` | Whole number |
| `number` | Decimal number |
| `boolean` | True/false toggle |
| `user` | User mention |
| `channel` | Channel selection |
| `role` | Role selection |
| `mentionable` | User or role |
| `attachment` | File upload |
| `subcommand` | Subcommand |
| `subcommand_group` | Subcommand group |

---

## Context Menus

Right-click context menu commands.

```yaml
context_menus:
  - name: Report User
    type: user  # user or message
    permissions: MODERATE_MEMBERS
    actions:
      - reply:
          content: "Reported ${target.user.tag}"
          ephemeral: true

  - name: Translate
    type: message
    actions:
      - call_flow:
          flow: translate_message
          args:
            message: "${target.content}"
```

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Menu display name |
| `type` | string | `user` or `message` |
| `permissions` | string | Required Discord permissions |
| `when` | expression | Visibility condition |
| `actions` | array | Actions to execute |

---

## Events

Event handlers for Discord events.

```yaml
events:
  - event: guild_member_add
    actions:
      - send_message:
          channel: "${env.WELCOME_CHANNEL}"
          content: "Welcome, ${member.display_name}!"

  - event: message_create
    when: "message.content | startsWith('!')"
    throttle: 5s
    actions:
      - log:
          message: "Legacy command detected"
```

| Field | Type | Description |
|-------|------|-------------|
| `event` | string | Event type (see [Events Reference](events.md)) |
| `when` | expression | Filter condition |
| `actions` | array | Actions to execute |
| `debounce` | duration | Wait before executing |
| `throttle` | duration | Rate limit |

---

## Flows

Reusable action sequences.

```yaml
flows:
  log_moderation:
    params:
      - name: action
        type: string
        required: true
      - name: target
        type: string
      - name: reason
        type: string
    actions:
      - send_message:
          channel: "${state.guild.log_channel}"
          embeds:
            - title: "Moderation: ${action}"
              fields:
                - name: Target
                  value: "${target}"
                - name: Reason
                  value: "${reason || 'No reason provided'}"
                - name: Moderator
                  value: "${user.tag}"
              timestamp: true

commands:
  - name: ban
    options:
      - name: user
        type: user
        required: true
      - name: reason
        type: string
    actions:
      - ban:
          user: "${options.user.id}"
          reason: "${options.reason}"
      - call_flow:
          flow: log_moderation
          args:
            action: Ban
            target: "${options.user.tag}"
            reason: "${options.reason}"
```

| Field | Type | Description |
|-------|------|-------------|
| `params` | array | Flow parameters |
| `actions` | array | Actions to execute |
| `when` | expression | Condition to run |
| `returns` | expression | Return value |

---

## Components

Reusable UI components (buttons, selects, modals).

```yaml
components:
  - custom_id: confirm_button
    type: button
    style: success
    label: Confirm
    emoji: "check"
    actions:
      - update_message:
          content: "Confirmed!"
          components: []

  - custom_id: role_select
    type: select
    placeholder: Select roles
    min_values: 1
    max_values: 3
    options:
      - label: Red Team
        value: red
        emoji: "red_circle"
      - label: Blue Team
        value: blue
        emoji: "blue_circle"
    actions:
      - batch:
          items: "${interaction.values}"
          as: role
          do:
            - toggle_role:
                user: "${user.id}"
                role: "${state.guild.roles[role]}"

  - custom_id: feedback_modal
    type: modal
    title: Submit Feedback
    components:
      - custom_id: feedback_text
        label: Your Feedback
        style: paragraph
        required: true
        placeholder: Tell us what you think...
    actions:
      - send_message:
          channel: "${state.guild.feedback_channel}"
          content: "Feedback from ${user.tag}:\n${fields.feedback_text}"
```

### Button Styles

| Style | Description |
|-------|-------------|
| `primary` | Blurple button |
| `secondary` | Gray button |
| `success` | Green button |
| `danger` | Red button |
| `link` | Link button (no actions, requires `url`) |

### Modal Input Styles

| Style | Description |
|-------|-------------|
| `short` | Single-line input |
| `paragraph` | Multi-line textarea |

---

## Embeds

Reusable embed templates.

```yaml
embeds:
  welcome:
    title: "Welcome to ${guild.name}!"
    description: "Thanks for joining, ${member.display_name}"
    color: 0x5865F2
    thumbnail:
      url: "${member.avatar}"
    fields:
      - name: "Members"
        value: "${guild.member_count}"
        inline: true
      - name: "Created"
        value: "${timestamp(guild.created_at, 'R')}"
        inline: true
    footer:
      text: "User #${guild.member_count}"
      icon_url: "${guild.icon}"
    timestamp: true

events:
  - event: guild_member_add
    actions:
      - send_message:
          channel: "${env.WELCOME_CHANNEL}"
          embeds:
            - $ref: embeds.welcome
```

---

## Theme

Color theme configuration.

```yaml
theme:
  primary: "#5865F2"
  success: "#57F287"
  warning: "#FEE75C"
  danger: "#ED4245"
  info: "#5865F2"
```

Use in embeds: `color: "${theme.primary}"`

---

## Voice

Voice channel and music configuration.

```yaml
voice:
  enabled: true
  default_volume: 50
  max_queue_size: 100
  leave_on_empty: true
  leave_delay: 5m
  sources:
    - youtube
    - soundcloud
    - spotify
```

---

## Pipes

External service integrations. See [Pipes Documentation](../packages/pipes/README.md).

```yaml
pipes:
  - name: api
    type: http
    url: https://api.example.com
    auth:
      type: bearer
      token: "${env.API_TOKEN}"

  - name: events
    type: websocket
    url: wss://events.example.com
    reconnect: true
```

---

## Automod

Automatic moderation rules.

```yaml
automod:
  enabled: true
  log_channel: "${env.MOD_LOG_CHANNEL}"
  rules:
    - name: spam
      type: spam
      threshold: 5
      window: 10s
      action: timeout
      duration: 5m

    - name: bad_words
      type: words
      words:
        - badword1
        - badword2
      action: delete
      warn: true
```

---

## Scheduler

Scheduled tasks and cron jobs.

```yaml
scheduler:
  enabled: true
  timezone: UTC
  tasks:
    - name: daily_backup
      cron: "0 0 * * *"  # Every day at midnight
      actions:
        - call_flow:
            flow: backup_data

    - name: hourly_stats
      interval: 1h
      actions:
        - record_metric:
            name: active_users
            type: gauge
            value: "${client.guilds.reduce((a, g) => a + g.memberCount, 0)}"
```

---

## Locale

Localization and i18n.

```yaml
locale:
  default: en-US
  fallback: en
  directory: ./locales
```

---

## Canvas

Image generation with node-canvas.

```yaml
canvas:
  enabled: true
  fonts_dir: ./fonts
  generators:
    welcome_card:
      width: 800
      height: 300
      layers:
        - type: image
          src: ./assets/bg.png
        - type: text
          text: "Welcome, ${member.display_name}!"
          font: "32px Bold"
          color: white
          x: 400
          y: 150
          align: center
```

---

## Analytics

Metrics and monitoring.

```yaml
analytics:
  enabled: true
  prometheus:
    enabled: true
    port: 9090
    path: /metrics
```

---

## Dashboard

Web dashboard configuration.

```yaml
dashboard:
  enabled: true
  port: 3000
  host: localhost
  auth:
    discord:
      client_id: "${env.DISCORD_CLIENT_ID}"
      client_secret: "${env.DISCORD_CLIENT_SECRET}"
```

---

## Errors

Error handling configuration.

```yaml
errors:
  log_errors: true
  default_handler: error_flow
  handlers:
    ValidationError:
      actions:
        - reply:
            content: "Invalid input: ${error.message}"
            ephemeral: true
    PermissionError:
      actions:
        - reply:
            content: "You don't have permission to do that."
            ephemeral: true
```

---

## Imports

Import external files to split large specifications.

```yaml
# main.furlow.yaml
imports:
  - commands/*.yaml
  - events/*.yaml
  - flows/moderation.yaml
```

```yaml
# commands/utility.yaml
commands:
  - name: ping
    description: Check latency
    actions:
      - reply:
          content: "Pong!"
```

---

## Expression Syntax

Expressions are used throughout the spec for dynamic values.

```yaml
# Simple variable access
content: "${user.username}"

# Transforms (pipes)
content: "${message.content | uppercase}"

# Conditionals
content: "${options.message || 'Default message'}"

# Complex expressions
content: "${members | filter(m => m.roles.has(adminRole)) | length} admins online"
```

See [Expression Language](../expression-language.md) for full documentation.

---

## Environment Variables

Access environment variables with `${env.VAR_NAME}`:

```yaml
identity:
  name: "${env.BOT_NAME}"

pipes:
  - name: api
    url: "${env.API_URL}"
    auth:
      token: "${env.API_TOKEN}"
```

Always use environment variables for:
- Bot tokens
- API keys
- Database credentials
- Webhook secrets
