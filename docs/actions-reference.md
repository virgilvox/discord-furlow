# Actions Reference

Actions are the building blocks of FURLOW bots. They perform operations like sending messages, managing roles, storing data, and controlling flow.

## Action Syntax

Actions can be written in two forms:

**Object form (recommended for complex actions):**
```yaml
actions:
  - send_message:
      channel: "${channel.id}"
      content: "Hello, world!"
```

**Shorthand form:**
```yaml
actions:
  - reply: "Hello, world!"
```

---

## Message Actions

### `send_message`

Sends a message to a channel.

```yaml
- send_message:
    channel: "${channel.id}"          # Required: Channel ID or expression
    content: "Hello!"                  # Message text
    embeds:                            # Optional: Embeds array
      - title: "Welcome"
        description: "Hello there"
    components:                        # Optional: Button/select components
      - type: row
        components:
          - type: button
            label: "Click me"
            custom_id: "btn_click"
    reply_to: "${message.id}"          # Optional: Reply to message
    mention_reply: false               # Optional: Ping on reply
```

### `reply`

Replies to an interaction (slash command, button, etc.).

```yaml
- reply:
    content: "Command executed!"
    ephemeral: true                    # Only visible to user
    embeds: []
    components: []
```

**Shorthand:**
```yaml
- reply: "Simple response"
```

### `defer`

Defers an interaction response (shows "Bot is thinking..."). **Required** when your command takes longer than 3 seconds to complete.

**When to use:**
- Commands that call external APIs
- Commands that process large amounts of data
- Commands that run multiple flows
- Any operation that might take more than 3 seconds

```yaml
- defer:
    ephemeral: true                    # Optional: Only visible to user
```

**Full example:**
```yaml
commands:
  - name: slow-command
    description: "A command that takes time"
    actions:
      # ALWAYS defer first for slow commands
      - defer:
          ephemeral: true

      # Now you have up to 15 minutes
      - call_flow:
          flow: long_running_operation
          as: result

      # reply automatically uses followUp when deferred
      - reply:
          content: "Done! Result: ${result}"
```

**Important:** Discord requires a response within 3 seconds. If you don't defer, the user sees "This interaction failed". After deferring, you have 15 minutes to respond.

### `followup`

Sends a follow-up message after deferring.

```yaml
- followup:
    content: "Processing complete!"
    ephemeral: false
```

### `edit_message`

Edits an existing message.

```yaml
- edit_message:
    channel: "${channel.id}"
    message: "${message.id}"
    content: "Updated content"
    embeds: []
    components: []
```

### `delete_message`

Deletes a message.

```yaml
- delete_message:
    channel: "${channel.id}"
    message: "${message.id}"
```

### `bulk_delete`

Deletes multiple messages (up to 100, max 14 days old).

```yaml
- bulk_delete:
    channel: "${channel.id}"
    count: 50                          # Number to delete
    filter:                            # Optional filters
      author: "${user.id}"             # By author
      contains: "spam"                 # Contains text
      before: "${message.id}"          # Before message
```

### `pin_message` / `unpin_message`

Pins or unpins a message.

```yaml
- pin_message:
    channel: "${channel.id}"
    message: "${message.id}"
```

### `crosspost`

Publishes a message to following servers (announcement channels only).

```yaml
- crosspost:
    channel: "${channel.id}"
    message: "${message.id}"
```

### `add_reaction` / `add_reactions`

Adds reaction(s) to a message.

```yaml
- add_reaction:
    channel: "${channel.id}"
    message: "${message.id}"
    emoji: "thumbsup"                  # Unicode name or custom emoji

- add_reactions:
    channel: "${channel.id}"
    message: "${message.id}"
    emojis: ["thumbsup", "heart", "<:custom:123456>"]
```

### `remove_reaction` / `clear_reactions`

Removes reactions from a message.

```yaml
- remove_reaction:
    channel: "${channel.id}"
    message: "${message.id}"
    emoji: "thumbsup"
    user: "${user.id}"                 # Optional: Specific user

- clear_reactions:
    channel: "${channel.id}"
    message: "${message.id}"
    emoji: "thumbsup"                  # Optional: Clear specific emoji only
```

---

## Member Actions

### `assign_role` / `remove_role` / `toggle_role`

Manages member roles.

