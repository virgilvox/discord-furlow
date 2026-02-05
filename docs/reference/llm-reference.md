# FURLOW Complete LLM Reference

This is a comprehensive reference for AI assistants to help users build Discord bots with FURLOW - a declarative YAML-based framework.

## Quick Start Template

```yaml
version: "0.1"

identity:
  name: "My Bot"

commands:
  - name: ping
    description: Check bot latency
    actions:
      - reply:
          content: "Pong! ${client.ping}ms"
```

---

## YAML Syntax Rules (Critical)

**IMPORTANT: Follow these rules exactly to generate valid YAML.**

### Rule 1: Always Quote Strings Containing Special Characters

Strings with these characters MUST be wrapped in double quotes `"`:
- Colons `:`
- Square brackets `[` `]`
- Curly braces `{` `}`
- Hash/pound `#`
- Pipe `|` (when not at line start)
- Greater than `>`
- Asterisk `*`
- Ampersand `&`
- Exclamation `!`
- Percent `%`
- At sign `@`
- Backtick `` ` ``

```yaml
# WRONG - will cause parse errors
content: ${shuffle(['🍒','🍋','🔔'])}
content: Check this: important

# CORRECT - quoted strings
content: "${shuffle(['🍒','🍋','🔔'])}"
content: "Check this: important"
```

### Rule 2: Expression Syntax by Field Type

FURLOW has two types of expression fields:

**Interpolated fields** (content, title, description, etc.) - use `${}` syntax:
```yaml
content: "Hello ${user.username}!"
value: "${random(1, 100)}"
title: "Welcome to ${guild.name}"
```

**Evaluated fields** (when, condition, flow_if.if) - use raw JEXL expressions WITHOUT `${}`:
```yaml
# WRONG - causes ExpressionSyntaxError
when: "${member.roles.includes('admin')}"
when: "${!message.author.bot}"

# CORRECT - raw expression without ${}
when: "member.roles.includes('admin')"
when: "!message.author.bot"
```

**Common evaluated fields:**
- `when` - condition on events, commands, actions
- `condition` / `if` - flow_if conditional branching
- `while` - flow_while loop condition

### Rule 3: Escape Quotes Inside Strings

When your string contains double quotes, escape them with backslash:

```yaml
# WRONG - breaks YAML parsing
content: "She said "hello" to me"

# CORRECT - escaped quotes
content: "She said \"hello\" to me"
```

### Rule 4: Use Block Scalars for Long/Multi-line Strings

For long strings or strings with many special characters, use YAML block scalars:

```yaml
# Literal block (|) - preserves newlines
content: |
  Line 1
  Line 2
  Line 3

# Folded block (>) - joins lines with spaces
content: >
  This is a very long message that
  spans multiple lines but will be
  joined into a single line.

# Block scalar with expressions - still needs quotes inside
content: |
  Welcome to the server!
  Your ID is: ${user.id}
  Enjoy your stay!
```

### Rule 5: Arrays Inside Expressions

When expressions contain arrays, always double-quote the entire expression:

```yaml
# WRONG - YAML interprets [] as array syntax
content: ${nth(shuffle(['a','b','c']), 0)}

# CORRECT
content: "${nth(shuffle(['a','b','c']), 0)}"
```

### Rule 6: Strings Starting with Special Values

Quote strings that could be interpreted as other YAML types:

```yaml
# WRONG - interpreted as boolean/null
status: yes
status: no
status: true
status: null
value: 1.0

# CORRECT
status: "yes"
status: "no"
status: "true"
status: "null"
value: "1.0"  # if you want a string, not number
```

### Rule 7: Emoji in Strings

Emoji usually work fine, but always quote strings containing them to be safe:

```yaml
# Safe
content: "🎉 Congratulations! 🎉"
emoji: "🍒"
```

### Complete Example with All Rules Applied

```yaml
commands:
  - name: slots
    description: "Play the slot machine"
    actions:
      - reply:
          content: "${nth(shuffle(['🍒','🍋','🔔','⭐','💎','7️⃣']), 0)} | ${nth(shuffle(['🍒','🍋','🔔','⭐','💎','7️⃣']), 1)} | ${nth(shuffle(['🍒','🍋','🔔','⭐','💎','7️⃣']), 2)}"

  - name: eightball
    description: "Ask the magic 8-ball"
    options:
      - name: question
        type: string
        required: true
        description: "Your question"
    actions:
      - reply:
          content: "${nth(shuffle(['It is certain.','Without a doubt.','Yes, definitely.','Most likely.','Outlook good.','Signs point to yes.','Reply hazy, try again.','Ask again later.','Cannot predict now.','Don\\'t count on it.','My reply is no.','Very doubtful.']), 0)}"

  - name: say
    description: "Make the bot say something"
    options:
      - name: message
        type: string
        required: true
        description: "The message to send"
    actions:
      - send_message:
          channel: "${channel.id}"
          content: "${options.message}"
      - reply:
          content: "Message sent!"
          ephemeral: true
```

---

## YAML Specification

### Top-Level Keys

| Key | Required | Description |
|-----|----------|-------------|
| `version` | Yes | Spec version (currently `"0.1"`) |
| `identity` | No | Bot branding (name, avatar, description) |
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

### Identity

```yaml
identity:
  name: "My Bot"
  avatar: "https://example.com/avatar.png"
  description: "A helpful Discord bot"
```

### Presence

```yaml
presence:
  status: online  # online | idle | dnd | invisible
  activity:
    type: playing  # playing | streaming | listening | watching | competing | custom
    text: "with YAML"
    url: "https://twitch.tv/..."  # for streaming type
    state: "Status text"  # for custom type
```

### Permissions

```yaml
permissions:
  owner:
    users:
      - "123456789012345678"
  levels:
    - name: Everyone
      level: 0
    - name: Moderator
      level: 1
      roles:
        - "111111111111111111"
      permissions:
        - manage_messages
    - name: Admin
      level: 2
      roles:
        - "222222222222222222"
      permissions:
        - administrator
    - name: Owner
      level: 3
      users:
        - "123456789012345678"
  defaults:
    allow:
      level: 0
