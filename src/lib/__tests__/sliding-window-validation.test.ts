/**
 * Sliding Window Validation Tests
 *
 * Tests validateSlidingWindow() directly with various scenarios
 * to verify best-8-of-12 rolling window compliance logic.
 *
 * Coverage:
 * - Empty / single week / partial window (< 12 weeks)
 * - Full 12-week windows (exact boundary)
 * - Multi-window sliding (> 12 weeks)
 * - Threshold boundaries (exactly 60%, just below, just above)
 * - Buffer weeks (best-8-of-12 drop logic)
 * - Result shape: windowWeekStarts, evaluatedWeekStarts, message
 * - Real-world scenarios: all WFH, Thu+Fri WFH + travel
 */

import { describe, expect, it } from "vitest";
import {
	DEFAULT_RTO_POLICY,
	validateSlidingWindow,
	type WeekCompliance,
} from "../validation/rto-core";

// ─── Helpers ──────────────────────────────────────────────────────

/** Create a single WeekCompliance for a given Monday */
function makeWeek(
	weekStart: Date,
	officeDays: number,
	weekNumber = 1,
): WeekCompliance {
	const totalDays = 5;
	return {
		weekNumber,
		weekStart,
		officeDays,
		totalDays,
		oofDays: totalDays - officeDays,
		wfhDays: totalDays - officeDays,
		isCompliant: officeDays >= DEFAULT_RTO_POLICY.minOfficeDaysPerWeek,
		status:
			officeDays >= DEFAULT_RTO_POLICY.minOfficeDaysPerWeek
				? "compliant"
				: "violation",
	};
}

/** Create N consecutive weeks starting from a given Monday */
function makeWeeks(
	startMonday: Date,
	count: number,
	officeDaysPerWeek: number,
): WeekCompliance[] {
	const weeks: WeekCompliance[] = [];
	for (let i = 0; i < count; i++) {
		const weekStart = new Date(startMonday);
		weekStart.setDate(startMonday.getDate() + i * 7);
		weeks.push(makeWeek(weekStart, officeDaysPerWeek, i + 1));
	}
	return weeks;
}

/** Concatenate multiple runs of weeks with different office day counts */
function makeSchedule(
	startMonday: Date,
	...segments: [count: number, officeDays: number][]
): WeekCompliance[] {
	const weeks: WeekCompliance[] = [];
	let offset = 0;
	for (const [count, officeDays] of segments) {
		const segStart = new Date(startMonday);
		segStart.setDate(startMonday.getDate() + offset * 7);
		weeks.push(...makeWeeks(segStart, count, officeDays));
		offset += count;
	}
	// Fix weekNumbers to be sequential
	weeks.forEach((w, i) => {
		w.weekNumber = i + 1;
	});
	return weeks;
}

const START = new Date(2025, 0, 6); // Monday Jan 6 2025

// ─── Tests ────────────────────────────────────────────────────────