```yaml
- assign_role:
    user: "${user.id}"
    role: "123456789"                  # Role ID
    reason: "Welcome role"             # Optional: Audit log reason

- remove_role:
    user: "${user.id}"
    role: "123456789"

- toggle_role:
    user: "${user.id}"
    role: "123456789"                  # Adds if missing, removes if present
```

### `set_nickname`

Changes a member's nickname.

```yaml
- set_nickname:
    user: "${user.id}"
    nickname: "[VIP] ${user.username}"
    reason: "VIP status"
```

### `kick`

Kicks a member from the server.

```yaml
- kick:
    user: "${target.id}"
    reason: "Rule violation"
```

### `ban` / `unban`

Bans or unbans a user.

```yaml
- ban:
    user: "${target.id}"
    reason: "Severe violation"
    delete_days: 7                     # Delete messages (0-7 days)

- unban:
    user: "${target.id}"
    reason: "Appeal accepted"
```

### `timeout` / `remove_timeout`

Times out a member (prevents sending messages).

```yaml
- timeout:
    user: "${target.id}"
    duration: "1h"                     # Duration string
    reason: "Spamming"

- remove_timeout:
    user: "${target.id}"
    reason: "Early release"
```

**Duration format:** `30s`, `5m`, `1h`, `1d`, `1w` (max 28 days)

### `send_dm`

Sends a direct message to a user.

```yaml
- send_dm:
    user: "${target.id}"
    content: "You have been warned."
    embeds: []
```

### `move_member`

Moves a member to a different voice channel.

```yaml
- move_member:
    user: "${user.id}"
    channel: "voice-channel-id"        # Target voice channel
```

### `disconnect_member`

Disconnects a member from voice.

```yaml
- disconnect_member:
    user: "${user.id}"
    reason: "AFK timeout"
```

### `server_mute` / `server_deafen`

Server-wide mute or deafen in voice.

```yaml
- server_mute:
    user: "${user.id}"
    muted: true                        # true to mute, false to unmute

- server_deafen:
    user: "${user.id}"
    deafened: true
```

---

## Channel Actions

### `create_channel`

Creates a new channel.

```yaml
- create_channel:
    name: "new-channel"
    type: text                         # text, voice, category, forum, stage
    parent: "category-id"              # Optional: Category
    topic: "Channel description"       # Optional: Topic
    position: 0                        # Optional: Position
    nsfw: false                        # Optional: NSFW flag
    rate_limit: 5                      # Optional: Slowmode seconds
    permission_overwrites:             # Optional: Permissions
      - id: "${role.id}"
        type: role
        allow: ["VIEW_CHANNEL"]
        deny: ["SEND_MESSAGES"]
```

### `edit_channel`

Modifies an existing channel.

```yaml
- edit_channel:
    channel: "${channel.id}"
    name: "renamed-channel"
    topic: "New topic"
    nsfw: true
    rate_limit: 10
```

### `delete_channel`

Deletes a channel.

```yaml
- delete_channel:
    channel: "${channel.id}"
    reason: "Cleanup"
```

### `create_thread`

Creates a thread in the current channel or from a message.

```yaml
- create_thread:
    name: "Discussion Thread"
    message: "${message.id}"           # Optional: Start from message
    auto_archive_duration: 1440        # Minutes: 60, 1440, 4320, 10080
    type: public                       # public, private
    invitable: true                    # Private threads only
```

### `archive_thread`

Archives or unarchives a thread.

```yaml
- archive_thread:
    thread: "${thread.id}"
    archived: true
    locked: false                      # Optional: Lock thread
```

### `join_thread`

Makes the bot join a thread.

```yaml
- join_thread:
    thread: "${thread.id}"
```

### `set_channel_permissions`

Sets permission overwrites for a channel.

```yaml
- set_channel_permissions:
    channel: "${channel.id}"
    role: "${role.id}"                 # Use 'role' or 'user'
    allow:
      - VIEW_CHANNEL
      - SEND_MESSAGES
    deny:
      - MANAGE_MESSAGES
```

### `create_invite`

Creates a channel invite.

```yaml
- create_invite:
    channel: "${channel.id}"
    max_age: 86400                     # Seconds (0 = never)
    max_uses: 10                       # 0 = unlimited
    temporary: false
    unique: true
    store_as: invite_url               # Variable to store result
```

### `lock_channel` / `unlock_channel`

Quick channel lockdown.

