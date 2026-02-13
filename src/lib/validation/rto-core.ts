/**
 * RTO Validation Library
 *
 * Core validation logic for RTO (Return to Office) compliance checking.
 * Provides the sliding window validation that evaluates all 12-week windows
 * across the calendar, using best-8-of-12 policy.
 */

import {
	BEST_WEEKS_COUNT,
	COMPLIANCE_THRESHOLD,
	MINIMUM_COMPLIANT_DAYS,
	ROLLING_WINDOW_WEEKS,
	TOTAL_WEEK_DAYS,
} from "./constants";

// ==================== Type Definitions ====================

export interface RTOPolicyConfig {
	minOfficeDaysPerWeek: number;
	totalWeekdaysPerWeek: number;
	thresholdPercentage: number;
	rollingPeriodWeeks: number;
	topWeeksToCheck: number;
}

export interface WeekCompliance {
	weekNumber: number;
	weekStart: Date;
	officeDays: number;
	totalDays: number;
	oofDays: number;
	wfhDays: number;
	isCompliant: boolean;
	status: string;
}

export interface SlidingWindowResult {
	isValid: boolean;
	message: string;
	overallCompliance: number;
	evaluatedWeekStarts: number[];
	windowWeekStarts: number[];
	invalidWeekStart: number | null;
	windowStart: number | null;
}

// ==================== Configuration ====================

export const DEFAULT_RTO_POLICY: RTOPolicyConfig = {
	minOfficeDaysPerWeek: MINIMUM_COMPLIANT_DAYS,
	totalWeekdaysPerWeek: TOTAL_WEEK_DAYS,
	thresholdPercentage: COMPLIANCE_THRESHOLD,
	rollingPeriodWeeks: ROLLING_WINDOW_WEEKS,
	topWeeksToCheck: BEST_WEEKS_COUNT,
};

// ==================== Date Utilities ====================

export function getStartOfWeek(date: Date): Date {
	const d = new Date(date.getTime());
	const day = d.getDay();
	const daysToSubtract = day === 0 ? 6 : day - 1;
	d.setDate(d.getDate() - daysToSubtract);
	d.setHours(0, 0, 0, 0);
	return d;
}

export function getFirstWeekStart(date: Date): Date {
	const d = new Date(date.getTime());
	const day = d.getDay();
	const daysToAdd = day === 0 ? 1 : day === 1 ? 0 : 8 - day;
	d.setDate(d.getDate() + daysToAdd);
	d.setHours(0, 0, 0, 0);
	return d;
}

export function getWeekDates(weekStart: Date): Date[] {
	const dates: Date[] = [];
	for (let i = 0; i < TOTAL_WEEK_DAYS; i++) {
		const d = new Date(weekStart);
		d.setDate(weekStart.getDate() + i);
		dates.push(d);
	}
	return dates;
}

export function isWeekday(date: Date): boolean {
	const day = date.getDay();
	return day >= 1 && day <= TOTAL_WEEK_DAYS;
}

// ==================== Utility ====================

export interface DaySelection {
	date: Date;
	year: number;
	month: number;
	day: number;
	selectionType: "out-of-office" | "none";
}

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

// ==================== Data Processing ====================

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

export function calculateOfficeDaysInWeek(
	weeksByOOF: Map<number, number>,
	weekStart: Date,
	policy: RTOPolicyConfig = DEFAULT_RTO_POLICY,
	holidayDates: Date[] = [],
): number {
	const weekKey = weekStart.getTime();
	const wfhDays = weeksByOOF.get(weekKey) || 0;

	const weekDates = getWeekDates(weekStart);
	const holidaySet = new Set(holidayDates.map((d) => d.getTime()));
	const holidayCount = weekDates.filter((d) =>
		holidaySet.has(d.getTime()),
	).length;

	const effectiveWeekdays = policy.totalWeekdaysPerWeek - holidayCount;
	return effectiveWeekdays - wfhDays;
}

