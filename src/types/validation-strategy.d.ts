/**
 * Validation Strategy Types
 * Defines types used by the simplified ValidationManager
 */

/**
 * Validation configuration options
 */
export interface ValidationConfig {
	minOfficeDaysPerWeek: number;
	totalWeekdaysPerWeek: number;
	rollingPeriodWeeks: number;
	thresholdPercentage: number;
	debug: boolean;
}
