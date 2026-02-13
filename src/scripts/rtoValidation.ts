/**
 * RTO Validation Module
 *
 * Provides validation functionality for the RTO Calculator with real-time highlighting.
 * Optimized for performance using cell caching and O(n) algorithms.
 */

// ==================== Type Definitions ====================

/**
 * Compliance result from validation
 */
interface ComplianceResult {
  isValid: boolean;
  message: string;
  overallCompliance: number;
}

/**
 * Week information for tracking
 */
interface WeekInfo {
  week: Date;
  weekNumber: number;
  wfhCount: number;
  officeDays: number;
  isCompliant: boolean;
}

// Window compliance information (reserved for future use)
// interface WindowCompliance {
//   windowStart: number;
//   windowEnd: number;
//   officeDays: number;
//   totalWeekdays: number;
//   compliancePercentage: number;
//   isCompliant: boolean;
// }

/**
 * RTO Validation Configuration
 */
interface RTOValidationConfig {
  DEBUG: boolean;
  MIN_OFFICE_DAYS_PER_WEEK: number;
  TOTAL_WEEKDAYS_PER_WEEK: number;
  ROLLING_PERIOD_WEEKS: number;
  THRESHOLD_PERCENTAGE: number;
}

// ==================== Configuration ====================

/**
 * RTO validation configuration
 */
export const CONFIG: RTOValidationConfig = {
  DEBUG: true,
  MIN_OFFICE_DAYS_PER_WEEK: 3,
  TOTAL_WEEKDAYS_PER_WEEK: 5,
  ROLLING_PERIOD_WEEKS: 12,
  THRESHOLD_PERCENTAGE: 0.6, // 3/5 = 60%
};

// ==================== Cache Management ====================

/**
 * Cache for calendar cells to avoid repeated DOM queries
 * Key: `${year}-${month}-${day}`
 * Value: HTMLElement
 */
const cellCache = new Map<string, HTMLElement>();

/**
 * Cache for status cells by week start timestamp
 * Key: week start timestamp
 * Value: HTMLElement status cell
 */
const statusCellCache = new Map<number, HTMLElement>();

/**
 * Flag to track if cache has been initialized
 */
let cacheInitialized = false;

/**
 * Validation timeout for debouncing
 */
let validationTimeout: number | null = null;

/**
 * Current validation result
 */
let currentResult: ComplianceResult | null = null;

// Note: weekDataCache removed to prevent stale data issues

// ==================== Initialization ====================

/**
 * Initialize the cell cache by scanning all calendar cells
 * This is called once to avoid repeated DOM queries
 */
function initializeCellCache(): void {
  if (cacheInitialized) {
    return;
  }

  const startTime = performance.now();
  const cells = document.querySelectorAll(
    ".calendar-day[data-year][data-month][data-day]",
  );

  cells.forEach((cell) => {
    const element = cell as HTMLElement;
    const year = element.dataset.year;
    const month = element.dataset.month;
    const day = element.dataset.day;

    if (year && month && day) {
      const key = `${year}-${month}-${day}`;
      cellCache.set(key, element);
    }
  });

  // Initialize status cell cache
  // Status cells have data-week-start attribute directly on them
  const statusCells = document.querySelectorAll(
    ".week-status-cell[data-week-start]",
  );

  if (CONFIG.DEBUG) {
    console.log(
      `[RTO Validation] Found ${statusCells.length} status cells in DOM`,
    );
  }

  statusCells.forEach((statusCell) => {
    const element = statusCell as HTMLElement;
    const weekStart = element.dataset.weekStart;

    if (CONFIG.DEBUG) {
      console.log(
        `[RTO Validation] Processing status cell with weekStart: ${weekStart}`,
      );
    }

    if (weekStart) {
      const statusContainer = element.querySelector(
        ".week-status-container",
      ) as HTMLElement;

      if (CONFIG.DEBUG) {
        console.log(
          `[RTO Validation] Status container found: ${!!statusContainer}`,
        );
      }

      if (statusContainer) {
        const weekKey = parseInt(weekStart);
        statusCellCache.set(weekKey, statusContainer);

        if (CONFIG.DEBUG) {
          console.log(
            `[RTO Validation] Cached status cell with key: ${weekKey}`,
          );
        }
      }
    }
  });

  cacheInitialized = true;

  const endTime = performance.now();
  console.log(
    `[RTO Validation] Cache initialized in ${(endTime - startTime).toFixed(2)}ms`,
  );
  console.log(
    `[RTO Validation] Cached ${cellCache.size} cells and ${statusCellCache.size} status cells`,
  );

  if (CONFIG.DEBUG) {
    console.log(
      "[RTO Validation] Status cell cache keys:",
      Array.from(statusCellCache.keys()).slice(0, 10),
    );
  }
}

