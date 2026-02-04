# Leveling Builtin

The leveling builtin provides an XP and leveling system with rewards, leaderboards, and rank cards.

## Quick Start

```yaml
builtins:
  leveling:
    enabled: true
    xp_per_message: 15
    announce_channel: "level-ups"
```

## Configuration

```yaml
builtins:
  leveling:
    enabled: true

    # XP Settings
    xp_per_message:
      min: 10                          # Minimum XP per message
      max: 25                          # Maximum XP per message
    xp_cooldown: 60                    # Seconds between XP gains

    # Level formula: XP = base * (level ^ exponent)
    level_formula:
      base: 100
      exponent: 1.5

    # Announcements
    announce_channel: "123456789"      # Channel for level-ups
    announce_dm: false                 # DM level-ups instead
    announce_message: |
      Congratulations ${user.mention}! You reached **Level ${level}**!

    # Rewards
    rewards:
      5:                               # Level 5 reward
        roles:
          - "level-5-role"
        message: "You unlocked the Level 5 role!"
      10:
        roles:
          - "level-10-role"
      25:
        roles:
          - "level-25-role"
        remove_roles:
          - "level-5-role"
          - "level-10-role"
      50:
        roles:
          - "veteran-role"

    # XP Multipliers
    multipliers:
      roles:
        "booster-role": 1.5            # 50% bonus for boosters
        "vip-role": 2.0                # 2x for VIPs
      channels:
        "123456789": 0                 # No XP in this channel
        "987654321": 1.5               # 50% bonus in this channel

    # Exclusions
    ignore:
      roles:
        - "muted-role"
        - "no-xp-role"
      channels:
        - "bot-commands"
        - "spam"
      bots: true

    # Rank card
    rank_card:
      enabled: true
      generator: "rank_card"
      generator_options:
        style: "modern"

    # Leaderboard
    leaderboard:
      per_page: 10
      show_global: true                # Cross-server leaderboard
```

## Level Formula

XP required for each level is calculated as:

```
XP = base * (level ^ exponent)
```

Default values:
- `base: 100`
- `exponent: 1.5`

| Level | XP Required | Total XP |
|-------|-------------|----------|
| 1 | 100 | 100 |
| 2 | 283 | 383 |
| 5 | 1,118 | 2,986 |
| 10 | 3,162 | 14,142 |
| 25 | 12,500 | 88,388 |
| 50 | 35,355 | 353,553 |
| 100 | 100,000 | 1,414,214 |

### Custom Formula

```yaml
builtins:
  leveling:
    level_formula:
      base: 50                         # Lower base = faster leveling
      exponent: 1.2                    # Lower exponent = more linear
```

## Commands

### `/rank`

Shows your or another user's rank card.

```
/rank
/rank user:@User
```

**Options:**
| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `user` | User | No | User to check (default: self) |

### `/leaderboard`

Shows the server leaderboard.

```
/leaderboard
/leaderboard page:2
```

**Options:**
| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `page` | Integer | No | Page number |

### `/levels rewards`

Lists available level rewards.

```
/levels rewards
```

### `/levels set` (Admin)

Sets a user's XP or level.

```
/levels set user:@User level:10
/levels set user:@User xp:5000
```

**Options:**
| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `user` | User | Yes | Target user |
| `level` | Integer | No | Set level |
| `xp` | Integer | No | Set XP |

**Permissions:** Administrator

### `/levels reset` (Admin)

Resets a user's or everyone's progress.

```
/levels reset user:@User
/levels reset all:true
```

**Options:**
| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `user` | User | No | User to reset |
| `all` | Boolean | No | Reset everyone |

**Permissions:** Administrator

### `/levels multiplier` (Admin)

Sets XP multipliers.

```
/levels multiplier role:@Booster value:1.5
/levels multiplier channel:#vip-chat value:2.0
```

**Permissions:** Administrator

## Rank Cards

### Built-in Styles

```yaml
builtins:
  leveling:
    rank_card:
      enabled: true
      generator: "rank_card"
      generator_options:
        style: "modern"                # modern, classic, minimal, gaming
```

**Styles:**
- `modern` - Clean design with progress bar
- `classic` - Traditional rank card style
- `minimal` - Simple text-based card
- `gaming` - Bold colors and sharp edges

### Custom Rank Card

```yaml
builtins:
  leveling:
    rank_card:
      enabled: true
      canvas:
        width: 934
        height: 282
        layers:
          # Background
          - type: rect
            x: 0
            y: 0
            width: 934
            height: 282
            color: "#23272a"
            radius: 20

          # Avatar
          - type: circle_image
            src: "${user.avatar}"
            x: 50
            y: 50
            radius: 90

          # Username
          - type: text
            content: "${member.display_name}"
            x: 260
            y: 100
            font: "bold 40px Sans"
            color: "#ffffff"

          # Level
          - type: text
            content: "Level ${level}"
            x: 260
            y: 150
            font: "24px Sans"
            color: "#7289da"

          # XP Progress Bar Background
          - type: rect
            x: 260
            y: 180
            width: 620
            height: 30
            color: "#484b4e"
            radius: 15

          # XP Progress Bar Fill
          - type: rect
            x: 260
            y: 180
            width: "${(xp / xpRequired) * 620}"
            height: 30
            color: "#5865f2"
            radius: 15

          # XP Text
          - type: text
            content: "${xp|format} / ${xpRequired|format} XP"
            x: 570
            y: 205
            font: "16px Sans"
            color: "#ffffff"
            align: center

          # Rank
          - type: text
            content: "#${rank}"
            x: 850
            y: 60
            font: "bold 36px Sans"
            color: "#f47fff"
            align: right
```

