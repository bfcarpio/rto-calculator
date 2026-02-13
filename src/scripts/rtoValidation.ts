/**
 * RTO Validation Module
 *
 * Provides validation functionality for the RTO Calculator with real-time highlighting.
 * Optimized using reduced queries - read DOM once into pure data structure, validate,
 * then write updates to DOM only when needed.
 */

// ==================== Type Definitions ====================

/**
 * Day information for a single day
 * Includes direct reference to DOM element for efficient updates
 */
interface DayInfo {
  date: Date;
  element: HTMLElement;
  isWeekday: boolean;
  isSelected: boolean;
  selectionType: "work-from-home" | "office" | null;
}

/**
 * Week information for tracking
 * All DOM references stored directly in data structure - no separate caches needed
 */
interface WeekInfo {
  weekStart: Date;
  weekNumber: number;
  days: DayInfo[];
  wfhCount: number;
  officeDays: number;
  isCompliant: boolean;
  isUnderEvaluation: boolean;
  statusCellElement: HTMLElement | null;
}

/**
 * Compliance result from validation
 */
interface ComplianceResult {
  isValid: boolean;
  message: string;
  overallCompliance: number;
}

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

// ==================== State Management ====================

/**
 * Pure data structure holding all week data
 * DOM element references are stored directly in DayInfo objects - no separate Map caches needed
 */
let weeksData: WeekInfo[] = [];

/**
 * Current validation result
 */
let currentResult: ComplianceResult | null = null;

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
 * Check if a date is a weekday (Monday-Friday)
 * @param date - Date to check
 * @returns true if weekday, false if weekend
 */
function isWeekday(date: Date): boolean {
  const day = date.getDay();
  return day >= 1 && day <= 5; // 1 = Monday, 5 = Friday
}

// ==================== Data Collection Functions ====================

/**
 * Read DOM once into pure data structure
 * This is the ONLY function that reads from the DOM for calendar data
 * @returns Array of WeekInfo objects with all necessary data
 */