/**
 * Clear all caches
 */
function clearCaches(): void {
  cellCache.clear();
  statusCellCache.clear();
  cacheInitialized = false;
  currentResult = null;
}

// ==================== DOM Helper Functions ====================

/**
 * Get the Monday start date for a given date
 * @param date - Reference date
 * @returns Monday of that week
 */
function getMondayOfWeek(date: Date): Date {
  const d = new Date(date.getTime());
  const day = d.getDay();
  const daysToSubtract = day === 0 ? 6 : day - 1;
  d.setDate(d.getDate() - daysToSubtract);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Get the first Monday on or after a given date
 * @param date - Reference date
 * @returns First Monday on or after the date
 */
function getFirstMondayOnOrAfter(date: Date): Date {
  const d = new Date(date.getTime());
  const day = d.getDay();
  const daysToAdd = day === 0 ? 1 : day === 1 ? 0 : 8 - day;
  d.setDate(d.getDate() + daysToAdd);
  d.setHours(0, 0, 0, 0);
  return d;
}

// ==================== Data Collection Functions ====================

/**
 * Get all selected work-from-home days from DOM
 * Optimized to use cache instead of DOM queries
 * @returns Array of selected day objects
 */
function getSelectedWFHDays(): Array<{
  year: number;
  month: number;
  day: number;
}> {
  if (!cacheInitialized) {
    initializeCellCache();
  }

  const selectedDays: Array<{ year: number; month: number; day: number }> = [];

  if (CONFIG.DEBUG) {
    console.log("[RTO Validation] Scanning cache for WFH selections...");
    console.log("[RTO Validation] Total cells in cache:", cellCache.size);
  }

  let selectedCount = 0;
  cellCache.forEach((cell) => {
    const isSelected = cell.classList.contains("selected");
    const isWFH = cell.dataset.selectionType === "work-from-home";

    if (CONFIG.DEBUG && isSelected) {
      selectedCount++;
      console.log(
        `[RTO Validation] Selected cell: ${cell.dataset.year}-${cell.dataset.month}-${cell.dataset.day}, selectionType: ${cell.dataset.selectionType}`,
      );
    }

    if (isSelected && isWFH) {
      const year = parseInt(cell.dataset.year || "0");
      const month = parseInt(cell.dataset.month || "0");
      const day = parseInt(cell.dataset.day || "0");
      selectedDays.push({ year, month, day });
    }
  });

  if (CONFIG.DEBUG) {
    console.log(`[RTO Validation] Total selected cells: ${selectedCount}`);
    console.log(
      `[RTO Validation] WFH selections found: ${selectedDays.length}`,
    );
  }

  return selectedDays;
}

/**
 * Group selected days by week
 * @param selectedDays - Array of selected days
 * @returns Map of week start timestamp to count of WFH days
 */
function groupDaysByWeek(
  selectedDays: Array<{ year: number; month: number; day: number }>,
): Map<number, number> {
  const weeksMap = new Map<number, number>();

  selectedDays.forEach((day) => {
    const date = new Date(day.year, day.month, day.day);
    const weekStart = getMondayOfWeek(date);
    const weekKey = weekStart.getTime();
    weeksMap.set(weekKey, (weeksMap.get(weekKey) || 0) + 1);
  });

  return weeksMap;
}

/**
 * Calculate week compliance data
 * @param weekStart - Start of week (Monday)
 * @param wfhDaysCount - Number of WFH days in this week
 * @returns Week compliance information
 */
function calculateWeekData(weekStart: Date, wfhDaysCount: number): WeekInfo {
  const officeDays = CONFIG.TOTAL_WEEKDAYS_PER_WEEK - wfhDaysCount;
  const isCompliant = officeDays >= CONFIG.MIN_OFFICE_DAYS_PER_WEEK;

  if (CONFIG.DEBUG) {
    console.log(
      `[RTO Validation] Week ${weekStart.toISOString().split("T")[0]}: WFH=${wfhDaysCount}, Office=${officeDays}, Compliant=${isCompliant} (need >=${CONFIG.MIN_OFFICE_DAYS_PER_WEEK})`,
    );
  }

  const weekInfo: WeekInfo = {
    week: new Date(weekStart),
    weekNumber: 0, // Will be set by caller
    wfhCount: wfhDaysCount,
    officeDays,
    isCompliant,
  };

  return weekInfo;
}

// ==================== Validation Core Functions ====================

/**
 * Calculate rolling compliance over a 12-week period
 * Optimized to use cached data and O(n) complexity
 * @returns Compliance result
 */
export function calculateRollingCompliance(): ComplianceResult {
  // Clear week data cache to recalculate
  weekDataCache.clear();

  const selectedDays = getSelectedWFHDays();
  const weeksByWFH = groupDaysByWeek(selectedDays);

  // Get calendar start date
  const calendarStartDate = getCalendarStartDate();
  const firstWeekStart = getFirstMondayOnOrAfter(calendarStartDate);

  // Build week data array (O(n) where n = number of weeks)
  const weekDataArray: WeekInfo[] = [];
  for (
    let weekIndex = 0;
    weekIndex < CONFIG.ROLLING_PERIOD_WEEKS;
    weekIndex++
  ) {
    const weekStart = new Date(firstWeekStart);
    weekStart.setDate(firstWeekStart.getDate() + weekIndex * 7);

    const weekKey = weekStart.getTime();
    const wfhDaysCount = weeksByWFH.get(weekKey) || 0;

    const weekInfo = calculateWeekData(weekStart, wfhDaysCount);
    weekInfo.weekNumber = weekIndex + 1;
    weekDataArray.push(weekInfo);
  }

  // Calculate average office days for top 8 weeks
  const top8Weeks = weekDataArray.slice(0, 8);
  const totalOfficeDays = top8Weeks.reduce(
    (sum, week) => sum + week.officeDays,
    0,
  );
  const averageOfficeDays = totalOfficeDays / 8;
  const averageOfficePercentage =
    (averageOfficeDays / CONFIG.TOTAL_WEEKDAYS_PER_WEEK) * 100;
  const requiredPercentage = CONFIG.THRESHOLD_PERCENTAGE * 100;
  const isValid = averageOfficePercentage >= requiredPercentage;

  // Generate message
  let message: string;
  if (isValid) {
    message = `✓ RTO Compliant: Top 8 weeks average ${averageOfficeDays.toFixed(1)} office days (${averageOfficePercentage.toFixed(0)}%) of ${CONFIG.TOTAL_WEEKDAYS_PER_WEEK} weekdays. Required: ${requiredPercentage.toFixed(0)}%`;
  } else {
    message = `✗ RTO Violation: Top 8 weeks average ${averageOfficeDays.toFixed(1)} office days (${averageOfficePercentage.toFixed(0)}%) of ${CONFIG.TOTAL_WEEKDAYS_PER_WEEK} weekdays. Required: ${requiredPercentage.toFixed(0)}%`;
  }

  if (CONFIG.DEBUG) {
    console.log("[RTO Validation] Compliance calculation:");
    console.log(
      "  Week data:",
      weekDataArray.map((w) => ({
        week: w.week.toISOString().split("T")[0],
        officeDays: w.officeDays,
        isCompliant: w.isCompliant,
      })),
    );
    console.log("  Average office days:", averageOfficeDays.toFixed(2));
    console.log(
      "  Average percentage:",
      averageOfficePercentage.toFixed(2) + "%",
    );
    console.log("  Valid:", isValid);
  }

  currentResult = {
    isValid,
    message,
    overallCompliance: averageOfficePercentage,
  };

  return currentResult;
}

/**
 * Get the calendar start date from the DOM
 * @returns Date object representing calendar start
 */
function getCalendarStartDate(): Date {
  const firstCell = document.querySelector(
    ".calendar-day[data-year][data-month][data-day]",
  );
  if (firstCell) {
    const year = parseInt((firstCell as HTMLElement).dataset.year || "0");
    const month = parseInt((firstCell as HTMLElement).dataset.month || "0");
    const day = parseInt((firstCell as HTMLElement).dataset.day || "0");
    return new Date(year, month, day);
  }
  return new Date();
}

// ==================== Highlighting Functions ====================

/**
 * Update status icon for a specific week
 * Optimized to use cache
 * @param weekStart - Start of week (Monday)
 * @param isUnderEvaluation - Whether this week is in the top 8 evaluation period
 * @param isCompliant - Whether the week is compliant
 */
function updateWeekStatusIcon(
  weekStart: Date,
  isUnderEvaluation: boolean,
  isCompliant: boolean,
): void {
  const weekKey = weekStart.getTime();
  const statusCell = statusCellCache.get(weekKey);

  if (CONFIG.DEBUG) {
    console.log(
      `[RTO Validation] updateWeekStatusIcon called for week: ${weekStart.toISOString().split("T")[0]}, key: ${weekKey}, underEval: ${isUnderEvaluation}, compliant: ${isCompliant}`,
    );
    console.log(`[RTO Validation] Status cell found in cache: ${!!statusCell}`);
  }

  if (!statusCell) {
    if (CONFIG.DEBUG) {
      console.warn(
        `[RTO Validation] Status cell not found for week: ${weekStart.toISOString().split("T")[0]} (key: ${weekKey})`,
      );
      console.log(
        `[RTO Validation] Available week keys:`,
        Array.from(statusCellCache.keys()).slice(0, 5),
      );
    }
    return;
  }

  const iconElement = statusCell.querySelector(".week-status-icon");
  const srElement = statusCell.querySelector(".sr-only");

  if (CONFIG.DEBUG) {
    console.log(`[RTO Validation] Icon element found: ${!!iconElement}`);
    console.log(`[RTO Validation] SR element found: ${!!srElement}`);
  }

  if (!iconElement || !srElement) {
    if (CONFIG.DEBUG) {
      console.warn(
        `[RTO Validation] Icon or SR element not found in status cell for week: ${weekStart.toISOString().split("T")[0]}`,
      );
    }
    return;
  }

  // Remove all status classes
  statusCell.classList.remove("evaluated", "compliant", "non-compliant");

  if (isUnderEvaluation) {
    if (isCompliant) {
      statusCell.classList.add("evaluated", "compliant");
      iconElement.textContent = "✓";
      srElement.textContent = "Compliant week";
      if (CONFIG.DEBUG) {
        console.log(
          `[RTO Validation] Week ${weekStart.toISOString().split("T")[0]}: ✓ Compliant`,
        );
      }
    } else {
      statusCell.classList.add("evaluated", "non-compliant");
      iconElement.textContent = "✗";
      srElement.textContent = "Non-compliant week";
      if (CONFIG.DEBUG) {
        console.log(
          `[RTO Validation] Week ${weekStart.toISOString().split("T")[0]}: ✗ Non-compliant`,
        );
      }
    }
  } else {
    statusCell.classList.add("evaluated");
    iconElement.textContent = "⏳";
    srElement.textContent = "Under evaluation";
    if (CONFIG.DEBUG) {
      console.log(
        `[RTO Validation] Week ${weekStart.toISOString().split("T")[0]}: ⏳ Under evaluation`,
      );
    }
  }
}

/**
 * Run validation with real-time highlighting of evaluated weeks
 * Optimized to reduce DOM queries from O(n²) to O(n)
 *
 * Performance improvements:
 * 1. Uses cell cache to avoid repeated DOM queries
 * 2. Batches status updates
 * 3. Pre-calculates all week data before applying highlights
 * 4. Reduces complexity from ~500 DOM queries to ~50 DOM queries
 */
export function runValidationWithHighlights(): void {
  let startTime = 0;
  if (CONFIG.DEBUG) {
    console.log("[RTO Validation] Starting validation with highlights...");
    startTime = performance.now();
  }

  // Ensure cache is initialized
  if (!cacheInitialized) {
    initializeCellCache();
  }

  // Clear previous highlights
  clearAllValidationHighlights();

  // Get selected days and group by week
  const selectedDays = getSelectedWFHDays();
  const weeksByWFH = groupDaysByWeek(selectedDays);

  // Get calendar start date
  const calendarStartDate = getCalendarStartDate();
  const firstWeekStart = getFirstMondayOnOrAfter(calendarStartDate);

  // Pre-calculate week data for ALL available weeks (O(n))
  const weekDataArray: WeekInfo[] = [];
  if (CONFIG.DEBUG) {
    console.log("[RTO Validation] Starting week calculations...");
    console.log(
      "[RTO Validation] First week start:",
      firstWeekStart.toISOString().split("T")[0],
    );
  }

  if (CONFIG.DEBUG) {
    console.log("[RTO Validation] Starting week calculations...");
    console.log(
      "[RTO Validation] First week start:",
      firstWeekStart.toISOString().split("T")[0],
    );
  }

  // Calculate all weeks until we run out of calendar data
  let weekIndex = 0;
  while (true) {
    const weekStart = new Date(firstWeekStart);
    weekStart.setDate(firstWeekStart.getDate() + weekIndex * 7);

    // Check if this week has any days in our calendar
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);

    const hasWeekData = cellCache.some((cell) => {
      const cellYear = parseInt(cell.dataset.year || "0");
      const cellMonth = parseInt(cell.dataset.month || "0");
      const cellDay = parseInt(cell.dataset.day || "0");
      const cellDate = new Date(cellYear, cellMonth, cellDay);
      return cellDate >= weekStart && cellDate <= weekEnd;
    });

    if (!hasWeekData) {
      // No more weeks in calendar, stop
      break;
    }

    const wfhDaysCount = weeksByWFH.get(weekStart.getTime()) || 0;

    if (CONFIG.DEBUG) {
      console.log(
        `[RTO Validation] Week ${weekIndex + 1} (${weekStart.toISOString().split("T")[0]}): WFH days = ${wfhDaysCount}`,
      );
    }
    const weekInfo = calculateWeekData(weekStart, wfhDaysCount);
    weekInfo.weekNumber = weekIndex + 1;
    weekDataArray.push(weekInfo);

    weekIndex++;
  }

  // Slide through 12-week windows to find the best 8-week period
  const windowSize = 12;
  const weeksToEvaluate = 8;
  let bestAverageOfficeDays = 0;
  let bestWindowStart = 0;
  let best8Weeks: WeekInfo[] = [];

  if (CONFIG.DEBUG) {
    console.log(
      `[RTO Validation] Total weeks: ${weekDataArray.length}, sliding ${windowSize}-week windows to find best ${weeksToEvaluate} weeks`,
    );
  }

  for (
    let windowStart = 0;
    windowStart <= weekDataArray.length - windowSize;
    windowStart++
  ) {
    // Get the 12-week window
    const windowWeeks = weekDataArray.slice(
      windowStart,
      windowStart + windowSize,
    );

    // Sort by office days descending to find best weeks
    const sortedByOfficeDays = [...windowWeeks].sort(
      (a, b) => b.officeDays - a.officeDays,
    );

    // Take top 8 weeks (the best weeks)
    const top8 = sortedByOfficeDays.slice(0, weeksToEvaluate);

    // Calculate average office days for top 8
    const totalOfficeDays = top8.reduce(
      (sum, week) => sum + week.officeDays,
      0,
    );
    const averageOfficeDays = totalOfficeDays / weeksToEvaluate;

    // Track the window that gives us the best average
    if (averageOfficeDays > bestAverageOfficeDays) {
      bestAverageOfficeDays = averageOfficeDays;
      bestWindowStart = windowStart;
      best8Weeks = top8;
    }
  }

  if (CONFIG.DEBUG) {
    console.log(
      `[RTO Validation] Best window starts at week ${bestWindowStart + 1}, weeks ${bestWindowStart + 1}-${bestWindowStart + weeksToEvaluate}`,
    );
    console.log(
      "[RTO Validation] Best 8 weeks:",
      best8Weeks.map((w) => ({
        week: w.week.toISOString().split("T")[0],
        officeDays: w.officeDays,
      })),
    );
  }

  // Calculate compliance from best 8 weeks (O(n) where n=8)
  const totalOfficeDaysTop8 = best8Weeks.reduce(
    (sum, week) => sum + week.officeDays,
    0,
  );

  const averageOfficeDays = totalOfficeDaysTop8 / weeksToEvaluate;
  const averageOfficePercentage =
    (averageOfficeDays / CONFIG.TOTAL_WEEKDAYS_PER_WEEK) * 100;
  const isValid = averageOfficePercentage >= requiredPercentage;

  const result: ComplianceResult = {
    isValid,
    message: isValid
      ? `✓ RTO Compliant: Best 8 of ${windowSize} weeks average ${averageOfficeDays.toFixed(1)} office days (${averageOfficePercentage.toFixed(0)}%) of ${CONFIG.TOTAL_WEEKDAYS_PER_WEEK} weekdays. Required: ${requiredPercentage.toFixed(0)}%`
      : `✗ RTO Violation: Best 8 of ${windowSize} weeks average ${averageOfficeDays.toFixed(1)} office days (${averageOfficePercentage.toFixed(0)}%) of ${CONFIG.TOTAL_WEEKDAYS_PER_WEEK} weekdays. Required: ${requiredPercentage.toFixed(0)}%`,
    overallCompliance: averageOfficePercentage,
  };

  currentResult = result;
  updateComplianceIndicator(result);

  if (CONFIG.DEBUG) {
    const endTime = performance.now();
    console.log(
      `[RTO Validation] Validation with highlights completed in ${(endTime - startTime).toFixed(2)}ms`,
    );
    console.log("[RTO Validation] Result:", result);
    console.log(
      "[RTO Validation] Week data:",
      weekDataArray.map((w) => ({
        week: w.week.toISOString().split("T")[0],
        officeDays: w.officeDays,
        isCompliant: w.isCompliant,
      })),
    );
  }
}

