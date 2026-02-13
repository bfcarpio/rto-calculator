/**
 * Fixture with sliding window test scenarios
 * Tests the sliding window optimization for finding the best 8-week period
 * across all possible 12-week windows
 */

import type { DaySelection } from "../../../../lib/rtoValidation";
import { createDaySelection } from "../../../../lib/rtoValidation";

/**
 * Sliding window scenario configuration
 */
export interface SlidingWindowScenario {
	name: string;
	description: string;
	selections: DaySelection[];
	expected: {
		isValid: boolean;
		averageOfficeDays: number;
		averageOfficePercentage: number;
		bestWindowStart?: number; // Which 12-week window has the best 8-week period
		earlyExit?: boolean; // Whether algorithm should exit early
	};
}

/**
 * Create a week with specific OOF days
 * @param weekNumber Week number (1-12, starting Jan 6, 2025)
 * @param oofCount Number of OOF days (0-5)
 * @returns Array of DaySelection objects
 */
function createWeekOOF(weekNumber: number, oofCount: number): DaySelection[] {
	const selections: DaySelection[] = [];
	const baseDate = new Date(2025, 0, 6); // Monday, Jan 6, 2025
	const weekStart = new Date(baseDate);
	weekStart.setDate(baseDate.getDate() + (weekNumber - 1) * 7);

	// Add OOF days starting from Monday
	for (let i = 0; i < oofCount; i++) {
		selections.push(
			createDaySelection(
				weekStart.getFullYear(),
				weekStart.getMonth(),
				weekStart.getDate() + i,
				"out-of-office",
			),
		);
	}

	return selections;
}

/**
 * Scenario 1: Expanding window - first 8 weeks compliant
 * Weeks 1-8: 3 OOF each (2 office days = 40%)
 * Weeks 9-12: 0 OOF (5 office days = 100%)
 * Expected: Valid (algorithm finds best 8-week period in any window)
 */
export const SCENARIO_EXPANDING_WINDOW: SlidingWindowScenario = {
	name: "Expanding Window",
	description:
		"First 8 weeks partially compliant, later weeks fully compliant. Algorithm finds best window.",
	selections: (() => {
		const selections: DaySelection[] = [];
		// Weeks 1-8: 3 OOF each (2 office days)
		for (let week = 1; week <= 8; week++) {
			selections.push(...createWeekOOF(week, 3));
		}
		// Weeks 9-12: 0 OOF (5 office days) - these should be used for best window
		for (let week = 9; week <= 12; week++) {
			selections.push(...createWeekOOF(week, 0));
		}
		return selections;
	})(),
	expected: {
		isValid: true,
		averageOfficeDays: 4.375, // Best 8 weeks: 4 weeks of 5 days + 4 weeks of 2 days = 35/8 = 4.375
		averageOfficePercentage: 87.5,
		bestWindowStart: 0, // First window (weeks 1-12) contains best 8 weeks (weeks 9-12 + 4 from 1-8)
		earlyExit: false, // Should not exit early, need to find best window
	},
};

/**
 * Scenario 2: All 12 weeks non-compliant
 * All weeks: 3 OOF each (2 office days = 40%)
 * Expected: Invalid (no compliant period exists)
 */
export const SCENARIO_ALL_WEEKS_VIOLATION: SlidingWindowScenario = {
	name: "All Weeks Violation",
	description: "All 12 weeks have 3 OOF days. No compliant period exists.",
	selections: (() => {
		const selections: DaySelection[] = [];
		for (let week = 1; week <= 12; week++) {
			selections.push(...createWeekOOF(week, 3));
		}
		return selections;
	})(),
	expected: {
		isValid: false,
		averageOfficeDays: 2, // Best 8 weeks: all have 2 office days
		averageOfficePercentage: 40,
		earlyExit: true, // Exit early on first invalid window (all windows are invalid)
	},
};

