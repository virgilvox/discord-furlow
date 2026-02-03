# Reaction Roles Builtin

The reaction roles builtin provides role assignment through buttons, select menus, and reactions.

## Quick Start

```yaml
builtins:
  reaction-roles:
    enabled: true
```

## Configuration

```yaml
builtins:
  reaction-roles:
    enabled: true

    # Maximum roles per panel
    maxRolesPerPanel: 25

    # Log channel for role assignments
    logChannel: "role-logs-id"
```

## Commands

### Button Panels

#### `/reactionroles create-button [title] [description] [mode]`

Create a new button role panel.

**Parameters:**
- `title` - Panel title (default: "Role Selection")
- `description` - Panel description
- `mode` - How roles are handled (see modes below)

#### `/reactionroles add-button <message_id> <role> [label] [emoji] [style]`

Add a button to an existing panel.

**Parameters:**
- `message_id` - Panel message ID
- `role` - Role to assign
- `label` - Button label (default: role name)
- `emoji` - Button emoji
- `style` - Button color: primary (blue), secondary (gray), success (green), danger (red)

### Select Menu Panels

#### `/reactionroles create-select [title] [description] [max_roles]`

Create a select menu role panel.

**Parameters:**
- `title` - Panel title
- `description` - Panel description
- `max_roles` - Maximum roles that can be selected

#### `/reactionroles add-option <message_id> <role> [label] [description] [emoji]`

Add an option to a select menu panel.

### Management

#### `/reactionroles delete <message_id>`

Delete a role panel and its associated data.

## Role Modes

### Toggle (default)
Users can add and remove the role by clicking.
- Click once: Add role
- Click again: Remove role

### Give
Roles can only be added, not removed.
- "You already have this role" if they click again

### Take
Roles can only be removed, not added.
- Useful for "leave role" buttons

### Unique
Only one role from the panel at a time.
- Selecting a new role removes the previous one
- Perfect for color roles or region selection

## Panel Types

### Button Panel

```
Role Selection

Click a button to get a role!

[🎮 Gamer] [🎨 Artist] [🎵 Musician]
[📚 Reader] [🏃 Athlete]
```

Buttons can have:
- Custom labels
- Emojis
- Different colors

### Select Menu Panel

```
Role Selection

Select your roles from the menu below!

[▼ Choose roles...]
```

Select menus allow:
- Multiple selections
- Descriptions for each option
- Min/max selection limits

### Reaction Panel

Classic reaction-based roles (created programmatically):
- React with emoji to get role
- Remove reaction to remove role

## Button Styling

| Style | Color | Use Case |
|-------|-------|----------|
| Primary | Blue | Default, main actions |
| Secondary | Gray | Less prominent options |
| Success | Green | Positive options |
| Danger | Red | Careful selections |

## Logging

When `logChannel` is configured, role changes are logged:

```
@User added @Gamer role
@User removed @Artist role

Timestamp: Today at 3:45 PM
```

## Database Schema

Panels store:
- Panel ID, guild ID, channel ID, message ID
- Type (button, select, reaction)
- Mode (toggle, give, take, unique)
- Max roles (for select)

Entries store:
- Panel ID
- Role ID
- Emoji, label, description
- Style (for buttons)

## Best Practices

1. **Use descriptive labels** - Clear role purposes
2. **Add emojis** - Visual distinction
3. **Group related roles** - One panel per category
4. **Set appropriate mode** - Unique for mutually exclusive roles
5. **Test permissions** - Ensure bot role is above assigned roles
6. **Enable logging** - Track role changes

## Troubleshooting

### "I can't assign this role"
- Bot's role must be higher than the role being assigned
- Bot needs "Manage Roles" permission

### "Buttons aren't working"
- Check panel hasn't been deleted
- Verify bot has view/send permissions in channel

### "Select menu shows no options"
- Add options with `/reactionroles add-option`
- Max 25 options per select menu
