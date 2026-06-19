# RTO Calculator - Architecture Documentation

## Overview

The RTO Calculator is an Astro-based web application for tracking Return-to-Office (RTO) compliance. The architecture follows a **streamlined validation flow** with clear separation of concerns, enabling pure business logic that is testable, maintainable, and simple to reason about.

## Static Site Architecture

This is a **static website** - Astro builds to pure HTML and JavaScript files that can be hosted anywhere (Netlify, Vercel, GitHub Pages, S3, etc.).

### Key Architecture Points

1. **Client-side validation** - All compliance calculations run entirely in the browser. There is no server-side processing.

2. **Single network call** - The only external server request is to the Nager.Date API for fetching public holidays. Everything else (calendar, validation, state) is local.

3. **No database** - All state is stored in localStorage (user settings) or in-memory (calendar selections).

4. **Static output** - The built application is a collection of HTML, CSS, and JS files with no server-side runtime dependencies.

**Technology Stack:**

- **Framework**: Astro (static site generator - outputs pure HTML/JS)
- **Language**: TypeScript (strict mode)
- **Calendar**: datepainter library (workspace package)
- **Holiday API**: nager-date client (workspace package)
- **State**: Nano Stores + localStorage persistence
- **Date utilities**: date-fns
- **Validation**: Zod
- **Testing**: Vitest (unit) + Playwright (E2E)

---

## The Reactive Validation Flow

Validation runs automatically via the **auto-compliance module** — a singleton that subscribes to datepainter state changes, debounces computation, and writes results to the `complianceStore` nanostore. There is no validate button.

```
┌──────────────────────────────────────────────────────────────────┐
│                     Auto-Compliance Hub                           │
│                  (src/lib/auto-compliance.ts)                    │
│                                                                   │
│  Responsibilities:                                                │
│  - Subscribe to datepainter onStateChange                         │
│  - Debounce (1.5s) then read calendar data + run validation       │
│  - Call validateSlidingWindow() from rto-core.ts                  │
│  - Compute best-8-of-12 sliding window stats                      │
│  - Write results to complianceStore (single source of truth)      │
│  - Toggle .computing opacity fade on sidebar panels               │
└───────────────────────────────┬──────────────────────────────────┘
                                │
                                ▼
┌──────────────────────────────────────────────────────────────────┐
│                      Data Reader Layer                            │
│                   (src/lib/calendar-data-reader.ts)              │
│                                                                   │
│  Responsibilities:                                                │
│  - Enumerate ALL weeks in the calendar range                      │
│  - Extract selections via datepainter API                         │
│  - Query holidays from HolidayManager                             │
│  - Calculate officeDays based on penalize settings                │
│  - Respect holidayPenalize & sickDaysPenalize from settingsStore  │
│  - Return typed data structures (DayInfo, WeekInfo)               │
└───────────────────────────────┬──────────────────────────────────┘
                                │
                                ▼
┌──────────────────────────────────────────────────────────────────┐
│                  Sliding Window Validation                        │
│              (src/lib/validation/rto-core.ts)                    │
│                                                                   │
│  Responsibilities:                                                │
│  - validateSlidingWindow(): pure function, no DOM deps            │
│  - Best-8-of-12 week rolling window compliance check              │
│  - Returns SlidingWindowResult with per-window stats              │
└──────────────────────────────────────────────────────────────────┘
```

### Data Flow

Both consumers — the auto-compliance module (reactive sidebar) and WindowExplorer (manual query) — call the same shared `computeWindowEvaluation()` pipeline.

```
[Calendar state change]
       │
       ▼
calendarManager.onDateStateChange()  ← fine-grained callback (Phase 3)
       │
       ▼
runComputation(calendarManager)
       │
       ▼
computeWindowEvaluation() → computeComplianceData()
       │
       ▼
complianceStore.set(data)             ← nanostore (single source of truth)
       │
       ├──▶ StatusDetailsController subscribes via onComplianceChange()
       ├──▶ WindowExplorer subscribes via onComplianceChange()
       ├──▶ ComplianceLabel subscribes via onComplianceChange()
       ├──▶ SummaryBar subscribes via onComplianceChange()
       └──▶ WeekSummary subscribes via onComplianceChange()
```

WindowExplorer.astro follows the same path but passes results directly to its own UI rendering instead of writing to the store.

