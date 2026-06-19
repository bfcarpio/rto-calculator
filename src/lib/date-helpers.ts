/**
 * Parse "YYYY-MM-DD" as local midnight, not UTC midnight.
 *
 * BUG PATTERN: new Date("2025-03-22") parses as UTC midnight.
 * In negative-UTC timezones (EST, CST, PST), this shows as the previous day.
 * Example: new Date("2025-03-22") → Sat Mar 21 7pm EST (WRONG day)
 *          parseLocalDate("2025-03-22") → Sun Mar 22 midnight local (CORRECT)
 */
export function parseLocalDate(isoString: string): Date {
	const parts = isoString.split("-");
	if (parts.length !== 3) {
		throw new Error(
			`Invalid date string: "${isoString}". Expected "YYYY-MM-DD".`,
		);
	}
	const [year, month, day] = parts.map(Number);
	if (
		!year ||
		!month ||
		!day ||
		Number.isNaN(year) ||
		Number.isNaN(month) ||
		Number.isNaN(day)
	) {
		throw new Error(
			`Invalid date string: "${isoString}". Expected "YYYY-MM-DD" with numeric values.`,
		);
	}
	const date = new Date(year, month - 1, day);
	// JS auto-corrects overflow (e.g., month 13 → next Jan), so verify the date matches
	if (
		date.getFullYear() !== year ||
		date.getMonth() !== month - 1 ||
		date.getDate() !== day
	) {
		throw new Error(
			`Invalid date string: "${isoString}". Date values out of range.`,
		);
	}
	return date;
}

/**
 * Assert that a Date is Sunday midnight local time.
 * Catches UTC-midnight dates that would have getDay() !== 0 in negative-UTC timezones.
 */
export function assertSundayMidnight(date: Date, context: string): void {
	if (date.getDay() !== 0) {
		throw new Error(
			`Expected Sunday, got day=${date.getDay()} (${date.toDateString()}) in ${context}`,
		);
	}
	if (
		date.getHours() !== 0 ||
		date.getMinutes() !== 0 ||
		date.getSeconds() !== 0
	) {
		throw new Error(
			`Expected midnight local time, got ${date.getHours()}:${date.getMinutes()}:${date.getSeconds()} in ${context}`,
		);
	}
}

/**
 * Format a Date as "YYYY-MM-DD" using local time components.
 *
 * BUG PATTERN: date.toISOString().split("T")[0] converts to UTC first,
 * which shifts dates backward for users in negative-UTC timezones.
 * Example: new Date(2025, 2, 22) in EST → toISOString() gives "2025-03-21T05:00:00.000Z"
 *          → .split("T")[0] gives "2025-03-21" (WRONG — off by one day)
 *          → formatDate(date) gives "2025-03-22" (CORRECT — uses local time)
 */
export function formatDate(date: Date): string {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const day = String(date.getDate()).padStart(2, "0");
	return `${year}-${month}-${day}`;
}
