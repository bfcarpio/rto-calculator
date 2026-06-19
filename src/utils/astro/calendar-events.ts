/**
 * Calendar event handlers
 *
 * Event handler functions for calendar interactions (click, drag, etc.).
 * Extracted from calendarFunctions to separate event handling from rendering.
 *
 * @module calendar-events
 */

import { getStartOfWeek } from "../../lib/dateUtils";
import { clearSavedSelections } from "../../scripts/localStorage";
import type { DateString } from "../../types/calendar-types";
import { formatDateISO } from "../dateUtils";
import { saveSelectedDates } from "../storage";
import { updateDayCellState } from "./calendar-rendering";
import {
	addSelectedDate,
	clearAllDates,
	getDragSelectionManager,
	getSelectedDates,
	isSelectedDate,
	removeSelectedDate,
	type WeekStart,
} from "./calendar-state";

/**
 * Handle day click event
 * @param event - The click event
 */
export function handleDayClick(event: Event): void {
	const target = event.target as HTMLElement;
	if (!target.classList.contains("calendar-day")) {
		return;
	}

	const dateStr = target.getAttribute("data-date");
	if (!dateStr) {
		return;
	}

	// Toggle selection
	const dateString = dateStr as DateString;
	if (isSelectedDate(dateString)) {
		removeSelectedDate(dateString);
	} else {
		addSelectedDate(dateString);
	}

	// Save selections
	const currentDates = getSelectedDates();
	saveSelectedDates(currentDates);

	// Update drag selection manager
	const manager = getDragSelectionManager();
	if (manager) {
		manager.updateSelectedDates(currentDates as Set<DateString>);
	}

	// Update UI
	updateDayCellState(target, dateStr as DateString);
	validateAndUpdateCalendar();
}

/**
 * Handle day mouse down event for drag selection
 * @param event - The mouse down event
 */
export function handleDayMouseDown(event: Event): void {
	const target = event.target as HTMLElement;
	if (!target.classList.contains("calendar-day")) {
		return;
	}

	const dateStr = target.getAttribute("data-date");
	if (!dateStr) {
		return;
	}

	// Only prevent default after confirming target is a calendar day cell
	event.preventDefault();

	const manager = getDragSelectionManager();
	if (manager) {
		manager.startDrag(dateStr as DateString);
	}
}

/**
 * Handle day mouse over event for drag selection
 * @param event - The mouse over event
 */
export function handleDayMouseOver(event: Event): void {
	const target = event.target as HTMLElement;
	if (!target.classList.contains("calendar-day")) {
		return;
	}

	const dateStr = target.getAttribute("data-date");
	if (!dateStr) {
		return;
	}

	const manager = getDragSelectionManager();
	if (manager) {
		if (manager.isDragging()) {
			manager.updateDrag(dateStr as DateString);
			manager.updateSelection();

			// Update UI for all affected cells
			validateAndUpdateCalendar();
		}
	}
}

/**
 * Handle day mouse up event to end drag selection
 */
export function handleDayMouseUp(): void {
	const manager = getDragSelectionManager();
	if (manager) {
		manager.endDrag();
	}
}

/**
 * Validate and update the calendar UI
 * @param _weekStartParam - The day the week starts on (unused but kept for API compat)
 */
export function validateAndUpdateCalendar(_weekStartParam?: WeekStart): void {
	const calendarContainer = document.getElementById("calendar-container");
	if (!calendarContainer) {
		return;
	}

	const dayCells = calendarContainer.querySelectorAll(".calendar-day");

	// Update visual state of each cell (compliance styling is handled by auto-compliance)
	dayCells.forEach((dayCell) => {
		const dateStr = (dayCell as HTMLElement).getAttribute("data-date");
		if (!dateStr) {
			return;
		}

		const date = new Date(dateStr);
		const weekStartLocal = getStartOfWeek(date);
		const weekKey = formatDateISO(weekStartLocal) as DateString;

		(dayCell as HTMLElement).setAttribute(
			"aria-describedby",
			`week-${weekKey}`,
		);

		// Update selected state
		if (dateStr && isSelectedDate(dateStr as DateString)) {
			(dayCell as HTMLElement).classList.add("selected");
		} else {
			(dayCell as HTMLElement).classList.remove("selected");
		}
	});
}

