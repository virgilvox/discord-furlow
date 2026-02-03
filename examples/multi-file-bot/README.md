# Multi-File Bot Example

This example demonstrates how to organize a FURLOW bot across multiple files for better maintainability.

## Structure

```
multi-file-bot/
├── furlow.yaml              # Main config: identity, intents, state schema
├── commands/
│   ├── _index.yaml          # Imports all command files
│   ├── moderation.yaml      # /warn, /warnings, /clearwarn
│   ├── utility.yaml         # /ping, /serverinfo, /userinfo, /avatar
│   └── fun.yaml             # /8ball, /roll, /choose, /coinflip
├── events/
│   ├── _index.yaml          # Imports all event files
│   ├── member.yaml          # member_join, member_leave
│   └── message.yaml         # message, message_delete
├── flows/
│   ├── _index.yaml          # Imports all flow files
│   ├── moderation.yaml      # log_modaction, check_warning_threshold
│   └── utility.yaml         # send_error, send_success, paginate
├── builtins.yaml            # Builtin module configurations
├── .env.example             # Environment variable template
└── README.md                # This file
```

## Features

### Commands

**Moderation:**
- `/warn` - Warn a user with a reason
- `/warnings` - View warnings for a user
- `/clearwarn` - Clear a specific warning

**Utility:**
- `/ping` - Check bot latency
- `/serverinfo` - Get server information
- `/userinfo` - Get user information
- `/avatar` - Get a user's avatar

**Fun:**
- `/8ball` - Ask the magic 8-ball
- `/roll` - Roll dice
- `/choose` - Choose between options
- `/coinflip` - Flip a coin

### Events

- Welcome messages for new members
- Leave notifications
- Custom auto-responses from database

### Flows

- `log_modaction` - Log moderation actions
- `send_error` / `send_success` - Standardized response helpers
- `paginate` - Pagination helper for long lists

### Builtins

- Utilities (serverinfo, userinfo, avatar, banner)
- AFK tracking
- Reminders

## Setup

1. Copy `.env.example` to `.env`
2. Add your Discord token and client ID
3. Run `furlow dev` to start in development mode

## Multi-File Benefits

1. **Organization** - Each file has a single responsibility
2. **Collaboration** - Multiple people can work on different files
3. **Reusability** - Flows can be shared across commands
4. **Maintainability** - Easier to find and update specific features
5. **Testing** - Individual files can be validated separately

## Import Resolution

FURLOW automatically resolves imports by looking for:
1. Exact path
2. Path with `.furlow.yaml` extension
3. Path with `.yaml` extension
4. Directory with `index.yaml`

This means `./commands/moderation` resolves to `./commands/moderation.yaml`.

## Learn More

See the [Multi-File Organization Guide](../../docs/multi-file.md) for detailed documentation.
