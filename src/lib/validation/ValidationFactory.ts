/**
 * ValidationFactory
 * Factory class for creating validation strategy instances
 *
 * @module ValidationFactory
 */

import { AverageWindowValidator } from "./AverageWindowValidator";
import { StrictDayCountValidator } from "./StrictDayCountValidator";
import type { ValidationStrategy } from "./ValidationStrategy";

/**
 * Supported validation modes
 */
export type ValidationMode = "strict" | "average";

/**
 * Factory for creating validation strategy instances
 *
 * Provides a centralized way to instantiate the correct validator
 * based on the desired validation mode.
 */
export class ValidationFactory {
	/** Cache of created validators */
	private static validatorCache: Map<ValidationMode, ValidationStrategy> =
		new Map();

	/**
	 * Create a validator instance for the specified mode
	 *
	 * @param mode - Validation mode ('strict' or 'average')
	 * @returns ValidationStrategy instance
	 * @throws {Error} If mode is not supported
	 */
	static createValidator(mode: ValidationMode): ValidationStrategy {
		// Early exit: check cache first
		const cached = ValidationFactory.validatorCache.get(mode);
		if (cached) {
			cached.reset();
			return cached;
		}

		// Create new validator based on mode
		const validator = ValidationFactory._instantiateValidator(mode);

		// Cache for reuse
		ValidationFactory.validatorCache.set(mode, validator);

		return validator;
	}

	/**
	 * Get available validation modes
	 *
	 * @returns Array of supported validation modes
	 */
	static getAvailableModes(): ValidationMode[] {
		return ["strict", "average"];
	}

	/**
	 * Check if a validation mode is supported
	 *
	 * @param mode - Mode to check
	 * @returns True if mode is supported
	 */
	static isValidMode(mode: string): mode is ValidationMode {
		return mode === "strict" || mode === "average";
	}

	/**
	 * Clear the validator cache
	 */
	static clearCache(): void {
		ValidationFactory.validatorCache.clear();
	}

	/**
	 * Instantiate validator based on mode
	 *
	 * @param mode - Validation mode
	 * @returns New validator instance
	 * @throws {Error} If mode is not supported
	 * @private
	 */
	private static _instantiateValidator(
		mode: ValidationMode,
	): ValidationStrategy {
		switch (mode) {
			case "strict":
				return new StrictDayCountValidator();

			case "average":
				return new AverageWindowValidator();

			default:
				// Fail fast: unsupported mode
				throw new Error(
					`Unsupported validation mode: ${mode}. ` +
						`Supported modes are: ${ValidationFactory.getAvailableModes().join(", ")}`,
				);
		}
	}
}

export default ValidationFactory;
