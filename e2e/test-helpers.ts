/**
 * E2E Test Helpers for RTO Calculator
 *
 * Provides reusable helper functions for Playwright E2E tests.
 * These functions encapsulate common testing patterns and make
 * tests more readable and maintainable.
 *
 * @module test-helpers
 */

import type { Locator, Page } from "@playwright/test";

// ============================================================================
// Types
// ============================================================================

/**
 * Validation scenario types for test setup
 */
export type ValidationScenario =
	| "compliant" // 60%+ office days (3+ office days per week)
	| "borderline" // Exactly at threshold
	| "violation" // Below 60% threshold
	| "perfect" // 100% office days (5 office days per week)
	| "empty"; // No selections

/**
 * Weekday pattern for applying selections
 */
export type WeekdayPattern = "mwf" | "tue-thu" | "all" | "none";

/**
 * Month configuration for selecting specific days
 */
export interface MonthConfig {
	month: number; // 0-11
	year: number;
	days: number[]; // Day numbers (1-31)
}

// ============================================================================
// Page Interaction Helpers
// ============================================================================

/**
 * Setup a validation scenario on the calendar
 *
 * This helper sets up test data by selecting appropriate days
 * to achieve the desired compliance level.
 *
 * @param page - Playwright page object
 * @param scenario - The validation scenario to set up
 * @param weeks - Number of weeks to configure (default: 8 for top weeks evaluation)
 * @throws Error if scenario setup fails
 *
 * @example
 * ```typescript
 * await setupValidationScenario(page, 'compliant');
 * await setupValidationScenario(page, 'violation', 12);
 * ```
 */
export async function setupValidationScenario(
	page: Page,
	scenario: ValidationScenario,
	weeks = 8,
): Promise<void> {
	// Clear existing selections first
	await clearAllSelections(page);

	switch (scenario) {
		case "compliant":
			// 2 WFH days = 3 office days = 60% compliant
			await applyWeekdayPattern(page, "tue-thu", weeks);
			break;

		case "borderline":
			// Exactly at threshold - 3 office days minimum
			await applyWeekdayPattern(page, "tue-thu", weeks);
			break;

		case "violation":
			// 3 WFH days = 2 office days = 40% non-compliant
			await applyWeekdayPattern(page, "mwf", weeks);
			break;

		case "perfect":
			// 0 WFH days = 5 office days = 100% compliant
			await applyWeekdayPattern(page, "none", weeks);
			break;

		case "empty":
			// No selections (already cleared)
			break;

		default:
			throw new Error(`Unknown validation scenario: ${scenario}`);
	}

	// Wait for UI to settle
	await page.waitForTimeout(100);
}

/**
 * Run validation and wait for completion
 *
 * Clicks the validate button and waits for validation results
 * to be displayed in the UI.
 *
 * @param page - Playwright page object
 * @returns Promise that resolves when validation is complete
 * @throws Error if validation button not found or validation fails
 *
 * @example
 * ```typescript
 * await runValidation(page);
 * ```
 */
export async function runValidation(page: Page): Promise<void> {
	const validateButton = page
		.locator('[data-testid="validate-button"]')
		.first();

	if (!(await validateButton.isVisible())) {
		throw new Error("Validate button not found");
	}

	// Click validate button
	await validateButton.click();

	// Wait for validation to complete (look for status update or message)
	await Promise.race([
		page.waitForSelector('[data-testid="validation-message"]', {
			timeout: 5000,
		}),
		page.waitForSelector('[data-testid="validation-status"]', {
			timeout: 5000,
		}),
		page.waitForTimeout(3000), // Fallback wait
	]);
}

/**
 * Select specific work-from-home days on the calendar
 *
 * Directly clicks on calendar day cells to select them as WFH days.
 *
 * @param page - Playwright page object
 * @param count - Number of WFH days to select per week
 * @param weeks - Number of weeks to configure (default: 8)
 * @throws Error if unable to select days
 *
 * @example
 * ```typescript
 * await selectWorkFromHomeDays(page, 2, 8); // Select 2 days per week for 8 weeks
 * ```
 */
