/**
 * All-Windows Evaluation Tests
 *
 * Tests for evaluateAllWindows function:
 * - Empty input returns []
 * - 12 weeks returns 1 summary
 * - 15 weeks returns 4 summaries
 * - Each summary's isValid matches validateSlidingWindow on that slice
 * - weekDetails best count matches min(K, windowSize)
 * - Window start/end dates correct
 */

import { describe, expect, it } from "vitest";
import { evaluateAllWindows } from "../validation/all-windows";
import {
	DEFAULT_RTO_POLICY,
	evaluateSingleWindow,
	type WeekCompliance,
} from "../validation/rto-core";

// ─── Helpers ──────────────────────────────────────────────────────

const START = new Date(2025, 0, 6); // Monday Jan 6 2025

function makeWeek(
	weekStart: Date,
	officeDays: number,
	weekNumber = 1,
): WeekCompliance {
	return {
		weekNumber,
		weekStart,
		officeDays,
		totalDays: 5,
		oofDays: 5 - officeDays,
		wfhDays: 5 - officeDays,
		isCompliant: officeDays >= DEFAULT_RTO_POLICY.minOfficeDaysPerWeek,
		status:
			officeDays >= DEFAULT_RTO_POLICY.minOfficeDaysPerWeek
				? "compliant"
				: "violation",
	};
}

function makeWeeks(
	startMonday: Date,
	count: number,
	officeDaysPerWeek: number,
): WeekCompliance[] {
	const weeks: WeekCompliance[] = [];
	for (let i = 0; i < count; i++) {
		const ws = new Date(startMonday);
		ws.setDate(startMonday.getDate() + i * 7);
		weeks.push(makeWeek(ws, officeDaysPerWeek, i + 1));
	}
	return weeks;
}

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
	weeks.forEach((w, i) => {
		w.weekNumber = i + 1;
	});
	return weeks;
}

// ─── Tests ────────────────────────────────────────────────────────

describe("evaluateAllWindows", () => {
	it("returns empty array for no input", () => {
		const result = evaluateAllWindows([], DEFAULT_RTO_POLICY);
		expect(result).toEqual([]);
	});

	it("returns 1 summary for exactly 12 weeks", () => {
		const weeks = makeWeeks(START, 12, 5);
		const result = evaluateAllWindows(weeks, DEFAULT_RTO_POLICY);

		expect(result).toHaveLength(1);
		expect(result[0]!.windowIndex).toBe(0);
		expect(result[0]!.isValid).toBe(true);
		expect(result[0]!.averageOfficeDays).toBe(5);
	});

	it("returns 4 summaries for 15 weeks", () => {
		const weeks = makeWeeks(START, 15, 4);
		const result = evaluateAllWindows(weeks, DEFAULT_RTO_POLICY);

		// 15 - 12 + 1 = 4
		expect(result).toHaveLength(4);
		expect(result[0]!.windowIndex).toBe(0);
		expect(result[3]!.windowIndex).toBe(3);
	});

	it("returns 1 summary for partial window (fewer than 12 weeks)", () => {
		const weeks = makeWeeks(START, 5, 5);
		const result = evaluateAllWindows(weeks, DEFAULT_RTO_POLICY);

		expect(result).toHaveLength(1);
		expect(result[0]!.isValid).toBe(true);
		expect(result[0]!.weekDetails).toHaveLength(5);
	});

	it("each summary's isValid matches evaluateSingleWindow on that slice", () => {
		// Mix of good and bad weeks so some windows pass, some fail
		const weeks = makeSchedule(START, [5, 0], [7, 5], [3, 0]);
		const result = evaluateAllWindows(weeks, DEFAULT_RTO_POLICY);
		const W = DEFAULT_RTO_POLICY.rollingPeriodWeeks;

		for (const summary of result) {
			const slice = weeks.slice(summary.windowIndex, summary.windowIndex + W);
			const { isValid } = evaluateSingleWindow(slice, DEFAULT_RTO_POLICY);
			expect(summary.isValid).toBe(isValid);
		}
	});

	it("weekDetails best count equals min(K, actual weeks)", () => {
		const weeks = makeWeeks(START, 12, 4);
		const result = evaluateAllWindows(weeks, DEFAULT_RTO_POLICY);

		const summary = result[0]!;
		const bestCount = summary.weekDetails.filter((w) => w.isBest).length;
		expect(bestCount).toBe(DEFAULT_RTO_POLICY.topWeeksToCheck); // 8
	});

	it("weekDetails best count correct for partial window", () => {
		const weeks = makeWeeks(START, 5, 4);
		const result = evaluateAllWindows(weeks, DEFAULT_RTO_POLICY);

		const summary = result[0]!;
		const bestCount = summary.weekDetails.filter((w) => w.isBest).length;
		expect(bestCount).toBe(5); // min(8, 5) = 5
	});

	it("window start/end dates are correct", () => {
		const weeks = makeWeeks(START, 12, 3);
		const result = evaluateAllWindows(weeks, DEFAULT_RTO_POLICY);

		const summary = result[0]!;
		expect(summary.windowStart.getTime()).toBe(START.getTime());

		// windowEnd should be the Friday of the last week
		const lastWeekStart = weeks[11]!.weekStart;
		const expectedEnd = new Date(lastWeekStart);
		expectedEnd.setDate(expectedEnd.getDate() + 4);
		expect(summary.windowEnd.getTime()).toBe(expectedEnd.getTime());
	});

	it("window indices are sequential", () => {
		const weeks = makeWeeks(START, 20, 3);
		const result = evaluateAllWindows(weeks, DEFAULT_RTO_POLICY);

		// 20 - 12 + 1 = 9 windows
		expect(result).toHaveLength(9);
		result.forEach((summary, i) => {
			expect(summary.windowIndex).toBe(i);
		});
	});

	it("weekDetails isCompliant reflects office days vs threshold", () => {
		const weeks = makeSchedule(START, [8, 5], [4, 1]);
		const result = evaluateAllWindows(weeks, DEFAULT_RTO_POLICY);

		const summary = result[0]!;
		const compliantCount = summary.weekDetails.filter(
			(w) => w.isCompliant,
		).length;
		const nonCompliantCount = summary.weekDetails.filter(
			(w) => !w.isCompliant,
		).length;
		expect(compliantCount).toBe(8);
		expect(nonCompliantCount).toBe(4);
	});
});
