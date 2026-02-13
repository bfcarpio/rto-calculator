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
	officeDays: number;
	totalDays: number;
	oofDays: number;
	isCompliant: boolean;
	isUnderEvaluation: boolean;
	status: WeekStatus;
	statusCellElement: HTMLElement | null;
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
 * Read calendar data from datepainter API into pure data structure
 *
 * This function queries the calendar manager's internal state and builds a complete data model.
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

	// Get all dates from calendar manager
	const allDates = calendarManager.getAllDates();

	// Query all status cells and build lookup map keyed by week start timestamp
	const statusCellElements = document.querySelectorAll(
		".week-status-cell[data-week-start]",
	);
	const statusCellMap = new Map<number, HTMLElement>();
	Array.from(statusCellElements).forEach((cell) => {
		const element = cell as HTMLElement;
		const weekStartAttr = element.dataset.weekStart;
		if (!weekStartAttr) {
			if (mergedConfig.DEBUG) {
				logger.debug(
					"[Calendar Data Reader] Skipping status cell without week-start attribute",
				);
			}
			return;
		}

		const weekStartTimestamp = parseInt(weekStartAttr, 10);
		if (Number.isNaN(weekStartTimestamp)) {
			if (mergedConfig.DEBUG) {
				logger.debug(
					"[Calendar Data Reader] Skipping status cell with invalid week-start timestamp",
				);
			}
			return;
		}

		statusCellMap.set(weekStartTimestamp, element);
	});

	// Group dates by week
	const weekMap = new Map<number, DayInfo[]>();
	const dayCountPerWeek = new Map<number, number>();

	// Process all dates from calendar manager
	Array.from(allDates.entries()).forEach(([dateString, state]) => {
		// Parse date string (YYYY-MM-DD format)
		const [year, month, day] = dateString.split("-").map(Number);

		// Guard clause - validate parsed date parts
		if (
			year === undefined ||
			month === undefined ||
			day === undefined ||
			Number.isNaN(year) ||
			Number.isNaN(month) ||
			Number.isNaN(day)
		) {
			if (mergedConfig.DEBUG) {
				logger.debug(
					`[Calendar Data Reader] Skipping invalid date string: ${dateString}`,
				);
			}
			return;
		}

		const date = new Date(year, month - 1, day); // Month is 0-indexed

		// Check if this is a weekday using library function
		const weekday = isWeekday(date);

		// Check if this is a holiday (holidays are non-office days)
		const isHoliday = holidaySet.has(date.toDateString());

		// Get selection type from state
		const selectionType = state === "oof" ? "out-of-office" : null;
		const isSelected = state !== null && state !== undefined;

		// DayInfo no longer needs element reference (datepainter API handles updates)
		const dayInfo: DayInfo = {
			date,
			element: null, // No longer needed with datepainter API
			isWeekday: weekday,
			isSelected,
			selectionType,
			isHoliday,
		};

		// Group by week start using library function
		const weekStart = getStartOfWeek(date);
		const weekKey = weekStart.getTime();

		if (!weekMap.has(weekKey)) {
			// Preallocate array for weekdays (typical work week)
			weekMap.set(weekKey, new Array<DayInfo>(WEEKDAY_COUNT));
			dayCountPerWeek.set(weekKey, 0);
		}
		const weekDays = weekMap.get(weekKey);
		const currentCount = dayCountPerWeek.get(weekKey);
		if (!weekDays || currentCount === undefined) {
			throw new Error(
				`Week data not found for week key: ${weekKey}. ` +
					"This should never happen after initialization.",
			);
		}
		weekDays[currentCount] = dayInfo;
		dayCountPerWeek.set(weekKey, currentCount + 1);
	});

	// Convert map to sorted array of WeekInfo
	const sortedWeekStarts = Array.from(weekMap.keys()).sort((a, b) => a - b);

	// Build weeks array with holiday-aware statistics
	const weeks: WeekInfo[] = [];
	let totalHolidayDays = 0; // Track total holidays across all weeks

	for (const weekStartTimestamp of sortedWeekStarts) {
		const weekStart = new Date(weekStartTimestamp);
		const weekDays = weekMap.get(weekStartTimestamp);
		const actualDayCount = dayCountPerWeek.get(weekStartTimestamp);

		if (!weekDays || actualDayCount === undefined) {
			throw new Error(
				`Week data not found for timestamp: ${weekStartTimestamp}. ` +
					"This should never happen for a sorted week key.",
			);
		}

		// Trim to actual day count (handles partial weeks)
		const days = weekDays.slice(0, actualDayCount);

		// Calculate week statistics (holidays are not counted as WFH or office)
		const weekdayDays = days.filter((d) => d.isWeekday);
		const holidayDays = days.filter((d) => d.isHoliday && d.isWeekday);
		totalHolidayDays += holidayDays.length;
		const oofCount = days.filter(
			(d) => d.selectionType === "out-of-office" && d.isWeekday && !d.isHoliday,
		).length;

		// Office days = weekdays that are not OOF and not holidays
		const officeDays = weekdayDays.length - holidayDays.length - oofCount;

		const totalEffectiveDays = weekdayDays.length - holidayDays.length;
		const isCompliant = officeDays >= mergedConfig.minOfficeDaysPerWeek;

		// Look up status cell element for this week
		const statusCellElement = statusCellMap.get(weekStartTimestamp) ?? null;

		const weekInfo: WeekInfo = {
			weekStart,
			weekNumber: weeks.length + 1,
			days,
			oofCount,
			officeDays,
			totalDays: totalEffectiveDays,
			oofDays: oofCount,
			isCompliant,
			isUnderEvaluation: true,
			status: isCompliant ? "compliant" : "invalid",
			statusCellElement,
		};

		weeks.push(weekInfo);
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
