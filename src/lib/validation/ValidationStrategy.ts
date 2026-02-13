/**
 * ValidationStrategy
 * Abstract base class for all validation strategies
 *
 * Implements the Strategy pattern for RTO validation with shared logic
 * and abstract methods for specific implementations.
 *
 * @module ValidationStrategy
 */

import type {
	SelectedDay,
	ValidationConfig,
	ValidationResult,
	ValidatorContext,
	WeekCompliance,
	WindowCompliance,
} from "../../types/validation-strategy";

/**
 * Default validation configuration
 */
const DEFAULT_CONFIG: ValidationConfig = {
	minOfficeDaysPerWeek: 3,
	totalWeekdaysPerWeek: 5,
	rollingPeriodWeeks: 12,
	thresholdPercentage: 0.6, // 3/5 = 60%
	debug: false,
};

/**
 * Abstract base class for validation strategies
 *
 * @abstract
 */
export abstract class ValidationStrategy {
	/** Unique identifier for this strategy */
	abstract readonly name: string;

	/** Human-readable description */
	abstract readonly description: string;

	/** Default configuration */
	readonly defaultConfig: ValidationConfig = DEFAULT_CONFIG;

	/** Internal cache for computed results */
	protected cache: Map<string, WeekCompliance | WindowCompliance> = new Map();

	/** Reference week start date */
	protected weekStart: Date | null = null;

	/**
	 * Validate selections according to this strategy's rules
	 *
	 * @param context - Validation context with selections and configuration
	 * @returns Validation result with compliance information
	 * @abstract
	 */
	abstract validate(context: ValidatorContext): ValidationResult;

	/**
	 * Get compliance status for a specific week
	 *
	 * @param weekStart - Start date of week (Sunday)
	 * @param context - Validation context
	 * @returns Week compliance information
	 * @abstract
	 */
	abstract getWeekCompliance(
		weekStart: Date,
		context: ValidatorContext,
	): WeekCompliance;

	/**
	 * Get compliance status for a multi-week window
	 *
	 * @param windowStart - Starting week index
	 * @param windowSize - Number of weeks in window
	 * @param context - Validation context
	 * @returns Window compliance information
	 * @abstract
	 */
	abstract getWindowCompliance(
		windowStart: number,
		windowSize: number,
		context: ValidatorContext,
	): WindowCompliance;

	/**
	 * Check if this strategy is applicable to current selections
	 *
	 * @param context - Validation context
	 * @returns True if this strategy can be applied
	 */
	isApplicable(context: ValidatorContext): boolean {
		if (!context.selectedDays) return false;
		return context.selectedDays.length > 0;
	}

	/**
	 * Reset internal state and clear caches
	 */
	reset(): void {
		this.cache.clear();
		this.weekStart = null;
	}

	/**
	 * Get the start of week (Sunday) for a given date
	 *
	 * @param date - Date object or selected day
	 * @returns Start of week (Sunday)
	 * @protected
	 */
	protected _getStartOfWeek(date: Date | SelectedDay | null | undefined): Date {
		if (!date) {
			return this.weekStart ?? new Date();
		}

		const d = this._parseDateInput(date);
		const dayOfWeek = d.getDay();
		const sunday = new Date(d);

		sunday.setDate(d.getDate() - dayOfWeek);
		sunday.setHours(0, 0, 0, 0);

		return sunday;
	}

	/**
	 * Parse various date input formats into a Date object
	 *
	 * @param date - Date input (Date object or SelectedDay)
	 * @returns Parsed Date object
	 * @throws {Error} If date input is invalid
	 * @private
	 */
	private _parseDateInput(date: Date | SelectedDay): Date {
		if (date instanceof Date) {
			return new Date(date);
		}

		if (this._isSelectedDay(date)) {
			return new Date(date.year, date.month, date.day);
		}

		throw new Error(
			`Invalid date input: expected Date or SelectedDay, got ${typeof date}`,
		);
	}

	/**
	 * Type guard to check if value is a SelectedDay
	 *
	 * @param value - Value to check
	 * @returns True if value is a SelectedDay
	 * @private
	 */
	private _isSelectedDay(value: unknown): value is SelectedDay {
		return (
			typeof value === "object" &&
			value !== null &&
			"year" in value &&
			"month" in value &&
			"day" in value
		);
	}

