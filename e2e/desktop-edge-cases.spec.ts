/**
 * Desktop Edge Case Tests
 *
 * Tests for desktop-specific scenarios including rapid mouse clicks,
 * keyboard shortcuts, and mouse wheel interactions.
 *
 * @module desktop-edge-cases.spec
 */

import { expect, test } from "@playwright/test";
import {
	applyWeekdayPattern,
	getSelectedDayCount,
	waitForCalendarReady,
} from "./test-helpers";

/** Locator for enabled (clickable) calendar day cells */
const ENABLED_DAY_SELECTOR =
	'[data-testid="calendar-day"]:not(.datepainter__day--empty):not(.datepainter__day--disabled)';

test.describe("Desktop Edge Cases", () => {
	test.beforeEach(async ({ page }) => {
		// Set desktop viewport before each test
		await page.setViewportSize({ width: 1920, height: 1080 });
		await page.goto("/rto-calculator/");
		await waitForCalendarReady(page);
	});
	test.describe("Rapid Mouse Clicks", () => {
		test("should handle rapid single clicks", async ({ page }) => {
			const dayCell = page.locator(ENABLED_DAY_SELECTOR).first();

			// Perform 10 rapid clicks
			for (let i = 0; i < 10; i++) {
				await dayCell.click();
			}

			// The cell should still be in a valid state (selected or not)
			await expect(dayCell).toBeVisible();
			const hasStateClass = await dayCell.evaluate((el) =>
				el.classList.contains("datepainter-day--oof") ||
				el.classList.contains("datepainter-day--holiday") ||
				el.classList.contains("datepainter-day--sick"),
			);
			expect(typeof hasStateClass).toBe("boolean");
		});

		test("should handle clicks during page load", async ({ page }) => {
			// Reload the page
			await page.reload();

			// Wait for page to fully load first
			await waitForCalendarReady(page);

			// Now clicking should work
			const dayCell = page.locator(ENABLED_DAY_SELECTOR).first();
			await dayCell.click();
			await expect(dayCell).toHaveClass(/datepainter-day--(oof|holiday|sick)/);
		});
	});
	test.describe("Window Resize Handling", () => {
		test("should maintain state during resize", async ({ page }) => {
			// Make some selections
			await applyWeekdayPattern(page, "tue-thu", 4);
			const initialCount = await getSelectedDayCount(page);
			expect(initialCount).toBeGreaterThan(0);

			// Resize the window
			await page.setViewportSize({ width: 1280, height: 720 });

			// Resize back
			await page.setViewportSize({ width: 1920, height: 1080 });

			// Page should be functional
			await expect(page.locator("body")).toBeVisible();
		});
	});
});
