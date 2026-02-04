# FURLOW Site - Development Handoff

## Overview

The FURLOW documentation site (`apps/site/`) is a Vue 3 application that provides:

1. **Landing Page** - Marketing/overview of the FURLOW framework with animated logo splash
2. **Documentation** - Renders markdown docs from `../../docs/` with syntax highlighting
3. **Schema Builder** - Visual editor for creating `.furlow.yaml` bot specifications

## Why This Architecture

### Design System First
The site strictly follows the design system defined in `design-system/furlow-design-system.html`:
- **Industrial dark theme** with orange accent (#ff6b35)
- **No rounded corners** - everything is square/sharp
- **Oswald font** for headings (UPPERCASE with letter-spacing)
- **Space Mono** for body text and code
- **Dashed borders** for separators and inactive states
- **Animated logo splash** on first page load

### Documentation from Source
Rather than duplicating docs, the site loads markdown directly from `../../docs/` using Vite's `import.meta.glob`. This means:
- Docs stay in sync automatically
- Single source of truth
- No build step to copy files

### Schema Builder with Live Preview
The builder generates valid FURLOW YAML in real-time:
- Form-based UI for all 20+ spec sections
- Action picker with all 84 actions organized by category
- **Editable YAML preview** with two-way sync
- **Full action field editing** with type-specific inputs
- **Conditional (`when`) support** for events and flows
- Bot behavior preview showing what the spec would do
- IndexedDB persistence via Dexie for saving projects

## Tech Stack

| Technology | Purpose |
|------------|---------|
| Vue 3 + Composition API | UI framework |
| TypeScript | Type safety |
| Vite | Build tool |
| Pinia | State management |
| Vue Router | Client-side routing |
| Shiki | Syntax highlighting for docs |
| CodeMirror 6 | YAML preview editor, expression editor |
| yaml | YAML parsing for two-way sync |
| Dexie | IndexedDB wrapper for persistence |
| marked | Markdown parsing |
| sharp | OG image generation (SVG to PNG) |
| @furlow/schema | Types and validation |

## Project Structure

```
apps/site/
├── src/
│   ├── assets/
│   │   ├── styles/
│   │   │   ├── variables.css    # Design tokens
│   │   │   ├── typography.css   # Font rules
│   │   │   ├── components.css   # Base component styles (buttons, inputs, selects)
│   │   │   ├── markdown.css     # Documentation styling
│   │   │   └── responsive.css   # Mobile breakpoints and utilities
│   │   └── images/              # Logo SVGs
│   │
│   ├── components/
│   │   ├── common/              # Reusable UI components
│   │   │   ├── AppHeader.vue
│   │   │   ├── AppFooter.vue
│   │   │   ├── FurlowButton.vue
│   │   │   ├── FurlowCard.vue
│   │   │   ├── FurlowBadge.vue
│   │   │   ├── FurlowInput.vue
│   │   │   ├── NavSidebar.vue
│   │   │   └── SplashScreen.vue  # Animated logo on page load
│   │   │
│   │   ├── landing/             # Landing page sections
│   │   │   ├── HeroSection.vue
│   │   │   ├── FeatureGrid.vue
│   │   │   ├── CodeExample.vue
│   │   │   ├── StatsDisplay.vue
│   │   │   └── QuickLinks.vue
│   │   │
│   │   ├── docs/                # Documentation components
│   │   │   ├── DocNav.vue       # Sidebar navigation
│   │   │   ├── MarkdownRenderer.vue
│   │   │   └── TableOfContents.vue
│   │   │
│   │   └── builder/             # Schema builder components
│   │       ├── BuilderLayout.vue
│   │       ├── SectionNav.vue   # Left sidebar sections
│   │       ├── SchemaForm.vue   # Dynamic form renderer
│   │       ├── ActionBuilder.vue # Commands/events/flows editor
│   │       ├── ActionCard.vue   # Expandable action with field editing
│   │       ├── YamlPreview.vue  # Live YAML output (editable!)
│   │       ├── ValidationPanel.vue
│   │       ├── ExpressionEditor.vue  # CodeMirror-based Jexl editor
│   │       ├── BotPreview.vue   # What the bot will do
│   │       ├── CommandSimulator.vue
│   │       ├── ProjectManager.vue
│   │       ├── CommandOptionEditor.vue  # Slash command options builder
│   │       └── EmbedBuilder.vue  # Visual Discord embed editor
│   │
│   ├── composables/
│   │   ├── useDocs.ts           # Loads docs from ../../docs/
│   │   ├── useSchema.ts         # Action schema definitions
│   │   ├── useBotPreview.ts     # Bot simulation logic
│   │   └── useKeyboard.ts       # Keyboard shortcuts, focus trap, announcer
│   │
│   ├── stores/
│   │   ├── schema.ts            # Current spec state, YAML generation
│   │   └── projects.ts          # Dexie/IndexedDB persistence
│   │
│   ├── data/
│   │   ├── action-schemas.ts    # All 84 action field definitions
│   │   └── section-schemas.ts   # Form schemas for spec sections
│   │
│   ├── pages/
│   │   ├── index.vue            # Landing page
│   │   ├── docs/[...slug].vue   # Documentation (catch-all route)
│   │   └── builder/index.vue    # Schema builder
│   │
│   ├── router.ts                # Vue Router config
│   ├── main.ts                  # App entry point
│   └── App.vue                  # Root component (includes SplashScreen)
│
├── docs/manifest.json           # Navigation structure for docs
├── vite.config.ts               # Vite configuration
├── tsconfig.json                # TypeScript config
└── package.json
```

## Key Files

### Design System
- `src/assets/styles/variables.css` - All CSS custom properties (colors, spacing, fonts)
- `src/assets/styles/typography.css` - Oswald + Space Mono rules
- `src/assets/styles/components.css` - Button, card, input, select base styles

### Documentation
- `docs/manifest.json` - Defines navigation structure, maps routes to markdown files
- `src/composables/useDocs.ts` - Loads and processes markdown
- `src/components/docs/MarkdownRenderer.vue` - Renders markdown with Shiki

### Schema Builder
- `src/data/action-schemas.ts` - Field definitions for all 84 actions
- `src/stores/schema.ts` - Pinia store for spec state and YAML generation
- `src/stores/projects.ts` - Dexie database for saving/loading projects
- `src/components/builder/ActionCard.vue` - Expandable card with full field editing
- `src/components/builder/YamlPreview.vue` - Editable YAML with two-way sync

### Splash Screen
- `src/components/common/SplashScreen.vue` - Animated logo based on design-system
- Uses sessionStorage to only play once per session

## Running Locally

```bash
cd apps/site
pnpm install
pnpm dev        # Start dev server at localhost:5173
pnpm build      # Production build
pnpm preview    # Preview production build
pnpm typecheck  # Run TypeScript checks
```

## Deployment

The site deploys to GitHub Pages via `.github/workflows/deploy-site.yml`:
- Triggered on push to main
- Builds and deploys to `https://username.github.io/discord-furlow/`
- Base path is `/discord-furlow/` in production, `/` in development

## Completed Features

### Session 1 - Foundation
- Initial Vue 3 + Vite setup
- Design system implementation (colors, typography, components)
- Basic landing page with hero, features, stats
- Documentation rendering with markdown + Shiki
- Schema builder skeleton with section navigation

### Session 2 - Core Builder
- **CODE_BLOCK bug** - Fixed markdown renderer using HTML comments as placeholders
- **Dev server base path** - Now uses `/` for dev, `/discord-furlow/` for production only
- **ExpressionEditor** - Created with CodeMirror, Jexl highlighting, context variable autocomplete
- **Schema validation** - Wired ValidationPanel to @furlow/schema validator
- **Drag-and-drop reordering** - Added to ActionBuilder for reordering actions
- **Nested actions UI** - Created ActionCard component supporting flow_if, batch, parallel, try
- **ExpressionEditor in forms** - Wired into SchemaForm for expression-type fields
- **Code splitting** - Separated shiki, codemirror, and marked into lazy-loaded chunks

### Session 3 - Polish & Features
- **Fixed event handler field name** - Changed `.on` to `.event` in ActionBuilder to match FurlowSpec schema
- **Fixed project name display** - Header now shows `identity.name` from spec instead of hardcoded "Untitled"
- **Fixed select/dropdown styling** - Added explicit `border-radius: 0`, vendor prefixes for appearance, orange accent on hover
- **Made YAML preview editable** - Two-way sync with debounced parsing (500ms), parse error display, prevents infinite loops
- **Added action field editing** - ActionCard now shows:
  - Action description from schema
  - All editable fields with type-specific inputs (string, number, expression, boolean, select, duration, color)
  - Type badges for expression/duration/color fields
  - Preview text when collapsed (shows content, variable, flow, condition)
- **Added conditional/when support** - Events and flows now have:
  - `when` expression field for conditional execution
  - `debounce` and `throttle` fields for events
  - `description` field for flows
  - Extended event type dropdown (13 event types)
- **Created animated logo splash screen** - `SplashScreen.vue` component:
  - Full animation from design-system (rail growth, toggle slide-in, knob snap, wordmark type-in, cursor blink)
  - Scanline effect on load
  - Plays once per session (uses sessionStorage)
  - Fades out after ~2.4s to reveal site
- **Restructured pipes documentation** - Split single 970-line file into 7 focused pages:
  - `packages/pipes/README.md` - Overview, common interface, installation
  - `packages/pipes/http.md` - HTTP Pipe (REST APIs, auth, rate limiting, retry)
  - `packages/pipes/websocket.md` - WebSocket Pipe (real-time, reconnection, heartbeat)
  - `packages/pipes/webhook.md` - Webhook Pipe (receive/send, HMAC verification)
  - `packages/pipes/mqtt.md` - MQTT Pipe (IoT, QoS, wildcards, Last Will)
  - `packages/pipes/tcp-udp.md` - TCP & UDP Pipes (sockets, broadcast, multicast)
  - `packages/pipes/database.md` - Database Pipe (SQLite/Postgres, change events)
  - `packages/pipes/file.md` - File Pipe (watch, hot reload, log monitoring)
  - `packages/pipes/examples.md` - 5 real-world examples (GitHub Deploy Bot, IoT Dashboard, Stock Alerts, Log Monitoring, Multi-Platform Chat)
  - Updated `docs/manifest.json` with new structure
- **Made Pipes top-level nav section** - Pipes now has its own section with `fas fa-plug` icon, not nested under Packages

### Session 5 - LLM Reference & SEO
- **LLM Reference Documentation** - Created comprehensive AI-friendly reference:
  - New `docs/reference/llm-reference.md` (1,473 lines, ~31KB)
  - Covers: full YAML spec, all 84 actions with examples, 76 events, 121 expressions/transforms
  - Common patterns and quick start templates
  - Designed for copy-paste into AI assistants
- **Highlighted AI Reference Section** - Updated `DocNav.vue`:
  - New "AI / LLM Reference" section at top of docs nav with `highlight: true` flag
  - Gradient background and accent border styling for highlighted sections
  - AI badge with special accent styling
  - Auto-expands on page load
- **Type System Updates** - Extended `useDocs.ts` interfaces:
  - Added `highlight?: boolean` to `DocSection`
  - Added `copyable?: boolean` to `DocPage`
- **Comprehensive SEO** - Enhanced `index.html`:
  - Primary meta tags (title, description, keywords, robots, author)
  - Open Graph tags (og:title, og:description, og:image, og:site_name, og:locale)
  - Twitter Card tags (summary_large_image)
  - Theme color and canonical URL
  - Apple touch icon reference
- **Social Media Preview Image** - Created OG image:
  - `public/og-image.svg` - Source SVG with FURLOW branding, stats boxes, code snippet
  - `public/og-image.png` - 1200x630 PNG for social media sharing
  - `scripts/generate-og-image.mjs` - Sharp-based build script
  - Added `prebuild` and `generate:og` npm scripts
- **Navigation Updates**:
  - Added "LLM REF" link to main header navigation (AppHeader.vue)
  - Restructured docs manifest with AI Reference as first section
- **Bug Fix**: Fixed trailing comma in `docs/manifest.json` causing JSON parse error

### Session 4 - Mobile & Polish
- **Comprehensive mobile responsive styles** - New `responsive.css` with:
  - Touch-friendly targets (min 44px for coarse pointers)
  - Spacing adjustments for tablet and phone breakpoints
  - Mobile utility classes (`.hide-mobile`, `.show-mobile`, etc.)
  - Bottom navigation pattern for mobile builder
  - Slide-over panels for mobile sidebar/right panel
- **Builder mobile navigation** - Complete mobile experience:
  - Bottom nav bar with Sections/Edit/YAML tabs
  - Slide-over panel for section navigation (from left)
  - Slide-over panel for YAML/Preview/Validation (from right)
  - Touch-friendly action cards and form inputs
  - Panels close on section selection or overlay tap
- **Documentation mobile navigation** - Similar pattern:
  - Bottom nav bar with Nav/On Page tabs
  - Slide-over panels for navigation and table of contents
  - Proper padding adjustments for content
- **Landing page mobile polish** - All sections responsive:
  - Hero: smaller title, stacked buttons, hidden code preview
  - Features: 2-column → 1-column grid
  - Stats: 2x2 → 2x2 → 1-column progression
  - Code examples: scrollable tabs, smaller code
  - Quick links: stacked cards
- **Command options editor** - New `CommandOptionEditor.vue`:
  - Add/edit/remove slash command options
  - Option types: string, integer, number, boolean, user, channel, role, mentionable, attachment
  - Required flag support
  - Choices editor for string/integer/number types
  - Autocomplete toggle
  - Drag reordering with up/down buttons
  - Collapsible option cards
- **Embed builder** - New `EmbedBuilder.vue`:
  - Visual editor for Discord embeds
  - Sections: Basic Info, Author, Images, Footer, Fields
  - Live Discord-style preview panel
  - Color picker with hex input
  - Fields array with inline toggle
  - Add/remove/reorder fields
  - Real-time preview updates
  - Integrated into SchemaForm for embeds section
- **Keyboard navigation & accessibility**:
  - New `useKeyboard.ts` composable with:
    - Keyboard shortcuts (Ctrl+S save, Ctrl+E export, Ctrl+O projects, Ctrl+1/2/3 panel tabs)
    - Focus trap utility for modals
    - Screen reader announcements
  - Skip link for main content navigation
  - Focus management in ProjectManager modal
  - Escape key to close modals
  - Section change announcements
  - ARIA attributes on modals

## Remaining Polish

- Loading/error states improvements
- Shiki bundle optimization (currently loads specific languages only, but still ~1.6MB gzipped)
- Apple touch icon (`public/apple-touch-icon.png`) - referenced in HTML but not yet created

## Design Decisions

### Why Custom CSS (No Tailwind)?
The design system requires very specific styling that would fight against Tailwind's conventions:
- No border-radius anywhere
- Specific spacing scale
- Industrial aesthetic with dashed borders
- Typography rules that don't map to Tailwind

### Why Shiki for Syntax Highlighting?
- Better YAML support than highlight.js
- Matches VS Code themes
- Can use custom themes matching the design system

### Why Dexie for Storage?
- Simple IndexedDB wrapper
- Reactive with Vue
- Handles large specs without localStorage limits

### Why Load Docs Dynamically?
- Keeps docs as single source of truth
- No sync issues between docs/ and site
- Vite handles the imports efficiently

### Why Two-Way YAML Sync?
- Power users prefer editing YAML directly
- Debounced parsing prevents lag while typing
- Parse errors shown inline, don't break the UI
- Changes sync back to form fields

### Why Session-Based Splash?
- Shows the cool animation on first visit
- Doesn't annoy returning users
- sessionStorage clears on browser close, so they see it again next session

### Why Bottom Navigation for Mobile?
- Standard mobile UX pattern (thumb-friendly)
- Keeps screen real estate for content
- Slide-over panels preserve context (don't navigate away)
- Safe area insets for notched devices

## File Quick Reference

| What | Where |
|------|-------|
| Design tokens | `src/assets/styles/variables.css` |
| Mobile responsive | `src/assets/styles/responsive.css` |
| Select/dropdown styles | `src/assets/styles/components.css:261` |
| Action field schemas | `src/data/action-schemas.ts` |
| YAML two-way sync | `src/components/builder/YamlPreview.vue:54-74` |
| Action field editing | `src/components/builder/ActionCard.vue:172-247` |
| Event/flow conditions | `src/components/builder/ActionBuilder.vue:321-395` |
| Command options | `src/components/builder/CommandOptionEditor.vue` |
| Embed builder | `src/components/builder/EmbedBuilder.vue` |
| Mobile builder nav | `src/components/builder/BuilderLayout.vue` |
| Keyboard shortcuts | `src/composables/useKeyboard.ts` |
| Skip link | `src/App.vue` |
| Splash animation | `src/components/common/SplashScreen.vue` |
| Docs manifest | `../../docs/manifest.json` |
| Pipes docs | `../../docs/packages/pipes/` (9 files including examples.md) |
| LLM Reference | `../../docs/reference/llm-reference.md` |
| SEO meta tags | `index.html` |
| OG Image source | `public/og-image.svg` |
| OG Image PNG | `public/og-image.png` |
| OG Image generator | `scripts/generate-og-image.mjs` |
| Doc section highlight | `src/components/docs/DocNav.vue` (highlight class) |

## Contact / Questions

This site was built as part of the FURLOW Discord bot framework.
See the main README.md and CLAUDE.md for project-wide context.
