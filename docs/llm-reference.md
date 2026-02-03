# FURLOW LLM Reference

A comprehensive reference for building FURLOW Discord bots. FURLOW is a declarative framework where bot behavior is defined in YAML, not code.

---

## Quick Start

### Minimal Bot Example

```yaml
version: "0.1"

identity:
  name: "MyBot"

presence:
  status: online
  activity:
    type: watching
    text: "for /help"

intents:
  auto: true

state:
  storage:
    type: sqlite
    path: ./data/bot.db

commands:
  - name: ping
    description: Check bot latency
    actions:
      - action: reply
        content: "Pong! Latency: ${bot.ping}ms"
        ephemeral: true
```

### Project Structure

```
my-bot/
├── furlow.yaml          # Main configuration (required)
├── .env                 # Environment variables (DISCORD_TOKEN, DISCORD_CLIENT_ID)
└── data/                # SQLite database (created automatically)
```

### Running the Bot

```bash
# Development (hot reload)
furlow dev

# Production
furlow start

# Validate configuration
furlow validate
```

---

## Core Concepts

### Expression Syntax

Use `${}` for dynamic values:

```yaml
content: "Hello, ${user.username}!"
content: "Members: ${guild.memberCount|format}"
condition: "${user.roles.includes('123456')}"
```

### Available Contexts

| Context | Description |
|---------|-------------|
| `user` | Current user object |
| `member` | Guild member object |
| `guild` | Server object |
| `channel` | Current channel |
| `message` | Message object (message events) |
| `interaction` | Interaction object |
| `args` / `options` | Command arguments |
| `bot` | Bot client object |

### Scopes for State

| Scope | Description |
|-------|-------------|
| `global` | Shared across all servers |
| `guild` | Per-server |
| `channel` | Per-channel |
| `user` | Per-user (across servers) |
| `member` | Per-user-per-server |

---

## Complete Action Reference

### Message Actions

#### `send_message`
Send a message to a channel.
```yaml
- action: send_message
  channel: "${channel.id}"
  content: "Hello world!"
  embed:
    title: "Title"
    description: "Description"
    color: "#5865F2"
  components:
    - type: action_row
      components:
        - type: button
          style: primary
          label: "Click me"
          custom_id: "my_button"
  as: sentMessage  # Store result in variable
```

#### `reply`
Reply to an interaction.
```yaml
- action: reply
  content: "Response text"
  ephemeral: true
  embed:
    title: "Embed Title"
    description: "Description"
```

#### `defer`
Defer interaction response.
```yaml
- action: defer
  ephemeral: true
```

#### `edit_message`
Edit an existing message.
```yaml
- action: edit_message
  channel: "${channel.id}"
  message: "${message.id}"
  content: "Updated content"
  embed:
    title: "New title"
```

#### `delete_message`
Delete a message.
```yaml
- action: delete_message
  channel: "${channel.id}"
  message: "${message.id}"
  delay: "5s"  # Optional delay
```

#### `bulk_delete`
Delete multiple messages.
```yaml
- action: bulk_delete
  channel: "${channel.id}"
  count: 10
  filter: "${!msg.author.bot}"  # Optional filter
```

#### `send_dm`
Send a direct message.
```yaml
- action: send_dm
  user: "${user.id}"
  content: "Hello in DMs!"
  embed:
    title: "DM Embed"
```

#### `update_message`
Update the current interaction message.
```yaml
- action: update_message
  content: "Button clicked!"
  components: []  # Remove components
```

### Reaction Actions

#### `add_reaction`
```yaml
- action: add_reaction
  channel: "${channel.id}"
  message: "${message.id}"
  emoji: "thumbsup"
```

#### `add_reactions`
```yaml
- action: add_reactions
  message_id: "${message.id}"
  emojis: ["thumbsup", "thumbsdown", "thinking"]
```

#### `remove_reaction`
```yaml
- action: remove_reaction
  message_id: "${message.id}"
  emoji: "thumbsup"
  user_id: "${user.id}"
```

#### `clear_reactions`
```yaml
- action: clear_reactions
  message_id: "${message.id}"
  emoji: "thumbsup"  # Optional: specific emoji
```

### Role Actions

#### `assign_role`
```yaml
- action: assign_role
  user: "${member.id}"
  role: "123456789"
  reason: "Role assignment reason"
```

#### `remove_role`
```yaml
- action: remove_role
  user: "${member.id}"
  role: "123456789"
  reason: "Role removal reason"
```

#### `toggle_role`
```yaml
- action: toggle_role
  user: "${member.id}"
  role: "123456789"
```

#### `create_role`
```yaml
- action: create_role
  name: "New Role"
  color: "#FF5733"
  hoist: true
  mentionable: true
  permissions: ["SEND_MESSAGES", "VIEW_CHANNEL"]
```

#### `edit_role`
```yaml
- action: edit_role
  role: "123456789"
  name: "Updated Name"
  color: "#00FF00"
```

