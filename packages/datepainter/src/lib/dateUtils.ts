/**
 * Date utility functions for calendar operations
 *
 * Internal to datepainter package - do not import externally.
 * Uses date-fns internally but re-exports with stable signatures
 * for backward compatibility with existing consumers.
 */
import {
	addDays as dfAddDays,
	getDaysInMonth as dfGetDaysInMonth,
	format,
	getWeek,
	parse,
} from "date-fns";
import type { DateString } from "../types";

/**
 * Formats a Date object to a date string (YYYY-MM-DD)
 *
 * @param date - The Date object to format
 * @returns The formatted date string
 *
 * @example
 * ```ts
 * formatDate(new Date(2026, 1, 6)); // '2026-02-06'
 * ```
 */
export function formatDate(date: Date): DateString {
	return format(date, "yyyy-MM-dd") as DateString;
}

/**
 * Parses a date string (YYYY-MM-DD) to a Date object
 *
 * @param dateStr - The date string to parse
 * @returns The parsed Date object
 *
 * @example
 * ```ts
 * parseDate('2026-02-06'); // Date object for February 6, 2026
 * ```
 */
const MIDNIGHT_REF = new Date(2000, 0, 1); // fixed midnight reference for parse()

export function parseDate(dateStr: string): Date {
	return parse(dateStr, "yyyy-MM-dd", MIDNIGHT_REF);
}

/**
 * Gets the number of days in a month
 *
 * @param year - The year
 * @param month - The month (0-11, where 0 is January)
 * @returns The number of days in the month
 *
 * @example
 * ```ts
 * getDaysInMonth(2026, 1); // 28 (February 2026)
 * ```
 */
export function getDaysInMonth(year: number, month: number): number {
	return dfGetDaysInMonth(new Date(year, month));
}

/**
 * Gets the first day of the month
 *
 * Returns the day of the week (0-6) for the first day of the month.
 * Sunday = 0, Monday = 1, ..., Saturday = 6.
 *
 * @param date - The Date object within the month to check
 * @returns The day index (0-6) for the first day of the month
 *
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
 * Gets the week number for a date
 *
 * Calculates the week number for a given date.
 * Week 1 is the first partial week of the year.
 *
 * @param date - The Date object to calculate week number for
 * @returns The week number (1-53)
 */
export function getWeekNumber(date: Date): number {
	return getWeek(date, { weekStartsOn: 0 });
}

/**
 * Adds days to a date
 *
 * Creates a new Date object with the specified number of days added.
 * Does not mutate the original date object.
 *
 * @param date - The original date
 * @param days - The number of days to add (can be negative)
 * @returns A new Date object representing the calculated date
 */
export function addDays(date: Date, days: number): Date {
	return dfAddDays(date, days);
}

/**
 * Checks whether a date falls on a weekday (Monday–Friday)
 *
 * @param date - The Date object to check
 * @returns True if the day is Mon–Fri, false for Sat/Sun
 */
export function isWeekday(date: Date): boolean {
	const day = date.getDay();
	return day >= 1 && day <= 5;
}
