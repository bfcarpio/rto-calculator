/**
 * Fixture with calendar date data for tests
 * Provides reusable date constants and helper functions
 */

/**
 * Base calendar configuration
 * All dates are based on a starting Monday: January 6, 2025
 */
export const BASE_CALENDAR = {
	startYear: 2025,
	startMonth: 0, // January
	startDay: 6, // Monday
	description: "Calendar starts Monday, January 6, 2025",
};

/**
 * Week start dates for the first 12 weeks (2025)
 * Each date represents the Monday of that week
 */
export const WEEK_START_DATES = [
	new Date(2025, 0, 6), // Week 1: Jan 6-10
	new Date(2025, 0, 13), // Week 2: Jan 13-17
	new Date(2025, 0, 20), // Week 3: Jan 20-24
	new Date(2025, 0, 27), // Week 4: Jan 27-31
	new Date(2025, 1, 3), // Week 5: Feb 3-7
	new Date(2025, 1, 10), // Week 6: Feb 10-14
	new Date(2025, 1, 17), // Week 7: Feb 17-21
	new Date(2025, 1, 24), // Week 8: Feb 24-28
	new Date(2025, 2, 3), // Week 9: Mar 3-7
	new Date(2025, 2, 10), // Week 10: Mar 10-14
	new Date(2025, 2, 17), // Week 11: Mar 17-21
	new Date(2025, 2, 24), // Week 12: Mar 24-28
];

/**
 * Weekday names mapping to numbers
 */
export const WEEKDAYS = {
	SUNDAY: 0,
	MONDAY: 1,
	TUESDAY: 2,
	WEDNESDAY: 3,
	THURSDAY: 4,
	FRIDAY: 5,
	SATURDAY: 6,
} as const;

/**
 * Month names mapping to numbers (0-indexed)
 */
export const MONTHS = {
	JANUARY: 0,
	FEBRUARY: 1,
	MARCH: 2,
	APRIL: 3,
	MAY: 4,
	JUNE: 5,
	JULY: 6,
	AUGUST: 7,
	SEPTEMBER: 8,
	OCTOBER: 9,
	NOVEMBER: 10,
	DECEMBER: 11,
} as const;

/**
 * Get the Monday (week start) for a given week number
 * @param weekNumber Week number (1-12)
 * @returns Date object for Monday of that week
 */
export function getWeekStart(weekNumber: number): Date {
	if (weekNumber < 1 || weekNumber > 12) {
		throw new Error(`Week number must be between 1 and 12, got ${weekNumber}`);
	}
	return new Date(WEEK_START_DATES[weekNumber - 1]!);
}

/**
 * Get a specific weekday date for a given week
 * @param weekNumber Week number (1-12)
 * @param weekday Weekday number (0=Sunday, 1=Monday, ..., 6=Saturday)
 * @returns Date object for that weekday
 */
export function getWeekdayDate(weekNumber: number, weekday: number): Date {
	const weekStart = getWeekStart(weekNumber);
	const daysToAdd = weekday === WEEKDAYS.SUNDAY ? 6 : weekday - 1;
	const result = new Date(weekStart);
	result.setDate(result.getDate() + daysToAdd);
	return result;
}

/**
 * Get Monday date for a specific week
 * @param weekNumber Week number (1-12)
 * @returns Monday date
 */
export function getMonday(weekNumber: number): Date {
	return getWeekdayDate(weekNumber, WEEKDAYS.MONDAY);
}

/**
 * Get Tuesday date for a specific week
 * @param weekNumber Week number (1-12)
 * @returns Tuesday date
 */
export function getTuesday(weekNumber: number): Date {
	return getWeekdayDate(weekNumber, WEEKDAYS.TUESDAY);
}

/**
 * Get Wednesday date for a specific week
 * @param weekNumber Week number (1-12)
 * @returns Wednesday date
 */
export function getWednesday(weekNumber: number): Date {
	return getWeekdayDate(weekNumber, WEEKDAYS.WEDNESDAY);
}

/**
 * Get Thursday date for a specific week
 * @param weekNumber Week number (1-12)
 * @returns Thursday date
 */
export function getThursday(weekNumber: number): Date {
	return getWeekdayDate(weekNumber, WEEKDAYS.THURSDAY);
}

/**
 * Get Friday date for a specific week
 * @param weekNumber Week number (1-12)
 * @returns Friday date
 */
export function getFriday(weekNumber: number): Date {
	return getWeekdayDate(weekNumber, WEEKDAYS.FRIDAY);
}

/**
 * Get all weekday dates (Mon-Fri) for a specific week
 * @param weekNumber Week number (1-12)
 * @returns Array of 5 dates (Monday through Friday)
 */
export function getWeekdays(weekNumber: number): Date[] {
	return [
		getMonday(weekNumber),
		getTuesday(weekNumber),
		getWednesday(weekNumber),
		getThursday(weekNumber),
		getFriday(weekNumber),
	];
}

/**
 * Check if a date is a weekend (Saturday or Sunday)
 * @param date Date to check
 * @returns True if weekend
 */
