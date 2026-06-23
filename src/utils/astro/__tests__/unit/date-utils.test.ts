/**
 * Date Utility Function Tests
 *
 * Tests for date manipulation utilities: getStartOfWeek, snapToWeekStart, getFullWeekDates.
 */

import { describe, expect, it } from "vitest";
import {
	getFullWeekDates,
	getStartOfWeek,
	snapToWeekStart,
} from "../../../../lib/validation/rto-core";

describe("getStartOfWeek", () => {
	it("should return Sunday for a Monday date", () => {
		const date = new Date(2025, 0, 6); // Monday, Jan 6
		const result = getStartOfWeek(date);
		expect(result).toEqual(new Date(2025, 0, 5)); // Sunday, Jan 5
	});

	it("should return Sunday for a Friday date", () => {
		const date = new Date(2025, 0, 10); // Friday, Jan 10
		const result = getStartOfWeek(date);
		expect(result).toEqual(new Date(2025, 0, 5)); // Sunday, Jan 5
	});

	it("should set time to midnight", () => {
		const date = new Date(2025, 0, 8, 14, 30, 45); // Wednesday at 2:30 PM
		const result = getStartOfWeek(date);
		expect(result.getHours()).toBe(0);
		expect(result.getMinutes()).toBe(0);
		expect(result.getSeconds()).toBe(0);
		expect(result.getMilliseconds()).toBe(0);
	});
});

describe("snapToWeekStart", () => {
	it("should return same Sunday for a Sunday date", () => {
		const date = new Date(2025, 0, 5); // Sunday, Jan 5
		const result = snapToWeekStart(date);
		expect(result).toEqual(new Date(2025, 0, 5)); // Same Sunday, Jan 5
	});

	it("should return next Sunday for a Monday date", () => {
		const date = new Date(2025, 0, 6); // Monday, Jan 6
		const result = snapToWeekStart(date);
		expect(result).toEqual(new Date(2025, 0, 12)); // Next Sunday, Jan 12
	});

	it("should return next Sunday for a Tuesday date", () => {
		const date = new Date(2025, 0, 7); // Tuesday, Jan 7
		const result = snapToWeekStart(date);
		expect(result).toEqual(new Date(2025, 0, 12)); // Next Sunday, Jan 12
	});

	it("should return next Sunday for a Friday date", () => {
		const date = new Date(2025, 0, 10); // Friday, Jan 10
		const result = snapToWeekStart(date);
		expect(result).toEqual(new Date(2025, 0, 12)); // Next Sunday, Jan 12
	});

	it("should return next Sunday for a Saturday date", () => {
		const date = new Date(2025, 0, 11); // Saturday, Jan 11
		const result = snapToWeekStart(date);
		expect(result).toEqual(new Date(2025, 0, 12)); // Next Sunday, Jan 12
	});

	it("should set time to midnight", () => {
		const date = new Date(2025, 0, 8, 14, 30, 45); // Wednesday at 2:30 PM
		const result = snapToWeekStart(date);
		expect(result.getHours()).toBe(0);
		expect(result.getMinutes()).toBe(0);
		expect(result.getSeconds()).toBe(0);
	});
});

describe("getFullWeekDates", () => {
	it("should return 7 dates (Sun-Sat) starting from Sunday", () => {
		const weekStart = new Date(2025, 0, 5); // Sunday, Jan 5
		const dates = getFullWeekDates(weekStart);

		expect(dates).toHaveLength(7);
		expect(dates[0]).toEqual(new Date(2025, 0, 5)); // Sunday
		expect(dates[1]).toEqual(new Date(2025, 0, 6)); // Monday
		expect(dates[2]).toEqual(new Date(2025, 0, 7)); // Tuesday
		expect(dates[3]).toEqual(new Date(2025, 0, 8)); // Wednesday
		expect(dates[4]).toEqual(new Date(2025, 0, 9)); // Thursday
		expect(dates[5]).toEqual(new Date(2025, 0, 10)); // Friday
		expect(dates[6]).toEqual(new Date(2025, 0, 11)); // Saturday
	});

	it("should return consecutive dates", () => {
		const weekStart = new Date(2025, 0, 5); // Sunday, Jan 5
		const dates = getFullWeekDates(weekStart);

		for (let i = 1; i < dates.length; i++) {
			const current = dates[i];
			const previous = dates[i - 1];
			if (current && previous) {
				const diff = current.getTime() - previous.getTime();
				expect(diff).toBe(24 * 60 * 60 * 1000); // 1 day in milliseconds
			}
		}
	});
});