#### `delete_role`
```yaml
- action: delete_role
  role: "123456789"
  reason: "Cleanup"
```

### Member Moderation Actions

#### `kick`
```yaml
- action: kick
  user: "${target.id}"
  reason: "Reason for kick"
  dm_user: true
  dm_message: "You have been kicked from ${guild.name}"
```

#### `ban`
```yaml
- action: ban
  user: "${target.id}"
  reason: "Reason for ban"
  delete_message_days: 7
  dm_user: true
  dm_message: "You have been banned"
```

#### `unban`
```yaml
- action: unban
  user: "123456789"
  reason: "Appeal approved"
```

#### `timeout`
```yaml
- action: timeout
  user: "${target.id}"
  duration: "1h"
  reason: "Timeout reason"
  dm_user: true
  dm_message: "You have been timed out for 1 hour"
```

#### `remove_timeout`
```yaml
- action: remove_timeout
  user: "${target.id}"
  reason: "Timeout lifted"
```

#### `set_nickname`
```yaml
- action: set_nickname
  user: "${member.id}"
  nickname: "New Nickname"
  reason: "Nickname change"
```

### Voice Actions

#### `move_member`
```yaml
- action: move_member
  user: "${member.id}"
  channel: "voice_channel_id"
```

#### `disconnect_member`
```yaml
- action: disconnect_member
  user: "${member.id}"
  reason: "Disconnected from voice"
```

#### `server_mute`
```yaml
- action: server_mute
  user: "${member.id}"
  muted: true
  reason: "Server muted"
```

#### `server_deafen`
```yaml
- action: server_deafen
  user: "${member.id}"
  deafened: true
  reason: "Server deafened"
```

### Bot Voice Actions

#### `voice_join`
```yaml
- action: voice_join
  channel: "${voiceChannel.id}"
  self_deaf: true
  self_mute: false
```

#### `voice_leave`
```yaml
- action: voice_leave
  guild: "${guild.id}"
```

#### `voice_play`
```yaml
- action: voice_play
  source: "https://example.com/audio.mp3"
  volume: 50
  seek: "30s"
```

#### `voice_pause` / `voice_resume` / `voice_stop` / `voice_skip`
```yaml
- action: voice_pause
- action: voice_resume
- action: voice_stop
- action: voice_skip
```

#### `voice_seek`
```yaml
- action: voice_seek
  position: "1m30s"
```

#### `voice_volume`
```yaml
- action: voice_volume
  volume: 75
```

#### `voice_search`
```yaml
- action: voice_search
  query: "never gonna give you up"
  as: searchResults
```

### Queue Actions

#### `queue_add`
```yaml
- action: queue_add
  source: "https://youtube.com/watch?v=..."
  requester: "${user.id}"
  position: next  # 'next', 'last', or number
```

#### `queue_get`
```yaml
- action: queue_get
  as: currentQueue
```

#### `queue_remove`
```yaml
- action: queue_remove
  position: 3
```

#### `queue_clear`
```yaml
- action: queue_clear
```

#### `queue_shuffle`
```yaml
- action: queue_shuffle
```

#### `queue_loop`
```yaml
- action: queue_loop
  mode: track  # 'off', 'track', 'queue'
```

### Channel Actions

#### `create_channel`
```yaml
- action: create_channel
  name: "new-channel"
  type: text  # text, voice, category, announcement, stage, forum
  parent: "category_id"
  topic: "Channel topic"
  nsfw: false
  rate_limit: 5
  permission_overwrites:
    - id: "role_id"
      type: role
      allow: ["VIEW_CHANNEL"]
      deny: ["SEND_MESSAGES"]
  as: newChannel
```

#### `edit_channel`
```yaml
- action: edit_channel
  channel: "${channel.id}"
  name: "updated-name"
  topic: "New topic"
```

#### `delete_channel`
```yaml
- action: delete_channel
  channel: "123456789"
  reason: "Cleanup"
```

#### `create_thread`
```yaml
- action: create_thread
  name: "Discussion Thread"
  message: "${message.id}"  # Optional: create from message
  auto_archive_duration: 1440  # minutes: 60, 1440, 4320, 10080
  type: public  # 'public' or 'private'
```

#### `archive_thread`
```yaml
- action: archive_thread
  thread: "${thread.id}"
  locked: true
```

#### `set_channel_permissions`
```yaml
- action: set_channel_permissions
  channel: "${channel.id}"
  role: "123456789"  # or user:
  allow: ["VIEW_CHANNEL", "SEND_MESSAGES"]
  deny: ["MANAGE_MESSAGES"]
```

### State Actions

#### `set`
Set a variable value.
```yaml
- action: set
  key: "counter"
  value: 100
  scope: guild

# Or local variable (no persistence)
- action: set
  key: "temp"
  value: "${user.username|upper}"
```

