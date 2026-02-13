/**
 * RTO Validation Library
 *
 * Core validation logic for RTO (Return to Office) compliance checking.
 * This library provides pure functions for validating office day requirements
 * without any DOM dependencies.
 *
 * Holidays are treated as non-office days for compliance calculations.
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
	selectionType: "out-of-office" | "none";
}

/**
 * Represents compliance data for a single week
 */
export interface WeekCompliance {
	weekNumber: number;
	weekStart: Date;
	officeDays: number;
	totalDays: number;
	oofDays: number; // Changed from oofDays
	wfhDays: number; // Work from home days (same as oofDays)
	isCompliant: boolean;
	status: string; // Added for compatibility
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
	minOfficeDaysPerWeek: MINIMUM_COMPLIANT_DAYS,
	totalWeekdaysPerWeek: TOTAL_WEEK_DAYS,
	thresholdPercentage: COMPLIANCE_THRESHOLD, // 3/5 = 60%
	rollingPeriodWeeks: ROLLING_WINDOW_WEEKS,
	topWeeksToCheck: BEST_WEEKS_COUNT,
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
	for (let i = 0; i < TOTAL_WEEK_DAYS; i++) {
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
	return day >= 1 && day <= TOTAL_WEEK_DAYS; // 1 = Monday, 5 = Friday
}

// ==================== Data Processing ====================

/**
 * Filter and transform day selections to out-of-office dates
 * @param selections - Array of day selections
 * @param holidayDates - Optional array of holiday dates to exclude
 * @returns Array of Date objects for out-of-office selections
 */
export function getOutOfOfficeDates(
	selections: DaySelection[],
	holidayDates: Date[] = [],
): Date[] {
	const holidaySet = new Set(holidayDates.map((d) => d.getTime()));

	return selections
		.filter((s) => s.selectionType === "out-of-office")
		.map((s) => s.date)
		.filter((date) => !holidaySet.has(date.getTime()));
}

/**
 * Group out-of-office dates by week
 * @param outOfOfficeDates - Array of out-of-office dates
 * @param holidayDates - Optional array of holiday dates
 * @returns Map of week start timestamp to count of OOF days
 */
export function groupDatesByWeek(
	outOfOfficeDates: Date[],
	holidayDates: Date[] = [],
): Map<number, number> {
	const weeksMap = new Map<number, number>();
	const holidaySet = new Set(holidayDates.map((d) => d.getTime()));

	outOfOfficeDates.forEach((date) => {
		if (!holidaySet.has(date.getTime())) {
			const weekStart = getStartOfWeek(date);
			const weekKey = weekStart.getTime();
			weeksMap.set(weekKey, (weeksMap.get(weekKey) || 0) + 1);
		}
	});

	return weeksMap;
}

/**
 * Calculate office days for a specific week
 * Office days = total weekdays - out-of-office days - holiday days
 * @param weeksByOOF - Map of week start to OOF day count
 * @param weekStart - Start date of week
 * @param policy - RTO policy configuration
 * @param holidayDates - Optional array of holiday dates
 * @returns Number of office days in week
 */
export function calculateOfficeDaysInWeek(
	weeksByOOF: Map<number, number>,
	weekStart: Date,
	policy: RTOPolicyConfig = DEFAULT_RTO_POLICY,
	holidayDates: Date[] = [],
): number {
	const weekKey = weekStart.getTime();
	const wfhDays = weeksByOOF.get(weekKey) || 0;

	// Count holidays in this week
	const weekDates = getWeekDates(weekStart);
	const holidaySet = new Set(holidayDates.map((d) => d.getTime()));
	const holidayCount = weekDates.filter((d) =>
		holidaySet.has(d.getTime()),
	).length;

	// Effective weekdays = total weekdays - holidays
	const effectiveWeekdays = policy.totalWeekdaysPerWeek - holidayCount;
	return effectiveWeekdays - wfhDays;
}

/**
 * Calculate compliance for a single week
 * @param weekNumber - Week number in period
 * @param weekStart - Start date of week
 * @param weeksByOOF - Map of week start to OOF day count
 * @param policy - RTO policy configuration
 * @param holidayDates - Optional array of holiday dates
 * @returns Week compliance data
 */
export function calculateWeekCompliance(
	weekNumber: number,
	weekStart: Date,
	weeksByOOF: Map<number, number>,
	policy: RTOPolicyConfig = DEFAULT_RTO_POLICY,
	holidayDates: Date[] = [],
): WeekCompliance {
	const weekKey = weekStart.getTime();
	const wfhDays = weeksByOOF.get(weekKey) || 0;

	// Count holidays in this week
	const weekDates = getWeekDates(weekStart);
	const holidaySet = new Set(holidayDates.map((d) => d.getTime()));
	const holidayCount = weekDates.filter((d) =>
		holidaySet.has(d.getTime()),
	).length;

	// Effective weekdays = total weekdays - holidays
	const totalDays = policy.totalWeekdaysPerWeek - holidayCount;
	const officeDays = totalDays - wfhDays;
	const isCompliant = officeDays >= policy.minOfficeDaysPerWeek;
	const oofDays = wfhDays + holidayCount;

	const status = isCompliant ? "compliant" : "violation";

	return {
		weekNumber,
		weekStart: new Date(weekStart),
		officeDays,
		totalDays,
		oofDays: oofDays,
		wfhDays: wfhDays,
		isCompliant,
		status,
	};
}

// ==================== Validation Methods ====================

/**
 * Validate the top 8 weeks of the first 12-week period
 * This is a static validation that checks the first N weeks from calendar start
 * @param selections - Array of day selections
 * @param calendarStartDate - Start date of the calendar (first day)
 * @param policy - RTO policy configuration (optional, uses default if not provided)
 * @param holidayDates - Optional array of holiday dates
 * @returns Validation result with detailed information
 */
export function validateTop8Weeks(
	selections: DaySelection[],
	calendarStartDate: Date,
	policy: RTOPolicyConfig = DEFAULT_RTO_POLICY,
	_holidayDates: Date[] = [],
): ValidationResult {
	// Get out-of-office dates and group by week
	const outOfOfficeDates = getOutOfOfficeDates(selections);
	const weeksByOOF = groupDatesByWeek(outOfOfficeDates);

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
			weeksByOOF,
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
		message = `✓ RTO Compliant: Top ${policy.topWeeksToCheck} weeks average ${averageOfficeDays.toFixed(1)} office days (${averageOfficePercentage.toFixed(0)}%) of ${totalWeekdays} weekdays. Required: ${requiredAverage} days (${requiredPercentage}%)`;
	} else {
		message = `✗ RTO Violation: Top ${policy.topWeeksToCheck} weeks average ${averageOfficeDays.toFixed(1)} office days (${averageOfficePercentage.toFixed(0)}%) of ${totalWeekdays} weekdays. Required: ${requiredAverage} days (${requiredPercentage}%)`;
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
		const totalDays = bestWeeks.reduce((sum, week) => sum + week.totalDays, 0);
		const averageOfficePercentage =
			totalDays > 0 ? (totalOfficeDays / totalDays) * 100 : 100;
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
				message: `✗ RTO Violation: Best ${weeksToEvaluate} of ${windowSize} weeks average ${averageOfficeDays.toFixed(1)} office days (${averageOfficePercentage.toFixed(0)}%) of ${totalDays} weekdays. Required: ${requiredPercentage.toFixed(0)}%`,
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
	const totalDays = bestWeeks.reduce((sum, week) => sum + week.totalDays, 0);
	const averageOfficePercentage =
		totalDays > 0 ? (totalOfficeDays / totalDays) * 100 : 100;
	const requiredPercentage = policy.thresholdPercentage * 100;
	const evaluatedWeekStarts = bestWeeks.map((w) => w.weekStart.getTime());
	const windowWeekStarts = lastWindowWeeks.map((w) => w.weekStart.getTime());
	const lastWindowWeek = weeksData[lastWindowStart];
	const windowStartTimestamp = lastWindowWeek?.weekStart.getTime() ?? null;

	return {
		isValid: true,
		message: `✓ RTO Compliant: Best ${weeksToEvaluate} of ${windowSize} weeks average ${averageOfficeDays.toFixed(1)} office days (${averageOfficePercentage.toFixed(0)}%) of ${totalDays} weekdays. Required: ${requiredPercentage.toFixed(0)}%`,
		overallCompliance: averageOfficePercentage,
		evaluatedWeekStarts,
		windowWeekStarts,
		invalidWeekStart: null,
		windowStart: windowStartTimestamp,
	};
}

/**
 * Get compliance status for a specific week
 * @param weekStart - Start date of week
 * @param selections - Array of day selections
 * @param policy - RTO policy configuration
 * @param holidayDates - Optional array of holiday dates
 * @returns Week compliance data
 */
export function getWeekCompliance(
	weekStart: Date,
	selections: DaySelection[],
	policy: RTOPolicyConfig = DEFAULT_RTO_POLICY,
	holidayDates: Date[] = [],
): WeekCompliance {
	const outOfOfficeDates = getOutOfOfficeDates(selections, holidayDates);
	const weeksByOOF = groupDatesByWeek(outOfOfficeDates, holidayDates);
	return calculateWeekCompliance(
		1,
		weekStart,
		weeksByOOF,
		policy,
		holidayDates,
	);
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
	selectionType: "out-of-office" | "none",
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
		parseInt(year, 10),
		parseInt(month, 10),
		parseInt(day, 10),
		(selectionType as "out-of-office" | "none") || "none",
	);
}

import {
	BEST_WEEKS_COUNT,
	COMPLIANCE_THRESHOLD,
	MINIMUM_COMPLIANT_DAYS,
	ROLLING_WINDOW_WEEKS,
	TOTAL_WEEK_DAYS,
} from "./constants";