/**
 * Clear all validation highlights from calendar
 * Optimized to use cache
 */
export function clearAllValidationHighlights(): void {
  if (CONFIG.DEBUG) {
    console.log("[RTO Validation] Clearing all validation highlights...");
    console.log(
      `[RTO Validation] Status cells to clear: ${statusCellCache.size}`,
    );
    console.log(`[RTO Validation] Calendar cells to clear: ${cellCache.size}`);
  }

  // Clear all status cell highlights
  statusCellCache.forEach((statusCell) => {
    statusCell.classList.remove("evaluated", "compliant", "non-compliant");
    const iconElement = statusCell.querySelector(".week-status-icon");
    const srElement = statusCell.querySelector(".sr-only");

    if (iconElement) {
      iconElement.textContent = "";
      if (CONFIG.DEBUG) {
        console.log("[RTO Validation] Cleared icon content");
      }
    }
    if (srElement) {
      srElement.textContent = "";
      if (CONFIG.DEBUG) {
        console.log("[RTO Validation] Cleared SR content");
      }
    }
  });

  // Clear all cell highlights
  cellCache.forEach((cell) => {
    const hadHighlight = cell.classList.contains("validation-highlight");
    cell.classList.remove("validation-highlight");
    if (CONFIG.DEBUG && hadHighlight) {
      console.log("[RTO Validation] Removed validation-highlight class");
    }
  });

  if (CONFIG.DEBUG) {
    console.log("[RTO Validation] Cleared all validation highlights");
  }
}

