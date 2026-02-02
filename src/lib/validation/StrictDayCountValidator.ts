/**
 * StrictDayCountValidator
 * Validates RTO compliance using strict mode - each week must individually meet minimum requirements
 *
 * @module StrictDayCountValidator
 */

import type {
	ValidationConfig,
	ValidationResult,
	ValidatorContext,
	WeekCompliance,
	WindowCompliance,
} from "../../types/validation-strategy";
import { ValidationStrategy } from "./ValidationStrategy";

/**
 * Validator that enforces strict day count compliance
 *
 * In strict mode, each week is validated individually. Any week that fails
 * to meet the minimum office day requirement causes immediate validation failure.
 */
export class StrictDayCountValidator extends ValidationStrategy {
	readonly name = "strict-day-count";
	readonly description =
		"Validates RTO compliance by checking each week individually against minimum requirements";

	/**
	 * Validate selections in strict mode
	 *
	 * Each week is checked individually. The first violating week causes
	 * immediate failure (fail-fast behavior).
	 *
	 * @param context - Validation context
	 * @returns Validation result
	 */
	validate(context: ValidatorContext): ValidationResult {
		const config = this._mergeConfig(context);

		// Early exit: no selections to validate
		if (!context.selectedDays || context.selectedDays.length === 0) {
			return this._createEmptyResult(config, "strict");
		}

		this.weekStart = this._getStartOfWeek(context.selectedDays[0]);
		const weeksByWFH = this._groupDaysByWeek(
			context.selectedDays,
			this.weekStart,
		);

		return this._validateEachWeek(context, config, weeksByWFH);
	}

	/**
	 * Get compliance for a single week
	 *
	 * @param weekStart - Start date of week
	 * @param context - Validation context
	 * @returns Week compliance information
	 */
	getWeekCompliance(
		weekStart: Date,
		context: ValidatorContext,
	): WeekCompliance {
		const config = this._mergeConfig(context);
		const cacheKey = `week_${weekStart.getTime()}`;

		const cached = this._getCachedResult<WeekCompliance>(cacheKey);
		if (cached) {
			return cached;
		}

		const weeksByWFH =
			this._extractWeeksMap(context) ??
			this._groupDaysByWeek(
				context.selectedDays ?? [],
				this._getStartOfWeek(weekStart),
			);

		const wfhDays = weeksByWFH.get(weekStart.getTime()) ?? 0;
		const officeDays = config.totalWeekdaysPerWeek - wfhDays;
		const { percentage, isCompliant } = this._calculateComplianceStatus(
			officeDays,
			config.totalWeekdaysPerWeek,
			config.thresholdPercentage,
		);

		this._logDebug(
			config,
			`Week ${weekStart.getTime()}: ${officeDays}/${config.totalWeekdaysPerWeek} office days (${percentage.toFixed(0)}%)`,
		);

		const result: WeekCompliance = {
			weekStart: new Date(weekStart),
			weekNumber: this._getWeekNumber(weekStart),
			totalDays: config.totalWeekdaysPerWeek,
			workFromHomeDays: wfhDays,
			officeDays,
			isCompliant,
			percentage,
		};

		this._setCachedResult(cacheKey, result);
		return result;
	}

	/**
	 * Get compliance for a multi-week window
	 *
	 * @param windowStart - Starting week index
	 * @param windowSize - Number of weeks in window
	 * @param context - Validation context
	 * @returns Window compliance information
	 */
	getWindowCompliance(
		windowStart: number,
		windowSize: number,
		context: ValidatorContext,
	): WindowCompliance {
		const config = this._mergeConfig(context);
		const cacheKey = `window_${windowStart}_${windowSize}`;

		const cached = this._getCachedResult<WindowCompliance>(cacheKey);
		if (cached) {
			return cached;
		}

		const weeksByWFH =
			this._extractWeeksMap(context) ??
			this._groupDaysByWeek(
				context.selectedDays ?? [],
				this._getStartOfWeek(context.selectedDays?.[0]),
			);

		let totalOfficeDays = 0;
		let totalWeekdays = 0;
		const weeks: WeekCompliance[] = [];

		for (let i = windowStart; i < windowStart + windowSize; i++) {
			const currentWeekStart = this._calculateWeekStart(i);
			const weekCompliance = this.getWeekCompliance(currentWeekStart, {
				...context,
				weeksByWFH,
			});

			weeks.push(weekCompliance);
			totalOfficeDays += weekCompliance.officeDays;
			totalWeekdays += weekCompliance.totalDays;
		}

		const averageOfficeDaysPerWeek = totalOfficeDays / windowSize;
		const compliancePercentage =
			totalWeekdays > 0 ? (totalOfficeDays / totalWeekdays) * 100 : 100;
		const isCompliant =
			compliancePercentage >= config.thresholdPercentage * 100;

		this._logDebug(
			config,
			`Window ${windowStart}-${windowStart + windowSize - 1}: ${averageOfficeDaysPerWeek.toFixed(1)} avg office days (${compliancePercentage.toFixed(0)}%)`,
		);

		const result: WindowCompliance = {
			windowStart,
			windowEnd: windowStart + windowSize - 1,
			weeks,
			totalOfficeDays,
			totalWeekdays,
			averageOfficeDaysPerWeek,
			compliancePercentage,
			isCompliant,
			requiredOfficeDays: config.minOfficeDaysPerWeek,
			requiredPercentage: config.thresholdPercentage * 100,
		};

		this._setCachedResult(cacheKey, result);
		return result;
	}

