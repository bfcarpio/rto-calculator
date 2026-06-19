/**
 * Holiday DOM adapter functions
 *
 * DOM manipulation functions for applying and removing holiday markers
 * on calendar cells. These are extracted from HolidayManager to decouple
 * business logic from DOM operations.
 *
 * @module holiday-dom-adapter
 */

import { isHTMLElement } from "../type-guards";
import type { HolidayInfo } from "./HolidayManager";

/**
 * Apply holiday markers to calendar UI cells
 *
 * Finds calendar cells matching each holiday's date and adds visual
 * markers (CSS classes, data attributes, ARIA labels, tooltips).
 * Optionally marks holidays as out-of-office.
 *
 * @param holidays - Array of holiday info objects to apply
 * @param holidaysAsOOF - Whether to mark holidays as out-of-office
 */
export function applyHolidaysToCalendarDOM(
	holidays: HolidayInfo[],
	holidaysAsOOF: boolean = true,
): void {
	holidays.forEach((holiday) => {
		const year = holiday.date.getFullYear();
		const month = holiday.date.getMonth();
		const day = holiday.date.getDate();

		// Find the calendar day cell with type guard
		const maybeCell = document.querySelector(
			`.calendar-day[data-year="${year}"][data-month="${month}"][data-day="${day}"]`,
		);

		if (!isHTMLElement(maybeCell)) {
			return;
		}

		// Skip if already marked as a holiday to prevent duplicate processing
		if (maybeCell.classList.contains("holiday")) {
			return;
		}

		// Always add holiday class for visual styling
		maybeCell.classList.add("holiday");

		// Only mark as OOF if holidaysAsOOF is enabled
		if (holidaysAsOOF) {
			maybeCell.dataset.selected = "true";
			maybeCell.dataset.selectionType = "out-of-office";
			maybeCell.classList.add("selected", "out-of-office");
		}

		// Add data attribute for holiday info
		maybeCell.dataset.holiday = "true";
		maybeCell.dataset.holidayName = holiday.name;
		maybeCell.dataset.holidayCountry = holiday.countryCode;

		// Update aria-label for accessibility
		const currentLabel = maybeCell.getAttribute("aria-label") || "";
		const holidayLabel = ` - ${holiday.name} (Holiday)`;
		maybeCell.setAttribute("aria-label", currentLabel + holidayLabel);

		// Add title for hover tooltip
		maybeCell.title = `${holiday.name} (${holiday.countryCode})`;
	});
}

/**
 * Remove all holiday markers from calendar cells
 *
 * Removes holiday CSS classes, data attributes, ARIA labels,
 * and OOF selection markers from all cells marked as holidays.
 */
export function removeHolidaysFromCalendarDOM(): void {
	const holidayCells = document.querySelectorAll(
		".calendar-day[data-holiday='true']",
	);

	holidayCells.forEach((cell) => {
		if (!isHTMLElement(cell)) {
			return;
		}

		cell.classList.remove("holiday");
		delete cell.dataset.holiday;
		delete cell.dataset.holidayName;
		delete cell.dataset.holidayCountry;

		// Also remove OOF selection that was applied to holidays
		cell.classList.remove("selected", "out-of-office");
		cell.dataset.selected = "false";
		cell.dataset.selectionType = "";
		cell.ariaSelected = "false";

		// Remove holiday suffix from aria-label
		const currentLabel = cell.getAttribute("aria-label") || "";
		const holidaySuffix = " (Holiday)";
		if (currentLabel.includes(holidaySuffix)) {
			const baseLabel = currentLabel.replace(holidaySuffix, "");
			cell.setAttribute("aria-label", baseLabel);
		}

		// Remove title
		cell.title = "";
	});
}
