/**
 * Fixture data for weekly OOF patterns
 * Makes tests clearer and easier to edit by providing reusable patterns
 */

import type { DaySelection } from "../../../../lib/rtoValidation";
import { createDaySelection } from "../../../../lib/rtoValidation";

/**
 * Weekly OOF pattern types
 */
export type WeeklyPattern = {
	oofDays: number; // Number of OOF days (0-5)
	officeDays: number; // Number of office days (5 - oofDays)
	isCompliant: boolean; // Whether this week meets 3+ office day requirement
	description: string;
};

/**
 * Common weekly patterns
 */
export const WEEKLY_PATTERNS: Record<string, WeeklyPattern> = {
	// Compliant patterns (3+ office days)
	PERFECT: {
		oofDays: 0,
		officeDays: 5,
		isCompliant: true,
		description: "0 OOF,5 office days (100%)",
	},
	EXCELLENT: {
		oofDays: 1,
		officeDays: 4,
		isCompliant: true,
		description: "1 OOF,4 office days (80%)",
	},
	GOOD: {
		oofDays: 2,
		officeDays: 3,
		isCompliant: true,
		description: "2 OOF,3 office days (60%)",
	},
	MARGINALLY_COMPLIANT: {
		oofDays: 2,
		officeDays: 3,
		isCompliant: true,
		description: "2 OOF,3 office days (60%)",
	},

	// Non-compliant patterns (<3 office days)
	POOR: {
		oofDays: 3,
		officeDays: 2,
		isCompliant: false,
		description: "3 OOF,2 office days (40%)",
	},
	BAD: {
		oofDays: 4,
		officeDays: 1,
		isCompliant: false,
		description: "4 OOF,1 office day (20%)",
	},
	TERRIBLE: {
		oofDays: 5,
		officeDays: 0,
		isCompliant: false,
		description: "5 OOF,0 office days (0%)",
	},
};

/**
 * Create selections for a week with a specific pattern
 * @param year Year of the week
 * @param month Month (0-11) of the week
 * @param dayOfMonth Starting day (Monday)
 * @param patternName Name of the pattern from WEEKLY_PATTERNS
 * @returns Array of DaySelection objects
 */
export function createWeekWithPattern(
	year: number,
	month: number,
	dayOfMonth: number,
	patternName: keyof typeof WEEKLY_PATTERNS,
): DaySelection[] {
	const pattern = WEEKLY_PATTERNS[patternName];
	const selections: DaySelection[] = [];

	// Add OOF days for Monday, Tuesday, etc. based on pattern
	if (!pattern) return selections;

	for (let i = 0; i < pattern.oofDays; i++) {
		selections.push(
			createDaySelection(year, month, dayOfMonth + i, "out-of-office"),
		);
	}

	return selections;
}

/**
 * Create selections for multiple weeks with specified patterns
 * @param startYear Starting year
 * @param startMonth Starting month (0-11)
 * @param startDay Starting day (Monday of first week)
 * @param patterns Array of pattern names for each week
 * @returns Array of DaySelection objects
 */
export function createWeeksWithPatterns(
	startYear: number,
	startMonth: number,
	startDay: number,
	patterns: Array<keyof typeof WEEKLY_PATTERNS>,
): DaySelection[] {
	const selections: DaySelection[] = [];

	patterns.forEach((patternName, weekIndex) => {
		const weekStart = new Date(startYear, startMonth, startDay);
		weekStart.setDate(weekStart.getDate() + weekIndex * 7);

		const weekSelections = createWeekWithPattern(
			weekStart.getFullYear(),
			weekStart.getMonth(),
			weekStart.getDate(),
			patternName,
		);

		selections.push(...weekSelections);
	});

	return selections;
}

/**
 * Pre-built test scenarios
 */

/**
 * Scenario: All 8 weeks compliant (2 WFH each)
 * Expected: Valid (60% compliance)
 */
export const SCENARIO_8_WEEKS_COMPLIANT = {
	selections: createWeeksWithPatterns(2025, 0, 6, [
		"GOOD",
		"GOOD",
		"GOOD",
		"GOOD",
		"GOOD",
		"GOOD",
		"GOOD",
		"GOOD",
	]),
	expected: {
		isValid: true,
		averageOfficeDays: 3,
		averageOfficePercentage: 60,
	},
};

/**
 * Scenario: All 8 weeks non-compliant (3 WFH each)
 * Expected: Invalid (40% compliance)
 */
export const SCENARIO_8_WEEKS_VIOLATION = {
	selections: createWeeksWithPatterns(2025, 0, 6, [
		"POOR",
		"POOR",
		"POOR",
		"POOR",
		"POOR",
		"POOR",
		"POOR",
		"POOR",
	]),
	expected: {
		isValid: false,
		averageOfficeDays: 2,
		averageOfficePercentage: 40,
	},
};

/**
 * Scenario: Mixed compliant weeks with varying patterns
 * Expected: Valid based on average
 */
