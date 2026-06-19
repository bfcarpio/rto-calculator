/**
 * Calendar state management
 *
 * Module-level mutable state for calendar selections and drag management.
 * Extracted from calendarFunctions to separate state from logic.
 *
 * @module calendar-state
 */

import type {
	DateString,
	IDragSelectionManager,
} from "../../types/calendar-types";

// ─── Types ──────────────────────────────────────────────────────────

/** Week start configuration: which day starts the week */
export type WeekStart = "sunday" | "monday";

// ─── Constants ──────────────────────────────────────────────────────

/** Default week start setting */
export const DEFAULT_WEEK_START: WeekStart = "sunday";

// ─── State ──────────────────────────────────────────────────────────
let selectedDates: Set<DateString> = new Set<DateString>();

/** Drag selection manager for handling drag operations */
let dragSelectionManager: IDragSelectionManager | null = null;

/**
 * Get the current set of selected dates
 * @returns A copy of the selected dates set
 */
export function getSelectedDates(): Set<string> {
	return selectedDates;
}

/**
 * Get the current drag selection manager
 * @returns The drag selection manager or null
 */
export function getDragSelectionManager(): IDragSelectionManager | null {
	return dragSelectionManager;
}

/**
 * Set the selected dates
 * @param newSelectedDates - The new set of selected dates
 */
export function setSelectedDates(newSelectedDates: Set<string>): void {
	selectedDates = new Set(newSelectedDates) as Set<DateString>;
}

/**
 * Set the drag selection manager
 * @param newDragSelectionManager - The new drag selection manager
 */
export function setDragSelectionManager(
	newDragSelectionManager: IDragSelectionManager | null,
): void {
	dragSelectionManager = newDragSelectionManager;
}

/**
 * Add a date to the selection
 * @param dateStr - The date string to add
 */
export function addSelectedDate(dateStr: DateString): void {
	selectedDates.add(dateStr);
}

/**
 * Remove a date from the selection
 * @param dateStr - The date string to remove
 */
export function removeSelectedDate(dateStr: DateString): void {
	selectedDates.delete(dateStr);
}

/**
 * Check if a date is selected
 * @param dateStr - The date string to check
 * @returns Whether the date is in the selection
 */
export function isSelectedDate(dateStr: DateString): boolean {
	return selectedDates.has(dateStr);
}

/**
 * Clear all selected dates
 */
export function clearAllDates(): void {
	selectedDates.clear();
}

/**
 * Get the week start configuration
 * @returns The configured week start day
 */
export function getWeekStartConfig(): WeekStart {
	return DEFAULT_WEEK_START;
}
