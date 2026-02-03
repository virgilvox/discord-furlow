# Expressions Reference

FURLOW uses a Jexl-based expression language with 71 functions and 50 transforms.

## Syntax

Expressions are wrapped in `${}`:

```yaml
content: "Hello, ${user.username}!"
content: "Result: ${1 + 2 * 3}"
content: "Today: ${now() | formatDate}"
```

## Context Variables

These variables are available in expressions:

| Variable | Description |
|----------|-------------|
| `user` | The user who triggered the action |
| `member` | Guild member object |
| `guild` | Current guild/server |
| `channel` | Current channel |
| `message` | Message object (in message events) |
| `interaction` | Interaction object (in commands) |
| `options` | Command options |
| `client` | Bot client object |

## Operators

| Operator | Description | Example |
|----------|-------------|---------|
| `+` | Add / concatenate | `1 + 2`, `"a" + "b"` |
| `-` | Subtract | `5 - 3` |
| `*` | Multiply | `4 * 2` |
| `/` | Divide | `10 / 2` |
| `%` | Modulo | `7 % 3` |
| `==` | Equal | `x == 5` |
| `!=` | Not equal | `x != 5` |
| `<` | Less than | `x < 5` |
| `>` | Greater than | `x > 5` |
| `<=` | Less or equal | `x <= 5` |
| `>=` | Greater or equal | `x >= 5` |
| `&&` | Logical AND | `a && b` |
| `\|\|` | Logical OR | `a \|\| b` |
| `!` | Logical NOT | `!a` |
| `? :` | Ternary | `x > 5 ? "big" : "small"` |
| `\|` | Pipe (transform) | `name \| upper` |

## Functions (71)

### Date/Time (5)

| Function | Description | Example |
|----------|-------------|---------|
| `now()` | Current timestamp (ms) | `now()` |
| `timestamp(date)` | Convert to timestamp | `timestamp(date)` |
| `date(ts)` | Convert timestamp to Date | `date(1234567890)` |
| `dateAdd(date, amount, unit)` | Add to date | `dateAdd(now(), 1, 'day')` |
| `addDuration(date, duration)` | Add duration string | `addDuration(now(), '1h')` |

### Math (9)

| Function | Description | Example |
|----------|-------------|---------|
| `random(min, max)` | Random integer | `random(1, 100)` |
| `randomFloat(min, max)` | Random float | `randomFloat(0, 1)` |
| `round(n, decimals?)` | Round number | `round(3.14159, 2)` |
| `floor(n)` | Round down | `floor(3.7)` |
| `ceil(n)` | Round up | `ceil(3.2)` |
| `abs(n)` | Absolute value | `abs(-5)` |
| `min(...values)` | Minimum value | `min(1, 2, 3)` |
| `max(...values)` | Maximum value | `max(1, 2, 3)` |
| `clamp(n, min, max)` | Clamp to range | `clamp(15, 0, 10)` |

### String (15)

| Function | Description | Example |
|----------|-------------|---------|
| `lower(s)` | Lowercase | `lower("HELLO")` |
| `upper(s)` | Uppercase | `upper("hello")` |
| `capitalize(s)` | Capitalize first letter | `capitalize("hello")` |
| `titleCase(s)` | Title Case | `titleCase("hello world")` |
| `trim(s)` | Remove whitespace | `trim("  hi  ")` |
| `truncate(s, len, suffix?)` | Truncate string | `truncate(s, 100, "...")` |
| `padStart(s, len, char?)` | Pad start | `padStart("5", 2, "0")` |
| `padEnd(s, len, char?)` | Pad end | `padEnd("hi", 5, ".")` |
| `replace(s, find, repl)` | Replace substring | `replace(s, "a", "b")` |
| `split(s, delim)` | Split string | `split("a,b,c", ",")` |
| `join(arr, delim)` | Join array | `join(arr, ", ")` |
| `includes(s, sub)` | Contains substring | `includes(s, "test")` |
| `startsWith(s, prefix)` | Starts with | `startsWith(s, "http")` |
| `endsWith(s, suffix)` | Ends with | `endsWith(s, ".js")` |
| `match(s, regex)` | Regex match | `match(s, "\\d+")` |

