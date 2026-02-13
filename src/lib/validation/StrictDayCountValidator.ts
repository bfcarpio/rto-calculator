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
				const violatingWeekStart = this._calculateWeekStart(
					weekIndex,
					context,
					weeksByWFH,
				);
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
}

export default StrictDayCountValidator;
