# RTO Calculator - Architecture Overview

## Project Overview

An Astro-based web application for tracking Return-to-Office (RTO) compliance. The application provides a 12-month interactive calendar where users can select days as "work from home" or "office day" and validate their selections against RTO policies (3/5 office days per week, 60% compliance over 12-week rolling periods).

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        Browser Layer                             │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              User Interface (index.astro)                │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────────────────┐  │  │
│  │  │ Settings │  │ Month    │  │  Action Buttons      │  │  │
│  │  │ Modal    │  │ Grid     │  │  (Validate, Export)  │  │  │
│  │  └──────────┘  └──────────┘  └──────────────────────┘  │  │
│  └──────────────────────────────────────────────────────────┘  │
│                              │                                   │
│  ┌───────────────────────────▼─────────────────────────────┐    │
│  │                  Component Layer                         │    │
│  │  ┌─────────┐  ┌─────────┐  ┌──────────┐  ┌───────────┐  │    │
│  │  │   Day   │  │  Month  │  │  Settings│  │   Action  │  │    │
│  │  │ .astro  │  │ .astro  │  │  Button  │  │  Buttons  │  │    │
│  │  └────┬────┘  └────┬────┘  │  Modal   │  │  .astro   │  │    │
│  │       │            │       └──────────┘  └───────────┘  │    │
│  └───────┼────────────┼──────────────────────────────────────┘    │
└──────────┼────────────┼────────────────────────────────────────────┘
           │            │
┌──────────▼────────────▼────────────────────────────────────────┐
│                    3-Layer Validation Flow                       │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ Layer 1: UI Controller (src/scripts/rto-ui-controller.ts)│ │
│  │                                                            │ │
│  │ - Event handlers for "Validate" button                     │ │
│  │ - Orchestrates validation workflow                         │ │
│  │ - Displays results to user                                 │ │
│  │ - NO validation logic - pure coordination                  │ │
│  └───────────────────────┬────────────────────────────────────┘ │
│                          │                                       │
│                          ▼                                       │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ Layer 2: Data Reader (src/lib/calendar-data-reader.ts)     │ │
│  │                                                            │ │
│  │ - SINGLE DOM query to read calendar state                  │ │
│  │ - Extracts selections, holidays, week data                 │ │
│  │ - Returns typed WeekInfo[] and DayInfo[]                   │ │
│  │ - ONLY layer with DOM access                               │ │
│  └───────────────────────┬────────────────────────────────────┘ │
│                          │                                       │
│                          ▼                                       │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ Layer 3: Orchestrator (src/lib/validation/               │ │
│  │          ValidationOrchestrator.ts)                        │ │
│  │                                                            │ │
│  │ - Coordinates validation workflow                          │ │
│  │ - Uses Strategy Pattern for validation modes               │ │
│  │ - Updates week status objects                              │ │
│  │ - NO DOM dependencies - pure data transformation         │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│                    Strategy Pattern Layer                      │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │              ValidationStrategy (Abstract)               │ │
│  │  - Base class for all validators                       │ │
│  │  - Shared utilities (caching, date math)             │ │
│  │  - Abstract methods: validate(), getWeekCompliance()   │ │
│  └───────────────────────┬───────────────────────────────────┘ │
│                          │                                     │
│          ┌───────────────┴───────────────┐                     │
│          │                               │                     │
│          ▼                               ▼                     │
│  ┌───────────────┐           ┌──────────────────┐             │
│  │ StrictDayCount│           │ AverageWindow    │             │
│  │ Validator     │           │ Validator        │             │
│  │               │           │                  │             │
│  │ Each week     │           │ 12-week rolling  │             │
│  │ individually  │           │ window averages  │             │
│  └───────────────┘           └──────────────────┘             │
│                          ▲                                     │
│                          │                                     │
│  ┌───────────────────────┴──────────────────────────┐         │
│  │            ValidationFactory                     │         │
│  │  Creates appropriate validator by mode:          │         │
│  │  - "strict" → StrictDayCountValidator           │         │
│  │  - "average" → AverageWindowValidator           │         │
│  └──────────────────────────────────────────────────┘         │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│                    Data Persistence Layer                    │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              localStorage                             │   │
│  │  - Selected Dates (ISO format)                        │   │
│  │  - User Preferences                                   │   │
│  │  - Last Updated Timestamp                             │   │
│  └──────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────┘
```

## 3-Layer Validation Flow

### Layer 1: UI Controller

**File:** `src/scripts/rto-ui-controller.ts`

**Responsibilities:**
- Handle user click events on the "Validate" button
- Trigger the validation workflow
- Display validation results to users
- Clear validation highlights when requested

**Key Functions:**
```typescript
export async function runValidationWithHighlights(): Promise<void> {
  // Step 1: Read calendar data from DOM
  const calendarData = await readCalendarData({ DEBUG: CONFIG.DEBUG });
  
  // Step 2: Clear previous highlights
  clearAllValidationHighlights();
  
  // Step 3: Orchestrate validation (no DOM access)
  const result = orchestrateValidation(calendarData, ORCHESTRATOR_CONFIG);
  
  // Step 4: Update week status cells in DOM
  updateWeekStatusCells(result.evaluatedWeeks);
  
  // Step 5: Display results to user
  displayValidationResults(result);
}
```

**Design Principle:** The UI Controller knows NOTHING about validation logic. It only coordinates the flow and updates the UI.

---

### Layer 2: Data Reader

**File:** `src/lib/calendar-data-reader.ts`

**Responsibilities:**
- Single DOM query to extract all calendar data
- Query status cells and build lookup maps
- Group cells by week
- Return typed data structures (`WeekInfo[]`, `DayInfo[]`)
- Integrate holiday data for validation

**Key Interface:**
```typescript
export interface CalendarDataResult {
  weeks: WeekInfo[];
  totalWeeks: number;
  totalHolidayDays: number;
  readTimeMs: number;
}

