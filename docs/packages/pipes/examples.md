# Pipe Examples

Real-world examples showing how to combine multiple pipes for complex integrations.

## GitHub Deploy Bot

Receive GitHub webhooks, post to Discord, and track deployments in a database.

```yaml
pipes:
  github:
    type: webhook
    path: "/webhooks/github"
    verification:
      type: hmac
      secret: "${env.GITHUB_WEBHOOK_SECRET}"
      header: "x-hub-signature-256"
    handlers:
      - event: push
        when: "body.ref == 'refs/heads/main'"
        actions:
          - call_flow:
              flow: handle_deploy

      - event: workflow_run
        when: "body.action == 'completed'"
        actions:
          - call_flow:
              flow: deploy_complete

  deployments:
    type: database
    adapter: sqlite
    connection: "./data/deployments.db"

flows:
  handle_deploy:
    actions:
      # Record deployment start
      - db_insert:
          table: deploys
          data:
            commit: "${body.head_commit.id}"
            author: "${body.head_commit.author.name}"
            message: "${body.head_commit.message}"
            status: "pending"
            started_at: "${now()}"
          as: deploy_record

      # Notify channel
      - send_message:
          channel: "deployments"
          embed:
            title: "Deployment Started"
            description: "${body.head_commit.message}"
            color: "#f0c040"
            fields:
              - name: "Commit"
                value: "`${body.head_commit.id | slice(0, 7)}`"
                inline: true
              - name: "Author"
                value: "${body.head_commit.author.name}"
                inline: true
            footer:
              text: "Deploy #${deploy_record.id}"

  deploy_complete:
    actions:
      # Update database
      - db_update:
          table: deploys
          where:
            commit: "${body.workflow_run.head_sha}"
          data:
            status: "${body.workflow_run.conclusion}"
            finished_at: "${now()}"

      # Notify based on result
      - flow_if:
          condition: "body.workflow_run.conclusion == 'success'"
          then:
            - send_message:
                channel: "deployments"
                embed:
                  title: "Deployment Successful"
                  color: "#8bd649"
                  description: "Deployed to production"
          else:
            - send_message:
                channel: "deployments"
                embed:
                  title: "Deployment Failed"
                  color: "#e05555"
                  description: "Check GitHub Actions for details"
                  url: "${body.workflow_run.html_url}"

commands:
  - name: deploy-status
    description: Check recent deployments
    actions:
      - db_query:
          table: deploys
          order_by: "started_at DESC"
          limit: 5
          as: recent
      - reply:
          embed:
            title: "Recent Deployments"
            description: |
              ${recent | map(d => '`' + d.commit.slice(0,7) + '` ' + d.status + ' - ' + d.message.slice(0,50)) | join('\n')}
```

---

## IoT Dashboard

Monitor sensors via MQTT and provide Discord commands to control devices.

```yaml
pipes:
  mqtt:
    type: mqtt
    broker: "mqtt.home.local"
    port: 1883
    auth:
      username: "${env.MQTT_USER}"
      password: "${env.MQTT_PASS}"
    will:
      topic: "discord-bot/status"
      payload: '{"online": false}'
      retain: true
    handlers:
      # Temperature alerts
      - topic: "home/+/temperature"
        when: "payload.value > 28"
        actions:
          - send_message:
              channel: "home-alerts"
              content: "🌡️ High temperature in ${topic.split('/')[1]}: ${payload.value}°C"

      # Motion detection
      - topic: "home/+/motion"
        when: "payload.detected == true"
        actions:
          - set:
              scope: global
              var: "last_motion_${topic.split('/')[1]}"
              value: "${now()}"
          - flow_if:
              condition: "state.global.away_mode == true"
              then:
                - send_message:
                    channel: "security"
                    content: "🚨 Motion detected in ${topic.split('/')[1]} while away!"

      # Door sensors
      - topic: "home/doors/+"
        actions:
          - set:
              scope: global
              var: "door_${topic.split('/')[2]}"
              value: "${payload.state}"

  sensors_db:
    type: database
    adapter: sqlite
    connection: "./data/sensors.db"
    handlers:
      - event: insert
        table: readings
        actions:
          # Keep only last 24 hours of data
          - db_delete:
              table: readings
              where:
                timestamp: "<datetime('now', '-24 hours')"

state:
  global:
    away_mode: false

commands:
  - name: home
    description: Home automation controls
    options:
      - name: action
        type: string
        choices: ["status", "lights", "away", "history"]
        required: true
      - name: room
        type: string
      - name: state
        type: string
        choices: ["on", "off"]
    actions:
      - flow_switch:
          value: "${options.action}"
          cases:
            status:
              - reply:
                  embed:
                    title: "Home Status"
                    fields:
                      - name: "Away Mode"
                        value: "${state.global.away_mode ? 'Enabled' : 'Disabled'}"
                        inline: true
                      - name: "Front Door"
                        value: "${state.global.door_front ?? 'Unknown'}"
                        inline: true

            lights:
              - pipe_send:
                  pipe: mqtt
                  data:
                    topic: "home/${options.room}/light/set"
                    message: "${options.state}"
                    qos: 1
              - reply:
                  content: "Lights ${options.state} in ${options.room}"

            away:
              - set:
                  scope: global
                  var: "away_mode"
                  value: "${!state.global.away_mode}"
              - reply:
                  content: "Away mode ${state.global.away_mode ? 'enabled' : 'disabled'}"

            history:
              - db_query:
                  table: readings
                  as: stats
              - reply:
                  embed:
                    title: "Last Hour Stats"
                    description: |
                      ${stats | map(s => '**' + s.room + '**: Avg ' + s.avg_temp.toFixed(1) + '°C, Max ' + s.max_temp.toFixed(1) + '°C') | join('\n')}
```

