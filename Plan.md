# RTO Calculator Implementation Plan

## Overview
This document describes the implementation of various features for the RTO Calculator calendar, including drag selection functionality, customizable month views, and adjustable week numbering.

## Implementation Details

### 1. New Utility: DragSelectionManager
A new utility class `DragSelectionManager` was created in `src/utils/dragSelection.ts` to handle drag selection logic:

- **State Management**: Tracks drag state including start point, current point, and drag direction
- **Range Calculation**: Computes all dates between start and current drag points
- **Selection Logic**: Properly toggles dates based on the initial state of the start point
- **Validation Integration**: Validates each date during selection while allowing user feedback

### 2. Event Handling Updates
The calendar now supports three new mouse events for drag selection:

- **mousedown**: Starts drag selection on a valid date
- **mouseover**: Updates selection as the mouse moves over cells
- **mouseup**: Ends drag selection and finalizes changes

### 3. Integration with Existing Code
The implementation integrates with existing functionality:

- Preserves all validation logic from `validateSelection`
- Maintains localStorage persistence
- Keeps existing click-to-select functionality for single date selection
- Updates UI in real-time during drag operations
- Shows only 12 months instead of 365 days for better usability
- Supports configurable week start (Sunday vs Monday)
- Implements week numbering relative to year start

## Technical Approach

### Drag Selection Flow
1. User clicks on a date to start selection
2. User drags mouse over other dates
3. All dates between start and current position are selected/deselected
4. User releases mouse to finalize selection

### Selection Behavior
- If the starting date was **not selected**, dragging will **select** all dates in the range
- If the starting date was **selected**, dragging will **deselect** all dates in the range
- Weekends and past dates are automatically skipped during selection
- Validation warnings are shown but do not prevent selection

## Files Modified

### New Files
- `src/utils/dragSelection.ts` - Drag selection utility class
- `src/utils/weekStart.ts` - Week start configuration utility

### Modified Files
- `src/pages/index.astro` - Integration of drag selection functionality
  - Added import for DragSelectionManager
  - Created instance in init function
  - Added mouse event handlers for drag selection
  - Updated existing click handler to work with drag selection
- `src/utils/dateUtils.ts` - Updated to support configurable week start
  - Added import for week start configuration
  - Updated getStartOfWeek to accept weekStart parameter
  - Updated getWeekDates and getRollingPeriodDates to support configurable week start
- `src/utils/astro/calendarFunctions.ts` - Updated calendar rendering and validation
  - Added import for week start configuration
  - Updated createMonthElement to support configurable week start
  - Updated getWeeksForMonth to support configurable week start
  - Updated renderCalendar to show only 12 months
  - Updated validateAndUpdateCalendar to use configurable week start

## Future Improvements

### Visual Feedback
- Add visual indication of drag selection in progress
- Highlight dates that will be affected during drag operation

### Performance Optimization
- Optimize selection updates for large date ranges
- Implement virtual scrolling for better performance with many dates

### Accessibility
- Ensure keyboard navigation still works properly
- Add ARIA attributes to indicate drag selection state

### User Experience
- Add option to toggle between click-only and drag selection modes
- Implement touch support for mobile devices

### Run Phase Features
- Make week numbering adjustable to view start
- Allow users to customize calendar view settings (month grid layout, week start day)
- Add localization support for different regions' calendar preferences
```
