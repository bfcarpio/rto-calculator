/**
 * Validation utility functions for RTO Calculator
 * Implements 3/5 office days per week and 8/12 weeks rolling period evaluation
 */

import type { DayData, WeekData, RollingPeriodData } from "../types";
import {
  getStartOfWeek,
  getEndOfWeek,
  isWeekday,
  isWeekend,
  getWeekDates,
  getRollingPeriodDates,
  isSameDay,
} from "./dateUtils";

/**
 * Default RTO policy configuration
 */
export const DEFAULT_POLICY = {
  minOfficeDaysPerWeek: 3,
  evaluationMethod: "rolling" as const,
  rollingPeriodLength: 12,
  blackoutPeriods: [] as Date[],
  advanceNoticeRequired: false,
  advanceNoticeDays: 0,
  customValidationRules: [],
  timezone: "UTC",
};

/**
 * Validate a single day's office status
 * @param dayData - The day data to validate
 * @returns Validation result with isValid flag and message
 */
export function validateDay(dayData: DayData): {
  isValid: boolean;
  message?: string;
} {
  // Weekends are always valid (non-office by default)
  if (isWeekend(dayData.date)) {
    return { isValid: true };
  }

  // Past dates are always valid
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const checkDate = new Date(dayData.date);
  checkDate.setHours(0, 0, 0, 0);
  if (checkDate < today) {
    return { isValid: true };
  }

  // Weekdays are valid by default (validation happens at week/period level)
  return { isValid: true };
}

/**
 * Calculate office days for a specific week
 * @param weekDates - Array of dates for the week (Monday-Friday)
 * @param selectedDates - Set of selected non-office dates (ISO strings)
 * @returns Number of office days in the week
 */
export function calculateOfficeDaysInWeek(
  weekDates: Date[],
  selectedDates: Set<string>,
): number {
  return weekDates.filter((date) => {
    const isoDate = date.toISOString().split("T")[0];
    return !selectedDates.has(isoDate);
  }).length;
}

/**
 * Validate a week's compliance with RTO policy
 * @param weekDates - Array of dates for the week (Monday-Friday)
 * @param selectedDates - Set of selected non-office dates (ISO strings)
 * @param minOfficeDays - Minimum required office days per week
 * @returns Week data with compliance information
 */
export function validateWeek(
  weekDates: Date[],
  selectedDates: Set<string>,
  minOfficeDays: number = DEFAULT_POLICY.minOfficeDaysPerWeek,
): WeekData {
  const officeDays = calculateOfficeDaysInWeek(weekDates, selectedDates);
  const totalDays = weekDates.length;
  const compliance = (officeDays / totalDays) * 100;
  const violations: string[] = [];

  if (officeDays < minOfficeDays) {
    violations.push(
      `Only ${officeDays} office days this week. Minimum required: ${minOfficeDays}`,
    );
  }

  return {
    startDate: weekDates[0],
    officeDays,
    totalDays,
    compliance,
    violations,
  };
}

/**
 * Validate rolling period compliance
 * @param startDate - Start date of the rolling period
 * @param selectedDates - Set of selected non-office dates (ISO strings)
 * @param rollingPeriodLength - Number of weeks in the rolling period
 * @param minOfficeDaysPerWeek - Minimum required office days per week
 * @returns Rolling period data with overall compliance
 */
export function validateRollingPeriod(
  startDate: Date,
  selectedDates: Set<string>,
  rollingPeriodLength: number = DEFAULT_POLICY.rollingPeriodLength,
  minOfficeDaysPerWeek: number = DEFAULT_POLICY.minOfficeDaysPerWeek,
): RollingPeriodData {
  const weeks: WeekData[] = [];
  const periodDates = getRollingPeriodDates(startDate, rollingPeriodLength);

  // Group dates by week
  const weeksMap = new Map<number, Date[]>();
  periodDates.forEach((date) => {
    const weekStart = getStartOfWeek(date);
    const weekKey = weekStart.getTime();
    if (!weeksMap.has(weekKey)) {
      weeksMap.set(weekKey, []);
    }
    weeksMap.get(weekKey)!.push(date);
  });

  // Validate each week
  weeksMap.forEach((weekDates) => {
    const weekData = validateWeek(
      weekDates,
      selectedDates,
      minOfficeDaysPerWeek,
    );
    weeks.push(weekData);
  });

  // Calculate overall compliance
  const totalOfficeDays = weeks.reduce((sum, week) => sum + week.officeDays, 0);
  const totalWeekdays = weeks.reduce((sum, week) => sum + week.totalDays, 0);
  const overallCompliance =
    totalWeekdays > 0 ? (totalOfficeDays / totalWeekdays) * 100 : 100;

  // Determine trend
  const trend = determineTrend(weeks);

  return {
    weeks,
    overallCompliance,
    lastValidated: new Date(),
    trend,
  };
}

/**
 * Determine compliance trend based on recent weeks
 * @param weeks - Array of week data
 * @returns Trend direction
 */
