# Welcome Builtin

The welcome builtin provides automated welcome and goodbye messages, auto-role assignment, and welcome images for new members.

## Quick Start

```yaml
builtins:
  welcome:
    enabled: true
    channel: "welcome-channel-id"
    message: "Welcome ${user.mention} to **${guild.name}**!"
```

## Configuration

```yaml
builtins:
  welcome:
    enabled: true

    # Welcome message
    channel: "123456789"               # Welcome channel ID
    message: "Welcome ${user.mention}!"

    # Embed (optional)
    embed:
      title: "Welcome!"
      description: "Welcome to ${guild.name}, ${user.mention}!"
      color: "#5865F2"
      thumbnail: "${user.avatar}"
      fields:
        - name: "Member Count"
          value: "You are member #${guild.member_count}"
          inline: true
      footer:
        text: "Enjoy your stay!"
      timestamp: true

    # Welcome image
    image:
      enabled: true
      background: "https://example.com/welcome-bg.png"
      # Or use built-in generator
      generator: "welcome_card"
      generator_options:
        style: "modern"

    # Direct message
    dm:
      enabled: false
      message: |
        Welcome to **${guild.name}**!

        Please read the rules in <#rules-channel>.

    # Auto-roles
    auto_roles:
      - "member-role-id"
      - "unverified-role-id"

    # Goodbye message
    goodbye:
      enabled: true
      channel: "123456789"             # Same or different channel
      message: "Goodbye ${user.username}. We'll miss you!"

    # Restrictions
    ignore_bots: true                  # Don't welcome bots
    require_avatar: false              # Only welcome users with avatars
    min_account_age: "0"               # Minimum account age
```

## Message Variables

Use these variables in welcome/goodbye messages:

| Variable | Description |
|----------|-------------|
| `${user.mention}` | @mention the user |
| `${user.username}` | Username |
| `${member.display_name}` | Display name |
| `${user.id}` | User ID |
| `${user.avatar}` | Avatar URL |
| `${user.created_at}` | Account creation date |
| `${member.joined_at}` | Join date |
| `${guild.name}` | Server name |
| `${guild.member_count}` | Total members |
| `${guild.icon}` | Server icon URL |

## Welcome Images

### Using Built-in Generator

```yaml
builtins:
  welcome:
    image:
      enabled: true
      generator: "welcome_card"
      generator_options:
        style: "modern"                # modern, classic, minimal
        background_color: "#1a1a2e"
        accent_color: "#5865F2"
        text_color: "#ffffff"
        show_member_count: true
        show_join_date: false
```

### Using Custom Background

```yaml
builtins:
  welcome:
    image:
      enabled: true
      background: "https://example.com/bg.png"
      # Background is stretched to fit canvas
```

### Custom Canvas Configuration

```yaml
builtins:
  welcome:
    image:
      enabled: true
      canvas:
        width: 800
        height: 400
        layers:
          - type: image
            src: "https://example.com/bg.png"
            x: 0
            y: 0
            width: 800
            height: 400

          - type: circle_image
            src: "${user.avatar}"
            x: 400
            y: 150
            radius: 80

          - type: text
            content: "Welcome!"
            x: 400
            y: 280
            font: "bold 48px Sans"
            color: "#ffffff"
            align: center

          - type: text
            content: "${member.display_name}"
            x: 400
            y: 330
            font: "32px Sans"
            color: "#b9bbbe"
            align: center
```

## Auto-Roles

### Basic Auto-Role

```yaml
builtins:
  welcome:
    auto_roles:
      - "member-role-id"
```

### Conditional Auto-Roles

```yaml
builtins:
  welcome:
    auto_roles:
      - role: "member-role-id"
        delay: "0"                     # Immediate

      - role: "verified-role-id"
        delay: "10m"                   # After 10 minutes
        condition: "!member.pending"   # After passing screening

      - role: "human-role-id"
        condition: "!user.bot"         # Non-bots only
```

## Goodbye Messages

```yaml
builtins:
  welcome:
    goodbye:
      enabled: true
      channel: "goodbye-channel-id"
      message: "${user.username} has left. We now have ${guild.member_count} members."

      # Optional embed
      embed:
        title: "Goodbye!"
        description: "${user.username} has left the server."
        color: "#f04747"
        thumbnail: "${user.avatar}"
        footer:
          text: "Member count: ${guild.member_count}"
```

## Commands

The welcome builtin includes these optional commands:

### `/welcome test`

Previews the welcome message (admin only).

```
/welcome test user:@User
```

### `/welcome set channel`

Sets the welcome channel.

```
/welcome set channel channel:#welcome
```

### `/welcome set message`

Sets the welcome message.

```
/welcome set message text:Welcome {user}!
```

### `/welcome toggle`

Enables or disables welcome messages.

```
/welcome toggle enabled:true
```

## Events

### `member_welcomed`

Fired after a member is welcomed.

**Context:**
| Variable | Type | Description |
|----------|------|-------------|
| `member` | Member | The new member |
| `message` | Message | The welcome message sent |
| `image` | string | Image URL (if generated) |

### `member_goodbye`

Fired when a goodbye message is sent.

**Context:**
| Variable | Type | Description |
|----------|------|-------------|
| `user` | User | The user who left |
| `member` | Member | Member data (partial) |
| `message` | Message | The goodbye message sent |

## Examples

### Simple Welcome

```yaml
builtins:
  welcome:
    enabled: true
    channel: "welcome"
    message: "Welcome to the server, ${user.mention}!"
    auto_roles:
      - "member"
```

### Rich Welcome with Image

```yaml
builtins:
  welcome:
    enabled: true
    channel: "welcome"
    embed:
      title: "Welcome to ${guild.name}!"
      description: |
        Hey ${user.mention}, welcome to our community!

        Make sure to:
        - Read the <#rules> channel
        - Grab some roles in <#roles>
        - Introduce yourself in <#introductions>

        Have fun!
      color: "#5865F2"
      thumbnail: "${user.avatar}"
      image: "${welcome_image_url}"
      footer:
        text: "Member #${guild.member_count}"
      timestamp: true

    image:
      enabled: true
      generator: "welcome_card"

    auto_roles:
      - "member"

    dm:
      enabled: true
      message: |
        Welcome to **${guild.name}**!

        Here are some important links:
        - Rules: https://discord.gg/...
        - FAQ: https://example.com/faq
```

### Verification System

```yaml
builtins:
  welcome:
    enabled: true
    channel: "verification"

    message: |
      Welcome ${user.mention}!

      Please click the button below to verify and gain access to the server.

    components:
      - type: row
        components:
          - type: button
            style: primary
            label: "Verify"
            custom_id: "welcome_verify"

    # Don't auto-assign until verified
    auto_roles: []

# Handle verification
events:
  button_click:
    condition: "custom_id == 'welcome_verify'"
    actions:
      - assign_role:
          user: "${user.id}"
          role: "verified-role"
      - reply:
          content: "You've been verified! Welcome to the server."
          ephemeral: true
```

### Account Age Check

```yaml
builtins:
  welcome:
    enabled: true
    channel: "welcome"
    min_account_age: "7d"              # 7 day old accounts only

    # New accounts get quarantined
    quarantine:
      enabled: true
      channel: "new-accounts"
      role: "quarantine"
      message: |
        ${user.mention}, your account is less than 7 days old.

        A moderator will verify you shortly.
```