export interface WeekInfo {
  weekStart: Date;
  weekNumber: number;
  days: DayInfo[];
  oofCount: number;
  officeDays: number;
  isCompliant: boolean;
  status: WeekStatus;
  statusCellElement: HTMLElement | null; // DOM reference for UI updates
}
```

**Design Principle:** This is the ONLY file that accesses the DOM. All other layers work with pure data.

---

### Layer 3: Orchestrator

**File:** `src/lib/validation/ValidationOrchestrator.ts`

**Responsibilities:**
- Coordinate the validation workflow
- Convert `WeekInfo` data to `WeekCompliance` format
- Run sliding window validation using `rto-core.ts`
- Update week status objects based on validation results
- NO DOM dependencies - pure data transformation

**Key Interface:**
```typescript
export interface OrchestratedValidationResult {
  slidingWindowResult: SlidingWindowResult;
  evaluatedWeeks: WeekInfo[];
  totalWeeksEvaluated: number;
  compliancePercentage: number;
  isValid: boolean;
  message: string;
}

export function orchestrateValidation(
  calendarData: CalendarDataResult,
  config: Partial<RTOOrchestratorConfig> = {},
): OrchestratedValidationResult
```

**Design Principle:** The orchestrator transforms data but never touches the DOM. Status updates are applied to `WeekInfo` objects, which the UI layer then uses to update the DOM.

---

## Strategy Pattern Implementation

### The Abstract Base Class

**File:** `src/lib/validation/ValidationStrategy.ts`

```typescript
export abstract class ValidationStrategy {
  abstract readonly name: string;
  abstract readonly description: string;
  readonly defaultConfig: ValidationConfig = DEFAULT_CONFIG;
  
  // Abstract methods that concrete strategies must implement
  abstract validate(context: ValidatorContext): ValidationResult;
  abstract getWeekCompliance(weekStart: Date, context: ValidatorContext): WeekCompliance;
  abstract getWindowCompliance(windowStart: number, windowSize: number, context: ValidatorContext): WindowCompliance;
  
  // Shared utilities available to all strategies
  protected _getStartOfWeek(date: Date | SelectedDay): Date;
  protected _groupDaysByWeek(days: SelectedDay[], _weekStart: Date): Map<number, number>;
  protected _selectBestWeeks(weeks: WeekCompliance[], count: number): WeekCompliance[];
  protected _calculateComplianceStatus(officeDays: number, totalDays: number, thresholdPercentage: number): { percentage: number; isCompliant: boolean };
}
```

### Concrete Strategy: StrictDayCountValidator

**File:** `src/lib/validation/StrictDayCountValidator.ts`

Validates that **each week individually** meets the minimum office day requirement (3 days). Fails fast on the first violating week.

```typescript
export class StrictDayCountValidator extends ValidationStrategy {
  readonly name = "strict-day-count";
  readonly description = "Validates RTO compliance by checking each week individually";
  
  validate(context: ValidatorContext): ValidationResult {
    // Fail-fast: first violating week causes immediate failure
    for (let weekIndex = 0; weekIndex < totalWeeks; weekIndex++) {
      const windowCompliance = this.getWindowCompliance(weekIndex, 1, context);
      if (!windowCompliance.isCompliant) {
        return {
          isValid: false,
          message: `Week starting ${weekStart} has only ${officeDays} office days`,
          // ...
        };
      }
    }
    return { isValid: true, message: "All weeks meet minimum" };
  }
}
```

### Concrete Strategy: AverageWindowValidator

**File:** `src/lib/validation/AverageWindowValidator.ts`

Validates using **12-week rolling window averages**. Takes the best 8 weeks from each 12-week window and calculates average compliance.

```typescript
export class AverageWindowValidator extends ValidationStrategy {
  readonly name = "average-window";
  readonly description = "Validates RTO compliance using rolling 12-week window averages";
  
