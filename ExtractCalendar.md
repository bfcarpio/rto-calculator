# Extract Calendar Package - Implementation Plan

## Status Tracking

| Phase | Status | Completion Date | Notes |
|-------|--------|-----------------|-------|
| Phase 1: Research & Planning | ✅ COMPLETE | 2026-02-06 | Requirements gathered, architecture reviewed |
| Phase 2: Package Structure Setup | ✅ COMPLETE | 2026-02-06 | Package structure, configs, and toolchain established |
| Phase 3: Shared Core - State Management | ✅ COMPLETE | 2026-02-06 | Nano Stores integration with core types |
| Phase 4: Shared Core - Validation Engine | ✅ COMPLETE | 2026-02-06 | Date utilities with comprehensive JSDoc |
| Phase 5: Shared Core - Calendar Logic | ✅ COMPLETE | 2026-02-06 | CalendarManager core class with full JSDoc |
| Phase 6: Shared Core - Template Rendering | ✅ COMPLETE | 2026-02-06 | templateRenderer.ts with HTML generation |
| Phase 7: Event Handling | ✅ COMPLETE | 2026-02-06 | Refactored calendar-events.ts, created eventHandlers.ts, maintained all features |
| Phase 8: Vanilla Layer Implementation | ✅ COMPLETE | 2026-02-06 | CalendarRenderer, MonthRenderer, DayRenderer, EventHandler, index.ts entry point |
| Phase 9: Styling & Theming | 🔄 IN PROGRESS | - | CSS and theme system |

---

## Phase 6: Shared Core - Template Rendering - COMPLETED ✅

### What Was Accomplished:
- Created `templateRenderer.ts` with HTML generation functions
- Implemented `getDayCellClasses` for state-based CSS class generation
- Implemented `getIconHTML` for decorative icon placement
- Implemented `getCalendarHTML` for complete calendar grid rendering
- Enhanced `dateUtils.ts` with missing utilities (getFirstDayOfMonth, getWeekNumber, getDaysInMonth, formatDate, addDays)
- Added state-based day cell generation with dynamic updates
- Configurable weekday headers, month labels, and week numbers
- SSR-safe HTML generation with proper ARIA attributes
- Data attributes for date cell identification (data-date)

### Commits:
1. feat(rto-calendar): add template renderer with HTML generation (Phase 6)

---

## Phase 7: Event Handling - COMPLETED ✅

### What Was Accomplished:
- Refactored `calendar-events.ts` from main app, creating dedicated event handling module
- Created `eventHandlers.ts` with comprehensive JSDoc documentation
- Maintained all existing features: drag selection, keyboard navigation, clear functionality, undo/redo
- Made event handling SSR-safe with proper environment detection
- Implemented memory leak prevention with proper cleanup methods
- Added event delegation setup for performance optimization
- Enhanced touch support detection and handling

### Features Maintained:
- **Drag Selection**: Mouse drag, touch drag, keyboard navigation
- **Clear Functionality**: Clear single day, clear week, clear month, clear all
- **Undo/Redo**: Full undo/redo stack for all calendar operations
- **SSR Safety**: All event handlers check for browser environment before attaching
- **Event Delegation**: Efficient event handling through delegation pattern

### Files Created:
- `packages/rto-calendar/src/vanilla/eventHandlers.ts`

### Commits:
1. feat(rto-calendar): add eventHandlers with full feature support (Phase 7)

---

## Phase 5: Shared Core - Calendar Logic - COMPLETED ✅

### What Was Accomplished:
- Created `CalendarManager` core class with comprehensive JSDoc documentation
- Implemented calendar state management using Nano Stores
- Added derived state calculations for month stats, week compliance, and overall validation
- Integrated persistence layer for localStorage with schema validation
- Added error handling with descriptive messages throughout

### Commits:
1. feat(rto-calendar): add CalendarManager core class with full JSDoc (Phase 5)

---

## Phase 4: Shared Core - Validation Engine - COMPLETED ✅

### What Was Accomplished:
- Created comprehensive date utilities with JSDoc documentation
- Extracted `dateUtils.ts` functions with full type safety
- Added leap year, month boundary, and DST transition support
- Made utilities configurable (e.g., week start day)
- Added extensive unit tests for all edge cases

### Commits:
1. feat(rto-calendar): add date utilities with JSDoc (Phase 4)

---

## Phase 3: Shared Core - State Management - COMPLETED ✅

### What Was Accomplished:
- Integrated Nano Stores for reactive state management
- Created `selectedDates`, `currentMonth`, `dragState`, and `validationResult` stores
- Implemented store actions with proper error handling
- Added derived state for `monthStats`, `weekCompliance`, and `isValid`
- Implemented persistence layer with localStorage integration
- Added schema validation for loaded data

### Commits:
1. feat(rto-calendar): add Nano Stores state management (Phase 3.1)
2. feat(rto-calendar): add core types and configuration (Phase 3.1-3.4)

---

## Phase 2: Package Structure Setup - COMPLETED ✅

### What Was Accomplished:
- Created complete directory structure (src/, styles/, __tests__/, examples/)
- Created package.json with dual exports (Astro + Vanilla)
- Added TypeScript configuration with modern settings
- Created Vite and Vitest configs (later migrated to tsup)
- Added .npmignore and MIT LICENSE
- Created Biome configuration (replaced ESLint)

### 2026 Best Practices Applied:
- **ESM-only output**: Browser-focused library doesn't need CJS support
- **tsup for builds**: Fast, zero-config TypeScript bundler
- **Conditional exports**: Proper subpath exports with types/import
- **Biome for linting**: Modern toolchain replacing ESLint
- **Modern tsconfig**: Added `isolatedDeclarations` and `resolvePackageJsonExports`
- **Node 18+ requirement**: Explicit in engines field

### Commits:
1. docs: add ExtractCalendar.md with comprehensive implementation plan
2. feat(rto-calendar): add package.json with dual exports (Astro + Vanilla)
3. feat(rto-calendar): add TypeScript configuration
4. feat(rto-calendar): add Vitest and Vite build configurations
5. feat(rto-calendar): add .npmignore and MIT LICENSE
6. feat(rto-calendar): add ESLint configuration
7. feat(rto-calendar): migrate to Biome from ESLint
8. feat(rto-calendar): use ESM-only for browser-focused library

---

## 1. Goal and Context

### 1.1 Project Objective

Extract the RTO Calculator's calendar and validation functionality into a standalone, reusable package that works seamlessly in both:

1. **Astro Projects**: As an Astro component with SSR support
2. **Vanilla JavaScript**: As a browser-native package with no framework dependencies

### 1.2 Why This Extraction?

The current RTO Calculator has excellent, reusable calendar and validation logic that could benefit:

- **Internal Projects**: Other tools needing calendar selection + validation
- **Open Source**: Community adoption of RTO compliance tracking
- **Architecture Benefits**: Clean separation of concerns, easier testing
- **Maintenance**: Independent versioning and updates

### 1.3 Key Requirements

| Requirement | Description | Priority |
|-------------|-------------|----------|
| Framework Agnostic | Works in Astro, vanilla JS, and potentially other frameworks | High |
| TypeScript Strict Mode | Full type safety with no implicit any | High |
| Zero External Dependencies | Use only native browser APIs where possible | High |
| Accessible (WCAG 2.1 AA) | Full keyboard navigation, ARIA labels, screen reader support | High |
| Responsive | Mobile-first design, works on all device sizes | Medium |
| Theming Support | Dark/light mode, custom CSS variables | Medium |
| E2E Testable | Playwright tests for all interactions | High |
| Tree-shakeable | Only import what you need | Medium |

### 1.4 Key Decisions Table

| Decision | Option Chosen | Rationale |
|----------|--------------|-----------|
| **Package Manager** | npm (monorepo-friendly) | Industry standard, integrates with Astro ecosystem |
| **Build Tool** | Vite (tsup for bundling) | Fast, Astro-native, excellent TypeScript support |
| **Package Type** | Dual exports (ESM + CJS) | Max compatibility with all build tools |
| **CSS Strategy** | Scoped CSS with CSS Custom Properties | Encapsulation + theming flexibility |
| **State Management** | Nano Stores (lightweight) | Reactive, framework-agnostic, tiny (~300 bytes) |
| **Validation** | Extract existing Strategy Pattern | Proven architecture, testable, extensible |
| **Calendar Rendering** | Hybrid: Astro SSR for initial, client-side for interactions | Best of both worlds (SEO + interactivity) |
| **Testing** | Vitest (unit) + Playwright (E2E) | Matches project's existing stack |
| **Documentation** | TypeDoc + Storybook-like examples | Generated from TypeScript, interactive demos |

---

## 2. Architecture Overview

### 2.1 Hybrid Design: How It Works

The package will support two distinct usage patterns while sharing 100% of the core logic:

```
┌─────────────────────────────────────────────────────────────────┐
│                    Shared Core Logic (100%)                       │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  CalendarState Management (Nano Stores)                 │  │
│  │  - Selected dates, drag state, current month            │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Validation Engine (Strategy Pattern)                   │  │
│  │  - ValidationStrategy (base)                            │  │
│  │  - StrictDayCountValidator                               │  │
│  │  - AverageWindowValidator                               │  │
│  │  - ValidationFactory                                     │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Date Utilities & Calculations                          │  │
│  │  - Week calculations, ISO 8601 helpers                   │  │
│  │  - Holiday data integration                              │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Drag Selection Logic                                   │  │
│  │  - Mouse drag, touch drag, keyboard nav                 │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
┌──────────────┐      ┌──────────────┐      ┌──────────────┐
│  Astro Layer │      │ Vanilla Layer│      │   Testing    │
│              │      │              │      │   Harness    │
│ Calendar.astro│      │ CalendarRenderer │  │              │
│ + SSR        │      │ (DOM builder)     │  │  Mock DOM   │
│              │      │              │      │  fixtures    │
└──────────────┘      └──────────────┘      └──────────────┘
```

### 2.2 Package Structure

```
packages/
└── extract-calendar/
    ├── src/
    │   ├── core/                    # Shared business logic (100%)
    │   │   ├── state/
    │   │   │   ├── stores.ts        # Nano Stores for state
    │   │   │   └── types.ts         # State types
    │   │   ├── validation/
    │   │   │   ├── ValidationStrategy.ts
    │   │   │   ├── StrictDayCountValidator.ts
    │   │   │   ├── AverageWindowValidator.ts
    │   │   │   ├── ValidationFactory.ts
    │   │   │   └── types.ts
    │   │   ├── calendar/
    │   │   │   ├── dateUtils.ts
    │   │   │   ├── weekCalculator.ts
    │   │   │   ├── daySelection.ts
    │   │   │   ├── dragHandler.ts
    │   │   │   └── types.ts
    │   │   └── holiday/
    │   │       ├── HolidayManager.ts
    │   │       └── types.ts
    │   │
    │   ├── astro/                   # Astro-specific layer
    │   │   ├── Calendar.astro
    │   │   ├── Month.astro
    │   │   ├── Day.astro
    │   │   ├── WeekStatus.astro
    │   │   ├── index.ts             # Astro entry point
    │   │   └── client.ts            # Client-side hydration
    │   │
    │   ├── vanilla/                 # Vanilla JS layer
    │   │   ├── CalendarRenderer.ts  # DOM builder
    │   │   ├── MonthRenderer.ts
    │   │   ├── DayRenderer.ts
    │   │   ├── EventHandler.ts
    │   │   ├── index.ts             # Vanilla entry point
    │   │   └── types.ts
    │   │
    │   └── index.ts                 # Main entry point (exports both)
    │
    ├── styles/
    │   ├── base.css                 # Base styles
    │   ├── astro.css               # Astro-specific overrides
    │   ├── vanilla.css             # Vanilla-specific styles
    │   └── themes.css              # Dark/light mode
    │
    ├── tests/
    │   ├── unit/                   # Vitest unit tests
    │   │   ├── core/
    │   │   ├── astro/
    │   │   └── vanilla/
    │   │
    │   ├── integration/            # Integration tests
    │   │   ├── calendar-state.spec.ts
    │   │   ├── validation-flow.spec.ts
    │   │   └── drag-interactions.spec.ts
    │   │
    │   ├── e2e/                    # Playwright E2E tests
    │   │   ├── astro/
    │   │   │   ├── calendar-marking.spec.ts
    │   │   │   ├── validation.spec.ts
    │   │   │   └── keyboard-nav.spec.ts
    │   │   └── vanilla/
    │   │       ├── calendar-marking.spec.ts
    │   │       ├── validation.spec.ts
    │   │       └── keyboard-nav.spec.ts
    │   │
    │   └── visual/                 # Visual regression tests
    │       ├── calendar-states.ts
    │       ├── theme-switching.ts
    │       └── responsive-breakpoints.ts
    │
    ├── examples/
    │   ├── astro/                  # Astro demo app
    │   │   ├── src/
    │   │   │   └── pages/
    │   │   │       └── index.astro
    │   │   ├── astro.config.mjs
    │   │   └── package.json
    │   │
    │   └── vanilla/                # Vanilla JS demo
    │       ├── index.html
    │       ├── main.js
    │       └── style.css
    │
    ├── docs/
    │   ├── README.md
    │   ├── ASTRO_USAGE.md
    │   ├── VANILLA_USAGE.md
    │   ├── API.md
    │   └── CONTRIBUTING.md
    │
    ├── package.json
    ├── tsconfig.json
    ├── vite.config.ts
    ├── tsup.config.ts              # Build configuration
    ├── vitest.config.ts            # Test configuration
    └── playwright.config.ts        # E2E test configuration
```