describe("validateSlidingWindow", () => {
	// ── Empty / trivial input ────────────────────────────────────

	describe("empty and trivial input", () => {
		it("returns valid for 0 weeks (no data to evaluate)", () => {
			const result = validateSlidingWindow([], DEFAULT_RTO_POLICY);

			expect(result.isValid).toBe(true);
			expect(result.windowWeekStarts).toEqual([]);
			expect(result.evaluatedWeekStarts).toEqual([]);
		});

		it("returns NOT valid for 1 week with 0 office days", () => {
			const weeks = makeWeeks(START, 1, 0);
			const result = validateSlidingWindow(weeks, DEFAULT_RTO_POLICY);

			expect(result.isValid).toBe(false);
			expect(result.overallCompliance).toBe(0);
			expect(result.windowWeekStarts).toHaveLength(1);
			expect(result.evaluatedWeekStarts).toHaveLength(1);
		});

		it("returns valid for 1 week with 3 office days (at threshold)", () => {
			const weeks = makeWeeks(START, 1, 3);
			const result = validateSlidingWindow(weeks, DEFAULT_RTO_POLICY);

			expect(result.isValid).toBe(true);
			expect(result.overallCompliance).toBe(60);
		});

		it("returns NOT valid for 1 week with 2 office days (below threshold)", () => {
			const weeks = makeWeeks(START, 1, 2);
			const result = validateSlidingWindow(weeks, DEFAULT_RTO_POLICY);

			expect(result.isValid).toBe(false);
			expect(result.overallCompliance).toBe(40);
		});
	});

	// ── Partial windows (< 12 weeks) ────────────────────────────

	describe("partial windows (fewer than 12 weeks)", () => {
		it("evaluates all available weeks (no drop buffer)", () => {
			// 8 weeks: 4 good (3 days) + 4 bad (0 days)
			// In a full 12-week window the 4 bad would be dropped,
			// but with only 8 weeks there's no buffer — all 8 are evaluated.
			// Best 8 of 8 = avg (4*3 + 4*0)/8 = 1.5 days = 30% < 60%
			const weeks = makeSchedule(START, [4, 3], [4, 0]);
			const result = validateSlidingWindow(weeks, DEFAULT_RTO_POLICY);

			expect(result.isValid).toBe(false);
			expect(result.evaluatedWeekStarts).toHaveLength(8);
			expect(result.windowWeekStarts).toHaveLength(8);
		});

		it("returns valid for 6 good weeks", () => {
			const weeks = makeWeeks(START, 6, 4);
			const result = validateSlidingWindow(weeks, DEFAULT_RTO_POLICY);

			expect(result.isValid).toBe(true);
			expect(result.overallCompliance).toBe(80);
			expect(result.evaluatedWeekStarts).toHaveLength(6);
		});

		it("returns NOT valid for 6 weeks all WFH", () => {
			const weeks = makeWeeks(START, 6, 0);
			const result = validateSlidingWindow(weeks, DEFAULT_RTO_POLICY);

			expect(result.isValid).toBe(false);
			expect(result.overallCompliance).toBe(0);
		});

		it("includes correct windowStart for partial window", () => {
			const weeks = makeWeeks(START, 5, 5);
			const result = validateSlidingWindow(weeks, DEFAULT_RTO_POLICY);

			expect(result.windowStart).toBe(START.getTime());
		});

		it("message says 'Best N of M' for partial windows", () => {
			const weeks = makeWeeks(START, 5, 5);
			const result = validateSlidingWindow(weeks, DEFAULT_RTO_POLICY);

			expect(result.message).toContain("Best 5 of 5 weeks");
		});
	});

	// ── Exact 12-week boundary ──────────────────────────────────

	describe("exactly 12 weeks (single full window)", () => {
		it("all 5-day weeks → valid", () => {
			const weeks = makeWeeks(START, 12, 5);
			const result = validateSlidingWindow(weeks, DEFAULT_RTO_POLICY);

			expect(result.isValid).toBe(true);
			expect(result.overallCompliance).toBe(100);
			expect(result.windowWeekStarts).toHaveLength(12);
			expect(result.evaluatedWeekStarts).toHaveLength(8);
		});

		it("all 0-day weeks → NOT valid", () => {
			const weeks = makeWeeks(START, 12, 0);
			const result = validateSlidingWindow(weeks, DEFAULT_RTO_POLICY);

			expect(result.isValid).toBe(false);
			expect(result.overallCompliance).toBe(0);
		});

		it("8 good + 4 bad → valid (bad weeks are dropped)", () => {
			// Best 8 of 12: pick the 8 good weeks (3 days each)
			// Average = 3.0 days = 60% → exactly at threshold
			const weeks = makeSchedule(START, [8, 3], [4, 0]);
			const result = validateSlidingWindow(weeks, DEFAULT_RTO_POLICY);

			expect(result.isValid).toBe(true);
			expect(result.overallCompliance).toBe(60);
		});

		it("7 good + 5 bad → NOT valid (not enough good weeks to fill best 8)", () => {
			// Best 8 of 12: 7 weeks of 3 + 1 week of 0 = 21/40 = 52.5%
			const weeks = makeSchedule(START, [7, 3], [5, 0]);
			const result = validateSlidingWindow(weeks, {
				...DEFAULT_RTO_POLICY,
				roundPercentage: false,
			});

			expect(result.isValid).toBe(false);
			expect(result.overallCompliance).toBeCloseTo(52.5, 0);
		});

		it("dropped weeks are NOT in evaluatedWeekStarts", () => {
			const weeks = makeSchedule(START, [8, 5], [4, 0]);
			const result = validateSlidingWindow(weeks, DEFAULT_RTO_POLICY);

			expect(result.isValid).toBe(true);
			// evaluatedWeekStarts should have 8 entries (the best 8)
			expect(result.evaluatedWeekStarts).toHaveLength(8);
			// windowWeekStarts should have all 12
			expect(result.windowWeekStarts).toHaveLength(12);
			// The 4 bad weeks should NOT be in evaluatedWeekStarts
			const badWeekTimestamps = weeks
				.slice(8)
				.map((w) => w.weekStart.getTime());
			for (const ts of badWeekTimestamps) {
				expect(result.evaluatedWeekStarts).not.toContain(ts);
			}
		});
	});

	// ── Multi-window sliding (> 12 weeks) ───────────────────────

	describe("multi-window sliding (> 12 weeks)", () => {
		it("all good weeks over 20 weeks → valid", () => {
			const weeks = makeWeeks(START, 20, 5);
			const result = validateSlidingWindow(weeks, DEFAULT_RTO_POLICY);

			expect(result.isValid).toBe(true);
			expect(result.overallCompliance).toBe(100);
		});

		it("3 days/week for 20 weeks → valid (at threshold in every window)", () => {
			const weeks = makeWeeks(START, 20, 3);
			const result = validateSlidingWindow(weeks, DEFAULT_RTO_POLICY);

			expect(result.isValid).toBe(true);
			expect(result.overallCompliance).toBe(60);
		});

		it("detects failure in earliest window even if later windows pass", () => {
			// Weeks 1-12: 5 bad + 7 low (2 days) → best 8 = 7×2+1×0 = 14/40 = 35%
			// Later windows shift in good weeks and eventually pass
			const weeks = makeSchedule(START, [5, 0], [7, 2], [5, 5]);
			const result = validateSlidingWindow(weeks, DEFAULT_RTO_POLICY);

			expect(result.isValid).toBe(false);
			expect(result.windowStart).toBe(START.getTime());
		});

		it("returns the last window when all pass", () => {
			const weeks = makeWeeks(START, 15, 4);
			const result = validateSlidingWindow(weeks, DEFAULT_RTO_POLICY);

			expect(result.isValid).toBe(true);
			// Last window starts at index 3 (weeks 4-15)
			const expectedStart = new Date(START);
			expectedStart.setDate(START.getDate() + 3 * 7);
			expect(result.windowStart).toBe(expectedStart.getTime());
		});
	});

	// ── Threshold boundary tests ────────────────────────────────

	describe("threshold boundaries", () => {
		it("exactly 60% (3/5 days) → valid", () => {
			const weeks = makeWeeks(START, 12, 3);
			const result = validateSlidingWindow(weeks, DEFAULT_RTO_POLICY);

			expect(result.isValid).toBe(true);
			expect(result.overallCompliance).toBe(60);
		});

		it("just below 60% (2 days/week = 40%) → NOT valid", () => {
			const weeks = makeWeeks(START, 12, 2);
			const result = validateSlidingWindow(weeks, DEFAULT_RTO_POLICY);

			expect(result.isValid).toBe(false);
			expect(result.overallCompliance).toBe(40);
		});

		it("just above 60% (mix that averages to ~62.5%) → valid", () => {
			// 8 best weeks: 4 weeks of 4 days + 4 weeks of 2 days (dropped)
			// + 4 weeks of 3 days → best 8 = 4×4 + 4×3 = 28/40 = 70%
			const weeks = makeSchedule(START, [4, 4], [4, 2], [4, 3]);
			const result = validateSlidingWindow(weeks, DEFAULT_RTO_POLICY);

			expect(result.isValid).toBe(true);
			expect(result.overallCompliance).toBeGreaterThan(60);
		});
	});

	// ── Real-world scenarios ────────────────────────────────────

	describe("real-world scenarios", () => {
		it("Thu+Fri WFH every week (3 days) + 4 weeks travel → valid", () => {
			// 8 weeks of 3 + 4 weeks of 0 = best 8 has 3.0 avg = 60%
			const weeks = makeSchedule(START, [8, 3], [4, 0]);
			const result = validateSlidingWindow(weeks, DEFAULT_RTO_POLICY);

			expect(result.isValid).toBe(true);
			expect(result.overallCompliance).toBe(60);
		});

		it("Thu+Fri WFH every week (3 days) + 5 weeks travel → NOT valid", () => {
			// 7 weeks of 3 + 5 weeks of 0 = best 8 = 7×3+1×0 = 21/40 = 52.5%
			const weeks = makeSchedule(START, [7, 3], [5, 0]);
			const result = validateSlidingWindow(weeks, {
				...DEFAULT_RTO_POLICY,
				roundPercentage: false,
			});

			expect(result.isValid).toBe(false);
			expect(result.overallCompliance).toBeLessThan(60);
		});

		it("entire calendar marked WFH (0 days for 52 weeks) → NOT valid", () => {
			const weeks = makeWeeks(START, 52, 0);
			const result = validateSlidingWindow(weeks, DEFAULT_RTO_POLICY);

			expect(result.isValid).toBe(false);
			expect(result.overallCompliance).toBe(0);
			// Should fail on the very first window
			expect(result.windowStart).toBe(START.getTime());
		});

		it("one bad week surrounded by good weeks → valid (buffer absorbs)", () => {
			// 11 good + 1 bad = best 8 are all good
			const weeks = makeSchedule(START, [11, 5], [1, 0]);
			const result = validateSlidingWindow(weeks, DEFAULT_RTO_POLICY);

			expect(result.isValid).toBe(true);
			expect(result.overallCompliance).toBe(100);
		});

		it("alternating good/bad weeks over 24 weeks → depends on window", () => {
			// Every other week: 5 days, 0 days, 5 days, 0 days...
			// In any 12-week window: 6 good + 6 bad
			// Best 8: 6×5 + 2×0 = 30/40 = 75% → valid
			const weeks: WeekCompliance[] = [];
			for (let i = 0; i < 24; i++) {
				const ws = new Date(START);
				ws.setDate(START.getDate() + i * 7);
				weeks.push(makeWeek(ws, i % 2 === 0 ? 5 : 0, i + 1));
			}
			const result = validateSlidingWindow(weeks, DEFAULT_RTO_POLICY);

			expect(result.isValid).toBe(true);
		});
	});

	// ── Result shape validation ─────────────────────────────────

	describe("result shape", () => {
		it("full window result has exactly 12 windowWeekStarts", () => {
			const weeks = makeWeeks(START, 12, 5);
			const result = validateSlidingWindow(weeks, DEFAULT_RTO_POLICY);

			expect(result.windowWeekStarts).toHaveLength(12);
		});

		it("full window result has exactly 8 evaluatedWeekStarts", () => {
			const weeks = makeWeeks(START, 12, 5);
			const result = validateSlidingWindow(weeks, DEFAULT_RTO_POLICY);

			expect(result.evaluatedWeekStarts).toHaveLength(8);
		});

		it("evaluatedWeekStarts is a subset of windowWeekStarts", () => {
			const weeks = makeSchedule(START, [8, 5], [4, 0]);
			const result = validateSlidingWindow(weeks, DEFAULT_RTO_POLICY);

			const windowSet = new Set(result.windowWeekStarts);
			for (const ts of result.evaluatedWeekStarts) {
				expect(windowSet.has(ts)).toBe(true);
			}
		});

		it("invalidWeekStart is null when valid", () => {
			const weeks = makeWeeks(START, 12, 5);
			const result = validateSlidingWindow(weeks, DEFAULT_RTO_POLICY);

			expect(result.invalidWeekStart).toBeNull();
		});

		it("invalidWeekStart points to worst evaluated week when invalid", () => {
			const weeks = makeSchedule(START, [5, 0], [7, 3]);
			const result = validateSlidingWindow(weeks, DEFAULT_RTO_POLICY);

			expect(result.isValid).toBe(false);
			expect(result.invalidWeekStart).not.toBeNull();
			// Should be a 0-day week (one of the bad ones that got into best 8)
			const invalidWeek = weeks.find(
				(w) => w.weekStart.getTime() === result.invalidWeekStart,
			);
			expect(invalidWeek).toBeDefined();
			expect(invalidWeek!.officeDays).toBe(0);
		});

		it("message contains 'Compliant' when valid", () => {
			const weeks = makeWeeks(START, 12, 5);
			const result = validateSlidingWindow(weeks, DEFAULT_RTO_POLICY);

			expect(result.message).toContain("Compliant");
			expect(result.message).not.toContain("Not compliant");
		});

		it("message contains 'Not compliant' when invalid", () => {
			const weeks = makeWeeks(START, 12, 0);
			const result = validateSlidingWindow(weeks, DEFAULT_RTO_POLICY);

			expect(result.message).toContain("Not compliant");
		});
	});

	// ── Tiebreaker: earlier weeks dropped first ────────────────

	describe("tiebreaker: earlier weeks dropped when office days are equal", () => {
		it("drops earlier weeks when multiple weeks have the same office days", () => {
			// 12 weeks all with 3 office days — all tied.
			// Best 8 of 12: the 4 EARLIEST weeks should be dropped,
			// keeping the 8 most recent weeks.
			const weeks = makeWeeks(START, 12, 3);
			const result = validateSlidingWindow(weeks, DEFAULT_RTO_POLICY);

			expect(result.isValid).toBe(true);
			expect(result.evaluatedWeekStarts).toHaveLength(8);

			// The first 4 weeks should NOT be in evaluatedWeekStarts (dropped)
			const droppedTimestamps = weeks
				.slice(0, 4)
				.map((w) => w.weekStart.getTime());
			for (const ts of droppedTimestamps) {
				expect(result.evaluatedWeekStarts).not.toContain(ts);
			}

			// The last 8 weeks SHOULD be in evaluatedWeekStarts (kept)
			const keptTimestamps = weeks.slice(4).map((w) => w.weekStart.getTime());
			for (const ts of keptTimestamps) {
				expect(result.evaluatedWeekStarts).toContain(ts);
			}
		});

		it("tiebreaker applies only to equal office days, not higher ones", () => {
			// 4 weeks with 5 days + 4 weeks with 3 days + 4 weeks with 3 days
			// The 5-day weeks are always kept. Among the 3-day weeks,
			// the earlier ones (weeks 5-8) should be dropped before later ones (weeks 9-12).
			const weeks = makeSchedule(START, [4, 5], [4, 3], [4, 3]);
			const result = validateSlidingWindow(weeks, DEFAULT_RTO_POLICY);

			expect(result.isValid).toBe(true);
			expect(result.evaluatedWeekStarts).toHaveLength(8);

			// All 5-day weeks (first 4) should be kept
			const highWeeks = weeks.slice(0, 4).map((w) => w.weekStart.getTime());
			for (const ts of highWeeks) {
				expect(result.evaluatedWeekStarts).toContain(ts);
			}

			// Earlier 3-day weeks (weeks 5-8) should be dropped
			const earlierTied = weeks.slice(4, 8).map((w) => w.weekStart.getTime());
			for (const ts of earlierTied) {
				expect(result.evaluatedWeekStarts).not.toContain(ts);
			}

			// Later 3-day weeks (weeks 9-12) should be kept
			const laterTied = weeks.slice(8).map((w) => w.weekStart.getTime());
			for (const ts of laterTied) {
				expect(result.evaluatedWeekStarts).toContain(ts);
			}
		});
	});

	// ── Holiday edge cases ──────────────────────────────────────

	describe("holiday weeks (totalDays = 0)", () => {
		/** Create a week where all 5 days are holidays: officeDays=0, totalDays=0 */
		function makeHolidayWeek(weekStart: Date, weekNumber = 1): WeekCompliance {
			return {
				weekNumber,
				weekStart,
				officeDays: 0,
				totalDays: 0, // All 5 weekdays are holidays
				oofDays: 0,
				wfhDays: 0,
				isCompliant: false,
				status: "violation",
			};
		}

		it("full holiday weeks are NOT compliant (0 office days)", () => {
			// 12 holiday weeks: officeDays=0, totalDays=0 for each
			const weeks: WeekCompliance[] = [];
			for (let i = 0; i < 12; i++) {
				const ws = new Date(START);
				ws.setDate(START.getDate() + i * 7);
				weeks.push(makeHolidayWeek(ws, i + 1));
			}
			const result = validateSlidingWindow(weeks, DEFAULT_RTO_POLICY);

			// 0 office days average — should NOT be compliant
			expect(result.isValid).toBe(false);
			expect(result.overallCompliance).toBe(0);
		});

		it("2 months of holidays in a 12-week window → NOT valid", () => {
			// 8 holiday weeks (June+July) + 4 normal weeks (3 days each)
			// Best 8: 4 weeks of 3 + 4 weeks of 0 = 12/8 = 1.5 avg < 3
			const holidayWeeks: WeekCompliance[] = [];
			for (let i = 0; i < 8; i++) {
				const ws = new Date(START);
				ws.setDate(START.getDate() + i * 7);
				holidayWeeks.push(makeHolidayWeek(ws, i + 1));
			}
			const normalStart = new Date(START);
			normalStart.setDate(START.getDate() + 8 * 7);
			const normalWeeks = makeWeeks(normalStart, 4, 3);
			normalWeeks.forEach((w, i) => {
				w.weekNumber = 9 + i;
			});
			const weeks = [...holidayWeeks, ...normalWeeks];

			const result = validateSlidingWindow(weeks, {
				...DEFAULT_RTO_POLICY,
				roundPercentage: false,
			});

			expect(result.isValid).toBe(false);
			// avg office days = (4*3 + 4*0)/8 = 1.5 < 3 required
			expect(result.message).toContain("1.5 office days");
		});

		it("holiday weeks mixed with good weeks — holidays are worst and get dropped", () => {
			// 4 holiday weeks + 8 good weeks (5 days each)
			// Best 8 of 12: all 8 good weeks → avg = 5.0 → valid
			const holidayWeeks: WeekCompliance[] = [];
			for (let i = 0; i < 4; i++) {
				const ws = new Date(START);
				ws.setDate(START.getDate() + i * 7);
				holidayWeeks.push(makeHolidayWeek(ws, i + 1));
			}
			const goodStart = new Date(START);
			goodStart.setDate(START.getDate() + 4 * 7);
			const goodWeeks = makeWeeks(goodStart, 8, 5);
			goodWeeks.forEach((w, i) => {
				w.weekNumber = 5 + i;
			});
			const weeks = [...holidayWeeks, ...goodWeeks];

			const result = validateSlidingWindow(weeks, DEFAULT_RTO_POLICY);

			// Holiday weeks are dropped as the 4 worst
			expect(result.isValid).toBe(true);
			expect(result.overallCompliance).toBe(100);
		});
	});
});