function readCalendarData(): WeekInfo[] {
  const startTime = performance.now();

  // Find all calendar cells - single DOM query
  const cells = document.querySelectorAll(
    ".calendar-day[data-year][data-month][data-day]",
  );

  // Group cells by week - element references stored in DayInfo objects
  const weekMap = new Map<number, DayInfo[]>();
  const dayCountPerWeek = new Map<number, number>();

  cells.forEach((cell) => {
    const element = cell as HTMLElement;
    const year = parseInt(element.dataset.year || "0");
    const month = parseInt(element.dataset.month || "0");
    const day = parseInt(element.dataset.day || "0");
    const date = new Date(year, month, day);

    // Check if this is a weekday
    const weekday = isWeekday(date);

    // Check selection state
    const isSelected = element.classList.contains("selected");
    const selectionType = element.dataset.selectionType as
      | "work-from-home"
      | "office"
      | null;

    // Store element reference directly in DayInfo - no separate cache needed
    const dayInfo: DayInfo = {
      date,
      element, // ← Direct DOM reference embedded in data structure
      isWeekday: weekday,
      isSelected,
      selectionType,
    };

    // Group by week start
    const weekStart = getMondayOfWeek(date);
    const weekKey = weekStart.getTime();

    if (!weekMap.has(weekKey)) {
      // Preallocate array for 5 weekdays (typical work week)
      weekMap.set(weekKey, new Array<DayInfo>(5));
      dayCountPerWeek.set(weekKey, 0);
    }
    const weekDays = weekMap.get(weekKey)!;
    const currentCount = dayCountPerWeek.get(weekKey)!;
    weekDays[currentCount] = dayInfo;
    dayCountPerWeek.set(weekKey, currentCount + 1);
  });

  // Convert map to sorted array of WeekInfo
  const sortedWeekStarts = Array.from(weekMap.keys()).sort((a, b) => a - b);
  // Preallocate weeks array with known size
  const weeks = new Array<WeekInfo>(sortedWeekStarts.length);

  sortedWeekStarts.forEach((weekKey, index) => {
    const fullDaysArray = weekMap.get(weekKey)!;
    const actualDayCount = dayCountPerWeek.get(weekKey)!;
    // Trim to actual day count (handles partial weeks)
    const days = fullDaysArray.slice(0, actualDayCount);
    const weekStart = new Date(weekKey);

    // Find status cell for this week (single DOM query per week)
    const statusCell = document.querySelector(
      `.week-status-cell[data-week-start="${weekKey}"] .week-status-container`,
    ) as HTMLElement | null;

    // Calculate week statistics
    const wfhCount = days.filter(
      (d) =>
        d.isSelected && d.selectionType === "work-from-home" && d.isWeekday,
    ).length;

    const officeDays = days.filter(
      (d) => d.isSelected && d.selectionType === "office" && d.isWeekday,
    ).length;

    const totalWeekdays = days.filter((d) => d.isWeekday).length;

    // Office days count = explicitly selected as office + weekdays not selected (implicitly office)
    const impliedOfficeDays = totalWeekdays - wfhCount - officeDays;
    const totalOfficeDays = officeDays + impliedOfficeDays;

    const weekInfo: WeekInfo = {
      weekStart,
      weekNumber: index + 1,
      days,
      wfhCount,
      officeDays: totalOfficeDays,
      isCompliant: totalOfficeDays >= CONFIG.MIN_OFFICE_DAYS_PER_WEEK,
      isUnderEvaluation: false, // Will be set during validation
      statusCellElement: statusCell,
    };

    weeks[index] = weekInfo;
  });

  if (CONFIG.DEBUG) {
    const endTime = performance.now();
    console.log(
      `[RTO Validation] Read ${weeks.length} weeks from calendar in ${(endTime - startTime).toFixed(2)}ms`,
    );
    console.log(
      `[RTO Validation] Processed ${cells.length} calendar cells with embedded element references`,
    );
    console.log(
      `[RTO Validation] Element references stored in DayInfo objects - no separate cache needed`,
    );
  }

  return weeks;
}

// ==================== Validation Core Functions ====================

/**
 * Calculate rolling compliance over a 12-week period
 * Uses pure data structure - no DOM reads
 * @returns Compliance result
 */
