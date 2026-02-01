/**
 * Validation Strategy Types
 * Defines types and interfaces for validation implementations
 */

/**
 * Date range for validation
 */
export interface DateRange {
	startDate: Date;
	endDate: Date;
}

/**
 * Individual day selection type
 */
export type DaySelectionType = "out-of-office" | "none";

/**
 * Selected day information
 */
export interface SelectedDay {
	year: number;
	month: number; // 0-11 (January-December)
	day: number; // 1-31
	type: DaySelectionType;
}

/**
 * Week compliance information
 */
export interface WeekCompliance {
	weekStart: Date;
	weekNumber: number;
	totalDays: number;
	workFromHomeDays: number;
	officeDays: number;
	isCompliant: boolean;
	percentage: number;
}

/**
 * Window compliance result for a multi-week period
 */
export interface WindowCompliance {
	windowStart: number; // Starting week index
	windowEnd: number; // Ending week index
	weeks: WeekCompliance[];
	totalOfficeDays: number;
	totalWeekdays: number;
	averageOfficeDaysPerWeek: number;
	compliancePercentage: number;
	isCompliant: boolean;
	requiredOfficeDays: number;
	requiredPercentage: number;
}

/**
 * Overall validation result
 */
export interface ValidationResult {
	isValid: boolean;
	message: string;
	overallCompliance: number;
	windowResults: WindowCompliance[];
	violatingWindows: WindowCompliance[];
	compliantWindows: WindowCompliance[];
}

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

/**
 * Context provided to validators
 */
export interface ValidatorContext {
	selectedDays: SelectedDay[];
	config: ValidationConfig;
	calendarStartDate?: Date;
	calendarEndDate?: Date;
}

/**
 * Validator Interface
 * All validation implementations must implement this interface
 */
export interface Validator {
	/**
	 * Unique identifier for this validation strategy
	 */
	readonly name: string;

	/**
	 * Human-readable description of what this strategy validates
	 */
	readonly description: string;

	/**
	 * Default configuration for this strategy
	 */
	readonly defaultConfig: ValidationConfig;

	/**
	 * Validate the selections according to this validator's rules
	 * @param context - Validator context with selections and configuration
	 * @returns Validation result with compliance information
	 */
	validate(
		context: ValidatorContext,
	): Promise<ValidationResult> | ValidationResult;

	/**
	 * Get the compliance status for a specific week
	 * @param weekStart - Start date of week
	 * @param context - Validator context
	 * @returns Week compliance information
	 */
	getWeekCompliance(weekStart: Date, context: ValidatorContext): WeekCompliance;

	/**
	 * Get compliance status for a multi-week window
	 * @param windowStart - Starting week index
	 * @param windowSize - Number of weeks in window
	 * @param context - Validator context
	 * @returns Window compliance information
	 */
	getWindowCompliance(
		windowStart: number,
		windowSize: number,
		context: ValidatorContext,
	): WindowCompliance;

	/**
	 * Reset any internal state or caches
	 */
	reset(): void;

	/**
	 * Check if this validator is applicable to the current selections
	 * @param context - Validator context
	 * @returns True if this validator can be applied
	 */
	isApplicable(context: ValidatorContext): boolean;
}

/**
 * Validator Factory
 * Creates and manages validator instances
 */
export interface ValidatorFactory {
	/**
	 * Get a validator by name
	 * @param name - Validator name
	 * @returns Validator instance or undefined
	 */
	getValidator(name: string): Validator | undefined;

	/**
	 * Get all available validators
	 * @returns Array of all available validators
	 */
	getAllValidators(): Validator[];

	/**
	 * Register a new validator
	 * @param validator - Validator to register
	 */
	registerValidator(validator: Validator): void;

	/**
	 * Get the default validator
	 * @returns Default validator instance
	 */
	GetDefaultValidator(): Validator;
}

/**
 * Validation result display format
 */
export interface ValidationResultDisplay {
	icon: string;
	message: string;
	details: string;
	style: "success" | "warning" | "error" | "info";
}

/**
 * Progress callback for long-running validations
 */
export type ValidationProgressCallback = (
	currentWeek: number,
	totalWeeks: number,
	message: string,
) => void;
