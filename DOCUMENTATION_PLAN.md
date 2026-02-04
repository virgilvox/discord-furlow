# FURLOW Documentation Plan

## Overview

This plan outlines a comprehensive documentation strategy following open source best practices. The structure is designed to work both as repository markdown files AND as a GitHub Wiki.

## Documentation Structure

```
docs/
├── README.md                    # Main entry point (also repo root)
├── GETTING_STARTED.md          # Quick start tutorial
├── CONTRIBUTING.md             # Contribution guidelines
├── CODE_OF_CONDUCT.md          # Community standards
├── CHANGELOG.md                # Version history
├──
├── guides/                     # User guides (GitHub Wiki: Guides)
│   ├── installation.md
│   ├── your-first-bot.md
│   ├── understanding-yaml.md
│   ├── deployment.md
│   └── troubleshooting.md
│
├── reference/                  # API reference (GitHub Wiki: Reference)
│   ├── yaml-spec.md           # Complete YAML specification
│   ├── actions/               # All 84 actions
│   │   ├── _index.md          # Actions overview
│   │   ├── message.md         # Message actions (11)
│   │   ├── member.md          # Member actions (14)
│   │   ├── state.md           # State actions (7)
│   │   ├── flow.md            # Flow actions (13)
│   │   ├── channel.md         # Channel actions (9)
│   │   ├── component.md       # Component actions (1)
│   │   ├── voice.md           # Voice actions (17)
│   │   ├── database.md        # Database actions (4)
│   │   └── integration.md     # Integration actions (8)
│   ├── expressions/           # Expression system
│   │   ├── _index.md          # Expression overview
│   │   ├── functions.md       # 69 functions
│   │   └── transforms.md      # 48 transforms
│   ├── events.md              # Event reference
│   ├── state.md               # State management
│   ├── flows.md               # Flow system
│   └── cli.md                 # CLI reference
│
├── packages/                   # Package documentation
│   ├── core.md
│   ├── discord.md
│   ├── storage.md
│   ├── pipes.md
│   ├── builtins.md
│   ├── testing.md
│   └── schema.md
│
├── examples/                   # Example bots (GitHub Wiki: Examples)
│   ├── simple-bot/
│   ├── moderation-bot/
│   ├── music-bot/
│   ├── leveling-bot/
│   └── full-featured-bot/
│
└── advanced/                   # Advanced topics (GitHub Wiki: Advanced)
    ├── custom-actions.md
    ├── custom-pipes.md
    ├── alternative-runtimes.md
    └── performance.md
```

## GitHub Wiki Structure

The same content can be organized as a GitHub Wiki with this sidebar:

```markdown
# Home

## Getting Started
- [[Installation]]
- [[Your First Bot]]
- [[Understanding YAML]]

## Guides
- [[Deployment]]
- [[Troubleshooting]]
- [[Migration Guide]]

## Reference
- [[YAML Specification]]
- [[Actions]]
  - [[Message Actions]]
  - [[Member Actions]]
  - [[State Actions]]
  - [[Flow Actions]]
  - [[Channel Actions]]
  - [[Component Actions]]
  - [[Voice Actions]]
  - [[Database Actions]]
  - [[Integration Actions]]
- [[Expressions]]
  - [[Functions]]
  - [[Transforms]]
- [[Events]]
- [[State Management]]
- [[Flows]]
- [[CLI Reference]]

## Packages
- [[@furlow/core]]
- [[@furlow/discord]]
- [[@furlow/storage]]
- [[@furlow/pipes]]
- [[@furlow/builtins]]
- [[@furlow/testing]]

## Examples
- [[Simple Bot]]
- [[Moderation Bot]]
- [[Music Bot]]
- [[Leveling Bot]]

## Advanced
- [[Custom Actions]]
- [[Custom Pipes]]
- [[Alternative Runtimes]]
- [[Performance Tuning]]

## Community
- [[Contributing]]
- [[Code of Conduct]]
- [[Changelog]]
```

---

## Document Specifications

### 1. README.md (Root)

**Purpose**: First thing users see, must hook them immediately

**Structure**:
```markdown
# FURLOW

> Build Discord bots with YAML, not code.

[Badges: npm, tests, license, discord]

## What is FURLOW?

[2-3 sentence pitch]

## Quick Example

```yaml
# A complete Discord bot in 10 lines
version: "0.1"
commands:
  - name: ping
    description: Check bot latency
    actions:
      - reply:
          content: "Pong! ${client.ping}ms"
```

## Features

- 84 built-in actions
- No coding required
- 14 pre-built modules
- Voice, canvas, and more

## Quick Start

```bash
npm install -g furlow
furlow init my-bot
cd my-bot
furlow start
```

## Documentation

[Links to guides]

## Community

[Discord, GitHub Discussions]
```