---

## Sliding Window Validation

The validation system uses a single **sliding window** approach implemented as a pure function. There is no strategy hierarchy or factory — just one function that implements the best-8-of-12 week rolling window compliance check.

### How It Works

```
  validateSlidingWindow(weeks, policy)
          │
          ▼
  ┌─────────────────────────────────┐
  │  For each 12-week window:       │
  │  1. Sort weeks by officeDays    │
  │  2. Take best 8 weeks           │
  │  3. Average office days         │
  │  4. Compare against threshold   │
  │     (60% = 3/5 days)            │
  └─────────────────────────────────┘
          │
          ▼
  SlidingWindowResult
  - isValid, message
  - overallCompliance
  - windowResults[]
  - compliantWindows[]
  - violatingWindows[]
```

### Key Components

| Component                     | Purpose                                                                                             | Location                                  |
| ----------------------------- | --------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| **validateSlidingWindow()**   | Pure function: best-8-of-12 rolling window compliance check                                         | `src/lib/validation/rto-core.ts`          |
| **computeWindowEvaluation()** | Shared pipeline: reads calendar data, evaluates all windows, returns summaries + policy + week data | `src/lib/validation/window-evaluation.ts` |
| **constants**                 | ROLLING_WINDOW_WEEKS, BEST_WEEKS_COUNT, COMPLIANCE_THRESHOLD, etc.                                  | `src/lib/validation/constants.ts`         |
| **ValidationManager**         | Simplified client-side config holder (exposed as `window.validationManager`)                        | `src/scripts/ValidationManager.ts`        |
| **buildEvaluatedSet()**       | Identifies weeks contributing to compliance across all windows                                      | `src/lib/auto-compliance.ts`              |
| **findNextSafeWfhWeek()**     | Finds earliest future week safe for full WFH                                                        | `src/lib/auto-compliance.ts`              |

### Evaluated Set Algorithm (Next Safe WFH Week)

The "Next available WFH week" feature uses an **evaluated set** algorithm to determine which future weeks can safely be taken as full WFH without breaking compliance in any sliding window.

**Problem**: A week may appear in up to W sliding windows (where W = rolling period, typically 12). Simply checking the display window misses windows earlier in the calendar where removing a week could cause a violation.

**Key insight**: A week is safe to zero out if and only if it is NOT in the best-K of ANY sliding window containing it. If it's already dropped (outside the best-K) in every window, zeroing it changes nothing — compliance is unaffected.

**Algorithm** (`buildEvaluatedSet`):

```
1. Convert all calendar weeks to compliance format
2. For each sliding window position [start .. start+W]:
   a. Sort window weeks by officeDays DESC, weekStart DESC (tiebreak)
   b. Take the top-K weeks (the "best" weeks the validator evaluates)
   c. Add their timestamps to a Set<number>
3. Return the set of all "evaluated" week timestamps
```

```
findNextSafeWfhWeek:
1. Gate: if not currently compliant → return null
2. Build the evaluated set
3. Find the first future week where:
   - officeDays >= REQUIRED_OFFICE_DAYS (currently compliant)
   - timestamp NOT in the evaluated set (safe to zero out)
4. Return earliest match, or null
```

**Sort contract**: The sort in `buildEvaluatedSet` must match `evaluateWindow` in `rto-core.ts`:

```typescript
(a, b) =>
  b.officeDays - a.officeDays || b.weekStart.getTime() - a.weekStart.getTime();
```

**Complexity**: O((N−W+1) × W log W) — same cost as validation itself. For a 12-month calendar (~52 weeks, W=12, K=8): ~41 windows × 12 × log(12) ≈ 1,700 comparisons. Completes in <1ms.

**Trade-off**: This is intentionally conservative. A week that appears in some window's best-K might theoretically still be removable if its replacement keeps the average up. But for a user-facing suggestion, conservative is correct — we never recommend removing a week that's actively contributing to compliance in any window.

---

## Store Layer

Nanostores provide the reactive state layer, replacing the previous CustomEvent dispatch and module-level cache system.

| Store             | Type           | Location                            | Purpose                                                                                |
| ----------------- | -------------- | ----------------------------------- | -------------------------------------------------------------------------------------- |
| `complianceStore` | atom           | `src/lib/stores/complianceStore.ts` | Compliance data, replaces CustomEvent dispatch + `latestResult` cache                  |
| `settingsStore`   | persistentAtom | `src/lib/stores/settingsStore.ts`   | App settings, replaces `readSettings()`/`writeSettings()` + direct localStorage access |

