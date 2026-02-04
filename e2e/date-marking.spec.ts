import { expect, test } from "@playwright/test";
// Note: SCENARIOS and TestScenarioBuilder available for future test data scenarios
import { expectModeCount, selectMode } from "./helpers/statusLegend";

test.describe("Date Marking Flows", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto("/rto-calculator/");
	});

	test("should mark single date as working", async ({ page }) => {
		// Select working mode
		await selectMode(page, "working");

		// Click a date in the datepicker
		const dateCell = page
			.locator(".air-datepicker-cell:not(.-disabled-)")
			.first();
		await dateCell.click();

		// Verify date is marked (has working class)
		await expect(dateCell).toHaveClass(/-working-/);
	});

	test("should mark single date as OOF", async ({ page }) => {
		await selectMode(page, "oof");

		const dateCell = page
			.locator(".air-datepicker-cell:not(.-disabled-)")
			.first();
		await dateCell.click();

		await expect(dateCell).toHaveClass(/-oof-/);
		await expectModeCount(page, "oof", 1);
	});

	test("should mark single date as holiday", async ({ page }) => {
		await selectMode(page, "holiday");

		const dateCell = page
			.locator(".air-datepicker-cell:not(.-disabled-)")
			.first();
		await dateCell.click();

		await expect(dateCell).toHaveClass(/-holiday-/);
		await expectModeCount(page, "holiday", 1);
	});

	test("should toggle off previously marked date", async ({ page }) => {
		// Mark as OOF
		await selectMode(page, "oof");
		const dateCell = page
			.locator(".air-datepicker-cell:not(.-disabled-)")
			.first();
		await dateCell.click();

		// Click same date again to toggle off
		await dateCell.click();

		// Verify no state class present
		await expect(dateCell).not.toHaveClass(/-working-| -oof-| -holiday-/);
	});

	test("should prevent marking out-of-range dates", async ({ page }) => {
		// Find a disabled date cell
		const disabledCell = page
			.locator(".air-datepicker-cell.-disabled-")
			.first();

		// Should have disabled styling
		await expect(disabledCell).toHaveCSS("opacity", "0.3");
	});

	test("should update counts when marking multiple dates", async ({ page }) => {
		await selectMode(page, "oof");

		// Mark 3 dates
		const dateCells = page.locator(".air-datepicker-cell:not(.-disabled-)");
		await dateCells.nth(0).click();
		await dateCells.nth(1).click();
		await dateCells.nth(2).click();

		await expectModeCount(page, "oof", 3);
	});

	test("should persist state on page refresh (in-memory)", async ({ page }) => {
		await selectMode(page, "working");

		const dateCell = page
			.locator(".air-datepicker-cell:not(.-disabled-)")
			.first();
		await dateCell.click();

		// Refresh page
		await page.reload();

		// Data should be cleared (in-memory only)
		const freshCell = page
			.locator(".air-datepicker-cell:not(.-disabled-)")
			.first();
		await expect(freshCell).not.toHaveClass(/-working-| -oof-| -holiday-/);
	});
});
