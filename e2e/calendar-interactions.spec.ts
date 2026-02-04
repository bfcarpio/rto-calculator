/**
 * Calendar Interaction Tests
 *
 * Tests for calendar day selection, pattern application,
 * and clearing functionality.
 *
 * @module calendar-interactions.spec
 */

import { expect, test } from "@playwright/test";
import {
	applyWeekdayPattern,
	clearAllSelections,
	getCalendarDayByDate,
	getSelectedDayCount,
	selectWorkFromHomeDays,
	waitForCalendarReady,
} from "./test-helpers";

test.describe("Calendar Interactions", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto("/");
		await waitForCalendarReady(page);
	});
	test.describe("Day Selection", () => {
		test("should select a single day", async ({ page }) => {
			// Find a calendar day and click it
			const dayCell = page.locator("[data-testid='calendar-day']").first();
			await expect(dayCell).toBeVisible();

			// Click to select
			await dayCell.click();

			// Verify day is selected (has selected class)
			await expect(dayCell).toHaveClass(/selected/);
			await expect(dayCell).toHaveClass(/out-of-office/);
		});

		test("should toggle day selection on click", async ({ page }) => {
			// Find a calendar day
			const dayCell = page.locator("[data-testid='calendar-day']").first();

			// Click to select
			await dayCell.click();
			await expect(dayCell).toHaveClass(/selected/);

			// Click again to deselect
			await dayCell.click();
			await expect(dayCell).not.toHaveClass(/selected/);
		});

		test("should update classes on selection", async ({ page }) => {
			const dayCell = page.locator("[data-testid='calendar-day']").first();

			// Initially not selected (no selected class)
			await expect(dayCell).not.toHaveClass(/selected/);

			// Click to select
			await dayCell.click();

			// Verify classes updated
			await expect(dayCell).toHaveClass(/selected/);
			await expect(dayCell).toHaveClass(/out-of-office/);
		});

		test("should select day by specific date", async ({ page }) => {
			const now = new Date();
			const dayCell = getCalendarDayByDate(
				page,
				now.getFullYear(),
				now.getMonth(),
				1,
			);

			// Click the specific date
			await dayCell.click();

			// Verify it's selected
			await expect(dayCell).toHaveClass(/selected/);
		});
	});
	test.describe("Pattern Application", () => {
		test("should apply MWF pattern", async ({ page }) => {
			// Apply MWF pattern for 4 weeks
			await applyWeekdayPattern(page, "mwf", 4);

			// Verify days were selected
			const selectedCount = await getSelectedDayCount(page);
			expect(selectedCount).toBeGreaterThan(0);
		});

		test("should apply Tue-Thu pattern", async ({ page }) => {
			// Apply Tue-Thu pattern for 4 weeks
			await applyWeekdayPattern(page, "tue-thu", 4);

			// Verify days were selected
			const selectedCount = await getSelectedDayCount(page);
			expect(selectedCount).toBeGreaterThan(0);
		});

		test("should apply all weekdays pattern", async ({ page }) => {
			// Apply all weekdays pattern for 2 weeks
			await applyWeekdayPattern(page, "all", 2);

			// Verify many days were selected (5 days per week)
			const selectedCount = await getSelectedDayCount(page);
			expect(selectedCount).toBeGreaterThanOrEqual(10);
		});

		test("should allow switching patterns", async ({ page }) => {
			// First apply MWF pattern
			await applyWeekdayPattern(page, "mwf", 2);

			// Clear and apply Tue-Thu pattern
			await clearAllSelections(page);
			await applyWeekdayPattern(page, "tue-thu", 2);

			// Verify days are selected
			const selectedCount = await getSelectedDayCount(page);
			expect(selectedCount).toBeGreaterThan(0);
		});
	});
	test.describe("Clear Selections", () => {
		test("should clear all selections", async ({ page }) => {
			// First select some days
			await selectWorkFromHomeDays(page, 2, 4);

			// Verify selections exist
			let selectedCount = await getSelectedDayCount(page);
			expect(selectedCount).toBeGreaterThan(0);

			// Clear all selections
			await clearAllSelections(page);

			// Verify all selections cleared
			selectedCount = await getSelectedDayCount(page);
			expect(selectedCount).toBe(0);
		});

		test("should clear month selections via clear button", async ({ page }) => {
			// First select some days
			const dayCell = page.locator("[data-testid='calendar-day']").first();
			await dayCell.click();

			// Verify selection exists
			await expect(dayCell).toHaveClass(/selected/);

			// Click the clear button for the month
			const clearButton = page.locator('[id^="clear-"]').first();
			if (await clearButton.isVisible()) {
				await clearButton.click();

				// Wait for UI update
				await page.waitForTimeout(200);

				// Verify selection cleared
				await expect(dayCell).not.toHaveClass(/selected/);
			}
		});

		test("clear button should have correct aria attributes", async ({
			page,
		}) => {
			const clearButton = page.locator('[id^="clear-"]').first();
			await expect(clearButton).toBeVisible();
			await expect(clearButton).toHaveAttribute("aria-label");
			await expect(clearButton).toHaveAttribute("aria-controls");
		});
	});
	test.describe("Drag Selection", () => {
		test("should support drag selection", async ({ page }) => {
			// Get first and fifth day cells for drag
			const firstCell = page.locator("[data-testid='calendar-day']").nth(0);
			const lastCell = page.locator("[data-testid='calendar-day']").nth(4);

			const firstBox = await firstCell.boundingBox();
			const lastBox = await lastCell.boundingBox();

			if (firstBox && lastBox) {
				// Perform drag
				await page.mouse.move(
					firstBox.x + firstBox.width / 2,
					firstBox.y + firstBox.height / 2,
				);
				await page.mouse.down();
				await page.mouse.move(
					lastBox.x + lastBox.width / 2,
					lastBox.y + lastBox.height / 2,
				);
				await page.mouse.up();

				// Verify selections were made
				const selectedCount = await getSelectedDayCount(page);
				expect(selectedCount).toBeGreaterThan(0);
			}
		});
	});
	test.describe("Accessibility", () => {
		test("calendar day should have proper aria attributes", async ({
			page,
		}) => {
			const dayCell = page.locator("[data-testid='calendar-day']").first();

			// Verify aria attributes
			await expect(dayCell).toHaveAttribute("role", "gridcell");
			await expect(dayCell).toHaveAttribute("aria-label");
			await expect(dayCell).toHaveAttribute("tabindex");
		});

		test("calendar day should have data attributes", async ({ page }) => {
			const dayCell = page.locator("[data-testid='calendar-day']").first();

			// Verify data attributes exist
			await expect(dayCell).toHaveAttribute("data-day");
			await expect(dayCell).toHaveAttribute("data-month");
			await expect(dayCell).toHaveAttribute("data-year");
		});

		test("calendar table should have proper role", async ({ page }) => {
			const calendarTable = page.locator(".calendar-table");
			await expect(calendarTable).toHaveAttribute("role", "grid");
		});
	});
});