### 2.3 Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                     User Interaction                             │
│    (Click, drag, keyboard, API call)                            │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                  Event Handler Layer                             │
│  - Capture user input                                           │
│  - Validate input (guard clauses)                               │
│  - Route to appropriate handler                                 │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│               State Management (Nano Stores)                     │
│  - Update store immutably                                       │
│  - Notify subscribers (reactive updates)                        │
│  - Persist to localStorage (optional)                          │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│               Business Logic (Shared Core)                       │
│  - Recalculate validation                                        │
│  - Update week compliance                                        │
│  - Generate derived state                                        │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│               UI Update Layer                                    │
│  ┌─────────────────┐  ┌──────────────────┐                       │
│  │  Astro Layer    │  │  Vanilla Layer   │                       │
│  │  - Re-render    │  │  - DOM diffing   │                       │
│  │  - Hydrate      │  │  - Incremental   │                       │
│  └─────────────────┘  └──────────────────┘                       │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. Implementation Phases

### Phase 1: Research & Planning ✅ COMPLETE

**Status**: Complete
**Completion Date**: 2026-02-06

**Deliverables**:
- ✅ Requirements gathered
- ✅ Architecture decisions made (hybrid approach)
- ✅ Technology stack selected
- ✅ Package structure defined
- ✅ This implementation plan created

---

### Phase 2: Package Structure Setup

**Status**: 🔄 IN PROGRESS

#### 2.1 Monorepo Configuration
- [ ] Create `packages/extract-calendar/` directory structure
- [ ] Configure `pnpm` or `npm` workspace for monorepo
- [ ] Create root `package.json` with workspace references
- [ ] Set up `tsconfig.base.json` for shared TypeScript config

#### 2.2 Package-Specific Configuration
- [ ] Create `packages/extract-calendar/package.json`
  - Package name: `@rto-calculator/extract-calendar`
  - Exports: `.` (main), `./astro`, `./vanilla`
  - Types: TypeScript declarations
  - Scripts: build, test, dev, lint
- [ ] Configure `tsup.config.ts` for dual ESM/CJS builds
  - Entry points: `src/index.ts`, `src/astro/index.ts`, `src/vanilla/index.ts`
  - Output format: `esm`, `cjs`
  - TypeScript declarations: enabled
- [ ] Configure `vitest.config.ts` for unit tests
- [ ] Configure `playwright.config.ts` for E2E tests
- [ ] Set up ESLint/Prettier/Biome configuration

#### 2.3 TypeScript Setup
- [ ] Create `src/core/types/` directory with base types
- [ ] Define core interfaces: `CalendarConfig`, `SelectionType`, `WeekStatus`
- [ ] Configure strict mode in `tsconfig.json`
  - `strict: true`
  - `noImplicitAny: true`
  - `strictNullChecks: true`
  - `noUncheckedIndexedAccess: true`

#### 2.4 Build Pipeline Verification
- [ ] Create minimal test file: `src/core/__tests__/setup.test.ts`
- [ ] Verify build: `npm run build`
- [ ] Verify types: `npm run check`
- [ ] Verify test runner: `npm test`

---

### Phase 3: Shared Core - State Management

#### 3.1 Nano Stores Integration
- [ ] Install `nanostores` dependency
- [ ] Create `src/core/state/stores.ts`:
  ```typescript
  import { atom, computed } from 'nanostores';

  // Selected dates store
  export const selectedDates = atom<Map<string, SelectionType>>(new Map());

  // Current month store
  export const currentMonth = atom<Date>(new Date());

  // Drag state store
  export const dragState = atom<DragState | null>(null);

  // Validation results store
  export const validationResult = atom<ValidationResult | null>(null);
  ```

#### 3.2 Store Actions
- [ ] Create `src/core/state/actions.ts`:
  - `toggleDate(date: string, type: SelectionType)`
  - `clearDates(range?: DateRange)`
  - `setMonth(date: Date)`
  - `startDrag(date: string, type: SelectionType)`
  - `endDrag()`
  - `runValidation(config: ValidationConfig)`
- [ ] Add JSDoc documentation to all actions
- [ ] Add error handling with descriptive messages

#### 3.3 Derived State
- [ ] Create `src/core/state/derived.ts`:
  - `monthStats`: Count of selected dates by type for current month
  - `weekCompliance`: Weekly compliance status
  - `isValid`: Overall validation status
- [ ] Add unit tests for derived state calculations

#### 3.4 Persistence (Optional)
- [ ] Create `src/core/state/persistence.ts`:
  - `saveToLocalStorage()`
  - `loadFromLocalStorage()`
  - `clearLocalStorage()`
- [ ] Add schema validation for loaded data
- [ ] Handle localStorage quota exceeded errors

---

### Phase 4: Shared Core - Validation Engine

#### 4.1 Extract Validation Strategy Pattern
- [ ] Copy `ValidationStrategy.ts` from RTO Calculator
- [ ] Copy `StrictDayCountValidator.ts`
- [ ] Copy `AverageWindowValidator.ts`
- [ ] Copy `ValidationFactory.ts`
- [ ] Remove RTO-specific coupling (make configurable)
- [ ] Update imports to use shared types

#### 4.2 Make Validation Configurable
- [ ] Create `ValidationConfig` interface:
  ```typescript
  interface ValidationConfig {
    mode: 'strict' | 'average';
    requiredDays: number;  // Default: 3
    rollingWindowWeeks: number;  // Default: 12
    complianceThreshold: number;  // Default: 0.6 (60%)
    bestWeeksCount: number;  // Default: 8
  }
  ```
