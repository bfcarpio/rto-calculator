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

The status assignment logic in `runValidationWithHighlights()` checked the overall validation result BEFORE checking individual week compliance:

```typescript
// BUGGY CODE (before fix):
if (!week.isUnderEvaluation) {
  week.status = "ignored";
} else if (!isInvalid) {
  // BUG: Marks all evaluated weeks as compliant when overall is valid
  week.status = "compliant";
} else if (week.weekStart.getTime() === invalidWeekStart) {
  week.status = "invalid";
} else {
  week.status = "pending";
}
```

The issue was in the `else if (!isInvalid)` condition. When `isInvalid` was `false` (meaning overall validation passed), it immediately marked all evaluated weeks as compliant without checking if each individual week actually met the 3-day minimum.

## Solution

Reordered the status assignment logic to check individual week compliance FIRST:

```typescript
// FIXED CODE (after fix):
if (!week.isUnderEvaluation) {
  week.status = "ignored";
} else if (!week.isCompliant) {
  // Check individual compliance FIRST
  week.status = "invalid";
} else if (!isInvalid) {
  // Only mark as compliant if both individual AND overall are valid
  week.status = "compliant";
} else if (week.weekStart.getTime() === invalidWeekStart) {
  week.status = "invalid";
} else {
  week.status = "pending";
}
```

## Status Logic After Fix

The corrected status assignment follows this decision tree:

```
Week Status Decision Tree:
│
├─► Not in evaluated set?
│   └─► YES → "ignored" (no icon)
│   └─► NO  → Continue
│
├─► Individual week has < 3 office days?
│   └─► YES → "invalid" (Red ✗)
│   └─► NO  → Continue
│
├─► Overall validation is INVALID?
│   ├─► YES → Check if this is the lowest office days week
│   │   ├─► YES → "invalid" (Red ✗)
│   │   └─► NO  → "pending" (Hourglass ⏳)
│   └─► NO  → "compliant" (Green ✓)
```

## Changes Made

### 1. Core Logic Fix
**File:** `src/scripts/rtoValidation.ts` (lines 525-537)

Added individual week compliance check before overall validation check.

### 2. Test Coverage
**File:** `src/utils/astro/__tests__/integration/uiUpdates.test.ts`

Added new test: `"should mark individual non-compliant weeks as invalid even when overall validation is valid"`

This test verifies:
- Week with 0 office days is marked as invalid even when overall average is ≥ 60%
- Compliant weeks are correctly marked as compliant
- Status icons display correctly for each case

### 3. Documentation Updates
**Files:** 
- `docs/Plan.md` - Updated status icon descriptions
- `docs/Plan.md` - Updated flowchart to reflect corrected logic
- `rollingvalidation.md` - Updated status icon code example

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

## User Impact

Users will now see:
- ✓ **Green checkmark** only on weeks with ≥ 3 office days AND overall validation is valid
- ✗ **Red X** on any week with < 3 office days (regardless of overall result)
- ⏳ **Hourglass** on weeks in invalid windows that have ≥ 3 office days
- **No icon** on weeks not in the evaluated set

This provides complete transparency about which specific weeks violate the policy, and ignored weeks are clearly distinguished by having no status icon at all.

## Additional Fix: Ignored Weeks Display

### Problem
Previously, weeks not in the evaluated 12-week window were displayed with a grey circle (○) icon, which could be confusing since these weeks weren't actually part of the validation.

### Solution
Changed the behavior so that weeks not in the evaluated set display **no icon at all**, making it clear that they are outside the validation window.

### Changes Made
1. **UI Logic** (`src/scripts/rtoValidation.ts`): Updated `updateWeekStatusIcon()` to set `iconElement.textContent = ""` and `srElement.textContent = ""` for ignored weeks, instead of showing a grey circle.

2. **Test Updates** (`src/utils/astro/__tests__/integration/uiUpdates.test.ts`):
   - Updated mock implementation to match the new behavior
   - Changed test expectations to verify ignored weeks have empty icon text
   - Updated class checks to verify ignored weeks don't have the "evaluated" class

3. **Documentation**:
   - Updated `docs/Plan.md` to show "(no icon)" for ignored weeks instead of "Grey ○"
   - Updated `rollingvalidation.md` with corrected code examples
   - Updated decision trees to reflect the new display logic

### Benefits
- **Clearer Visual Hierarchy**: Only validated weeks have status icons, making it immediately obvious which weeks are part of the evaluation
- **Reduced Confusion**: Users won't mistakenly think ignored weeks have some validation status
- **Better Accessibility**: Screen readers won't announce status information for non-evaluated weeks

## Related Files

- `src/scripts/rtoValidation.ts` - Contains the fix
- `src/utils/astro/__tests__/integration/uiUpdates.test.ts` - Test coverage
- `docs/Plan.md` - Architecture documentation
- `rollingvalidation.md` - Technical implementation details

## Date of Fix

January 15, 2025

## Verification

To verify the fix manually:

1. Open the RTO Calculator
2. Select a week and mark all 5 days as "work from home" (0 office days)
3. Mark several other weeks with 0-2 WFH days (3-5 office days)
4. Click "Validate"
5. **Expected Result**: The all-WFH week should show a red ✗ (invalid), even if the overall 8-week average is ≥ 60%

The week with 0 office days will now always be identified as a violation, providing accurate compliance tracking.