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

		return `${statusIcon} RTO ${statusText}: ${avgOfficeDays.toFixed(1)} avg office days (${overallCompliance.toFixed(0)}%) of ${config.totalWeekdaysPerWeek} weekdays. Required: ${config.minOfficeDaysPerWeek} days (${requiredPercentage}%)`;
	}

	/**
	 * Calculate week start date from week index
	 *
	 * @param weekIndex - Index of week from reference
	 * @returns Week start date
	 * @throws {Error} If weekStart is not initialized
	 * @private
	 */
}

export default AverageWindowValidator;
