# Expression Language Reference

FURLOW uses a powerful expression language for dynamic content and conditions. Expressions are enclosed in `${}` syntax and can access context data, call functions, and use transforms.

## Basic Syntax

### String Interpolation

Use `${}` to embed expressions in strings:

```yaml
content: "Hello, ${user.username}!"
content: "You have ${points} points"
content: "Welcome to ${guild.name}, member #${guild.member_count}"
```

### Pure Expressions

For conditions and computed values, use expressions directly:

```yaml
condition: "user.roles.includes('123456')"
value: "points + 100"
```

## Operators

### Arithmetic
| Operator | Description | Example |
|----------|-------------|---------|
| `+` | Addition | `x + 5` |
| `-` | Subtraction | `x - 5` |
| `*` | Multiplication | `x * 2` |
| `/` | Division | `x / 2` |
| `%` | Modulo | `x % 3` |

### Comparison
| Operator | Description | Example |
|----------|-------------|---------|
| `==` | Equal | `x == 5` |
| `!=` | Not equal | `x != 5` |
| `<` | Less than | `x < 10` |
| `<=` | Less or equal | `x <= 10` |
| `>` | Greater than | `x > 10` |
| `>=` | Greater or equal | `x >= 10` |

### Logical
| Operator | Description | Example |
|----------|-------------|---------|
| `&&` | And | `x > 5 && x < 10` |
| `\|\|` | Or | `x < 5 \|\| x > 10` |
| `!` | Not | `!hasRole` |

### Ternary
```yaml
content: "${level >= 10 ? 'VIP' : 'Member'}"
color: "${warning ? 'red' : 'green'}"
```

### Null Coalescing
```yaml
name: "${nickname ?? username}"
value: "${customValue ?? defaultValue ?? 0}"
```

### Property Access
```yaml
# Dot notation
name: "${user.username}"

# Bracket notation
role: "${user.roles[0]}"

# Safe navigation
nickname: "${member?.nickname}"
```

## Context Variables