- [ ] Update validators to use config instead of hardcoded values
- [ ] Add config validation (guard clauses)

#### 4.3 Validation Result Types
- [ ] Define `ValidationResult` interface
- [ ] Define `WeekCompliance` interface
- [ ] Define `WindowCompliance` interface
- [ ] Add branded types for domain safety:
  ```typescript
  type DateISO = string & { __brand: 'DateISO' };
  type WeekId = string & { __brand: 'WeekId' };
  ```

#### 4.4 Validation Integration with State
- [ ] Connect `validationResult` store to validation engine
- [ ] Auto-trigger validation on date selection changes
- [ ] Add debouncing for performance
- [ ] Add error handling for edge cases

---

### Phase 5: Shared Core - Calendar Logic

#### 5.1 Date Utilities
- [ ] Copy `dateUtils.ts` from RTO Calculator
- [ ] Add JSDoc to all functions
- [ ] Remove RTO-specific constants
- [ ] Make configurable (e.g., week start day)
- [ ] Add unit tests for all edge cases:
  - Leap years
  - Month boundaries
  - DST transitions
  - ISO 8601 week calculations

#### 5.2 Week Calculations
- [ ] Copy `weekCalculator.ts`
- [ ] Extract `WeekInfo` type
- [ ] Add `getWeeksForMonth(date: Date)` function
- [ ] Add `getWeekBoundary(date: Date)` function
- [ ] Add unit tests for week boundary edge cases

#### 5.3 Day Selection Logic
- [ ] Create `src/core/calendar/daySelection.ts`:
  - `toggleSelection(date: Date, type: SelectionType)`
  - `getSelectionType(date: Date)`
  - `clearSelections(range?: DateRange)`
- [ ] Add guard clauses for invalid dates
- [ ] Add unit tests for selection logic

#### 5.4 Drag Selection Logic
- [ ] Copy `dragSelection.ts`
- [ ] Remove DOM dependencies
- [ ] Make it work with state stores
- [ ] Add unit tests for drag calculations
- [ ] Add touch support detection

---

### Phase 6: Shared Core - Holiday Integration

#### 6.1 Holiday Manager
- [ ] Copy `HolidayManager.ts`
- [ ] Make holiday data source configurable
- [ ] Add `HolidayDataSource` interface
- [ ] Implement in-memory holiday data source
- [ ] Add optional async data source for API calls

#### 6.2 Holiday Types
- [ ] Define `Holiday` interface
- [ ] Define `HolidayType` enum (public, bank, observed)
- [ ] Add `isHoliday(date: Date)` function
- [ ] Add `getHolidaysInRange(start: Date, end: Date)` function

#### 6.3 Calendar Holiday Integration
- [ ] Add holiday-aware week calculations
- [ ] Update validation to exclude holidays from totals
- [ ] Add optional holiday highlighting (for UI layer)

---

### Phase 7: Astro Layer Implementation

#### 7.1 Calendar.astro Component
- [ ] Create `src/astro/Calendar.astro`
- [ ] Props interface:
  ```typescript
  interface Props {
    startDate?: Date;
    validationMode?: 'strict' | 'average';
    showWeekStatus?: boolean;
    theme?: 'light' | 'dark' | 'auto';
    onSelectionChange?: (dates: Map<string, SelectionType>) => void;
    onValidationChange?: (result: ValidationResult) => void;
  }
  ```
- [ ] Server-side rendering of calendar grid
- [ ] Client-side hydration for interactivity
- [ ] ARIA labels and roles for accessibility
- [ ] Scoped CSS with CSS custom properties

#### 7.2 Month.astro Component
- [ ] Create `src/astro/Month.astro`
- [ ] Props: month (Date), week data, selections
- [ ] Grid layout (6 rows x 8 columns: week number + 7 days)
- [ ] Week status column
- [ ] Month-level clear button

#### 7.3 Day.astro Component
- [ ] Create `src/astro/Day.astro`
- [ ] Props: day (Date), selection type, holiday, OOF
- [ ] Left-click: toggle WFH
- [ ] Right-click: toggle office
- [ ] Click-and-drag support
- [ ] Keyboard navigation support
- [ ] Screen reader announcements

#### 7.4 WeekStatus.astro Component
- [ ] Create `src/astro/WeekStatus.astro`
- [ ] 4-state display: compliant, invalid, pending, ignored
- [ ] Icons using SVG (no external dependencies)
- [ ] ARIA live region for status changes

#### 7.5 Astro Entry Point
- [ ] Create `src/astro/index.ts`:
  - Export `Calendar` component
  - Export types for props
  - Export utility functions for external use

---

## Phase 8: Vanilla Layer Implementation - COMPLETED ✅

### What Was Accomplished:
- Created `CalendarRenderer.ts` with comprehensive JSDoc documentation for DOM rendering
- Created `MonthRenderer.ts` for month grid rendering with dynamic updates
- Created `DayRenderer.ts` for individual day cell rendering with state-based styling
- Created `EventHandler.ts` with event delegation and interaction handling
- Created `index.ts` entry point with all re-exports and clean API surface
- Implemented DOM builder functions for calendar rendering without framework dependencies
- Added event delegation setup for performance optimization (single event listener on container)
- Implemented memory leak prevention with proper cleanup methods
- Enhanced `dateUtils.ts` with missing utilities for calendar logic (getFirstDayOfMonth, getWeekNumber, getDaysInMonth, formatDate, addDays)
- Enhanced `templateRenderer.ts` with HTML generation functions for SSR compatibility

### Files Created:
- `packages/rto-calendar/src/vanilla/CalendarRenderer.ts` - Main DOM renderer class
- `packages/rto-calendar/src/vanilla/MonthRenderer.ts` - Month grid rendering
- `packages/rto-calendar/src/vanilla/DayRenderer.ts` - Individual day cell rendering
- `packages/rto-calendar/src/vanilla/EventHandler.ts` - Event delegation and interaction handling
- `packages/rto-calendar/src/vanilla/index.ts` - Vanilla entry point with re-exports

### Architecture Notes:
- **CalendarManager** remains the main orchestration layer for business logic
- Vanilla layer focuses on DOM rendering and event handling only
- All business logic (validation, state management, calendar calculations) stays in shared core
- Clean separation: CalendarManager handles logic, Vanilla layer handles presentation

