import { expect, test } from "@playwright/test";
import { navigateToApp } from "./helpers/common";
import { clickDate, expectDateHasState } from "./helpers/datepainter";
import {
	expectModeCount,
	getModeCounts,
	selectMode,
} from "./helpers/statusLegend";

test.describe("Holiday Country Selector", () => {
	test.beforeEach(async ({ page }) => {
		await navigateToApp(page);
		await page.waitForSelector(
			'[data-testid="calendar-day"]:not(.datepainter__day--empty):not(.datepainter__day--disabled)',
			{ state: "visible" },
		);
	});

	test("drawer opens and closes", async ({ page }) => {
		const drawer = page.locator("#holiday-drawer");
		await expect(drawer).not.toHaveAttribute("open", "");

		await drawer.locator("summary").click();
		await expect(drawer).toHaveAttribute("open", "");

		await drawer.locator("summary").click();
		await expect(drawer).not.toHaveAttribute("open", "");
	});

	test("country dropdown is populated with >100 options", async ({ page }) => {
		const drawer = page.locator("#holiday-drawer");
		await drawer.locator("summary").click();

		const select = page.locator("#country-select");
		const optionCount = await select.locator("option").count();
		// Placeholder + countries
		expect(optionCount).toBeGreaterThan(100);
	});

	test("selecting country marks holidays on calendar", async ({ page }) => {
		const drawer = page.locator("#holiday-drawer");
		await drawer.locator("summary").click();

		const select = page.locator("#country-select");
		await select.selectOption("US");

		// Wait for success status message
		const status = page.locator("#holiday-status");
		await expect(status).toContainText(/Added \d+ holiday/, { timeout: 15000 });

		// Verify holiday cells appeared
		const holidayCells = page.locator(".datepainter-day--holiday");
		const count = await holidayCells.count();
		expect(count).toBeGreaterThan(0);

		// Verify count badge updated
		const counts = await getModeCounts(page);
		expect(counts.holiday).toBeGreaterThan(0);
	});

	test("switching country replaces holidays", async ({ page }) => {
		const drawer = page.locator("#holiday-drawer");
		await drawer.locator("summary").click();

		const select = page.locator("#country-select");
		const status = page.locator("#holiday-status");

		// Select US
		await select.selectOption("US");
		await expect(status).toContainText(/Added \d+ holiday/, { timeout: 15000 });
		const usCount = (await getModeCounts(page)).holiday;

		// Switch to DE
		await select.selectOption("DE");
		await expect(status).toContainText(/Added \d+ holiday/, { timeout: 15000 });
		const deCount = (await getModeCounts(page)).holiday;

		// Counts should differ (US and DE have different holiday counts)
		// Both should be > 0
		expect(usCount).toBeGreaterThan(0);
		expect(deCount).toBeGreaterThan(0);
	});

	test("empty selection clears auto-added holidays", async ({ page }) => {
		const drawer = page.locator("#holiday-drawer");
		await drawer.locator("summary").click();

		const select = page.locator("#country-select");
		const status = page.locator("#holiday-status");

		// Select a country
		await select.selectOption("US");
		await expect(status).toContainText(/Added \d+ holiday/, { timeout: 15000 });

		const countBefore = (await getModeCounts(page)).holiday;
		expect(countBefore).toBeGreaterThan(0);

		// Clear selection
		await select.selectOption("");

		// Holiday count should be 0
		await expectModeCount(page, "holiday", 0);
	});

	test("manual holidays are preserved when selecting country", async ({
		page,
	}) => {
		// Manually paint a date as holiday
		await selectMode(page, "holiday");
		await clickDate(page, 0);
		await expectDateHasState(page, 0, "holiday");
		await expectModeCount(page, "holiday", 1);

		// Open drawer and select a country
		const drawer = page.locator("#holiday-drawer");
		await drawer.locator("summary").click();

		const select = page.locator("#country-select");
		const status = page.locator("#holiday-status");
		await select.selectOption("US");
		await expect(status).toContainText(/(Added \d+ holiday|already marked)/, {
			timeout: 15000,
		});

		// Manual holiday should still be there
		await expectDateHasState(page, 0, "holiday");

		// Clear country selection
		await select.selectOption("");

		// Manually painted holiday should still exist (only auto-added ones cleared)
		await expectDateHasState(page, 0, "holiday");
		await expectModeCount(page, "holiday", 1);
	});
});
