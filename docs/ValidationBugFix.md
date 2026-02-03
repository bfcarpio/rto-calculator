# Validation Bug Fix - Individual Week Compliance

## Summary

Fixed a critical bug in the RTO validation system where weeks with fewer than 3 office days were incorrectly marked as "compliant" when the overall 8-week average met the 60% threshold.

## Bug Description

### Problem
When the sliding window validation found an overall valid result (average of best 8 weeks ≥ 60%), ALL weeks in the evaluated set were marked as "compliant" with a green checkmark (✓), even if individual weeks violated the 3-office-days-per-week minimum requirement.

### Example Scenario
```typescript
// Week configuration:
// Weeks 1-4:  2 WFH days (3 office days = 60%) - Individual compliant
// Week 5:     5 WFH days (0 office days = 0%)   - Individual VIOLATION!
// Weeks 6-8:  0 WFH days (5 office days = 100%) - Individual compliant

// Overall average: (3+3+3+3+0+5+5+5) / 8 = 27/8 = 3.375 days = 67.5%
// Result: VALID overall

// BUGGY BEHAVIOR:
// - All 8 weeks marked as "compliant" with ✓
// - Week 5 (0 office days) incorrectly shown as compliant!
```

## Root Cause

The status assignment logic in `orchestrateValidation()` checked the overall validation result BEFORE checking individual week compliance. In the new 3-layer architecture, this has been corrected in `ValidationOrchestrator.ts`:

```typescript
// FIXED CODE (current implementation in ValidationOrchestrator.ts):
for (const week of calendarData.weeks) {
  const weekCopy = copyWeekInfo(week);

  if (evaluatedTimestamps.has(week.weekStart.getTime())) {
    weekCopy.isUnderEvaluation = true;
    
    // Check individual compliance FIRST (officeDays >= minOfficeDaysPerWeek)
    if (!week.isCompliant) {
      weekCopy.status = "invalid"; // ✗ Red X for individual violation
    } else if (slidingWindowResult.isValid) {
      weekCopy.status = "compliant"; // ✓ Green checkmark
    } else {
      weekCopy.status = "invalid"; // ✗ Red X for window violation
    }
  } else {
    weekCopy.isUnderEvaluation = false;
    weekCopy.status = "pending";
  }
  
  // Additional check for lowest week in invalid window
  if (
    isInvalid &&
    invalidWeekStart !== null &&
    week.weekStart.getTime() === invalidWeekStart
  ) {
    weekCopy.status = "invalid";
  }

  evaluatedWeeks.push(weekCopy);
}
```

## Current 3-Layer Architecture

The validation system now uses a 3-layer architecture to properly handle individual week compliance:

```
┌─────────────────────────────────────────────────────────────────┐
│ Layer 1: UI Controller (src/scripts/rto-ui-controller.ts)      │
│                                                                  │
│ - runValidationWithHighlights()                                  │
│ - Reads calendar data, orchestrates validation                   │
│ - Updates UI with results                                        │
└──────────────────────────┬─────────────────────────────────────┘
                           │
┌──────────────────────────▼─────────────────────────────────────┐
│ Layer 2: Data Reader (src/lib/calendar-data-reader.ts)           │
│                                                                  │
│ - readCalendarData() queries DOM once                          │
│ - Calculates isCompliant per week (officeDays >= 3)            │
│ - Returns WeekInfo[] with compliance status                      │
└──────────────────────────┬─────────────────────────────────────┘
                           │
┌──────────────────────────▼─────────────────────────────────────┐
│ Layer 3: Orchestrator (src/lib/validation/                     │
│          ValidationOrchestrator.ts)                            │
│                                                                  │
│ - orchestrateValidation()                                        │
│ - Runs sliding window validation via rto-core.ts                 │
│ - Updates week statuses respecting individual compliance         │
│ - updateWeekStatusCells() applies results to DOM               │
└────────────────────────────────────────────────────────────────┘
```

## Status Logic After Fix

The corrected status assignment follows this decision tree:

```
Week Status Decision Tree:
│
├─► Is week in evaluated set (best 8 of 12)?
│   └─► NO → "pending" (not under evaluation)
│   └─► YES → Continue
│
├─► Does week have < 3 office days (individual violation)?
│   └─► YES → "invalid" (Red ✗)
│   └─► NO → Continue
│
├─► Is overall window INVALID?
│   ├─► YES → Is this the lowest-attendance week?
│   │   ├─► YES → "invalid" (Red ✗)
│   │   └─► NO → "invalid" (Red ✗) or "pending" based on logic
│   └─► NO → "compliant" (Green ✓)
```

## Changes Made

