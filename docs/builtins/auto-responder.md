# Auto-Responder Builtin

The auto-responder builtin provides automatic message responses based on configurable triggers.

## Quick Start

```yaml
builtins:
  auto-responder:
    enabled: true
```

## Configuration

```yaml
builtins:
  auto-responder:
    enabled: true

    # Maximum triggers per server
    maxTriggers: 50

    # Ignore messages from bots
    ignoreBots: true

    # Global cooldown between responses (seconds)
    globalCooldown: 5
```

## Commands

### `/autoresponder add <trigger> <response> [type] [chance]`

Add a new auto-response.

**Parameters:**
- `trigger` - Text to trigger the response
- `response` - Text to respond with
- `type` - Match type (see below)
- `chance` - Response chance 1-100% (default: 100)

**Match Types:**
- `contains` - Trigger found anywhere in message (default)
- `exact` - Message exactly matches trigger
- `startswith` - Message starts with trigger
- `endswith` - Message ends with trigger
- `regex` - Trigger is a regex pattern

### `/autoresponder list`

List all auto-responses for the server.

### `/autoresponder delete <id>`

Delete an auto-response by ID.

### `/autoresponder edit <id> [trigger] [response] [cooldown] [chance]`

Edit an existing auto-response.

## Trigger Types

### Contains (default)
```
Trigger: "hello"
Matches: "hello everyone", "oh hello there", "HELLO"
```

### Exact
```
Trigger: "hello"
Matches: "hello", "Hello", "HELLO"
Does not match: "hello there", "oh hello"
```

### Starts With
```
Trigger: "!"
Matches: "!help", "!ping"
Does not match: "help!", "what!"
```

### Ends With
```
Trigger: "?"
Matches: "how are you?", "what?"
Does not match: "?what", "question"
```

### Regex
```
Trigger: "\\bcat(s)?\\b"
Matches: "I love cats", "my cat is cute"
Does not match: "category", "scatter"
```

## Response Types

### Message (default)
```yaml
response: "Hello! How can I help?"
response_type: message
```

### Embed
```yaml
response_type: embed
embed_data:
  title: "Welcome!"
  description: "Thanks for saying hi!"
  color: "#5865f2"
```

### Reaction
```yaml
response_type: reaction
reaction: "wave"
```

## Features

### Case Insensitivity
By default, triggers are case-insensitive:
- "Hello", "hello", "HELLO" all match

### Cooldowns
Per-response cooldowns prevent spam:
```yaml
cooldown: 30  # Seconds before this trigger can fire again
```

### Chance
Random response chance for variety:
```yaml
chance: 25  # Only responds 25% of the time
```

### Channel Restrictions
Limit where responses work:
```yaml
allowed_channels: ["123", "456"]  # Only these channels
# OR
ignored_channels: ["789"]  # All except these
```

### Role Restrictions
Limit who can trigger:
```yaml
allowed_roles: ["member-role"]  # Only members with these roles
# OR
ignored_roles: ["bot-role"]  # Everyone except these roles
```

### Delete Trigger
Optionally delete the triggering message:
```yaml
delete_trigger: true
```

### DM Response
Send response via DM instead of channel:
```yaml
dm_response: true
```

## Database Schema

Auto-responses are stored with:
- ID, guild_id
- Trigger text and type
- Response content and type
- Restrictions (channels, roles)
- Cooldown, chance settings
- Created timestamp

## Best Practices

1. **Use specific triggers** - Avoid common words that might match unintentionally
2. **Set cooldowns** - Prevent spam and rate limits
3. **Test regex carefully** - Use regex101.com to verify patterns
4. **Review regularly** - Remove outdated responses
5. **Use chance for fun responses** - Keeps them surprising
