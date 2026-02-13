# RTO Calculator Documentation

Welcome to the RTO Calculator documentation! This directory contains comprehensive documentation for developers and users.

## 📚 Documentation Overview

### Getting Started

- **[USER_GUIDE.md](./USER_GUIDE.md)** - End-user guide for using the RTO Calculator
  *Start here if you're using the application to track RTO compliance*

- **[DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md)** - Developer workflows, patterns, and conventions
  *Start here if you're contributing to the codebase*

- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Complete architecture documentation
  *Deep dive into system design, patterns, and data flow*

### Core Documentation

#### Architecture & Design
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - 3-layer validation flow, Strategy pattern, Holiday system, State management
- **[StatusColumn.md](./StatusColumn.md)** - Week status column implementation (✓, ✗, ⏳, empty states)

#### Testing
- **[PlaywrightTesting.md](./PlaywrightTesting.md)** - End-to-end testing guide with Playwright
  *Commands, debugging, best practices, troubleshooting*

### Feature Documentation

#### Holiday Management
- **[HolidayImplementation.md](./HolidayImplementation.md)** - Complete holiday management system implementation
- **[CountryDropdownFix.md](./CountryDropdownFix.md)** - Country dropdown timing fix (event-driven architecture)
- **[HolidayIntegrationFixes.md](./HolidayIntegrationFixes.md)** - Holiday validation integration bug fixes

#### Validation System
- **[RollingValidation.md](./RollingValidation.md)** - Rolling period validation algorithm details

### Historical Documentation (Bug Fixes)

These documents provide valuable historical context about bugs that were fixed:

- **[StatusColumnFixes.md](./StatusColumnFixes.md)** - Status column empty cells, week numbering, evaluation window fixes
- **[ValidationBugFix.md](./ValidationBugFix.md)** - Individual week compliance bug fix
- **[ClearAllFix.md](./ClearAllFix.md)** - Clear all button state reset fix

### Project Planning & Releases

- **[Release1.0.md](./Release1.0.md)** - Version 1.0 release notes
- **[ExtractCalendar.md](./ExtractCalendar.md)** - Calendar extraction and packaging documentation

---

## Quick Links

### For New Users
1. Read [USER_GUIDE.md](./USER_GUIDE.md) to learn how to use the application
2. Open the Settings modal to configure holidays and validation mode
3. Start marking out-of-office days and run validation

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
│   ├── USER_GUIDE.md                  # End-user guide
│   └── PlaywrightTesting.md           # E2E testing guide
│
├── Feature Documentation
│   ├── StatusColumn.md                # Status column details
│   ├── HolidayImplementation.md       # Holiday system
│   ├── CountryDropdownFix.md          # Country dropdown fix
│   ├── HolidayIntegrationFixes.md     # Holiday validation fixes
│   └── RollingValidation.md           # Validation algorithm
│
├── Historical Documentation
│   ├── StatusColumnFixes.md           # Status bugs fixed
│   ├── ValidationBugFix.md            # Validation bugs fixed
│   └── ClearAllFix.md                 # Clear button fix
│
└── Project Documentation
    ├── Release1.0.md                  # Release notes
    └── ExtractCalendar.md             # Calendar extraction
```

---

## Key Concepts

### 3-Layer Validation Flow
1. **UI Controller** - Handles user interactions (`rto-ui-controller.ts`)
2. **Data Reader** - Reads calendar state via datepainter API (`calendar-data-reader.ts`)
3. **Orchestrator** - Coordinates validation without DOM dependencies (`ValidationOrchestrator.ts`)

### Strategy Pattern for Validation
- **StrictDayCountValidator** - Each week must individually meet 3-day minimum
- **AverageWindowValidator** - 12-week rolling window, average of best 8 weeks ≥ 60%

### Holiday Management
- Pluggable data source architecture (currently using Nager.Date API)
- Company-specific holiday filtering
- Treats holidays as non-office days in validation
- Visual distinction with orange background and 🎄 emoji

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
- **Styling**: Scoped CSS with custom properties
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

### Documentation Requirements
- Update relevant docs in `docs/` for new features
- Add historical bug fix docs for significant bug fixes
- Keep [ARCHITECTURE.md](./ARCHITECTURE.md) up to date with architectural changes

---

## Getting Help

- **User Questions**: See [USER_GUIDE.md](./USER_GUIDE.md) → "Error messages and what to do"
- **Developer Questions**: See [DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md) or [ARCHITECTURE.md](./ARCHITECTURE.md)
- **Test Issues**: See [PlaywrightTesting.md](./PlaywrightTesting.md) → "Troubleshooting"
- **AI Agent Issues**: See [../AGENTS.md](../AGENTS.md)

---

## Document Maintenance

### When to Update Documentation

- **ARCHITECTURE.md**: Architectural changes, new patterns, new systems
- **DEVELOPER_GUIDE.md**: New workflows, new tools, new conventions
- **USER_GUIDE.md**: New features, UI changes, new workflows
- **Feature Docs**: When implementing new features
- **Bug Fix Docs**: When fixing significant bugs (create new doc)
- **README.md**: When adding new docs or reorganizing structure

### Documentation Standards

- Use clear headings and subheadings
- Include code examples where helpful
- Link to related documentation
- Keep historical docs for reference (don't delete)
- Use diagrams for complex flows (ASCII art is fine)
- Update the docs/ README when adding new documentation

---

*Last Updated: February 2025*