### Array (13)

| Function | Description | Example |
|----------|-------------|---------|
| `length(arr)` | Array/string length | `length(items)` |
| `first(arr)` | First element | `first(arr)` |
| `last(arr)` | Last element | `last(arr)` |
| `nth(arr, n)` | Nth element | `nth(arr, 2)` |
| `slice(arr, start, end?)` | Slice array | `slice(arr, 0, 5)` |
| `reverse(arr)` | Reverse array | `reverse(arr)` |
| `sort(arr, key?)` | Sort array | `sort(arr, "name")` |
| `unique(arr)` | Remove duplicates | `unique(arr)` |
| `flatten(arr)` | Flatten nested | `flatten([[1], [2]])` |
| `pick(arr, keys)` | Pick properties | `pick(obj, ["a", "b"])` |
| `shuffle(arr)` | Shuffle array | `shuffle(arr)` |
| `range(start, end, step?)` | Number range | `range(1, 10)` |
| `chunk(arr, size)` | Split into chunks | `chunk(arr, 3)` |

### Object (6)

| Function | Description | Example |
|----------|-------------|---------|
| `keys(obj)` | Object keys | `keys(obj)` |
| `values(obj)` | Object values | `values(obj)` |
| `entries(obj)` | Key-value pairs | `entries(obj)` |
| `get(obj, path, default?)` | Get nested value | `get(obj, "a.b.c")` |
| `has(obj, key)` | Has property | `has(obj, "key")` |
| `merge(...objects)` | Merge objects | `merge(a, b)` |

### Type (7)

| Function | Description | Example |
|----------|-------------|---------|
| `type(val)` | Get type name | `type(val)` |
| `isNull(val)` | Is null/undefined | `isNull(val)` |
| `isArray(val)` | Is array | `isArray(val)` |
| `isString(val)` | Is string | `isString(val)` |
| `isNumber(val)` | Is number | `isNumber(val)` |
| `isBoolean(val)` | Is boolean | `isBoolean(val)` |
| `isObject(val)` | Is object | `isObject(val)` |

### Conversion (7)

| Function | Description | Example |
|----------|-------------|---------|
| `string(val)` | Convert to string | `string(123)` |
| `number(val)` | Convert to number | `number("42")` |
| `int(val)` | Convert to integer | `int("3.14")` |
| `float(val)` | Convert to float | `float("3.14")` |
| `boolean(val)` | Convert to boolean | `boolean(1)` |
| `json(val)` | Stringify to JSON | `json(obj)` |
| `parseJson(s)` | Parse JSON string | `parseJson(s)` |

### Discord (5)

| Function | Description | Example |
|----------|-------------|---------|
| `mention(type, id)` | Create mention | `mention("user", id)` |
| `formatNumber(n)` | Format with commas | `formatNumber(1000000)` |
| `ordinal(n)` | Ordinal suffix | `ordinal(1)` → "1st" |
| `pluralize(n, singular, plural?)` | Pluralize | `pluralize(5, "item")` |
| `duration(ms)` | Format duration | `duration(3600000)` |

### Utility (4)

| Function | Description | Example |
|----------|-------------|---------|
| `default(val, def)` | Default value | `default(x, "none")` |
| `coalesce(...vals)` | First non-null | `coalesce(a, b, c)` |
| `uuid()` | Generate UUID | `uuid()` |
| `hash(val, algo?)` | Hash string | `hash(s, "sha256")` |

---

## Transforms (50)

Transforms are applied with the pipe operator `|`.

```yaml
content: "${name | upper | truncate(20)}"
content: "${items | sort('name') | first}"
```

### String Transforms

