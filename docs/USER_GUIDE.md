# RTO Calculator – User Guide

## Getting started
- Open the RTO Calculator in your browser; the year-long calendar loads with no selections saved by default.
- Data saving is off until you enable it in Settings; when enabled, selections persist via localStorage.
- Validation can be triggered after you mark at least one day.

## Marking days
- Click a day to toggle it as **out-of-office (OOF)**; unselected days count as office days.
- Click and drag across the grid to apply the same OOF toggle to a range.
- The focused day shows keyboard focus; the current day is highlighted and labeled for screen readers.

## Switching validation modes
- Use the validation mode control in Settings to pick:
  - **Strict**: each week must meet the minimum office-day requirement; fails on the first violating week.
  - **Average window**: rolling 12-week view using best-week selection to decide compliance.
- Switch modes and re-run validation to compare results.

## Understanding results
- **Strict** results show the first week that fails (e.g., “Week starting Sun Jan 07 has only 2 office days, required: 3”).
- **Average window** results summarize averages (e.g., “✓ RTO Compliant: 3.6 avg office days (72%) … Required: 3 days (60%)”).
- “No selections to validate” means nothing is marked; add at least one OOF day.

## Keyboard shortcuts
- Arrow keys: move focus between days.
- **Space** or **Enter**: toggle the focused day’s OOF state.
- **Esc**: cancel an in-progress drag selection.
- **Tab/Shift+Tab**: move to the next/previous focusable control (e.g., buttons, settings).

## Clearing data
- Use the **Clear all** buttons (top or bottom) to remove every marked day.
- Use **Clear [month]** buttons to wipe just that month; a screen-reader message announces how many days were cleared.
- If data saving is enabled and you want a clean slate, clear all selections and refresh; localStorage will be empty.

## Error messages and what to do
- **“No selections to validate”**: Mark at least one day, then re-run validation.
- **“Week starting … has only X office days, required: Y”**: In strict mode, add office days to that week until it meets the minimum.
- **“RTO Violation … Required: …”**: In average mode, reduce OOF days across the current 12-week window until the average meets the requirement.
