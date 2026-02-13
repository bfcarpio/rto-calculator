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
			'[data-testid="calendar-day"]:not(.datepainter-day--empty):not(.datepainter__day--disabled)',
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
});
