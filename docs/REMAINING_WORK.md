# Remaining RTO Validation Work

## Completed ✅

### 1. RTO Validation Module
- **Location**: `src/utils/astro/rtoValidation.ts`
- **Features**:
  - TypeScript types for all validation data structures
  - `validateTop8Weeks()` - Main validation function for top 8 weeks of 12-week rolling period
  - `getFirstWeekStart()` - Returns first Monday on or after date (for calendar period)
  - `getWeekCompliance()` - Validates individual week compliance
  - `isInEvaluationPeriod()` - Checks if a week is within the evaluation window
  - `elementToDaySelection()` - Converts DOM elements to selection objects

### 2. Comprehensive Unit Tests
- **Location**: `src/utils/astro/__tests__/rtoValidation.test.ts`
- **Status**: All 49 tests passing
- **Coverage**:
  - Date manipulation functions
  - Week grouping logic
  - Compliance calculations
  - Boundary cases (exactly 60%, below 60%)
  - Integration scenarios

### 3. Client-Side Validation Script
- **Location**: `src/scripts/rtoValidation.js`
- **Features**:
  - Rolling 12-week validation (not just first 12 weeks)
  - Validates from Monday of current week through entire 12-month calendar
  - Office days = weekdays NOT marked as work-from-home
  - Real-time updates via MutationObserver
  - Triggers validation on mouseup (painting complete)
  - Highlights current week being evaluated
  - Debug mode (set `DEBUG: true` in file)

---

## Remaining Work 📋

### 1. Status Column in Month Calendar (`src/components/month.astro`)

**Requirements**:
- Add status column on the left side of each week row (once per week)
- Show compliance status for each week:
  - ⏳ = Under evaluation (in 8-week window)
  - ✓ = Compliant (3+ office days)
  - ✗ = Not compliant (<3 office days)
- Status should update in real-time as selections change

**Implementation Details**:
- Add `<th>` in `<thead>` for status column header with icon (📊)
- Add `<td>` in first row of `<tbody>` with `rowSpan={rows}` 
- Status cell content:
  ```html
  <div class="week-status-container">
    <div class="week-status evaluated" aria-live="polite">
      <span class="week-status-icon">⏳</span>
      <span class="sr-only">Under evaluation</span>
    </div>
  </div>
  ```

### 2. Centered Validation Message (`src/pages/index.astro`)

**Requirements**:
- Move validation message to center of screen
- Make it more prominent and easier to read
- Add visual indicator with icon and percentages

**Implementation Details**:
- Wrap calendar and legend in page wrapper for side-by-side layout
- Add settings panel on left side (expandable/collapsible)
- Validation message styling:
  ```css
  .validation-message.centered-message {
    justify-content: center;
    align-items: center;
    text-align: center;
    max-width: 800px;
    margin: 0.75rem auto;
    padding: 1rem 1.5rem;
    font-size: 1.1rem;
    font-weight: 500;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    border-radius: 8px;
    position: relative;
    z-index: 10;
  }
  ```

### 3. Weekend Dimming (`src/pages/index.astro`)

**Requirements**:
- Weekends (Saturday, Sunday) should be visually dimmed
- Dimming applies even when selected
- Helps users focus on weekdays for office attendance

**Implementation Details**:
- Add `.calendar-day.weekend` CSS class to weekends
- Style:
  ```css
  .calendar-day.weekend {
    opacity: 0.5;
    background-color: #f5f5f5;
  }
  
  .calendar-day.weekend:hover {
    opacity: 0.5;
  }
  
  .calendar-day.weekend.selected {
    opacity: 0.5;
  }
  ```

### 4. Settings Panel (`src/pages/index.astro`)

**Requirements**:
- Create expandable settings panel on left side
- Allow users to set default work-from-home days for each week
- Row with day headers (Mon, Tue, Wed, Thu, Fri)
- User can select which days to auto-mark as WFH when using clear buttons
- Save button to persist settings
- Visual feedback when settings are saved

**Implementation Details**:
- Settings panel structure:
  ```html
  <aside class="settings-panel" id="settings-panel">
    <button id="settings-toggle" class="settings-toggle">
      <span class="settings-icon">⚙️</span>
      <span>Settings</span>
    </button>
    <div id="settings-content" class="settings-content hidden">
      <h3>Default WFH Days</h3>
      <p>Select days to mark as Work From Home by default</p>
      <div class="default-wfh-selector">
        <div class="week-grid">
          <span class="day-header">Mon</span>
          <span class="day-header">Tue</span>
          <span class="day-header">Wed</span>
          <span class="day-header">Thu</span>
          <span class="day-header">Fri</span>
        </div>
        <div class="day-grid" id="default-wfh-days">
          <button class="default-wfh-day" data-day="0">M</button>
          <button class="default-wfh-day" data-day="1">T</button>
          <button class="default-wfh-day" data-day="2">W</button>
          <button class="default-wfh-day" data-day="3">T</button>
          <button class="default-wfh-day" data-day="4">F</button>
        </div>
      </div>
      <div class="settings-footer">
        <button id="save-settings">Save Settings</button>
      </div>
    </div>
  </aside>
  ```

