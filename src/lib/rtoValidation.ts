/**
 * RTO Validation Library
 *
 * Core validation logic for RTO (Return to Office) compliance checking.
 * This library provides pure functions for validating office day requirements
 * without any DOM dependencies.
 */

// ==================== Type Definitions ====================

/**
 * RTO policy configuration
 */
export interface RTOPolicyConfig {
  minOfficeDaysPerWeek: number;
  totalWeekdaysPerWeek: number;
  thresholdPercentage: number;
  rollingPeriodWeeks: number;
  topWeeksToCheck: number;
}

/**
 * Represents a single day's selection status
 */
export interface DaySelection {
  date: Date;
  year: number;
  month: number;
  day: number;
  selectionType: "work-from-home" | "office" | "none";
}

/**
 * Represents compliance data for a single week
 */
export interface WeekCompliance {
  weekNumber: number;
  weekStart: Date;
  officeDays: number;
  totalDays: number;
  wfhDays: number;
  isCompliant: boolean;
}

/**
 * Represents the overall validation result
 */
export interface ValidationResult {
  isValid: boolean;
  message: string;
  averageOfficeDays: number;
  averageOfficePercentage: number;
  requiredAverage: number;
  requiredPercentage: number;
  weeksData: WeekCompliance[];
  totalOfficeDays: number;
  totalWeekdays: number;
}

/**
 * Compliance result from sliding window validation
 */
export interface SlidingWindowResult {
  isValid: boolean;
  message: string;
  overallCompliance: number;
  evaluatedWeekStarts: number[]; // The best 8 weeks in the 12-week window
  windowWeekStarts: number[]; // All weeks in the 12-week window being evaluated
  invalidWeekStart: number | null; // The week with lowest office days in evaluated set (when invalid)
  windowStart: number | null; // The start of the 12-week window that was evaluated
}

// ==================== Configuration ====================

/**
 * Default RTO policy configuration
 */
export const DEFAULT_RTO_POLICY: RTOPolicyConfig = {
  minOfficeDaysPerWeek: 3,
  totalWeekdaysPerWeek: 5,
  thresholdPercentage: 0.6, // 3/5 = 60%
  rollingPeriodWeeks: 12,
  topWeeksToCheck: 8,
};

// ==================== Date Utilities ====================

/**
 * Get the start of the week (Monday) for a given date
 * @param date - The reference date
 * @returns Date object representing Monday of that week
 */
