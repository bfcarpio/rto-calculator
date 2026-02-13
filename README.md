# RTO Calculator

Astro-based Return-to-Office (RTO) compliance calculator with an interactive calendar, strategy-driven validation, and optional persistence.

## Core features
- **Interactive calendar**: Click, drag, or keyboard-toggle days across the full year; screen reader announcements and "today" highlighting are built in.
- **Validation modes**: Two strategies—**strict** (each week must meet the minimum) and **average window** (12-week rolling window, best-weeks aware)—switchable in the settings workflow.
- **Centralized state**: Calendar selections are kept in a single store layer (in-memory with optional localStorage save, Nano Stores-compatible patterns) so UI, validation, and settings stay in sync.
- **Keyboard shortcuts**: Arrow keys move focus, **Space/Enter** toggles the focused day, **Esc** cancels drag selection.
- **Logging debug toggle**: Verbose logs respect `PUBLIC_DEBUG` / `PUBLIC_RTO_DEBUG` env flags, the runtime `window.__RTO_DEBUG` flag, or the `rto-calculator-debug` localStorage key.
- **Clear data actions**: "Clear all" wipes every marked day; per-month clear buttons remove just that month and announce the count cleared.

## Setup
1. Install dependencies: `npm ci`
2. Lint: `npm run lint`
3. Type and Astro checks: `npm run check`
4. Unit tests (once): `npm run test:run`
5. Build: `npm run build`

## Playwright E2E
- Full suite: `npm run test:e2e` (auto-starts preview server via `scripts/start-playwright-server.sh`).
- Debug/interactive: `npm run test:e2e:ui` or `npm run test:e2e:debug`.
- More options live in `docs/PlaywrightTesting.md`.

## Debug logging
- Build-time: set `PUBLIC_DEBUG=true` (or `PUBLIC_RTO_DEBUG=true`) in your environment before running Astro.
- Runtime: in the browser console set `window.__RTO_DEBUG = true` (or `localStorage.setItem("rto-calculator-debug", "true")`) and refresh. Set to `false` to silence debug logs.

## Guides
- User guide: [`docs/USER_GUIDE.md`](docs/USER_GUIDE.md)
- Developer guide: [`docs/DEVELOPER_GUIDE.md`](docs/DEVELOPER_GUIDE.md)
