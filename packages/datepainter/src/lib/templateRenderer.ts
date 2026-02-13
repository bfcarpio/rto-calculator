import type { CalendarConfig, DateState, DateString } from "../types";
import {
	formatDate,
	getDaysInMonth,
	getFirstDayOfMonth,
	getWeekNumber,
} from "./dateUtils";

/**
 * Formats a date using Intl.DateTimeFormat with a specified pattern
 *
 * @param date - The date to format
 * @param pattern - Format pattern ('MMMM yyyy', 'yyyy-MM-dd', etc.)
 * @param locale - Locale string (e.g., 'en-US')
 * @returns Formatted date string
 */
export function formatDateWithLocale(
	date: Date,
	pattern: string,
	locale: string = "en-US",
): string {
	const options: Intl.DateTimeFormatOptions = {};

	// Parse pattern and set options
	if (pattern.includes("MMMM")) {
		options.month = "long";
	} else if (pattern.includes("MMM")) {
		options.month = "short";
	} else if (pattern.includes("MM")) {
		options.month = "2-digit";
	} else if (pattern.includes("M")) {
		options.month = "numeric";
	}

	if (pattern.includes("yyyy")) {
		options.year = "numeric";
	} else if (pattern.includes("yy")) {
		options.year = "2-digit";
	}

	if (pattern.includes("dd")) {
		options.day = "2-digit";
	} else if (pattern.includes("d")) {
		options.day = "numeric";
	}

	return new Intl.DateTimeFormat(locale, options).format(date);
}

/**
 * Gets the last day of the month for a given date
 *
 * @param date - Date within the month
 * @returns Date object representing the last day of the month
 */
export function getLastDayOfMonth(date: Date): Date {
	return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

/**
 * Gets weekday labels based on locale and first day of week
 *
 * @param locale - Locale string (e.g., 'en-US')
 * @param firstDayOfWeek - First day of week (0 = Sunday, 1 = Monday)
 * @returns Array of weekday labels
 */
export function getWeekdayLabels(
	locale: string = "en-US",
	firstDayOfWeek: number = 0,
): string[] {
	const date = new Date();
	const weekdays: string[] = [];

	for (let i = 0; i < 7; i++) {
		const dayIndex = (firstDayOfWeek + i) % 7;
		const tempDate = new Date(
			date.getFullYear(),
			date.getMonth(),
			dayIndex + 1 - date.getDay(),
		);
		const label = new Intl.DateTimeFormat(locale, { weekday: "short" }).format(
			tempDate,
		);
		weekdays.push(label);
	}

	return weekdays;
}

/**
 * Get CSS classes for a day cell based on state and position
 *
 * Generates the CSS class string for a calendar day cell based on its state
 * (working, OOF, holiday), whether it's today, and any additional styling needs.
 * Classes follow a BEM-like naming convention with the `datepainter` prefix.
 *
 * @param date - The date string for the cell (YYYY-MM-DD format)
 * @param state - The state of the date (working, oof, holiday) or null if unassigned
 * @returns A space-separated string of CSS class names
 *
 * @example
 * ```ts
 * getDayCellClasses('2026-02-06', 'oof');
 * // Returns: 'datepainter-day datepainter-day--oof'
 *
 * getDayCellClasses('2026-02-06', null);
 * // Returns: 'datepainter-day datepainter-day--today' (if today)
 * ```
 */
export function getDayCellClasses(
	date: DateString,
	state: DateState | null,
): string {
	const classes: string[] = [];

	// Base class for all day cells
	classes.push("datepainter-day");

	// State class for visual differentiation
	if (state) {
		classes.push(`datepainter-day--${state}`);
	}

	// Today class for current date highlighting
	const today = formatDate(new Date());
	if (date === today) {
		classes.push("datepainter-day--today");
	}

	return classes.join(" ");
}

/**
 * Escape HTML entities to prevent XSS attacks
 *
 * Converts special HTML characters to their entity equivalents to prevent
 * injection of malicious HTML/JavaScript when rendering user-provided content.
 *
 * @param text - The text to escape
 * @returns The escaped HTML string with special characters converted to entities
 */
function escapeHtml(text: string): string {
	return text
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#39;");
}

/**
 * Get icon HTML for a day cell
 *
 * Generates HTML markup for an icon element to be displayed within a day cell.
 * The icon can be positioned above, below, left, or right of the day number.
 * Icons are marked with aria-hidden="true" since they're decorative.
 *
 * @param icon - The icon character or HTML string to display
 * @param position - The position relative to the day number (default: 'below')
 * @returns HTML string containing the icon span element
 *
 * @example
 * ```ts
 * getIconHTML('🏠', 'below');
 * // Returns: '<span class="datepainter-day__icon datepainter-day__icon--below" aria-hidden="true">🏠</span>'
 *
 * getIconHTML(); // Returns: ''
 * ```
 */
export function getIconHTML(
	icon?: string,
	position: "above" | "below" | "left" | "right" = "below",
): string {
	if (!icon) return "";

	const positionClass = `datepainter-day__icon--${position}`;
	return `<span class="datepainter-day__icon ${positionClass}" aria-hidden="true">${escapeHtml(icon)}</span>`;
}

/**
 * Gets all days in a month including padding days from adjacent months
 *
 * @param date - Date within the month to get days for
 * @param config - Calendar configuration
 * @returns Array of Date objects representing all days to display
 */
export function getDaysForMonth(date: Date, config: CalendarConfig): Date[] {
	const days: Date[] = [];
	const year = date.getFullYear();
	const month = date.getMonth();
	const firstDay = getFirstDayOfMonth(date);
	const daysInMonth = getDaysInMonth(year, month);
	const firstDayOfWeek = config.styling?.firstDayOfWeek ?? 0;

	// Calculate padding days before the month starts
	const paddingDays = (firstDay - firstDayOfWeek + 7) % 7;

	// Add padding days from previous month
	const prevMonthDays = getDaysInMonth(year, month - 1);
	for (let i = paddingDays - 1; i >= 0; i--) {
		days.push(new Date(year, month - 1, prevMonthDays - i));
	}

	// Add all days of the current month
	for (let i = 1; i <= daysInMonth; i++) {
		days.push(new Date(year, month, i));
	}

	// Calculate padding days after the month ends to complete the grid
	const totalCells = days.length;
	const remainingCells = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);

	// Add padding days from next month
	for (let i = 1; i <= remainingCells; i++) {
		days.push(new Date(year, month + 1, i));
	}

	return days;
}