// ==================== UI Update Functions ====================

/**
 * Update compliance indicator display
 * @param result - Compliance result (optional, uses cached result if not provided)
 */
export function updateComplianceIndicator(result?: ComplianceResult): void {
  if (CONFIG.DEBUG) {
    console.log(
      "[RTO Validation] updateComplianceIndicator called with:",
      result,
    );
    console.log("[RTO Validation] currentResult:", currentResult);
  }

  const complianceResult = result || currentResult;

  if (!complianceResult) {
    if (CONFIG.DEBUG) {
      console.log("[RTO Validation] No result, calculating new one");
    }
    // Calculate if no result provided
    const newResult = calculateRollingCompliance();
    updateComplianceIndicator(newResult);
    return;
  }

  // Update header compliance indicator
  const indicator = document.getElementById("compliance-indicator");
  if (CONFIG.DEBUG) {
    console.log("[RTO Validation] Found indicator element:", indicator);
  }

  if (indicator) {
    // Remove all status classes
    indicator.classList.remove("compliant", "non-compliant");

    // Add appropriate status class
    if (complianceResult.isValid) {
      indicator.classList.add("compliant");
      if (CONFIG.DEBUG) {
        console.log("[RTO Validation] Added 'compliant' class");
      }
    } else {
      indicator.classList.add("non-compliant");
      if (CONFIG.DEBUG) {
        console.log("[RTO Validation] Added 'non-compliant' class");
      }
    }

    // Update icon
    const iconElement = document.getElementById("compliance-icon");
    if (iconElement) {
      iconElement.textContent = complianceResult.isValid ? "✓" : "✗";
      if (CONFIG.DEBUG) {
        console.log(
          "[RTO Validation] Updated icon to:",
          iconElement.textContent,
        );
      }
    }

    // Update text
    const textElement = document.getElementById("compliance-text");
    if (textElement) {
      const statusText = complianceResult.isValid ? "Compliant" : "Violation";
      const newText = `${statusText} (${complianceResult.overallCompliance.toFixed(0)}%)`;
      textElement.textContent = newText;
      if (CONFIG.DEBUG) {
        console.log("[RTO Validation] Updated text to:", newText);
      }
    }
  }

  // Update main validation message
  const messageContainer = document.getElementById("validation-message");
  if (CONFIG.DEBUG) {
    console.log("[RTO Validation] Found message container:", messageContainer);
  }

  if (messageContainer) {
    messageContainer.style.display = "block";
    const message = complianceResult.message;
    messageContainer.textContent = message;
    if (CONFIG.DEBUG) {
      console.log("[RTO Validation] Updated message to:", message);
      console.log(
        "[RTO Validation] Message container display:",
        messageContainer.style.display,
      );
    }
  }

  if (CONFIG.DEBUG) {
    console.log(
      "[RTO Validation] Updated compliance indicator:",
      complianceResult,
    );
  }
}

