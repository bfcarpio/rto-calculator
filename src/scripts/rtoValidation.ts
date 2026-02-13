// @ts-check
/**
 * RTO Validation Client-Side Script
 *
 * Validates that weeks meet the RTO policy requirement of 3+ office days per week.
 * This uses a rolling 12-week validation starting from the current week.
 *
 * Validation Logic:
 * - Office days = Weekdays (Mon-Fri) that are NOT marked as work-from-home
 * - Work-from-home days reduce the office day count
 * - Week is compliant if office days >= 3 (60%)
 */

// Define ComplianceResult locally since it's not exported from the type file
interface ComplianceResult {
  isValid: boolean;
  message: string;
  overallCompliance: number;
}

// Configuration
const CONFIG = {
  MIN_OFFICE_DAYS_PER_WEEK: 3,
  TOTAL_WEEKDAYS_PER_WEEK: 5,
  ROLLING_PERIOD_WEEKS: 12,
  THRESHOLD_PERCENTAGE: 0.6, // 3/5 = 60%
  DEBUG: false, // Debug mode disabled
} as const;

// State
let validationTimeout: number | null = null;

/**
 * Get the Monday (start) of the week for a given date
 * @param date - The reference date
 * @returns Monday of that week
 */
function getStartOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  // Sunday (0) -> same day (start of calendar week)
  // Monday (1) -> go back 1 day
  // Tuesday (2) -> go back 2 days
  // etc.
  const daysToSubtract = day;
  d.setDate(d.getDate() - daysToSubtract);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Get work-from-home dates from DOM
 * @returns Array of date objects
 */
function getWorkFromHomeDates(): Date[] {
  const wfhCells = document.querySelectorAll(
    ".calendar-day.selected.work-from-home[data-year][data-month][data-day]",
  );
  const wfhDates: Date[] = [];

  wfhCells.forEach((cell) => {
    const cellElement = cell as HTMLElement;
    const year = parseInt(cellElement.dataset.year || "0");
    const month = parseInt(cellElement.dataset.month || "0");
    const day = parseInt(cellElement.dataset.day || "0");
    const date = new Date(year, month, day);
    wfhDates.push(date);
  });

  if (CONFIG.DEBUG) {
    console.log(
      `[RTO Validation] Found ${wfhDates.length} work-from-home dates`,
    );
  }

  return wfhDates;
}

/**
 * Get the Monday of the current week
 * @returns Monday of current week, or null if no calendar found
 */
function getCurrentWeekStart(): Date | null {
  // Find any calendar cell to determine current week
  const calendarCells = document.querySelectorAll(
    ".calendar-day[data-year][data-month][data-day]:not(.empty)",
  );

  if (calendarCells.length === 0) {
    return null;
  }

  const firstCell = calendarCells[0] as HTMLElement;
  const year = parseInt(firstCell.dataset.year || "0");
  const month = parseInt(firstCell.dataset.month || "0");
  const day = parseInt(firstCell.dataset.day || "0");

  return getStartOfWeek(new Date(year, month, day));
}

/**
 * Group work-from-home dates by week
 * @param wfhDates - Work-from-home dates
 * @returns Map of week start timestamp to WFH day count
 */
function groupDatesByWeek(wfhDates: Date[]): Map<number, number> {
  const weeksMap = new Map<number, number>();

  wfhDates.forEach((date) => {
    const weekStart = getStartOfWeek(date);
    const weekKey = weekStart.getTime();
    weeksMap.set(weekKey, (weeksMap.get(weekKey) || 0) + 1);
  });

  if (CONFIG.DEBUG) {
    console.log(`[RTO Validation] Grouped dates into ${weeksMap.size} weeks`);
  }

  return weeksMap;
}

/**
 * Calculate compliance for a specific week
 */
interface WeekCompliance {
  weekStart: Date;
  officeDays: number;
  wfhDays: number;
  totalDays: number;
  isCompliant: boolean;
  percentage: number;
}

