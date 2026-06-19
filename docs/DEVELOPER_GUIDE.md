# RTO Calculator – Developer Guide

This guide provides practical information for developers working on the RTO Calculator codebase.

## Quick Links

- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - System architecture and design patterns
- **[../AGENTS.md](../AGENTS.md)** - Build/test commands and code style guidelines
- **[PlaywrightTesting.md](./PlaywrightTesting.md)** - E2E testing guide

---

## Development Workflow

### Initial Setup

```bash
# Clone and install
git clone <repo-url>
cd rto-calculator
npm install

# Build workspace dependencies (required once)
npm run build:all      # Builds nager.date and datepainter packages

# Verify setup
npm run check          # Type checking
npm run lint           # Linting
npm run test:run       # Unit tests
npm run build          # Production build
```

**Important:** This project uses npm workspaces. The workspace packages (`nager.date`, `datepainter`) must be built before running the main application. Run `npm run build:all` after cloning or when workspace code changes.

> **Note:** `npm run dev` will automatically check if workspaces are built and remind you if needed.

### Development Commands

See [../AGENTS.md](../AGENTS.md) for complete command reference:

```bash
# Build & Preview
npm run build           # Build for production
npm run preview         # Preview production build

# Testing
npm test                # Unit tests (watch mode)
npm run test:run        # Unit tests once (CI)
npm run test:e2e        # E2E tests with Playwright

# Code Quality
npm run lint            # Check linting
npm run lint:fix        # Fix linting issues
npm run format          # Format code
npm run check           # All checks (lint + types)
```

---

## Architecture Overview

### Validation Flow

```
computeWindowEvaluation() — shared pipeline (validation/window-evaluation.ts)
    ↓ reads calendar data, applies startingWeek filter, builds policy
    ↓ evaluates all sliding windows, returns WindowEvaluationResult
    │
    ├── auto-compliance.ts (reactive path)
    │     ↓ debounces 1.5s after onStateChange
    │     ↓ builds evaluated set, computes best-8-of-12 stats
    │     ↓ writes result to complianceStore
    │
    └── WindowExplorer.astro (manual path)
          ↓ passes summaries directly to UI rendering
```

**Data Reader key behavior**: Iterates through every Monday-aligned week in the calendar range (not just painted dates). For each Mon-Fri, checks the datepainter state and holiday set. Calculates `officeDays = 5 - wfhCount` (minus `holidayCount` if `holidayPenalize` is enabled, minus `sickCount` if `sickDaysPenalize` is enabled). When a penalize toggle is OFF, those days reduce the effective total instead of office days (excused absence).

See [ARCHITECTURE.md](./ARCHITECTURE.md) for detailed explanation.

### Key Systems

**Validation System** - Single sliding-window model: evaluates all 12-week windows across the calendar using best-8-of-12 policy (`rto-core.ts`)

**Holiday System** - Pluggable data source architecture:

- `HolidayManager` - Singleton service for holiday operations
- `NagerDateHolidayDataSource` - Nager.Date API integration
- Company-specific filtering via `company-filters.json`

**State Management**:

- **datepainter** - Primary calendar state via `window.__datepainterInstance`
- **HistoryManager** - Undo/redo functionality with state snapshots
- **localStorage** - Persists user settings (including `sickDaysPenalize`, `holidayPenalize`)

**Auto-Compliance Module** (`src/lib/auto-compliance.ts`):

- Singleton that subscribes to `onStateChange` with 1.5s debounce
- Calls `computeWindowEvaluation()` (shared pipeline) to get summaries and week data
- Builds evaluated set and computes best-8-of-12 sliding window stats
- Writes results to `complianceStore` (nanostore, single source of truth)
- UI components subscribe via `onComplianceChange()` for reactive updates
- Loading bar at top of viewport shows progress during debounce
- `buildEvaluatedSet()` — single-pass helper that collects timestamps of weeks appearing in the best-K of any sliding window into a `Set<number>`. Used by `findNextSafeWfhWeek()` to identify weeks safe to zero out without breaking compliance in any window. See ARCHITECTURE.md "Evaluated Set Algorithm" for full details.

