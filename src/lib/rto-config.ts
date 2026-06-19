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
};
