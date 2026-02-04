# Events Reference

Events allow your bot to react to things happening on Discord. FURLOW supports all Discord gateway events plus custom events.

## Event Syntax

```yaml
events:
  event_name:
    condition: "optional_condition"    # Optional filter
    actions:
      - action_name:
          # action config
```

**Multiple handlers for same event:**
```yaml
events:
  message_create:
    - name: "spam_filter"
      condition: "message.content.length > 500"
      actions:
        - delete_message:
            message: "${message.id}"

    - name: "keyword_response"
      condition: "includes(message.content, 'hello')"
      actions:
        - reply: "Hello there!"
```

---

## Guild Events

### `guild_create`

Bot joins a new guild.

**Context:**
| Variable | Type | Description |
|----------|------|-------------|
| `guild` | Guild | The guild object |

```yaml
events:
  guild_create:
    actions:
      - log:
          message: "Joined guild: ${guild.name}"
```

### `guild_delete`

Bot leaves or is removed from a guild.

**Context:**
| Variable | Type | Description |
|----------|------|-------------|
| `guild` | Guild | The guild object (may be partial) |

### `guild_update`

Guild settings changed.

**Context:**
| Variable | Type | Description |
|----------|------|-------------|
| `old_guild` | Guild | Previous state |
| `guild` | Guild | New state |

---

## Member Events

### `member_join`

A user joins the guild.

**Context:**
| Variable | Type | Description |
|----------|------|-------------|
| `member` | Member | The member who joined |
| `user` | User | The user object |
| `guild` | Guild | The guild |

```yaml
events:
  member_join:
    actions:
      - send_message:
          channel: "welcome-channel-id"
          content: "Welcome ${member.mention} to ${guild.name}!"
      - assign_role:
          user: "${member.id}"
          role: "member-role-id"
```

### `member_leave`

A user leaves the guild (or is kicked/banned).

**Context:**
| Variable | Type | Description |
|----------|------|-------------|
| `member` | Member | The member who left |
| `user` | User | The user object |
| `guild` | Guild | The guild |

```yaml
events:
  member_leave:
    actions:
      - send_message:
          channel: "logs-channel-id"
          content: "${user.username} has left the server."
```

### `member_update`

Member's guild profile changed (roles, nickname, etc.).

**Context:**
| Variable | Type | Description |
|----------|------|-------------|
| `old_member` | Member | Previous state |
| `member` | Member | New state |
| `user` | User | The user object |
| `guild` | Guild | The guild |

```yaml
events:
  member_update:
    condition: "old_member.roles.length != member.roles.length"
    actions:
      - log:
          message: "Roles changed for ${user.username}"
```

### `member_ban`

A user was banned.

**Context:**
| Variable | Type | Description |
|----------|------|-------------|
| `user` | User | The banned user |
| `guild` | Guild | The guild |
| `reason` | string | Ban reason (if available) |

### `member_unban`

A user was unbanned.

**Context:**
| Variable | Type | Description |
|----------|------|-------------|
| `user` | User | The unbanned user |
| `guild` | Guild | The guild |

---

## Message Events

### `message_create`

A message was sent.

**Context:**
| Variable | Type | Description |
|----------|------|-------------|
| `message` | Message | The message object |
| `user` | User | Message author |
| `member` | Member | Author as guild member |
| `channel` | Channel | The channel |
| `guild` | Guild | The guild (if in guild) |

```yaml
events:
  message_create:
    condition: "!user.bot"             # Ignore bots
    actions:
      - flow_if:
          condition: "startsWith(message.content, '!hello')"
          then:
            - reply: "Hello, ${user.username}!"
```

### `message_update`

A message was edited.

**Context:**
| Variable | Type | Description |
|----------|------|-------------|
| `old_message` | Message | Previous content (may be partial) |
| `message` | Message | Updated message |
| `user` | User | Message author |
| `channel` | Channel | The channel |
| `guild` | Guild | The guild |

### `message_delete`

A message was deleted.

**Context:**
| Variable | Type | Description |
|----------|------|-------------|
| `message` | Message | The deleted message (may be partial) |
| `channel` | Channel | The channel |
| `guild` | Guild | The guild |

### `message_delete_bulk`

