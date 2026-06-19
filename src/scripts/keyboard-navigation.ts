/**
 * Keyboard navigation for calendar grid cells
 *
 * Provides arrow key navigation between calendar day cells
 * and keyboard-triggered selection toggles.
 *
 * @module keyboard-navigation
 */

import type { CalendarManager } from "../../packages/datepainter/src/CalendarManager";
import type {
	DateState,
	DateString,
} from "../../packages/datepainter/src/types";
import { applySelectionToDate } from "./drag-painting";

/**
 * Navigates between day cells with arrow keys
 *
 * Calculates the next cell based on direction and moves focus.
 * Wraps around at boundaries (modular arithmetic).
 *
 * @param direction - Arrow key direction ("ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight")
 * @param currentCell - Currently focused cell element
 */
export function navigateKeyboard(
	direction: string,
	currentCell: HTMLElement,
): void {
	const allCells = Array.from(
		document.querySelectorAll(".calendar-day:not(.empty)"),
	);
	const currentIndex = allCells.indexOf(currentCell);

	// Guard clause: current cell not found in list
	if (currentIndex === -1) {
		return;
	}

	let nextIndex: number;
	switch (direction) {
		case "ArrowRight":
			nextIndex = (currentIndex + 1) % allCells.length;
			break;
		case "ArrowLeft":
			nextIndex = (currentIndex - 1 + allCells.length) % allCells.length;
			break;
		case "ArrowDown":
			nextIndex = (currentIndex + 7) % allCells.length;
			break;
		case "ArrowUp":
			nextIndex = (currentIndex - 7 + allCells.length) % allCells.length;
			break;
		default:
			return; // Invalid direction
	}

	// Move focus to next cell
	if (nextIndex !== undefined && allCells[nextIndex]) {
		(allCells[nextIndex] as HTMLElement).focus();
	}
}

/**
 * Toggles OOF selection on a cell when Enter/Space is pressed
 *
 * @param manager - The CalendarManager instance for state mutations
 * @param date - The date string for the cell
 * @param currentState - The current selection state of the cell
 */
export function toggleCellSelection(
	manager: CalendarManager,
	date: DateString,
	currentState: DateState | null,
): void {
	if (currentState === "oof") {
		applySelectionToDate(manager, date, null);
	} else {
		applySelectionToDate(manager, date, "oof");
	}
}