function calculateWeekCompliance(
  weekStart: Date,
  weeksByWFH: Map<number, number>,
): WeekCompliance {
  const weekKey = weekStart.getTime();
  const wfhDays = weeksByWFH.get(weekKey) || 0;
  const officeDays = CONFIG.TOTAL_WEEKDAYS_PER_WEEK - wfhDays;
  const isCompliant = officeDays >= CONFIG.MIN_OFFICE_DAYS_PER_WEEK;
  const percentage = (officeDays / CONFIG.TOTAL_WEEKDAYS_PER_WEEK) * 100;

  return {
    weekStart: new Date(weekStart),
    officeDays,
    wfhDays,
    totalDays: CONFIG.TOTAL_WEEKDAYS_PER_WEEK,
    isCompliant,
    percentage,
  };
}

/**
 * Get all days in a week (Monday-Friday)
 * @param weekStart - Monday of the week
 * @returns Weekday dates for the week
 */
function getWeekDates(weekStart: Date): Date[] {
  const dates: Date[] = [];
  for (let i = 0; i < 5; i++) {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    dates.push(d);
  }
  return dates;
}

/**
 * Get the week number for a date within the rolling period
 * @param weekStart - Monday of the week
 * @returns Week number (0-11 for rolling period)
 */
function getRollingWeekNumber(weekStart: Date): number {
  const currentWeekStart = getCurrentWeekStart();
  if (!currentWeekStart) return 0;

  const weekDiff = Math.round(
    (weekStart.getTime() - currentWeekStart.getTime()) /
      (7 * 24 * 60 * 60 * 1000),
  );

  // Normalize to 0-11 range
  return Math.max(0, Math.min(weekDiff, 11));
}

/**
 * Calculate rolling 12-week compliance
 */
interface RollingComplianceResult {
  isValid: boolean;
  message: string;
  weeksData: WeekCompliance[];
  overallCompliance: number;
  currentWeekNumber: number;
}

function calculateRollingCompliance(): RollingComplianceResult {
  const wfhDates = getWorkFromHomeDates();
  const weeksByWFH = groupDatesByWeek(wfhDates);
  const currentWeekStart = getCurrentWeekStart();

  if (!currentWeekStart) {
    return {
      isValid: true,
      message: "No calendar data available",
      weeksData: [],
      overallCompliance: 100,
      currentWeekNumber: 0,
    };
  }

  // Get data for rolling 12-week period
  const weeksData: WeekCompliance[] = [];
  for (let week = 0; week < CONFIG.ROLLING_PERIOD_WEEKS; week++) {
    const weekStart = new Date(currentWeekStart);
    weekStart.setDate(currentWeekStart.getDate() + week * 7);
    const weekData = calculateWeekCompliance(weekStart, weeksByWFH);
    weeksData.push(weekData);
  }

  // Calculate overall compliance
  const totalOfficeDays = weeksData.reduce(
    (sum, week) => sum + week.officeDays,
    0,
  );
  const totalWeekdays = weeksData.reduce(
    (sum, week) => sum + week.totalDays,
    0,
  );
  const overallCompliance =
    totalWeekdays > 0 ? (totalOfficeDays / totalWeekdays) * 100 : 100;
  const isValid = overallCompliance >= CONFIG.THRESHOLD_PERCENTAGE * 100;

  // Generate message
  const avgOfficeDays = totalOfficeDays / CONFIG.ROLLING_PERIOD_WEEKS;
  const avgPercentage = overallCompliance;
  const requiredPercentage = CONFIG.THRESHOLD_PERCENTAGE * 100;

  const message = isValid
    ? `✓ RTO Compliant: ${avgOfficeDays.toFixed(1)} avg office days (${avgPercentage.toFixed(0)}%) of 5 weekdays. Required: ${CONFIG.MIN_OFFICE_DAYS_PER_WEEK} days (${requiredPercentage.toFixed(0)}%)`
    : `✗ RTO Violation: ${avgOfficeDays.toFixed(1)} avg office days (${avgPercentage.toFixed(0)}%) of 5 weekdays. Required: ${CONFIG.MIN_OFFICE_DAYS_PER_WEEK} days (${requiredPercentage.toFixed(0)}%)`;

  if (CONFIG.DEBUG) {
    console.log("[RTO Validation] Weeks Data:", weeksData);
    console.log("[RTO Validation] Overall Compliance:", {
      totalOfficeDays,
      totalWeekdays,
      avgOfficeDays,
      avgPercentage,
      requiredPercentage,
      isValid,
    });
  }

  return {
    isValid,
    message,
    weeksData,
    overallCompliance,
    currentWeekNumber: getRollingWeekNumber(currentWeekStart),
  };
}

