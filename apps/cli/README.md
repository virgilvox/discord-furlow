# @furlow/cli

Command-line interface for the [FURLOW](https://github.com/virgilvox/discord-furlow) declarative Discord bot framework.

Build powerful Discord bots using YAML specifications — no code required.

## Installation

```bash
npm install -g @furlow/cli
```

Or with your preferred package manager:

```bash
pnpm add -g @furlow/cli
yarn global add @furlow/cli
```

## Quick Start

```bash
# Create a new bot project
furlow init my-bot
cd my-bot

# Add your Discord credentials
cp .env.example .env
# Edit .env with your DISCORD_TOKEN and DISCORD_CLIENT_ID

# Start the bot
furlow start
```

## Requirements

- Node.js 20.0.0 or higher
- A Discord bot token ([create one here](https://discord.com/developers/applications))
- Discord Application Client ID

## Commands

### `furlow init [name]`

Create a new FURLOW bot project with starter templates.

```bash
furlow init my-bot
furlow init my-bot --template moderation
furlow init my-bot --no-git --no-install
```

**Options:**

| Flag | Description | Default |
|------|-------------|---------|
| `-t, --template <template>` | Project template (`simple`, `moderation`, `full`) | `simple` |
| `--no-git` | Skip git repository initialization | - |
| `--no-install` | Skip dependency installation | - |

---

### `furlow start [path]`

Start the bot from a FURLOW specification file.

```bash
furlow start
furlow start ./bot.furlow.yaml
furlow start -g 123456789 # Register commands to specific guild
```

**Options:**

| Flag | Description | Default |
|------|-------------|---------|
| `-e, --env <file>` | Path to environment file | `.env` |
| `-g, --guild <id>` | Register commands to specific guild (instant updates) | - |
| `--no-validate` | Skip schema validation | - |

**Environment Variables:**

| Variable | Required | Description |
|----------|----------|-------------|
| `DISCORD_TOKEN` | Yes | Your Discord bot token |
| `DISCORD_CLIENT_ID` | Yes | Your Discord application ID |
| `DISCORD_GUILD_ID` | No | Default guild for command registration |

---

### `furlow dev [path]`

Start the bot in development mode with hot reload. The bot automatically restarts when specification files change.

```bash
furlow dev
furlow dev ./bot.furlow.yaml
```

**Options:**

| Flag | Description | Default |
|------|-------------|---------|
| `-e, --env <file>` | Path to environment file | `.env` |
| `--no-validate` | Skip schema validation | - |

---

### `furlow validate <path>`

Validate a FURLOW specification file against the schema.

```bash
furlow validate furlow.yaml
furlow validate ./bot.furlow.yaml --strict
```

**Options:**

| Flag | Description |
|------|-------------|
| `--strict` | Enable strict validation mode |

---

### `furlow add <builtin>`

Add a builtin module to your project.

```bash
furlow add moderation
furlow add welcome
furlow add --list  # Show available builtins
```

**Available Builtins:**

| Module | Description |
|--------|-------------|
| `moderation` | Warn, kick, ban, mute, case management |
| `welcome` | Join/leave messages, auto-role, DM welcome |
| `logging` | Message, member, server event logging |
| `tickets` | Support tickets, claiming, transcripts |
| `reaction-roles` | Role assignment via reactions/buttons |
| `leveling` | XP, levels, rewards, leaderboards |
| `music` | Voice playback, queue, filters |
| `starboard` | Star reactions, hall of fame |
| `polls` | Voting, multiple choice |
| `giveaways` | Requirements, reroll, winners |
| `auto-responder` | Custom triggers, responses |
| `afk` | AFK status, mention notifications |
| `reminders` | Personal reminders, DM delivery |
| `utilities` | Serverinfo, userinfo, avatar, etc. |

---

### `furlow build [path]`

Bundle the bot for production deployment.

```bash
furlow build
furlow build -o ./build
```

**Options:**

| Flag | Description | Default |
|------|-------------|---------|
| `-o, --output <dir>` | Output directory | `dist` |

---

### `furlow export <path>`

Export Discord slash command registration JSON for manual deployment.

```bash
furlow export furlow.yaml
furlow export furlow.yaml -o commands.json
furlow export furlow.yaml -g 123456789  # Guild-specific commands
```

**Options:**

| Flag | Description |
|------|-------------|
| `-o, --output <file>` | Output file (default: stdout) |
| `-g, --guild <id>` | Export for specific guild |

---

## Example Bot

Create `furlow.yaml`:

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
  - name: ping
    description: Check bot latency
    actions:
      - reply:
          content: "Pong! ${client.ping}ms"

  - name: hello
    description: Greet someone
    options:
      - name: user
        type: user
        description: Who to greet
    actions:
      - reply:
          content: "Hello, ${options.member.display_name}!"

events:
  - event: member_join
    actions:
      - send_message:
          channel: "${env.WELCOME_CHANNEL}"
          content: "Welcome ${member.display_name}!"
```

Run it:

```bash
furlow start furlow.yaml
```

## Documentation

- **Full Documentation**: [github.com/virgilvox/discord-furlow](https://github.com/virgilvox/discord-furlow)
- **Actions Reference**: [84 available actions](https://github.com/virgilvox/discord-furlow/blob/main/docs/reference/actions/)
- **Expression Functions**: [71 functions](https://github.com/virgilvox/discord-furlow/blob/main/docs/reference/expressions/)
- **Pipes Reference**: [External integrations](https://github.com/virgilvox/discord-furlow/blob/main/docs/packages/pipes.md)

## Related Packages

| Package | Description |
|---------|-------------|
| [@furlow/core](https://www.npmjs.com/package/@furlow/core) | Runtime engine |
| [@furlow/discord](https://www.npmjs.com/package/@furlow/discord) | Discord.js adapter |
| [@furlow/schema](https://www.npmjs.com/package/@furlow/schema) | TypeScript types |
| [@furlow/storage](https://www.npmjs.com/package/@furlow/storage) | Database adapters |
| [@furlow/builtins](https://www.npmjs.com/package/@furlow/builtins) | Pre-built modules |
| [@furlow/pipes](https://www.npmjs.com/package/@furlow/pipes) | External integrations |
| [@furlow/testing](https://www.npmjs.com/package/@furlow/testing) | Test utilities |

## License

MIT
