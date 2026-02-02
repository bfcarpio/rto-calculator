/**
 * Consolidated Validation Unit Tests
 *
 * Tests the core RTO validation logic and utility functions.
 * Uses fixtures for clear, maintainable test scenarios.
 *
 * Organization:
 * - Date Utility Functions: Tests for date manipulation utilities
 * - Validation Logic Functions: Tests for compliance calculation logic
 * - Fixture-Based Scenarios: Integration tests using pre-built scenarios
 */

import { describe, expect, it } from "vitest";
import {
	calculateOfficeDaysInWeek,
	calculateWeekCompliance,
	createDaySelection,
	type DaySelection,
	DEFAULT_RTO_POLICY,
	elementToDaySelection,
	getFirstWeekStart,
	// Validation logic
	getOutOfOfficeDates,
	// Date utilities
	getStartOfWeek,
	getWeekCompliance,
	getWeekDates,
	groupDatesByWeek,
	type RTOPolicyConfig,
	// Main validation function
	validateTop8Weeks,
} from "../../../../lib/validation/rto-core";
// import { getISOWeekNumber } from "../../../utils/dateUtils";

// Import fixtures for scenario testing
import {
	BASE_CALENDAR,
	createWeeksWithPatterns,
	getWeekStart,
	SCENARIO_8_WEEKS_COMPLIANT,
	SCENARIO_8_WEEKS_VIOLATION,
	SCENARIO_12_WEEKS_LATER_COMPLIANT,
	SCENARIO_BOUNDARY_60_PERCENT,
	SCENARIO_BOUNDARY_BELOW_60_PERCENT,
	SCENARIO_EMPTY_SELECTIONS,
	SCENARIO_ONE_BAD_WEEK,
} from "../fixtures";

// ============================================================================
// Date Utility Functions Tests
// ============================================================================