function calculateRollingCompliance(): ComplianceResult {
  // Get data from pure data structure
  const windowSize = 12;
  const weeksToEvaluate = 8;

  // Slide through 12-week windows until we find an invalid one
  for (
    let windowStart = 0;
    windowStart <= weeksData.length - windowSize;
    windowStart++
  ) {
    // Get 12-week window
    const windowWeeks = weeksData.slice(windowStart, windowStart + windowSize);

    // Sort by office days descending to find best weeks
    const sortedByOfficeDays = [...windowWeeks].sort(
      (a, b) => b.officeDays - a.officeDays,
    );

    // Take top 8 weeks (the best weeks)
    const best8Weeks = sortedByOfficeDays.slice(0, weeksToEvaluate);

    // Calculate average and validity for this window
    const totalOfficeDays = best8Weeks.reduce(
      (sum, week) => sum + week.officeDays,
      0,
    );
    const averageOfficeDays = totalOfficeDays / weeksToEvaluate;
    const averageOfficePercentage =
      (averageOfficeDays / CONFIG.TOTAL_WEEKDAYS_PER_WEEK) * 100;
    const requiredPercentage = CONFIG.THRESHOLD_PERCENTAGE * 100;
    const isValid = averageOfficePercentage >= requiredPercentage;

    // Return immediately if invalid (break on first invalid window)
    if (!isValid) {
      const result: ComplianceResult = {
        isValid: false,
        message: `✗ RTO Violation: Best 8 of ${windowSize} weeks average ${averageOfficeDays.toFixed(1)} office days (${averageOfficePercentage.toFixed(0)}%) of ${CONFIG.TOTAL_WEEKDAYS_PER_WEEK} weekdays. Required: ${requiredPercentage.toFixed(0)}%`,
        overallCompliance: averageOfficePercentage,
      };

      currentResult = result;

      // Update week data with evaluation status
      const bestWeekTimestamps = new Set(
        best8Weeks.map((w) => w.weekStart.getTime()),
      );
      weeksData.forEach((week) => {
        week.isUnderEvaluation = bestWeekTimestamps.has(
          week.weekStart.getTime(),
        );
      });

      if (CONFIG.DEBUG) {
        console.log("[RTO Validation] Sliding window found invalid period:");
        console.log(
          `  Window start week: ${windowWeeks[0].weekStart.toISOString().split("T")[0]}`,
        );
        console.log(
          "  Best 8 weeks:",
          best8Weeks.map((w) => ({
            week: w.weekStart.toISOString().split("T")[0],
            officeDays: w.officeDays,
          })),
        );
        console.log("  Average office days:", averageOfficeDays.toFixed(2));
        console.log(
          "  Average percentage:",
          averageOfficePercentage.toFixed(2) + "%",
        );
        console.log(
          "  Required percentage:",
          requiredPercentage.toFixed(2) + "%",
        );
        console.log("  Valid:", false, "- BREAKING");
      }

      return result;
    }
  }

  // All windows are valid, return the last valid window
  const lastWindowStart = Math.max(0, weeksData.length - windowSize);
  const lastWindowWeeks = weeksData.slice(
    lastWindowStart,
    lastWindowStart + windowSize,
  );
  const sortedByOfficeDays = [...lastWindowWeeks].sort(
    (a, b) => b.officeDays - a.officeDays,
  );
  const best8Weeks = sortedByOfficeDays.slice(0, weeksToEvaluate);
  const totalOfficeDays = best8Weeks.reduce(
    (sum, week) => sum + week.officeDays,
    0,
  );
  const averageOfficeDays = totalOfficeDays / weeksToEvaluate;
  const averageOfficePercentage =
    (averageOfficeDays / CONFIG.TOTAL_WEEKDAYS_PER_WEEK) * 100;
  const requiredPercentage = CONFIG.THRESHOLD_PERCENTAGE * 100;

  const result: ComplianceResult = {
    isValid: true,
    message: `✓ RTO Compliant: Best 8 of ${windowSize} weeks average ${averageOfficeDays.toFixed(1)} office days (${averageOfficePercentage.toFixed(0)}%) of ${CONFIG.TOTAL_WEEKDAYS_PER_WEEK} weekdays. Required: ${requiredPercentage.toFixed(0)}%`,
    overallCompliance: averageOfficePercentage,
  };

  currentResult = result;

  // Update week data with evaluation status
  const bestWeekTimestamps = new Set(
    best8Weeks.map((w) => w.weekStart.getTime()),
  );
  weeksData.forEach((week) => {
    week.isUnderEvaluation = bestWeekTimestamps.has(week.weekStart.getTime());
  });

  if (CONFIG.DEBUG) {
    console.log("[RTO Validation] Sliding window completed - all valid:");
    console.log(
      "  Best 8 weeks:",
      best8Weeks.map((w) => ({
        week: w.weekStart.toISOString().split("T")[0],
        officeDays: w.officeDays,
        isCompliant: w.isCompliant,
      })),
    );
    console.log("  Average office days:", averageOfficeDays.toFixed(2));
    console.log(
      "  Average percentage:",
      averageOfficePercentage.toFixed(2) + "%",
    );
    console.log("  Required percentage:", requiredPercentage.toFixed(2) + "%");
    console.log("  Valid:", true);
  }

  return result;
}

// ==================== UI Update Functions ====================

/**
 * Update status icon for a specific week
 * @param weekInfo - Week information object
 */
