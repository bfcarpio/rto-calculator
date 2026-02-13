# RTO Validation Implementation

## Overview

The RTO Calculator implements a validation system that ensures compliance with Return-to-Office (RTO) policies. The validation specifically checks that the **top 8 weeks of the first 12-week period** have an average of **3/5 (60%) days in office**.

## Validation Requirements

### Business Rules

1. **Evaluation Period**: The first full 12-week period starting from the first Monday of the calendar
2. **Check Window**: The top 8 weeks (weeks 1-8) within the 12-week period
3. **Office Day Requirement**: Minimum 3 out of 5 weekdays must be office days per week
4. **Threshold**: 60% average office days across the 8-week evaluation period

### What Counts as Office Days

- ✅ **Explicitly marked as office** (right-click)
- ✅ **Unselected weekdays** (default office days)
- ❌ **Work-from-home days** (left-click selections) - do NOT count as office days
- ❌ **Weekends** (Saturday, Sunday) - not counted in the calculation

## Implementation Details

### Architecture

The validation system is implemented as a client-side JavaScript module within `src/pages/index.astro`. It uses a reactive approach that updates in real-time as users select/deselect days.

### Core Components

#### 1. Data Collection

```javascript
// Get all work-from-home dates
function getWorkFromHomeDates() {
    // Queries DOM for all selected work-from-home cells
    // Returns array of Date objects
}
```

#### 2. Date Grouping

```javascript
// Group work-from-home dates by week
function groupDatesByWeek(workFromHomeDates) {
    // Creates a Map of week start timestamp → WFH day count
    // Efficient lookup for week-based calculations
}
```

#### 3. Validation Logic

```javascript
// Validate the top 8 weeks of the 12-week period
function validateTop8Weeks() {
    // 1. Find first Monday (start of first full week)
    // 2. Iterate through weeks 1-8
    // 3. Calculate office days: 5 - WFH days
    // 4. Compute average across 8 weeks
    // 5. Compare against 60% threshold
}
```

### Configuration

```javascript
const RTO_VALIDATION = {
    MIN_OFFICE_DAYS_PER_WEEK: 3,
    TOTAL_WEEKDAYS_PER_WEEK: 5,
    THRESHOLD_PERCENTAGE: 0.6,  // 3/5 = 60%
    ROLLING_PERIOD_WEEKS: 12,
    TOP_WEEKS_TO_CHECK: 8,
};
```

## User Interface

### Visual Indicators

1. **Compliance Indicator** (Header)
   - 🟢 **Compliant**: Green checkmark + "Compliant - 8-week avg"
   - 🔴 **Violation**: Red X + "Violation - 8-week avg"

2. **Validation Message** (Below Header)
   - Detailed status showing:
     - Current average office days
     - Percentage of weekdays
     - Required threshold
   - Example: "✓ RTO Compliant: Top 8 weeks average 3.5 office days (70%) of 5 weekdays. Required: 3 days (60%)"

3. **Evaluation Period Highlight**
   - Blue underline on days in the 8-week evaluation period
   - Visual cue for which days are being evaluated
   - Updated dynamically if calendar changes

### Legend

Additional legend item explains the evaluation period:
- 📊 **8-Week Evaluation Period**: Blue underline indicator

## Performance Considerations

### Efficient Data Access

- Uses `querySelectorAll` with specific class selectors
- Groups dates by week using Map for O(1) lookup
- Debounces validation updates (100ms) to prevent excessive recalculations

### Event Handling

- **MutationObserver**: Monitors DOM changes for real-time validation
- **Custom Events**: Dispatched when selections change
- **Debouncing**: Prevents validation thrashing during rapid selections

## Usage

### Making Selections

1. **Left-click**: Mark as work-from-home
2. **Right-click**: Mark as office day
3. **Drag**: Select multiple days (supports both click types)

### Validation Flow

1. User selects/deselects days
2. DOM mutation detected by MutationObserver
3. Validation debounced (100ms)
4. Work-from-home dates collected and grouped
5. 8-week average calculated
6. UI updated with compliance status
7. Screen reader announcement made

### Clearing Selections

- **Month clear button**: Clears all selections in a month
- **Clear All button**: Clears all selections across calendar
- Both trigger validation update after clearing

