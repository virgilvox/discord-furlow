# Canvas Reference

Generate dynamic images for welcome cards, rank cards, leaderboards, and more using FURLOW's Canvas system.

## Overview

FURLOW includes a powerful canvas system built on [node-canvas](https://github.com/Automattic/node-canvas) that lets you create custom images directly from your YAML configuration. Common use cases include:

- Welcome/goodbye cards with user avatars
- Rank and level-up cards
- Leaderboard images
- Achievement badges
- Custom memes and templates

## Configuration

Enable canvas in your bot configuration:

```yaml
canvas:
  enabled: true
  fonts_dir: ./fonts    # Optional: directory for custom fonts
  cache:
    enabled: true
    max_size: 100       # Max cached images
    ttl: 3600           # Cache TTL in seconds
```

## Canvas Actions

### `canvas_create`

Create a new canvas with specified dimensions.

```yaml
- action: canvas_create
  width: 800
  height: 400
  background: "#2f3136"    # Color or gradient
  as: canvas               # Variable name to store canvas
```

**Background options:**

```yaml
# Solid color
background: "#5865F2"

# Linear gradient
background:
  type: linear
  start: [0, 0]
  end: [800, 0]
  stops:
    - [0, "#5865F2"]
    - [1, "#eb459e"]

# Radial gradient
background:
  type: radial
  center: [400, 200]
  radius: 300
  stops:
    - [0, "#5865F2"]
    - [1, "#23272a"]

# Image
background:
  type: image
  url: "https://example.com/background.png"
  fit: cover    # cover, contain, fill, none
```

### `canvas_draw_rect`

Draw a rectangle on the canvas.

```yaml
- action: canvas_draw_rect
  canvas: "${canvas}"
  x: 20
  y: 20
  width: 760
  height: 360
  fill: "#23272a"
  radius: 20              # Corner radius (optional)
  stroke: "#5865F2"       # Border color (optional)
  stroke_width: 3         # Border width (optional)
```

### `canvas_draw_circle`

Draw a circle on the canvas.

```yaml
- action: canvas_draw_circle
  canvas: "${canvas}"
  x: 100
  y: 200
  radius: 60
  fill: "#5865F2"
  stroke: "#ffffff"
  stroke_width: 4
```

### `canvas_draw_text`

Draw text on the canvas.

```yaml
- action: canvas_draw_text
  canvas: "${canvas}"
  text: "Welcome, ${member.displayName}!"
  x: 200
  y: 180
  font: "bold 32px Inter"
  color: "#ffffff"
  align: left             # left, center, right
  baseline: middle        # top, middle, bottom
  max_width: 400          # Optional: wrap or truncate
```

**Font format:** `[style] [weight] size family`
- Style: `normal`, `italic`
- Weight: `normal`, `bold`, or numeric (`100`-`900`)
- Size: pixels (`24px`) or points (`18pt`)
- Family: Font name (must be installed or in fonts_dir)

### `canvas_draw_image`

Draw an image on the canvas.

```yaml
- action: canvas_draw_image
  canvas: "${canvas}"
  url: "${member.displayAvatarURL}"
  x: 40
  y: 140
  width: 120
  height: 120
  radius: 60              # Make circular avatar
  border: "#5865F2"
  border_width: 4
```

**Image options:**

```yaml
# Basic image
url: "https://example.com/image.png"

# Resize modes
fit: cover      # Crop to fill (default)
fit: contain    # Fit inside bounds
fit: fill       # Stretch to fill
fit: none       # No resize

# Position within bounds (for contain/cover)
position: center    # center, top, bottom, left, right
```

### `canvas_draw_progress`

Draw a progress bar.

```yaml
- action: canvas_draw_progress
  canvas: "${canvas}"
  x: 200
  y: 280
  width: 560
  height: 30
  progress: "${xp / xpNeeded}"    # 0-1
  background: "#23272a"
  fill: "#5865F2"
  radius: 15
  border: "#3c4043"
  border_width: 2
```

**Gradient fill:**

```yaml
fill:
  type: linear
  start: [0, 0]
  end: [560, 0]
  stops:
    - [0, "#5865F2"]
    - [1, "#57f287"]
```

### `canvas_draw_line`

Draw a line on the canvas.

```yaml
- action: canvas_draw_line
  canvas: "${canvas}"
  start: [100, 200]
  end: [700, 200]
  color: "#5865F2"
  width: 3
  dash: [10, 5]           # Optional: dashed line
```

### `canvas_draw_polygon`

Draw a polygon shape.

```yaml
- action: canvas_draw_polygon
  canvas: "${canvas}"
  points:
    - [400, 50]
    - [450, 150]
    - [350, 150]
  fill: "#faa61a"
  stroke: "#ffffff"
  stroke_width: 2
```

### `canvas_apply_filter`

Apply visual filters to the canvas.

```yaml
- action: canvas_apply_filter
  canvas: "${canvas}"
  filter: blur
  value: 5
```

**Available filters:**
- `blur` - Gaussian blur (value: radius)
- `brightness` - Adjust brightness (value: 0-200, 100 = normal)
- `contrast` - Adjust contrast (value: 0-200, 100 = normal)
- `grayscale` - Convert to grayscale (value: 0-100)
- `saturate` - Adjust saturation (value: 0-200, 100 = normal)
- `sepia` - Apply sepia tone (value: 0-100)
- `invert` - Invert colors (value: 0-100)
- `opacity` - Adjust opacity (value: 0-100)

### `canvas_clip`

Apply a clipping mask.

```yaml
- action: canvas_clip
  canvas: "${canvas}"
  shape: circle
  x: 100
  y: 200
  radius: 60
```

**Clip shapes:**

```yaml
# Circle
shape: circle
x: 100
y: 200
radius: 60

# Rectangle
shape: rect
x: 50
y: 50
width: 200
height: 100
radius: 20    # Optional: rounded corners

# Path
shape: path
points:
  - [100, 50]
  - [150, 150]
  - [50, 150]
```

### `canvas_render`

Render the canvas to an image buffer.

```yaml
- action: canvas_render
  canvas: "${canvas}"
  format: png             # png, jpeg, webp
  quality: 90             # For jpeg/webp (0-100)
  as: imageBuffer
```

### `canvas_to_attachment`

Convert canvas to a Discord attachment.

```yaml
- action: canvas_to_attachment
  canvas: "${canvas}"
  filename: "welcome.png"
  as: attachment
```

## Complete Example: Welcome Card

```yaml
commands:
  - name: testwelcome
    description: Preview the welcome card
    options:
      - name: user
        type: user
        description: User to preview
    actions:
      - action: set
        key: target
        value: "${options.user || member}"

      # Create canvas
      - action: canvas_create
        width: 800
        height: 300
        background:
          type: linear
          start: [0, 0]
          end: [800, 300]
          stops:
            - [0, "#1a1c2e"]
            - [1, "#2d3250"]
        as: canvas

      # Draw decorative accent
      - action: canvas_draw_rect
        canvas: "${canvas}"
        x: 0
        y: 0
        width: 8
        height: 300
        fill: "#5865F2"

      # Draw avatar circle background
      - action: canvas_draw_circle
        canvas: "${canvas}"
        x: 120
        y: 150
        radius: 68
        fill: "#5865F2"

      # Draw user avatar
      - action: canvas_draw_image
        canvas: "${canvas}"
        url: "${target.displayAvatarURL({ size: 256, extension: 'png' })}"
        x: 56
        y: 86
        width: 128
        height: 128
        radius: 64

      # Draw welcome text
      - action: canvas_draw_text
        canvas: "${canvas}"
        text: "WELCOME"
        x: 220
        y: 100
        font: "bold 14px Inter"
        color: "#5865F2"
        align: left

      # Draw username
      - action: canvas_draw_text
        canvas: "${canvas}"
        text: "${target.displayName}"
        x: 220
        y: 140
        font: "bold 36px Inter"
        color: "#ffffff"
        max_width: 500

      # Draw member count
      - action: canvas_draw_text
        canvas: "${canvas}"
        text: "You are member #${guild.memberCount|format}"
        x: 220
        y: 180
        font: "18px Inter"
        color: "#99aab5"

      # Draw server name
      - action: canvas_draw_text
        canvas: "${canvas}"
        text: "${guild.name}"
        x: 220
        y: 220
        font: "16px Inter"
        color: "#72767d"

      # Render to attachment
      - action: canvas_to_attachment
        canvas: "${canvas}"
        filename: "welcome.png"
        as: welcomeImage

      - action: reply
        files:
          - "${welcomeImage}"

events:
  - event: member_join
    actions:
      # ... same canvas code as above ...
      - action: send_message
        channel: "${guild.systemChannelId}"
        content: "Welcome to the server, ${member.mention}!"
        files:
          - "${welcomeImage}"
```

## Complete Example: Rank Card

```yaml
commands:
  - name: rank
    description: Show your rank card
    options:
      - name: user
        type: user
        description: User to check
    actions:
      - action: set
        key: target
        value: "${options.user || member}"

      # Get user's level data
      - action: db_query
        table: levels
        where:
          user_id: "${target.id}"
          guild_id: "${guild.id}"
        as: levelData

      - action: set
        key: data
        value:
          level: "${levelData[0]?.level || 1}"
          xp: "${levelData[0]?.xp || 0}"
          xpNeeded: "${100 * (levelData[0]?.level || 1) * 1.5}"

      # Create canvas
      - action: canvas_create
        width: 934
        height: 282
        background: "#23272a"
        as: canvas

      # Draw background panel
      - action: canvas_draw_rect
        canvas: "${canvas}"
        x: 20
        y: 20
        width: 894
        height: 242
        fill: "#2f3136"
        radius: 20

      # Draw avatar
      - action: canvas_draw_image
        canvas: "${canvas}"
        url: "${target.displayAvatarURL({ size: 256, extension: 'png' })}"
        x: 50
        y: 50
        width: 180
        height: 180
        radius: 90
        border: "#5865F2"
        border_width: 6

      # Draw username
      - action: canvas_draw_text
        canvas: "${canvas}"
        text: "${target.displayName}"
        x: 270
        y: 100
        font: "bold 40px Inter"
        color: "#ffffff"
        max_width: 400

      # Draw discriminator/tag
      - action: canvas_draw_text
        canvas: "${canvas}"
        text: "#${target.discriminator || '0000'}"
        x: "${270 + measureText(target.displayName, 'bold 40px Inter').width + 10}"
        y: 100
        font: "28px Inter"
        color: "#72767d"

      # Draw level label
      - action: canvas_draw_text
        canvas: "${canvas}"
        text: "LEVEL"
        x: 750
        y: 80
        font: "bold 16px Inter"
        color: "#72767d"
        align: center

      # Draw level number
      - action: canvas_draw_text
        canvas: "${canvas}"
        text: "${data.level}"
        x: 750
        y: 120
        font: "bold 48px Inter"
        color: "#5865F2"
        align: center

      # Draw rank label
      - action: canvas_draw_text
        canvas: "${canvas}"
        text: "RANK"
        x: 850
        y: 80
        font: "bold 16px Inter"
        color: "#72767d"
        align: center

      # Draw rank number
      - action: canvas_draw_text
        canvas: "${canvas}"
        text: "#${rank}"
        x: 850
        y: 120
        font: "bold 48px Inter"
        color: "#57f287"
        align: center

      # Draw XP text
      - action: canvas_draw_text
        canvas: "${canvas}"
        text: "${data.xp|format} / ${data.xpNeeded|format} XP"
        x: 864
        y: 170
        font: "18px Inter"
        color: "#99aab5"
        align: right

      # Draw progress bar background
      - action: canvas_draw_progress
        canvas: "${canvas}"
        x: 270
        y: 200
        width: 594
        height: 30
        progress: "${data.xp / data.xpNeeded}"
        background: "#484b51"
        fill:
          type: linear
          start: [0, 0]
          end: [594, 0]
          stops:
            - [0, "#5865F2"]
            - [1, "#eb459e"]
        radius: 15

      # Render
      - action: canvas_to_attachment
        canvas: "${canvas}"
        filename: "rank.png"
        as: rankCard

      - action: reply
        files:
          - "${rankCard}"
```

## Custom Fonts

To use custom fonts, place them in the `fonts_dir` directory:

```
my-bot/
├── furlow.yaml
└── fonts/
    ├── Inter-Regular.ttf
    ├── Inter-Bold.ttf
    └── Montserrat-Black.ttf
```

Configure fonts:

```yaml
canvas:
  enabled: true
  fonts_dir: ./fonts
  fonts:
    - family: "Inter"
      path: "./fonts/Inter-Regular.ttf"
      weight: normal
    - family: "Inter"
      path: "./fonts/Inter-Bold.ttf"
      weight: bold
    - family: "Montserrat"
      path: "./fonts/Montserrat-Black.ttf"
      weight: 900
```

Use in draw actions:

```yaml
font: "bold 32px Inter"
font: "900 48px Montserrat"
```

## Performance Tips

1. **Cache frequently-used images** - Enable caching for backgrounds and templates
2. **Use appropriate image sizes** - Don't load 4K images for 128px avatars
3. **Minimize canvas operations** - Combine operations where possible
4. **Use WebP format** - Smaller file sizes than PNG
5. **Pre-render static elements** - Cache background templates

```yaml
canvas:
  cache:
    enabled: true
    max_size: 100
    ttl: 3600
  preload:
    - "./assets/welcome-bg.png"
    - "./assets/rank-bg.png"
```

## Next Steps

- [Voice Reference](voice.md) - Voice and music features
- [Actions Reference](actions/_index.md) - All available actions
- [Leveling Builtin](../builtins/leveling.md) - Pre-built leveling system with rank cards
