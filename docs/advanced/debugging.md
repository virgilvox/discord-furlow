# Debugging Guide

Troubleshoot common issues and debug FURLOW bots effectively.

## Common Issues

### Bot Not Responding to Commands

**Symptoms**: Commands don't appear or don't respond

**Solutions**:

1. **Check bot permissions**
   ```yaml
   # Ensure bot has required intents
   intents:
     - GUILDS
     - GUILD_MESSAGES
     - MESSAGE_CONTENT  # Required for prefix commands
   ```

2. **Verify command registration**
   ```bash
   furlow commands:list
   furlow commands:sync --guild 123456789  # Sync to test server
   ```

3. **Check for errors in logs**
   ```bash
   furlow start --log-level debug
   ```

4. **Verify token is correct**
   ```bash
   # Token should be in .env
   echo $DISCORD_TOKEN | head -c 20
   ```

### Expression Errors

**Symptoms**: `Expression evaluation failed` errors

**Common causes**:

1. **Undefined variables**
   ```yaml
   # Bad: options.user might be undefined
   content: "${options.user.tag}"

   # Good: Use optional chaining
   content: "${options.user?.tag || 'No user'}"
   ```

2. **Type mismatches**
   ```yaml
   # Bad: Comparing number to string
   when: "state.guild.level === '5'"

   # Good: Consistent types
   when: "state.guild.level === 5"
   ```

3. **Missing state initialization**
   ```yaml
   # Initialize state with defaults
   state:
     variables:
       counter:
         scope: guild
         default: 0  # Always provide default
   ```

### State Not Persisting

**Symptoms**: State resets after restart

**Solutions**:

1. **Use persistent storage**
   ```yaml
   state:
     storage:
       type: sqlite  # Not 'memory'
       path: ./data.db
   ```

2. **Check file permissions**
   ```bash
   ls -la ./data.db
   chmod 644 ./data.db
   ```

3. **Verify scope is correct**
   ```yaml
   # Guild state persists per-server
   - set:
       var: setting
       scope: guild  # Not missing
       value: true
   ```

### Actions Not Executing

**Symptoms**: Actions silently fail

**Debug steps**:

1. **Add logging**
   ```yaml
   actions:
     - log:
         level: debug
         message: "Starting action sequence"
     - reply:
         content: "Hello"
     - log:
         level: debug
         message: "Reply sent"
   ```

2. **Check `when` conditions**
   ```yaml
   # This might never be true
   when: "member.permissions.has('ADMINISTRATOR')"

   # Debug: Log the actual value
   - log:
       message: "Has admin: ${member.permissions.has('ADMINISTRATOR')}"
   ```

3. **Handle errors explicitly**
   ```yaml
   actions:
     - try:
         do:
           - risky_action
         catch:
           - log:
               level: error
               message: "Action failed: ${error.message}"
   ```

### High Memory Usage

**Symptoms**: Bot crashes or slows down

**Solutions**:

1. **Limit cache sizes**
   ```yaml
   client:
     cache:
       guilds: 1000
       channels: 5000
       messages: 100
   ```

2. **Clean up timers**
   ```yaml
   # Cancel unused timers
   - cancel_timer:
       id: "old_timer_${id}"
   ```

3. **Use pagination for large data**
   ```yaml
   # Bad: Load all at once
   - db_query:
       table: users
       as: all_users

   # Good: Paginate
   - db_query:
       table: users
       limit: 100
       offset: "${page * 100}"
       as: users
   ```

## Debugging Tools

### Debug Mode

```bash
# Start with debug logging
furlow start --log-level debug

# Or in config
logging:
  level: debug
```

### REPL Mode

```bash
# Interactive REPL for testing expressions
furlow repl

> evaluate "${1 + 1}"
2

> evaluate "${user.tag}"
Error: user is not defined in this context

> context.user = { tag: 'Test#0000' }
> evaluate "${user.tag}"
Test#0000
```

### Dry Run

```bash
# Validate spec without starting bot
furlow validate furlow.yaml

# Check specific section
furlow validate furlow.yaml --section commands
```

### Event Inspector

