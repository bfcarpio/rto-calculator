/**
 * Sliding Window Validation Tests
 *
 * Tests validateSlidingWindow() directly with various scenarios
 * to verify best-8-of-12 rolling window compliance logic.
 */

import { describe, expect, it } from "vitest";
import {
	DEFAULT_RTO_POLICY,
	validateSlidingWindow,
	type WeekCompliance,
} from "../validation/rto-core";

/** Helper: create a WeekCompliance object for a given Monday */
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

/** Helper: create N consecutive weeks starting from a given Monday */
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

describe("validateSlidingWindow", () => {
	it("should return valid for empty weeks (fewer than window size)", () => {
		const result = validateSlidingWindow([], DEFAULT_RTO_POLICY);

		expect(result.isValid).toBe(true);
		expect(result.overallCompliance).toBe(100);
	});

	it("should return valid for fewer than 12 weeks", () => {
		const start = new Date(2025, 0, 6); // Monday Jan 6
		const weeks = makeWeeks(start, 8, 5); // 8 weeks, all 5-day

		const result = validateSlidingWindow(weeks, DEFAULT_RTO_POLICY);

		expect(result.isValid).toBe(true);
	});

	it("should return valid when all weeks have 5 office days", () => {
		const start = new Date(2025, 0, 6);
		const weeks = makeWeeks(start, 20, 5);

		const result = validateSlidingWindow(weeks, DEFAULT_RTO_POLICY);

		expect(result.isValid).toBe(true);
		expect(result.overallCompliance).toBe(100);
	});

	it("should return valid for Thu+Fri WFH every week (3 days/week = at threshold)", () => {
		// 3 office days per week = exactly 60% threshold
		const start = new Date(2025, 0, 6);
		const weeks = makeWeeks(start, 20, 3);

		const result = validateSlidingWindow(weeks, DEFAULT_RTO_POLICY);

		expect(result.isValid).toBe(true);
		expect(result.overallCompliance).toBe(60);
	});

	it("should return NOT valid for Thu+Fri WFH + 5 weeks travel (0 office days)", () => {
		// 12 weeks: 7 weeks with 3 office days, 5 weeks with 0 office days
		// Best 8 of 12: pick 7 weeks of 3 + 1 week of 0 = 21 office days
		// Average = 21/8 = 2.625 days, 21/40 = 52.5% < 60%
		const start = new Date(2025, 0, 6);
		const normalWeeks = makeWeeks(start, 7, 3);
		const travelStart = new Date(start);
		travelStart.setDate(start.getDate() + 7 * 7);
		const travelWeeks = makeWeeks(travelStart, 5, 0);
		const weeks = [...normalWeeks, ...travelWeeks];

		const result = validateSlidingWindow(weeks, DEFAULT_RTO_POLICY);

		expect(result.isValid).toBe(false);
		expect(result.overallCompliance).toBeLessThan(60);
	});

	it("should return valid for Thu+Fri WFH + 4 weeks travel (buffer absorbs)", () => {
		// 12 weeks: 8 weeks with 3 office days, 4 weeks with 0 office days
		// Best 8 of 12: pick 8 weeks of 3 = 24 office days
		// Average = 24/8 = 3.0 days, 24/40 = 60% >= 60%
		const start = new Date(2025, 0, 6);
		const normalWeeks = makeWeeks(start, 8, 3);
		const travelStart = new Date(start);
		travelStart.setDate(start.getDate() + 8 * 7);
		const travelWeeks = makeWeeks(travelStart, 4, 0);
		const weeks = [...normalWeeks, ...travelWeeks];

		const result = validateSlidingWindow(weeks, DEFAULT_RTO_POLICY);

		expect(result.isValid).toBe(true);
		expect(result.overallCompliance).toBe(60);
	});

	it("should return valid for single bad week in 12-week window (3 buffer weeks)", () => {
		// 11 weeks with 5 office days + 1 week with 0
		// Best 8: all have 5 days, buffer absorbs the bad week
		const start = new Date(2025, 0, 6);
		const goodWeeks = makeWeeks(start, 11, 5);
		const badWeekStart = new Date(start);
		badWeekStart.setDate(start.getDate() + 11 * 7);
		const badWeek = makeWeek(badWeekStart, 0, 12);
		const weeks = [...goodWeeks, badWeek];

		const result = validateSlidingWindow(weeks, DEFAULT_RTO_POLICY);

		expect(result.isValid).toBe(true);
		expect(result.overallCompliance).toBe(100);
	});

	it("should detect failure in earlier window even if later windows pass", () => {
		// Window 1 (weeks 1-12): 5 bad (0 days) + 7 weeks with 2 days
		//   Best 8 = 7 weeks of 2 + 1 week of 0 = 14/40 = 35% < 60% → FAILS
		// Window 2+ shifts and eventually has enough good weeks → might pass
		const start = new Date(2025, 0, 6);
		const badWeeks = makeWeeks(start, 5, 0);
		const midStart = new Date(start);
		midStart.setDate(start.getDate() + 5 * 7);
		const lowWeeks = makeWeeks(midStart, 7, 2);
		const goodStart = new Date(midStart);
		goodStart.setDate(midStart.getDate() + 7 * 7);
		const goodWeeks = makeWeeks(goodStart, 5, 5);
		const weeks = [...badWeeks, ...lowWeeks, ...goodWeeks];

		const result = validateSlidingWindow(weeks, DEFAULT_RTO_POLICY);

		expect(result.isValid).toBe(false);
		// windowStart should be the first window
		expect(result.windowStart).toBe(start.getTime());
	});

	it("should return the last valid window when all pass", () => {
		const start = new Date(2025, 0, 6);
		const weeks = makeWeeks(start, 15, 4); // 15 weeks, all 4-day

		const result = validateSlidingWindow(weeks, DEFAULT_RTO_POLICY);

		expect(result.isValid).toBe(true);
		// windowStart should be for the last window (week 4, index 3)
		const expectedLastWindowStart = new Date(start);
		expectedLastWindowStart.setDate(start.getDate() + 3 * 7);
		expect(result.windowStart).toBe(expectedLastWindowStart.getTime());
	});

	it("should identify best 8 weeks (evaluatedWeekStarts) in the failing window", () => {
		const start = new Date(2025, 0, 6);
		// 12 weeks: first 5 with 0 days, last 7 with 3 days
		const badWeeks = makeWeeks(start, 5, 0);
		const goodStart = new Date(start);
		goodStart.setDate(start.getDate() + 5 * 7);
		const goodWeeks = makeWeeks(goodStart, 7, 3);
		const weeks = [...badWeeks, ...goodWeeks];

		const result = validateSlidingWindow(weeks, DEFAULT_RTO_POLICY);

		expect(result.isValid).toBe(false);
		// The best 8 should include all 7 good weeks + 1 bad week
		expect(result.evaluatedWeekStarts.length).toBe(8);
		expect(result.windowWeekStarts.length).toBe(12);
	});
});
