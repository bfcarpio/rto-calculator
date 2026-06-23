/**
 * Selection Filtering & Grouping Tests
 *
 * Tests for: getOutOfOfficeDates, groupDatesByWeek, calculateOfficeDaysInWeek, createDaySelection.
 * Covers holiday integration, WFH filtering, and office day calculations.
 */

import { describe, expect, it } from "vitest";
import {
	calculateOfficeDaysInWeek,
	createDaySelection,
	type DaySelection,
	DEFAULT_RTO_POLICY,
	getOutOfOfficeDates,
	groupDatesByWeek,
} from "../../../../lib/validation/rto-core";

describe("getOutOfOfficeDates", () => {
	it("should filter and return only out-of-office selections", () => {
		const selections: DaySelection[] = [
			createDaySelection(2025, 0, 6, "out-of-office"),
			createDaySelection(2025, 0, 7, "none"),
			createDaySelection(2025, 0, 8, "out-of-office"),
		];
		const result = getOutOfOfficeDates(selections);
		expect(result).toHaveLength(2);
		expect(result[0]).toEqual(new Date(2025, 0, 6));
		expect(result[1]).toEqual(new Date(2025, 0, 8));
	});

	it("should return empty array when no out-of-office selections", () => {
		const selections: DaySelection[] = [
			createDaySelection(2025, 0, 6, "none"),
			createDaySelection(2025, 0, 7, "none"),
		];
		const result = getOutOfOfficeDates(selections);
		expect(result).toHaveLength(0);
	});

	it("should return empty array for empty input", () => {
		const result = getOutOfOfficeDates([]);
		expect(result).toHaveLength(0);
	});

	it("should exclude holidays from WFH dates", () => {
		const selections: DaySelection[] = [
			createDaySelection(2025, 0, 6, "out-of-office"), // Monday, will be a holiday
			createDaySelection(2025, 0, 7, "out-of-office"), // Tuesday
			createDaySelection(2025, 0, 8, "out-of-office"), // Wednesday
		];
		const holidayDates = [new Date(2025, 0, 6)];
		const result = getOutOfOfficeDates(selections, holidayDates);
		expect(result).toHaveLength(2); // Holiday excluded from OOF count
		expect(result[0]).toEqual(new Date(2025, 0, 7));
		expect(result[1]).toEqual(new Date(2025, 0, 8));
	});

	it("should exclude holidays from OOF dates", () => {
		const selections: DaySelection[] = [
			createDaySelection(2025, 0, 6, "out-of-office"), // Monday, will be a holiday
			createDaySelection(2025, 0, 7, "out-of-office"), // Tuesday
			createDaySelection(2025, 0, 8, "out-of-office"), // Wednesday
		];
		const holidayDates = [new Date(2025, 0, 6)];
		const result = getOutOfOfficeDates(selections, holidayDates);
		expect(result).toHaveLength(2); // Holiday excluded from OOF count
		expect(result[0]).toEqual(new Date(2025, 0, 7)); // Tuesday
		expect(result[1]).toEqual(new Date(2025, 0, 8)); // Wednesday
	});
});

describe("groupDatesByWeek", () => {
	it("should group dates by week start (Sunday)", () => {
		const dates = [
			new Date(2025, 0, 6), // Monday, Jan 6
			new Date(2025, 0, 7), // Tuesday, Jan 7
			new Date(2025, 0, 13), // Monday, Jan 13
			new Date(2025, 0, 20), // Monday, Jan 20
		];

		const result = groupDatesByWeek(dates);
		expect(result.size).toBe(3);

		const firstWeek = new Date(2025, 0, 5); // Sunday, Jan 5
		const secondWeek = new Date(2025, 0, 12); // Sunday, Jan 12
		const thirdWeek = new Date(2025, 0, 19); // Sunday, Jan 19

		expect(result.get(firstWeek.getTime())).toBe(2);
		expect(result.get(secondWeek.getTime())).toBe(1);
		expect(result.get(thirdWeek.getTime())).toBe(1);
	});

	it("should count multiple dates in same week", () => {
		const dates = [
			new Date(2025, 0, 6), // Monday, Jan 6
			new Date(2025, 0, 7), // Tuesday, Jan 7
			new Date(2025, 0, 8), // Wednesday, Jan 8
		];

		const result = groupDatesByWeek(dates);
		const weekStart = new Date(2025, 0, 5); // Sunday, Jan 5

		expect(result.size).toBe(1);
		expect(result.get(weekStart.getTime())).toBe(3);
	});

	it("should return empty map for empty input", () => {
		const result = groupDatesByWeek([]);
		expect(result.size).toBe(0);
	});

	it("should exclude holidays from WFH counts", () => {
		const dates = [
			new Date(2025, 0, 6), // Monday - will be a holiday
			new Date(2025, 0, 7), // Tuesday
			new Date(2025, 0, 8), // Wednesday
		];
		const holidayDates = [new Date(2025, 0, 6)]; // Monday is a holiday
		const result = groupDatesByWeek(dates, holidayDates);

		const weekStart = new Date(2025, 0, 5); // Sunday, Jan 5
		expect(result.get(weekStart.getTime())).toBe(2); // Only 2 non-holiday days counted
	});
});

