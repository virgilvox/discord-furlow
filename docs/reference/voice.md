# Voice Reference

Add voice channel features to your FURLOW bot including music playback, audio recording, and TTS.

## Overview

FURLOW's voice system is built on [@discordjs/voice](https://discord.js.org/docs/packages/voice/main) and provides:

- Voice channel joining/leaving
- Audio playback from multiple sources
- Queue management with shuffle, loop, and more
- Volume control and audio filters
- Voice state tracking

## Configuration

Enable voice features in your bot:

```yaml
voice:
  enabled: true
  default_volume: 50        # 0-100
  max_queue_size: 100       # Max songs per guild
  leave_on_empty: true      # Leave when channel is empty
  leave_delay: "5m"         # Wait before leaving
  inactivity_timeout: "10m" # Leave after no playback

  # Audio sources
  sources:
    youtube: true
    soundcloud: true
    spotify: true           # Requires credentials
    direct_url: true

  # Spotify credentials (optional)
  spotify:
    client_id: "${env.SPOTIFY_CLIENT_ID}"
    client_secret: "${env.SPOTIFY_CLIENT_SECRET}"
```

## Voice Actions

### Connection Actions

#### `voice_join`

Join a voice channel.

```yaml
- voice_join:
    channel: "${member.voice.channel_id}"
    self_deaf: true           # Bot deafens itself
  self_mute: false          # Bot mutes itself
  as: connection            # Store connection reference
```

**Join with options:**

```yaml
- action: voice_join
  channel: "${voiceChannel.id}"
  self_deaf: true
  timeout: "10s"            # Connection timeout
  reconnect: true           # Auto-reconnect on disconnect
```

#### `voice_leave`

Leave the voice channel.

```yaml
- action: voice_leave
  guild: "${guild.id}"
```

#### `voice_move`

Move to a different voice channel.

```yaml
- action: voice_move
  channel: "${newChannel.id}"
```

### Playback Actions

#### `voice_play`

Play audio directly.

```yaml
- action: voice_play
  source: "https://example.com/audio.mp3"
  volume: 50
  seek: "30s"               # Start position
```

**Source types:**

```yaml
# Direct URL (MP3, OGG, WebM, etc.)
source: "https://example.com/audio.mp3"

# YouTube video
source: "https://youtube.com/watch?v=dQw4w9WgXcQ"

# YouTube search
source: "ytsearch:never gonna give you up"

# Spotify track (requires credentials)
source: "https://open.spotify.com/track/..."

# SoundCloud
source: "https://soundcloud.com/artist/track"

# Local file
source: "file://./sounds/alert.mp3"
```

#### `voice_search`

Search for tracks.

```yaml
- action: voice_search
  query: "never gonna give you up"
  source: youtube           # youtube, soundcloud, spotify
  limit: 5
  as: results
```

**Result structure:**

```javascript
{
  title: "Never Gonna Give You Up",
  author: "Rick Astley",
  duration: 213000,         // milliseconds
  url: "https://...",
  thumbnail: "https://...",
  source: "youtube"
}
```

#### `voice_pause`

Pause playback.

```yaml
- action: voice_pause
```

#### `voice_resume`

Resume playback.

```yaml
- action: voice_resume
```

#### `voice_stop`

Stop playback and clear queue.

```yaml
- action: voice_stop
```

#### `voice_skip`

Skip to the next track.

```yaml
- action: voice_skip
  count: 1                  # Number of tracks to skip
```

#### `voice_seek`

Seek to a position in the current track.

```yaml
- action: voice_seek
  position: "1m30s"
```

**Position formats:**
- Seconds: `90` or `"90s"`
- Minutes: `"1m30s"` or `"1:30"`
- Hours: `"1h2m30s"` or `"1:02:30"`
- Percentage: `"50%"`

#### `voice_volume`

Set playback volume.

```yaml
- action: voice_volume
  volume: 75                # 0-200 (100 = normal)
```

