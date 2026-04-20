# Canvas Reference

FURLOW generates dynamic images (welcome cards, rank cards, banners) via [node-canvas](https://github.com/Automattic/node-canvas). Canvas is an optional peer dependency; install `canvas` in your bot project to enable it.

```bash
npm install canvas
```

## Canvas Actions

There are exactly two canvas actions. Everything else is expressed through layers.

### `canvas_render`

Renders a generator defined in `spec.canvas.generators`. Use this for reusable templates.

```yaml
- canvas_render:
    generator: welcome_card        # generator key
    context:
      avatar_url: "${avatar_url}"  # values passed into the generator
      display_name: "${member.displayName}"
    as: welcome_image              # variable that receives the Buffer result
```

Generator definitions do not have automatic access to runtime context. Everything a layer references must be passed explicitly via `context:`.

### `render_layers`

Renders layers inline without a pre-defined generator. Useful for one-off images.

```yaml
- render_layers:
    width: 800
    height: 300
    background: "#23272A"
    format: png                    # png | jpeg (optional; default png)
    quality: 0.92                  # 0..1 for jpeg
    layers:
      - type: text
        x: 400
        y: 150
        text: "Hello, ${user.username}!"
        font: sans-serif
        size: 32
        color: "#FFFFFF"
        align: center
    as: banner_image
```

Attach the rendered buffer to a Discord message:

```yaml
- reply:
    files:
      - attachment: "${banner_image}"
        name: welcome.png
```

## Layer Types

Six layer types are implemented. Any other `type:` value is silently skipped.

| Type | Purpose |
|------|---------|
| `image` | Draws an image from a URL or local path. |
| `circle_image` | Draws an image clipped to a circle (avatars). |
| `text` | Draws a string with font, size, color, alignment, baseline, and max width. |
| `rect` | Draws a filled or outlined rectangle, optionally rounded. |
| `progress_bar` | Draws a two-tone progress bar with a 0..1 value. |
| `gradient` | Draws a linear or radial gradient fill. |

### Common Fields

Every layer supports:

| Field | Type | Description |
|-------|------|-------------|
| `type` | enum | One of the six types above. |
| `x`, `y` | number | Position (interpolation allowed). |
| `when` | expression | If set and falsy, layer is skipped. |
| `opacity` | 0..1 | Applied to image layers. |

### `image`

```yaml
- type: image
  x: 0
  y: 0
  src: "${background_url}"
  width: 800        # optional; defaults to image natural width
  height: 300       # optional; defaults to image natural height
  opacity: 1.0
```

### `circle_image`

```yaml
- type: circle_image
  x: 320            # top-left corner of the bounding box
  y: 40
  radius: 80
  src: "${avatar_url}"
  border_color: "#FFFFFF"   # optional
  border_width: 4           # optional
```

Canvas does not decode WebP. Pass a `.png` URL. For Discord avatars, construct the URL manually:

```yaml
- set:
    var: avatar_url
    value: "https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=256"
```

### `text`

```yaml
- type: text
  x: 400
  y: 150
  text: "Welcome, ${display_name}!"
  font: sans-serif
  size: 32
  color: "#FFFFFF"
  weight: bold            # optional
  align: center           # left | center | right
  baseline: middle        # top | middle | bottom | alphabetic
  max_width: 700          # optional; truncates to this width
```

### `rect`

```yaml
- type: rect
  x: 10
  y: 10
  width: 780
  height: 280
  color: "#2C2F33"
  radius: 16              # optional rounded corners
  stroke_color: "#FFFFFF" # optional outline
  stroke_width: 2
```

### `progress_bar`

```yaml
- type: progress_bar
  x: 100
  y: 200
  width: 600
  height: 40
  value: "${current_xp / needed_xp}"   # 0..1
  background_color: "#2C2F33"
  fill_color: "#5865F2"
  radius: 20                           # optional rounded corners
```

### `gradient`

```yaml
- type: gradient
  x: 0
  y: 0
  width: 800
  height: 300
  kind: linear            # linear | radial
  direction: horizontal   # linear only: horizontal | vertical | diagonal
  stops:
    - { offset: 0, color: "#5865F2" }
    - { offset: 1, color: "#EB459E" }
```

## Generators

Generators are reusable named layer stacks declared once in `spec.canvas.generators`:

```yaml
canvas:
  enabled: true
  fonts_dir: ./fonts          # optional; loads every .ttf/.otf on startup
  generators:
    welcome_card:
      width: 800
      height: 300
      background: "#23272A"
      layers:
        - type: circle_image
          x: 40
          y: 40
          radius: 100
          src: "${avatar_url}"
        - type: text
          x: 400
          y: 150
          text: "Welcome, ${display_name}!"
          font: sans-serif
          size: 32
          color: "#FFFFFF"
          align: center

commands:
  - name: welcome
    actions:
      - set:
          var: avatar_url
          value: "https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=256"
      - canvas_render:
          generator: welcome_card
          context:
            avatar_url: "${avatar_url}"
            display_name: "${member.displayName}"
          as: welcome_image
      - reply:
          files:
            - attachment: "${welcome_image}"
              name: welcome.png
```

### Why `context:` is required

The canvas renderer evaluates layer fields in an isolated context. It does not inherit `user`, `member`, `guild`, or `state` from the triggering event. Anything a layer reads must be passed through the `context:` block of `canvas_render`. Mixing in `${user.displayName}` directly in a generator field evaluates to `undefined`.

## Welcome and Rank Card Presets

The built-in `welcome` and `leveling` builtins ship rank- and welcome-card generators you can enable via their config blocks. See [Welcome](../builtins/welcome.md) and [Leveling](../builtins/leveling.md).

## Cost

Both `canvas_render` and `render_layers` are weighted 50 credits in the per-handler execution quota. A handler that renders more than a couple of images within a single invocation will hit the default 100,000 credit cap.
