/**
 * Compliance data computation
 *
 * Pure computation logic for transforming window evaluation results
 * into ComplianceEventData. Extracted from auto-compliance to keep
 * the EventQueue and initialization concerns separate from data computation.
 *
 * @module compute-compliance
 */

import type { WeekInfo } from "../types/index";
import { convertWeeksToCompliance } from "./calendar-data-reader";
import { buildWindowRangeLabel } from "./ui/windowRange";
import type { WindowSummary } from "./validation/all-windows";
import { FRIDAY_OFFSET } from "./validation/constants";
import type { RTOPolicyConfig } from "./validation/rto-core";
import {
	buildComplianceMessage,
	evaluateSingleWindow,
	getStartOfWeek,
} from "./validation/rto-core";
import type { WindowEvaluationResult } from "./validation/window-evaluation";

// ─── Public Types ───────────────────────────────────────────────────

export interface ComplianceEventData {
	/** The exact same WindowSummary object that Explorer uses — guarantees matching date ranges */
	selectedSummary: WindowSummary;
	/** Number of best weeks evaluated (up to BEST_WEEKS_COUNT) */
	bestWeekCount: number;
	/** Average office days across best weeks */
	averageOfficeDays: number;
	/** Weeks with >= REQUIRED_OFFICE_DAYS in the window */
	goodWeeks: number;
	/** Droppable slots minus non-compliant dropped weeks */
	bufferWeeks: number;
	/** Earliest dropped-compliant week that can be taken as full WFH */
	nextWfhWeek: Date | null;

	/** Current (possibly incomplete) week, shown separately */
	currentWeek: { weekStart: Date; weekEnd: Date; officeDays: number };

	/** Raw day counts from full window */
	totalWfhDays: number;
	totalHolidayDays: number;
	totalSickDays: number;
	totalWorkingDays: number;

	/** Overall compliance summary */
	isCompliant: boolean;
	compliancePercentage: number;
	message: string;

	/** Human-readable date range label for the window */
	rangeLabel: string;

	/** Whether percentage rounding is enabled */
	roundPercentage: boolean;

	/** Policy settings used for compliance calculation */
	totalWeeks: number;
	requiredDays: number;

	/** All window summaries from evaluateAllWindows - for Explorer rendering */
	allSummaries: WindowSummary[];
	/** Policy configuration used for evaluation */
	policy: RTOPolicyConfig;
}

// ─── Helper Functions ────────────────────────────────────────────────

/**
 * Check if a week is complete (has passed its Friday).
 *
 * @param weekStart - The start date of the week
 * @returns True if the week's Friday has already passed
 */
function isWeekComplete(weekStart: Date): boolean {
	const friday = new Date(weekStart);
	friday.setDate(friday.getDate() + FRIDAY_OFFSET);
	const today = new Date();
	today.setHours(23, 59, 59, 999);
	return friday <= today;
}

/**
 * Build a set of week timestamps that appear in the best-K of at least one
 * sliding window. A week NOT in this set is safe to zero out — it's already
 * dropped in every window that contains it.
 */
function buildEvaluatedSet(
	allWeeks: WeekInfo[],
	policy: RTOPolicyConfig,
): Set<number> {
	const evaluated = new Set<number>();
	const W = policy.rollingPeriodWeeks;
	const weeks = convertWeeksToCompliance(allWeeks);

	if (weeks.length < W) {
		for (const w of evaluateSingleWindow(weeks, policy).bestWeeks) {
			evaluated.add(w.weekStart.getTime());
		}
		return evaluated;
	}

	for (let start = 0; start <= weeks.length - W; start++) {
		const windowWeeks = weeks.slice(start, start + W);
		for (const w of evaluateSingleWindow(windowWeeks, policy).bestWeeks) {
			evaluated.add(w.weekStart.getTime());
		}
	}

	return evaluated;
}

/**
 * Find the earliest future week that can safely be taken as full WFH.
 * A week is safe iff: it's in the future, currently compliant, and NOT in the
 * evaluated set (i.e., it's already dropped in every sliding window containing it).
 *
 * Returns null if not currently compliant or no safe week exists.
 */
function findNextSafeWfhWeek(
	allWeeks: WeekInfo[],
	policy: RTOPolicyConfig,
	isCompliant: boolean,
): Date | null {
	if (!isCompliant) {
		return null;
	}

	const evaluated = buildEvaluatedSet(allWeeks, policy);
	const today = new Date();
	today.setHours(0, 0, 0, 0);

	const candidates = allWeeks
		.filter(
			(w) =>
				w.weekStart > today &&
				w.officeDays >= policy.minOfficeDaysPerWeek &&
				!evaluated.has(w.weekStart.getTime()),
		)
		.sort((a, b) => a.weekStart.getTime() - b.weekStart.getTime());

	return candidates[0]?.weekStart ?? null;
}

// ─── Core Computation ────────────────────────────────────────────────

/**
 * Compute compliance event data from a window evaluation result.
 *
 * This is the main computation function that transforms raw window evaluation
 * results into the structured ComplianceEventData used by the UI.
 *
 * @param evaluation - The window evaluation result
 * @returns Structured compliance data for UI consumption
 */