/**
 * Update the compliance indicator in the UI
 */
function updateComplianceIndicator(result?: ComplianceResult): void {
  // If no result provided, fall back to old calculation
  if (!result) {
    const rollingResult = calculateRollingCompliance();
    result = {
      isValid: rollingResult.isValid,
      message: rollingResult.message,
      overallCompliance: rollingResult.overallCompliance,
    };
  }

  const indicator = document.getElementById("compliance-indicator");
  const icon = document.getElementById("compliance-icon");
  const text = document.getElementById("compliance-text");
  const validationMessage = document.getElementById("validation-message");

  if (!indicator || !icon || !text) return;

  // Remove all status classes
  indicator.classList.remove("compliant", "violation", "warning");

  if (result.isValid) {
    indicator.classList.add("compliant");
    icon.textContent = "✓";
    text.textContent = `${result.overallCompliance.toFixed(0)}% Compliant`;
  } else {
    indicator.classList.add("violation");
    icon.textContent = "✗";
    text.textContent = `${result.overallCompliance.toFixed(0)}% Compliant`;
  }

  // Update detailed validation message
  if (validationMessage) {
    validationMessage.textContent = result.message;
    validationMessage.style.display = "flex";
    validationMessage.className = `validation-message centered-message ${result.isValid ? "success" : "error"}`;
  }

  // Announce to screen readers
  announceToScreenReader(result.message);
}

/**
 * Highlight the current week being evaluated
 */
function highlightCurrentWeek(): void {
  const currentWeekStart = getCurrentWeekStart();
  if (!currentWeekStart) return;

  const weekDates = getWeekDates(currentWeekStart);

  // Clear previous highlights
  document.querySelectorAll(".calendar-day.current-week").forEach((cell) => {
    cell.classList.remove("current-week");
  });

  // Highlight current week
  weekDates.forEach((date) => {
    const dayCells = document.querySelectorAll(
      `.calendar-day[data-year="${date.getFullYear()}"][data-month="${date.getMonth()}"][data-day="${date.getDate()}"]`,
    );
    dayCells.forEach((cell) => {
      cell.classList.add("current-week");
    });
  });
}

/**
 * Update week status icon during evaluation
 */
function updateWeekStatusIcon(
  weekStart: Date,
  isEvaluating: boolean = true,
): void {
  const weekKey = weekStart.getTime().toString();
  const statusCell = document.querySelector(`[data-week-start="${weekKey}"]`);

  if (CONFIG.DEBUG) {
    console.log(
      `[updateWeekStatusIcon] Looking for cell with data-week-start="${weekKey}"`,
    );
    console.log(`[updateWeekStatusIcon] Status cell found:`, statusCell);
  }

  if (!statusCell) return;

  const statusIcon = statusCell.querySelector(".week-status-icon");
  if (!statusIcon) return;

  if (isEvaluating) {
    (statusIcon as HTMLElement).textContent = "⏳";
    statusIcon.classList.add("evaluating");
    statusIcon.classList.remove("violation");
    if (CONFIG.DEBUG) {
      console.log(`[updateWeekStatusIcon] Set ⏳ icon for week ${weekKey}`);
    }
  } else {
    (statusIcon as HTMLElement).textContent = "";
    statusIcon.classList.remove("evaluating", "violation");
  }
}

/**
 * Set week status to violation (red X)
 * @param weekStart - Sunday of the week
 */
function setWeekStatusViolation(weekStart: Date): void {
  const weekKey = weekStart.getTime().toString();
  const statusCell = document.querySelector(`[data-week-start="${weekKey}"]`);

  if (CONFIG.DEBUG) {
    console.log(
      `[setWeekStatusViolation] Looking for cell with data-week-start="${weekKey}"`,
    );
    console.log(`[setWeekStatusViolation] Status cell found:`, statusCell);
  }

  if (statusCell) {
    const statusIcon = statusCell.querySelector(".week-status-icon");
    if (statusIcon) {
      (statusIcon as HTMLElement).textContent = "✗";
      statusIcon.classList.remove("evaluating");
      statusIcon.classList.add("violation");
      if (CONFIG.DEBUG) {
        console.log(`[setWeekStatusViolation] Set ✗ icon for week ${weekKey}`);
      }
    }
  }
}

