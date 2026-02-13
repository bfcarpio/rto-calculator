/**
 * ValidationManager - Simple config holder for validation settings.
 *
 * Used by KeyboardShortcuts for undo config snapshots and by
 * settings-modal for debug mode and min office days config.
 */

import {
	COMPLIANCE_THRESHOLD,
	MINIMUM_COMPLIANT_DAYS,
	ROLLING_WINDOW_WEEKS,
	TOTAL_WEEK_DAYS,
} from "../lib/validation/constants";
import type { ValidationConfig } from "../types/validation-strategy";

const DEFAULT_CONFIG: ValidationConfig = {
	minOfficeDaysPerWeek: MINIMUM_COMPLIANT_DAYS,
	totalWeekdaysPerWeek: TOTAL_WEEK_DAYS,
	rollingPeriodWeeks: ROLLING_WINDOW_WEEKS,
	thresholdPercentage: COMPLIANCE_THRESHOLD,
	debug: false,
};

export class ValidationManager {
	private config: ValidationConfig = { ...DEFAULT_CONFIG };

	updateConfig(newConfig: Partial<ValidationConfig>): void {
		this.config = { ...this.config, ...newConfig };
	}

	getConfig(): ValidationConfig {
		return { ...this.config };
	}

	setDebugMode(enabled: boolean): void {
		this.config = { ...this.config, debug: enabled };
	}

	getDebugMode(): boolean {
		return this.config.debug;
	}
}

export const validationManager = new ValidationManager();

if (typeof window !== "undefined") {
	(
		window as typeof window & { validationManager?: ValidationManager }
	).validationManager = validationManager;
}

export default validationManager;