```

### State

```yaml
state:
  storage:
    type: sqlite  # memory | sqlite | postgres
    path: ./data.db
  variables:
    counter:
      scope: guild  # global | guild | channel | user | member
      type: number  # string | number | boolean | object | array
      default: 0
  tables:
    users:
      columns:
        id:
          type: string
          primary: true
        name:
          type: string
        xp:
          type: number
          default: 0
```

**Accessing State Variables:**

State variables are accessed using `state.{scope}.{varname}`:

```yaml
# Set a variable
- set:
    var: "counter"
    value: 10
    scope: guild

# Access in expressions
content: "Count: ${state.guild.counter}"
```

| Scope | Access Pattern | Description |
|-------|----------------|-------------|
| `global` | `state.global.varname` | Shared across all guilds |
| `guild` | `state.guild.varname` | Per-server state |
| `channel` | `state.channel.varname` | Per-channel state |
| `user` | `state.user.varname` | Per-user (across guilds) |
| `member` | `state.member.varname` | Per-member (user in specific guild) |

### Commands

```yaml
commands:
  - name: greet
    description: Greet a user
    options:
      - name: user
        type: user  # string | integer | number | boolean | user | channel | role | mentionable | attachment
        description: User to greet
        required: false
    cooldown:
      rate: 1           # max uses
      per: user         # user | channel | guild
      duration: 5s      # time window
      message: "Please wait before using this again."  # optional
    permissions: SEND_MESSAGES
    level: 0
    when: "guild.id == '123'"
    actions:
      - reply:
          content: "Hello, ${options.user?.displayName ?? user.username}!"
```

**Commands with Subcommands:**

```yaml
commands:
  - name: settings
    description: Server settings
    subcommands:
      - name: view
        description: View current settings
        actions:
          - reply:
              content: "Current prefix: ${state.guild.prefix ?? '!'}"
      - name: prefix
        description: Change prefix
        options:
          - name: value
            type: string
            description: New prefix
            required: true
        actions:
          - set:
              var: prefix
              value: "${options.value}"
              scope: guild
          - reply:
              content: "Prefix set to ${options.value}"
```

**Commands with Subcommand Groups:**

```yaml
commands:
  - name: admin
    description: Admin commands
    subcommand_groups:
      - name: user
        description: User management
        subcommands:
          - name: ban
            description: Ban a user
            options:
              - name: target
                type: user
                required: true
                description: User to ban
            actions:
              - ban:
                  user: "${options.target.id}"
```

### Context Menus

```yaml
context_menus:
  - name: Report User
    type: user  # user | message
    permissions: MODERATE_MEMBERS
    actions:
      - reply:
          content: "Reported ${target.user.tag}"
          ephemeral: true
```

### Events

```yaml
events:
  - event: guild_member_add
    when: "!member.user.bot"
    debounce: 5s
    throttle: 1m
    once: false
    actions:
      - send_message:
          channel: "${env.WELCOME_CHANNEL}"
          content: "Welcome, ${member.displayName}!"
```

### Flows

```yaml
flows:
  log_action:
    params:
      - name: action
        type: string
        required: true
      - name: target
        type: string
    actions:
      - send_message:
          channel: "${state.guild.log_channel}"
          content: "${action}: ${target}"
    returns: "${action}"
```

Call flows with:
```yaml
- call_flow:
    flow: log_action
    args:
      action: "Ban"
      target: "${user.tag}"
```

### Components

```yaml
components:
  buttons:
    confirm_btn:
      type: button
      style: success  # primary | secondary | success | danger | link
      label: "Confirm"
      emoji: "✅"
      actions:
        - update_message:
            content: "Confirmed!"
            components: []

    cancel_btn:
      type: button
      style: danger
      label: "Cancel"
      actions:
        - update_message:
            content: "Cancelled."
            components: []

  selects:
    role_select:
      type: select
      placeholder: "Select roles"
      min_values: 1
      max_values: 3
      options:
        - label: "Red Team"
          value: "red"
          emoji: "🔴"
        - label: "Blue Team"
          value: "blue"
          emoji: "🔵"
      actions:
        - batch:
            items: "${interaction.values}"
            as: role
            each:
              - toggle_role:
                  role: "${state.guild.roles[role]}"

  modals:
    feedback_modal:
      custom_id: "feedback_modal"
      title: "Submit Feedback"
      components:
        - type: action_row
          components:
            - type: text_input
              custom_id: "feedback_text"
              label: "Your Feedback"
              style: paragraph  # short | paragraph
              required: true
      actions:
        - send_message:
            channel: "${state.guild.feedback_channel}"
            content: "${fields.feedback_text}"
```

### Embeds

```yaml
embeds:
  welcome:
    title: "Welcome to ${guild.name}!"
    description: "Thanks for joining"
    color: 0x5865F2
    thumbnail:
      url: "${user.displayAvatarURL}"  # Full URL required for embeds
    fields:
      - name: Members
        value: "${guild.memberCount}"
        inline: true
    footer:
      text: "User #${guild.memberCount}"
    timestamp: true
```

Use with `$ref`:
```yaml
- send_message:
    embeds:
      - $ref: embeds.welcome
```

### Theme

```yaml
theme:
  primary: "#5865F2"
  success: "#57F287"
  warning: "#FEE75C"
  danger: "#ED4245"
```

### Voice

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

### Pipes

```yaml
pipes:
  api:
    type: http
    base_url: "https://api.example.com"
    auth:
      type: bearer
      token: "${env.API_TOKEN}"
    timeout: "30s"
    retry:
      attempts: 3
      delay: "1s"

  events:
    type: websocket
    url: "wss://events.example.com"
    reconnect:
      enabled: true
      delay: "5s"
      max_attempts: 10
    handlers:
      - event: "message"
        actions:
          - log:
              message: "Received: ${data}"

  incoming:
    type: webhook
    path: "/webhook/github"
    method: POST
    verification:
      type: hmac
      secret: "${env.WEBHOOK_SECRET}"
      header: "X-Hub-Signature-256"
      algorithm: sha256
    handlers:
      - event: "push"
        actions:
          - send_message:
              channel: "${state.guild.dev_channel}"
              content: "New push to ${payload.repository.name}"
