# Function Template

Use this template for documenting expression functions.

---

## function_name

Brief one-line description.

### Syntax

```
function_name(arg1)
function_name(arg1, arg2)
```

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `arg1` | string | Yes | Description |
| `arg2` | number | No | Description (default: 0) |

### Returns

| Type | Description |
|------|-------------|
| string | Description of return value |

### Examples

```yaml
# Basic usage
content: "${function_name('hello')}"
# Output: "result"

# With multiple arguments
content: "${function_name('hello', 5)}"
# Output: "result"

# In conditions
condition: "function_name(value) == expected"
```

### Edge Cases

- What happens with null/undefined
- What happens with empty strings/arrays
- Maximum values or limits

### Related Functions

- [related_function](#related_function) - Brief description
