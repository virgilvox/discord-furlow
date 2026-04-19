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
| Actions | 85 |
| Expression Functions | 71 |
| Transforms | 50 |
| Events | 59 |

- **No Coding Required**: pure YAML configuration
- **Scoped State**: global, guild, channel, user, and member scopes
- **Reusable Flows**: named action sequences with parameters
- **Full Type Safety**: TypeScript support for extensions

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
- [Installation](guides/installation): setup and requirements
- [Quick Start](guides/quickstart): build your first bot
- [Configuration](guides/configuration): YAML specification reference

### Reference
- [Actions](reference/actions/_index): all 85 actions documented
- [Expressions](reference/expressions/_index): 71 functions and 50 transforms
- [Events](reference/events): 59 events including Discord gateway, voice transitions, and component interactions
- [CLI](reference/cli): command-line interface

### Examples
- [Simple Bot](examples/simple-bot): basic commands and events

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