**Reactive Components** (subscribe to `complianceStore` via `onComplianceChange()`):

- **StatusDetails** - Week summary, capacity, current week, non-compliant weeks (with ignored/dropped distinction)
- **StatusLegend** - Count badges for WFH/holiday/sick (directly subscribes to `onStateChange`)
- **WeekdaySelector** - Bulk weekday toggle buttons; subscribes to `onStateChange` for sync

---

## Working with the Holiday System

### Adding a New Holiday Data Source

1. **Extend HolidayDataSourceStrategy**:

```typescript
// src/lib/holiday/sources/CustomHolidayDataSource.ts
import { HolidayDataSourceStrategy } from "../HolidayDataSourceStrategy";
import type { Holiday } from "../../types/holiday-data-source";

export class CustomHolidayDataSource extends HolidayDataSourceStrategy {
  name = "custom-api";

  async getHolidaysByYear(
    year: number,
    countryCode: string,
  ): Promise<Holiday[]> {
    // Fetch from your API
    const response = await fetch(
      `https://api.example.com/holidays/${year}/${countryCode}`,
    );
    const data = await response.json();

    // Transform to Holiday interface
    return data.map((h) => ({
      date: new Date(h.date),
      name: h.name,
      countryCode: countryCode,
      localName: h.localName,
      types: h.types || ["Public"],
      global: h.global || true,
    }));
  }

  // Implement other required methods...
}
```

2. **Register the data source**:

```typescript
// src/lib/holiday/HolidayDataSourceFactory.ts
import { CustomHolidayDataSource } from "./sources/CustomHolidayDataSource";

// In initialization code
const factory = HolidayDataSourceFactory.getInstance();
const customSource = new CustomHolidayDataSource(config);
await factory.registerDataSource("custom-api", customSource);
```

### Adding Company Holiday Filters

Edit `src/lib/holiday/data/company-filters.json`:

```json
{
  "US": {
    "name": "United States",
    "companies": {
      "Acme Corp": [
        "New Year's Day",
        "Independence Day",
        "Thanksgiving Day",
        "Christmas Day"
      ],
      "Tech Startup": [
        "New Year's Day",
        "Memorial Day",
        "Independence Day",
        "Labor Day",
        "Thanksgiving Day",
        "Christmas Day"
      ]
    }
  }
}
```

---

## State Management

### Using datepainter API

The calendar uses the **datepainter** library for state management. The calendar instance is exposed globally as `window.__datepainterInstance`:

```typescript
import type { CalendarInstance, DateString } from "datepainter";

// Get calendar instance
const calendar = (window as any).__datepainterInstance as CalendarInstance;

// Get all selected dates
const dates: Map<DateString, DateState> = calendar.getAllDates();

// Set date state (takes an array of DateString values)
calendar.setDates(["2025-01-15" as DateString], "oof");

// Clear date state
calendar.clearDates(["2025-01-15" as DateString]);

// Query date state
const state = calendar.getState("2025-01-15" as DateString); // 'oof' | 'holiday' | 'sick' | null

// Get contiguous date ranges grouped by state
const allRanges = calendar.getDateRanges();
// → [{ start: DateString, end: DateString, state: 'oof', dates: [...] }, ...]

// Filter by state, before/after boundaries
const oofRanges = calendar.getDateRanges({
  state: "oof",
  after: "2025-02-01", // exclude dates on or before Feb 1
  before: "2025-03-01", // exclude dates on or after Mar 1
});
```

**Note**: `dateStore` in `src/lib/dateStore.ts` is a legacy stub. New code should use the datepainter `CalendarInstance` API directly.

### Subscribing to Compliance Data

UI components subscribe to compliance data via the `complianceStore` nanostore. This replaces the previous CustomEvent-based system:

```typescript
import { onComplianceChange } from "../lib/stores/complianceStore";

