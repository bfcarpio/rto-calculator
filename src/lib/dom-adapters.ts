/**
 * DOM adapters for validation
 *
 * Functions that bridge DOM elements to validation data types.
 * These are separated from pure validation logic to keep rto-core.ts
 * free of DOM dependencies.
 *
 * @module dom-adapters
 */

import type { DaySelection } from "./validation/rto-core";
import { createDaySelection } from "./validation/rto-core";

/**
 * Convert a calendar cell DOM element to a DaySelection object.
 *
 * Reads year, month, day, and selectionType from the element's
 * dataset properties and returns a structured DaySelection.
 *
 * @param element - The calendar cell DOM element with data-year, data-month, data-day, data-selection-type
 * @returns A DaySelection object, or null if required data attributes are missing
 */
export function elementToDaySelection(
	element: HTMLElement,
): DaySelection | null {
	const year = element.dataset.year;
	const month = element.dataset.month;
	const day = element.dataset.day;
	const selectionType = element.dataset.selectionType;

	if (!year || !month || !day) {
		return null;
	}

	return createDaySelection(
		parseInt(year, 10),
		parseInt(month, 10),
		parseInt(day, 10),
		(selectionType as "out-of-office" | "none") || "none",
	);
}
