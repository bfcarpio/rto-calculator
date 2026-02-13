/**
 * Date Utilities - Range calculations and date operations
 * Follows the 5 Laws of Elegant Defense
 */

import type { DateString } from "../types/calendar-types";

const WEEKS_BACK = 12;
const WEEKS_FORWARD = 52;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

export interface DateRange {
	startDate: Date;
	endDate: Date;
}

/**
 * Get today's date with time set to midnight
 *
 * Returns a new Date object representing today with time components zeroed out.
 * Useful for date comparisons without time interference.
 *
 * @returns Date object representing today at midnight
 */
export function getToday(): Date {
	const now = new Date();
	return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

/**
 * Add days to date
 *
 * Creates a new Date object with the specified number of days added.
 * Does not mutate the original date object (atomic predictability).
 *
 * @param date - The original date
 * @param days - The number of days to add (can be negative)
 * @returns A new Date object representing the calculated date
 */
function addDays(date: Date, days: number): Date {
	const result = new Date(date);
	result.setDate(result.getDate() + days);
	return result;
}

/**
 * Add weeks to date
 *
 * Creates a new Date object with the specified number of weeks added.
 * Convenience wrapper around addDays.
 *
 * @param date - The original date
 * @param weeks - The number of weeks to add (can be negative)
 * @returns A new Date object representing the calculated date
 */
function addWeeks(date: Date, weeks: number): Date {
	return addDays(date, weeks * 7);
}

/**
 * Get start of week for a given date
 *
 * Calculates the Sunday start of the week for the given date.
 * Uses Sunday as the first day of the week (day index 0).
 *
 * @param date - The date to get the week start for
 * @returns Date object representing Sunday of that week
 */
function getStartOfWeek(date: Date): Date {
	const dayOfWeek = date.getDay();
	const daysToSubtract = dayOfWeek;
	return addDays(date, -daysToSubtract);
}

/**
 * Get end of week for a given date
 *
 * Calculates the Saturday end of the week for the given date.
 * Uses Saturday as the last day of the week (day index 6).
 *
 * @param date - The date to get the week end for
 * @returns Date object representing Saturday of that week
 */
function getEndOfWeek(date: Date): Date {
	const startOfWeek = getStartOfWeek(date);
	return addDays(startOfWeek, 6);
}

/**
 * Get default date range for calendar display
 *
 * Calculates the date range spanning from WEEKS_BACK before today
 * to WEEKS_FORWARD after today, aligned to week boundaries.
 *
 * @returns DateRange object with start and end dates
 */
export function getDateRange(): DateRange {
	const today = getToday();
	const startDate = addWeeks(today, -WEEKS_BACK);
	const endDate = addWeeks(today, WEEKS_FORWARD);

	return {
		startDate: getStartOfWeek(startDate),
		endDate: getEndOfWeek(endDate),
	};
}

/**
 * Check if date falls within specified range
 *
 * Compares a date against a date range, normalizing both to midnight
 * to ensure accurate comparison without time interference.
 *
 * @param date - The date to check
 * @param range - The date range to check against
 * @returns True if the date falls within the range (inclusive)
 */
export function isDateInRange(date: Date, range: DateRange): boolean {
	const normalizedDate = new Date(
		date.getFullYear(),
		date.getMonth(),
		date.getDate(),
	);
	const normalizedStart = new Date(
		range.startDate.getFullYear(),
		range.startDate.getMonth(),
		range.startDate.getDate(),
	);
	const normalizedEnd = new Date(
		range.endDate.getFullYear(),
		range.endDate.getMonth(),
		range.endDate.getDate(),
	);

	return normalizedDate >= normalizedStart && normalizedDate <= normalizedEnd;
}

/**
 * Format Date to ISO string (YYYY-MM-DD)
 *
 * Converts a JavaScript Date object to an ISO 8601 formatted string.
 * Returns a simple string for use in storage and API calls.
 *
 * @param date - The Date object to format
 * @returns The formatted date string in YYYY-MM-DD format
 */
export function formatDateISO(date: Date): string {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const day = String(date.getDate()).padStart(2, "0");
	return `${year}-${month}-${day}`;
}

/**
 * Format Date to ISO string (YYYY-MM-DD)
 *
 * Converts a JavaScript Date object to an ISO 8601 formatted string.
 * Returns a validated DateString type for use in the RTO calendar system.
 *
 * @param date - The Date object to format
 * @returns The formatted date string in YYYY-MM-DD format
 * @example
 * ```ts
 * formatDate(new Date(2026, 0, 15)) // Returns "2026-01-15"
 * ```
 */
export function formatDate(date: Date): DateString {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const day = String(date.getDate()).padStart(2, "0");
	return `${year}-${month}-${day}` as DateString;
}

/**
 * Parse ISO string to Date
 *
 * Converts an ISO 8601 date string (YYYY-MM-DD) to a JavaScript Date object.
 * Creates the date in local timezone (not UTC) for calendar operations.
 * Returns null for invalid dates.
 *
 * @param dateString - The date string in YYYY-MM-DD format to parse
 * @returns The parsed Date object, or null if invalid
 */
export function parseDateISO(dateString: string): Date | null {
	const match = dateString.match(/^\d{4}-\d{2}-\d{2}$/);
	if (!match) {
		return null;
	}

	const parts = dateString.split("-");
	if (parts.length !== 3) {
		return null;
	}

	const year = Number(parts[0]);
	const month = Number(parts[1]);
	const day = Number(parts[2]);

	if (Number.isNaN(year) || Number.isNaN(month) || Number.isNaN(day)) {
		return null;
	}

	const date = new Date(year, month - 1, day);

	// Validate the date is real (e.g., not Feb 30)
	if (
		date.getFullYear() !== year ||
		date.getMonth() !== month - 1 ||
		date.getDate() !== day
	) {
		return null;
	}

	return date;
}

/**
 * Parse ISO string to Date
 *
 * Converts an ISO 8601 date string (YYYY-MM-DD) to a JavaScript Date object.
 * Creates the date in local timezone (not UTC) for calendar operations.
 *
 * @param dateStr - The date string in YYYY-MM-DD format to parse
 * @returns The parsed Date object representing midnight on the specified date
 * @throws {Error} If the date string is malformed or cannot be parsed
 * @example
 * ```ts
 * parseDate("2026-01-15") // Returns Date object for January 15, 2026
 * ```
 */
export function parseDate(dateStr: DateString): Date {
	const parts = dateStr.split("-").map(Number);

	// Fail fast on invalid input
	if (
		parts.length !== 3 ||
		Number.isNaN(parts[0]) ||
		Number.isNaN(parts[1]) ||
		Number.isNaN(parts[2])
	) {
		throw new Error(
			`Invalid date string format: ${dateStr}. Expected YYYY-MM-DD.`,
		);
	}

	// At this point we have exactly 3 valid numbers
	const year = parts[0] as number;
	const month = parts[1] as number;
	const day = parts[2] as number;
	return new Date(year, month - 1, day);
}

/**
 * Get week number for a date
 *
 * Calculates the week number for a given date.
 * Week 1 is the first partial week of the year.
 *
 * @param date - The Date object to calculate week number for
 * @returns The week number (1-53)
 */
export function getWeekNumber(date: Date): number {
	const startOfYear = new Date(date.getFullYear(), 0, 1);
	const daysSinceStart = Math.floor(
		(date.getTime() - startOfYear.getTime()) / MS_PER_DAY,
	);
	return Math.ceil((daysSinceStart + startOfYear.getDay() + 1) / 7);
}

/**
 * Get week start and end dates
 *
 * Returns the Sunday start and Saturday end dates for the week
 * containing the given date.
 *
 * @param date - The date to get week boundaries for
 * @returns Object with start (Sunday) and end (Saturday) dates
 */
export function getWeekStartEnd(date: Date): { start: Date; end: Date } {
	const start = getStartOfWeek(date);
	const end = addDays(start, 6);
	return { start, end };
}

/**
 * Check if two dates are same day
 *
 * Compares two Date objects to determine if they represent the same calendar day.
 * Ignores time components, comparing only year, month, and day.
 *
 * @param date1 - The first date to compare
 * @param date2 - The second date to compare
 * @returns True if both dates fall on the same calendar day, false otherwise
 */
export function isSameDay(date1: Date, date2: Date): boolean {
	return (
		date1.getFullYear() === date2.getFullYear() &&
		date1.getMonth() === date2.getMonth() &&
		date1.getDate() === date2.getDate()
	);
}

/**
 * Get first day of month
 *
 * Returns the day of the week (0-6) for the first day of the month.
 * Sunday = 0, Monday = 1, ..., Saturday = 6.
 *
 * @param date - The Date object within the month to check
 * @returns The day index (0-6) for the first day of the month
 * @example
 * ```ts
 * // January 2026 starts on a Thursday (4)
 * getFirstDayOfMonth(new Date(2026, 0, 15)) // Returns 4
 * ```
 */
export function getFirstDayOfMonth(date: Date): number {
	return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
}

/**
 * Get days in month
 *
 * Returns the total number of days in the month for the given date.
 * Handles leap years automatically.
 *
 * @param date - The Date object within the month to check
 * @returns The number of days in the month (28-31)
 */
export function getDaysInMonth(date: Date): number {
	return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

/**
 * Get date range array
 *
 * Generates an array of Date objects for each day in the inclusive range
 * from start to end. Does not mutate the input dates.
 *
 * @param start - The start date of the range
 * @param end - The end date of the range
 * @returns Array of Date objects representing each day in the range
 * @throws {Error} If start date is after end date
 */
export function getDateRangeArray(start: Date, end: Date): Date[] {
	// Fail fast on invalid range
	if (start > end) {
		throw new Error(
			`Invalid date range: start (${start.toISOString()}) cannot be after end (${end.toISOString()})`,
		);
	}

	const dates: Date[] = [];
	const current = new Date(start);

	while (current <= end) {
		dates.push(new Date(current));
		current.setDate(current.getDate() + 1);
	}

	return dates;
}

/**
 * Get all weeks within a date range
 *
 * Generates an array of week objects for each week in the specified range.
 * Each week includes start, end dates, and week number.
 *
 * @param range - The date range to calculate weeks for
 * @returns Array of week objects with start, end, and weekNumber
 */
export function getWeeksInRange(
	range: DateRange,
): Array<{ start: Date; end: Date; weekNumber: number }> {
	const weeks: Array<{ start: Date; end: Date; weekNumber: number }> = [];
	let currentDate = new Date(range.startDate);

	while (currentDate <= range.endDate) {
		const weekStart = getStartOfWeek(currentDate);
		const weekEnd = addDays(weekStart, 6);

		weeks.push({
			start: new Date(weekStart),
			end: weekEnd > range.endDate ? new Date(range.endDate) : weekEnd,
			weekNumber: getWeekNumber(weekStart),
		});

		currentDate = addDays(weekStart, 7);
	}

	return weeks;
}

/**
 * Calculate total days in a date range
 *
 * Calculates the total number of days between the start and end dates,
 * inclusive of both endpoints.
 *
 * @param range - The date range to calculate total days for
 * @returns Total number of days in the range
 */
export function getTotalDaysInRange(range: DateRange): number {
	const msDiff = range.endDate.getTime() - range.startDate.getTime();
	return Math.floor(msDiff / MS_PER_DAY) + 1;
}

/**
 * Get total number of weeks in default calendar range
 *
 * Returns the total number of weeks displayed in the calendar
 * based on WEEKS_BACK and WEEKS_FORWARD constants.
 *
 * @returns Total number of weeks in the calendar range
 */
export function getWeeksCount(): number {
	return WEEKS_BACK + WEEKS_FORWARD + 1; // +1 for current week
}