const unsub = onComplianceChange((data) => {
  // React to compliance data changes
  // `data` is ComplianceEventData with compliance status, summaries, etc.
  // Callback is deduped — only fires when the value actually changes
});

// Clean up when component unmounts
unsub();
```

For one-off reads:

```typescript
import { complianceStore } from "../lib/stores/complianceStore";

const data = complianceStore.get(); // may be null if not computed yet
```

### Working with Settings

The `settingsStore` is a `persistentAtom` that auto-syncs to localStorage. Prefer it over direct `readSettings()`/`writeSettings()` calls:

```typescript
import { settingsStore } from "../lib/stores/settingsStore";

// Read current settings
const current = settingsStore.get();

// Update settings (auto-syncs to localStorage)
settingsStore.set({ ...current, rollingWindowWeeks: 20 });

// Subscribe to settings changes
import { onSettingsChange } from "../lib/stores/settingsStore";
const unsub = onSettingsChange((settings) => {
  // React to setting changes (e.g., re-run validation)
});
unsub(); // Clean up
```

**Legacy note:** `readSettings()` and `writeSettings()` in `src/lib/settings-reader.ts` still work for backward compatibility, but new code should use `settingsStore` directly.

### Date Parsing Best Practices

Always use `parseLocalDate()` when creating dates from string input. Never use `new Date("YYYY-MM-DD")` — it parses as UTC midnight, causing off-by-one-day bugs in negative-UTC timezones:

```typescript
// WRONG — parses as UTC midnight, shows previous day in EST/CST/PST
new Date("2025-03-22"); // → Sat Mar 21 7pm EST

// CORRECT — parses as local midnight
import { parseLocalDate } from "../lib/date-helpers";
parseLocalDate("2025-03-22"); // → Sun Mar 22 midnight local

// CORRECT — constructor with numeric args is also local
new Date(2025, 2, 22); // → Sun Mar 22 midnight local (month is 0-indexed)
```

Use `assertSundayMidnight()` to validate week-start dates in tests and runtime:

```typescript
import { assertSundayMidnight } from "../lib/date-helpers";

assertSundayMidnight(weekStart, "computeWindowEvaluation"); // throws if not Sunday midnight local
```

```typescript
// src/lib/history/HistoryManager.ts
import { HistoryManager } from "../lib/history/HistoryManager";

const historyManager = HistoryManager.getInstance();

// Save current state
historyManager.pushState({
  calendarState: {
    /* date selections */
  },
  currentMonth: new Date(),
  validationConfig: {
    /* config */
  },
  timestamp: Date.now(),
});

// Undo
const previousState = historyManager.undo();
if (previousState) {
  // Restore state
}

// Redo
const nextState = historyManager.redo();
if (nextState) {
  // Restore state
}

// Check if undo/redo available
const canUndo = historyManager.canUndo();
const canRedo = historyManager.canRedo();
```

### Using localStorage

Settings are persisted via `settingsStore` (a `persistentAtom`), which auto-syncs to localStorage. Direct `localStorage` access is discouraged for settings:

```typescript
// PREFERRED — reactive, type-safe, auto-syncs
import { settingsStore } from "../lib/stores/settingsStore";

const settings = settingsStore.get();
settingsStore.set({ ...settings, countryCode: "US" });

// LEGACY — still works, but not reactive
import {
  loadFromLocalStorage,
  saveToLocalStorage,
} from "../scripts/localStorage";

saveToLocalStorage("rto-settings", { countryCode: "US" });
const settings = loadFromLocalStorage("rto-settings");
```

---

## Configuration

### Centralized Configuration

```typescript
// src/lib/rto-config.ts
export const RTO_CONFIG = {
  minOfficeDaysPerWeek: 3,
  totalWeekdaysPerWeek: 5,
  DEBUG: false,
};

