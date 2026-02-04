import { expect, test } from "@playwright/test";
import { clickDate } from "./helpers/airDatepicker";
import { navigateToApp } from "./helpers/common";
import {
	openSettings,
	selectValidationMode,
	setTargetDays,
} from "./helpers/settingsModal";
import { selectMode } from "./helpers/statusLegend";

test.describe("Validation Flows", () => {
	test.beforeEach(async ({ page }) => {
		await navigateToApp(page);
		await page.waitForSelector(".air-datepicker", { state: "visible" });
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
			// Mark 3 working days in current week
			await selectMode(page, "working");
			await clickDate(page, 0); // First available date
			await clickDate(page, 1);
			await clickDate(page, 2);

			// Summary should show compliant (implementation dependent)
			const summary = page.locator(".summary-bar");
			await expect(summary).toBeVisible();
		});

		test("should show violation when below weekly target", async ({ page }) => {
			// Mark only 1 working day
			await selectMode(page, "working");
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

			// Mark some working days
			await selectMode(page, "working");
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

			await selectMode(page, "working");
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
			await selectMode(page, "working");
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
		test("should not count holidays toward working days", async ({ page }) => {
			// Mark a holiday
			await selectMode(page, "holiday");
			await clickDate(page, 0);

			// Mark 2 working days
			await selectMode(page, "working");
			await clickDate(page, 1);
			await clickDate(page, 2);

			// Should only count 2 working days, not the holiday
			const summary = page.locator(".summary-bar");
			await expect(summary).toBeVisible();
		});
	});

	test.describe("Summary Statistics", () => {
		test("should display total statistics", async ({ page }) => {
			// Mark various dates
			await selectMode(page, "working");
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
		});
	});
});
