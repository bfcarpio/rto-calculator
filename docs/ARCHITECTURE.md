# RTO Calculator - Architecture Documentation

## Overview

The RTO Calculator is an Astro-based web application for tracking Return-to-Office (RTO) compliance. The architecture follows a **3-layer validation flow** with clear separation of concerns, enabling pure business logic that is testable, maintainable, and extensible.

**Technology Stack:**
- **Framework**: Astro v4+ (SSR + client-side hydration)
- **Language**: TypeScript (strict mode)
- **Calendar**: datepainter library (custom calendar widget)
- **Date utilities**: date-fns (tree-shakeable date library)
- **State Management**: DOM-based with datepainter API + localStorage persistence
- **Styling**: Scoped CSS with custom properties
- **Testing**: Vitest (unit) + Playwright (E2E)
- **Build**: Astro CLI / Vite

---

## The 3-Layer Validation Flow

The validation system is organized into three distinct layers, each with specific responsibilities:

```
┌──────────────────────────────────────────────────────────────────┐
│                         UI Controller Layer                       │
│              (src/components/ActionButtons.astro +                │
│               src/scripts/rto-ui-controller.ts)                  │
│                                                                   │
│  Responsibilities:                                                │
│  - Handle user interactions (click events)                        │
│  - Trigger validation workflows                                   │
│  - Display results to users                                       │
│  - No validation logic here - delegates to orchestrator           │
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
│  - Calculate officeDays = 5 - holidays - OOF (- sick)             │
│  - Respect sickDaysPenalize setting from localStorage             │
│  - Return typed data structures (DayInfo, WeekInfo)               │
│  - Only layer with DOM access                                     │
└───────────────────────────────┬──────────────────────────────────┘
                                │
                                ▼
┌──────────────────────────────────────────────────────────────────┐
│                       Orchestration Layer                         │
│               (src/lib/validation/ValidationOrchestrator.ts)     │
│                                                                   │
│  Responsibilities:                                                │
│  - Coordinate validation workflow                                 │
│  - Manage configuration and policy application                    │
│  - No DOM dependencies - works with pure data                     │
│  - Delegates to concrete strategies via Factory                   │
│  - Updates week status based on validation results                │
└──────────────────────────────────────────────────────────────────┘
```

### Data Flow Example

```
User clicks "Validate" button
        │
        ▼
┌───────────────┐
│ UI Controller │  Step 1: Trigger validation
│   (rto-ui-    │
│  controller)  │
└───────┬───────┘
        │
        ▼
┌───────────────┐
│  Data Reader  │  Step 2: Read calendar state via datepainter API
│ (calendar-    │  - Enumerate ALL weeks in calendar range
│ data-reader)  │  - Check each weekday against datepainter state
│               │  - Fetch holidays from HolidayManager
│               │  - Return WeekInfo[] (officeDays = 5 - deductions)
└───────┬───────┘
        │
        ▼
┌───────────────┐
│ Orchestrator  │  Step 3: Coordinate validation
│               │  - Convert data for strategies
│               │  - Run sliding window validation
│               │  - Update week statuses
└───────┬───────┘
        │
        ▼
┌───────────────┐
│   UI Update   │  Step 4: Reflect results in DOM
│   (status     │  - Update week status icons
│    cells)     │  - Show compliance messages
└───────────────┘
```

---

## The Strategy Pattern for Validation

The validation system uses the **Strategy Pattern** to support different validation modes. This allows the system to swap between different validation algorithms without changing the core code.

### Class Hierarchy

```
                    ValidationStrategy
                   (Abstract Base Class)
                          ▲
                          │ extends
                          │
        ┌─────────────────┴─────────────────┐
        │                                   │
        ▼                                   ▼
StrictDayCountValidator          AverageWindowValidator
        │                                   │
        │   "strict"                        │   "average"
        │                                   │
        ├─ Each week must                  ├─ 12-week rolling
        │   individually                    │   window averages
        │   meet minimum                    │   of best 8 weeks
        │                                   │
        ├─ Fail-fast on                    ├─ Sort weeks by
        │   first violation                 │   office days
        │                                   │
        └─ Enforces 3/5 rule               └─ Enforces 60%
            per week                          threshold
```

### Key Components

| Component | Purpose | Location |
|-----------|---------|----------|
| **ValidationStrategy** | Abstract base class defining the interface for all validators | `src/lib/validation/ValidationStrategy.ts` |
| **StrictDayCountValidator** | Validates that each week individually meets minimum office day requirements | `src/lib/validation/StrictDayCountValidator.ts` |
| **AverageWindowValidator** | Validates using 12-week rolling window averages of best 8 weeks | `src/lib/validation/AverageWindowValidator.ts` |
| **ValidationFactory** | Factory pattern to create appropriate validator instances | `src/lib/validation/ValidationFactory.ts` |
| **ValidationManager** | Client-side manager for strategies (exposed as `window.validationManager`) | `src/scripts/ValidationManager.ts` |

