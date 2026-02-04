# Multi-File Organization Guide

FURLOW supports splitting your bot configuration across multiple files for better organization and maintainability.

## Import Syntax

Use the `imports` key at the top level of any YAML file:

```yaml
# furlow.yaml
imports:
  - ./commands/moderation.yaml
  - ./commands/fun.yaml
  - ./events/logging.yaml
```

### Import Object Syntax

You can also use the object form with additional options:

```yaml
imports:
  - path: ./features/leveling.yaml
    as: leveling  # Optional namespace (reserved for future use)
```

## File Resolution

When resolving imports, FURLOW looks for files in this order:

1. **Exact path** - `./commands/mod.yaml`
2. **With `.furlow.yaml`** - `./commands/mod.furlow.yaml`
3. **With `.furlow.yml`** - `./commands/mod.furlow.yml`
4. **With `.bolt.yaml`** - `./commands/mod.bolt.yaml` (legacy)
5. **With `.bolt.yml`** - `./commands/mod.bolt.yml` (legacy)
6. **With `.yaml`** - `./commands/mod.yaml`
7. **With `.yml`** - `./commands/mod.yml`
8. **Directory with index** - `./commands/mod/index.furlow.yaml`

This means you can write:
```yaml
imports:
  - ./commands/moderation  # Finds ./commands/moderation.furlow.yaml
```

## Merge Behavior

When multiple files are imported, their contents are merged:

### Arrays (Concatenated)
- `commands` - All commands combined
- `events` - All event handlers combined
- `flows` - All flows combined
- `builtins` - All builtin configurations combined
- `context_menus` - All context menus combined

### Objects (Deep Merged)
- `pipes` - All pipes merged
- `components.buttons` - All buttons merged
- `components.selects` - All selects merged
- `components.modals` - All modals merged
- `embeds.templates` - All embed templates merged
- `state.variables` - All variables merged
- `state.tables` - All tables merged

### Scalars (Last Wins)
- `identity` - Later imports override
- `presence` - Later imports override
- `intents` - Later imports override
- `theme` - Later imports override
- And other single-value settings

## Circular Import Detection

FURLOW detects circular imports and throws an error:

```
CircularImportError: Circular import detected
  → furlow.yaml
  → ./commands/mod.yaml
  → ./shared/utils.yaml
  → ./commands/mod.yaml (circular!)
```

## Recommended Project Structure

### Simple Bot

```
my-bot/
├── furlow.yaml          # Everything in one file
└── .env
```

### Medium Bot

```
my-bot/
├── furlow.yaml          # Core config + imports
├── commands.yaml        # All commands
├── events.yaml          # All events
└── .env
```

### Complex Bot

```
my-bot/
├── furlow.yaml              # Core: identity, intents, state schema
├── commands/
│   ├── _index.yaml          # Imports all command files
│   ├── moderation.yaml      # /warn, /kick, /ban, /timeout
│   ├── utility.yaml         # /ping, /serverinfo, /userinfo
│   └── fun.yaml             # /8ball, /roll, /choose
├── events/
│   ├── _index.yaml          # Imports all event files
│   ├── member.yaml          # member_join, member_leave
│   └── message.yaml         # message, message_delete
├── flows/
│   ├── _index.yaml          # Imports all flow files
│   ├── moderation.yaml      # log_modaction, escalate_warning
│   └── welcome.yaml         # send_welcome, check_rules
├── builtins.yaml            # All builtin configurations
└── .env                     # Secrets
```

## Example Files

### Main Configuration (furlow.yaml)

```yaml
version: "0.1"

imports:
  - ./commands/_index.yaml
  - ./events/_index.yaml
  - ./flows/_index.yaml
  - ./builtins.yaml

identity:
  name: "MyBot"

presence:
  status: online
  activity:
    type: watching
    text: "for /help"

intents:
  auto: true

state:
  storage:
    type: sqlite
    path: ./data/bot.db

  variables:
    command_count:
      type: number
      scope: global
      default: 0

  tables:
    warnings:
      columns:
        id: { type: number, primary: true }
        guild_id: { type: string, index: true }
        user_id: { type: string, index: true }
        moderator_id: { type: string }
        reason: { type: string }
        created_at: { type: timestamp }
```

### Index File (commands/_index.yaml)

```yaml
# This file imports all command files in the commands directory
imports:
  - ./moderation.yaml
  - ./utility.yaml
  - ./fun.yaml
```

### Command File (commands/moderation.yaml)