	/**
	 * Validate each week and fail fast on first violation
	 *
	 * @param context - Validation context
	 * @param config - Merged configuration
	 * @param weeksByWFH - Map of week start to WFH count
	 * @returns Validation result
	 * @private
	 */
	private _validateEachWeek(
		context: ValidatorContext,
		config: ValidationConfig,
		weeksByWFH: Map<number, number>,
	): ValidationResult {
		const totalWeeks = this._getTotalWeeks(context);
		const violatingWindows: WindowCompliance[] = [];
		const compliantWindows: WindowCompliance[] = [];
		const windowResults: WindowCompliance[] = [];

		for (let weekIndex = 0; weekIndex < totalWeeks; weekIndex++) {
			const windowCompliance = this.getWindowCompliance(weekIndex, 1, {
				...context,
				weeksByWFH,
			});

			windowResults.push(windowCompliance);

			if (!windowCompliance.isCompliant) {
				violatingWindows.push(windowCompliance);

				// Fail fast: return immediately on first violation
				const violatingWeekStart = this._calculateWeekStart(weekIndex);
				const violatingWeekCompliance = windowCompliance.weeks[0];

				if (!violatingWeekCompliance) {
					throw new Error(
						"Invariant violation: Non-compliant window must have at least one week",
					);
				}

				return {
					isValid: false,
					message: `Week starting ${violatingWeekStart.toDateString()} has only ${violatingWeekCompliance.officeDays} office days, required: ${config.minOfficeDaysPerWeek}`,
					overallCompliance: violatingWeekCompliance.percentage,
					windowResults,
					violatingWindows,
					compliantWindows,
					validationMode: "strict",
					invalidWeek: violatingWeekCompliance,
				};
			}

			compliantWindows.push(windowCompliance);
		}

		const allCompliant = violatingWindows.length === 0;
		const overallCompliance =
			windowResults.length > 0
				? windowResults.reduce((sum, w) => sum + w.compliancePercentage, 0) /
					windowResults.length
				: 100;

		return {
			isValid: allCompliant,
			message: allCompliant
				? `All weeks meet the minimum office day requirement (${config.minOfficeDaysPerWeek} days)`
				: `RTO Violation: Some weeks have fewer than ${config.minOfficeDaysPerWeek} office days`,
			overallCompliance,
			windowResults,
			violatingWindows,
			compliantWindows,
			validationMode: "strict",
		};
	}

	/**
	 * Create result for empty selections
	 *
	 * @param _config - Validation configuration (unused)
	 * @param mode - Validation mode
	 * @returns Empty validation result
	 * @private
	 */
	private _createEmptyResult(
		_config: ValidationConfig,
		mode: string,
	): ValidationResult {
		return {
			isValid: true,
			message: "No selections to validate",
			overallCompliance: 100,
			windowResults: [],
			violatingWindows: [],
			compliantWindows: [],
			validationMode: mode,
		};
	}

	/**
	 * Calculate week start date from week index
	 *
	 * @param weekIndex - Index of week from reference
	 * @returns Week start date
	 * @private
	 */
	private _calculateWeekStart(weekIndex: number): Date {
		if (!this.weekStart) {
			throw new Error("Week start not initialized. Call validate() first.");
		}

		const weekStart = new Date(this.weekStart);
		weekStart.setDate(this.weekStart.getDate() + weekIndex * 7);

		return weekStart;
	}

	/**
	 * Extract weeks map from context if available
	 *
	 * @param context - Validation context
	 * @returns Weeks map or undefined
	 * @private
	 */
	private _extractWeeksMap(
		context: ValidatorContext,
	): Map<number, number> | undefined {
		if ("weeksByWFH" in context && context.weeksByWFH instanceof Map) {
			return context.weeksByWFH as Map<number, number>;
		}
		return undefined;
	}
}

export default StrictDayCountValidator;
