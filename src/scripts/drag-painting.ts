/**
 * Drag painting logic for calendar cell selection
 *
 * Handles mouse/touch interactions for click-drag selection,
 * including drag direction tracking and cell state application.
 *
 * @module drag-painting
 */

import type { CalendarManager } from "../../packages/datepainter/src/CalendarManager";
import { formatDate } from "../../packages/datepainter/src/lib/dateUtils";
import type {
	DateState,
	DateString,
} from "../../packages/datepainter/src/types";
import { logger } from "../utils/logger";

/**
 * Selection intent type for drag painting operations
 * Determines what state should be applied during drag operations
 */
export type SelectionIntent = DateState | null;

/**
 * Internal drag state tracking
 * Extended from package dragState to include selection intent and DOM cell reference
 */
export interface InternalDragState {
	/** Whether a drag operation is currently in progress */
	isDragging: boolean;
	/** The DOM element of the starting cell */
	startCell: HTMLElement | null;
	/** The selection intent to apply during drag (state or null to clear) */
	selectionIntent: SelectionIntent;
}

/**
 * Creates a fresh internal drag state with default values
 *
 * @returns A new InternalDragState with no active drag
 */
export function createInternalDragState(): InternalDragState {
	return {
		isDragging: false,
		startCell: null,
		selectionIntent: null,
	};
}

/**
 * Resets internal drag state to default values
 *
 * @returns A new InternalDragState with no active drag
 */
export function resetDragState(): InternalDragState {
	return createInternalDragState();
}

/**
 * Gets the drag direction between two date strings
 *
 * Simple string comparison works for YYYY-MM-DD format.
 *
 * @param startDate - The starting date string
 * @param currentDate - The current date string
 * @returns The drag direction or null if same date
 */
export function getDragDirection(
	startDate: DateString,
	currentDate: DateString,
): "forward" | "backward" | null {
	if (startDate === currentDate) {
		return null;
	}
	return startDate < currentDate ? "forward" : "backward";
}

/**
 * Gets the date string from a calendar cell element
 *
 * Extracts year, month, day from data attributes and formats as YYYY-MM-DD.
 *
 * @param cell - The calendar cell element
 * @returns The date string or null if invalid
 */
export function getDateFromCell(cell: HTMLElement): DateString | null {
	const year = parseInt(cell.dataset.year || "0", 10);
	const month = parseInt(cell.dataset.month || "0", 10);
	const day = parseInt(cell.dataset.day || "0", 10);

	// Guard clause: validate date components
	if (!year || !month || !day) {
		return null;
	}
	if (Number.isNaN(year) || Number.isNaN(month) || Number.isNaN(day)) {
		return null;
	}

	try {
		const date = new Date(year, month, day);
		const dateStr = formatDate(date);
		return dateStr;
	} catch (error) {
		logger.warn("[DragPainting] Failed to format date from cell", error);
		return null;
	}
}

/**
 * Gets a calendar cell element from a date string
 *
 * Finds the calendar cell corresponding to the given date.
 *
 * @param date - The date string in YYYY-MM-DD format
 * @returns The cell element or null if not found
 */
export function getCellFromDate(date: DateString): HTMLElement | null {
	const parsed = parseDate(date);
	if (!parsed) {
		return null;
	}

	return document.querySelector(
		`.calendar-day[data-year="${parsed.year}"][data-month="${parsed.month}"][data-day="${parsed.day}"]`,
	) as HTMLElement | null;
}

/**
 * Parses a date string (YYYY-MM-DD) into numeric components
 *
 * @param date - The date string in YYYY-MM-DD format
 * @returns The parsed components or null if invalid
 */
export function parseDate(
	date: DateString,
): { year: number; month: number; day: number } | null {
	const parts = date.split("-");
	if (parts.length !== 3) {
		return null;
	}

	const year = parseInt(parts[0] || "0", 10);
	const month = parseInt(parts[1] || "0", 10);
	const day = parseInt(parts[2] || "0", 10);

	if (Number.isNaN(year) || Number.isNaN(month) || Number.isNaN(day)) {
		return null;
	}

	return { year, month, day };
}

/**
 * Applies a selection state to a specific date
 *
 * Uses CalendarManager API to mutate state and updates the DOM.
 * Dispatches events for other modules.
 *
 * @param manager - The CalendarManager instance for state mutations
 * @param date - Date string in YYYY-MM-DD format
 * @param type - Selection state to apply (DateState or null to clear)
 */
export function applySelectionToDate(
	manager: CalendarManager,
	date: DateString,
	type: SelectionIntent,
): void {
	if (type === null) {
		manager.clearDates([date]);
	} else {
		manager.setDates([date], type);
	}

	// Update DOM directly for immediate feedback
	updateCellDOM(date, type);

	// Dispatch event for other modules (validation, localStorage)
	const cell = getCellFromDate(date);
	if (cell) {
		cell.dispatchEvent(
			new CustomEvent("rto-selection-changed", {
				bubbles: true,
				detail: { cell, selectionType: type, date },
			}),
		);
	}
}

/**
 * Updates a cell's DOM to reflect its selection state
 *
 * Updates data attributes, classes, and ARIA attributes.
 *
 * @param date - Date string in YYYY-MM-DD format
 * @param state - Selection state or null
 */
export function updateCellDOM(date: DateString, state: DateState | null): void {
	const cell = getCellFromDate(date);
	if (!cell) {
		return;
	}

	const currentLabel = cell.getAttribute("aria-label") || "";

	if (state === null) {
		// Clear selection
		cell.dataset.selected = "false";
		cell.dataset.selectionType = "";
		cell.classList.remove("selected", "out-of-office");
		cell.ariaSelected = "false";

		// Update aria-label for accessibility
		const newLabel = currentLabel.replace(/\. .*$/, ". Unselected");
		cell.setAttribute("aria-label", newLabel);
	} else {
		// Apply selection state
		const selectionClass = state === "oof" ? "out-of-office" : state;
		cell.dataset.selected = "true";
		cell.dataset.selectionType = state;
		cell.classList.add("selected", selectionClass);
		cell.ariaSelected = "true";

		// Update aria-label for accessibility
		const label =
			state === "oof"
				? "Out of office"
				: state === "holiday"
					? "Holiday"
					: state === "sick"
						? "Sick"
						: state;
		const newLabel = currentLabel.replace(/\. .*$/, `.${label}`);
		cell.setAttribute("aria-label", newLabel);
	}
}

/**
 * Clears selections for a specific month via DOM
 *
 * Clears all selected dates within the month controlled by the clear button.
 *
 * @param button - The clear button element (has aria-controls pointing to month container)
 * @param manager - The CalendarManager instance for state mutations
 * @returns Array of date strings that were cleared
 */
export function clearMonthSelections(
	button: HTMLElement,
	manager: CalendarManager,
): DateString[] {
	const monthId = button.getAttribute("aria-controls");
	if (!monthId) {
		return [];
	}

	const monthContainer = document.getElementById(monthId);
	if (!monthContainer) {
		logger.warn(`[DragPainting] Month container not found: ${monthId}`);
		return [];
	}

	const selectedCells = monthContainer.querySelectorAll(
		".calendar-day.selected",
	);

	const datesToClear: DateString[] = [];
	selectedCells.forEach((cell) => {
		const date = getDateFromCell(cell as HTMLElement);
		if (date) {
			datesToClear.push(date);
		}
	});

	if (datesToClear.length > 0) {
		manager.clearDates(datesToClear);
	}

	return datesToClear;
}
