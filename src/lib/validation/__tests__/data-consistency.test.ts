/**
 * Data Consistency Tests
 *
 * Verifies that the two evaluation paths — evaluateAllWindows (per-window
 * summaries) and validateSlidingWindow (overall compliance) — produce
 * consistent results for the same input data.
 *
 * These are NOT unit tests for individual functions (those already exist).
 * They are consistency checks that catch divergence between the two paths,
 * which both ultimately derive from evaluateSingleWindow but via different
 * call sites and consumers.
 */

import { describe, expect, it } from "vitest";
import {
	makeSchedule,
	makeWeeks,
} from "../../../utils/astro/__tests__/testHelpers";
import { fmtShort } from "../../dateUtils";
import { buildWindowEnd, buildWindowRangeLabel } from "../../ui/windowRange";
import { evaluateAllWindows } from "../all-windows";
import {
	DEFAULT_RTO_POLICY,
	evaluateSingleWindow,
	getStartOfWeek,
	type RTOPolicyConfig,
	validateSlidingWindow,
	type WeekCompliance,
} from "../rto-core";

// ─── Helpers ──────────────────────────────────────────────────────

const START = new Date(2025, 0, 5); // Sunday Jan 5 2025

// ─── Tests ────────────────────────────────────────────────────────

describe("Data consistency: evaluateAllWindows vs validateSlidingWindow", () => {
	it("every WindowSummary.isValid is a boolean", () => {
		const weeks = makeSchedule(START, [8, 5], [4, 1]);
		const result = evaluateAllWindows(weeks, DEFAULT_RTO_POLICY);

		for (const summary of result) {
			expect(typeof summary.isValid).toBe("boolean");
		}
	});

	it("all windows valid implies validateSlidingWindow returns valid", () => {
		// All weeks have 5 office days → every window is valid
		const weeks = makeWeeks(START, 12, 5);
		const summaries = evaluateAllWindows(weeks, DEFAULT_RTO_POLICY);

		const allValid = summaries.every((s) => s.isValid);
		expect(allValid).toBe(true);

		const overall = validateSlidingWindow(weeks, DEFAULT_RTO_POLICY);
		expect(overall.isValid).toBe(true);
	});

	it("any window invalid implies validateSlidingWindow returns invalid", () => {
		// 10 weeks at 0 office days, then 5 at 5.
		// Early windows contain too many zeros for best-8 to compensate → fail.
		const weeks = makeSchedule(START, [10, 0], [5, 5]);
		const summaries = evaluateAllWindows(weeks, DEFAULT_RTO_POLICY);

		const anyInvalid = summaries.some((s) => !s.isValid);
		expect(anyInvalid).toBe(true);

		const overall = validateSlidingWindow(weeks, DEFAULT_RTO_POLICY);
		expect(overall.isValid).toBe(false);
	});

	it("each WindowSummary.isValid matches evaluateSingleWindow on its slice", () => {
		// Varied schedule so some windows pass and some fail
		const weeks = makeSchedule(START, [5, 0], [7, 5], [3, 2]);
		const summaries = evaluateAllWindows(weeks, DEFAULT_RTO_POLICY);
		const W = DEFAULT_RTO_POLICY.rollingPeriodWeeks;

		for (const summary of summaries) {
			const slice = weeks.slice(summary.windowIndex, summary.windowIndex + W);
			const { isValid } = evaluateSingleWindow(slice, DEFAULT_RTO_POLICY);
			expect(summary.isValid).toBe(isValid);
		}
	});

	it("per-week isCompliant matches officeDays >= minOfficeDaysPerWeek", () => {
		const weeks = makeSchedule(START, [6, 5], [6, 2]);
		const summaries = evaluateAllWindows(weeks, DEFAULT_RTO_POLICY);

		for (const summary of summaries) {
			for (const detail of summary.weekDetails) {
				const expected =
					detail.officeDays >= DEFAULT_RTO_POLICY.minOfficeDaysPerWeek;
				expect(detail.isCompliant).toBe(expected);
			}
		}
	});

	it("per-week isCompliant with rounding uses Math.round(officeDays)", () => {
		const policyWithRounding: RTOPolicyConfig = {
			...DEFAULT_RTO_POLICY,
			roundPercentage: true,
		};

		// Weeks with fractional office days (rare but possible with holidays)
		const weeks: WeekCompliance[] = [];
		const officeDaysValues = [2.4, 2.6, 3, 2.4, 2.6, 3, 3, 3, 3, 3, 3, 3];
		for (let i = 0; i < officeDaysValues.length; i++) {
			const ws = new Date(START);
			ws.setDate(START.getDate() + i * 7);
			const od = officeDaysValues[i]!;
			weeks.push({
				weekNumber: i + 1,
				weekStart: ws,
				officeDays: od,
				totalDays: 5,
				oofDays: 5 - od,
				wfhDays: 5 - od,
				isCompliant: Math.round(od) >= policyWithRounding.minOfficeDaysPerWeek,
				status:
					Math.round(od) >= policyWithRounding.minOfficeDaysPerWeek
						? "compliant"
						: "violation",
			});
		}

		const summaries = evaluateAllWindows(weeks, policyWithRounding);

		for (const summary of summaries) {
			for (const detail of summary.weekDetails) {
				const expected =
					Math.round(detail.officeDays) >=
					policyWithRounding.minOfficeDaysPerWeek;
				expect(detail.isCompliant).toBe(expected);
			}
		}
	});

	it("validateSlidingWindow agrees with all-windows aggregate across varied schedules", () => {
		// Test several schedules, each with a different compliance profile
		const schedules: [string, [count: number, officeDays: number][]][] = [
			["all compliant", [[12, 5]]],
			["all non-compliant", [[12, 0]]],
			[
				"mixed",
				[
					[8, 5],
					[4, 1],
				],
			],
			[
				"borderline",
				[
					[8, 3],
					[4, 2],
				],
			],
			[
				"mostly compliant",
				[
					[10, 5],
					[2, 0],
				],
			],
		];

		for (const [_label, segments] of schedules) {
			const weeks = makeSchedule(START, ...segments);
			const summaries = evaluateAllWindows(weeks, DEFAULT_RTO_POLICY);
			const overall = validateSlidingWindow(weeks, DEFAULT_RTO_POLICY);

			const allValid = summaries.every((s) => s.isValid);
			if (allValid) {
				expect(overall.isValid).toBe(true);
			} else {
				// When evaluateAllWindows reports any invalid window,
				// validateSlidingWindow must also find a violation
				expect(overall.isValid).toBe(false);
			}
		}
	});

	it("partial window: evaluateAllWindows and validateSlidingWindow agree", () => {
		// Fewer weeks than window size
		const weeks = makeWeeks(START, 5, 4);
		const summaries = evaluateAllWindows(weeks, DEFAULT_RTO_POLICY);
		const overall = validateSlidingWindow(weeks, DEFAULT_RTO_POLICY);

		expect(summaries).toHaveLength(1);
		expect(summaries[0]!.isValid).toBe(overall.isValid);
	});

	it("non-default policy: consistency holds with different thresholds", () => {
		const strictPolicy: RTOPolicyConfig = {
			...DEFAULT_RTO_POLICY,
			minOfficeDaysPerWeek: 4,
		};

		const weeks = makeSchedule(START, [8, 5], [4, 3]);
		const summaries = evaluateAllWindows(weeks, strictPolicy);
		const overall = validateSlidingWindow(weeks, strictPolicy);

		const allValid = summaries.every((s) => s.isValid);
		if (allValid) {
			expect(overall.isValid).toBe(true);
		} else {
			expect(overall.isValid).toBe(false);
		}
	});
});