### How Stores Work

**complianceStore** — Written by auto-compliance, consumed by UI components:

```typescript
import {
  complianceStore,
  onComplianceChange,
} from "../lib/stores/complianceStore";

// Write (auto-compliance only)
complianceStore.set(complianceData);

// Subscribe (UI components) — deduped, only fires on change
const unsub = onComplianceChange((data) => {
  // Update UI with new compliance data
});
unsub(); // Clean up
```

**settingsStore** — Persists to localStorage automatically via `persistentAtom`:

```typescript
import { settingsStore, onSettingsChange } from "../lib/stores/settingsStore";

// Read
const settings = settingsStore.get();

// Write (auto-syncs to localStorage)
settingsStore.set({ ...settingsStore.get(), rollingWindowWeeks: 20 });

// Subscribe
const unsub = onSettingsChange((settings) => {
  // React to setting changes
});
unsub(); // Clean up
```

### Migration from CustomEvents

| Old (CustomEvent + globals)                                  | New (nanostores)                                       |
| ------------------------------------------------------------ | ------------------------------------------------------ |
| `window.dispatchEvent(new CustomEvent('rto:state-changed'))` | `complianceStore.set(data)`                            |
| `latestResult` module-level variable                         | `complianceStore` atom                                 |
| `getLatestCompliance()` returns cached data                  | `complianceStore.get()` returns current value          |
| `onComplianceUpdated(callback)` subscribes to CustomEvents   | `onComplianceChange(callback)` subscribes with dedup   |
| `readSettings()` parses localStorage each call               | `settingsStore.get()` reads from persistent atom       |
| `writeSettings(partial)` writes localStorage directly        | `settingsStore.set(merged)` auto-syncs to localStorage |

---

## Holiday Management System

The application includes a sophisticated holiday management system with pluggable data sources.

### Architecture Overview

```
┌──────────────────────────────────────────────────────────────┐
│                     HolidayManager                            │
│                      (Singleton)                              │
│                                                               │
│  - Company-specific filtering                                 │
│  - Cache management                                           │
│  - Calendar integration                                       │
│  - Async initialization                                       │
└───────────────────────────┬──────────────────────────────────┘
                            │
                            │ uses
                            ▼
┌──────────────────────────────────────────────────────────────┐
│              HolidayDataSourceFactory                         │
│                      (Singleton)                              │
│                                                               │
│  - Registers data sources                                     │
│  - Health checks                                              │
│  - Statistics collection                                      │
└───────────────────────────┬──────────────────────────────────┘
                            │
                            │ creates
                            ▼
┌──────────────────────────────────────────────────────────────┐
│           HolidayDataSourceStrategy                           │
│                  (Abstract Base)                              │
│                                                               │
│  - Caching with TTL                                           │
│  - Multiple query methods                                     │
│  - Configuration management                                   │
└───────────────────────────┬──────────────────────────────────┘
                            │
                            │ extends
                            ▼
┌──────────────────────────────────────────────────────────────┐
│           NagerDateHolidayDataSource                          │
│              (Concrete Implementation)                        │
│                                                               │
│  - Nager.Date API integration                                 │
│  - Optimized endpoints                                        │
│  - Error handling (404, 400, 500, timeout)                    │
│  - Date parsing with timezone awareness                       │
└──────────────────────────────────────────────────────────────┘
```

### Holiday Features

**Data Sources:**

- Pluggable architecture allows multiple holiday data sources
- Current implementation: Nager.Date API (free public holiday service)
- Supports 100+ countries

**Company Filtering:**

- Loads company-specific holiday rules from `company-filters.json`
- Allows filtering by country + company combination
- Supports county-level filtering

**Calendar Integration:**

- `applyHolidaysToCalendar()` - marks holidays as out-of-office
- `removeHolidaysFromCalendar()` - cleanup
- `refreshCalendarHolidays()` - re-apply with new settings
- Automatic weekday-only filtering

**Performance:**

- Caching by (country, company, years, weekdayFilter)
- TTL-based cache expiration
- Optimized API endpoints (isTodayHoliday, getUpcomingHolidays)

