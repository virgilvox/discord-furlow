# FURLOW

**Declarative Discord Bot Framework**

[![Maintained by @virgilvox](https://img.shields.io/badge/maintained%20by-%40virgilvox-5865F2)](https://github.com/virgilvox)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Build powerful Discord bots with YAML. No code required.

```yaml
commands:
  - name: ping
    description: Check bot latency
    actions:
      - reply:
          content: "Pong! ${client.ws.ping}ms"
```

## Features

- **85 Actions**: messages, moderation, voice, channels, and more
- **71 Expression Functions**: date, math, string, array manipulation
- **50 Transforms**: pipe-based data transformations
- **59 Events** across Discord gateway, voice transitions, component interactions, and high-level FURLOW events (automod, scheduler, pipes)
- **Scoped State**: global, guild, channel, user, and member scopes
- **Flows**: reusable action sequences with parameters
- **External Integrations**: HTTP, WebSocket, MQTT, TCP/UDP, webhooks

## Quick Start

```bash
# Install the CLI
npm install -g @furlow/cli

# Create a bot
furlow init my-bot
cd my-bot

# Add your Discord credentials to .env
echo "DISCORD_TOKEN=your_token_here" > .env
echo "DISCORD_CLIENT_ID=your_client_id_here" >> .env

# Start
furlow start
```

## Example

```yaml
version: "0.1"

identity:
  name: "My Bot"

presence:
  status: online
  activity:
    type: playing
    text: "with FURLOW"

commands:
  - name: hello
    description: Greet someone
    options:
      - name: user
        type: user
        description: Who to greet
    actions:
      - reply:
          content: "Hello, ${options.user.display_name || options.user.username}!"

  - name: roll
    description: Roll a dice
    options:
      - name: sides
        type: integer
        description: Number of sides
        min_value: 2
        max_value: 100
    actions:
      - reply:
          content: "🎲 You rolled **${random(1, options.sides || 6)}**"

events:
  - event: guild_member_add
    actions:
      - send_message:
          channel: "${env.WELCOME_CHANNEL}"
          content: "Welcome ${member.display_name}!"
```

## CLI Commands

| Command | Description |
|---------|-------------|
| `furlow init [name]` | Create a new bot project |
| `furlow start [path]` | Run the bot |
| `furlow dev [path]` | Development mode with hot reload |
| `furlow validate <path>` | Validate YAML specification |
| `furlow add <builtin>` | Add builtin module |
| `furlow build [path]` | Bundle for deployment |
| `furlow export <path>` | Export Discord command JSON |

## Documentation

| Guide | Description |
|-------|-------------|
| [Installation](docs/guides/installation.md) | Setup and requirements |
| [Quick Start](docs/guides/quickstart.md) | Your first bot |
| [Configuration](docs/guides/configuration.md) | YAML specification |
| [Actions Reference](docs/reference/actions/) | All 85 actions |
| [Expressions Reference](docs/reference/expressions/) | Functions and transforms |
| [Events Reference](docs/reference/events.md) | Event types |
| [CLI Reference](docs/reference/cli.md) | Command-line interface |
| [Pipes Reference](docs/packages/pipes.md) | External integrations |
| [Examples](docs/examples/) | Complete bot examples |

## Packages

| Package | Description |
|---------|-------------|
| `furlow` | CLI tool |
| `@furlow/core` | Runtime engine |
| `@furlow/discord` | Discord.js adapter |
| `@furlow/schema` | TypeScript types |
| `@furlow/storage` | Database adapters |
| `@furlow/builtins` | Pre-built modules |
| `@furlow/pipes` | HTTP, WebSocket, MQTT, TCP/UDP, webhooks |
| `@furlow/testing` | Test utilities |

## Production deployment

A short checklist for shipping a bot to production. Each item lines up with
a runtime guarantee — skipping one usually shows up later as silent data
loss, an unscheduled feature, or a publicly forgeable session.

### Required environment

```bash
# Discord
DISCORD_TOKEN=...
DISCORD_CLIENT_ID=...

# Storage (pick one)
DATABASE_URL=postgres://user:pass@host:5432/furlow   # production
# or for single-server bots:
SQLITE_PATH=/var/lib/furlow/bot.db

# Dashboard (only if running the web UI)
DASHBOARD_SECRET=$(openssl rand -hex 32)             # required in NODE_ENV=production
DISCORD_CLIENT_SECRET=...
DISCORD_CALLBACK_URL=https://dashboard.example.com/auth/discord/callback
```

The dashboard refuses to start in `NODE_ENV=production` without
`DASHBOARD_SECRET` — there is no fallback default. WebSocket connections
also require an authenticated session; unauthenticated clients are rejected
at upgrade time and cannot subscribe to guild streams.

### Storage

- Use Postgres for any deployment that runs more than one process or needs
  point-in-time recovery. The SQLite adapter is fine for single-server bots
  and tests, but write contention degrades quickly past a few thousand
  active users.
- Run database migrations on deploy. The SQLite adapter creates tables on
  demand; Postgres deployments should pre-create the tables defined in your
  `state.tables:` block.
- Back up the database. Builtins persist real state (warnings, levels, AFK
  status, ticket transcripts); none of this is reconstructible.

### Scheduling and voice

- The CLI starts a `CronScheduler` that emits `scheduler_tick` every 60s.
  Builtins that rely on it (`giveaways`, `polls`, `reminders`) need the
  scheduler running — there is no separate cron process.
- Voice playback requires the `@discordjs/voice` peer plus `ffmpeg` on the
  PATH. The `voice_track_start` / `voice_track_end` events used by the
  `music` builtin only fire when the voice manager is initialized.

### Process supervision

- Run `furlow start` under a process supervisor (`systemd`, `pm2`,
  Kubernetes Deployment) that restarts on exit. The bot does not
  self-daemonize.
- Forward `SIGTERM` so the gateway connection closes cleanly. The CLI
  flushes pending state on shutdown; killing with `SIGKILL` can lose the
  last batched writes.

### Dashboard hardening

- Terminate TLS in front of the dashboard (nginx, Caddy, a load balancer).
  The session cookie sets `secure: true` in production and will not be
  delivered over plain HTTP.
- Restrict the OAuth callback URL in the Discord developer portal to the
  exact `DISCORD_CALLBACK_URL` you ship.
- POST endpoints whitelist their accepted fields and reject unknown or
  wrong-typed keys with 400. If you extend a settings shape, update the
  whitelist in `apps/dashboard/server/routes/api.ts`.

### Observability

- `/health` returns process uptime; wire it to your liveness probe.
- `/metrics` exposes Prometheus-format counters. Add a scrape job pointed
  at the dashboard process.
- The CLI honors `--verbose` for structured per-event logging during
  incident triage.

## License

MIT
