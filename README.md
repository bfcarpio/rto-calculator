# RTO Calculator

A static Astro website that calculates Return-to-Office (RTO) compliance using an interactive calendar. All validation runs client-side in the browser.

## What It Does

- **Interactive calendar**: Click, drag, or use keyboard (arrow keys, Space/Enter to toggle, Esc to cancel)
- **Automatic validation**: Best-8-of-12 sliding window compliance computed in real-time (no validate button)
- **Holiday integration**: Fetches public holidays via Nager.Date API (the only server call)
- **Keyboard shortcuts**: Press `?` to view all shortcuts
- **Debug logging**: Toggle via browser console or localStorage
- **Persistence**: Calendar state and settings saved to localStorage
- **Undo/redo**: Full history support

## Tech Stack

- **Astro** - Static site generator (outputs pure HTML/JS)
- **datepainter** - Calendar library (workspace package)
- **nager-date** - Holiday API client (workspace package)
- **Nano Stores** - State management
- **date-fns** - Date utilities
- **Zod** - Validation
- **Vitest** + **Playwright** - Testing

## Quick Start

```bash
npm install
npm run build:all    # Build workspace packages first
npm run dev           # Start dev server
```

## Commands

```bash
npm run build         # Production build
npm run preview       # Preview build
npm run check         # Lint + type check
npm run test:run      # Unit tests
npm run test:e2e      # E2E tests (auto-starts preview)
```

## Architecture

- Static site - can be hosted anywhere (Netlify, Vercel, GitHub Pages, etc.)
- Client-side validation - all compliance calculations happen in the browser
- Single network call - only holiday data fetched from Nager.Date API

## Guides

- [User Guide](docs/USER_GUIDE.md)
- [Developer Guide](docs/DEVELOPER_GUIDE.md)
