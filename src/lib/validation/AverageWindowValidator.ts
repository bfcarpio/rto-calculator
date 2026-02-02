/**
 * AverageWindowValidator
 * Validates RTO compliance using rolling window averages
 *
 * @module AverageWindowValidator
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
 * Validator that enforces compliance using rolling window averages
 *
 * In average mode, compliance is calculated over rolling windows of weeks.
 * A window is compliant if the average office days per week meets the threshold.
 */
export class AverageWindowValidator extends ValidationStrategy {
	readonly name = "average-window";
	readonly description =
		"Validates RTO compliance using rolling 12-week window averages";

	/**
	 * Validate selections using rolling window averages
	 *
	 * @param context - Validation context
	 * @returns Validation result
	 */
	validate(context: ValidatorContext): ValidationResult {
		const config = this._mergeConfig(context);

		// Early exit: no selections to validate
		if (!context.selectedDays || context.selectedDays.length === 0) {
			return this._createEmptyResult();
		}

		this.weekStart = this._getStartOfWeek(context.selectedDays[0]);
		const weeksByWFH = this._groupDaysByWeek(
			context.selectedDays,
			this.weekStart,
		);

		return this._validateRollingWindows(context, config, weeksByWFH);
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

		const weeks: WeekCompliance[] = [];

		for (let i = windowStart; i < windowStart + windowSize; i++) {
			const currentWeekStart = this._calculateWeekStart(i);
			const weekCompliance = this.getWeekCompliance(currentWeekStart, {
				...context,
				weeksByWFH,
			});

			weeks.push(weekCompliance);
		}

		// Apply "best X of Y weeks" filtering if enabled
		const weeksToEvaluate = this._getWeeksForEvaluation(
			weeks,
			config,
			windowSize,
		);

		// Recalculate totals from filtered weeks
		const filteredOfficeDays = weeksToEvaluate.reduce(
			(sum, week) => sum + week.officeDays,
			0,
		);
		const filteredWeekdays = weeksToEvaluate.reduce(
			(sum, week) => sum + week.totalDays,
			0,
		);
		const weeksCountForAverage = weeksToEvaluate.length || 1; // Avoid division by zero

		const averageOfficeDaysPerWeek = filteredOfficeDays / weeksCountForAverage;
		const compliancePercentage =
			filteredWeekdays > 0
				? (filteredOfficeDays / filteredWeekdays) * 100
				: 100;
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
			totalOfficeDays: filteredOfficeDays,
			totalWeekdays: filteredWeekdays,
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
	 * Get the weeks to evaluate based on "best X of Y" configuration
	 *
	 * @param allWeeks - All weeks in the window
	 * @param config - Validation configuration
	 * @param windowSize - Size of the window
	 * @returns Weeks to evaluate (either all weeks or best N weeks)
	 * @private
	 */
	private _getWeeksForEvaluation(
		allWeeks: WeekCompliance[],
		config: ValidationConfig,
		windowSize: number,
	): WeekCompliance[] {
		// Early exit: if feature not enabled, return all weeks
		if (!config.evaluateBestWeeksOnly) {
			return allWeeks;
		}

		// Determine how many best weeks to evaluate
		const bestWeeksCount = config.bestWeeksCount ?? windowSize;

		// Early exit: if bestWeeksCount equals or exceeds window size, return all weeks
		if (bestWeeksCount >= windowSize) {
			return allWeeks;
		}

		// Select the best N weeks
		return this._selectBestWeeks(allWeeks, bestWeeksCount);
	}

	/**
	 * Validate using rolling windows
	 *
	 * @param context - Validation context
	 * @param config - Merged configuration
	 * @param weeksByWFH - Map of week start to WFH count
	 * @returns Validation result
	 * @private
	 */
	private _validateRollingWindows(
		context: ValidatorContext,
		config: ValidationConfig,
		weeksByWFH: Map<number, number>,
	): ValidationResult {
		const totalWeeks = this._getTotalWeeks(context);
		const totalWindows = Math.max(0, totalWeeks - config.rollingPeriodWeeks);

		const windowResults: WindowCompliance[] = [];

		for (let windowStart = 0; windowStart <= totalWindows; windowStart++) {
			const windowCompliance = this.getWindowCompliance(
				windowStart,
				config.rollingPeriodWeeks,
				{
					...context,
					weeksByWFH,
				},
			);
			windowResults.push(windowCompliance);
		}

		const violatingWindows = windowResults.filter((w) => !w.isCompliant);
		const compliantWindows = windowResults.filter((w) => w.isCompliant);

		// Determine overall compliance from first violating or first compliant window
		const resultWindow = violatingWindows[0] ?? compliantWindows[0] ?? null;
		const overallCompliance = resultWindow?.compliancePercentage ?? 100;
		const isValid = overallCompliance >= config.thresholdPercentage * 100;
		const avgOfficeDays =
			resultWindow?.averageOfficeDaysPerWeek ?? config.minOfficeDaysPerWeek;

		const message = this._formatResultMessage(
			isValid,
			avgOfficeDays,
			overallCompliance,
			config,
		);

		this._logDebug(
			config,
			`Validation complete: ${windowResults.length} windows, ${violatingWindows.length} violating`,
		);

		return {
			isValid,
			message,
			overallCompliance,
			windowResults,
			violatingWindows,
			compliantWindows,
			validationMode: "average",
		};
	}

	/**
	 * Create result for empty selections
	 *
	 * @returns Empty validation result
	 * @private
	 */
	private _createEmptyResult(): ValidationResult {
		return {
			isValid: true,
			message: "No selections to validate",
			overallCompliance: 100,
			windowResults: [],
			violatingWindows: [],
			compliantWindows: [],
			validationMode: "average",
		};
	}

	/**
	 * Format validation result message
	 *
	 * @param isValid - Whether validation passed
	 * @param avgOfficeDays - Average office days per week
	 * @param overallCompliance - Overall compliance percentage
	 * @param config - Validation configuration
	 * @returns Formatted message string
	 * @private
	 */
	private _formatResultMessage(
		isValid: boolean,
		avgOfficeDays: number,
		overallCompliance: number,
		config: ValidationConfig,
	): string {
		const statusIcon = isValid ? "✓" : "✗";
		const statusText = isValid ? "Compliant" : "Violation";
		const requiredPercentage = (config.thresholdPercentage * 100).toFixed(0);

		return `${statusIcon} RTO ${statusText}: ${avgOfficeDays.toFixed(1)} avg office days (${overallCompliance.toFixed(0)}%) of 5 weekdays. Required: ${config.minOfficeDaysPerWeek} days (${requiredPercentage}%)`;
	}

	/**
	 * Calculate week start date from week index
	 *
	 * @param weekIndex - Index of week from reference
	 * @returns Week start date
	 * @throws {Error} If weekStart is not initialized
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

export default AverageWindowValidator;
