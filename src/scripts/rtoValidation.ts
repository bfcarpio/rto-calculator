/**
 * RTO Validation UI Module
 *
 * Provides UI integration for the RTO Calculator validation system.
 * Handles DOM reading, updating UI elements, and coordinating with the
 * core validation library (src/lib/rtoValidation.ts).
 */

import {
  DEFAULT_RTO_POLICY,
  getStartOfWeek,
  isWeekday,
  validateSlidingWindow,
  type WeekCompliance,
  type RTOPolicyConfig,
} from "../lib/rtoValidation";

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
 * All DOM references stored directly in data structure
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
 * UI Configuration
 */
interface UIConfig {
  DEBUG: boolean;
}

// ==================== Configuration ====================

/**
 * RTO validation UI configuration
 */
const CONFIG: UIConfig = {
  DEBUG: true,
};

/**
 * Policy configuration (uses library defaults)
 */
const POLICY: RTOPolicyConfig = DEFAULT_RTO_POLICY;

// ==================== State Management ====================

/**
 * Cached week data from DOM
 */
let weeksData: WeekInfo[] = [];

/**
 * Current validation result
 */
let currentResult: ComplianceResult | null = null;

// ==================== DOM Reading ====================

/**
 * Read calendar data from DOM into pure data structure
 * This function queries the DOM once and builds a complete data model
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

    // Check if this is a weekday using library function
    const weekday = isWeekday(date);

    // Check selection state
    const isSelected = element.classList.contains("selected");
    const selectionType = element.dataset.selectionType as
      | "work-from-home"
      | "office"
      | null;

    // Store element reference directly in DayInfo
    const dayInfo: DayInfo = {
      date,
      element, // Direct DOM reference embedded in data structure
      isWeekday: weekday,
      isSelected,
      selectionType,
    };

    // Group by week start using library function
    const weekStart = getStartOfWeek(date);
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
      isCompliant: totalOfficeDays >= POLICY.minOfficeDaysPerWeek,
      isUnderEvaluation: false, // Will be set during validation
      statusCellElement: statusCell,
    };

    weeks[index] = weekInfo;
  });

  if (CONFIG.DEBUG) {
    const endTime = performance.now();
    console.log(
      `[RTO Validation UI] Read ${weeks.length} weeks from calendar in ${(endTime - startTime).toFixed(2)}ms`,
    );
    console.log(`[RTO Validation UI] Processed ${cells.length} calendar cells`);
  }

  return weeks;
}

// ==================== DOM Updating ====================

/**
 * Update the status icon for a specific week
 * @param weekInfo - Week information with compliance status
 */
function updateWeekStatusIcon(weekInfo: WeekInfo): void {
  const { weekStart, isUnderEvaluation, isCompliant, statusCellElement } =
    weekInfo;

  if (!statusCellElement) {
    if (CONFIG.DEBUG) {
      console.warn(
        `[RTO Validation UI] Status cell not found for week: ${weekStart.toISOString().split("T")[0]}`,
      );
    }
    return;
  }

  const iconElement = statusCellElement.querySelector(".week-status-icon");
  const srElement = statusCellElement.querySelector(".sr-only");

  if (!iconElement || !srElement) {
    if (CONFIG.DEBUG) {
      console.warn(
        `[RTO Validation UI] Icon or SR element not found in status cell for week: ${weekStart.toISOString().split("T")[0]}`,
      );
    }
    return;
  }

  // Remove all status classes
  statusCellElement.classList.remove("evaluated", "compliant", "non-compliant");
  iconElement.classList.remove("violation", "least-attended");

  // Three states:
  // 1. In evaluated weeks + compliant: Green checkmark
  // 2. In evaluated weeks + non-compliant: Red X
  // 3. Not in evaluated weeks: Grey marker
  if (isUnderEvaluation) {
    statusCellElement.classList.add("evaluated");

    if (isCompliant) {
      statusCellElement.classList.add("compliant");
      iconElement.textContent = "✓";
      srElement.textContent = "Compliant week";
      if (CONFIG.DEBUG) {
        console.log(
          `[RTO Validation UI] Week ${weekStart.toISOString().split("T")[0]}: ✓ Compliant (in evaluated weeks)`,
        );
      }
    } else {
      statusCellElement.classList.add("non-compliant");
      iconElement.classList.add("violation");
      iconElement.textContent = "✗";
      srElement.textContent = "Non-compliant week";
      if (CONFIG.DEBUG) {
        console.log(
          `[RTO Validation UI] Week ${weekStart.toISOString().split("T")[0]}: ✗ Non-compliant (in evaluated weeks)`,
        );
      }
    }
  } else {
    statusCellElement.classList.add("evaluated");
    iconElement.classList.add("least-attended");
    iconElement.textContent = "⏳";
    srElement.textContent = "Excluded from evaluated weeks";
    if (CONFIG.DEBUG) {
      console.log(
        `[RTO Validation UI] Week ${weekStart.toISOString().split("T")[0]}: ⏳ Excluded from evaluated weeks`,
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
      "[RTO Validation UI] updateComplianceIndicator called with:",
      result,
    );
  }

  const complianceResult = result || currentResult;

  if (!complianceResult) {
    if (CONFIG.DEBUG) {
      console.log("[RTO Validation UI] No result, calculating new one");
    }
    runValidation();
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
      "[RTO Validation UI] Updated compliance indicator:",
      complianceResult,
    );
  }
}