### Commits:
1. feat(rto-calendar): add CalendarRenderer class (Phase 8.1)
2. feat(rto-calendar): add MonthRenderer class (Phase 8.2)
3. feat(rto-calendar): add DayRenderer class (Phase 8.3)
4. feat(rto-calendar): add EventHandler class (Phase 8.4)
5. feat(rto-calendar): add vanilla entry point (index.ts)
6. feat(rto-calendar): complete Vanilla layer implementation (Phase 8)

---

### Phase 8: Vanilla Layer Implementation

#### 8.1 CalendarRenderer Class
- [ ] Create `src/vanilla/CalendarRenderer.ts`:
  ```typescript
  class CalendarRenderer {
    constructor(config: CalendarConfig);
    render(container: HTMLElement): void;
    destroy(): void;
    updateConfig(config: Partial<CalendarConfig>): void;
  }
  ```
- [ ] DOM builder functions
- [ ] Event delegation for performance
- [ ] Memory leak prevention (cleanup on destroy)

#### 8.2 MonthRenderer Class
- [ ] Create `src/vanilla/MonthRenderer.ts`:
  - Render month grid
  - Update DOM incrementally
  - Handle week status updates

#### 8.3 DayRenderer Class
- [ ] Create `src/vanilla/DayRenderer.ts`:
  - Render individual day cell
  - Update selection state
  - Handle event listeners

#### 8.4 EventHandler Class
- [ ] Create `src/vanilla/EventHandler.ts`:
  - Event delegation setup
  - Click, drag, keyboard handlers
  - Touch event support
  - Prevent default behaviors appropriately

#### 8.5 Vanilla Entry Point
- [ ] Create `src/vanilla/index.ts`:
  - Export `CalendarRenderer`
  - Export types and interfaces
  - Export utility functions

---

### Phase 9: Styling & Theming

#### 9.1 Base CSS
- [ ] Create `styles/base.css`:
  - CSS custom properties for colors, spacing, typography
  - Reset styles
  - Grid layout base styles
  - Accessibility focus styles

#### 9.2 Astro-Specific Styles
- [ ] Create `styles/astro.css`:
  - Scoped styles using Astro's :scope
  - SSR-specific styles
  - Hydration transitions

#### 9.3 Vanilla-Specific Styles
- [ ] Create `styles/vanilla.css`:
  - Global styles for standalone usage
  - Class-based styling (BEM naming)
  - Responsive media queries

#### 9.4 Theming System
- [ ] Create `styles/themes.css`:
  - Light theme variables
  - Dark theme variables
  - Automatic theme detection (prefers-color-scheme)
  - Manual theme switching support
  - High contrast mode support

#### 9.5 Accessibility Styles
- [ ] Ensure proper focus indicators
- [ ] Reduce motion preferences respected
- [ ] High contrast mode support
- - Screen reader-only content styles

---

### Phase 10: Documentation & Examples

#### 10.1 README Documentation
- [ ] Create `docs/README.md`:
  - Package overview
  - Installation instructions
  - Quick start guide
  - Feature highlights
  - Browser support

#### 10.2 Astro Usage Guide
- [ ] Create `docs/ASTRO_USAGE.md`:
  - Installation in Astro project
  - Component props reference
  - Example implementations
  - SSR vs SSR + hydration
  - Integration with other Astro features

#### 10.3 Vanilla Usage Guide
- [ ] Create `docs/VANILLA_USAGE.md`:
  - Installation in vanilla project
  - API reference
  - Example implementations
  - DOM integration patterns
  - Migration from Astro to vanilla (or vice versa)

#### 10.4 API Documentation
- [ ] Create `docs/API.md`:
  - Type definitions
  - Function signatures
  - Event callbacks
  - Configuration options
  - Migration guide between versions

#### 10.5 Example Projects
- [ ] Create `examples/astro/`:
  - Minimal Astro project using the package
  - README with setup instructions
  - Various configuration examples
- [ ] Create `examples/vanilla/`:
  - Minimal HTML/JS project
  - Setup instructions
  - Various configuration examples

---

### Phase 11: Comprehensive Testing

#### 11.1 Unit Tests (Vitest) - Target: 50+ Tests

**Core State Tests (10 tests)**
- [ ] `stores.test.ts`:
  - [ ] should initialize with empty selected dates
  - [ ] should toggle date selection (add)
  - [ ] should toggle date selection (remove)
  - [ ] should clear all dates
  - [ ] should set current month
  - [ ] should start drag with correct state
  - [ ] should end drag and clear state
  - [ ] should persist to localStorage
  - [ ] should load from localStorage
  - [ ] should clear localStorage

**Validation Engine Tests (15 tests)**
- [ ] `ValidationStrategy.test.ts`:
  - [ ] should instantiate strict validator
  - [ ] should instantiate average validator
  - [ ] should cache validators correctly
  - [ ] should reset validator state
  - [ ] should validate with strict mode (valid)
  - [ ] should validate with strict mode (invalid)
  - [ ] should validate with average mode (valid)
  - [ ] should validate with average mode (invalid)
  - [ ] should calculate week compliance
  - [ ] should calculate window compliance
  - [ ] should select best weeks correctly
  - [ ] should handle edge case: no weeks
  - [ ] should handle edge case: single week
  - [ ] should handle edge case: maximum weeks
  - [ ] should fail fast with invalid config

**Calendar Logic Tests (15 tests)**
- [ ] `dateUtils.test.ts`:
  - [ ] should get start of week (Monday)
  - [ ] should handle leap year correctly
  - [ ] should get week number (ISO 8601)
  - [ ] should calculate weeks for month
  - [ ] should handle month boundary (January)
  - [ ] should handle month boundary (December)
  - [ ] should handle year boundary
  - [ ] should format date to ISO
  - [ ] should parse ISO to date
  - [ ] should validate date (invalid dates)
  - [ ] should get days in month
  - [ ] should add days to date
  - [ ] should subtract days from date
  - [ ] should compare dates (same day)
  - [ ] should compare dates (different day)

**Drag Selection Tests (5 tests)**
- [ ] `dragSelection.test.ts`:
  - [ ] should calculate drag range forward
  - [ ] should calculate drag range backward
  - [ ] should handle single cell drag
  - [ ] should handle entire week drag
  - [ ] should handle entire month drag

**Holiday Integration Tests (5 tests)**
- [ ] `HolidayManager.test.ts`:
  - [ ] should return empty array for no holidays
  - [ ] should return holidays for given month
  - [ ] should check if date is holiday
  - [ ] should get holidays in range
  - [ ] should handle async holiday data source

#### 11.2 Integration Tests (Vitest) - Target: 10+ Tests

