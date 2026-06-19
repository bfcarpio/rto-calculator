/**
 * Astro-specific calendar functions for RTO Calculator
 *
 * Public API module that re-exports from focused sub-modules:
 * - calendar-state.ts — Module-level mutable state
 * - calendar-rendering.ts — Rendering functions
 * - calendar-events.ts — Event handler functions
 *
 * @packageDocumentation
 */

import { getCalendarDates } from "../dateUtils";
import {
	clearCalendarSelections,
	exportCalendarSelections,
	validateAndUpdateCalendar,
} from "./calendar-events";
import { createMonthElement, groupDatesByMonth } from "./calendar-rendering";
import { DEFAULT_WEEK_START, type WeekStart } from "./calendar-state";

// ─── Events ──────────────────────────────────────────────────────────
export {
	clearCalendarSelections,
	exportCalendarSelections,
	handleDayClick,
	handleDayMouseDown,
	handleDayMouseOver,
	handleDayMouseUp,
	setupCalendarEventListeners,
	validateAndUpdateCalendar,
} from "./calendar-events";
// ─── Rendering ──────────────────────────────────────────────────────
export {
	createDayCell,
	createMonthElement,
	getFirstDayOfWeek,
	getWeeksForMonth,
	groupDatesByMonth,
	updateDayCellState,
} from "./calendar-rendering";
// ─── State ──────────────────────────────────────────────────────────
export {
	addSelectedDate,
	clearAllDates,
	DEFAULT_WEEK_START,
	getDragSelectionManager,
	getSelectedDates,
	getWeekStartConfig,
	isSelectedDate,
	removeSelectedDate,
	setDragSelectionManager,
	setSelectedDates,
	type WeekStart,
} from "./calendar-state";

// ─── Legacy aliases for backward compatibility ──────────────────────

/**
 * @deprecated Use clearCalendarSelections instead
 */
export const clearAllSelections = clearCalendarSelections;

/**
 * @deprecated Use exportCalendarSelections instead
 */
export const exportSelections = exportCalendarSelections;

// ─── Calendar Rendering ──────────────────────────────────────────────

/**
 * Render the calendar grid with all months
 * @param container - The container element for the calendar
 * @param weekStart - The day the week starts on (default: Sunday)
 */
export function renderCalendar(
	container: HTMLElement,
	weekStart: WeekStart = DEFAULT_WEEK_START,
): void {
	container.innerHTML = "";
	container.className = "calendar-grid-container";

	const dates = getCalendarDates();
	const months = groupDatesByMonth(dates);

	// Sort months chronologically
	const sortedMonthKeys = Object.keys(months).sort((a, b) => {
		const partsA = a.split("-").map(Number);
		const partsB = b.split("-").map(Number);
		const yearA = partsA[0] ?? 0;
		const monthA = partsA[1] ?? 0;
		const yearB = partsB[0] ?? 0;
		const monthB = partsB[1] ?? 0;
		if (yearA !== yearB) {
			return yearA - yearB;
		}
		return monthA - monthB;
	});

	sortedMonthKeys.forEach((monthKey) => {
		const monthDates = months[monthKey] ?? [];
		const monthElement = createMonthElement(monthKey, monthDates, weekStart);
		container.appendChild(monthElement);
	});

	// After rendering, update the calendar state
	validateAndUpdateCalendar(weekStart);
}

/**
 * Get the week start locale setting
 * @returns The configured week start day
 */
export function getLocaleWeekStart(): WeekStart {
	return DEFAULT_WEEK_START;
}
