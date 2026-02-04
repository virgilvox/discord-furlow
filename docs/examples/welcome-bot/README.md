# Welcome Bot Example

A welcome bot with customizable messages, canvas welcome cards, and leave messages.

## Features

- **Welcome Messages**: Customizable embeds when users join
- **Welcome Cards**: Canvas-generated welcome images
- **Leave Messages**: Notify when users leave
- **Role Assignment**: Auto-assign roles on join
- **DM Welcome**: Send welcome DM to new members

## Setup

1. Create required channels:
   - `#welcome` - Welcome messages channel
   - `#goodbye` - Leave messages channel (optional)

2. Create an auto-role (optional)

3. Create a `.env` file:

```env
DISCORD_TOKEN=your_bot_token
WELCOME_CHANNEL=123456789
GOODBYE_CHANNEL=123456789
AUTO_ROLE=123456789
```

4. Add welcome card assets (optional):
   - `./assets/welcome-bg.png` - Background image (800x300)

5. Run the bot:

```bash
furlow start furlow.yaml
```

## Files

- `furlow.yaml` - Bot specification
- `assets/` - Image assets (create this)
- `.env` - Environment variables (create this)

## Customization

### Change Welcome Message

Edit the `welcome` embed in the spec:

```yaml
embeds:
  welcome:
    title: "Welcome!"
    description: "Your custom message here"
```

### Disable Canvas Card

Remove the `canvas` section and the `canvas_render` action.

### Add Multiple Auto-Roles

```yaml
events:
  - event: guild_member_add
    actions:
      - assign_role:
          role: "${env.AUTO_ROLE_1}"
      - assign_role:
          role: "${env.AUTO_ROLE_2}"
```

### Customize Canvas Card

Modify the `welcome_card` generator to change:
- Background image
- Text position and styling
- Avatar placement
- Additional decorations

## Next Steps

- See [Canvas Documentation](../../builtins/welcome.md) for advanced canvas features
- Check [Welcome Builtin](../../builtins/welcome.md) for pre-built welcome system