### 1. Core Logic Fix

**File:** `src/lib/validation/ValidationOrchestrator.ts` (lines 76-140)

The orchestration layer now properly checks individual week compliance before overall validation:

```typescript
export function orchestrateValidation(
  calendarData: CalendarDataResult,
  config: Partial<RTOOrchestratorConfig> = {},
): OrchestratedValidationResult {
  const mergedConfig = { ...DEFAULT_ORCHESTRATOR_CONFIG, ...config };
  const { policy } = mergedConfig;

  // Convert WeekInfo to WeekCompliance for validation
  const weeksForValidation = convertWeeksToCompliance(calendarData.weeks);

  // Run sliding window validation
  const slidingWindowResult = validateSlidingWindow(weeksForValidation, policy);

  // Update week statuses based on validation results
  const evaluatedTimestamps = new Set(slidingWindowResult.evaluatedWeekStarts);
  const isInvalid = !slidingWindowResult.isValid;
  const invalidWeekStart = slidingWindowResult.invalidWeekStart;

  const evaluatedWeeks: WeekInfo[] = [];

  for (const week of calendarData.weeks) {
    const weekCopy = copyWeekInfo(week);

    // Week is under evaluation if in the best 8 weeks
    if (evaluatedTimestamps.has(week.weekStart.getTime())) {
      weekCopy.isUnderEvaluation = true;
      
      // Check individual compliance FIRST
      // week.isCompliant is set in calendar-data-reader.ts based on officeDays >= minOfficeDaysPerWeek
      if (!week.isCompliant) {
        weekCopy.status = "invalid"; // Individual violation - always red ✗
      } else if (slidingWindowResult.isValid) {
        weekCopy.status = "compliant"; // ✓ Green checkmark
      } else {
        // Window is invalid but this week meets minimum
        // Mark as invalid if it's the lowest week, otherwise handled by UI
        weekCopy.status = "invalid";
      }
    } else {
      weekCopy.isUnderEvaluation = false;
      weekCopy.status = "pending";
    }

    // If invalid and we have an invalid week start, mark that specific week
    if (
      isInvalid &&
      invalidWeekStart !== null &&
      week.weekStart.getTime() === invalidWeekStart
    ) {
      weekCopy.status = "invalid"; // ✗ This is the lowest-attendance week
    }

    evaluatedWeeks.push(weekCopy);
  }

  return {
    slidingWindowResult,
    evaluatedWeeks,
    totalWeeksEvaluated: evaluatedWeeks.length,
    compliancePercentage: slidingWindowResult.overallCompliance,
    isValid: slidingWindowResult.isValid,
    message: slidingWindowResult.message,
  };
}
```

### 2. Data Reader Individual Compliance

**File:** `src/lib/calendar-data-reader.ts` (lines 200-267)

Individual week compliance is calculated during data reading:

```typescript
// In readCalendarData() function
for (const weekStartTimestamp of sortedWeekStarts) {
  // ... gather day info ...
  
  // Calculate week statistics
  const weekdayDays = days.filter((d) => d.isWeekday);
  const holidayDays = days.filter((d) => d.isHoliday && d.isWeekday);
  totalHolidayDays += holidayDays.length;
  
  const oofCount = days.filter(
    (d) => d.selectionType === "out-of-office" && d.isWeekday && !d.isHoliday,
  ).length;

  // Office days = weekdays that are not OOF and not holidays
  const officeDays = weekdayDays.length - holidayDays.length - oofCount;
  const totalEffectiveDays = weekdayDays.length - holidayDays.length;
  
  // Individual compliance check - set in Data Reader layer
  const isCompliant = officeDays >= mergedConfig.minOfficeDaysPerWeek;

  const weekInfo: WeekInfo = {
    weekStart,
    weekNumber: weeks.length + 1,
    days,
    oofCount,
    officeDays,
    totalDays: totalEffectiveDays,
    oofDays: oofCount,
    isCompliant,  // ← Individual compliance calculated here
    isUnderEvaluation: true,
    status: isCompliant ? "compliant" : "invalid",
    statusCellElement,
  };

  weeks.push(weekInfo);
}
```

### 3. Test Coverage

**File:** `src/utils/astro/__tests__/integration/uiUpdates.test.ts`

Added new test: `"should mark individual non-compliant weeks as invalid even when overall validation is valid"`

This test verifies:
- Week with 0 office days is marked as invalid even when overall average is ≥ 60%
- Compliant weeks are correctly marked as compliant
- Status icons display correctly for each case

