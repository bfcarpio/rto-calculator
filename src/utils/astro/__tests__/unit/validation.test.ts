/**
 * validateTopKWeeks Integration & Fixture Tests
 *
 * Tests the core validateTopKWeeks function using pre-built fixtures,
 * pattern builders, custom policies, message generation, integration scenarios,
 * sliding window optimization, partial weeks, and holiday end-to-end scenarios.
 */

import { describe, expect, it, test } from "vitest";
import {
	calculateOfficeDaysInWeek,
	calculateWeekCompliance,
	createDaySelection,
	type DaySelection,
	DEFAULT_RTO_POLICY,
	getOutOfOfficeDates,
	groupDatesByWeek,
	type RTOPolicyConfig,
	validateTopKWeeks,
} from "../../../../lib/validation/rto-core";

const policy = DEFAULT_RTO_POLICY;

// Import fixtures for scenario testing
import {
	BASE_CALENDAR,
	createWeeksWithPatterns,
	SCENARIO_8_WEEKS_COMPLIANT,
	SCENARIO_8_WEEKS_VIOLATION,
	SCENARIO_12_WEEKS_LATER_COMPLIANT,
	SCENARIO_BOUNDARY_60_PERCENT,
	SCENARIO_BOUNDARY_BELOW_60_PERCENT,
	SCENARIO_EMPTY_SELECTIONS,
	SCENARIO_ONE_BAD_WEEK,
} from "../fixtures";

// ============================================================================
// Validation Tests Using Fixtures
// ============================================================================

describe("validateTopKWeeks - Fixture-Based Scenarios", () => {
	test.each([
		{
			name: "all 8 weeks compliant",
			fixture: SCENARIO_8_WEEKS_COMPLIANT,
			testPolicy: DEFAULT_RTO_POLICY,
		},
		{
			name: "all 8 weeks in violation",
			fixture: SCENARIO_8_WEEKS_VIOLATION,
			testPolicy: DEFAULT_RTO_POLICY,
		},
		{
			name: "12-week period with later weeks compliant",
			fixture: SCENARIO_12_WEEKS_LATER_COMPLIANT,
			testPolicy: DEFAULT_RTO_POLICY,
		},
		{
			name: "one bad week",
			fixture: SCENARIO_ONE_BAD_WEEK,
			testPolicy: { ...DEFAULT_RTO_POLICY, roundPercentage: false },
		},
		{
			name: "boundary case with exactly 60% compliance",
			fixture: SCENARIO_BOUNDARY_60_PERCENT,
			testPolicy: DEFAULT_RTO_POLICY,
		},
		{
			name: "boundary case just below 60% compliance",
			fixture: SCENARIO_BOUNDARY_BELOW_60_PERCENT,
			testPolicy: { ...DEFAULT_RTO_POLICY, roundPercentage: false },
		},
		{
			name: "empty selections as fully compliant",
			fixture: SCENARIO_EMPTY_SELECTIONS,
			testPolicy: DEFAULT_RTO_POLICY,
		},
	])("should validate scenario with $name", ({ fixture, testPolicy }) => {
		const { selections, expected } = fixture;
		const calendarStart = new Date(
			BASE_CALENDAR.startYear,
			BASE_CALENDAR.startMonth,
			BASE_CALENDAR.startDay,
		);

		const result = validateTopKWeeks(selections, calendarStart, testPolicy);

		expect(result.isValid).toBe(expected.isValid);
		expect(result.averageOfficeDays).toBeCloseTo(expected.averageOfficeDays, 1);
		expect(result.averageOfficePercentage).toBeCloseTo(
			expected.averageOfficePercentage,
			1,
		);
	});
});

