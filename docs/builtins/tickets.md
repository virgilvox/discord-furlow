# Tickets Builtin

The tickets builtin provides a complete support ticket system with categories, transcripts, and staff management.

## Quick Start

```yaml
builtins:
  tickets:
    enabled: true
    category: "tickets-category-id"
    supportRoles:
      - "support-role-id"
```

## Configuration

```yaml
builtins:
  tickets:
    enabled: true

    # Category for ticket channels
    category: "123456789"

    # Roles that can see and manage tickets
    supportRoles:
      - "support-role-id"
      - "admin-role-id"

    # Ticket channel naming pattern
    # Available: {number}, {username}, {userid}
    channelPattern: "ticket-{number}"

    # Maximum open tickets per user
    maxTicketsPerUser: 3

    # Channel to post ticket panel
    panelChannel: "support-channel-id"

    # Channel for ticket logs/transcripts
    logChannel: "ticket-logs-id"

    # Auto-close inactive tickets
    autoCloseAfter: "24h"    # null to disable

    # Ticket categories
    categories:
      - name: "General Support"
        emoji: "question"
        description: "General questions and help"
      - name: "Bug Report"
        emoji: "bug"
        description: "Report issues and bugs"
      - name: "Purchase Help"
        emoji: "shopping_cart"
        description: "Help with purchases"
      - name: "Other"
        emoji: "ellipsis"
        description: "Something else"

    # DM user when ticket closes
    dmOnClose: true

    # Include transcript when closing
    includeTranscript: true

    # Custom messages
    messages:
      welcome: "Thanks for creating a ticket! A staff member will assist you shortly."
      close: "This ticket has been closed. A transcript has been saved."
      autoClose: "This ticket was automatically closed due to inactivity."
```

## Commands

### `/ticket panel`
Create a ticket panel in the current channel with buttons/select menu for creating tickets.

### `/ticket add <user>`
Add a user to the current ticket channel.

### `/ticket remove <user>`
Remove a user from the current ticket channel.

### `/ticket rename <name>`
Rename the current ticket channel.

### `/ticket close [reason]`
Close the current ticket with an optional reason.

### `/ticket claim`
Claim a ticket (assign yourself as the handler).

### `/ticket unclaim`
Unclaim a ticket.

### `/ticket transcript`
Generate a transcript of the current ticket.

## Ticket Panel

The ticket panel provides a user-friendly interface for creating tickets:

**With categories:**
- Shows a select menu with configured categories
- User selects category, then ticket is created

**Without categories:**
- Shows a single "Create Ticket" button
- Clicking creates ticket immediately

## Ticket Lifecycle

1. **Creation** - User clicks button/selects category
2. **Channel Created** - Private channel created in ticket category
3. **Welcome Message** - Bot sends welcome message with close button
4. **Support** - Staff and user communicate
5. **Claim (optional)** - Staff member claims the ticket
6. **Resolution** - Issue resolved
7. **Close** - Ticket closed, transcript saved, channel deleted

## Transcripts

Transcripts are saved as formatted text files containing:
- All messages in chronological order
- Author, timestamp, and content for each message
- Attachments noted (with URLs)
- Embeds summarized

Transcripts can be:
- Sent to the log channel
- DM'd to the ticket creator
- Saved to external storage (if configured)

## Permissions

Ticket channels are created with:
- **Ticket creator** - Send messages, view channel, attach files
- **Support roles** - Send messages, view channel, manage messages
- **@everyone** - No access

## Best Practices

1. **Clear categories** - Use descriptive category names
2. **Set expectations** - Include response time in welcome message
3. **Enable transcripts** - Keep records for reference
4. **Use claiming** - Prevent duplicate responses
5. **Auto-close wisely** - Set reasonable inactivity timeout
