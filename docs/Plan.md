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
│  └───────┼───────────┼─────────└──────────┘  └───────────┘  │    │
│          │           │                                        │    │
└──────────┼───────────┼────────────────────────────────────────┘
           │           │
┌──────────▼───────────▼────────────────────────────────────────┐
│                    Business Logic Layer                       │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              Validation System                        │   │
│  │  ┌──────────────────┐      ┌──────────────────┐     │   │
│  │  │  UI Integration  │◄────►│  Core Library     │     │   │
│  │  │  (DOM handling)  │      │  (Pure logic)     │     │   │
│  │  └──────────────────┘      └──────────────────┘     │   │
│  │           │                                             │   │
│  │  ┌────────▼─────────┐    ┌──────────────────┐        │   │
│  │  │RollingPeriod     │    │  Future:         │        │   │
│  │  │Validation.js     │    │  CustomStrategies│        │   │
│  │  └──────────────────┘    └──────────────────┘        │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              Utility Functions                        │   │
│  │  dateUtils.ts | validation.ts | storage.ts            │   │
│  │  dragSelection.ts                                      │   │
│  └──────────────────────────────────────────────────────┘   │
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
  - Week status column with 5-state compliance indicators:
    - ✓ Green checkmark (compliant): Week has ≥ 3 office days AND is in evaluated set when overall is valid
    - ✗ Red X (invalid): Week has < 3 office days, OR is the lowest-attendance week when window is invalid
    - ⏳ Hourglass (pending): Week is in evaluated set when overall window is invalid (but not the lowest)
    - ○ Grey circle (excluded): Week is in 12-week evaluation window but NOT in evaluated set (the "worst 4 weeks")
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

#### `components/ActionButtons.astro`
- **Responsibility**: Global action buttons (Validate, Clear All, Export)
- **Key Features**:
  - Rendered at top and bottom of calendar
  - Primary/secondary/danger variants
  - Keyboard accessible with focus management

#### `components/SettingsButton.astro` & `components/SettingsModal.astro`
- **Responsibility**: User configuration interface
- **Key Features**:
  - Modal dialog with ARIA attributes
  - Debug mode toggle
  - Validation strategy selection
  - Minimum office days configuration
  - Week pattern quick select (MWF, MTW, etc.)

## Validation System Architecture

### Strategy Pattern Implementation

```
ValidationStrategy (Interface)
    ▲
    │ implements
    │
RollingPeriodValidation (Concrete Strategy)
    │
    │ uses
    ▼
ValidationManager (Context)
```

### Key Classes

#### `ValidationManager` (`scripts/ValidationManager.js`)
- **Purpose**: Manages validation strategies and provides unified interface
- **Responsibilities**:
  - Register and retrieve validation strategies
  - Route validation requests to active strategy
  - Manage configuration (minOfficeDays, rollingPeriodWeeks, etc.)
  - Observer pattern for event notifications
  - Debug mode support

#### `RollingPeriodValidation` (`strategies/RollingPeriodValidation.js`)
- **Purpose**: Validates 12-week rolling period compliance
- **Algorithm**:
  1. Group selections by week start date
  2. For each 12-week window, calculate average office days
  3. Check if 8 out of 12 weeks have ≥3 office days (60% threshold)
  4. Identify violating windows with week-level details
- **Returns**: Compliance result with window-by-window breakdown

#### `rtoValidation.ts` (`lib/rtoValidation.ts`)
- **Purpose**: Core validation library with pure functions (no DOM dependencies)

#### `rtoValidation.ts` (`scripts/rtoValidation.ts`)
- **Purpose**: UI integration layer that handles DOM reading and updates
- **Responsibilities**:
  - Read calendar data from DOM elements
  - Calculate rolling compliance with week-by-week evaluation
  - Update week status icons based on 5-state system:
    - ✓ **compliant**: Green checkmark (individual week has ≥ 3 office days AND is in evaluated set when overall is valid)
      - CSS classes: .evaluated .compliant
      - Screen reader: "Compliant week"
    - ✗ **invalid**: Red X (two cases: 1) Individual week has < 3 office days regardless of overall result, OR 2) The week with lowest office days in evaluated set when window is invalid)
      - CSS classes: .evaluated .non-compliant
      - Screen reader: "Invalid week - lowest office days in evaluated set"
    - ⏳ **pending**: Hourglass (remaining evaluated weeks when window is invalid)
      - CSS classes: .evaluated .least-attended
      - Screen reader: "Pending evaluation - part of invalid window"
    - ○ **excluded**: Grey circle (weeks in 12-week window but not in evaluated set - the "worst 4 weeks")
      - CSS classes: .evaluated .excluded
      - Screen reader: "Excluded - in evaluation window but not evaluated (worst 4 weeks)"
    - (empty) **ignored**: Empty status (weeks NOT in the 12-week evaluation window)
      - No CSS classes
      - Screen reader: (empty)
  - Display compliance messages
  - Clear validation highlights