---

## Stock Price Alerts

Real-time stock monitoring with WebSocket and user preferences in database.

```yaml
pipes:
  stocks:
    type: websocket
    url: "wss://stream.example.com/stocks"
    headers:
      Authorization: "Bearer ${env.STOCK_API_KEY}"
    reconnect:
      enabled: true
      delay: "5s"
    handlers:
      - event: message
        when: "data.type == 'price_update'"
        actions:
          - call_flow:
              flow: check_alerts

  alerts_db:
    type: database
    adapter: sqlite
    connection: "./data/alerts.db"

flows:
  check_alerts:
    actions:
      # Get alerts for this symbol
      - db_query:
          table: price_alerts
          where:
            symbol: "${data.symbol}"
            triggered: 0
          as: alerts

      # Check each alert
      - batch:
          items: "${alerts}"
          as: alert
          each:
            - flow_if:
                condition: |
                  (alert.direction == 'above' && data.price >= alert.target) ||
                  (alert.direction == 'below' && data.price <= alert.target)
                then:
                  # Mark as triggered
                  - db_update:
                      table: price_alerts
                      where:
                        id: "${alert.id}"
                      data:
                        triggered: 1
                        triggered_at: "${now()}"
                        triggered_price: "${data.price}"

                  # Notify user
                  - send_dm:
                      user: "${alert.user_id}"
                      embed:
                        title: "Price Alert Triggered"
                        color: "${alert.direction == 'above' ? '#8bd649' : '#e05555'}"
                        fields:
                          - name: "Symbol"
                            value: "${data.symbol}"
                            inline: true
                          - name: "Price"
                            value: "$${data.price}"
                            inline: true
                          - name: "Target"
                            value: "${alert.direction} $${alert.target}"
                            inline: true

commands:
  - name: alert
    description: Set a price alert
    options:
      - name: symbol
        type: string
        required: true
      - name: direction
        type: string
        choices: ["above", "below"]
        required: true
      - name: price
        type: number
        required: true
    actions:
      - db_insert:
          table: price_alerts
          data:
            user_id: "${user.id}"
            symbol: "${options.symbol | upper}"
            direction: "${options.direction}"
            target: "${options.price}"
            triggered: 0
            created_at: "${now()}"
      - reply:
          content: "Alert set for ${options.symbol | upper} ${options.direction} $${options.price}"
          ephemeral: true

  - name: my-alerts
    description: View your price alerts
    actions:
      - db_query:
          table: price_alerts
          where:
            user_id: "${user.id}"
            triggered: 0
          order_by: "created_at DESC"
          as: alerts
      - reply:
          embed:
            title: "Your Active Alerts"
            description: |
              ${alerts.length > 0
                ? alerts | map(a => '**' + a.symbol + '** ' + a.direction + ' $' + a.target) | join('\n')
                : 'No active alerts'}
          ephemeral: true
```

---

## Log Monitoring & Alerting

Watch log files and send alerts to Discord with error aggregation.