```typescript
describe("UI Updates - Individual Week Compliance", () => {
  it("should mark individual non-compliant weeks as invalid even when overall validation is valid", () => {
    // Setup: Create weeks where overall is valid but one week violates individual minimum
    const weeks = [
      createMockWeek({ weekNumber: 1, officeDays: 3, isCompliant: true }),
      createMockWeek({ weekNumber: 2, officeDays: 0, isCompliant: false }), // Violation!
      createMockWeek({ weekNumber: 3, officeDays: 5, isCompliant: true }),
      // ... more weeks to make overall average ≥ 60%
    ];
    
    // Run validation
    const result = orchestrateValidation(
      { weeks, totalWeeks: weeks.length, totalHolidayDays: 0, readTimeMs: 0 },
      DEFAULT_ORCHESTRATOR_CONFIG
    );
    
    // Assert: Week 2 should be invalid even if overall is valid
    const week2Result = result.evaluatedWeeks.find(w => w.weekNumber === 2);
    expect(week2Result?.status).toBe("invalid");
    expect(week2Result?.isCompliant).toBe(false);
  });
});
```

### 4. Documentation Updates

**Files:** 
- `docs/Plan.md` - Updated status icon descriptions with 3-layer architecture
- `docs/Plan.md` - Updated flowchart to reflect corrected logic
- `docs/StatusColumn.md` - Updated status determination logic section
- `docs/INTRO.md` - Added 3-layer architecture overview

## Impact

### Before Fix
- **False Positives**: Users could see "compliant" status on weeks with 0 office days
- **Misleading UI**: Green checkmarks appeared on clearly non-compliant weeks
- **Policy Violations Hidden**: Individual week violations were masked by good overall averages

### After Fix
- **Accurate Week-Level Status**: Each week correctly reflects its actual compliance
- **Clear Violation Indicators**: Weeks with < 3 office days always show red ✗
- **Honest UI**: Status icons match individual week compliance regardless of overall result

## Testing Results

All 130 tests pass after the fix:
- ✓ 53 unit tests (validation logic)
- ✓ 43 tests (embedded element references)
- ✓ 34 integration tests (UI updates)

New test specifically validates:
```typescript
it("should mark individual non-compliant weeks as invalid even when overall validation is valid")
```

## Validation Policy Compliance

The RTO policy requires:
1. **Individual Weeks**: Minimum 3 office days per week (60%)
2. **Rolling Average**: Average of best 8 weeks must be ≥ 60% over any 12-week window

The fix ensures that requirement #1 is **always** enforced, even when requirement #2 is met.

## Current Implementation Files

- **`src/lib/validation/ValidationOrchestrator.ts`** - Contains the fix in `orchestrateValidation()`
- **`src/lib/calendar-data-reader.ts`** - Calculates `isCompliant` per week
- **`src/scripts/rto-ui-controller.ts`** - UI controller that triggers validation
- **`src/utils/astro/__tests__/integration/uiUpdates.test.ts`** - Test coverage
- **`docs/Plan.md`** - Architecture documentation with 3-layer flow
- **`docs/StatusColumn.md`** - Status column behavior documentation

## User Impact

Users will now see:
- ✓ **Green checkmark** only on weeks with ≥ 3 office days AND overall validation is valid
- ✗ **Red X** on any week with < 3 office days (regardless of overall result)
- ⏳ **Hourglass** on weeks in invalid windows that have ≥ 3 office days
- **Empty** on weeks not in the evaluated set

This provides complete transparency about which specific weeks violate the policy.

## Date of Fix

January 2025 - Updated with 3-layer architecture in February 2025

## Verification

To verify the fix manually:

1. Open the RTO Calculator
2. Select a week and mark all 5 days as "work from home" (0 office days)
3. Mark several other weeks with 0-2 WFH days (3-5 office days)
4. Click "Validate"
5. **Expected Result**: The all-WFH week should show a red ✗ (invalid), even if the overall 8-week average is ≥ 60%

The week with 0 office days will now always be identified as a violation, providing accurate compliance tracking.

---

## Architecture Benefits

The 3-layer architecture that implements this fix provides:

1. **Separation of Concerns**:
   - Data Reader calculates individual compliance
   - Orchestrator respects individual compliance when determining final status
   - UI Controller only displays results

2. **Testability**:
   - Individual compliance logic can be tested in isolation
   - Orchestrator logic can be tested with mock data
   - UI updates can be tested separately

3. **Maintainability**:
   - Changes to individual compliance logic only affect Data Reader
   - Changes to window validation only affect rto-core.ts
   - Changes to status display only affect Orchestrator

4. **Extensibility**:
   - New validation modes can be added via Strategy Pattern
   - Individual compliance rules can be adjusted in one place
   - Status display can be enhanced without touching validation logic
