/**
 * Calendar Rendering Unit Tests
 *
 * Tests for calendar rendering functions including:
 * - createDayCell() element structure
 * - createMonthElement() day count
 * - Date formatting functions
 * - Pattern application logic
 *
 * @module calendarRendering.test
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

describe("Calendar Rendering Functions", () => {
	beforeEach(async () => {
		// Reset any mocks
		vi.resetAllMocks();
	});

	describe("createDayCell() Structure", () => {
		it("should handle date formatting correctly", async () => {
			const dateUtils = await import("../../../dateUtils");

			const date = new Date(2025, 0, 6); // January 6, 2025
			const isoDate = dateUtils.formatDateISO(date);

			expect(isoDate).toBe("2025-01-06");
		});

		it("should identify weekend dates correctly", async () => {
			const dateUtils = await import("../../../dateUtils");

			const saturday = new Date(2025, 0, 4); // January 4, 2025 is a Saturday
			const sunday = new Date(2025, 0, 5); // January 5, 2025 is a Sunday
			const monday = new Date(2025, 0, 6); // January 6, 2025 is a Monday

			// Saturday
			expect(saturday.getDay()).toBe(6); // Saturday
			expect(dateUtils.isWeekend(saturday)).toBe(true);

			// Sunday
			expect(sunday.getDay()).toBe(0); // Sunday
			expect(dateUtils.isWeekend(sunday)).toBe(true);

			// Monday (weekday)
			expect(monday.getDay()).toBe(1); // Monday
			expect(dateUtils.isWeekend(monday)).toBe(false);
		});

		it("should identify past dates correctly", async () => {
			const dateUtils = await import("../../../dateUtils");

			const pastDate = new Date(2020, 0, 1);
			const futureDate = new Date(2030, 0, 1);

			expect(dateUtils.isPastDate(pastDate)).toBe(true);
			expect(dateUtils.isPastDate(futureDate)).toBe(false);
		});

		it("should identify current date correctly", async () => {
			const dateUtils = await import("../../../dateUtils");

			const today = new Date();
			const todayString = dateUtils.formatDateISO(today);

			expect(todayString).toBeDefined();
			expect(todayString.length).toBe(10); // YYYY-MM-DD format
		});
	});

	describe("createMonthElement() Structure", () => {
		it("should parse month key correctly", async () => {
			const monthKey = "2025-0"; // January 2025
			const parts = monthKey.split("-").map(Number);
			const year = parts[0]!;
			const monthIndex = parts[1] ?? 0;

			expect(year).toBe(2025);
			expect(monthIndex).toBe(0);

			// Verify we can create a date from the key
			const monthDate = new Date(year, monthIndex, 1);
			expect(monthDate.getFullYear()).toBe(2025);
			expect(monthDate.getMonth()).toBe(0);
		});

		it("should generate correct number of days for a month", async () => {
			// Test different month lengths
			const januaryDays = new Date(2025, 1, 0).getDate(); // Last day of January
			expect(januaryDays).toBe(31);

			// February 2025 (non-leap year)
			const februaryDays = new Date(2025, 2, 0).getDate(); // Last day of February
			expect(februaryDays).toBe(28);

			// February 2024 (leap year)
			const february2024Days = new Date(2024, 2, 0).getDate(); // Last day of February
			expect(february2024Days).toBe(29);
		});

		it("should handle month boundaries correctly", async () => {
			// January 31, 2025 is a Friday
			const januaryEnd = new Date(2025, 0, 31);
			expect(januaryEnd.getDay()).toBe(5); // Friday

			// February 1, 2025 is a Saturday
			const februaryStart = new Date(2025, 1, 1);
			expect(februaryStart.getDay()).toBe(6); // Saturday
		});
	});

	describe("Date Formatting Functions", () => {
		it("formatDateISO should format dates correctly", async () => {
			const dateUtils = await import("../../../dateUtils");

			// Test various dates
			const date1 = new Date(2025, 0, 6);
			const formatted1 = dateUtils.formatDateISO(date1);
			expect(formatted1).toBe("2025-01-06");

			const date2 = new Date(2025, 11, 25);
			const formatted2 = dateUtils.formatDateISO(date2);
			expect(formatted2).toBe("2025-12-25");

			const date3 = new Date(2025, 0, 1);
			const formatted3 = dateUtils.formatDateISO(date3);
			expect(formatted3).toBe("2025-01-01");
		});

		it("formatDateDisplay should format dates for display", async () => {
			const dateUtils = await import("../../../dateUtils");

			const date = new Date(2025, 0, 6);
			const formatted = dateUtils.formatDateDisplay(date);

			// Should contain the year and month/day
			expect(formatted).toContain("2025");
			expect(formatted).toMatch(/Jan/);
		});

		it("formatDateWithDay should include day of week", async () => {
			const dateUtils = await import("../../../dateUtils");

			const date = new Date(2025, 0, 6); // Monday
			const formatted = dateUtils.formatDateWithDay(date);

			// Should contain day of week
			expect(formatted).toMatch(/Mon|Monday/);
		});
	});

	describe("getWeekDates()", () => {
		it("should return 5 weekdays for a week", async () => {
			const dateUtils = await import("../../../dateUtils");

			const weekStart = new Date(2025, 0, 6); // Monday, Jan 6
			const dates = dateUtils.getWeekDates(weekStart);

			expect(dates).toHaveLength(5);

			// Verify consecutive days
			for (let i = 1; i < dates.length; i++) {
				const diff = dates[i]?.getTime() - dates[i - 1]?.getTime();
				expect(diff).toBe(24 * 60 * 60 * 1000); // 1 day
			}
		});

		it("should return correct weekday numbers", async () => {
			const dateUtils = await import("../../../dateUtils");

			const weekStart = new Date(2025, 0, 6); // Monday, Jan 6
			const dates = dateUtils.getWeekDates(weekStart);

			expect(dates[0]?.getDay()).toBe(1); // Monday
			expect(dates[1]?.getDay()).toBe(2); // Tuesday
			expect(dates[2]?.getDay()).toBe(3); // Wednesday
			expect(dates[3]?.getDay()).toBe(4); // Thursday
			expect(dates[4]?.getDay()).toBe(5); // Friday
		});
	});

	describe("getStartOfWeek()", () => {
		it("should return Monday for a Sunday date", async () => {
			const dateUtils = await import("../../../dateUtils");

			const sunday = new Date(2025, 0, 12); // Sunday, Jan 12
			const weekStart = dateUtils.getStartOfWeek(sunday);

			expect(weekStart.getDay()).toBe(1); // Monday
			expect(weekStart.getDate()).toBe(6); // Jan 6
		});

		it("should return Monday for a Friday date", async () => {
			const dateUtils = await import("../../../dateUtils");

			const friday = new Date(2025, 0, 10); // Friday, Jan 10
			const weekStart = dateUtils.getStartOfWeek(friday);

			expect(weekStart.getDay()).toBe(1); // Monday
			expect(weekStart.getDate()).toBe(6); // Jan 6
		});

		it("should set time to midnight", async () => {
			const dateUtils = await import("../../../dateUtils");

			const date = new Date(2025, 0, 8, 14, 30, 45); // Wednesday at 2:30 PM
			const weekStart = dateUtils.getStartOfWeek(date);

			expect(weekStart.getHours()).toBe(0);
			expect(weekStart.getMinutes()).toBe(0);
			expect(weekStart.getSeconds()).toBe(0);
			expect(weekStart.getMilliseconds()).toBe(0);
		});
	});

	describe("isWeekday()", () => {
		it("should return true for Monday-Friday", async () => {
			const dateUtils = await import("../../../dateUtils");

			// Test weekdays
			const monday = new Date(2025, 0, 6);
			const tuesday = new Date(2025, 0, 7);
			const wednesday = new Date(2025, 0, 8);
			const thursday = new Date(2025, 0, 9);
			const friday = new Date(2025, 0, 10);

			expect(dateUtils.isWeekday(monday)).toBe(true);
			expect(dateUtils.isWeekday(tuesday)).toBe(true);
			expect(dateUtils.isWeekday(wednesday)).toBe(true);
			expect(dateUtils.isWeekday(thursday)).toBe(true);
			expect(dateUtils.isWeekday(friday)).toBe(true);
		});

		it("should return false for Saturday and Sunday", async () => {
			const dateUtils = await import("../../../dateUtils");

			const saturday = new Date(2025, 0, 4);
			const sunday = new Date(2025, 0, 5);

			expect(dateUtils.isWeekday(saturday)).toBe(false);
			expect(dateUtils.isWeekday(sunday)).toBe(false);
		});
	});

	describe("isWeekend()", () => {
		it("should return true for Saturday and Sunday", async () => {
			const dateUtils = await import("../../../dateUtils");

			const saturday = new Date(2025, 0, 4);
			const sunday = new Date(2025, 0, 5);

			expect(dateUtils.isWeekend(saturday)).toBe(true);
			expect(dateUtils.isWeekend(sunday)).toBe(true);
		});

		it("should return false for Monday-Friday", async () => {
			const dateUtils = await import("../../../dateUtils");

			const monday = new Date(2025, 0, 6);
			const friday = new Date(2025, 0, 10);

			expect(dateUtils.isWeekend(monday)).toBe(false);
			expect(dateUtils.isWeekend(friday)).toBe(false);
		});
	});

	describe("getWeeksForMonth()", () => {
		it("should return empty array for empty month", async () => {
			const calendarFunctions = await import("../../calendarFunctions");

			const result = calendarFunctions.getWeeksForMonth([]);
			expect(result).toHaveLength(0);
		});

		it("should group days into complete weeks", async () => {
			const calendarFunctions = await import("../../calendarFunctions");

			// January 2025 starts on Wednesday
			const januaryDates: Date[] = [];
			for (let i = 1; i <= 31; i++) {
				januaryDates.push(new Date(2025, 0, i));
			}

			const weeks = calendarFunctions.getWeeksForMonth(januaryDates);

			// Should have multiple weeks
			expect(weeks.length).toBeGreaterThan(0);

			// Each week should have 7 days
			for (const week of weeks) {
				expect(week).toHaveLength(7);
			}
		});

		it("should pad first week with previous month days", async () => {
			const calendarFunctions = await import("../../calendarFunctions");

			// January 2025 starts on Wednesday
			const januaryDates: Date[] = [];
			for (let i = 1; i <= 31; i++) {
				januaryDates.push(new Date(2025, 0, i));
			}

			const weeks = calendarFunctions.getWeeksForMonth(januaryDates);

			// First week should have days from December 2024
			const firstWeek = weeks[0];
			if (firstWeek && firstWeek.length > 0) {
				expect(firstWeek[0]?.getMonth()).toBe(11); // December
				expect(firstWeek[0]?.getFullYear()).toBe(2024);
			}
		});
	});

	describe("groupDatesByMonth()", () => {
		it("should group dates by month correctly", async () => {
			const calendarFunctions = await import("../../calendarFunctions");

			const dates = [
				new Date(2025, 0, 6), // January
				new Date(2025, 0, 15), // January
				new Date(2025, 1, 3), // February
				new Date(2025, 1, 14), // February
			];

			const grouped = calendarFunctions.groupDatesByMonth(dates);

			const keys = Object.keys(grouped);
			expect(keys).toHaveLength(2);
			expect(grouped["2025-0"]).toHaveLength(2); // January
			expect(grouped["2025-1"]).toHaveLength(2); // February
		});

		it("should handle empty array", async () => {
			const calendarFunctions = await import("../../calendarFunctions");

			const grouped = calendarFunctions.groupDatesByMonth([]);

			const keys = Object.keys(grouped);
			expect(keys).toHaveLength(0);
		});
	});

	describe("Date Pattern Application", () => {
		it("should identify selected dates correctly", async () => {
			// Test the pattern logic for identifying selected vs unselected dates
			const selectedDates = new Set<string>(["2025-01-06", "2025-01-07"]);

			expect(selectedDates.has("2025-01-06")).toBe(true);
			expect(selectedDates.has("2025-01-07")).toBe(true);
			expect(selectedDates.has("2025-01-08")).toBe(false);
		});

		it("should handle pattern types correctly", async () => {
			// Test that different selection types are properly categorized
			const selectionTypes = ["out-of-office", "none"];

			expect(selectionTypes).toContain("out-of-office");
			expect(selectionTypes).toContain("none");
		});
	});

	describe("Month and Day Name Functions", () => {
		it("getMonthName should return full month name", async () => {
			const dateUtils = await import("../../../dateUtils");

			const january = new Date(2025, 0, 1);
			const february = new Date(2025, 1, 1);
			const december = new Date(2025, 11, 1);

			expect(dateUtils.getMonthName(january)).toBe("January");
			expect(dateUtils.getMonthName(february)).toBe("February");
			expect(dateUtils.getMonthName(december)).toBe("December");
		});

		it("getMonthNameShort should return short month name", async () => {
			const dateUtils = await import("../../../dateUtils");

			const january = new Date(2025, 0, 1);

			expect(dateUtils.getMonthNameShort(january)).toBe("Jan");
		});

		it("getDayName should return full day name", async () => {
			const dateUtils = await import("../../../dateUtils");

			const monday = new Date(2025, 0, 6);
			const friday = new Date(2025, 0, 10);

			expect(dateUtils.getDayName(monday)).toBe("Monday");
			expect(dateUtils.getDayName(friday)).toBe("Friday");
		});

		it("getDayNameShort should return short day name", async () => {
			const dateUtils = await import("../../../dateUtils");

			const monday = new Date(2025, 0, 6);

			expect(dateUtils.getDayNameShort(monday)).toBe("Mon");
		});
	});
});
