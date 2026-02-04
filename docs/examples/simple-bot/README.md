# Simple Bot Example

A minimal FURLOW bot demonstrating basic features.

## Features

- `/ping` - Check bot latency
- `/hello [name]` - Greet a user
- `/roll [sides]` - Roll a dice
- `/echo <message>` - Repeat a message
- `/userinfo [user]` - Show user information
- `/stats` - Show bot statistics

## Setup

1. Create a Discord application at https://discord.dev/applications
2. Create a bot and copy the token
3. Create a `.env` file:

```env
DISCORD_TOKEN=your_bot_token_here
```

4. Run the bot:

```bash
furlow start furlow.yaml
```

5. Invite the bot to your server using the OAuth2 URL generator

## Files

- `furlow.yaml` - Bot specification
- `.env` - Environment variables (create this)
- `README.md` - This file

## Customization

### Add more commands

Add a new command to the `commands` array:

```yaml
commands:
  # ... existing commands ...

  - name: mycommand
    description: My custom command
    actions:
      - reply:
          content: "Hello from my command!"
```

### Enable welcome messages

Uncomment the `guild_member_add` event in `furlow.yaml`.

### Add persistence

Change the storage type from `memory` to `sqlite`:

```yaml
state:
  storage:
    type: sqlite
    path: ./data.db
```

## Next Steps

- Add more commands
- Try the [Moderation Bot](../moderation-bot/README.md) example
- Read the [YAML Specification](../../reference/yaml-spec.md)
- See the [Actions Reference](../../reference/actions/_index.md) for all available actions