#### `increment` / `decrement`
```yaml
- action: increment
  var: "message_count"
  by: 1
  scope: member

- action: decrement
  var: "lives"
  by: 1
  scope: user
```

#### `list_push`
```yaml
- action: list_push
  key: "warnings"
  value: "${reason}"
  scope: member
```

#### `list_remove`
```yaml
- action: list_remove
  key: "warnings"
  index: 0  # or value: "specific value"
  scope: member
```

#### `set_map` / `delete_map`
```yaml
- action: set_map
  key: "settings"
  map_key: "volume"
  value: 75
  scope: guild

- action: delete_map
  key: "settings"
  map_key: "volume"
  scope: guild
```

### Database Actions

#### `db_insert`
```yaml
- action: db_insert
  table: warnings
  data:
    user_id: "${user.id}"
    guild_id: "${guild.id}"
    reason: "${args.reason}"
    created_at: "${now()}"
  as: newWarning
```

#### `db_query`
```yaml
- action: db_query
  table: warnings
  where:
    user_id: "${user.id}"
    guild_id: "${guild.id}"
  select: ["id", "reason", "created_at"]
  order_by: "created_at DESC"
  limit: 10
  as: userWarnings
```

#### `db_update`
```yaml
- action: db_update
  table: warnings
  where:
    id: "${args.warning_id}"
  data:
    reason: "${args.new_reason}"
  upsert: false
```

#### `db_delete`
```yaml
- action: db_delete
  table: warnings
  where:
    id: "${args.warning_id}"
```

### Control Flow Actions

#### `flow_if`
```yaml
- action: flow_if
  condition: "${user.roles.includes('admin_role_id')}"
  then:
    - action: reply
      content: "You are an admin!"
  else:
    - action: reply
      content: "You are not an admin."
```

#### `flow_switch`
```yaml
- action: flow_switch
  value: "${args.action}"
  cases:
    kick:
      - action: kick
        user: "${args.user.id}"
    ban:
      - action: ban
        user: "${args.user.id}"
    warn:
      - action: reply
        content: "Warning issued"
  default:
    - action: reply
      content: "Unknown action"
```

#### `flow_while`
```yaml
- action: flow_while
  while: "${counter < 5}"
  max_iterations: 100
  do:
    - action: increment
      var: counter
      by: 1
```

#### `batch`
Execute action for each item.
```yaml
- action: batch
  items: "${users}"
  each:
    action: assign_role
    user: "${item.id}"
    role: "member_role_id"
  concurrency: 5
```

#### `repeat`
```yaml
- action: repeat
  times: 3
  do:
    - action: send_message
      channel: "${channel.id}"
      content: "Message ${index + 1}"
  as: index
```

#### `parallel`
Execute actions concurrently.
```yaml
- action: parallel
  actions:
    - action: send_message
      channel: "channel_1"
      content: "Message 1"
    - action: send_message
      channel: "channel_2"
      content: "Message 2"
```

#### `try`
Error handling.
```yaml
- action: try
  do:
    - action: ban
      user: "${target.id}"
  catch:
    - action: reply
      content: "Failed to ban user: ${error.message}"
  finally:
    - action: log
      message: "Ban attempt completed"
```

### Utility Actions

#### `wait`
```yaml
- action: wait
  duration: "5s"
```

#### `log`
```yaml
- action: log
  level: info  # debug, info, warn, error
  message: "User ${user.username} ran command"
```

#### `emit`
Emit custom event.
```yaml
- action: emit
  event: "user_leveled_up"
  data:
    user_id: "${user.id}"
    new_level: "${newLevel}"
```

#### `call_flow`
```yaml
- action: call_flow
  flow: send_welcome
  args:
    member_id: "${member.id}"
  as: flowResult
```

#### `abort`
Stop execution.
```yaml
- action: abort
  reason: "User not authorized"
```

#### `return`
Return value from flow.
```yaml
- action: return
  value: "${calculatedResult}"
```

### Timer Actions

#### `create_timer`
```yaml
- action: create_timer
  id: "reminder_${user.id}"
  duration: "1h"
  event: "reminder_due"
  data:
    user_id: "${user.id}"
    message: "${args.message}"
```

#### `cancel_timer`
```yaml
- action: cancel_timer
  id: "reminder_${user.id}"
```

### Component Actions

#### `show_modal`
```yaml
- action: show_modal
  modal:
    custom_id: "report_modal"
    title: "Submit Report"
    components:
      - type: action_row
        components:
          - type: text_input
            custom_id: "reason"
            label: "Reason"
            style: paragraph
            required: true
            placeholder: "Enter your reason..."
```

### Integration Actions

#### `pipe_request`
HTTP request to external API.
```yaml
- action: pipe_request
  pipe: my_api
  method: POST
  path: /users/${user.id}
  body:
    action: "update"
    data: "${payload}"
  headers:
    Authorization: "Bearer ${token}"
  as: apiResponse
```