```yaml
commands:
  - name: warn
    description: Warn a user
    options:
      - name: user
        description: User to warn
        type: user
        required: true
      - name: reason
        description: Reason for warning
        type: string
        required: true
    actions:
      - action: db_insert
        table: warnings
        data:
          guild_id: "${guild.id}"
          user_id: "${args.user.id}"
          moderator_id: "${user.id}"
          reason: "${args.reason}"
          created_at: "${now()}"
        as: warning

      - action: reply
        embed:
          title: "User Warned"
          description: "${args.user.mention} has been warned"
          fields:
            - name: "Reason"
              value: "${args.reason}"
            - name: "Warning ID"
              value: "#${warning.id}"
          color: "#ffcc00"

  - name: warnings
    description: View warnings for a user
    options:
      - name: user
        description: User to check
        type: user
        required: false
    actions:
      - action: db_query
        table: warnings
        where:
          guild_id: "${guild.id}"
          user_id: "${args.user?.id ?? user.id}"
        order_by: "created_at DESC"
        limit: 10
        as: warnings

      - action: flow_if
        condition: "length(warnings) === 0"
        then:
          - action: reply
            content: "No warnings found!"
            ephemeral: true
        else:
          - action: set
            key: warningList
            value: "${warnings|map(w => '#' + w.id + ' - ' + truncate(w.reason, 30))|join('\n')}"
          - action: reply
            embed:
              title: "Warnings"
              description: "${warningList}"
              footer:
                text: "${length(warnings)} warning(s)"
            ephemeral: true
```

### Event File (events/member.yaml)

```yaml
events:
  - event: member_join
    actions:
      - action: send_message
        channel: "${guild.system_channel_id}"
        embed:
          title: "Welcome!"
          description: "Welcome to **${guild.name}**, ${member.mention}!"
          thumbnail:
            url: "${member.user.avatar}"
          color: "#57f287"
          footer:
            text: "Member #${guild.member_count}"

  - event: member_leave
    actions:
      - action: send_message
        channel: "${guild.system_channel_id}"
        content: "${user.username} left the server."
```

### Flow File (flows/moderation.yaml)

```yaml
flows:
  - name: log_modaction
    parameters:
      - name: action
        type: string
        required: true
      - name: target
        type: string
        required: true
      - name: reason
        type: string
        required: false
    actions:
      - action: send_message
        channel: "${config.moderation?.logChannel}"
        embed:
          title: "Moderation Action"
          fields:
            - name: "Action"
              value: "${args.action}"
              inline: true
            - name: "Target"
              value: "<@${args.target}>"
              inline: true
            - name: "Moderator"
              value: "${user.mention}"
              inline: true
            - name: "Reason"
              value: "${args.reason ?? 'No reason provided'}"
          timestamp: true
          color: "#ed4245"
```

### Builtins File (builtins.yaml)

```yaml
builtins:
  moderation:
    enabled: true
    logChannel: "${env.MOD_LOG_CHANNEL}"
    dmOnAction: true
    warnings:
      enabled: true
      maxWarnings: 5

  welcome:
    enabled: true
    channel: "${env.WELCOME_CHANNEL}"
    message: "Welcome ${user.mention}! Please read the rules."

  leveling:
    enabled: true
    xpPerMessage: 15
    xpCooldown: 60
    announceChannel: "${env.LEVEL_UP_CHANNEL}"
```

## Environment Variables

Environment variables can be used in any YAML file:

```yaml
channel: "${env.WELCOME_CHANNEL}"
token: $env.DISCORD_TOKEN
```

The runtime resolves these before parsing. Never commit secrets to YAML files - always use environment variables.

## Best Practices

1. **Use index files** - Create `_index.yaml` files to aggregate imports
2. **Group by feature** - Keep related commands/events/flows together
3. **Keep main file minimal** - Only core config and imports in `furlow.yaml`
4. **Use consistent naming** - `moderation.yaml`, `moderation-events.yaml`
5. **Document imports** - Add comments explaining what each import provides
6. **Share state schema** - Keep table/variable definitions in the main file
7. **Extract flows** - Reusable logic goes in dedicated flow files

## Troubleshooting

### Import Not Found

```
ImportNotFoundError: Could not resolve import './commands/missing.yaml'
```

Check:
- File path is correct and relative to the importing file
- File extension is valid (`.yaml`, `.yml`, `.furlow.yaml`, etc.)
- File exists and is readable

### Duplicate Keys

If two files define the same command name:
- Last imported wins for scalar values
- Arrays are concatenated (may result in duplicates)

Consider using unique naming conventions for commands across files.

### Circular Imports

Break circular dependencies by:
- Moving shared content to a separate file imported by both
- Restructuring to avoid the cycle
- Using flows instead of direct references
