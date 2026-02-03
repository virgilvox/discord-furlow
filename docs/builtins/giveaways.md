# Giveaways Builtin

The giveaways builtin provides timed giveaways with automatic winner selection and entry management.

## Quick Start

```yaml
builtins:
  giveaways:
    enabled: true
```

## Configuration

```yaml
builtins:
  giveaways:
    enabled: true

    # Default giveaway duration
    defaultDuration: "24h"

    # Role required to create giveaways
    managerRole: "giveaway-manager-id"

    # Role required to enter (optional)
    requireRole: "member-role-id"

    # Embed color
    embedColor: "#ff73fa"

    # Giveaway emoji
    emoji: "tada"
```

## Commands

### `/giveaway start <prize> <duration> [winners] [require_role]`

Start a new giveaway.

**Parameters:**
- `prize` - What you're giving away
- `duration` - How long the giveaway runs (e.g., "1h", "1d", "1w")
- `winners` - Number of winners (default: 1)
- `require_role` - Role required to enter (optional)

**Example:**
```
/giveaway start prize:Discord Nitro duration:24h winners:3
```

### `/giveaway end <message_id>`

End a giveaway early and select winners.

### `/giveaway reroll <message_id> [winners]`

Reroll winners for an ended giveaway.

**Parameters:**
- `message_id` - The giveaway message ID
- `winners` - Number of new winners to select (default: 1)

## Giveaway Display

Active giveaway embed:
```
🎉 GIVEAWAY 🎉

Prize: Discord Nitro
Hosted by: @User
Winners: 3
Entries: 42

Ends: in 23 hours

[Enter Button]

ID: 12345
```

Ended giveaway:
```
GIVEAWAY ENDED

Prize: Discord Nitro

Winners: @Winner1, @Winner2, @Winner3
```

## Entering Giveaways

Users enter by clicking the "Enter" button:
- First click: "You have entered the giveaway!"
- Second click: "You have left the giveaway!"

Entry count updates in real-time on the embed.

## Winner Selection

Winners are selected randomly from all valid entries:
- Duplicates are not possible
- If there aren't enough entries, all entrants win
- Winners are mentioned in the channel

Announcement message:
```
Congratulations @Winner1, @Winner2, @Winner3!
You won **Discord Nitro**!
```

## Entry Requirements

### Role Requirement
When `require_role` is set:
- Only users with that role can enter
- Others see "You need the @Role role to enter!"

### Account Requirements
Future enhancement: minimum account age, server membership duration.

## Features

### Multiple Winners
Set winners count to select multiple people. Each person can only win once per giveaway.

### Rerolling
If a winner doesn't claim or is invalid, use `/giveaway reroll` to select new winners.

### Entry Toggle
Clicking enter again removes the entry, allowing users to change their mind.

### Live Entry Count
Entry count updates on the embed as people enter/leave.

## Database

The giveaways builtin stores:
- Giveaway details (prize, host, end time, etc.)
- Entry records (user ID, timestamp)
- Winner history

## Events

The builtin emits:
- `giveaway_end` - When a giveaway ends
- `giveaway_winner` - For each winner selected

## Best Practices

1. **Clear prize descriptions** - Be specific about what's being given
2. **Reasonable durations** - Give enough time for entries
3. **Announce giveaways** - Ping roles so people know
4. **Use role requirements** - Reward active members
5. **Have backup rerolls** - In case winners are unavailable