/**
 * Set week status to least attended (grey square)
 * @param weekStart - Sunday of the week
 */
function setWeekStatusLeastAttended(weekStart: Date): void {
  const weekKey = weekStart.getTime().toString();
  const statusCell = document.querySelector(`[data-week-start="${weekKey}"]`);

  if (CONFIG.DEBUG) {
    console.log(
      `[setWeekStatusLeastAttended] Looking for cell with data-week-start="${weekKey}"`,
    );
    console.log(`[setWeekStatusLeastAttended] Status cell found:`, statusCell);
  }

  if (statusCell) {
    const statusIcon = statusCell.querySelector(".week-status-icon");
    if (statusIcon) {
      (statusIcon as HTMLElement).textContent = "⬜";
      statusIcon.classList.remove("evaluating", "violation");
      statusIcon.classList.add("least-attended");
      if (CONFIG.DEBUG) {
        console.log(
          `[setWeekStatusLeastAttended] Set ⬜ icon for week ${weekKey}`,
        );
      }
    }
  }
}

/**
 * Identify and mark the 4 least attended weeks
 * @param weeksByWFH - Map of week start timestamp to WFH count
 * @param _currentWeekStart - Current week start date (unused)
 */
function markLeastAttendedWeeks(
  weeksByWFH: Map<number, number>,
  _currentWeekStart: Date,
): void {
  if (CONFIG.DEBUG) {
    console.log("[markLeastAttendedWeeks] Identifying 4 least attended weeks");
  }

  const weekInfo: Array<{ weekKey: number; wfhCount: number; weekDate: Date }> =
    [];

  // Sort by WFH count (ascending) to find least attended
  weeksByWFH.forEach((wfhCount: number, weekKey: number) => {
    weekInfo.push({
      weekKey,
      wfhCount,
      weekDate: new Date(weekKey),
    });
  });

  weekInfo.sort((a, b) => a.wfhCount - b.wfhCount);

  // Get the 4 weeks with fewest WFH days
  const leastAttendedWeeks = weekInfo.slice(0, 4);

  if (CONFIG.DEBUG) {
    console.log(
      `[markLeastAttendedWeeks] Least attended weeks:`,
      leastAttendedWeeks.map((w) => ({
        week: w.weekDate.toDateString(),
        wfhCount: w.wfhCount,
      })),
    );
  }

  // Mark each least attended week with grey square emoji
  leastAttendedWeeks.forEach((week) => {
    setWeekStatusLeastAttended(week.weekDate);
  });
}

/**
 * Clear all week status icons
 */
function clearWeekStatusIcons(): void {
  document
    .querySelectorAll(
      ".week-status-icon.evaluating, .week-status-icon.violation, .week-status-icon.least-attended",
    )
    .forEach((icon) => {
      (icon as HTMLElement).textContent = "";
      icon.classList.remove("evaluating", "violation", "least-attended");
    });
}

/**
 * Dim weekends in the calendar
 */
function dimWeekends(): void {
  const allCells = document.querySelectorAll(".calendar-day[data-day]");

  allCells.forEach((cell) => {
    const cellElement = cell as HTMLElement;
    const year = parseInt(cellElement.dataset.year || "0");
    const month = parseInt(cellElement.dataset.month || "0");
    const day = parseInt(cellElement.dataset.day || "0");
    const date = new Date(year, month, day);
    const dayOfWeek = date.getDay();

    // Saturday (6) or Sunday (0)
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      cellElement.classList.add("weekend");
    } else {
      cellElement.classList.remove("weekend");
    }
  });
}

/**
 * Announce a message to screen readers
 * @param message - The message to announce
 */
function announceToScreenReader(message: string): void {
  const announcement = document.createElement("div");
  announcement.setAttribute("role", "status");
  announcement.setAttribute("aria-live", "polite");
  announcement.setAttribute("aria-atomic", "true");
  announcement.className = "sr-only calendar-announcement";
  announcement.textContent = message;
  document.body.appendChild(announcement);

  setTimeout(() => {
    document.body.removeChild(announcement);
  }, 1000);
}

/**
 * Run validation with status column updates
 */
function runValidation(): void {
  // Highlight current week
  highlightCurrentWeek();

  // Dim weekends
  dimWeekends();

  // Clear all status icons before validation
  clearWeekStatusIcons();

  // Run validation with week highlighting
  runValidationWithHighlights();
}

