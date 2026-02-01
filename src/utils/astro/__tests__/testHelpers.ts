/**
 * Test Helper Functions for Embedded Element Reference Architecture
 *
 * This file provides helper functions for creating mock DOM elements
 * and test data objects with embedded element references, following
 * the new architecture where element references are stored directly
 * in data objects instead of separate Map caches.
 */

import type { DayInfo, WeekInfo } from "../../../types";

/**
 * Create a mock day element with embedded reference
 *
 * @param year - Year (e.g., 2025)
 * @param month - Month (0-11, where 0 = January)
 * @param day - Day of month (1-31)
 * @param selectionType - Type of selection ("out-of-office", "office", or null)
 * @returns HTMLElement representing a day cell
 */
export function createMockDayElement(
	year: number,
	month: number,
	day: number,
	selectionType: "out-of-office" | "office" | null = null,
): HTMLElement {
	const element = document.createElement("td");
	element.className = "calendar-day";
	element.setAttribute("role", "gridcell");
	element.setAttribute("tabindex", "0");

	// Set data attributes
	element.dataset.year = year.toString();
	element.dataset.month = month.toString();
	element.dataset.day = day.toString();
	element.dataset.selected = selectionType ? "true" : "false";
	element.dataset.selectionType = selectionType || "";

	// Add classes if selected
	if (selectionType) {
		element.classList.add("selected", selectionType);
	}

	// Add day number
	const dayNumber = document.createElement("span");
	dayNumber.className = "day-number";
	dayNumber.setAttribute("aria-hidden", "true");
	dayNumber.textContent = day.toString();
	element.appendChild(dayNumber);

	return element;
}

/**
 * Create a mock status cell element
 *
 * @param weekStart - Date object representing Monday of the week
 * @returns HTMLElement representing a week status cell
 */
export function createMockStatusCell(
	weekStart: Date = new Date(2025, 0, 6),
): HTMLElement {
	const element = document.createElement("td");
	element.className = "week-status-cell";
	element.setAttribute("role", "gridcell");
	element.setAttribute("aria-label", "Week status indicator");
	element.dataset.weekStart = weekStart.getTime().toString();

	// Create container
	const container = document.createElement("div");
	container.className = "week-status-container";

	// Create icon element
	const iconElement = document.createElement("span");
	iconElement.className = "week-status-icon";
	iconElement.setAttribute("aria-hidden", "true");
	iconElement.textContent = "";

	// Create screen reader text
	const srElement = document.createElement("span");
	srElement.className = "sr-only";
	srElement.textContent = "Week status";

	// Assemble
	container.appendChild(iconElement);
	container.appendChild(srElement);
	element.appendChild(container);

	return element;
}

/**
 * Create a mock DayInfo object with embedded element reference
 *
 * @param date - Date object
 * @param selectionType - Type of selection
 * @returns DayInfo object with embedded element reference
 */
export function createMockDayInfo(
	date: Date,
	selectionType: "out-of-office" | "office" | null = null,
): DayInfo {
	const element = createMockDayElement(
		date.getFullYear(),
		date.getMonth(),
		date.getDate(),
		selectionType,
	);

	const dayOfWeek = date.getDay();
	const isWeekday = dayOfWeek !== 0 && dayOfWeek !== 6;

	return {
		date,
		element,
		isWeekday,
		isSelected: selectionType !== null,
		selectionType,
	};
}

/**
 * Create a mock WeekInfo object with embedded element references
 *
 * @param weekStart - Date object representing Monday of the week
 * @param days - Array of DayInfo objects
 * @param options - Optional partial WeekInfo properties to override
 * @returns WeekInfo object with embedded element references
 */
export function createMockWeekInfo(
	weekStart: Date,
	days: DayInfo[],
	options: Partial<WeekInfo> = {},
): WeekInfo {
	const validDays = days || [];
	const weekdays = validDays.filter((d) => d.isWeekday);
	const wfhCount = weekdays.filter(
		(d) => d.isSelected && d.selectionType === "out-of-office",
	).length;
	const officeCount = 0; // No longer tracking office selections
	const impliedOfficeDays = weekdays.length - wfhCount - officeCount;
	const totalOfficeDays = officeCount + impliedOfficeDays;

	return {
		weekStart,
		weekNumber: options.weekNumber || 1,
		days: validDays,
		wfhCount,
		officeDays: totalOfficeDays,
		isCompliant: options.isCompliant ?? totalOfficeDays >= 3,
		isUnderEvaluation: options.isUnderEvaluation ?? false,
		status: options.status ?? "ignored",
		statusCellElement:
			options.statusCellElement || createMockStatusCell(weekStart),
	};
}