- [ ] `calendar-state.spec.ts`:
  - [ ] should sync selection changes to validation
  - [ ] should update derived state on date toggle
  - [ ] should persist state on localStorage save
  - [ ] should recover state from localStorage load

- [ ] `validation-flow.spec.ts`:
  - [ ] should run validation on date change
  - [ ] should debounced validation updates
  - [ ] should switch validation modes correctly
  - [ ] should update week compliance after validation

- [ ] `drag-interactions.spec.ts`:
  - [ ] should select multiple dates on drag
  - [ ] should update validation after drag
  - [ ] should handle drag interruptions

#### 11.3 E2E Tests (Playwright) - Target: 15+ Scenarios

**Astro E2E Tests (8 scenarios)**
- [ ] `astro/calendar-marking.spec.ts`:
  - [ ] should mark day as WFH on left click
  - [ ] should mark day as office on right click
  - [ ] should clear selection on same click
  - [ ] should select multiple days via drag
  - [ ] should navigate months using arrow buttons
  - [ ] should clear entire month selection
  - [ ] should persist selections across page reload
  - [ ] should clear all selections

- [ ] `astro/validation.spec.ts`:
  - [ ] should show validation results after clicking validate
  - [ ] should display week status (compliant/invalid/pending)
  - [ ] should update validation on date change
  - [ ] should switch validation modes (strict vs average)

- [ ] `astro/keyboard-nav.spec.ts`:
  - [ ] should navigate days with arrow keys
  - [ ] should select day with Enter key
  - [ ] should clear selection with Escape key
  - [ ] should focus next month with keyboard
  - [ ] should announce selection to screen reader

**Vanilla E2E Tests (7 scenarios)**
- [ ] `vanilla/calendar-marking.spec.ts`:
  - [ ] should initialize calendar from vanilla JS
  - [ ] should mark day on click
  - [ ] should handle drag selection
  - [ ] should update month display

- [ ] `vanilla/validation.spec.ts`:
  - [ ] should run validation programmatically
  - [ ] should display validation results

- [ ] `vanilla/keyboard-nav.spec.ts`:
  - [ ] should support keyboard navigation
  - [ ] should maintain focus during navigation

#### 11.4 Visual Regression Tests (Playwright) - Target: 10+ Screenshots

- [ ] `visual/calendar-states.ts`:
  - [ ] should render empty calendar correctly
  - [ ] should show WFH selections
  - [ ] should show office day selections
  - [ ] should show validation results
  - [ ] should display week status icons

- [ ] `visual/theme-switching.ts`:
  - [ ] should render light theme correctly
  - [ ] should render dark theme correctly
  - [ ] should respect system preference
  - [ ] should switch theme dynamically

- [ ] `visual/responsive-breakpoints.ts`:
  - [ ] should render correctly at 320px (mobile)
  - [ ] should render correctly at 768px (tablet)
  - [ ] should render correctly at 1024px (desktop)
  - [ ] should render correctly at 1440px (large desktop)

---

### Phase 12: Build & Release Preparation

#### 12.1 Build Optimization
- [ ] Configure tree-shaking (named exports only)
- [ ] Minify production builds
- [ ] Generate TypeScript declarations
- [ ] Split Astro and vanilla exports
- [ ] Add source maps for debugging

#### 12.2 Package Metadata
- [ ] Update `package.json`:
  - Version number
  - Keywords for npm discovery
  - Repository URL
  - License (MIT)
  - Exports field (ESM + CJS)
  - Types field
  - Files to include/exclude
- [ ] Create `CHANGELOG.md`
- [ ] Create `LICENSE` file

#### 12.3 CI/CD Pipeline
- [ ] Create `.github/workflows/ci.yml`:
  - TypeScript compilation check
  - Lint check
  - Unit tests with coverage
  - Build verification
- [ ] Create `.github/workflows/e2e.yml`:
  - Playwright tests across browsers
  - Visual regression tests
- [ ] Create `.github/workflows/release.yml`:
  - Manual release trigger
  - Quality gates (all tests passing)
  - Build and publish to npm

#### 12.4 Documentation Generation
- [ ] Set up TypeDoc for API docs
  - Generate from TypeScript comments
  - Export to `docs/api/` directory
  - Host on GitHub Pages or separate site
- [ ] Update README with:
  - Installation badges
  - Coverage badges
  - Quick links to documentation

---

### Phase 13: Final Testing & Launch

#### 13.1 Pre-Launch Checklist
- [ ] All unit tests passing (50+ tests)
- [ ] All integration tests passing (10+ tests)
- [ ] All E2E tests passing (15+ scenarios)
- [ ] All visual regression tests passing (10+ screenshots)
- [ ] TypeScript compilation passes (no errors)
- [ ] Lint checks pass (zero warnings)
- [ ] Build succeeds for ESM and CJS
- [ ] Tree-shaking verified (no unused code in bundle)
- [ ] Bundle size within limits (<100KB gzipped)
- [ ] Documentation complete and accurate
- [ ] Example projects working
- [ ] Accessibility audit passed (WCAG 2.1 AA)
- [ ] Cross-browser testing (Chrome, Firefox, Safari, Edge)

#### 13.2 Cross-Browser Testing
- [ ] Chrome (latest + 2 versions back)
- [ ] Firefox (latest + 2 versions back)
- [ ] Safari (latest + 2 versions back)
- [ ] Edge (latest + 2 versions back)
- [ ] Mobile browsers (iOS Safari, Chrome Android)

#### 13.3 Accessibility Testing
- [ ] Keyboard navigation works without mouse
- [ ] Screen reader announces all interactions
- [ ] Focus indicators visible on all interactive elements
- [ ] ARIA labels and roles correct
- [ ] Color contrast ratios meet WCAG AA (4.5:1 for text, 3:1 for UI)
- [ ] Respect prefers-reduced-motion
- [ ] Support prefers-contrast (high contrast mode)

#### 13.4 Performance Testing
- [ ] Initial load time < 500ms on 3G
- [ ] Calendar render time < 100ms
- [ ] Validation calculation < 50ms for 12 weeks
- [ ] Memory usage stable over time
- [ ] No memory leaks on repeated interactions
- [ ] Bundle size optimized (<50KB uncompressed)

#### 13.5 Launch
- [ ] Tag release version (e.g., v1.0.0)
- [ ] Publish to npm
- [ ] Create GitHub release with notes
- [ ] Update RTO Calculator to use new package
- [ ] Update project documentation
- [ ] Announce release (if public)
- [ ] Monitor for issues post-launch

