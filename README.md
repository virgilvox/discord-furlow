# FURLOW — Flexible User Rules for Live Online Workers

### Specification v0.1.0-draft

> A declarative YAML schema for defining everything a Discord bot can be, without writing code.

---

> **Note:** This document serves as both **documentation** for implemented features and a **specification** for planned features.
>
> **Status Legend:**
> - ✅ **Implemented** — Feature is fully working
> - ⚠️ **Partial** — Core functionality works, some advanced features pending
> - 🚧 **Planned** — Designed but not yet implemented
> - ❌ **Not Started** — Specification only, no implementation
>
> See [docs/llm-reference.md](./docs/llm-reference.md) for a complete reference of currently implemented features.

---

## Table of Contents

| Section | Status |
|---------|--------|
| 1. [Philosophy](#1-philosophy-) | ✅ |
| 2. [File Structure](#2-file-structure-) | ✅ |
| 3. [Identity & Presence](#3-identity--presence-) | ✅ |
| 4. [Intents & Gateway](#4-intents--gateway-) | ✅ |
| 5. [Permissions & Access Control](#5-permissions--access-control-) | ⚠️ |
| 6. [State & Storage](#6-state--storage-) | ✅ |
| 7. [Expression Language](#7-expression-language-) | ✅ |
| 8. [Actions](#8-actions-) | ✅ |
| 9. [Commands](#9-commands-) | ✅ |
| 10. [Events](#10-events-) | ✅ |
| 11. [Flows & Logic](#11-flows--logic-) | ✅ |
| 12. [UI Components](#12-ui-components-) | ✅ |
| 13. [Embeds & Theming](#13-embeds--theming-) | ⚠️ |
| 14. [Voice & Audio](#14-voice--audio-) | ⚠️ |
| 15. [Video & Streaming](#15-video--streaming-) | ❌ |
| 16. [Data Pipes & Integrations](#16-data-pipes--integrations-) | ⚠️ |
| 17. [Automod](#17-automod-) | 🚧 |
| 18. [Scheduler](#18-scheduler-) | ✅ |
| 19. [Localization](#19-localization-) | ⚠️ |
| 20. [Error Handling](#20-error-handling-) | ✅ |
| 21. [Analytics & Metrics](#21-analytics--metrics-) | ⚠️ |
| 22. [Dashboard & Web UI](#22-dashboard--web-ui-) | ⚠️ |
| 23. [Built-in Component Library](#23-built-in-component-library-) | ✅ |
| 24. [Full Example](#24-full-example-) | ✅ |

---

## 1. Philosophy ✅

FURLOW defines a bot as a structured document — a single source of truth that any compliant runtime can execute. The spec has three core principles:

- **Declarative over imperative.** You describe *what* the bot does, not *how*. The runtime handles the wiring.
- **Composable from universal primitives.** Every bot behavior maps to a finite set of Discord API capabilities. FURLOW names them all and lets you combine them freely.
- **Config is the program.** The YAML file (or set of files) IS the bot. No code files, no build step. If you need escape hatches for custom logic, FURLOW provides sandboxed expression evaluation and external pipe connections — not inline code blocks.

A conformant FURLOW runtime reads the spec, registers with the Discord gateway, and executes the declared behavior. The runtime is interchangeable. The spec is portable.

---

## 2. File Structure ✅

A FURLOW bot can be a single file or a directory.

### Single file

```
my-bot.furlow.yaml
```

### Directory (recommended for complex bots)

```
my-bot/
├── furlow.yaml              # root config — identity, intents, permissions, state
├── commands/              # one file per command or command group
│   ├── moderation.yaml
│   ├── fun.yaml
│   └── admin.yaml
├── events/                # one file per event or event group
│   ├── member-lifecycle.yaml
│   └── message-tracking.yaml
├── flows/                 # reusable flow definitions
│   ├── onboarding.yaml
│   └── ticket-create.yaml
├── components/            # reusable UI component definitions
│   ├── embeds.yaml
│   └── modals.yaml
├── pipes/                 # external integrations
│   ├── twitch.yaml
│   └── github.yaml
├── automod/
│   └── rules.yaml
├── scheduler/
│   └── jobs.yaml
├── locale/                # i18n strings
│   ├── en.yaml
│   └── es.yaml
├── theme/                 # embed themes, custom dashboard UI
│   ├── theme.yaml
│   ├── dashboard/         # custom HTML/CSS/JS for web dashboard
│   │   ├── index.html
│   │   ├── style.css
│   │   └── app.js
│   └── assets/
│       ├── avatar.png
│       └── banner.png
└── .env                   # secrets — tokens, API keys (never in YAML)
```

### Imports

Any YAML file can import others:

```yaml
imports:
  - ./commands/moderation.yaml
  - ./events/member-lifecycle.yaml
  - ./flows/onboarding.yaml
```

### Environment Variables

Secrets are NEVER in the YAML. Reference them with `$env.VARIABLE_NAME`:

```yaml
token: $env.DISCORD_TOKEN
pipes:
  openai:
    api_key: $env.OPENAI_API_KEY
```

---

## 3. Identity & Presence ✅

```yaml
identity:
  name: "JUNKBOT"
  avatar: ./assets/avatar.png        # local path or URL
  banner: ./assets/banner.png        # profile banner
  about: "A punk-rock utility bot"   # bio / about me text

presence:
  status: online                     # online | idle | dnd | invisible
  activity:
    type: watching                   # playing | streaming | listening | watching | competing | custom
    text: "the void"
    url: https://twitch.tv/channel   # required only for type: streaming
    state: "vibing"                  # custom activity state text
  
  # presence can be dynamic — change based on conditions
  dynamic:
    - when: "${guild_count} > 100"
      activity:
        type: watching
        text: "${guild_count} servers"
    - when: "${voice.active}"
      activity:
        type: listening
        text: "audio in ${voice.channel.name}"
    - default:
        activity:
          type: playing
          text: "with volts"
```

---

## 4. Intents & Gateway ✅

Intents declare what gateway events the bot subscribes to. The runtime should auto-calculate required intents from the events/commands you define, but you can also declare them explicitly.

```yaml
intents:
  auto: true    # infer from declared events (recommended)
  
  # or explicit:
  explicit:
    - guilds
    - guild_members              # privileged
    - guild_moderation           # ban events
    - guild_emojis_and_stickers
    - guild_integrations
    - guild_webhooks
    - guild_invites
    - guild_voice_states
    - guild_presences            # privileged
    - guild_messages
    - guild_message_reactions
    - guild_message_typing
    - direct_messages
    - direct_message_reactions
    - direct_message_typing
    - message_content            # privileged
    - guild_scheduled_events
    - auto_moderation_configuration
    - auto_moderation_execution

gateway:
  sharding:
    enabled: false
    shard_count: auto            # auto or explicit number
  compression: zlib-stream       # zlib-stream | none
  large_threshold: 250           # member count threshold for "large" guilds
  reconnect:
    max_retries: 10
    backoff: exponential         # exponential | linear | fixed
    base_delay: 1s
    max_delay: 60s
```

---

## 5. Permissions & Access Control ⚠️

### 5.1 OAuth2 Scopes

```yaml
oauth2:
  scopes:
    - bot
    - applications.commands
    - guilds                     # for dashboard guild list
    - guilds.members.read        # for dashboard member info
    - voice                      # for voice connections
    - webhook.incoming           # if bot creates webhooks
```

### 5.2 Bot Permission Bitfield

Every Discord permission the bot needs. The runtime generates the OAuth2 invite URL from this.

```yaml
bot_permissions:
  general:
    - view_channels
    - manage_channels
    - manage_roles
    - manage_emojis_and_stickers
    - view_audit_log
    - manage_webhooks
    - manage_guild
    - create_expressions
  
  membership:
    - kick_members
    - ban_members
    - moderate_members            # timeout
    - manage_nicknames
    - create_invite
  
  text:
    - send_messages
    - send_messages_in_threads
    - create_public_threads
    - create_private_threads
    - manage_threads
    - manage_messages
    - embed_links
    - attach_files
    - read_message_history
    - mention_everyone
    - use_external_emojis
    - use_external_stickers
    - add_reactions
    - use_slash_commands
    - send_tts_messages
    - send_voice_messages
  
  voice:
    - connect
    - speak
    - mute_members
    - deafen_members
    - move_members
    - use_voice_activity
    - priority_speaker
    - stream
    - use_embedded_activities
    - use_soundboard
    - use_external_sounds
  
  stage:
    - request_to_speak
  
  events:
    - manage_events
    - create_events
```

### 5.3 Role-Based Access Control (RBAC)

Define named permission groups that map to Discord roles, user IDs, or Discord permission flags. Commands and actions reference these by name.

```yaml
access:
  roles:
    owner:
      # the bot owner — full control
      user_ids:
        - $env.OWNER_ID
      grant_all: true
    
    admin:
      discord_permissions: [administrator]
      discord_roles: ["Admin", "Server Owner"]
      inherits: [owner]
    
    moderator:
      discord_permissions: [manage_messages, kick_members]
      discord_roles: ["Moderator", "Staff", "Mod"]
      inherits: [admin]
    
    dj:
      discord_roles: ["DJ", "Music Master"]
    
    trusted:
      discord_roles: ["Trusted", "Verified", "Regular"]
      min_account_age: 30d           # account must be 30 days old
      min_guild_age: 7d              # must have been in server 7 days
    
    everyone:
      default: true                   # catch-all for any user

  # channel-level overrides
  channel_overrides:
    "#bot-commands":
      allow: [everyone]               # everyone can use commands here
    "#admin-only":
      allow: [admin]
      deny: [everyone]

  # global cooldowns
  rate_limits:
    default:
      per_user: 3/10s                 # 3 uses per 10 seconds
      per_channel: 10/10s
      per_guild: 30/10s
    
    named:
      heavy_command:
        per_user: 1/60s
        per_guild: 5/60s
```

---

## 6. State & Storage ✅

FURLOW bots can store persistent and ephemeral state. The runtime provides the storage backend — the spec only defines the schema.

### 6.1 Variables

```yaml
state:
  variables:
    # scopes: global, guild, channel, user, member (user+guild combo)
    
    welcome_enabled:
      type: boolean
      default: true
      scope: guild
      configurable: true              # editable via dashboard or /config command
      description: "Enable welcome messages"
    
    welcome_channel:
      type: channel
      default: null
      scope: guild
      configurable: true
    
    user_xp:
      type: number
      default: 0
      scope: member                   # per-user-per-guild
    
    user_level:
      type: number
      default: 1
      scope: member
    
    total_commands_run:
      type: number
      default: 0
      scope: global
    
    user_timezone:
      type: string
      default: "UTC"
      scope: user                     # follows user across guilds
    
    afk_status:
      type: object
      default: null
      scope: member
      schema:
        message: string
        since: datetime
    
    # lists and maps
    custom_tags:
      type: map
      key_type: string
      value_type: string
      scope: guild
      max_entries: 500
    
    role_persist_list:
      type: list
      item_type: role
      scope: member
```

### 6.2 Tables (Structured Storage)

For relational-style data. The runtime maps this to SQLite, Postgres, or whatever backend it uses.

```yaml
  tables:
    warnings:
      columns:
        id:
          type: auto_id
        user_id:
          type: snowflake
          index: true
        guild_id:
          type: snowflake
          index: true
        reason:
          type: string
          max_length: 1000
        severity:
          type: enum
          values: [low, medium, high, critical]
        issued_by:
          type: snowflake
        issued_at:
          type: datetime
          default: now()
        expires_at:
          type: datetime
          nullable: true
        active:
          type: boolean
          default: true
      
      indexes:
        - columns: [user_id, guild_id]
          name: user_guild_idx
      
      retention:
        max_age: 365d                  # auto-delete after 1 year
        max_rows_per_guild: 10000
    
    tickets:
      columns:
        id:
          type: auto_id
        guild_id:
          type: snowflake
        channel_id:
          type: snowflake
        opened_by:
          type: snowflake
        assigned_to:
          type: snowflake
          nullable: true
        status:
          type: enum
          values: [open, in_progress, waiting, resolved, closed]
          default: open
        category:
          type: string
        priority:
          type: enum
          values: [low, normal, high, urgent]
          default: normal
        subject:
          type: string
        opened_at:
          type: datetime
          default: now()
        closed_at:
          type: datetime
          nullable: true
        transcript_url:
          type: string
          nullable: true
    
    # key-value store for arbitrary data
    kv_store:
      columns:
        key:
          type: string
          primary: true
        value:
          type: json
        scope:
          type: string
        scope_id:
          type: snowflake
        expires_at:
          type: datetime
          nullable: true

  # in-memory caches (ephemeral, lost on restart)
  caches:
    recent_messages:
      max_size: 1000
      ttl: 5m
      scope: channel
    
    spam_scores:
      max_size: 10000
      ttl: 30s
      scope: member
```

---

## 7. Expression Language ✅

FURLOW uses a sandboxed expression language for dynamic values within YAML. Expressions are wrapped in `${}`.

### 7.1 Contexts

Expressions have access to specific context objects depending on where they appear:

| Context | Available In | Contains |
|---|---|---|
| `event` | event handlers | full event payload from Discord gateway |
| `options` | command handlers | parsed slash command options |
| `user` | everywhere with a user context | user object (id, name, discriminator, avatar, etc.) |
| `member` | guild contexts | guild member (nick, roles, joined_at, etc.) |
| `guild` | guild contexts | guild object (name, id, member_count, etc.) |
| `channel` | channel contexts | channel object (name, id, type, topic, etc.) |
| `message` | message contexts | message object (content, embeds, attachments, etc.) |
| `bot` | everywhere | bot user, latency, uptime, guild_count, etc. |
| `state` | everywhere | access to all declared state variables |
| `args` | flows called with arguments | named arguments passed to a flow |
| `pipe` | pipe handlers | incoming pipe data payload |
| `voice` | voice contexts | current voice state, connection info |
| `env` | everywhere | environment variables |
| `locale` | everywhere | current locale strings |

### 7.2 Syntax

```yaml
# simple property access
"${user.name}"
"${guild.member_count}"
"${options.target_user.id}"

# nested access
"${event.member.roles[0].name}"

# string interpolation
"Welcome ${member.display_name} to ${guild.name}!"

# math
"${user_xp + 10}"
"${(user_level * 100) + 50}"

# comparisons (return boolean — used in conditions)
"${user_xp >= 1000}"
"${member.roles.includes('Moderator')}"
"${message.content.length > 2000}"

# ternary
"${user_level >= 10 ? 'Veteran' : 'Newcomer'}"

# string methods
"${message.content.toLowerCase()}"
"${user.name.slice(0, 20)}"

# array methods
"${member.roles.filter(r => r.name != '@everyone').length}"
"${warnings.count(w => w.active)}"

# built-in functions
"${now()}"                              # current datetime
"${timestamp(event.created_at, 'R')}"   # Discord timestamp format (relative)
"${timestamp(now(), 'F')}"              # full date/time
"${random(1, 100)}"                     # random integer
"${random_choice(['a', 'b', 'c'])}"     # random pick from array
"${format_number(1234567)}"             # "1,234,567"
"${format_duration(3661)}"              # "1h 1m 1s"
"${pluralize(count, 'warning')}"        # "1 warning" / "3 warnings"
"${truncate(text, 100)}"               # truncate with ellipsis
"${hash(user.id)}"                      # deterministic hash
"${color_from_role(member)}"            # dominant role color
"${snowflake_time(message.id)}"         # extract timestamp from snowflake
"${levenshtein(a, b)}"                  # string distance
"${regex_match(text, pattern)}"         # regex
"${regex_replace(text, pattern, rep)}"
"${json_path(object, '$.key.nested')}"
"${url_encode(text)}"
"${base64_encode(text)}"
"${md5(text)}"
"${sha256(text)}"

# database queries
"${db.warnings.count({ user_id: user.id, guild_id: guild.id, active: true })}"
"${db.warnings.find({ user_id: user.id }).order_by('issued_at', 'desc').limit(5)}"
"${db.tickets.get(ticket_id)}"

# state access
"${state.get('welcome_enabled')}"       # guild-scoped auto-detected
"${state.get('user_xp', member)}"       # explicit scope target
"${state.get('custom_tags').get(tag_name)}"

# list building
"${[1, 2, 3].map(n => n * 2)}"
"${guild.roles.sort_by('position', 'desc').slice(0, 10)}"
```

### 7.3 Template Blocks

For multi-line dynamic content:

```yaml
content: |
  **Welcome to ${guild.name}!** 🎉
  
  You are member #${guild.member_count}.
  
  ${if(rules_channel, 'Please read the rules in ' + rules_channel.mention, '')}
  
  ${if(user.avatar, '', '⚠️ Consider adding a profile picture!')}
```

---

## 8. Actions ✅

Actions are the atomic operations a bot performs. They are the verbs of FURLOW. Every event handler, command handler, and flow step consists of one or more actions.

### 8.1 Message Actions

```yaml
actions:
  # --- sending ---
  - send_message:
      channel: "#general"                  # channel name, ID, or expression
      content: "Hello world"
      embed: { ... }                        # see embed spec
      components: [ ... ]                   # buttons, selects, etc.
      files:
        - path: ./assets/welcome.png
        - url: "https://example.com/img.png"
        - buffer: "${generated_image}"        # from a pipe or process
      allowed_mentions:
        parse: [users]                       # users | roles | everyone
        users: ["${user.id}"]
        roles: []
      tts: false
      silent: false                          # suppress notifications
      sticker_ids: []
      reference: "${message.id}"             # reply to a message
      save_as: welcome_msg                   # save message reference for later use
  
  - reply:
      content: "Got it!"
      ephemeral: true                        # only visible to command user
      embed: { ... }
      components: [ ... ]
  
  - defer:
      ephemeral: false                       # show "bot is thinking..."
  
  - followup:                                # after a defer
      content: "Here are the results"
      ephemeral: false
  
  - edit_message:
      message: "${saved.welcome_msg}"        # reference to saved message
      content: "Updated content"
      embed: { ... }
  
  - delete_message:
      message: "${message.id}"
      delay: 5s                              # delete after delay
  
  - bulk_delete:
      channel: "${channel}"
      count: 50                              # delete last N messages
      filter:
        from_user: "${options.user.id}"      # optional: only from this user
        contains: "spam"                     # optional: containing text
        older_than: 14d                      # Discord limit: max 14 days
        newer_than: 1h
  
  - pin_message:
      message: "${message.id}"
  
  - unpin_message:
      message: "${message.id}"
  
  - crosspost:                               # publish announcement channel message
      message: "${message.id}"

  # --- reactions ---
  - add_reaction:
      message: "${message.id}"
      emoji: "✅"                            # unicode or custom emoji
  
  - add_reactions:                           # multiple at once
      message: "${message.id}"
      emojis: ["✅", "❌", "<:custom:123456>"]
  
  - remove_reaction:
      message: "${message.id}"
      emoji: "✅"
      user: "${user.id}"                     # omit for bot's own reaction
  
  - clear_reactions:
      message: "${message.id}"
      emoji: "✅"                            # specific emoji, or omit for all
```

### 8.2 Member Actions

```yaml
  - assign_role:
      user: "${member}"
      role: "Verified"                       # role name or ID
      reason: "Auto-verified"
  
  - remove_role:
      user: "${member}"
      role: "Unverified"
  
  - toggle_role:
      user: "${member}"
      role: "Notifications"
  
  - set_nickname:
      user: "${member}"
      nickname: "[${user_level}] ${user.name}"
  
  - kick:
      user: "${options.user}"
      reason: "${options.reason}"
  
  - ban:
      user: "${options.user}"
      reason: "${options.reason}"
      delete_messages: 7d                    # delete message history (0-7 days)
  
  - unban:
      user_id: "${options.user_id}"
      reason: "Appeal accepted"
  
  - timeout:                                 # Discord timeout / mute
      user: "${member}"
      duration: 10m                          # up to 28 days
      reason: "Spam"
  
  - remove_timeout:
      user: "${member}"
  
  - send_dm:
      to: "${member}"
      content: "You've been warned."
      embed: { ... }
      fallback_channel: "#mod-log"           # if DMs are closed, post here instead
      on_fail: ignore                        # ignore | log | fallback
  
  - move_member:                             # move between voice channels
      user: "${member}"
      channel: "#voice-timeout"
  
  - disconnect_member:                       # disconnect from voice
      user: "${member}"
  
  - server_mute:
      user: "${member}"
      muted: true
  
  - server_deafen:
      user: "${member}"
      deafened: true
```

### 8.3 Channel Actions

```yaml
  - create_channel:
      name: "ticket-${user.name}"
      type: text                             # text | voice | category | stage | forum | announcement | directory
      category: "Tickets"
      topic: "Support ticket for ${user.name}"
      position: 0
      nsfw: false
      slowmode: 5s                           # 0-6h
      bitrate: 64000                         # voice only
      user_limit: 10                         # voice only
      permission_overwrites:
        - target: "${member}"
          type: member
          allow: [view_channel, send_messages, attach_files, read_message_history]
        - target: "@everyone"
          type: role
          deny: [view_channel]
        - target: "Support Staff"
          type: role
          allow: [view_channel, send_messages, manage_messages]
      save_as: ticket_channel
  
  - edit_channel:
      channel: "${channel}"
      name: "resolved-${ticket_id}"
      topic: "RESOLVED — ${resolution}"
      archived: false
      locked: false
      slowmode: 0s
  
  - delete_channel:
      channel: "${ticket_channel}"
      delay: 10s
      reason: "Ticket closed"
  
  - create_thread:
      channel: "${channel}"
      name: "Discussion: ${topic}"
      type: public                           # public | private
      auto_archive: 1440m                    # 60 | 1440 | 4320 | 10080 minutes
      slowmode: 0s
      message: "${message.id}"               # create thread from message (optional)
      save_as: discussion_thread
  
  - archive_thread:
      thread: "${thread}"
      locked: true
  
  - set_channel_permissions:
      channel: "${channel}"
      target: "Muted"
      type: role
      deny: [send_messages, add_reactions, speak]
  
  - create_invite:
      channel: "${channel}"
      max_age: 86400                         # seconds, 0 = never
      max_uses: 1                            # 0 = unlimited
      unique: true
      temporary: false
      save_as: invite_link
```

### 8.4 Guild Actions

```yaml
  - create_role:
      name: "Level ${level}"
      color: "${level_color}"
      hoist: false                           # show separately in member list
      mentionable: false
      position: 10
      permissions: [send_messages, view_channels]
      icon: ./assets/level-icon.png          # role icon (boost level 2+)
      save_as: new_role
  
  - edit_role:
      role: "Muted"
      permissions:
        deny: [send_messages, speak, add_reactions]
  
  - delete_role:
      role: "${role}"
  
  - create_emoji:
      name: "bot_check"
      image: ./assets/check.png              # max 256kb, 128x128
      roles: ["Boosters"]                    # restrict to roles (optional)
  
  - create_sticker:
      name: "wave"
      description: "A friendly wave"
      tags: "wave,hello,hi"
      file: ./assets/wave.png
  
  - create_scheduled_event:
      name: "Movie Night"
      description: "Weekly movie night!"
      start_time: "${next_friday_8pm}"
      end_time: "${next_friday_11pm}"
      entity_type: voice                     # stage | voice | external
      channel: "#movie-theater"
      # for external:
      # location: "https://watch2gether.com/room123"
      image: ./assets/movie-night.png
      save_as: movie_event
```

### 8.5 State Actions

```yaml
  - set:
      variable: user_xp
      value: "${user_xp + 15}"
      scope: member
      target: "${member}"
  
  - increment:
      variable: user_xp
      amount: 15
      scope: member
  
  - decrement:
      variable: warning_count
      amount: 1
      scope: member
  
  - set_map:
      variable: custom_tags
      key: "${options.tag_name}"
      value: "${options.tag_content}"
  
  - delete_map:
      variable: custom_tags
      key: "${options.tag_name}"
  
  - list_push:
      variable: role_persist_list
      value: "${role.id}"
  
  - list_remove:
      variable: role_persist_list
      value: "${role.id}"
  
  - db_insert:
      table: warnings
      data:
        user_id: "${options.user.id}"
        guild_id: "${guild.id}"
        reason: "${options.reason}"
        severity: "${options.severity ?? 'medium'}"
        issued_by: "${user.id}"
  
  - db_update:
      table: warnings
      where:
        id: "${warning_id}"
      set:
        active: false
  
  - db_delete:
      table: warnings
      where:
        id: "${warning_id}"
  
  - db_query:
      table: warnings
      where:
        user_id: "${options.user.id}"
        guild_id: "${guild.id}"
        active: true
      order_by:
        issued_at: desc
      limit: 10
      save_as: user_warnings
  
  - cache_set:
      cache: recent_messages
      key: "${message.id}"
      value:
        author_id: "${message.author.id}"
        content: "${message.content}"
        timestamp: "${now()}"
  
  - cache_get:
      cache: recent_messages
      key: "${message.id}"
      save_as: cached_msg
  
  - cache_delete:
      cache: recent_messages
      key: "${message.id}"
```

### 8.6 Flow Control Actions

```yaml
  - wait:
      duration: 3s
  
  - log:
      level: info                            # debug | info | warn | error
      message: "User ${user.name} triggered ${command.name}"
  
  - emit:                                    # trigger a custom event
      event: custom.xp_level_up
      data:
        user_id: "${user.id}"
        old_level: "${old_level}"
        new_level: "${new_level}"
  
  - call_flow:                               # call a named reusable flow
      flow: onboarding
      args:
        member: "${member}"
        channel: "${channel}"
      save_as: flow_result
  
  - abort:                                   # stop the current action chain
      reason: "Precondition failed"
  
  - parallel:                                # run actions concurrently
      actions:
        - send_message: { ... }
        - send_dm: { ... }
        - db_insert: { ... }
  
  - batch:                                   # execute on a collection
      each: "${member.roles}"
      as: role
      actions:
        - log:
            message: "Role: ${role.name}"
```

---

## 9. Commands ✅

### 9.1 Slash Commands

```yaml
commands:
  - name: ping
    description: "Check bot latency"
    permissions: [everyone]
    rate_limit: default
    actions:
      - reply:
          content: "🏓 Pong! **${bot.latency}ms**"
          ephemeral: true
  
  - name: warn
    description: "Issue a warning to a user"
    permissions: [moderator]
    dm_permission: false                     # can't use in DMs
    nsfw: false
    options:
      - name: user
        description: "User to warn"
        type: user
        required: true
      - name: reason
        description: "Reason for warning"
        type: string
        required: true
        min_length: 5
        max_length: 500
      - name: severity
        description: "Warning severity"
        type: string
        required: false
        choices:
          - name: Low
            value: low
          - name: Medium
            value: medium
          - name: High
            value: high
          - name: Critical
            value: critical
    actions:
      - call_flow:
          flow: issue_warning
          args:
            target: "${options.user}"
            reason: "${options.reason}"
            severity: "${options.severity ?? 'medium'}"
            issuer: "${user}"
```

### 9.2 Subcommand Groups

```yaml
  - name: config
    description: "Bot configuration"
    permissions: [admin]
    subcommand_groups:
      - name: welcome
        description: "Welcome message settings"
        subcommands:
          - name: enable
            description: "Enable welcome messages"
            actions:
              - set:
                  variable: welcome_enabled
                  value: true
              - reply:
                  content: "✅ Welcome messages enabled"
                  ephemeral: true
          
          - name: disable
            description: "Disable welcome messages"
            actions:
              - set:
                  variable: welcome_enabled
                  value: false
              - reply:
                  content: "❌ Welcome messages disabled"
                  ephemeral: true
          
          - name: channel
            description: "Set the welcome channel"
            options:
              - name: channel
                type: channel
                channel_types: [text, announcement]
                required: true
            actions:
              - set:
                  variable: welcome_channel
                  value: "${options.channel.id}"
              - reply:
                  content: "Welcome channel set to ${options.channel.mention}"
                  ephemeral: true
          
          - name: message
            description: "Set the welcome message template"
            options:
              - name: message
                type: string
                required: true
                max_length: 2000
            actions:
              - set:
                  variable: welcome_message_template
                  value: "${options.message}"
              - reply:
                  content: "Welcome message updated!"
                  ephemeral: true
      
      - name: automod
        description: "Automod settings"
        subcommands:
          - name: spam_threshold
            description: "Set spam detection threshold"
            options:
              - name: messages
                description: "Messages per interval"
                type: integer
                required: true
                min_value: 2
                max_value: 20
              - name: interval
                description: "Interval in seconds"
                type: integer
                required: true
                min_value: 1
                max_value: 60
            actions:
              - set:
                  variable: spam_threshold_count
                  value: "${options.messages}"
              - set:
                  variable: spam_threshold_interval
                  value: "${options.interval}"
              - reply:
                  content: "Spam threshold: ${options.messages} messages per ${options.interval}s"
                  ephemeral: true
```

### 9.3 Context Menu Commands

```yaml
  # right-click on a user
  - name: "Report User"
    type: user_context_menu
    permissions: [everyone]
    actions:
      - show_modal:
          modal: report_modal
          data:
            target_id: "${target_user.id}"
            target_name: "${target_user.name}"
  
  # right-click on a message
  - name: "Translate"
    type: message_context_menu
    permissions: [everyone]
    actions:
      - defer:
          ephemeral: true
      - pipe_request:
          pipe: translation_api
          data:
            text: "${target_message.content}"
            target_lang: "${state.get('user_lang') ?? 'en'}"
          save_as: translation
      - followup:
          content: "**Translation:** ${translation.text}"
          ephemeral: true
  
  # right-click on a message
  - name: "Pin to Starboard"
    type: message_context_menu
    permissions: [moderator]
    actions:
      - call_flow:
          flow: add_to_starboard
          args:
            message: "${target_message}"
            pinned_by: "${user}"
```

### 9.4 Autocomplete

```yaml
  - name: tag
    description: "Retrieve a saved tag"
    options:
      - name: name
        description: "Tag name"
        type: string
        required: true
        autocomplete:
          source: state                      # state | table | pipe | static
          variable: custom_tags              # for source: state
          # for source: table:
          # table: tags
          # column: name
          # filter:
          #   guild_id: "${guild.id}"
          max_results: 25
          fuzzy: true                        # fuzzy match
    actions:
      - reply:
          content: "${state.get('custom_tags').get(options.name) ?? 'Tag not found.'}"
```

### 9.5 Option Types Reference

| Type | YAML Value | Description |
|---|---|---|
| String | `string` | Text input |
| Integer | `integer` | Whole number (-2^53 to 2^53) |
| Boolean | `boolean` | True/False |
| User | `user` | User picker |
| Channel | `channel` | Channel picker (filterable by `channel_types`) |
| Role | `role` | Role picker |
| Mentionable | `mentionable` | User or Role picker |
| Number | `number` | Decimal number |
| Attachment | `attachment` | File upload |

Channel types for filtering: `text`, `voice`, `category`, `announcement`, `stage`, `forum`, `thread`, `directory`

---

## 10. Events ✅

Every Discord gateway event can be handled. Each handler is a list of actions (with optional conditions).

### 10.1 Member Events

```yaml
events:
  member_join:
    - name: welcome_message
      when: "${state.get('welcome_enabled')}"
      actions:
        - send_message:
            channel: "${state.get('welcome_channel') ?? '#welcome'}"
            content: "${state.get('welcome_message_template')}"
            embed:
              use_template: welcome_embed
              data:
                member: "${member}"
        - assign_role:
            user: "${member}"
            role: "Member"
    
    - name: account_age_check
      when: "${member.user.created_at > now() - duration('7d')}"
      actions:
        - send_message:
            channel: "#mod-alerts"
            embed:
              title: "⚠️ New Account Alert"
              color: "#ff6600"
              description: "${member.mention} just joined. Account created ${timestamp(member.user.created_at, 'R')}."
    
    - name: role_persist
      when: "${state.get('role_persist_list', member).length > 0}"
      actions:
        - batch:
            each: "${state.get('role_persist_list', member)}"
            as: role_id
            actions:
              - assign_role:
                  user: "${member}"
                  role: "${role_id}"
  
  member_leave:
    - name: farewell
      when: "${state.get('farewell_enabled')}"
      actions:
        - send_message:
            channel: "${state.get('farewell_channel')}"
            content: "**${member.display_name}** has left. We had ${guild.member_count} members, now we have... fewer."
    
    - name: persist_roles
      actions:
        - set:
            variable: role_persist_list
            value: "${member.roles.map(r => r.id)}"
            scope: member
  
  member_update:
    - name: boost_detection
      when: "${!event.old_member.premium_since && event.new_member.premium_since}"
      actions:
        - send_message:
            channel: "#boosts"
            content: "🎉 **${member.display_name}** just boosted the server!"
        - assign_role:
            user: "${member}"
            role: "Booster Perks"
    
    - name: role_change_log
      when: "${event.old_member.roles.length != event.new_member.roles.length}"
      actions:
        - send_message:
            channel: "#audit-log"
            embed:
              title: "Role Update"
              fields:
                - name: "User"
                  value: "${member.mention}"
                - name: "Added"
                  value: "${event.added_roles.map(r => r.name).join(', ') || 'None'}"
                - name: "Removed"
                  value: "${event.removed_roles.map(r => r.name).join(', ') || 'None'}"
```

### 10.2 Message Events

```yaml
  message_create:
    - name: xp_gain
      when: "${!message.author.bot && message.content.length >= 5}"
      rate_limit:
        per_user: 1/60s                      # max 1 XP gain per minute per user
      actions:
        - increment:
            variable: user_xp
            amount: "${random(5, 15)}"
            scope: member
        - call_flow:
            flow: check_level_up
            args:
              member: "${member}"
    
    - name: afk_mention_notify
      when: "${message.mentions.length > 0}"
      actions:
        - batch:
            each: "${message.mentions}"
            as: mentioned
            actions:
              - flow_if:
                  condition: "${state.get('afk_status', mentioned) != null}"
                  then:
                    - reply:
                        content: "💤 **${mentioned.display_name}** is AFK: ${state.get('afk_status', mentioned).message} (since ${timestamp(state.get('afk_status', mentioned).since, 'R')})"
    
    - name: auto_response_triggers
      when: "${!message.author.bot}"
      actions:
        - call_flow:
            flow: check_auto_responses
            args:
              message: "${message}"
  
  message_delete:
    - name: snipe_log
      actions:
        - cache_set:
            cache: deleted_messages
            key: "${message.channel.id}"
            value:
              content: "${message.content}"
              author: "${message.author.name}"
              avatar: "${message.author.avatar_url}"
              timestamp: "${now()}"
              attachments: "${message.attachments}"
    
    - name: mod_log_delete
      when: "${!message.author.bot}"
      actions:
        - send_message:
            channel: "#message-log"
            embed:
              title: "Message Deleted"
              color: "#ff4444"
              fields:
                - name: "Author"
                  value: "${message.author.mention} (${message.author.id})"
                - name: "Channel"
                  value: "${message.channel.mention}"
                - name: "Content"
                  value: "${truncate(message.content, 1024) || '*empty*'}"
              footer:
                text: "Message ID: ${message.id}"
              timestamp: "${now()}"
  
  message_update:
    - name: edit_log
      when: "${event.old_message.content != event.new_message.content}"
      actions:
        - send_message:
            channel: "#message-log"
            embed:
              title: "Message Edited"
              color: "#ffaa00"
              fields:
                - name: "Before"
                  value: "${truncate(event.old_message.content, 1024)}"
                - name: "After"
                  value: "${truncate(event.new_message.content, 1024)}"
                - name: "Author"
                  value: "${message.author.mention}"
                - name: "Channel"
                  value: "${message.channel.mention} — [Jump](${message.url})"
```

### 10.3 Reaction Events

```yaml
  reaction_add:
    - name: starboard
      when: "${reaction.emoji.name == '⭐' && !message.author.bot}"
      actions:
        - call_flow:
            flow: starboard_check
            args:
              message: "${message}"
              reaction: "${reaction}"
    
    - name: reaction_roles
      when: "${state.get('reaction_role_messages').includes(message.id)}"
      actions:
        - call_flow:
            flow: handle_reaction_role
            args:
              message_id: "${message.id}"
              emoji: "${reaction.emoji}"
              member: "${member}"
              action: add
  
  reaction_remove:
    - name: reaction_roles_remove
      when: "${state.get('reaction_role_messages').includes(message.id)}"
      actions:
        - call_flow:
            flow: handle_reaction_role
            args:
              message_id: "${message.id}"
              emoji: "${reaction.emoji}"
              member: "${member}"
              action: remove
```

### 10.4 Voice Events

```yaml
  voice_state_update:
    - name: auto_voice_create
      when: "${event.new_state.channel_id == state.get('voice_creator_channel') && !event.old_state.channel_id}"
      actions:
        - create_channel:
            name: "${member.display_name}'s Channel"
            type: voice
            category: "${event.new_state.channel.parent}"
            user_limit: 0
            permission_overwrites:
              - target: "${member}"
                type: member
                allow: [manage_channels, move_members, manage_roles]
            save_as: new_vc
        - move_member:
            user: "${member}"
            channel: "${new_vc}"
        - set_map:
            variable: auto_voice_channels
            key: "${new_vc.id}"
            value: "${member.id}"
    
    - name: auto_voice_cleanup
      when: "${state.get('auto_voice_channels').has(event.old_state.channel_id) && event.old_state.channel.members.length == 0}"
      actions:
        - delete_channel:
            channel: "${event.old_state.channel_id}"
            delay: 5s
        - delete_map:
            variable: auto_voice_channels
            key: "${event.old_state.channel_id}"
    
    - name: voice_log
      actions:
        - flow_switch:
            value: "${event.type}"
            cases:
              join:
                - send_message:
                    channel: "#voice-log"
                    content: "🔊 **${member.display_name}** joined **${event.new_state.channel.name}**"
              leave:
                - send_message:
                    channel: "#voice-log"
                    content: "🔇 **${member.display_name}** left **${event.old_state.channel.name}**"
              move:
                - send_message:
                    channel: "#voice-log"
                    content: "🔀 **${member.display_name}** moved from **${event.old_state.channel.name}** to **${event.new_state.channel.name}**"
```

### 10.5 Interaction Events (Component Callbacks)

```yaml
  button_click:
    - name: ticket_close
      when: "${interaction.custom_id.startsWith('ticket_close_')}"
      actions:
        - call_flow:
            flow: close_ticket
            args:
              channel: "${interaction.channel}"
              closed_by: "${interaction.user}"
    
    - name: role_toggle
      when: "${interaction.custom_id.startsWith('role_')}"
      actions:
        - toggle_role:
            user: "${interaction.member}"
            role: "${interaction.custom_id.replace('role_', '')}"
        - reply:
            content: "Role toggled!"
            ephemeral: true
  
  select_menu:
    - name: color_role_select
      when: "${interaction.custom_id == 'color_role_picker'}"
      actions:
        # remove all color roles first
        - batch:
            each: "${state.get('color_roles')}"
            as: color_role
            actions:
              - remove_role:
                  user: "${interaction.member}"
                  role: "${color_role}"
        # add selected
        - assign_role:
            user: "${interaction.member}"
            role: "${interaction.values[0]}"
        - reply:
            content: "Color updated!"
            ephemeral: true
  
  modal_submit:
    - name: report_submitted
      when: "${interaction.custom_id == 'report_modal'"
      actions:
        - send_message:
            channel: "#reports"
            embed:
              title: "📋 User Report"
              fields:
                - name: "Reported User"
                  value: "<@${interaction.data.target_id}>"
                - name: "Reporter"
                  value: "${interaction.user.mention}"
                - name: "Reason"
                  value: "${interaction.fields.get('reason')}"
                - name: "Evidence"
                  value: "${interaction.fields.get('evidence') || 'None provided'}"
            components:
              - action_row:
                  - button:
                      label: "Take Action"
                      style: danger
                      custom_id: "report_action_${interaction.data.target_id}"
        - reply:
            content: "Report submitted. Thank you."
            ephemeral: true
```

### 10.6 Guild Events

```yaml
  guild_create:                              # bot added to a server
    - name: setup
      actions:
        - log:
            message: "Joined guild: ${guild.name} (${guild.id})"
        - send_message:
            channel: "${guild.system_channel}"
            embed:
              title: "👋 Thanks for adding me!"
              description: "Run `/help` to get started."
  
  guild_ban_add:
    - name: ban_log
      actions:
        - send_message:
            channel: "#mod-log"
            embed:
              title: "🔨 User Banned"
              color: "#ff0000"
              fields:
                - name: "User"
                  value: "${event.user.name} (${event.user.id})"
  
  invite_create:
    - name: invite_tracking
      actions:
        - db_insert:
            table: invite_tracking
            data:
              code: "${event.invite.code}"
              inviter_id: "${event.invite.inviter.id}"
              channel_id: "${event.invite.channel.id}"
              uses: 0
              created_at: "${now()}"
  
  thread_create:
    - name: auto_join_threads
      actions:
        - join_thread:
            thread: "${event.thread}"
```

### 10.7 Custom Events

```yaml
  # custom events emitted via the `emit` action
  custom.xp_level_up:
    - name: level_up_announcement
      actions:
        - send_message:
            channel: "#level-ups"
            content: "🎉 **${member.display_name}** reached level **${event.data.new_level}**!"
        - call_flow:
            flow: assign_level_role
            args:
              member: "${member}"
              level: "${event.data.new_level}"
  
  custom.ticket_escalated:
    - name: notify_admins
      actions:
        - send_message:
            channel: "#admin-alerts"
            content: "@here Ticket escalated: ${event.data.ticket_subject}"
```

### 10.8 Full Event Reference

Every Discord gateway event FURLOW supports:

| Category | Events |
|---|---|
| **Guild** | `guild_create`, `guild_update`, `guild_delete`, `guild_available`, `guild_unavailable` |
| **Channel** | `channel_create`, `channel_update`, `channel_delete`, `channel_pins_update` |
| **Thread** | `thread_create`, `thread_update`, `thread_delete`, `thread_list_sync`, `thread_member_update`, `thread_members_update` |
| **Member** | `member_join`, `member_leave`, `member_update`, `member_chunk` |
| **Role** | `role_create`, `role_update`, `role_delete` |
| **Ban** | `guild_ban_add`, `guild_ban_remove` |
| **Emoji/Sticker** | `emojis_update`, `stickers_update` |
| **Integration** | `integration_create`, `integration_update`, `integration_delete` |
| **Webhook** | `webhooks_update` |
| **Invite** | `invite_create`, `invite_delete` |
| **Voice** | `voice_state_update`, `voice_server_update` |
| **Presence** | `presence_update` |
| **Message** | `message_create`, `message_update`, `message_delete`, `message_delete_bulk`, `message_reaction_add`, `message_reaction_remove`, `message_reaction_remove_all`, `message_reaction_remove_emoji` |
| **Interaction** | `button_click`, `select_menu`, `modal_submit`, `autocomplete` |
| **Typing** | `typing_start` |
| **Scheduled Events** | `scheduled_event_create`, `scheduled_event_update`, `scheduled_event_delete`, `scheduled_event_user_add`, `scheduled_event_user_remove` |
| **Stage** | `stage_instance_create`, `stage_instance_update`, `stage_instance_delete` |
| **Automod** | `automod_rule_create`, `automod_rule_update`, `automod_rule_delete`, `automod_action_execution` |
| **Audit Log** | `audit_log_entry_create` |
| **Entitlement** | `entitlement_create`, `entitlement_update`, `entitlement_delete` |
| **Soundboard** | `soundboard_sounds_update` |
| **Custom** | `custom.*` (user-defined via `emit`) |

---

## 11. Flows & Logic ✅

Flows are reusable, named action sequences with arguments and conditional logic. They are the closest thing FURLOW has to "functions."

### 11.1 Flow Definition

```yaml
flows:
  issue_warning:
    description: "Issue a warning to a user and handle escalation"
    args:
      target:
        type: member
        required: true
      reason:
        type: string
        required: true
      severity:
        type: string
        default: medium
      issuer:
        type: user
        required: true
    
    actions:
      # insert the warning
      - db_insert:
          table: warnings
          data:
            user_id: "${args.target.id}"
            guild_id: "${guild.id}"
            reason: "${args.reason}"
            severity: "${args.severity}"
            issued_by: "${args.issuer.id}"
      
      # count active warnings
      - db_query:
          table: warnings
          where:
            user_id: "${args.target.id}"
            guild_id: "${guild.id}"
            active: true
          save_as: all_warnings
      
      - set:
          variable: warning_count
          value: "${all_warnings.length}"
          scope: local                       # flow-scoped variable
      
      # notify the user
      - send_dm:
          to: "${args.target}"
          embed:
            title: "⚠️ Warning"
            color: "${args.severity == 'critical' ? '#ff0000' : args.severity == 'high' ? '#ff6600' : '#ffcc00'}"
            description: "You have been warned in **${guild.name}**."
            fields:
              - name: "Reason"
                value: "${args.reason}"
              - name: "Total Warnings"
                value: "${warning_count}"
            footer:
              text: "Warning #${warning_count}"
          on_fail: log
      
      # mod log
      - send_message:
          channel: "#mod-log"
          embed:
            use_template: mod_action_embed
            data:
              action: "Warning"
              target: "${args.target}"
              moderator: "${args.issuer}"
              reason: "${args.reason}"
              severity: "${args.severity}"
              total: "${warning_count}"
      
      # escalation check
      - flow_if:
          condition: "${warning_count >= 5}"
          then:
            - ban:
                user: "${args.target}"
                reason: "Auto-ban: ${warning_count} warnings"
                delete_messages: 1d
            - send_message:
                channel: "#mod-log"
                content: "🔨 **${args.target.display_name}** auto-banned (${warning_count} warnings)"
          
          else_if:
            - condition: "${warning_count >= 3}"
              then:
                - timeout:
                    user: "${args.target}"
                    duration: 24h
                    reason: "Auto-timeout: ${warning_count} warnings"
            
            - condition: "${warning_count >= 2}"
              then:
                - timeout:
                    user: "${args.target}"
                    duration: 1h
                    reason: "Auto-timeout: ${warning_count} warnings"
      
      # return data
      - return:
          warning_count: "${warning_count}"
          escalated: "${warning_count >= 3}"
```

### 11.2 Conditional Logic

```yaml
# if / else if / else
- flow_if:
    condition: "${expression}"
    then:
      - action: { ... }
    else_if:
      - condition: "${other_expression}"
        then:
          - action: { ... }
    else:
      - action: { ... }

# switch / match
- flow_switch:
    value: "${options.action}"
    cases:
      ban:
        - ban: { ... }
      kick:
        - kick: { ... }
      mute:
        - timeout: { ... }
    default:
      - reply:
          content: "Unknown action"

# pattern matching with regex
- flow_match:
    value: "${message.content}"
    patterns:
      - regex: "^!play (.+)"
        captures: [song_query]
        actions:
          - call_flow:
              flow: play_music
              args:
                query: "${song_query}"
      - regex: "^!skip$"
        actions:
          - call_flow:
              flow: skip_track
      - regex: "^!queue$"
        actions:
          - call_flow:
              flow: show_queue
```

### 11.3 Loops & Iteration

```yaml
# for each
- batch:
    each: "${collection}"
    as: item
    index_as: i                              # optional index variable
    actions:
      - send_message:
          content: "${i + 1}. ${item.name}"

# with limit and filter
- batch:
    each: "${db.warnings.find({ guild_id: guild.id }).order_by('issued_at', 'desc')}"
    as: warning
    limit: 10
    filter: "${warning.active}"
    actions:
      - log:
          message: "Warning: ${warning.reason}"

# repeat N times
- repeat:
    count: 5
    as: i
    actions:
      - add_reaction:
          message: "${message.id}"
          emoji: "${number_emojis[i]}"

# while (with safety limit)
- flow_while:
    condition: "${queue.length > 0}"
    max_iterations: 100                      # safety valve
    actions:
      - set:
          variable: current
          value: "${queue.shift()}"
          scope: local
      - call_flow:
          flow: process_item
          args:
            item: "${current}"
```

### 11.4 Error Handling

```yaml
- try:
    actions:
      - pipe_request:
          pipe: external_api
          endpoint: /data
          save_as: result
      - reply:
          content: "Result: ${result.value}"
    catch:
      - reply:
          content: "Something went wrong: ${error.message}"
      - log:
          level: error
          message: "API call failed: ${error}"
    finally:
      - set:
          variable: api_calls_today
          value: "${api_calls_today + 1}"
```

---

## 12. UI Components ✅

Discord's message component system: buttons, select menus, modals, text inputs.

### 12.1 Buttons

```yaml
components:
  - action_row:
      - button:
          label: "Approve"
          style: success                     # primary | secondary | success | danger | link
          custom_id: "approve_${ticket_id}"
          emoji: "✅"                         # optional
          disabled: false
      
      - button:
          label: "Deny"
          style: danger
          custom_id: "deny_${ticket_id}"
          emoji: "❌"
      
      - button:
          label: "Documentation"
          style: link
          url: "https://example.com/docs"
          emoji: "📚"
  
  - action_row:
      - button:
          label: "Previous"
          style: secondary
          custom_id: "page_prev_${page}"
          disabled: "${page <= 0}"
      
      - button:
          label: "Page ${page + 1}/${total_pages}"
          style: secondary
          custom_id: "page_info"
          disabled: true                     # display-only
      
      - button:
          label: "Next"
          style: secondary
          custom_id: "page_next_${page}"
          disabled: "${page >= total_pages - 1}"
```

### 12.2 Select Menus

```yaml
  - action_row:
      - select_menu:
          type: string                       # string | user | role | mentionable | channel
          custom_id: "color_picker"
          placeholder: "Pick a color role..."
          min_values: 1
          max_values: 1
          disabled: false
          options:
            - label: "Red"
              value: "role_red"
              description: "A fiery red"
              emoji: "🔴"
              default: false
            - label: "Blue"
              value: "role_blue"
              description: "A cool blue"
              emoji: "🔵"
            - label: "Green"
              value: "role_green"
              description: "A natural green"
              emoji: "🟢"
      
      # dynamic options from state
      - select_menu:
          type: string
          custom_id: "tag_picker"
          placeholder: "Select a tag..."
          options_from:
            source: state
            variable: custom_tags
            label: "${entry.key}"
            value: "${entry.key}"
            description: "${truncate(entry.value, 100)}"
  
  # user picker
  - action_row:
      - select_menu:
          type: user
          custom_id: "assign_user"
          placeholder: "Assign to a user..."
  
  # role picker
  - action_row:
      - select_menu:
          type: role
          custom_id: "role_picker"
          placeholder: "Select roles..."
          min_values: 1
          max_values: 5
  
  # channel picker
  - action_row:
      - select_menu:
          type: channel
          custom_id: "log_channel_picker"
          placeholder: "Select a log channel..."
          channel_types: [text, announcement]
```

### 12.3 Modals (Popup Forms)

```yaml
modals:
  report_modal:
    title: "Report a User"
    custom_id: "report_modal"
    components:
      - action_row:
          - text_input:
              label: "Reason"
              custom_id: "reason"
              style: paragraph                # short | paragraph
              placeholder: "Describe what happened..."
              required: true
              min_length: 10
              max_length: 1000
      
      - action_row:
          - text_input:
              label: "Evidence (message links, screenshots)"
              custom_id: "evidence"
              style: paragraph
              placeholder: "Paste any evidence here..."
              required: false
              max_length: 1000
      
      - action_row:
          - text_input:
              label: "When did this happen?"
              custom_id: "when"
              style: short
              placeholder: "e.g., today at 3pm, yesterday"
              required: false
  
  ticket_creation_modal:
    title: "Open a Support Ticket"
    custom_id: "ticket_modal"
    components:
      - action_row:
          - text_input:
              label: "Subject"
              custom_id: "subject"
              style: short
              required: true
              max_length: 100
      - action_row:
          - text_input:
              label: "Description"
              custom_id: "description"
              style: paragraph
              required: true
              min_length: 20
      - action_row:
          - text_input:
              label: "Priority"
              custom_id: "priority"
              style: short
              placeholder: "low / normal / high / urgent"
              required: false
              value: "normal"
```

---

## 13. Embeds & Theming ⚠️

### 13.1 Inline Embeds

```yaml
embed:
  title: "Server Info"
  description: "Information about ${guild.name}"
  url: "https://example.com"
  color: "#5865F2"                           # hex color
  timestamp: "${now()}"                      # ISO timestamp
  
  author:
    name: "${user.name}"
    url: "https://example.com"
    icon_url: "${user.avatar_url}"
  
  thumbnail:
    url: "${guild.icon_url}"
  
  image:
    url: "https://example.com/banner.png"    # or local asset
  
  footer:
    text: "Bot v1.0 • ${guild.member_count} members"
    icon_url: "${bot.avatar_url}"
  
  fields:
    - name: "Members"
      value: "${guild.member_count}"
      inline: true
    - name: "Channels"
      value: "${guild.channels.length}"
      inline: true
    - name: "Roles"
      value: "${guild.roles.length}"
      inline: true
    - name: "Created"
      value: "${timestamp(guild.created_at, 'R')}"
      inline: false
    - name: "\u200b"                         # blank field for spacing
      value: "\u200b"
      inline: false
```

### 13.2 Embed Templates

Define reusable embed templates with variable slots:

```yaml
embed_templates:
  mod_action_embed:
    color_map:
      Warning: "#ffcc00"
      Kick: "#ff6600"
      Ban: "#ff0000"
      Mute: "#999999"
      Unmute: "#00cc00"
    
    template:
      title: "${data.action}"
      color: "${color_map[data.action] ?? '#5865F2'}"
      fields:
        - name: "User"
          value: "${data.target.mention} (${data.target.user.name})"
          inline: true
        - name: "Moderator"
          value: "${data.moderator.mention}"
          inline: true
        - name: "Reason"
          value: "${data.reason || 'No reason provided'}"
        - name: "Additional Info"
          value: "${data.extra ?? ''}"
          conditional: "${data.extra != null}"    # only show if data exists
      footer:
        text: "Case #${data.case_number ?? 'N/A'}"
      timestamp: "${now()}"
  
  welcome_embed:
    template:
      title: "Welcome!"
      description: |
        Hey ${data.member.mention}, welcome to **${guild.name}**!
        You're member #${guild.member_count}.
      color: "#00ff88"
      thumbnail:
        url: "${data.member.user.avatar_url}"
      image:
        url: "${state.get('welcome_banner_url')}"
      fields:
        - name: "📜 Rules"
          value: "Check out ${state.get('rules_channel').mention ?? '#rules'}"
        - name: "🎭 Roles"
          value: "Grab some roles in ${state.get('roles_channel').mention ?? '#roles'}"
  
  paginated_list:
    template:
      title: "${data.title}"
      description: "${data.items.slice(data.page * 10, (data.page + 1) * 10).map((item, i) => '`' + (data.page * 10 + i + 1) + '.` ' + item).join('\n')}"
      color: "${data.color ?? '#5865F2'}"
      footer:
        text: "Page ${data.page + 1}/${Math.ceil(data.items.length / 10)} • ${data.items.length} total"
```

### 13.3 Theme System

Define a global theme that applies to all embeds unless overridden:

```yaml
theme:
  # global defaults for all embeds
  embed_defaults:
    color: "#1a1a2e"
    footer:
      text: "JUNKBOT v${bot.version}"
      icon_url: "${bot.avatar_url}"
    timestamp: auto                          # auto-add timestamp to all embeds
  
  # named color palette
  colors:
    primary: "#5865F2"
    success: "#57F287"
    warning: "#FEE75C"
    danger: "#ED4245"
    info: "#5865F2"
    muted: "#99AAB5"
    brand: "#1a1a2e"
    accent: "#e94560"
  
  # emoji set — reference as ${theme.emoji.success} etc.
  emoji:
    success: "✅"
    error: "❌"
    warning: "⚠️"
    info: "ℹ️"
    loading: "⏳"
    online: "🟢"
    offline: "🔴"
    idle: "🟡"
    dnd: "🔴"
    arrow_right: "▸"
    arrow_left: "◂"
    bullet: "•"
    separator: "│"
    # custom server emojis
    custom_check: "<:check:123456789>"
    custom_cross: "<:cross:123456789>"
  
  # formatting presets
  formats:
    code_block: "```${lang}\n${content}\n```"
    inline_code: "`${content}`"
    quote: "> ${content}"
    spoiler: "||${content}||"
    header: "**__${content}__**"
    subheader: "**${content}**"
    dim: "-# ${content}"                     # Discord small text
```

### 13.4 Custom Assets

```yaml
  assets:
    # local files served by the runtime or uploaded to Discord CDN
    avatar: ./theme/assets/avatar.png
    banner: ./theme/assets/banner.png
    welcome_card_bg: ./theme/assets/welcome-bg.png
    level_up_bg: ./theme/assets/levelup-bg.png
    
    # generated images (runtime must support image generation)
    generators:
      welcome_card:
        type: canvas                         # canvas | svg | html_screenshot
        width: 800
        height: 300
        layers:
          - type: image
            src: "${assets.welcome_card_bg}"
            x: 0
            y: 0
            width: 800
            height: 300
          - type: circle_image
            src: "${member.user.avatar_url}"
            x: 400
            y: 80
            radius: 60
          - type: text
            content: "Welcome, ${member.display_name}!"
            x: 400
            y: 180
            font: "bold 28px sans-serif"
            color: "#ffffff"
            align: center
          - type: text
            content: "Member #${guild.member_count}"
            x: 400
            y: 220
            font: "18px sans-serif"
            color: "#aaaaaa"
            align: center
      
      rank_card:
        type: canvas
        width: 800
        height: 200
        layers:
          - type: rect
            x: 0
            y: 0
            width: 800
            height: 200
            color: "#1a1a2e"
            radius: 20
          - type: circle_image
            src: "${member.user.avatar_url}"
            x: 100
            y: 100
            radius: 60
          - type: text
            content: "${member.display_name}"
            x: 200
            y: 60
            font: "bold 24px sans-serif"
            color: "#ffffff"
          - type: progress_bar
            x: 200
            y: 100
            width: 500
            height: 30
            progress: "${(user_xp % xp_for_next_level) / xp_for_next_level}"
            bg_color: "#333333"
            fill_color: "${theme.colors.accent}"
            radius: 15
          - type: text
            content: "Level ${user_level}"
            x: 200
            y: 160
            font: "18px sans-serif"
            color: "#e94560"
          - type: text
            content: "${user_xp} / ${xp_for_next_level} XP"
            x: 700
            y: 160
            font: "16px sans-serif"
            color: "#999999"
            align: right
```

---

## 14. Voice & Audio ⚠️

Full voice channel support: joining, playing audio, recording, TTS, and audio processing pipelines.

### 14.1 Voice Connection

```yaml
voice:
  defaults:
    self_deaf: true                          # bot deafens itself by default
    self_mute: false
    bitrate: 64000
    reconnect: true
  
  audio_sources:
    # define named audio sources the bot can play from
    youtube:
      type: ytdl                             # youtube-dl / yt-dlp
      quality: highestaudio
      format: opus
    
    soundboard:
      type: local_files
      directory: ./assets/sounds/
      formats: [mp3, ogg, wav, opus]
    
    url_stream:
      type: http_stream
      formats: [mp3, ogg, opus, aac]
    
    tts:
      type: tts_engine
      engine: espeak                         # espeak | google | azure | elevenlabs
      voice: en-us                           # or specific voice ID
      rate: 1.0
      # for cloud TTS:
      # api_key: $env.TTS_API_KEY
    
    pipe_audio:
      type: pipe                             # raw PCM/opus from a data pipe
      format: opus
      sample_rate: 48000
      channels: 2
      frame_size: 960
```

### 14.2 Audio Playback Actions

```yaml
actions:
  - voice_join:
      channel: "${member.voice.channel}"     # or channel name/ID
      save_as: voice_connection
  
  - voice_leave:
      guild: "${guild.id}"                   # leave voice in this guild
  
  - voice_play:
      source: youtube
      query: "${options.song}"               # search query or URL
      volume: 0.5                            # 0.0 to 2.0
      save_as: now_playing
  
  - voice_play:
      source: soundboard
      file: "airhorn.mp3"
      volume: 0.8
  
  - voice_play:
      source: url_stream
      url: "https://radio.example.com/stream"
      volume: 0.5
  
  - voice_play:
      source: tts
      text: "Hello ${member.display_name}, welcome to the channel"
      voice: en-gb
      volume: 0.7
  
  - voice_play:
      source: pipe_audio
      pipe: audio_processor                  # from a data pipe
      volume: 1.0
  
  - voice_pause: {}
  
  - voice_resume: {}
  
  - voice_stop: {}
  
  - voice_skip:
      count: 1                               # skip N tracks
  
  - voice_seek:
      position: 30s                          # seek to position
  
  - voice_volume:
      level: 0.5
  
  - voice_set_filter:                        # audio effects
      filter: nightcore                      # nightcore | bass_boost | vaporwave | karaoke | 8d | tremolo | vibrato | rotation | custom
      # for custom:
      # ffmpeg_filter: "aecho=0.8:0.88:60:0.4"
```

### 14.3 Queue System

```yaml
  queue:
    enabled: true
    max_size: 500
    default_loop: none                       # none | track | queue
    shuffle: false
    auto_play: false                         # auto-play related tracks when queue empty
    vote_skip:
      enabled: true
      threshold: 0.5                         # 50% of listeners must vote
    disconnect_on_empty:
      enabled: true
      delay: 5m                              # wait before disconnecting
    
    actions:
      - queue_add:
          query: "${options.song}"
          source: youtube
          requested_by: "${user}"
          position: end                      # end | next | number
      
      - queue_remove:
          position: "${options.position}"
      
      - queue_clear: {}
      
      - queue_shuffle: {}
      
      - queue_loop:
          mode: track                        # none | track | queue
      
      - queue_move:
          from: "${options.from}"
          to: "${options.to}"
      
      - queue_get:
          page: "${options.page ?? 0}"
          per_page: 10
          save_as: queue_page
```

### 14.4 Voice Recording

```yaml
  recording:
    enabled: true
    format: ogg                              # ogg | wav | mp3 | pcm
    sample_rate: 48000
    channels: 2
    max_duration: 2h
    per_user: true                           # separate tracks per user
    consent_required: true                   # ask users before recording
    storage: ./recordings/                   # or a pipe destination
    
    actions:
      - voice_record_start:
          channel: "${voice.channel}"
          save_as: recording_session
      
      - voice_record_stop:
          session: "${recording_session}"
          save_as: recording_files           # list of file paths
      
      - voice_record_get_user_track:
          session: "${recording_session}"
          user: "${target_user}"
          save_as: user_audio_track
```

### 14.5 Audio Processing Pipeline

For advanced use cases like live audio effects, mixing, or analysis:

```yaml
  audio_pipeline:
    live_effects:
      name: "DJ Mode"
      chain:
        - type: gain
          level: 1.2
        - type: eq
          bands:
            60hz: +6dB
            250hz: +3dB
            1khz: 0dB
            4khz: -2dB
            16khz: -4dB
        - type: compressor
          threshold: -20dB
          ratio: 4
          attack: 5ms
          release: 100ms
        - type: limiter
          ceiling: -1dB
    
    # pipe raw audio out to external processing
    audio_output_pipe:
      type: websocket
      url: "ws://localhost:8765/audio-in"
      format: pcm_f32le
      sample_rate: 48000
      channels: 2
    
    # receive processed audio back
    audio_input_pipe:
      type: websocket
      url: "ws://localhost:8765/audio-out"
      format: opus
```

---

## 15. Video & Streaming ❌

Discord's video capabilities are limited compared to audio, but bots can interact with streams and screen sharing contexts.

```yaml
video:
  # react to streaming events
  events:
    user_starts_streaming:
      when: "${event.new_state.self_video || event.new_state.self_stream}"
      actions:
        - send_message:
            channel: "#live-now"
            embed:
              title: "🔴 ${member.display_name} is streaming!"
              description: "Join ${event.new_state.channel.mention} to watch"
              thumbnail:
                url: "${member.user.avatar_url}"
  
  # go-live / screen share detection
  stream_detection:
    enabled: true
    notify_channel: "#streams"
    notify_role: "Stream Watchers"
    embed_template: stream_notification
  
  # bot-initiated screen sharing (requires special runtime support)
  # the bot can share a "screen" which is actually a rendered output
  screen_share:
    enabled: false                           # experimental
    source:
      type: html                             # html | canvas | ffmpeg
      # for html: render an HTML page as video
      url: "http://localhost:3000/overlay"
      width: 1280
      height: 720
      fps: 30
      # for ffmpeg: pipe video from ffmpeg
      # command: "ffmpeg -i input.mp4 -f rawvideo -pix_fmt yuv420p -"
    
    # camera simulation (bot appears with a camera feed)
    camera:
      enabled: false
      source:
        type: ffmpeg
        input: "http://localhost:8080/camera-feed"
        fps: 30
        width: 640
        height: 480
```

---

## 16. Data Pipes & Integrations ⚠️

Pipes are bidirectional data connections to external systems. They are how FURLOW bots talk to the outside world.

### 16.1 HTTP / REST Pipes

```yaml
pipes:
  translation_api:
    type: http
    base_url: "https://api.deepl.com/v2"
    auth:
      type: header
      header: "Authorization"
      value: "DeepL-Auth-Key $env.DEEPL_KEY"
    
    endpoints:
      translate:
        method: POST
        path: /translate
        body:
          text: "${data.text}"
          target_lang: "${data.target_lang}"
          source_lang: "${data.source_lang ?? ''}"
        response_map:
          text: "$.translations[0].text"
          detected_lang: "$.translations[0].detected_source_language"
    
    rate_limit:
      requests_per_second: 5
    
    retry:
      max_attempts: 3
      backoff: exponential
    
    timeout: 10s
  
  openai:
    type: http
    base_url: "https://api.openai.com/v1"
    auth:
      type: bearer
      token: $env.OPENAI_API_KEY
    
    endpoints:
      chat:
        method: POST
        path: /chat/completions
        body:
          model: "gpt-4"
          messages: "${data.messages}"
          temperature: "${data.temperature ?? 0.7}"
          max_tokens: "${data.max_tokens ?? 500}"
        response_map:
          text: "$.choices[0].message.content"
          usage: "$.usage"
      
      image:
        method: POST
        path: /images/generations
        body:
          model: "dall-e-3"
          prompt: "${data.prompt}"
          size: "${data.size ?? '1024x1024'}"
        response_map:
          url: "$.data[0].url"
```

### 16.2 WebSocket Pipes

```yaml
  live_dashboard:
    type: websocket
    url: "ws://localhost:9090/bot-events"
    auth:
      type: query_param
      param: token
      value: $env.DASHBOARD_SECRET
    
    # events to forward to the websocket
    outbound:
      - event: message_create
        transform:
          type: "message"
          guild_id: "${guild.id}"
          channel: "${channel.name}"
          author: "${message.author.name}"
          content: "${message.content}"
      
      - event: member_join
        transform:
          type: "member_join"
          guild_id: "${guild.id}"
          user: "${member.user.name}"
      
      - event: voice_state_update
        transform:
          type: "voice_update"
          guild_id: "${guild.id}"
          user: "${member.user.name}"
          channel: "${event.new_state.channel?.name}"
    
    # commands received from the websocket
    inbound:
      send_announcement:
        actions:
          - send_message:
              channel: "${pipe.data.channel}"
              content: "${pipe.data.message}"
      
      restart_bot:
        permissions: [owner]
        actions:
          - log:
              message: "Restart requested via dashboard"
          - emit:
              event: custom.restart
  
  # raw TCP/UDP for hardware integration
  hardware_serial:
    type: tcp                                # tcp | udp
    host: "192.168.1.100"
    port: 9999
    encoding: utf8                           # utf8 | binary | hex
    delimiter: "\n"
    reconnect: true
    
    inbound:
      sensor_data:
        when: "${pipe.data.type == 'sensor'}"
        actions:
          - send_message:
              channel: "#iot-feed"
              content: "🌡️ Temperature: ${pipe.data.temp}°F | Humidity: ${pipe.data.humidity}%"
    
    outbound:
      - trigger: custom.send_to_hardware
        transform:
          command: "${event.data.command}"
          value: "${event.data.value}"
```

### 16.3 MQTT Pipes (IoT)

```yaml
  mqtt_broker:
    type: mqtt
    broker: "mqtt://192.168.1.50:1883"
    client_id: "furlow-bot"
    username: $env.MQTT_USER
    password: $env.MQTT_PASS
    
    subscriptions:
      - topic: "home/sensors/#"
        qos: 1
        handler:
          actions:
            - flow_match:
                value: "${pipe.topic}"
                patterns:
                  - regex: "home/sensors/(\\w+)/temperature"
                    captures: [room]
                    actions:
                      - set_map:
                          variable: room_temps
                          key: "${room}"
                          value: "${pipe.data}"
                      - flow_if:
                          condition: "${parseFloat(pipe.data) > 90}"
                          then:
                            - send_message:
                                channel: "#alerts"
                                content: "🔥 High temp in ${room}: ${pipe.data}°F"
      
      - topic: "home/alerts/+"
        qos: 2
        handler:
          actions:
            - send_message:
                channel: "#home-alerts"
                content: "🚨 Alert: ${pipe.data}"
    
    publish:
      - action_name: mqtt_publish
        topic: "home/commands/${data.device}"
        payload: "${data.command}"
        qos: 1
```

### 16.4 Webhook Pipes (Incoming)

```yaml
  github_webhook:
    type: webhook_receiver
    path: /webhooks/github                   # the runtime exposes this HTTP endpoint
    secret: $env.GITHUB_WEBHOOK_SECRET
    verify: hmac_sha256                      # signature verification
    
    handlers:
      push:
        when: "${pipe.headers['x-github-event'] == 'push'}"
        actions:
          - send_message:
              channel: "#dev-feed"
              embed:
                title: "📦 Push to ${pipe.data.repository.name}"
                description: "${pipe.data.commits.length} new commit(s) to `${pipe.data.ref}`"
                url: "${pipe.data.compare}"
                color: "${theme.colors.info}"
                fields:
                  - name: "Commits"
                    value: "${pipe.data.commits.slice(0, 5).map(c => '• [`' + c.id.slice(0,7) + '`](' + c.url + ') ' + truncate(c.message, 50)).join('\n')}"
                author:
                  name: "${pipe.data.sender.login}"
                  icon_url: "${pipe.data.sender.avatar_url}"
      
      pull_request:
        when: "${pipe.headers['x-github-event'] == 'pull_request'}"
        actions:
          - send_message:
              channel: "#dev-feed"
              embed:
                title: "🔀 PR ${pipe.data.action}: ${pipe.data.pull_request.title}"
                url: "${pipe.data.pull_request.html_url}"
                color: "${pipe.data.action == 'opened' ? '#57F287' : pipe.data.action == 'closed' ? '#ED4245' : '#FEE75C'}"
  
  twitch_webhook:
    type: webhook_receiver
    path: /webhooks/twitch
    verify: twitch_eventsub                  # Twitch EventSub verification
    
    handlers:
      stream_online:
        when: "${pipe.data.subscription.type == 'stream.online'}"
        actions:
          - send_message:
              channel: "#streams"
              content: "🔴 **${pipe.data.event.broadcaster_user_name}** is live on Twitch!"
              embed:
                title: "${pipe.data.event.broadcaster_user_name} is live!"
                url: "https://twitch.tv/${pipe.data.event.broadcaster_user_login}"
                color: "#9146FF"
```

### 16.5 Outgoing Webhooks

```yaml
  discord_webhook_out:
    type: webhook_sender
    url: $env.WEBHOOK_URL                    # Discord webhook URL
    
    # or dynamically per-guild:
    dynamic: true
    url_from: state
    variable: guild_webhook_url
    
    actions:
      - webhook_send:
          pipe: discord_webhook_out
          username: "JUNKBOT Alerts"
          avatar_url: "${bot.avatar_url}"
          content: "${data.message}"
          embeds: "${data.embeds}"
```

### 16.6 Database Pipes

```yaml
  external_db:
    type: database
    driver: postgres                         # postgres | mysql | sqlite | mongodb
    connection: $env.DATABASE_URL
    pool:
      min: 2
      max: 10
    
    # expose queries as named operations
    queries:
      get_user_profile:
        sql: "SELECT * FROM profiles WHERE discord_id = $1"
        params: ["${data.user_id}"]
      
      update_score:
        sql: "UPDATE leaderboard SET score = score + $1 WHERE discord_id = $2"
        params: ["${data.points}", "${data.user_id}"]
```

### 16.7 File System Pipes

```yaml
  file_watcher:
    type: file_watch
    paths:
      - ./data/config-updates/
      - ./data/content/
    events: [create, modify, delete]
    
    handlers:
      config_change:
        when: "${pipe.path.endsWith('.yaml')}"
        actions:
          - log:
              message: "Config file changed: ${pipe.path}"
          - emit:
              event: custom.config_reload
              data:
                file: "${pipe.path}"
```

---

## 17. Automod 🚧

Automated moderation with configurable rules, conditions, and escalation.

```yaml
automod:
  enabled: true
  
  # channels to ignore
  immune_channels:
    - "#bot-commands"
    - "#spam"
  
  # roles to ignore
  immune_roles:
    - "Admin"
    - "Moderator"
    - "Bot"
  
  log_channel: "#automod-log"
  
  rules:
    spam_detection:
      enabled: true
      description: "Detect and handle message spam"
      conditions:
        - type: message_rate
          threshold: 5                       # messages
          interval: 5s                       # in this time window
          per: user                          # per user | per channel
      actions:
        - delete_message: {}
        - timeout:
            duration: 5m
            reason: "Automod: spam detection"
        - send_message:
            channel: "#automod-log"
            embed:
              title: "🛡️ Spam Detected"
              color: "${theme.colors.warning}"
              fields:
                - name: "User"
                  value: "${message.author.mention}"
                - name: "Channel"
                  value: "${channel.mention}"
                - name: "Messages"
                  value: "${violation.message_count} in ${violation.interval}"
      escalation:
        - threshold: 3                       # 3rd offense
          action:
            - timeout:
                duration: 1h
        - threshold: 5
          action:
            - ban:
                reason: "Automod: repeated spam"
                delete_messages: 1d
    
    duplicate_messages:
      enabled: true
      conditions:
        - type: duplicate_content
          threshold: 3                       # same message 3 times
          interval: 60s
          similarity: 0.9                    # fuzzy match threshold
      actions:
        - delete_message: {}
        - reply:
            content: "Please don't repeat messages."
            ephemeral: true
            auto_delete: 10s
    
    banned_words:
      enabled: true
      conditions:
        - type: content_filter
          mode: regex                        # exact | contains | regex | wildcard
          patterns:
            - "\\b(slur1|slur2|slur3)\\b"
            - "discord\\.gg/[a-zA-Z0-9]+"   # invite links
          case_sensitive: false
      actions:
        - delete_message: {}
        - send_dm:
            to: "${message.author}"
            content: "Your message was removed for containing banned content."
        - db_insert:
            table: warnings
            data:
              user_id: "${message.author.id}"
              reason: "Automod: banned content"
              severity: high
    
    caps_filter:
      enabled: true
      conditions:
        - type: caps_percentage
          threshold: 70                      # 70% caps
          min_length: 10                     # ignore short messages
      actions:
        - delete_message: {}
        - reply:
            content: "Please don't use excessive caps."
            ephemeral: true
            auto_delete: 5s
    
    link_filter:
      enabled: true
      conditions:
        - type: link_detection
          mode: allowlist                    # allowlist | blocklist | all
          allowed_domains:
            - "youtube.com"
            - "github.com"
            - "imgur.com"
            - "tenor.com"
          blocked_domains:
            - "grabify.link"
            - "iplogger.org"
      actions:
        - delete_message: {}
        - reply:
            content: "That link isn't allowed here."
            ephemeral: true
    
    attachment_filter:
      enabled: true
      conditions:
        - type: attachment
          max_size: 10MB
          allowed_types: [image/*, video/*, audio/*, application/pdf]
          blocked_types: [application/x-executable, application/x-msdownload]
          scan_for_malware: false             # requires external pipe
      actions:
        - delete_message: {}
    
    mention_spam:
      enabled: true
      conditions:
        - type: mention_count
          max_mentions: 5
          max_role_mentions: 2
          count_everyone: true
      actions:
        - delete_message: {}
        - timeout:
            duration: 10m
            reason: "Mention spam"
    
    emoji_spam:
      enabled: true
      conditions:
        - type: emoji_count
          max_emojis: 15
          max_custom_emojis: 10
      actions:
        - delete_message: {}
    
    invite_filter:
      enabled: true
      conditions:
        - type: discord_invite
          allow_own_server: true
          allowed_servers: []                # whitelist server IDs
      actions:
        - delete_message: {}
        - reply:
            content: "Server invites are not allowed."
            ephemeral: true
    
    newline_spam:
      enabled: true
      conditions:
        - type: newline_count
          max_newlines: 10
      actions:
        - delete_message: {}
    
    raid_protection:
      enabled: true
      conditions:
        - type: join_rate
          threshold: 10                      # members
          interval: 10s                      # in this time window
      actions:
        - emit:
            event: custom.raid_detected
        - send_message:
            channel: "#mod-alerts"
            content: "@here 🚨 **RAID DETECTED** — ${violation.join_count} joins in ${violation.interval}. Enabling lockdown."
        - call_flow:
            flow: enable_lockdown
    
    # AI-based content moderation (requires pipe)
    ai_moderation:
      enabled: false
      conditions:
        - type: ai_analysis
          pipe: openai
          endpoint: moderation
          categories: [hate, harassment, self-harm, sexual, violence]
          threshold: 0.8
      actions:
        - delete_message: {}
        - send_message:
            channel: "#automod-log"
            embed:
              title: "🤖 AI Moderation Flag"
              fields:
                - name: "Content"
                  value: "${truncate(message.content, 200)}"
                - name: "Categories"
                  value: "${violation.flagged_categories.join(', ')}"
                - name: "Confidence"
                  value: "${violation.max_score}"
```

---

## 18. Scheduler ✅

Cron-like scheduled tasks and timed operations.

```yaml
scheduler:
  jobs:
    daily_stats:
      description: "Post daily server stats"
      cron: "0 9 * * *"                     # 9 AM daily
      timezone: "America/Phoenix"
      actions:
        - send_message:
            channel: "#stats"
            embed:
              title: "📊 Daily Stats"
              fields:
                - name: "Members"
                  value: "${guild.member_count}"
                - name: "Messages Today"
                  value: "${state.get('daily_message_count')}"
                - name: "New Members"
                  value: "${state.get('daily_joins')}"
        - set:
            variable: daily_message_count
            value: 0
        - set:
            variable: daily_joins
            value: 0
    
    presence_rotation:
      description: "Rotate bot status"
      interval: 5m                           # every 5 minutes
      actions:
        - set:
            variable: presence_index
            value: "${(state.get('presence_index') + 1) % presence_messages.length}"
            scope: global
    
    temp_ban_check:
      description: "Unban users whose temp bans expired"
      interval: 1m
      actions:
        - db_query:
            table: temp_bans
            where:
              expires_at: { lt: "${now()}" }
              active: true
            save_as: expired_bans
        - batch:
            each: "${expired_bans}"
            as: temp_ban
            actions:
              - unban:
                  user_id: "${temp_ban.user_id}"
                  reason: "Temp ban expired"
              - db_update:
                  table: temp_bans
                  where:
                    id: "${temp_ban.id}"
                  set:
                    active: false
    
    weekly_leaderboard:
      cron: "0 12 * * 1"                    # Monday at noon
      actions:
        - call_flow:
            flow: generate_leaderboard
            args:
              period: week
              channel: "#leaderboard"
    
    reminder_check:
      interval: 30s
      actions:
        - db_query:
            table: reminders
            where:
              remind_at: { lte: "${now()}" }
              sent: false
            save_as: due_reminders
        - batch:
            each: "${due_reminders}"
            as: reminder
            actions:
              - send_dm:
                  to: "${reminder.user_id}"
                  content: "⏰ Reminder: ${reminder.message}"
              - db_update:
                  table: reminders
                  where:
                    id: "${reminder.id}"
                  set:
                    sent: true
    
    # one-shot timers (created dynamically by actions)
    # defined here as templates:
    timer_templates:
      giveaway_end:
        actions:
          - call_flow:
              flow: end_giveaway
              args:
                message_id: "${timer.data.message_id}"
                channel_id: "${timer.data.channel_id}"
                prize: "${timer.data.prize}"
      
      mute_expire:
        actions:
          - remove_timeout:
              user: "${timer.data.user_id}"
          - send_message:
              channel: "#mod-log"
              content: "🔊 Timeout expired for <@${timer.data.user_id}>"
```

Dynamic timer creation from actions:

```yaml
actions:
  - create_timer:
      template: giveaway_end
      delay: "${options.duration}"            # e.g., "1h", "30m", "2d"
      data:
        message_id: "${giveaway_message.id}"
        channel_id: "${channel.id}"
        prize: "${options.prize}"
```

---

## 19. Localization ⚠️

Multi-language support with locale files.

```yaml
localization:
  default_locale: en
  fallback_locale: en
  
  # how to determine a user's locale
  detection:
    - source: state                          # check user preference in state
      variable: user_locale
    - source: discord                        # use Discord's locale
    - source: default                        # fall back to default
  
  # locale files
  locales:
    en:
      file: ./locale/en.yaml
    es:
      file: ./locale/es.yaml
    fr:
      file: ./locale/fr.yaml
    ja:
      file: ./locale/ja.yaml
```

Locale file (`./locale/en.yaml`):

```yaml
# ./locale/en.yaml
welcome:
  greeting: "Welcome to **{guild_name}**, {user_mention}!"
  member_number: "You are member #{count}."
  rules_prompt: "Please read the rules in {channel}."

moderation:
  warn:
    title: "⚠️ Warning"
    issued: "Warning issued to {user}."
    reason_label: "Reason"
    dm_message: "You have been warned in **{guild_name}**: {reason}"
  kick:
    title: "👢 Kicked"
    issued: "{user} has been kicked."
  ban:
    title: "🔨 Banned"
    issued: "{user} has been banned."

errors:
  no_permission: "You don't have permission to use this command."
  user_not_found: "Could not find that user."
  generic: "Something went wrong. Please try again."
  cooldown: "Please wait {remaining} before using this again."
```

Usage in actions:

```yaml
- reply:
    content: "${locale('welcome.greeting', { guild_name: guild.name, user_mention: member.mention })}"
```

---

## 20. Error Handling ✅

Global and per-action error handling.

```yaml
error_handling:
  # global error handler — catches any unhandled error
  global:
    actions:
      - log:
          level: error
          message: "Unhandled error: ${error.message}\nStack: ${error.stack}"
      - send_message:
          channel: "#bot-errors"
          embed:
            title: "❌ Bot Error"
            color: "#ff0000"
            description: "```${truncate(error.message, 1000)}```"
            fields:
              - name: "Source"
                value: "${error.source}"
              - name: "Guild"
                value: "${guild?.name ?? 'N/A'}"
  
  # error handler for command interactions
  command_error:
    actions:
      - flow_switch:
          value: "${error.type}"
          cases:
            permission_denied:
              - reply:
                  content: "${locale('errors.no_permission')}"
                  ephemeral: true
            cooldown:
              - reply:
                  content: "${locale('errors.cooldown', { remaining: format_duration(error.retry_after) })}"
                  ephemeral: true
            user_input:
              - reply:
                  content: "Invalid input: ${error.message}"
                  ephemeral: true
            missing_permissions:
              - reply:
                  content: "I'm missing permissions to do that: ${error.missing.join(', ')}"
                  ephemeral: true
          default:
            - reply:
                content: "${locale('errors.generic')}"
                ephemeral: true
  
  # per-action error behavior
  on_action_fail:
    default: log_and_continue                # log_and_continue | stop | retry | ignore
    retry:
      max_attempts: 3
      delay: 1s
      backoff: exponential
```

---

## 21. Analytics & Metrics ⚠️

Track bot usage and expose metrics.

```yaml
analytics:
  # built-in counters the runtime maintains
  built_in:
    - commands_executed
    - messages_processed
    - members_joined
    - members_left
    - errors_count
    - voice_minutes
    - api_calls
  
  # custom counters
  counters:
    xp_awarded:
      description: "Total XP awarded"
      labels: [guild_id]
    
    tickets_opened:
      description: "Tickets opened"
      labels: [guild_id, category]
    
    songs_played:
      description: "Songs played"
      labels: [guild_id, source]
  
  # prometheus metrics endpoint
  prometheus:
    enabled: true
    port: 9090
    path: /metrics
  
  # periodic stats storage
  snapshots:
    interval: 1h
    store_in: analytics_table
    metrics:
      - guild_count
      - total_members
      - active_voice_connections
      - commands_per_hour
      - messages_per_hour
  
  # usage tracking per-command
  command_tracking:
    enabled: true
    store_in: command_usage
    fields: [command_name, user_id, guild_id, timestamp, success, duration_ms]
```

---

## 22. Dashboard & Web UI ⚠️

FURLOW runtimes can serve a web dashboard. The spec defines what the dashboard exposes and how to customize it.

### 22.1 Dashboard Configuration

```yaml
dashboard:
  enabled: true
  port: 3000
  host: "0.0.0.0"
  base_url: "https://bot.example.com"
  
  auth:
    provider: discord_oauth2
    client_id: $env.DISCORD_CLIENT_ID
    client_secret: $env.DISCORD_CLIENT_SECRET
    redirect_uri: "https://bot.example.com/auth/callback"
    scopes: [identify, guilds, guilds.members.read]
    
    # who can access the dashboard
    access:
      - role: owner                          # bot owner gets full access
        level: admin
      - discord_permissions: [administrator]
        level: admin
      - discord_permissions: [manage_guild]
        level: editor
      - discord_roles: ["Moderator"]
        level: viewer
  
  # which state variables appear in the dashboard
  configurable_settings:
    - variable: welcome_enabled
      label: "Welcome Messages"
      section: "Welcome"
      widget: toggle
    
    - variable: welcome_channel
      label: "Welcome Channel"
      section: "Welcome"
      widget: channel_picker
      channel_types: [text]
    
    - variable: welcome_message_template
      label: "Welcome Message"
      section: "Welcome"
      widget: textarea
      placeholder: "Use {user_mention}, {guild_name}, {member_count}"
      max_length: 2000
    
    - variable: spam_threshold_count
      label: "Spam Threshold (messages)"
      section: "Automod"
      widget: number_input
      min: 2
      max: 20
    
    - variable: mod_log_channel
      label: "Mod Log Channel"
      section: "Moderation"
      widget: channel_picker
    
    - variable: level_roles
      label: "Level-up Roles"
      section: "Leveling"
      widget: role_level_map
      description: "Map levels to roles"
  
  # dashboard sections/pages
  sections:
    - name: "Overview"
      icon: "dashboard"
      widgets:
        - type: stat_card
          label: "Members"
          value: "${guild.member_count}"
        - type: stat_card
          label: "Commands Today"
          value: "${state.get('daily_commands')}"
        - type: chart
          label: "Activity (7 days)"
          data_source: analytics_table
          chart_type: line
          period: 7d
        - type: recent_actions
          label: "Recent Mod Actions"
          data_source: warnings
          limit: 10
    
    - name: "Moderation"
      icon: "shield"
      pages:
        - name: "Warnings"
          data_source: warnings
          display: table
          columns: [user_id, reason, severity, issued_by, issued_at, active]
          actions: [view, edit, delete]
        - name: "Automod Rules"
          display: config_editor
          source: automod.rules
    
    - name: "Music"
      icon: "music"
      widgets:
        - type: now_playing
        - type: queue_viewer
        - type: volume_slider
```

### 22.2 Custom Dashboard UI

Override the default dashboard with your own HTML/CSS/JS:

```yaml
  custom_ui:
    enabled: true
    source: ./theme/dashboard/               # directory with index.html, style.css, etc.
    
    # the runtime exposes these API endpoints for your custom UI:
    api:
      prefix: /api/v1
      endpoints:
        # these are auto-generated from your state/tables:
        - GET    /guilds                     # list guilds bot is in
        - GET    /guilds/:id                 # guild details
        - GET    /guilds/:id/settings        # configurable settings
        - PATCH  /guilds/:id/settings        # update settings
        - GET    /guilds/:id/members         # member list
        - GET    /guilds/:id/channels        # channel list
        - GET    /guilds/:id/roles           # role list
        - GET    /guilds/:id/warnings        # from warnings table
        - POST   /guilds/:id/warnings        # create warning
        - DELETE /guilds/:id/warnings/:wid   # delete warning
        - GET    /guilds/:id/analytics       # analytics data
        - GET    /guilds/:id/queue           # music queue
        - POST   /guilds/:id/actions/:name   # trigger a named action
    
    # custom API endpoints you define:
    custom_endpoints:
      - path: /api/v1/guilds/:id/leaderboard
        method: GET
        actions:
          - db_query:
              table: user_xp_table
              where:
                guild_id: "${params.id}"
              order_by:
                xp: desc
              limit: "${query.limit ?? 50}"
              save_as: leaderboard
          - return_json:
              data: "${leaderboard}"
```

### 22.3 Embeddable Widgets

HTML widgets that can be embedded in external sites:

```yaml
  widgets:
    server_status:
      path: /widget/status/:guild_id
      template: ./theme/widgets/status.html
      public: true                           # no auth required
      cache_ttl: 60s
      data:
        guild_name: "${guild.name}"
        member_count: "${guild.member_count}"
        online_count: "${guild.presences.filter(p => p.status == 'online').length}"
        channels: "${guild.channels.length}"
    
    leaderboard:
      path: /widget/leaderboard/:guild_id
      template: ./theme/widgets/leaderboard.html
      public: true
      cache_ttl: 5m
```

---

## 23. Built-in Component Library ✅

Pre-built, configurable behavior packages. Enable them with minimal config. Every built-in is equivalent to a set of commands, events, flows, and state definitions — the runtime expands them.

### 23.1 Moderation Suite

```yaml
builtins:
  moderation:
    enabled: true
    config:
      log_channel: "#mod-log"
      dm_on_action: true
      case_numbers: true
      appeal_channel: "#appeals"
      auto_escalation:
        enabled: true
        thresholds:
          warn_to_mute: 3
          mute_to_kick: 2
          kick_to_ban: 2
      
    # this expands to provide:
    # commands: /warn, /kick, /ban, /unban, /mute, /unmute, /purge, /slowmode, /lockdown, /case, /history, /reason
    # tables: mod_cases, mod_notes
    # flows: escalation_check, mod_log_post
```

### 23.2 Welcome & Farewell

```yaml
  welcome:
    enabled: true
    config:
      welcome_channel: "#welcome"
      farewell_channel: "#farewell"
      welcome_message: "Welcome {user_mention} to **{guild_name}**! 🎉"
      farewell_message: "**{user_name}** has left us. 😢"
      welcome_embed: true
      welcome_image: generated               # none | generated | static
      auto_role: "Member"
      welcome_dm:
        enabled: true
        message: |
          Welcome to **{guild_name}**!
          
          Here are some channels to get started:
          • {rules_channel} — Server rules
          • {roles_channel} — Pick your roles  
          • {general_channel} — Say hello!
```

### 23.3 Reaction Roles

```yaml
  reaction_roles:
    enabled: true
    config:
      mode: button                           # reaction | button | select_menu
      messages:
        - channel: "#roles"
          embed:
            title: "🎨 Color Roles"
            description: "Pick your color!"
          roles:
            - emoji: "🔴"
              role: "Red"
              label: "Red"
            - emoji: "🔵"
              role: "Blue"
              label: "Blue"
            - emoji: "🟢"
              role: "Green"
              label: "Green"
          exclusive: true                    # can only have one from this group
        
        - channel: "#roles"
          embed:
            title: "🔔 Notification Roles"
            description: "Choose what to be notified about"
          roles:
            - emoji: "📢"
              role: "Announcements"
              label: "Announcements"
            - emoji: "🎮"
              role: "Game Night"
              label: "Game Night Pings"
            - emoji: "🎵"
              role: "Music Events"
              label: "Music Events"
          exclusive: false                   # can have multiple
```

### 23.4 Ticket System

```yaml
  tickets:
    enabled: true
    config:
      category: "Support Tickets"
      log_channel: "#ticket-log"
      support_roles: ["Support Staff", "Moderator"]
      
      creation:
        channel: "#open-ticket"
        button_label: "Open a Ticket"
        button_emoji: "🎫"
        modal: true                          # ask questions first
        modal_fields:
          - label: "Subject"
            required: true
          - label: "Description"
            style: paragraph
            required: true
          - label: "Priority"
            placeholder: "low / normal / high"
            required: false
      
      behavior:
        auto_assign: false
        claim_system: true
        max_open_per_user: 3
        auto_close_inactive: 48h
        transcript_on_close: true
        transcript_format: html              # html | txt | json
        ping_support_on_create: true
        thread_mode: false                   # use threads instead of channels
      
      categories:
        - name: "General Support"
          emoji: "❓"
        - name: "Bug Report"
          emoji: "🐛"
        - name: "Feature Request"
          emoji: "💡"
        - name: "Billing"
          emoji: "💰"
          support_roles: ["Billing Team"]    # override support roles per category
```

### 23.5 Leveling / XP System

```yaml
  leveling:
    enabled: true
    config:
      xp_per_message:
        min: 5
        max: 15
      cooldown: 60s                          # XP gain cooldown per user
      
      level_formula: "5 * (level ^ 2) + 50 * level + 100"
      
      notifications:
        channel: "#level-ups"                # null for same channel
        message: "🎉 **{user_name}** reached level **{level}**!"
        dm: false
      
      role_rewards:
        5: "Active Member"
        10: "Regular"
        20: "Veteran"
        50: "Legend"
        100: "Mythic"
      
      multipliers:
        - channel: "#serious-discussion"
          multiplier: 2.0
        - role: "Booster"
          multiplier: 1.5
        - weekend:
          multiplier: 1.25
      
      ignored_channels:
        - "#bot-commands"
        - "#spam"
      
      leaderboard:
        command: /leaderboard
        per_page: 10
        show_rank_card: true
        rank_card_template: rank_card        # reference to theme generator
      
      # expands to:
      # commands: /rank, /leaderboard, /xp, /setxp (admin), /resetxp (admin)
      # state: user_xp, user_level, user_total_messages
      # events: message_create (XP gain), custom.xp_level_up
```

### 23.6 Music Player

```yaml
  music:
    enabled: true
    config:
      sources:
        - youtube
        - soundcloud
        - spotify_metadata                   # search spotify, play from youtube
        - direct_url
        - local_files
      
      default_volume: 50
      max_queue_size: 500
      max_song_duration: 2h
      
      dj_role: "DJ"
      dj_only_commands: [skip, clear, shuffle, volume, remove, forceskip]
      
      auto_leave:
        on_empty_channel: true
        delay: 5m
        on_empty_queue: true
        queue_delay: 2m
      
      vote_skip:
        enabled: true
        threshold: 50                        # percentage
      
      now_playing:
        show_progress_bar: true
        update_interval: 30s
        show_in_status: true
      
      playlists:
        enabled: true
        max_per_user: 10
        max_tracks_per_playlist: 200
      
      # expands to:
      # commands: /play, /skip, /stop, /queue, /now, /volume, /pause, /resume, /shuffle, /loop,
      #           /remove, /move, /seek, /replay, /playlist, /lyrics, /grab (DM current song)
      # voice: full voice connection management
      # state: guild queue, now playing, volume
```

### 23.7 Logging

```yaml
  logging:
    enabled: true
    config:
      channels:
        message_log: "#message-log"
        member_log: "#member-log"
        mod_log: "#mod-log"
        voice_log: "#voice-log"
        server_log: "#server-log"
      
      events:
        message_delete: { enabled: true, channel: message_log }
        message_edit: { enabled: true, channel: message_log }
        message_bulk_delete: { enabled: true, channel: message_log }
        member_join: { enabled: true, channel: member_log }
        member_leave: { enabled: true, channel: member_log }
        member_ban: { enabled: true, channel: mod_log }
        member_unban: { enabled: true, channel: mod_log }
        member_role_update: { enabled: true, channel: member_log }
        member_nickname_update: { enabled: true, channel: member_log }
        voice_join: { enabled: true, channel: voice_log }
        voice_leave: { enabled: true, channel: voice_log }
        voice_move: { enabled: true, channel: voice_log }
        channel_create: { enabled: true, channel: server_log }
        channel_delete: { enabled: true, channel: server_log }
        role_create: { enabled: true, channel: server_log }
        role_delete: { enabled: true, channel: server_log }
        invite_create: { enabled: true, channel: server_log }
        emoji_update: { enabled: true, channel: server_log }
      
      # attach audit log info when available
      attach_audit_log: true
      
      # ignore these
      ignored_channels: ["#bot-commands"]
      ignored_roles: ["Bot"]
      ignored_users: []
```

### 23.8 Starboard

```yaml
  starboard:
    enabled: true
    config:
      channel: "#starboard"
      emoji: "⭐"
      threshold: 3                           # reactions needed
      self_star: false                       # can authors star own messages
      ignored_channels: ["#nsfw", "#bot-commands"]
      max_age: 7d                            # only star messages within 7 days
      embed_color: "#f1c40f"
      show_jump_link: true
      # multiple starboards with different thresholds
      tiers:
        - emoji: "⭐"
          threshold: 3
          channel: "#starboard"
        - emoji: "🌟"
          threshold: 10
          channel: "#hall-of-fame"
```

### 23.9 Polls

```yaml
  polls:
    enabled: true
    config:
      max_options: 10
      max_duration: 7d
      allow_multiple: configurable           # always | never | configurable
      anonymous: false
      show_live_results: true
      
      # expands to:
      # commands: /poll create, /poll end, /poll results
      # components: poll buttons/select menus
      # state: active polls, votes
```

### 23.10 Giveaways

```yaml
  giveaways:
    enabled: true
    config:
      default_emoji: "🎉"
      min_duration: 1m
      max_duration: 30d
      max_winners: 20
      
      requirements:
        min_account_age: null
        min_guild_age: null
        required_roles: []
        required_level: null
      
      # expands to:
      # commands: /giveaway start, /giveaway end, /giveaway reroll, /giveaway list
      # scheduler: giveaway end timers
      # state: active giveaways, entries
```

### 23.11 Auto-Responder / Custom Commands

```yaml
  auto_responder:
    enabled: true
    config:
      prefix: "!"                            # for text-based triggers
      
      responses:
        - trigger:
            type: exact                      # exact | contains | startswith | regex | wildcard
            value: "!rules"
          response:
            content: "Please read the rules in ${state.get('rules_channel').mention}!"
          cooldown: 10s
        
        - trigger:
            type: contains
            value: "good bot"
            case_sensitive: false
          response:
            reactions: ["❤️"]
        
        - trigger:
            type: regex
            value: "(?i)^(hi|hello|hey)\\s*(bot|buddy)?"
          response:
            content: "${random_choice(['Hey there!', 'Hello!', 'Hi! 👋', 'Sup!'])}"
          cooldown: 30s
          chance: 0.5                        # 50% chance to respond
```

### 23.12 AFK System

```yaml
  afk:
    enabled: true
    config:
      max_message_length: 200
      auto_remove_on_message: true
      notify_on_mention: true
      
      # expands to:
      # commands: /afk
      # events: message_create (mention detection, auto-remove)
      # state: afk_status per member
```

### 23.13 Reminders

```yaml
  reminders:
    enabled: true
    config:
      max_per_user: 25
      max_duration: 365d
      min_duration: 1m
      
      # expands to:
      # commands: /remind, /reminders list, /reminders delete
      # scheduler: reminder_check
      # tables: reminders
```

### 23.14 Utility Commands

```yaml
  utilities:
    enabled: true
    commands:
      - server_info                          # /serverinfo
      - user_info                            # /userinfo
      - role_info                            # /roleinfo
      - channel_info                         # /channelinfo
      - avatar                               # /avatar [user]
      - banner                               # /banner [user]
      - emoji_info                           # /emoji <emoji>
      - invite_info                          # /inviteinfo <code>
      - first_message                        # /firstmessage [channel]
      - snipe                                # /snipe — show last deleted message
      - edit_snipe                           # /editsnipe — show last edited message
      - poll                                 # quick inline polls
      - timestamp                            # /timestamp <time> — generate Discord timestamp
      - color                                # /color <hex> — show a color
      - math                                 # /math <expression>
      - base64                               # /base64 encode|decode
      - qrcode                               # /qrcode <text>
```

---

## 24. Full Example ✅

A complete bot definition for a maker community server:

```yaml
# furlow.yaml — HACKSPACE BOT

version: "1.0"

identity:
  name: "SparkBot"
  avatar: ./assets/spark-avatar.png
  about: "The hackspace's trusty sidekick"

presence:
  status: online
  dynamic:
    - when: "${voice.active}"
      activity:
        type: listening
        text: "the shop"
    - default:
        activity:
          type: watching
          text: "${guild.member_count} makers"

intents:
  auto: true

bot_permissions:
  general: [view_channels, manage_channels, manage_roles, view_audit_log]
  membership: [kick_members, ban_members, moderate_members]
  text: [send_messages, manage_messages, embed_links, attach_files, read_message_history, add_reactions, use_slash_commands]
  voice: [connect, speak, move_members]

access:
  roles:
    board:
      discord_roles: ["Board Member"]
    keyholder:
      discord_roles: ["Keyholder", "Board Member"]
    member:
      discord_roles: ["Member"]
    everyone:
      default: true
  rate_limits:
    default:
      per_user: 5/10s

state:
  variables:
    space_status:
      type: string
      default: "closed"
      scope: guild
      configurable: true
    door_last_opened:
      type: datetime
      scope: guild

theme:
  colors:
    primary: "#ff6600"
    accent: "#00ff88"
  emoji:
    open: "🟢"
    closed: "🔴"
    spark: "⚡"

commands:
  - name: space
    description: "Check or update the hackspace status"
    subcommands:
      - name: status
        description: "Check if the space is open"
        permissions: [everyone]
        actions:
          - reply:
              content: "${state.get('space_status') == 'open' ? '🟢 The space is **OPEN**!' : '🔴 The space is **CLOSED**.'}"
      
      - name: open
        description: "Mark the space as open"
        permissions: [keyholder]
        actions:
          - set:
              variable: space_status
              value: "open"
          - set:
              variable: door_last_opened
              value: "${now()}"
          - send_message:
              channel: "#announcements"
              content: "🟢 **The space is now OPEN!** Opened by ${user.mention}."
          - reply:
              content: "Space marked as open."
              ephemeral: true
      
      - name: close
        description: "Mark the space as closed"
        permissions: [keyholder]
        actions:
          - set:
              variable: space_status
              value: "closed"
          - send_message:
              channel: "#announcements"
              content: "🔴 **The space is now CLOSED.**"
          - reply:
              content: "Space marked as closed."
              ephemeral: true

events:
  member_join:
    - name: welcome
      actions:
        - send_message:
            channel: "#welcome"
            content: "⚡ Welcome ${member.mention}! Check out #rules and #introduce-yourself."
        - assign_role:
            user: "${member}"
            role: "Visitor"

pipes:
  mqtt_broker:
    type: mqtt
    broker: "mqtt://10.0.0.1:1883"
    subscriptions:
      - topic: "hackspace/door/status"
        handler:
          actions:
            - flow_if:
                condition: "${pipe.data == 'open'}"
                then:
                  - set:
                      variable: space_status
                      value: "open"
                  - send_message:
                      channel: "#space-status"
                      content: "🚪 Door sensor: **OPEN**"
                else:
                  - set:
                      variable: space_status
                      value: "closed"
                  - send_message:
                      channel: "#space-status"
                      content: "🚪 Door sensor: **CLOSED**"
      
      - topic: "hackspace/env/temperature"
        handler:
          actions:
            - set:
                variable: shop_temp
                value: "${pipe.data}"

builtins:
  moderation:
    enabled: true
    config:
      log_channel: "#mod-log"
  
  welcome:
    enabled: false                           # using custom welcome above
  
  leveling:
    enabled: true
    config:
      xp_per_message: { min: 5, max: 10 }
      cooldown: 120s
      notifications:
        channel: "#general"
      role_rewards:
        5: "Active Maker"
        15: "Shop Regular"
        30: "Hackspace Veteran"
  
  logging:
    enabled: true
    config:
      channels:
        message_log: "#message-log"
        member_log: "#member-log"
        mod_log: "#mod-log"
  
  tickets:
    enabled: true
    config:
      category: "Support"
      support_roles: ["Board Member", "Keyholder"]
      creation:
        channel: "#help"
        button_label: "Ask for Help"
  
  utilities:
    enabled: true
    commands: [server_info, user_info, avatar]

scheduler:
  jobs:
    nightly_close_reminder:
      cron: "0 22 * * *"
      timezone: "America/Phoenix"
      actions:
        - flow_if:
            condition: "${state.get('space_status') == 'open'}"
            then:
              - send_message:
                  channel: "#keyholders"
                  content: "🔔 The space is still marked as **open**. Don't forget to close up!"
```

---

## Appendix A: Duration Format

Durations are expressed as human-readable strings:

| Format | Meaning |
|---|---|
| `5s` | 5 seconds |
| `10m` | 10 minutes |
| `2h` | 2 hours |
| `1d` | 1 day |
| `7d` | 7 days |
| `30d` | 30 days |
| `1h30m` | 1 hour 30 minutes |
| `2d12h` | 2 days 12 hours |

## Appendix B: Color Format

Colors can be:
- Hex: `"#ff6600"`, `"#f60"`
- Named: `"red"`, `"blurple"`
- Theme reference: `"${theme.colors.primary}"`
- Discord brand: `"blurple"` (#5865F2), `"green"` (#57F287), `"yellow"` (#FEE75C), `"fuchsia"` (#EB459E), `"red"` (#ED4245)
- Integer: `16744192`

## Appendix C: Channel Reference Format

Channels can be referenced by:
- Name: `"#general"` (resolved per-guild)
- ID: `"123456789012345678"`
- Expression: `"${state.get('welcome_channel')}"`
- Variable: `"${channel}"`

## Appendix D: Permission Flags (Complete)

`create_instant_invite`, `kick_members`, `ban_members`, `administrator`, `manage_channels`, `manage_guild`, `add_reactions`, `view_audit_log`, `priority_speaker`, `stream`, `view_channel`, `send_messages`, `send_tts_messages`, `manage_messages`, `embed_links`, `attach_files`, `read_message_history`, `mention_everyone`, `use_external_emojis`, `view_guild_insights`, `connect`, `speak`, `mute_members`, `deafen_members`, `move_members`, `use_vad`, `change_nickname`, `manage_nicknames`, `manage_roles`, `manage_webhooks`, `manage_emojis_and_stickers`, `manage_guild_expressions`, `use_application_commands`, `request_to_speak`, `manage_events`, `manage_threads`, `create_public_threads`, `create_private_threads`, `use_external_stickers`, `send_messages_in_threads`, `use_embedded_activities`, `moderate_members`, `view_creator_monetization_analytics`, `use_soundboard`, `create_guild_expressions`, `create_events`, `use_external_sounds`, `send_voice_messages`, `send_polls`, `use_external_apps`

---

*FURLOW v0.1.0-draft — Flexible User Rules for Live Online Workers*
*A spec by the makers, for the makers.*