export const DEFAULT_POLICY = {
  minOfficeDaysPerWeek: 3,
  totalWeekdaysPerWeek: 5,
  thresholdPercentage: 0.6, // 60%
  rollingPeriodWeeks: 12,
  topWeeksToCheck: 8,
};
```

### Validation Constants

```typescript
// src/lib/validation/constants.ts (defaults, overridable via Settings)
export const MINIMUM_COMPLIANT_DAYS = 3;
export const TOTAL_WEEK_DAYS = 5;
export const ROLLING_WINDOW_WEEKS = 12; // customizable in settings
export const COMPLIANCE_THRESHOLD = 0.6;
export const BEST_WEEKS_COUNT = 8; // customizable in settings
```

### Shared Settings

```typescript
// src/lib/stores/settingsStore.ts (preferred — reactive, auto-syncs localStorage)
import { settingsStore } from "./lib/stores/settingsStore";

const settings = settingsStore.get(); // reads current value
settingsStore.set({ ...settingsStore.get(), rollingWindowWeeks: 20 }); // writes + persists

// src/lib/settings-reader.ts (legacy — still available for backward compatibility)
import { readSettings } from "./lib/settings-reader";

const settings = readSettings(); // parses localStorage once, merges defaults
settings.rollingWindowWeeks; // 12 (default)
settings.bestWeeksCount; // 8 (default, clamped to <= rollingWindowWeeks)
```

---

## Testing

### Unit Tests (Vitest)

```bash
# Run tests in watch mode
npm test

# Run tests once
npm run test:run

# Run tests with UI
npm run test:ui

# Run specific test file
npm test -- src/lib/__tests__/HolidayManager.test.ts
```

**Test Location**: Co-locate with source in `__tests__/` folders:

- `src/lib/__tests__/` - Core logic tests
- `src/components/__tests__/` - Component tests
- `src/utils/__tests__/` - Utility tests

**Writing Tests**:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

describe("MyModule", () => {
  beforeEach(() => {
    // Setup
  });

  it("should do something", () => {
    // Arrange
    const input = {
      /* test data */
    };

    // Act
    const result = myFunction(input);

    // Assert
    expect(result).toEqual({
      /* expected */
    });
  });
});
```

### E2E Tests (Playwright)

See [PlaywrightTesting.md](./PlaywrightTesting.md) for comprehensive guide.

```bash
# Run all E2E tests
npm run test:e2e

# Open UI mode for debugging
npm run test:e2e:ui

# Run with debugger
npm run test:e2e:debug
```

---

## Debugging

### Enable Debug Logging

```typescript
// In browser console
localStorage.setItem("rto-calculator-debug", "true");

// Or set in code (src/lib/rto-config.ts)
export const RTO_CONFIG = {
  DEBUG: true,
};
```

### Using Logger

```typescript
// src/utils/logger.ts
import { debug, info, warn, error } from "../utils/logger";

debug("[MyModule] Debug information"); // Only shown when DEBUG enabled
info("[MyModule] Informational message"); // Only shown when DEBUG enabled
warn("[MyModule] Warning message"); // Always shown
error("[MyModule] Error message"); // Always shown
```

### Browser DevTools

**Exposed Globals** (for debugging):

- `window.__holidayCountries` - Array of country objects
- `window.__getHolidayManager` - Function to get HolidayManager instance
- `window.__datepainterInstance` - datepainter CalendarInstance

```javascript
// In browser console
window.__getHolidayManager().getHolidayDates(2025, "US");
window.__datepainterInstance.getAllDates();

// Check compliance data via nanostore
import { complianceStore } from "./lib/stores/complianceStore";
complianceStore.get(); // current compliance data (null if not computed)

// Check settings via nanostore
import { settingsStore } from "./lib/stores/settingsStore";
settingsStore.get(); // current settings
settingsStore.get().sickDaysPenalize; // boolean
settingsStore.get().holidayPenalize; // boolean
settingsStore.get().rollingWindowWeeks; // number
settingsStore.get().bestWeeksCount; // number
```

---

## Common Patterns

### Sliding Window Validation

