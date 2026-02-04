/**
 * Date Utilities - Range calculations and date operations
 * Follows the 5 Laws of Elegant Defense
 */

const WEEKS_BACK = 12;
const WEEKS_FORWARD = 52;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

export interface DateRange {
	startDate: Date;
	endDate: Date;
}

export function getToday(): Date {
	const now = new Date();
	return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function addDays(date: Date, days: number): Date {
	const result = new Date(date);
	result.setDate(result.getDate() + days);
	return result;
}

function addWeeks(date: Date, weeks: number): Date {
	return addDays(date, weeks * 7);
}

function getStartOfWeek(date: Date): Date {
	const dayOfWeek = date.getDay();
	const daysToSubtract = dayOfWeek;
	return addDays(date, -daysToSubtract);
}

function getEndOfWeek(date: Date): Date {
	const startOfWeek = getStartOfWeek(date);
	return addDays(startOfWeek, 6);
}

export function getDateRange(): DateRange {
	const today = getToday();
	const startDate = addWeeks(today, -WEEKS_BACK);
	const endDate = addWeeks(today, WEEKS_FORWARD);

	return {
		startDate: getStartOfWeek(startDate),
		endDate: getEndOfWeek(endDate),
	};
}

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

export function formatDateISO(date: Date): string {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const day = String(date.getDate()).padStart(2, "0");
	return `${year}-${month}-${day}`;
}

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

export function getWeekNumber(date: Date): number {
	const startOfYear = new Date(date.getFullYear(), 0, 1);
	const daysSinceStart = Math.floor(
		(date.getTime() - startOfYear.getTime()) / MS_PER_DAY,
	);
	return Math.ceil((daysSinceStart + startOfYear.getDay() + 1) / 7);
}

export function getWeekStartEnd(date: Date): { start: Date; end: Date } {
	const start = getStartOfWeek(date);
	const end = addDays(start, 6);
	return { start, end };
}

export function isSameDay(date1: Date, date2: Date): boolean {
	return (
		date1.getFullYear() === date2.getFullYear() &&
		date1.getMonth() === date2.getMonth() &&
		date1.getDate() === date2.getDate()
	);
}

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

export function getTotalDaysInRange(range: DateRange): number {
	const msDiff = range.endDate.getTime() - range.startDate.getTime();
	return Math.floor(msDiff / MS_PER_DAY) + 1;
}

export function getWeeksCount(): number {
	return WEEKS_BACK + WEEKS_FORWARD + 1; // +1 for current week
}