/**
 * Get CSS classes for a day cell based on Date object
 *
 * @param date - The Date object for the cell
 * @param _config - Calendar configuration (unused, kept for API consistency)
 * @returns A space-separated string of CSS class names
 */
export function getDayCellClassesForDate(
	date: Date,
	_config: CalendarConfig,
): string {
	const dateStr = formatDate(date);
	const allDates = getAllDates();
	const state = allDates.get(dateStr) ?? null;
	return getDayCellClasses(dateStr, state);
}

// Import getAllDates from store (circular dependency workaround)
let getAllDates: () => Map<DateString, DateState>;
try {
	const { getAllDates: fn } = require("../stores/calendarStore");
	getAllDates = fn;
} catch {
	getAllDates = () => new Map();
}
export function getCalendarHTML(config: CalendarConfig): string {
	const { dateRange, styling } = config;
	const { start, end } = dateRange;

	// Get first day of week (Sunday = 0, Monday = 1)
	const firstDayOfWeek = styling?.firstDayOfWeek ?? 0;

	// Get all dates in range by month
	const dates: Date[] = [];
	const currentDate = new Date(start);

	while (currentDate <= end) {
		dates.push(new Date(currentDate));
		currentDate.setMonth(currentDate.getMonth() + 1);
	}

	let html = '<div class="datepainter">';

	// Generate weekday headers
	const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
	const adjustedWeekdays = [
		...weekdays.slice(firstDayOfWeek),
		...weekdays.slice(0, firstDayOfWeek),
	];

	if (styling?.showWeekdays !== false) {
		html += '<div class="datepainter__weekdays">';
		for (const day of adjustedWeekdays) {
			html += `<div class="datepainter__weekday">${day}</div>`;
		}
		html += "</div>";
	}

	// Generate month grids
	for (const date of dates) {
		const year = date.getFullYear();
		const month = date.getMonth();
		const daysInMonth = getDaysInMonth(year, month);
		const firstDay = getFirstDayOfMonth(date);
		const weekNumber = getWeekNumber(date);

		html += `<div class="datepainter__month" data-month="${year}-${month + 1}">`;

		// Week numbers (if enabled)
		if (styling?.showWeekNumbers !== false) {
			html += `<div class="datepainter__week-number">W${weekNumber}</div>`;
		}

		// Month label
		const monthNames = [
			"January",
			"February",
			"March",
			"April",
			"May",
			"June",
			"July",
			"August",
			"September",
			"October",
			"November",
			"December",
		];
		html += `<div class="datepainter__month-label">${monthNames[month]} ${year}</div>`;

		// Day grid
		html += '<div class="datepainter__days">';

		// Empty cells for alignment (padding days from previous month)
		for (let i = 0; i < firstDay; i++) {
			html += '<div class="datepainter__day datepainter__day--empty"></div>';
		}

		// Day cells for each day of the month
		for (let i = 1; i <= daysInMonth; i++) {
			const dayDate = new Date(year, month, i);
			const dayString = formatDate(dayDate);
			const cellClasses = getDayCellClasses(dayString, null); // State will be set dynamically

			html += `<div class="datepainter__day ${cellClasses}" data-date="${dayString}">`;
			html += `<span class="datepainter__day-number">${i}</span>`;

			// Note: Icons will be rendered dynamically via DOM updates,
			// not in initial HTML, since state changes happen after initial render.
			// Example: html += getIconHTML(state?.icon, state?.position || 'below');

			html += "</div>";
		}

		html += "</div>";
		html += "</div>";
	}

	html += "</div>";

	return html;
}

