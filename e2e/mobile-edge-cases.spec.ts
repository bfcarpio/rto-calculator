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
		// Wait for calendar to be ready (datepainter)
		await page.waitForSelector(
			'[data-testid="calendar-day"]:not(.datepainter__day--empty):not(.datepainter__day--disabled)',
			{
				state: "visible",
			},
		);
	});

	test("should display mobile panel toggle", async ({ page }) => {
		const panelToggle = page.locator(".panel-toggle");
		await expect(panelToggle).toBeVisible();
	});

	test("should handle touch tap on date cell", async ({ page }) => {
		await selectMode(page, "sick");

		// Simulate touch tap on a date
		const dateCell = page
			.locator(
				'[data-testid="calendar-day"]:not(.datepainter__day--empty):not(.datepainter__day--disabled)',
			)
			.first();
		await dateCell.tap();

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

	test("should handle rapid touch interactions", async ({ page }) => {
		await selectMode(page, "holiday");

		const dateCells = page.locator(
			'[data-testid="calendar-day"]:not(.datepainter__day--empty):not(.datepainter__day--disabled)',
		);

		// Rapid taps on different dates
		await dateCells.nth(0).tap();
		await dateCells.nth(1).tap();
		await dateCells.nth(2).tap();

		// All should be marked
		await expectDateHasState(page, 0, "holiday");
		await expectDateHasState(page, 1, "holiday");
		await expectDateHasState(page, 2, "holiday");
	});

	test("should handle mobile menu", async ({ page }) => {
		const menuButton = page.locator('[data-testid="mobile-menu-button"]');

		// Menu button should be visible on mobile
		await expect(menuButton).toBeVisible();

		// Click to open menu
		await menuButton.click();

		// Menu should be visible
		const menu = page.locator('[data-testid="mobile-menu"]');
		await expect(menu).toBeVisible();
	});
});