## Technical Implementation

### File Structure

```
src/
├── components/
│   ├── day.astro        # Dispatches selection events
│   └── month.astro      # Dispatches clear events
└── pages/
    └── index.astro      # Contains RTO validation logic
```

### Key Functions

| Function | Purpose | Returns |
|----------|---------|---------|
| `getWorkFromHomeDates()` | Collect WFH selections | `Date[]` |
| `groupDatesByWeek()` | Group by week for calculation | `Map<number, number>` |
| `getFirstFullWeekStart()` | Find evaluation period start | `Date` |
| `validateTop8Weeks()` | Main validation logic | Validation result object |
| `updateComplianceIndicator()` | Update UI with status | `void` |
| `highlightEvaluationPeriod()` | Visually mark evaluated days | `void` |

### Validation Result Object

```javascript
{
    isValid: boolean,              // Compliance status
    message: string,              // Human-readable message
    average: number,              // Average office day percentage (0-1)
    requiredAverage: number,      // Required threshold (0.6)
    weeksData: WeekData[],         // Data for each evaluated week
    totalOfficeDays: number,      // Total office days in 8 weeks
    totalWeekdays: number         // Total weekdays in 8 weeks
}
```

## Accessibility

### Screen Reader Support

- Validation status announced via `aria-live` regions
- Detailed messages provide context for compliance status
- Keyboard navigation supported for all interactions

### Visual Accessibility

- Color coding: Green (compliant), Red (violation)
- Icons: ✓ (check), ✗ (X)
- High contrast mode support
- Reduced motion support

## Edge Cases Handled

1. **Empty Calendar**: No dates selected → considered compliant
2. **Partial Week**: Only full weeks (Mon-Fri) evaluated
3. **Past Dates**: All past dates included in calculation
4. **Future Dates**: Future dates included in calculation
5. **Weekend Selections**: Weekends ignored in office day calculations
6. **Mixed Selections**: Office days + WFH days + unselected days all counted correctly

## Testing Recommendations

### Manual Testing Scenarios

1. **Compliant Scenario**: Mark 2 days as WFH per week (60% office)
2. **Violation Scenario**: Mark 3+ days as WFH per week (<60% office)
3. **Boundary Testing**: Exactly 2 WFH days vs exactly 3 WFH days
4. **Cross-Month**: Test weeks spanning month boundaries
5. **Clear Operations**: Verify validation updates after clearing

### Automated Testing

Consider adding tests for:
- Grouping logic accuracy
- Percentage calculations
- Edge case handling
- UI state updates

## Future Enhancements

### Potential Improvements

1. **Configurable Thresholds**: Allow users to customize RTO policies
2. **Historical Data**: Track compliance over time
3. **Export Reports**: Generate compliance reports
4. **Multiple Periods**: Support checking multiple 8-week windows
5. **Visual Charts**: Display compliance trend visualization
6. **Email Notifications**: Alert approaching violations

### Extensibility

The validation system is designed to be easily extended:

```javascript
// Example: Add custom validation rules
function addCustomValidation(rule) {
    // Rule structure:
    {
        name: "Monthly Minimum",
        check: (weeksData) => { /* validation logic */ },
        threshold: 0.5
    }
}
```

## Troubleshooting

### Common Issues

**Issue**: Validation not updating after selection
- **Solution**: Check browser console for JavaScript errors
- **Cause**: MutationObserver not initialized properly

**Issue**: Wrong week dates being evaluated
- **Solution**: Verify first Monday is correctly calculated
- **Cause**: Calendar start date offset

**Issue**: Performance lag with many selections
- **Solution**: Increase debounce timeout in `initRTOValidation()`
- **Cause**: Too many recalculations per second

## Conclusion

The RTO validation system provides real-time compliance checking with clear visual feedback. By leveraging efficient data structures and reactive updates, it delivers a responsive user experience while ensuring accurate policy enforcement.

The implementation prioritizes:
- ✅ **Accuracy**: Correct calculation of office day percentages
- ✅ **Performance**: Efficient data access and debounced updates
- ✅ **Accessibility**: Screen reader support and visual clarity
- ✅ **Maintainability**: Clean, well-documented code structure

For questions or issues, refer to the inline code comments or contact the development team.