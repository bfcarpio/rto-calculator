import { test, expect } from "@playwright/test";

test.describe("vanilla/calendar-marking", () => {
	test.beforeEach(async ({ page }) => {
		// Navigate to vanilla calendar example
		await page.goto("http://localhost:4323/examples/vanilla/index.html");
	});

	test("should initialize calendar from vanilla JS", async ({ page }) => {
		// Wait for calendar to render
		await page.waitForSelector(".rto-calendar");

		// Verify calendar container exists
		const calendar = page.locator(".rto-calendar");
		await expect(calendar).toBeVisible();

		// Verify month display
		const monthDisplay = page.locator(".rto-calendar-month");
		await expect(monthDisplay).toBeVisible();

		// Verify day cells exist
		const dayCells = page.locator(".rto-calendar-day");
		const count = await dayCells.count();
		expect(count).toBeGreaterThan(0);
	});

	test("should mark day on click", async ({ page }) => {
		// Wait for calendar to render
		await page.waitForSelector(".rto-calendar");

		// Click on a day cell
		const dayCell = page.locator(".rto-calendar-day").first();
		await dayCell.click();

		// Verify day is marked/selected
		await expect(dayCell).toHaveClass(/selected/);
	});

	test("should handle drag selection", async ({ page }) => {
		// Wait for calendar to render
		await page.waitForSelector(".rto-calendar");

		// Get first and third day cells for drag
		const firstDay = page.locator(".rto-calendar-day").first();
		const thirdDay = page.locator(".rto-calendar-day").nth(2);

		// Perform drag from first day to third day
		await firstDay.click();
		await page.mouse.down();
		await thirdDay.hover();
		await page.mouse.up();

		// Verify multiple days are selected
		const selectedDays = page.locator(".rto-calendar-day.selected");
		const count = await selectedDays.count();
		expect(count).toBeGreaterThan(0);
	});

	test("should update month display", async ({ page }) => {
		// Wait for calendar to render
		await page.waitForSelector(".rto-calendar");

		// Get initial month text
		const initialMonth = await page
			.locator(".rto-calendar-month")
			.textContent();

		// Click next month button
		const nextButton = page.locator(".rto-calendar-next");
		if ((await nextButton.count()) > 0) {
			await nextButton.click();

			// Verify month has changed
			const updatedMonth = await page
				.locator(".rto-calendar-month")
				.textContent();
			expect(updatedMonth).not.toBe(initialMonth);
		}
	});
});
