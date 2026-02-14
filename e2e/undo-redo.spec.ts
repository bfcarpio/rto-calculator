import { expect, test } from "@playwright/test";
import { navigateToApp } from "./helpers/common";
import {
	clickDate,
	expectDateHasNoState,
	expectDateHasState,
} from "./helpers/datepainter";
import { expectModeCount, selectMode } from "./helpers/statusLegend";

test.describe("Undo/Redo Functionality", () => {
	test.beforeEach(async ({ page }) => {
		await navigateToApp(page);
		// Wait for calendar to be ready (datepainter)
		await page.waitForSelector(
			'[data-testid="calendar-day"]:not(.datepainter__day--empty):not(.datepainter__day--disabled)',
			{
				state: "visible",
			},
		);
	});

	test("should undo single date mark via button", async ({ page }) => {
		// Mark a date as OOF
		await selectMode(page, "oof");
		await clickDate(page, 0);
		await expectDateHasState(page, 0, "oof");

		// Click undo button
		await page.click('button[aria-label="Undo last action"]');

		// Verify date is cleared
		await expectDateHasNoState(page, 0);
		await expectModeCount(page, "oof", 0);
	});

	test("should undo single date mark via keyboard (Ctrl+Z)", async ({
		page,
	}) => {
		// Mark a date as OOF
		await selectMode(page, "oof");
		await clickDate(page, 0);
		await expectDateHasState(page, 0, "oof");

		// Press Ctrl+Z
		await page.keyboard.press("Control+z");

		// Verify date is cleared
		await expectDateHasNoState(page, 0);
		await expectModeCount(page, "oof", 0);
	});

	test("should undo multiple date marks via button", async ({ page }) => {
		// Mark 3 dates as OOF
		await selectMode(page, "oof");
		await clickDate(page, 0);
		await clickDate(page, 1);
		await clickDate(page, 2);
		await expectModeCount(page, "oof", 3);

		// Undo 3 times
		await page.click('button[aria-label="Undo last action"]');
		await expectModeCount(page, "oof", 2);

		await page.click('button[aria-label="Undo last action"]');
		await expectModeCount(page, "oof", 1);

		await page.click('button[aria-label="Undo last action"]');
		await expectModeCount(page, "oof", 0);

		// Verify all dates are cleared
		await expectDateHasNoState(page, 0);
		await expectDateHasNoState(page, 1);
		await expectDateHasNoState(page, 2);
	});

	test("should redo after undo via button", async ({ page }) => {
		// Mark a date as OOF
		await selectMode(page, "oof");
		await clickDate(page, 0);
		await expectDateHasState(page, 0, "oof");

		// Undo
		await page.click('button[aria-label="Undo last action"]');
		await expectDateHasNoState(page, 0);

		// Redo
		await page.click('button[aria-label="Redo last undone action"]');
		await expectDateHasState(page, 0, "oof");
		await expectModeCount(page, "oof", 1);
	});

	test("should redo after undo via keyboard (Ctrl+Y)", async ({ page }) => {
		// Mark a date as OOF
		await selectMode(page, "oof");
		await clickDate(page, 0);
		await expectDateHasState(page, 0, "oof");

		// Undo via Ctrl+Z
		await page.keyboard.press("Control+z");
		await expectDateHasNoState(page, 0);

		// Redo via Ctrl+Y
		await page.keyboard.press("Control+y");
		await expectDateHasState(page, 0, "oof");
		await expectModeCount(page, "oof", 1);
	});

	test("should redo after undo via keyboard (Ctrl+Shift+Z)", async ({
		page,
	}) => {
		// Mark a date as OOF
		await selectMode(page, "oof");
		await clickDate(page, 0);
		await expectDateHasState(page, 0, "oof");

		// Undo via Ctrl+Z
		await page.keyboard.press("Control+z");
		await expectDateHasNoState(page, 0);

		// Redo via Ctrl+Shift+Z
		await page.keyboard.press("Control+Shift+z");
		await expectDateHasState(page, 0, "oof");
		await expectModeCount(page, "oof", 1);
	});

	test("should handle undo/redo chain correctly", async ({ page }) => {
		// Mark 3 dates as OOF
		await selectMode(page, "oof");
		await clickDate(page, 0);
		await clickDate(page, 1);
		await clickDate(page, 2);
		await expectModeCount(page, "oof", 3);

		// Undo twice
		await page.keyboard.press("Control+z");
		await expectModeCount(page, "oof", 2);
		await page.keyboard.press("Control+z");
		await expectModeCount(page, "oof", 1);

		// Redo once
		await page.keyboard.press("Control+y");
		await expectModeCount(page, "oof", 2);

		// Undo once
		await page.keyboard.press("Control+z");
		await expectModeCount(page, "oof", 1);

		// Redo once
		await page.keyboard.press("Control+y");
		await expectModeCount(page, "oof", 2);
	});

	test("should have undo button disabled initially", async ({ page }) => {
		const undoButton = page.locator('button[aria-label="Undo last action"]');
		await expect(undoButton).toBeDisabled();
	});

	test("should have redo button disabled initially", async ({ page }) => {
		const redoButton = page.locator(
			'button[aria-label="Redo last undone action"]',
		);
		await expect(redoButton).toBeDisabled();
	});

	test("should enable undo button after marking a date", async ({ page }) => {
		const undoButton = page.locator('button[aria-label="Undo last action"]');
		await expect(undoButton).toBeDisabled();

		// Mark a date
		await selectMode(page, "oof");
		await clickDate(page, 0);

		// Wait for button to be enabled (debounced state push might take up to 500ms)
		await expect(undoButton).toBeEnabled({ timeout: 1000 });
	});

	test("should enable redo button after undo", async ({ page }) => {
		const redoButton = page.locator(
			'button[aria-label="Redo last undone action"]',
		);
		await expect(redoButton).toBeDisabled();

		// Mark a date and undo
		await selectMode(page, "oof");
		await clickDate(page, 0);
		await page.keyboard.press("Control+z");

		// Redo button should be enabled
		await expect(redoButton).toBeEnabled();
	});

	test("should disable redo button after new action following undo", async ({
		page,
	}) => {
		const redoButton = page.locator(
			'button[aria-label="Redo last undone action"]',
		);

		// Mark a date, undo, then mark a new date
		await selectMode(page, "oof");
		await clickDate(page, 0);
		await page.keyboard.press("Control+z");
		await expect(redoButton).toBeEnabled();

		// Mark a new date
		await clickDate(page, 1);

		// Redo button should be disabled again (redo stack cleared)
		await expect(redoButton).toBeDisabled();
	});

	test("should preserve different date states through undo/redo", async ({
		page,
	}) => {
		// Mark date 0 as OOF
		await selectMode(page, "oof");
		await clickDate(page, 0);
		await expectDateHasState(page, 0, "oof");

		// Mark date 1 as holiday
		await selectMode(page, "holiday");
		await clickDate(page, 1);
		await expectDateHasState(page, 1, "holiday");

		// Undo holiday
		await page.keyboard.press("Control+z");
		await expectDateHasNoState(page, 1);
		await expectDateHasState(page, 0, "oof");

		// Redo holiday
		await page.keyboard.press("Control+y");
		await expectDateHasState(page, 0, "oof");
		await expectDateHasState(page, 1, "holiday");
	});
});
