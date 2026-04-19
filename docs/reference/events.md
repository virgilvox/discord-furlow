# Events Reference

FURLOW emits snake_case events that your YAML can handle declaratively. Every event listed here is wired by `@furlow/discord/events` and dispatched through the core `EventRouter`.

## Event Handler Syntax

```yaml
events:
  - event: message_create
    when: "!message.author.bot && message.content.startsWith('!')"
    actions:
      - reply:
          content: "Commands use / now"

    # Optional rate limiting
    debounce: 5s    # Ignore triggers within 5 seconds
    throttle: 1m    # Max once per minute
    once: true      # Only trigger once
```

## Context Variables

Most events provide some combination of the following context fields. Every event also gets `now`, `random`, `options`, `args`, `state`, and `client`.

| Context Field | When Populated |
|---------------|----------------|
| `user` | events involving a user (messages, reactions, interactions, presence, typing, bans, scheduled-event RSVPs) |
| `member` | member-scoped events (member_join, member_update, voice events) |
| `guild` | any guild-scoped event |
| `channel` | channel-scoped, message, thread, invite events |
| `message` | message events, reactions |
| `reaction` | reaction events |
| `role` | role events |
| `thread` | thread events |
| `emoji` | emoji events, reactions |
| `sticker` | sticker events |
| `invite` | invite events |
| `scheduled_event` | scheduled-event events |
| `stage_instance` | stage-instance events |
| `presence` | presence_update |
| `interaction` | component and command interactions |
| `guildId` / `channelId` / `userId` / `messageId` | IDs for quick access without entity traversal |

Discord.js entities are Proxy-wrapped so URL methods (`displayAvatarURL`, `iconURL`, etc.) are accessible as properties inside expressions. For example, `${user.displayAvatarURL}` evaluates to the URL string.

---

## Bot Lifecycle (4)

| Event | Description | Extra Context |
|-------|-------------|---------------|
| `ready` | Client connected and ready. Fires once on startup and again on reconnect. | none |
| `shard_ready` | A specific shard connected. | `shard_id`, `unavailable_guilds` |
| `shard_disconnect` | A shard disconnected from the gateway. | `shard_id`, `close_code`, `close_reason` |
| `shard_error` | A shard websocket errored. | `shard_id`, `error` |

## Guild (3)

| Event | Description | Extra Context |
|-------|-------------|---------------|
| `guild_create` | Bot joined a guild, or the guild became available. | `guild` |
| `guild_delete` | Bot was removed, or guild became unavailable. | `guild` |
| `guild_update` | Guild settings changed. | `guild`, `old_guild` |

## Members (7)

| Event | Description | Extra Context |
|-------|-------------|---------------|
| `member_join` | Member joined the guild. | `member` |
| `member_leave` | Member left or was kicked. | `member` |
| `member_update` | Member roles, nickname, or flags changed. | `member`, `old_member` |
| `member_boost` | Member started boosting the guild. | `member`, `boost_since` |
| `member_unboost` | Member stopped boosting the guild. | `member`, `boost_ended` |
| `member_ban` | Member was banned. | `user`, `guild`, `reason` |
| `member_unban` | Member was unbanned. | `user`, `guild` |

`member_boost` and `member_unboost` are FURLOW-level events derived from `guildMemberUpdate` by comparing `premiumSince` on the old and new member.

## Messages (4)

| Event | Description | Extra Context |
|-------|-------------|---------------|
| `message_create` | A non-bot user posted a message. | `message`, `attachments` |
| `message_update` | A message was edited. | `message`, `old_message` |
| `message_delete` | A message was deleted. | `message` |
| `message_delete_bulk` | Multiple messages were deleted in one API call. | `messages`, `message_count`, `channel` |

Bot messages are skipped for `message_create` to avoid loops. `attachments` is an array of `{ name, size, contentType, url }`. `MessageContent` intent is required to read `message.content`.

## Reactions (3 plus 2 legacy aliases)

| Event | Description | Extra Context |
|-------|-------------|---------------|
| `message_reaction_add` | User reacted to a message (bot reactions skipped). | `reaction`, `emoji`, `user`, `message` |
| `message_reaction_remove` | User removed a reaction. | `reaction`, `emoji`, `user`, `message` |
| `message_reaction_remove_all` | All reactions were cleared from a message. | `message` |
| `reaction_add` | Legacy alias for `message_reaction_add`. | same as above |
| `reaction_remove` | Legacy alias for `message_reaction_remove`. | same as above |

## Channels (4)

| Event | Description | Extra Context |
|-------|-------------|---------------|
| `channel_create` | Channel was created. | `channel` |
| `channel_delete` | Channel was deleted. | `channel` |
| `channel_update` | Channel settings changed. | `channel`, `old_channel` |
| `channel_pins_update` | Pinned message list changed. | `channel`, `pins_updated_at` |

## Threads (4)

| Event | Description | Extra Context |
|-------|-------------|---------------|
| `thread_create` | Thread was created. | `thread`, `newly_created` |
| `thread_delete` | Thread was deleted. | `thread` |
| `thread_update` | Thread settings changed. | `thread`, `old_thread` |
| `thread_member_update` | Thread member joined, left, or was updated. | `old_thread_member`, `new_thread_member` |

## Roles (3)

| Event | Description | Extra Context |
|-------|-------------|---------------|
| `role_create` | Role was created. | `role` |
| `role_delete` | Role was deleted. | `role` |
| `role_update` | Role settings changed. | `role`, `old_role` |

## Emojis (3)

| Event | Description | Extra Context |
|-------|-------------|---------------|
| `emoji_create` | Custom emoji created. | `emoji` |
| `emoji_delete` | Custom emoji deleted. | `emoji` |
| `emoji_update` | Custom emoji updated. | `emoji`, `old_emoji` |

