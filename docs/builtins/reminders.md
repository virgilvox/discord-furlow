# Reminders Builtin

The reminders builtin allows users to set personal reminders that trigger after a specified duration.

## Quick Start

```yaml
builtins:
  reminders:
    enabled: true
```

## Configuration

```yaml
builtins:
  reminders:
    enabled: true

    # Maximum reminders per user
    maxRemindersPerUser: 25

    # Minimum reminder duration (optional)
    minDuration: "1m"

    # Maximum reminder duration (optional)
    maxDuration: "365d"

    # Allow DM delivery
    allowDM: true
```

## Commands

### `/remind <time> <message> [dm]`

Set a new reminder.

**Parameters:**
- `time` - When to remind (e.g., "10m", "2h", "1d", "1w")
- `message` - What to remind about
- `dm` - Send reminder via DM instead of channel (optional)

**Examples:**
```
/remind time:30m message:Check the oven
/remind time:2h message:Meeting with team dm:true
/remind time:1d message:Submit report
```

### `/reminders`

View all your active reminders.

### `/delreminder <id>`

Delete a reminder by ID.

## Reminder Delivery

### Channel Reminder (default)
```
@User Reminder: Check the oven

Set 30 minutes ago
```

### DM Reminder
```
Title: Reminder
Description: Meeting with team

Footer: Set 2 hours ago
```

## Duration Format

Supported duration units:
- `s` - seconds (e.g., "30s")
- `m` - minutes (e.g., "10m")
- `h` - hours (e.g., "2h")
- `d` - days (e.g., "1d")
- `w` - weeks (e.g., "1w")

Combined durations:
- "1h30m" - 1 hour 30 minutes
- "1d12h" - 1 day 12 hours

## Reminders List

The `/reminders` command shows:
```
Your Reminders

1. Check the oven - in 25 minutes (ID: 123)
2. Meeting with team - in 1 hour (ID: 124)
3. Submit report - in 23 hours (ID: 125)

3 reminder(s)
```

## Features

### Persistent Storage
Reminders survive bot restarts - they're stored in the database.

### DM Option
Users can choose to receive reminders via DM for privacy.

### Multiple Reminders
Users can have multiple active reminders up to the configured limit.

### Original Context
Reminders sent to channels are sent to the same channel where they were created.

## Database Schema

Reminders store:
- ID
- Guild ID, Channel ID
- User ID
- Message
- Remind timestamp
- DM flag
- Created timestamp

## Scheduler

Reminders are checked on a scheduler tick (typically every minute). When a reminder's time passes:
1. Reminder is fetched from database
2. Notification is sent (channel or DM)
3. Reminder is deleted from database

## Error Handling

If a reminder fails to send (e.g., user left server, channel deleted):
- Reminder is still deleted
- Error is logged

## Best Practices

1. **Set reasonable limits** - Prevent reminder spam
2. **Use DM for personal** - Keep channels clean
3. **Be specific in messages** - Include enough context
4. **Check active reminders** - Avoid duplicates