/**
 * Clear all validation highlights from calendar
 */
function clearAllValidationHighlightsInternal(): void {
  if (CONFIG.DEBUG) {
    console.log("[RTO Validation UI] Clearing all validation highlights...");
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
    console.log("[RTO Validation UI] Cleared all validation highlights");
  }
}

// ==================== Main Validation Functions ====================

/**
 * Run validation with real-time highlighting of evaluated weeks
 * Uses reduced query pattern:
 * 1. Read DOM once into pure data structure
 * 2. Perform validations using library functions
 * 3. Write updates to DOM only when needed
 */
export function runValidationWithHighlights(): void {
  let startTime = 0;
  if (CONFIG.DEBUG) {
    console.log("[RTO Validation UI] Starting validation with highlights...");
    startTime = performance.now();
  }

  // Step 1: Read DOM once into pure data structure
  weeksData = readCalendarData();

  // Step 2: Clear previous highlights
  clearAllValidationHighlightsInternal();

  // Step 3: Convert WeekInfo to WeekCompliance for library validation
  const weeksCompliance: WeekCompliance[] = weeksData.map((week) => ({
    weekNumber: week.weekNumber,
    weekStart: week.weekStart,
    officeDays: week.officeDays,
    totalDays: POLICY.totalWeekdaysPerWeek,
    wfhDays: week.wfhCount,
    isCompliant: week.isCompliant,
  }));

  // Step 4: Perform calculations using library function
  const validation = validateSlidingWindow(weeksCompliance, POLICY);

  // Step 5: Update week data with evaluation status
  const evaluatedTimestamps = new Set(validation.evaluatedWeekStarts);
  weeksData.forEach((week) => {
    week.isUnderEvaluation = evaluatedTimestamps.has(week.weekStart.getTime());
  });

  // Step 6: Update compliance result
  currentResult = {
    isValid: validation.isValid,
    message: validation.message,
    overallCompliance: validation.overallCompliance,
  };

  // Step 7: Write updates to DOM only when needed
  if (CONFIG.DEBUG) {
    console.log("[RTO Validation UI] Updating status icons for all weeks...");
  }

  weeksData.forEach((weekInfo) => {
    updateWeekStatusIcon(weekInfo);
  });

  updateComplianceIndicator(currentResult);

  if (CONFIG.DEBUG) {
    const endTime = performance.now();
    console.log(
      `[RTO Validation UI] Validation with highlights completed in ${(endTime - startTime).toFixed(2)}ms`,
    );
    console.log("[RTO Validation UI] Result:", currentResult);
  }
}

/**
 * Run basic validation without highlighting
 */
export function runValidation(): void {
  // Read data and calculate
  weeksData = readCalendarData();

  // Convert WeekInfo to WeekCompliance for library validation
  const weeksCompliance: WeekCompliance[] = weeksData.map((week) => ({
    weekNumber: week.weekNumber,
    weekStart: week.weekStart,
    officeDays: week.officeDays,
    totalDays: POLICY.totalWeekdaysPerWeek,
    wfhDays: week.wfhCount,
    isCompliant: week.isCompliant,
  }));

  const validation = validateSlidingWindow(weeksCompliance, POLICY);

  currentResult = {
    isValid: validation.isValid,
    message: validation.message,
    overallCompliance: validation.overallCompliance,
  };

  updateComplianceIndicator(currentResult);
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
    console.log("[RTO Validation UI] Cleaned up");
  }
}
