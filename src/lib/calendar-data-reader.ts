/**
 * Calendar Data Reader Layer
 *
 * Pure function layer that reads calendar data from datepainter API and returns typed data structures.
 * This layer extracts data from the calendar manager for validation and statistics.
 *
 * @module calendar-data-reader
 */

import type { CalendarInstance } from "../../packages/datepainter/src/types";
import { logger } from "../utils/logger";
import { getDateRange } from "./dateUtils";
import { getHolidayDatesForValidation } from "./holiday/CalendarHolidayIntegration";
import { RTO_CONFIG } from "./rto-config";
import { getStartOfWeek, isWeekday } from "./validation/rto-core";

/** Number of weekdays in a standard work week */
const WEEKDAY_COUNT = 5;

/**
 * Day information for a single day
 */
export interface DayInfo {
	date: Date;
	element: HTMLElement | null; // Reference to DOM element for UI updates
	isWeekday: boolean;
	isSelected: boolean;
	selectionType: "out-of-office" | null;
	isHoliday: boolean;
}

/**
 * Week status types for validation feedback
 */
export type WeekStatus =
	| "compliant"
	| "invalid"
	| "pending"
	| "excluded"
	| "ignored";

/**
 * Week information for tracking
 */
export interface WeekInfo {
	weekStart: Date;
	weekNumber: number;
	days: DayInfo[];
	oofCount: number;
	holidayCount: number;
	sickCount: number;
	officeDays: number;
	totalDays: number;
	oofDays: number;
	isCompliant: boolean;
	isUnderEvaluation: boolean;
	status: WeekStatus;
}

/**
 * Configuration for calendar reading
 */
export interface CalendarReaderConfig {
	minOfficeDaysPerWeek: number;
	totalWeekdaysPerWeek: number;
	DEBUG: boolean;
}

/**
 * Default configuration for calendar data reading
 */
export const DEFAULT_CALENDAR_READER_CONFIG: CalendarReaderConfig = {
	minOfficeDaysPerWeek: RTO_CONFIG.minOfficeDaysPerWeek,
	totalWeekdaysPerWeek: RTO_CONFIG.totalWeekdaysPerWeek,
	DEBUG: RTO_CONFIG.DEBUG,
};

/**
 * Calendar data read result containing weeks and metadata
 */
export interface CalendarDataResult {
	weeks: WeekInfo[];
	totalWeeks: number;
	totalHolidayDays: number;
	readTimeMs: number;
}

/**
 * Read the sickDaysPenalize setting from localStorage
 */
function getSickDaysPenalizeSetting(): boolean {
	try {
		const saved = localStorage.getItem("rto-calculator-settings");
		if (!saved) return true; // default: sick days penalize
		const settings = JSON.parse(saved);
		return settings.sickDaysPenalize !== false; // default true
	} catch {
		return true;
	}
}

/**
 * Read calendar data from datepainter API into pure data structure
 *
 * This function queries the calendar manager's internal state and builds a complete data model.
 * Iterates through ALL weeks in the calendar range, not just painted dates.
 * Integrates holiday dates to properly treat holidays as non-office days.
 *
 * @param calendarManager - CalendarInstance providing access to calendar state
 * @param config - Configuration options for reading
 * @returns Promise resolving to calendar data result
 * @throws {Error} If calendarManager is null or undefined
 */
