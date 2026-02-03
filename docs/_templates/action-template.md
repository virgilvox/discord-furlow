# Action Template

Use this template for documenting actions.

---

## action_name

Brief one-line description of what this action does.

### Syntax

```yaml
- action: action_name
  required_param: value
  optional_param: value
```

### Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `required_param` | string | Yes | - | Description of the parameter |
| `optional_param` | number | No | `0` | Description with default value |

### Context Variables

This action sets the following context variables:

| Variable | Type | Description |
|----------|------|-------------|
| `result` | object | The result of the action |

### Examples

#### Basic Usage

```yaml
events:
  - event: message_create
    actions:
      - action: action_name
        required_param: "hello"
```

#### With Expressions

```yaml
events:
  - event: message_create
    actions:
      - action: action_name
        required_param: "${user.username}"
        optional_param: "${message.content | length}"
```

#### In a Flow

```yaml
flows:
  my_flow:
    actions:
      - action: action_name
        required_param: "${args.value}"
```

### Error Handling

| Error | Cause | Solution |
|-------|-------|----------|
| `MISSING_PARAM` | Required parameter not provided | Add the required parameter |
| `INVALID_TYPE` | Wrong parameter type | Check parameter types |

### Notes

- Important behavior notes
- Edge cases to be aware of
- Performance considerations

### Related Actions

- [related_action](./related_action.md) - Brief description
- [another_action](./another_action.md) - Brief description
