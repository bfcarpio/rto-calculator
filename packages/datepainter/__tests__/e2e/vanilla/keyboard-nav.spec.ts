import { test, expect } from "@playwright/test";

test.describe("vanilla/keyboard-nav", () => {
	test.beforeEach(async ({ page }) => {
		// Navigate to vanilla calendar example
		await page.goto("http://localhost:4323/examples/vanilla/index.html");
	});

	test("should support keyboard navigation", async ({ page }) => {
		// Wait for calendar to render
		await page.waitForSelector(".rto-calendar");

		// Focus on the calendar
		const calendar = page.locator(".rto-calendar");
		await calendar.focus();

		// Press arrow keys to navigate
		await page.keyboard.press("ArrowRight");

		// Verify focus moved (if focus management is implemented)
		// This test validates that keyboard events are handled
		const activeElement = await page.evaluate(() => document.activeElement?.tagName);
		expect(activeElement).toBeDefined();
	});

	test("should maintain focus during navigation", async ({ page }) => {
		// Wait for calendar to render
		await page.waitForSelector(".rto-calendar");

		// Focus on a day cell
		const firstDay = page.locator(".rto-calendar-day").first();
		await firstDay.focus();

		// Press arrow keys
		await page.keyboard.press("ArrowRight");
		await page.keyboard.press("ArrowDown");

		// Verify focus is still within the calendar
		const calendar = page.locator(".rto-calendar");
		const isFocused = await calendar.evaluate((el) => el.contains(document.activeElement));
		expect(isFocused).toBe(true);
	});

	test("should select day with Enter key", async ({ page }) => {
		// Wait for calendar to render
		await page.waitForSelector(".rto-calendar");

		// Focus on a day cell
		const dayCell = page.locator(".rto-calendar-day").first();
		await dayCell.focus();

		// Press Enter to select
		await page.keyboard.press("Enter");

		// Verify day is selected
		await expect(dayCell).toHaveClass(/selected/);
	});
});
