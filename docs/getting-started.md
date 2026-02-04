# Getting Started with FURLOW

FURLOW is a declarative Discord bot framework that lets you build bots using YAML specifications instead of code.

## Installation

### Prerequisites

- Node.js 20 or later
- A Discord Application with:
  - **Bot Token** - For authentication
  - **Application ID** (Client ID) - For registering slash commands

### Create a New Bot

```bash
# Install the FURLOW CLI globally
npm install -g furlow

# Create a new bot project
furlow init my-bot

# Navigate to the project
cd my-bot

# Set up environment variables
cp .env.example .env
# Edit .env and add:
#   DISCORD_TOKEN=your_bot_token
#   DISCORD_CLIENT_ID=your_application_id
```

### Project Structure

A basic FURLOW project looks like this:

```
my-bot/
├── furlow.yaml          # Main configuration
├── commands/            # Command definitions
│   └── ping.yaml
├── events/              # Event handlers
│   └── ready.yaml
├── flows/               # Reusable action sequences
├── .env                 # Environment variables (secrets)
├── .env.example         # Template for .env
└── package.json
```

### Getting Discord Credentials

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Create or select your application
3. Copy **Application ID** from General Information page
4. Go to **Bot** section and copy the **Token**
5. Enable required **Privileged Gateway Intents** (Message Content, Server Members)

## Your First Bot

### Basic Configuration

Create or edit `furlow.yaml`:

```yaml
version: "0.1"

identity:
  name: "MyBot"

presence:
  status: online
  activity:
    type: playing
    text: "with FURLOW"

intents:
  auto: true

commands:
  - name: ping
    description: Check bot latency
    actions:
      - action: reply
        content: "Pong! 🏓"
```

### Run Your Bot

```bash
# Development mode (hot reload)
furlow dev

# Production mode
furlow start
```

## Core Concepts

### Commands

Commands are slash commands that users can invoke:

```yaml
commands:
  - name: greet
    description: Greet a user
    options:
      - name: user
        description: Who to greet
        type: user
        required: true
    actions:
      - action: reply
        content: "Hello, ${args.user.username}!"
```

### Events

Events let you respond to Discord events:

```yaml
events:
  - event: member_join
    actions:
      - action: send_message
        channel: "${guild.system_channel_id}"
        content: "Welcome ${member.mention}! 🎉"
```

### Expressions

Use `${...}` for dynamic values:

```yaml
content: "Hello ${user.username}! You joined ${timestamp(member.joined_at, 'relative')}"
```

Available contexts:
- `user` - The user who triggered the action
- `member` - Guild member info
- `guild` - Server info
- `channel` - Current channel
- `message` - Message info (for message events)
- `args` - Command arguments

### Actions

Actions are the building blocks of bot behavior:

**Message Actions:**
- `send_message` - Send a message
- `reply` - Reply to an interaction
- `edit_message` - Edit a message
- `delete_message` - Delete a message
- `add_reaction` - Add a reaction

**Member Actions:**
- `assign_role` - Give a role
- `remove_role` - Remove a role
- `kick` - Kick a member
- `ban` - Ban a member
- `timeout` - Timeout a member

**State Actions:**
- `set` - Set a variable
- `increment` - Increment a number
- `db_insert` - Insert database row
- `db_query` - Query database

**Flow Control:**
- `flow_if` - Conditional execution
- `call_flow` - Call a reusable flow
- `wait` - Wait for a duration

### Flows

Flows are reusable action sequences:

```yaml
flows:
  - name: send_welcome
    parameters:
      - name: member_id
        type: string
        required: true
    actions:
      - action: send_dm
        user: "${args.member_id}"
        content: "Welcome to the server!"
```

Call flows from other actions:

```yaml
- action: call_flow
  flow: send_welcome
  args:
    member_id: "${member.id}"
```

## State Management

### Variables

Define persistent variables:

```yaml
state:
  variables:
    welcome_count:
      type: number
      scope: guild
      default: 0
```

Scopes:
- `global` - Shared across all servers
- `guild` - Per-server
- `channel` - Per-channel
- `user` - Per-user (across servers)
- `member` - Per-user-per-server

### Tables

Define database tables:

```yaml
state:
  tables:
    warnings:
      columns:
        id:
          type: number
          primary: true
        user_id:
          type: string
          index: true
        reason:
          type: string
        created_at:
          type: timestamp
```

## Using Builtins

FURLOW includes pre-built modules for common bot features:

```yaml
builtins:
  moderation:
    enabled: true
    log_channel: "mod-logs-channel-id"

  welcome:
    enabled: true
    channel: "welcome-channel-id"
    message: "Welcome to ${guild.name}, ${user.mention}!"

  leveling:
    enabled: true
    xp_per_message: 15
    cooldown: 60
```

Available builtins:
- **moderation** - Warnings, kicks, bans, mutes, case system
- **welcome** - Welcome/leave messages, auto-roles
- **leveling** - XP system with levels and rewards
- **logging** - Audit logging to channels
- **tickets** - Support ticket system
- **reaction-roles** - Role assignment via reactions/buttons
- **music** - Voice channel music playback
- **starboard** - Highlight popular messages
- **polls** - Voting and polls
- **giveaways** - Timed giveaways
- **auto-responder** - Automatic message responses
- **afk** - AFK status tracking
- **reminders** - User reminders
- **utilities** - Server info, user info, etc.

See the [Builtins Documentation](./builtins/) for detailed configuration options.

## Validation

Validate your configuration before deploying:

```bash
furlow validate
```

This checks for:
- YAML syntax errors
- Schema validation
- Missing required fields
- Invalid references

## Next Steps

- Read the [CLI Reference](./cli-reference.md) for all commands
- Learn the [Expression Language](./expression-language.md)
- Browse the [Actions Reference](./actions-reference.md)
- Check out the [Events Reference](./events-reference.md)
- Explore the [Builtins](./builtins/) documentation
