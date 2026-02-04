/**
 * Date fixtures for consistent relative date testing
 */

export const TODAY = new Date();

export function getRelativeDate(days: number): Date {
	const date = new Date(TODAY);
	date.setDate(date.getDate() + days);
	return date;
}

export function formatDate(date: Date): string {
	const formatted = date.toISOString().split("T")[0];
	if (!formatted) {
		throw new Error("Failed to format date");
	}
	return formatted;
}

// Common date scenarios
export const DATES = {
	today: () => formatDate(TODAY),
	yesterday: () => formatDate(getRelativeDate(-1)),
	tomorrow: () => formatDate(getRelativeDate(1)),
	lastWeek: () => formatDate(getRelativeDate(-7)),
	nextWeek: () => formatDate(getRelativeDate(7)),
	twoWeeksAgo: () => formatDate(getRelativeDate(-14)),
	twoWeeksFromNow: () => formatDate(getRelativeDate(14)),
	lastMonth: () => formatDate(getRelativeDate(-30)),
	nextMonth: () => formatDate(getRelativeDate(30)),
} as const;

// Out of range dates (12 weeks back, 52 weeks forward)
export const OUT_OF_RANGE = {
	beforeRange: () => formatDate(getRelativeDate(-85)), // ~12 weeks + a few days
	afterRange: () => formatDate(getRelativeDate(365)), // way after 52 weeks
} as const;
