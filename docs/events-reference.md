# Events Reference

This page has moved. The canonical events reference is at
[reference/events.md](reference/events.md). It lists every event FURLOW
actually emits (59 events across Discord gateway, voice transitions, and
component interactions), their context fields, and examples.

If you are writing YAML event handlers, the correct syntax is a list:

```yaml
events:
  - event: message_create
    when: "!message.author.bot"
    actions:
      - reply:
          content: "got a message"
```

Not a map keyed by event name. See the canonical reference for the complete
list and per-event context fields.