describe("getStartOfWeek", () => {
	it("should return Monday for a Sunday date", () => {
		const date = new Date(2025, 0, 12); // Sunday, Jan 12
		const result = getStartOfWeek(date);
		expect(result).toEqual(new Date(2025, 0, 6)); // Monday, Jan 6
	});

	it("should return Monday for a Friday date", () => {
		const date = new Date(2025, 0, 10); // Friday, Jan 10
		const result = getStartOfWeek(date);
		expect(result).toEqual(new Date(2025, 0, 6)); // Monday, Jan 6
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

describe("getFirstWeekStart", () => {
	it("should return Monday for a Sunday date", () => {
		const date = new Date(2025, 0, 5); // Sunday, Jan 5
		const result = getFirstWeekStart(date);
		expect(result).toEqual(new Date(2025, 0, 6)); // Monday, Jan 6
	});

	it("should return same Monday for a Monday date", () => {
		const date = new Date(2025, 0, 6); // Monday, Jan 6
		const result = getFirstWeekStart(date);
		expect(result).toEqual(new Date(2025, 0, 6));
	});

	it("should return next Monday for a Tuesday date", () => {
		const date = new Date(2025, 0, 7); // Tuesday, Jan 7
		const result = getFirstWeekStart(date);
		expect(result).toEqual(new Date(2025, 0, 13)); // Monday, Jan 13
	});

	it("should return next Monday for a Friday date", () => {
		const date = new Date(2025, 0, 10); // Friday, Jan 10
		const result = getFirstWeekStart(date);
		expect(result).toEqual(new Date(2025, 0, 13)); // Monday, Jan 13
	});

	it("should return next Monday for a Saturday date", () => {
		const date = new Date(2025, 0, 11); // Saturday, Jan 11
		const result = getFirstWeekStart(date);
		expect(result).toEqual(new Date(2025, 0, 13)); // Monday, Jan 13
	});

	it("should set time to midnight", () => {
		const date = new Date(2025, 0, 8, 14, 30, 45); // Wednesday at 2:30 PM
		const result = getFirstWeekStart(date);
		expect(result.getHours()).toBe(0);
		expect(result.getMinutes()).toBe(0);
		expect(result.getSeconds()).toBe(0);
	});
});

describe("getWeekDates", () => {
	it("should return 5 weekdays starting from Monday", () => {
		const weekStart = new Date(2025, 0, 6); // Monday, Jan 6
		const dates = getWeekDates(weekStart);

		expect(dates).toHaveLength(5);
		expect(dates[0]).toEqual(new Date(2025, 0, 6)); // Monday
		expect(dates[1]).toEqual(new Date(2025, 0, 7)); // Tuesday
		expect(dates[2]).toEqual(new Date(2025, 0, 8)); // Wednesday
		expect(dates[3]).toEqual(new Date(2025, 0, 9)); // Thursday
		expect(dates[4]).toEqual(new Date(2025, 0, 10)); // Friday
	});

	it("should return consecutive dates", () => {
		const weekStart = new Date(2025, 0, 6); // Monday, Jan 6
		const dates = getWeekDates(weekStart);

		for (let i = 1; i < dates.length; i++) {
			const diff = dates[i]!.getTime() - dates[i - 1]!.getTime();
			expect(diff).toBe(24 * 60 * 60 * 1000); // 1 day in milliseconds
		}
	});
});

// ============================================================================
// Validation Logic Functions Tests
// ============================================================================

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

	it("should exclude holidays from OOF dates", () => {
		const selections: DaySelection[] = [
			createDaySelection(2025, 0, 6, "out-of-office"), // Monday, will be a holiday
			createDaySelection(2025, 0, 7, "out-of-office"), // Tuesday
			createDaySelection(2025, 0, 8, "out-of-office"), // Wednesday
		];
		const holidayDates = [new Date(2025, 0, 6)]; // Monday Jan 6 is a holiday
		const result = getOutOfOfficeDates(selections, holidayDates);
		expect(result).toHaveLength(2); // Holiday excluded from OOF count
		expect(result[0]).toEqual(new Date(2025, 0, 7)); // Tuesday
		expect(result[1]).toEqual(new Date(2025, 0, 8)); // Wednesday
	});

	it("should exclude holidays from OOF dates", () => {
		const selections: DaySelection[] = [
			createDaySelection(2025, 0, 6, "out-of-office"), // Monday, will be a holiday
			createDaySelection(2025, 0, 7, "out-of-office"), // Tuesday
			createDaySelection(2025, 0, 8, "out-of-office"), // Wednesday
		];
		const holidayDates = [new Date(2025, 0, 6)]; // Monday Jan 6 is a holiday
		const result = getOutOfOfficeDates(selections, holidayDates);
		expect(result).toHaveLength(2); // Holiday excluded from OOF count
		expect(result[0]).toEqual(new Date(2025, 0, 7)); // Tuesday
		expect(result[1]).toEqual(new Date(2025, 0, 8)); // Wednesday
	});
});

describe("groupDatesByWeek", () => {
	it("should group dates by week start", () => {
		const dates = [
			new Date(2025, 0, 6), // Monday, Jan 6
			new Date(2025, 0, 7), // Tuesday, Jan 7
			new Date(2025, 0, 13), // Monday, Jan 13
			new Date(2025, 0, 20), // Monday, Jan 20
		];

		const result = groupDatesByWeek(dates);
		expect(result.size).toBe(3);

		const firstWeek = new Date(2025, 0, 6);
		const secondWeek = new Date(2025, 0, 13);
		const thirdWeek = new Date(2025, 0, 20);

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
		const weekStart = new Date(2025, 0, 6);

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

		const weekStart = new Date(2025, 0, 6);
		expect(result.get(weekStart.getTime())).toBe(2); // Only 2 non-holiday days counted
	});
});

describe("calculateOfficeDaysInWeek", () => {
	it("should calculate none days correctly", () => {
		const weekStart = new Date(2025, 0, 6); // Monday, Jan 6
		const weeksByOOF = new Map<number, number>();
		weeksByOOF.set(weekStart.getTime(), 2);

		const result = calculateOfficeDaysInWeek(weeksByOOF, weekStart);
		expect(result).toBe(3); // 5 weekdays - 2 WFH = 3 none days
	});

	it("should return 5 when no WFH days", () => {
		const weekStart = new Date(2025, 0, 6);
		const weeksByOOF = new Map<number, number>();

		const result = calculateOfficeDaysInWeek(weeksByOOF, weekStart);
		expect(result).toBe(5); // 5 weekdays - 0 WFH = 5 none days
	});

	it("should return 0 when all days are WFH", () => {
		const weekStart = new Date(2025, 0, 6);
		const weeksByOOF = new Map<number, number>();
		weeksByOOF.set(weekStart.getTime(), 5);

		const result = calculateOfficeDaysInWeek(weeksByOOF, weekStart);
		expect(result).toBe(0); // 5 weekdays - 5 WFH = 0 none days
	});

	it("should exclude holidays from none days calculation", () => {
		const weekStart = new Date(2025, 0, 6); // Monday, Jan 6
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
		// 4 effective weekdays - 2 WFH = 2 none days
		expect(result).toBe(2);
	});

	it("should exclude multiple holidays from none days calculation", () => {
		const weekStart = new Date(2025, 0, 6);
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
		// 3 effective weekdays - 1 WFH = 2 none days
		expect(result).toBe(2);
	});

	it("should handle holidays that are also marked as WFH", () => {
		const weekStart = new Date(2025, 0, 6);
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
		// 4 effective weekdays - 1 WFH (Tuesday) = 3 none days
		expect(result).toBe(3);
	});
});

describe("calculateWeekCompliance", () => {
	it("should mark week as compliant with >=3 office days", () => {
		const weeksByOOF = new Map<number, number>();
		weeksByOOF.set(new Date(2025, 0, 6).getTime(), 2); // 2 OOF days = 3 office days

		const weekStart = new Date(2025, 0, 6);
		const result = calculateWeekCompliance(1, weekStart, weeksByOOF);

		expect(result.isCompliant).toBe(true);
		expect(result.oofDays).toBe(2);
		expect(result.wfhDays).toBe(2);
		expect(result.officeDays).toBe(3);
	});

	it("should mark week as non-compliant with <3 office days", () => {
		const weeksByOOF = new Map<number, number>();
		weeksByOOF.set(new Date(2025, 0, 6).getTime(), 3); // 3 OOF days = 2 office days

		const weekStart = new Date(2025, 0, 6);
		const result = calculateWeekCompliance(1, weekStart, weeksByOOF);

		expect(result.isCompliant).toBe(false);
		expect(result.oofDays).toBe(3);
		expect(result.wfhDays).toBe(3);
		expect(result.officeDays).toBe(2);
	});

	it("should use custom policy configuration", () => {
		const customPolicy: RTOPolicyConfig = {
			...DEFAULT_RTO_POLICY,
			minOfficeDaysPerWeek: 4, // Stricter requirement
		};

		const weeksByOOF = new Map<number, number>();
		weeksByOOF.set(new Date(2025, 0, 6).getTime(), 3); // 3 OOF days

		const weekStart = new Date(2025, 0, 6);
		const result = calculateWeekCompliance(
			1,
			weekStart,
			weeksByOOF,
			customPolicy,
		);

		expect(result.isCompliant).toBe(false); // 3 < 4, so not compliant
		expect(result.oofDays).toBe(3);
	});

	it("should return week number and dates", () => {
		const weeksByOOF = new Map<number, number>();
		weeksByOOF.set(new Date(2025, 0, 6).getTime(), 3);

		const weekStart = new Date(2025, 0, 6);
		const result = calculateWeekCompliance(5, weekStart, weeksByOOF);

		expect(result.weekNumber).toBe(5);
		expect(result.weekStart).toEqual(weekStart);
		expect(result.totalDays).toBe(5);
	});
});

describe("getWeekCompliance", () => {
	it("should return compliance data for specific week", () => {
		const selections: DaySelection[] = [
			createDaySelection(2025, 0, 6, "out-of-office"),
			createDaySelection(2025, 0, 7, "out-of-office"),
		];

		const weekStart = new Date(2025, 0, 6);
		const result = getWeekCompliance(weekStart, selections);

		expect(result.isCompliant).toBe(true);
		expect(result.oofDays).toBe(2);
		expect(result.wfhDays).toBe(2);
		expect(result.officeDays).toBe(3);
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

	it("should create none selection", () => {
		const result = createDaySelection(2025, 0, 6, "none");
		expect(result.selectionType).toBe("none");
	});

	it("should create none selection", () => {
		const result = createDaySelection(2025, 0, 6, "none");
		expect(result.selectionType).toBe("none");
	});
});

describe("elementToDaySelection", () => {
	it("should convert valid DOM element to selection", () => {
		const mockElement = {
			dataset: {
				year: "2025",
				month: "0",
				day: "6",
				selectionType: "out-of-office",
			},
		} as unknown as HTMLElement;

		const result = elementToDaySelection(mockElement);

		expect(result).not.toBeNull();
		expect(result!.date).toEqual(new Date(2025, 0, 6));
		expect(result!.selectionType).toBe("out-of-office");
	});

	it("should return null for element without year", () => {
		const mockElement = {
			dataset: {
				month: "0",
				day: "6",
				selectionType: "out-of-office",
			},
		} as unknown as HTMLElement;

		const result = elementToDaySelection(mockElement);
		expect(result).toBeNull();
	});

	it("should return null for element without month", () => {
		const mockElement = {
			dataset: {
				year: "2025",
				day: "6",
				selectionType: "out-of-office",
			},
		} as unknown as HTMLElement;

		const result = elementToDaySelection(mockElement);
		expect(result).toBeNull();
	});

	it("should return null for element without day", () => {
		const mockElement = {
			dataset: {
				year: "2025",
				month: "0",
				selectionType: "out-of-office",
			},
		} as unknown as HTMLElement;

		const result = elementToDaySelection(mockElement);
		expect(result).toBeNull();
	});

	it("should handle missing selection type", () => {
		const mockElement = {
			dataset: {
				year: "2025",
				month: "0",
				day: "6",
				selectionType: "",
			},
		} as unknown as HTMLElement;

		const result = elementToDaySelection(mockElement);
		expect(result!.selectionType).toBe("none");
	});

	it("should handle empty dataset", () => {
		const mockElement = {
			dataset: {},
		} as unknown as HTMLElement;

		const result = elementToDaySelection(mockElement);
		expect(result).toBeNull();
	});
});

// ============================================================================
// Validation Tests Using Fixtures
// ============================================================================

describe("validateTop8Weeks - Fixture-Based Scenarios", () => {
	it("should validate scenario with all 8 weeks compliant", () => {
		const { selections, expected } = SCENARIO_8_WEEKS_COMPLIANT;
		const calendarStart = new Date(
			BASE_CALENDAR.startYear,
			BASE_CALENDAR.startMonth,
			BASE_CALENDAR.startDay,
		);

		const result = validateTop8Weeks(selections, calendarStart);

		expect(result.isValid).toBe(expected.isValid);
		expect(result.averageOfficeDays).toBeCloseTo(expected.averageOfficeDays, 1);
		expect(result.averageOfficePercentage).toBeCloseTo(
			expected.averageOfficePercentage,
			1,
		);
		expect(result.weeksData).toHaveLength(8);
	});

	it("should validate scenario with all 8 weeks in violation", () => {
		const { selections, expected } = SCENARIO_8_WEEKS_VIOLATION;
		const calendarStart = new Date(
			BASE_CALENDAR.startYear,
			BASE_CALENDAR.startMonth,
			BASE_CALENDAR.startDay,
		);

		const result = validateTop8Weeks(selections, calendarStart);

		expect(result.isValid).toBe(expected.isValid);
		expect(result.averageOfficeDays).toBeCloseTo(expected.averageOfficeDays, 1);
		expect(result.averageOfficePercentage).toBeCloseTo(
			expected.averageOfficePercentage,
			1,
		);
	});

	it("should validate 12-week period with later weeks compliant", () => {
		const { selections, expected } = SCENARIO_12_WEEKS_LATER_COMPLIANT;
		const calendarStart = new Date(
			BASE_CALENDAR.startYear,
			BASE_CALENDAR.startMonth,
			BASE_CALENDAR.startDay,
		);

		const result = validateTop8Weeks(selections, calendarStart);

		expect(result.isValid).toBe(expected.isValid);
		expect(result.averageOfficeDays).toBeCloseTo(expected.averageOfficeDays, 1);
		expect(result.averageOfficePercentage).toBeCloseTo(
			expected.averageOfficePercentage,
			1,
		);
	});

	it("should validate scenario with one bad week", () => {
		const { selections, expected } = SCENARIO_ONE_BAD_WEEK;
		const calendarStart = new Date(
			BASE_CALENDAR.startYear,
			BASE_CALENDAR.startMonth,
			BASE_CALENDAR.startDay,
		);

		const result = validateTop8Weeks(selections, calendarStart);

		expect(result.isValid).toBe(expected.isValid);
		expect(result.averageOfficeDays).toBeCloseTo(expected.averageOfficeDays, 1);
		expect(result.averageOfficePercentage).toBeCloseTo(
			expected.averageOfficePercentage,
			1,
		);
	});

	it("should validate boundary case with exactly 60% compliance", () => {
		const { selections, expected } = SCENARIO_BOUNDARY_60_PERCENT;
		const calendarStart = new Date(
			BASE_CALENDAR.startYear,
			BASE_CALENDAR.startMonth,
			BASE_CALENDAR.startDay,
		);

		const result = validateTop8Weeks(selections, calendarStart);

		expect(result.isValid).toBe(expected.isValid);
		expect(result.averageOfficeDays).toBeCloseTo(expected.averageOfficeDays, 1);
		expect(result.averageOfficePercentage).toBeCloseTo(
			expected.averageOfficePercentage,
			1,
		);
	});

	it("should validate boundary case just below 60% compliance", () => {
		const { selections, expected } = SCENARIO_BOUNDARY_BELOW_60_PERCENT;
		const calendarStart = new Date(
			BASE_CALENDAR.startYear,
			BASE_CALENDAR.startMonth,
			BASE_CALENDAR.startDay,
		);

		const result = validateTop8Weeks(selections, calendarStart);

		expect(result.isValid).toBe(expected.isValid);
		expect(result.averageOfficeDays).toBeCloseTo(expected.averageOfficeDays, 1);
		expect(result.averageOfficePercentage).toBeCloseTo(
			expected.averageOfficePercentage,
			1,
		);
	});

	it("should validate empty selections as fully compliant", () => {
		const { selections, expected } = SCENARIO_EMPTY_SELECTIONS;
		const calendarStart = new Date(
			BASE_CALENDAR.startYear,
			BASE_CALENDAR.startMonth,
			BASE_CALENDAR.startDay,
		);

		const result = validateTop8Weeks(selections, calendarStart);

		expect(result.isValid).toBe(expected.isValid);
		expect(result.averageOfficeDays).toBeCloseTo(expected.averageOfficeDays, 1);
		expect(result.averageOfficePercentage).toBeCloseTo(
			expected.averageOfficePercentage,
			1,
		);
	});
});

describe("validateTop8Weeks - Pattern Builders", () => {
	it("should create and validate 8 weeks using pattern helper", () => {
		const calendarStart = new Date(
			BASE_CALENDAR.startYear,
			BASE_CALENDAR.startMonth,
			BASE_CALENDAR.startDay,
		);
		const week1Start = getWeekStart(1);
		const selections = createWeeksWithPatterns(
			BASE_CALENDAR.startYear,
			BASE_CALENDAR.startMonth,
			week1Start.getDate(),
			Array(8).fill("GOOD" as const), // 8 weeks with 2 WFH days each
		);

		const result = validateTop8Weeks(selections, calendarStart);

		expect(result.isValid).toBe(true);
		expect(result.averageOfficeDays).toBeCloseTo(3, 1);
	});

	it("should create and validate 8 weeks using pattern array helper", () => {
		const calendarStart = new Date(
			BASE_CALENDAR.startYear,
			BASE_CALENDAR.startMonth,
			BASE_CALENDAR.startDay,
		);
		const week1Start = getWeekStart(1);

		const selections = createWeeksWithPatterns(
			BASE_CALENDAR.startYear,
			BASE_CALENDAR.startMonth,
			week1Start.getDate(),
			Array(8).fill("GOOD" as const),
		);

		const result = validateTop8Weeks(selections, calendarStart);

		expect(result.isValid).toBe(true);
		expect(result.averageOfficeDays).toBeCloseTo(3, 1);
	});

	it("should correctly validate all weekly pattern types", () => {
		const calendarStart = new Date(
			BASE_CALENDAR.startYear,
			BASE_CALENDAR.startMonth,
			BASE_CALENDAR.startDay,
		);

		const patternTests = [
			{
				pattern: "PERFECT" as const,
				expectedOfficeDays: 5,
				expectedValid: true,
			},
			{
				pattern: "EXCELLENT" as const,
				expectedOfficeDays: 4,
				expectedValid: true,
			},
			{ pattern: "GOOD" as const, expectedOfficeDays: 3, expectedValid: true },
			{ pattern: "POOR" as const, expectedOfficeDays: 2, expectedValid: false },
			{ pattern: "BAD" as const, expectedOfficeDays: 1, expectedValid: false },
			{
				pattern: "TERRIBLE" as const,
				expectedOfficeDays: 0,
				expectedValid: false,
			},
		];

		patternTests.forEach(({ pattern, expectedOfficeDays, expectedValid }) => {
			const week1Start = getWeekStart(1);
			const selections = createWeeksWithPatterns(
				BASE_CALENDAR.startYear,
				BASE_CALENDAR.startMonth,
				week1Start.getDate(),
				Array(8).fill(pattern), // Create 8 weeks with this pattern
			);

			const result = validateTop8Weeks(selections, calendarStart);

			expect(result.isValid).toBe(expectedValid);
			expect(result.averageOfficeDays).toBeCloseTo(expectedOfficeDays, 1);
		});
	});
});

describe("validateTop8Weeks - Custom Policy", () => {
	it("should use custom policy configuration", () => {
		const customPolicy: RTOPolicyConfig = {
			minOfficeDaysPerWeek: 4,
			totalWeekdaysPerWeek: 5,
			thresholdPercentage: 0.8, // 4/5 = 80%
			rollingPeriodWeeks: 12,
			topWeeksToCheck: 8,
		};

		const selections: DaySelection[] = [];
		// Create 8 weeks with 2 WFH days (3 none days = 60%)
		const weekStart = new Date(2025, 0, 6);
		for (let week = 0; week < 8; week++) {
			const currentWeekStart = new Date(weekStart);
			currentWeekStart.setDate(weekStart.getDate() + week * 7);

			selections.push(
				createDaySelection(
					currentWeekStart.getFullYear(),
					currentWeekStart.getMonth(),
					currentWeekStart.getDate(),
					"out-of-office",
				),
			);
			selections.push(
				createDaySelection(
					currentWeekStart.getFullYear(),
					currentWeekStart.getMonth(),
					currentWeekStart.getDate() + 1,
					"out-of-office",
				),
			);
		}

		const result = validateTop8Weeks(
			selections,
			new Date(2025, 0, 1),
			customPolicy,
		);

		// With custom policy: 3 none days < 4 required, so should be invalid
		expect(result.isValid).toBe(false);
		expect(result.averageOfficeDays).toBeCloseTo(3, 1);
	});

	it("should calculate correct totals", () => {
		const selections: DaySelection[] = [
			// Week 1: 2 WFH (3 none)
			createDaySelection(2025, 0, 6, "out-of-office"),
			createDaySelection(2025, 0, 7, "out-of-office"),
			// Week 2: 1 WFH (4 none)
			createDaySelection(2025, 0, 13, "out-of-office"),
			// Week 3: 0 WFH (5 none)
		];

		const result = validateTop8Weeks(selections, new Date(2025, 0, 1));

		expect(result.totalOfficeDays).toBe(37); // Sum of first 8 weeks (3 weeks with selections + 5 weeks with no WFH = 5*5 + 3+4+2 = 37)
		expect(result.totalWeekdays).toBe(40); // 8 weeks * 5 weekdays
	});
});

describe("validateTop8Weeks - Message Generation", () => {
	it("should generate appropriate compliant message", () => {
		const result = validateTop8Weeks([], new Date(2025, 0, 1));

		expect(result.message).toContain("Compliant");
		expect(result.message).toContain("100%");
	});

	it("should generate appropriate violation message", () => {
		const selections: DaySelection[] = [];
		// Create 8 weeks with 4 WFH days (1 none day = 20%)
		const weekStart = new Date(2025, 0, 6);
		for (let week = 0; week < 8; week++) {
			const currentWeekStart = new Date(weekStart);
			currentWeekStart.setDate(weekStart.getDate() + week * 7);

			for (let day = 0; day < 4; day++) {
				selections.push(
					createDaySelection(
						currentWeekStart.getFullYear(),
						currentWeekStart.getMonth(),
						currentWeekStart.getDate() + day,
						"out-of-office",
					),
				);
			}
		}

		const result = validateTop8Weeks(selections, new Date(2025, 0, 1));

		expect(result.message).toContain("RTO Violation");
		expect(result.averageOfficePercentage).toBeCloseTo(20, 1);
	});
});

describe("validateTop8Weeks - Integration Tests", () => {
	it("should handle realistic multi-week scenario", () => {
		const selections: DaySelection[] = [
			// Week 1: 2 WFH (3 none)
			createDaySelection(2025, 0, 6, "out-of-office"),
			createDaySelection(2025, 0, 7, "out-of-office"),

			// Week 2: 1 WFH (4 none)
			createDaySelection(2025, 0, 13, "out-of-office"),

			// Week 3: 3 WFH (2 none)
			createDaySelection(2025, 0, 20, "out-of-office"),
			createDaySelection(2025, 0, 21, "out-of-office"),
			createDaySelection(2025, 0, 22, "out-of-office"),

			// Week 4-8: 2 WFH each (3 none)
			createDaySelection(2025, 0, 27, "out-of-office"),
			createDaySelection(2025, 0, 28, "out-of-office"),
			createDaySelection(2025, 1, 3, "out-of-office"),
			createDaySelection(2025, 1, 4, "out-of-office"),
			createDaySelection(2025, 1, 10, "out-of-office"),
			createDaySelection(2025, 1, 11, "out-of-office"),
			createDaySelection(2025, 1, 17, "out-of-office"),
			createDaySelection(2025, 1, 18, "out-of-office"),
		];

		const result = validateTop8Weeks(selections, new Date(2025, 0, 1));

		// Best 8 weeks: Weeks 1-8 sorted by none days
		// Week 1: 2 WFH = 3 none
		// Week 2: 1 WFH = 4 none (highest)
		// Week 3: 3 WFH = 2 none
		// Weeks 4-8: 2 WFH each = 3 none
		// Sort descending: 4, 3, 3, 3, 3, 3, 3, 2
		// Total: 26 / 8 = 3.25 average
		expect(result.averageOfficeDays).toBeCloseTo(3.25, 1);
		expect(result.isValid).toBe(true);
	});

	it("should handle selections across month boundaries", () => {
		const selections: DaySelection[] = [
			// Last week of January: 2 WFH
			createDaySelection(2025, 0, 27, "out-of-office"),
			createDaySelection(2025, 0, 28, "out-of-office"),
			// First week of February: 2 WFH
			createDaySelection(2025, 1, 3, "out-of-office"),
			createDaySelection(2025, 1, 4, "out-of-office"),
		];

		const result = validateTop8Weeks(selections, new Date(2025, 0, 1));

		// validateTop8Weeks always returns top 8 weeks (the rolling period)
		expect(result.weeksData).toHaveLength(8);
		// First 2 weeks should have selections and be compliant
		expect(result.weeksData[0]!.isCompliant).toBe(true);
		expect(result.weeksData[1]!.isCompliant).toBe(true);
	});
});

describe("validateTop8Weeks - Sliding Window Optimization", () => {
	it("should calculate compliance for first 8 weeks (expanding window)", () => {
		const selections: DaySelection[] = [];
		// Create 8 weeks with 3 WFH days (2 none days = 40%)
		const weekStart = new Date(2025, 0, 6);
		for (let week = 0; week < 8; week++) {
			const currentWeekStart = new Date(weekStart);
			currentWeekStart.setDate(weekStart.getDate() + week * 7);

			for (let day = 0; day < 3; day++) {
				selections.push(
					createDaySelection(
						currentWeekStart.getFullYear(),
						currentWeekStart.getMonth(),
						currentWeekStart.getDate() + day,
						"out-of-office",
					),
				);
			}
		}

		const result = validateTop8Weeks(selections, new Date(2025, 0, 1));

		// Should detect violation (2 none days vs required 3)
		expect(result.isValid).toBe(false);
		expect(result.averageOfficeDays).toBeCloseTo(2, 1);
		expect(result.averageOfficePercentage).toBeCloseTo(40, 0);
	});
});

describe("Partial Weeks Filtering - Edge Cases", () => {
	it("should handle partial week data at start of calendar (January 2025)", () => {
		// January 1, 2025 is a Wednesday - first week has only 3 weekdays in calendar
		// NOTE: validateTop8Weeks is a library function that processes selections abstractly.
		// It assumes all weeks have 5 weekdays and doesn't know about partial weeks.
		// Partial week filtering happens in UI layer (readCalendarData) which reads DOM.
		// This test documents the library behavior with incomplete selection data.
		const selections: DaySelection[] = [
			// Partial week: Wed Jan 1, Thu Jan 2, Fri Jan 3 selected as WFH
			createDaySelection(2025, 0, 1, "out-of-office"),
			createDaySelection(2025, 0, 2, "out-of-office"),
			createDaySelection(2025, 0, 3, "out-of-office"),
			// Complete week: Mon Jan 6, Tue Jan 7, Wed Jan 8 selected as WFH
			createDaySelection(2025, 0, 6, "out-of-office"),
			createDaySelection(2025, 0, 7, "out-of-office"),
			createDaySelection(2025, 0, 8, "out-of-office"),
		];

		const result = validateTop8Weeks(selections, new Date(2025, 0, 1));

		// validateTop8Weeks processes selections assuming 5 weekdays per week
		expect(result.weeksData.length).toBeGreaterThan(0);
		// First week (starting Dec 30, 2024) has 3 WFH days
		// With new behavior, oofDays = wfhDays + holidays = 3 + 0 = 3
		expect(result.weeksData[0]!.oofDays).toBe(3);
		expect(result.weeksData[0]!.wfhDays).toBe(3);
	});

	it("should handle weeks with varying numbers of selections", () => {
		// Create selections with different patterns per week
		// NOTE: This validates library function behavior, not UI filtering
		const selections: DaySelection[] = [];

		// Create 8 complete weeks
		const weekStart = new Date(2025, 0, 6);
		for (let week = 0; week < 8; week++) {
			const currentWeekStart = new Date(weekStart);
			currentWeekStart.setDate(weekStart.getDate() + week * 7);

			for (let day = 0; day < 3; day++) {
				selections.push(
					createDaySelection(
						currentWeekStart.getFullYear(),
						currentWeekStart.getMonth(),
						currentWeekStart.getDate() + day,
						"out-of-office",
					),
				);
			}
		}

		// Add a week with only 2 WFH selections
		const lastDate = new Date(2025, 2, 31); // March 31 - Monday
		for (let day = 0; day < 2; day++) {
			selections.push(
				createDaySelection(
					lastDate.getFullYear(),
					lastDate.getMonth(),
					lastDate.getDate() + day,
					"out-of-office",
				),
			);
		}

		const result = validateTop8Weeks(selections, new Date(2025, 0, 1));

		// validateTop8Weeks processes all weeks with selections
		expect(result.weeksData.length).toBeGreaterThanOrEqual(8);
	});

	it("should include weeks with exactly 5 weekdays", () => {
		// Standard week with exactly 5 weekdays should be included
		const selections: DaySelection[] = [];
		const weekStart = new Date(2025, 0, 6); // Monday, Jan 6

		for (let day = 0; day < 5; day++) {
			selections.push(
				createDaySelection(
					weekStart.getFullYear(),
					weekStart.getMonth(),
					weekStart.getDate() + day,
					"out-of-office",
				),
			);
		}

		const result = validateTop8Weeks(selections, new Date(2025, 0, 1));

		// Week with exactly 5 weekdays should be included
		expect(result.weeksData.length).toBeGreaterThan(0);
		expect(result.weeksData[0]!.weekStart.getTime()).toBe(weekStart.getTime());
	});

	it("should handle weeks with varying WFH counts", () => {
		// Create a week with 3 WFH selections
		// NOTE: validateTop8Weeks processes selections assuming 5 weekdays per week
		const selections: DaySelection[] = [];
		const weekStart = new Date(2025, 0, 6); // Monday, Jan 6

		// Only 3 days have WFH selections (Mon, Tue, Wed)
		for (let day = 0; day < 3; day++) {
			selections.push(
				createDaySelection(
					weekStart.getFullYear(),
					weekStart.getMonth(),
					weekStart.getDate() + day,
					"out-of-office",
				),
			);
		}

		const result = validateTop8Weeks(selections, new Date(2025, 0, 6));

		// First week has 3 WFH days out of 5
		// With new behavior: oofDays = 3 (wfhDays), officeDays = 2, not compliant (<3)
		expect(result.weeksData.length).toBeGreaterThanOrEqual(1);
		expect(result.weeksData[0]!.oofDays).toBe(3);
		expect(result.weeksData[0]!.wfhDays).toBe(3);
		expect(result.weeksData[0]!.isCompliant).toBe(false);
	});

	it("should handle weeks with different WFH patterns", () => {
		// Mix of weeks with different WFH selection counts
		// This tests the library's ability to process varied selection patterns
		const selections: DaySelection[] = [];

		// Week with 3 WFH selections (Wed, Thu, Fri)
		for (let i = 1; i <= 3; i++) {
			selections.push(createDaySelection(2025, 0, i, "out-of-office"));
		}

		// 4 complete weeks with 3 WFH selections each
		for (let week = 0; week < 4; week++) {
			const weekStart = new Date(2025, 0, 6 + week * 7);
			for (let day = 0; day < 3; day++) {
				selections.push(
					createDaySelection(
						weekStart.getFullYear(),
						weekStart.getMonth(),
						weekStart.getDate() + day,
						"out-of-office",
					),
				);
			}
		}

		const result = validateTop8Weeks(selections, new Date(2025, 0, 1));

		// validateTop8Weeks processes all weeks with selections
		expect(result.weeksData.length).toBeGreaterThanOrEqual(1);

		// First week: 3 WFH out of 5 weekdays
		// With new behavior: oofDays = 3 (wfhDays)
		expect(result.weeksData[0]!.oofDays).toBe(3);
		expect(result.weeksData[0]!.wfhDays).toBe(3);
		expect(result.weeksData[0]!.isCompliant).toBe(false);
		// Complete weeks: 3 WFH out of 5 weekdays
		expect(result.weeksData[1]!.oofDays).toBe(3);
		expect(result.weeksData[1]!.wfhDays).toBe(3);
		expect(result.weeksData[1]!.isCompliant).toBe(false);
	});
});

describe("Holiday Integration - End-to-End", () => {
	it("should properly calculate compliance with holidays in the mix", () => {
		// Scenario: User has 3 WFH selections, but one of them is on a holiday
		// Expected result: Holiday doesn't count as WFH, so effective WFH count is 2
		const selections: DaySelection[] = [
			createDaySelection(2025, 0, 6, "out-of-office"), // Monday - will be a holiday
			createDaySelection(2025, 0, 7, "out-of-office"), // Tuesday
			createDaySelection(2025, 0, 8, "out-of-office"), // Wednesday
		];

		const holidayDates = [new Date(2025, 0, 6)]; // Monday is a holiday

		// Step 1: getOutOfOfficeDates should exclude the holiday
		const _oofDates = getOutOfOfficeDates(selections, holidayDates);
		expect(_oofDates).toHaveLength(2); // Only Tuesday and Wednesday
		expect(_oofDates[0]).toEqual(new Date(2025, 0, 7));
		expect(_oofDates[1]).toEqual(new Date(2025, 0, 8));

		// Step 2: groupDatesByWeek should not count the holiday
		const weeksByOOF = groupDatesByWeek(_oofDates, holidayDates);
		const weekStart = new Date(2025, 0, 6);
		expect(weeksByOOF.get(weekStart.getTime())).toBe(2);

		// Step 3: calculateOfficeDaysInWeek should adjust for holidays
		const oofDays = calculateOfficeDaysInWeek(
			weeksByOOF,
			weekStart,
			DEFAULT_RTO_POLICY,
			holidayDates,
		);
		// 5 weekdays - 1 holiday = 4 effective weekdays
		// 4 effective weekdays - 2 WFH = 2 none days
		expect(oofDays).toBe(2);

		// Step 4: calculateWeekCompliance should reflect the adjusted values
		const weekCompliance = calculateWeekCompliance(
			1,
			weekStart,
			weeksByOOF,
			DEFAULT_RTO_POLICY,
			holidayDates,
		);
		expect(weekCompliance.isCompliant).toBe(false); // 2 < 3 required
		// With new behavior: oofDays includes holidays = 2 WFH + 1 holiday = 3
		expect(weekCompliance.oofDays).toBe(3);
		expect(weekCompliance.totalDays).toBe(4); // Adjusted for holiday
		expect(weekCompliance.wfhDays).toBe(2);
	});

	it("should treat holiday WFH selections as non-none days", () => {
		// Scenario: User marks a holiday as WFH, but holiday should override
		const selections: DaySelection[] = [
			createDaySelection(2025, 0, 6, "out-of-office"), // Monday - holiday
			createDaySelection(2025, 0, 7, "none"), // Tuesday
			createDaySelection(2025, 0, 8, "none"), // Wednesday
			createDaySelection(2025, 0, 9, "none"), // Thursday
			createDaySelection(2025, 0, 10, "none"), // Friday
		];

		const holidayDates = [new Date(2025, 0, 6)]; // Monday holiday

		// Result: Holiday excluded from WFH count
		const _oofDates = getOutOfOfficeDates(selections, holidayDates);
		expect(_oofDates).toHaveLength(0); // All WFH selections were on holidays

		// Week has 4 effective weekdays (5 - 1 holiday)
		// No WFH days, so 4 none days
		const weeksByOOF = groupDatesByWeek(_oofDates, holidayDates);
		const weekStart = new Date(2025, 0, 6);
		const oofDays = calculateOfficeDaysInWeek(
			weeksByOOF,
			weekStart,
			DEFAULT_RTO_POLICY,
			holidayDates,
		);
		expect(oofDays).toBe(4); // All 4 effective weekdays are none days
	});

	it("should handle multiple holidays in a single week", () => {
		const selections: DaySelection[] = [
			createDaySelection(2025, 0, 6, "none"), // Monday
			createDaySelection(2025, 0, 7, "out-of-office"), // Tuesday - holiday
			createDaySelection(2025, 0, 8, "none"), // Wednesday - holiday
			createDaySelection(2025, 0, 9, "out-of-office"), // Thursday
			createDaySelection(2025, 0, 10, "none"), // Friday
		];

		// Two holidays this week: Tuesday and Wednesday
		const holidayDates = [
			new Date(2025, 0, 7), // Tuesday holiday
			new Date(2025, 0, 8), // Wednesday holiday
		];

		const _oofDates = getOutOfOfficeDates(selections, holidayDates);
		// Only Thursday's WFH counts (Tuesday's is on a holiday)
		expect(_oofDates).toHaveLength(1);

		const weeksByOOF = groupDatesByWeek(_oofDates, holidayDates);
		const weekStart = new Date(2025, 0, 6);
		const oofDays = calculateOfficeDaysInWeek(
			weeksByOOF,
			weekStart,
			DEFAULT_RTO_POLICY,
			holidayDates,
		);
		// 5 weekdays - 2 holidays = 3 effective weekdays
		// 3 effective weekdays - 1 WFH (Thursday) = 2 none days
		expect(oofDays).toBe(2);
	});

	it("should calculate correct weekly compliance percentage with holidays", () => {
		const selections: DaySelection[] = [
			createDaySelection(2025, 0, 6, "out-of-office"), // Monday - will be holiday
			createDaySelection(2025, 0, 7, "none"), // Tuesday
			createDaySelection(2025, 0, 8, "out-of-office"), // Wednesday
		];

		const holidayDates = [new Date(2025, 0, 6)]; // Monday holiday

		const weeksByOOF = groupDatesByWeek(
			getOutOfOfficeDates(selections, holidayDates),
			holidayDates,
		);
		const weekStart = new Date(2025, 0, 6);
		const weekCompliance = calculateWeekCompliance(
			1,
			weekStart,
			weeksByOOF,
			DEFAULT_RTO_POLICY,
			holidayDates,
		);

		// Expected: 4 effective weekdays (5 - 1 holiday), 1 WFH, 3 office
		// With new behavior: oofDays = 1 (WFH) + 1 (holiday) = 2
		// Compliance = 3/4 = 75%
		expect(weekCompliance.oofDays).toBe(2);
		expect(weekCompliance.totalDays).toBe(4);
		expect(weekCompliance.wfhDays).toBe(1);
		expect(weekCompliance.isCompliant).toBe(true); // 3 >= 3 required
	});
});
