/**
 * Calendar rendering functions
 *
 * Functions for creating and rendering calendar UI elements.
 * Extracted from calendarFunctions to separate rendering from state and events.
 *
 * @module calendar-rendering
 */

import type { DateString } from "../../types/calendar-types";
import {
	formatDateDisplay,
	formatDateISO,
	isPastDate,
	isSameDay,
	isWeekend,
} from "../dateUtils";
import { isSelectedDate, type WeekStart } from "./calendar-state";

// Re-export WeekStart type for convenience
export type { WeekStart } from "./calendar-state";

/**
 * Group dates by month for calendar display
 * @param dates - Array of dates to group
 * @returns Record with months as keys and date arrays as values
 */
export function groupDatesByMonth(dates: Date[]): Record<string, Date[]> {
	const months: Record<string, Date[]> = {};

	dates.forEach((date) => {
		const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
		if (!months[monthKey]) {
			months[monthKey] = [];
		}
		months[monthKey].push(date);
	});

	return months;
}

/**
 * Get the first day of the week for a given date
 * @param date - The reference date
 * @param weekStartArg - The day the week starts on (default: Sunday)
 * @returns Date object representing the start of that week
 */
export function getFirstDayOfWeek(
	date: Date,
	weekStartArg: WeekStart = "sunday",
): Date {
	const d = new Date(date);
	const day = d.getDay();

	if (weekStartArg === "sunday") {
		// Sunday start: 0 = Sunday, 1 = Monday, ..., 6 = Saturday
		const diff = d.getDate() - day;
		d.setDate(diff);
	} else {
		// Monday start: 0 = Sunday, 1 = Monday, ..., 6 = Saturday
		const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
		d.setDate(diff);
	}

	d.setHours(0, 0, 0, 0);
	return d;
}

/**
 * Generate weeks for a month, including days from adjacent months
 * @param monthDates - Array of dates for the month
 * @param weekStartArg - The day the week starts on (default: Sunday)
 * @returns Array of weeks, each containing 7 days
 */
export function getWeeksForMonth(
	monthDates: Date[],
	weekStartArg: WeekStart = "sunday",
): Date[][] {
	if (monthDates.length === 0) {
		return [];
	}

	const weeks: Date[][] = [];
	let currentWeek: Date[] = [];

	// Fill in days from the beginning of the week to the first date
	const firstDate = monthDates[0];
	if (!firstDate) {
		return [];
	}
	const firstDay = firstDate.getDay();

	let daysToAdd: number;
	if (weekStartArg === "sunday") {
		// Sunday start: 0 = Sunday, 1 = Monday, ..., 6 = Saturday
		daysToAdd = firstDay;
	} else {
		// Monday start: 0 = Sunday, 1 = Monday, ..., 6 = Saturday
		daysToAdd = firstDay === 0 ? 6 : firstDay - 1; // Sunday maps to 6, Monday maps to 0, etc.
	}

	// Add preceding days from previous month
	for (let i = daysToAdd; i > 0; i--) {
		const prevDate = new Date(firstDate ?? new Date());
		prevDate.setDate((firstDate ?? new Date()).getDate() - i);
		currentWeek.push(prevDate);
	}

	// Add all dates for the month
	monthDates.forEach((date) => {
		currentWeek.push(date);

		// Start a new week when we complete 7 days
		if (currentWeek.length === 7) {
			weeks.push([...currentWeek]);
			currentWeek = [];
		}
	});

	// Fill in remaining days of the last week
	if (currentWeek.length > 0) {
		const remainingDays = 7 - currentWeek.length;
		const lastDate = currentWeek[currentWeek.length - 1] ?? new Date();

		for (let i = 1; i <= remainingDays; i++) {
			const nextDate = new Date(lastDate);
			nextDate.setDate(lastDate.getDate() + i);
			currentWeek.push(nextDate);
		}

		weeks.push([...currentWeek]);
	}

	return weeks;
}

/**
 * Create a day cell element for the calendar
 * @param date - The date for this cell
 * @param currentMonth - The current month index
 * @param weekStartArg - The day the week starts on
 * @returns Button element representing the day
 */
