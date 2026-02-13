// Migrated from air-datepicker to datepainter with 3-state system (oof, holiday, sick)
// Previous "working" state has been replaced with "sick"

import { expect, test } from "@playwright/test";
import { navigateToApp } from "./helpers/common";
import { clickDate, expectDateHasState } from "./helpers/datepainter";
import { selectMode } from "./helpers/statusLegend";

test.describe("Mobile Edge Cases", () => {
	test.beforeEach(async ({ page }) => {
		// Set mobile viewport
		await page.setViewportSize({ width: 375, height: 667 });
		await navigateToApp(page);
		await page.waitForLoadState("networkidle");
		await page.waitForSelector(
			'[data-testid="calendar-day"]:not(.datepainter__day--empty):not(.datepainter__day--disabled)',
			{
				state: "visible",
			},
		);
	});

	test("should display calendar on mobile viewport", async ({ page }) => {
		const calendar = page.locator(".datepainter");
		await expect(calendar).toBeVisible();
	});

	test("should handle click on date cell in mobile viewport", async ({ page }) => {
		await selectMode(page, "sick");

		// Click a date cell (touch tap requires isMobile project config)
		await clickDate(page, 0);

		// Verify date is marked
		await expectDateHasState(page, 0, "sick");
	});

	test("should maintain state during orientation change", async ({ page }) => {
		await selectMode(page, "oof");
		await clickDate(page, 0);

		// Change orientation
		await page.setViewportSize({ width: 667, height: 375 });

		// State should persist
		await expectDateHasState(page, 0, "oof");
	});

	test("should handle rapid click interactions", async ({ page }) => {
		await selectMode(page, "holiday");

		// Rapid clicks on different dates
		await clickDate(page, 0);
		await clickDate(page, 1);
		await clickDate(page, 2);

		// All should be marked
		await expectDateHasState(page, 0, "holiday");
		await expectDateHasState(page, 1, "holiday");
		await expectDateHasState(page, 2, "holiday");
	});

	test("should handle mobile menu button", async ({ page }) => {
		const menuButton = page.locator('[data-testid="mobile-menu-button"]');

		// Menu button should be visible on mobile
		await expect(menuButton).toBeVisible();

		// Click to open settings dialog
		await menuButton.click();

		// Settings dialog should be visible
		const dialog = page.locator("#settings-dialog");
		await expect(dialog).toBeVisible();
	});
});
