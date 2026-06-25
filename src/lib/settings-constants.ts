/**
 * Settings Constants
 *
 * Shared types and constants for app settings — no localStorage access.
 * These were extracted from settings-reader.ts during the nanostore migration
 * to eliminate the dependency on localStorage-based reads/writes.
 */

import {
	BEST_WEEKS_COUNT,
	MINIMUM_COMPLIANT_DAYS,
	ROLLING_WINDOW_WEEKS,
} from "./validation/constants";

export const SETTINGS_KEY = "rto-calculator-settings";

export interface AppSettings {
	debug: boolean;
	saveData: boolean;
	minOfficeDays: number;
	rollingWindowWeeks: number;
	bestWeeksCount: number;
	sickDaysPenalize: boolean;
	holidayPenalize: boolean;
	weekendBonus: boolean;
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
	weekendBonus: false,
	startingWeek: null,
	defaultPattern: null,
	roundPercentage: true,
	holidays: { countryCode: null, holidaysAsOOF: true, companyName: null },
};