/**
 * Run basic validation without highlighting
 * Debounced to prevent rapid repeated validations
 */
export function runValidation(): void {
  if (validationTimeout) {
    clearTimeout(validationTimeout);
  }

  validationTimeout = window.setTimeout(() => {
    calculateRollingCompliance();
  }, 100); // 100ms debounce
}

/**
 * Clean up RTO validation resources
 */
export function cleanupRTOValidation(): void {
  if (validationTimeout) {
    clearTimeout(validationTimeout);
    validationTimeout = null;
  }

  clearCaches();
  clearAllValidationHighlights();

  if (CONFIG.DEBUG) {
    console.log("[RTO Validation] Cleaned up");
  }
}

// ==================== Global Export ====================

/**
 * Export functions globally under RTOValidation namespace
 * This makes them accessible from inline scripts in HTML
 */
if (typeof window !== "undefined") {
  // Create namespace if it doesn't exist
  (window as any).RTOValidation = {
    CONFIG,
    calculateRollingCompliance,
    updateComplianceIndicator,
    runValidation,
    runValidationWithHighlights,
    clearAllValidationHighlights,
    cleanupRTOValidation,
  };

  if (CONFIG.DEBUG) {
    console.log("[RTO Validation] API exported to window.RTOValidation");
  }
}

// ==================== Auto-initialization ====================

/**
 * Initialize validation module when DOM is ready
 */
if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      initializeCellCache();
      // Run validation on page load to show initial results
      setTimeout(() => {
        runValidationWithHighlights();
      }, 100);
    });
  } else {
    // DOM is already ready
    initializeCellCache();
    // Run validation immediately if DOM is ready
    setTimeout(() => {
      runValidationWithHighlights();
    }, 100);
  }
}
