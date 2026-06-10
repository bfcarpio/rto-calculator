/**
 * Window range label — shared between WindowExplorer, WindowBreakdown, and status-details.
 *
 * Pure functions with no DOM dependency. Both WindowWeekDetail and WeekCompliance
 * satisfy the `{weekStart: Date}` shape structurally — no adapter code needed.
 */

import { fmtShort } from "../dateUtils";
import { FRIDAY_OFFSET } from "../validation/constants";

/**
 * Compute the Friday end date of a window given its weeks.
 * Returns a new Date for the Friday of the last week, or null for empty input.
 */
export function buildWindowEnd(weeks: Array<{ weekStart: Date }>): Date | null {
	if (weeks.length === 0) return null;
	const lastWeek = weeks[weeks.length - 1];
	if (!lastWeek) return null;
	const windowEnd = new Date(lastWeek.weekStart);
	windowEnd.setDate(windowEnd.getDate() + FRIDAY_OFFSET);
	return windowEnd;
}

/**
 * Build a human-readable range label like "Mar 15 – Jun 5".
 * Uses the start of the first week and the Friday of the last week.
 */
export function buildWindowRangeLabel(
	weeks: Array<{ weekStart: Date }>,
): string {
	if (weeks.length === 0) return "";
	const firstWeek = weeks[0];
	if (!firstWeek) return "";
	const windowEnd = buildWindowEnd(weeks);
	if (!windowEnd) return "";
	return `${fmtShort(firstWeek.weekStart)} – ${fmtShort(windowEnd)}`;
}