**Length**: ~200 lines max

---

### 2. Getting Started Guide

**Purpose**: Take users from zero to working bot

**Structure**:
```markdown
# Getting Started with FURLOW

## Prerequisites
- Node.js 18+
- Discord account
- 10 minutes

## Step 1: Install FURLOW
[npm/pnpm/yarn instructions]

## Step 2: Create a Discord Bot
[Discord Developer Portal walkthrough with screenshots]

## Step 3: Initialize Your Project
[furlow init walkthrough]

## Step 4: Configure Your Bot
[.env setup, token configuration]

## Step 5: Write Your First Command
[Simple /hello command]

## Step 6: Run Your Bot
[furlow start, invite to server]

## Step 7: Add More Features
[Tease advanced features]

## Next Steps
[Links to guides, reference]
```

**Length**: ~400 lines with screenshots

---

### 3. YAML Specification Reference

**Purpose**: Complete reference for YAML syntax

**Structure**:
```markdown
# YAML Specification

## Top-Level Structure

```yaml
version: "0.1"
identity: { ... }
presence: { ... }
intents: { ... }
state: { ... }
commands: [ ... ]
events: [ ... ]
flows: { ... }
builtins: [ ... ]
pipes: { ... }
```

## Section: identity
[Complete reference]

## Section: presence
[Complete reference]

## Section: intents
[Complete reference]

## Section: state
### Variables
### Tables
### Caches

## Section: commands
### Command Definition
### Options
### Subcommands
### Permissions

## Section: events
### Event Types
### Conditions
### Timing

## Section: flows
### Flow Definition
### Parameters
### Returns

## Section: builtins
[All 14 modules]

## Section: pipes
[All 6 pipe types]
```

**Length**: ~1500 lines (comprehensive)

---

### 4. Actions Reference (Per Category)

**Purpose**: Complete reference for each action

**Template per action**:
```markdown
## action_name

Brief description.

### Syntax

```yaml
- action: action_name
  param1: value
  param2: value
```

### Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| param1 | string | yes | - | Description |
| param2 | number | no | 0 | Description |

### Examples

#### Basic Usage
```yaml
- action: action_name
  param1: "hello"
```

#### With Expressions
```yaml
- action: action_name
  param1: "${user.username}"
```

### Related Actions
- [other_action](#other_action)
```

**Length per file**: ~300-500 lines

---

### 5. Expression Functions Reference

**Purpose**: Document all 69 functions

**Structure per function**:
```markdown
## function_name

Brief description.

### Syntax

```
function_name(arg1, arg2)
```

### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| arg1 | string | Description |
| arg2 | number | Description |

### Returns

Type and description.

### Examples

```yaml
content: "${function_name('hello', 5)}"
# Output: "result"
```

### Notes
- Edge cases
- Performance considerations
```

---

### 6. Expression Transforms Reference

**Purpose**: Document all 48 transforms

**Structure per transform**:
```markdown
## | transform_name

Brief description.

### Syntax

```
value | transform_name
value | transform_name(arg)
```

### Examples

```yaml
content: "${'hello' | upper}"
# Output: "HELLO"
```
```

---

### 7. CLI Reference

**Purpose**: Document all CLI commands

**Structure**:
```markdown
# CLI Reference

## Global Options

```
--version, -v    Show version
--help, -h       Show help
--verbose        Verbose output
```

## Commands

### furlow init [name]

Create a new FURLOW project.

#### Options
| Option | Description |
|--------|-------------|
| --template | Project template |
| --git | Initialize git |
| --install | Install dependencies |

#### Examples
```bash
furlow init my-bot
furlow init my-bot --template moderation
```

### furlow start <spec>
...

### furlow validate <spec>
...

### furlow add <builtin>
...

### furlow export <spec>
...
```

---

### 8. Example Bots

**Purpose**: Complete, working examples users can learn from

#### Simple Bot
```yaml
# examples/simple-bot/furlow.yaml
# A minimal bot with basic commands

version: "0.1"

identity:
  name: "Simple Bot"

commands:
  - name: ping
    description: Check if the bot is online
    actions:
      - reply:
          content: "Pong! Latency: ${client.ping}ms"

  - name: hello
    description: Say hello
    options:
      - name: name
        type: string
        description: Your name
    actions:
      - reply:
          content: "Hello, ${options.name || user.username}!"

  - name: roll
    description: Roll a dice
    options:
      - name: sides
        type: integer
        description: Number of sides
    actions:
      - reply:
          content: "You rolled: ${random(1, options.sides || 6)}"
```

#### Moderation Bot
- warn/kick/ban commands
- Auto-mod rules
- Logging

#### Music Bot
- Play/pause/skip
- Queue management
- Filters