/**
 * Scenario 3: Middle weeks are best
 * Weeks 1-3: 4 OOF (1 office day)
 * Weeks 4-9: 0 OOF (5 office days) - best period
 * Weeks 10-12: 4 OOF (1 office day)
 * Expected: Valid, finds weeks 4-9 as best 8-week period
 */
export const SCENARIO_MIDDLE_BEST: SlidingWindowScenario = {
	name: "Middle Weeks Best",
	description: "Middle weeks (4-9) are fully compliant. Algorithm finds them.",
	selections: (() => {
		const selections: DaySelection[] = [];
		// Weeks 1-3: 4 OOF (1 office day)
		for (let week = 1; week <= 3; week++) {
			selections.push(...createWeekOOF(week, 4));
		}
		// Weeks 4-9: 0 OOF (5 office days) - optimal period
		for (let week = 4; week <= 9; week++) {
			selections.push(...createWeekOOF(week, 0));
		}
		// Weeks 10-12: 4 OOF (1 office day)
		for (let week = 10; week <= 12; week++) {
			selections.push(...createWeekOOF(week, 4));
		}
		return selections;
	})(),
	expected: {
		isValid: true,
		averageOfficeDays: 5, // Best 8 weeks: weeks 4-9 + 2 from 4-9 = all 5 days
		averageOfficePercentage: 100,
		bestWindowStart: 1, // Second window (weeks 2-13, but we only have 12) contains best period
		earlyExit: false,
	},
};

/**
 * Scenario 4: Early exit optimization
 * Week 1-12: All have 5 OOF (0 office days) except week 1
 * Week 1: 0 OOF (5 office days)
 * Expected: Invalid, should exit early (all windows invalid except maybe one)
 */
export const SCENARIO_EARLY_EXIT: SlidingWindowScenario = {
	name: "Early Exit Optimization",
	description:
		"Most weeks are terrible. Algorithm exits early on first invalid window.",
	selections: (() => {
		const selections: DaySelection[] = [];
		// Week 1: 0 OOF (5 office days)
		selections.push(...createWeekOOF(1, 0));
		// Weeks 2-12: 5 OOF (0 office days)
		for (let week = 2; week <= 12; week++) {
			selections.push(...createWeekOOF(week, 5));
		}
		return selections;
	})(),
	expected: {
		isValid: false,
		averageOfficeDays: 0.625, // Best 8 weeks: 1 week of 5 + 7 weeks of 0 = 5/8 = 0.625
		averageOfficePercentage: 12.5,
		earlyExit: true, // Exit early as most windows are invalid
	},
};

/**
 * Scenario 5: Late weeks best
 * Weeks 1-4: 5 OOF (0 office days)
 * Weeks 5-12: 0 OOF (5 office days) - best period
 * Expected: Valid, finds weeks 5-12 as best 8-week period
 */
export const SCENARIO_LATE_BEST: SlidingWindowScenario = {
	name: "Late Weeks Best",
	description:
		"Last 8 weeks are fully compliant. Algorithm slides to find them.",
	selections: (() => {
		const selections: DaySelection[] = [];
		// Weeks 1-4: 5 OOF (0 office days)
		for (let week = 1; week <= 4; week++) {
			selections.push(...createWeekOOF(week, 5));
		}
		// Weeks 5-12: 0 OOF (5 office days)
		for (let week = 5; week <= 12; week++) {
			selections.push(...createWeekOOF(week, 0));
		}
		return selections;
	})(),
	expected: {
		isValid: true,
		averageOfficeDays: 5, // Best 8 weeks: weeks 5-12 = all 5 days
		averageOfficePercentage: 100,
		bestWindowStart: 4, // Fifth window (weeks 5-16, but we have 5-12)
		earlyExit: false, // Must search all windows to find best
	},
};

/**
 * Scenario 6: Gradient improvement
 * Weeks improve from worst to best
 * Week 1: 5 OOF (0 office days)
 * Week 2: 4 OOF (1 office day)
 * Week 3: 3 OOF (2 office days)
 * Week 4: 2 OOF (3 office days)
 * Week 5: 1 OOF (4 office days)
 * Week 6-12: 0 OOF (5 office days)
 * Expected: Valid, picks best 8 weeks (weeks 5-12)
 */