Multiple messages were deleted.

**Context:**
| Variable | Type | Description |
|----------|------|-------------|
| `messages` | Message[] | Array of deleted messages |
| `channel` | Channel | The channel |
| `guild` | Guild | The guild |

### `message_reaction_add`

A reaction was added to a message.

**Context:**
| Variable | Type | Description |
|----------|------|-------------|
| `reaction` | Reaction | The reaction object |
| `emoji` | Emoji | The emoji used |
| `user` | User | User who reacted |
| `member` | Member | Member who reacted |
| `message` | Message | The message |
| `channel` | Channel | The channel |
| `guild` | Guild | The guild |

```yaml
events:
  message_reaction_add:
    condition: "emoji.name == 'star' && !user.bot"
    actions:
      - increment:
          var: "starboard:${message.id}"
          scope: guild
```

### `message_reaction_remove`

A reaction was removed from a message.

**Context:** Same as `message_reaction_add`

### `message_reaction_remove_all`

All reactions were removed from a message.

**Context:**
| Variable | Type | Description |
|----------|------|-------------|
| `message` | Message | The message |
| `channel` | Channel | The channel |
| `guild` | Guild | The guild |

---

## Channel Events

### `channel_create`

A channel was created.

**Context:**
| Variable | Type | Description |
|----------|------|-------------|
| `channel` | Channel | The new channel |
| `guild` | Guild | The guild |

### `channel_delete`

A channel was deleted.

**Context:**
| Variable | Type | Description |
|----------|------|-------------|
| `channel` | Channel | The deleted channel |
| `guild` | Guild | The guild |

### `channel_update`

A channel was updated.

**Context:**
| Variable | Type | Description |
|----------|------|-------------|
| `old_channel` | Channel | Previous state |
| `channel` | Channel | New state |
| `guild` | Guild | The guild |

### `channel_pins_update`

Pins were added or removed.

**Context:**
| Variable | Type | Description |
|----------|------|-------------|
| `channel` | Channel | The channel |
| `guild` | Guild | The guild |
| `time` | Date | Time of change |

---

## Thread Events

### `thread_create`

A thread was created.

**Context:**
| Variable | Type | Description |
|----------|------|-------------|
| `thread` | Channel | The thread |
| `guild` | Guild | The guild |
| `new_thread` | boolean | True if newly created |

### `thread_delete`

A thread was deleted.

**Context:**
| Variable | Type | Description |
|----------|------|-------------|
| `thread` | Channel | The thread |
| `guild` | Guild | The guild |

### `thread_update`

A thread was updated.

**Context:**
| Variable | Type | Description |
|----------|------|-------------|
| `old_thread` | Channel | Previous state |
| `thread` | Channel | New state |
| `guild` | Guild | The guild |

### `thread_member_update`

Thread membership changed.

**Context:**
| Variable | Type | Description |
|----------|------|-------------|
| `thread` | Channel | The thread |
| `member` | Member | The member |

---

## Role Events

### `role_create`

A role was created.

**Context:**
| Variable | Type | Description |
|----------|------|-------------|
| `role` | Role | The new role |
| `guild` | Guild | The guild |

### `role_delete`

A role was deleted.

**Context:**
| Variable | Type | Description |
|----------|------|-------------|
| `role` | Role | The deleted role |
| `guild` | Guild | The guild |

### `role_update`

A role was updated.

**Context:**
| Variable | Type | Description |
|----------|------|-------------|
| `old_role` | Role | Previous state |
| `role` | Role | New state |
| `guild` | Guild | The guild |

---

## Voice Events

### `voice_state_update`

A user's voice state changed.

**Context:**
| Variable | Type | Description |
|----------|------|-------------|
| `old_state` | VoiceState | Previous state |
| `state` | VoiceState | New state |
| `member` | Member | The member |
| `user` | User | The user |
| `guild` | Guild | The guild |

```yaml
events:
  - event: voice_state_update
    # User joined a voice channel
    when: "!old_state.channel_id && new_state.channel_id"
    actions:
      - send_message:
          channel: "${env.LOG_CHANNEL}"
          content: "${user.username} joined ${new_state.channel.name}"
```

### `voice_server_update`

