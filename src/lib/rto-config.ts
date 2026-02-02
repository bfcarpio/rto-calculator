/**
 * Centralized RTO Configuration
 *
 * Contains all configuration constants used across the RTO validation system.
 * This ensures consistency and eliminates configuration duplication.
 *
 * @module rto-config
 */

/**
 * Default RTO configuration constants
 */
export const RTO_CONFIG = {
	/** Minimum number of office days required per week for compliance */
	minOfficeDaysPerWeek: 3,

	/** Total number of weekdays in a standard work week */
	totalWeekdaysPerWeek: 5,

	/** Debug mode flag for verbose logging */
	DEBUG: false,
};

/**
 * Default sliding window validation policy
 */
export const DEFAULT_POLICY = {
	/** Minimum office days per week threshold */
	minOfficeDaysPerWeek: RTO_CONFIG.minOfficeDaysPerWeek,

	/** Total weekdays per week for calculations */
	totalWeekdaysPerWeek: RTO_CONFIG.totalWeekdaysPerWeek,

	/** Compliance threshold percentage (0.6 = 60%) */
	thresholdPercentage: 0.6,

	/** Rolling period in weeks for sliding window validation */
	rollingPeriodWeeks: 12,

	/** Number of top weeks to check for compliance */
	topWeeksToCheck: 8,

	/** Number of best weeks to evaluate (defaults to window size) */
	bestWeeksCount: undefined as number | undefined,

	/** Whether to evaluate only the best performing weeks (disabled by default for backward compatibility) */
	evaluateBestWeeksOnly: false,
};

/**
 * Get the minimum office days per week setting
 * @returns The configured minimum office days per week
 */
export function getMinOfficeDaysPerWeek(): number {
	return RTO_CONFIG.minOfficeDaysPerWeek;
}

/**
 * Get the total weekdays per week setting
 * @returns The total number of weekdays in a week
 */
export function getTotalWeekdaysPerWeek(): number {
	return RTO_CONFIG.totalWeekdaysPerWeek;
}

/**
 * Check if debug mode is enabled
 * @returns True if debug mode is enabled
 */
export function isDebugEnabled(): boolean {
	return RTO_CONFIG.DEBUG;
}