/**
 * Create a complete week with 5 weekdays (Monday-Friday)
 *
 * @param weekStart - Date object representing Monday of the week
 * @param wfhDays - Array of day indices (0-4) that are WFH
 * @param officeDays - Array of day indices (0-4) that are office days
 * @returns WeekInfo object with embedded element references
 */
export function createWeekWithPattern(
	weekStart: Date,
	wfhDays: number[] = [],
	officeDays: number[] = [],
	weekNumber: number = 1,
): WeekInfo {
	const days: DayInfo[] = [];

	for (let i = 0; i < 5; i++) {
		const currentDate = new Date(weekStart);
		currentDate.setDate(weekStart.getDate() + i);

		let selectionType: "out-of-office" | "office" | null = null;
		if (wfhDays.includes(i)) {
			selectionType = "out-of-office";
		} else if (officeDays.includes(i)) {
			selectionType = "office";
		}

		days.push(createMockDayInfo(currentDate, selectionType));
	}

	return createMockWeekInfo(weekStart, days, { weekNumber });
}

/**
 * Create multiple weeks with a pattern of WFH days
 *
 * @param startWeekStart - Date object representing Monday of the first week
 * @param weekCount - Number of weeks to create
 * @param wfhPattern - Array of WFH day counts per week (e.g., [2, 2, 3] means 2 WFH days in week 1, 2 in week 2, etc.)
 * @returns Array of WeekInfo objects
 */
export function createWeeksWithWFHPattern(
	startWeekStart: Date,
	weekCount: number,
	wfhPattern: number[],
): WeekInfo[] {
	const weeks: WeekInfo[] = [];

	for (let i = 0; i < weekCount; i++) {
		const weekStart = new Date(startWeekStart);
		weekStart.setDate(startWeekStart.getDate() + i * 7);

		const wfhDays = Array.from({ length: wfhPattern[i] || 0 }, (_, j) => j);
		weeks.push(createWeekWithPattern(weekStart, wfhDays, [], i + 1));
	}

	return weeks;
}

/**
 * Create a calendar with 12 weeks of mock data
 *
 * @param startDate - Start date (typically first Monday)
 * @param wfhPattern - Array of WFH day counts per week (12 values for 12 weeks)
 * @returns Array of 12 WeekInfo objects
 */
export function create12WeekCalendar(
	startDate: Date = new Date(2025, 0, 6),
	wfhPattern: number[] = [2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2],
): WeekInfo[] {
	return createWeeksWithWFHPattern(startDate, 12, wfhPattern);
}

/**
 * Clean up mock elements from DOM
 * Removes all elements created during testing to prevent pollution
 */
export function cleanupMockElements(): void {
	// Remove all day cells (created by helpers)
	const mockDays = document.querySelectorAll(".calendar-day");
	mockDays.forEach((element) => element.remove());

	// Remove all status cells (created by helpers)
	const mockStatusCells = document.querySelectorAll(".week-status-cell");
	mockStatusCells.forEach((element) => element.remove());
}

/**
 * Create a calendar HTML structure for integration testing
 *
 * @param weekCount - Number of weeks to render
 * @returns HTML string representing calendar structure
 */
export function createCalendarHTML(weekCount: number = 12): string {
	let html = `<div class="calendar-container">`;

	for (let week = 0; week < weekCount; week++) {
		html += `<div class="calendar-week">`;

		// Status cell
		html += `
      <td class="week-status-cell" data-week-start="${new Date(2025, 0, 6 + week * 7).getTime()}">
        <div class="week-status-container">
          <span class="week-status-icon"></span>
          <span class="sr-only">Week status</span>
        </div>
      </td>
    `;

		// Day cells (5 weekdays)
		for (let day = 0; day < 5; day++) {
			const dayDate = 6 + week * 7 + day; // Jan 6 + (week * 7) + day
			html += `
        <td class="calendar-day"
            data-year="2025"
            data-month="0"
            data-day="${dayDate}"
            data-selected="false"
            data-selection-type="">
          <span class="day-number">${dayDate}</span>
        </td>
      `;
		}

		html += `</div>`;
	}

	html += `</div>`;
	return html;
}

