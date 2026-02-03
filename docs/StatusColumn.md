# Status Column Documentation

## Overview

The status column is a critical UI component in the RTO Calculator that provides real-time visual feedback on week-by-week compliance with the Return to Office policy. Each week row displays an icon indicating its validation status, helping users quickly identify compliant weeks, violations, and weeks outside the evaluation window.

## Status States

The status column displays **four distinct states**, each with a unique visual indicator, screen reader text, and semantic meaning:

### 1. Compliant (✓ Green Checkmark)

**When shown:**
- The week has ≥ 3 office days
- The week is within the evaluated 12-week window
- The overall 12-week window is valid (≥ 60% compliance across best 8 weeks)

**Visual representation:**
- Icon: ✓ (green checkmark)
- CSS classes: `.week-status-container.evaluated.compliant`
- Color: Green (default from `.compliant` class)

**Screen reader text:** "Compliant"

**Example scenario:**
```
Week 1: 3 office days (Mon-Wed in office, Thu-Fri WFH)
Week 2: 4 office days (Mon-Thu in office, Fri WFH)
Week 3: 5 office days (all weekdays in office)
Overall validation: Valid (75% average)
Result: All 3 weeks show ✓
```

---

### 2. Invalid (✗ Red X)

**When shown:**
- The week has **< 3 office days** (individual violation), OR
- The week has the **lowest office days** in the evaluated set when the overall window is invalid

**Visual representation:**
- Icon: ✗ (red X)
- CSS classes: `.week-status-container.evaluated.non-compliant`
- Additional class on icon: `.week-status-icon.violation`
- Color: Red (bold, weight: 700)

**Screen reader text:** "Not compliant"

**Example scenario (individual violation):**
```
Week 1: 3 office days ✓ (compliant)
Week 2: 2 office days ✗ (invalid - < 3 days)
Week 3: 4 office days ✓ (compliant)
Overall validation: Valid (63% average)
Result: Week 2 shows ✗ (individual violation), weeks 1 and 3 show ✓
```

**Example scenario (window violation):**
```
Week 1: 1 office day ✗ (lowest)
Week 2: 2 office days ⏳ (pending)
Week 3: 2 office days ⏳ (pending)
Week 4: 2 office days ⏳ (pending)
Overall validation: Invalid (41% average)
Result: Week 1 shows ✗, weeks 2-4 show ⏳
```

---

### 3. Pending (⏳ Hourglass)

**When shown:**
- The week has ≥ 3 office days
- The week is within the evaluated set
- The overall 12-week window is **invalid**
- The week is **not** the lowest-attendance week in the evaluated set

**Visual representation:**
- Icon: ⏳ (hourglass)
- CSS classes: `.week-status-container.evaluated`
- Additional class on icon: `.week-status-icon.least-attended`
- Color: Light grey with opacity 0.7, scaled to 85%

**Screen reader text:** "Pending evaluation - part of invalid window"

**Example scenario:**
```
Week 1: 1 office day ✗ (invalid - lowest)
Week 2: 3 office days ⏳ (pending)
Week 3: 3 office days ⏳ (pending)
Week 4: 3 office days ⏳ (pending)
Week 5: 3 office days ⏳ (pending)
Overall validation: Invalid (58% average)
Result: Week 1 shows ✗, weeks 2-5 show ⏳
```

---

### 4. Ignored (Empty - No Icon)

**When shown:**
- The week is **not** in the current 12-week evaluation window
- Weeks outside the evaluation window are not considered for compliance calculation

**Visual representation:**
- Icon: (empty - no icon displayed)
- CSS classes: None (no status classes applied)
- Screen reader text: (empty)

**Example scenario:**
```
Evaluated window: Weeks 2-13 (12-week sliding period)
Week 1:   (ignored - before window)
Week 2-13: ✓/✗/⏳ (evaluated - various states)
Week 14+:   (ignored - after window)
Result: Weeks outside of 12-week window show empty status
```

## Status Determination Logic

The status is determined in the **ValidationOrchestrator** through the following decision tree:

```typescript
// In src/lib/validation/ValidationOrchestrator.ts

function determineWeekStatus(week: WeekInfo, validation: SlidingWindowResult): WeekStatus {
  const evaluatedTimestamps = new Set(validation.evaluatedWeekStarts);
  const isInvalid = !validation.isValid;
  const invalidWeekStart = validation.invalidWeekStart;
  
  // Step 1: Check if week is in the evaluated set
  if (!evaluatedTimestamps.has(week.weekStart.getTime())) {
    week.status = "pending"; // Not in best 8
    week.isUnderEvaluation = false;
  } else {
    week.isUnderEvaluation = true;
    
    // Step 2: Check overall window validity
    if (isInvalid) {
      // Step 3: Window is invalid - mark lowest week
      if (invalidWeekStart !== null && 
          week.weekStart.getTime() === invalidWeekStart) {
        week.status = "invalid"; // ✗ Red X (lowest in invalid window)
      } else {
        week.status = validation.isValid ? "compliant" : "invalid";
      }
    } else {
      // Step 4: Window is valid
      week.status = "compliant"; // ✓ Green checkmark
    }
  }
}
```

The UI layer (`src/scripts/rto-ui-controller.ts`) then applies these statuses to the DOM:

```typescript
// Step 4: Update week status cells in DOM
const { updateWeekStatusCells } = await import(
  "../lib/validation/ValidationOrchestrator"
);
updateWeekStatusCells(result.evaluatedWeeks);
```

## Visual Design

### Column Layout

The status column is the first column in the calendar table:

```
┌────────┬──────────────────────────────────────┬──────┐
│ Status │ Mon Tue Wed Thu Fri                 │ Week │
├────────┼──────────────────────────────────────┼──────┤
│   ✓    │ [ ] [ ] [ ] [ ] [ ]                │  02  │
│   ✗    │ [ ] [ ] [ ] [ ] [ ]                │  03  │
│   ⏳    │ [ ] [ ] [ ] [ ] [ ]                │  04  │
│        │ [ ] [ ] [ ] [ ] [ ]                │  05  │  ← Ignored (no icon)
└────────┴──────────────────────────────────────┴──────┘
```

### CSS Classes

**Base styles:**
```css
.week-status-cell {
  width: 3.5rem;
  height: var(--calendar-cell-height);
  background-color: #2d3748;
  border-right: 1px solid #4a5568;
}

.week-status-container {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  width: 100%;
}

.week-status-icon {
  font-size: 0.8rem;
  color: #718096;
  line-height: 1;
}
```

**State-specific styles:**
```css
/* Compliant - Green */
.week-status-container.compliant {
  /* Inherited green styling from CSS variables */
}

/* Invalid - Red */
.week-status-container.non-compliant {
  /* Inherited red styling */
}

.week-status-icon.violation {
  color: #f5222d;
  font-weight: 700;
}

/* Pending - Hourglass */
.week-status-icon.least-attended {
  color: #a0aec0;
  font-weight: 500;
  opacity: 0.7;
  transform: scale(0.85);
}

/* Ignored - Empty Status (no specific styles needed) */
/* Weeks not in evaluation window have no status classes or icons */
```

## Accessibility

### Screen Reader Support

Each status icon is accompanied by screen reader text for assistive technologies:

| Status | Icon | ARIA Label | Screen Reader Text |
|--------|------|------------|-------------------|
| Compliant | ✓ | "Week status indicator" | "Compliant" |
| Invalid | ✗ | "Week status indicator" | "Not compliant" |
| Pending | ⏳ | "Week status indicator" | "Pending evaluation - part of invalid window" |
| Ignored | (empty) | "Week status indicator" | (empty) |

### HTML Structure

```html
<td class="week-status-cell"
    role="gridcell"
    aria-label="Week status indicator"
    data-week-start="1736121600000">
  <div class="week-status-container">
    <span class="week-status-icon" aria-hidden="true"></span>
    <span class="sr-only">Week status</span>
  </div>
</td>
```

### Keyboard Navigation

- Tab navigation: Moves focus to calendar day cells (status column is not a focusable element)
- Screen readers: Announce status when focused on week row
- Status updates: Triggers ARIA live region announcements when validation completes

## Implementation Details

### DOM Structure

The status cell is embedded in each week row of the calendar in `src/components/month.astro`:

```typescript
// In month.astro - Status cell generation
<td
  class="week-status-cell"
  role="gridcell"
  aria-label="Week status indicator"
  data-week-start={weekStartStr}  // Timestamp for unique identification
>
  <div class="week-status-container">
    <span class="week-status-icon" aria-hidden="true"></span>
    <span class="sr-only">Week status</span>
  </div>
</td>
```

### Week Identification

Weeks are uniquely identified by their start timestamp (Monday at midnight) in `src/lib/calendar-data-reader.ts`:

```typescript
// Week start calculation (Monday at 00:00:00.000)
import { getStartOfWeek } from "../lib/validation/rto-core";

const weekStart = getStartOfWeek(date);
const weekKey = weekStart.getTime(); // Millisecond timestamp

// Example: Jan 6, 2025 (Monday) → 1736121600000
```

### Status Update Process

The status column is updated during validation through the orchestrator layer:

```typescript
// In ValidationOrchestrator.ts - Status update workflow
export function updateWeekStatusCells(evaluatedWeeks: WeekInfo[]): void {
  for (const week of evaluatedWeeks) {
    if (week.statusCellElement) {
      const container = week.statusCellElement;
      const iconElement = container.querySelector(".week-status-icon");
      const srElement = container.querySelector(".sr-only");

      if (iconElement) {
        iconElement.textContent = "";
        iconElement.classList.remove("violation", "least-attended");
      }
      if (srElement) {
        srElement.textContent = "";
      }

      if (week.status === "compliant" && iconElement && srElement) {
        iconElement.textContent = "✓";
        srElement.textContent = "Compliant";
      } else if (week.status === "invalid" && iconElement && srElement) {
        iconElement.textContent = "✗";
        srElement.textContent = "Not compliant";
      }
    }
  }
}
```

### Clearing Status

When validation is cleared, all status icons are reset through the orchestrator:

```typescript
// In ValidationOrchestrator.ts
export function clearAllValidationHighlights(
  statusContainerSelector: string = ".week-status-container",
): void {
  const statusCells = document.querySelectorAll(statusContainerSelector);

  statusCells.forEach((cell) => {
    const iconElement = cell.querySelector(".week-status-icon");
    const srElement = cell.querySelector(".sr-only");

    if (iconElement) {
      iconElement.textContent = "";
      iconElement.classList.remove("violation", "least-attended");
    }
    if (srElement) {
      srElement.textContent = "";
    }
  });
}
```

## Testing

### Unit Tests

The status update logic is tested in `src/utils/astro/__tests__/integration/uiUpdates.test.ts`:

```typescript
describe("UI Updates - Status Icon States", () => {
  it("should show green checkmark for compliant weeks in best 8");
  it("should show red X for invalid weeks");
  it("should show empty status for ignored weeks (not in evaluated window)");
  it("should show hourglass for pending weeks in invalid window");
});
```

### Integration Tests

Full validation scenarios are tested:

```typescript
describe("UI Updates - Integration Scenarios", () => {
  it("should handle full validation cycle with compliant result");
  it("should handle full validation cycle with violation result");
  it("should handle mixed compliance scenario");
  it("should mark individual non-compliant weeks as invalid even when overall validation is valid");
});
```

### Accessibility Tests

Screen reader announcements are verified:

```typescript
describe("UI Updates - Accessibility", () => {
  it("should provide screen reader text for compliant weeks");
  it("should provide screen reader text for invalid weeks");
  it("should provide screen reader text for ignored weeks");
  it("should keep icon with aria-hidden attribute");
});
```

## User Guide

### How to Read the Status Column

1. **Look at the status icon** in the first column of each week row
2. **Identify the state:**
   - ✓ Green: You're compliant! This week meets requirements
   - ✗ Red: Problem! This week needs attention
   - ⏳ Grey: Needs work when the window is invalid
   - (empty): Not currently being evaluated

3. **Take action based on state:**
   - ✓ Compliant: No action needed
   - ✗ Invalid: Add more office days to this week
   - ⏳ Pending: Try to add office days to improve overall compliance
   - (empty) Ignored: Wait until this week enters the evaluation window

### Common Scenarios