export const SCENARIO_GRADIENT_IMPROVEMENT: SlidingWindowScenario = {
	name: "Gradient Improvement",
	description:
		"Weeks progressively improve. Algorithm finds the best later window.",
	selections: (() => {
		const selections: DaySelection[] = [];
		const wfhCounts = [5, 4, 3, 2, 1, 0, 0, 0, 0, 0, 0, 0];
		for (let week = 1; week <= 12; week++) {
			selections.push(...createWeekOOF(week, wfhCounts[week - 1]!));
		}
		return selections;
	})(),
	expected: {
		isValid: true,
		averageOfficeDays: 4.875, // Best 8 weeks: 1 week of 4 + 7 weeks of 5 = 39/8 = 4.875
		averageOfficePercentage: 97.5,
		bestWindowStart: 4, // Best window starts at week 5
		earlyExit: false,
	},
};

/**
 * Scenario 7: Two optimal windows
 * Weeks 1-4: 0 OOF (5 office days)
 * Weeks 5-8: 3 OOF (2 office days)
 * Weeks 9-12: 0 OOF (5 office days)
 * Expected: Valid, should find either early or late optimal window
 */
export const SCENARIO_TWO_OPTIMAL_WINDOWS: SlidingWindowScenario = {
	name: "Two Optimal Windows",
	description:
		"Two separate optimal periods exist. Algorithm finds the first one.",
	selections: (() => {
		const selections: DaySelection[] = [];
		// Weeks 1-4: 0 OOF (5 office days)
		for (let week = 1; week <= 4; week++) {
			selections.push(...createWeekOOF(week, 0));
		}
		// Weeks 5-8: 3 OOF (2 office days)
		for (let week = 5; week <= 8; week++) {
			selections.push(...createWeekOOF(week, 3));
		}
		// Weeks 9-12: 0 OOF (5 office days)
		for (let week = 9; week <= 12; week++) {
			selections.push(...createWeekOOF(week, 0));
		}
		return selections;
	})(),
	expected: {
		isValid: true,
		averageOfficeDays: 4.625, // Best 8 weeks: weeks 1-4 + 4 from 9-12 = 37/8 = 4.625
		averageOfficePercentage: 92.5,
		bestWindowStart: 0, // First window has 4+4 optimal weeks
		earlyExit: false,
	},
};

/**
 * Scenario 8: Boundary - exactly 60% compliant in best window
 * Mix of weeks to achieve exactly 60% in best 8-week period
 */
export const SW_SCENARIO_BOUNDARY_60_PERCENT: SlidingWindowScenario = {
	name: "Boundary - 60% Compliant",
	description: "Best 8-week period achieves exactly 60% compliance threshold.",
	selections: (() => {
		const selections: DaySelection[] = [];
		// Weeks 1-8: 2 OOF each (3 office days = 60%)
		for (let week = 1; week <= 8; week++) {
			selections.push(...createWeekOOF(week, 2));
		}
		// Weeks 9-12: 5 OOF (0 office days) - won't affect best window
		for (let week = 9; week <= 12; week++) {
			selections.push(...createWeekOOF(week, 5));
		}
		return selections;
	})(),
	expected: {
		isValid: true,
		averageOfficeDays: 3,
		averageOfficePercentage: 60,
		earlyExit: false,
	},
};

/**
 * Scenario 9: All empty selections (best case)
 * No OOF selections = all office days
 * Expected: Valid (100% compliant)
 */
export const SCENARIO_ALL_EMPTY: SlidingWindowScenario = {
	name: "All Empty Selections",
	description: "No OOF selections. Fully compliant.",
	selections: [],
	expected: {
		isValid: true,
		averageOfficeDays: 5,
		averageOfficePercentage: 100,
		earlyExit: false,
	},
};