---

## 4. Usage Examples

### 4.1 Astro Usage

#### Installation
```bash
npm install @rto-calculator/extract-calendar
```

#### Basic Implementation
```astro
---
import Calendar from '@rto-calculator/extract-calendar/astro/Calendar.astro';
---

<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>RTO Calendar</title>
</head>
<body>
  <h1>Return to Office Calendar</h1>
  <Calendar
    startDate={new Date()}
    validationMode="strict"
    showWeekStatus={true}
    theme="auto"
  />
</body>
</html>
```

#### With Custom Handlers
```astro
---
import Calendar from '@rto-calculator/extract-calendar/astro/Calendar.astro';
import type { ValidationResult, SelectionType } from '@rto-calculator/extract-calendar';

function handleSelectionChange(dates: Map<string, SelectionType>) {
  console.log('Selections changed:', dates);
  // Save to your backend or handle custom logic
}

function handleValidationChange(result: ValidationResult) {
  console.log('Validation result:', result);
  // Show custom notification or analytics
}
---

<Calendar
  startDate={new Date()}
  validationMode="average"
  onSelectionChange={handleSelectionChange}
  onValidationChange={handleValidationChange}
/>
```

#### With Custom Styling
```astro
---
import Calendar from '@rto-calculator/extract-calendar/astro/Calendar.astro';
---

<style is:global>
  /* Override CSS custom properties */
  :root {
    --calendar-primary: #2563eb;
    --calendar-secondary: #ef4444;
    --calendar-bg: #ffffff;
    --calendar-text: #1f2937;
  }

  /* Dark mode overrides */
  @media (prefers-color-scheme: dark) {
    :root {
      --calendar-bg: #1f2937;
      --calendar-text: #f9fafb;
    }
  }
</style>

<Calendar theme="auto" />
```

### 4.2 Vanilla JavaScript Usage

#### Installation
```bash
npm install @rto-calculator/extract-calendar
```

#### Basic Implementation
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>RTO Calendar</title>
  <link rel="stylesheet" href="node_modules/@rto-calculator/extract-calendar/styles/vanilla.css">
</head>
<body>
  <h1>Return to Office Calendar</h1>
  <div id="calendar-container"></div>

  <script type="module">
    import { CalendarRenderer } from '@rto-calculator/extract-calendar/vanilla';

    const renderer = new CalendarRenderer({
      startDate: new Date(),
      validationMode: 'strict',
      showWeekStatus: true,
      theme: 'auto'
    });

    renderer.render(document.getElementById('calendar-container'));
  </script>
</body>
</html>
```

#### With Event Handlers
```html
<div id="calendar-container"></div>
<div id="status">Selections: 0</div>

<script type="module">
  import { CalendarRenderer } from '@rto-calculator/extract-calendar/vanilla';

  const renderer = new CalendarRenderer({
    startDate: new Date(),
    onSelectionChange: (dates) => {
      const statusEl = document.getElementById('status');
      statusEl.textContent = `Selections: ${dates.size}`;
    },
    onValidationChange: (result) => {
      console.log('Validation:', result);
      if (result.isValid) {
        alert('Compliant! 🎉');
      } else {
        alert(`Not compliant: ${result.message}`);
      }
    }
  });

  renderer.render(document.getElementById('calendar-container'));
</script>
```

#### Programmatic Control
```html
<button id="clear-btn">Clear All</button>
<button id="validate-btn">Run Validation</button>
<div id="calendar-container"></div>

<script type="module">
  import { CalendarRenderer } from '@rto-calculator/extract-calendar/vanilla';

  const renderer = new CalendarRenderer();
  renderer.render(document.getElementById('calendar-container'));

  // Clear all selections
  document.getElementById('clear-btn').addEventListener('click', () => {
    renderer.clearAllDates();
  });

  // Run validation manually
  document.getElementById('validate-btn').addEventListener('click', () => {
    renderer.runValidation();
  });

  // Change month programmatically
  function goToDate(date) {
    renderer.updateConfig({ startDate: date });
  }
