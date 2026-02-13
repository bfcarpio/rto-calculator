import { describe, it, expect } from "vitest";
import { getWeekdayLabels } from "../../src/lib/templateRenderer";

describe("getWeekdayLabels", () => {
	it("should return labels starting from Sunday by default", () => {
		const labels = getWeekdayLabels("en-US", 0);
		expect(labels).toEqual(["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]);
	});

	it("should return labels starting from Monday when firstDayOfWeek is 1", () => {
		const labels = getWeekdayLabels("en-US", 1);
		expect(labels).toEqual(["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]);
	});

	it("should return stable labels regardless of when it is called", () => {
		// getWeekdayLabels uses a fixed reference date (Jan 4 2026, a Sunday)
		// so repeated calls always produce the same result — no Date mocking needed.
		for (let i = 0; i < 7; i++) {
			const labels = getWeekdayLabels("en-US", 0);
			expect(labels).toEqual([
				"Sun",
				"Mon",
				"Tue",
				"Wed",
				"Thu",
				"Fri",
				"Sat",
			]);
		}
	});

	it("should return 7 labels", () => {
		const labels = getWeekdayLabels();
		expect(labels).toHaveLength(7);
	});
});