| Transform | Description | Example |
|-----------|-------------|---------|
| `lower` | Lowercase | `name \| lower` |
| `upper` | Uppercase | `name \| upper` |
| `capitalize` | Capitalize | `name \| capitalize` |
| `trim` | Trim whitespace | `input \| trim` |
| `truncate(len, suffix?)` | Truncate | `desc \| truncate(100)` |
| `split(delim)` | Split string | `csv \| split(",")` |
| `replace(find, repl)` | Replace | `s \| replace("a", "b")` |
| `padStart(len, char?)` | Pad start | `n \| padStart(5, "0")` |
| `padEnd(len, char?)` | Pad end | `s \| padEnd(10)` |
| `includes(sub)` | Contains | `s \| includes("test")` |
| `startsWith(prefix)` | Starts with | `s \| startsWith("http")` |
| `endsWith(suffix)` | Ends with | `s \| endsWith(".js")` |
| `contains(sub)` | Alias for includes | `s \| contains("x")` |

### Array Transforms

| Transform | Description | Example |
|-----------|-------------|---------|
| `join(delim)` | Join to string | `arr \| join(", ")` |
| `first` | First element | `arr \| first` |
| `last` | Last element | `arr \| last` |
| `nth(n)` | Nth element | `arr \| nth(2)` |
| `slice(start, end?)` | Slice | `arr \| slice(0, 5)` |
| `reverse` | Reverse | `arr \| reverse` |
| `sort(key?)` | Sort | `arr \| sort("name")` |
| `unique` | Remove duplicates | `arr \| unique` |
| `flatten` | Flatten nested | `arr \| flatten` |
| `filter(expr)` | Filter items | `arr \| filter(x > 5)` |
| `map(expr)` | Map items | `arr \| map(x * 2)` |
| `pluck(key)` | Extract property | `users \| pluck("name")` |
| `pick(keys)` | Pick properties | `obj \| pick(["a"])` |
| `shuffle` | Shuffle | `arr \| shuffle` |

### Number Transforms

| Transform | Description | Example |
|-----------|-------------|---------|
| `round(decimals?)` | Round | `n \| round(2)` |
| `floor` | Floor | `n \| floor` |
| `ceil` | Ceiling | `n \| ceil` |
| `abs` | Absolute value | `n \| abs` |
| `format` | Format number | `n \| format` |
| `ordinal` | Ordinal suffix | `n \| ordinal` |

### Object Transforms

| Transform | Description | Example |
|-----------|-------------|---------|
| `keys` | Object keys | `obj \| keys` |
| `values` | Object values | `obj \| values` |
| `entries` | Key-value pairs | `obj \| entries` |
| `get(path)` | Get nested | `obj \| get("a.b")` |

### Type Transforms

| Transform | Description | Example |
|-----------|-------------|---------|
| `string` | To string | `val \| string` |
| `number` | To number | `val \| number` |
| `int` | To integer | `val \| int` |
| `float` | To float | `val \| float` |
| `boolean` | To boolean | `val \| boolean` |
| `json` | To JSON | `obj \| json` |

### Utility Transforms

| Transform | Description | Example |
|-----------|-------------|---------|
| `default(val)` | Default value | `x \| default("none")` |
| `length` | Length | `arr \| length` |
| `size` | Alias for length | `arr \| size` |

### Date Transforms

| Transform | Description | Example |
|-----------|-------------|---------|
| `timestamp` | To timestamp | `date \| timestamp` |
| `duration` | Format duration | `ms \| duration` |
| `formatDate` | Format date | `date \| formatDate` |

### Discord Transforms

| Transform | Description | Example |
|-----------|-------------|---------|
| `mention` | Create mention | `userId \| mention` |
| `pluralize(singular, plural?)` | Pluralize | `count \| pluralize("item")` |

---

## Examples

### Conditional Content

```yaml
content: "${user.premium ? 'Thanks for supporting!' : 'Welcome!'}"
```

### Formatting Numbers

```yaml
content: "You have ${coins | format} coins"
# Output: "You have 1,234,567 coins"
```

### Working with Arrays

```yaml
content: "Top users: ${leaderboard | slice(0, 5) | pluck('name') | join(', ')}"
```

### Date Formatting

```yaml
content: "Account created: ${user.createdAt | formatDate}"
content: "Uptime: ${client.uptime | duration}"
```

### Safe Property Access

```yaml
content: "${get(user, 'profile.bio', 'No bio set')}"
```

### Complex Expressions

```yaml
condition: "${member.roles | pluck('id') | includes(adminRoleId)}"
```