---

## State Management

### 1. datepainter Library (Primary Calendar State)

The application uses the **datepainter** library for calendar rendering and state management.

**API Methods** (via `CalendarInstance`):

- `getAllDates()` - Get all dates as `Map<DateString, DateState>`
- `getState(date)` - Query state of a single date
- `setDates(dates, state)` - Set state for multiple dates
- `clearDates(dates)` - Clear state for multiple dates
- `getDateRanges(options?)` - Get contiguous date ranges grouped by state

**State Types:**

- `"oof"` - Work from home (internal key kept as "oof" for backwards compatibility)
- `"holiday"` - Public holiday
- `"sick"` - Sick leave

**Global Access:** The calendar instance is exposed as `window.__datepainterInstance`.

**Reactivity Layers:**

Nanostores and datepainter callbacks serve different layers and should not be mixed:

```
nanostores (internal to datepainter package)
  selectedDates atom → CalendarManager.subscribeToStoreChanges()
    → re-renders day cells
    → fires onStateChange() callbacks

onStateChange (datepainter public API — per-date granularity)
  → StatusLegend: count badges (direct, no debounce)
  → auto-compliance module: debounced aggregate computation

complianceStore (application layer — nanostore, single source of truth)
  → StatusDetails: week summary, capacity, non-compliant weeks
  → SummaryBar: compliance overview
  → Other sidebar components subscribe via onComplianceChange()
```

**Rule of thumb:** Components that need per-date granularity (StatusLegend counts) subscribe to `onStateChange` directly. Components that need aggregate/computed stats subscribe to `complianceStore` via `onComplianceChange()` — this avoids duplicating expensive computation and naturally deduplicates rapid changes.

**Legacy Note:** `dateStore` in `src/lib/dateStore.ts` is a compatibility stub. New code should use the datepainter `CalendarInstance` API directly.

### 2. HistoryManager (Undo/Redo)

Manages state snapshots for undo functionality.

**Features:**

- Stack of `StateSnapshot` objects
- Deep copy strategy for immutability
- Configurable max stack size (default 10)
- Captures:
  - Calendar date states
  - Current month
  - Validation configuration
  - Timestamp

**Location:** `src/lib/history/HistoryManager.ts`

### 3. Settings Store (Persistent State)

The `settingsStore` (powered by `@nanostores/persistent`) is the single source of truth for app settings, automatically syncing to localStorage. It replaces the previous `readSettings()`/`writeSettings()` functions.

**Persisted Data:**

- Selected country code
- Selected company name
- Holiday preferences
- Sick day policy (`sickDaysPenalize` — whether sick days count against compliance)
- Holiday policy (`holidayPenalize` — whether holidays count against compliance)
- Rolling window weeks
- Best weeks count
- User settings (theme, etc.)

**Location:** `src/lib/stores/settingsStore.ts`

**Legacy note:** `src/lib/settings-reader.ts` still exports `readSettings()` and `writeSettings()` for backward compatibility, but new code should use `settingsStore.get()` and `settingsStore.set()` directly.

### 4. Configuration State

**Centralized Configuration:** `src/lib/rto-config.ts`

```typescript
export const RTO_CONFIG = {
  minOfficeDaysPerWeek: 3, // 3 office days required
  totalWeekdaysPerWeek: 5, // 5 weekdays per week
  DEBUG: false,
};

export const DEFAULT_POLICY = {
  minOfficeDaysPerWeek: 3,
  totalWeekdaysPerWeek: 5,
  thresholdPercentage: 0.6, // 60% = 3/5
  rollingPeriodWeeks: 12, // 12-week window
  topWeeksToCheck: 8, // Best 8 of 12 weeks
};
```

**Constants:** `src/lib/validation/constants.ts`

```typescript
export const MINIMUM_COMPLIANT_DAYS = 3;
export const TOTAL_WEEK_DAYS = 5;
export const ROLLING_WINDOW_WEEKS = 12;
export const COMPLIANCE_THRESHOLD = 0.6;
export const BEST_WEEKS_COUNT = 8;
```

---

## Directory Structure

