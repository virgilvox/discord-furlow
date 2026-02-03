# Polls Builtin

The polls builtin provides interactive voting polls with multiple choice support and automatic result tallying.

## Quick Start

```yaml
builtins:
  polls:
    enabled: true
```

## Configuration

```yaml
builtins:
  polls:
    enabled: true

    # Maximum options per poll
    maxOptions: 10

    # Default poll duration
    defaultDuration: "24h"

    # Allow anonymous polls (hides who voted)
    allowAnonymous: true
```

## Commands

### `/poll <question> <options> [duration] [multiple]`

Create a new poll.

**Parameters:**
- `question` - The poll question
- `options` - Options separated by `|` (e.g., "Yes | No | Maybe")
- `duration` - How long the poll runs (e.g., "1h", "1d")
- `multiple` - Allow multiple choice selection

**Example:**
```
/poll question:What should we play? options:Minecraft | Valorant | Among Us duration:1h
```

### `/endpoll <message_id>`

End a poll early. Only the poll creator or users with Manage Messages permission can end polls.

## Poll Display

Polls show as embeds with:
- Question as title
- Options with emoji buttons (1️⃣, 2️⃣, etc.)
- Vote count and percentage for each option
- Total votes
- Time remaining (for timed polls)

Example:
```
📊 What should we play?

1️⃣ Minecraft - **5** (50%)
2️⃣ Valorant - **3** (30%)
3️⃣ Among Us - **2** (20%)

Total votes: 10
Ends: in 45 minutes
```

## Voting

Users vote by clicking the number button for their choice:
- Single choice: Clicking a different option changes their vote
- Multiple choice: Can select/deselect multiple options

Vote feedback:
- "Vote recorded!" - Vote added
- "Vote changed!" - Changed vote (single choice)
- Ephemeral messages so only voter sees

## Poll Results

When a poll ends (timer or manual):
- Buttons are removed
- Winners are highlighted with 🏆
- Final results are displayed
- Color changes to gray (ended)

Example ended poll:
```
📊 What should we play? (ENDED)

🏆 1️⃣ Minecraft - **5** (50%)
2️⃣ Valorant - **3** (30%)
3️⃣ Among Us - **2** (20%)

Total votes: 10
Poll ended
```

## Features

### Multiple Choice
When enabled, users can vote for multiple options. The embed shows all their selected options.

### Anonymous Polls
When created with anonymous mode, individual votes are not stored with user IDs. Only totals are tracked.

### Live Updates
Vote counts update in real-time as users vote, showing current standings.

### Timed Auto-End
Polls with duration automatically end and show final results when time expires.

### Tie Handling
When multiple options have the same top vote count, all are marked as winners with 🏆.

## Database

The polls builtin stores:
- Poll ID, question, options
- Vote records (user, option, timestamp)
- End time, status

This enables:
- Preventing duplicate votes
- Vote changing
- Historical poll data

## Best Practices

1. **Keep options clear** - Use distinct, unambiguous choices
2. **Set reasonable duration** - Long enough for participation
3. **Use multiple choice sparingly** - Single choice is usually clearer
4. **Announce polls** - Ping relevant role for important polls