export function computeComplianceData(
	evaluation: WindowEvaluationResult,
): ComplianceEventData {
	const { summaries, policy, allWeeks, filteredWeeks } = evaluation;

	// Identify current incomplete week for display, but include ALL weeks
	// (including future) in validation so marking future months triggers violations
	const currentWeekInfo = allWeeks.find((w) => !isWeekComplete(w.weekStart));

	// Select the window to show in Breakdown:
	// - If any window is invalid: use the FIRST failing window
	// - If all windows are valid: use the FIRST (earliest) window
	// Edge case: no weeks → no summaries
	if (summaries.length === 0) {
		const now = new Date();
		const currentWeekStart = getStartOfWeek(now);
		const currentWeekEnd = new Date(currentWeekStart);
		currentWeekEnd.setDate(currentWeekStart.getDate() + FRIDAY_OFFSET);

		// Build an empty sentinel summary for the no-data case
		const emptySummary: WindowSummary = {
			windowIndex: 0,
			windowStart: currentWeekStart,
			windowEnd: currentWeekEnd,
			isValid: true,
			averageOfficeDays: 0,
			weekDetails: [],
		};

		return {
			selectedSummary: emptySummary,
			bestWeekCount: 0,
			averageOfficeDays: 0,
			goodWeeks: 0,
			bufferWeeks: 0,
			nextWfhWeek: null,
			rangeLabel: "",
			currentWeek: {
				weekStart: currentWeekStart,
				weekEnd: currentWeekEnd,
				officeDays: currentWeekInfo?.officeDays ?? 0,
			},
			totalWfhDays: 0,
			totalHolidayDays: 0,
			totalSickDays: 0,
			totalWorkingDays: 0,
			isCompliant: true,
			compliancePercentage: 0,
			message: "No weeks data available",
			roundPercentage: policy.roundPercentage ?? true,
			totalWeeks: policy.rollingPeriodWeeks,
			requiredDays: policy.minOfficeDaysPerWeek,
			allSummaries: [],
			policy,
		};
	}

	const firstFailing = summaries.find((s) => !s.isValid);
	const firstSummary = summaries[0];
	if (!firstSummary) {
		throw new Error(
			"No windows available after evaluateAllWindows — empty result",
		);
	}
	const selectedSummary: WindowSummary = firstFailing ?? firstSummary;

	// Get the selected window's week starts for matching with original WeekInfo data
	const selectedWeekStarts = new Set(
		selectedSummary.weekDetails.map((w) => w.weekStart.getTime()),
	);

	// Aggregate stats from original WeekInfo objects that match the selected window
	const windowWeekInfos = filteredWeeks.filter((w) =>
		selectedWeekStarts.has(w.weekStart.getTime()),
	);

	// Stats over best weeks
	const bestDetails = selectedSummary.weekDetails.filter((w) => w.isBest);
	const bestCount = bestDetails.length;
	const totalOfficeDays = bestDetails.reduce((sum, w) => sum + w.officeDays, 0);
	const averageOfficeDays = bestCount > 0 ? totalOfficeDays / bestCount : 0;

	// goodWeeks = weeks with >= REQUIRED_OFFICE_DAYS in all window weeks
	const goodWeeksInWindow = selectedSummary.weekDetails.filter(
		(w) => w.isCompliant,
	).length;
	// bufferWeeks = droppable slots minus slots used by non-compliant weeks
	const droppableSlots = Math.max(
		0,
		selectedSummary.weekDetails.length - policy.topWeeksToCheck,
	);
	const droppedNonCompliant = selectedSummary.weekDetails.filter(
		(w) => !w.isBest && !w.isCompliant,
	).length;
	const bufferWeeks = Math.max(0, droppableSlots - droppedNonCompliant);

	// Overall compliance: ALL windows must be valid for the user to be compliant
	const isCompliant = summaries.every((s) => s.isValid);

	// Find the earliest future week safe for full WFH using evaluated-set algorithm
	const nextWfhWeek = findNextSafeWfhWeek(filteredWeeks, policy, isCompliant);

	// Day counts from window weeks — use original WeekInfo for OOF/holiday/sick
	let totalWfhDays = 0;
	let totalHolidayDays = 0;
	let totalSickDays = 0;
	for (const w of windowWeekInfos) {
		totalWfhDays += w.oofCount;
		totalHolidayDays += w.holidayCount;
		totalSickDays += w.sickCount;
	}
	const totalWeekdays = windowWeekInfos.length * 5;
	const totalWorkingDays =
		totalWeekdays - totalWfhDays - totalHolidayDays - totalSickDays;

	// Current week
	const now = new Date();
	const currentWeekStart = getStartOfWeek(now);
	const currentWeekEnd = new Date(currentWeekStart);
	currentWeekEnd.setDate(currentWeekStart.getDate() + FRIDAY_OFFSET);

	const currentWeek = {
		weekStart: currentWeekStart,
		weekEnd: currentWeekEnd,
		officeDays: currentWeekInfo?.officeDays ?? 0,
	};

	const compliancePercentage =
		bestCount > 0
			? (bestDetails.filter((w) => w.isCompliant).length / bestCount) * 100
			: 0;

	// Build a human-readable message from the selected summary
	const { avgDaysStr, indicator, label } = buildComplianceMessage(
		selectedSummary.averageOfficeDays,
		selectedSummary.isValid,
		policy.roundPercentage,
	);
	const message = `${label}: Best ${bestCount} of ${selectedSummary.weekDetails.length} weeks average${indicator} ${avgDaysStr} office days. Required: ${policy.minOfficeDaysPerWeek}`;

	return {
		selectedSummary,
		bestWeekCount: bestCount,
		averageOfficeDays,
		goodWeeks: goodWeeksInWindow,
		bufferWeeks,
		nextWfhWeek,
		rangeLabel: buildWindowRangeLabel(selectedSummary.weekDetails),
		currentWeek,
		totalWfhDays,
		totalHolidayDays,
		totalSickDays,
		totalWorkingDays,
		isCompliant,
		compliancePercentage,
		message,
		roundPercentage: policy.roundPercentage ?? true,
		totalWeeks: policy.rollingPeriodWeeks,
		requiredDays: policy.minOfficeDaysPerWeek,
		allSummaries: summaries,
		policy,
	};
}