#### Leveling Bot
- XP tracking
- Level up notifications
- Leaderboard

---

## Implementation Order

### Phase 1: Essential (Week 1)
1. README.md - Project overview
2. GETTING_STARTED.md - First-time setup
3. guides/installation.md - Detailed installation
4. guides/your-first-bot.md - Tutorial
5. examples/simple-bot/ - Working example

### Phase 2: Reference (Week 2)
6. reference/yaml-spec.md - Complete YAML reference
7. reference/actions/_index.md - Actions overview
8. reference/actions/message.md - Message actions
9. reference/actions/member.md - Member actions
10. reference/actions/state.md - State actions
11. reference/actions/flow.md - Flow actions

### Phase 3: Reference Continued (Week 3)
12. reference/actions/channel.md - Channel actions
13. reference/actions/voice.md - Voice actions
14. reference/actions/database.md - Database actions
15. reference/actions/integration.md - Integration actions
16. reference/expressions/_index.md - Expression overview
17. reference/expressions/functions.md - All functions
18. reference/expressions/transforms.md - All transforms

### Phase 4: Examples & Advanced (Week 4)
19. examples/moderation-bot/ - Complete example
20. examples/music-bot/ - Complete example
21. examples/leveling-bot/ - Complete example
22. reference/cli.md - CLI reference
23. advanced/custom-actions.md
24. advanced/deployment.md

### Phase 5: Polish (Week 5)
25. GitHub Wiki setup
26. Search/index
27. CONTRIBUTING.md
28. CODE_OF_CONDUCT.md
29. Review and polish all docs

---

## Writing Guidelines

### Tone
- Friendly but professional
- Direct and concise
- Assume intelligence, not knowledge
- Use "you" for the reader

### Format
- Use headers liberally (H2, H3, H4)
- Code examples for everything
- Tables for parameters
- Callouts for warnings/tips

### Callouts
```markdown
> **Note**: Additional information

> **Warning**: Important caution

> **Tip**: Helpful suggestion
```

### Code Blocks
- Always specify language
- Keep examples minimal but complete
- Show output in comments

### Links
- Use relative links within docs
- External links open in new tab
- Link to related concepts

---

## GitHub Wiki Setup

### Enable Wiki
1. Go to repository Settings
2. Enable Wiki under Features
3. Create Home page

### Structure
- Use `_Sidebar.md` for navigation
- Use `_Footer.md` for common links
- Each page = one markdown file

### Sync Strategy
Option A: **Wiki-first**
- Edit in wiki directly
- Backup to `docs/` periodically

Option B: **Repo-first** (Recommended)
- Edit in `docs/` directory
- Use GitHub Actions to sync to wiki
- Single source of truth

### GitHub Action for Wiki Sync
```yaml
name: Sync Wiki
on:
  push:
    paths:
      - 'docs/**'
jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Sync to Wiki
        uses: Andrew-Chen-Wang/github-wiki-action@v4
        with:
          path: docs/
```

---

## Metrics for Success

### Quantitative
- README has clear value proposition
- Getting Started takes < 10 minutes
- Every action has an example
- Every function has an example
- All examples are tested and work

### Qualitative
- New user can build a bot without prior knowledge
- Experienced user can find any reference quickly
- Documentation matches actual behavior
- No dead links or outdated information

---

## Tools & Resources

### Documentation Generators
- **Docusaurus** - Full documentation site
- **VitePress** - Vue-powered, fast
- **MkDocs** - Python, Material theme
- **GitHub Wiki** - Built-in, simple

### Recommended: GitHub Wiki + Docusaurus

1. **GitHub Wiki** for quick edits, community contributions
2. **Docusaurus** for polished documentation site at `docs.furlow.dev`

Both can be sourced from the same `docs/` directory.

---

## Next Actions

1. Create `docs/` directory structure
2. Write README.md
3. Write GETTING_STARTED.md
4. Create simple-bot example
5. Set up GitHub Wiki
6. Begin reference documentation

---

## Estimated Effort

| Phase | Documents | Est. Lines | Est. Time |
|-------|-----------|------------|-----------|
| Phase 1 | 5 | ~1,500 | 2-3 days |
| Phase 2 | 6 | ~3,000 | 3-4 days |
| Phase 3 | 7 | ~4,000 | 4-5 days |
| Phase 4 | 6 | ~2,500 | 3-4 days |
| Phase 5 | Polish | - | 2-3 days |
| **Total** | **24+** | **~11,000** | **~3 weeks** |

---

## File Templates

Templates for consistent documentation are available in `docs/_templates/`:

- `action-template.md` - Action documentation
- `function-template.md` - Function documentation
- `guide-template.md` - Guide documentation
- `example-template.md` - Example bot structure
