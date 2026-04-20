# Simple Bot Example

A basic FURLOW bot demonstrating core features like commands, events, and state.

## Features

- `/ping` - Check bot latency
- `/hello` - Greet a user
- `/echo` - Echo a message
- `/serverinfo` - Display server information
- `/userinfo` - Display user information
- `/roll` - Roll dice

## Setup

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Add your Discord bot token and client ID to `.env`

3. Run the bot:
   ```bash
   # From this directory
   furlow start

   # Or with development mode (hot reload)
   furlow dev
   ```

## Getting a Bot Token

1. Go to the [Discord Developer Portal](https://discord.com/developers/applications)
2. Create a new application
3. Go to the "Bot" section
4. Click "Reset Token" to generate a new token
5. Copy the token to your `.env` file

## Inviting the Bot

1. Go to the "OAuth2" > "URL Generator" section
2. Select scopes: `bot`, `applications.commands`
3. Select permissions: `Send Messages`, `Use Slash Commands`
4. Copy the generated URL and open it in your browser

## File Structure

```
simple-bot/
├── furlow.yaml      # Bot configuration
├── .env             # Environment variables (create from .env.example)
├── .env.example     # Example environment file
└── README.md        # This file
```

## Customization

Edit `furlow.yaml` to:
- Add new commands
- Change the bot's presence
- Add event handlers
- Store persistent data

See the [FURLOW documentation](../../docs/guides/quickstart.md) for more details.
