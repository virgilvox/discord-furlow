# Moderation Bot Example

A comprehensive moderation bot with automod, logging, warnings, and tickets.

## Features

- **Moderation Commands**: `/warn`, `/kick`, `/ban`, `/timeout`, `/unban`
- **Auto-moderation**: Spam detection, bad words filter, invite blocking
- **Warning System**: Track warnings per user with `/warnings`
- **Mod Logging**: All actions logged to a dedicated channel
- **Ticket System**: Support tickets with `/ticket`

## Setup

1. Create required channels and get their IDs:
   - `#mod-log` - Moderation log channel
   - `#tickets` - Ticket category
   - `#ticket-logs` - Closed ticket logs

2. Create a `.env` file:

```env
DISCORD_TOKEN=your_bot_token
MOD_LOG_CHANNEL=123456789
TICKET_CATEGORY=123456789
TICKET_LOG_CHANNEL=123456789
```

3. Run the bot:

```bash
furlow start furlow.yaml
```

## Files

- `furlow.yaml` - Main bot specification
- `.env` - Environment variables (create this)

## Usage

### Warning Users

```
/warn @user reason:Spamming in chat
```

Warnings are stored per-member and persist across bot restarts.

### Viewing Warnings

```
/warnings @user
```

Shows all warnings for a user with dates and reasons.

### Moderation Actions

```
/kick @user reason:Breaking rules
/ban @user reason:Repeated violations delete_days:7
/timeout @user duration:1h reason:Cooling off
/unban user_id:123456789
```

### Ticket System

Users create tickets with:
```
/ticket subject:Need help with verification
```

Staff close tickets with:
```
/close reason:Issue resolved
```

## Customization

### Add Custom Automod Rules

```yaml
automod:
  rules:
    - name: caps_lock
      type: caps
      threshold: 70  # 70% caps
      action: delete
      warn: true
```

### Adjust Warning Thresholds

Modify the `check_warnings` flow to change automatic actions:

```yaml
flows:
  check_warnings:
    actions:
      - flow_if:
          condition: "warning_count >= 5"
          then:
            - ban:
                user: "${target_user}"
                reason: "Exceeded warning threshold"
```

### Custom Log Format

Modify the `log_action` flow to change log embed format.

## Next Steps

- Read the [YAML Specification](../../reference/yaml-spec.md)
- See [Actions Reference](../../reference/actions/_index.md) for all moderation actions
- Check [Automod Documentation](../../builtins/moderation.md) for advanced automod
