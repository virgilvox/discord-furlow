# Quick Start Guide

This guide walks you through building a working Discord bot with FURLOW.

## Prerequisites

- FURLOW CLI installed (`npm install -g furlow`)
- Discord bot token (see [Installation Guide](installation.md))

## Create Your Bot

```bash
furlow init my-first-bot
cd my-first-bot
```

## Configure Credentials

Create a `.env` file with your Discord credentials:

```bash
cat > .env << EOF
DISCORD_TOKEN=your_bot_token_here
DISCORD_CLIENT_ID=your_application_id_here
EOF
```

Get these from the [Discord Developer Portal](https://discord.com/developers/applications):
- **Token**: Bot → Reset Token
- **Client ID**: General Information → Application ID

## Your First Command

Edit `furlow.yaml`:

```yaml
version: "0.1"

identity:
  name: "My First Bot"

commands:
  - name: ping
    description: Check if the bot is online
    actions:
      - reply:
          content: "Pong! Latency: ${client.ping}ms"
```

Start the bot:

```bash
furlow start
```

Try `/ping` in your Discord server!

## Adding Command Options

Commands can accept user input:

```yaml
commands:
  - name: greet
    description: Greet someone
    options:
      - name: user
        type: user
        description: Who to greet
        required: false
      - name: message
        type: string
        description: Custom greeting
        required: false
    actions:
      - reply:
          content: "${options.message || 'Hello'}, ${options.member.display_name || user.username}!"
```

### Option Types

| Type | Description |
|------|-------------|
| `string` | Text input |
| `integer` | Whole numbers |
| `number` | Decimal numbers |
| `boolean` | True/false |
| `user` | Discord user mention |
| `channel` | Channel selection |
| `role` | Role selection |
| `mentionable` | User or role |
| `attachment` | File upload |

## Using Embeds

Create rich formatted responses:

```yaml
commands:
  - name: info
    description: Bot information
    actions:
      - reply:
          embeds:
            - title: "Bot Information"
              color: 0x5865F2
              fields:
                - name: "Servers"
                  value: "${client.guilds.size}"
                  inline: true
                - name: "Uptime"
                  value: "${duration(client.uptime)}"
                  inline: true
              footer:
                text: "Powered by FURLOW"
```

## Handling Events

Respond to Discord events:

```yaml
events:
  # Welcome new members
  - event: guild_member_add
    actions:
      - send_message:
          channel: "${env.WELCOME_CHANNEL}"
          content: "Welcome to the server, ${member.display_name}!"

  # Log when bot is ready
  - event: ready
    actions:
      - log:
          level: info
          message: "Bot is online! Logged in as ${client.user.tag}"
```

## Using State

Store and retrieve data:

```yaml
state:
  storage:
    type: memory  # Use 'sqlite' for persistence
  variables:
    command_count:
      scope: global
      type: number
      default: 0

commands:
  - name: stats
    description: Show bot stats
    actions:
      - increment:
          var: command_count
      - reply:
          content: "Commands used: ${command_count}"
```

### State Scopes

| Scope | Context | Use Case |
|-------|---------|----------|
| `global` | Entire bot | Bot-wide counters |
| `guild` | Per server | Server settings |
| `channel` | Per channel | Channel-specific data |
| `user` | Per user globally | User preferences |
| `member` | Per user per server | Server-specific user data |

## Creating Flows

Reusable action sequences:

```yaml
flows:
  log_action:
    params:
      - name: action_name
        type: string
      - name: target
        type: string
    actions:
      - send_message:
          channel: "${env.LOG_CHANNEL}"
          embeds:
            - title: "Action: ${action_name}"
              description: "Target: ${target}"
              timestamp: true

commands:
  - name: warn
    description: Warn a user
    options:
      - name: user
        type: user
        required: true
    actions:
      - send_dm:
          user: "${options.user.id}"
          content: "You have been warned in ${guild.name}."
      - call_flow:
          flow: log_action
          args:
            action_name: "Warn"
            target: "${options.user.tag}"
      - reply:
          content: "Warned ${options.user.tag}"
          ephemeral: true
```

## Complete Example

See [docs/examples/simple-bot](../examples/simple-bot/) for a complete working bot.

## Next Steps

- [Configuration Guide](configuration.md) - Full YAML specification
- [Actions Reference](../reference/actions/) - All 84 actions
- [Expressions Reference](../reference/expressions/) - Functions and transforms