#### `pipe_send`
Send to WebSocket/MQTT pipe.
```yaml
- action: pipe_send
  pipe: my_websocket
  data:
    event: "user_action"
    user_id: "${user.id}"
```

#### `webhook_send`
```yaml
- action: webhook_send
  url: "https://discord.com/api/webhooks/..."
  content: "Webhook message"
  username: "Custom Name"
  avatar_url: "https://example.com/avatar.png"
  embeds:
    - title: "Webhook Embed"
```

### Analytics Actions

#### `counter_increment`
```yaml
- action: counter_increment
  name: "commands_executed"
  value: 1
  labels:
    command: "ping"
    guild: "${guild.id}"
```

#### `record_metric`
```yaml
- action: record_metric
  name: "response_time"
  type: histogram
  value: "${responseTime}"
  labels:
    endpoint: "/api/users"
```

---

## Complete Expression Function Reference

### Date/Time Functions

| Function | Description | Example |
|----------|-------------|---------|
| `now()` | Current timestamp | `${now()}` |
| `timestamp(date, format)` | Format date | `${timestamp(member.joinedAt, 'relative')}` |
| `date(value)` | Parse date | `${date('2024-01-15')}` |
| `dateAdd(date, amount, unit)` | Add time | `${dateAdd(now(), 7, 'days')}` |
| `addDuration(date, duration)` | Add duration string | `${addDuration(now(), '1h30m')}` |

**Timestamp Formats:** `short_time`, `long_time`, `short_date`, `long_date`, `short_datetime`, `long_datetime`, `relative`

**Duration Units:** `seconds`/`s`, `minutes`/`m`, `hours`/`h`, `days`/`d`, `weeks`/`w`, `months`/`M`, `years`/`y`

### Math Functions

| Function | Description | Example |
|----------|-------------|---------|
| `random(min, max)` | Random integer | `${random(1, 100)}` |
| `randomFloat(min, max)` | Random float | `${randomFloat(0, 1)}` |
| `round(n, decimals)` | Round number | `${round(3.14159, 2)}` |
| `floor(n)` | Floor | `${floor(3.9)}` |
| `ceil(n)` | Ceiling | `${ceil(3.1)}` |
| `abs(n)` | Absolute value | `${abs(-5)}` |
| `min(...values)` | Minimum | `${min(a, b, c)}` |
| `max(...values)` | Maximum | `${max(a, b, c)}` |
| `clamp(value, min, max)` | Clamp value | `${clamp(volume, 0, 100)}` |

### String Functions

| Function | Description | Example |
|----------|-------------|---------|
| `lower(s)` | Lowercase | `${lower(name)}` |
| `upper(s)` | Uppercase | `${upper(name)}` |
| `capitalize(s)` | Capitalize first | `${capitalize(word)}` |
| `titleCase(s)` | Title Case | `${titleCase(phrase)}` |
| `trim(s)` | Trim whitespace | `${trim(input)}` |
| `truncate(s, len, suffix)` | Truncate | `${truncate(text, 50, '...')}` |
| `padStart(s, len, char)` | Pad start | `${padStart(num, 3, '0')}` |
| `padEnd(s, len, char)` | Pad end | `${padEnd(name, 20)}` |
| `replace(s, search, repl)` | Replace all | `${replace(text, 'bad', '***')}` |
| `split(s, delimiter)` | Split to array | `${split(csv, ',')}` |
| `join(arr, delimiter)` | Join to string | `${join(items, ', ')}` |
| `includes(s, search)` | Contains check | `${includes(text, 'hello')}` |
| `startsWith(s, prefix)` | Starts with | `${startsWith(name, 'Mr')}` |
| `endsWith(s, suffix)` | Ends with | `${endsWith(file, '.txt')}` |
| `match(s, pattern)` | Regex test | `${match(text, '^\\d+')}` |

### Array Functions

| Function | Description | Example |
|----------|-------------|---------|
| `length(arr)` | Array length | `${length(items)}` |
| `first(arr)` | First element | `${first(list)}` |
| `last(arr)` | Last element | `${last(list)}` |
| `nth(arr, n)` | Nth element | `${nth(list, 2)}` |
| `slice(arr, start, end)` | Slice array | `${slice(list, 0, 5)}` |
| `reverse(arr)` | Reverse | `${reverse(list)}` |
| `sort(arr, key)` | Sort | `${sort(users, 'score')}` |
| `unique(arr)` | Remove duplicates | `${unique(tags)}` |
| `flatten(arr)` | Flatten nested | `${flatten(nested)}` |
| `pick(arr)` | Random element | `${pick(options)}` |
| `shuffle(arr)` | Randomize order | `${shuffle(queue)}` |
| `range(start, end, step)` | Number range | `${range(1, 10)}` |
| `chunk(arr, size)` | Split into chunks | `${chunk(items, 5)}` |

### Object Functions

