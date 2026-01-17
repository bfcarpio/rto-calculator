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
  - Week status column with compliance icons
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
  - Update week status icons based on 4-state system:
    - ✓ **compliant**: Green checkmark (individual week has ≥ 3 office days AND is in evaluated set when overall is valid)
    - ✗ **invalid**: Red X (two cases: 1) Individual week has < 3 office days regardless of overall result, OR 2) The week with lowest office days in evaluated set when window is invalid)
    - ⏳ **pending**: Hourglass (remaining evaluated weeks when window is invalid)
    - **(no icon)**: Ignored - weeks not in the evaluated set
  - Display compliance messages
  - Clear validation highlights

### Validation Flow

```
User selects day
      │
      ▼
Dispatch "rto-selection-changed" event
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
        ├─► Update ARIA attributes
        │   - ariaSelected: "true"/"false"
        │   - ariaLabel: "Day X. Work from home"
        │
        └─► Dispatch CustomEvent
            "rto-selection-changed"
            {
              cell: HTMLElement,
              selectionType: string
            }
```

### Validation Flow

```
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
    ├─► Week not in evaluated set: (no icon) - ignored
    │
    ├─► Week in evaluated set AND has < 3 office days: Red ✗ (invalid)
    │
    ├─► Week in evaluated set, has ≥ 3 office days, AND overall window is VALID: Green ✓ (compliant)
    │
    └─► Week in evaluated set, has ≥ 3 office days, AND overall window is INVALID:
        ├─► Lowest office days in evaluated set: Red ✗ (invalid)
        └─► Other weeks in evaluated set: Hourglass ⏳ (pending)
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
  status: "compliant" | "invalid" | "pending" | "ignored";
  statusCellElement: HTMLElement | null;
}

// Sliding window validation result
interface SlidingWindowResult {
  isValid: boolean;
  message: string;
  overallCompliance: number;
  evaluatedWeekStarts: number[];
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