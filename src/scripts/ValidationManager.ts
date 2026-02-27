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

// Event name for config changes - emitted on window for real-time UI updates
export const RTO_CONFIG_CHANGED_EVENT = "rto:config-changed" as const;

/** Callback type for state subscription */
export type StateSubscriber = (config: ValidationConfig) => void;

export class ValidationManager {
	private config: ValidationConfig = { ...DEFAULT_CONFIG };
	private subscribers: StateSubscriber[] = [];

	updateConfig(newConfig: Partial<ValidationConfig>): void {
		const oldConfig = { ...this.config };
		this.config = { ...this.config, ...newConfig };
		this.emitConfigChange(oldConfig, this.config);
		this.notifySubscribers();
	}

	private notifySubscribers(): void {
		const config = this.getConfig();
		for (const subscriber of this.subscribers) {
			subscriber(config);
		}
	}

	private emitConfigChange(
		oldConfig: ValidationConfig,
		newConfig: ValidationConfig,
	): void {
		// Dispatch event for each changed key
		for (const key of Object.keys(newConfig) as Array<keyof ValidationConfig>) {
			if (oldConfig[key] !== newConfig[key]) {
				const event = new CustomEvent(RTO_CONFIG_CHANGED_EVENT, {
					detail: {
						settingKey: key,
						oldValue: oldConfig[key],
						newValue: newConfig[key],
					},
				});
				window.dispatchEvent(event);
			}
		}
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

	// Individual config getters for convenient access
	getMinOfficeDaysPerWeek(): number {
		return this.config.minOfficeDaysPerWeek;
	}

	getTotalWeekdaysPerWeek(): number {
		return this.config.totalWeekdaysPerWeek;
	}

	getRollingPeriodWeeks(): number {
		return this.config.rollingPeriodWeeks;
	}

	getThresholdPercentage(): number {
		return this.config.thresholdPercentage;
	}

	// State subscription system
	subscribe(callback: StateSubscriber): void {
		this.subscribers.push(callback);
	}

	unsubscribe(callback: StateSubscriber): void {
		const index = this.subscribers.indexOf(callback);
		if (index !== -1) {
			this.subscribers.splice(index, 1);
		}
	}
}

export const validationManager = new ValidationManager();

if (typeof window !== "undefined") {
	(
		window as typeof window & { validationManager?: ValidationManager }
	).validationManager = validationManager;
}

export default validationManager;