```yaml
pipes:
  logs:
    type: file
    paths:
      - "/var/log/myapp/*.log"
      - "/var/log/nginx/error.log"
    usePolling: true
    handlers:
      - event: change
        actions:
          - call_flow:
              flow: process_log_change

  errors_db:
    type: database
    adapter: sqlite
    connection: "./data/errors.db"

  pagerduty:
    type: http
    base_url: "https://events.pagerduty.com/v2"

state:
  global:
    error_count_1h: 0
    last_alert_time: 0

flows:
  process_log_change:
    actions:
      # Read new lines (simplified - real impl would track position)
      - shell:
          command: "tail -n 20 ${path}"
          as: new_lines

      # Check for errors
      - flow_if:
          condition: "new_lines.includes('ERROR') || new_lines.includes('FATAL')"
          then:
            # Extract error lines
            - set:
                scope: local
                var: "errors"
                value: "${new_lines.split('\\n').filter(l => l.includes('ERROR') || l.includes('FATAL'))}"

            # Store in database
            - batch:
                items: "${errors}"
                as: error_line
                each:
                  - db_insert:
                      table: errors
                      data:
                        file: "${path}"
                        message: "${error_line}"
                        timestamp: "${now()}"

            # Increment counter
            - increment:
                scope: global
                var: "error_count_1h"
                by: "${errors.length}"

            # Alert if threshold exceeded
            - flow_if:
                condition: "state.global.error_count_1h > 10 && (now() - state.global.last_alert_time) > 300000"
                then:
                  - set:
                      scope: global
                      var: "last_alert_time"
                      value: "${now()}"

                  - send_message:
                      channel: "alerts"
                      embed:
                        title: "High Error Rate"
                        color: "#e05555"
                        description: "${state.global.error_count_1h} errors in the last hour"
                        fields:
                          - name: "Latest Error"
                            value: "```${errors[0].slice(0, 200)}```"

                  # PagerDuty alert for critical
                  - flow_if:
                      condition: "state.global.error_count_1h > 50"
                      then:
                        - pipe_request:
                            pipe: pagerduty
                            method: POST
                            path: "/enqueue"
                            body:
                              routing_key: "${env.PAGERDUTY_KEY}"
                              event_action: "trigger"
                              payload:
                                summary: "High error rate: ${state.global.error_count_1h} errors/hour"
                                severity: "critical"
                                source: "discord-bot"

# Reset counter every hour
scheduler:
  - cron: "0 * * * *"
    actions:
      - set:
          scope: global
          var: "error_count_1h"
          value: 0

commands:
  - name: errors
    description: View recent errors
    options:
      - name: count
        type: integer
        default: 10
    actions:
      - db_query:
          table: errors
          order_by: "timestamp DESC"
          limit: "${options.count}"
          as: errors
      - reply:
          embed:
            title: "Recent Errors"
            description: |
              ${errors | map(e => '`' + e.timestamp.slice(11,19) + '` ' + e.message.slice(0,80)) | join('\n')}
```

---

## Multi-Platform Chat Bridge

Bridge messages between Discord and an external chat platform via WebSocket.

```yaml
pipes:
  external_chat:
    type: websocket
    url: "wss://chat.example.com/bridge"
    headers:
      X-Bot-Token: "${env.CHAT_BRIDGE_TOKEN}"
    reconnect:
      enabled: true
      max_attempts: 20
    heartbeat:
      interval: "30s"
      message: '{"type":"ping"}'
    handlers:
      - event: open
        actions:
          - pipe_send:
              pipe: external_chat
              data:
                type: "subscribe"
                channels: ["general", "random", "dev"]

      - event: message
        when: "data.type == 'chat_message'"
        actions:
          # Map external channel to Discord
          - set:
              scope: local
              var: "discord_channel"
              value: "${state.global.channel_map[data.channel] ?? null}"

          - flow_if:
              condition: "discord_channel != null"
              then:
                - send_message:
                    channel: "${discord_channel}"
                    embed:
                      author:
                        name: "${data.user.name} (External)"
                        icon_url: "${data.user.avatar}"
                      description: "${data.content}"
                      color: "#5865F2"
                      footer:
                        text: "From #${data.channel}"

state:
  global:
    channel_map:
      general: "123456789"  # Discord channel IDs
      random: "234567890"
      dev: "345678901"

# Bridge Discord messages to external
events:
  - event: message_create
    when: |
      message.channel.id in Object.values(state.global.channel_map) &&
      message.author.bot == false
    actions:
      # Find external channel name
      - set:
          scope: local
          var: "external_channel"
          value: "${Object.entries(state.global.channel_map).find(([k,v]) => v == message.channel.id)?.[0]}"

      - flow_if:
          condition: "external_channel != null"
          then:
            - pipe_send:
                pipe: external_chat
                data:
                  type: "chat_message"
                  channel: "${external_channel}"
                  user:
                    id: "${message.author.id}"
                    name: "${message.author.username}"
                    avatar: "${message.author.displayAvatarURL()}"
                  content: "${message.content}"

commands:
  - name: bridge
    description: Manage chat bridge
    options:
      - name: action
        type: string
        choices: ["status", "link", "unlink"]
        required: true
      - name: external
        type: string
      - name: discord
        type: channel
    actions:
      - flow_switch:
          value: "${options.action}"
          cases:
            status:
              - reply:
                  embed:
                    title: "Bridge Status"
                    description: |
                      ${Object.entries(state.global.channel_map)
                        | map(([ext, disc]) => '`' + ext + '` ↔ <#' + disc + '>')
                        | join('\n')}

            link:
              - set_map:
                  scope: global
                  var: "channel_map"
                  map_key: "${options.external}"
                  value: "${options.discord.id}"
              - reply:
                  content: "Linked `${options.external}` to ${options.discord}"

            unlink:
              - delete_map:
                  scope: global
                  var: "channel_map"
                  map_key: "${options.external}"
              - reply:
                  content: "Unlinked `${options.external}`"
```
