# RTO Calculator – User Guide

Welcome to the RTO Calculator! This guide will help you track your Return-to-Office (RTO) compliance with ease.

---

## Getting Started

### Opening the Application

1. Open the RTO Calculator in your browser
2. The calendar loads showing 12 months starting from the current month
3. No selections are saved by default (data saving is off until you enable it)

### First-Time Setup

**Enable Data Saving** (Optional):
1. Click the **Settings** button
2. Find "Enable data saving" toggle
3. Turn it **ON** to save your selections between sessions
4. Your selections will be stored in your browser's localStorage

**Note**: Data saving is disabled by default for privacy. Enable it if you want your selections to persist.

---

## Marking Days

### Selecting Work-From-Home Days

**Click to Toggle:**
- Click any weekday to mark it as **work from home (WFH)**
- Click again to unmark it
- Unselected days count as office days

**Drag to Select:**
- Click and drag across multiple days to apply the same selection
- Faster than clicking individual days

**Keyboard Navigation:**
- Use **Arrow keys** to move between days
- Press **Space** or **Enter** to toggle the focused day
- Press **Esc** to cancel an in-progress drag selection
- Use **Tab/Shift+Tab** to move between controls
- Press **?** to open keyboard shortcuts help

**Visual Indicators:**
- **Red background with 🏠** = Work from home
- **No highlight** = Office day
- **Amber background with ☀️** = Holiday (see Holiday Features below)

---

## Holiday Features

### Enabling Holidays

1. Click **Settings** button
2. Select your **Country** from the dropdown (200+ countries available)
3. (Optional) Select your **Company** if company-specific filters are available
4. Click **Save**

**Result:**
- Holidays appear with amber background and ☀️ emoji
- Hover over holiday to see the holiday name
- Holidays are automatically treated as non-office days in validation

### How Holidays Affect Validation

**Holidays reduce the required office days:**
- Normal week: 5 weekdays, need 3 office days (60%)
- Week with 1 holiday: 4 effective weekdays, need 2.4 office days (60%)
- Week with 2 holidays: 3 effective weekdays, need 1.8 office days (60%)

**Example:**
```
Week with President's Day (Monday holiday):
- Weekdays: 5 total
- Holidays: 1 (Monday)
- Effective weekdays: 4
- Required office days: 2.4 (60% of 4)
- If you work Tue-Thu (3 days): ✓ Compliant
```

### Company Holiday Filters

Some countries have company-specific holiday settings:
- Select your company to filter which holidays apply
- Choose "All Holidays" to include all national holidays
- Not all countries have company filters (will show empty dropdown)

### Disabling Holidays

1. Click **Settings**
2. Change country dropdown to **"None"**
3. Click **Save**
4. All holiday markers will be removed

---

## Validation Modes

### Understanding Validation Modes

The RTO Calculator supports two validation modes. You can switch between them in Settings.

#### **Strict Mode** (Week-by-Week)

**How it works:**
- Each week is checked individually
- Every week must meet the 3-day minimum
- Fails immediately on the first violating week

**Use this mode if:**
- Your policy requires 3 office days every single week
- No flexibility for averaging across weeks
- You need to identify specific problem weeks

**Example:**
```
Week 1: 3 office days ✓
Week 2: 2 office days ✗ (FAILS - not enough)
Week 3: 4 office days ✓
Result: VIOLATION on Week 2
```

#### **Average Window Mode** (Rolling 12-Week Average)

**How it works:**
- Looks at 12-week rolling windows
- Takes the best 8 weeks from each window
- Average of those 8 weeks must be ≥ 60% (3/5 days)
- Allows flexibility across weeks

**Use this mode if:**
- Your policy allows averaging over time
- Occasional low weeks are acceptable if balanced by high weeks
- You have flexibility in scheduling

**Example:**
```
Best 8 weeks in a 12-week window:
Weeks 1-4: 3 office days each (60%)
Week 5: 1 office day (20%)
Weeks 6-8: 5 office days each (100%)

Average: (3+3+3+3+1+5+5+5) / 8 = 3.5 days = 70%
Result: ✓ COMPLIANT (meets 60% threshold)
```

