# Starboard Builtin

The starboard builtin highlights popular messages by reposting them to a dedicated channel when they receive enough reactions.

## Quick Start

```yaml
builtins:
  starboard:
    enabled: true
    channel: "starboard-channel-id"
    threshold: 3
```

## Configuration

```yaml
builtins:
  starboard:
    enabled: true

    # Starboard channel
    channel: "123456789"

    # Minimum reactions to be starred
    threshold: 3

    # Emoji to use (default: star)
    emoji: "star"

    # Allow self-starring
    selfStar: false

    # Include bot messages
    botMessages: false

    # Channels to ignore
    ignoredChannels:
      - "bot-commands-id"
      - "admin-channel-id"

    # Allow NSFW content
    nsfwAllowed: false

    # Star tiers (optional)
    tiers:
      - count: 5
        emoji: "star2"
      - count: 10
        emoji: "stars"
      - count: 25
        emoji: "sparkles"
```

## How It Works

1. User reacts to a message with the configured emoji (default: ⭐)
2. When reactions reach the threshold, message is posted to starboard
3. Starboard post includes reaction count, updates as count changes
4. If reactions drop below threshold, starboard post is removed

## Starboard Post Format

```
⭐ 5 | #general

[Original message content here]

[Attachments/embeds if any]

Author: @User
Jump to message: [Link]
```

## Star Tiers

With tiers configured, the emoji changes based on reaction count:

| Reactions | Emoji |
|-----------|-------|
| 3-4 | ⭐ |
| 5-9 | 🌟 |
| 10-24 | ✨ |
| 25+ | 💫 |

## Features

### Self-Star Prevention
When `selfStar: false`, the message author's reaction doesn't count toward the threshold.

### NSFW Handling
When `nsfwAllowed: false`:
- Messages from NSFW channels are not starred
- Prevents inappropriate content on public starboard

### Ignored Channels
Messages from ignored channels cannot be starred, useful for:
- Bot command channels
- Staff-only channels
- Spam/meme channels

### Bot Message Filtering
When `botMessages: false`, bot messages cannot be starred.

## Embed Handling

If the original message has embeds:
- Text content is shown first
- Embeds are summarized (title, description)
- Images from embeds are preserved

## Attachment Handling

Attachments are preserved:
- Images show in starboard post
- Other files show as links
- Videos may be embedded depending on Discord

## Database

The starboard builtin stores:
- Original message ID
- Starboard post ID
- Current star count
- Star timestamps

This allows:
- Tracking star history
- Preventing duplicate posts
- Updating existing starboard posts

## Best Practices

1. **Set appropriate threshold** - Too low = spam, too high = nothing gets starred
2. **Disable self-starring** - Prevents gaming the system
3. **Ignore bot channels** - Keep starboard for genuine content
4. **Use tiers** - Adds excitement for highly-starred messages
5. **Review periodically** - Ensure appropriate content
