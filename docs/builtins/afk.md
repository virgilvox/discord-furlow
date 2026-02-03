# AFK Builtin

The AFK (Away From Keyboard) builtin tracks user AFK status and notifies others when they mention an AFK user.

## Quick Start

```yaml
builtins:
  afk:
    enabled: true
```

## Configuration

```yaml
builtins:
  afk:
    enabled: true

    # Maximum AFK reason length
    maxReasonLength: 100

    # Prefix to add to nickname when AFK
    nicknamePrefix: "[AFK] "

    # Ignore bot mentions
    ignoreBots: true
```

## Commands

### `/afk [reason]`

Set yourself as AFK with an optional reason.

**Examples:**
```
/afk
/afk reason:Getting lunch, back in 30
/afk reason:At the gym
```

## How It Works

### Setting AFK

When a user runs `/afk`:
1. User is marked as AFK in the database
2. Nickname is prefixed with "[AFK] " (if bot has permission)
3. Confirmation message is sent

### Mentioning AFK Users

When someone mentions an AFK user:
```
@User is AFK: Getting lunch, back in 30
Set 15 minutes ago
```

### Returning from AFK

When an AFK user sends a message:
1. AFK status is removed
2. Nickname prefix is removed
3. Welcome back message is sent

```
Welcome back! You were AFK for 45 minutes.
```

## Nickname Handling

The bot attempts to modify nicknames:
- Adds prefix when going AFK
- Removes prefix when returning
- Fails silently if no permission or nickname too long

**Note:** Bot cannot modify server owner's nickname due to Discord limitations.

## Database Schema

AFK records store:
- User ID
- Guild ID
- Reason (optional)
- AFK start timestamp

## Features

### Cross-Server
AFK status is per-server. A user can be AFK in one server but active in another.

### Mention Notification
Multiple mentions in one message only trigger one notification to avoid spam.

### Automatic Return
Any message from the user (except bot commands) clears AFK status.

### Duration Tracking
The "Set X ago" timestamp helps others know how long the user has been away.

## Limitations

- **Server-only**: AFK status is per-server, not global
- **Nickname length**: If nickname + prefix exceeds 32 characters, prefix may not be added
- **Owner nickname**: Cannot modify server owner's nickname

## Best Practices

1. **Keep reasons short** - They appear in mentions
2. **Use for extended absence** - Not for quick breaks
3. **Clear prefix on return** - Bot handles this automatically