### Validation Flow

```
User clicks "Validate" button
      │
      ▼
ValidationManager.validate() called
      │
      ▼
RollingPeriodValidation.execute()
      │
      ├─► Group days by week
      ├─► Calculate weekly office counts
      ├─► Evaluate 12-week windows
      └─► Identify violations
      │
      ▼
Update UI:
  - Week status icons
  - Compliance indicator
  - Validation message

Note: Validation is NOT automatic. It only runs when user explicitly clicks the Validate button.
```

## Data Flow

### Selection Flow

```
User Action (click/drag)
        │
        ▼
day.astro handleMouseDown()
        │
        ├─► Update dataset attributes
        │   - data-selected: "true"/"false"
        │   - data-selection-type: "work-from-home"/"office"/""
        │
        ├─► Update CSS classes
        │   - .selected
        │   - .work-from-home / .office
        │
        └─► Update ARIA attributes
            │   - ariaSelected: "true"/"false"
            │   - ariaLabel: "Day X. Work from home"

Note: Selection changes do NOT trigger automatic validation.
Validation only occurs when user clicks the "Validate" button.
```

### Validation Flow

```
User clicks "Validate" button
        │
        ▼
ValidationManager.validate() called
        │
        ▼
DOM Read
    │
    ▼
readCalendarData()
    │
    ├─► Query all .calendar-day.selected
    ├─► Extract year, month, day, selectionType
    ├─► Group by week start date
    └─► Calculate WFH/office counts
    │
    ▼
calculateRollingCompliance()
    │
    ├─► For each 12-week window:
    │   ├─► Sort weeks by office days
    │   ├─► Select best 8 weeks
    │   ├─► Calculate average office days
    │   └─► Check threshold (≥60%)
    │
    ▼
updateWeekStatusIcon()
    │
    ├─► Week NOT in 12-week evaluation window: Empty (ignored)
    │   - No CSS classes
    │   - Screen reader: (empty)
    │
    ├─► Week in 12-week window:
    │   ├─► Week has < 3 office days: Red ✗ (invalid)
    │   │   - CSS classes: .evaluated .non-compliant
    │   │   - Screen reader: "Invalid week - lowest office days in evaluated set"
    │   │
    │   ├─► Week in evaluated set AND overall window is VALID:
    │   │   ├─► Best 8 weeks: Green ✓ (compliant)
    │   │   │   - CSS classes: .evaluated .compliant
    │   │   │   - Screen reader: "Compliant week"
    │   │   └─► Other 4 weeks in window: Grey circle ○ (excluded)
    │   │       - CSS classes: .evaluated .excluded
    │   │       - Screen reader: "Excluded - in evaluation window but not evaluated (worst 4 weeks)"
    │   │
    │   └─► Week in evaluated set AND overall window is INVALID:
    │       ├─► Lowest office days in evaluated set: Red ✗ (invalid)
    │       │   - CSS classes: .evaluated .non-compliant
    │       │   - Screen reader: "Invalid week - lowest office days in evaluated set"
    │       ├─► Best 7 weeks: Green ✓ (compliant)
    │       │   - CSS classes: .evaluated .compliant
    │       │   - Screen reader: "Compliant week"
    │       └─► Other 4 weeks in window: Grey circle ○ (excluded)
    │           - CSS classes: .evaluated .excluded
    │           - Screen reader: "Excluded - in evaluation window but not evaluated (worst 4 weeks)"

Note: Validation is NOT automatic. It only runs when user explicitly clicks the Validate button.
```

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
   - Auto-save on selection changes (planned)

### Data Structures