| Function | Description | Example |
|----------|-------------|---------|
| `keys(obj)` | Get keys | `${keys(settings)}` |
| `values(obj)` | Get values | `${values(settings)}` |
| `entries(obj)` | Get entries | `${entries(obj)}` |
| `get(obj, path, default)` | Safe access | `${get(config, 'a.b.c', 0)}` |
| `has(obj, key)` | Has property | `${has(obj, 'name')}` |
| `merge(...objs)` | Merge objects | `${merge(defaults, custom)}` |

### Type Functions

| Function | Description | Example |
|----------|-------------|---------|
| `type(value)` | Get type name | `${type(x)}` |
| `isNull(v)` | Is null/undefined | `${isNull(value)}` |
| `isArray(v)` | Is array | `${isArray(x)}` |
| `isString(v)` | Is string | `${isString(x)}` |
| `isNumber(v)` | Is number | `${isNumber(x)}` |
| `isBoolean(v)` | Is boolean | `${isBoolean(x)}` |
| `isObject(v)` | Is object | `${isObject(x)}` |

### Conversion Functions

| Function | Description | Example |
|----------|-------------|---------|
| `string(v)` | To string | `${string(123)}` |
| `number(v)` | To number | `${number('42')}` |
| `int(v)` | To integer | `${int('3.14')}` |
| `float(v)` | To float | `${float('3.14')}` |
| `boolean(v)` | To boolean | `${boolean(1)}` |
| `json(v)` | To JSON string | `${json(obj)}` |
| `parseJson(s)` | Parse JSON | `${parseJson(str)}` |

### Discord Functions

| Function | Description | Example |
|----------|-------------|---------|
| `mention(type, id)` | Create mention | `${mention('user', user.id)}` |
| `formatNumber(n, locale)` | Format number | `${formatNumber(1234)}` → "1,234" |
| `ordinal(n)` | Add ordinal | `${ordinal(1)}` → "1st" |
| `pluralize(count, singular, plural)` | Pluralize | `${pluralize(count, 'warning')}` |
| `duration(ms)` | Format duration | `${duration(3600000)}` → "1h" |

**Mention Types:** `user`, `role`, `channel`, `emoji`

### Utility Functions

| Function | Description | Example |
|----------|-------------|---------|
| `default(value, fallback)` | Fallback value | `${default(nickname, username)}` |
| `coalesce(...values)` | First non-null | `${coalesce(a, b, c)}` |
| `uuid()` | Generate UUID | `${uuid()}` |
| `hash(s)` | Hash string | `${hash(secret)}` |

---

## Transform Pipe Syntax

Transforms use `|` for chaining operations:

```yaml
content: "${username|upper}"
content: "${message.content|trim|truncate(50)|lower}"
content: "${items|join(' | ')}"
```

### String Transforms
- `|lower` `|upper` `|capitalize` `|trim`
- `|truncate(len, suffix)` `|split(delimiter)`
- `|replace(search, replacement)`
- `|padStart(len, char)` `|padEnd(len, char)`

### Array Transforms
- `|join(delimiter)` `|first` `|last` `|nth(n)`
- `|slice(start, end)` `|reverse` `|sort(key)`
- `|unique` `|flatten` `|pick` `|shuffle`
- `|filter(key, value)` `|map(key)` `|pluck(key)`

### Number Transforms
- `|round(decimals)` `|floor` `|ceil` `|abs`
- `|format(locale)` `|ordinal`

### Object Transforms
- `|keys` `|values` `|entries` `|get(path, default)`

### Type Transforms
- `|string` `|number` `|int` `|float` `|boolean` `|json`

### Utility Transforms
- `|default(fallback)` `|length` `|size`
- `|timestamp(format)` `|duration`
- `|mention(type)` `|pluralize(singular, plural)`

---

## Builtins Reference

FURLOW includes 14 pre-built modules for common bot features.

### moderation

Warnings, kicks, bans, case system.

```yaml
builtins:
  moderation:
    enabled: true
    logChannel: "mod-logs-channel-id"
    dmOnAction: true
    exemptRoles: ["admin-role-id"]
    warnings:
      enabled: true
      maxWarnings: 5
      escalation:
        - warnings: 3
          action: timeout
          duration: "1h"
        - warnings: 5
          action: ban
```

**Commands:** `/warn`, `/kick`, `/ban`, `/unban`, `/timeout`, `/warnings`, `/purge`

### welcome

Welcome/leave messages, auto-roles.

```yaml
builtins:
  welcome:
    enabled: true
    channel: "welcome-channel-id"
    message: "Welcome to ${guild.name}, ${user.mention}!"
    embed:
      title: "Welcome!"
      description: "Please read the rules"
      color: "#5865F2"
    autoRoles: ["member-role-id"]
    leaveChannel: "leave-channel-id"
    leaveMessage: "${user.username} left the server"
    dmNewMembers: true
    dmMessage: "Welcome! Here are some tips..."
```