```
src/
├── components/           # Astro UI components
│   ├── Datepainter.astro              # Calendar widget
│   ├── HolidayCountrySelector.astro   # Country/company selection
│   ├── SettingsModal.astro            # Settings dialog
│   ├── ShortcutsModal.astro           # Keyboard shortcuts help dialog
│   ├── StatusDetails.astro            # Week status visualization
│   ├── StatusLegend.astro             # Legend for status indicators
│   ├── WeekdaySelector.astro          # Bulk weekday WFH toggle buttons
│   ├── ActionButtons.astro            # Action buttons
│   ├── SummaryBar.astro               # Compliance summary
│   ├── PanelToggle.astro              # Collapsible panels
│   ├── MobileMenu.astro               # Mobile navigation
│   └── __tests__/                     # Component tests
│
├── lib/                  # Core business logic (framework-agnostic)
│   ├── validation/       # Validation domain
│   │   ├── rto-core.ts                  # Pure sliding window validation function
│   │   ├── window-evaluation.ts         # Shared pipeline (computeWindowEvaluation)
│   │   ├── all-windows.ts              # evaluateAllWindows helper
│   │   ├── constants.ts                 # Validation constants
│   │   └── index.ts                     # Module exports
│   │
│   ├── holiday/          # Holiday management
│   │   ├── HolidayManager.ts                    # High-level manager
│   │   ├── HolidayDataSourceFactory.ts          # Factory for data sources
│   │   ├── HolidayDataSourceStrategy.ts         # Abstract base
│   │   ├── NagerDateHolidayDataSource.ts        # Nager.Date implementation
│   │   ├── CalendarHolidayIntegration.ts        # Calendar integration
│   │   ├── data/                                # Static holiday data
│   │   │   └── company-filters.json             # Company-specific filters
│   │   └── sources/                             # API integrations
│   │
│   ├── history/          # Undo/state management
│   │   └── HistoryManager.ts            # State snapshot management
│   │
│   ├── auto-compliance.ts         # Auto-compliance singleton (debounced stats via complianceStore)
│   ├── calendar-data-reader.ts    # Data extraction layer (DOM → pure data)
│   ├── rto-config.ts              # Configuration constants
│   ├── date-helpers.ts            # parseLocalDate, assertSundayMidnight (UTC safety)
│   ├── dateStore.ts               # Legacy stub (use datepainter CalendarInstance instead)
│   ├── stores/                    # Nanostore state management
│   │   ├── complianceStore.ts     # Compliance data atom (single source of truth)
│   │   ├── settingsStore.ts       # Settings persistentAtom (auto-syncs localStorage)
│   │   └── index.ts               # Store re-exports
│
├── scripts/              # Client-side DOM integration
│   ├── ValidationManager.ts       # Simplified config holder (client-side)
│   ├── eventHandlers.ts
│   ├── settings-modal.ts
│   ├── localStorage.ts
│   ├── keyboard-shortcuts.ts
│   └── debug.ts
│
├── types/                # TypeScript type definitions
│   ├── calendar-types.d.ts
│   ├── holiday-data-source.ts
│   └── index.ts
│
├── utils/                # Utility functions
│   ├── dateUtils.ts
│   ├── dragSelection.ts
│   ├── storage.ts
│   └── logger.ts
│
├── layouts/              # Astro layouts
│   └── BaseLayout.astro
│
├── pages/                # Astro pages
│   └── index.astro
│
└── styles/               # Global styles
    └── global.css
```

---

## Key Design Principles

### 1. Separation of Concerns

- **Auto-Compliance Hub**: Reactive singleton that debounces, reads data, runs validation, and writes results to complianceStore
- **Shared Pipeline**: `computeWindowEvaluation()` is the single entry point for computing sliding window summaries — used by both auto-compliance and WindowExplorer, eliminating duplicated data reading and evaluation logic
- **Data Reader Layer**: Single DOM query, returns typed data
- **Sliding Window Validation**: Pure function in `rto-core.ts`, no DOM dependencies
- **Sidebar Components**: Subscribe to `complianceStore` via `onComplianceChange()` to render stats

### 2. Pure Functions

All validation logic in `src/lib/` uses pure functions:

- Same input always produces same output
- No side effects or DOM manipulation
- Easy to test and reason about

### 3. Single Validation Function

Validation uses a single pure function (`validateSlidingWindow()` in `rto-core.ts`) rather than a class hierarchy. This keeps the validation logic simple, testable, and easy to understand — there is one algorithm (best-8-of-12 sliding window) with no need for runtime strategy selection.

