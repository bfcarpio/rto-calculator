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
  const [year, month, day] = dateStr.split("-").map(Number);
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
