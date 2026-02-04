# Canvas Bot Example

A FURLOW bot demonstrating custom image generation for Discord.

## Features

- **Welcome Cards**: Custom images when members join
- **Rank Cards**: XP progress bars and level display
- **Profile Cards**: User profiles with gradient backgrounds
- **Server Stats**: Server information banners

## Prerequisites

Install the canvas native module:

```bash
npm install canvas
```

**Note**: The `canvas` module requires native build tools:
- **macOS**: `xcode-select --install`
- **Ubuntu/Debian**: `sudo apt-get install build-essential libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev`
- **Windows**: Install Visual Studio Build Tools

## Setup

1. Create a `.env` file:
```env
DISCORD_TOKEN=your_bot_token
DISCORD_CLIENT_ID=your_client_id
DISCORD_GUILD_ID=your_guild_id
```

2. (Optional) Add custom fonts:
```bash
mkdir fonts
# Place .ttf files in the fonts/ directory
```

3. Start the bot:
```bash
furlow start furlow.yaml
```

## Commands

| Command | Description |
|---------|-------------|
| `/rank [@user]` | Display rank card with XP and level |
| `/profile [@user]` | Display profile card |
| `/setbio <bio>` | Set your profile bio |
| `/serverstats` | Display server statistics image |

## Canvas Generator Reference

### Layer Types

| Type | Description |
|------|-------------|
| `rect` | Rectangle or rounded rectangle |
| `text` | Text with font styling |
| `image` | Image from URL |
| `circle_image` | Circular cropped image (avatars) |
| `progress_bar` | Progress bar with fill |
| `gradient` | Gradient background |

### Common Properties

All layers support:
- `x`, `y` - Position
- `when` - Conditional rendering expression

### Example Generator

```yaml
canvas:
  generators:
    my_card:
      width: 800
      height: 300
      background: "#23272A"
      layers:
        - type: circle_image
          x: 320
          y: 40
          radius: 80
          src: "${user.avatar}"
          border:
            width: 4
            color: "#5865F2"

        - type: text
          x: 400
          y: 200
          text: "Hello, ${member.display_name}!"
          font: sans-serif
          size: 32
          color: "#FFFFFF"
          align: center
```

### Using Generators

```yaml
actions:
  # Render the image
  - canvas_render:
      generator: my_card
      context:
        user: "${user}"
      as: my_image

  # Send as attachment
  - reply:
      files:
        - attachment: "${my_image}"
          name: "card.png"
```

## Customization

### Colors

Use hex colors, rgba, or named colors:
```yaml
color: "#5865F2"
color: "rgba(255, 255, 255, 0.8)"
color: "white"
```

### Fonts

Register custom fonts:
```yaml
canvas:
  fonts:
    CustomFont: "./fonts/CustomFont.ttf"

  generators:
    my_card:
      layers:
        - type: text
          font: CustomFont
          # ...
```

### Conditional Layers

Show layers only when conditions are met:
```yaml
- type: text
  text: "VIP Member"
  when: "user.roles.includes('vip')"
```

### Gradients

```yaml
- type: gradient
  x: 0
  y: 0
  width: 800
  height: 300
  direction: diagonal  # horizontal, vertical, diagonal
  stops:
    - offset: 0
      color: "#667eea"
    - offset: 1
      color: "#764ba2"
```

### Progress Bars

```yaml
- type: progress_bar
  x: 100
  y: 150
  width: 600
  height: 30
  progress: "${xp / xpRequired}"  # 0-1 value
  background: "#484b4e"
  fill: "#5865F2"
  radius: 15  # Rounded corners
```
