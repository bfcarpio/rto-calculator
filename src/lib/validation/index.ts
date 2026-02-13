/**
 * Validation Module
 * Exports sliding window validation and constants
 *
 * @module validation
 */

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
	SlidingWindowResult,
	WeekCompliance,
} from "./rto-core";
export { DEFAULT_RTO_POLICY, validateSlidingWindow } from "./rto-core";
