/**
 * Date utility functions for RTO Calculator
 *
 * Work-week oriented utilities (Sunday-based weeks, weekday filtering).
 * Canonical implementations live in src/lib/dateUtils.ts — this module
 * re-exports them for backward compatibility and adds UI-specific helpers.
 */

import {
	addDays,
	eachDayOfInterval,
	format,
	isBefore,
	startOfDay,
	startOfMonth,
} from "date-fns";
import { getStartOfWeek } from "../lib/dateUtils";

// Re-export shared utilities from lib for consumers that import from here.
// These are the canonical implementations — the local duplicates have been removed.
export {
	formatDateISO,
	getFullWeekDates,
	getStartOfWeek,
	isSameDay,
	isWeekday,
	isWeekend,
} from "../lib/dateUtils";

/**
 * Get all weekday dates (Mon-Fri) in the week containing the given date.
 *
 * IMPORTANT: This returns only 5 weekday dates (Monday through Friday).
 * For all 7 days (Sun-Sat), use getFullWeekDates from lib/dateUtils.
 */
export function getWeekdayDates(date: Date): Date[] {
	const start = getStartOfWeek(date);
	// Start from Monday (day 1) through Friday (day 5) within a Sunday-start week
	return Array.from({ length: 5 }, (_, i) => addDays(start, i + 1));
}

/**
 * @deprecated Use getWeekdayDates instead. This alias will be removed in a future release.
 */
export const getWeekDates = getWeekdayDates;

/**
 * Get all weekday dates in a rolling period
 */
export function getRollingPeriodDates(startDate: Date, weeks: number): Date[] {
	const start = getStartOfWeek(startDate);
	const dates: Date[] = [];

	for (let week = 0; week < weeks; week++) {
		// Monday=1 through Friday=5 within Sunday-start week
		for (let day = 1; day <= 5; day++) {
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
