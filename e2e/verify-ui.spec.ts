import { expect, test } from "@playwright/test";

// test.use({ browserName: "firefox" });

test("Verify UI styling and elements", async ({ page, isMobile }) => {
	// Firefox does not support isMobile: true, so we skip if the project configures it
	// This prevents crashes when running with mobile projects in playwright.config.ts
	if (isMobile) {
		test.skip();
	}

	// Navigate to the app
	// Explicitly use the base path defined in astro.config.mjs
	await page.goto("/rto-calculator/");
	await page.waitForLoadState("networkidle");

	// 1. Check header background color is NOT teal
	const header = page.locator("header.hero");
	await expect(header).toBeVisible();

	const headerColor = await header.evaluate((el) => {
		return window.getComputedStyle(el).backgroundColor;
	});

	// Bulma default primary (teal) is rgb(0, 209, 178)
	// Standard CSS teal is rgb(0, 128, 128)
	// We expect it to be slate (e.g. rgb(71, 85, 105) or similar)
	expect(headerColor).not.toBe("rgb(0, 209, 178)");
	expect(headerColor).not.toBe("rgb(0, 128, 128)");

	// 2. Verify "Weeks tracked" progress bar is NOT present
	// Assuming .weeks-progress was the class for it
	const weeksProgress = page.locator(".weeks-progress");
	await expect(weeksProgress).not.toBeVisible();

	// 3. Verify Air Datepicker is present
	const datepicker = page.locator(".air-datepicker");
	await expect(datepicker).toBeVisible();

	// 4. Verify Status Legend is present
	const legend = page.locator(".status-legend").first();
	await expect(legend).toBeVisible();

	// 5. Verify Air Datepicker day cell selected color matches slate
	// First, find a selected cell or select one
	let selectedCell = page.locator(".air-datepicker-cell.-selected-").first();

	// If no cell is selected by default, click the first day
	if ((await selectedCell.count()) === 0) {
		const firstDay = page.locator(".air-datepicker-cell.-day-").first();
		await firstDay.waitFor({ state: "visible" });
		await firstDay.click();
		selectedCell = page.locator(".air-datepicker-cell.-selected-").first();
	}

	await expect(selectedCell).toBeVisible();

	const cellColor = await selectedCell.evaluate((el) => {
		return window.getComputedStyle(el).backgroundColor;
	});

	// Expected slate color from global.css: var(--color-selected) -> #475569 -> rgb(71, 85, 105)
	// We'll check it strictly matches the slate color found in CSS
	expect(cellColor).toBe("rgb(71, 85, 105)");
});
