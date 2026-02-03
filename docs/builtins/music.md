# Music Builtin

The music builtin provides voice channel music playback with queue management, playlists, and audio filters.

## Quick Start

```yaml
builtins:
  music:
    enabled: true
```

## Configuration

```yaml
builtins:
  music:
    enabled: true

    # Default volume (0-100)
    defaultVolume: 50

    # Maximum queue size
    maxQueueSize: 100

    # Role required to use DJ commands (skip, clear, etc.)
    djRole: "dj-role-id"

    # Stay in channel when queue empty
    stayInChannel: false

    # Leave after idle (no music playing)
    leaveAfterIdle: "5m"

    # Allow seeking in tracks
    allowSeeking: true

    # Allow audio filters
    allowFilters: true

    # Announce now playing in text channel
    announceNowPlaying: true

    # Channel for announcements (optional, defaults to command channel)
    announceChannel: "music-channel-id"

    # Allowed sources
    sources:
      - youtube
      - soundcloud
      - spotify      # Requires Spotify API credentials
      - direct       # Direct URLs

    # Vote skip settings
    voteSkip:
      enabled: true
      percentage: 50    # Percentage of listeners needed to skip
```

## Commands

### Playback

#### `/play <query>`
Play a song or add to queue. Accepts:
- YouTube URLs
- YouTube search queries
- Spotify URLs (tracks, albums, playlists)
- SoundCloud URLs
- Direct audio URLs

#### `/pause`
Pause the current track.

#### `/resume`
Resume playback.

#### `/stop`
Stop playback and clear the queue.

#### `/skip`
Skip to the next track. May require DJ role or vote.

#### `/seek <position>`
Seek to a position (e.g., `1:30`, `90s`).

### Queue Management

#### `/queue`
Display the current queue.

#### `/queue remove <position>`
Remove a track from the queue.

#### `/queue clear`
Clear the entire queue.

#### `/queue shuffle`
Shuffle the queue.

#### `/queue move <from> <to>`
Move a track to a different position.

### Volume & Filters

#### `/volume [level]`
Get or set volume (0-100).

#### `/filters`
Show available audio filters.

#### `/filter <name> [enabled]`
Enable or disable an audio filter.

Available filters:
- `bassboost` - Boost bass frequencies
- `nightcore` - Speed up + higher pitch
- `vaporwave` - Slow down + lower pitch
- `8d` - 8D audio effect (rotating)
- `karaoke` - Reduce vocals
- `tremolo` - Wavering volume

### Now Playing

#### `/nowplaying`
Show the currently playing track with progress bar.

### Loop

#### `/loop <mode>`
Set loop mode:
- `off` - No looping
- `track` - Loop current track
- `queue` - Loop entire queue

### Playlists

#### `/playlist create <name>`
Create a new playlist.

#### `/playlist add <name> [query]`
Add current track or search result to playlist.

#### `/playlist play <name>`
Load and play a saved playlist.

#### `/playlist list`
List your saved playlists.

#### `/playlist delete <name>`
Delete a playlist.

## Now Playing Embed

```
Now Playing

Title: Never Gonna Give You Up
Artist: Rick Astley
Duration: 3:32

[▓▓▓▓▓▓▓░░░░░░░░░░░░░] 1:45 / 3:32

Requested by: @User
```

## Queue Format

```
Queue (5 tracks)

1. Never Gonna Give You Up - Rick Astley (3:32) - @User
2. Take On Me - a-ha (3:46) - @User2
3. Africa - Toto (4:55) - @User
... and 2 more

Total duration: 15:45
```

## Events

The music builtin emits these events:

- `music_track_start` - Track started playing
- `music_track_end` - Track finished
- `music_queue_end` - Queue finished (empty)
- `music_error` - Playback error occurred

## Best Practices

1. **Set max queue size** - Prevent queue abuse
2. **Use DJ role** - Control who can skip/clear
3. **Enable vote skip** - Democratic skipping
4. **Configure idle timeout** - Save resources
5. **Restrict sources** - Disable sources you don't need