describe("calculateOfficeDaysInWeek", () => {
	it("should calculate none days correctly", () => {
		const weekStart = new Date(2025, 0, 5); // Sunday, Jan 5
		const weeksByOOF = new Map<number, number>();
		weeksByOOF.set(weekStart.getTime(), 2);

		const result = calculateOfficeDaysInWeek(weeksByOOF, weekStart);
		expect(result).toBe(3); // 5 weekdays - 2 WFH = 3 office days
	});

	it("should return 5 when no WFH days", () => {
		const weekStart = new Date(2025, 0, 5); // Sunday, Jan 5
		const weeksByOOF = new Map<number, number>();

		const result = calculateOfficeDaysInWeek(weeksByOOF, weekStart);
		expect(result).toBe(5); // 5 weekdays - 0 WFH = 5 office days
	});

	it("should return 0 when all days are WFH", () => {
		const weekStart = new Date(2025, 0, 5); // Sunday, Jan 5
		const weeksByOOF = new Map<number, number>();
		weeksByOOF.set(weekStart.getTime(), 5);

		const result = calculateOfficeDaysInWeek(weeksByOOF, weekStart);
		expect(result).toBe(0); // 5 weekdays - 5 WFH = 0 office days
	});

	it("should exclude holidays from office days calculation", () => {
		const weekStart = new Date(2025, 0, 5); // Sunday, Jan 5
		const weeksByOOF = new Map<number, number>();
		weeksByOOF.set(weekStart.getTime(), 2);

		// Wednesday Jan 8 is a holiday
		const holidayDates = [new Date(2025, 0, 8)];

		const result = calculateOfficeDaysInWeek(
			weeksByOOF,
			weekStart,
			DEFAULT_RTO_POLICY,
			holidayDates,
		);
		// 5 weekdays - 1 holiday = 4 effective weekdays
		// 4 effective weekdays - 2 WFH = 2 office days
		expect(result).toBe(2);
	});

	it("should exclude multiple holidays from office days calculation", () => {
		const weekStart = new Date(2025, 0, 5); // Sunday, Jan 5
		const weeksByOOF = new Map<number, number>();
		weeksByOOF.set(weekStart.getTime(), 1); // 1 WFH day

		// Two holidays this week: Monday and Wednesday
		const holidayDates = [
			new Date(2025, 0, 6), // Monday holiday
			new Date(2025, 0, 8), // Wednesday holiday
		];

		const result = calculateOfficeDaysInWeek(
			weeksByOOF,
			weekStart,
			DEFAULT_RTO_POLICY,
			holidayDates,
		);
		// 5 weekdays - 2 holidays = 3 effective weekdays
		// 3 effective weekdays - 1 WFH = 2 office days
		expect(result).toBe(2);
	});

	it("should handle holidays that are also marked as WFH", () => {
		const weekStart = new Date(2025, 0, 5); // Sunday, Jan 5
		const weeksByOOF = new Map<number, number>();
		weeksByOOF.set(weekStart.getTime(), 1); // Only Tuesday marked as WFH (Monday excluded by getOutOfOfficeDates)

		// Monday is both a holiday AND was originally marked as WFH
		const holidayDates = [new Date(2025, 0, 6)];

		const result = calculateOfficeDaysInWeek(
			weeksByOOF,
			weekStart,
			DEFAULT_RTO_POLICY,
			holidayDates,
		);
		// 5 weekdays - 1 holiday = 4 effective weekdays
		// 4 effective weekdays - 1 WFH (Tuesday) = 3 office days
		expect(result).toBe(3);
	});
});

describe("createDaySelection", () => {
	it("should create out-of-office selection", () => {
		const result = createDaySelection(2025, 0, 6, "out-of-office");

		expect(result.date).toEqual(new Date(2025, 0, 6));
		expect(result.year).toBe(2025);
		expect(result.month).toBe(0);
		expect(result.day).toBe(6);
		expect(result.selectionType).toBe("out-of-office");
	});
});