/**
 * Scenario 10: Mixed with one very bad week in otherwise good period
 * Weeks 1-7: 0 OOF (5 office days)
 * Week 8: 5 OOF (0 office days)
 * Weeks 9-12: 0 OOF (5 office days)
 * Expected: Valid, excludes the bad week from best 8-week period
 */
export const SW_SCENARIO_ONE_BAD_WEEK: SlidingWindowScenario = {
	name: "One Bad Week",
	description:
		"One terrible week in otherwise perfect period. Algorithm excludes it.",
	selections: (() => {
		const selections: DaySelection[] = [];
		// Weeks 1-7: 0 OOF (5 office days)
		for (let week = 1; week <= 7; week++) {
			selections.push(...createWeekOOF(week, 0));
		}
		// Week 8: 5 OOF (0 office days)
		selections.push(...createWeekOOF(8, 5));
		// Weeks 9-12: 0 OOF (5 office days)
		for (let week = 9; week <= 12; week++) {
			selections.push(...createWeekOOF(week, 0));
		}
		return selections;
	})(),
	expected: {
		isValid: true,
		averageOfficeDays: 5, // Best 8 weeks: exclude week 8, use weeks 9-12 + 4 from 1-7 = all 5 days
		averageOfficePercentage: 100,
		bestWindowStart: 1, // Second window has weeks 2-9 (excludes week 1, includes 9 which is good)
		earlyExit: false,
	},
};

/**
 * All sliding window scenarios for easy iteration
 */
export const ALL_SLIDING_WINDOW_SCENARIOS: SlidingWindowScenario[] = [
	SCENARIO_EXPANDING_WINDOW,
	SCENARIO_ALL_WEEKS_VIOLATION,
	SCENARIO_MIDDLE_BEST,
	SCENARIO_EARLY_EXIT,
	SCENARIO_LATE_BEST,
	SCENARIO_GRADIENT_IMPROVEMENT,
	SCENARIO_TWO_OPTIMAL_WINDOWS,
	SW_SCENARIO_BOUNDARY_60_PERCENT,
	SCENARIO_ALL_EMPTY,
	SW_SCENARIO_ONE_BAD_WEEK,
];

/**
 * Get a scenario by name
 * @param name Name of the scenario
 * @returns The scenario or undefined if not found
 */
export function getScenarioByName(
	name: string,
): SlidingWindowScenario | undefined {
	return ALL_SLIDING_WINDOW_SCENARIOS.find((s) => s.name === name);
}

/**
 * Scenarios that should trigger early exit optimization
 */
export const EARLY_EXIT_SCENARIOS: SlidingWindowScenario[] = [
	SCENARIO_ALL_WEEKS_VIOLATION,
	SCENARIO_EARLY_EXIT,
];

/**
 * Scenarios that should NOT trigger early exit (need to search all windows)
 */
export const FULL_SEARCH_SCENARIOS: SlidingWindowScenario[] = [
	SCENARIO_EXPANDING_WINDOW,
	SCENARIO_MIDDLE_BEST,
	SCENARIO_LATE_BEST,
	SCENARIO_GRADIENT_IMPROVEMENT,
	SCENARIO_TWO_OPTIMAL_WINDOWS,
	SW_SCENARIO_BOUNDARY_60_PERCENT,
	SCENARIO_ALL_EMPTY,
	SW_SCENARIO_ONE_BAD_WEEK,
];

/**
 * Compliant scenarios (isValid: true)
 */
export const COMPLIANT_SCENARIOS: SlidingWindowScenario[] =
	ALL_SLIDING_WINDOW_SCENARIOS.filter((s) => s.expected.isValid);

/**
 * Non-compliant scenarios (isValid: false)
 */
export const NON_COMPLIANT_SCENARIOS: SlidingWindowScenario[] =
	ALL_SLIDING_WINDOW_SCENARIOS.filter((s) => !s.expected.isValid);