### Queue Actions

#### `queue_add`

Add a track to the queue.

```yaml
- action: queue_add
  source: "https://youtube.com/watch?v=..."
  requester: "${user.id}"
  position: last            # first, last, next, or number
  as: addedTrack
```

**Add multiple tracks:**

```yaml
- action: queue_add
  sources:
    - "https://youtube.com/watch?v=..."
    - "https://youtube.com/watch?v=..."
  requester: "${user.id}"
  as: addedTracks
```

#### `queue_get`

Get the current queue.

```yaml
- action: queue_get
  guild: "${guild.id}"
  as: queue
```

**Queue structure:**

```javascript
{
  tracks: [...],
  current: { /* track */ },
  position: 0,
  loop: "off",              // off, track, queue
  length: 10,
  duration: 3600000         // Total duration in ms
}
```

#### `queue_remove`

Remove a track from the queue.

```yaml
- action: queue_remove
  position: 3               # 1-indexed position
```

#### `queue_clear`

Clear the queue.

```yaml
- action: queue_clear
```

#### `queue_shuffle`

Shuffle the queue.

```yaml
- action: queue_shuffle
```

#### `queue_loop`

Set loop mode.

```yaml
- action: queue_loop
  mode: queue               # off, track, queue
```

#### `queue_move`

Move a track in the queue.

```yaml
- action: queue_move
  from: 5
  to: 1
```

### Voice State Actions

#### `voice_get_state`

Get the bot's voice state in a guild.

```yaml
- action: voice_get_state
  guild: "${guild.id}"
  as: voiceState
```

**State structure:**

```javascript
{
  connected: true,
  channel_id: "123456789",
  playing: true,
  paused: false,
  volume: 50,
  current: { /* track */ },
  queue: { /* queue */ }
}
```

### Audio Filter Actions

#### `voice_filter`

Apply audio filters.

```yaml
- action: voice_filter
  filters:
    - type: bassboost
      gain: 10
    - type: nightcore
      rate: 1.25
```

**Available filters:**

| Filter | Parameters | Description |
|--------|------------|-------------|
| `bassboost` | `gain: -20 to 20` | Boost bass frequencies |
| `nightcore` | `rate: 0.5 to 2.0` | Speed up with pitch shift |
| `vaporwave` | `rate: 0.5 to 1.0` | Slow down with pitch shift |
| `treble` | `gain: -20 to 20` | Boost treble frequencies |
| `karaoke` | `level: 0 to 1` | Remove vocals |
| `8d` | `depth: 0 to 1` | 8D audio effect |
| `vibrato` | `frequency, depth` | Vibrato effect |
| `tremolo` | `frequency, depth` | Tremolo effect |
| `rotation` | `frequency` | Rotating audio effect |
| `speed` | `rate: 0.5 to 2.0` | Change speed |

**Reset filters:**

```yaml
- action: voice_filter
  filters: []               # Clear all filters
```

## Complete Example: Music Bot