// ─── Range Label & Timezone Consistency ─────────────────────────────

describe("Range label and timezone consistency", () => {
	it("buildWindowRangeLabel produces the same string for WeekCompliance[] and WindowWeekDetail-like arrays", () => {
		// Both WeekCompliance and WindowWeekDetail satisfy {weekStart: Date} structurally.
		// buildWindowRangeLabel should produce identical output for the same weekStart dates.
		const weeks = makeWeeks(START, 12, 4);

		// Simulate WindowWeekDetail shape (only weekStart matters for the label)
		const detailLike: Array<{ weekStart: Date }> = weeks.map((w) => ({
			weekStart: w.weekStart,
		}));

		const labelFromCompliance = buildWindowRangeLabel(weeks);
		const labelFromDetail = buildWindowRangeLabel(detailLike);

		expect(labelFromCompliance).toBe(labelFromDetail);
	});

	it("weekStart dates from getStartOfWeek always display as Sunday", () => {
		// Test dates across different days of the week and months
		const testDates = [
			new Date(2025, 0, 6), // Monday Jan 6
			new Date(2025, 1, 14), // Friday Feb 14
			new Date(2025, 2, 1), // Saturday Mar 1
			new Date(2025, 3, 20), // Sunday Apr 20 (already Sunday)
			new Date(2025, 5, 30), // Monday Jun 30
			new Date(2025, 11, 25), // Thursday Dec 25
		];

		for (const date of testDates) {
			const weekStart = getStartOfWeek(date);
			expect(weekStart.getDay()).toBe(0); // Sunday = 0
		}
	});

	it("buildWindowRangeLabel and buildWindowEnd produce consistent results", () => {
		const weeks = makeWeeks(START, 12, 4);
		const label = buildWindowRangeLabel(weeks);

		const firstWeek = weeks[0];
		if (!firstWeek) throw new Error("empty weeks array");
		const windowEnd = buildWindowEnd(weeks);
		if (!windowEnd)
			throw new Error("buildWindowEnd returned null for non-empty weeks");

		const expectedLabel = `${fmtShort(firstWeek.weekStart)} – ${fmtShort(windowEnd)}`;
		expect(label).toBe(expectedLabel);
	});

	it("buildWindowRangeLabel produces consistent labels across evaluateAllWindows summaries", () => {
		const weeks = makeSchedule(START, [8, 5], [4, 1]);
		const summaries = evaluateAllWindows(weeks, DEFAULT_RTO_POLICY);

		for (const summary of summaries) {
			// The label built from weekDetails must match the manually constructed label
			const label = buildWindowRangeLabel(summary.weekDetails);

			const firstDetail = summary.weekDetails[0];
			if (!firstDetail) continue;

			const windowEnd = buildWindowEnd(summary.weekDetails);
			if (!windowEnd) continue;

			const expectedLabel = `${fmtShort(firstDetail.weekStart)} – ${fmtShort(windowEnd)}`;
			expect(label).toBe(expectedLabel);
		}
	});
});
