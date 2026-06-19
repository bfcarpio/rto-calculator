/**
 * Window Evaluation Pipeline
 *
 * Single entry point for computing all sliding window summaries from a calendar
 * instance. Eliminates the duplicated pipeline between WindowExplorer and
 * auto-compliance.
 *
 * @module window-evaluation
 */

import type { CalendarInstance } from "../../../packages/datepainter/src/types";
import type { WeekInfo } from "../../types/index";
import {
	convertWeeksToCompliance,
	readCalendarData,
} from "../calendar-data-reader";
import type { AppSettings } from "../settings-constants";
import { settingsStore } from "../stores/settingsStore";
import { evaluateAllWindows, type WindowSummary } from "./all-windows";
import { DEFAULT_RTO_POLICY, type RTOPolicyConfig } from "./rto-core";

export interface WindowEvaluationResult {
	/** All sliding window summaries */
	summaries: WindowSummary[];
	/** The RTOPolicyConfig used for evaluation */
	policy: RTOPolicyConfig;
	/** Unfiltered weeks from calendar (before startingWeek filter) */
	allWeeks: WeekInfo[];
	/** Weeks after startingWeek filter applied */
	filteredWeeks: WeekInfo[];
}

/**
 * Build an RTOPolicyConfig from explicit settings.
 *
 * Pure function: same input always produces the same output.
 * Replaces the old readSettings-based buildPolicyFromSettings().
 */
export function buildPolicyFromSettings(
	settings: AppSettings,
): RTOPolicyConfig {
	return {
		...DEFAULT_RTO_POLICY,
		minOfficeDaysPerWeek: settings.minOfficeDays,
		rollingPeriodWeeks: settings.rollingWindowWeeks,
		topWeeksToCheck: settings.bestWeeksCount,
		roundPercentage: settings.roundPercentage,
	};
}

/**
 * Compute all window summaries from a calendar instance.
 *
 * Reads calendar data, applies the startingWeek filter, builds the policy,
 * and evaluates all sliding windows — returning everything both consumers
 * need in a single call.
 *
 * @param calendarManager - The datepainter calendar instance
 * @returns All window summaries, policy, and week data
 */
export async function computeWindowEvaluation(
	calendarManager: CalendarInstance,
): Promise<WindowEvaluationResult> {
	const calendarData = await readCalendarData(calendarManager);
	const settings = settingsStore.get();

	const allWeeks = calendarData.weeks;
	let filteredWeeks = allWeeks;

	if (settings.startingWeek) {
		const startDate = new Date(`${settings.startingWeek}T00:00:00`);
		const startIdx = allWeeks.findIndex((w) => w.weekStart >= startDate);
		if (startIdx > 0) {
			filteredWeeks = allWeeks.slice(startIdx);
		}
	}

	const policy = buildPolicyFromSettings(settings);
	const weeksForValidation = convertWeeksToCompliance(filteredWeeks);
	const summaries = evaluateAllWindows(weeksForValidation, policy);

	return { summaries, policy, allWeeks, filteredWeeks };
}
