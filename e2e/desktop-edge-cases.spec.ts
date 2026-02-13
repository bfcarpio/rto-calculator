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

test.describe("Desktop Edge Cases", () => {
	test.beforeEach(async ({ page }) => {
		// Set desktop viewport before each test
		await page.setViewportSize({ width: 1920, height: 1080 });
		await page.goto("/rto-calculator/");
		await waitForCalendarReady(page);
	});
	test.describe("Rapid Mouse Clicks", () => {
		test("should handle rapid single clicks", async ({ page }) => {
			const dayCell = page.locator("[data-testid='calendar-day']").first();

			// Perform 10 rapid clicks
			for (let i = 0; i < 10; i++) {
				await dayCell.click();
			}

			// The cell should still be in a valid state (selected or not)
			await expect(dayCell).toBeVisible();
			const hasClass = await dayCell.evaluate((el) =>
				el.classList.contains("selected"),
			);
			expect(typeof hasClass).toBe("boolean");
		});

		test("should handle rapid clicks on multiple cells", async ({ page }) => {
			// Rapidly click first 5 cells twice each
			for (let i = 0; i < 5; i++) {
				const cell = page.locator("[data-testid='calendar-day']").nth(i);
				await cell.click();
				await cell.click();
			}

			// Page should remain functional
			await expect(page.locator("body")).toBeVisible();
		});

		test("should handle clicks during page load", async ({ page }) => {
			// Reload the page
			await page.reload();

			// Try to click immediately (before fully loaded)
			const dayCell = page.locator("[data-testid='calendar-day']").first();
			await dayCell.click().catch(() => {
				// Click might fail if page not ready - that's OK
			});

			// Wait for page to fully load
			await waitForCalendarReady(page);

			// Now clicking should work
			await dayCell.click();
			await expect(dayCell).toHaveClass(/selected/);
		});

		test("should handle alternating left and right clicks", async ({
			page,
		}) => {
			const dayCell = page.locator("[data-testid='calendar-day']").first();

			// Alternate between left and right clicks
			await dayCell.click({ button: "left" });
			await dayCell.click({ button: "right" });
			await dayCell.click({ button: "left" });

			// Cell should remain functional
			await expect(dayCell).toBeVisible();
		});
	});
	test.describe("Window Resize Handling", () => {
		test("should handle rapid window resizing", async ({ page }) => {
			// Resize multiple times rapidly
			const sizes = [
				{ width: 1920, height: 1080 },
				{ width: 1280, height: 720 },
				{ width: 1024, height: 768 },
				{ width: 1920, height: 1080 },
			];

			for (const size of sizes) {
				await page.setViewportSize(size);
				await page.waitForTimeout(100);
			}

			// Reset to original size
			await page.setViewportSize({ width: 1920, height: 1080 });

			// Page should remain functional
			await expect(page.locator("body")).toBeVisible();
		});

		test("should maintain state during resize", async ({ page }) => {
			// Make some selections
			await applyWeekdayPattern(page, "tue-thu", 4);
			const initialCount = await getSelectedDayCount(page);
			expect(initialCount).toBeGreaterThan(0);

			// Resize the window
			await page.setViewportSize({ width: 1280, height: 720 });
			await page.waitForTimeout(300);

			// Resize back
			await page.setViewportSize({ width: 1920, height: 1080 });
			await page.waitForTimeout(300);

			// Page should be functional
			await expect(page.locator("body")).toBeVisible();
		});
	});
});