export function getStartOfWeek(date: Date): Date {
  const d = new Date(date.getTime());
  const day = d.getDay();
  // Calculate days to subtract to get to Monday of the same week
  // Sunday (0) -> 6 (back to previous Monday), Monday (1) -> 0, Tuesday (2) -> 1, etc.
  const daysToSubtract = day === 0 ? 6 : day - 1;
  d.setDate(d.getDate() - daysToSubtract);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Get the first Monday on or after a given date
 * @param date - The reference date
 * @returns Date object representing the first Monday on or after the date
 */
export function getFirstWeekStart(date: Date): Date {
  const d = new Date(date.getTime());
  const day = d.getDay();
  // Calculate days to add to get to first Monday on or after the date
  // Sunday (0) -> 1, Monday (1) -> 0, Tuesday (2) -> 6, Wednesday (3) -> 5, etc.
  const daysToAdd = day === 0 ? 1 : day === 1 ? 0 : 8 - day;
  d.setDate(d.getDate() + daysToAdd);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Get all dates in a week (Monday-Friday)
 * @param weekStart - Monday of the week
 * @returns Array of Date objects for weekdays
 */
export function getWeekDates(weekStart: Date): Date[] {
  const dates: Date[] = [];
  for (let i = 0; i < 5; i++) {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    dates.push(d);
  }
  return dates;
}

/**
 * Check if a date is a weekday (Monday-Friday)
 * @param date - Date to check
 * @returns true if weekday, false if weekend
 */
export function isWeekday(date: Date): boolean {
  const day = date.getDay();
  return day >= 1 && day <= 5; // 1 = Monday, 5 = Friday
}

// ==================== Data Processing ====================

/**
 * Filter and transform day selections to work-from-home dates
 * @param selections - Array of day selections
 * @returns Array of Date objects for work-from-home selections
 */
export function getWorkFromHomeDates(selections: DaySelection[]): Date[] {
  return selections
    .filter((s) => s.selectionType === "work-from-home")
    .map((s) => s.date);
}

/**
 * Group work-from-home dates by week
 * @param workFromHomeDates - Array of work-from-home dates
 * @returns Map of week start timestamp to count of WFH days
 */
export function groupDatesByWeek(
  workFromHomeDates: Date[],
): Map<number, number> {
  const weeksMap = new Map<number, number>();

  workFromHomeDates.forEach((date) => {
    const weekStart = getStartOfWeek(date);
    const weekKey = weekStart.getTime();
    weeksMap.set(weekKey, (weeksMap.get(weekKey) || 0) + 1);
  });

  return weeksMap;
}

/**
 * Calculate office days for a specific week
 * Office days = total weekdays - work-from-home days
 * @param weeksByWFH - Map of week start to WFH day count
 * @param weekStart - Start date of the week
 * @param policy - RTO policy configuration
 * @returns Number of office days in the week
 */
export function calculateOfficeDaysInWeek(
  weeksByWFH: Map<number, number>,
  weekStart: Date,
  policy: RTOPolicyConfig = DEFAULT_RTO_POLICY,
): number {
  const weekKey = weekStart.getTime();
  const wfhDays = weeksByWFH.get(weekKey) || 0;
  return policy.totalWeekdaysPerWeek - wfhDays;
}

/**
 * Calculate compliance for a single week
 * @param weekNumber - Week number in the period
 * @param weekStart - Start date of the week
 * @param weeksByWFH - Map of week start to WFH day count
 * @param policy - RTO policy configuration
 * @returns Week compliance data
 */
export function calculateWeekCompliance(
  weekNumber: number,
  weekStart: Date,
  weeksByWFH: Map<number, number>,
  policy: RTOPolicyConfig = DEFAULT_RTO_POLICY,
): WeekCompliance {
  const weekKey = weekStart.getTime();
  const wfhDays = weeksByWFH.get(weekKey) || 0;
  const officeDays = policy.totalWeekdaysPerWeek - wfhDays;
  const isCompliant = officeDays >= policy.minOfficeDaysPerWeek;

  return {
    weekNumber,
    weekStart: new Date(weekStart),
    officeDays,
    totalDays: policy.totalWeekdaysPerWeek,
    wfhDays,
    isCompliant,
  };
}

// ==================== Validation Methods ====================

/**
 * Validate the top 8 weeks of the first 12-week period
 * This is a static validation that checks the first N weeks from calendar start
 * @param selections - Array of day selections
 * @param calendarStartDate - Start date of the calendar (first day)
 * @param policy - RTO policy configuration (optional, uses default if not provided)
 * @returns Validation result with detailed information
 */
export function validateTop8Weeks(
  selections: DaySelection[],
  calendarStartDate: Date,
  policy: RTOPolicyConfig = DEFAULT_RTO_POLICY,
): ValidationResult {
  // Get work-from-home dates and group by week
  const workFromHomeDates = getWorkFromHomeDates(selections);
  const weeksByWFH = groupDatesByWeek(workFromHomeDates);

  // Find first Monday ON or AFTER calendar start date
  const firstWeekStart = getFirstWeekStart(calendarStartDate);
  const weeksData: WeekCompliance[] = [];

  // Get data for the first N weeks (rolling period)
  for (let week = 0; week < policy.rollingPeriodWeeks; week++) {
    const weekStart = new Date(firstWeekStart);
    weekStart.setDate(firstWeekStart.getDate() + week * 7);
    const weekData = calculateWeekCompliance(
      week + 1,
      weekStart,
      weeksByWFH,
      policy,
    );
    weeksData.push(weekData);
  }

  // Calculate average for top 8 weeks
  const top8Weeks = weeksData.slice(0, policy.topWeeksToCheck);
  const totalOfficeDays = top8Weeks.reduce(
    (sum, week) => sum + week.officeDays,
    0,
  );
  const totalWeekdays = top8Weeks.reduce(
    (sum, week) => sum + week.totalDays,
    0,
  );
  const averageOfficeDays = totalOfficeDays / policy.topWeeksToCheck;
  const averageOfficePercentage =
    totalWeekdays > 0 ? (totalOfficeDays / totalWeekdays) * 100 : 100;
  const requiredAverage = policy.minOfficeDaysPerWeek;
  const requiredPercentage =
    (policy.minOfficeDaysPerWeek / policy.totalWeekdaysPerWeek) * 100;
  const requiredAveragePercentage = policy.thresholdPercentage * 100;

  // Determine if compliant
  const isValid = averageOfficePercentage >= requiredAveragePercentage;

  // Generate detailed message
  let message: string;
  if (isValid) {
    message = `✓ RTO Compliant: Top ${policy.topWeeksToCheck} weeks average ${averageOfficeDays.toFixed(1)} office days (${averageOfficePercentage.toFixed(0)}%) of ${policy.totalWeekdaysPerWeek} weekdays. Required: ${requiredAverage} days (${requiredPercentage}%)`;
  } else {
    message = `✗ RTO Violation: Top ${policy.topWeeksToCheck} weeks average ${averageOfficeDays.toFixed(1)} office days (${averageOfficePercentage.toFixed(0)}%) of ${policy.totalWeekdaysPerWeek} weekdays. Required: ${requiredAverage} days (${requiredPercentage}%)`;
  }

  return {
    isValid,
    message,
    averageOfficeDays,
    averageOfficePercentage,
    requiredAverage: policy.thresholdPercentage,
    requiredPercentage,
    weeksData: top8Weeks,
    totalOfficeDays,
    totalWeekdays,
  };
}

/**
 * Calculate rolling window compliance
 * This validation slides through all 12-week windows and finds the first invalid one
 * @param weeksData - Array of week compliance data
 * @param policy - RTO policy configuration (optional, uses default if not provided)
 * @returns Sliding window validation result
 */
export function validateSlidingWindow(
  weeksData: WeekCompliance[],
  policy: RTOPolicyConfig = DEFAULT_RTO_POLICY,
): SlidingWindowResult {
  const windowSize = policy.rollingPeriodWeeks;
  const weeksToEvaluate = policy.topWeeksToCheck;

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

    // Take top N weeks (the best weeks)
    const bestWeeks = sortedByOfficeDays.slice(0, weeksToEvaluate);

    // Calculate average and validity for this window
    const totalOfficeDays = bestWeeks.reduce(
      (sum, week) => sum + week.officeDays,
      0,
    );
    const averageOfficeDays = totalOfficeDays / weeksToEvaluate;
    const averageOfficePercentage =
      (averageOfficeDays / policy.totalWeekdaysPerWeek) * 100;
    const requiredPercentage = policy.thresholdPercentage * 100;
    const isValid = averageOfficePercentage >= requiredPercentage;

    // Return immediately if invalid (break on first invalid window)
    if (!isValid) {
      const evaluatedWeekStarts = bestWeeks.map((w) => w.weekStart.getTime());
      const windowWeekStarts = windowWeeks.map((w) => w.weekStart.getTime());
      // Find the week with lowest office days in the evaluated set
      const invalidWeek = bestWeeks[bestWeeks.length - 1]; // Last one has lowest office days (sorted descending)
      const invalidWeekStart = invalidWeek?.weekStart.getTime() ?? null;
      // Get the window start timestamp
      const windowWeek = weeksData[windowStart];
      const windowStartTimestamp = windowWeek?.weekStart.getTime() ?? null;

      return {
        isValid: false,
        message: `✗ RTO Violation: Best ${weeksToEvaluate} of ${windowSize} weeks average ${averageOfficeDays.toFixed(1)} office days (${averageOfficePercentage.toFixed(0)}%) of ${policy.totalWeekdaysPerWeek} weekdays. Required: ${requiredPercentage.toFixed(0)}%`,
        overallCompliance: averageOfficePercentage,
        evaluatedWeekStarts,
        windowWeekStarts,
        invalidWeekStart,
        windowStart: windowStartTimestamp,
      };
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
  const bestWeeks = sortedByOfficeDays.slice(0, weeksToEvaluate);
  const totalOfficeDays = bestWeeks.reduce(
    (sum, week) => sum + week.officeDays,
    0,
  );
  const averageOfficeDays = totalOfficeDays / weeksToEvaluate;
  const averageOfficePercentage =
    (averageOfficeDays / policy.totalWeekdaysPerWeek) * 100;
  const requiredPercentage = policy.thresholdPercentage * 100;
  const evaluatedWeekStarts = bestWeeks.map((w) => w.weekStart.getTime());
  const windowWeekStarts = lastWindowWeeks.map((w) => w.weekStart.getTime());
  const lastWindowWeek = weeksData[lastWindowStart];
  const windowStartTimestamp = lastWindowWeek?.weekStart.getTime() ?? null;

  return {
    isValid: true,
    message: `✓ RTO Compliant: Best ${weeksToEvaluate} of ${windowSize} weeks average ${averageOfficeDays.toFixed(1)} office days (${averageOfficePercentage.toFixed(0)}%) of ${policy.totalWeekdaysPerWeek} weekdays. Required: ${requiredPercentage.toFixed(0)}%`,
    overallCompliance: averageOfficePercentage,
    evaluatedWeekStarts,
    windowWeekStarts,
    invalidWeekStart: null,
    windowStart: windowStartTimestamp,
  };
}

/**
 * Get compliance status for a specific week
 * @param weekStart - Start date of the week
 * @param selections - Array of day selections
 * @param policy - RTO policy configuration
 * @returns Week compliance data
 */
export function getWeekCompliance(
  weekStart: Date,
  selections: DaySelection[],
  policy: RTOPolicyConfig = DEFAULT_RTO_POLICY,
): WeekCompliance {
  const workFromHomeDates = getWorkFromHomeDates(selections);
  const weeksByWFH = groupDatesByWeek(workFromHomeDates);
  return calculateWeekCompliance(1, weekStart, weeksByWFH, policy);
}

/**
 * Check if a specific week is within the evaluation period
 * @param weekStart - Start date of the week
 * @param calendarStartDate - Start date of the calendar
 * @param policy - RTO policy configuration
 * @returns True if the week is in the evaluation period
 */
export function isInEvaluationPeriod(
  weekStart: Date,
  calendarStartDate: Date,
  policy: RTOPolicyConfig = DEFAULT_RTO_POLICY,
): boolean {
  const firstWeekStart = getStartOfWeek(calendarStartDate);
  const weekDiff = Math.round(
    (weekStart.getTime() - firstWeekStart.getTime()) /
      (7 * 24 * 60 * 60 * 1000),
  );
  return weekDiff >= 0 && weekDiff < policy.topWeeksToCheck;
}

// ==================== Utility Functions ====================

/**
 * Create a day selection object
 * @param year - Year
 * @param month - Month (0-11)
 * @param day - Day of month
 * @param selectionType - Selection type
 * @returns Day selection object
 */
export function createDaySelection(
  year: number,
  month: number,
  day: number,
  selectionType: "work-from-home" | "office" | "none",
): DaySelection {
  return {
    date: new Date(year, month, day),
    year,
    month,
    day,
    selectionType,
  };
}

/**
 * Convert DOM element data to day selection
 * @param element - DOM element with dataset
 * @returns Day selection object
 */
export function elementToDaySelection(
  element: HTMLElement,
): DaySelection | null {
  const year = element.dataset.year;
  const month = element.dataset.month;
  const day = element.dataset.day;
  const selectionType = element.dataset.selectionType;

  if (!year || !month || !day) {
    return null;
  }

  return createDaySelection(
    parseInt(year),
    parseInt(month),
    parseInt(day),
    (selectionType as "work-from-home" | "office" | "none") || "none",
  );
}
