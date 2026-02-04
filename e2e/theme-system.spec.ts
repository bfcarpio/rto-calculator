import { expect, test } from "@playwright/test";
import {
	closeSettings,
	cycleTheme,
	expectTheme,
	isDarkModeActive,
	openSettings,
} from "./helpers/theme";

test.describe("Theme System", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto("/rto-calculator/");
	});

	test("should open settings via gear button", async ({ page }) => {
		await openSettings(page);
		await expect(page.getByText("Appearance")).toBeVisible();
		await closeSettings(page);
	});

	test("should cycle through themes: system -> light -> dark -> system", async ({
		page,
	}) => {
		await openSettings(page);

		// Start with system
		await expectTheme(page, "system");

		// Cycle to light
		await cycleTheme(page);
		await expectTheme(page, "light");

		// Cycle to dark
		await cycleTheme(page);
		await expectTheme(page, "dark");

		// Cycle back to system
		await cycleTheme(page);
		await expectTheme(page, "system");
	});

	test("should apply dark mode class when dark theme selected", async ({
		page,
	}) => {
		await openSettings(page);

		// Cycle to dark
		await cycleTheme(page); // system -> light
		await cycleTheme(page); // light -> dark

		// Verify dark mode class is applied
		await expect(await isDarkModeActive(page)).toBe(true);
	});

	test("should remove dark mode class when light theme selected", async ({
		page,
	}) => {
		await openSettings(page);

		// Go to light theme
		await cycleTheme(page); // system -> light

		await expect(await isDarkModeActive(page)).toBe(false);
	});

	test("should reset theme on page refresh (in-memory only)", async ({
		page,
	}) => {
		await openSettings(page);

		// Change to dark
		await cycleTheme(page);
		await cycleTheme(page);
		await expectTheme(page, "dark");

		// Refresh
		await page.reload();

		// Theme should reset to system (default)
		await openSettings(page);
		await expectTheme(page, "system");
	});

	test("should show correct icons for each theme", async ({ page }) => {
		await openSettings(page);

		const themeIcon = page.locator("#theme-icon");

		// System should show computer icon
		await expect(themeIcon).toHaveText("🖥️");

		// Light should show sun
		await cycleTheme(page);
		await expect(themeIcon).toHaveText("☀️");

		// Dark should show moon
		await cycleTheme(page);
		await expect(themeIcon).toHaveText("🌙");
	});
});
