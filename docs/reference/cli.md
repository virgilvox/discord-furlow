# CLI Reference

The FURLOW CLI provides commands for creating, running, and managing bots.

## Installation

```bash
npm install -g furlow
```

## Commands

### furlow init

Create a new bot project.

```bash
furlow init [name]
```

**Options:**

| Option | Description | Default |
|--------|-------------|---------|
| `-t, --template <template>` | Project template | `simple` |
| `--no-git` | Skip git initialization | — |
| `--no-install` | Skip dependency installation | — |

**Templates:**

| Template | Description |
|----------|-------------|
| `simple` | Basic bot with ping command |
| `moderation` | Moderation commands |
| `music` | Music playback |
| `leveling` | XP and levels |

**Examples:**

```bash
# Create with default template
furlow init my-bot

# Create with specific template
furlow init my-bot --template moderation

# Create without git
furlow init my-bot --no-git
```

---

### furlow start

Start the bot in production mode.

```bash
furlow start [path]
```

**Options:**

| Option | Description | Default |
|--------|-------------|---------|
| `-e, --env <file>` | Environment file path | `.env` |
| `-g, --guild <id>` | Register commands to specific guild | — |
| `--no-validate` | Skip schema validation | — |

**Examples:**

```bash
# Start with default furlow.yaml
furlow start

# Start specific file
furlow start ./bots/main.furlow.yaml

# Start with guild-specific commands (instant registration)
furlow start --guild 123456789

# Start with custom env file
furlow start -e .env.production
```

---

### furlow dev

Start the bot in development mode with hot reload.

```bash
furlow dev [path]
```

**Options:**

| Option | Description | Default |
|--------|-------------|---------|
| `-e, --env <file>` | Environment file path | `.env` |
| `--no-validate` | Skip schema validation | — |

The bot automatically restarts when YAML files change.

**Examples:**

```bash
# Development mode
furlow dev

# With specific file
furlow dev ./bot.furlow.yaml
```

---

### furlow validate

Validate a FURLOW specification file.

```bash
furlow validate <path>
```

**Options:**

| Option | Description |
|--------|-------------|
| `--strict` | Enable strict validation |

**Examples:**

```bash
# Validate a file
furlow validate furlow.yaml

# Strict validation
furlow validate furlow.yaml --strict
```

**Output:**

```
✓ furlow.yaml is valid
  - 5 commands
  - 3 events
  - 2 flows
```

---

### furlow add

Add a builtin module to your project.

```bash
furlow add <builtin>
```

**Options:**

| Option | Description |
|--------|-------------|
| `--list` | List available builtins |

**Available Builtins:**

| Module | Description |
|--------|-------------|
| `moderation` | Ban, kick, warn, mute commands |
| `welcome` | Welcome messages and autoroles |
| `tickets` | Support ticket system |
| `leveling` | XP and level tracking |
| `music` | Voice playback |
| `utility` | Common utility commands |
| `fun` | Fun and games commands |
| `logging` | Server logging |
| `automod` | Auto moderation rules |
| `starboard` | Starboard feature |
| `giveaway` | Giveaway system |
| `poll` | Poll commands |
| `reminder` | Reminder system |
| `economy` | Virtual economy |

**Examples:**

```bash
# List available builtins
furlow add --list

# Add moderation module
furlow add moderation

# Add multiple modules
furlow add moderation welcome leveling
```

---

### furlow build

Bundle the bot for deployment.

```bash
furlow build [path]
```

**Options:**

| Option | Description | Default |
|--------|-------------|---------|
| `-o, --output <dir>` | Output directory | `dist` |

**Examples:**

```bash
# Build to default dist/
furlow build

# Build to custom directory
furlow build -o ./deploy
```

**Output:**

Creates a bundled YAML file with all imports resolved.

---

### furlow export

Export Discord command registration JSON.

```bash
furlow export <path>
```

**Options:**

| Option | Description |
|--------|-------------|
| `-o, --output <file>` | Output file (default: stdout) |
| `-g, --guild <id>` | Export for specific guild |

**Examples:**

```bash
# Export to stdout
furlow export furlow.yaml

# Export to file
furlow export furlow.yaml -o commands.json

# Export guild-specific commands
furlow export furlow.yaml -g 123456789 -o guild-commands.json
```

**Use Case:**

The exported JSON can be used with Discord's API directly or with other tools for command registration.

---

## Environment Variables

The CLI respects these environment variables:

| Variable | Description |
|----------|-------------|
| `DISCORD_TOKEN` | Bot token (required) |
| `FURLOW_LOG_LEVEL` | Log level (debug, info, warn, error) |
| `FURLOW_NO_COLOR` | Disable colored output |

---

## Exit Codes

| Code | Description |
|------|-------------|
| `0` | Success |
| `1` | General error |
| `2` | Invalid arguments |
| `3` | Validation error |
| `4` | Runtime error |

---

## Configuration File

The CLI looks for configuration in this order:

1. Command-line arguments
2. `furlow.config.js` or `furlow.config.json`
3. `package.json` `furlow` field
4. Default values

**Example furlow.config.js:**

```javascript
module.exports = {
  entry: './bot.furlow.yaml',
  env: '.env.local',
  guild: process.env.DEV_GUILD_ID,
};
```
