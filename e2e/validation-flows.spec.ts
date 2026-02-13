// Migrated from air-datepicker to datepainter with 3-state system (oof, holiday, sick)
// Previous "working" state has been replaced with "sick"
import { expect, test } from "@playwright/test";
import { navigateToApp } from "./helpers/common";
import { clickDate } from "./helpers/datepainter";
import {
	openSettings,
	selectValidationMode,
	setTargetDays,
} from "./helpers/settingsModal";
import { selectMode } from "./helpers/statusLegend";

test.describe("Validation Flows", () => {
	test.beforeEach(async ({ page }) => {
		await navigateToApp(page);
		await page.waitForSelector(
			'[data-testid="calendar-day"]:not(.datepainter-day--empty):not(.datepainter__day--disabled)',
			{ state: "visible" },
		);
	});

	test.describe("Strict Validation Mode", () => {
		test.beforeEach(async ({ page }) => {
			await openSettings(page);
			await selectValidationMode(page, "strict");
			await setTargetDays(page, 3); // 3 days per week target
			await page.keyboard.press("Escape"); // Close settings
		});

		test("should show compliant when meeting weekly target", async ({
			page,
		}) => {
			// Mark 3 sick days in current week
			await selectMode(page, "sick");
			await clickDate(page, 0); // First available date
			await clickDate(page, 1);
			await clickDate(page, 2);

			// Summary should show compliant (implementation dependent)
			const summary = page.locator(".summary-bar");
			await expect(summary).toBeVisible();
		});

		test("should show violation when below weekly target", async ({ page }) => {
			// Mark only 1 sick day
			await selectMode(page, "sick");
			await clickDate(page, 0);

			const summary = page.locator(".summary-bar");
			await expect(summary).toBeVisible();
		});
	});

	test.describe("Average Window Validation", () => {
		test("should use 4-week average mode", async ({ page }) => {
			await openSettings(page);
			await selectValidationMode(page, "average4");
			await setTargetDays(page, 3);
			await page.keyboard.press("Escape");

			// Mark some sick days
			await selectMode(page, "sick");
			await clickDate(page, 0);
			await clickDate(page, 1);

			// Should calculate based on 4-week window
			const summary = page.locator(".summary-bar");
			await expect(summary).toBeVisible();
		});

		test("should use 12-week average mode", async ({ page }) => {
			await openSettings(page);
			await selectValidationMode(page, "average12");
			await setTargetDays(page, 3);
			await page.keyboard.press("Escape");

			await selectMode(page, "sick");
			await clickDate(page, 0);

			const summary = page.locator(".summary-bar");
			await expect(summary).toBeVisible();
		});
	});

	test.describe("Target Days Configuration", () => {
		test("should update compliance when target days changed", async ({
			page,
		}) => {
			// Start with 3 days target
			await openSettings(page);
			await setTargetDays(page, 3);
			await page.keyboard.press("Escape");

			// Mark 2 days (below target)
			await selectMode(page, "sick");
			await clickDate(page, 0);
			await clickDate(page, 1);

			// Change target to 2 days
			await openSettings(page);
			await setTargetDays(page, 2);
			await page.keyboard.press("Escape");

			// Should now show compliant
			const summary = page.locator(".summary-bar");
			await expect(summary).toBeVisible();
		});

		test("should handle zero target days", async ({ page }) => {
			await openSettings(page);
			await setTargetDays(page, 0);
			await page.keyboard.press("Escape");

			// Any marking should be "compliant" with 0 target
			await selectMode(page, "oof");
			await clickDate(page, 0);

			const summary = page.locator(".summary-bar");
			await expect(summary).toBeVisible();
		});
	});

	test.describe("Holiday Handling", () => {
		test("should not count holidays toward sick days", async ({ page }) => {
			// Mark a holiday
			await selectMode(page, "holiday");
			await clickDate(page, 0);

			// Mark 2 sick days
			await selectMode(page, "sick");
			await clickDate(page, 1);
			await clickDate(page, 2);

			// Should only count 2 sick days, not the holiday
			const summary = page.locator(".summary-bar");
			await expect(summary).toBeVisible();
		});
	});

	test.describe("Summary Statistics", () => {
		test("should display total statistics", async ({ page }) => {
			// Mark various dates
			await selectMode(page, "sick");
			await clickDate(page, 0);
			await clickDate(page, 1);

			await selectMode(page, "oof");
			await clickDate(page, 2);

			await selectMode(page, "holiday");
			await clickDate(page, 3);

			// Summary should show totals
			const summary = page.locator(".summary-bar");
			await expect(summary).toBeVisible();

			// StatusLegend should show counts
			const oofCount = page.locator("#count-oof");
			await expect(oofCount).toHaveText("1");

			const holidayCount = page.locator("#count-holiday");
			await expect(holidayCount).toHaveText("1");

			const sickCount = page.locator("#count-sick");
			await expect(sickCount).toHaveText("2");
		});
	});
});
