/**
 * Test helpers for Datepainter interactions
 *
 * Datepainter is a custom calendar component that replaces Air Datepicker.
 * This module provides helper functions to interact with Datepicker in E2E tests.
 *
 * ## CSS Class Mapping from Air Datepicker
 *
 * | Air Datepicker | Datepainter |
 * |---------------|-------------|
 * | `.air-datepicker-cell` | `[data-testid="calendar-day"]` |
 * | `.-oof-` | `datepainter-day--oof` |
 * | `.-holiday-` | `datepainter-day--holiday` |
 * | `.-sick-` | `datepainter-day--sick` |
 * | `data-year`, `data-month`, `data-day` | `data-date` (YYYY-MM-DD format) |
 * | `-disabled-` | `datepainter-day--empty` (opacity: 0.5) |
 *
 * @module e2e/helpers/datepainter
 */

import { expect, type Locator, type Page } from "@playwright/test";

/**
 * Valid state classes for date cells in Datepainter
 */
type DateState = "oof" | "holiday" | "sick";

/**
 * Get all enabled, clickable date cells in the calendar
 *
 * Excludes both empty (out-of-range) and disabled (non-clickable) cells.
 * Use this selector when you need to interact with only active calendar days.
 *
 * @param page - Playwright Page object
 * @returns Locator for all enabled calendar day cells
 *
 * @example
 * ```ts
 * const cells = getDateCells(page);
 * const count = await cells.count();
 * await cells.nth(0).click(); // Click first enabled day
 * ```
 */
export function getDateCells(page: Page): Locator {
	return page.locator(
		'[data-testid="calendar-day"]:not(.datepainter-day--empty):not(.datepainter__day--disabled)',
	);
}

/**
 * Get a specific date cell by date string (YYYY-MM-DD format)
 *
 * Iterates through all visible date cells and returns the one matching the
 * specified date. Returns null if not found.
 *
 * @param page - Playwright Page object
 * @param dateStr - Date string in YYYY-MM-DD format (e.g., "2026-02-08")
 * @returns Locator for the matching cell, or null if not found
 *
 * @example
 * ```ts
 * const cell = await getDateCellByDate(page, "2026-02-08");
 * if (cell) {
 *   await cell.click();
 * }
 * ```
 */
export async function getDateCellByDate(
	page: Page,
	dateStr: string,
): Promise<Locator | null> {
	if (!dateStr) {
		throw new Error("dateStr must be a valid YYYY-MM-DD string");
	}

	const cells = getDateCells(page);
	const count = await cells.count();

	for (let i = 0; i < count; i++) {
		const cell = cells.nth(i);
		const cellDate = await cell.getAttribute("data-date");
		if (cellDate === dateStr) {
			return cell;
		}
	}

	return null;
}

/**
 * Click on a specific date cell by index
 *
 * @param page - Playwright Page object
 * @param index - Zero-based index of the date cell to click
 * @throws Error if index is negative
 *
 * @example
 * ```ts
 * await clickDate(page, 5); // Click the 6th visible day
 * ```
 */
export async function clickDate(page: Page, index: number): Promise<void> {
	if (index < 0) {
		throw new Error("index must be a non-negative number");
	}

	const cells = getDateCells(page);
	await cells.nth(index).click();
}

/**
 * Verify that a date cell has a specific state class
 *
 * @param page - Playwright Page object
 * @param index - Zero-based index of the date cell to check
 * @param state - The expected state: "oof", "holiday", or "sick"
 * @throws Error if index is negative or state is invalid
 *
 * @example
 * ```ts
 * await expectDateHasState(page, 5, "holiday");
 * ```
 */
export async function expectDateHasState(
	page: Page,
	index: number,
	state: DateState,
): Promise<void> {
	if (index < 0) {
		throw new Error("index must be a non-negative number");
	}

	const validStates: DateState[] = ["oof", "holiday", "sick"];
	if (!validStates.includes(state)) {
		throw new Error(`state must be one of: ${validStates.join(", ")}`);
	}

	const cells = getDateCells(page);
	const cell = cells.nth(index);
	await expect(cell).toHaveClass(`datepainter-day--${state}`);
}

