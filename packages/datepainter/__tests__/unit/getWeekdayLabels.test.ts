import { describe, it, expect, vi, afterEach } from "vitest";
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

	it("should return correct labels regardless of current day of week", () => {
		// Simulate different days by mocking Date — the fix ensures
		// labels are stable because we use a fixed reference date.
		const RealDate = globalThis.Date;

		for (let dow = 0; dow < 7; dow++) {
			// Create a date for each day of the week (Jan 4 2026 = Sunday, +dow)
			const fakeNow = new RealDate(2026, 0, 4 + dow);

			vi.spyOn(globalThis, "Date").mockImplementation(function (
				this: Date,
				...args: unknown[]
			) {
				if (args.length === 0) return new RealDate(fakeNow);
				// @ts-expect-error -- forwarding constructor args
				return new RealDate(...args);
			} as unknown as typeof Date);

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

			vi.restoreAllMocks();
		}
	});

	it("should return 7 labels", () => {
		const labels = getWeekdayLabels();
		expect(labels).toHaveLength(7);
	});
});