/**
 * Check if the current date is at a month boundary (start or end of date range)
 * @param date - Current view date
 * @param direction - Navigation direction ('prev' or 'next')
 * @param config - Calendar configuration
 * @returns True if at boundary and cannot navigate further
 */
export function isAtMonthBoundary(
	date: Date,
	direction: "prev" | "next",
	config: CalendarConfig,
): boolean {
	const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
	const monthEnd = getLastDayOfMonth(date);

	if (direction === "prev") {
		// Check if we're at the start of the date range
		return monthStart <= config.dateRange.start;
	} else {
		// Check if we're at the end of the date range
		return monthEnd >= config.dateRange.end;
	}
}

/**
 * Generate HTML for a single month with navigation controls
 * @param currentDate - The date of the month to render
 * @param config - Calendar configuration
 * @returns HTML string for single month view with navigation
 */
export function getSingleMonthHTML(
	currentDate: Date,
	config: CalendarConfig,
): string {
	const { locale = "en-US", styling } = config;

	// Check boundaries for navigation buttons
	const isPrevDisabled = isAtMonthBoundary(currentDate, "prev", config);
	const isNextDisabled = isAtMonthBoundary(currentDate, "next", config);

	// Format month label
	const monthLabel = formatDateWithLocale(currentDate, "MMMM yyyy", locale);

	// Get weekday headers
	const firstDayOfWeek = styling?.firstDayOfWeek ?? 0;
	const weekdayLabels = getWeekdayLabels(locale, firstDayOfWeek);
	const weekdayHeader = weekdayLabels
		.map((day) => `<div class="datepainter__weekday">${day}</div>`)
		.join("");

	// Get days for the month
	const days = getDaysForMonth(currentDate, config);
	const dayCells = days
		.map((day) => {
			const classes = getDayCellClassesForDate(day, config);
			const dayNumber = day.getDate();
			const dateStr = formatDate(day);
			const isPaddingDay = day.getMonth() !== currentDate.getMonth();
			const paddingClass = isPaddingDay ? " datepainter-day--padding" : "";
			return `<div class="datepainter__day ${classes}${paddingClass}" data-date="${dateStr}" role="button" tabindex="0" aria-label="${formatDateWithLocale(day, "MMMM d, yyyy")}">${dayNumber}</div>`;
		})
		.join("");

	return `
    <div class="datepainter">
      <div class="datepainter__nav">
        <button class="datepainter__nav-btn datepainter__nav-btn--prev"
                data-action="prev"
                aria-label="Previous month"
                ${isPrevDisabled ? "disabled" : ""}>◀</button>
        <div class="datepainter__month-label">${monthLabel}</div>
        <button class="datepainter__nav-btn datepainter__nav-btn--next"
                data-action="next"
                aria-label="Next month"
                ${isNextDisabled ? "disabled" : ""}>▶</button>
      </div>
      <div class="datepainter__weekdays">
        ${weekdayHeader}
      </div>
      <div class="datepainter__days">
        ${dayCells}
      </div>
    </div>
  `;
}
