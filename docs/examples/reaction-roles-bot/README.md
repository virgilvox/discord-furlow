# Reaction Roles Bot Example

A reaction roles bot that assigns roles when users react to messages.

## Features

- **Reaction Roles**: React to get roles
- **Role Menus**: Create role selection menus with `/rolemenu`
- **Button Roles**: Modern button-based role assignment
- **Toggle Mode**: Click again to remove role
- **Multi-select**: Get multiple roles from one menu

## Setup

1. Create roles you want to assign

2. Create a `.env` file:

```env
DISCORD_TOKEN=your_bot_token
```

3. Run the bot:

```bash
furlow start furlow.yaml
```

## Files

- `furlow.yaml` - Bot specification
- `.env` - Environment variables (create this)

## Usage

### Create a Role Menu (Buttons)

```
/rolemenu title:Pick your roles channel:#roles
```

Then add roles to the menu:
```
/addrole menu_id:123456789 role:@Red emoji:red_circle
/addrole menu_id:123456789 role:@Blue emoji:blue_circle
```

### Create a Reaction Role

```
/reactionrole message:123456789 emoji:star role:@Stargazer
```

Users can react with the emoji to get the role.

### List Role Menus

```
/listmenus
```

## Customization

### Change Button Style

Edit the button style in the `add_role_button` flow:

```yaml
style: primary   # primary, secondary, success, danger
```

### Add Role Requirements

Require a role before users can get another:

```yaml
when: "member.roles | includes('required_role_id')"
```

### Limit Selections

Set max roles from a menu:

```yaml
max_selections: 3
```

## Next Steps

- See [Components](../../reference/yaml-spec.md#components) for button customization
- Check [Reaction Roles Builtin](../../builtins/reaction-roles.md) for pre-built features