```yaml
version: "0.1"

identity:
  name: "MusicBot"

voice:
  enabled: true
  default_volume: 50
  max_queue_size: 200
  leave_on_empty: true
  leave_delay: "5m"
  sources:
    youtube: true
    soundcloud: true

commands:
  - name: play
    description: Play a song
    options:
      - name: query
        type: string
        description: Song name or URL
        required: true
    actions:
      # Check if user is in voice channel
      - flow_if:
          if: "!member.voice.channel_id"
          then:
            - reply:
                content: "You need to be in a voice channel!"
                ephemeral: true
            - abort:

      # Defer for search
      - action: defer

      # Search for the track
      - action: voice_search
        query: "${options.query}"
        limit: 1
        as: results

      - action: flow_if
        condition: "!results || results.length === 0"
        then:
          - action: reply
            content: "No results found for: ${options.query}"
          - action: abort

      # Join voice channel if not connected
      - action: voice_get_state
        guild: "${guild.id}"
        as: voiceState

      - action: flow_if
        condition: "!voiceState.connected"
        then:
          - voice_join:
              channel: "${member.voice.channel_id}"
              self_deaf: true

      # Add to queue
      - action: queue_add
        source: "${results[0].url}"
        requester: "${user.id}"
        as: track

      - action: reply
        embed:
          color: "#5865F2"
          title: "Added to Queue"
          description: "[${track.title}](${track.url})"
          thumbnail:
            url: "${track.thumbnail}"
          fields:
            - name: Duration
              value: "${duration(track.duration)}"
              inline: true
            - name: Requested by
              value: "${user.mention}"
              inline: true

  - name: skip
    description: Skip the current song
    actions:
      - action: voice_get_state
        guild: "${guild.id}"
        as: voiceState

      - action: flow_if
        condition: "!voiceState.playing"
        then:
          - action: reply
            content: "Nothing is playing!"
            ephemeral: true
          - action: abort

      - action: voice_skip

      - action: reply
        content: "Skipped! Now playing: **${voiceState.queue.tracks[1]?.title || 'Nothing'}**"

  - name: queue
    description: Show the queue
    actions:
      - action: queue_get
        guild: "${guild.id}"
        as: queue

      - action: flow_if
        condition: "queue.tracks.length === 0"
        then:
          - action: reply
            content: "The queue is empty!"
            ephemeral: true
          - action: abort

      - action: set
        key: queueList
        value: "${queue.tracks.slice(0, 10).map((t, i) => `${i + 1}. [${t.title}](${t.url}) - ${duration(t.duration)}`).join('\n')}"

      - action: reply
        embed:
          color: "#5865F2"
          title: "Queue"
          description: "${queueList}"
          fields:
            - name: Now Playing
              value: "[${queue.current.title}](${queue.current.url})"
            - name: Total Duration
              value: "${duration(queue.duration)}"
              inline: true
            - name: Songs
              value: "${queue.length}"
              inline: true
          footer:
            text: "Loop: ${queue.loop} | Volume: ${voiceState.volume}%"

  - name: volume
    description: Set the volume
    options:
      - name: level
        type: integer
        description: Volume level (0-100)
        required: true
        min_value: 0
        max_value: 100
    actions:
      - action: voice_volume
        volume: "${options.level}"

      - action: reply
        content: "Volume set to **${options.level}%**"

  - name: pause
    description: Pause playback
    actions:
      - action: voice_pause
      - action: reply
        content: "Paused!"

  - name: resume
    description: Resume playback
    actions:
      - action: voice_resume
      - action: reply
        content: "Resumed!"

  - name: stop
    description: Stop playback and clear queue
    actions:
      - action: voice_stop
      - action: reply
        content: "Stopped and cleared the queue!"

  - name: shuffle
    description: Shuffle the queue
    actions:
      - action: queue_shuffle
      - action: reply
        content: "Queue shuffled!"

  - name: loop
    description: Set loop mode
    options:
      - name: mode
        type: string
        description: Loop mode
        required: true
        choices:
          - name: Off
            value: "off"
          - name: Track
            value: "track"
          - name: Queue
            value: "queue"
    actions:
      - action: queue_loop
        mode: "${options.mode}"

      - action: reply
        content: "Loop mode set to **${options.mode}**"

  - name: nowplaying
    description: Show current track
    actions:
      - action: voice_get_state
        guild: "${guild.id}"
        as: voiceState

      - action: flow_if
        condition: "!voiceState.current"
        then:
          - action: reply
            content: "Nothing is playing!"
            ephemeral: true
          - action: abort

      - action: set
        key: track
        value: "${voiceState.current}"

      - action: set
        key: progress
        value: "${voiceState.position / track.duration}"

      - action: set
        key: progressBar
        value: "${'▓'.repeat(Math.floor(progress * 20))}${'░'.repeat(20 - Math.floor(progress * 20))}"

      - action: reply
        embed:
          color: "#5865F2"
          title: "Now Playing"
          description: "[${track.title}](${track.url})"
          thumbnail:
            url: "${track.thumbnail}"
          fields:
            - name: Progress
              value: "`${progressBar}` ${duration(voiceState.position)} / ${duration(track.duration)}"
            - name: Requested by
              value: "<@${track.requester}>"
              inline: true
            - name: Volume
              value: "${voiceState.volume}%"
              inline: true

  - name: seek
    description: Seek to a position
    options:
      - name: position
        type: string
        description: Position (e.g., 1:30, 90s, 50%)
        required: true
    actions:
      - action: voice_seek
        position: "${options.position}"

      - action: reply
        content: "Seeked to **${options.position}**"

  - name: filter
    description: Apply audio filter
    options:
      - name: filter
        type: string
        description: Filter to apply
        required: true
        choices:
          - name: Bassboost
            value: "bassboost"
          - name: Nightcore
            value: "nightcore"
          - name: Vaporwave
            value: "vaporwave"
          - name: 8D
            value: "8d"
          - name: Clear
            value: "clear"
    actions:
      - action: flow_switch
        value: "${options.filter}"
        cases:
          bassboost:
            - action: voice_filter
              filters:
                - type: bassboost
                  gain: 10
          nightcore:
            - action: voice_filter
              filters:
                - type: nightcore
                  rate: 1.25
          vaporwave:
            - action: voice_filter
              filters:
                - type: vaporwave
                  rate: 0.8
          8d:
            - action: voice_filter
              filters:
                - type: 8d
                  depth: 0.5
          clear:
            - action: voice_filter
              filters: []

      - action: reply
        content: "Filter **${options.filter}** ${options.filter === 'clear' ? 'cleared' : 'applied'}!"

  - name: disconnect
    description: Disconnect from voice
    actions:
      - action: voice_leave
        guild: "${guild.id}"

      - action: reply
        content: "Disconnected!"

events:
  - event: voice_state_update
    when: "member.id == client.id && !new_state.channel_id"
    actions:
      # Bot was disconnected - clean up queue
      - voice_stop:
```

