# Installation Guide

## Requirements

- **Node.js** 18 or higher
- **npm** or **pnpm**
- **Discord Application** with bot token

## Install FURLOW CLI

```bash
# Using npm
npm install -g furlow

# Using pnpm
pnpm add -g furlow

# Verify installation
furlow --version
```

## Create a Discord Application

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Click "New Application" and give it a name
3. On the "General Information" page, copy the **Application ID** (also called Client ID)
4. Go to the "Bot" section
5. Click "Reset Token" and copy the **Bot Token**
6. Enable required Privileged Gateway Intents:
   - **Message Content Intent** - Required for reading message content
   - **Server Members Intent** - Required for member events
   - **Presence Intent** - Required for presence updates

You'll need both the **Application ID** and **Bot Token** for your `.env` file.

## Create a New Bot Project

```bash
# Create with the default template
furlow init my-bot

# Create with a specific template
furlow init my-bot --template moderation

# Create without git initialization
furlow init my-bot --no-git
```

## Project Structure

```
my-bot/
├── furlow.yaml      # Bot specification
├── .env             # Environment variables (create this)
└── .env.example     # Example environment file
```

## Configure Environment

Create a `.env` file in your project directory:

```env
DISCORD_TOKEN=your_bot_token_here
DISCORD_CLIENT_ID=your_application_id_here
```

| Variable | Description | Where to Find |
|----------|-------------|---------------|
| `DISCORD_TOKEN` | Bot authentication token | Developer Portal → Bot → Token |
| `DISCORD_CLIENT_ID` | Application ID for slash commands | Developer Portal → General Information → Application ID |

Never commit `.env` to version control. The `.gitignore` file created by `furlow init` already excludes it.

## Start Your Bot

```bash
# Production mode
furlow start

# Development mode with hot reload
furlow dev
```

## Invite Your Bot to a Server

1. Go to Discord Developer Portal → Your Application → OAuth2 → URL Generator
2. Select scopes:
   - `bot`
   - `applications.commands`
3. Select required permissions for your bot
4. Copy the generated URL and open it in your browser
5. Select a server and authorize the bot

## Troubleshooting

### "Missing Token" Error

Ensure your `.env` file exists and contains `DISCORD_TOKEN=your_token`.

### "Invalid Token" Error

Your token may have been regenerated. Get a new token from the Developer Portal.

### "Missing Intents" Error

Enable the required intents in the Developer Portal under Bot → Privileged Gateway Intents.

### Commands Not Showing

- Global commands can take up to an hour to propagate
- Use `furlow start --guild YOUR_GUILD_ID` for instant registration during development

## Next Steps

- [Quick Start Guide](quickstart.md) - Build your first bot
- [Configuration Guide](configuration.md) - YAML specification reference