</script>
```

---

## 5. Risk Assessment

| Risk | Probability | Impact | Mitigation Strategy |
|------|-------------|--------|---------------------|
| **DOM coupling in shared core** | Medium | High | Strict separation: core logic never accesses DOM; use stores for communication |
| **Type compatibility issues between Astro and vanilla** | Low | Medium | Shared types from `core/types/`, separate type definitions for framework-specific code |
| **State synchronization bugs** | Medium | Medium | Use Nano Stores for reactivity; add integration tests for state flow |
| **Performance issues with large date ranges** | Low | Low | Lazy rendering, virtual scrolling for large views (future enhancement) |
| **Browser compatibility gaps** | Low | Medium | Test on all major browsers; use standard APIs only; polyfills if needed |
| **Accessibility regressions** | Medium | High | E2E accessibility tests with axe-core; manual screen reader testing |
| **Bundle size bloat** | Low | Medium | Tree-shaking verification; code splitting; dependency audit |
| **Maintenance burden of two UI layers** | Medium | Medium | Shared core logic minimizes duplication; keep UI layers thin |
| **Breaking changes in RTO Calculator after extraction** | Low | Medium | Deprecation period; migration guide; gradual adoption |
| **npm package name conflicts** | Very Low | Low | Use scoped package name: `@rto-calculator/extract-calendar` |

---

## 6. Success Criteria

### 6.1 Functional Requirements
- [ ] Calendar renders correctly in both Astro and vanilla JS
- [ ] All interactions work (click, drag, keyboard) in both environments
- [ ] Validation engine works identically in both environments
- [ ] State persistence works (localStorage)
- [ ] Holiday integration works correctly
- [ ] Theme switching (light/dark/auto) works
- [ ] Responsive design works on all breakpoints

### 6.2 Quality Standards
- [ ] **Type Safety**: 100% TypeScript, no `any` types
- [ ] **Test Coverage**: 75%+ for core logic
- [ ] **Accessibility**: WCAG 2.1 AA compliant
- [ ] **Performance**: Initial load < 500ms, render < 100ms
- [ ] **Bundle Size**: < 100KB uncompressed, < 50KB gzipped
- [ ] **Browser Support**: Latest Chrome, Firefox, Safari, Edge
- [ ] **Documentation**: Complete README, API docs, usage examples

### 6.3 Developer Experience
- [ ] Easy to install and set up (< 5 minutes)
- [ ] Clear API with TypeScript autocomplete
- [ ] Good error messages with actionable guidance
- [ ] Examples for common use cases
- [ ] Migration guide from RTO Calculator
- [ ] Contribution guidelines for open source

### 6.4 Code Quality
- [ ] Follows 5 Laws of Elegant Defense
- [ ] No technical debt (TODO/FIXME/HACK) at release
- [ ] Consistent code style (enforced by linter)
- [ ] Comprehensive JSDoc documentation
- [ ] No external dependencies (except nanostores)
- [ ] All tests pass (unit, integration, E2E)

---

## 7. Estimated Timeline

| Phase | Estimated Time | Dependencies | Notes |
|-------|----------------|--------------|-------|
| Phase 1: Research & Planning | ✅ Complete | - | Done 2026-02-06 |
| Phase 2: Package Structure Setup | 1 day | - | Boilerplate and config |
| Phase 3: Shared Core - State Management | 2 days | Phase 2 | Nano Stores setup |
| Phase 4: Shared Core - Validation Engine | 2 days | Phase 2 | Extract from RTO Calculator |
| Phase 5: Shared Core - Calendar Logic | 2 days | Phase 2 | Date utils, drag logic |
| Phase 6: Shared Core - Holiday Integration | 1 day | Phase 2 | Holiday manager |
| Phase 7: Astro Layer Implementation | 3 days | Phases 2-6 | Astro components |
| Phase 8: Vanilla Layer Implementation | 3 days | Phases 2-6 | Vanilla renderer |
| Phase 9: Styling & Theming | 2 days | Phases 7-8 | CSS system |
| Phase 10: Documentation & Examples | 2 days | Phases 7-9 | Docs and demos |
| Phase 11: Comprehensive Testing | 3 days | Phases 2-10 | Unit, integration, E2E |
| Phase 12: Build & Release Preparation | 1 day | Phase 11 | Build optimization |
| Phase 13: Final Testing & Launch | 1 day | Phase 12 | Cross-browser, accessibility |

**Total Estimated Time**: ~23 days (4.5 weeks)

**Parallelization Opportunities**:
- Phases 7 and 8 can be done in parallel (Astro and vanilla layers are independent)
- Phase 9 can start before Phase 8 completes (shared styling)
- Phase 11 can overlap with Phases 7-10 (test as you go)

**Realistic Schedule with Parallelization**: ~3 weeks

---

## 8. Next Steps

1. **Start Phase 2**: Set up the package structure and build pipeline
2. **Create feature branch**: `feature/extract-calendar-phase2`
3. **Set up monorepo**: Configure pnpm/npm workspace
4. **Verify build pipeline**: Ensure build, test, and lint work

---

## Manual Testing During Development

During development, you can manually test the datepainter component without running the full RTO Calculator app.

### Local Development Server

Create a minimal page that only imports and displays the datepainter component:

**Create `packages/rto-calendar/dev-test/index.html`:**
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>datepainter - Manual Testing</title>
  <link rel="stylesheet" href="../dist/styles/calendar.css">
</head>
<body>
  <h1>datepainter Manual Testing</h1>
  <p>Use this page for rapid manual testing during development.</p>

  <!-- Date Paint Mode -->
  <h2>Test Date Painting</h2>
  <button id="paint-mode">Set Paint Mode: Working</button>
  <button id="clear-all">Clear All Selections</button>
  <button id="get-selected">Get Selected Dates</button>

  <hr>

  <!-- Calendar -->
  <div id="calendar-container"></div>

  <hr>

  <!-- Selected Dates Display -->
  <div>
    <h3>Selected Dates</h3>
    <pre id="selected-output">No dates selected</pre>
  </div>

  <script type="module">
    import { CalendarManager, type CalendarConfig } from './dist/index.js';

    // Create calendar instance
    const config: CalendarConfig = {
      dateRange: {
        start: new Date('2026-01-01'),
        end: new Date('2026-12-31'),
      },
      states: {
        working: {
          label: 'Working',
          color: '#334155',
          bgColor: '#ffffff',
        },
        oof: {
          label: 'Out of Office',
          color: '#ffffff',
          bgColor: '#ef4444',
          icon: '🏖️',
          position: 'below' as const,
        },
        holiday: {
          label: 'Holiday',
          color: '#ffffff',
          bgColor: '#10b981',
          icon: '🎉',
          position: 'below' as const,
        },
      },
    };

    const calendar = new CalendarManager('#calendar-container', config);
    calendar.init();

    // Paint mode buttons
    const paintBtn = document.getElementById('paint-mode');
    const states = ['working', 'oof', 'holiday'];
    let currentIndex = 0;

    paintBtn.addEventListener('click', () => {
      currentIndex = (currentIndex + 1) % states.length;
      const state = states[currentIndex];
      paintBtn.textContent = `Set Paint Mode: ${state.toUpperCase()}`;
      console.log('Paint mode set to:', state);
    });

    // Clear button
    document.getElementById('clear-all').addEventListener('click', () => {
      calendar.clearAll();
      console.log('Cleared all selections');
    });

    // Get selected button
    document.getElementById('get-selected').addEventListener('click', () => {
      const dates = calendar.getSelectedDates();
      document.getElementById('selected-output').textContent = JSON.stringify(dates, null, 2);
      console.log('Selected dates:', dates);
    });

    // Log selection changes
    calendar.onStateChange((date, state) => {
      console.log(`Date ${date} -> ${state}`);
    });
  </script>
</body>
</html>
```

### Running the Test Page

1. Build the package:
   ```bash
   cd packages/rto-calendar
   npm run build
   ```

2. Serve the test page:
   ```bash
   cd packages/rto-calendar
   npx serve dev-test
   ```

3. Open browser to `http://localhost:3000/dev-test/`

4. Test all interactions manually

### Test Scenarios

- [ ] Single date toggle (click on, click off)
- [ ] Multiple dates selection via click
- [ ] Drag painting across dates
- [ ] Switch between paint modes (working, OOF, holiday)
- [ ] Clear all selections
- [ ] Query selected dates
- [ ] Test with custom date ranges
- [ ] Test with different state configurations
- [ ] Verify icons render correctly
- [ ] Test keyboard navigation

### Integration with Main App

Once the package is working, the main RTO Calculator can be updated to use it:
- Update `src/pages/index.astro` to import from `datepainter`
- Update `package.json` in main app to add `datepainter` as dependency

---

*Last Updated*: 2026-02-06
*Plan Version*: 1.0