### Switching Validation Modes

1. Click **Settings**
2. Find **"Validation Mode"** dropdown
3. Select **"Strict"** or **"Average window"**
4. Click **Save**
5. Run validation again to see results under the new mode

---

## Understanding Results

### Status Icons (Week Column)

Each week row shows a status icon:

- **✓ Green checkmark** - Week is compliant
- **✗ Red X** - Week has a violation (needs attention)
- **⏳ Hourglass** - Week is in an invalid window (needs improvement)
- **(empty)** - Week is not being evaluated

**What the icons mean:**

**Strict Mode:**
- ✓ = Week has ≥ 3 office days
- ✗ = Week has < 3 office days
- (empty) = Week not in evaluation window

**Average Window Mode:**
- ✓ = Week meets minimum AND overall window is valid
- ✗ = Week is the lowest-attendance week in invalid window
- ⏳ = Week is in invalid window but not the lowest
- (empty) = Week not in current 12-week evaluation window

### Validation Messages

**Strict Mode Results:**
```
✗ RTO Violation: Week starting Sun Jan 07 has only 2 office days, required: 3
```
**Action**: Add at least 1 more office day to that specific week.

**Average Window Mode Results:**
```
✓ RTO Compliant: Top 8 weeks average 3.6 office days (72%) of 5 weekdays.
Required: 3 days (60%)
```
**No action needed** - You're meeting the requirement.

```
✗ RTO Violation: Top 8 weeks average 2.8 office days (56%) of 5 weekdays.
Required: 3 days (60%)
```
**Action**: Add more office days across multiple weeks to improve the average.

### No Selections Message

```
ℹ️ No selections to validate
```
**Action**: Mark at least one day as out-of-office, then run validation.

---

## Clearing Data

### Clear All Button

**Location**: Top and bottom of the page

**What it does:**
- Removes **all** work-from-home selections
- Clears all weeks at once
- Does not remove holidays (use Settings to disable holidays)

**When to use:**
- Starting fresh
- Testing different scenarios
- Resetting after trying a pattern

### Clear Month Buttons

**Location**: Below each month's calendar

**What it does:**
- Clears only that specific month
- Other months remain unchanged
- Screen reader announces how many days were cleared

**When to use:**
- Fixing mistakes in a single month
- Changing plans for one month only

### Clear All + Refresh = Clean Slate

If data saving is enabled and you want a completely clean start:
1. Click **Clear All**
2. Refresh the browser
3. localStorage will be empty

---

## Keyboard Shortcuts

Press **?** or click the **?** button in the header to see all shortcuts.

| Key | Action |
|-----|--------|
| `1` | WFH painting mode |
| `2` | Holiday painting mode |
| `3` | Sick painting mode |
| `Ctrl+Z` / `Cmd+Z` | Undo |
| `Ctrl+S` / `Cmd+S` | Validate |
| `Arrow Keys` | Navigate calendar months |
| `Space` / `Enter` | Toggle focused day |
| `Escape` | Cancel drag / close modal |
| `?` | Open shortcuts help |

### Undo/Redo

The RTO Calculator includes undo/redo functionality:

**Shortcuts:**
- **Ctrl+Z** (Windows/Linux) or **Cmd+Z** (Mac) - Undo last action
- **Ctrl+Y** or **Ctrl+Shift+Z** - Redo undone action

**What can be undone:**
- Day selections
- Pattern applications
- Clear operations
- Bulk selections

**History Limit**: Up to 10 previous states are saved

---

## Tips & Best Practices

### Planning Your Schedule

1. **Enable holidays first** - This gives you accurate effective weekdays
2. **Pick a validation mode** - Choose based on your company's policy
3. **Mark known out-of-office days** - Vacations, appointments, etc.
4. **Run validation** - See which weeks need adjustment
5. **Adjust as needed** - Add office days to problem weeks

### Common Scenarios

**Scenario 1: Week with a holiday**
```
Monday is a holiday
You're working from home Thursday
Total weekdays: 5
Holidays: 1 (Monday)
WFH: 1 (Thursday)
Office days: 5 - 1 - 1 = 3 days ✓ Compliant
```