function determineTrend(
  weeks: WeekData[],
): "improving" | "stable" | "declining" {
  if (weeks.length < 2) {
    return "stable";
  }

  const recentWeeks = weeks.slice(-4); // Look at last 4 weeks
  const firstHalf = recentWeeks.slice(0, Math.floor(recentWeeks.length / 2));
  const secondHalf = recentWeeks.slice(Math.floor(recentWeeks.length / 2));

  const firstAvg =
    firstHalf.reduce((sum, w) => sum + w.compliance, 0) / firstHalf.length;
  const secondAvg =
    secondHalf.reduce((sum, w) => sum + w.compliance, 0) / secondHalf.length;

  const diff = secondAvg - firstAvg;

  if (diff > 5) {
    return "improving";
  } else if (diff < -5) {
    return "declining";
  }
  return "stable";
}

/**
 * Validate all affected weeks when a day is selected/deselected
 * @param selectedDate - The date that was selected/deselected
 * @param selectedDates - Set of all selected non-office dates
 * @param rollingPeriodLength - Number of weeks in rolling period
 * @param minOfficeDaysPerWeek - Minimum required office days per week
 * @returns Array of affected week data
 */
export function validateAffectedWeeks(
  selectedDate: Date,
  selectedDates: Set<string>,
  rollingPeriodLength: number = DEFAULT_POLICY.rollingPeriodLength,
  minOfficeDaysPerWeek: number = DEFAULT_POLICY.minOfficeDaysPerWeek,
): WeekData[] {
  const affectedWeeks: WeekData[] = [];

  // Get the week of the selected date
  const weekStart = getStartOfWeek(selectedDate);
  const weekDates = getWeekDates(selectedDate);
  const weekData = validateWeek(weekDates, selectedDates, minOfficeDaysPerWeek);
  affectedWeeks.push(weekData);

  // Also validate the rolling period that includes this week
  const rollingPeriodStart = getStartOfWeek(
    new Date(
      weekStart.getTime() - (rollingPeriodLength - 1) * 7 * 24 * 60 * 60 * 1000,
    ),
  );

  const rollingData = validateRollingPeriod(
    rollingPeriodStart,
    selectedDates,
    rollingPeriodLength,
    minOfficeDaysPerWeek,
  );

  affectedWeeks.push(...rollingData.weeks);

  return affectedWeeks;
}

/**
 * Check if a selection would violate RTO policy
 * @param date - The date to be selected
 * @param selectedDates - Current set of selected dates
 * @param minOfficeDaysPerWeek - Minimum required office days per week
 * @returns Validation result
 */
export function validateSelection(
  date: Date,
  selectedDates: Set<string>,
  minOfficeDaysPerWeek: number = DEFAULT_POLICY.minOfficeDaysPerWeek,
): { isValid: boolean; message?: string } {
  // Check if it's a weekend (always valid)
  if (isWeekend(date)) {
    return { isValid: true };
  }

  // Check if it's a past date (always valid)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const checkDate = new Date(date);
  checkDate.setHours(0, 0, 0, 0);
  if (checkDate < today) {
    return { isValid: true };
  }

  // Simulate the selection
  const newSelectedDates = new Set(selectedDates);
  const isoDate = date.toISOString().split("T")[0];
  newSelectedDates.add(isoDate);

  // Validate the week
  const weekDates = getWeekDates(date);
  const weekData = validateWeek(
    weekDates,
    newSelectedDates,
    minOfficeDaysPerWeek,
  );

  if (weekData.violations.length > 0) {
    return {
      isValid: false,
      message: weekData.violations[0],
    };
  }

  return { isValid: true };
}

/**
 * Get compliance status for display
 * @param compliance - Compliance percentage (0-100)
 * @returns Status string and color class
 */
export function getComplianceStatus(compliance: number): {
  status: string;
  colorClass: string;
} {
  if (compliance >= 100) {
    return { status: "Fully Compliant", colorClass: "text-green-600" };
  } else if (compliance >= 80) {
    return { status: "Mostly Compliant", colorClass: "text-yellow-600" };
  } else if (compliance >= 60) {
    return { status: "Partially Compliant", colorClass: "text-orange-600" };
  } else {
    return { status: "Non-Compliant", colorClass: "text-red-600" };
  }
}

/**
 * Calculate overall compliance for all weeks in the calendar
 * @param calendarDates - All dates in the calendar
 * @param selectedDates - Set of selected non-office dates
 * @param minOfficeDaysPerWeek - Minimum required office days per week
 * @returns Array of week data for all weeks
 */
export function validateAllWeeks(
  calendarDates: Date[],
  selectedDates: Set<string>,
  minOfficeDaysPerWeek: number = DEFAULT_POLICY.minOfficeDaysPerWeek,
): WeekData[] {
  const weeksMap = new Map<number, Date[]>();

  // Group dates by week
  calendarDates.forEach((date) => {
    if (!isWeekday(date)) return; // Skip weekends

    const weekStart = getStartOfWeek(date);
    const weekKey = weekStart.getTime();
    if (!weeksMap.has(weekKey)) {
      weeksMap.set(weekKey, []);
    }
    weeksMap.get(weekKey)!.push(date);
  });

  // Validate each week
  const weeks: WeekData[] = [];
  weeksMap.forEach((weekDates) => {
    const weekData = validateWeek(
      weekDates,
      selectedDates,
      minOfficeDaysPerWeek,
    );
    weeks.push(weekData);
  });

  // Sort by start date
  weeks.sort((a, b) => a.startDate.getTime() - b.startDate.getTime());

  return weeks;
}
