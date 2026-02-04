# TCP & UDP Pipes

Raw socket communication for custom protocols, with client and server modes.

## TCP Pipe

### Configuration

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `host` | string | required | Host to connect to (client) or bind (server) |
| `port` | number | required | Port number |
| `reconnect` | object | - | Reconnection settings (client mode) |
| `encoding` | string | `"utf8"` | Data encoding |
| `handlers` | array | - | Event handlers |

### Events

| Event | Description | Data |
|-------|-------------|------|
| `connected` | Connection established | - |
| `disconnected` | Connection closed | - |
| `data` | Data received | Buffer or string |
| `error` | Error occurred | Error object |
| `end` | Connection ended by remote | - |

### Example: Client Connection

```yaml
pipes:
  game_server:
    type: tcp
    host: "game.example.com"
    port: 7777
    encoding: utf8
    reconnect:
      enabled: true
      delay: "5s"
      max_attempts: 5
    handlers:
      - event: data
        actions:
          - set:
              scope: global
              var: "last_game_event"
              value: "${data}"
          - when: "data.includes('PLAYER_JOINED')"
            actions:
              - send_message:
                  channel: "game-events"
                  content: "New player joined the server!"
```

### Example: Send TCP Data

```yaml
commands:
  - name: rcon
    description: Send RCON command
    options:
      - name: command
        type: string
        required: true
    actions:
      - pipe_send:
          pipe: game_server
          data:
            message: "RCON ${options.command}\n"
      - reply:
          content: "Command sent"
```

### Example: TCP Server Mode

```yaml
pipes:
  tcp_server:
    type: tcp
    host: "0.0.0.0"
    port: 9000
    handlers:
      - event: connection
        actions:
          - log: "New client connected"
      - event: data
        actions:
          - when: "data.trim() == 'STATUS'"
            actions:
              - pipe_send:
                  pipe: tcp_server
                  data:
                    message: "OK: ${guild.member_count} members online"
```

### Request-Response Pattern

```yaml
commands:
  - name: query-server
    actions:
      - pipe_send:
          pipe: game_server
          data:
            message: "STATUS\n"
          timeout: "5s"
      - reply:
          content: "Server response: ${pipe_result.data}"
```

---

## UDP Pipe

Datagram communication with broadcast and multicast support.

### Configuration

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `host` | string | `"0.0.0.0"` | Host to bind to |
| `port` | number | required | Port number |
| `multicast` | string | - | Multicast group to join |
| `broadcast` | boolean | `false` | Enable broadcast |
| `handlers` | array | - | Message handlers |

### Example: Broadcast Discovery

```yaml
pipes:
  discovery:
    type: udp
    port: 5000
    broadcast: true
    handlers:
      - event: message
        when: "data.toString().startsWith('ANNOUNCE:')"
        actions:
          - set:
              scope: global
              var: "discovered_${rinfo.address}"
              value:
                address: "${rinfo.address}"
                port: "${rinfo.port}"
                name: "${data.toString().replace('ANNOUNCE:', '')}"

commands:
  - name: discover
    description: Discover local services
    actions:
      - pipe_send:
          pipe: discovery
          data:
            broadcast: true
            message: "DISCOVER"
            port: 5000
      - wait: "2s"
      - reply:
          content: "Found ${Object.keys(state.global).filter(k => k.startsWith('discovered_')).length} services"
```

### Example: Multicast Group

```yaml
pipes:
  game_lobby:
    type: udp
    port: 7788
    multicast: "239.255.255.250"
    handlers:
      - event: message
        actions:
          - send_message:
              channel: "game-lobby"
              content: "Lobby update from ${rinfo.address}: ${data.toString()}"

commands:
  - name: lobby-message
    options:
      - name: message
        type: string
    actions:
      - pipe_send:
          pipe: game_lobby
          data:
            multicast: true
            message: "${options.message}"
            port: 7788
```

### Example: Game Server Query

```yaml
pipes:
  query:
    type: udp
    port: 0  # Random port

commands:
  - name: server-info
    options:
      - name: ip
        type: string
      - name: port
        type: integer
    actions:
      - pipe_send:
          pipe: query
          data:
            host: "${options.ip}"
            port: "${options.port}"
            message: "\xFF\xFF\xFF\xFFTSource Engine Query\x00"
          timeout: "5s"
      - reply:
          content: "Server info: ${pipe_result.data}"
```
