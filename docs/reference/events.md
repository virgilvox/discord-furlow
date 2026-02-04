# Events Reference

FURLOW supports 76 event types: 57 Discord gateway events and 19 FURLOW high-level events.

## Event Handler Syntax

```yaml
events:
  - event: message_create
    condition: "message.content.startsWith('!')"
    actions:
      - reply:
          content: "Commands use / now"

    # Optional rate limiting
    debounce: 5s    # Ignore triggers within 5 seconds
    throttle: 1m    # Max once per minute
    once: true      # Only trigger once
```

## Context Variables

Each event provides specific context variables:

| Event Type | Available Variables |
|------------|---------------------|
| Message events | `message`, `channel`, `guild`, `user` |
| Member events | `member`, `guild`, `user` |
| Reaction events | `reaction`, `message`, `user` |
| Voice events | `voiceState`, `member`, `channel` |
| Interaction events | `interaction`, `user`, `guild`, `channel` |

---

## Discord Gateway Events (57)

### Guild Events

| Event | Description |
|-------|-------------|
| `guild_create` | Bot joins a guild |
| `guild_update` | Guild settings changed |
| `guild_delete` | Bot leaves or guild deleted |
| `guild_available` | Guild becomes available |
| `guild_unavailable` | Guild becomes unavailable |

### Channel Events

| Event | Description |
|-------|-------------|
| `channel_create` | Channel created |
| `channel_update` | Channel updated |
| `channel_delete` | Channel deleted |
| `channel_pins_update` | Pins added/removed |

### Thread Events

| Event | Description |
|-------|-------------|
| `thread_create` | Thread created |
| `thread_update` | Thread updated |
| `thread_delete` | Thread deleted |
| `thread_list_sync` | Thread list synced |
| `thread_member_update` | Thread member updated |
| `thread_members_update` | Thread members changed |

### Member Events

| Event | Description |
|-------|-------------|
| `guild_member_add` | Member joins server |
| `guild_member_update` | Member updated (roles, nickname) |
| `guild_member_remove` | Member leaves server |
| `guild_members_chunk` | Member chunk received |

### Role Events

| Event | Description |
|-------|-------------|
| `guild_role_create` | Role created |
| `guild_role_update` | Role updated |
| `guild_role_delete` | Role deleted |

### Emoji & Sticker Events

| Event | Description |
|-------|-------------|
| `guild_emojis_update` | Emojis changed |
| `guild_stickers_update` | Stickers changed |

### Ban Events

| Event | Description |
|-------|-------------|
| `guild_ban_add` | User banned |
| `guild_ban_remove` | User unbanned |

### Message Events

| Event | Description |
|-------|-------------|
| `message_create` | Message sent |
| `message_update` | Message edited |
| `message_delete` | Message deleted |
| `message_delete_bulk` | Multiple messages deleted |

### Reaction Events

| Event | Description |
|-------|-------------|
| `message_reaction_add` | Reaction added |
| `message_reaction_remove` | Reaction removed |
| `message_reaction_remove_all` | All reactions removed |
| `message_reaction_remove_emoji` | All of one emoji removed |

### Presence Events

| Event | Description |
|-------|-------------|
| `presence_update` | User presence changed |
| `typing_start` | User started typing |

### Voice Events

| Event | Description |
|-------|-------------|
| `voice_state_update` | Voice state changed |
| `voice_server_update` | Voice server updated |

### Interaction Events

| Event | Description |
|-------|-------------|
| `interaction_create` | Interaction received |

### Invite Events

| Event | Description |
|-------|-------------|
| `invite_create` | Invite created |
| `invite_delete` | Invite deleted |

### Integration Events

| Event | Description |
|-------|-------------|
| `integration_create` | Integration added |
| `integration_update` | Integration updated |
| `integration_delete` | Integration removed |

### Webhook Events

| Event | Description |
|-------|-------------|
| `webhooks_update` | Webhooks changed |

### Stage Events

| Event | Description |
|-------|-------------|
| `stage_instance_create` | Stage started |
| `stage_instance_update` | Stage updated |
| `stage_instance_delete` | Stage ended |

### Scheduled Event Events

| Event | Description |
|-------|-------------|
| `guild_scheduled_event_create` | Event created |
| `guild_scheduled_event_update` | Event updated |
| `guild_scheduled_event_delete` | Event deleted |
| `guild_scheduled_event_user_add` | User interested |
| `guild_scheduled_event_user_remove` | User uninterested |