```yaml
- lock_channel:
    channel: "${channel.id}"
    reason: "Raid lockdown"

- unlock_channel:
    channel: "${channel.id}"
    reason: "All clear"
```

---

## Guild Actions

### `create_role`

Creates a new role.

```yaml
- create_role:
    name: "VIP"
    color: "#FFD700"
    hoist: true                        # Show separately
    mentionable: false
    permissions:
      - VIEW_CHANNEL
      - SEND_MESSAGES
    position: 5
    store_as: new_role                 # Variable to store role
```

### `edit_role`

Modifies an existing role.

```yaml
- edit_role:
    role: "${role.id}"
    name: "Super VIP"
    color: "#FF0000"
    hoist: true
```

### `delete_role`

Deletes a role.

```yaml
- delete_role:
    role: "${role.id}"
    reason: "No longer needed"
```

### `create_emoji`

Creates a custom emoji.

```yaml
- create_emoji:
    name: "custom_emoji"
    image: "https://example.com/emoji.png"  # URL or base64
    roles: ["role-id"]                 # Optional: Restrict to roles
    store_as: new_emoji
```

### `create_sticker`

Creates a custom sticker.

```yaml
- create_sticker:
    name: "custom_sticker"
    description: "A cool sticker"
    tags: "cool,sticker"
    file: "https://example.com/sticker.png"
```

### `create_scheduled_event`

Creates a scheduled event.

```yaml
- create_scheduled_event:
    name: "Game Night"
    description: "Join us for games!"
    start_time: "${dateAdd(now(), 1, 'day')}"
    end_time: "${dateAdd(now(), 2, 'days')}"
    type: voice                        # voice, stage, external
    channel: "voice-channel-id"        # For voice/stage
    location: "Discord"                # For external
```

---

## State Actions

### `set`

Sets a variable value.

```yaml
- set:
    scope: guild                       # global, guild, channel, user, member
    key: "welcome_count"
    value: "${state.guild.welcome_count + 1}"

# Shorthand for member scope
- set:
    key: "warnings"
    value: 0
```

### `increment` / `decrement`

Modifies numeric values.

```yaml
- increment:
    scope: guild
    var: "message_count"
    by: 1                              # Default: 1

- decrement:
    scope: user
    var: "credits"
    by: 100
```

### `set_map` / `delete_map`

Manages map (object) values.

```yaml
- set_map:
    scope: guild
    var: "settings"
    map_key: "prefix"
    value: "!"

- delete_map:
    scope: guild
    var: "settings"
    map_key: "deprecated_option"
```

### `list_push` / `list_remove`

Manages array values.

```yaml
- list_push:
    scope: user
    key: "inventory"
    value: "sword"

- list_remove:
    scope: user
    key: "inventory"
    value: "sword"
```

### `db_insert`

Inserts a row into a table.

```yaml
- db_insert:
    table: "warnings"
    values:
      user_id: "${target.id}"
      moderator_id: "${user.id}"
      reason: "${options.reason}"
      created_at: "${now()}"
    store_as: warning_id               # Optional: Store inserted ID
```

### `db_update`

Updates table rows.

```yaml
- db_update:
    table: "warnings"
    where:
      id: "${warning_id}"
    values:
      resolved: true
      resolved_at: "${now()}"
```

### `db_delete`

Deletes table rows.

```yaml
- db_delete:
    table: "warnings"
    where:
      id: "${warning_id}"
```

### `db_query`

Queries table data.

```yaml
- db_query:
    table: "warnings"
    where:
      user_id: "${target.id}"
      resolved: false
    order_by: "created_at DESC"
    limit: 10
    store_as: user_warnings
```

### `cache_set` / `cache_get` / `cache_delete` / `cache_clear`

In-memory cache operations.

```yaml
- cache_set:
    key: "rate_limit:${user.id}"
    value: "${now()}"
    ttl: 60                            # Seconds until expiration

- cache_get:
    key: "rate_limit:${user.id}"
    store_as: last_use

- cache_delete:
    key: "rate_limit:${user.id}"

- cache_clear:
    pattern: "rate_limit:*"            # Glob pattern
```

---

## Flow Control Actions

### `wait`

Pauses execution.

```yaml
- wait:
    duration: "5s"                     # Duration string
```

### `log`

Logs a message (for debugging).

```yaml
- log:
    level: info                        # debug, info, warn, error
    message: "User ${user.id} triggered action"
```