**Commands:** `/welcome test`, `/welcome set-channel`, `/welcome set-message`

### leveling

XP system with levels and rewards.

```yaml
builtins:
  leveling:
    enabled: true
    xpPerMessage: 15
    xpCooldown: 60
    roleMultipliers:
      booster-role-id: 1.5
    ignoredChannels: ["bot-commands-id"]
    announceChannel: "level-up-channel-id"
    levelUpMessage: "${user.mention} reached level ${level}!"
    rewards:
      - level: 5
        role: "level-5-role-id"
      - level: 10
        role: "level-10-role-id"
    stackRewards: false
    xpCurve: exponential
    baseXP: 100
    xpMultiplier: 1.5
```

**Commands:** `/rank`, `/leaderboard`, `/setxp`, `/addxp`

### logging

Audit logging to channels.

```yaml
builtins:
  logging:
    enabled: true
    channel: "logs-channel-id"
    channels:
      messages: "message-logs-id"
      members: "member-logs-id"
      voice: "voice-logs-id"
      server: "server-logs-id"
      moderation: "mod-logs-id"
    ignoredChannels: ["bot-channel-id"]
    ignoredRoles: ["bot-role-id"]
    events:
      - message_delete
      - message_update
      - member_join
      - member_leave
      - voice_join
      - voice_leave
      - role_create
      - role_delete
```

**Commands:** `/logging set-channel`, `/logging toggle`, `/logging ignore-channel`

### tickets

Support ticket system.

```yaml
builtins:
  tickets:
    enabled: true
    category: "tickets-category-id"
    supportRoles: ["support-role-id"]
    channelPattern: "ticket-{number}"
    maxTicketsPerUser: 3
    panelChannel: "ticket-panel-channel-id"
    logChannel: "ticket-logs-id"
    autoCloseAfter: "24h"
    categories:
      - name: "General Support"
        emoji: "question"
        description: "General questions"
      - name: "Bug Report"
        emoji: "bug"
        description: "Report issues"
    dmOnClose: true
    includeTranscript: true
```

**Commands:** `/ticket panel`, `/ticket add`, `/ticket remove`, `/ticket rename`

### reaction-roles

Role assignment via buttons/reactions/selects.

```yaml
builtins:
  reaction-roles:
    enabled: true
    maxRolesPerPanel: 25
    logChannel: "role-logs-id"
```

**Commands:** `/reactionroles create-button`, `/reactionroles add-button`, `/reactionroles create-select`, `/reactionroles add-option`, `/reactionroles delete`

**Modes:** `toggle` (add/remove), `give` (only add), `take` (only remove), `unique` (one at a time)

### music

Voice channel music playback.

```yaml
builtins:
  music:
    enabled: true
    defaultVolume: 50
    maxQueueSize: 100
    djRole: "dj-role-id"
    stayInChannel: false
    leaveAfterIdle: "5m"
    allowSeeking: true
    allowFilters: true
    announceNowPlaying: true
    announceChannel: "music-channel-id"
```

**Commands:** `/play`, `/skip`, `/pause`, `/resume`, `/stop`, `/queue`, `/volume`, `/nowplaying`, `/shuffle`, `/loop`

### starboard

Highlight popular messages.

```yaml
builtins:
  starboard:
    enabled: true
    channel: "starboard-channel-id"
    threshold: 3
    emoji: "star"
    selfStar: false
    botMessages: false
    ignoredChannels: ["nsfw-channel-id"]
    nsfwAllowed: false
    tiers:
      - count: 5
        emoji: "star2"
      - count: 10
        emoji: "stars"
```

### polls

Voting and polls.

```yaml
builtins:
  polls:
    enabled: true
    maxOptions: 10
    defaultDuration: "24h"
    allowAnonymous: true
```

**Commands:** `/poll`, `/endpoll`

### giveaways

Timed giveaways with entries.

```yaml
builtins:
  giveaways:
    enabled: true
    defaultDuration: "24h"
    managerRole: "giveaway-manager-id"
    requireRole: "member-role-id"
    embedColor: "#ff73fa"
    emoji: "tada"
```

**Commands:** `/giveaway start`, `/giveaway end`, `/giveaway reroll`

### auto-responder

Automatic message responses.

```yaml
builtins:
  auto-responder:
    enabled: true
    maxTriggers: 50
    ignoreBots: true
    globalCooldown: 5
```

**Commands:** `/autoresponder add`, `/autoresponder list`, `/autoresponder delete`, `/autoresponder edit`

**Trigger Types:** `exact`, `contains`, `startswith`, `endswith`, `regex`
**Response Types:** `message`, `embed`, `reaction`

### afk

AFK status tracking.

```yaml
builtins:
  afk:
    enabled: true
    maxReasonLength: 100
    nicknamePrefix: "[AFK] "
    ignoreBots: true
```

**Commands:** `/afk`