export function createDayCell(
	date: Date,
	currentMonth: number,
	_weekStartArg: WeekStart = "sunday",
): HTMLButtonElement {
	const isoDate = formatDateISO(date) as DateString;
	const isCurrentlySelected = isSelectedDate(isoDate);
	const isWeekendDay = isWeekend(date);
	const isPast = isPastDate(date);
	const isToday = isSameDay(date, new Date());

	const cell = document.createElement("button");
	cell.className = "calendar-day";
	cell.setAttribute("data-date", isoDate);
	cell.setAttribute("tabindex", "0");
	cell.setAttribute("role", "button");
	cell.setAttribute("aria-label", formatDateDisplay(date));

	if (isCurrentlySelected) {
		cell.classList.add("selected");
		cell.setAttribute(
			"aria-label",
			`${cell.getAttribute("aria-label")} (Selected)`,
		);
	}

	if (isWeekendDay) {
		cell.classList.add("weekend");
	}

	if (isPast) {
		cell.classList.add("past");
		cell.setAttribute("aria-disabled", "true");
	}

	if (isToday) {
		cell.classList.add("today");
	}

	// Add day number
	const dayNumber = document.createElement("span");
	dayNumber.className = "day-number";
	dayNumber.textContent = date.getDate().toString();
	cell.appendChild(dayNumber);

	// Hide days that are not in the current month
	if (date.getMonth() !== currentMonth) {
		cell.classList.add("disabled");
		cell.setAttribute("aria-hidden", "true");
		cell.setAttribute("tabindex", "-1");
	}

	return cell;
}

/**
 * Create a month element for the calendar
 * @param monthKey - The key for this month (year-month)
 * @param monthDates - Array of dates for this month
 * @param weekStartArg - The day the week starts on (default: Sunday)
 * @returns Div element containing the month calendar
 */
export function createMonthElement(
	monthKey: string,
	monthDates: Date[],
	weekStartArg: WeekStart = "sunday",
): HTMLDivElement {
	const [year, monthIndex] = monthKey.split("-").map(Number);
	const monthDate = new Date(year ?? 0, (monthIndex ?? 0) - 1, 1);

	const monthContainer = document.createElement("div");
	monthContainer.className = "month-block";

	// Create month header
	const header = document.createElement("h2");
	header.className = "month-header";
	header.textContent = monthDate.toLocaleDateString(undefined, {
		month: "long",
		year: "numeric",
	});
	monthContainer.appendChild(header);

	// Create grid
	const grid = document.createElement("div");
	grid.className = "month-grid";
	grid.setAttribute("role", "grid");

	// Add day of week headers based on weekStart setting
	const daysOfWeek =
		weekStartArg === "sunday"
			? ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
			: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
	daysOfWeek.forEach((day) => {
		const dayHeader = document.createElement("div");
		dayHeader.className = "day-header";
		dayHeader.setAttribute("role", "columnheader");
		dayHeader.textContent = day;
		grid.appendChild(dayHeader);
	});

	// Create weeks and days
	const weeks = getWeeksForMonth(monthDates, weekStartArg);
	weeks.forEach((week) => {
		week.forEach((date) => {
			const dayCell = createDayCell(date, (monthIndex ?? 0) - 1, weekStartArg);
			grid.appendChild(dayCell);
		});
	});

	monthContainer.appendChild(grid);
	return monthContainer;
}

/**
 * Update the visual state of a day cell
 * @param cell - The day cell element
 * @param dateStr - The date string for this cell
 */
export function updateDayCellState(
	cell: HTMLElement,
	dateStr: DateString,
): void {
	const isCurrentlySelected = isSelectedDate(dateStr);
	const date = new Date(dateStr);

	if (isCurrentlySelected) {
		cell.classList.add("selected", "out-of-office");
		cell.setAttribute("aria-label", `${formatDateDisplay(date)} (Selected)`);
		cell.setAttribute("data-selected", "true");
		cell.setAttribute("data-selection-type", "out-of-office");
	} else {
		cell.classList.remove("selected", "out-of-office");
		cell.setAttribute("aria-label", formatDateDisplay(date));
		cell.setAttribute("data-selected", "false");
		cell.setAttribute("data-selection-type", "");
	}
}
