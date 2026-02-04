# Scaling Guide

Deploy FURLOW bots at scale with sharding and distributed architecture.

## When to Scale

Consider scaling when:

- Bot is in **2,500+ servers** (Discord requires sharding)
- **High event volume** causes lag
- **Memory usage** exceeds available RAM
- Need **high availability** (zero downtime)

## Sharding

### What is Sharding?

Sharding splits your bot across multiple processes, each handling a subset of guilds. Discord requires sharding for bots in 2,500+ servers.

### Basic Sharding

```yaml
# furlow.config.yaml
sharding:
  enabled: true
  total_shards: auto  # Discord recommends
  # Or specify manually:
  # total_shards: 4
```

### Manual Shard Management

```typescript
import { ShardingManager } from '@furlow/core';

const manager = new ShardingManager('./furlow.yaml', {
  totalShards: 4,
  token: process.env.DISCORD_TOKEN,
});

manager.on('shardCreate', (shard) => {
  console.log(`Shard ${shard.id} launched`);
});

await manager.spawn();
```

### Shard-Specific Configuration

```yaml
# Access shard info in expressions
presence:
  activity:
    name: "Shard ${client.shard.ids[0]}/${client.shard.count}"
```

## Cross-Shard Communication

### Using Redis

```yaml
# furlow.config.yaml
sharding:
  enabled: true
  broker:
    type: redis
    url: "${env.REDIS_URL}"
```

### Broadcast to All Shards

```typescript
// From any shard
await client.shard.broadcastEval((c) => {
  c.guilds.cache.forEach((g) => g.systemChannel?.send('Announcement!'));
});
```

### Fetch Cross-Shard Data

```yaml
actions:
  - shard_eval:
      script: "guilds.size"
      as: shard_guild_counts
  - set:
      var: total_guilds
      value: "${shard_guild_counts | sum}"
  - reply:
      content: "Total guilds across all shards: ${total_guilds}"
```

## Distributed State

### Redis State Backend

```yaml
state:
  storage:
    type: redis
    url: "${env.REDIS_URL}"
    prefix: "furlow:"
```

### PostgreSQL for Persistence

```yaml
state:
  storage:
    type: postgres
    connection: "${env.DATABASE_URL}"
    pool:
      min: 2
      max: 10
```

## Load Balancing

### Multiple Bot Instances

```yaml
# docker-compose.yml
services:
  furlow-1:
    image: furlow-bot
    environment:
      SHARD_ID: 0
      TOTAL_SHARDS: 4

  furlow-2:
    image: furlow-bot
    environment:
      SHARD_ID: 1
      TOTAL_SHARDS: 4

  furlow-3:
    image: furlow-bot
    environment:
      SHARD_ID: 2
      TOTAL_SHARDS: 4

  furlow-4:
    image: furlow-bot
    environment:
      SHARD_ID: 3
      TOTAL_SHARDS: 4
```

### Kubernetes Deployment

```yaml
# k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: furlow-bot
spec:
  replicas: 4
  selector:
    matchLabels:
      app: furlow-bot
  template:
    metadata:
      labels:
        app: furlow-bot
    spec:
      containers:
        - name: furlow
          image: your-registry/furlow-bot:latest
          env:
            - name: SHARD_ID
              valueFrom:
                fieldRef:
                  fieldPath: metadata.name
            - name: TOTAL_SHARDS
              value: "4"
            - name: DISCORD_TOKEN
              valueFrom:
                secretKeyRef:
                  name: discord-secrets
                  key: token
            - name: REDIS_URL
              value: "redis://redis-service:6379"
          resources:
            requests:
              memory: "256Mi"
              cpu: "200m"
            limits:
              memory: "512Mi"
              cpu: "500m"
```

## High Availability

### Health Checks

```yaml
# furlow.config.yaml
health:
  enabled: true
  port: 8080
  path: /health
  checks:
    - discord_gateway
    - database
    - redis
```

### Graceful Shutdown

```typescript
import { Furlow } from '@furlow/core';

const furlow = new Furlow({ token: process.env.DISCORD_TOKEN });

process.on('SIGTERM', async () => {
  console.log('Shutting down gracefully...');
  await furlow.destroy();
  process.exit(0);
});
```

### Auto-Restart on Failure

```yaml
# docker-compose.yml
services:
  furlow:
    image: furlow-bot
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/health"]
      interval: 30s
      timeout: 10s
      retries: 3
```

## Monitoring at Scale

### Prometheus Metrics

```yaml
analytics:
  prometheus:
    enabled: true
    port: 9090
    labels:
      shard_id: "${client.shard.ids[0]}"
      environment: production
```

### Grafana Dashboard

Key metrics to monitor:

- **Gateway latency** - Discord API response time
- **Event processing time** - Time to handle events
- **Memory usage** - Per-shard memory
- **Command usage** - Popular commands
- **Error rate** - Errors per minute

### Logging

```yaml
logging:
  level: info
  format: json  # For log aggregation
  outputs:
    - type: console
    - type: file
      path: /var/log/furlow/bot.log
      rotate: daily
    - type: loki
      url: "${env.LOKI_URL}"
```

## Database Scaling

### Connection Pooling

```yaml
state:
  storage:
    type: postgres
    connection: "${env.DATABASE_URL}"
    pool:
      min: 5
      max: 20
      idle_timeout: 30000
```

### Read Replicas

```yaml
state:
  storage:
    type: postgres
    primary: "${env.DATABASE_PRIMARY_URL}"
    replicas:
      - "${env.DATABASE_REPLICA_1_URL}"
      - "${env.DATABASE_REPLICA_2_URL}"
    read_from_replicas: true
```

### Database Migrations

```bash
# Run migrations before deploying new version
furlow migrate:run

# Rollback if needed
furlow migrate:rollback
```

## Caching Layer

### Redis Caching

```yaml
cache:
  enabled: true
  backend: redis
  url: "${env.REDIS_URL}"
  default_ttl: 5m

  # Cache specific data
  rules:
    - pattern: "user:*"
      ttl: 10m
    - pattern: "guild:*"
      ttl: 5m
    - pattern: "leaderboard:*"
      ttl: 1m
```

### Cache Invalidation

```yaml
events:
  - event: guild_member_update
    actions:
      - cache_invalidate:
          pattern: "member:${member.guild.id}:${member.id}"
```

## Deployment Strategies

### Blue-Green Deployment

1. Deploy new version to "green" environment
2. Run health checks
3. Switch load balancer to green
4. Keep blue as rollback

### Rolling Updates

```yaml
# k8s/deployment.yaml
spec:
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
```

### Canary Releases

1. Deploy new version to 1 shard
2. Monitor for errors
3. Gradually roll out to more shards
4. Full deployment or rollback

## Cost Optimization

### Resource Right-Sizing

- Start small, scale up as needed
- Use auto-scaling based on metrics
- Schedule non-critical tasks off-peak

### Caching to Reduce API Calls

- Cache Discord API responses
- Cache database queries
- Use CDN for static assets

## Checklist

Before scaling:

- [ ] Enable sharding in config
- [ ] Set up Redis for cross-shard state
- [ ] Configure PostgreSQL with connection pooling
- [ ] Set up health checks
- [ ] Configure monitoring (Prometheus/Grafana)
- [ ] Set up log aggregation
- [ ] Test graceful shutdown
- [ ] Document deployment process
- [ ] Create runbooks for common issues

## Next Steps

- [Performance Guide](performance.md) - Optimize before scaling
- [Debugging Guide](debugging.md) - Troubleshoot scaled deployments
- [Custom Actions](custom-actions.md) - Write scalable actions
