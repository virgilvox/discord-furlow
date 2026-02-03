# FURLOW

**Declarative Discord Bot Framework**

Build powerful Discord bots with YAML — no code required.

```yaml
commands:
  - name: ping
    description: Check bot latency
    actions:
      - reply:
          content: "Pong! ${client.ping}ms"
```

## Features

- **84 Actions** — Messages, moderation, voice, channels, and more
- **71 Expression Functions** — Date, math, string, array manipulation
- **50 Transforms** — Pipe-based data transformations
- **76 Events** — Discord gateway + high-level FURLOW events
- **Scoped State** — Global, guild, channel, user, member scopes
- **Flows** — Reusable action sequences with parameters

## Quick Start

```bash
# Install
npm install -g furlow

# Create a bot
furlow init my-bot
cd my-bot

# Add your Discord token to .env
echo "DISCORD_TOKEN=your_token_here" > .env

# Start
furlow start
```

## Example

```yaml
version: "0.1"

identity:
  name: "My Bot"

presence:
  status: online
  activity:
    type: playing
    text: "with FURLOW"

commands:
  - name: hello
    description: Greet someone
    options:
      - name: user
        type: user
        description: Who to greet
    actions:
      - reply:
          content: "Hello, ${options.user.displayName || user.username}!"

  - name: roll
    description: Roll a dice
    options:
      - name: sides
        type: integer
        description: Number of sides
        min_value: 2
        max_value: 100
    actions:
      - reply:
          content: "🎲 You rolled **${random(1, options.sides || 6)}**"

events:
  - event: guild_member_add
    actions:
      - send_message:
          channel: "${guild.systemChannelId}"
          content: "Welcome ${member.displayName}!"
```

## CLI Commands

| Command | Description |
|---------|-------------|
| `furlow init [name]` | Create a new bot project |
| `furlow start [path]` | Run the bot |
| `furlow dev [path]` | Development mode with hot reload |
| `furlow validate <path>` | Validate YAML specification |
| `furlow add <builtin>` | Add builtin module |
| `furlow build [path]` | Bundle for deployment |
| `furlow export <path>` | Export Discord command JSON |

## Documentation

| Guide | Description |
|-------|-------------|
| [Installation](docs/guides/installation.md) | Setup and requirements |
| [Quick Start](docs/guides/quickstart.md) | Your first bot |
| [Configuration](docs/guides/configuration.md) | YAML specification |
| [Actions Reference](docs/reference/actions/) | All 84 actions |
| [Expressions Reference](docs/reference/expressions/) | Functions and transforms |
| [Events Reference](docs/reference/events.md) | Event types |
| [CLI Reference](docs/reference/cli.md) | Command-line interface |
| [Examples](docs/examples/) | Complete bot examples |

## Packages

| Package | Description |
|---------|-------------|
| `furlow` | CLI tool |
| `@furlow/core` | Runtime engine |
| `@furlow/discord` | Discord.js adapter |
| `@furlow/schema` | TypeScript types |
| `@furlow/storage` | Database adapters |
| `@furlow/builtins` | Pre-built modules |
| `@furlow/pipes` | External integrations |
| `@furlow/testing` | Test utilities |

## License

MIT
