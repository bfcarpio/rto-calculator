/**
 * Shared Settings Reader
 *
 * Single source of truth for reading/writing app settings from localStorage.
 * Eliminates duplicate JSON.parse calls scattered across modules.
 */

import {
	BEST_WEEKS_COUNT,
	MINIMUM_COMPLIANT_DAYS,
	ROLLING_WINDOW_WEEKS,
} from "./validation/constants";
import {
	DEFAULT_RTO_POLICY,
	type RTOPolicyConfig,
} from "./validation/rto-core";

export const SETTINGS_KEY = "rto-calculator-settings";

export interface AppSettings {
	debug: boolean;
	saveData: boolean;
	minOfficeDays: number;
	rollingWindowWeeks: number;
	bestWeeksCount: number;
	sickDaysPenalize: boolean;
	holidayPenalize: boolean;
	startingWeek: string | null;
	defaultPattern: number[] | null;
	roundPercentage: boolean;
	holidays: {
		countryCode: string | null;
		holidaysAsOOF: boolean;
		companyName?: string | null;
	};
}

export const DEFAULTS: AppSettings = {
	debug: false,
	saveData: false,
	minOfficeDays: MINIMUM_COMPLIANT_DAYS,
	rollingWindowWeeks: ROLLING_WINDOW_WEEKS,
	bestWeeksCount: BEST_WEEKS_COUNT,
	sickDaysPenalize: true,
	holidayPenalize: true,
	startingWeek: null,
	defaultPattern: null,
	roundPercentage: true,
	holidays: { countryCode: null, holidaysAsOOF: true, companyName: null },
};

/** Parse localStorage once, merge with defaults */
export function readSettings(): AppSettings {
	try {
		const raw = localStorage.getItem(SETTINGS_KEY);
		if (!raw) return { ...DEFAULTS };
		const stored = JSON.parse(raw);
		const rollingWindowWeeks =
			stored.rollingWindowWeeks ?? DEFAULTS.rollingWindowWeeks;
		return {
			...DEFAULTS,
			...stored,
			rollingWindowWeeks,
			// Clamp bestWeeksCount to not exceed rollingWindowWeeks
			bestWeeksCount: Math.min(
				stored.bestWeeksCount ?? DEFAULTS.bestWeeksCount,
				rollingWindowWeeks,
			),
		};
	} catch {
		return { ...DEFAULTS };
	}
}

/** Build RTOPolicyConfig from current user settings */
export function buildPolicyFromSettings(): RTOPolicyConfig {
	const settings = readSettings();
	return {
		...DEFAULT_RTO_POLICY,
		minOfficeDaysPerWeek: settings.minOfficeDays,
		rollingPeriodWeeks: settings.rollingWindowWeeks,
		topWeeksToCheck: settings.bestWeeksCount,
		roundPercentage: settings.roundPercentage,
	};
}

/** Merge partial update into stored settings */
export function writeSettings(partial: Partial<AppSettings>): void {
	const current = readSettings();
	const merged = { ...current, ...partial };
	localStorage.setItem(SETTINGS_KEY, JSON.stringify(merged));
}