export function isWeekend(date: Date): boolean {
	const day = date.getDay();
	return day === WEEKDAYS.SATURDAY || day === WEEKDAYS.SUNDAY;
}

/**
 * Check if a date is a weekday (Monday-Friday)
 * @param date Date to check
 * @returns True if weekday
 */
export function isWeekday(date: Date): boolean {
	return !isWeekend(date);
}

/**
 * Get the number of weekdays between two dates (inclusive)
 * @param startDate Start date
 * @param endDate End date
 * @returns Number of weekdays
 */
export function getWeekdaysBetween(startDate: Date, endDate: Date): number {
	let count = 0;
	const current = new Date(startDate);

	while (current <= endDate) {
		if (isWeekday(current)) {
			count++;
		}
		current.setDate(current.getDate() + 1);
	}

	return count;
}

/**
 * Get date for a specific month, year, and day
 * @param year Year
 * @param month Month (0-11)
 * @param day Day of month
 * @returns Date object
 */
export function getDate(year: number, month: number, day: number): Date {
	return new Date(year, month, day);
}

/**
 * Get the first Monday of a given month and year
 * @param year Year
 * @param month Month (0-11)
 * @returns Date object for first Monday
 */
export function getFirstMondayOfMonth(year: number, month: number): Date {
	const date = new Date(year, month, 1);
	const day = date.getDay();
	const daysToAdd = day === WEEKDAYS.MONDAY ? 0 : (8 - day) % 7;
	date.setDate(date.getDate() + daysToAdd);
	return date;
}

/**
 * Get the number of weeks in a month that contain weekdays
 * @param year Year
 * @param month Month (0-11)
 * @returns Number of weeks
 */
export function getWeeksInMonth(year: number, month: number): number {
	const firstDay = new Date(year, month, 1);
	const lastDay = new Date(year, month + 1, 0);

	// Get the Monday of the first week
	const firstMonday = new Date(firstDay);
	const firstDayOfWeek = firstDay.getDay();
	const daysToMonday =
		firstDayOfWeek === WEEKDAYS.SUNDAY ? 6 : firstDayOfWeek - 1;
	firstMonday.setDate(firstDay.getDate() - daysToMonday);

	// Count weeks until we pass the last day
	let weekCount = 0;
	const currentMonday = new Date(firstMonday);
	const lastFriday = new Date(lastDay);
	lastFriday.setDate(
		lastDay.getDate() -
			(lastDay.getDay() === WEEKDAYS.SUNDAY
				? 1
				: lastDay.getDay() - WEEKDAYS.FRIDAY),
	);

	while (currentMonday <= lastFriday) {
		weekCount++;
		currentMonday.setDate(currentMonday.getDate() + 7);
	}

	return weekCount;
}

/**
 * Edge case dates for testing
 */
export const EDGE_CASE_DATES = {
	// Month boundaries
	lastDayOfJanuary: new Date(2025, 0, 31),
	firstDayOfFebruary: new Date(2025, 1, 1),
	lastDayOfFebruary: new Date(2025, 1, 28), // Non-leap year
	firstDayOfMarch: new Date(2025, 2, 1),

	// Leap year (2024 was a leap year, 2028 will be)
	leapYearFebruary29: new Date(2024, 1, 29),
	nonLeapYearFebruary28: new Date(2025, 1, 28),

	// Year boundaries
	lastDayOf2024: new Date(2024, 11, 31),
	firstDayOf2025: new Date(2025, 0, 1),

	// Week crossing month boundary
	weekSpanningJanFeb: [
		new Date(2025, 0, 27), // Monday, Jan 27
		new Date(2025, 0, 28), // Tuesday
		new Date(2025, 0, 29), // Wednesday
		new Date(2025, 0, 30), // Thursday
		new Date(2025, 0, 31), // Friday
	],
} as const;

/**
 * Get a date range for testing
 * @param startWeek Start week number (1-12)
 * @param endWeek End week number (1-12)
 * @returns Array of dates covering the range
 */
export function getDateRange(startWeek: number, endWeek: number): Date[] {
	const dates: Date[] = [];

	for (let week = startWeek; week <= endWeek; week++) {
		dates.push(...getWeekdays(week));
	}

	return dates;
}

/**
 * Calendar configuration for testing
 */
export const CALENDAR_CONFIG = {
	totalWeekdaysPerWeek: 5,
	rollingPeriodWeeks: 12,
	evaluationWeeks: 8,
	minOfficeDaysPerWeek: 3,
	thresholdPercentage: 0.6,
} as const;

/**
 * Get the expected total weekdays for a range of weeks
 * @param weekCount Number of weeks
 * @returns Total weekdays
 */
export function getTotalWeekdays(weekCount: number): number {
	return weekCount * CALENDAR_CONFIG.totalWeekdaysPerWeek;
}

/**
 * Get the expected minimum office days for a range of weeks
 * @param weekCount Number of weeks
 * @returns Minimum office days needed
 */
export function getMinOfficeDays(weekCount: number): number {
	return weekCount * CALENDAR_CONFIG.minOfficeDaysPerWeek;
}