```

### Automod

```yaml
automod:
  enabled: true
  log_channel: "${env.MOD_LOG_CHANNEL}"
  rules:
    - name: bad_words
      trigger:
        type: keyword      # keyword | regex | link | invite | caps | emoji_spam | mention_spam | newline_spam
        keywords:
          - "badword1"
          - "badword2"
      exempt:
        roles:
          - "mod_role_id"
        channels:
          - "spam_channel_id"
      actions:
        - delete_message: {}
        - send_dm:
            user: "${user.id}"
            content: "Your message was removed for containing prohibited content."
    - name: too_many_mentions
      trigger:
        type: mention_spam
        threshold: 5       # trigger if 5+ mentions
      actions:
        - timeout:
            user: "${user.id}"
            duration: "5m"
            reason: "Mention spam"
```

**Automod Trigger Types:**
- `keyword` - Match specific words (keywords array, optional allowed array)
- `regex` - Match regex patterns (regex array)
- `link` - Block links (optional allowed/blocked domain arrays)
- `invite` - Block Discord invites
- `caps` - Excessive caps (threshold % default 70)
- `emoji_spam` - Too many emojis (threshold default 10)
- `mention_spam` - Too many mentions (threshold default 5)
- `newline_spam` - Excessive newlines (threshold default 10)
- `attachment` - Block attachments (threshold count, blocked/allowed extensions)
- `spam` - Message rate limiting (threshold count, window duration e.g. "10s")
- `duplicate` - Repeated message detection (threshold count, window duration e.g. "1m")

### Scheduler

```yaml
scheduler:
  enabled: true
  timezone: UTC
  tasks:
    - name: daily_backup
      cron: "0 0 * * *"
      actions:
        - call_flow:
            flow: backup_data
```

### Canvas

```yaml
canvas:
  enabled: true
  fonts_dir: ./fonts
  generators:
    welcome_card:
      width: 800
      height: 300
      background: "#23272A"
      layers:
        - type: circle_image
          x: 320
          y: 40
          radius: 80
          src: "${user.displayAvatarURL}"  # Use displayAvatarURL for the full URL
        - type: text
          x: 400
          y: 215
          text: "Welcome, ${member.displayName}!"
          font: sans-serif
          size: 32
          color: "#FFFFFF"
          align: center