export async function selectWorkFromHomeDays(
	page: Page,
	count: number,
	weeks = 8,
): Promise<void> {
	// Get all calendar day cells
	const dayCells = page.locator('[data-testid="calendar-day"]:not(.empty)');
	const visibleCells = await dayCells.all();

	if (visibleCells.length === 0) {
		throw new Error("No calendar day cells found");
	}

	// Calculate how many days to select
	const daysToSelect = Math.min(count * weeks, visibleCells.length);

	// Select days (space them out to cover multiple weeks)
	const step = Math.floor(visibleCells.length / daysToSelect) || 1;

	for (let i = 0; i < daysToSelect; i++) {
		const index = (i * step) % visibleCells.length;
		const cell = visibleCells[index];

		// Check if it's a weekday (Monday-Friday)
		const isWeekday = await cell.evaluate((el) => {
			const dayOfWeek = el.closest("tr")?.querySelectorAll("td").length || 0;
			// Skip first column (status) and check position
			const cellIndex = Array.from(el.parentElement?.children || []).indexOf(
				el,
			);
			// Position 0 = status, 1-5 = weekdays, 6 = week number
			return cellIndex >= 1 && cellIndex <= 5;
		});

		if (isWeekday) {
			await cell.click();
		}
	}
}

/**
 * Apply a predefined weekday pattern to the calendar
 *
 * Supports common patterns like MWF (Mon-Wed-Fri) and Tue-Thu.
 *
 * @param page - Playwright page object
 * @param pattern - The weekday pattern to apply
 * @param weeks - Number of weeks to apply the pattern (default: 8)
 * @throws Error if pattern is unknown or application fails
 *
 * @example
 * ```typescript
 * await applyWeekdayPattern(page, 'mwf'); // Apply Mon-Wed-Fri pattern
 * await applyWeekdayPattern(page, 'tue-thu', 12); // Apply for 12 weeks
 * ```
 */
export async function applyWeekdayPattern(
	page: Page,
	pattern: WeekdayPattern,
	weeks = 8,
): Promise<void> {
	if (pattern === "none") {
		// No selections needed - already cleared
		return;
	}

	// Map pattern to weekday column indices
	// Columns: 0=status, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=weekNumber
	const patternToColumns: Record<Exclude<WeekdayPattern, "none">, number[]> = {
		mwf: [1, 3, 5], // Monday, Wednesday, Friday
		"tue-thu": [2, 4], // Tuesday, Thursday
		all: [1, 2, 3, 4, 5], // All weekdays
	};

	const columns = patternToColumns[pattern];
	if (!columns) {
		throw new Error(`Unknown pattern: ${pattern}`);
	}

	// Get all calendar weeks
	const weekRows = page.locator('[data-testid="calendar-week"]');
	const rowCount = await weekRows.count();

	// Apply pattern to each week (up to the specified number of weeks)
	const weeksToConfigure = Math.min(weeks, rowCount);

	for (let week = 0; week < weeksToConfigure; week++) {
		const row = weekRows.nth(week);

		for (const columnIndex of columns) {
			// Find day cell at this column index in the row
			const dayCell = row.locator("td").nth(columnIndex);

			// Check if cell exists and is not empty
			const isVisible = await dayCell.isVisible().catch(() => false);
			if (isVisible) {
				const isEmpty = await dayCell.evaluate((el) =>
					el.classList.contains("empty"),
				);
				if (!isEmpty) {
					await dayCell.click();
				}
			}
		}
	}
}

/**
 * Clear all calendar selections
 *
 * Clicks the "Clear All" button to remove all WFH day selections.
 *
 * @param page - Playwright page object
 * @throws Error if clear button not found
 *
 * @example
 * ```typescript
 * await clearAllSelections(page);
 * ```
 */
export async function clearAllSelections(page: Page): Promise<void> {
	const clearButton = page.locator('[data-testid="clear-all-button"]').first();

	if (await clearButton.isVisible().catch(() => false)) {
		await clearButton.click();
		// Wait for UI to update
		await page.waitForTimeout(200);
	}
}

// ============================================================================
// Selector Helpers
// ============================================================================

/**
 * Get calendar day cell by date
 *
 * @param page - Playwright page object
 * @param year - Full year (e.g., 2025)
 * @param month - Month index (0-11)
 * @param day - Day of month (1-31)
 * @returns Locator for the specific day cell
 *
 * @example
 * ```typescript
 * const dayCell = getCalendarDayByDate(page, 2025, 0, 15);
 * await dayCell.click();
 * ```
 */