```typescript
// Day selection stored in DOM
data-selected="true"
data-selection-type="work-from-home"
data-year="2025"
data-month="0"
data-day="15"

// Week compliance data
interface WeekInfo {
  weekStart: Date;
  weekNumber: number;
  days: DayInfo[];
  wfhCount: number;
  officeDays: number;
  isCompliant: boolean;
  isUnderEvaluation: boolean;
  status: WeekStatus; // "compliant" | "invalid" | "pending" | "excluded" | "ignored"
  statusCellElement: HTMLElement | null;
}

// Sliding window validation result
interface SlidingWindowResult {
  isValid: boolean;
  message: string;
  overallCompliance: number;
  evaluatedWeekStarts: number[];
  windowWeekStarts: number[]; // All weeks in the 12-week evaluation window
  invalidWeekStart: number | null; // The week with lowest office days in evaluated set (when invalid)
  windowStart: number | null; // The start of the 12-week window that was evaluated
}
```

## Directory Structure

```
src/
├── components/
│   ├── ActionButtons.astro      # Global action buttons
│   ├── SettingsButton.astro     # Settings modal trigger
│   ├── SettingsModal.astro      # Configuration dialog
│   ├── day.astro                # Individual day cell
│   ├── month.astro              # Month grid with status column
│   ├── Calendar/                # Calendar-specific subcomponents
│   └── scripts/                 # Component scripts
├── pages/
│   └── index.astro              # Main application page
├── scripts/
│   └── rtoValidation.ts         # UI integration for validation
├── lib/
│   └── rtoValidation.ts         # Core validation library
├── styles/
│   ├── global.css               # Global styles
│   └── pages/index.css          # Page-specific styles
├── types/
│   ├── index.ts                 # Core type definitions
│   ├── calendar-types.d.ts      # Calendar-specific types
│   ├── validation-strategy.d.ts # Strategy interface
│   └── rto-validation.d.ts       # Validation types
├── utils/
│   └── astro/
│       └── calendarFunctions.ts # Astro server utilities
│   ├── dateUtils.ts             # Date manipulation functions
│   ├── dragSelection.ts         # Drag selection manager
│   ├── storage.ts               # localStorage utilities
│   └── validation.ts            # Pure validation logic
├── layouts/
│   └── Layout.astro             # Base layout
└── assets/                      # Static assets
```

## Design Patterns

### 1. Strategy Pattern
- **Location**: `ValidationManager` + `RollingPeriodValidation`
- **Purpose**: Allow pluggable validation algorithms
- **Benefit**: Easy to add new validation strategies (fixed period, custom rules)

### 2. Observer Pattern
- **Location**: `ValidationManager`
- **Purpose**: Notify subscribers of validation events
- **Benefit**: Decouple validation logic from UI updates

### 3. Component Pattern
- **Location**: All Astro components
- **Purpose**: Encapsulate UI logic and presentation
- **Benefit**: Reusability, maintainability

### 4. Utility Pattern
- **Location**: `utils/` directory
- **Purpose**: Pure functions for common operations
- **Benefit**: Testability, no side effects

## Accessibility Features

### Keyboard Navigation
- Arrow keys: Navigate between days
- Enter/Space: Toggle selection
- Escape: Clear selection
- Tab: Navigate between months and buttons

### Screen Reader Support
- ARIA labels on all interactive elements
- aria-live regions for dynamic announcements
- Semantic HTML structure (proper headings, landmarks)
- aria-selected for selection state
- aria-describedby for additional context

### Visual Accessibility
- High contrast mode support (@media (prefers-contrast: high))
- Reduced motion support (@media (prefers-reduced-motion))
- Focus indicators with focus-visible
- Color + font weight for selection states (not just color)

## Performance Considerations

### Current Optimizations
- Direct DOM manipulation (no framework overhead)
- Event delegation where possible
- CSS transitions instead of JS animations
- Lazy component initialization

### Potential Improvements
- Virtual scrolling for long calendars
- Debounced validation on rapid selections
- Optimized DOM queries (cache selectors)
- RequestAnimationFrame for UI updates

## Testing Strategy

### Test Structure
```
src/utils/astro/__tests__/
└── [Test files for Astro utilities]
```

### Test Coverage Areas
- Date manipulation functions (`dateUtils.ts`)
- Pure validation logic (`validation.ts`)
- Drag selection state management
- localStorage utilities

## Technical Stack

| Layer | Technology |
|-------|------------|
| Framework | Astro (v4+) |
| Language | TypeScript, JavaScript |
| Styling | Scoped CSS with Custom Properties |
| Build | Astro CLI / Vite |
| Accessibility | ARIA, Semantic HTML |
| State | DOM + localStorage |
| Validation | Strategy Pattern |

## Extension Points

### Configurable Validation Parameters