### User Context
| Variable | Type | Description |
|----------|------|-------------|
| `user.id` | string | User's Discord ID |
| `user.username` | string | Username |
| `user.discriminator` | string | Discriminator (legacy) |
| `user.tag` | string | User tag (username#0000) |
| `user.avatar` | string | Avatar URL |
| `user.bot` | boolean | Whether user is a bot |
| `user.mention` | string | User mention string |
| `user.created_at` | Date | Account creation date |

### Member Context
| Variable | Type | Description |
|----------|------|-------------|
| `member.id` | string | Member's Discord ID |
| `member.nickname` | string | Server nickname |
| `member.display_name` | string | Display name in server |
| `member.roles` | string[] | Array of role names |
| `member.role_ids` | string[] | Array of role IDs |
| `member.joined_at` | Date | When they joined |
| `member.boosting_since` | Date | Boost start date |
| `member.is_boosting` | boolean | Whether member is boosting |
| `member.highest_role` | string | Highest role name |
| `member.permissions` | string[] | Permission names |
| `member.is_owner` | boolean | Whether member is server owner |
| `member.mention` | string | Member mention |

### Guild Context
| Variable | Type | Description |
|----------|------|-------------|
| `guild.id` | string | Server ID |
| `guild.name` | string | Server name |
| `guild.icon` | string | Icon URL |
| `guild.member_count` | number | Total members |
| `guild.owner_id` | string | Owner's user ID |
| `guild.created_at` | Date | Creation date |
| `guild.premium_tier` | number | Nitro boost level (0-3) |
| `guild.boost_count` | number | Number of boosts |

### Channel Context
| Variable | Type | Description |
|----------|------|-------------|
| `channel.id` | string | Channel ID |
| `channel.name` | string | Channel name |
| `channel.type` | string | Channel type |
| `channel.topic` | string | Channel topic |
| `channel.nsfw` | boolean | NSFW flag |
| `channel.parent_id` | string | Category ID |
| `channel.mention` | string | Channel mention |

### Message Context
| Variable | Type | Description |
|----------|------|-------------|
| `message.id` | string | Message ID |
| `message.content` | string | Message content |
| `message.clean_content` | string | Content without mentions |
| `message.author.id` | string | Author's user ID |
| `message.author.username` | string | Author's username |
| `message.author.tag` | string | Author's tag (user#0000) |
| `message.author.bot` | boolean | Whether author is a bot |
| `message.attachments` | number | Number of attachments |
| `message.embeds` | number | Number of embeds |
| `message.mentions` | string[] | Mentioned user IDs |
| `message.mention_roles` | string[] | Mentioned role IDs |
| `message.created_at` | Date | Send timestamp |
| `message.edited_at` | Date | Edit timestamp (null if unedited) |
| `message.pinned` | boolean | Whether message is pinned |
| `message.url` | string | Message URL |

### Command Options
| Variable | Type | Description |
|----------|------|-------------|
| `options.<name>` | varies | Command option value |
| `args.<name>` | varies | Alias for options |

### State Context
| Variable | Type | Description |
|----------|------|-------------|
| `state.global.<key>` | varies | Global variables |
| `state.guild.<key>` | varies | Guild variables |
| `state.channel.<key>` | varies | Channel variables |
| `state.user.<key>` | varies | User variables |
| `state.member.<key>` | varies | Member variables |

### Client Context
| Variable | Type | Description |
|----------|------|-------------|
| `client.id` | string | Bot's user ID |
| `client.username` | string | Bot's username |
| `client.ping` | number | Gateway latency (ms) |
| `client.uptime` | number | Uptime in ms |

## Built-in Functions

### Date/Time Functions

#### `now()`
Returns the current date/time.
```yaml
content: "Current time: ${now()}"
```

#### `timestamp(date?, format?)`
Converts a date to Unix timestamp or Discord timestamp format.
```yaml
content: "Joined ${timestamp(member.joined_at, 'relative')}"
content: "Unix: ${timestamp()}"
```

**Formats:**
- `short_time` - 9:41 PM
- `long_time` - 9:41:30 PM
- `short_date` - 06/20/2021
- `long_date` - June 20, 2021
- `short_datetime` - June 20, 2021 9:41 PM
- `long_datetime` - Sunday, June 20, 2021 9:41 PM
- `relative` - 2 months ago

#### `date(value)`
Creates a Date from string or timestamp.
```yaml
value: "${date('2024-01-15')}"
```

#### `dateAdd(date, amount, unit)`
Adds time to a date.
```yaml
expires: "${dateAdd(now(), 7, 'days')}"
reminder: "${dateAdd(now(), 30, 'minutes')}"
```

**Units:** `seconds`, `minutes`, `hours`, `days`, `weeks`, `months`, `years`

### Math Functions

#### `random(min?, max?)`
Returns random integer between min and max (inclusive).
```yaml
roll: "${random(1, 6)}"
pick: "${random(1, 100)}"
```

#### `randomFloat(min?, max?)`
Returns random float between min and max.
```yaml
chance: "${randomFloat(0, 1)}"
```

#### `round(n, decimals?)`
Rounds a number.
```yaml
score: "${round(average, 2)}"
```

#### `floor(n)` / `ceil(n)` / `abs(n)`
Standard math operations.
```yaml
level: "${floor(xp / 100)}"
```

#### `min(a, b, ...)` / `max(a, b, ...)`
Returns minimum/maximum value.
```yaml
capped: "${min(damage, 100)}"
```

#### `clamp(value, min, max)`
Clamps value between min and max.
```yaml
volume: "${clamp(requested, 0, 100)}"
```

### String Functions

#### `lower(s)` / `upper(s)`
Case conversion.
```yaml
content: "${upper(command)}"
```

#### `capitalize(s)` / `titleCase(s)`
Capitalizes first letter or each word.
```yaml
name: "${titleCase(user.username)}"
```

#### `trim(s)`
Removes leading/trailing whitespace.
```yaml
input: "${trim(options.text)}"
```

#### `truncate(s, length, suffix?)`
Truncates string with optional suffix.
```yaml
preview: "${truncate(message.content, 50, '...')}"
```

#### `padStart(s, length, char?)` / `padEnd(s, length, char?)`
Pads string to length.
```yaml
id: "${padStart(rank, 3, '0')}"
```

#### `replace(s, search, replacement)`
Replaces all occurrences.
```yaml
clean: "${replace(text, 'bad', '***')}"
```

#### `split(s, delimiter)` / `join(arr, delimiter?)`
Split string to array or join array to string.
```yaml
parts: "${split(input, ',')}"
text: "${join(names, ', ')}"
```

#### `includes(s, search)` / `startsWith(s, prefix)` / `endsWith(s, suffix)`
String search functions.
```yaml
condition: "includes(message.content, 'hello')"
```

#### `match(s, pattern)`
Tests if string matches regex pattern.
```yaml
condition: "match(message.content, '^!\\w+')"
```

### Array Functions

#### `length(arr)`
Returns array length.
```yaml
count: "${length(user.roles)}"
```

#### `first(arr)` / `last(arr)` / `nth(arr, n)`
Access array elements.
```yaml
top: "${first(leaderboard)}"
third: "${nth(leaderboard, 2)}"
```

#### `slice(arr, start, end?)`
Returns portion of array.
```yaml
top5: "${slice(leaderboard, 0, 5)}"
```

#### `reverse(arr)` / `sort(arr, key?)`
Reorder array.
```yaml
newest: "${reverse(messages)}"
byScore: "${sort(players, 'score')}"
```

#### `unique(arr)` / `flatten(arr)`
Array transformations.
```yaml
distinct: "${unique(tags)}"
```

#### `pick(arr)` / `shuffle(arr)`
Random selection.
```yaml
winner: "${pick(participants)}"
order: "${shuffle(queue)}"
```

#### `range(start, end, step?)`
Generates number sequence.
```yaml
nums: "${range(1, 10)}"
```

### Object Functions

#### `keys(obj)` / `values(obj)` / `entries(obj)`
Object iteration helpers.
```yaml
names: "${keys(settings)}"
```

#### `get(obj, path, default?)`
Safe property access with default.
```yaml
value: "${get(config, 'leveling.xpRate', 15)}"
```

#### `has(obj, key)` / `merge(...objs)`
Object utilities.
```yaml
condition: "has(options, 'reason')"
combined: "${merge(defaults, overrides)}"
```

### Type Functions

#### `type(value)`
Returns type name.
```yaml
debug: "Type: ${type(value)}"
```

#### `isNull(v)` / `isArray(v)` / `isString(v)` / `isNumber(v)` / `isBoolean(v)` / `isObject(v)`
Type checking.
```yaml
condition: "isArray(options.users)"
```

### Conversion Functions

#### `string(v)` / `number(v)` / `int(v)` / `float(v)` / `boolean(v)`
Type conversion.
```yaml
id: "${string(user.id)}"
count: "${int(options.amount)}"
```

#### `json(v)` / `parseJson(s)`
JSON serialization.
```yaml
data: "${json(stats)}"
config: "${parseJson(stored)}"
```

### Discord Functions

#### `mention(type, id)`
Creates Discord mention string.
```yaml
content: "Welcome ${mention('user', user.id)}!"
content: "Check ${mention('channel', rulesChannelId)}"
```

**Types:** `user`, `role`, `channel`, `emoji`

#### `formatNumber(n, locale?)`
Formats number with locale.
```yaml
count: "${formatNumber(memberCount)}"  # "1,234"
```

#### `ordinal(n)`
Adds ordinal suffix.
```yaml
rank: "${ordinal(position)}"  # "1st", "2nd", "3rd"
```

#### `pluralize(count, singular, plural?)`
Pluralizes based on count.
```yaml
content: "You have ${count} ${pluralize(count, 'warning')}"
```

#### `duration(ms)`
Formats milliseconds as human-readable duration.
```yaml
uptime: "${duration(client.uptime)}"  # "5h 30m"
```

### Utility Functions

#### `default(value, fallback)` / `coalesce(...values)`
Provides fallback values.
```yaml
name: "${default(nickname, username)}"
value: "${coalesce(a, b, c, 0)}"
```

#### `uuid()`
Generates random UUID.
```yaml
id: "${uuid()}"
```

#### `hash(s)`
Generates hash of string.
```yaml
code: "${hash(secret + timestamp())}"
```

## Transforms (Pipe Syntax)

Transforms use the pipe `|` operator for chained operations:

```yaml
# Single transform
content: "${username|upper}"

# Chained transforms
content: "${message.content|trim|truncate(50)|lower}"

# Transform with arguments
content: "${items|join(' | ')}"
```

### String Transforms
- `|lower` - Lowercase
- `|upper` - Uppercase
- `|capitalize` - Capitalize first letter
- `|trim` - Trim whitespace
- `|truncate(len, suffix?)` - Truncate with suffix
- `|split(delimiter)` - Split to array
- `|replace(search, replacement)` - Replace text
- `|padStart(len, char?)` - Pad start
- `|padEnd(len, char?)` - Pad end

### Array Transforms
- `|join(delimiter?)` - Join to string
- `|first` - First element
- `|last` - Last element
- `|nth(n)` - Nth element
- `|slice(start, end?)` - Slice array
- `|reverse` - Reverse order
- `|sort(key?)` - Sort array
- `|unique` - Remove duplicates
- `|flatten` - Flatten nested arrays
- `|filter(key, value)` - Filter by property
- `|map(key)` - Extract property values
- `|pluck(key)` - Alias for map
- `|pick` - Random element
- `|shuffle` - Randomize order

### Number Transforms
- `|round(decimals?)` - Round number
- `|floor` - Floor
- `|ceil` - Ceiling
- `|abs` - Absolute value
- `|format(locale?)` - Format with commas
- `|ordinal` - Add ordinal suffix (1st, 2nd)

### Object Transforms
- `|keys` - Get object keys
- `|values` - Get object values
- `|entries` - Get key-value pairs
- `|get(path, default?)` - Safe property access

### Type Transforms
- `|string` - Convert to string
- `|number` - Convert to number
- `|int` - Parse as integer
- `|float` - Parse as float
- `|boolean` - Convert to boolean
- `|json` - Serialize to JSON

### Utility Transforms
- `|default(fallback)` - Provide fallback
- `|length` - Get length
- `|size` - Get size (works on objects too)

### Date Transforms
- `|timestamp(format?)` - Format as Discord timestamp
- `|duration` - Format milliseconds as duration

### Discord Transforms
- `|mention(type?)` - Create mention (default: user)
- `|pluralize(singular, plural?)` - Pluralize word

## Examples

### Welcome Message
```yaml
content: |
  Welcome to **${guild.name}**, ${user.mention}!
  You are member #${guild.member_count|format}.
  Account created: ${timestamp(user.created_at, 'relative')}
```

### Level Up
```yaml
content: |
  Congratulations ${user.mention}!
  You reached level **${level}** and earned ${xpGained|format} XP!
  Total XP: ${totalXp|format}
  Rank: ${rank|ordinal} place
```

### Conditional Greeting
```yaml
content: "${hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'}, ${member.display_name}!"
```

### Moderation Log
```yaml
content: |
  **Action:** ${action|capitalize}
  **User:** ${target.mention} (${target.id})
  **Moderator:** ${moderator.mention}
  **Reason:** ${reason ?? 'No reason provided'}
  **Duration:** ${duration ? duration|duration : 'Permanent'}
```

### Leaderboard Entry
```yaml
content: "${rank|ordinal|padEnd(5)} | ${username|truncate(15)|padEnd(15)} | ${score|format|padStart(8)}"
```