### Automod Events

| Event | Description |
|-------|-------------|
| `auto_moderation_rule_create` | Automod rule created |
| `auto_moderation_rule_update` | Automod rule updated |
| `auto_moderation_rule_delete` | Automod rule deleted |
| `auto_moderation_action_execution` | Automod action triggered |

---

## FURLOW High-Level Events (19)

These are convenience events that simplify common patterns.

### Lifecycle Events

| Event | Description |
|-------|-------------|
| `ready` | Bot is online and ready |
| `error` | Error occurred |
| `warn` | Warning occurred |

### Member Lifecycle Events

| Event | Description | Context |
|-------|-------------|---------|
| `member_join` | Member joins | `member`, `guild` |
| `member_leave` | Member leaves | `member`, `guild` |
| `member_ban` | Member banned | `user`, `guild` |
| `member_unban` | Member unbanned | `user`, `guild` |
| `member_boost` | Member starts boosting | `member`, `guild` |
| `member_unboost` | Member stops boosting | `member`, `guild` |

### Message Convenience Events

| Event | Description |
|-------|-------------|
| `message` | Alias for `message_create` |
| `message_edit` | Alias for `message_update` |
| `message_delete` | Alias for `message_delete` |

### Voice Convenience Events

| Event | Description | Context |
|-------|-------------|---------|
| `voice_join` | User joins voice | `member`, `channel` |
| `voice_leave` | User leaves voice | `member`, `channel` |
| `voice_move` | User moves channels | `member`, `oldChannel`, `newChannel` |
| `voice_stream_start` | User starts streaming | `member`, `channel` |
| `voice_stream_stop` | User stops streaming | `member`, `channel` |

### Timer Events

| Event | Description | Context |
|-------|-------------|---------|
| `timer_fire` | Timer triggered | `timer`, `data` |

### Custom Events

| Event | Description |
|-------|-------------|
| `custom` | Custom event (from `emit` action) |

---

## Event Handler Options

### condition / when

Filter events with an expression:

```yaml
events:
  - event: message_create
    condition: "!message.author.bot && message.content.length > 100"
    actions:
      - log:
          message: "Long message received"
```

### debounce

Ignore repeated triggers within the specified duration:

```yaml
events:
  - event: message_create
    debounce: 5s
    actions:
      - increment:
          var: message_count
```

### throttle

Limit to one trigger per duration:

```yaml
events:
  - event: guild_member_add
    throttle: 1m  # Max once per minute
    actions:
      - send_message:
          channel: "${env.WELCOME_CHANNEL}"
          content: "Welcome!"
```

### once

Only trigger once, then deactivate:

```yaml
events:
  - event: ready
    once: true
    actions:
      - log:
          message: "Bot started!"
```

---

## Duration Format

Durations support these formats:

| Format | Description |
|--------|-------------|
| `100` | Milliseconds |
| `5s` | Seconds |
| `2m` | Minutes |
| `1h` | Hours |
| `1d` | Days |
| `1h30m` | Combined |

---

## Examples

### Welcome Message

```yaml
events:
  - event: guild_member_add
    actions:
      - send_message:
          channel: "${env.WELCOME_CHANNEL}"
          content: "Welcome ${member.display_name}!"
          embeds:
            - title: "Welcome to ${guild.name}!"
              description: "Be sure to read the rules."
              color: 0x57F287
```

### Reaction Roles

```yaml
events:
  - event: message_reaction_add
    condition: "message.id == '123456789' && reaction.emoji.name == '✅'"
    actions:
      - assign_role:
          user: "${user.id}"
          role: "verified_role_id"
```

### Log Deleted Messages

```yaml
events:
  - event: message_delete
    condition: "!message.author.bot"
    actions:
      - send_message:
          channel: "${env.LOG_CHANNEL}"
          embeds:
            - title: "Message Deleted"
              description: "${message.content | truncate(1000)}"
              fields:
                - name: "Author"
                  value: "${message.author.tag}"
                - name: "Channel"
                  value: "<#${message.channel.id}>"
              color: 0xED4245
```

### Voice Activity Log

```yaml
events:
  - event: voice_join
    actions:
      - send_message:
          channel: "${env.LOG_CHANNEL}"
          content: "${member.display_name} joined ${channel.name}"

  - event: voice_leave
    actions:
      - send_message:
          channel: "${env.LOG_CHANNEL}"
          content: "${member.display_name} left ${channel.name}"
```
