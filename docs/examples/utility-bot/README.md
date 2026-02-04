# Utility Bot Example

A utility bot with reminders, polls, starboard, and useful commands.

## Features

- **Reminders**: `/remind` to set reminders
- **Polls**: `/poll` to create polls with reactions
- **Starboard**: Auto-post starred messages
- **Server Info**: `/serverinfo`, `/userinfo`
- **Calculator**: `/calc` for math expressions
- **Random**: `/coinflip`, `/roll`, `/8ball`

## Setup

1. Create channels:
   - `#starboard` - For starred messages

2. Create a `.env` file:

```env
DISCORD_TOKEN=your_bot_token
STARBOARD_CHANNEL=123456789
STAR_THRESHOLD=3
```

3. Run the bot:

```bash
furlow start furlow.yaml
```

## Files

- `furlow.yaml` - Bot specification
- `.env` - Environment variables (create this)

## Usage

### Reminders

```
/remind time:1h message:Take a break
/remind time:2d message:Project deadline
/reminders           # List your reminders
/cancelreminder id:123
```

### Polls

```
/poll question:Favorite color? options:Red,Blue,Green duration:1h
```

### Starboard

React to any message with a star emoji. When it reaches the threshold (default 3), it's posted to the starboard channel.

### Information

```
/serverinfo          # Server statistics
/userinfo @user      # User information
/avatar @user        # Get user's avatar
```

### Fun Commands

```
/coinflip            # Flip a coin
/roll sides:20       # Roll a d20
/8ball question:Will it rain?
```

## Customization

### Change Star Threshold

```env
STAR_THRESHOLD=5
```

### Add Custom 8ball Responses

Edit the `responses` array in the `/8ball` command.

### Extend Poll Duration

Change max duration in the command options.

## Next Steps

- See [Reminders Builtin](../../builtins/reminders.md) for advanced reminders
- Check [Starboard Builtin](../../builtins/starboard.md) for pre-built starboard
