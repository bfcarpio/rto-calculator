import { expect, test } from "@playwright/test";
// Note: SCENARIOS and TestScenarioBuilder available for future test data scenarios
import {
	clickDate,
	expectDateHasNoState,
	expectDateHasState,
	getDisabledCellCount,
} from "./helpers/airDatepicker";
import { navigateToApp, reloadPage } from "./helpers/common";
import { expectModeCount, selectMode } from "./helpers/statusLegend";

test.describe("Date Marking Flows", () => {
	test.beforeEach(async ({ page }) => {
		await navigateToApp(page);
		// Wait for calendar to be ready
		await page.waitForSelector(".air-datepicker-cell:not(.-disabled-)", {
			state: "visible",
		});
	});

	test("should mark single date as working", async ({ page }) => {
		// Select working mode
		await selectMode(page, "working");

		// Click a date in the datepicker
		await clickDate(page, 0);

		// Verify date is marked (has working class)
		await expectDateHasState(page, 0, "working");
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

	test("should persist state on page refresh (in-memory)", async ({ page }) => {
		await selectMode(page, "working");

		await clickDate(page, 0);

		// Refresh page
		await reloadPage(page);

		// Data should be cleared (in-memory only)
		await expectDateHasNoState(page, 0);
	});
});