```yaml
# Log all events for debugging
events:
  - event: "*"
    when: "env.DEBUG_EVENTS === 'true'"
    actions:
      - log:
          level: debug
          message: "Event: ${event.type} - ${JSON.stringify(event.data).slice(0, 200)}"
```

## Debugging Expressions

### Log Expression Values

```yaml
actions:
  - log:
      message: |
        Debug:
        - user.id: ${user.id}
        - options: ${JSON.stringify(options)}
        - state: ${JSON.stringify(state.guild)}
```

### Test Expressions in Isolation

```typescript
import { evaluateExpression } from '@furlow/core';

const result = await evaluateExpression('${1 + 1}', {
  user: { id: '123', tag: 'Test#0000' },
  guild: { id: '456' },
});
console.log(result); // 2
```

### Common Expression Mistakes

```yaml
# Wrong: Missing ${}
content: "Hello user.username"

# Correct:
content: "Hello ${user.username}"

# Wrong: Extra braces
content: "${{user.username}}"

# Correct:
content: "${user.username}"

# Wrong: JavaScript syntax in YAML
when: "user.id == '123'"

# Correct: Expression syntax
when: "user.id === '123'"
```

## Debugging State

### Inspect State

```yaml
commands:
  - name: debug-state
    actions:
      - reply:
          content: |
            Guild state:
            \`\`\`json
            ${JSON.stringify(state.guild, null, 2)}
            \`\`\`
          ephemeral: true
```

### State Migration

```bash
# Export current state
furlow state:export --output state-backup.json

# Import state (after schema changes)
furlow state:import --input state-backup.json
```

## Debugging Actions

### Action Timing

```yaml
flows:
  timed_action:
    actions:
      - set:
          var: start
          value: "${Date.now()}"
      - # ... your actions
      - log:
          message: "Completed in ${Date.now() - start}ms"
```

### Action Tracing

```yaml
# Enable action tracing
debug:
  trace_actions: true
  trace_output: ./traces/

# Output:
# [2024-01-15T10:30:00Z] ACTION: reply
# [2024-01-15T10:30:00Z]   config: { content: "Hello" }
# [2024-01-15T10:30:01Z]   result: { id: "123456789" }
# [2024-01-15T10:30:01Z]   duration: 150ms
```

## Debugging Events

### Event Logging

```yaml
events:
  - event: message_create
    actions:
      - log:
          level: debug
          message: |
            Message event:
            - Author: ${message.author.tag}
            - Content: ${message.content.slice(0, 100)}
            - Channel: ${message.channel.name}
```

### Event Filtering Issues

```yaml
# Debug why event isn't firing
events:
  - event: message_create
    actions:
      - log:
          message: "Event received, checking when..."
      - flow_if:
          condition: "message.content.startsWith('!')"
          then:
            - log:
                message: "Condition passed!"
          else:
            - log:
                message: "Condition failed: content = '${message.content}'"
```

## Error Handling

### Global Error Handler

```yaml
errors:
  log_errors: true
  default_handler: error_handler

flows:
  error_handler:
    actions:
      - log:
          level: error
          message: |
            Error in ${error.source}:
            ${error.message}
            Stack: ${error.stack}
      - send_dm:
          user: "${env.OWNER_ID}"
          content: "Bot error: ${error.message}"
```

### Action-Level Error Handling

```yaml
actions:
  - try:
      do:
        - pipe_request:
            pipe: external_api
            path: /data
            as: result
      catch:
        - log:
            level: warn
            message: "API failed: ${error.message}"
        - set:
            var: result
            value: null
```

## Getting Help

### Collect Debug Info

```bash
# Generate debug report
furlow debug:report > debug-report.txt
```

Report includes:
- FURLOW version
- Node.js version
- OS information
- Sanitized configuration
- Recent error logs

### Community Resources

- **Discord Server**: Join for live help
- **GitHub Issues**: Report bugs
- **Documentation**: Check reference guides

### When Reporting Issues

Include:
1. FURLOW version (`furlow --version`)
2. Minimal reproducible example
3. Full error message and stack trace
4. Expected vs actual behavior
5. Steps to reproduce

## Next Steps

- [Performance Guide](performance.md) - Optimize bot performance
- [Custom Actions](custom-actions.md) - Debug custom code
- [Scaling Guide](scaling.md) - Debug distributed deployments