Voice server region changed.

**Context:**
| Variable | Type | Description |
|----------|------|-------------|
| `guild` | Guild | The guild |
| `endpoint` | string | New voice endpoint |

---

## Interaction Events

### `interaction_create`

Any interaction received (handled automatically for commands).

**Context:**
| Variable | Type | Description |
|----------|------|-------------|
| `interaction` | Interaction | The interaction |
| `user` | User | The user |
| `member` | Member | The member |
| `channel` | Channel | The channel |
| `guild` | Guild | The guild |

### `button_click`

A button was clicked.

**Context:**
| Variable | Type | Description |
|----------|------|-------------|
| `interaction` | Interaction | The interaction |
| `custom_id` | string | Button's custom ID |
| `user` | User | User who clicked |
| `member` | Member | Member who clicked |
| `message` | Message | Message with button |
| `channel` | Channel | The channel |
| `guild` | Guild | The guild |

```yaml
events:
  button_click:
    condition: "custom_id == 'accept_rules'"
    actions:
      - assign_role:
          user: "${user.id}"
          role: "verified-role"
      - update_message:
          content: "Rules accepted!"
          components: []
```

### `select_menu`

A select menu option was chosen.

**Context:**
| Variable | Type | Description |
|----------|------|-------------|
| `interaction` | Interaction | The interaction |
| `custom_id` | string | Menu's custom ID |
| `values` | string[] | Selected values |
| `user` | User | User who selected |
| `member` | Member | Member who selected |
| `channel` | Channel | The channel |
| `guild` | Guild | The guild |

```yaml
events:
  select_menu:
    condition: "custom_id == 'role_select'"
    actions:
      - batch:
          items: "${values}"
          as: "role_id"
          each:
            - toggle_role:
                user: "${user.id}"
                role: "${role_id}"
```

### `modal_submit`

A modal was submitted.

**Context:**
| Variable | Type | Description |
|----------|------|-------------|
| `interaction` | Interaction | The interaction |
| `custom_id` | string | Modal's custom ID |
| `fields` | object | Submitted field values |
| `user` | User | User who submitted |
| `member` | Member | Member who submitted |
| `channel` | Channel | The channel |
| `guild` | Guild | The guild |

```yaml
events:
  modal_submit:
    condition: "custom_id == 'report_modal'"
    actions:
      - send_message:
          channel: "reports-channel"
          content: "New report from ${user.mention}: ${fields.reason}"
```

### `autocomplete`

Autocomplete request for a command option.

**Context:**
| Variable | Type | Description |
|----------|------|-------------|
| `interaction` | Interaction | The interaction |
| `option` | string | Option being completed |
| `value` | string | Current input value |
| `user` | User | The user |
| `guild` | Guild | The guild |

---

## Presence Events

### `presence_update`

A user's presence changed.

**Context:**
| Variable | Type | Description |
|----------|------|-------------|
| `old_presence` | Presence | Previous state |
| `presence` | Presence | New state |
| `user` | User | The user |
| `member` | Member | The member |
| `guild` | Guild | The guild |

### `typing_start`

A user started typing.

**Context:**
| Variable | Type | Description |
|----------|------|-------------|
| `user` | User | The user |
| `member` | Member | The member |
| `channel` | Channel | The channel |
| `guild` | Guild | The guild |
| `timestamp` | Date | When typing started |

---

## Emoji & Sticker Events

### `emoji_create` / `emoji_delete` / `emoji_update`

Emoji changes.

**Context:**
| Variable | Type | Description |
|----------|------|-------------|
| `emoji` | Emoji | The emoji |
| `old_emoji` | Emoji | Previous state (update only) |
| `guild` | Guild | The guild |

### `sticker_create` / `sticker_delete` / `sticker_update`

Sticker changes.

**Context:**
| Variable | Type | Description |
|----------|------|-------------|
| `sticker` | Sticker | The sticker |
| `old_sticker` | Sticker | Previous state (update only) |
| `guild` | Guild | The guild |

---

## Invite Events

### `invite_create`

An invite was created.

**Context:**
| Variable | Type | Description |
|----------|------|-------------|
| `invite` | Invite | The invite |
| `channel` | Channel | The channel |
| `guild` | Guild | The guild |
| `inviter` | User | Who created it |