### reminders

User reminders.

```yaml
builtins:
  reminders:
    enabled: true
    maxRemindersPerUser: 25
    minDuration: "1m"
    maxDuration: "365d"
    allowDM: true
```

**Commands:** `/remind`, `/reminders`, `/delreminder`

### utilities

Common utility commands.

```yaml
builtins:
  utilities:
    enabled: true
    enabledCommands:
      - serverinfo
      - userinfo
      - avatar
      - banner
      - memberlist
```

**Commands:** `/serverinfo`, `/userinfo`, `/avatar`, `/banner`, `/memberlist`

---

## Multi-File Organization

FURLOW supports splitting your bot configuration across multiple files using imports.

### Import Syntax

```yaml
# furlow.yaml
imports:
  - ./commands/moderation.yaml
  - ./commands/fun.yaml
  - ./events/logging.yaml
  - path: ./features/leveling.yaml
    as: leveling  # Optional namespace
```

### File Resolution

The parser looks for files in this order:
1. Exact path
2. Path + `.furlow.yaml`
3. Path + `.furlow.yml`
4. Path + `.bolt.yaml` (legacy)
5. Path + `.yaml`
6. Path + `.yml`
7. Directory + `index.furlow.yaml`

### Recommended Structure

```
my-complex-bot/
├── furlow.yaml              # Core: identity, intents, state
├── commands/
│   ├── _index.yaml          # Imports all commands
│   ├── moderation.yaml      # /warn, /kick, /ban
│   ├── utility.yaml         # /ping, /serverinfo
│   └── fun.yaml             # /8ball, /roll
├── events/
│   ├── _index.yaml          # Imports all events
│   ├── member.yaml          # join/leave
│   └── message.yaml         # message events
├── flows/
│   ├── _index.yaml          # Imports all flows
│   └── moderation.yaml      # warning escalation
├── builtins.yaml            # Builtin configurations
└── .env                     # Secrets
```

### Main File Example

```yaml
# furlow.yaml
version: "0.1"

imports:
  - ./commands/_index.yaml
  - ./events/_index.yaml
  - ./flows/_index.yaml
  - ./builtins.yaml

identity:
  name: "MyBot"

intents:
  auto: true

state:
  storage:
    type: sqlite
    path: ./data/bot.db
```

### Index File Example

```yaml
# commands/_index.yaml
imports:
  - ./moderation.yaml
  - ./utility.yaml
  - ./fun.yaml
```

### Merge Behavior

- **Arrays** (commands, events, flows, builtins): Concatenated
- **Objects** (pipes, components, embeds, state): Deep merged
- **Scalars** (identity, presence, intents): Later imports override earlier

---

## Common Patterns

### Permission Check

```yaml
- action: flow_if
  condition: "${!member.permissions.has('MANAGE_MESSAGES')}"
  then:
    - action: reply
      content: "You need Manage Messages permission!"
      ephemeral: true
    - action: abort
```

### Cooldown System

```yaml
commands:
  - name: daily
    description: Claim daily reward
    actions:
      - action: db_query
        table: cooldowns
        where:
          user_id: "${user.id}"
          command: "daily"
        as: cooldown

      - action: flow_if
        condition: "${cooldown[0] && (now() - date(cooldown[0].expires_at)) < 0}"
        then:
          - action: reply
            content: "You can claim again ${timestamp(cooldown[0].expires_at, 'relative')}"
            ephemeral: true
          - action: abort

      - action: db_update
        table: cooldowns
        where:
          user_id: "${user.id}"
          command: "daily"
        data:
          expires_at: "${dateAdd(now(), 1, 'days')}"
        upsert: true

      - action: reply
        content: "You claimed your daily reward!"
```

### Confirmation Button

```yaml
- action: reply
  content: "Are you sure you want to proceed?"
  components:
    - type: action_row
      components:
        - type: button
          style: danger
          label: "Confirm"
          custom_id: "confirm_action_${user.id}"
        - type: button
          style: secondary
          label: "Cancel"
          custom_id: "cancel_action_${user.id}"

# In events:
events:
  - event: button_click
    condition: "${interaction.customId.startsWith('confirm_action_')}"
    actions:
      - action: flow_if
        condition: "${interaction.customId !== 'confirm_action_' + user.id}"
        then:
          - action: reply
            content: "This isn't your button!"
            ephemeral: true
          - action: abort
      - action: update_message
        content: "Action confirmed!"
        components: []
```

### Paginated Embed

```yaml
- action: set
  key: page
  value: 0

- action: set
  key: pageSize
  value: 10

- action: set
  key: items
  value: "${slice(allItems, page * pageSize, (page + 1) * pageSize)}"

- action: reply
  embed:
    title: "Items (Page ${page + 1})"
    description: "${items|map('name')|join('\n')}"
    footer:
      text: "Page ${page + 1} of ${ceil(length(allItems) / pageSize)}"
  components:
    - type: action_row
      components:
        - type: button
          style: primary
          label: "Previous"
          custom_id: "page_prev"
          disabled: "${page === 0}"
        - type: button
          style: primary
          label: "Next"
          custom_id: "page_next"
          disabled: "${(page + 1) * pageSize >= length(allItems)}"
```

