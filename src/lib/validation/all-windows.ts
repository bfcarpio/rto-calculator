/**
 * All-Windows Evaluation
 *
 * Slides through every possible window and returns annotated summaries
 * for the WindowExplorer component.
 */

import type { RTOPolicyConfig, WeekCompliance } from "./rto-core";
import { evaluateSingleWindow } from "./rto-core";

export interface WindowWeekDetail {
	weekStart: Date;
	officeDays: number;
	isBest: boolean;
	isCompliant: boolean;
}

export interface WindowSummary {
	windowIndex: number;
	windowStart: Date;
	windowEnd: Date;
	isValid: boolean;
	averageOfficeDays: number;
	weekDetails: WindowWeekDetail[];
}

/**
 * Evaluate all sliding windows and return annotated summaries.
 *
 * For N weeks with window size W, produces max(0, N - W + 1) summaries
 * (or 1 summary for partial windows where N < W and N > 0).
 */
export function evaluateAllWindows(
	weeksData: WeekCompliance[],
	policy: RTOPolicyConfig,
): WindowSummary[] {
	if (weeksData.length === 0) return [];

	const W = policy.rollingPeriodWeeks;

	// Partial window: fewer weeks than window size
	if (weeksData.length < W) {
		return [buildSummary(0, weeksData, policy)];
	}

	const summaries: WindowSummary[] = [];
	for (let i = 0; i <= weeksData.length - W; i++) {
		const windowWeeks = weeksData.slice(i, i + W);
		summaries.push(buildSummary(i, windowWeeks, policy));
	}
	return summaries;
}

function buildSummary(
	index: number,
	windowWeeks: WeekCompliance[],
	policy: RTOPolicyConfig,
): WindowSummary {
	const { isValid, averageOfficeDays, bestWeeks } = evaluateSingleWindow(
		windowWeeks,
		policy,
	);
	const bestSet = new Set(bestWeeks.map((w) => w.weekStart.getTime()));
	const firstWeek = windowWeeks[0];
	const lastWeek = windowWeeks[windowWeeks.length - 1];
	if (!firstWeek || !lastWeek) throw new Error("empty windowWeeks");
	const windowEnd = new Date(lastWeek.weekStart);
	windowEnd.setDate(windowEnd.getDate() + 4); // Friday

	return {
		windowIndex: index,
		windowStart: firstWeek.weekStart,
		windowEnd,
		isValid,
		averageOfficeDays,
		weekDetails: windowWeeks.map((w) => ({
			weekStart: w.weekStart,
			officeDays: w.officeDays,
			isBest: bestSet.has(w.weekStart.getTime()),
			isCompliant:
				(policy.roundPercentage ? Math.round(w.officeDays) : w.officeDays) >=
				policy.minOfficeDaysPerWeek,
		})),
	};
}
