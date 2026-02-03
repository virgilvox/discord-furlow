# Logging Builtin

The logging builtin provides comprehensive audit logging for server events, sending formatted messages to configured channels.

## Quick Start

```yaml
builtins:
  logging:
    enabled: true
    channel: "logs-channel-id"
```

## Configuration

```yaml
builtins:
  logging:
    enabled: true

    # Default log channel (used if specific channels not set)
    channel: "123456789"

    # Specific channels for different event types
    channels:
      messages: "message-logs-id"       # Message edits, deletes
      members: "member-logs-id"         # Joins, leaves, updates
      voice: "voice-logs-id"            # Voice state changes
      server: "server-logs-id"          # Server changes
      moderation: "mod-logs-id"         # Mod actions

    # Channels to ignore (no logging)
    ignoredChannels:
      - "bot-commands-id"
      - "spam-channel-id"

    # Roles to ignore (actions by these roles not logged)
    ignoredRoles:
      - "bot-role-id"

    # Events to log (defaults to all if not specified)
    events:
      - message_delete
      - message_update
      - message_bulk_delete
      - member_join
      - member_leave
      - member_update
      - member_ban
      - member_unban
      - voice_join
      - voice_leave
      - voice_move
      - role_create
      - role_delete
      - role_update
      - channel_create
      - channel_delete
      - channel_update
      - invite_create
      - invite_delete

    # Include images in logs
    includeImages: true
```

## Logged Events

### Message Events

- **message_delete** - Message deleted (shows content if cached)
- **message_update** - Message edited (shows before/after)
- **message_bulk_delete** - Bulk message deletion

### Member Events

- **member_join** - User joined server
- **member_leave** - User left or was kicked
- **member_update** - Nickname, roles, or avatar changed
- **member_ban** - User banned
- **member_unban** - User unbanned

### Voice Events

- **voice_join** - User joined voice channel
- **voice_leave** - User left voice channel
- **voice_move** - User moved between voice channels

### Server Events

- **role_create** - Role created
- **role_delete** - Role deleted
- **role_update** - Role permissions or settings changed
- **channel_create** - Channel created
- **channel_delete** - Channel deleted
- **channel_update** - Channel settings changed
- **invite_create** - Invite link created
- **invite_delete** - Invite link deleted

## Commands

This builtin provides these commands:

### `/logging set-channel <type> <channel>`
Set the log channel for a specific event type.

### `/logging toggle <event>`
Enable or disable logging for a specific event.

### `/logging ignore-channel <channel>`
Add a channel to the ignore list.

### `/logging unignore-channel <channel>`
Remove a channel from the ignore list.

## Log Format

Logs are sent as embeds with:
- **Title**: Event type
- **Description**: Event details
- **Fields**: Relevant information (user, channel, etc.)
- **Footer**: Timestamp and event ID
- **Color**: Varies by event type (green for positive, red for negative)

Example message delete log:

```
Title: Message Deleted
Description: Message by @User was deleted in #general

Fields:
- Author: @User (123456789)
- Channel: #general
- Content: "The deleted message content"

Footer: Message ID: 987654321 • Today at 3:45 PM
Color: #ed4245 (red)
```

## Best Practices

1. **Separate channels** - Use different channels for different event types
2. **Ignore bot channels** - Exclude high-traffic bot command channels
3. **Review periodically** - Check logs regularly for issues
4. **Set permissions** - Restrict log channels to staff only