## Stickers (3)

| Event | Description | Extra Context |
|-------|-------------|---------------|
| `sticker_create` | Custom sticker created. | `sticker` |
| `sticker_delete` | Custom sticker deleted. | `sticker` |
| `sticker_update` | Custom sticker updated. | `sticker`, `old_sticker` |

## Invites (2)

| Event | Description | Extra Context |
|-------|-------------|---------------|
| `invite_create` | Invite link created. | `invite`, `channel`, `user` |
| `invite_delete` | Invite revoked or expired. | `invite` |

## Voice (6)

| Event | Description | Extra Context |
|-------|-------------|---------------|
| `voice_state_update` | Raw voice-state change (fires for every transition). | `old_voice_state`, `new_voice_state`, `member` |
| `voice_join` | User joined a voice channel. | `member`, voice states |
| `voice_leave` | User left a voice channel. | `member`, voice states |
| `voice_move` | User moved between voice channels. | `member`, voice states |
| `voice_stream_start` | User started streaming their screen. | `member`, `streaming: true`, `voice_channel` |
| `voice_stream_stop` | User stopped streaming. | `member`, `streaming: false` |

`voice_join` / `voice_leave` / `voice_move` / `voice_stream_*` are FURLOW-level events derived from the underlying `voiceStateUpdate` by comparing old and new states. `voice_state_update` always fires last so handlers can do advanced filtering.

## Presence and Typing (2)

| Event | Description | Extra Context |
|-------|-------------|---------------|
| `presence_update` | Member status or activity changed. Requires `GuildPresences` intent. | `presence`, `old_presence`, `user`, `guild` |
| `typing_start` | User started typing. Requires `GuildMessageTyping` or `DirectMessageTyping` intent. | `user`, `channel`, `guild` |

## Scheduled Events (5)

| Event | Description | Extra Context |
|-------|-------------|---------------|
| `scheduled_event_create` | Guild scheduled event created. | `scheduled_event` |
| `scheduled_event_delete` | Guild scheduled event cancelled. | `scheduled_event` |
| `scheduled_event_update` | Guild scheduled event updated. | `scheduled_event`, `old_scheduled_event` |
| `scheduled_event_user_add` | User RSVP'd to an event. | `scheduled_event`, `user` |
| `scheduled_event_user_remove` | User cancelled their RSVP. | `scheduled_event`, `user` |

## Stage Instances (3)

| Event | Description | Extra Context |
|-------|-------------|---------------|
| `stage_instance_create` | Stage instance started. | `stage_instance` |
| `stage_instance_delete` | Stage instance ended. | `stage_instance` |
| `stage_instance_update` | Stage instance updated. | `stage_instance`, `old_stage_instance` |

## Component Interactions (3)

These fire from `interactionCreate` for non-command interactions. Slash commands, autocomplete, and context-menu commands are handled by the CLI command dispatcher, not the event router.

| Event | Description | Extra Context |
|-------|-------------|---------------|
| `button_click` | Button component was clicked. | `interaction`, `custom_id`, `component_type: 'button'` |
| `select_menu` | Any select menu value was chosen (string, user, role, channel, mentionable). | `interaction`, `custom_id`, `values`, `selected`, `component_type: 'select_menu'` |
| `modal_submit` | Modal form was submitted. | `interaction`, `custom_id`, `fields`, `modal_values`, `component_type: 'modal'` |

Autocomplete is not dispatched as a FURLOW event. Declare autocomplete sources directly on command options via `source: static` / `query` / `expression`. See the Actions reference for details.

---

## FURLOW High-Level Events (from non-gateway sources)

These are dispatched by the core runtime, not by the Discord adapter.

| Event | Source | Description |
|-------|--------|-------------|
| `automod_triggered` | `@furlow/core/automod` | An automod rule matched. |
| `timer_fire` | `@furlow/core/scheduler` | A timer scheduled with `create_timer` fired. |
| _any user-defined name_ | `emit` action, cron triggers, pipe messages | Fired by user code or integrations. |

---

## Event Handler Options

### when (condition)

Filter events with a raw Jexl expression (no `${}` wrapper). Only truthy results run the actions.

```yaml
events:
  - event: message_create
    when: "!message.author.bot && message.content.length > 100"
    actions:
      - log:
          message: "Long message received"
```

### debounce

Ignore repeated triggers within the specified duration. Only the last trigger runs.

```yaml
events:
  - event: message_create
    debounce: 5s
    actions:
      - increment:
          var: message_count
          scope: channel
```

### throttle

Limit to at most one trigger per duration window.

```yaml
events:
  - event: member_join
    throttle: 1m
    actions:
      - send_message:
          channel: "${env.WELCOME_CHANNEL}"
          content: "Welcome ${member.display_name}!"
```

### once

Trigger once, then deactivate.

```yaml
events:
  - event: ready
    once: true
    actions:
      - log:
          message: "Bot started"
```

---

## Duration Format

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
  - event: member_join
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
    when: "message.id == '123456789' && reaction.emoji.name == '✅'"
    actions:
      - assign_role:
          user: "${user.id}"
          role: "verified_role_id"
```

### Log Deleted Messages

```yaml
events:
  - event: message_delete
    when: "!message.author.bot"
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
          content: "${member.display_name} joined ${new_voice_state.channel.name}"

  - event: voice_leave
    actions:
      - send_message:
          channel: "${env.LOG_CHANNEL}"
          content: "${member.display_name} left ${old_voice_state.channel.name}"
```

### Boost Alert

```yaml
events:
  - event: member_boost
    actions:
      - send_message:
          channel: "${env.ANNOUNCE_CHANNEL}"
          content: "Thanks for the boost, ${member.display_name}!"
```