/**
 * Verify that a date cell has no state (no oof, holiday, or sick class)
 *
 * @param page - Playwright Page object
 * @param index - Zero-based index of the date cell to check
 * @throws Error if index is negative
 *
 * @example
 * ```ts
 * await expectDateHasNoState(page, 5);
 * ```
 */
export async function expectDateHasNoState(
	page: Page,
	index: number,
): Promise<void> {
	if (index < 0) {
		throw new Error("index must be a non-negative number");
	}

	const cells = getDateCells(page);
	const cell = cells.nth(index);
	await expect(cell).not.toHaveClass(/datepainter-day--(oof|holiday|sick)/);
}

/**
 * Get the count of disabled date cells (non-clickable days)
 *
 * Counts cells with the disabled state class, which are visually distinct
 * and not interactable. These may include days outside the valid range
 * or other non-selectable dates.
 *
 * @param page - Playwright Page object
 * @returns Number of disabled cells
 *
 * @example
 * ```ts
 * const disabledCount = await getDisabledCellCount(page);
 * console.log(`There are ${disabledCount} disabled days`);
 * ```
 */
export async function getDisabledCellCount(page: Page): Promise<number> {
	return page
		.locator('[data-testid="calendar-day"].datepainter__day--disabled')
		.count();
}

/**
 * Verify that a date cell is disabled (grayed out)
 *
 * @param page - Playwright Page object
 * @param index - Zero-based index of the disabled cell to check
 * @throws Error if index is negative
 *
 * @example
 * ```ts
 * await expectDateDisabled(page, 0); // Check first disabled cell
 * ```
 */
export async function expectDateDisabled(
	page: Page,
	index: number,
): Promise<void> {
	if (index < 0) {
		throw new Error("index must be a non-negative number");
	}

	const disabledCells = page.locator(".datepainter-day--empty");
	const cell = disabledCells.nth(index);
	await expect(cell).toHaveCSS("opacity", "0.5");
}

/**
 * Navigate to a specific month/year in the datepicker
 *
 * This function clicks the navigation title to open the year/month selector,
 * then selects the specified year and month. This assumes Datepainter uses
 * the same navigation pattern as Air Datepicker.
 *
 * TODO: Update if Datepainter uses different navigator selectors
 *
 * @param page - Playwright Page object
 * @param month - Month number (0-11 for Jan-Dec, or 1-12 depending on implementation)
 * @param year - Four-digit year (e.g., 2026)
 * @throws Error if month or year values are invalid
 *
 * @example
 * ```ts
 * await navigateToMonth(page, 1, 2026); // February 2026
 * ```
 */
export async function navigateToMonth(
	page: Page,
	month: number,
	year: number,
): Promise<void> {
	if (year < 1900 || year > 2100) {
		throw new Error("year must be between 1900 and 2100");
	}

	if (month < 0 || month > 11) {
		throw new Error("month must be between 0 and 11");
	}

	const navTitle = page.locator(".air-datepicker-nav--title");
	await navTitle.click();

	const yearCell = page.locator(`[data-year="${year}"]`);
	if (await yearCell.isVisible().catch(() => false)) {
		await yearCell.click();
	}

	const monthCell = page.locator(`[data-month="${month}"]`);
	if (await monthCell.isVisible().catch(() => false)) {
		await monthCell.click();
	}
}

/**
 * Get the current visible month/year from the datepicker navigation title
 *
 * This function reads the navigation title text which typically shows
 * something like "February 2026" or "2026 February".
 *
 * TODO: Update if Datepainter uses different navigator selectors
 *
 * @param page - Playwright Page object
 * @returns The month/year text from the navigation title, or empty string if not found
 *
 * @example
 * ```ts
 * const currentMonthYear = await getCurrentMonthYear(page);
 * console.log(currentMonthYear); // "February 2026"
 * ```
 */
export async function getCurrentMonthYear(page: Page): Promise<string> {
	const navTitle = page.locator(".air-datepicker-nav--title");
	const content = await navTitle.textContent();
	return content ?? "";
}
