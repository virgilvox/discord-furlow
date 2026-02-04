# Performance Optimization

Best practices for building high-performance FURLOW bots.

## Expression Optimization

### Cache Complex Expressions

Expensive expressions are re-evaluated each time. Cache when possible:

```yaml
# Bad: Evaluates complex filter on every message
events:
  - event: message_create
    when: "${guild.members.cache.filter(m => m.roles.has(adminRole)).size > 0}"

# Good: Cache the result
flows:
  cache_admin_count:
    actions:
      - set:
          var: admin_count
          scope: guild
          value: "${guild.members.cache.filter(m => m.roles.has(adminRole)).size}"

# Use cached value
events:
  - event: message_create
    when: "${state.guild.admin_count > 0}"
```

### Avoid Expensive Operations in `when`

```yaml
# Bad: Fetches from API on every event
events:
  - event: message_create
    when: "${await fetchUserLevel(user.id) > 10}"

# Good: Use cached state
events:
  - event: message_create
    when: "${state.member.level > 10}"
```

### Use Short-Circuit Evaluation

```yaml
# Good: Checks cheap condition first
when: "${message.content.length > 0 && expensiveCheck(message.content)}"

# Bad: Expensive check runs even on empty messages
when: "${expensiveCheck(message.content) && message.content.length > 0}"
```

## State Management

### Batch State Updates

```yaml
# Bad: Multiple state writes
actions:
  - set: { var: points, value: "${state.member.points + 10}" }
  - set: { var: level, value: "${calculateLevel(state.member.points + 10)}" }
  - set: { var: last_active, value: "${now()}" }

# Good: Single state write with object
actions:
  - set:
      var: user_data
      scope: member
      value: |
        ${{
          points: state.member.points + 10,
          level: calculateLevel(state.member.points + 10),
          last_active: now()
        }}
```

### Use Appropriate Scopes

| Scope | Use Case | Performance |
|-------|----------|-------------|
| `global` | Bot-wide settings | Fastest |
| `guild` | Per-server data | Fast |
| `channel` | Channel settings | Fast |
| `user` | Cross-server user data | Medium |
| `member` | Per-user per-server | Medium |

### Clean Up Old State

```yaml
# Periodically clean old data
scheduler:
  tasks:
    - name: cleanup
      cron: "0 0 * * *"  # Daily
      actions:
        - db_delete:
            table: state
            where:
              last_active: { $lt: "${now() - days(30)}" }
```

## Database Optimization

### Use Indexes

For SQLite/PostgreSQL storage, ensure proper indexes:

```yaml
state:
  storage:
    type: postgres
    connection: "${env.DATABASE_URL}"
    indexes:
      - { table: member_state, columns: [guild_id, user_id] }
      - { table: guild_state, columns: [guild_id, key] }
```

### Batch Database Operations

```yaml
# Bad: Individual inserts in loop
actions:
  - batch:
      items: "${users}"
      actions:
        - db_insert:
            table: users
            data: "${item}"

# Good: Bulk insert
actions:
  - db_insert:
      table: users
      data: "${users}"
      batch: true
```

### Limit Query Results

```yaml
# Always use limits
actions:
  - db_query:
      table: leaderboard
      order: { points: desc }
      limit: 10  # Don't fetch entire table
      as: top_users
```

## Event Handling

### Use Throttling and Debouncing

```yaml
events:
  # Rate limit per user
  - event: message_create
    throttle: 5s
    actions:
      - increment:
          var: message_count

  # Wait for user to stop typing
  - event: typing_start
    debounce: 2s
    actions:
      - log:
          message: "User stopped typing"
```

### Filter Events Early

```yaml
# Good: Filter in when clause
events:
  - event: message_create
    when: "${!message.author.bot && message.content.startsWith('!')}"
    actions:
      - # Process command

# Bad: Filter in actions
events:
  - event: message_create
    actions:
      - flow_if:
          condition: "${message.author.bot}"
          then:
            - abort
      - flow_if:
          condition: "${!message.content.startsWith('!')}"
          then:
            - abort
      - # Process command
```