```

### Imports

```yaml
imports:
  - commands/*.yaml
  - events/*.yaml
  - flows/moderation.yaml
```

---

## Action Syntax

FURLOW supports **shorthand action syntax** for cleaner YAML:

```yaml
# Shorthand (recommended) - action name as key
- reply:
    content: "Hello!"
    ephemeral: true

# Verbose (also valid) - explicit action field
- action: reply
  content: "Hello!"
  ephemeral: true
```

Both formats work identically. The shorthand format is normalized internally before execution.

**Conditional Actions with `when`:**

```yaml
# Execute action only when condition is true
- reply:
    content: "You have admin!"
    when: "member.permissions.has('ADMINISTRATOR')"
```

---

## Actions Reference (85 Actions)

### Message Actions (11)

| Action | Description |
|--------|-------------|
| `reply` | Reply to an interaction |
| `send_message` | Send message to channel |
| `edit_message` | Edit existing message |
| `delete_message` | Delete a message |
| `defer` | Defer interaction (for slow commands) |
| `update_message` | Update component interaction message |
| `add_reaction` | Add reaction to message |
| `add_reactions` | Add multiple reactions |
| `remove_reaction` | Remove a reaction |
| `clear_reactions` | Clear reactions |
| `bulk_delete` | Delete multiple messages |

```yaml
# reply
- reply:
    content: "Hello!"
    ephemeral: true
    embeds:
      - title: "Title"
        description: "Description"
        color: 0x5865F2
    components:
      - type: action_row
        components:
          - type: button
            label: "Click"
            custom_id: "btn_1"
    files:
      - attachment: "${image}"
        name: "image.png"

# send_message
- send_message:
    channel: "${channel.id}"
    content: "Message"
    as: "sent_message"

# edit_message
- edit_message:
    message: "${message.id}"
    channel: "${channel.id}"
    content: "Updated"

# delete_message
- delete_message:
    message: "${message.id}"
    channel: "${channel.id}"

# defer - USE FIRST for slow commands (>3s)
- defer:
    ephemeral: true

# update_message (for button/select interactions)
- update_message:
    content: "Updated!"
    components: []

# add_reaction
- add_reaction:
    message: "${message.id}"
    channel: "${channel.id}"
    emoji: "check"

# bulk_delete
- bulk_delete:
    channel: "${channel.id}"
    count: 10
```

### Member Actions (14)

| Action | Description |
|--------|-------------|
| `assign_role` | Add role to member |
| `remove_role` | Remove role from member |
| `toggle_role` | Toggle role on/off |
| `kick` | Kick member |
| `ban` | Ban user |
| `unban` | Remove ban |
| `timeout` | Timeout member |
| `remove_timeout` | Remove timeout |
| `send_dm` | Send direct message |
| `set_nickname` | Change nickname |
| `move_member` | Move to voice channel |
| `disconnect_member` | Disconnect from voice |
| `server_mute` | Server mute |
| `server_deafen` | Server deafen |

```yaml
# assign_role
- assign_role:
    user: "${user.id}"
    role: "123456789"
    reason: "Role assigned"

# remove_role
- remove_role:
    user: "${user.id}"
    role: "123456789"

# toggle_role
- toggle_role:
    user: "${user.id}"
    role: "123456789"

# kick
- kick:
    user: "${user.id}"
    reason: "Violation"
    dm_user: true                    # Optional: DM user before kicking
    dm_message: "You were kicked."   # Optional: Message to send

# ban
- ban:
    user: "${user.id}"
    reason: "Repeated violations"
    delete_message_days: 7
    dm_user: true                    # Optional: DM user before banning
    dm_message: "You were banned."   # Optional: Message to send

# unban
- unban:
    user: "${user.id}"
    reason: "Appeal accepted"

# timeout
- timeout:
    user: "${user.id}"
    duration: "1h"
    reason: "Cool down"
    dm_user: true                    # Optional: DM user when timed out
    dm_message: "You were timed out for 1h."  # Optional: Message to send

# remove_timeout
- remove_timeout:
    user: "${user.id}"

# send_dm
- send_dm:
    user: "${user.id}"
    content: "Hello!"

# set_nickname
- set_nickname:
    user: "${user.id}"
    nickname: "New Nick"

# move_member
- move_member:
    user: "${user.id}"
    channel: "${options.channel.id}"

# disconnect_member
- disconnect_member:
    user: "${user.id}"

# server_mute
- server_mute:
    user: "${user.id}"
    muted: true

# server_deafen
- server_deafen:
    user: "${user.id}"
    deafened: true
```

### State Actions (7)

| Action | Description |
|--------|-------------|
| `set` | Set variable value |
| `increment` | Increment number |
| `decrement` | Decrement number |
| `list_push` | Add to list |
| `list_remove` | Remove from list |
| `set_map` | Set map key |
| `delete_map` | Delete map key |

```yaml
# set
- set:
    var: "counter"
    value: 42
    scope: guild

# increment
- increment:
    var: "counter"
    by: 1
    scope: global

# decrement
- decrement:
    var: "counter"
    by: 1

# list_push
- list_push:
    var: "warnings"
    value: "${user.id}"
    scope: guild

# list_remove
- list_remove:
    var: "warnings"
    value: "${user.id}"

# set_map
- set_map:
    var: "user_data"
    map_key: "${user.id}"
    value:
      level: 5
      xp: 1000

# delete_map
- delete_map:
    var: "user_data"
    map_key: "${user.id}"
```

### Flow Actions (13)

| Action | Description |
|--------|-------------|
| `call_flow` | Call named flow |
| `abort` | Stop execution |
| `return` | Return value |
| `flow_if` | Conditional |
| `flow_switch` | Switch/case |
| `flow_while` | While loop |
| `repeat` | Repeat N times |
| `parallel` | Run in parallel |
| `batch` | Run with delay |
| `try` | Try/catch |
| `wait` | Wait duration |
| `log` | Log message |
| `emit` | Emit custom event |

```yaml
# call_flow
- call_flow:
    flow: "send_log"
    args:
      message: "Hello"

# abort
- abort:
    reason: "Invalid input"

# return
- return:
    value: "${result}"

# flow_if (use 'if:' or 'condition:' - both work)
- flow_if:
    if: "count > 10"      # Raw expression, no ${}
    then:
      - reply:
          content: "High"
    else:
      - reply:
          content: "Low"

# flow_switch
- flow_switch:
    value: "${options.choice}"
    cases:
      a:
        - reply:
            content: "Option A"
      b:
        - reply:
            content: "Option B"
    default:
      - reply:
          content: "Unknown"

# flow_while
- flow_while:
    while: "i < 10"           # Raw expression, no ${}
    do:
      - increment:
          var: "i"

# repeat
- repeat:
    times: 5
    as: "i"
    do:
      - log:
          message: "Iteration ${i}"

# parallel
- parallel:
    actions:
      - send_dm:
          user: "${user1.id}"
          content: "Hello"
      - send_dm:
          user: "${user2.id}"
          content: "Hello"

# batch
- batch:
    items: "${users}"
    as: "u"
    each:
      - send_dm:
          user: "${u.id}"
          content: "Message"
    concurrency: 1

# try
- try:
    do:
      - send_dm:
          user: "${user.id}"
          content: "Hello"
    catch:
      - log:
          level: error
          message: "DM failed"

# wait
- wait:
    duration: "5s"

# log
- log:
    level: info  # debug | info | warn | error
    message: "Something happened"

# emit
- emit:
    event: "custom_event"
    data:
      key: "value"
```

### Channel Actions (9)

| Action | Description |
|--------|-------------|
| `create_channel` | Create channel |
| `edit_channel` | Edit channel |
| `delete_channel` | Delete channel |
| `create_thread` | Create thread |
| `archive_thread` | Archive thread |
| `set_channel_permissions` | Set permissions |
| `create_role` | Create role |
| `edit_role` | Edit role |
| `delete_role` | Delete role |

```yaml
# create_channel
- create_channel:
    name: "new-channel"
    type: text  # text | voice | category | announcement | forum | stage
    parent: "${category.id}"
    topic: "Channel topic"
    as: "created_channel"

# edit_channel
- edit_channel:
    channel: "${channel.id}"
    name: "renamed"
    topic: "New topic"

# delete_channel
- delete_channel:
    channel: "${channel.id}"

# create_thread
- create_thread:
    name: "Thread Name"
    message: "${message.id}"  # optional - create from message
    auto_archive_duration: 1440  # 60 | 1440 | 4320 | 10080
    type: public  # public | private

# archive_thread
- archive_thread:
    thread: "${thread.id}"
    locked: true

# set_channel_permissions
- set_channel_permissions:
    channel: "${channel.id}"
    role: "${role.id}"  # use 'role' OR 'user' for member
    allow:
      - view_channel
      - send_messages
    deny:
      - manage_messages

# create_role
- create_role:
    name: "New Role"
    color: 0xFF0000
    hoist: true
    mentionable: false
    permissions:
      - send_messages

# edit_role
- edit_role:
    role: "${role.id}"
    name: "Updated Name"
    color: 0x00FF00

# delete_role
- delete_role:
    role: "${role.id}"
```

### Component Actions (1)

```yaml
# show_modal - reference a pre-defined modal
- show_modal:
    modal: "feedback_modal"

# show_modal - inline modal definition
- show_modal:
    modal:
      custom_id: "feedback_modal"
      title: "Feedback Form"
      components:
        - type: action_row
          components:
            - type: text_input
              custom_id: "feedback"
              label: "Your feedback"
              style: paragraph
              required: true
              placeholder: "Enter feedback..."
```

### Voice Actions (17)

| Action | Description |
|--------|-------------|
| `voice_join` | Join voice channel |
| `voice_leave` | Leave voice |
| `voice_play` | Play audio |
| `voice_pause` | Pause |
| `voice_resume` | Resume |
| `voice_stop` | Stop |
| `voice_skip` | Skip track |
| `voice_seek` | Seek position |
| `voice_volume` | Set volume |
| `voice_set_filter` | Apply filter |
| `voice_search` | Search tracks |
| `queue_get` | Get queue |
| `queue_add` | Add to queue |
| `queue_remove` | Remove from queue |
| `queue_clear` | Clear queue |
| `queue_shuffle` | Shuffle queue |
| `queue_loop` | Set loop mode |

```yaml
# voice_join
- voice_join:
    channel: "${options.channel.id}"
    self_deaf: true
    self_mute: false

# voice_leave
- voice_leave:
    guild: "${guild.id}"

# voice_play
- voice_play:
    source: "https://youtube.com/watch?v=..."
    volume: 50
    seek: "0s"

# voice_volume
- voice_volume:
    volume: 50  # or use 'level: 50'

# voice_seek
- voice_seek:
    position: "1m30s"

# voice_set_filter
- voice_set_filter:
    filter: bassboost  # bassboost | nightcore | vaporwave | 8d | treble | normalizer | karaoke | tremolo | vibrato | reverse
    enabled: true

# voice_search
- voice_search:
    query: "song name"
    limit: 5
    source: youtube  # youtube | soundcloud | spotify
    as: "search_results"

# queue_add
- queue_add:
    source: "https://youtube.com/watch?v=..."  # or use 'track:' from voice_search
    requester: "${user.id}"
    position: next  # number | 'next' | 'last'

# queue_loop
- queue_loop:
    mode: queue  # off | track | queue
```

### Database Actions (4)

```yaml
# db_insert
- db_insert:
    table: "users"
    data:
      id: "${user.id}"
      name: "${user.username}"
    as: "inserted"

# db_update
- db_update:
    table: "users"
    where:
      id: "${user.id}"
    data:
      name: "${options.name}"
    upsert: true   # Optional: insert if not exists, update if exists

# db_delete
- db_delete:
    table: "users"
    where:
      id: "${user.id}"

# db_query
- db_query:
    table: "users"
    where:
      guild_id: "${guild.id}"
    order_by: "xp DESC"
    limit: 10
    as: "top_users"
```

### Integration Actions (8)

```yaml
# pipe_request (uses a named pipe from pipes config)
- pipe_request:
    pipe: "api"
    path: "/data"
    method: GET
    headers:
      Authorization: "Bearer ${token}"
    body:
      key: "value"
    as: "response"

# pipe_send
- pipe_send:
    pipe: "websocket_pipe"
    data:
      type: "message"
      content: "Hello"

# webhook_send
- webhook_send:
    url: "${webhookUrl}"
    content: "Webhook message"
    username: "Bot Name"
    avatar_url: "https://..."

# create_timer
- create_timer:
    id: "reminder"
    duration: "1h"
    event: "timer_fire"
    data:
      user_id: "${user.id}"
      message: "Reminder!"

# cancel_timer
- cancel_timer:
    id: "reminder"

# counter_increment
- counter_increment:
    name: "commands_executed"
    labels:
      command: "ping"

# record_metric
- record_metric:
    name: "response_time"
    type: histogram  # counter | gauge | histogram
    value: 150
    labels:
      endpoint: "api"

# canvas_render (use pre-defined generator)
- canvas_render:
    generator: "welcome_card"
    context:
      user: "${member.user}"
    as: "welcome_image"

# render_layers (inline layers)
- render_layers:
    width: 800
    height: 400
    background: "#1a1a2e"
    layers:
      - type: rect
        x: 0
        y: 0
        width: 800
        height: 4
        color: "#5865F2"
      - type: circle_image
        x: 320
        y: 40
        radius: 80
        src: "${user.displayAvatarURL}"  # Full URL needed for canvas
      - type: text
        x: 400
        y: 200
        text: "Hello, ${member.displayName}!"
        font: sans-serif
        size: 32
        color: "#FFFFFF"
        align: center
      - type: progress_bar
        x: 100
        y: 350
        width: 600
        height: 30
        progress: "${xp / maxXp}"
        background: "#484b4e"
        fill: "#5865F2"
        radius: 15
    format: png
    as: "my_image"
```

**Canvas Layer Types:**
- `rect` - Rectangle
  - `x`, `y`, `width`, `height` - Position and size
  - `color` - Fill color
  - `radius` - Corner radius (optional)
  - `stroke` - Border { color, width } (optional)

- `text` - Text
  - `x`, `y` - Position
  - `text` - Text content (expressions supported)
  - `font` - Font family (default: sans-serif)
  - `size` - Font size in pixels (default: 16)
  - `color` - Text color
  - `align` - left | center | right (default: left)
  - `baseline` - top | middle | bottom | alphabetic (default: top)
  - `max_width` - Maximum text width (optional)
  - `stroke` - Text stroke { color, width } (optional)

- `image` - Image
  - `x`, `y` - Position
  - `src` - Image URL
  - `width`, `height` - Size (optional, uses image dimensions)
  - `opacity` - 0-1 (optional)

- `circle_image` - Circular image (for avatars)
  - `x`, `y` - Position (top-left of bounding box)
  - `src` or `url` - Image URL
  - `radius` - Circle radius
  - `border` - Border { color, width } (optional)

- `progress_bar` - Progress bar
  - `x`, `y`, `width`, `height` - Position and size
  - `progress` or `value` - Progress value 0-1 (or raw value if `max` specified)
  - `max` - Maximum value (optional, makes progress/value a raw number)
  - `background` - Background color
  - `fill` or `color` - Fill color
  - `radius` - Corner radius (optional)
  - `direction` - horizontal | vertical (default: horizontal)

- `gradient` - Gradient fill
  - `x`, `y`, `width`, `height` - Position and size
  - `direction` - horizontal | vertical | diagonal (default: horizontal)
  - `stops` - Array of { offset: 0-1, color }
  - `radius` - Corner radius (optional)

---

## Action Field Aliases (Important)

Many actions have field aliases for convenience. Both versions work:

| Action | Field | Alias |
|--------|-------|-------|
| `set`, `increment`, `decrement`, `list_push`, `list_remove`, `set_map`, `delete_map` | `var` | `key` |
| `edit_message`, `delete_message`, `add_reaction` | `message_id` | `message` |
| `flow_if` | `if` | `condition` |
| `voice_volume` | `level` | `volume` |
| `circle_image` layer | `src` | `url` |
| `progress_bar` layer | `progress` | `value` |
| `progress_bar` layer | `fill` | `color` |

**Required Fields:**
- `db_query` requires `as:` field (stores result in variable)
- `record_metric` requires `type:` field (`counter`, `gauge`, or `histogram`)
- Command options require `description:` field

---

## Expression Language

### Syntax

Expressions use `${}` syntax:
```yaml
content: "Hello, ${user.username}!"
content: "Result: ${1 + 2 * 3}"
content: "Time: ${timestamp(now(), 'relative')}"
```

### Context Variables

| Variable | Description |
|----------|-------------|
| `user` | User who triggered action |
| `member` | Guild member object |
| `guild` | Current guild/server |
| `channel` | Current channel |
| `message` | Message object (in message events) |
| `interaction` | Interaction object (in commands) |
| `options` | Command options |
| `args` | Alias for options |
| `client` | Bot client object |
| `state` | State variables (state.guild.varname, state.user.varname, etc.) |
| `env` | Environment variables (env.TOKEN) |

**IMPORTANT: CLI passes raw Discord.js objects with camelCase property names.**

The CLI uses raw Discord.js objects wrapped with a proxy that auto-resolves URL methods. This means:
- Use **camelCase** property names: `displayName`, `memberCount`, `createdAt`
- URL methods work as properties: `${user.displayAvatarURL}` returns the URL string (no parentheses needed)
- Access all Discord.js properties directly

**Common Context Properties:**

| Object | Property | Type | Description |
|--------|----------|------|-------------|
| `user` | `id` | string | User's Discord ID |
| `user` | `username` | string | Username |
| `user` | `tag` | string | Full user tag (username#0000) |
| `user` | `bot` | boolean | Whether user is a bot |
| `user` | `displayAvatarURL` | string | **Full avatar URL (auto-resolved, use for embeds/canvas)** |
| `user` | `avatarURL` | string | Avatar URL (auto-resolved) |
| `user` | `avatar` | string | Avatar hash (NOT a URL - don't use for images) |
| `user` | `createdAt` | Date | Account creation date |
| `member` | `displayName` | string | Display name in server (nickname or username) |
| `member` | `nickname` | string/null | Server nickname |
| `member` | `joinedAt` | Date | When member joined |
| `member` | `premiumSince` | Date/null | Boost start date |
| `member` | `displayAvatarURL` | string | Member avatar URL (auto-resolved) |
| `guild` | `id` | string | Server ID |
| `guild` | `name` | string | Server name |
| `guild` | `memberCount` | number | Total members |
| `guild` | `iconURL` | string | Server icon URL (auto-resolved) |
| `guild` | `ownerId` | string | Owner's user ID |
| `guild` | `premiumTier` | number | Boost level (0-3) |
| `channel` | `id` | string | Channel ID |
| `channel` | `name` | string | Channel name |
| `channel` | `type` | number | Channel type |
| `channel` | `topic` | string/null | Channel topic |
| `message` | `id` | string | Message ID |
| `message` | `content` | string | Message content |
| `message` | `author` | User | Message author |
| `message` | `createdAt` | Date | Send timestamp |

**URL Methods Auto-Resolution:**
The following Discord.js methods are automatically called when accessed as properties:
- `displayAvatarURL` → returns URL string with size 512
- `avatarURL` → returns URL string
- `bannerURL` → returns URL string
- `iconURL` → returns URL string (for guilds)
- `splashURL` → returns URL string (for guilds)

**Important:** For canvas `circle_image.src` and embed `thumbnail.url`, use `displayAvatarURL` (the full URL), not `avatar` (just the hash).

### Operators

| Operator | Example |
|----------|---------|
| `+` `-` `*` `/` `%` | Math operations |
| `==` `!=` `<` `>` `<=` `>=` | Comparisons |
| `&&` `\|\|` `!` | Logical |
| `? :` | Ternary: `x > 5 ? "big" : "small"` |
| `\|` | Pipe (transform): `name \| upper` |

### Functions (69)

**Date/Time (5)**
| Function | Example |
|----------|---------|
| `now()` | Current Date object |
| `timestamp(date?, format?)` | Unix timestamp or Discord timestamp format (formats: relative, short_time, long_time, short_date, long_date, short_datetime, long_datetime) |
| `date(ts)` | Timestamp to Date |
| `dateAdd(date, amount, unit)` | `dateAdd(now(), 1, 'day')` (units: seconds, minutes, hours, days, weeks, months, years) |
| `addDuration(date, duration)` | `addDuration(now(), '1h')` |

**Math (9)**
| Function | Example |
|----------|---------|
| `random(min, max)` | Random integer |
| `randomFloat(min, max)` | Random float |
| `round(n, decimals?)` | `round(3.14159, 2)` |
| `floor(n)` | Round down |
| `ceil(n)` | Round up |
| `abs(n)` | Absolute value |
| `min(...values)` | Minimum |
| `max(...values)` | Maximum |
| `clamp(n, min, max)` | Clamp to range |

**String (15)**
| Function | Example |
|----------|---------|
| `lower(s)` | Lowercase |
| `upper(s)` | Uppercase |
| `capitalize(s)` | Capitalize first |
| `titleCase(s)` | Title Case |
| `trim(s)` | Remove whitespace |
| `truncate(s, len, suffix?)` | `truncate(s, 100, "...")` |
| `padStart(s, len, char?)` | `padStart("5", 2, "0")` |
| `padEnd(s, len, char?)` | Pad end |
| `replace(s, find, repl)` | Replace |
| `split(s, delim)` | Split string |
| `join(arr, delim)` | Join array |
| `includes(s, sub)` | Contains |
| `startsWith(s, prefix)` | Starts with |
| `endsWith(s, suffix)` | Ends with |
| `match(s, regex)` | Regex match |

**Array (13)**
| Function | Example |
|----------|---------|
| `length(arr)` | Array/string length |
| `first(arr)` | First element |
| `last(arr)` | Last element |
| `nth(arr, n)` | Nth element |
| `slice(arr, start, end?)` | Slice |
| `reverse(arr)` | Reverse |
| `sort(arr, key?)` | Sort |
| `unique(arr)` | Remove duplicates |
| `flatten(arr)` | Flatten nested |
| `pick(arr)` | Pick random element |
| `shuffle(arr)` | Shuffle |
| `range(start, end, step?)` | Number range |
| `chunk(arr, size)` | Split into chunks |

**Object (6)**
| Function | Example |
|----------|---------|
| `keys(obj)` | Object keys |
| `values(obj)` | Object values |
| `entries(obj)` | Key-value pairs |
| `get(obj, path, default?)` | `get(obj, "a.b.c")` |
| `has(obj, key)` | Has property |
| `merge(...objects)` | Merge objects |

**Type (7)**
| Function | Example |
|----------|---------|
| `type(val)` | Get type name |
| `isNull(val)` | Is null/undefined |
| `isArray(val)` | Is array |
| `isString(val)` | Is string |
| `isNumber(val)` | Is number |
| `isBoolean(val)` | Is boolean |
| `isObject(val)` | Is object |

**Conversion (7)**
| Function | Example |
|----------|---------|
| `string(val)` | To string |
| `number(val)` | To number |
| `int(val)` | To integer |
| `float(val)` | To float |
| `boolean(val)` | To boolean |
| `json(val)` | Stringify JSON |
| `parseJson(s)` | Parse JSON |

**Discord (5)**
| Function | Example |
|----------|---------|
| `mention(type, id)` | `mention("user", id)` |
| `formatNumber(n, locale?)` | `formatNumber(1234)` -> "1,234" (locale default: "en-US") |
| `ordinal(n)` | `ordinal(1)` -> "1st" |
| `pluralize(n, singular, plural?)` | `pluralize(5, "item")` |
| `duration(ms)` | Format duration |

**Utility (4)**
| Function | Example |
|----------|---------|
| `default(val, def)` | Default value |
| `coalesce(...vals)` | First non-null |
| `uuid()` | Generate UUID |
| `hash(s)` | Simple hash of string (returns number) |

### Transforms (50)

Transforms use the pipe operator `|`:
```yaml
content: "${name | upper | truncate(20)}"
```

**String Transforms**
`lower`, `upper`, `capitalize`, `trim`, `truncate(len, suffix?)`, `split(delim)`, `replace(find, repl)`, `padStart(len, char?)`, `padEnd(len, char?)`, `includes(sub)`, `startsWith(prefix)`, `endsWith(suffix)`, `contains(sub)`

**Array Transforms**
`join(delim)`, `first`, `last`, `nth(n)`, `slice(start, end?)`, `reverse`, `sort(key?)`, `unique`, `flatten`, `filter(key, value)`, `map(key)`, `pluck(key)`, `pick`, `shuffle`

**Number Transforms**
`round(decimals?)`, `floor`, `ceil`, `abs`, `format`, `ordinal`

**Object Transforms**
`keys`, `values`, `entries`, `get(path)`

**Type Transforms**
`string`, `number`, `int`, `float`, `boolean`, `json`

**Utility Transforms**
`default(val)`, `length`, `size`

**Date Transforms**
`timestamp`, `duration`

**Discord Transforms**
`mention`, `pluralize(singular, plural?)`

---

## Events Reference

### CLI-Supported Events (Primary)

These are the events emitted by the FURLOW CLI. Use these event names in your YAML:

**Message Events**
- `message_create` - New message sent
- `message_delete` - Message deleted
- `message_update` - Message edited (context includes `old_message`)

**Member Events**
- `member_join` - Member joined server (maps from Discord's guildMemberAdd)
- `member_leave` - Member left server (maps from Discord's guildMemberRemove)
- `member_update` - Member updated (context includes `old_member`)
- `member_ban` - Member was banned (context: `user`, `guild`, `reason`)
- `member_unban` - Member was unbanned (context: `user`, `guild`)
- `member_boost` - Member started boosting (context: `member`, `boost_since`)
- `member_unboost` - Member stopped boosting (context: `member`, `boost_ended`)

**Reaction Events**
- `reaction_add` - Reaction added (context: `reaction`, `user`)
- `reaction_remove` - Reaction removed (context: `reaction`, `user`)

**Voice Events**
- `voice_join` - User joined voice channel
- `voice_leave` - User left voice channel
- `voice_move` - User moved between voice channels
- `voice_state_update` - Any voice state change (context includes `old_voice_state`, `new_voice_state`)
- `voice_stream_start` - User started streaming (context: `member`, `voice_channel`, `streaming`)
- `voice_stream_stop` - User stopped streaming (context: `member`, `streaming`)

**Lifecycle Events**
- `ready` - Bot is ready
- `timer_fire` - Timer event (from create_timer action)
- `custom` - Custom event (from emit action)

### Gateway Events (Advanced)

For advanced use cases, you can also listen to raw Discord.js gateway events. These require proper intents configuration:

**Guild:** `guild_create`, `guild_update`, `guild_delete`
**Channel:** `channel_create`, `channel_update`, `channel_delete`
**Thread:** `thread_create`, `thread_update`, `thread_delete`
**Role:** `guild_role_create`, `guild_role_update`, `guild_role_delete`
**Ban:** `guild_ban_add`, `guild_ban_remove`
**Presence:** `presence_update`, `typing_start`
**Invite:** `invite_create`, `invite_delete`

**Note:** When using gateway events, the context variables depend on what Discord.js provides for that event.

### Event Context Variables

| Event Type | Variables |
|------------|-----------|
| Message events | `message`, `channel`, `guild`, `user` |
| Member events | `member`, `guild`, `user` |
| Reaction events | `reaction`, `message`, `user`, `emoji` |
| Voice events | `voiceState`, `member`, `channel`, `old_voice_state`, `new_voice_state` |
| Interaction events | `interaction`, `user`, `guild`, `channel`, `options` |

**Component Interaction Context (buttons, selects, modals):**

| Component | Additional Variables |
|-----------|---------------------|
| Button | `custom_id`, `customId`, `component_type` |
| Select Menu | `values` (selected values array), `selected`, `custom_id`, `component_type` |
| Modal | `fields` (object mapping field custom_id to value), `modal_values`, `custom_id` |

Example accessing select menu values:
```yaml
# In component actions
- batch:
    items: "${values}"   # or "${interaction.values}"
    as: selected
    each:
      - log:
          message: "Selected: ${selected}"
```

Example accessing modal fields:
```yaml
# In modal actions
- send_message:
    content: "${fields.feedback_text}"  # Access by text_input custom_id
```

### Duration Format

| Format | Description |
|--------|-------------|
| `100` | Milliseconds |
| `5s` | Seconds |
| `2m` | Minutes |
| `1h` | Hours |
| `1d` | Days |
| `1h30m` | Combined |

### Discord Permissions

Common permissions for commands and channel overrides:

**General:**
`ADMINISTRATOR`, `VIEW_CHANNEL`, `MANAGE_CHANNELS`, `MANAGE_ROLES`, `MANAGE_GUILD`, `CREATE_INSTANT_INVITE`, `CHANGE_NICKNAME`, `MANAGE_NICKNAMES`, `MANAGE_EXPRESSIONS`, `VIEW_AUDIT_LOG`, `VIEW_GUILD_INSIGHTS`

**Text:**
`SEND_MESSAGES`, `SEND_MESSAGES_IN_THREADS`, `CREATE_PUBLIC_THREADS`, `CREATE_PRIVATE_THREADS`, `EMBED_LINKS`, `ATTACH_FILES`, `ADD_REACTIONS`, `USE_EXTERNAL_EMOJIS`, `USE_EXTERNAL_STICKERS`, `MENTION_EVERYONE`, `MANAGE_MESSAGES`, `READ_MESSAGE_HISTORY`, `SEND_TTS_MESSAGES`, `USE_APPLICATION_COMMANDS`

**Voice:**
`CONNECT`, `SPEAK`, `STREAM`, `USE_VAD`, `PRIORITY_SPEAKER`, `MUTE_MEMBERS`, `DEAFEN_MEMBERS`, `MOVE_MEMBERS`

**Moderation:**
`KICK_MEMBERS`, `BAN_MEMBERS`, `MODERATE_MEMBERS` (timeout), `MANAGE_WEBHOOKS`, `MANAGE_THREADS`

---

## Common Patterns

### Welcome Message with Canvas Image

```yaml
events:
  - event: guild_member_add
    actions:
      - canvas_render:
          generator: "welcome_card"
          context:
            user: "${member.user}"
          as: "welcome_image"
      - send_message:
          channel: "${env.WELCOME_CHANNEL}"
          content: "Welcome ${member.displayName}!"
          files:
            - attachment: "${welcome_image}"
              name: "welcome.png"
```

### Reaction Roles

```yaml
events:
  - event: message_reaction_add
    when: "message.id == '123456789'"
    actions:
      - flow_switch:
          value: "${reaction.emoji.name}"
          cases:
            "check":
              - assign_role:
                  user: "${user.id}"
                  role: "verified_role_id"
            "red_circle":
              - assign_role:
                  user: "${user.id}"
                  role: "red_team_role_id"
```

### Moderation with Logging

```yaml
flows:
  log_mod_action:
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
          channel: "${state.guild.mod_log_channel}"
          embeds:
            - title: "Moderation: ${action}"
              fields:
                - name: Target
                  value: "${target}"
                - name: Reason
                  value: "${reason || 'No reason provided'}"
                - name: Moderator
                  value: "${user.tag}"
              color: 0xED4245
              timestamp: true

commands:
  - name: ban
    description: Ban a user
    options:
      - name: user
        type: user
        required: true
        description: "The user to ban"
      - name: reason
        type: string
        description: "Reason for the ban"
    permissions: BAN_MEMBERS
    actions:
      - ban:
          user: "${options.user.id}"
          reason: "${options.reason}"
      - call_flow:
          flow: log_mod_action
          args:
            action: Ban
            target: "${options.user.tag}"
            reason: "${options.reason}"
      - reply:
          content: "Banned ${options.user.tag}"
          ephemeral: true
```

### Slow Command with Defer

```yaml
pipes:
  slow_api:
    type: http
    base_url: "https://slow-api.com"

commands:
  - name: generate
    description: Generate something slow
    actions:
      - defer:
          ephemeral: true
      - pipe_request:
          pipe: "slow_api"
          path: "/generate"
          method: POST
          as: "result"
      - reply:
          content: "Generated: ${result.data}"
```

### Leveling System

```yaml
state:
  variables:
    xp:
      scope: member
      type: number
      default: 0
    level:
      scope: member
      type: number
      default: 1

events:
  - event: message_create
    when: "!message.author.bot"
    throttle: 1m
    actions:
      - increment:
          var: "xp"
          by: "${random(15, 25)}"
          scope: member
      - flow_if:
          if: "state.member.xp >= state.member.level * 100"  # Raw expression
          then:
            - increment:
                var: "level"
                by: 1
                scope: member
            - send_message:
                channel: "${channel.id}"
                content: "Congrats ${member.displayName}! Level ${state.member.level}!"
```

---

## Environment Variables

Access with `${env.VAR_NAME}`:

```yaml
identity:
  name: "${env.BOT_NAME}"

pipes:
  api:
    type: http
    base_url: "${env.API_URL}"
    auth:
      type: bearer
      token: "${env.API_TOKEN}"
```

Always use environment variables for: tokens, API keys, database credentials, webhook secrets.

---

## File Structure

Single file:
```
bot.furlow.yaml
```

Multi-file with imports:
```
main.furlow.yaml
commands/
  moderation.yaml
  utility.yaml
events/
  welcome.yaml
  logging.yaml
flows/
  common.yaml
```
