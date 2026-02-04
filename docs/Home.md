# FURLOW Documentation

Welcome to the FURLOW documentation! FURLOW is a declarative Discord bot framework that lets you build powerful bots using YAML specifications instead of code.

## What is FURLOW?

FURLOW (**F**lexible **U**ser **R**ules for **L**ive **O**nline **W**orkers) transforms how you build Discord bots. Instead of writing JavaScript or Python, you describe your bot's behavior in simple YAML files.

```yaml
# A complete command in 5 lines
commands:
  - name: hello
    description: Say hello
    actions:
      - reply:
          content: "Hello, ${user.username}!"
```

## Features

| Feature | Count |
|---------|-------|
| Actions | 84 |
| Expression Functions | 71 |
| Transforms | 50 |
| Event Types | 76 |

- **No Coding Required** — Pure YAML configuration
- **Scoped State** — Global, guild, channel, user, member scopes
- **Reusable Flows** — Named action sequences with parameters
- **Full Type Safety** — TypeScript support for extensions

## Quick Start

```bash
# Install FURLOW
npm install -g furlow

# Create a new bot
furlow init my-bot
cd my-bot

# Start your bot
furlow start
```

## Documentation

### Getting Started
- [Installation](guides/installation) — Setup and requirements
- [Quick Start](guides/quickstart) — Build your first bot
- [Configuration](guides/configuration) — YAML specification reference

### Reference
- [Actions](reference/actions/_index) — All 84 actions documented
- [Expressions](reference/expressions/_index) — 71 functions and 50 transforms
- [Events](reference/events) — 76 event types
- [CLI](reference/cli) — Command-line interface

### Examples
- [Simple Bot](examples/simple-bot) — Basic commands and events

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

MIT License