/**
 * Run validation with chunked week highlighting
 */
function runValidationWithHighlights(): void {
  const currentWeekStart = getCurrentWeekStart();
  if (!currentWeekStart) {
    updateComplianceIndicator();
    return;
  }

  const wfhDates = getWorkFromHomeDates();
  const weeksByWFH = groupDatesByWeek(wfhDates);

  let violationFound = false;
  let violatingWindowStart: number | null = null;

  // Identify and mark 4 least attended weeks (fewest selections)
  markLeastAttendedWeeks(weeksByWFH, currentWeekStart);

  // Calculate total weeks in 12-month calendar (approximately 52 weeks)
  const totalWeeksInCalendar = 52;
  const totalWindows = totalWeeksInCalendar - 12; // 40 windows (0-39)

  // Validate each 12-week window until first violation is found
  for (let windowStart = 0; windowStart <= totalWindows; windowStart++) {
    // Highlight each week in the current window as being evaluated
    for (
      let weekIndex = windowStart;
      weekIndex < windowStart + 12;
      weekIndex++
    ) {
      const weekStart = new Date(currentWeekStart);
      weekStart.setDate(currentWeekStart.getDate() + weekIndex * 7);
      updateWeekStatusIcon(weekStart, true);
    }

    // Check compliance for this window
    const windowValid = check12WeekCompliance(
      weeksByWFH,
      currentWeekStart,
      windowStart,
    );

    if (!windowValid) {
      // Found a violation - mark it and stop
      violationFound = true;
      violatingWindowStart = windowStart;
      mark12WeekViolation(currentWeekStart, windowStart);
      break;
    }

    // Clear evaluation highlights for this window before moving to next
    for (
      let weekIndex = windowStart;
      weekIndex < windowStart + 12;
      weekIndex++
    ) {
      const weekStart = new Date(currentWeekStart);
      weekStart.setDate(currentWeekStart.getDate() + weekIndex * 7);
      updateWeekStatusIcon(weekStart, false);
    }
  }

  // Calculate compliance for the final result
  // If violation found, use that window's data; otherwise use window 0 (first 12 weeks)
  const resultWindowStart = violationFound ? violatingWindowStart : 0;
  let totalOfficeDays = 0;
  let totalWeekdays = 0;

  const windowStart = resultWindowStart ?? 0;

  for (let weekIndex = windowStart; weekIndex < windowStart + 12; weekIndex++) {
    const weekStart = new Date(currentWeekStart);
    weekStart.setDate(currentWeekStart.getDate() + weekIndex * 7);
    const weekKey = weekStart.getTime();
    const wfhDays = weeksByWFH.get(weekKey) || 0;
    const officeDays = CONFIG.TOTAL_WEEKDAYS_PER_WEEK - wfhDays;

    totalOfficeDays += officeDays;
    totalWeekdays += CONFIG.TOTAL_WEEKDAYS_PER_WEEK;
  }

  const overallCompliance =
    totalWeekdays > 0 ? (totalOfficeDays / totalWeekdays) * 100 : 100;
  const isValid = overallCompliance >= CONFIG.THRESHOLD_PERCENTAGE * 100;
  const avgOfficeDays = totalOfficeDays / 12;
  const requiredPercentage = CONFIG.THRESHOLD_PERCENTAGE * 100;

  const message = isValid
    ? `✓ RTO Compliant: ${avgOfficeDays.toFixed(1)} avg office days (${overallCompliance.toFixed(0)}%) of 5 weekdays. Required: ${CONFIG.MIN_OFFICE_DAYS_PER_WEEK} days (${requiredPercentage.toFixed(0)}%)`
    : `✗ RTO Violation: ${avgOfficeDays.toFixed(1)} avg office days (${overallCompliance.toFixed(0)}%) of 5 weekdays. Required: ${CONFIG.MIN_OFFICE_DAYS_PER_WEEK} days (${requiredPercentage.toFixed(0)}%)`;

  // Final compliance update with actual result
  updateComplianceIndicator({
    isValid,
    message,
    overallCompliance,
  });
}

