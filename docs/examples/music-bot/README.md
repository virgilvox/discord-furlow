# Music Bot Example

A full-featured music bot with queue management, playback controls, and DJ permissions.

## Features

- **Playback Commands**: `/play`, `/pause`, `/resume`, `/stop`, `/skip`
- **Queue Management**: `/queue`, `/shuffle`, `/loop`, `/remove`, `/clear`
- **Volume Control**: `/volume`
- **Now Playing**: `/nowplaying` with progress bar
- **DJ Mode**: Restrict commands to DJ role

## Setup

1. Create a DJ role and get its ID

2. Create a `.env` file:

```env
DISCORD_TOKEN=your_bot_token
DJ_ROLE=123456789
```

3. Run the bot:

```bash
furlow start furlow.yaml
```

## Files

- `furlow.yaml` - Bot specification
- `.env` - Environment variables (create this)

## Usage

### Playing Music

```
/play query:never gonna give you up
/play query:https://youtube.com/watch?v=...
```

Supports YouTube, SoundCloud, and direct URLs.

### Queue Management

```
/queue              # View current queue
/skip               # Skip current track
/shuffle            # Shuffle the queue
/loop mode:track    # Loop current track
/loop mode:queue    # Loop entire queue
/remove position:3  # Remove track at position 3
/clear              # Clear the queue
```

### Playback Controls

```
/pause              # Pause playback
/resume             # Resume playback
/stop               # Stop and disconnect
/volume level:75    # Set volume to 75%
```

### Now Playing

```
/nowplaying
```

Shows current track with progress bar and duration.

## Customization

### Change Default Volume

```yaml
voice:
  default_volume: 50  # 0-100
```

### Adjust Queue Size

```yaml
voice:
  max_queue_size: 200
```

### Disable DJ Mode

Remove the `when` conditions on commands or set DJ_ROLE to a common role.

## Next Steps

- See [Voice Actions](../../reference/actions/_index.md) for all voice commands
- Check [Music Builtin](../../builtins/music.md) for pre-built music features