### 4. Singleton Pattern

Used for managers that need single instances:

- `HolidayManager.getInstance()` - async initialization
- `HolidayDataSourceFactory.getInstance()` - manages data sources
- `HistoryManager.getInstance()` - state snapshots

---

## Data Structures

### WeekInfo (Data Reader Output)

```typescript
interface WeekInfo {
  weekStart: Date; // Monday at midnight
  weekNumber: number; // Sequential (1, 2, 3...)
  days: DayInfo[]; // Days in this week
  oofCount: number; // WFH (work-from-home) days
  holidayCount: number; // Holiday days in this week
  sickCount: number; // Sick days in this week
  officeDays: number; // Calculated: 5 - WFH (- holidays if penalizing) (- sick if penalizing)
  totalDays: number; // Effective weekdays (excluding holidays/sick)
  oofDays: number; // Alias for oofCount
  isCompliant: boolean; // Meets 3-day minimum?
  isUnderEvaluation: boolean; // In 12-week window?
  status: WeekStatus; // "compliant" | "invalid" | "pending" | "excluded" | "ignored"
}
```

### DayInfo

```typescript
interface DayInfo {
  date: Date;
  element: HTMLElement | null;
  isWeekday: boolean;
  isSelected: boolean;
  selectionType: "out-of-office" | null;
  isHoliday: boolean;
}
```

### WindowEvaluationResult (Shared Pipeline Output)

```typescript
interface WindowEvaluationResult {
  summaries: WindowSummary[]; // All sliding window summaries
  policy: RTOPolicyConfig; // The policy config used for evaluation
  allWeeks: WeekInfo[]; // Unfiltered weeks from calendar (before startingWeek)
  filteredWeeks: WeekInfo[]; // Weeks after startingWeek filter applied
}
```

Returned by `computeWindowEvaluation()` — the shared entry point used by both auto-compliance and WindowExplorer.

### SlidingWindowResult

```typescript
interface SlidingWindowResult {
  isValid: boolean;
  message: string;
  overallCompliance: number;
  windowResults: WindowCompliance[];
  violatingWindows: WindowCompliance[];
  compliantWindows: WindowCompliance[];
}
```

### Holiday

```typescript
interface Holiday {
  date: Date;
  name: string;
  countryCode: string;
  localName: string;
  types: HolidayType[];
  fixed?: boolean;
  global?: boolean;
  counties?: string[];
  launchYear?: number;
}
```

---

## Component Architecture

### Core Components

#### `pages/index.astro`

- Main application entry point
- Orchestrates component rendering
- Generates 12-month calendar starting from current month
- Initializes validation scripts and event handlers

#### `components/Datepainter.astro`

- Calendar widget integration
- Wraps datepainter library
- Handles date selection and state management

#### `components/HolidayCountrySelector.astro`

- Country and company selection dropdown
- Triggers holiday fetching
- Persists selection to localStorage

#### `components/SettingsModal.astro`

- Settings dialog for holidays, sick day policy, holiday policy, etc.
- Pattern presets (Mon-Wed-Fri, Tue-Thu, All WFH)
- Sick day policy toggle (`sickDaysPenalize`) — controls whether sick days reduce office count
- Holiday policy toggle (`holidayPenalize`) — controls whether holidays reduce office count
- Configuration management

#### `components/ShortcutsModal.astro`

- Keyboard shortcuts help dialog (native `<dialog>` element)
- Opens via `?` button in header or `?` key shortcut
- Lists all shortcuts grouped by category (painting modes, actions, calendar grid)

#### `components/StatusDetails.astro`

- Subscribes to `complianceStore` via `onComplianceChange()` for reactive updates
- Compliance status box (compliant/not compliant with color coding)
- Week summary, capacity, current week status, non-compliant weeks
- Non-compliant weeks show "Dropped" (dimmed) for dropped weeks vs "Needs X more" for counted weeks
- Updates after 1.5s debounce as dates are painted

#### `components/WeekdaySelector.astro`

- Wrapped in a collapsible `<details>`/`<summary>` drawer
- Row of 5 weekday toggle buttons (Mon–Fri) for bulk WFH marking
- Toggling a day ON marks every instance of that weekday across the full calendar range as WFH
- Toggling OFF clears all instances of that weekday
- Subscribes to `onStateChange` to sync button states (active only if ALL instances are marked `oof`)
- Uses `getDateRange()`, `getDateRangeArray()`, `formatDate()` from `dateUtils.ts`