### `invite_delete`

An invite was deleted or expired.

**Context:**
| Variable | Type | Description |
|----------|------|-------------|
| `invite` | Invite | The invite |
| `channel` | Channel | The channel |
| `guild` | Guild | The guild |

---

## Scheduled Event Events

### `scheduled_event_create` / `scheduled_event_delete` / `scheduled_event_update`

Scheduled event changes.

**Context:**
| Variable | Type | Description |
|----------|------|-------------|
| `event` | ScheduledEvent | The event |
| `old_event` | ScheduledEvent | Previous (update only) |
| `guild` | Guild | The guild |

### `scheduled_event_user_add` / `scheduled_event_user_remove`

User interested in event.

**Context:**
| Variable | Type | Description |
|----------|------|-------------|
| `event` | ScheduledEvent | The event |
| `user` | User | The user |
| `guild` | Guild | The guild |

---

## Stage Events

### `stage_instance_create` / `stage_instance_delete` / `stage_instance_update`

Stage channel events.

**Context:**
| Variable | Type | Description |
|----------|------|-------------|
| `stage` | StageInstance | The stage |
| `old_stage` | StageInstance | Previous (update only) |
| `guild` | Guild | The guild |

---

## Bot Events

### `ready`

Bot is connected and ready.

**Context:**
| Variable | Type | Description |
|----------|------|-------------|
| `bot` | Bot | Bot information |

```yaml
events:
  ready:
    actions:
      - log:
          message: "Bot is online! Serving ${client.guilds.size} guilds"
```

### `shard_ready` / `shard_disconnect` / `shard_error`

Shard lifecycle events (for sharded bots).

**Context:**
| Variable | Type | Description |
|----------|------|-------------|
| `shard_id` | number | The shard ID |
| `error` | Error | Error object (error event) |

### `rate_limit`

Bot hit rate limit.

**Context:**
| Variable | Type | Description |
|----------|------|-------------|
| `timeout` | number | Time to wait (ms) |
| `limit` | number | Request limit |
| `method` | string | HTTP method |
| `path` | string | API path |
| `route` | string | Rate limit route |

---

## Custom Events

### Defining Custom Events

Emit custom events with the `emit` action:

```yaml
- emit:
    event: "level_up"
    data:
      user_id: "${user.id}"
      new_level: 10
```

### Handling Custom Events

```yaml
events:
  level_up:
    actions:
      - send_message:
          channel: "announcements"
          content: "<@${data.user_id}> reached level ${data.new_level}!"
```

---

## Event Conditions

### Basic Conditions

```yaml
events:
  message_create:
    condition: "!user.bot"             # Ignore bots
    actions: [...]
```

### Complex Conditions

```yaml
events:
  member_update:
    condition: |
      member.roles.length > old_member.roles.length &&
      !user.bot &&
      guild.id == '123456789'
    actions: [...]
```

### Multiple Handlers with Conditions

```yaml
events:
  message_create:
    - name: "welcome_new_users"
      condition: "includes(message.content, 'hello') && isNull(state.member.welcomed)"
      actions:
        - reply: "Welcome! Check out #rules"
        - set:
            key: "welcomed"
            value: true

    - name: "filter_links"
      condition: "match(message.content, 'https?://') && !member.roles.includes('trusted')"
      actions:
        - delete_message:
            message: "${message.id}"
```

---

## Required Intents

Events require specific Discord gateway intents. FURLOW can auto-detect required intents, or you can specify them:

```yaml
intents:
  auto: true                           # Auto-detect from events

# Or manually:
intents:
  - guilds
  - guild_members
  - guild_messages
  - message_content
  - guild_voice_states
```

| Intent | Events |
|--------|--------|
| `guilds` | Guild create/update/delete, channel events, role events |
| `guild_members` | Member join/leave/update |
| `guild_messages` | Message events in guilds |
| `message_content` | Access to message.content |
| `guild_message_reactions` | Reaction events |
| `guild_voice_states` | Voice state updates |
| `guild_presences` | Presence updates |
| `guild_scheduled_events` | Scheduled event changes |
| `direct_messages` | DM message events |
