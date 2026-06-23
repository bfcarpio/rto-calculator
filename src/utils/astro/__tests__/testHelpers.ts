/**
 * Test Helper Functions for Embedded Element Reference Architecture
 *
 * This file provides helper functions for creating mock DOM elements
 * and test data objects with embedded element references, following
 * the new architecture where element references are stored directly
 * in data objects instead of separate Map caches.
 */

import type {
	CalendarInstance,
	DateRangeOptions,
	DateState,
	DateString,
	MarkedDateRange,
} from "datepainter";
import { vi } from "vitest";
import {
	DEFAULT_RTO_POLICY,
	type WeekCompliance,
} from "../../../lib/validation/rto-core";
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
		isHoliday: false,
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
	const oofCount = weekdays.filter(
		(d) => d.isSelected && d.selectionType === "out-of-office",
	).length;
	const holidayCount = weekdays.filter((d) => d.isHoliday).length;
	const sickCount = 0; // No sick day support in test helpers
	const totalDays = weekdays.length - holidayCount;
	const officeDays = totalDays - oofCount;

	return {
		weekStart,
		weekNumber: options.weekNumber || 1,
		days: validDays,
		oofCount,
		holidayCount,
		sickCount,
		officeDays,
		totalDays,
		oofDays: oofCount,
		wfhCount: oofCount,
		isCompliant: options.isCompliant ?? officeDays >= 3,
		isUnderEvaluation: options.isUnderEvaluation ?? false,
		status: options.status ?? "ignored",
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

	const year = parseInt(element.dataset.year || "0", 10);
	const month = parseInt(element.dataset.month || "0", 10);
	const day = parseInt(element.dataset.day || "0", 10);
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
 * Restore the original DOM state after testing
 */
export function restoreDOM(): void {
	document.body.innerHTML = "";
}

// ─── Mock Calendar Helpers ─────────────────────────────────────────

/**
 * Create a minimal mock CalendarInstance from a date→state map.
 *
 * Only `getAllDates()` is functional — all other methods are no-op stubs.
 * Use this for tests that only read the date map (e.g. calendar-data-reader).
 *
 * @param dateMap - Map of "YYYY-MM-DD" → "oof" | "office" | "holiday" | "sick"
 * @returns Mock CalendarInstance
 */
export function mockCalendarFromMap(
	dateMap: Map<string, string>,
): CalendarInstance {
	return {
		getAllDates: vi.fn(() => dateMap),
	} as unknown as CalendarInstance;
}

/**
 * Create a fully-stubbed mock CalendarInstance from a record of state→dates.
 *
 * Builds `getAllDates()`, `getDatesByState()`, and `getDateRanges()` with
 * auto-computed contiguous ranges (or caller-supplied ranges).
 * Use this for I/O tests that exercise export/import paths.
 *
 * @param dates - Record of state name → array of "YYYY-MM-DD" strings
 * @param ranges - Optional pre-computed date ranges (auto-computed if omitted)
 * @returns Mock CalendarInstance with all methods stubbed
 */
export function mockCalendarInstance(
	dates: Record<string, string[]>,
	ranges?: MarkedDateRange[],
): CalendarInstance {
	const dateMap = new Map<DateString, DateState>();
	const rangesByState = new Map<DateState, MarkedDateRange[]>();

	for (const [state, ds] of Object.entries(dates)) {
		for (const d of ds) dateMap.set(d as DateString, state as DateState);

		const sorted = [...ds].sort();
		const stateRanges: MarkedDateRange[] = [];
		let i = 0;
		while (i < sorted.length) {
			const start = new Date(`${sorted[i]}T12:00:00`);
			let end = start;
			while (
				i + 1 < sorted.length &&
				new Date(`${sorted[i + 1]}T12:00:00`).getTime() - end.getTime() ===
					86400000
			) {
				i++;
				end = new Date(`${sorted[i]}T12:00:00`);
			}
			stateRanges.push({ start, end, state: state as DateState });
			i++;
		}
		rangesByState.set(state as DateState, stateRanges);
	}

	const computedRanges = ranges ?? [...rangesByState.values()].flat();

	return {
		getAllDates: vi.fn(() => dateMap),
		getDatesByState: vi.fn((s: DateState) => (dates[s] ?? []) as DateString[]),
		getDateRanges: vi.fn((opts?: DateRangeOptions) =>
			opts?.state ? (rangesByState.get(opts.state) ?? []) : computedRanges,
		),
		clearAll: vi.fn(),
		setDates: vi.fn(),
		clearDates: vi.fn(),
		getSelectedDates: vi.fn(() => []),
		getState: vi.fn(() => null),
		getCurrentMonth: vi.fn(() => new Date()),
		toggleDate: vi.fn(),
		setPaintingState: vi.fn(),
		updateConfig: vi.fn(),
		onStateChange: vi.fn(() => () => {}),
		onDateStateChange: vi.fn(() => () => {}),
		onMonthChange: vi.fn(() => () => {}),
		navigateToDate: vi.fn(),
		nextMonth: vi.fn(),
		prevMonth: vi.fn(),
		destroy: vi.fn(),
	} as CalendarInstance;
}

// ─── Validation Test Helpers ───────────────────────────────────────

/**
 * Create a single WeekCompliance object for validation tests.
 *
 * @param weekStart - Date representing the start of the week
 * @param officeDays - Number of office days (0–5)
 * @param weekNumber - Week number (default: 1)
 * @returns WeekCompliance object
 */
export function makeWeek(
	weekStart: Date,
	officeDays: number,
	weekNumber = 1,
): WeekCompliance {
	const totalDays = 5;
	return {
		weekNumber,
		weekStart,
		officeDays,
		totalDays,
		oofDays: totalDays - officeDays,
		wfhDays: totalDays - officeDays,
		isCompliant: officeDays >= DEFAULT_RTO_POLICY.minOfficeDaysPerWeek,
		status:
			officeDays >= DEFAULT_RTO_POLICY.minOfficeDaysPerWeek
				? "compliant"
				: "violation",
	};
}

/**
 * Create N consecutive weeks with the same office-day count.
 *
 * @param startDate - Date representing the start of the first week
 * @param count - Number of weeks to create
 * @param officeDaysPerWeek - Office days for each week
 * @returns Array of WeekCompliance objects
 */
export function makeWeeks(
	startDate: Date,
	count: number,
	officeDaysPerWeek: number,
): WeekCompliance[] {
	const weeks: WeekCompliance[] = [];
	for (let i = 0; i < count; i++) {
		const weekStart = new Date(startDate);
		weekStart.setDate(startDate.getDate() + i * 7);
		weeks.push(makeWeek(weekStart, officeDaysPerWeek, i + 1));
	}
	return weeks;
}

/**
 * Create a schedule of weeks with varying office-day counts per segment.
 *
 * Each segment is a `[count, officeDays]` tuple. Weeks are concatenated
 * in order and re-numbered sequentially.
 *
 * @param startDate - Date representing the start of the first week
 * @param segments - Tuples of [weekCount, officeDaysPerWeek]
 * @returns Array of WeekCompliance objects with sequential week numbers
 *
 * @example
 * makeSchedule(START, [8, 5], [4, 1])
 * // 8 weeks with 5 office days, then 4 weeks with 1 office day
 */
export function makeSchedule(
	startDate: Date,
	...segments: [count: number, officeDays: number][]
): WeekCompliance[] {
	const weeks: WeekCompliance[] = [];
	let offset = 0;
	for (const [count, officeDays] of segments) {
		const segStart = new Date(startDate);
		segStart.setDate(startDate.getDate() + offset * 7);
		weeks.push(...makeWeeks(segStart, count, officeDays));
		offset += count;
	}
	weeks.forEach((w, i) => {
		w.weekNumber = i + 1;
	});
	return weeks;
}
