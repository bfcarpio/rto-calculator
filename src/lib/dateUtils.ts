/**
 * Date Utilities - Range calculations and date operations
 */

import {
	addDays,
	addWeeks,
	differenceInDays,
	eachDayOfInterval,
	endOfWeek,
	format,
	getDaysInMonth as dfGetDaysInMonth,
	getWeek,
	isSameDay as dfIsSameDay,
	isValid,
	isWithinInterval,
	parse,
	startOfDay,
	startOfWeek,
} from "date-fns";
import type { DateString } from "../types/calendar-types";

const MIDNIGHT_REF = new Date(2000, 0, 1); // fixed midnight reference for parse()
const WEEKS_BACK = 12;
const WEEKS_FORWARD = 52;

export interface DateRange {
	startDate: Date;
	endDate: Date;
}

/**
 * Get today's date with time set to midnight
 */
export function getToday(): Date {
	return startOfDay(new Date());
}

/**
 * Get default date range for calendar display
 *
 * Calculates the date range spanning from WEEKS_BACK before today
 * to WEEKS_FORWARD after today, aligned to week boundaries (Sun-Sat).
 */
export function getDateRange(): DateRange {
	const today = getToday();
	const opts = { weekStartsOn: 0 as const };

	return {
		startDate: startOfWeek(addWeeks(today, -WEEKS_BACK), opts),
		endDate: endOfWeek(addWeeks(today, WEEKS_FORWARD), opts),
	};
}

/**
 * Check if date falls within specified range (inclusive)
 */
export function isDateInRange(date: Date, range: DateRange): boolean {
	return isWithinInterval(startOfDay(date), {
		start: startOfDay(range.startDate),
		end: startOfDay(range.endDate),
	});
}

/**
 * Format Date to ISO string (YYYY-MM-DD)
 */
export function formatDateISO(date: Date): string {
	return format(date, "yyyy-MM-dd");
}

/**
 * Format Date to ISO string (YYYY-MM-DD) with DateString return type
 */
export function formatDate(date: Date): DateString {
	return format(date, "yyyy-MM-dd") as DateString;
}

/**
 * Parse ISO string to Date, returning null for invalid dates
 */
export function parseDateISO(dateString: string): Date | null {
	const match = dateString.match(/^\d{4}-\d{2}-\d{2}$/);
	if (!match) return null;

	const date = parse(dateString, "yyyy-MM-dd", MIDNIGHT_REF);
	if (!isValid(date)) return null;

	// Validate round-trip (catches invalid dates like Feb 30)
	if (format(date, "yyyy-MM-dd") !== dateString) return null;

	return date;
}

/**
 * Parse ISO string to Date (throws on invalid input)
 */
export function parseDate(dateStr: DateString): Date {
	const date = parse(dateStr, "yyyy-MM-dd", MIDNIGHT_REF);
	if (!isValid(date)) {
		throw new Error(
			`Invalid date string format: ${dateStr}. Expected YYYY-MM-DD.`,
		);
	}
	return date;
}

/**
 * Get week number for a date (week starts on Sunday)
 */
export function getWeekNumber(date: Date): number {
	return getWeek(date, { weekStartsOn: 0 });
}

/**
 * Get week start (Sunday) and end (Saturday) dates
 */
export function getWeekStartEnd(date: Date): { start: Date; end: Date } {
	const opts = { weekStartsOn: 0 as const };
	return {
		start: startOfWeek(date, opts),
		end: endOfWeek(date, opts),
	};
}

/**
 * Check if two dates are the same calendar day
 */
export function isSameDay(date1: Date, date2: Date): boolean {
	return dfIsSameDay(date1, date2);
}

/**
 * Get first day of month (0=Sun, 6=Sat)
 */
export function getFirstDayOfMonth(date: Date): number {
	return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
}

/**
 * Get number of days in the month
 */
export function getDaysInMonth(date: Date): number {
	return dfGetDaysInMonth(date);
}

/**
 * Get array of Date objects for each day in an inclusive range
 */
export function getDateRangeArray(start: Date, end: Date): Date[] {
	if (start > end) {
		throw new Error(
			`Invalid date range: start (${start.toISOString()}) cannot be after end (${end.toISOString()})`,
		);
	}
	return eachDayOfInterval({ start, end });
}

/**
 * Get all weeks within a date range
 */
export function getWeeksInRange(
	range: DateRange,
): Array<{ start: Date; end: Date; weekNumber: number }> {
	const opts = { weekStartsOn: 0 as const };
	const weeks: Array<{ start: Date; end: Date; weekNumber: number }> = [];
	let current = new Date(range.startDate);

	while (current <= range.endDate) {
		const weekStart = startOfWeek(current, opts);
		const weekEnd = endOfWeek(weekStart, opts);

		weeks.push({
			start: new Date(weekStart),
			end: weekEnd > range.endDate ? new Date(range.endDate) : weekEnd,
			weekNumber: getWeek(weekStart, opts),
		});

		current = addDays(weekStart, 7);
	}

	return weeks;
}

/**
 * Calculate total days in a date range (inclusive)
 */
export function getTotalDaysInRange(range: DateRange): number {
	return differenceInDays(range.endDate, range.startDate) + 1;
}

/**
 * Get total number of weeks in default calendar range
 */
export function getWeeksCount(): number {
	return WEEKS_BACK + WEEKS_FORWARD + 1;
}
