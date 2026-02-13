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
 * Week status types for validation feedback
 */
type WeekStatus = "compliant" | "invalid" | "pending" | "excluded" | "ignored";

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
  status: WeekStatus;
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
 * Compliance result from validation
 */
interface ComplianceResult {
  isValid: boolean;
  message: string;
  overallCompliance: number;
  evaluatedWeekStarts: number[];
  windowWeekStarts: number[];
  invalidWeekStart: number | null;
  windowStart: number | null;
}

/**
 * UI Configuration
 */
interface UIConfig {
  DEBUG: boolean;
}

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
let currentResult: ComplianceResult | undefined = undefined;

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
      status: "ignored",
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
  const { weekStart, statusCellElement, status } = weekInfo;

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
  statusCellElement.classList.remove(
    "evaluated",
    "compliant",
    "non-compliant",
    "excluded",
  );
  iconElement.classList.remove("violation", "least-attended");

  // Five states based on WeekStatus:
  // 1. "compliant": Green checkmark (valid compliant week in evaluated set)
  // 2. "invalid": Red X (the invalid week with lowest office days when window is invalid)
  // 3. "pending": Hourglass (remaining evaluated weeks when window is invalid)
  // 4. "excluded": Grey circle (weeks in 12-week window but not in evaluated set - the "worst 4 weeks")
  // 5. "ignored": Empty (weeks not in the 12-week evaluation window)
  switch (status) {
    case "compliant":
      statusCellElement.classList.add("evaluated", "compliant");
      iconElement.textContent = "✓";
      srElement.textContent = "Compliant week";
      if (CONFIG.DEBUG) {
        console.log(
          `[RTO Validation UI] Week ${weekStart.toISOString().split("T")[0]}: ✓ Compliant`,
        );
      }
      break;

    case "invalid":
      statusCellElement.classList.add("evaluated", "non-compliant");
      iconElement.classList.add("violation");
      iconElement.textContent = "✗";
      srElement.textContent =
        "Invalid week - lowest office days in evaluated set";
      if (CONFIG.DEBUG) {
        console.log(
          `[RTO Validation UI] Week ${weekStart.toISOString().split("T")[0]}: ✗ Invalid (lowest office days)`,
        );
      }
      break;

    case "pending":
      statusCellElement.classList.add("evaluated");
      iconElement.classList.add("least-attended");
      iconElement.textContent = "⏳";
      srElement.textContent = "Pending evaluation - part of invalid window";
      if (CONFIG.DEBUG) {
        console.log(
          `[RTO Validation UI] Week ${weekStart.toISOString().split("T")[0]}: ⏳ Pending (in invalid window)`,
        );
      }
      break;

    case "excluded":
      // Grey circle for weeks in the 12-week window but not in evaluated set
      statusCellElement.classList.add("evaluated", "excluded");
      iconElement.textContent = "○";
      srElement.textContent =
        "Excluded - in evaluation window but not evaluated (worst 4 weeks)";
      if (CONFIG.DEBUG) {
        console.log(
          `[RTO Validation UI] Week ${weekStart.toISOString().split("T")[0]}: ○ Excluded (in window but not evaluated)`,
        );
      }
      break;

    case "ignored":
    default:
      // Empty status for weeks not in the 12-week evaluation window
      iconElement.textContent = "";
      srElement.textContent = "";
      if (CONFIG.DEBUG) {
        console.log(
          `[RTO Validation UI] Week ${weekStart.toISOString().split("T")[0]}: Ignored (not in 12-week window)`,
        );
      }
      break;
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
  try {
    console.log(
      "[RTO Validation UI] ==================== Validation Started ====================",
    );
    let startTime = 0;
    if (CONFIG.DEBUG) {
      startTime = performance.now();
    }

    // Step 1: Read DOM once into pure data structure
    console.log(
      "[RTO Validation UI] Step 1: Reading calendar data from DOM...",
    );
    weeksData = readCalendarData();
    console.log(`[RTO Validation UI]   Found ${weeksData.length} weeks`);

    if (weeksData.length === 0) {
      console.warn(
        "[RTO Validation UI] WARNING: No weeks data found in calendar!",
      );
      alert(
        "No weeks found in calendar. Please ensure the calendar is properly rendered.",
      );
      return;
    }

    // Step 2: Clear previous highlights
    console.log("[RTO Validation UI] Step 2: Clearing previous highlights...");
    clearAllValidationHighlightsInternal();

    // Step 3: Convert WeekInfo to WeekCompliance for library validation
    console.log(
      "[RTO Validation UI] Step 3: Converting data for validation...",
    );
    const weeksCompliance: WeekCompliance[] = weeksData.map((week) => ({
      weekNumber: week.weekNumber,
      weekStart: week.weekStart,
      officeDays: week.officeDays,
      totalDays: POLICY.totalWeekdaysPerWeek,
      wfhDays: week.wfhCount,
      isCompliant: week.isCompliant,
    }));

    // Step 4: Perform calculations using library function
    console.log(
      "[RTO Validation UI] Step 4: Running sliding window validation...",
    );
    const validation = validateSlidingWindow(weeksCompliance, POLICY);
    console.log(
      `[RTO Validation UI]   Validation result: ${validation.isValid ? "VALID" : "INVALID"}`,
    );
    console.log(
      `[RTO Validation UI]   Overall compliance: ${validation.overallCompliance.toFixed(1)}%`,
    );

    // Step 5: Update week data with evaluation status
    console.log("[RTO Validation UI] Step 5: Updating week statuses...");
    const windowTimestamps = new Set(validation.windowWeekStarts);
    const evaluatedTimestamps = new Set(validation.evaluatedWeekStarts);
    const isInvalid = !validation.isValid;
    const invalidWeekStart = validation.invalidWeekStart;

    if (invalidWeekStart) {
      const invalidDate = new Date(invalidWeekStart);
      console.log(
        `[RTO Validation UI]   Invalid week starts: ${invalidDate.toISOString().split("T")[0]}`,
      );
    }

    weeksData.forEach((week) => {
      week.isUnderEvaluation = windowTimestamps.has(week.weekStart.getTime());

      // Determine week status based on validation result
      if (!week.isUnderEvaluation) {
        // Week is not in the 12-week evaluation window
        week.status = "ignored";
      } else if (!week.isCompliant) {
        // Individual week violates the 3-office-days minimum
        week.status = "invalid";
      } else if (!isInvalid) {
        // Overall validation is valid
        if (evaluatedTimestamps.has(week.weekStart.getTime())) {
          // Week is in the best 8 evaluated set
          week.status = "compliant";
        } else {
          // Week is in evaluation window but not in best 8 (when valid) - the "worst 4 weeks"
          week.status = "excluded";
        }
      } else if (week.weekStart.getTime() === invalidWeekStart) {
        // This is the week with lowest office days in evaluated set (when window is invalid)
        week.status = "invalid";
      } else if (evaluatedTimestamps.has(week.weekStart.getTime())) {
        // This week is in the best 8 evaluated set when window is invalid
        week.status = "compliant";
      } else {
        // Remaining weeks in evaluation window that are not in best 8 (when invalid)
        week.status = "excluded";
      }
    });

    // Count statuses for debugging
    const statusCounts = weeksData.reduce(
      (acc, week) => {
        acc[week.status] = (acc[week.status] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );
    console.log(`[RTO Validation UI]   Status distribution:`, statusCounts);

    // Step 6: Update compliance result
    currentResult = {
      isValid: validation.isValid,
      message: validation.message,
      overallCompliance: validation.overallCompliance,
      evaluatedWeekStarts: validation.evaluatedWeekStarts,
      windowWeekStarts: validation.windowWeekStarts,
      invalidWeekStart: validation.invalidWeekStart,
      windowStart: validation.windowStart,
    };

    // Step 7: Write updates to DOM only when needed
    console.log("[RTO Validation UI] Step 6: Updating UI...");
    weeksData.forEach((weekInfo) => {
      updateWeekStatusIcon(weekInfo);
    });

    console.log("[RTO Validation UI] Step 7: Updating compliance indicator...");
    updateComplianceIndicator(currentResult);

    if (CONFIG.DEBUG) {
      const endTime = performance.now();
      console.log(
        `[RTO Validation UI] ==================== Validation Completed in ${(endTime - startTime).toFixed(2)}ms ====================`,
      );
      console.log("[RTO Validation UI] Result:", currentResult);
    }
  } catch (error) {
    console.error("[RTO Validation UI] ERROR during validation:", error);
    alert(
      `Validation failed: ${error instanceof Error ? error.message : String(error)}`,
    );
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
    evaluatedWeekStarts: validation.evaluatedWeekStarts,
    windowWeekStarts: validation.windowWeekStarts,
    invalidWeekStart: validation.invalidWeekStart,
    windowStart: validation.windowStart,
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
  currentResult = undefined;

  if (CONFIG.DEBUG) {
    console.log("[RTO Validation UI] Cleaned up");
  }
}

/**
 * Initialize RTO validation and set up button handlers
 * This function should be called when the page loads
 */
export function initializeApp(): void {
  if (CONFIG.DEBUG) {
    console.log("[RTO Validation UI] Initializing application...");
  }

  // Initialize validate buttons
  const validateButtons = document.querySelectorAll('[id^="validate-button-"]');
  if (CONFIG.DEBUG) {
    console.log(
      `[RTO Validation UI] Found ${validateButtons.length} validate button(s)`,
    );
  }

  validateButtons.forEach((button) => {
    const buttonElement = button as HTMLElement;
    buttonElement.addEventListener("click", (e) => {
      e.preventDefault();
      if (CONFIG.DEBUG) {
        console.log("[RTO Validation UI] Validate button clicked");
      }
      try {
        runValidationWithHighlights();
      } catch (error) {
        console.error("[RTO Validation UI] Validation error:", error);
        alert(
          `Validation failed: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
      buttonElement.focus();
    });

    // Add keyboard support
    buttonElement.addEventListener("keydown", (e) => {
      const keyboardEvent = e as KeyboardEvent;
      if (keyboardEvent.key === "Enter" || keyboardEvent.key === " ") {
        e.preventDefault();
        buttonElement.click();
      }
    });
  });

  // Initialize clear all buttons
  const clearAllButtons = document.querySelectorAll(
    '[id^="clear-all-button-"]',
  );
  if (CONFIG.DEBUG) {
    console.log(
      `[RTO Validation UI] Found ${clearAllButtons.length} clear all button(s)`,
    );
  }

  clearAllButtons.forEach((button) => {
    const buttonElement = button as HTMLElement;
    buttonElement.addEventListener("click", (e) => {
      e.preventDefault();

      const selectedCells = document.querySelectorAll(".calendar-day.selected");
      if (selectedCells.length === 0) {
        alert("No selections to clear");
        return;
      }

      selectedCells.forEach((cell) => {
        (cell as HTMLElement).classList.remove("selected");
        (cell as HTMLElement).removeAttribute("data-selection-type");
      });

      clearAllValidationHighlights();

      alert(`Cleared ${selectedCells.length} selection(s)`);
      buttonElement.focus();
    });

    // Add keyboard support
    buttonElement.addEventListener("keydown", (e) => {
      const keyboardEvent = e as KeyboardEvent;
      if (keyboardEvent.key === "Enter" || keyboardEvent.key === " ") {
        e.preventDefault();
        buttonElement.click();
      }
    });
  });

  // Initialize export buttons
  const exportButtons = document.querySelectorAll('[id^="export-button-"]');
  if (CONFIG.DEBUG) {
    console.log(
      `[RTO Validation UI] Found ${exportButtons.length} export button(s)`,
    );
  }

  exportButtons.forEach((button) => {
    const buttonElement = button as HTMLElement;
    buttonElement.addEventListener("click", (e) => {
      e.preventDefault();
      alert("Export functionality coming soon");
      buttonElement.focus();
    });

    // Add keyboard support
    buttonElement.addEventListener("keydown", (e) => {
      const keyboardEvent = e as KeyboardEvent;
      if (keyboardEvent.key === "Enter" || keyboardEvent.key === " ") {
        e.preventDefault();
        buttonElement.click();
      }
    });
  });

  if (CONFIG.DEBUG) {
    console.log("[RTO Validation UI] Application initialized successfully");
  }
}

// ==================== Global Exposure ====================

/**
 * Expose RTO validation functions to window object for use in HTML/inline scripts
 */
if (typeof window !== "undefined") {
  (window as any).RTOValidation = {
    runValidationWithHighlights,
    runValidation,
    updateComplianceIndicator,
    clearAllValidationHighlights,
    cleanupRTOValidation,
    initializeApp,
    weeksData: [] as WeekInfo[],
    currentResult: null as ComplianceResult | null,
    CONFIG: {
      DEBUG: CONFIG.DEBUG,
      MIN_OFFICE_DAYS_PER_WEEK: POLICY.minOfficeDaysPerWeek,
      TOTAL_WEEKDAYS_PER_WEEK: POLICY.totalWeekdaysPerWeek,
      ROLLING_PERIOD_WEEKS: POLICY.rollingPeriodWeeks,
      THRESHOLD_PERCENTAGE: POLICY.thresholdPercentage,
    },
  };

  if (CONFIG.DEBUG) {
    console.log(
      "[RTO Validation UI] Functions exposed to window.RTOValidation",
    );
  }
}