export const SCENARIO_MIXED_COMPLIANT = {
	selections: createWeeksWithPatterns(2025, 0, 6, [
		"PERFECT",
		"EXCELLENT",
		"GOOD",
		"EXCELLENT",
		"GOOD",
		"PERFECT",
		"EXCELLENT",
		"GOOD",
	]),
	expected: {
		isValid: true,
		averageOfficeDays: 3.875, // (5+4+3+4+3+5+4+3) / 8 = 31/8 = 3.875
		averageOfficePercentage: 77.5,
	},
};

/**
 * Scenario: 12-week period with later weeks very compliant
 * Early weeks: 3 WFH each (40%), Weeks 9-12: 0 WFH (100%)
 * Expected: Top 8 weeks still invalid (only evaluates first 8)
 */
export const SCENARIO_12_WEEKS_LATER_COMPLIANT = {
	selections: createWeeksWithPatterns(2025, 0, 6, [
		"POOR",
		"POOR",
		"POOR",
		"POOR",
		"POOR",
		"POOR",
		"POOR",
		"POOR",
		"PERFECT",
		"PERFECT",
		"PERFECT",
		"PERFECT",
	]),
	expected: {
		isValid: false,
		averageOfficeDays: 2,
		averageOfficePercentage: 40,
	},
};

/**
 * Scenario: Week with one terrible week (5 WFH)
 * Expected: Still valid if other weeks compensate
 */
export const SCENARIO_ONE_BAD_WEEK = {
	selections: createWeeksWithPatterns(2025, 0, 6, [
		"EXCELLENT",
		"EXCELLENT",
		"TERRIBLE", // This week has 0 office days
		"EXCELLENT",
		"EXCELLENT",
		"EXCELLENT",
		"EXCELLENT",
		"EXCELLENT",
	]),
	expected: {
		isValid: true,
		averageOfficeDays: 3.5, // (4+4+0+4+4+4+4+4) / 8 = 28/8 = 3.5
		averageOfficePercentage: 70,
	},
};

/**
 * Scenario: Boundary case - exactly 60% compliant
 * Expected: Valid (60% meets threshold)
 */
export const SCENARIO_BOUNDARY_60_PERCENT = {
	selections: createWeeksWithPatterns(2025, 0, 6, [
		"GOOD",
		"GOOD",
		"GOOD",
		"GOOD",
		"GOOD",
		"GOOD",
		"GOOD",
		"GOOD",
	]),
	expected: {
		isValid: true,
		averageOfficeDays: 3,
		averageOfficePercentage: 60,
	},
};

/**
 * Scenario: Boundary case - just below 60% (59.9%)
 * Created by mixing 2 and 3 WFH days
 * Expected: Invalid
 */
export const SCENARIO_BOUNDARY_BELOW_60_PERCENT = {
	selections: (() => {
		const selections: DaySelection[] = [];
		// Create 7 weeks with 2 WFH (60% each) and 1 week with 3 WFH (40%)
		// Average: (60*7 + 40) / 8 = 460/8 = 57.5%
		for (let i = 0; i < 7; i++) {
			const weekStart = new Date(2025, 0, 6 + i * 7);
			selections.push(
				...createWeekWithPattern(
					weekStart.getFullYear(),
					weekStart.getMonth(),
					weekStart.getDate(),
					"GOOD",
				),
			);
		}
		const lastWeekStart = new Date(2025, 1, 17); // Week 8
		selections.push(
			...createWeekWithPattern(
				lastWeekStart.getFullYear(),
				lastWeekStart.getMonth(),
				lastWeekStart.getDate(),
				"POOR",
			),
		);
		return selections;
	})(),
	expected: {
		isValid: false,
		averageOfficeDays: 2.875, // (3*7 + 2) / 8 = 23/8 = 2.875
		averageOfficePercentage: 57.5,
	},
};

/**
 * Scenario: Empty selections
 * Expected: Valid (no WFH = all office days)
 */
export const SCENARIO_EMPTY_SELECTIONS = {
	selections: [],
	expected: {
		isValid: true,
		averageOfficeDays: 5,
		averageOfficePercentage: 100,
	},
};

/**
 * Helper function to get week start date for a given week number
 * @param weekNumber Week number (1-12, starting from Jan 6, 2025)
 * @returns Date object representing Monday of that week
 */
export function getWeekStartDate(weekNumber: number): Date {
	const baseDate = new Date(2025, 0, 6); // Monday, Jan 6, 2025
	const weekStart = new Date(baseDate);
	weekStart.setDate(baseDate.getDate() + (weekNumber - 1) * 7);
	return weekStart;
}

/**
 * All scenarios exported as an array for easy iteration in tests
 */
export const ALL_SCENARIOS = [
	SCENARIO_8_WEEKS_COMPLIANT,
	SCENARIO_8_WEEKS_VIOLATION,
	SCENARIO_MIXED_COMPLIANT,
	SCENARIO_12_WEEKS_LATER_COMPLIANT,
	SCENARIO_ONE_BAD_WEEK,
	SCENARIO_BOUNDARY_60_PERCENT,
	SCENARIO_BOUNDARY_BELOW_60_PERCENT,
	SCENARIO_EMPTY_SELECTIONS,
];
