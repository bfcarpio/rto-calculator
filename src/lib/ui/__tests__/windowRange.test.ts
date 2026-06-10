import { describe, expect, it } from "vitest";
import { buildWindowEnd, buildWindowRangeLabel } from "../windowRange";

describe("buildWindowEnd", () => {
	it("returns null for empty array", () => {
		expect(buildWindowEnd([])).toBeNull();
	});

	it("returns Friday offset from a single week's weekStart", () => {
		// Sunday Jan 5 2025 — Friday is Jan 10 (+5 days)
		const weeks = [{ weekStart: new Date(2025, 0, 5) }];
		const result = buildWindowEnd(weeks);
		expect(result).not.toBeNull();
		expect(result!.getMonth()).toBe(0); // January
		expect(result!.getDate()).toBe(10);
	});

	it("returns Friday offset from the last week in multiple weeks", () => {
		const weeks = [
			{ weekStart: new Date(2025, 0, 5) }, // Sun Jan 5
			{ weekStart: new Date(2025, 0, 12) }, // Sun Jan 12
			{ weekStart: new Date(2025, 0, 19) }, // Sun Jan 19 — Friday is Jan 24
		];
		const result = buildWindowEnd(weeks);
		expect(result).not.toBeNull();
		expect(result!.getMonth()).toBe(0); // January
		expect(result!.getDate()).toBe(24);
	});

	it("does not mutate the original weekStart date", () => {
		const original = new Date(2025, 0, 5);
		const weeks = [{ weekStart: original }];
		buildWindowEnd(weeks);
		expect(original.getDate()).toBe(5);
	});
});

describe("buildWindowRangeLabel", () => {
	it("returns empty string for empty array", () => {
		expect(buildWindowRangeLabel([])).toBe("");
	});

	it("returns correct label for a single week", () => {
		// Sunday Jan 5 2025 — Friday Jan 10 2025
		const weeks = [{ weekStart: new Date(2025, 0, 5) }];
		expect(buildWindowRangeLabel(weeks)).toBe("Jan 5 – Jan 10");
	});

	it("returns correct range for multiple weeks", () => {
		const weeks = [
			{ weekStart: new Date(2025, 2, 9) }, // Sun Mar 9
			{ weekStart: new Date(2025, 3, 6) }, // Sun Apr 6
			{ weekStart: new Date(2025, 5, 1) }, // Sun Jun 1 — Friday Jun 6
		];
		expect(buildWindowRangeLabel(weeks)).toBe("Mar 9 – Jun 6");
	});

	it("works with objects that have extra properties (structural typing)", () => {
		// Simulates WindowWeekDetail or WeekCompliance shapes with additional fields
		const weeks = [
			{
				weekStart: new Date(2025, 0, 5),
				officeDays: 3,
				isCompliant: true,
				isBest: true,
			},
		];
		expect(buildWindowRangeLabel(weeks)).toBe("Jan 5 – Jan 10");
	});

	it("works with buildWindowEnd for structural typing — WindowWeekDetail-like shape", () => {
		const weeks = [
			{
				weekStart: new Date(2025, 6, 6), // Sun Jul 6 — Friday Jul 11
				weekEnd: new Date(2025, 6, 12),
				officeDays: 4,
			},
		];
		const end = buildWindowEnd(weeks);
		expect(end).not.toBeNull();
		expect(end!.getMonth()).toBe(6);
		expect(end!.getDate()).toBe(11);
	});
});