**Current Hard-Coded Values:**
- Window Size: 12 weeks (rolling period)
- Evaluation Size: 8 weeks (best weeks to evaluate)
- Exclusion Size: 4 weeks (12 - 8 = weeks excluded from evaluation)
- Minimum Office Days: 3 days per week
- Threshold Percentage: 60% (3/5 days)

**Proposed Configuration Structure:**

```typescript
interface ValidationConfig {
  // Window Configuration
  rollingPeriodWeeks: number;      // Total weeks in evaluation window (default: 12)
  evaluationWeeks: number;         // Best weeks to evaluate (default: 8)
  
  // Week Compliance Requirements
  minOfficeDaysPerWeek: number;     // Minimum office days per week (default: 3)
  totalWeekdaysPerWeek: number;     // Weekdays per week (default: 5)
  thresholdPercentage: number;        // Compliance threshold (default: 0.6)
  
  // Behavior Flags
  allowPartialWeeks: boolean;       // Include partial weeks in validation (default: false)
  partialWeekThreshold: number;      // Minimum weekdays for partial week (default: 5)
}
```

**Implementation Plan:**

1. **Phase 1: UI Controls**
   - Add "Validation Settings" section to SettingsModal.astro
   - Create form fields for:
     - Rolling Period Weeks (input type="number", min: 4, max: 52, default: 12)
     - Evaluation Weeks (input type="number", min: 1, max: rollingPeriodWeeks-1, default: 8)
     - Minimum Office Days (input type="number", min: 0, max: totalWeekdaysPerWeek, default: 3)
     - Compliance Threshold (input type="range", min: 0, max: 1, step: 0.05, default: 0.6)

2. **Phase 2: Storage and Persistence**
   - Extend UserPreferences type in `src/types/index.ts`:
     ```typescript
     interface UserPreferences {
       defaultPattern: number[] | null;
       validationConfig: ValidationConfig | null;
     }
     ```
   - Update storage utilities to save/load ValidationConfig
   - Load config on app initialization
   - Apply config to validation functions

3. **Phase 3: Validation Logic Updates**
   - Update `src/lib/rtoValidation.ts`:
     - Modify `validateSlidingWindow()` to accept custom config
     - Update `DEFAULT_RTO_POLICY` to be used as defaults
     - Ensure all validation functions use config values
   - Update `src/scripts/rtoValidation.ts`:
     - Pass config to validation functions
     - Update status display logic to use config-based thresholds
     - Update debug logging to show active config

4. **Phase 4: UI Feedback**
   - Display current validation settings in compliance message:
     ```
     ✓ Compliant: 8 of 12 weeks (80.5%) - Using 3-day minimum
     ```
   - Show settings indicators:
     - Badge showing current configuration
     - Visual indicators for different thresholds
   - Add "Reset to Defaults" button in settings

5. **Phase 5: Validation and Testing**
   - Create comprehensive test suite for configurable validation:
     ```typescript
     describe("Configurable Validation", () => {
       it("should use custom window size", () => {
         // Test with 8-week window
       });
       it("should use custom evaluation size", () => {
         // Test with 6 of 8 weeks evaluated
       });
       it("should use custom minimum days", () => {
         // Test with 2-day minimum
       });
     });
     ```
   - Test edge cases:
     - Evaluation weeks > rolling period (should error)
     - Minimum days > total weekdays (should error)
     - Zero threshold (always compliant)
     - 100% threshold (all 5 days required)

**Priority Presets:**

```typescript
const VALIDATION_PRESETS = {
  standard: {
    name: "Standard (3 days/week)",
    rollingPeriodWeeks: 12,
    evaluationWeeks: 8,
    minOfficeDaysPerWeek: 3,
    thresholdPercentage: 0.6,
  },
  relaxed: {
    name: "Relaxed (2 days/week)",
    rollingPeriodWeeks: 12,
    evaluationWeeks: 8,
    minOfficeDaysPerWeek: 2,
    thresholdPercentage: 0.5,
  },
  strict: {
    name: "Strict (4 days/week)",
    rollingPeriodWeeks: 12,
    evaluationWeeks: 8,
    minOfficeDaysPerWeek: 4,
    thresholdPercentage: 0.8,
  },
  hybrid: {
    name: "Hybrid Mode (Flexible)",
    rollingPeriodWeeks: 8,
    evaluationWeeks: 6,
    minOfficeDaysPerWeek: 3,
    thresholdPercentage: 0.7,
  },
};
```