/**
 * Check if a 12-week window is compliant
 * @param weeksByWFH - Map of weeks with WFH counts
 * @param currentWeekStart - Monday of current week
 * @param windowStart - Starting week index (0-12)
 * @returns Whether the window is compliant
 */
function check12WeekCompliance(
  weeksByWFH: Map<number, number>,
  currentWeekStart: Date,
  windowStart: number,
): boolean {
  let totalOfficeDays = 0;
  let totalWeekdays = 0;

  for (let weekIndex = windowStart; weekIndex < windowStart + 12; weekIndex++) {
    const weekStart = new Date(currentWeekStart);
    weekStart.setDate(currentWeekStart.getDate() + weekIndex * 7);
    const weekKey = weekStart.getTime();
    const wfhDays = weeksByWFH.get(weekKey) || 0;
    const officeDays = CONFIG.TOTAL_WEEKDAYS_PER_WEEK - wfhDays;

    totalOfficeDays += officeDays;
    totalWeekdays += CONFIG.TOTAL_WEEKDAYS_PER_WEEK;
  }

  const percentage = totalOfficeDays / totalWeekdays;
  return percentage >= CONFIG.THRESHOLD_PERCENTAGE;
}

/**
 * Mark violating weeks in status column (red X)
 * @param currentWeekStart - Monday of current week
 * @param windowStart - Starting week index of violation
 */
function mark12WeekViolation(
  currentWeekStart: Date,
  windowStart: number,
): void {
  // Mark each week in the violating window with red X
  for (let weekIndex = windowStart; weekIndex < windowStart + 12; weekIndex++) {
    const weekStart = new Date(currentWeekStart);
    weekStart.setDate(currentWeekStart.getDate() + weekIndex * 7);
    setWeekStatusViolation(weekStart);
  }
}

/**
 * Clear all validation highlights, status icons, and day selections
 */
function clearAllValidationHighlights(): void {
  clearWeekStatusIcons();

  // Clear all day selections
  const selectedCells = document.querySelectorAll(".calendar-day.selected");
  selectedCells.forEach((cell) => {
    const cellElement = cell as HTMLElement;
    cellElement.dataset.selected = "false";
    cellElement.dataset.selectionType = "";
    cellElement.classList.remove("selected", "work-from-home", "office");
    cellElement.ariaSelected = "false";

    // Update aria-label to reflect unselected state
    const currentLabel = cellElement.ariaLabel;
    if (currentLabel) {
      cellElement.ariaLabel = currentLabel.replace(/\. .*$/, ". Unselected");
    }
  });
}

/**
 * Initialize RTO validation
 */
function initRTOValidation(): void {
  // Highlight current week
  highlightCurrentWeek();

  // Dim weekends
  dimWeekends();

  // Note: Validate and Clear All button handlers are now in index.astro
  // to support both top and bottom button sets

  // Set up MutationObserver to clear status icons on selection changes
  const calendarContainer = document.querySelector(".calendar-container");
  if (calendarContainer) {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (
          mutation.type === "attributes" &&
          mutation.attributeName === "data-selected"
        ) {
          // Clear status icons only when a selection changes (highlights remain)
          clearWeekStatusIcons();
        }
      });
    });

    // Observe all calendar day cells for data-selected changes
    const dayCells = document.querySelectorAll(".calendar-day");
    dayCells.forEach((cell) => {
      observer.observe(cell, {
        attributes: true,
        attributeFilter: ["data-selected"],
      });
    });

    if (CONFIG.DEBUG) {
      console.log("[RTO Validation] MutationObserver initialized");
    }
  }

  if (CONFIG.DEBUG) {
    console.log("[RTO Validation] Initialized");
  }
}

/**
 * Clean up RTO validation resources
 */
export function cleanupRTOValidation(): void {
  if (validationTimeout) {
    clearTimeout(validationTimeout);
  }

  if (CONFIG.DEBUG) {
    console.log("[RTO Validation] Cleaned up");
  }
}

// Initialize when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initRTOValidation);
} else {
  initRTOValidation();
}

// Export functions for external access if needed
declare global {
  interface Window {
    runValidation: typeof runValidation;
    clearAllValidationHighlights: typeof clearAllValidationHighlights;
  }
}

// Make functions available globally
if (typeof window !== "undefined") {
  window.runValidation = runValidation;
  window.clearAllValidationHighlights = clearAllValidationHighlights;
}
