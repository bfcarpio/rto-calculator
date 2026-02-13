/**
 * Date utility functions for RTO Calculator
 *
 * Work-week oriented utilities (Monday-based weeks, weekday filtering).
 * For general calendar utilities, use src/lib/dateUtils.ts.
 */

import {
	addDays,
	eachDayOfInterval,
	format,
	isBefore,
	isWeekend as dfIsWeekend,
	startOfDay,
	startOfMonth,
	startOfWeek,
} from "date-fns";

// Re-export shared utilities from lib for consumers that import from here
export { formatDateISO, isSameDay } from "../lib/dateUtils";

/**
 * Get start of work week (Monday) for a given date
 */
export function getStartOfWeek(date: Date): Date {
	return startOfWeek(date, { weekStartsOn: 1 });
}

/**
 * Check if a date is a weekend (Saturday or Sunday)
 */
export function isWeekend(date: Date): boolean {
	return dfIsWeekend(date);
}

/**
 * Check if a date is a weekday (Monday-Friday)
 */
export function isWeekday(date: Date): boolean {
	return !dfIsWeekend(date);
}

/**
 * Get all weekday dates (Mon-Fri) in a week
 */
export function getWeekDates(date: Date): Date[] {
	const start = getStartOfWeek(date);
	return Array.from({ length: 5 }, (_, i) => addDays(start, i));
}

/**
 * Get all weekday dates in a rolling period
 */
export function getRollingPeriodDates(startDate: Date, weeks: number): Date[] {
	const start = getStartOfWeek(startDate);
	const dates: Date[] = [];

	for (let week = 0; week < weeks; week++) {
		for (let day = 0; day < 5; day++) {
			dates.push(addDays(start, week * 7 + day));
		}
	}

	return dates;
}

/**
 * Check if a date is in the past
 */
export function isPastDate(date: Date): boolean {
	return isBefore(startOfDay(date), startOfDay(new Date()));
}

/**
 * Format date for display (e.g., "Jan 10, 2025")
 */
export function formatDateDisplay(date: Date): string {
	return format(date, "MMM d, yyyy");
}

/**
 * Get all dates for a 12-month calendar starting from the first day of the current month
 */
export function getCalendarDates(): Date[] {
	const start = startOfMonth(new Date());
	const end = addDays(startOfMonth(addDays(start, 365)), -1);
	return eachDayOfInterval({ start, end });
}
