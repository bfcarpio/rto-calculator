/**
 * Date utility functions for calendar operations
 */
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
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}` as DateString;
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
export function parseDate(dateStr: string): Date {
  const parts = dateStr.split("-").map(Number);
  const year = parts[0] ?? new Date().getFullYear();
  const month = parts[1] ?? new Date().getMonth() + 1;
  const day = parts[2] ?? 1;
  return new Date(year, month - 1, day);
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
  return new Date(year, month + 1, 0).getDate();
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
  const startOfYear = new Date(date.getFullYear(), 0, 1);
  const daysSinceStart = Math.floor(
    (date.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000),
  );
  return Math.ceil((daysSinceStart + startOfYear.getDay() + 1) / 7);
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
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}