**Scenario 1: All weeks compliant**
```
Week 1:  ✓ (3 office days)
Week 2:  ✓ (4 office days)
Week 3:  ✓ (5 office days)
Week 4:  ✓ (3 office days)
...
Result: All green ✓ icons - You're meeting RTO requirements!
```

**Scenario 2: One violation**
```
Week 1:  ✓ (3 office days)
Week 2:  ✗ (2 office days) ← Needs attention
Week 3:  ✓ (4 office days)
Week 4:  ✓ (3 office days)
...
Result: One red ✗ icon - Add an office day to Week 2
```

**Scenario 3: Window violation**
```
Week 1:  ✗ (1 office day) ← Lowest attendance
Week 2:  ⏳ (2 office days) ← Needs improvement
Week 3:  ⏳ (2 office days) ← Needs improvement
Week 4:  ⏳ (3 office days) ← Meets minimum but window invalid
...
Result: One red ✗ and multiple ⏳ - Increase office days in pending weeks
```

**Scenario 4: Beginning of month**
```
Week 1:   (ignored - outside window)
Week 2:  ✓ (3 office days) ← First evaluated week
Week 3:  ✓ (4 office days)
Week 4:  ✓ (3 office days)
...
Result: First week ignored - Wait until you have more data
```

## Troubleshooting

### Issue: Status column shows empty cells

**Cause:** Week status cells haven't been populated yet (validation not run)

**Solution:** Click the "Validate" button to trigger validation and populate status icons

---

### Issue: All weeks show no status icons

**Cause:** Calendar has insufficient data for 12-week evaluation

**Solution:** Select days for at least 8 weeks to create a valid evaluation window

---

### Issue: Week shows ✓ but overall validation is invalid

**Cause:** This week individually meets the 3-day minimum, but the overall 12-week window fails the 60% threshold

**Solution:** Look for weeks showing ⏳ and add more office days to improve overall compliance

---

### Issue: Week shows ✗ but has 3 office days

**Cause:** The week is the lowest-attendance week in an invalid window

**Solution:** While this week meets the minimum, try adding another office day to improve overall compliance

## Related Documentation

- [Plan.md](./Plan.md) - Overall architecture and validation flow
- [ValidationBugFix.md](./ValidationBugFix.md) - Details on validation bug fixes
- [INTRO.md](./INTRO.md) - Project architecture overview

## Changelog

### Version 1.3 (Current)
- ✅ Fixed status logic to only mark weeks in current 12-week evaluation window (not all evaluated weeks)
- ✅ Changed ignored weeks to show empty status (no icon) instead of grey circle (○)
- ✅ Implemented ISO 8601 week numbers (1-52) in week number column
- ✅ Updated status icon system to 4 states: ✓ Compliant, ✗ Invalid, ⏳ Pending, (empty) Ignored
- ✅ Removed ignored class from CSS and JavaScript (ignored weeks have no visual state)
- ✅ Updated all integration tests to verify new ignored behavior (empty status)
- ✅ Updated Plan.md documentation with correct evaluation window behavior
- ✅ Updated StatusColumn.md documentation to reflect empty ignored status
- ✅ Updated StatusColumnFixes.md with technical details
- ✅ Refactored validation to use 3-layer architecture with ValidationOrchestrator
- ✅ Migrated from rtoValidation.ts to new rto-ui-controller.ts layer

### Version 1.2
- ✅ Fixed duplicate week numbers in week number column (initially used date format)
- ✅ Added grey circle (○) for ignored weeks
- ✅ Updated status icon system to 4 states: ✓ Compliant, ✗ Invalid, ⏳ Pending, ○ Ignored
- ✅ Added CSS styling for ignored status
- ✅ Updated all integration tests to verify new 4-state behavior
- ✅ Updated Plan.md documentation
- ✅ Created comprehensive StatusColumn.md documentation
- ✅ Fixed clearAllValidationHighlights() to handle ignored class

### Version 1.1
- ✅ Added grey circle (○) for ignored weeks
- ✅ Fixed duplicate week numbers in week number column
- ✅ Updated tests for 4-state status system
- ✅ Improved screen reader announcements

### Version 1.0
- ✅ Initial implementation of status column
- ✅ 3-state system (compliant, invalid, pending)
- ✅ No icon for ignored weeks
- ✅ Week numbering from January 1st