  validate(context: ValidatorContext): ValidationResult {
    // Slide through 12-week windows
    for (let windowStart = 0; windowStart <= totalWindows; windowStart++) {
      const windowCompliance = this.getWindowCompliance(
        windowStart,
        config.rollingPeriodWeeks,
        context
      );
      // Check compliance...
    }
  }
}
```

### Factory Pattern: ValidationFactory

**File:** `src/lib/validation/ValidationFactory.ts`

```typescript
export type ValidationMode = "strict" | "average";

export class ValidationFactory {
  private static validatorCache: Map<ValidationMode, ValidationStrategy> = new Map();
  
  static createValidator(mode: ValidationMode): ValidationStrategy {
    // Check cache first
    const cached = ValidationFactory.validatorCache.get(mode);
    if (cached) {
      cached.reset();
      return cached;
    }
    
    // Create new validator
    const validator = ValidationFactory._instantiateValidator(mode);
    ValidationFactory.validatorCache.set(mode, validator);
    return validator;
  }
  
  private static _instantiateValidator(mode: ValidationMode): ValidationStrategy {
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

---

## Component Architecture

### Core Components

#### `pages/index.astro`
- **Responsibility**: Main application entry point, orchestrates component rendering
- **Key Features**:
  - Generates 12-month calendar starting from current month
  - Renders header with compliance indicator
  - Initializes validation scripts and event handlers
  - Manages global event listeners (validate, clear, export buttons)

#### `components/Month.astro`
- **Responsibility**: Renders individual month with day grid and week status
- **Key Features**:
  - 6-row x 7-column grid (Mon-Sun + week number)
  - Week status column with 4-state compliance indicators:
    - ✓ Green checkmark (compliant): Week has ≥ 3 office days AND is in evaluated set when overall is valid
    - ✗ Red X (invalid): Week has < 3 office days, OR is the lowest-attendance week when window is invalid
    - ⏳ Hourglass (pending): Week is in evaluated set when overall window is invalid (but not the lowest)
    - (empty) (ignored): Week is NOT in the 12-week evaluation window
  - Week number column displaying ISO 8601 week numbers (1-52)
  - Month-level clear button
  - Keyboard navigation between days
  - Custom event dispatching for selection changes

#### `components/Day.astro`
- **Responsibility**: Individual calendar day cell with interaction logic
- **Key Features**:
  - Left-click: Toggle "work from home" (blue)
  - Right-click: Toggle "office day" (red)
  - Click-and-drag: Paint multiple days
  - Keyboard navigation (arrow keys, Enter, Space, Escape)
  - Screen reader announcements via aria-live regions
  - Toggle logic (clicking same selection clears it)

---

## Validation Flow

```
User clicks "Validate" button
       │
       ▼
rto-ui-controller.ts
runValidationWithHighlights()
       │
       ├─► Step 1: readCalendarData()
       │   │   - Single DOM query
       │   │   - Extract selections
       │   │   - Build WeekInfo[]
       │   └─► Returns CalendarDataResult
       │
       ├─► Step 2: clearAllValidationHighlights()
       │   │   - Clear previous status icons
       │
       ├─► Step 3: orchestrateValidation()
       │   │   - Convert WeekInfo[] → WeekCompliance[]
       │   │   - Run validateSlidingWindow()
       │   │   - Update week statuses
       │   └─► Returns OrchestratedValidationResult
       │
       ├─► Step 4: updateWeekStatusCells()
       │   │   - Update DOM status cells
       │   │   - Set icons (✓, ✗, ⏳, empty)
       │
       └─► Step 5: displayValidationResults()
           │   - Show compliance message
           │   - Update overall indicator
```

---

## Data Structures

### WeekInfo (Data Reader Output)

```typescript
interface WeekInfo {
  weekStart: Date;                    // Monday at midnight
  weekNumber: number;                 // Sequential (1, 2, 3...)
  days: DayInfo[];                   // Days in this week
  oofCount: number;                  // Out-of-office days
  officeDays: number;                // Calculated office days
  totalDays: number;                 // Effective weekdays (excluding holidays)
  isCompliant: boolean;              // Meets 3-day minimum?
  isUnderEvaluation: boolean;        // In 12-week window?
  status: WeekStatus;                // "compliant" | "invalid" | "pending" | "excluded" | "ignored"
  statusCellElement: HTMLElement | null;  // DOM reference for UI updates
}
```

### SlidingWindowResult (Core Validation)

```typescript
interface SlidingWindowResult {
  isValid: boolean;
  message: string;
  overallCompliance: number;         // Average compliance percentage
  evaluatedWeekStarts: number[];     // Best 8 weeks (timestamps)
  windowWeekStarts: number[];        // All 12 weeks in window
  invalidWeekStart: number | null;  // Lowest attendance week when invalid
  windowStart: number | null;       // Start of evaluated window
}
```

---

## State Management

### Client-Side State

1. **DOM-based State** (Primary)
   - Selection state stored in `dataset` attributes
   - Direct DOM manipulation for updates
   - No React/Vue-style state management

2. **Drag State** (Global)
   - `window.__calendarDragState`
   - Tracks dragging status, selection type, last focused cell

3. **localStorage State** (Persistence)
   - `rto-calculator-selected-dates`: JSON array of ISO date strings
   - `rto-calculator-user-preferences`: Theme, color scheme, etc.
   - Auto-save on selection changes

---

## Design Patterns

### 1. Strategy Pattern
- **Location:** `ValidationStrategy` + concrete implementations
- **Purpose:** Allow pluggable validation algorithms
- **Benefit:** Easy to add new validation strategies (fixed period, custom rules)

### 2. Factory Pattern
- **Location:** `ValidationFactory`
- **Purpose:** Centralized validator creation
- **Benefit:** Single point for instantiating correct validator by mode

### 3. 3-Layer Architecture
- **Location:** UI Controller → Data Reader → Orchestrator
- **Purpose:** Clear separation of concerns
- **Benefit:** Testable, maintainable, pure business logic

### 4. Pure Functions
- **Location:** `src/lib/validation/rto-core.ts`
- **Purpose:** Predictable, testable validation logic
- **Benefit:** No side effects, same input = same output

---

## Directory Structure

```
src/
├── components/           # Astro UI components
│   ├── ActionButtons.astro
│   ├── SettingsButton.astro
│   ├── SettingsModal.astro
│   ├── day.astro
│   ├── month.astro
│   └── __tests__/
│
├── lib/                  # Core business logic
│   ├── validation/       # Validation domain with Strategy Pattern
│   │   ├── ValidationStrategy.ts
│   │   ├── StrictDayCountValidator.ts
│   │   ├── AverageWindowValidator.ts
│   │   ├── ValidationFactory.ts
│   │   ├── ValidationOrchestrator.ts
│   │   ├── rto-core.ts
│   │   ├── RollingPeriodValidation.ts
│   │   └── index.ts
│   │
│   ├── holiday/          # Holiday management
│   │   ├── HolidayManager.ts
│   │   ├── HolidayDataLoader.ts
│   │   ├── CalendarHolidayIntegration.ts
│   │   ├── data/
│   │   └── sources/
│   │
│   ├── calendar-data-reader.ts
│   └── rto-config.ts
│
├── scripts/              # Client-side DOM integration
│   ├── rto-ui-controller.ts
│   ├── validation-result-display.ts
│   ├── validation-display.ts
│   ├── calendar-events.ts
│   ├── settings-modal.ts
│   ├── localStorage.ts
│   └── debug.ts
│
├── types/                # TypeScript definitions
│   ├── validation-strategy.d.ts
│   ├── calendar-types.d.ts
│   ├── rto-validation.d.ts
│   └── holiday-data-source.ts
│
├── utils/                # Utility functions
│   ├── dateUtils.ts
│   ├── dragSelection.ts
│   ├── storage.ts
│   ├── validation.ts
│   └── astro/
│       ├── calendarFunctions.ts
│       └── __tests__/
│
└── pages/
    └── index.astro
```

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

---

## Technical Stack

| Layer | Technology |
|-------|------------|
| Framework | Astro (v4+) |
| Language | TypeScript |
| Styling | Scoped CSS with Custom Properties |
| Build | Astro CLI / Vite |
| Accessibility | ARIA, Semantic HTML |
| State | DOM + localStorage |
| Validation | Strategy Pattern + Factory Pattern |

---

## Known Limitations

1. **No Server-Side State**: All validation is client-side
2. **No User Authentication**: localStorage is shared across all users of device
3. **Limited Export**: Export functionality not yet implemented
4. **No Collaboration**: Single-user design
5. **Fixed 12-Month View**: Cannot navigate to different years

---

## Future Enhancements

### Short-Term
- Implement localStorage auto-save
- Add JSON/CSV export
- Implement week pattern presets
- Add date validation (past dates, holidays)

### Medium-Term
- Multiple validation strategies with UI toggle
- Customizable RTO policies via settings
- ICS calendar export
- Dark mode theme

### Long-Term
- User accounts and cloud sync
- Team scheduling features
- Mobile app
- Advanced analytics and reporting