### ValidationFactory Usage

```typescript
// Factory creates appropriate validator based on mode
const validator = ValidationFactory.createValidator("strict");
// or
const validator = ValidationFactory.createValidator("average");

// All validators implement the same interface
const result = validator.validate(context);
```

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
- `"oof"` - Out of office (work from home)
- `"holiday"` - Public holiday
- `"sick"` - Sick leave

**Global Access:** The calendar instance is exposed as `window.__datepainterInstance`.

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

### 3. localStorage (Persistence)

**Persisted Data:**
- Selected country code
- Selected company name
- Holiday preferences
- Validation mode
- Sick day policy (`sickDaysPenalize` - whether sick days count against compliance)
- User settings

**Managed by:** `src/scripts/localStorage.ts`

### 4. Configuration State

**Centralized Configuration:** `src/lib/rto-config.ts`

```typescript
export const RTO_CONFIG = {
  minOfficeDaysPerWeek: 3,      // 3 office days required
  totalWeekdaysPerWeek: 5,      // 5 weekdays per week
  DEBUG: false,
};

export const DEFAULT_POLICY = {
  minOfficeDaysPerWeek: 3,
  totalWeekdaysPerWeek: 5,
  thresholdPercentage: 0.6,       // 60% = 3/5
  rollingPeriodWeeks: 12,         // 12-week window
  topWeeksToCheck: 8,             // Best 8 of 12 weeks
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
│   ├── StatusDetails.astro            # Week status visualization
│   ├── StatusLegend.astro             # Legend for status indicators
│   ├── ActionButtons.astro            # Action buttons
│   ├── SummaryBar.astro               # Compliance summary
│   ├── PanelToggle.astro              # Collapsible panels
│   ├── MobileMenu.astro               # Mobile navigation
│   └── __tests__/                     # Component tests
│
├── lib/                  # Core business logic (framework-agnostic)
│   ├── validation/       # Validation domain with Strategy Pattern
│   │   ├── ValidationStrategy.ts        # Abstract base class
│   │   ├── StrictDayCountValidator.ts   # Concrete strategy
│   │   ├── AverageWindowValidator.ts    # Concrete strategy
│   │   ├── ValidationFactory.ts         # Factory for creating validators
│   │   ├── ValidationOrchestrator.ts    # Orchestrates validation flow
│   │   ├── rto-core.ts                  # Pure validation functions
│   │   ├── RollingPeriodValidation.ts   # Legacy wrapper
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
│   ├── calendar-data-reader.ts    # Data extraction layer (DOM → pure data)
│   ├── rto-config.ts              # Configuration constants
│   └── dateStore.ts               # Legacy stub (use datepainter CalendarInstance instead)
│
├── scripts/              # Client-side DOM integration
│   ├── rto-ui-controller.ts       # UI Controller layer
│   ├── ValidationManager.ts       # Strategy orchestration (client-side)
│   ├── validation-result-display.ts
│   ├── eventHandlers.ts
│   ├── settings-modal.ts
│   ├── localStorage.ts
│   ├── keyboard-shortcuts.ts
│   └── debug.ts
│
├── types/                # TypeScript type definitions
│   ├── validation-strategy.d.ts
│   ├── calendar-types.d.ts
│   ├── rto-validation.d.ts
│   ├── holiday-data-source.ts
│   └── index.d.ts
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

- **UI Controller Layer**: Handles user events and updates the UI
- **Data Reader Layer**: Single DOM query, returns typed data
- **Orchestration Layer**: Coordinates validation without DOM dependencies

### 2. Pure Functions

All validation logic in `src/lib/` uses pure functions:
- Same input always produces same output
- No side effects or DOM manipulation
- Easy to test and reason about

### 3. Strategy Pattern

Validation modes are pluggable through the Strategy Pattern:
- `ValidationStrategy` abstract base class defines the contract
- Concrete implementations provide specific validation algorithms
- `ValidationFactory` creates the appropriate validator

### 4. Factory Pattern

```typescript
// Centralized validator creation
export class ValidationFactory {
  static createValidator(mode: ValidationMode): ValidationStrategy {
    switch (mode) {
      case "strict":
        return new StrictDayCountValidator();
      case "average":
        return new AverageWindowValidator();
      default:
        throw new Error(`Unsupported mode: ${mode}`);
    }
  }
}
```

### 5. Singleton Pattern

Used for managers that need single instances:
- `HolidayManager.getInstance()` - async initialization
- `HolidayDataSourceFactory.getInstance()` - manages data sources
- `HistoryManager.getInstance()` - state snapshots

---

## Data Structures

### WeekInfo (Data Reader Output)

```typescript
interface WeekInfo {
  weekStart: Date;                    // Monday at midnight
  weekNumber: number;                 // Sequential (1, 2, 3...)
  days: DayInfo[];                    // Days in this week
  oofCount: number;                   // Out-of-office days
  holidayCount: number;               // Holiday days in this week
  sickCount: number;                  // Sick days in this week
  officeDays: number;                 // Calculated: 5 - holidays - OOF (- sick if penalizing)
  totalDays: number;                  // Effective weekdays (excluding holidays/sick)
  oofDays: number;                    // Alias for oofCount
  isCompliant: boolean;               // Meets 3-day minimum?
  isUnderEvaluation: boolean;         // In 12-week window?
  status: WeekStatus;                 // "compliant" | "invalid" | "pending" | "excluded" | "ignored"
  statusCellElement: HTMLElement | null;  // DOM reference for UI updates
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

### ValidationResult

```typescript
interface ValidationResult {
  isValid: boolean;
  message: string;
  overallCompliance: number;
  windowResults: WindowCompliance[];
  violatingWindows: WindowCompliance[];
  compliantWindows: WindowCompliance[];
  validationMode?: "strict" | "average";
  invalidWeek?: WeekCompliance;
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
- Settings dialog for validation mode, holidays, sick day policy, etc.
- Pattern presets (Mon-Wed-Fri, Tue-Thu, All WFH)
- Sick day policy toggle (`sickDaysPenalize`) — controls whether sick days reduce office count
- Configuration management

#### `components/StatusDetails.astro`
- Reactive client-side component (subscribes to `onStateChange`)
- Week summary, capacity, current week status, non-compliant weeks
- Respects `sickDaysPenalize` setting from localStorage
- Updates in real-time as dates are painted

#### `components/SummaryBar.astro`
- Reactive client-side component (subscribes to `onStateChange`)
- Average in-office days, working days, OOF count, holiday count
- Updates in real-time as dates are painted

---

## Extension Points

### Adding New Validation Strategies

1. Create new strategy class extending `ValidationStrategy`:

```typescript
class CustomValidator extends ValidationStrategy {
  readonly name = "custom";
  readonly description = "My custom validation logic";