#### `components/SummaryBar.astro` _(commented out)_

- Previously showed average in-office days, working days, WFH/holiday counts
- Functionality consolidated into StatusDetails

---

## Extension Points

### Adding New Holiday Data Sources

1. Extend `HolidayDataSourceStrategy`:

```typescript
class CustomHolidayDataSource extends HolidayDataSourceStrategy {
  name = "custom-api";

  async getHolidaysByYear(
    year: number,
    countryCode: string,
  ): Promise<Holiday[]> {
    // Implementation
  }

  // Implement other required methods...
}
```

2. Register with factory:

```typescript
const factory = HolidayDataSourceFactory.getInstance();
const source = new CustomHolidayDataSource(config);
await factory.registerDataSource("custom-api", source);
```

---

## Testing Strategy

Tests are co-located with source files:

```
src/
├── lib/
│   └── __tests__/
│       ├── sliding-window-validation.test.ts
│       ├── calendar-data-reader.test.ts
│       ├── HolidayManager.test.ts
│       └── HistoryManager.test.ts
│
├── components/
│   └── __tests__/
│       └── Datepainter.test.ts
│
└── utils/
    └── __tests__/
        ├── dateUtils.test.ts
        └── validation.test.ts

e2e/
├── hello-world.spec.ts
├── calendar-interactions.spec.ts
├── validation-flows.spec.ts
└── test-helpers.ts
```

**Test Commands:**

- `npm test` - Run unit tests in watch mode
- `npm run test:run` - Run unit tests once (CI)
- `npm run test:e2e` - Run E2E tests with Playwright
- `npm run test:ui` - Run tests with UI

See [PlaywrightTesting.md](./PlaywrightTesting.md) for E2E testing guide.
See [AGENTS.md](../AGENTS.md) for build/test commands.

---

## Performance Considerations

### Caching Strategy

1. **Validation**
   - `validateSlidingWindow()` is a pure function — no internal caching needed
   - Recomputed on each compliance pass (debounced at 1.5s)
   - Lightweight: operates on pre-computed WeekInfo[] arrays

2. **Holiday Caching**
   - HolidayDataSourceStrategy provides TTL-based caching
   - Cached by (country, year) tuple
   - Configurable cache expiration

3. **datepainter State**
   - Efficient DOM updates via library
   - Minimal re-renders
   - Optimized for large calendars

### Optimization Techniques

- **Single DOM Query**: Data Reader layer queries DOM once
- **Pure Functions**: Validation logic has no side effects
- **Lazy Initialization**: HolidayManager and HistoryManager use lazy init
- **Debouncing**: User input debounced where appropriate

---

## Known Limitations

1. **No Server-Side Persistence**: All state stored client-side
2. **Single User**: No multi-user or collaboration features
3. **Fixed 12-Month View**: Cannot navigate to different years
4. **Client-Side Validation**: All validation runs in browser

---

## Related Documentation

- [DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md) - Developer workflows and patterns
- [USER_GUIDE.md](./USER_GUIDE.md) - End-user documentation
- [PlaywrightTesting.md](./PlaywrightTesting.md) - E2E testing guide
- [AGENTS.md](../AGENTS.md) - AI agent guidelines and build commands

---

## Summary

The RTO Calculator architecture prioritizes:

1. **Clear separation** between UI, data reading, and validation layers
2. **Pure functions** for business logic (testable, predictable)
3. **Simple validation** — a single `validateSlidingWindow()` function in `rto-core.ts` (no class hierarchies)
4. **Single DOM query** to extract data, then pure operations
5. **Nanostores** for reactive state — `complianceStore` for compliance data, `settingsStore` for persistent settings
6. **Type safety** throughout with comprehensive TypeScript interfaces
7. **Pluggable holiday system** with Factory Pattern for data source instantiation
8. **Undo functionality** via HistoryManager
9. **datepainter integration** for efficient calendar state management
10. **UTC-safe date handling** — `parseLocalDate()` and `assertSundayMidnight()` prevent timezone bugs

This architecture enables easy testing, maintenance, and extension while maintaining clean separation of concerns and predictable behavior.
