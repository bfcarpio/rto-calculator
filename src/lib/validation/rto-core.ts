/**
 * RTO Validation Library
 *
 * Core validation logic for RTO (Return to Office) compliance checking.
 * Provides the sliding window validation that evaluates all 12-week windows
 * across the calendar, using best-8-of-12 policy.
 */

import { getFullWeekDates, getStartOfWeek, isWeekday } from "../dateUtils";
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
	roundPercentage?: boolean;
	weekendBonus?: boolean;
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

/** Round to nearest 20% (represents whole days in a 5-day week) */
export function roundToNearest20Percent(value: number): number {
	return Math.round(value / 20) * 20;
}

// ==================== Compliance Message Builder ====================

/**
 * Build the common parts of a compliance message.
 *
 * Extracts the repeated logic of computing avgDaysStr, indicator,
 * and label that appears in every compliance message throughout the codebase.
 *
 * @param averageDays - The average office days value
 * @param isCompliant - Whether the result is compliant
 * @param roundPercentage - Whether to round the percentage display
 * @returns The formatted message components
 */
export interface ComplianceMessageParts {
	avgDaysStr: string;
	indicator: string;
	label: string;
}

export function buildComplianceMessage(
	averageDays: number,
	isCompliant: boolean,
	roundPercentage?: boolean,
): ComplianceMessageParts {
	const avgDaysStr =
		roundPercentage !== false
			? `${Math.round(averageDays)}`
			: `${averageDays.toFixed(1)}`;
	const indicator = roundPercentage !== false ? " (rounded)" : "";
	const label = isCompliant ? "Compliant" : "Not compliant";
	return { avgDaysStr, indicator, label };
}

// ==================== Date Utilities ====================
// Note: getStartOfWeek, isWeekday, and getFullWeekDates are now canonical
// in src/lib/dateUtils.ts. They are imported above for use in this module.
// Re-exported here for backward compatibility with consumers that import
// from this module.

export { getFullWeekDates, getStartOfWeek, isWeekday } from "../dateUtils";

/**
 * Snap a date forward to the next Sunday (or return same Sunday if already Sunday).
 * Use getStartOfWeek() for the current week's Sunday.
 */
