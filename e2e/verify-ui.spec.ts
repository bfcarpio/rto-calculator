import { expect, test } from "@playwright/test";

// Migrated from air-datepicker to datepainter with 3-state system (oof, holiday, sick)
// Previous "working" state has been replaced with "sick"

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

	// 3. Verify Datepainter is present
	const datepicker = page.locator('.datepainter');
	await expect(datepicker).toBeVisible();

	// 4. Verify Status Legend is present
	const legend = page.locator(".status-legend").first();
	await expect(legend).toBeVisible();

	// 5. Verify Datepainter day cell selected color matches slate
	// First, find a selected cell or select one
	let selectedCell = page
		.locator(
			'[data-testid="calendar-day"].datepainter-day--oof, [data-testid="calendar-day"].datepainter-day--holiday, [data-testid="calendar-day"].datepainter-day--sick',
		)
		.first();

	// If no cell is selected by default, click the first day
	if ((await selectedCell.count()) === 0) {
		const firstDay = page
			.locator(
				'[data-testid="calendar-day"]:not(.datepainter__day--empty):not(.datepainter__day--disabled)',
			)
			.first();
		await firstDay.waitFor({ state: "visible" });
		await firstDay.click();
		selectedCell = page
			.locator(
				'[data-testid="calendar-day"].datepainter-day--oof, [data-testid="calendar-day"].datepainter-day--holiday, [data-testid="calendar-day"].datepainter-day--sick',
			)
			.first();
	}

	await expect(selectedCell).toBeVisible();

	const cellColor = await selectedCell.evaluate((el) => {
		return window.getComputedStyle(el).backgroundColor;
	});

	// OOF state uses red (#f5222d) from datepainter's state styles
	// Holiday uses amber (#faad14), Sick uses blue (#1890ff)
	// Just verify it's one of the known state colors (not the default white/transparent)
	const stateColors = [
		"rgb(245, 34, 45)",   // OOF red (#f5222d)
		"rgb(250, 173, 20)",  // Holiday amber (#faad14)
		"rgb(24, 144, 255)",  // Sick blue (#1890ff)
	];
	expect(stateColors).toContain(cellColor);
});
