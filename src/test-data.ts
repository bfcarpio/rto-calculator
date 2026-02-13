/**
 * Shared Test Data for RTO Calculator
 *
 * Central export point for all test fixtures, enabling sharing between
 * unit tests (Vitest) and E2E tests (Playwright).
 *
 * This file re-exports all fixtures so both test types can import from
 * a single location. Unit tests import from the source, while E2E tests
 * are configured to resolve this module during test compilation.
 *
 * @module test-data
 */

// ============================================================================
// Re-export all fixtures for shared usage
// ============================================================================

// Re-export from fixtures index (includes calendarData, slidingWindowScenarios, weeklyPatterns)
export * from "./utils/astro/__tests__/fixtures";

// Re-export responsive scenarios separately (not in fixtures index)
export * from "./utils/astro/__tests__/fixtures/responsiveScenarios";
// Sliding window scenarios
export {
	ALL_SLIDING_WINDOW_SCENARIOS,
	COMPLIANT_SCENARIOS,
	EARLY_EXIT_SCENARIOS,
	FULL_SEARCH_SCENARIOS,
	getScenarioByName,
	NON_COMPLIANT_SCENARIOS,
	SCENARIO_ALL_EMPTY,
	SCENARIO_ALL_WEEKS_VIOLATION,
	SCENARIO_EARLY_EXIT,
	SCENARIO_EXPANDING_WINDOW,
	SCENARIO_GRADIENT_IMPROVEMENT,
	SCENARIO_LATE_BEST,
	SCENARIO_MIDDLE_BEST,
	SCENARIO_TWO_OPTIMAL_WINDOWS,
	type SlidingWindowScenario,
	SW_SCENARIO_BOUNDARY_60_PERCENT,
	SW_SCENARIO_ONE_BAD_WEEK,
} from "./utils/astro/__tests__/fixtures/slidingWindowScenarios";
// Weekly patterns and scenarios
export {
	ALL_SCENARIOS,
	createWeeksWithPatterns,
	createWeekWithPattern,
	getWeekStartDate,
	SCENARIO_8_WEEKS_COMPLIANT,
	SCENARIO_8_WEEKS_VIOLATION,
	SCENARIO_12_WEEKS_LATER_COMPLIANT,
	SCENARIO_BOUNDARY_60_PERCENT,
	SCENARIO_BOUNDARY_BELOW_60_PERCENT,
	SCENARIO_EMPTY_SELECTIONS,
	SCENARIO_MIXED_COMPLIANT,
	SCENARIO_ONE_BAD_WEEK,
	WEEKLY_PATTERNS,
	type WeeklyPattern,
} from "./utils/astro/__tests__/fixtures/weeklyPatterns";