- JavaScript logic:
  - Toggle panel visibility
  - Track selected default WFH days (Set data structure)
  - Save settings to localStorage
  - Animate settings button to show saved state
  - Apply default WFH when using month clear buttons

**Styling**:
  - Sticky positioning for settings panel
  - Collapsible content with smooth transitions
  - Grid layout for day selector
  - Button states (selected, hover, focus)

### 5. Playwright End-to-End Tests

**Requirements**:
- Create automated E2E tests using Playwright
- Test calendar interaction flows
- Test RTO validation logic
- Test settings panel functionality
- Test responsive behavior

**Test Scenarios**:
1. **Calendar Selection Tests**:
   - Left-click (work-from-home) on multiple days
   - Right-click (office) on days
   - Drag to select multiple days
   - Verify selections persist and update validation

2. **Validation Tests**:
   - Mark 3+ WFH days in a week → should show non-compliant
   - Mark <3 WFH days in a week → should show compliant
   - Change selections across month boundaries
   - Verify 12-week rolling validation works correctly
   - Test validation message updates in real-time

3. **Settings Panel Tests**:
   - Toggle settings panel open/close
   - Select default WFH days (e.g., Mon, Tue)
   - Save settings
   - Verify settings persist across page reloads
   - Use month clear button → should apply default WFH days

4. **UI/UX Tests**:
   - Weekend dimming is visible
   - Status column displays correct states
   - Centered validation message is prominent
   - Responsive layout works on mobile/tablet/desktop

5. **Accessibility Tests**:
   - Keyboard navigation through calendar
   - Screen reader announcements for validation changes
   - Settings panel is accessible via keyboard
   - Focus management after interactions

**Implementation Details**:
- Create `tests/e2e/` directory
- Add Playwright configuration
- Test file structure:
  ```
  tests/e2e/
    ├── calendar.spec.ts
    ├── validation.spec.ts
    └── settings.spec.ts
  ```

---

## Implementation Order

### Phase 1: Month Component Updates (Priority 1)
1. Add status column header to month.astro
2. Add status cell to each week row
3. Implement status update logic in month script
4. Add CSS styling for status indicators
5. Test status column display

**Git Commit**: "feat: Add status column to month calendar showing week compliance"

### Phase 2: Validation Message & Settings Panel (Priority 2)
1. Update index.astro with centered validation message styling
2. Add settings panel HTML structure
3. Add CSS for settings panel
4. Implement settings panel JavaScript logic
5. Add weekend dimming CSS
6. Test all features together

**Git Commit**: "feat: Add settings panel and centered validation message"

### Phase 3: Playwright Tests (Priority 3)
1. Install Playwright and configure
2. Create test specification files
3. Implement test scenarios
4. Run tests and fix any failures
5. Add test scripts to package.json

**Git Commit**: "feat: Add comprehensive Playwright E2E test suite"

---

## Technical Notes

### RTO Validation Logic Summary
- **Evaluation Period**: Rolling 12-week window starting from Monday of current week
- **Check Window**: Top 8 weeks within that 12-week period
- **Threshold**: 60% of weekdays must be office days (minimum 3/5)
- **Office Days**: All weekdays EXCEPT those marked as work-from-home
- **Trigger**: Validation runs on mouseup (after painting) and MutationObserver for DOM changes

### State Management
- **Default WFH Days**: Store in JavaScript Set or localStorage
- **Current Week**: Track Monday of week being evaluated
- **Validation State**: Result object with isValid flag, message, percentages
- **Settings Visibility**: Boolean flag in DOM/JavaScript

### Accessibility Considerations
- Status column uses `aria-live="polite"` for screen readers
- Settings panel uses `aria-expanded` and `aria-controls`
- Validation messages announced via screen reader announcements
- Keyboard navigation support throughout
- Focus management after interactive actions

### Performance Optimizations
- Debounce validation updates (100ms) to prevent excessive recalculations
- MutationObserver batch processing
- Efficient DOM queries (querySelectorAll with specific selectors)
- Event delegation where possible
- CSS transitions for smooth visual updates