/**
 * Create a compliant calendar (3+ office days per week)
 *
 * @returns Array of 12 WeekInfo objects, all compliant
 */
export function createCompliantCalendar(): WeekInfo[] {
	return create12WeekCalendar(
		new Date(2025, 0, 6),
		[2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2], // 2 WFH days = 3 office days = compliant
	);
}

/**
 * Create a non-compliant calendar (<3 office days per week)
 *
 * @returns Array of 12 WeekInfo objects, all non-compliant
 */
export function createNonCompliantCalendar(): WeekInfo[] {
	return create12WeekCalendar(
		new Date(2025, 0, 6),
		[3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3], // 3 WFH days = 2 office days = non-compliant
	);
}

/**
 * Create a mixed compliance calendar
 *
 * @returns Array of 12 WeekInfo objects with mixed compliance
 */
export function createMixedComplianceCalendar(): WeekInfo[] {
	return create12WeekCalendar(
		new Date(2025, 0, 6),
		[1, 2, 3, 2, 1, 2, 3, 2, 1, 2, 3, 2], // Mix of compliant and non-compliant weeks
	);
}

/**
 * Create an empty calendar (no selections)
 *
 * @returns Array of 12 WeekInfo objects, all empty
 */
export function createEmptyCalendar(): WeekInfo[] {
	return create12WeekCalendar(
		new Date(2025, 0, 6),
		[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], // No WFH days = 5 office days = all compliant
	);
}

/**
 * Verify that a WeekInfo object has embedded element references
 *
 * @param weekInfo - WeekInfo object to verify
 * @returns true if all element references are present
 */
export function verifyEmbeddedReferences(weekInfo: WeekInfo): boolean {
	// Check status cell element
	if (!weekInfo.statusCellElement) {
		return false;
	}

	// Check all day elements
	for (const day of weekInfo.days) {
		if (!day.element) {
			return false;
		}
	}

	return true;
}

/**
 * Verify that element data attributes match DayInfo properties
 *
 * @param dayInfo - DayInfo object to verify
 * @returns true if element data attributes match properties
 */
export function verifyElementDataAttributes(dayInfo: DayInfo): boolean {
	const element = dayInfo.element;

	if (!element) {
		return false;
	}

	const year = parseInt(element.dataset.year || "0");
	const month = parseInt(element.dataset.month || "0");
	const day = parseInt(element.dataset.day || "0");
	const selectionType = element.dataset.selectionType as
		| "out-of-office"
		| "office"
		| null;
	const isSelected = element.dataset.selected === "true";

	return (
		year === dayInfo.date.getFullYear() &&
		month === dayInfo.date.getMonth() &&
		day === dayInfo.date.getDate() &&
		selectionType === dayInfo.selectionType &&
		isSelected === dayInfo.isSelected
	);
}

/**
 * Mock the global RTOValidation object for testing
 *
 * @param options - Partial RTOValidation object to override defaults
 */
export function mockRTOValidation(
	options: {
		CONFIG?: any;
		updateWeekStatusIcon?: any;
		updateComplianceIndicator?: any;
		runValidationWithHighlights?: any;
		weeksData?: WeekInfo[];
		currentResult?: any;
	} = {},
): void {
	(window as any).RTOValidation = {
		CONFIG: {
			DEBUG: false,
			MIN_OFFICE_DAYS_PER_WEEK: 3,
			TOTAL_WEEKDAYS_PER_WEEK: 5,
			ROLLING_PERIOD_WEEKS: 12,
			THRESHOLD_PERCENTAGE: 0.6,
			...options.CONFIG,
		},
		updateWeekStatusIcon:
			options.updateWeekStatusIcon ||
			(() => {
				/* Default mock */
			}),
		updateComplianceIndicator:
			options.updateComplianceIndicator ||
			(() => {
				/* Default mock */
			}),
		runValidationWithHighlights:
			options.runValidationWithHighlights ||
			(() => {
				/* Default mock */
			}),
		weeksData: options.weeksData || [],
		currentResult: options.currentResult || null,
	};
}

/**
 * Restore the original DOM state after testing
 */
export function restoreDOM(): void {
	document.body.innerHTML = "";
}
