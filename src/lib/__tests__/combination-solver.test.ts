/**
 * Combination Solver Tests
 *
 * Tests for WFH combination analysis functions including:
 * - Total combo count matches C(W+D, D) combinatorics
 * - Known valid/invalid distributions
 * - Cross-validation: every valid combo → validateSlidingWindow agrees
 * - Two-group combos: non-empty, spot-check known pairs
 */

import { describe, expect, it } from "vitest";
import {
	computeBestKAverage,
	DEFAULT_SOLVER_CONFIG,
	getTwoGroupCombinations,
	type SolverConfig,
} from "../validation/combination-solver";
import {
	DEFAULT_RTO_POLICY,
	type RTOPolicyConfig,
	validateSlidingWindow,
	type WeekCompliance,
} from "../validation/rto-core";
import {
	enumerateAllCombinations,
	getValidCombinations,
} from "./helpers/enumerate-combinations";

// ─── Helpers ──────────────────────────────────────────────────────

const START = new Date(2025, 0, 6); // Monday Jan 6 2025

/** Build WeekCompliance[] from a distribution array */
function distributionToWeeks(
	distribution: number[],
	config: SolverConfig,
): WeekCompliance[] {
	const weeks: WeekCompliance[] = [];
	let weekNum = 0;

	for (let wfhDays = 0; wfhDays < distribution.length; wfhDays++) {
		const count = distribution[wfhDays] ?? 0;
		const officeDays = config.totalWeekdays - wfhDays;

		for (let i = 0; i < count; i++) {
			const weekStart = new Date(START);
			weekStart.setDate(START.getDate() + weekNum * 7);
			weeks.push({
				weekNumber: weekNum + 1,
				weekStart,
				officeDays,
				totalDays: config.totalWeekdays,
				oofDays: wfhDays,
				wfhDays,
				isCompliant: officeDays >= config.minOfficeDays,
				status: officeDays >= config.minOfficeDays ? "compliant" : "violation",
			});
			weekNum++;
		}
	}

	return weeks;
}

function configToPolicy(config: SolverConfig): RTOPolicyConfig {
	return {
		...DEFAULT_RTO_POLICY,
		minOfficeDaysPerWeek: config.minOfficeDays,
		totalWeekdaysPerWeek: config.totalWeekdays,
		rollingPeriodWeeks: config.windowSize,
		topWeeksToCheck: config.bestWeeksCount,
	};
}

// ─── Tests ────────────────────────────────────────────────────────

describe("computeBestKAverage", () => {
	it("returns 5.0 for 12 weeks of 0 WFH days", () => {
		const dist = [12, 0, 0, 0, 0, 0];
		expect(computeBestKAverage(dist, DEFAULT_SOLVER_CONFIG)).toBe(5);
	});

	it("returns 0.0 for 12 weeks of 5 WFH days", () => {
		const dist = [0, 0, 0, 0, 0, 12];
		expect(computeBestKAverage(dist, DEFAULT_SOLVER_CONFIG)).toBe(0);
	});

	it("returns 5.0 for 8 full office + 4 all-WFH (bad weeks dropped)", () => {
		const dist = [8, 0, 0, 0, 0, 4];
		expect(computeBestKAverage(dist, DEFAULT_SOLVER_CONFIG)).toBe(5);
	});

	it("returns 3.0 for 12 weeks of 2 WFH days (3 office days each)", () => {
		const dist = [0, 0, 12, 0, 0, 0];
		expect(computeBestKAverage(dist, DEFAULT_SOLVER_CONFIG)).toBe(3);
	});
});