export function getCalendarDayByDate(
	page: Page,
	year: number,
	month: number,
	day: number,
): Locator {
	return page.locator(
		`[data-testid="calendar-day"][data-year="${year}"][data-month="${month}"][data-day="${day}"]`,
	);
}

/**
 * Get week status cell by week start date
 *
 * @param page - Playwright page object
 * @param weekStart - Week start date (Monday)
 * @returns Locator for the week status cell
 *
 * @example
 * ```typescript
 * const statusCell = getWeekStatusCell(page, new Date('2025-01-06'));
 * ```
 */
export function getWeekStatusCell(page: Page, weekStart: Date): Locator {
	const weekStartTimestamp = weekStart.getTime();
	return page.locator(
		`[data-testid="week-status"][data-week-start="${weekStartTimestamp}"]`,
	);
}

// ============================================================================
// Validation Result Helpers
// ============================================================================

/**
 * Get validation result message text
 *
 * @param page - Playwright page object
 * @returns Promise resolving to the validation message text, or null if not found
 *
 * @example
 * ```typescript
 * const message = await getValidationMessage(page);
 * expect(message).toContain('Compliant');
 * ```
 */
export async function getValidationMessage(page: Page): Promise<string | null> {
	const messageElement = page.locator('[data-testid="validation-message"]');

	if (await messageElement.isVisible().catch(() => false)) {
		return messageElement.textContent();
	}

	return null;
}

/**
 * Check if validation indicates compliance
 *
 * @param page - Playwright page object
 * @returns Promise resolving to true if compliant, false if violation, null if not found
 *
 * @example
 * ```typescript
 * const isCompliant = await isValidationCompliant(page);
 * expect(isCompliant).toBe(true);
 * ```
 */
export async function isValidationCompliant(
	page: Page,
): Promise<boolean | null> {
	const message = await getValidationMessage(page);

	if (!message) {
		return null;
	}

	// Check for compliance indicators in message
	return (
		message.includes("✓") ||
		message.toLowerCase().includes("compliant") ||
		message.toLowerCase().includes("compliance")
	);
}

/**
 * Get summary statistics from the UI
 *
 * @param page - Playwright page object
 * @returns Object containing summary statistics
 *
 * @example
 * ```typescript
 * const stats = await getSummaryStats(page);
 * expect(stats.averageDays).toBeGreaterThanOrEqual(3);
 * ```
 */
export async function getSummaryStats(page: Page): Promise<{
	averageDays: number | null;
	weeksTracked: number | null;
	totalWeeks: number | null;
}> {
	const averageDaysText = await page
		.locator('[data-testid="average-in-office"]')
		.textContent()
		.catch(() => null);
	const weeksTrackedText = await page
		.locator('[data-testid="weeks-tracked"]')
		.textContent()
		.catch(() => null);
	const totalWeeksText = await page
		.locator('[data-testid="total-weeks"]')
		.textContent()
		.catch(() => null);

	return {
		averageDays: averageDaysText ? parseFloat(averageDaysText) : null,
		weeksTracked: weeksTrackedText ? parseInt(weeksTrackedText, 10) : null,
		totalWeeks: totalWeeksText ? parseInt(totalWeeksText, 10) : null,
	};
}

// ============================================================================
// Mobile-Specific Helpers
// ============================================================================

/**
 * Open mobile menu
 *
 * @param page - Playwright page object
 * @throws Error if mobile menu button not found
 *
 * @example
 * ```typescript
 * await openMobileMenu(page);
 * ```
 */
export async function openMobileMenu(page: Page): Promise<void> {
	const menuButton = page.locator('[data-testid="mobile-menu-button"]');

	if (!(await menuButton.isVisible())) {
		throw new Error("Mobile menu button not found");
	}

	await menuButton.click();
	// Wait for menu animation
	await page.waitForTimeout(300);
}

/**
 * Close mobile menu
 *
 * @param page - Playwright page object
 *
 * @example
 * ```typescript
 * await closeMobileMenu(page);
 * ```
 */
export async function closeMobileMenu(page: Page): Promise<void> {
	// Click outside menu or press Escape
	await page.keyboard.press("Escape");
	await page.waitForTimeout(200);
}

/**
 * Toggle panel on mobile
 *
 * @param page - Playwright page object
 * @param panelName - Name of the panel to toggle ('calendar' or 'summary')
 * @throws Error if panel toggle not found
 *
 * @example
 * ```typescript
 * await toggleMobilePanel(page, 'calendar');
 * ```
 */
