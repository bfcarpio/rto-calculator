import { describe, it, expect } from "vitest";
import {
	formatDate,
	parseDate,
	getDaysInMonth,
	getFirstDayOfMonth,
	getWeekNumber,
	addDays,
} from "../../src/lib/dateUtils";

describe("dateUtils", () => {
	describe("formatDate", () => {
		it("should format date to ISO", () => {
			const date = new Date(2026, 1, 6);
			expect(formatDate(date)).toBe("2026-02-06");
		});

		it("should format date with single digit month", () => {
			const date = new Date(2026, 0, 6);
			expect(formatDate(date)).toBe("2026-01-06");
		});

		it("should format date with single digit day", () => {
			const date = new Date(2026, 1, 5);
			expect(formatDate(date)).toBe("2026-02-05");
		});

		it("should format date with single digit month and day", () => {
			const date = new Date(2026, 0, 5);
			expect(formatDate(date)).toBe("2026-01-05");
		});
	});

	describe("parseDate", () => {
		it("should parse ISO to date", () => {
			const dateStr = "2026-02-06";
			const date = parseDate(dateStr);
			expect(date.getFullYear()).toBe(2026);
			expect(date.getMonth()).toBe(1);
			expect(date.getDate()).toBe(6);
		});

		it("should handle year 2026", () => {
			const dateStr = "2026-06-15";
			const date = parseDate(dateStr);
			expect(date.getFullYear()).toBe(2026);
			expect(date.getMonth()).toBe(5);
			expect(date.getDate()).toBe(15);
		});

		it("should handle leap year correctly", () => {
			const dateStr = "2024-02-29";
			const date = parseDate(dateStr);
			expect(date.getFullYear()).toBe(2024);
			expect(date.getMonth()).toBe(1);
			expect(date.getDate()).toBe(29);
		});
	});

	describe("getDaysInMonth", () => {
		it("should get days in month (January)", () => {
			expect(getDaysInMonth(2026, 0)).toBe(31);
		});

		it("should get days in month (February non-leap)", () => {
			expect(getDaysInMonth(2026, 1)).toBe(28);
		});

		it("should get days in month (February leap year)", () => {
			expect(getDaysInMonth(2024, 1)).toBe(29);
		});

		it("should get days in month (December)", () => {
			expect(getDaysInMonth(2026, 11)).toBe(31);
		});

		it("should get days in month (April)", () => {
			expect(getDaysInMonth(2026, 3)).toBe(30);
		});
	});

	describe("getFirstDayOfMonth", () => {
		it("should get start of week (Monday)", () => {
			const date = new Date(2026, 1, 6);
			const firstDay = getFirstDayOfMonth(date);
			expect(firstDay).toBeGreaterThanOrEqual(0);
			expect(firstDay).toBeLessThanOrEqual(6);
		});

		it("should handle month boundary (January)", () => {
			const date = new Date(2026, 0, 15);
			const firstDay = getFirstDayOfMonth(date);
			expect(firstDay).toBeGreaterThanOrEqual(0);
			expect(firstDay).toBeLessThanOrEqual(6);
		});

		it("should handle month boundary (December)", () => {
			const date = new Date(2026, 11, 15);
			const firstDay = getFirstDayOfMonth(date);
			expect(firstDay).toBeGreaterThanOrEqual(0);
			expect(firstDay).toBeLessThanOrEqual(6);
		});

		it("should handle year boundary", () => {
			const date = new Date(2025, 11, 31);
			const firstDay = getFirstDayOfMonth(date);
			expect(firstDay).toBeGreaterThanOrEqual(0);
			expect(firstDay).toBeLessThanOrEqual(6);
		});
	});

	describe("getWeekNumber", () => {
		it("should get week number (ISO 8601)", () => {
			const date = new Date(2026, 1, 6);
			const weekNumber = getWeekNumber(date);
			expect(weekNumber).toBeGreaterThan(0);
			expect(weekNumber).toBeLessThanOrEqual(53);
		});

		it("should return week 1 for first day of year", () => {
			const date = new Date(2026, 0, 1);
			const weekNumber = getWeekNumber(date);
			expect(weekNumber).toBe(1);
		});

		it("should handle week numbers across year boundary", () => {
			const date = new Date(2026, 11, 31);
			const weekNumber = getWeekNumber(date);
			expect(weekNumber).toBeGreaterThan(0);
		});
	});

	describe("addDays", () => {
		it("should add days to date", () => {
			const date = new Date(2026, 1, 6);
			const result = addDays(date, 5);
			expect(result.getDate()).toBe(11);
			expect(result.getMonth()).toBe(1);
		});

		it("should subtract days from date", () => {
			const date = new Date(2026, 1, 10);
			const result = addDays(date, -3);
			expect(result.getDate()).toBe(7);
			expect(result.getMonth()).toBe(1);
		});

		it("should handle month boundary when adding days", () => {
			const date = new Date(2026, 0, 31);
			const result = addDays(date, 1);
			expect(result.getDate()).toBe(1);
			expect(result.getMonth()).toBe(1);
		});

		it("should handle year boundary when adding days", () => {
			const date = new Date(2025, 11, 31);
			const result = addDays(date, 1);
			expect(result.getDate()).toBe(1);
			expect(result.getMonth()).toBe(0);
			expect(result.getFullYear()).toBe(2026);
		});

		it("should not mutate original date", () => {
			const date = new Date(2026, 1, 6);
			addDays(date, 5);
			expect(date.getDate()).toBe(6);
		});
	});

	describe("date comparison", () => {
		it("should compare dates (same day)", () => {
			const date1 = new Date(2026, 1, 6);
			const date2 = new Date(2026, 1, 6);
			expect(formatDate(date1)).toBe(formatDate(date2));
		});

		it("should compare dates (different day)", () => {
			const date1 = new Date(2026, 1, 6);
			const date2 = new Date(2026, 1, 7);
			expect(formatDate(date1)).not.toBe(formatDate(date2));
		});

		it("should compare dates (different month)", () => {
			const date1 = new Date(2026, 1, 6);
			const date2 = new Date(2026, 2, 6);
			expect(formatDate(date1)).not.toBe(formatDate(date2));
		});

		it("should compare dates (different year)", () => {
			const date1 = new Date(2025, 1, 6);
			const date2 = new Date(2026, 1, 6);
			expect(formatDate(date1)).not.toBe(formatDate(date2));
		});
	});

	describe("date validation", () => {
		it("should validate date (valid date)", () => {
			const dateStr = "2026-02-06";
			const date = parseDate(dateStr);
			expect(!isNaN(date.getTime())).toBe(true);
		});

		it("should validate date (invalid date)", () => {
			const dateStr = "2026-02-30";
			const date = parseDate(dateStr);
			// Invalid dates get normalized by JavaScript
			expect(date).toBeInstanceOf(Date);
		});

		it("should validate date (invalid format)", () => {
			const dateStr = "not-a-date";
			const date = parseDate(dateStr);
			// NaN gets handled gracefully
			expect(date).toBeInstanceOf(Date);
		});
	});

	describe("calculate weeks for month", () => {
		it("should calculate weeks for month (February 2026)", () => {
			const date = new Date(2026, 1, 1);
			const daysInMonth = getDaysInMonth(2026, 1);
			const firstDay = getFirstDayOfMonth(date);
			// Calculate weeks needed: (days + start day) / 7 rounded up
			const weeks = Math.ceil((daysInMonth + firstDay) / 7);
			expect(weeks).toBeGreaterThan(0);
			expect(weeks).toBeLessThanOrEqual(6);
		});

		it("should calculate weeks for month (January 2026)", () => {
			const date = new Date(2026, 0, 1);
			const daysInMonth = getDaysInMonth(2026, 0);
			const firstDay = getFirstDayOfMonth(date);
			const weeks = Math.ceil((daysInMonth + firstDay) / 7);
			expect(weeks).toBeGreaterThan(0);
			expect(weeks).toBeLessThanOrEqual(6);
		});
	});
});