**Migration Path:**
1. Start with defaults (current behavior)
2. Add UI controls without auto-apply
3. User must click "Apply" to activate new settings
4. Show confirmation dialog with impact preview:
   ```
   Warning: Changing to 2-day minimum will affect existing selections.
   
   Current: 8 of 12 weeks compliant (67%)
   New:      9 of 12 weeks compliant (75%)
   
   [Cancel] [Apply Changes]
   ```
5. Save config to localStorage
6. Re-validate with new settings

**Validation Rules:**
```typescript
function validateConfig(config: ValidationConfig): ValidationResult {
  const errors: string[] = [];
  
  if (config.evaluationWeeks >= config.rollingPeriodWeeks) {
    errors.push("Evaluation weeks must be less than rolling period");
  }
  
  if (config.minOfficeDaysPerWeek > config.totalWeekdaysPerWeek) {
    errors.push("Minimum office days cannot exceed total weekdays");
  }
  
  if (config.thresholdPercentage < 0 || config.thresholdPercentage > 1) {
    errors.push("Threshold must be between 0 and 1");
  }
  
  if (config.rollingPeriodWeeks < 4) {
    errors.push("Rolling period must be at least 4 weeks");
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
}
```

### Adding New Validation Strategies

1. Create new strategy class implementing `ValidationStrategy` interface:
```javascript
class MyCustomValidation {
  name = "my-custom";
  description = "My custom validation logic";
  
  validate(context) {
    // Implementation
  }
  
  // ... other required methods
}
```

2. Register with ValidationManager:
```javascript
validationManager.registerValidator(new MyCustomValidation());
```

### Adding New Selection Types

1. Extend `selectionLabels` in `day.astro`
2. Add CSS classes for new selection type
3. Update validation logic to handle new type

## Known Limitations

1. **No Server-Side State**: All validation is client-side
2. **No User Authentication**: localStorage is shared across all users of device
3. **Limited Export**: Export functionality not yet implemented
4. **No Collaboration**: Single-user design
5. **Fixed 12-Month View**: Cannot navigate to different years

## Bug Fixes

### Partial Weeks Filtering (January 2025)

**Issue:** 
The first week of January 2025 was incorrectly marked as invalid (red X) when it contained only 3 weekdays (Wed Jan 1, Thu Jan 2, Fri Jan 3). This occurred because the calendar grid doesn't include days from the previous month in the same row, resulting in partial weeks with incomplete weekday data.

**Root Cause:**
The `readCalendarData()` function in `src/scripts/rtoValidation.ts` was including all weeks that had calendar cells, even if they contained fewer than 5 weekdays. When these partial weeks had insufficient office days (e.g., only 0-1 office days when minimum is 3), they were marked as invalid.

**Solution:**
Added filtering logic in `readCalendarData()` to exclude weeks with fewer than `POLICY.totalWeekdaysPerWeek` (5) weekdays from validation. This ensures that partial weeks at the start/end of the calendar (which don't include days from previous/next months) are not evaluated for compliance.

**Code Changes:**
```typescript
// Filter out partial weeks (weeks with fewer than the required weekdays)
// These occur at the start/end of calendar when the grid doesn't include
// days from previous/next months. Partial weeks should not be evaluated.
const completeWeeks = weeks.filter(
  (week) =>
    week.days.filter((d) => d.isWeekday).length >=
    POLICY.totalWeekdaysPerWeek,
);
```

**Impact:**
- Partial weeks now show empty status (ignored) instead of invalid
- Users no longer see red X on weeks with incomplete data
- Validation only evaluates complete weeks with all 5 weekdays

**⚠️ TODO: Evaluate in Run Phase**
This fix filters partial weeks based on weekday count, but there may be edge cases to verify:
1. Does this work correctly for calendars that span year boundaries?
2. Are there scenarios where weeks should be evaluated even with fewer weekdays?
3. Should partial weeks be configurable (e.g., allow 4-day weeks)?
4. Test with actual calendar UI to confirm partial weeks are properly ignored

**Status:** ✅ Implemented | 🔍 Needs Testing in Run Phase

## Future Enhancements

### Short-Term
- Implement localStorage auto-save
- Add JSON/CSV export
- Implement week pattern presets
- Add date validation (past dates, holidays)

### Medium-Term
- Multiple validation strategies
- Customizable RTO policies
- ICS calendar export
- Dark mode theme

### Long-Term
- User accounts and cloud sync
- Team scheduling features
- Mobile app
- Advanced analytics and reporting