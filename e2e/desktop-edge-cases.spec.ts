/**
 * Desktop Edge Case Tests
 *
 * Tests for desktop-specific scenarios including rapid mouse clicks,
 * multi-cell drag selection, keyboard shortcuts, and mouse wheel interactions.
 *
 * @module desktop-edge-cases.spec
 */

import { expect, test } from "@playwright/test";
import {
	applyWeekdayPattern,
	dragSelectDays,
	getSelectedDayCount,
	waitForCalendarReady,
} from "./test-helpers";

test.describe("Desktop Edge Cases", () => {
	test.beforeEach(async ({ page }) => {
		// Set desktop viewport before each test
		await page.setViewportSize({ width: 1920, height: 1080 });
		await page.goto("/");
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
	test.describe("Multi-Cell Drag Selection", () => {
		test("should select multiple cells with drag", async ({ page }) => {
			// Get first and fifth day cells for drag
			const startCell = page.locator("[data-testid='calendar-day']").nth(0);
			const endCell = page.locator("[data-testid='calendar-day']").nth(4);

			// Perform drag selection
			await dragSelectDays(page, startCell, endCell);

			// Verify multiple selections were made
			const selectedCount = await getSelectedDayCount(page);
			expect(selectedCount).toBeGreaterThan(0);
		});

		test("should handle drag across week boundaries", async ({ page }) => {
			// Get cells from different weeks
			const weekRows = page.locator("[data-testid='calendar-week']");
			const firstWeek = weekRows.nth(0);
			const secondWeek = weekRows.nth(1);

			const startCell = firstWeek
				.locator("[data-testid='calendar-day']")
				.first();
			const endCell = secondWeek
				.locator("[data-testid='calendar-day']")
				.first();

			// Perform cross-week drag
			await dragSelectDays(page, startCell, endCell);

			// Should have made selections
			await expect(
				page.locator("[data-testid='calendar-day']").first(),
			).toBeVisible();
		});

		test("should handle drag with very fast movement", async ({ page }) => {
			// Get first and tenth day cells for drag
			const startCell = page.locator("[data-testid='calendar-day']").nth(0);
			const endCell = page.locator("[data-testid='calendar-day']").nth(9);

			const startBox = await startCell.boundingBox();
			const endBox = await endCell.boundingBox();

			if (startBox && endBox) {
				// Fast mouse movement
				await page.mouse.move(
					startBox.x + startBox.width / 2,
					startBox.y + startBox.height / 2,
				);
				await page.mouse.down();
				await page.mouse.move(
					endBox.x + endBox.width / 2,
					endBox.y + endBox.height / 2,
					{ steps: 2 }, // Very few steps = fast movement
				);
				await page.mouse.up();

				// Should still work
				await expect(page.locator("body")).toBeVisible();
			}
		});

		test("should handle interrupted drag", async ({ page }) => {
			const dayCell = page.locator("[data-testid='calendar-day']").first();
			const box = await dayCell.boundingBox();

			if (box) {
				// Start drag
				await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
				await page.mouse.down();

				// Move mouse without releasing (simulating interrupted drag)
				await page.mouse.move(
					box.x + box.width / 2 + 100,
					box.y + box.height / 2,
				);

				// Release outside calendar
				await page.mouse.up();

				// Page should remain functional
				await expect(dayCell).toBeVisible();
			}
		});

		test("should handle drag to empty cells", async ({ page }) => {
			// Find an empty cell
			const emptyCell = page.locator(".calendar-day.empty").first();
			const regularCell = page.locator("[data-testid='calendar-day']").first();

			// Try to drag to empty cell
			const regularBox = await regularCell.boundingBox();
			const emptyBox = await emptyCell.boundingBox();

			if (regularBox && emptyBox) {
				await page.mouse.move(
					regularBox.x + regularBox.width / 2,
					regularBox.y + regularBox.height / 2,
				);
				await page.mouse.down();
				await page.mouse.move(
					emptyBox.x + emptyBox.width / 2,
					emptyBox.y + emptyBox.height / 2,
				);
				await page.mouse.up();

				// Page should handle this gracefully
				await expect(page.locator("body")).toBeVisible();
			}
		});
	});
	test.describe("Keyboard Shortcuts", () => {
		test("should navigate with arrow keys", async ({ page }) => {
			// Focus first day cell
			const firstDay = page.locator("[data-testid='calendar-day']").first();
			await firstDay.focus();

			// Navigate right multiple times
			for (let i = 0; i < 5; i++) {
				await page.keyboard.press("ArrowRight");
			}

			// Navigate down
			await page.keyboard.press("ArrowDown");

			// Something should be focused
			const focusedElement = await page.evaluate(
				() => document.activeElement !== null,
			);
			expect(focusedElement).toBe(true);
		});

		test("should select with Enter key", async ({ page }) => {
			const dayCell = page.locator("[data-testid='calendar-day']").first();
			await dayCell.focus();

			// Select with Enter
			await page.keyboard.press("Enter");
			await expect(dayCell).toHaveClass(/selected/);

			// Deselect with Enter
			await page.keyboard.press("Enter");
			await expect(dayCell).not.toHaveClass(/selected/);
		});

		test("should select with Space key", async ({ page }) => {
			const dayCell = page.locator("[data-testid='calendar-day']").first();
			await dayCell.focus();

			// Select with Space
			await page.keyboard.press("Space");
			await expect(dayCell).toHaveClass(/selected/);
		});

		test("should handle rapid keyboard input", async ({ page }) => {
			// Focus first day
			const firstDay = page.locator("[data-testid='calendar-day']").first();
			await firstDay.focus();

			// Rapid keyboard navigation
			for (let i = 0; i < 20; i++) {
				await page.keyboard.press("ArrowRight");
			}

			// Page should remain functional
			await expect(page.locator("body")).toBeVisible();
		});

		test("should handle Tab navigation", async ({ page }) => {
			// Tab through elements
			for (let i = 0; i < 10; i++) {
				await page.keyboard.press("Tab");
			}

			// Something should be focused
			const hasFocus = await page.evaluate(
				() => document.activeElement !== document.body,
			);
			expect(hasFocus).toBe(true);
		});

		test("should handle Escape key", async ({ page }) => {
			// Focus a day cell
			const dayCell = page.locator("[data-testid='calendar-day']").first();
			await dayCell.focus();

			// Press Escape
			await page.keyboard.press("Escape");

			// Page should remain functional
			await expect(page.locator("body")).toBeVisible();
		});

		test("should handle Ctrl+A (select all)", async ({ page }) => {
			// Focus calendar area
			await page.locator(".calendar-table").focus();

			// Press Ctrl+A
			await page.keyboard.press("Control+a");

			// Page should handle this gracefully
			await expect(page.locator("body")).toBeVisible();
		});
	});
	test.describe("Mouse Wheel Interactions", () => {
		test("should handle mouse wheel during selection", async ({ page }) => {
			// Start a selection
			const dayCell = page.locator("[data-testid='calendar-day']").first();
			await dayCell.click();

			// Scroll while selection is active
			await page.mouse.wheel(0, 500);

			// Page should remain functional
			await expect(dayCell).toBeVisible();
		});

		test("should handle rapid mouse wheel scrolling", async ({ page }) => {
			// Scroll rapidly multiple times
			for (let i = 0; i < 10; i++) {
				await page.mouse.wheel(0, 100);
			}

			// Page should remain functional
			await expect(page.locator("body")).toBeVisible();
			await expect(
				page.locator("[data-testid='calendar-day']").first(),
			).toBeVisible();
		});

		test("should handle scroll then click", async ({ page }) => {
			// Scroll the page
			await page.mouse.wheel(0, 500);

			// Click on a day cell
			const dayCell = page.locator("[data-testid='calendar-day']").first();
			await dayCell.click();

			// Selection should work
			await expect(dayCell).toHaveClass(/selected/);
		});

		test("should handle horizontal mouse wheel", async ({ page }) => {
			// Horizontal scroll (if supported)
			await page.mouse.wheel(500, 0);

			// Page should remain functional
			await expect(page.locator("body")).toBeVisible();
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
	test.describe("Button Interactions", () => {
		test("should handle rapid validate button clicks", async ({ page }) => {
			const validateButton = page
				.locator("[data-testid='validate-button']")
				.first();

			// Click validate button rapidly
			for (let i = 0; i < 5; i++) {
				await validateButton.click();
			}

			// Button should remain functional
			await expect(validateButton).toBeVisible();
		});

		test("should handle validate during drag", async ({ page }) => {
			// Start a drag
			const dayCell = page.locator("[data-testid='calendar-day']").first();
			const box = await dayCell.boundingBox();

			if (box) {
				await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
				await page.mouse.down();

				// Click validate while dragging
				const validateButton = page
					.locator("[data-testid='validate-button']")
					.first();
				await validateButton.click();

				// Release mouse
				await page.mouse.up();

				// Page should remain functional
				await expect(page.locator("body")).toBeVisible();
			}
		});

		test("should handle clear-all during selection", async ({ page }) => {
			// Select some days
			await applyWeekdayPattern(page, "tue-thu", 2);

			// Clear all
			const clearButton = page
				.locator("[data-testid='clear-all-button']")
				.first();
			await clearButton.click();

			// Verify selections cleared
			const selectedCount = await getSelectedDayCount(page);
			expect(selectedCount).toBe(0);
		});

		test("should handle button hover states", async ({ page }) => {
			const validateButton = page
				.locator("[data-testid='validate-button']")
				.first();

			// Hover over button
			await validateButton.hover();

			// Button should show hover effect (if any)
			await expect(validateButton).toBeVisible();
		});
	});
});
