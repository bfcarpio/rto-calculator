# RTO Calculator Documentation

Welcome to the RTO Calculator documentation! This directory contains comprehensive documentation for developers and users.

## Documentation Overview

### Getting Started

- **[USER_GUIDE.md](./USER_GUIDE.md)** - End-user guide for using the RTO Calculator
  *Start here if you're using the application to track RTO compliance*

- **[DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md)** - Developer workflows, patterns, and conventions
  *Start here if you're contributing to the codebase*

- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Complete architecture documentation
  *Deep dive into system design, patterns, and data flow*

### Testing

- **[TestingBestPractices.md](./TestingBestPractices.md)** - Unit and E2E testing best practices
  *Wait strategies, selectors, helpers, anti-patterns, browser scoping*
- **[PlaywrightTesting.md](./PlaywrightTesting.md)** - E2E testing commands and debugging
  *Quick start, CLI commands, debugging tools, troubleshooting*

### Project Planning

- **[Release1.0.md](./Release1.0.md)** - Version 1.0 release checklist

---

## Quick Links

### For New Users
1. Read [USER_GUIDE.md](./USER_GUIDE.md) to learn how to use the application
2. Open the Settings modal to configure holidays and validation mode
3. Start marking out-of-office days — compliance is computed automatically

### For New Developers
1. Read [DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md) for development workflows
2. Review [ARCHITECTURE.md](./ARCHITECTURE.md) to understand the system design
3. Check [../AGENTS.md](../AGENTS.md) for AI agent guidelines and build commands
4. Run `npm test` and `npm run test:e2e` to verify your setup

### For AI Agents
See [../AGENTS.md](../AGENTS.md) for:
- Build / lint / test commands
- Code style guidelines (The 5 Laws of Elegant Defense)
- Project structure and patterns
- Git safety protocols

---

## Documentation Structure

```
docs/
├── README.md (you are here)           # Documentation index
│
├── Core Documentation
│   ├── ARCHITECTURE.md                # System architecture
│   ├── DEVELOPER_GUIDE.md             # Developer workflows
│   └── USER_GUIDE.md                  # End-user guide
│
├── Testing
│   ├── TestingBestPractices.md         # Testing best practices
│   └── PlaywrightTesting.md           # E2E commands & debugging
│
└── Project
    └── Release1.0.md                  # Release checklist
```

---

## Key Concepts

### Reactive Validation Flow
1. **Auto-Compliance Hub** - Subscribes to date changes, debounces, dispatches results (`auto-compliance.ts`)
2. **Data Reader** - Reads calendar state via datepainter API (`calendar-data-reader.ts`)
3. **Orchestrator** - Coordinates validation without DOM dependencies (`ValidationOrchestrator.ts`)
4. **Sidebar UI** - StatusDetails and SummaryBar consume `compliance-updated` events

### Strategy Pattern for Validation
- **StrictDayCountValidator** - Each week must individually meet 3-day minimum
- **AverageWindowValidator** - 12-week rolling window, average of best 8 weeks >= 60%

### Holiday Management
- Pluggable data source architecture (currently using Nager.Date API)
- Company-specific holiday filtering
- Treats holidays as non-office days in validation

### State Management
- **datepainter** - Primary calendar state management
- **HistoryManager** - Undo/redo functionality
- **localStorage** - Persists user settings
- **rto-config.ts** - Centralized configuration

---

## Build & Test Commands

See [../AGENTS.md](../AGENTS.md) for complete command reference. Quick commands:

```bash
# Development
npm run dev             # Start dev server
npm run build           # Build for production
npm run preview         # Preview production build

# Testing
npm test                # Run unit tests (watch mode)
npm run test:run        # Run unit tests once (CI)
npm run test:e2e        # Run E2E tests with Playwright

# Linting & Formatting
npm run lint            # Check linting
npm run lint:fix        # Fix linting issues
npm run format          # Format code
npm run check           # Run all checks (lint + types)
```

---

## Technology Stack

- **Framework**: Astro v4+ (SSR + client-side hydration)
- **Language**: TypeScript (strict mode)
- **Calendar**: datepainter library
- **State**: DOM-based with datepainter API + localStorage
- **Styling**: Scoped CSS with custom properties + Bulma
- **Testing**: Vitest (unit) + Playwright (E2E)
- **Build**: Astro CLI / Vite

---

## Contributing

### Before Making Changes
1. Read [DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md)
2. Review [ARCHITECTURE.md](./ARCHITECTURE.md) for affected systems
3. Check [../AGENTS.md](../AGENTS.md) for code style guidelines

### Testing Requirements
- All unit tests must pass: `npm run test:run`
- All E2E tests must pass: `npm run test:e2e`
- Linting must pass: `npm run lint`
- Type checking must pass: `npm run check`
- Build must succeed: `npm run build`

---

*Last Updated: February 2025*
