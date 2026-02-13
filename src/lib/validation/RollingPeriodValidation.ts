/**
 * Rolling Period Validation
 * Validates RTO compliance over rolling 12-week periods
 *
 * Direct implementation using the new strategy pattern via ValidationFactory.
 *
 * @module RollingPeriodValidation
 */

import type {
	ValidationConfig,
	ValidationResult,
	ValidatorContext,
	WeekCompliance,
	WindowCompliance,
} from "../../types/validation-strategy";
import { ValidationFactory } from "./ValidationFactory";

/**
 * Default validation configuration
 */
const DEFAULT_CONFIG: ValidationConfig = {
	minOfficeDaysPerWeek: 3,
	totalWeekdaysPerWeek: 5,
	rollingPeriodWeeks: 12,
	thresholdPercentage: 0.6,
	debug: false,
};

/**
 * RollingPeriodValidation class
 *
 * Direct implementation using the new strategy pattern via ValidationFactory.
 * This class provides a simplified interface that directly uses the strategy pattern.
 */
export class RollingPeriodValidation {
	/** Unique identifier for this validation strategy */
	readonly name = "rolling-period";

	/** Human-readable description */
	readonly description =
		"Validates RTO compliance over rolling 12-week periods";

	/** Default configuration */
	readonly defaultConfig: ValidationConfig = DEFAULT_CONFIG;

	/**
	 * Validate selections according to rolling period rules
	 *
	 * @param context - Validation context
	 * @param validationMode - Validation mode: 'strict' or 'average'
	 * @returns Validation result
	 */
	validate(
		context: ValidatorContext,
		validationMode: "strict" | "average" = "strict",
	): ValidationResult {
		// Early exit: check if selections exist
		if (!context.selectedDays || context.selectedDays.length === 0) {
			return this._createEmptyResult(validationMode);
		}

		// Get validator for the requested mode
		const validator = ValidationFactory.createValidator(validationMode);

		// Merge config with defaults
		const mergedContext: ValidatorContext = {
			...context,
			config: { ...this.defaultConfig, ...context.config },
		};

		// Run validation through strategy
		return validator.validate(mergedContext);
	}

	/**
	 * Get compliance status for a specific week
	 *
	 * @param weekStart - Start date of week
	 * @param context - Validation context
	 * @param validationMode - Validation mode: 'strict' or 'average'
	 * @returns Week compliance information
	 */
	getWeekCompliance(
		weekStart: Date,
		context: ValidatorContext,
		validationMode: "strict" | "average" = "strict",
	): WeekCompliance {
		// Get validator for the requested mode
		const validator = ValidationFactory.createValidator(validationMode);

		// Merge config with defaults
		const mergedContext: ValidatorContext = {
			...context,
			config: { ...this.defaultConfig, ...context.config },
		};

		return validator.getWeekCompliance(weekStart, mergedContext);
	}

	/**
	 * Get compliance status for a multi-week window
	 *
	 * @param windowStart - Starting week index
	 * @param windowSize - Number of weeks in window
	 * @param context - Validation context
	 * @param validationMode - Validation mode: 'strict' or 'average'
	 * @returns Window compliance information
	 */
	getWindowCompliance(
		windowStart: number,
		windowSize: number,
		context: ValidatorContext,
		validationMode: "strict" | "average" = "average",
	): WindowCompliance {
		// Get validator for the requested mode
		const validator = ValidationFactory.createValidator(validationMode);

		// Merge config with defaults
		const mergedContext: ValidatorContext = {
			...context,
			config: { ...this.defaultConfig, ...context.config },
		};

		return validator.getWindowCompliance(
			windowStart,
			windowSize,
			mergedContext,
		);
	}

	/**
	 * Check if this strategy is applicable to current selections
	 *
	 * @param context - Validation context
	 * @returns True if applicable
	 */
	isApplicable(context: ValidatorContext): boolean {
		// Early exit: check if selections exist
		if (!context.selectedDays) return false;
		return context.selectedDays.length > 0;
	}

	/**
	 * Create result for empty selections
	 *
	 * @param validationMode - Validation mode used
	 * @returns Empty validation result
	 * @private
	 */
	private _createEmptyResult(validationMode: string): ValidationResult {
		return {
			isValid: true,
			message: "No selections to validate",
			overallCompliance: 100,
			windowResults: [],
			violatingWindows: [],
			compliantWindows: [],
			validationMode,
		};
	}
}

export default RollingPeriodValidation;