**Scenario 2: Vacation week**
```
Taking Monday-Friday off
Total weekdays: 5
WFH: 5
Office days: 0 days ✗ Violation
Solution: In Average mode, balance with high-office weeks
```

**Scenario 3: Flexible schedule**
```
Using Average Window mode
Some weeks: 2 office days
Some weeks: 5 office days
As long as best 8 weeks average ≥ 3 days: ✓ Compliant
```

### Validation Tips

**Strict Mode:**
- Cannot have any week below 3 office days
- Plan every week carefully
- Less flexibility but clearer requirements

**Average Window Mode:**
- Can have occasional low weeks
- Balance low weeks with high weeks
- More flexibility for vacation planning
- Monitor the 12-week rolling average

---

## Common Issues & Solutions

### Issue: "No selections to validate"

**Cause:** No days marked as work-from-home

**Solution:** Mark at least one day, then click **Validate**

---

### Issue: Validation shows violation even though I see enough office days

**Cause 1:** Week has a holiday that reduces effective weekdays

**Solution:** Check if holiday markers are present. Count: `Office days = Weekdays - Holidays - WFH days`

**Cause 2:** Using Average Window mode and overall window is below 60%

**Solution:** Add more office days across multiple weeks to improve the average

---

### Issue: Can't see holidays after selecting a country

**Cause:** Country doesn't have holidays in the calendar years shown

**Solution:**
- Try a different country to test the feature
- Check if the API is accessible (network issues)
- Refresh the page and try again

---

### Issue: Selections not saving between visits

**Cause:** Data saving is disabled

**Solution:**
1. Go to Settings
2. Enable "Data saving" toggle
3. Save settings
4. Your selections will now persist

---

### Issue: Too many weeks showing violations

**Cause:** Using Strict mode which requires every week to meet minimum

**Solution:**
- Switch to Average Window mode for more flexibility
- Or add more office days to each violating week

---

## Privacy & Data

### What Data is Stored?

When data saving is **enabled**:
- Selected work-from-home days
- Country/company selection for holidays
- Validation mode preference
- Settings preferences

### Where is Data Stored?

All data is stored **locally in your browser's localStorage**:
- No data sent to servers
- No account required
- Data stays on your device
- Clearing browser data removes all selections

### Disabling Data Saving

1. Click **Settings**
2. Turn **OFF** "Enable data saving"
3. Save
4. Future selections won't be saved

**Note**: Disabling data saving doesn't delete existing saved data. To fully clear:
1. Disable data saving
2. Click **Clear All**
3. Refresh the page

---

## Accessibility Features

### Screen Reader Support

- All calendar days have descriptive aria-labels
- Status icons are announced with meaningful text
- Week status changes are announced
- Keyboard navigation fully supported

### High Contrast Mode

- Status icons designed for visibility
- Color-blind friendly indicators (icons, not just colors)
- Clear visual distinction between states

### Keyboard-Only Navigation

Complete functionality available via keyboard:
- Navigate calendar with arrow keys
- Toggle selections with Space/Enter
- Move between sections with Tab
- Undo/redo with Ctrl+Z/Ctrl+Y

---

## Getting Help

**For technical issues:**
- Check browser console for errors (F12)
- Try refreshing the page
- Clear browser cache
- Try a different browser

**For policy questions:**
- Consult your company's RTO policy documentation
- Ask your manager or HR for clarification
- This calculator is a tool - your policy is the authority

---

## Summary

**Quick Steps:**
1. Enable holidays (Settings → Country)
2. Choose validation mode (Strict or Average)
3. Mark work-from-home days
4. Click **Validate**
5. Adjust schedule based on results

**Key Features:**
- ✓ 200+ countries for holidays
- ✓ Two validation modes (Strict & Average)
- ✓ Keyboard shortcuts and accessibility
- ✓ Undo/redo support
- ✓ Privacy-focused (local storage only)
- ✓ Company-specific holiday filtering

**Need More Info?**
- **Developers**: See [DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md)
- **Architecture**: See [ARCHITECTURE.md](./ARCHITECTURE.md)

---

*Last Updated: February 2026*