### `emit`

Emits a custom event.

```yaml
- emit:
    event: "custom_level_up"
    data:
      user_id: "${user.id}"
      new_level: "${level}"
```

### `call_flow`

Calls a reusable flow.

```yaml
- call_flow:
    flow: "send_welcome"
    args:
      user_id: "${user.id}"
      channel_id: "welcome-channel"
```

### `abort`

Stops action execution.

```yaml
- abort:
    reason: "Validation failed"
```

### `return`

Returns a value from a flow.

```yaml
- return:
    value: "${calculated_result}"
```

### `flow_if`

Conditional execution.

```yaml
- flow_if:
    condition: "user.roles.includes('vip-role-id')"
    then:
      - reply: "Welcome, VIP!"
    else:
      - reply: "Welcome!"
```

### `flow_switch`

Switch/case logic.

```yaml
- flow_switch:
    value: "${options.action}"
    cases:
      add:
        - reply: "Adding..."
      remove:
        - reply: "Removing..."
      list:
        - reply: "Listing..."
    default:
      - reply: "Unknown action"
```

### `flow_match`

Pattern matching with conditions.

```yaml
- flow_match:
    cases:
      - when: "level >= 100"
        actions:
          - assign_role:
              role: "legendary-role"
      - when: "level >= 50"
        actions:
          - assign_role:
              role: "veteran-role"
      - when: "level >= 10"
        actions:
          - assign_role:
              role: "member-role"
```

### `try`

Error handling.

```yaml
- try:
    do:
      - send_dm:
          user: "${target.id}"
          content: "You have been warned"
    catch:
      - log:
          level: warn
          message: "Could not DM user ${target.id}"
```

### `parallel`

Runs actions concurrently.

```yaml
- parallel:
    actions:
      - send_message:
          channel: "log-channel"
          content: "Action logged"
      - send_dm:
          user: "${target.id}"
          content: "You received a warning"
```

### `batch`

Iterates over a collection.

```yaml
- batch:
    items: "${selected_users}"
    as: "target"
    each:
      - assign_role:
          user: "${target.id}"
          role: "winner-role"
```

### `repeat`

Repeats actions a number of times.

```yaml
- repeat:
    times: 5
    as: "i"
    do:
      - send_message:
          channel: "${channel.id}"
          content: "Message ${i + 1} of 5"
      - wait:
          duration: "1s"
```

### `flow_while`

Loop while condition is true.

```yaml
- flow_while:
    while: "${remaining > 0}"
    max_iterations: 100                # Safety limit
    do:
      - decrement:
          var: "remaining"
      - send_message:
          channel: "${channel.id}"
          content: "${remaining} left"
```

---

## Voice Actions

### `voice_join` / `voice_leave`

Join or leave a voice channel.

```yaml
- voice_join:
    channel: "voice-channel-id"
    self_deaf: true                    # Optional: Deafen bot
    self_mute: false                   # Optional: Mute bot

- voice_leave:
    guild: "${guild.id}"
```

### `voice_play`

Plays audio.

```yaml
- voice_play:
    source: "https://youtube.com/watch?v=..."
    volume: 80                         # 0-100
```

### `voice_pause` / `voice_resume` / `voice_stop`

Playback controls.

```yaml
- voice_pause: {}
- voice_resume: {}
- voice_stop: {}
```

### `voice_skip`

Skips to next track.

```yaml
- voice_skip:
    count: 1                           # Optional: Skip multiple
```

### `voice_seek`

Seeks to position.

```yaml
- voice_seek:
    position: 60                       # Seconds
```

### `voice_volume`

Sets playback volume.

```yaml
- voice_volume:
    level: 50                          # 0-100
```

### `voice_set_filter`

Applies audio filter.

```yaml
- voice_set_filter:
    filter: nightcore                  # nightcore, bass, 8d, etc.
    enabled: true
```

### `queue_add` / `queue_remove` / `queue_clear`

Queue management.

```yaml
- queue_add:
    source: "https://youtube.com/watch?v=..."
    position: 0                        # Optional: Insert position

- queue_remove:
    position: 3

- queue_clear: {}
```

### `queue_shuffle` / `queue_loop`

Queue options.

```yaml
- queue_shuffle: {}

- queue_loop:
    mode: queue                        # off, track, queue
```

### `voice_record_start` / `voice_record_stop`