## XP Multipliers

### Role Multipliers

```yaml
builtins:
  leveling:
    multipliers:
      roles:
        "server-booster": 1.5          # Boosters get 50% more
        "vip": 2.0                      # VIPs get double
        "mvp": 3.0                      # MVPs get triple
```

When a user has multiple roles, the highest multiplier is used.

### Channel Multipliers

```yaml
builtins:
  leveling:
    multipliers:
      channels:
        "off-topic": 0.5               # Half XP in off-topic
        "serious-discussion": 1.5      # Bonus in serious channels
        "bot-commands": 0              # No XP
```

### Time-based Multipliers

```yaml
builtins:
  leveling:
    multipliers:
      weekends: 2.0                    # Double XP on weekends
      hours:                           # By hour (0-23)
        "18-22": 1.5                   # 50% bonus 6PM-10PM
```

### Event Multipliers

Set temporary multipliers with commands or events:

```yaml
events:
  button_click:
    condition: "custom_id == 'start_double_xp'"
    actions:
      - set:
          scope: guild
          var: "xp_multiplier"
          value: 2.0
      - create_timer:
          id: "double_xp_end"
          duration: "2h"
          event: "end_double_xp"

  end_double_xp:
    actions:
      - set:
          scope: guild
          var: "xp_multiplier"
          value: 1.0
      - send_message:
          channel: "announcements"
          content: "Double XP event has ended!"
```

## Level Rewards

### Role Rewards

```yaml
builtins:
  leveling:
    rewards:
      5:
        roles:
          - "level-5-role"
      10:
        roles:
          - "level-10-role"
        remove_roles:
          - "level-5-role"            # Remove lower level role
```

### Custom Reward Actions

```yaml
builtins:
  leveling:
    rewards:
      25:
        roles:
          - "veteran-role"
        actions:
          - send_dm:
              user: "${user.id}"
              content: |
                Congratulations on reaching Level 25!

                As a reward, you've unlocked:
                - Custom role color
                - Access to #veteran-lounge

          - db_insert:
              table: "achievements"
              values:
                user_id: "${user.id}"
                achievement: "level_25"
```

## State

### `leveling_data` Table

| Column | Type | Description |
|--------|------|-------------|
| `guild_id` | string | Guild ID |
| `user_id` | string | User ID |
| `xp` | number | Total XP |
| `level` | number | Current level |
| `messages` | number | Message count |
| `last_xp_at` | timestamp | Last XP gain time |

### Variables

| Key | Scope | Description |
|-----|-------|-------------|
| `xp_multiplier` | guild | Global XP multiplier |

## Events

### `level_up`

Fired when a user levels up.

**Context:**
| Variable | Type | Description |
|----------|------|-------------|
| `user` | User | The user |
| `member` | Member | The member |
| `level` | number | New level |
| `old_level` | number | Previous level |
| `xp` | number | Total XP |
| `rewards` | object | Rewards received |

```yaml
events:
  level_up:
    actions:
      - flow_if:
          condition: "level % 10 == 0"
          then:
            - send_message:
                channel: "milestones"
                content: "${user.mention} reached Level ${level}!"
```

### `xp_gain`

Fired when a user gains XP.

**Context:**
| Variable | Type | Description |
|----------|------|-------------|
| `user` | User | The user |
| `amount` | number | XP gained |
| `total` | number | Total XP |
| `multiplier` | number | Multiplier applied |

## Examples

### Basic Setup

```yaml
builtins:
  leveling:
    enabled: true
    xp_per_message: 15
    announce_channel: "level-ups"
```

### Full Configuration

```yaml
builtins:
  leveling:
    enabled: true

    xp_per_message:
      min: 15
      max: 25
    xp_cooldown: 60

    announce_channel: "level-ups"
    announce_message: |
      ${user.mention} leveled up to **Level ${level}**! 🎉

    rewards:
      5:
        roles: ["active-member"]
      10:
        roles: ["regular"]
        remove_roles: ["active-member"]
      25:
        roles: ["veteran"]
        remove_roles: ["regular"]
      50:
        roles: ["legend"]
        remove_roles: ["veteran"]
      100:
        roles: ["mythic"]

    multipliers:
      roles:
        "server-booster": 1.5
        "supporter": 1.25
      channels:
        "spam": 0.5
        "bot-commands": 0

    ignore:
      channels:
        - "staff-chat"
      roles:
        - "muted"

    rank_card:
      enabled: true
      generator: "rank_card"
      generator_options:
        style: "modern"
        accent_color: "#5865f2"
```

### Voice XP

```yaml
builtins:
  leveling:
    voice:
      enabled: true
      xp_per_minute: 5                 # XP per minute in voice
      min_users: 2                     # Minimum users in channel
      ignore_afk: true                 # Don't count AFK channel
      ignore_muted: true               # Don't count self-muted
```

### Global Leaderboard

```yaml
builtins:
  leveling:
    leaderboard:
      global: true                     # Enable global rankings
      sync_interval: 300               # Sync every 5 minutes
```