/**
 * Clear all date selections from the calendar
 */
export function clearCalendarSelections(): void {
	clearAllDates();
	saveSelectedDates(getSelectedDates());

	// Clear saved selections from storage
	clearSavedSelections();

	// Update drag selection manager
	const manager = getDragSelectionManager();
	if (manager) {
		manager.updateSelectedDates(getSelectedDates() as Set<DateString>);
	}

	// Directly clear all selections from DOM elements
	const dayCells = document.querySelectorAll(
		'.calendar-day[data-selected="true"]',
	);
	dayCells.forEach((cell) => {
		const cellElement = cell as HTMLElement;

		// Remove selection classes
		cellElement.classList.remove("selected", "out-of-office");

		// Reset data attributes
		cellElement.dataset.selected = "false";
		cellElement.dataset.selectionType = "";

		// Update aria attributes
		cellElement.ariaSelected = "false";

		// Update aria-label to reflect unselected state
		const currentLabel = cellElement.getAttribute("aria-label") || "";
		const selectionRegex =
			/\.( Out of office|Work from home|Office day|Vacation|Sick leave|Personal day)$/;
		if (selectionRegex.test(currentLabel)) {
			const newLabel = currentLabel.replace(selectionRegex, ". Unselected");
			cellElement.setAttribute("aria-label", newLabel);
		} else if (!currentLabel.includes(". Unselected")) {
			// If no selection suffix, add unselected
			const datePart = currentLabel.replace(/\..*$/, "");
			cellElement.setAttribute("aria-label", `${datePart}. Unselected`);
		}
	});

	validateAndUpdateCalendar();
}

/**
 * Export date selections to JSON
 */
export function exportCalendarSelections(): void {
	const data = {
		selectedDates: Array.from(getSelectedDates()),
		exportDate: new Date().toISOString(),
	};

	const blob = new Blob([JSON.stringify(data, null, 2)], {
		type: "application/json",
	});
	const url = URL.createObjectURL(blob);
	const a = document.createElement("a");
	a.href = url;
	a.download = "rto-selection-export.json";
	document.body.appendChild(a);
	a.click();
	document.body.removeChild(a);
	URL.revokeObjectURL(url);
}

/**
 * Setup event listeners for the calendar
 */
export function setupCalendarEventListeners(): void {
	let calendarContainer = document.getElementById("calendar-container");

	// Fallback to old ID if new one not found
	if (!calendarContainer) {
		calendarContainer = document.getElementById("calendar");
		if (calendarContainer) {
			console.warn(
				"[CalendarEvents] Using fallback ID 'calendar' instead of 'calendar-container'",
			);
		}
	}

	if (!calendarContainer) {
		console.error(
			"[CalendarEvents] Calendar container not found. Button event listeners not attached.",
		);
		return;
	}

	// Click events
	calendarContainer.addEventListener("click", handleDayClick);
	console.log("[CalendarEvents] Attached calendar click handler");

	// Drag selection events
	calendarContainer.addEventListener("mousedown", handleDayMouseDown);
	calendarContainer.addEventListener("mouseover", handleDayMouseOver);
	document.addEventListener("mouseup", handleDayMouseUp);
	console.log("[CalendarEvents] Attached drag selection handlers");

	// Action buttons
	const clearAllButtons = document.querySelectorAll(
		'[id^="clear-all-button-"]',
	);
	console.log(
		`[CalendarEvents] Found ${clearAllButtons.length} clear-all button(s)`,
	);
	clearAllButtons.forEach((button) => {
		const buttonElement = button as HTMLElement;
		buttonElement.addEventListener("click", clearCalendarSelections);
		console.log(
			`[CalendarEvents] Attached click listener to clear-all button: ${buttonElement.id}`,
		);
	});

	const exportButtons = document.querySelectorAll('[id^="export-button-"]');
	console.log(
		`[CalendarEvents] Found ${exportButtons.length} export button(s)`,
	);
	exportButtons.forEach((button) => {
		const buttonElement = button as HTMLElement;
		buttonElement.addEventListener("click", exportCalendarSelections);
		console.log(
			`[CalendarEvents] Attached click listener to export button: ${buttonElement.id}`,
		);
	});
}
