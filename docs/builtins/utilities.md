# Utilities Builtin

The utilities builtin provides common utility commands for server and user information.

## Quick Start

```yaml
builtins:
  utilities:
    enabled: true
```

## Configuration

```yaml
builtins:
  utilities:
    enabled: true

    # Which commands to enable (all by default)
    enabledCommands:
      - serverinfo
      - userinfo
      - avatar
      - banner
      - memberlist
      - age
      - stats
```

## Commands

### `/serverinfo`

Display detailed information about the current server.

**Shows:**
- Server name and icon
- Owner
- Member count
- Channel counts (text, voice, categories)
- Role count
- Creation date
- Boost level and count
- Server ID
- Verification level
- Features (vanity URL, animated icon, etc.)

Example output:
```
Title: My Server

Thumbnail: [Server Icon]

Fields:
- Owner: @User
- Members: 1,234
- Channels: 25 text, 10 voice
- Roles: 15
- Created: 2 years ago
- Boost Level: Tier 2 (15 boosts)

Footer: ID: 123456789
```

### `/userinfo [user]`

Display information about a user.

**Parameters:**
- `user` - User to look up (default: yourself)

**Shows:**
- Username and avatar
- User ID
- Account creation date
- Server join date (if member)
- Roles (if member)
- Nickname (if different)
- Status/presence (if visible)

Example output:
```
Title: Username#0000

Thumbnail: [Avatar]

Fields:
- ID: 123456789
- Created: Jan 1, 2020 (2 years ago)
- Joined: Mar 15, 2021 (1 year ago)
- Roles: @Admin, @Member
- Nickname: Nick
```

### `/avatar [user]`

Get a user's avatar.

**Parameters:**
- `user` - User to get avatar for (default: yourself)

**Shows:**
- Large avatar image
- Links to different sizes (128, 256, 512, 1024)
- Links to different formats (PNG, JPG, WebP, GIF if animated)

### `/banner [user]`

Get a user's profile banner (if they have one).

**Parameters:**
- `user` - User to get banner for (default: yourself)

**Note:** Only users with Discord Nitro can have custom banners.

### `/memberlist [role] [page]`

List server members, optionally filtered by role.

**Parameters:**
- `role` - Filter by role (optional)
- `page` - Page number (default: 1)

**Shows:**
- Paginated list of members
- Join date for each member
- Total member count

### `/age [user]`

Show how long a user's account has existed.

**Parameters:**
- `user` - User to check (default: yourself)

**Shows:**
- Account creation date
- Exact age (X years, Y months, Z days)

### `/stats`

Display bot statistics.

**Shows:**
- Server count
- Total members across servers
- Uptime
- Memory usage
- Ping/latency
- Version

## Output Format

All commands use embeds for clean, formatted output with:
- Consistent color scheme
- Timestamps where relevant
- User/server avatars as thumbnails
- Links where useful

## Features

### Cached Data
User and server data is fetched fresh to ensure accuracy.

### Permission Checks
Some information may be hidden based on privacy settings:
- User presence requires presence intent
- Some user info requires shared servers

### Pagination
Long lists (like memberlist) are paginated for readability.

## Best Practices

1. **Enable only needed commands** - Disable unused ones
2. **Consider privacy** - Some info may be sensitive
3. **Use sparingly** - These commands can be rate-limited
