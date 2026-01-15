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

// Configuration
const CONFIG = {
  MIN_OFFICE_DAYS_PER_WEEK: 3,
  TOTAL_WEEKDAYS_PER_WEEK: 5,
  ROLLING_PERIOD_WEEKS: 12,
  THRESHOLD_PERCENTAGE: 0.6, // 3/5 = 60%
  DEBUG: true, // Debug mode enabled
};

// State
/** @type {number | null} */
let validationTimeout = null;

/**
 * Get the Monday (start) of the week for a given date
 * @param {Date} date - The reference date
 * @returns {Date} Monday of that week
 */
function getStartOfWeek(date) {
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
 * Get all work-from-home dates from the DOM
 * @returns {Array<Date>} Array of work-from-home dates
 */
function getWorkFromHomeDates() {
  const wfhCells = document.querySelectorAll(
    ".calendar-day.selected.work-from-home[data-year][data-month][data-day]",
  );
  /** @type {Array<Date>} */
  const wfhDates = [];

  wfhCells.forEach((cell) => {
    const cellElement = /** @type {HTMLElement} */ (cell);
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
 * @returns {Date|null} Monday of current week, or null if no calendar found
 */
function getCurrentWeekStart() {
  // Find any calendar cell to determine current week
  const calendarCells = document.querySelectorAll(
    ".calendar-day[data-year][data-month][data-day]:not(.empty)",
  );

  if (calendarCells.length === 0) {
    return null;
  }

  const firstCell = /** @type {HTMLElement} */ (calendarCells[0]);
  const year = parseInt(firstCell.dataset.year || "0");
  const month = parseInt(firstCell.dataset.month || "0");
  const day = parseInt(firstCell.dataset.day || "0");

  return getStartOfWeek(new Date(year, month, day));
}

/**
 * Group work-from-home dates by week
 * @param {Array<Date>} wfhDates - Work-from-home dates
 * @returns {Map<number, number>} Map of week start timestamp to WFH day count
 */
function groupDatesByWeek(wfhDates) {
  const weeksMap = new Map();

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
 * @param {Date} weekStart - Monday of the week
 * @param {Map<number, number>} weeksByWFH - Map of weeks with WFH counts
 * @returns {{weekStart: Date, officeDays: number, wfhDays: number, totalDays: number, isCompliant: boolean, percentage: number}} Week compliance data
 */
function calculateWeekCompliance(weekStart, weeksByWFH) {
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
 * @param {Date} weekStart - Monday of the week
 * @returns {Array<Date>} Weekday dates for the week
 */
function getWeekDates(weekStart) {
  const dates = [];
  for (let i = 0; i < 5; i++) {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    dates.push(d);
  }
  return dates;
}

/**
 * Get the week number for a date within the rolling period
 * @param {Date} weekStart - Monday of the week
 * @returns {number} Week number (0-11 for rolling period)
 */
function getRollingWeekNumber(weekStart) {
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
 * @returns {{isValid: boolean, message: string, weeksData: Array<{weekStart: Date, officeDays: number, wfhDays: number, totalDays: number, isCompliant: boolean, percentage: number}>, overallCompliance: number, currentWeekNumber: number}} Overall compliance data
 */
function calculateRollingCompliance() {
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
  /** @type {Array<{weekStart: Date, officeDays: number, wfhDays: number, totalDays: number, isCompliant: boolean, percentage: number}>} */
  const weeksData = [];
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
function updateComplianceIndicator(result) {
  // If no result provided, fall back to old calculation
  if (!result) {
    result = calculateRollingCompliance();
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
function highlightCurrentWeek() {
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
 * @param {Date} weekStart - Monday of week being evaluated
 * @param {boolean} isEvaluating - Whether this week is currently being evaluated
 */
function updateWeekStatusIcon(weekStart, isEvaluating = true) {
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
    statusIcon.textContent = "⏳";
    statusIcon.classList.add("evaluating");
    statusIcon.classList.remove("violation");
    if (CONFIG.DEBUG) {
      console.log(`[updateWeekStatusIcon] Set ⏳ icon for week ${weekKey}`);
    }
  } else {
    statusIcon.textContent = "";
    statusIcon.classList.remove("evaluating", "violation");
    if (CONFIG.DEBUG) {
      console.log(`[updateWeekStatusIcon] Cleared icon for week ${weekKey}`);
    }
  }
}

/**
 * Set week status to violation (red X)
 * @param {Date} weekStart - Monday of the week
 */
function setWeekStatusViolation(weekStart) {
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
      statusIcon.textContent = "✗";
      statusIcon.classList.remove("evaluating");
      statusIcon.classList.add("violation");
      if (CONFIG.DEBUG) {
        console.log(`[setWeekStatusViolation] Set ✗ icon for week ${weekKey}`);
      }
    }
  }
}

/**
 * Clear all week status icons
 */
function clearWeekStatusIcons() {
  document
    .querySelectorAll(
      ".week-status-icon.evaluating, .week-status-icon.violation",
    )
    .forEach((icon) => {
      icon.textContent = "";
      icon.classList.remove("evaluating", "violation");
    });
}

/**
 * Dim weekends in the calendar
 */
function dimWeekends() {
  const allCells = document.querySelectorAll(".calendar-day[data-day]");

  allCells.forEach((cell) => {
    const cellElement = /** @type {HTMLElement} */ (cell);
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
 * @param {string} message - The message to announce
 */
function announceToScreenReader(message) {
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
 * Run full validation when triggered by user
 */
function runValidation() {
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
function runValidationWithHighlights() {
  const currentWeekStart = getCurrentWeekStart();
  if (!currentWeekStart) {
    updateComplianceIndicator();
    return;
  }

  const wfhDates = getWorkFromHomeDates();
  const weeksByWFH = groupDatesByWeek(wfhDates);

  let violationFound = false;
  let violatingWindowStart = null;

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

  for (
    let weekIndex = resultWindowStart;
    weekIndex < resultWindowStart + 12;
    weekIndex++
  ) {
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
 * @param {Map<number, number>} weeksByWFH - Map of weeks with WFH counts
 * @param {Date} currentWeekStart - Monday of current week
 * @param {number} windowStart - Starting week index (0-12)
 * @returns {boolean} Whether the window is compliant
 */
function check12WeekCompliance(weeksByWFH, currentWeekStart, windowStart) {
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
 * @param {Date} currentWeekStart - Monday of current week
 * @param {number} windowStart - Starting week index of violation
 */
function mark12WeekViolation(currentWeekStart, windowStart) {
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
function clearAllValidationHighlights() {
  clearWeekStatusIcons();

  // Clear all day selections
  const selectedCells = document.querySelectorAll(".calendar-day.selected");
  selectedCells.forEach((cell) => {
    const cellElement = cell;
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
function initRTOValidation() {
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
function cleanupRTOValidation() {
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
/** @type {any} */
const globalWindow = window;
globalWindow.RTOValidation = {
  calculateRollingCompliance,
  updateComplianceIndicator,
  highlightCurrentWeek,
  runValidation,
  runValidationWithHighlights,
  clearAllValidationHighlights,
  cleanupRTOValidation,
};