## Voice Events

Listen to voice-related events:

```yaml
events:
  # Track starts playing
  - event: track_start
    actions:
      - action: send_message
        channel: "${musicChannel}"
        embed:
          title: "Now Playing"
          description: "${track.title}"

  # Track ends
  - event: track_end
    actions:
      - action: log
        message: "Track ended: ${track.title}"

  # Queue ends
  - event: queue_end
    actions:
      - action: send_message
        channel: "${musicChannel}"
        content: "Queue finished!"

  # Voice connection error
  - event: voice_error
    actions:
      - action: log
        level: error
        message: "Voice error: ${error.message}"

  # User joins voice
  - event: voice_join
    condition: "!member.user.bot"
    actions:
      - action: log
        message: "${member.display_name} joined ${channel.name}"

  # User leaves voice
  - event: voice_leave
    condition: "!member.user.bot"
    actions:
      - action: log
        message: "${member.display_name} left voice"
```

## Best Practices

1. **Always check if user is in voice channel** before attempting to join
2. **Use `self_deaf: true`** when the bot doesn't need to hear audio
3. **Handle disconnection gracefully** - clean up state when disconnected
4. **Set reasonable queue limits** to prevent abuse
5. **Use deferrals** for search operations that may take time
6. **Implement DJ roles** for controlling who can use certain commands

```yaml
# DJ role check
- flow_if:
    if: "!member.roles | includes(env.DJ_ROLE) && !member.permissions | includes('MANAGE_CHANNELS')"
    then:
      - reply:
          content: "You need the DJ role to use this command!"
          ephemeral: true
      - abort:
```

## Next Steps

- [Canvas Reference](canvas.md) - Generate images
- [Music Builtin](../builtins/music.md) - Pre-built music bot features
- [Actions Reference](actions/_index.md) - All available actions