export async function readCalendarData(
	calendarManager: CalendarInstance,
	config: Partial<CalendarReaderConfig> = {},
): Promise<CalendarDataResult> {
	// Guard clause - validate calendarManager
	if (!calendarManager) {
		throw new Error("calendarManager is required");
	}

	const mergedConfig = { ...DEFAULT_CALENDAR_READER_CONFIG, ...config };
	const startTime = performance.now();

	// Get holiday dates for validation (holidays are non-office days)
	const holidayDates = await getHolidayDatesForValidation();
	const holidaySet = new Set(
		Array.from(holidayDates).map((d: Date) => d.toDateString()),
	);

	// Build lookup map from datepainter state: dateString -> DateState
	const allDates = calendarManager.getAllDates();
	const dateStateLookup = new Map<string, string>();
	for (const [dateString, state] of allDates) {
		dateStateLookup.set(dateString, state);
	}

	// Get the full calendar range
	const range = getDateRange();

	// Read sick-penalize setting
	const sickDaysPenalize = getSickDaysPenalizeSetting();

	// Iterate through ALL Monday-aligned weeks in the calendar range
	const weeks: WeekInfo[] = [];
	let totalHolidayDays = 0;

	// Start from the first Monday on or after the range start
	let weekStart = getStartOfWeek(range.startDate);
	// If weekStart is before range start, advance to next Monday
	if (weekStart < range.startDate) {
		weekStart = new Date(weekStart);
		weekStart.setDate(weekStart.getDate() + 7);
	}

	while (weekStart <= range.endDate) {
		const days: DayInfo[] = [];
		let oofCount = 0;
		let holidayCount = 0;
		let sickCount = 0;

		// Check each Mon-Fri in this week
		for (let i = 0; i < WEEKDAY_COUNT; i++) {
			const date = new Date(weekStart);
			date.setDate(weekStart.getDate() + i);

			// Skip days beyond the range
			if (date > range.endDate) break;

			const weekday = isWeekday(date);
			if (!weekday) continue;

			// Format as YYYY-MM-DD to match datepainter keys
			const year = date.getFullYear();
			const month = String(date.getMonth() + 1).padStart(2, "0");
			const day = String(date.getDate()).padStart(2, "0");
			const dateKey = `${year}-${month}-${day}`;

			const state = dateStateLookup.get(dateKey) ?? null;
			const isHoliday =
				holidaySet.has(date.toDateString()) || state === "holiday";

			const selectionType = state === "oof" ? "out-of-office" : null;
			const isSelected = state !== null;

			const dayInfo: DayInfo = {
				date,
				element: null,
				isWeekday: weekday,
				isSelected,
				selectionType,
				isHoliday,
			};

			days.push(dayInfo);

			// Count deductions (don't double-count holiday+painted)
			if (isHoliday) {
				holidayCount++;
			} else if (state === "oof") {
				oofCount++;
			} else if (state === "sick") {
				sickCount++;
			}
		}

		if (days.length > 0) {
			totalHolidayDays += holidayCount;

			// Office days = weekdays that are not OOF, not holidays, and (if penalizing) not sick
			let officeDays: number;
			let totalEffectiveDays: number;

			if (sickDaysPenalize) {
				// Sick days reduce office days (like OOF)
				officeDays = WEEKDAY_COUNT - holidayCount - oofCount - sickCount;
				totalEffectiveDays = WEEKDAY_COUNT - holidayCount;
			} else {
				// Sick days reduce effective total (don't penalize)
				officeDays = WEEKDAY_COUNT - holidayCount - oofCount;
				totalEffectiveDays = WEEKDAY_COUNT - holidayCount - sickCount;
			}

			const isCompliant = officeDays >= mergedConfig.minOfficeDaysPerWeek;

			const weekInfo: WeekInfo = {
				weekStart: new Date(weekStart),
				weekNumber: weeks.length + 1,
				days,
				oofCount,
				holidayCount,
				sickCount,
				officeDays,
				totalDays: totalEffectiveDays,
				oofDays: oofCount,
				isCompliant,
				isUnderEvaluation: true,
				status: isCompliant ? "compliant" : "invalid",
			};

			weeks.push(weekInfo);
		}

		// Advance to next Monday
		weekStart = new Date(weekStart);
		weekStart.setDate(weekStart.getDate() + 7);
	}

	const readTimeMs = performance.now() - startTime;

	if (mergedConfig.DEBUG) {
		logger.debug(
			`[Calendar Data Reader] Calendar data read in ${readTimeMs.toFixed(2)}ms`,
		);
		logger.debug(`[Calendar Data Reader]   Found ${weeks.length} weeks`);
		logger.debug(
			`[Calendar Data Reader]   Total holidays across all weeks: ${totalHolidayDays}`,
		);
	}

	return {
		weeks,
		totalWeeks: weeks.length,
		totalHolidayDays,
		readTimeMs,
	};
}

/**
 * Convert WeekInfo to WeekCompliance format for validation
 *
 * @param weekInfo - The week information to convert
 * @returns WeekCompliance object for use in validation functions
 */
export function weekInfoToWeekCompliance(weekInfo: WeekInfo): {
	weekNumber: number;
	weekStart: Date;
	officeDays: number;
	totalDays: number;
	oofDays: number;
	wfhDays: number;
	isCompliant: boolean;
	status: string;
} {
	return {
		weekNumber: weekInfo.weekNumber,
		weekStart: weekInfo.weekStart,
		officeDays: weekInfo.officeDays,
		totalDays: weekInfo.totalDays,
		oofDays: weekInfo.oofDays,
		wfhDays: weekInfo.oofCount,
		isCompliant: weekInfo.isCompliant,
		status: weekInfo.isCompliant ? "compliant" : "violation",
	};
}

/**
 * Convert all weeks to compliance format for validation
 *
 * @param weeks - Array of week information
 * @returns Array of WeekCompliance objects
 */
export function convertWeeksToCompliance(weeks: WeekInfo[]): {
	weekNumber: number;
	weekStart: Date;
	officeDays: number;
	totalDays: number;
	oofDays: number;
	wfhDays: number;
	isCompliant: boolean;
	status: string;
}[] {
	return weeks.map(weekInfoToWeekCompliance);
}