```typescript
// rto-core.ts - Single validation model
// Evaluates all 12-week windows across the calendar range
// Uses best-8-of-12 policy to determine compliance
import { evaluateCompliance } from "../lib/rto-core";

const result = evaluateCompliance(weeklyData, policyConfig);
// result includes: compliant windows, violating windows, overall compliance %
```

### Factory Pattern (Holiday Data Sources)

```typescript
class HolidayDataSourceFactory {
  async registerDataSource(name: string, source: HolidayDataSourceStrategy) {
    // Register data source
  }
}
```

### Singleton Pattern (Managers)

```typescript
class HolidayManager {
  private static instance: HolidayManager;

  static async getInstance(): Promise<HolidayManager> {
    if (!HolidayManager.instance) {
      HolidayManager.instance = new HolidayManager();
      await HolidayManager.instance.initialize();
    }
    return HolidayManager.instance;
  }
}
```

---

## Code Style Guidelines

See [../AGENTS.md](../AGENTS.md) for complete guidelines including:

- **The 5 Laws of Elegant Defense**
- TypeScript conventions
- Naming conventions
- Import/export patterns
- Error handling
- Performance considerations

---

## File Organization

```
src/
├── lib/                    # Core business logic (no DOM)
│   ├── validation/         # Sliding-window validation (rto-core)
│   ├── holiday/           # Holiday management
│   ├── history/           # Undo/redo management
│   ├── stores/            # Nanostore state (complianceStore, settingsStore)
│   ├── calendar-data-reader.ts
│   ├── date-helpers.ts    # parseLocalDate, assertSundayMidnight
│   └── auto-compliance.ts

├── scripts/               # Client-side DOM integration
│   └── eventHandlers.ts

├── components/            # Astro components
├── types/                 # TypeScript types
├── utils/                 # Utility functions
└── styles/                # CSS styles
```

**Key Principle**: `lib/` has zero DOM dependencies. `scripts/` bridges lib and UI.

---

## Release Workflow

### Pre-Release Checklist

```bash
# 1. Run all checks
npm run check              # Type checking + linting
npm run test:run           # Unit tests
npm run test:e2e           # E2E tests
npm run build              # Production build

# 2. Verify build
npm run preview

# 3. Update documentation
# - Update version in package.json
# - Update CHANGELOG.md
# - Update relevant docs in docs/

# 4. Commit and tag
git add .
git commit -m "Release v1.x.x"
git tag v1.x.x
git push && git push --tags
```

### CI/CD

- `.github/workflows/astro.yml` - Unified pipeline: unit tests, E2E tests, build, deploy

---

## Troubleshooting

### Build Errors

**"Cannot find module"**

- Check import paths are correct (absolute vs. relative)
- Verify file exists and has proper extension
- Check `tsconfig.json` path mappings

**Type errors**

- Run `npm run check` to see all type errors
- Check type definitions in `src/types/`
- Ensure imports include type definitions

### Test Failures

**Unit tests failing**

- Check for missing mocks (DOM, APIs)
- Verify test data matches expected format
- Run single test: `npm test -- path/to/test.ts`

**E2E tests failing**

- Check if server is running (`npm run preview`)
- Verify selectors are correct
- See [PlaywrightTesting.md](./PlaywrightTesting.md#troubleshooting)

### Runtime Errors

**"Cannot read property of undefined"**

- Check initialization order (async initialization?)
- Verify globals are set (holidayCountries, holidayManager)
- Enable debug logging to trace execution

**Validation not working**

- Check if calendar has selections
- Check browser console for errors
- Enable debug logging to inspect auto-compliance output

---

## Getting Help

- **Architecture Questions**: [ARCHITECTURE.md](./ARCHITECTURE.md)
- **Testing Issues**: [PlaywrightTesting.md](./PlaywrightTesting.md)
- **Code Style**: [../AGENTS.md](../AGENTS.md)
- **User Features**: [USER_GUIDE.md](./USER_GUIDE.md)

---

_Last Updated: June 2026_