function updateWeekStatusIcon(weekInfo: WeekInfo): void {
  const { weekStart, isUnderEvaluation, isCompliant, statusCellElement } =
    weekInfo;

  if (!statusCellElement) {
    if (CONFIG.DEBUG) {
      console.warn(
        `[RTO Validation] Status cell not found for week: ${weekStart.toISOString().split("T")[0]}`,
      );
    }
    return;
  }

  const iconElement = statusCellElement.querySelector(".week-status-icon");
  const srElement = statusCellElement.querySelector(".sr-only");

  if (!iconElement || !srElement) {
    if (CONFIG.DEBUG) {
      console.warn(
        `[RTO Validation] Icon or SR element not found in status cell for week: ${weekStart.toISOString().split("T")[0]}`,
      );
    }
    return;
  }

  // Remove all status classes
  statusCellElement.classList.remove("evaluated", "compliant", "non-compliant");
  iconElement.classList.remove("violation", "least-attended");

  // Three states:
  // 1. In best 8 + compliant: Green checkmark
  // 2. In best 8 + non-compliant: Red X
  // 3. Not in best 8: Grey marker
  if (isUnderEvaluation) {
    statusCellElement.classList.add("evaluated");

    if (isCompliant) {
      statusCellElement.classList.add("compliant");
      iconElement.textContent = "✓";
      srElement.textContent = "Compliant week";
      if (CONFIG.DEBUG) {
        console.log(
          `[RTO Validation] Week ${weekStart.toISOString().split("T")[0]}: ✓ Compliant (in best 8)`,
        );
      }
    } else {
      statusCellElement.classList.add("non-compliant");
      iconElement.classList.add("violation");
      iconElement.textContent = "✗";
      srElement.textContent = "Non-compliant week";
      if (CONFIG.DEBUG) {
        console.log(
          `[RTO Validation] Week ${weekStart.toISOString().split("T")[0]}: ✗ Non-compliant (in best 8)`,
        );
      }
    }
  } else {
    statusCellElement.classList.add("evaluated");
    iconElement.classList.add("least-attended");
    iconElement.textContent = "⏳";
    srElement.textContent = "Excluded from best 8";
    if (CONFIG.DEBUG) {
      console.log(
        `[RTO Validation] Week ${weekStart.toISOString().split("T")[0]}: ⏳ Excluded from best 8`,
      );
    }
  }
}

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
  }

  const complianceResult = result || currentResult;

  if (!complianceResult) {
    if (CONFIG.DEBUG) {
      console.log("[RTO Validation] No result, calculating new one");
    }
    const newResult = calculateRollingCompliance();
    updateComplianceIndicator(newResult);
    return;
  }

  // Update header compliance indicator
  const indicator = document.getElementById("compliance-indicator");
  if (indicator) {
    indicator.classList.remove("compliant", "non-compliant");

    if (complianceResult.isValid) {
      indicator.classList.add("compliant");
    } else {
      indicator.classList.add("non-compliant");
    }

    const iconElement = document.getElementById("compliance-icon");
    if (iconElement) {
      iconElement.textContent = complianceResult.isValid ? "✓" : "✗";
    }

    const textElement = document.getElementById("compliance-text");
    if (textElement) {
      const statusText = complianceResult.isValid ? "Compliant" : "Violation";
      const newText = `${statusText} (${complianceResult.overallCompliance.toFixed(0)}%)`;
      textElement.textContent = newText;
    }
  }

  // Update main validation message
  const messageContainer = document.getElementById("validation-message");
  if (messageContainer) {
    messageContainer.style.display = "block";
    messageContainer.style.visibility = "visible";
    messageContainer.textContent = complianceResult.message;
  }

  if (CONFIG.DEBUG) {
    console.log(
      "[RTO Validation] Updated compliance indicator:",
      complianceResult,
    );
  }
}

/**
 * Clear all validation highlights from calendar
 * Uses stored week data to clear highlights, with DOM fallback
 */