  validate(context: ValidatorContext): ValidationResult {
    // Implementation
  }

  getWeekCompliance(weekStart: Date, context: ValidatorContext): WeekCompliance {
    // Implementation
  }

  getWindowCompliance(windowStart: number, windowSize: number, context: ValidatorContext): WindowCompliance {
    // Implementation
  }
}
```

2. Register with ValidationFactory:

```typescript
// In ValidationFactory._instantiateValidator()
case "custom":
  return new CustomValidator();
```

### Adding New Holiday Data Sources

1. Extend `HolidayDataSourceStrategy`:

```typescript
class CustomHolidayDataSource extends HolidayDataSourceStrategy {
  name = "custom-api";

  async getHolidaysByYear(year: number, countryCode: string): Promise<Holiday[]> {
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
│       ├── RollingPeriodValidation.test.ts
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

1. **Validation Caching**
   - ValidationStrategy base class provides caching
   - Week/window results cached by timestamp
   - Cleared on configuration changes

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
- [StatusColumn.md](./StatusColumn.md) - Status column implementation details
- [AGENTS.md](../AGENTS.md) - AI agent guidelines and build commands

**Historical Documentation:**
- [StatusColumnFixes.md](./StatusColumnFixes.md) - Status column bug fixes
- [ValidationBugFix.md](./ValidationBugFix.md) - Validation bug fixes
- [ClearAllFix.md](./ClearAllFix.md) - Clear all button fix

---

## Summary

The RTO Calculator architecture prioritizes:

1. **Clear separation** between UI, orchestration, and data layers
2. **Pure functions** for business logic (testable, predictable)
3. **Strategy Pattern** for extensible validation modes
4. **Factory Pattern** for clean validator and data source instantiation
5. **Single DOM query** to extract data, then pure operations
6. **Type safety** throughout with comprehensive TypeScript interfaces
7. **Pluggable holiday system** with multiple data source support
8. **Undo functionality** via HistoryManager
9. **datepainter integration** for efficient calendar state management

This architecture enables easy testing, maintenance, and extension while maintaining clean separation of concerns and predictable behavior.
