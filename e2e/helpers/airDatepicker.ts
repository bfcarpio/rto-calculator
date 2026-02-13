/**
 * Test helpers for AirDatepicker interactions
 */

import { expect, type Locator, type Page } from "@playwright/test";

/**
 * Get all visible date cells in the datepicker
 */
export function getDateCells(page: Page): Locator {
	return page.locator(".air-datepicker-cell:not(.-disabled-)");
}

/**
 * Get a specific date cell by date string (YYYY-MM-DD)
 */
export async function getDateCellByDate(
	page: Page,
	dateStr: string,
): Promise<Locator | null> {
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
 * Click on a specific date cell
 */
export async function clickDate(page: Page, index: number): Promise<void> {
	const cells = getDateCells(page);
	await cells.nth(index).click();
}

/**
 * Check if a date cell has a specific state class
 */
export async function expectDateHasState(
	page: Page,
	index: number,
	state: "working" | "oof" | "holiday",
): Promise<void> {
	const cells = getDateCells(page);
	const cell = cells.nth(index);
	await expect(cell).toHaveClass(new RegExp(`-${state}-`));
}

/**
 * Check if a date cell has no state
 */
export async function expectDateHasNoState(
	page: Page,
	index: number,
): Promise<void> {
	const cells = getDateCells(page);
	const cell = cells.nth(index);
	await expect(cell).not.toHaveClass(/-working-| -oof-| -holiday-/);
}

/**
 * Get the number of disabled date cells (outside range)
 */
export async function getDisabledCellCount(page: Page): Promise<number> {
	return page.locator(".air-datepicker-cell.-disabled-").count();
}

/**
 * Check if a date is disabled (grayed out)
 */
export async function expectDateDisabled(
	page: Page,
	index: number,
): Promise<void> {
	const disabledCells = page.locator(".air-datepicker-cell.-disabled-");
	const cell = disabledCells.nth(index);
	await expect(cell).toHaveCSS("opacity", "0.3");
}

/**
 * Navigate to a specific month/year in the datepicker
 */
export async function navigateToMonth(
	page: Page,
	month: number,
	year: number,
): Promise<void> {
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
 * Get the current visible month/year from the datepicker
 */
export async function getCurrentMonthYear(page: Page): Promise<string> {
	const navTitle = page.locator(".air-datepicker-nav--title");
	const content = await navTitle.textContent();
	return content ?? "";
}
