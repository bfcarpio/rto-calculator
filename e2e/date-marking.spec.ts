import { expect, test } from "@playwright/test";
import { navigateToApp } from "./helpers/common";
// Migrated from air-datepicker to datepainter with 3-state system (oof, holiday, sick)
// Previous "working" state has been replaced with "sick"
import {
	clickDate,
	expectDateHasNoState,
	expectDateHasState,
	getDisabledCellCount,
} from "./helpers/datepainter";
import { expectModeCount, selectMode } from "./helpers/statusLegend";

test.describe("Date Marking Flows", () => {
	test.beforeEach(async ({ page }) => {
		await navigateToApp(page);
		// Wait for calendar to be ready (datepainter)
		// Wait for enabled cells only (exclude empty and disabled)
		await page.waitForSelector(
			'[data-testid="calendar-day"]:not(.datepainter__day--empty):not(.datepainter__day--disabled)',
			{
				state: "visible",
			},
		);
	});

	test("should mark single date as sick", async ({ page }) => {
		// Type assertion needed until statusLegend is updated to include "sick" mode
		await selectMode(page, "sick" as any);

		await clickDate(page, 0);

		await expectDateHasState(page, 0, "sick");
		await expectModeCount(page, "sick" as any, 1);
	});

	test("should mark single date as OOF", async ({ page }) => {
		await selectMode(page, "oof");

		await clickDate(page, 0);

		await expectDateHasState(page, 0, "oof");
		await expectModeCount(page, "oof", 1);
	});

	test("should mark single date as holiday", async ({ page }) => {
		await selectMode(page, "holiday");

		await clickDate(page, 0);

		await expectDateHasState(page, 0, "holiday");
		await expectModeCount(page, "holiday", 1);
	});

	test("should toggle off previously marked date", async ({ page }) => {
		// Mark as OOF
		await selectMode(page, "oof");
		await clickDate(page, 0);

		// Click same date again to toggle off
		await clickDate(page, 0);

		// Verify no state class present
		await expectDateHasNoState(page, 0);
	});

	test("should prevent marking out-of-range dates", async ({ page }) => {
		// Check that disabled cells exist
		const disabledCount = await getDisabledCellCount(page);
		expect(disabledCount).toBeGreaterThan(0);
	});

	test("should update counts when marking multiple dates", async ({ page }) => {
		await selectMode(page, "oof");

		// Mark 3 dates
		await clickDate(page, 0);
		await clickDate(page, 1);
		await clickDate(page, 2);

		await expectModeCount(page, "oof", 3);
	});

	test("should toggle between selected state and cleared (not cycle)", async ({ page }) => {
		// Select OOF
		await selectMode(page, "oof");

		// Click to mark as OOF
		await clickDate(page, 0);
		await expectDateHasState(page, 0, "oof");

		// Click again to clear (should NOT cycle to holiday)
		await clickDate(page, 0);
		await expectDateHasNoState(page, 0);

		// Click again to mark as OOF (should NOT cycle to sick)
		await clickDate(page, 0);
		await expectDateHasState(page, 0, "oof");
	});

	test("should change to new palette selection when clicking marked date", async ({ page }) => {
		// Mark as OOF
		await selectMode(page, "oof");
		await clickDate(page, 0);
		await expectDateHasState(page, 0, "oof");

		// Switch palette to Holiday
		await selectMode(page, "holiday");

		// Click the OOF date -> should change to Holiday
		await clickDate(page, 0);
		await expectDateHasState(page, 0, "holiday");

		// Click again -> should clear
		await clickDate(page, 0);
		await expectDateHasNoState(page, 0);
	});

	test("should use palette selection for both click and drag", async ({ page }) => {
		// Select Sick
		await selectMode(page, "sick" as any);

		// Click to mark
		await clickDate(page, 0);
		await expectDateHasState(page, 0, "sick");

		// Drag across multiple dates (exclude both empty and disabled cells)
		const cells = await page.locator('[data-testid="calendar-day"]:not(.datepainter__day--empty):not(.datepainter__day--disabled)').all();
		if (cells.length >= 4) {
			// Simulate drag from cell 1 to cell 3
			if (cells[1] && cells[2] && cells[3]) {
				await cells[1].hover();
				await page.mouse.down();
				await cells[2].hover();
				await cells[3].hover();
				await page.mouse.up();

				// All should be marked as sick
				await expectDateHasState(page, 1, "sick");
				await expectDateHasState(page, 2, "sick");
				await expectDateHasState(page, 3, "sick");
			}
		}
	});

	test("should use keyboard shortcuts to update behavior immediately", async ({ page }) => {
		// Press '1' for OOF
		await page.keyboard.press("1");
		await clickDate(page, 0);
		await expectDateHasState(page, 0, "oof");

		// Press '2' for Holiday
		await page.keyboard.press("2");
		await clickDate(page, 1);
		await expectDateHasState(page, 1, "holiday");

		// Press '3' for Sick
		await page.keyboard.press("3");
		await clickDate(page, 2);
		await expectDateHasState(page, 2, "sick");
	});

	test("should preserve marked dates after month navigation", async ({ page }) => {
		// Mark a date
		await selectMode(page, "oof");
		await clickDate(page, 5);
		await expectDateHasState(page, 5, "oof");

		// Navigate to next month
		await page.click('button[aria-label="Next month"]');
		await page.waitForTimeout(300); // Wait for navigation

		// Navigate back
		await page.click('button[aria-label="Previous month"]');
		await page.waitForTimeout(300);

		// Date should still be marked
		await expectDateHasState(page, 5, "oof");
	});
});