### Role Menu with Select

```yaml
commands:
  - name: roles
    description: Choose your roles
    actions:
      - action: reply
        content: "Select your roles:"
        components:
          - type: action_row
            components:
              - type: select_menu
                custom_id: "role_select"
                placeholder: "Choose roles..."
                min_values: 0
                max_values: 3
                options:
                  - label: "Announcements"
                    value: "123456789"
                    emoji: "bell"
                    description: "Get notified about announcements"
                  - label: "Events"
                    value: "234567890"
                    emoji: "calendar"
                    description: "Get notified about events"
                  - label: "Gaming"
                    value: "345678901"
                    emoji: "video_game"
                    description: "Access gaming channels"

events:
  - event: select_menu
    condition: "${interaction.customId === 'role_select'}"
    actions:
      # Remove all selectable roles first
      - action: batch
        items: '["123456789", "234567890", "345678901"]'
        each:
          action: flow_if
          condition: "${member.roles.cache.has(item)}"
          then:
            - action: remove_role
              user: "${member.id}"
              role: "${item}"

      # Add selected roles
      - action: batch
        items: "${interaction.values}"
        each:
          action: assign_role
          user: "${member.id}"
          role: "${item}"

      - action: reply
        content: "Roles updated!"
        ephemeral: true
```

---

## Troubleshooting

### Common Errors

**"DISCORD_TOKEN is required"**
- Ensure `.env` file exists with `DISCORD_TOKEN=your-token`

**"Schema validation failed"**
- Run `furlow validate` for detailed errors
- Check for required fields, correct types

**"Unknown action"**
- Check action name spelling
- Ensure action exists in FURLOW

**"Expression evaluation failed"**
- Check variable names exist in context
- Use `??` for optional values: `${nickname ?? username}`

**"Circular import detected"**
- Check import chains don't form loops
- Each file should only be imported once in the chain

### Best Practices

1. **Use ephemeral replies** for user-specific responses
2. **Defer long operations** to avoid timeout
3. **Check permissions** before moderation actions
4. **Use database** for persistent data, not variables
5. **Log errors** for debugging
6. **Validate input** from users
7. **Use flows** for reusable logic
8. **Split large bots** into multiple files

---

## Schema Reference

### Top-Level Structure

```yaml
version: "0.1"                # Required
identity:
  name: string
presence:
  status: online|idle|dnd|invisible
  activity:
    type: playing|watching|listening|streaming|competing
    text: string
intents:
  auto: boolean               # Auto-calculate required intents
  # OR explicit list:
  - Guilds
  - GuildMessages
  - MessageContent
state:
  storage:
    type: sqlite|postgresql|memory
    path: string              # SQLite only
  variables: {}               # Variable definitions
  tables: {}                  # Table definitions
commands: []                  # Command definitions
events: []                    # Event handlers
context_menus: []             # Context menu commands
flows: []                     # Reusable flows
builtins: {}                  # Builtin configurations
pipes: {}                     # External integrations
components:
  buttons: {}
  selects: {}
  modals: {}
embeds:
  theme: {}
  templates: {}
permissions: {}
voice: {}
scheduler: {}
locale: string
analytics: {}
dashboard: {}
errors: {}
```

### Command Definition

```yaml
commands:
  - name: string              # Required
    description: string       # Required
    options:
      - name: string
        description: string
        type: string|integer|boolean|user|channel|role|mentionable|number|attachment
        required: boolean
        choices:
          - name: string
            value: string|number
        min_value: number
        max_value: number
        min_length: number
        max_length: number
        autocomplete: boolean
    subcommands:
      - name: string
        description: string
        options: []
        actions: []
    actions: []               # Required (unless subcommands)
```

### Event Handler

```yaml
events:
  - event: string             # Required
    condition: string         # Optional expression
    actions: []               # Required
```

**Event Types:** `ready`, `message`, `message_delete`, `message_update`, `member_join`, `member_leave`, `member_update`, `button_click`, `select_menu`, `modal_submit`, `reaction_add`, `reaction_remove`, `voice_join`, `voice_leave`, `voice_move`, `role_create`, `role_delete`, `channel_create`, `channel_delete`, `scheduler_tick`, custom events

### Table Definition

```yaml
state:
  tables:
    table_name:
      columns:
        column_name:
          type: string|number|boolean|timestamp|json
          primary: boolean
          unique: boolean
          index: boolean
          default: any
```

### Variable Definition

```yaml
state:
  variables:
    var_name:
      type: string|number|boolean|list|map
      scope: global|guild|channel|user|member
      default: any
```