describe("enumerateAllCombinations", () => {
	const allCombos = enumerateAllCombinations();

	it("total combos = C(17,5) = 6188 for default config", () => {
		expect(allCombos).toHaveLength(6188);
	});

	it("all distributions sum to windowSize (12)", () => {
		for (const combo of allCombos) {
			const sum = combo.distribution.reduce((a, b) => a + b, 0);
			expect(sum).toBe(12);
		}
	});

	it("known valid: 8 weeks 5-day + 4 weeks 0-day", () => {
		const match = allCombos.find(
			(c) =>
				c.distribution[0] === 8 &&
				c.distribution[5] === 4 &&
				c.distribution[1] === 0 &&
				c.distribution[2] === 0 &&
				c.distribution[3] === 0 &&
				c.distribution[4] === 0,
		);
		expect(match).toBeDefined();
		expect(match!.isValid).toBe(true);
		expect(match!.bestKAverage).toBe(5);
	});

	it("known invalid: all 12 weeks fully WFH", () => {
		const match = allCombos.find(
			(c) =>
				c.distribution[5] === 12 &&
				c.distribution[0] === 0 &&
				c.distribution[1] === 0 &&
				c.distribution[2] === 0 &&
				c.distribution[3] === 0 &&
				c.distribution[4] === 0,
		);
		expect(match).toBeDefined();
		expect(match!.isValid).toBe(false);
		expect(match!.bestKAverage).toBe(0);
	});
});

describe("cross-validation with validateSlidingWindow", () => {
	const config = DEFAULT_SOLVER_CONFIG;
	const policy = configToPolicy(config);
	const allCombos = enumerateAllCombinations(config);

	it("every valid combo passes validateSlidingWindow", () => {
		const validCombos = allCombos.filter((c) => c.isValid);
		expect(validCombos.length).toBeGreaterThan(0);

		for (const combo of validCombos) {
			const weeks = distributionToWeeks(combo.distribution, config);
			const result = validateSlidingWindow(weeks, policy);
			expect(result.isValid).toBe(true);
		}
	});

	it("every invalid combo fails validateSlidingWindow", () => {
		const invalidCombos = allCombos.filter((c) => !c.isValid);
		expect(invalidCombos.length).toBeGreaterThan(0);

		for (const combo of invalidCombos) {
			const weeks = distributionToWeeks(combo.distribution, config);
			const result = validateSlidingWindow(weeks, policy);
			expect(result.isValid).toBe(false);
		}
	});
});

describe("getValidCombinations", () => {
	it("returns a subset of all combinations", () => {
		const valid = getValidCombinations();
		const all = enumerateAllCombinations();
		expect(valid.length).toBeGreaterThan(0);
		expect(valid.length).toBeLessThan(all.length);
	});

	it("all returned combos are valid", () => {
		for (const combo of getValidCombinations()) {
			expect(combo.isValid).toBe(true);
		}
	});
});

describe("getTwoGroupCombinations", () => {
	const combos = getTwoGroupCombinations();

	it("returns non-empty results", () => {
		expect(combos.length).toBeGreaterThan(0);
	});

	it("all combos have groupA.wfhDays < groupB.wfhDays", () => {
		for (const combo of combos) {
			expect(combo.groupA.wfhDays).toBeLessThan(combo.groupB.wfhDays);
		}
	});

	it("all combos have groupA.weeks + groupB.weeks = windowSize", () => {
		for (const combo of combos) {
			expect(combo.groupA.weeks + combo.groupB.weeks).toBe(12);
		}
	});

	it("spot-check: 8 weeks @ 0 WFH + 4 weeks @ 5 WFH → valid, avg 5.0", () => {
		const match = combos.find(
			(c) =>
				c.groupA.wfhDays === 0 &&
				c.groupA.weeks === 8 &&
				c.groupB.wfhDays === 5 &&
				c.groupB.weeks === 4,
		);
		expect(match).toBeDefined();
		expect(match!.isValid).toBe(true);
		expect(match!.bestKAverage).toBe(5);
	});

	it("spot-check: 1 week @ 0 WFH + 11 weeks @ 5 WFH → invalid", () => {
		const match = combos.find(
			(c) =>
				c.groupA.wfhDays === 0 &&
				c.groupA.weeks === 1 &&
				c.groupB.wfhDays === 5 &&
				c.groupB.weeks === 11,
		);
		expect(match).toBeDefined();
		expect(match!.isValid).toBe(false);
	});
});