### Avoid Heavy Processing in Events

```yaml
# Bad: Heavy processing blocks event loop
events:
  - event: message_create
    actions:
      - canvas_render:  # Slow
          generator: complex_image
      - # More actions wait for canvas

# Good: Defer heavy work
events:
  - event: message_create
    actions:
      - defer
      - canvas_render:
          generator: complex_image
      - update_message:
          content: "Here's your image"
```

## Action Optimization

### Use Parallel Execution

```yaml
# Good: Independent actions run in parallel
actions:
  - parallel:
      actions:
        - send_message:
            channel: "${channel1}"
            content: "Message 1"
        - send_message:
            channel: "${channel2}"
            content: "Message 2"
        - assign_role:
            role: "${role}"
```

### Batch Similar Operations

```yaml
# Bad: Multiple reaction adds
actions:
  - add_reaction: { emoji: "1️⃣" }
  - add_reaction: { emoji: "2️⃣" }
  - add_reaction: { emoji: "3️⃣" }

# Good: Batch reactions
actions:
  - add_reactions:
      emojis: ["1️⃣", "2️⃣", "3️⃣"]
```

### Avoid Unnecessary API Calls

```yaml
# Bad: Fetches user even if not needed
actions:
  - set:
      var: user_data
      value: "${guild.members.fetch(options.user.id)}"
  - flow_if:
      condition: "${options.show_info}"
      then:
        - reply:
            content: "${user_data.displayName}"

# Good: Only fetch when needed
actions:
  - flow_if:
      condition: "${options.show_info}"
      then:
        - set:
            var: user_data
            value: "${guild.members.fetch(options.user.id)}"
        - reply:
            content: "${user_data.displayName}"
```

## Caching

### Enable Response Caching

```yaml
pipes:
  - name: api
    type: http
    url: https://api.example.com
    cache:
      enabled: true
      ttl: 5m
      max_size: 1000
```

### Cache Computed Values

```yaml
flows:
  get_leaderboard:
    cache:
      ttl: 1m
      key: "leaderboard_${guild.id}"
    actions:
      - db_query:
          table: members
          order: { xp: desc }
          limit: 10
          as: result
      - return:
          value: "${result}"
```

## Memory Management

### Clean Up Timers

```yaml
# Cancel timers when no longer needed
actions:
  - cancel_timer:
      id: "reminder_${reminder.id}"
```

### Limit Collection Sizes

```yaml
state:
  variables:
    recent_messages:
      scope: channel
      type: array
      max_size: 100  # Limit array growth
```

### Use Streaming for Large Data

```yaml
# For large file operations
actions:
  - pipe_request:
      pipe: api
      path: /large-data
      stream: true
      as: data_stream
```

## Monitoring

### Track Performance Metrics

```yaml
analytics:
  enabled: true
  prometheus:
    enabled: true
    port: 9090
    path: /metrics

# Custom metrics
actions:
  - record_metric:
      name: command_latency
      type: histogram
      value: "${Date.now() - interaction.createdTimestamp}"
      labels:
        command: "${interaction.commandName}"
```

### Log Slow Operations

```yaml
# Add timing to flows
flows:
  my_flow:
    actions:
      - set:
          var: start_time
          value: "${Date.now()}"
      - # ... flow actions
      - log:
          level: debug
          message: "Flow completed in ${Date.now() - start_time}ms"
```

## Scaling Tips

1. **Use sharding** for large bots (2500+ guilds)
2. **Separate database** from bot process
3. **Use Redis** for cross-shard state
4. **Deploy multiple instances** behind load balancer
5. **Monitor memory usage** and restart on high usage

See [Scaling Guide](scaling.md) for multi-shard deployment.

## Next Steps

- [Scaling Guide](scaling.md) - Multi-shard deployment
- [Debugging Guide](debugging.md) - Troubleshooting performance
- [Custom Actions](custom-actions.md) - Optimize custom code