describe("validateTopKWeeks - Pattern Builders", () => {
	it("should create and validate 8 weeks using pattern helper", () => {
		const calendarStart = new Date(
			BASE_CALENDAR.startYear,
			BASE_CALENDAR.startMonth,
			BASE_CALENDAR.startDay,
		);
		const selections = createWeeksWithPatterns(
			BASE_CALENDAR.startYear,
			BASE_CALENDAR.startMonth,
			6, // Monday Jan 6 — selections must start on a weekday
			Array(8).fill("GOOD" as const), // 8 weeks with 2 WFH days each
		);

		const result = validateTopKWeeks(selections, calendarStart);

		expect(result.isValid).toBe(true);
		expect(result.averageOfficeDays).toBeCloseTo(3, 1);
	});

	test.each([
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
	])("should correctly validate $pattern pattern", ({
		pattern,
		expectedOfficeDays,
		expectedValid,
	}) => {
		const calendarStart = new Date(
			BASE_CALENDAR.startYear,
			BASE_CALENDAR.startMonth,
			BASE_CALENDAR.startDay,
		);
		const selections = createWeeksWithPatterns(
			BASE_CALENDAR.startYear,
			BASE_CALENDAR.startMonth,
			6, // Monday Jan 6 — selections must start on a weekday
			Array(8).fill(pattern), // Create 8 weeks with this pattern
		);

		const result = validateTopKWeeks(selections, calendarStart);

		expect(result.isValid).toBe(expectedValid);
		expect(result.averageOfficeDays).toBeCloseTo(expectedOfficeDays, 1);
	});
});

describe("validateTopKWeeks - Custom Policy", () => {
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

		const result = validateTopKWeeks(
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

		const result = validateTopKWeeks(selections, new Date(2025, 0, 1));

		expect(result.totalOfficeDays).toBe(37); // Sum of first 8 weeks (3 weeks with selections + 5 weeks with no WFH = 5*5 + 3+4+2 = 37)
		expect(result.totalWeekdays).toBe(40); // 8 weeks * 5 weekdays
	});
});

describe("validateTopKWeeks - Message Generation", () => {
	it("should generate appropriate compliant message", () => {
		const result = validateTopKWeeks([], new Date(2025, 0, 1));

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

		const result = validateTopKWeeks(selections, new Date(2025, 0, 1));

		expect(result.message).toContain("Not compliant");
		expect(result.averageOfficePercentage).toBeCloseTo(20, 1);
	});
});

describe("validateTopKWeeks - Integration Tests", () => {
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

		const result = validateTopKWeeks(selections, new Date(2025, 0, 1));

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

		const result = validateTopKWeeks(selections, new Date(2025, 0, 1));

		// validateTopKWeeks always returns top 8 weeks (the rolling period)
		expect(result.weeksData).toHaveLength(policy.topWeeksToCheck);
		// First 2 weeks should have selections and be compliant
		expect(result.weeksData[0]?.isCompliant).toBe(true);
		expect(result.weeksData[1]?.isCompliant).toBe(true);
	});
});

describe("validateTopKWeeks - Sliding Window Optimization", () => {
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

		const result = validateTopKWeeks(selections, new Date(2025, 0, 1));

		// Should detect violation (2 none days vs required 3)
		expect(result.isValid).toBe(false);
		expect(result.averageOfficeDays).toBeCloseTo(2, 1);
		expect(result.averageOfficePercentage).toBeCloseTo(40, 0);
	});
});

