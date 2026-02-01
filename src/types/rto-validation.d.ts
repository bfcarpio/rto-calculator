/**
 * Type declarations for RTO Validation module
 * Provides types for RTOValidation object attached to window
 */

declare global {
	interface Window {
		RTOValidation?: RTOValidationAPI;
		validationManager?: import("./scripts/ValidationManager").ValidationManager;
	}
}

/**
 * Compliance result from validation
 */
interface ComplianceResult {
	isValid: boolean;
	message: string;
	overallCompliance: number;
}

/**
 * Configuration for RTO validation
 */
interface RTOValidationConfig {
	DEBUG: boolean;
	minOfficeDaysPerWeek: number;
	totalWeekdaysPerWeek: number;
	rollingPeriodWeeks: number;
	thresholdPercentage: number;
}

/**
 * API for RTO validation operations
 */
interface RTOValidationAPI {
	/**
	 * Configuration object
	 */
	CONFIG: RTOValidationConfig;
	/**
	 * Calculate rolling compliance over a 12-week period
	 * @returns Compliance result with validation status and message
	 */
	calculateRollingCompliance(): ComplianceResult;

	/**
	 * Update the compliance indicator display
	 * @param result - Optional compliance result to display
	 */
	updateComplianceIndicator(result?: ComplianceResult): void;

	/**
	 * Highlight the current week in the calendar
	 */
	highlightCurrentWeek(): void;

	/**
	 * Run basic validation without highlighting
	 */
	runValidation(): void;

	/**
	 * Run validation with real-time highlighting of evaluated weeks
	 */
	runValidationWithHighlights(): void;

	/**
	 * Clear all validation highlights from the calendar
	 * Includes clearing status icons and any day cell highlights
	 */
	clearAllValidationHighlights(): void;

	/**
	 * Clean up RTO validation resources and event listeners
	 */
	cleanupRTOValidation(): void;
}

export {};
