# API Reference

Complete API documentation for the datepainter package.

## Table of Contents

- [Types](#types)
- [Classes](#classes)
- [Functions](#functions)

---

## Types

### `DateString`

A string in YYYY-MM-DD format.

```typescript
type DateString = `${number}-${number}-${number}`;
```

### `DateState`

Represents the state of a calendar date.

```typescript
type DateState = 'working' | 'oof' | 'holiday';
```

### `DateRange`

Defines a date range with start and end dates.

```typescript
interface DateRange {
  start: Date;
  end: Date;
}
```

### `StateConfig`

Configuration for a calendar state.

```typescript
interface StateConfig {
  label: string;       // Human-readable label
  color: string;       // Primary color (hex, rgb, etc.)
  bgColor: string;     // Background color
  icon?: string;       // Optional emoji or icon character
  position?: 'above' | 'below' | 'left' | 'right';  // Icon position
}
```

### `CalendarConfig`

Main configuration object for the calendar.

```typescript
interface CalendarConfig {
  dateRange: DateRange;
  states: Record<string, StateConfig>;
  styling?: {
    cellSize?: number;           // Cell size in pixels (default: 40)
    showWeekdays?: boolean;      // Show weekday headers (default: true)
    showWeekNumbers?: boolean;   // Show week numbers (default: true)
    firstDayOfWeek?: 0 | 1;      // 0 = Sunday, 1 = Monday (default: 0)
  };
  painting?: {
    enabled?: boolean;           // Enable drag painting (default: true)
    paintOnDrag?: boolean;       // Paint while dragging (default: true)
    defaultState?: DateState;    // Default state for painting
  };
}
```

### `CalendarInstance`

Public interface for calendar operations.

```typescript
interface CalendarInstance {
  getSelectedDates(): DateString[];
  getState(date: DateString | Date): DateState | null;
  getDatesByState(state: DateState): DateString[];
  setDates(dates: (DateString | Date)[], state: DateState): void;
  clearDates(dates: (DateString | Date)[]): void;
  clearAll(): void;
  toggleDate(date: DateString | Date, state: DateState): void;
  updateConfig(newConfig: Partial<CalendarConfig>): void;
  onStateChange(callback: (date: DateString, state: DateState | null) => void): () => void;
  destroy(): void;
}
```

### `ValidationResult`

Result of a validation operation.

```typescript
interface ValidationResult {
  isValid: boolean;
  message?: string;
}
```

---

## Classes

### `CalendarManager`

Main class for managing calendar instances with full state management.

```typescript
class CalendarManager implements CalendarInstance
```

#### Constructor

```typescript
constructor(containerSelector: string | HTMLElement, config: CalendarConfig)
```

**Parameters:**
- `containerSelector` - CSS selector string or HTMLElement for the calendar container
- `config` - Calendar configuration object

**Throws:**
- `Error` - If configuration is invalid

**Example:**
```typescript
const manager = new CalendarManager('#calendar', {
  dateRange: {
    start: new Date(2026, 0, 1),
    end: new Date(2026, 11, 31)
  },
  states: {
    working: { label: 'Working', color: '#10b981', bgColor: '#d1fae5' }
  }
});
```

#### Methods

##### `init()`

Initializes the calendar instance.

```typescript
init(): void
```

**Throws:**
- `Error` - If already initialized or container not found

**Example:**
```typescript
const manager = new CalendarManager('#calendar', config);
manager.init();
```

##### `destroy()`

Destroys the calendar instance and cleans up resources.

```typescript
destroy(): void
```

**Example:**
```typescript
manager.destroy();
```

##### `getSelectedDates()`

Gets all selected dates with their current states.

```typescript
getSelectedDates(): DateString[]
```

**Returns:** Array of date strings (YYYY-MM-DD) that have been selected

**Throws:**
- `Error` - If calendar not initialized

**Example:**
```typescript
const dates = manager.getSelectedDates();
// ['2026-02-06', '2026-02-07']
```

##### `getState()`

Gets the state for a specific date.

```typescript
getState(date: DateString | Date): DateState | null
```

**Parameters:**
- `date` - Date string (YYYY-MM-DD) or Date object

**Returns:** The state of the date, or null if not selected

**Throws:**
- `Error` - If calendar not initialized

**Example:**
```typescript
manager.getState('2026-02-06'); // 'working'
manager.getState(new Date(2026, 1, 6)); // 'working'
manager.getState('2026-02-07'); // null (not selected)
```

##### `getDatesByState()`

Gets all dates that have a specific state.

```typescript
getDatesByState(state: DateState): DateString[]
```

**Parameters:**
- `state` - The state to filter by (e.g., 'working', 'oof', 'holiday')

**Returns:** Array of date strings (YYYY-MM-DD) with the specified state

**Throws:**
- `Error` - If calendar not initialized

**Example:**
```typescript
const workingDays = manager.getDatesByState('working');
// ['2026-02-06', '2026-02-07', '2026-02-08']
```

##### `setDates()`

Sets multiple dates to a specific state.

```typescript
setDates(dates: (DateString | Date)[], state: DateState): void
```

**Parameters:**
- `dates` - Array of date strings (YYYY-MM-DD) or Date objects
- `state` - The state to set on the dates

**Throws:**
- `Error` - If calendar not initialized or state not in config

**Example:**
```typescript
manager.setDates(['2026-02-06', '2026-02-07'], 'working');
manager.setDates([new Date(2026, 1, 8)], 'oof');
```

##### `clearDates()`

Clears the state from multiple dates.

```typescript
clearDates(dates: (DateString | Date)[]): void
```

**Parameters:**
- `dates` - Array of date strings (YYYY-MM-DD) or Date objects to clear

**Throws:**
- `Error` - If calendar not initialized

**Example:**
```typescript
manager.clearDates(['2026-02-06', '2026-02-07']);
```

##### `clearAll()`

Clears the state from all selected dates.

```typescript
clearAll(): void
```

**Throws:**
- `Error` - If calendar not initialized

**Example:**
```typescript
manager.clearAll();
```

##### `toggleDate()`

Toggles a date between a state and unselected.

```typescript
toggleDate(date: DateString | Date, state: DateState): void
```

**Parameters:**
- `date` - Date string (YYYY-MM-DD) or Date object
- `state` - The state to toggle

**Throws:**
- `Error` - If calendar not initialized

**Example:**
```typescript
manager.toggleDate('2026-02-06', 'working'); // Sets to 'working'
manager.toggleDate('2026-02-06', 'working'); // Clears state
```

##### `updateConfig()`

Updates the calendar configuration.

```typescript
updateConfig(newConfig: Partial<CalendarConfig>): void
```

**Parameters:**
- `newConfig` - Partial configuration object with properties to update

**Throws:**
- `Error` - If merged configuration is invalid

**Example:**
```typescript
manager.updateConfig({
  styling: { cellSize: 48 }
});
```

##### `onStateChange()`

Registers a callback for state change notifications.

```typescript
onStateChange(callback: (date: DateString, state: DateState | null) => void): () => void
```

**Parameters:**
- `callback` - Function to call when a date state changes

**Returns:** Unsubscribe function to remove the callback

**Example:**
```typescript
const unsubscribe = manager.onStateChange((date, state) => {
  console.log(`Date ${date} is now ${state}`);
});

// Later...
unsubscribe();
```

---

### `CalendarRenderer`

Renderer class for vanilla JavaScript usage.

```typescript
class CalendarRenderer
```

#### Constructor

```typescript
constructor(container: string | HTMLElement, config: CalendarConfig)
```

**Parameters:**
- `container` - CSS selector string or HTMLElement to render calendar into
- `config` - Calendar configuration object

**Throws:**
- `Error` - If container element is not found or configuration validation fails

**Example:**
```typescript
const renderer = new CalendarRenderer('#calendar', config);
```

#### Methods

##### `render()`

Renders the calendar to the container.

```typescript
render(): void
```

**Throws:**
- `Error` - If container is null

**Example:**
```typescript
const renderer = new CalendarRenderer('#calendar', config);
renderer.render();
```

##### `destroy()`

Cleans up and removes the calendar from DOM.

```typescript
destroy(): void
```

**Example:**
```typescript
renderer.destroy();
```

##### `updateConfig()`

Updates the calendar configuration and re-renders.

```typescript
updateConfig(newConfig: Partial<CalendarConfig>): void
```

**Parameters:**
- `newConfig` - Partial configuration object with properties to update

**Throws:**
- `Error` - If updated configuration fails validation

**Example:**
```typescript
renderer.updateConfig({
  dateRange: {
    start: new Date('2026-06-01'),
    end: new Date('2026-12-31')
  }
});
```

##### `onDestroy()`

Registers a cleanup callback.

```typescript
onDestroy(callback: () => void): void
```

**Parameters:**
- `callback` - Function to execute during destruction

**Example:**
```typescript
const intervalId = setInterval(() => {
  console.log('Calendar check');
}, 60000);

renderer.onDestroy(() => {
  clearInterval(intervalId);
});
```

---

### `EventHandler`

Handles calendar event delegation and interactions.

```typescript
class EventHandler
```

#### Constructor

```typescript
constructor(container: string | HTMLElement, config: CalendarConfig)
```

**Parameters:**
- `container` - CSS selector or HTMLElement containing the calendar
- `config` - Calendar configuration object

**Throws:**
- `Error` - If container element is not found or config validation fails

#### Methods

##### `attach()`

Attaches event delegation for performance.

```typescript
attach(): void
```

**Throws:**
- `Error` - If EventHandler is not properly initialized

##### `destroy()`

Cleans up event listeners.

```typescript
destroy(): void
```

---

## Functions

### `getCalendarHTML()`

Generates the complete HTML markup for a calendar grid.

```typescript
getCalendarHTML(config: CalendarConfig): string
```

**Parameters:**
- `config` - The calendar configuration object

**Returns:** Complete HTML string for the calendar grid

**Example:**
```typescript
import { getCalendarHTML } from 'datepainter';

const html = getCalendarHTML(config);
document.getElementById('calendar').innerHTML = html;
```

### `getDayCellClasses()`

Gets CSS classes for a day cell based on state and position.

```typescript
getDayCellClasses(date: DateString, state: DateState | null): string
```

**Parameters:**
- `date` - The date string for the cell (YYYY-MM-DD format)
- `state` - The state of the date (working, oof, holiday) or null if unassigned

**Returns:** A space-separated string of CSS class names

**Example:**
```typescript
import { getDayCellClasses } from 'datepainter';

const classes = getDayCellClasses('2026-02-06', 'oof');
// Returns: 'rto-calendar-day rto-calendar-day--oof'
```

### `getIconHTML()`

Gets icon HTML for a day cell.

```typescript
getIconHTML(icon?: string, position?: 'above' | 'below' | 'left' | 'right'): string
```

**Parameters:**
- `icon` - The icon character or HTML string to display (optional)
- `position` - The position relative to the day number (default: 'below')

**Returns:** HTML string containing the icon span element

**Example:**
```typescript
import { getIconHTML } from 'datepainter';

const iconHTML = getIconHTML('🏠', 'below');
// Returns: '<span class="rto-calendar-day__icon rto-calendar-day__icon--below" aria-hidden="true">🏠</span>'
```

---

## Event Callbacks

The following callbacks can be configured in `CalendarConfig`:

### `onSelectionChange`

Called when the selection state changes.

```typescript
onSelectionChange: (selectedDates: DateString[]) => void
```

### `onValidationChange`

Called when validation state changes.

```typescript
onValidationChange: (result: ValidationResult) => void
```

**Example:**
```typescript
const config = {
  dateRange: { start: new Date('2026-01-01'), end: new Date('2026-12-31') },
  states: { /* ... */ },
  onSelectionChange: (dates) => {
    console.log('Selected dates:', dates);
  },
  onValidationChange: (result) => {
    console.log('Validation:', result);
  }
};
```