function clearAllValidationHighlightsInternal(): void {
  if (CONFIG.DEBUG) {
    console.log("[RTO Validation] Clearing all validation highlights...");
  }

  // Use stored week data if available, otherwise query DOM directly
  if (weeksData.length > 0) {
    // Clear status cell highlights using stored elements
    weeksData.forEach((weekInfo) => {
      const statusCell = weekInfo.statusCellElement;
      if (statusCell) {
        statusCell.classList.remove("evaluated", "compliant", "non-compliant");

        const iconElement = statusCell.querySelector(".week-status-icon");
        const srElement = statusCell.querySelector(".sr-only");

        if (iconElement) {
          iconElement.textContent = "";
          iconElement.classList.remove("violation", "least-attended");
        }
        if (srElement) {
          srElement.textContent = "";
        }
      }
    });
  } else {
    // Fallback: Query DOM directly when weeksData is empty
    const statusCells = document.querySelectorAll(".week-status-cell");
    statusCells.forEach((cell) => {
      const statusCell = cell as HTMLElement;
      statusCell.classList.remove("evaluated", "compliant", "non-compliant");

      const iconElement = statusCell.querySelector(".week-status-icon");
      const srElement = statusCell.querySelector(".sr-only");

      if (iconElement) {
        iconElement.textContent = "";
        iconElement.classList.remove("violation", "least-attended");
      }
      if (srElement) {
        srElement.textContent = "";
      }
    });
  }

  // Clear compliance indicator
  const complianceIndicator = document.getElementById("compliance-indicator");
  if (complianceIndicator) {
    complianceIndicator.classList.remove("compliant", "non-compliant");
  }

  // Hide validation message
  const messageContainer = document.getElementById("validation-message");
  if (messageContainer) {
    messageContainer.style.display = "none";
    messageContainer.style.visibility = "hidden";
  }

  if (CONFIG.DEBUG) {
    console.log("[RTO Validation] Cleared all validation highlights");
  }
}

// ==================== Main Validation Functions ====================

/**
 * Run validation with real-time highlighting of evaluated weeks
 * Uses reduced query pattern:
 * 1. Read DOM once into pure data structure
 * 2. Perform all validations on data structure
 * 3. Write updates to DOM only when needed
 */
export function runValidationWithHighlights(): void {
  let startTime = 0;
  if (CONFIG.DEBUG) {
    console.log("[RTO Validation] Starting validation with highlights...");
    startTime = performance.now();
  }

  // Step 1: Read DOM once into pure data structure
  weeksData = readCalendarData();

  // Step 2: Clear previous highlights
  clearAllValidationHighlightsInternal();

  // Step 3: Perform all calculations on data structure
  const result = calculateRollingCompliance();

  // Step 4: Write updates to DOM only when needed
  if (CONFIG.DEBUG) {
    console.log("[RTO Validation] Updating status icons for all weeks...");
  }

  weeksData.forEach((weekInfo) => {
    updateWeekStatusIcon(weekInfo);
  });

  updateComplianceIndicator(result);

  if (CONFIG.DEBUG) {
    const endTime = performance.now();
    console.log(
      `[RTO Validation] Validation with highlights completed in ${(endTime - startTime).toFixed(2)}ms`,
    );
    console.log("[RTO Validation] Result:", result);
  }
}

/**
 * Run basic validation without highlighting
 */
export function runValidation(): void {
  // Read data and calculate
  weeksData = readCalendarData();
  calculateRollingCompliance();
  updateComplianceIndicator();
}

/**
 * Clear all validation highlights (exported function)
 */
export function clearAllValidationHighlights(): void {
  clearAllValidationHighlightsInternal();
}

/**
 * Clean up RTO validation resources
 */
export function cleanupRTOValidation(): void {
  clearAllValidationHighlightsInternal();
  weeksData = [];
  currentResult = null;

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
