/**
 * Validation Module
 * Exports sliding window validation and constants
 *
 * @module validation
 */

// Re-export elementToDaySelection from dom-adapters for backward compatibility
// (was previously in rto-core, moved to keep validation pure)
export { elementToDaySelection } from "../dom-adapters";
export type { WindowSummary, WindowWeekDetail } from "./all-windows";
export { evaluateAllWindows } from "./all-windows";
export type {
	SolverConfig,
	TwoGroupCombo,
	WfhCombination,
} from "./combination-solver";
export {
	computeBestKAverage,
	DEFAULT_SOLVER_CONFIG,
	getTwoGroupCombinations,
} from "./combination-solver";
export {
	BEST_WEEKS_COUNT,
	COMPLIANCE_THRESHOLD,
	MINIMUM_COMPLIANT_DAYS,
	REQUIRED_OFFICE_DAYS,
	ROLLING_WINDOW_WEEKS,
	TOTAL_WEEK_DAYS,
} from "./constants";
export type {
	RTOPolicyConfig,
	SingleWindowEvaluation,
	SlidingWindowResult,
	WeekCompliance,
} from "./rto-core";
export {
	DEFAULT_RTO_POLICY,
	evaluateSingleWindow,
	validateSlidingWindow,
} from "./rto-core";