describe("Partial Weeks Filtering - Edge Cases", () => {
	it("should handle partial week data at start of calendar (January 2025)", () => {
		// January 1, 2025 is a Wednesday - first week has only 3 weekdays in calendar
		// NOTE: validateTopKWeeks is a library function that processes selections abstractly.
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

		const result = validateTopKWeeks(selections, new Date(2025, 0, 1));

		// validateTopKWeeks processes selections assuming 5 weekdays per week
		expect(result.weeksData.length).toBeGreaterThan(0);
		// First week (starting Dec 30, 2024) has 3 WFH days
		// With new behavior, oofDays = wfhDays + holidays = 3 + 0 = 3
		expect(result.weeksData[0]?.oofDays).toBe(3);
		expect(result.weeksData[0]?.wfhDays).toBe(3);
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

		const result = validateTopKWeeks(selections, new Date(2025, 0, 1));

		// validateTopKWeeks processes all weeks with selections
		expect(result.weeksData.length).toBeGreaterThanOrEqual(8);
	});

	it("should include weeks with exactly 5 weekdays", () => {
		// Standard week with exactly 5 weekdays should be included
		const selections: DaySelection[] = [];
		const weekStart = new Date(2025, 0, 5); // Sunday, Jan 5

		for (let day = 1; day <= 5; day++) {
			selections.push(
				createDaySelection(
					weekStart.getFullYear(),
					weekStart.getMonth(),
					weekStart.getDate() + day,
					"out-of-office",
				),
			);
		}

		const result = validateTopKWeeks(selections, new Date(2025, 0, 5));

		// Week with exactly 5 weekdays should be included
		expect(result.weeksData.length).toBeGreaterThan(0);
		expect(result.weeksData[0]?.weekStart.getTime()).toBe(weekStart.getTime());
	});

	it("should handle weeks with varying WFH counts", () => {
		// Create a week with 3 WFH selections
		// NOTE: validateTopKWeeks processes selections assuming 5 weekdays per week
		const selections: DaySelection[] = [];
		const weekStart = new Date(2025, 0, 5); // Sunday, Jan 5

		// Only 3 days have WFH selections (Mon, Tue, Wed)
		for (let day = 1; day <= 3; day++) {
			selections.push(
				createDaySelection(
					weekStart.getFullYear(),
					weekStart.getMonth(),
					weekStart.getDate() + day,
					"out-of-office",
				),
			);
		}

		const result = validateTopKWeeks(selections, new Date(2025, 0, 5));

		// First week has 3 WFH days out of 5
		// With new behavior: oofDays = 3 (wfhDays)
		expect(result.weeksData.length).toBeGreaterThanOrEqual(1);
		expect(result.weeksData[0]?.oofDays).toBe(3);
		expect(result.weeksData[0]?.wfhDays).toBe(3);
		expect(result.weeksData[0]?.isCompliant).toBe(false);
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

		const result = validateTopKWeeks(selections, new Date(2025, 0, 1));

		// validateTopKWeeks processes all weeks with selections
		expect(result.weeksData.length).toBeGreaterThanOrEqual(1);

		// First week: 3 WFH out of 5 weekdays
		// With new behavior: oofDays = 3 (wfhDays)
		expect(result.weeksData[0]?.oofDays).toBe(3);
		expect(result.weeksData[0]?.wfhDays).toBe(3);
		expect(result.weeksData[0]?.isCompliant).toBe(false);
		// Complete weeks: 3 WFH out of 5 weekdays
		expect(result.weeksData[1]?.oofDays).toBe(3);
		expect(result.weeksData[1]?.wfhDays).toBe(3);
		expect(result.weeksData[1]?.isCompliant).toBe(false);
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
		const weekStart = new Date(2025, 0, 5); // Sunday, Jan 5
		expect(weeksByOOF.get(weekStart.getTime())).toBe(2);

		// Step 3: calculateOfficeDaysInWeek should adjust for holidays
		const oofDays = calculateOfficeDaysInWeek(
			weeksByOOF,
			weekStart,
			DEFAULT_RTO_POLICY,
			holidayDates,
		);
		// 5 weekdays - 1 holiday = 4 effective weekdays
		// 4 effective weekdays - 2 WFH = 2 office days
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
		// oofDays includes holidays = 2 WFH + 1 holiday = 3
		expect(weekCompliance.oofDays).toBe(3);
		expect(weekCompliance.totalDays).toBe(4); // Adjusted for holiday
		expect(weekCompliance.wfhDays).toBe(2);
	});

	it("should treat holiday WFH selections as non-office days", () => {
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
		// No WFH days, so 4 office days
		const weeksByOOF = groupDatesByWeek(_oofDates, holidayDates);
		const weekStart = new Date(2025, 0, 5); // Sunday, Jan 5
		const oofDays = calculateOfficeDaysInWeek(
			weeksByOOF,
			weekStart,
			DEFAULT_RTO_POLICY,
			holidayDates,
		);
		expect(oofDays).toBe(4); // All 4 effective weekdays are office days
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
		const weekStart = new Date(2025, 0, 5); // Sunday, Jan 5
		const oofDays = calculateOfficeDaysInWeek(
			weeksByOOF,
			weekStart,
			DEFAULT_RTO_POLICY,
			holidayDates,
		);
		// 5 weekdays - 2 holidays = 3 effective weekdays
		// 3 effective weekdays - 1 WFH (Thursday) = 2 office days
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
		const weekStart = new Date(2025, 0, 5); // Sunday, Jan 5
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
