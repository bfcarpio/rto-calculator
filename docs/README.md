# RTO Calculator Documentation

This directory contains documentation for users and developers.

## Documentation Index

### User Documentation
- **[USER_GUIDE.md](./USER_GUIDE.md)** - End-user guide for tracking RTO compliance

### Developer Documentation
- **[DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md)** - Development workflows, patterns, and conventions
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - System design, data flow, and validation logic

### Testing Documentation
- **[TestingBestPractices.md](./TestingBestPractices.md)** - Unit and E2E testing guidelines
- **[PlaywrightTesting.md](./PlaywrightTesting.md)** - E2E commands and debugging

---

## Quick Start

### For Users
1. Read [USER_GUIDE.md](./USER_GUIDE.md)
2. Configure holidays in Settings (select country)
3. Mark WFH days on the calendar — compliance is automatic

### For Developers
1. Read [DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md) for workflows
2. Review [ARCHITECTURE.md](./ARCHITECTURE.md) for design
3. Run `npm run build:all && npm run dev` to start

---

## Key Concepts

- **Static site** - Astro builds to pure HTML/JS, deployable anywhere
- **Client-side validation** - All compliance calculations happen in the browser
- **Single network call** - Only holiday data fetched from Nager.Date API
- **Best-8-of-12 sliding window** - Automatic compliance check (no validate button)

## Technology Stack

- **Astro** - Static site generator
- **datepainter** - Calendar component (workspace package)
- **nager-date** - Holiday API client (workspace package)
- **Nano Stores** - State management
- **date-fns** - Date utilities
- **Zod** - Validation
- **Vitest** - Unit tests
- **Playwright** - E2E tests

---

## Common Commands

```bash
npm run build:all    # Build workspace packages
npm run dev          # Start dev server
npm run build        # Production build
npm run check        # Lint + type check
npm run test:run     # Unit tests
npm run test:e2e     # E2E tests
```

See [DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md) for complete command reference.

---

*Last Updated: March 2026*