Voice recording.

```yaml
- voice_record_start:
    user: "${user.id}"                 # Optional: Specific user

- voice_record_stop:
    store_as: recording_file
```

---

## UI Actions

### `show_modal`

Shows a modal dialog.

```yaml
- show_modal:
    modal:
      custom_id: "report_modal"
      title: "Submit Report"
      components:
        - type: text_input
          label: "Reason"
          custom_id: "reason"
          style: paragraph
          required: true
          placeholder: "Describe the issue..."
```

### `update_message`

Updates the message that triggered the interaction.

```yaml
- update_message:
    content: "Updated!"
    embeds: []
    components: []
```

### `disable_components`

Disables all components on a message.

```yaml
- disable_components:
    message: "${message.id}"
```

### `edit_reply`

Edits the bot's reply to an interaction.

```yaml
- edit_reply:
    content: "Processing complete!"
    embeds: []
```

---

## Pipe Actions

### `pipe_request`

Makes an HTTP request.

```yaml
- pipe_request:
    pipe: "api"                        # Defined pipe name
    method: POST
    path: "/webhook"
    body:
      event: "user_joined"
      user_id: "${user.id}"
    store_as: response
```

### `pipe_send`

Sends data through a pipe.

```yaml
- pipe_send:
    pipe: "websocket"
    data:
      type: "notification"
      message: "New user joined"
```

### `webhook_send`

Sends a Discord webhook.

```yaml
- webhook_send:
    url: "${webhook_url}"
    content: "Webhook message"
    username: "Custom Bot"
    avatar_url: "https://example.com/avatar.png"
    embeds: []
```

### `mqtt_publish`

Publishes to MQTT topic.

```yaml
- mqtt_publish:
    pipe: "mqtt"
    topic: "discord/events"
    payload:
      event: "message"
      guild: "${guild.id}"
```

---

## Timer Actions

### `create_timer`

Creates a scheduled timer.

```yaml
- create_timer:
    id: "reminder_${user.id}"
    duration: "1h"
    event: "reminder_trigger"
    data:
      user_id: "${user.id}"
      message: "${options.message}"
```

### `cancel_timer`

Cancels a pending timer.

```yaml
- cancel_timer:
    id: "reminder_${user.id}"
```

---

## Analytics Actions

### `counter_increment`

Increments an analytics counter.

```yaml
- counter_increment:
    name: "commands_used"
    labels:
      command: "ping"
      guild: "${guild.id}"
```

### `record_metric`

Records a metric value.

```yaml
- record_metric:
    name: "command_latency"
    type: histogram              # counter | gauge | histogram (required)
    value: "${latency}"
    labels:
      command: "${command.name}"
```

---

## Canvas Actions

### `canvas_render`

Renders an image using a pre-defined generator from `spec.canvas.generators`.

```yaml
# Define generators in your spec
canvas:
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
          src: "${user.avatar}"
        - type: text
          x: 400
          y: 215
          text: "Welcome, ${member.display_name}!"
          font: sans-serif
          size: 32
          color: "#FFFFFF"
          align: center

# Use in actions
- canvas_render:
    generator: "welcome_card"    # Generator name
    context:                     # Variables for the generator
      user: "${member.user}"
    as: "welcome_image"          # Store result in variable

# Send the image
- reply:
    files:
      - attachment: "${welcome_image}"
        name: "welcome.png"
```

### `render_layers`

Renders canvas layers inline without requiring a pre-defined generator.

```yaml
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
        src: "${user.avatar}"
      - type: text
        x: 400
        y: 200
        text: "Hello, ${member.display_name}!"
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
    format: png                  # png (default) or jpeg
    as: "my_image"

- reply:
    files:
      - attachment: "${my_image}"
        name: "image.png"
```

**Layer Types:**

| Type | Description | Key Properties |
|------|-------------|----------------|
| `rect` | Rectangle | `width`, `height`, `color`, `radius` |
| `text` | Text | `text`, `font`, `size`, `color`, `align` |
| `image` | Image | `src`, `width`, `height`, `opacity` |
| `circle_image` | Circular image | `src`, `radius`, `border` |
| `progress_bar` | Progress bar | `progress` (0-1), `background`, `fill` |
| `gradient` | Gradient fill | `direction`, `stops` |

**Common Layer Properties:**
- `x`, `y` - Position
- `when` - Conditional expression