export function calculateWeekCompliance(
	weekNumber: number,
	weekStart: Date,
	weeksByOOF: Map<number, number>,
	policy: RTOPolicyConfig = DEFAULT_RTO_POLICY,
	holidayDates: Date[] = [],
): WeekCompliance {
	const weekKey = weekStart.getTime();
	const wfhDays = weeksByOOF.get(weekKey) || 0;

	const weekDates = getWeekDates(weekStart);
	const holidaySet = new Set(holidayDates.map((d) => d.getTime()));
	const holidayCount = weekDates.filter((d) =>
		holidaySet.has(d.getTime()),
	).length;

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
		oofDays,
		wfhDays,
		isCompliant,
		status,
	};
}

export function validateTop8Weeks(
	selections: DaySelection[],
	calendarStartDate: Date,
	policy: RTOPolicyConfig = DEFAULT_RTO_POLICY,
	_holidayDates: Date[] = [],
): {
	isValid: boolean;
	message: string;
	averageOfficeDays: number;
	averageOfficePercentage: number;
	requiredAverage: number;
	requiredPercentage: number;
	weeksData: WeekCompliance[];
	totalOfficeDays: number;
	totalWeekdays: number;
} {
	const outOfOfficeDates = getOutOfOfficeDates(selections);
	const weeksByOOF = groupDatesByWeek(outOfOfficeDates);

	const firstWeekStartDate = getFirstWeekStart(calendarStartDate);
	const weeksData: WeekCompliance[] = [];

	for (let week = 0; week < policy.rollingPeriodWeeks; week++) {
		const ws = new Date(firstWeekStartDate);
		ws.setDate(firstWeekStartDate.getDate() + week * 7);
		const weekData = calculateWeekCompliance(week + 1, ws, weeksByOOF, policy);
		weeksData.push(weekData);
	}

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

	const isValid = averageOfficePercentage >= requiredAveragePercentage;

	let message: string;
	if (isValid) {
		message = `Compliant: Top ${policy.topWeeksToCheck} weeks average ${averageOfficeDays.toFixed(1)} office days (${averageOfficePercentage.toFixed(0)}%) of ${totalWeekdays} weekdays. Required: ${requiredAverage} days (${requiredPercentage}%)`;
	} else {
		message = `Not compliant: Top ${policy.topWeeksToCheck} weeks average ${averageOfficeDays.toFixed(1)} office days (${averageOfficePercentage.toFixed(0)}%) of ${totalWeekdays} weekdays. Required: ${requiredAverage} days (${requiredPercentage}%)`;
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

export function isInEvaluationPeriod(
	weekStart: Date,
	calendarStartDate: Date,
	policy: RTOPolicyConfig = DEFAULT_RTO_POLICY,
): boolean {
	const firstWeekStartDate = getStartOfWeek(calendarStartDate);
	const weekDiff = Math.round(
		(weekStart.getTime() - firstWeekStartDate.getTime()) /
			(7 * 24 * 60 * 60 * 1000),
	);
	return weekDiff >= 0 && weekDiff < policy.topWeeksToCheck;
}

// ==================== Validation ====================

/**
 * Sliding window validation: slides through ALL 12-week windows and
 * returns the first invalid one, or the last valid window if all pass.
 */
export function validateSlidingWindow(
	weeksData: WeekCompliance[],
	policy: RTOPolicyConfig = DEFAULT_RTO_POLICY,
): SlidingWindowResult {
	const windowSize = policy.rollingPeriodWeeks;
	const weeksToEvaluate = policy.topWeeksToCheck;

	// Helper to evaluate a single window of weeks
	function evaluateWindow(windowWeeks: WeekCompliance[]): {
		isValid: boolean;
		averageOfficeDays: number;
		averageOfficePercentage: number;
		bestWeeks: WeekCompliance[];
	} {
		const sorted = [...windowWeeks].sort(
			(a, b) => b.officeDays - a.officeDays,
		);
		// For partial windows (< 12 weeks), evaluate all available weeks
		const evalCount = Math.min(weeksToEvaluate, sorted.length);
		const bestWeeks = sorted.slice(0, evalCount);

		const totalOfficeDays = bestWeeks.reduce(
			(sum, week) => sum + week.officeDays,
			0,
		);
		const averageOfficeDays = evalCount > 0 ? totalOfficeDays / evalCount : 0;
		const totalDays = bestWeeks.reduce((sum, week) => sum + week.totalDays, 0);
		const averageOfficePercentage =
			totalDays > 0 ? (totalOfficeDays / totalDays) * 100 : 0;

		// Primary check: average office days must meet the minimum.
		// This handles holiday weeks correctly — a week with 5 holidays
		// has 0 officeDays and 0 totalDays, so it correctly counts as
		// 0 office days rather than getting a free pass via percentage.
		const isValid =
			averageOfficeDays >= policy.minOfficeDaysPerWeek;

		return { isValid, averageOfficeDays, averageOfficePercentage, bestWeeks };
	}

	// If fewer weeks than a full window, evaluate as a single partial window
	if (weeksData.length > 0 && weeksData.length < windowSize) {
		const { isValid, averageOfficeDays, averageOfficePercentage, bestWeeks } =
			evaluateWindow(weeksData);
		const evaluatedWeekStarts = bestWeeks.map((w) => w.weekStart.getTime());
		const windowWeekStarts = weeksData.map((w) => w.weekStart.getTime());
		const windowStartTimestamp = weeksData[0]?.weekStart.getTime() ?? null;

		const label = isValid ? "Compliant" : "Not compliant";
		return {
			isValid,
			message: `${label}: Best ${bestWeeks.length} of ${weeksData.length} weeks average ${averageOfficeDays.toFixed(1)} office days. Required: ${policy.minOfficeDaysPerWeek}`,
			overallCompliance: averageOfficePercentage,
			evaluatedWeekStarts,
			windowWeekStarts,
			invalidWeekStart: isValid
				? null
				: (bestWeeks[bestWeeks.length - 1]?.weekStart.getTime() ?? null),
			windowStart: windowStartTimestamp,
		};
	}

	// Slide through all full 12-week windows
	for (
		let windowStart = 0;
		windowStart <= weeksData.length - windowSize;
		windowStart++
	) {
		const windowWeeks = weeksData.slice(windowStart, windowStart + windowSize);
		const { isValid, averageOfficeDays, averageOfficePercentage, bestWeeks } =
			evaluateWindow(windowWeeks);

		if (!isValid) {
			const evaluatedWeekStarts = bestWeeks.map((w) => w.weekStart.getTime());
			const windowWeekStarts = windowWeeks.map((w) => w.weekStart.getTime());
			const invalidWeek = bestWeeks[bestWeeks.length - 1];
			const invalidWeekStart = invalidWeek?.weekStart.getTime() ?? null;
			const windowWeek = weeksData[windowStart];
			const windowStartTimestamp = windowWeek?.weekStart.getTime() ?? null;

			return {
				isValid: false,
				message: `Not compliant: Best ${weeksToEvaluate} of ${windowSize} weeks average ${averageOfficeDays.toFixed(1)} office days. Required: ${policy.minOfficeDaysPerWeek}`,
				overallCompliance: averageOfficePercentage,
				evaluatedWeekStarts,
				windowWeekStarts,
				invalidWeekStart,
				windowStart: windowStartTimestamp,
			};
		}
	}

	// All windows valid — return the last window
	const lastWindowStart = Math.max(0, weeksData.length - windowSize);
	const lastWindowWeeks = weeksData.slice(
		lastWindowStart,
		lastWindowStart + windowSize,
	);
	const { averageOfficeDays, averageOfficePercentage, bestWeeks } =
		evaluateWindow(lastWindowWeeks);
	const evaluatedWeekStarts = bestWeeks.map((w) => w.weekStart.getTime());
	const windowWeekStarts = lastWindowWeeks.map((w) => w.weekStart.getTime());
	const lastWindowWeek = weeksData[lastWindowStart];
	const windowStartTimestamp = lastWindowWeek?.weekStart.getTime() ?? null;

	return {
		isValid: true,
		message: `Compliant: Best ${weeksToEvaluate} of ${windowSize} weeks average ${averageOfficeDays.toFixed(1)} office days. Required: ${policy.minOfficeDaysPerWeek}`,
		overallCompliance: averageOfficePercentage,
		evaluatedWeekStarts,
		windowWeekStarts,
		invalidWeekStart: null,
		windowStart: windowStartTimestamp,
	};
}