export async function toggleMobilePanel(
	page: Page,
	panelName: "calendar" | "summary",
): Promise<void> {
	const toggle = page.locator(`[data-testid="panel-toggle-${panelName}"]`);

	if (!(await toggle.isVisible())) {
		throw new Error(`Panel toggle for ${panelName} not found`);
	}

	await toggle.click();
	await page.waitForTimeout(300);
}

// ============================================================================
// Keyboard Navigation Helpers
// ============================================================================

/**
 * Navigate calendar using keyboard
 *
 * @param page - Playwright page object
 * @param direction - Direction to navigate (arrow keys)
 *
 * @example
 * ```typescript
 * await navigateCalendarKeyboard(page, 'ArrowRight');
 * ```
 */
export async function navigateCalendarKeyboard(
	page: Page,
	direction: "ArrowUp" | "ArrowDown" | "ArrowLeft" | "ArrowRight",
): Promise<void> {
	// Focus a calendar day first
	const firstDay = page.locator('[data-testid="calendar-day"]').first();
	await firstDay.focus();

	// Send keyboard navigation
	await page.keyboard.press(direction);
}

/**
 * Select focused day using keyboard (Enter or Space)
 *
 * @param page - Playwright page object
 *
 * @example
 * ```typescript
 * await selectFocusedDay(page);
 * ```
 */
export async function selectFocusedDay(page: Page): Promise<void> {
	await page.keyboard.press("Enter");
}

// ============================================================================
// Drag Selection Helpers
// ============================================================================

/**
 * Perform drag selection on calendar
 *
 * @param page - Playwright page object
 * @param startCell - Starting day cell locator
 * @param endCell - Ending day cell locator
 *
 * @example
 * ```typescript
 * const startCell = getCalendarDayByDate(page, 2025, 0, 6);
 * const endCell = getCalendarDayByDate(page, 2025, 0, 10);
 * await dragSelectDays(page, startCell, endCell);
 * ```
 */
export async function dragSelectDays(
	page: Page,
	startCell: Locator,
	endCell: Locator,
): Promise<void> {
	// Get bounding boxes for drag operation
	const startBox = await startCell.boundingBox();
	const endBox = await endCell.boundingBox();

	if (!startBox || !endBox) {
		throw new Error("Could not get bounding boxes for drag selection");
	}

	// Perform drag
	await page.mouse.move(
		startBox.x + startBox.width / 2,
		startBox.y + startBox.height / 2,
	);
	await page.mouse.down();
	await page.mouse.move(
		endBox.x + endBox.width / 2,
		endBox.y + endBox.height / 2,
	);
	await page.mouse.up();
}

// ============================================================================
// Utility Helpers
// ============================================================================

/**
 * Wait for calendar to be fully loaded and interactive
 *
 * @param page - Playwright page object
 * @param timeout - Maximum wait time in milliseconds
 * @throws Error if calendar not loaded within timeout
 *
 * @example
 * ```typescript
 * await waitForCalendarReady(page);
 * ```
 */
export async function waitForCalendarReady(
	page: Page,
	timeout = 10000,
): Promise<void> {
	await page.waitForSelector('[data-testid="calendar-day"]', {
		timeout,
		state: "visible",
	});

	// Additional wait for any JavaScript initialization
	await page.waitForTimeout(500);
}

/**
 * Get number of selected WFH days
 *
 * @param page - Playwright page object
 * @returns Count of selected WFH days
 *
 * @example
 * ```typescript
 * const count = await getSelectedDayCount(page);
 * expect(count).toBe(5);
 * ```
 */
export async function getSelectedDayCount(page: Page): Promise<number> {
	return page
		.locator('[data-testid="calendar-day"].selected.out-of-office')
		.count();
}

/**
 * Check if mobile viewport
 *
 * @param page - Playwright page object
 * @returns True if viewport width is mobile-sized
 *
 * @example
 * ```typescript
 * const isMobile = await isMobileViewport(page);
 * if (isMobile) {
 *   await openMobileMenu(page);
 * }
 * ```
 */
export async function isMobileViewport(page: Page): Promise<boolean> {
	const viewport = page.viewportSize();
	return viewport ? viewport.width < 768 : false;
}
