import { expect, test } from "@playwright/test";
import { clickDate, expectDateHasState } from "./helpers/airDatepicker";
import { navigateToApp, reloadPage } from "./helpers/common";
import { selectMode } from "./helpers/statusLegend";

test.describe("Mobile Edge Cases", () => {
	test.beforeEach(async ({ page }) => {
		// Set mobile viewport
		await page.setViewportSize({ width: 375, height: 667 });
		await navigateToApp(page);
		await page.waitForSelector(".air-datepicker", { state: "visible" });
	});

	test("should display mobile panel toggle", async ({ page }) => {
		const panelToggle = page.locator(".panel-toggle");
		await expect(panelToggle).toBeVisible();
	});

	test("should handle touch tap on date cell", async ({ page }) => {
		await selectMode(page, "working");

		// Simulate touch tap on a date
		const dateCell = page
			.locator(".air-datepicker-cell:not(.-disabled-)")
			.first();
		await dateCell.tap();

		// Verify date is marked
		await expectDateHasState(page, 0, "working");
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

		const dateCells = page.locator(".air-datepicker-cell:not(.-disabled-)");

		// Rapid taps on different dates
		await dateCells.nth(0).tap();
		await dateCells.nth(1).tap();
		await dateCells.nth(2).tap();

		// All should be marked
		await expectDateHasState(page, 0, "holiday");
		await expectDateHasState(page, 1, "holiday");
		await expectDateHasState(page, 2, "holiday");
	});

	test("should clear data on page refresh", async ({ page }) => {
		await selectMode(page, "working");
		await clickDate(page, 0);

		await reloadPage(page);

		// In-memory only, should be cleared
		const dateCells = page.locator(".air-datepicker-cell:not(.-disabled-)");
		const firstCell = dateCells.first();
		await expect(firstCell).not.toHaveClass(/-working-| -oof-| -holiday-/);
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
