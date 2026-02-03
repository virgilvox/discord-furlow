# Actions Reference

FURLOW provides 84 actions across 9 categories.

## Message Actions (11)

| Action | Description |
|--------|-------------|
| [`reply`](#reply) | Reply to an interaction |
| [`send_message`](#send_message) | Send a message to a channel |
| [`edit_message`](#edit_message) | Edit an existing message |
| [`delete_message`](#delete_message) | Delete a message |
| [`defer`](#defer) | Defer an interaction response |
| [`update_message`](#update_message) | Update a component interaction's message |
| [`add_reaction`](#add_reaction) | Add a reaction to a message |
| [`add_reactions`](#add_reactions) | Add multiple reactions |
| [`remove_reaction`](#remove_reaction) | Remove a reaction |
| [`clear_reactions`](#clear_reactions) | Clear reactions from a message |
| [`bulk_delete`](#bulk_delete) | Delete multiple messages |

## Member Actions (14)

| Action | Description |
|--------|-------------|
| [`assign_role`](#assign_role) | Add a role to a member |
| [`remove_role`](#remove_role) | Remove a role from a member |
| [`toggle_role`](#toggle_role) | Toggle a role on/off |
| [`kick`](#kick) | Kick a member from the server |
| [`ban`](#ban) | Ban a user from the server |
| [`unban`](#unban) | Remove a ban |
| [`timeout`](#timeout) | Timeout a member |
| [`remove_timeout`](#remove_timeout) | Remove a timeout |
| [`send_dm`](#send_dm) | Send a direct message |
| [`set_nickname`](#set_nickname) | Change a member's nickname |
| [`move_member`](#move_member) | Move member to a voice channel |
| [`disconnect_member`](#disconnect_member) | Disconnect from voice |
| [`server_mute`](#server_mute) | Server mute a member |
| [`server_deafen`](#server_deafen) | Server deafen a member |

## State Actions (7)

| Action | Description |
|--------|-------------|
| [`set`](#set) | Set a variable value |
| [`increment`](#increment) | Increment a numeric variable |
| [`decrement`](#decrement) | Decrement a numeric variable |
| [`list_push`](#list_push) | Add item to a list |
| [`list_remove`](#list_remove) | Remove item from a list |
| [`set_map`](#set_map) | Set a key in a map |
| [`delete_map`](#delete_map) | Delete a key from a map |

## Flow Actions (13)

| Action | Description |
|--------|-------------|
| [`call_flow`](#call_flow) | Call a named flow |
| [`abort`](#abort) | Stop execution |
| [`return`](#return) | Return a value from a flow |
| [`flow_if`](#flow_if) | Conditional execution |
| [`flow_switch`](#flow_switch) | Switch/case execution |
| [`flow_while`](#flow_while) | Loop while condition is true |
| [`repeat`](#repeat) | Repeat actions N times |
| [`parallel`](#parallel) | Run actions in parallel |
| [`batch`](#batch) | Run actions with delay |
| [`try`](#try) | Try/catch error handling |
| [`wait`](#wait) | Wait for a duration |
| [`log`](#log) | Log a message |
| [`emit`](#emit) | Emit a custom event |

## Channel Actions (9)

| Action | Description |
|--------|-------------|
| [`create_channel`](#create_channel) | Create a channel |
| [`edit_channel`](#edit_channel) | Edit a channel |
| [`delete_channel`](#delete_channel) | Delete a channel |
| [`create_thread`](#create_thread) | Create a thread |
| [`archive_thread`](#archive_thread) | Archive a thread |
| [`set_channel_permissions`](#set_channel_permissions) | Set channel permissions |
| [`create_role`](#create_role) | Create a role |
| [`edit_role`](#edit_role) | Edit a role |
| [`delete_role`](#delete_role) | Delete a role |

## Component Actions (1)

| Action | Description |
|--------|-------------|
| [`show_modal`](#show_modal) | Show a modal dialog |

## Voice Actions (17)

| Action | Description |
|--------|-------------|
| [`voice_join`](#voice_join) | Join a voice channel |
| [`voice_leave`](#voice_leave) | Leave voice channel |
| [`voice_play`](#voice_play) | Play audio |
| [`voice_pause`](#voice_pause) | Pause playback |
| [`voice_resume`](#voice_resume) | Resume playback |
| [`voice_stop`](#voice_stop) | Stop playback |
| [`voice_skip`](#voice_skip) | Skip current track |
| [`voice_seek`](#voice_seek) | Seek to position |
| [`voice_volume`](#voice_volume) | Set volume |
| [`voice_set_filter`](#voice_set_filter) | Apply audio filter |
| [`voice_search`](#voice_search) | Search for tracks |
| [`queue_get`](#queue_get) | Get queue info |
| [`queue_add`](#queue_add) | Add to queue |
| [`queue_remove`](#queue_remove) | Remove from queue |
| [`queue_clear`](#queue_clear) | Clear queue |
| [`queue_shuffle`](#queue_shuffle) | Shuffle queue |
| [`queue_loop`](#queue_loop) | Set loop mode |

## Database Actions (4)

| Action | Description |
|--------|-------------|
| [`db_insert`](#db_insert) | Insert a record |
| [`db_update`](#db_update) | Update records |
| [`db_delete`](#db_delete) | Delete records |
| [`db_query`](#db_query) | Query records |

## Integration Actions (8)

| Action | Description |
|--------|-------------|
| [`pipe_request`](#pipe_request) | HTTP request to external API |
| [`pipe_send`](#pipe_send) | Send to a pipe connection |
| [`webhook_send`](#webhook_send) | Send via webhook |
| [`create_timer`](#create_timer) | Create a timer |
| [`cancel_timer`](#cancel_timer) | Cancel a timer |
| [`counter_increment`](#counter_increment) | Increment a metric counter |
| [`record_metric`](#record_metric) | Record a metric value |
| [`canvas_render`](#canvas_render) | Render an image |

---

## Action Details

### reply

Reply to an interaction.

```yaml
- reply:
    content: "Hello!"
    ephemeral: true
    embeds:
      - title: "Embed Title"
        description: "Description"
        color: 0x5865F2
    components:
      - type: action_row
        components:
          - type: button
            label: "Click me"
            custom_id: "btn_1"
```

| Property | Type | Description |
|----------|------|-------------|
| `content` | string | Message text |
| `ephemeral` | boolean | Only visible to user |
| `embeds` | array | Embed objects |
| `components` | array | Message components |
| `files` | array | File attachments |

### send_message

Send a message to a channel.

```yaml
- send_message:
    channel: "${channel.id}"
    content: "Message content"
    as: "sent_message"
```

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `channel` | string | Yes | Channel ID |
| `content` | string | No | Message text |
| `embeds` | array | No | Embed objects |
| `as` | string | No | Variable to store result |

### edit_message

Edit an existing message.

```yaml
- edit_message:
    message: "${message.id}"
    channel: "${channel.id}"
    content: "Updated content"
```

### delete_message

Delete a message.

```yaml
- delete_message:
    message: "${message.id}"
    channel: "${channel.id}"
```

### defer

Defer an interaction response.

```yaml
- defer:
    ephemeral: true
```

### update_message

Update the message for a component interaction.

```yaml
- update_message:
    content: "Button was clicked!"
    components: []
```

### add_reaction

Add a reaction to a message.

```yaml
- add_reaction:
    message: "${message.id}"
    channel: "${channel.id}"
    emoji: "👍"
```

### add_reactions

Add multiple reactions.

```yaml
- add_reactions:
    message: "${message.id}"
    channel: "${channel.id}"
    emojis:
      - "1️⃣"
      - "2️⃣"
      - "3️⃣"
```

### remove_reaction

Remove a reaction.

```yaml
- remove_reaction:
    message: "${message.id}"
    channel: "${channel.id}"
    emoji: "👍"
    user: "${user.id}"
```

### clear_reactions

Clear reactions from a message.

```yaml
- clear_reactions:
    message: "${message.id}"
    channel: "${channel.id}"
    emoji: "👍"  # Optional: only clear this emoji
```

### bulk_delete

Delete multiple messages.

```yaml
- bulk_delete:
    channel: "${channel.id}"
    count: 10
    filter: "${msg.author.bot}"
```

### assign_role

Add a role to a member.

```yaml
- assign_role:
    member: "${user.id}"
    role: "123456789"
    reason: "Role assigned via bot"
```

### remove_role

Remove a role from a member.

```yaml
- remove_role:
    member: "${user.id}"
    role: "123456789"
```

### toggle_role

Toggle a role on or off.

```yaml
- toggle_role:
    member: "${user.id}"
    role: "123456789"
```

### kick

Kick a member from the server.

```yaml
- kick:
    member: "${user.id}"
    reason: "Violation of rules"
```

### ban

Ban a user from the server.

```yaml
- ban:
    user: "${user.id}"
    reason: "Repeated violations"
    delete_message_days: 7
```

### unban

Remove a ban.

```yaml
- unban:
    user: "${user.id}"
    reason: "Appeal accepted"
```

### timeout

Timeout a member.

```yaml
- timeout:
    member: "${user.id}"
    duration: "1h"
    reason: "Cool down"
```

### remove_timeout

Remove a timeout.

```yaml
- remove_timeout:
    member: "${user.id}"
```

### send_dm

Send a direct message.

```yaml
- send_dm:
    user: "${user.id}"
    content: "Hello!"
    embeds: []
```

### set_nickname

Change a member's nickname.

```yaml
- set_nickname:
    member: "${user.id}"
    nickname: "New Nickname"
```

### move_member

Move a member to a voice channel.

```yaml
- move_member:
    member: "${user.id}"
    channel: "${voiceChannel.id}"
```

### disconnect_member

Disconnect a member from voice.

```yaml
- disconnect_member:
    member: "${user.id}"
```

### server_mute

Server mute a member.

```yaml
- server_mute:
    member: "${user.id}"
    mute: true
```

### server_deafen

Server deafen a member.

```yaml
- server_deafen:
    member: "${user.id}"
    deafen: true
```

### set

Set a variable value.

```yaml
- set:
    name: "counter"
    value: 42
    scope: guild
```

### increment

Increment a numeric variable.

```yaml
- increment:
    name: "counter"
    by: 1
    scope: global
```

### decrement

Decrement a numeric variable.

```yaml
- decrement:
    name: "counter"
    by: 1
```

### list_push

Add an item to a list.

```yaml
- list_push:
    name: "warnings"
    value: "${user.id}"
    scope: guild
```

### list_remove

Remove an item from a list.

```yaml
- list_remove:
    name: "warnings"
    value: "${user.id}"
```

### set_map

Set a key in a map.

```yaml
- set_map:
    name: "user_data"
    key: "${user.id}"
    value:
      level: 5
      xp: 1000
```

### delete_map

Delete a key from a map.

```yaml
- delete_map:
    name: "user_data"
    key: "${user.id}"
```

### call_flow

Call a named flow.

```yaml
- call_flow:
    name: "send_log"
    args:
      message: "Hello"
      level: "info"
```

### abort

Stop execution.

```yaml
- abort:
    reason: "Invalid input"
```

### return

Return a value from a flow.

```yaml
- return:
    value: "${result}"
```

### flow_if

Conditional execution.

```yaml
- flow_if:
    condition: "${count > 10}"
    then:
      - reply:
          content: "Count is high"
    else:
      - reply:
          content: "Count is low"
```

### flow_switch

Switch/case execution.

```yaml
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
          content: "Unknown option"
```

### flow_while

Loop while condition is true.

```yaml
- flow_while:
    condition: "${i < 10}"
    actions:
      - increment:
          name: "i"
```

### repeat

Repeat actions N times.

```yaml
- repeat:
    times: 5
    as: "i"
    actions:
      - log:
          message: "Iteration ${i}"
```

### parallel

Run actions in parallel.

```yaml
- parallel:
    actions:
      - send_dm:
          user: "${user1.id}"
          content: "Hello"
      - send_dm:
          user: "${user2.id}"
          content: "Hello"
```

### batch

Run actions with delay between each.

```yaml
- batch:
    actions:
      - send_message:
          channel: "${channel.id}"
          content: "Message 1"
      - send_message:
          channel: "${channel.id}"
          content: "Message 2"
    delay: "1s"
```

### try

Try/catch error handling.

```yaml
- try:
    actions:
      - send_dm:
          user: "${user.id}"
          content: "Hello"
    catch:
      - log:
          level: error
          message: "Failed to send DM"
```

### wait

Wait for a duration.

```yaml
- wait:
    duration: "5s"
```

### log

Log a message.

```yaml
- log:
    level: info  # debug | info | warn | error
    message: "Something happened"
```

### emit

Emit a custom event.

```yaml
- emit:
    event: "custom_event"
    data:
      key: "value"
```

### create_channel

Create a channel.

```yaml
- create_channel:
    name: "new-channel"
    type: text  # text | voice | category | announcement | forum | stage
    parent: "${category.id}"
    topic: "Channel topic"
    as: "created_channel"
```

### edit_channel

Edit a channel.

```yaml
- edit_channel:
    channel: "${channel.id}"
    name: "renamed"
    topic: "New topic"
```

### delete_channel

Delete a channel.

```yaml
- delete_channel:
    channel: "${channel.id}"
```

### create_thread

Create a thread.

```yaml
- create_thread:
    channel: "${channel.id}"
    message: "${message.id}"  # Optional: create from message
    name: "Thread Name"
    auto_archive_duration: 1440  # minutes
    as: "created_thread"
```

### archive_thread

Archive a thread.

```yaml
- archive_thread:
    thread: "${thread.id}"
    locked: true
```

### set_channel_permissions

Set channel permissions.

```yaml
- set_channel_permissions:
    channel: "${channel.id}"
    target: "${role.id}"
    type: role  # role | member
    allow:
      - view_channel
      - send_messages
    deny:
      - manage_messages
```

### create_role

Create a role.

```yaml
- create_role:
    name: "New Role"
    color: 0xFF0000
    hoist: true
    mentionable: false
    permissions:
      - send_messages
    as: "created_role"
```

### edit_role

Edit a role.

```yaml
- edit_role:
    role: "${role.id}"
    name: "Updated Name"
    color: 0x00FF00
```

### delete_role

Delete a role.

```yaml
- delete_role:
    role: "${role.id}"
```

### show_modal

Show a modal dialog.

```yaml
- show_modal:
    title: "Feedback Form"
    custom_id: "feedback_modal"
    components:
      - type: text_input
        custom_id: "feedback"
        label: "Your feedback"
        style: paragraph
        required: true
        placeholder: "Enter your feedback..."
```

### voice_join

Join a voice channel.

```yaml
- voice_join:
    channel: "${voiceChannel.id}"
    self_deaf: true
```

### voice_leave

Leave voice channel.

```yaml
- voice_leave:
    guild: "${guild.id}"
```

### voice_play

Play audio.

```yaml
- voice_play:
    guild: "${guild.id}"
    source: "https://youtube.com/watch?v=..."
```

### voice_pause

Pause playback.

```yaml
- voice_pause:
    guild: "${guild.id}"
```

### voice_resume

Resume playback.

```yaml
- voice_resume:
    guild: "${guild.id}"
```

### voice_stop

Stop playback.

```yaml
- voice_stop:
    guild: "${guild.id}"
```

### voice_skip

Skip current track.

```yaml
- voice_skip:
    guild: "${guild.id}"
```

### voice_seek

Seek to position.

```yaml
- voice_seek:
    guild: "${guild.id}"
    position: "1m30s"  # or milliseconds
```

### voice_volume

Set volume.

```yaml
- voice_volume:
    guild: "${guild.id}"
    level: 50  # 0-100
```

### voice_set_filter

Apply audio filter.

```yaml
- voice_set_filter:
    guild: "${guild.id}"
    filter: bassboost  # bassboost | nightcore | vaporwave | etc.
    enabled: true
```

Available filters: `bassboost`, `nightcore`, `vaporwave`, `karaoke`, `tremolo`, `vibrato`, `reverse`, `treble`, `surrounding`, `earrape`

### voice_search

Search for tracks.

```yaml
- voice_search:
    query: "song name"
    limit: 5
    source: youtube  # youtube | soundcloud | spotify
    as: "search_results"
```

### queue_get

Get queue info.

```yaml
- queue_get:
    guild: "${guild.id}"
    as: "queue"
```

### queue_add

Add to queue.

```yaml
- queue_add:
    guild: "${guild.id}"
    url: "https://..."
    position: 0  # Optional: insert position
```

### queue_remove

Remove from queue.

```yaml
- queue_remove:
    guild: "${guild.id}"
    index: 0
```

### queue_clear

Clear queue.

```yaml
- queue_clear:
    guild: "${guild.id}"
```

### queue_shuffle

Shuffle queue.

```yaml
- queue_shuffle:
    guild: "${guild.id}"
```

### queue_loop

Set loop mode.

```yaml
- queue_loop:
    guild: "${guild.id}"
    mode: queue  # off | track | queue
```

### db_insert

Insert a record.

```yaml
- db_insert:
    table: "users"
    data:
      id: "${user.id}"
      name: "${user.username}"
    as: "inserted"
```

### db_update

Update records.

```yaml
- db_update:
    table: "users"
    where:
      id: "${user.id}"
    data:
      name: "${newName}"
```

### db_delete

Delete records.

```yaml
- db_delete:
    table: "users"
    where:
      id: "${user.id}"
```

### db_query

Query records.

```yaml
- db_query:
    table: "users"
    where:
      guild_id: "${guild.id}"
    order_by: "xp"
    order: desc
    limit: 10
    as: "top_users"
```

### pipe_request

HTTP request to external API.

```yaml
- pipe_request:
    url: "https://api.example.com/data"
    method: GET
    headers:
      Authorization: "Bearer ${token}"
    body:
      key: "value"
    as: "response"
```

### pipe_send

Send to a pipe connection.

```yaml
- pipe_send:
    pipe: "websocket_pipe"
    data:
      type: "message"
      content: "Hello"
```

### webhook_send

Send via webhook.

```yaml
- webhook_send:
    url: "${webhookUrl}"
    content: "Webhook message"
    username: "Bot Name"
    avatar_url: "https://..."
```

### create_timer

Create a timer.

```yaml
- create_timer:
    name: "reminder"
    duration: "1h"
    data:
      user_id: "${user.id}"
      message: "Reminder!"
```

### cancel_timer

Cancel a timer.

```yaml
- cancel_timer:
    name: "reminder"
```

### counter_increment

Increment a metric counter.

```yaml
- counter_increment:
    name: "commands_executed"
    labels:
      command: "ping"
```

### record_metric

Record a metric value.

```yaml
- record_metric:
    name: "response_time"
    value: 150
    labels:
      endpoint: "api"
```

### canvas_render

Render an image.

```yaml
- canvas_render:
    width: 800
    height: 400
    elements:
      - type: rect
        x: 0
        y: 0
        width: 800
        height: 400
        fill: "#1a1a2e"
      - type: text
        x: 400
        y: 200
        text: "Hello!"
        font: "48px sans-serif"
        fill: "#ffffff"
        align: center
    as: "image_buffer"
```