export function snapToWeekStart(date: Date): Date {
	const d = new Date(date.getTime());
	const day = d.getDay();
	const daysToAdd = day === 0 ? 0 : 7 - day; // Same Sunday or next Sunday
	d.setDate(d.getDate() + daysToAdd);
	d.setHours(0, 0, 0, 0);
	return d;
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

// elementToDaySelection has been moved to src/lib/dom-adapters.ts
// to keep this module free of DOM dependencies.
// Import from dom-adapters for backward compatibility:
//   import { elementToDaySelection } from '../dom-adapters';

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

	const weekDates = getFullWeekDates(weekStart);
	const holidaySet = new Set(holidayDates.map((d) => d.getTime()));
	const holidayCount = weekDates
		.filter((d) => isWeekday(d))
		.filter((d) => holidaySet.has(d.getTime())).length;

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

	const weekDates = getFullWeekDates(weekStart);
	const holidaySet = new Set(holidayDates.map((d) => d.getTime()));
	const holidayCount = weekDates
		.filter((d) => isWeekday(d))
		.filter((d) => holidaySet.has(d.getTime())).length;

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

export function validateTopKWeeks(
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

	const windowStartDate = snapToWeekStart(calendarStartDate);
	const weeksData: WeekCompliance[] = [];

	for (let week = 0; week < policy.rollingPeriodWeeks; week++) {
		const ws = new Date(windowStartDate);
		ws.setDate(windowStartDate.getDate() + week * 7);
		const weekData = calculateWeekCompliance(week + 1, ws, weeksByOOF, policy);
		weeksData.push(weekData);
	}

	const topKWeeks = weeksData.slice(0, policy.topWeeksToCheck);
	const totalOfficeDays = topKWeeks.reduce(
		(sum, week) => sum + week.officeDays,
		0,
	);
	const totalWeekdays = topKWeeks.reduce(
		(sum, week) => sum + week.totalDays,
		0,
	);
	const averageOfficeDays = totalOfficeDays / policy.topWeeksToCheck;
	const rawPercentage =
		totalWeekdays > 0 ? (totalOfficeDays / totalWeekdays) * 100 : 100;
	const averageOfficePercentage =
		policy.roundPercentage !== false
			? roundToNearest20Percent(rawPercentage)
			: rawPercentage;
	const requiredAverage = policy.minOfficeDaysPerWeek;
	const requiredPercentage =
		(policy.minOfficeDaysPerWeek / policy.totalWeekdaysPerWeek) * 100;
	const requiredAveragePercentage = policy.thresholdPercentage * 100;

	const isValid = rawPercentage >= requiredAveragePercentage;

	const percentageStr =
		policy.roundPercentage !== false
			? `${averageOfficePercentage.toFixed(0)}%`
			: `${rawPercentage.toFixed(1)}%`;

	const { avgDaysStr, indicator } = buildComplianceMessage(
		averageOfficeDays,
		isValid,
		policy.roundPercentage,
	);
	const label = isValid ? "Compliant" : "Not compliant";
	const message = `${label}: Top ${policy.topWeeksToCheck} weeks average${indicator} ${avgDaysStr} office days (${percentageStr}) of ${totalWeekdays} weekdays. Required: ${requiredAverage} days (${requiredPercentage}%)`;

	return {
		isValid,
		message,
		averageOfficeDays,
		averageOfficePercentage,
		requiredAverage: policy.thresholdPercentage,
		requiredPercentage,
		weeksData: topKWeeks,
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
	const windowStartDate = getStartOfWeek(calendarStartDate);
	const weekDiff = Math.round(
		(weekStart.getTime() - windowStartDate.getTime()) /
			(7 * 24 * 60 * 60 * 1000),
	);
	return weekDiff >= 0 && weekDiff < policy.topWeeksToCheck;
}

// ==================== Single Window Evaluation ====================

export interface SingleWindowEvaluation {
	isValid: boolean;
	averageOfficeDays: number;
	averageOfficePercentage: number;
	bestWeeks: WeekCompliance[];
}

/**
 * Evaluate a single window of weeks using the best-K selection algorithm.
 * Sorts weeks by office days (descending), picks top K, and checks if
 * the average meets the minimum requirement.
 */
export function evaluateSingleWindow(
	windowWeeks: WeekCompliance[],
	policy: RTOPolicyConfig,
): SingleWindowEvaluation {
	const sorted = [...windowWeeks].sort(
		(a, b) =>
			b.officeDays - a.officeDays ||
			b.weekStart.getTime() - a.weekStart.getTime(),
	);
	// For partial windows (< W weeks), evaluate all available weeks
	const evalCount = Math.min(policy.topWeeksToCheck, sorted.length);
	const bestWeeks = sorted.slice(0, evalCount);

	const totalOfficeDays = bestWeeks.reduce(
		(sum, week) => sum + week.officeDays,
		0,
	);
	const averageOfficeDays = evalCount > 0 ? totalOfficeDays / evalCount : 0;
	const totalDays = bestWeeks.reduce((sum, week) => sum + week.totalDays, 0);
	const rawPercentage = totalDays > 0 ? (totalOfficeDays / totalDays) * 100 : 0;
	const averageOfficePercentage =
		policy.roundPercentage !== false
			? roundToNearest20Percent(rawPercentage)
			: rawPercentage;

	// Primary check: when rounding is enabled, use the rounded percentage for
	// consistency with display. This handles edge cases like 55% raw rounding
	// to 60% — the window should pass when rounded >= threshold.
	// Without rounding, use raw days for accuracy (handles holiday weeks correctly).
	const requiredAveragePercentage = policy.thresholdPercentage * 100;
	const isValid = policy.roundPercentage
		? averageOfficePercentage >= requiredAveragePercentage
		: averageOfficeDays >= policy.minOfficeDaysPerWeek;

	return { isValid, averageOfficeDays, averageOfficePercentage, bestWeeks };
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
	let message: string;

	// If fewer weeks than a full window, evaluate as a single partial window
	if (weeksData.length > 0 && weeksData.length < windowSize) {
		const { isValid, averageOfficeDays, averageOfficePercentage, bestWeeks } =
			evaluateSingleWindow(weeksData, policy);
		const evaluatedWeekStarts = bestWeeks.map((w) => w.weekStart.getTime());
		const windowWeekStarts = weeksData.map((w) => w.weekStart.getTime());
		const windowStartTimestamp = weeksData[0]?.weekStart.getTime() ?? null;

		const { avgDaysStr, indicator, label } = buildComplianceMessage(
			averageOfficeDays,
			isValid,
			policy.roundPercentage,
		);
		message = `${label}: Best ${bestWeeks.length} of ${weeksData.length} weeks average${indicator} ${avgDaysStr} office days. Required: ${policy.minOfficeDaysPerWeek}`;
		return {
			isValid,
			message,
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
			evaluateSingleWindow(windowWeeks, policy);

		if (!isValid) {
			const evaluatedWeekStarts = bestWeeks.map((w) => w.weekStart.getTime());
			const windowWeekStarts = windowWeeks.map((w) => w.weekStart.getTime());
			const invalidWeek = bestWeeks[bestWeeks.length - 1];
			const invalidWeekStart = invalidWeek?.weekStart.getTime() ?? null;
			const windowWeek = weeksData[windowStart];
			const windowStartTimestamp = windowWeek?.weekStart.getTime() ?? null;

			const { avgDaysStr, indicator, label } = buildComplianceMessage(
				averageOfficeDays,
				false,
				policy.roundPercentage,
			);
			message = `${label}: Best ${weeksToEvaluate} of ${windowSize} weeks average${indicator} ${avgDaysStr} office days. Required: ${policy.minOfficeDaysPerWeek}`;
			return {
				isValid: false,
				message,
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
		evaluateSingleWindow(lastWindowWeeks, policy);
	const evaluatedWeekStarts = bestWeeks.map((w) => w.weekStart.getTime());
	const windowWeekStarts = lastWindowWeeks.map((w) => w.weekStart.getTime());
	const lastWindowWeek = weeksData[lastWindowStart];
	const windowStartTimestamp = lastWindowWeek?.weekStart.getTime() ?? null;

	const { avgDaysStr, indicator, label } = buildComplianceMessage(
		averageOfficeDays,
		true,
		policy.roundPercentage,
	);
	message = `${label}: Best ${weeksToEvaluate} of ${windowSize} weeks average${indicator} ${avgDaysStr} office days. Required: ${policy.minOfficeDaysPerWeek}`;
	return {
		isValid: true,
		message,
		overallCompliance: averageOfficePercentage,
		evaluatedWeekStarts,
		windowWeekStarts,
		invalidWeekStart: null,
		windowStart: windowStartTimestamp,
	};
}