	/**
	 * Get week number from start of year (1-based)
	 *
	 * @param date - Date to get week number for
	 * @returns Week number
	 * @protected
	 */
	protected _getWeekNumber(date: Date): number {
		const yearStart = new Date(date.getFullYear(), 0, 1);
		const diffTime = date.getTime() - yearStart.getTime();
		const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

		return Math.floor(diffDays / 7) + 1;
	}

	/**
	 * Group selected days by their week start date
	 *
	 * @param days - Array of selected days
	 * @param _weekStart - Reference week start for indexing (unused, maintained for API compatibility)
	 * @returns Map of week start timestamp to WFH day count
	 * @protected
	 */
	protected _groupDaysByWeek(
		days: SelectedDay[],
		_weekStart: Date,
	): Map<number, number> {
		const weeksMap = new Map<number, number>();

		days.forEach((day) => {
			const dayDate = new Date(day.year, day.month, day.day);
			const dayOfWeek = dayDate.getDay();
			const sundayDate = new Date(dayDate);

			sundayDate.setDate(dayDate.getDate() - dayOfWeek);
			sundayDate.setHours(0, 0, 0, 0);

			const weekKey = sundayDate.getTime();
			const currentCount = weeksMap.get(weekKey) ?? 0;

			weeksMap.set(weekKey, currentCount + 1);
		});

		return weeksMap;
	}

	/**
	 * Get total weeks in the calendar period
	 *
	 * @param context - Validation context with calendar dates
	 * @returns Total number of weeks
	 * @protected
	 */
	protected _getTotalWeeks(context: ValidatorContext): number {
		if (context.calendarStartDate && context.calendarEndDate) {
			const diffTime =
				context.calendarEndDate.getTime() - context.calendarStartDate.getTime();
			const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

			return Math.ceil(diffDays / 7);
		}

		// Default to 52 weeks for a full year
		return 52;
	}

	/**
	 * Merge context config with defaults
	 *
	 * @param context - Validation context
	 * @returns Merged configuration
	 * @protected
	 */
	protected _mergeConfig(context: ValidatorContext): ValidationConfig {
		return { ...this.defaultConfig, ...context.config };
	}

	/**
	 * Calculate if a week is compliant based on configuration
	 *
	 * @param officeDays - Number of office days
	 * @param totalDays - Total weekdays in week
	 * @param thresholdPercentage - Required threshold
	 * @returns Compliance percentage and status
	 * @protected
	 */
	protected _calculateComplianceStatus(
		officeDays: number,
		totalDays: number,
		thresholdPercentage: number,
	): { percentage: number; isCompliant: boolean } {
		const percentage = totalDays > 0 ? (officeDays / totalDays) * 100 : 100;
		const isCompliant = percentage >= thresholdPercentage * 100;

		return { percentage, isCompliant };
	}

	/**
	 * Check cache for existing result
	 *
	 * @param cacheKey - Key to look up
	 * @returns Cached result or undefined
	 * @protected
	 */
	protected _getCachedResult<T extends WeekCompliance | WindowCompliance>(
		cacheKey: string,
	): T | undefined {
		return this.cache.get(cacheKey) as T | undefined;
	}

	/**
	 * Store result in cache
	 *
	 * @param cacheKey - Key for storage
	 * @param result - Result to cache
	 * @protected
	 */
	protected _setCachedResult(
		cacheKey: string,
		result: WeekCompliance | WindowCompliance,
	): void {
		this.cache.set(cacheKey, result);
	}

	/**
	 * Log debug message if debug mode enabled
	 *
	 * @param config - Validation configuration
	 * @param message - Message to log
	 * @protected
	 */
	protected _logDebug(config: ValidationConfig, message: string): void {
		if (config.debug) {
			console.log(`[${this.name}] ${message}`);
		}
	}

	/**
	 * Select the best N weeks by compliance percentage
	 *
	 * @param weeks - Array of week compliance data
	 * @param count - Number of best weeks to select
	 * @returns Array of top N weeks sorted by compliance percentage (descending)
	 * @protected
	 */
	protected _selectBestWeeks(
		weeks: WeekCompliance[],
		count: number,
	): WeekCompliance[] {
		// Early exit: if count exceeds weeks length, return sorted copy of all weeks
		if (count >= weeks.length) {
			return [...weeks].sort((a, b) => b.percentage - a.percentage);
		}

		// Early exit: if count is 0 or negative, return empty array
		if (count <= 0) {
			return [];
		}

		// Sort by compliance percentage descending and take top N
		return [...weeks]
			.sort((a, b) => b.percentage - a.percentage)
			.slice(0, count);
	}
}

export default ValidationStrategy;
