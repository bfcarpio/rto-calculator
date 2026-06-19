/**
 * Holiday DOM adapter functions
 *
 * DOM manipulation functions for applying and removing holiday markers
 * on calendar cells. These are extracted from HolidayManager to decouple
 * business logic from DOM operations.
 *
 * @module holiday-dom-adapter
 */

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

		// Find the calendar day cell
		const cell = document.querySelector(
			`.calendar-day[data-year="${year}"][data-month="${month}"][data-day="${day}"]`,
		) as HTMLElement;

		if (!cell) {
			return;
		}

		// Skip if already marked as a holiday to prevent duplicate processing
		if (cell.classList.contains("holiday")) {
			return;
		}

		// Always add holiday class for visual styling
		cell.classList.add("holiday");

		// Only mark as OOF if holidaysAsOOF is enabled
		if (holidaysAsOOF) {
			cell.dataset.selected = "true";
			cell.dataset.selectionType = "out-of-office";
			cell.classList.add("selected", "out-of-office");
		}

		// Add data attribute for holiday info
		cell.dataset.holiday = "true";
		cell.dataset.holidayName = holiday.name;
		cell.dataset.holidayCountry = holiday.countryCode;

		// Update aria-label for accessibility
		const currentLabel = cell.getAttribute("aria-label") || "";
		const holidayLabel = ` - ${holiday.name} (Holiday)`;
		cell.setAttribute("aria-label", currentLabel + holidayLabel);

		// Add title for hover tooltip
		cell.title = `${holiday.name} (${holiday.countryCode})`;
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
		const element = cell as HTMLElement;
		element.classList.remove("holiday");
		delete element.dataset.holiday;
		delete element.dataset.holidayName;
		delete element.dataset.holidayCountry;

		// Also remove OOF selection that was applied to holidays
		element.classList.remove("selected", "out-of-office");
		element.dataset.selected = "false";
		element.dataset.selectionType = "";
		element.ariaSelected = "false";

		// Remove holiday suffix from aria-label
		const currentLabel = element.getAttribute("aria-label") || "";
		const holidaySuffix = " (Holiday)";
		if (currentLabel.includes(holidaySuffix)) {
			const baseLabel = currentLabel.replace(holidaySuffix, "");
			element.setAttribute("aria-label", baseLabel);
		}

		// Remove title
		element.title = "";
	});
}
