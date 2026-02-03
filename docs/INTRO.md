# RTO Calculator - Project Architecture

## Overview

The RTO Calculator is an Astro-based web application for tracking Return-to-Office (RTO) compliance. The architecture follows a **3-layer validation flow** with clear separation of concerns, enabling pure business logic that is testable, maintainable, and extensible.

## The 3-Layer Flow

The validation system is organized into three distinct layers, each with specific responsibilities:

```
┌─────────────────────────────────────────────────────────────────────┐
│                         UI Controller Layer                            │
│                     (src/scripts/rto-ui-controller.ts)                │
│                                                                      │
│  Responsibilities:                                                   │
│  - Handle user interactions (click events)                           │
│  - Trigger validation workflows                                    │
│  - Display results to users                                        │
│  - No validation logic here - delegates to orchestrator            │
└──────────────────────────────────┬───────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      Orchestration Layer                               │
│               (src/lib/validation/ValidationOrchestrator.ts)         │
│                                                                      │
│  Responsibilities:                                                   │
│  - Coordinate validation workflow                                    │
│  - Manage configuration and policy application                       │
│  - No DOM dependencies - works with pure data                        │
│  - Delegates to concrete strategies via Factory                      │
└──────────────────────────────────┬───────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│                       Data Reader Layer                                │
│                   (src/lib/calendar-data-reader.ts)                  │
│                                                                      │
│  Responsibilities:                                                   │
│  - Single DOM query to read calendar state                         │
│  - Extract selections, holidays, and week data                     │
│  - Return typed data structures (DayInfo, WeekInfo)                │
│  - Only layer with DOM access                                        │
└─────────────────────────────────────────────────────────────────────┘
```

### Data Flow

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
│  Data Reader  │  Step 2: Read DOM once
│ (calendar-    │  - Query all calendar cells
│ data-reader)  │  - Extract selections
│               │  - Return WeekInfo[]
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

### ValidationFactory Usage

```typescript
// Factory creates appropriate validator based on mode
const validator = ValidationFactory.createValidator("strict");
// or
const validator = ValidationFactory.createValidator("average");

// All validators implement the same interface
const result = validator.validate(context);
```

### Strategy Pattern Benefits

1. **Extensibility**: New validation modes can be added by creating new classes that extend `ValidationStrategy`
2. **Testability**: Each strategy can be tested in isolation
3. **Flexibility**: Users can switch between validation modes without code changes
4. **Consistency**: All validators share common utility methods from the base class

## Directory Structure

```
src/
├── components/           # Astro UI components
│   ├── day.astro        # Individual day cell
│   ├── month.astro      # Month grid with status column
│   ├── ActionButtons.astro
│   ├── SettingsButton.astro
│   └── SettingsModal.astro
│
├── lib/                 # Core business logic (framework-agnostic)
│   ├── validation/      # Validation domain with Strategy Pattern
│   │   ├── ValidationStrategy.ts        # Abstract base class
│   │   ├── StrictDayCountValidator.ts     # Concrete strategy
│   │   ├── AverageWindowValidator.ts      # Concrete strategy
│   │   ├── ValidationFactory.ts           # Factory for creating validators
│   │   ├── ValidationOrchestrator.ts      # Orchestrates validation flow
│   │   ├── rto-core.ts                    # Pure validation functions
│   │   ├── RollingPeriodValidation.ts     # Legacy implementation
│   │   └── index.ts                       # Module exports
│   │
│   ├── holiday/         # Holiday management
│   │   ├── HolidayManager.ts
│   │   ├── HolidayDataLoader.ts
│   │   ├── CalendarHolidayIntegration.ts
│   │   ├── data/        # Country holiday data
│   │   └── sources/     # API integrations (NagerDate)
│   │
│   ├── calendar-data-reader.ts    # Data extraction layer (DOM → pure data)
│   └── rto-config.ts              # Configuration constants
│
├── scripts/             # Client-side DOM integration
│   ├── rto-ui-controller.ts       # UI Controller layer
│   ├── validation-result-display.ts
│   ├── calendar-events.ts
│   ├── settings-modal.ts
│   ├── localStorage.ts
│   └── debug.ts
│
├── types/               # TypeScript type definitions
│   ├── validation-strategy.d.ts
│   ├── calendar-types.d.ts
│   ├── rto-validation.d.ts
│   └── holiday-data-source.ts
│
└── utils/               # Utility functions
    ├── dateUtils.ts
    ├── dragSelection.ts
    ├── storage.ts
    └── astro/           # Astro-specific utilities
        └── calendarFunctions.ts
```

## Key Design Principles

### 1. Separation of Concerns

- **UI Controller Layer**: Handles user events and updates the UI
- **Orchestration Layer**: Coordinates validation without DOM dependencies
- **Data Reader Layer**: Single DOM query, returns typed data

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

## Module Exports

The validation module provides a clean public API through `src/lib/validation/index.ts`:

```typescript
// Concrete strategies
export { AverageWindowValidator }
export { StrictDayCountValidator }
export { RollingPeriodValidation }

// Factory
export { ValidationFactory }
export type { ValidationMode }

// Core functions
export { validateSlidingWindow } from "./rto-core"

// Orchestration
export {
  clearAllValidationHighlights,
  orchestrateValidation,
} from "./ValidationOrchestrator"

// Base class
export { ValidationStrategy }
```

## Configuration

Centralized configuration in `src/lib/rto-config.ts`:

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
  rollingPeriodWeeks: 12,       // 12-week window
  topWeeksToCheck: 8,           // Best 8 of 12 weeks
};
```

## Testing Strategy

Tests are co-located with source files:

```
src/
├── lib/
│   └── __tests__/
│       └── RollingPeriodValidation.test.ts
│
└── utils/
    └── astro/
        └── __tests__/
            ├── unit/
            │   ├── validation.test.ts
            │   └── calendarRendering.test.ts
            ├── integration/
            │   ├── uiUpdates.test.ts
            │   └── validationCycle.test.ts
            ├── embeddedElementRefTests.test.ts
            └── fixtures/
                ├── calendarData.ts
                ├── slidingWindowScenarios.ts
                └── weeklyPatterns.ts
```

## Summary

The RTO Calculator architecture prioritizes:

1. **Clear separation** between UI, orchestration, and data layers
2. **Pure functions** for business logic (testable, predictable)
3. **Strategy Pattern** for extensible validation modes
4. **Factory Pattern** for clean validator instantiation
5. **Single DOM query** to extract data, then pure operations
6. **Type safety** throughout with comprehensive TypeScript interfaces
