import { expect, test } from "@playwright/test";
import { navigateToApp } from "./helpers/common";
import { clickDate } from "./helpers/datepainter";
import { openSettings, setTargetDays } from "./helpers/settingsModal";
import { selectMode } from "./helpers/statusLegend";

test.describe("Validation Flows", () => {
	test.beforeEach(async ({ page }) => {
		await navigateToApp(page);
		await page.waitForSelector(
			'[data-testid="calendar-day"]:not(.datepainter__day--empty):not(.datepainter__day--disabled)',
			{ state: "visible" },
		);
	});

	test.describe("Compliance Status Display", () => {
		test("should show compliance status after marking dates", async ({
			page,
		}) => {
			await selectMode(page, "oof");
			await clickDate(page, 0);

			// Compliance status box should be visible and updated
			const statusBox = page.locator("#compliance-status-box");
			await expect(statusBox).toBeVisible();
		});

		test("should update compliance when marking sick days", async ({
			page,
		}) => {
			await selectMode(page, "sick");
			await clickDate(page, 0);
			await clickDate(page, 1);

			const statusMessage = page.locator("#compliance-status-message");
			await expect(statusMessage).toBeVisible();
		});
	});

	test.describe("Target Days Configuration", () => {
		test("should update compliance when target days changed", async ({
			page,
		}) => {
			// Mark 2 sick days
			await selectMode(page, "sick");
			await clickDate(page, 0);
			await clickDate(page, 1);

			// Open settings and change target
			await openSettings(page);
			await setTargetDays(page, 2);
			await page.keyboard.press("Escape");

			// Compliance status should be visible
			const statusBox = page.locator("#compliance-status-box");
			await expect(statusBox).toBeVisible();
		});

		test("should handle zero target days", async ({ page }) => {
			await openSettings(page);
			await setTargetDays(page, 0);
			await page.keyboard.press("Escape");

			// Any marking should still show compliance
			await selectMode(page, "oof");
			await clickDate(page, 0);

			const statusBox = page.locator("#compliance-status-box");
			await expect(statusBox).toBeVisible();
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

			// StatusLegend should show separate counts
			const legend = page.locator("#status-legend").first();
			const holidayCount = legend.locator("#count-holiday");
			await expect(holidayCount).toHaveText("1");
			const sickCount = legend.locator("#count-sick");
			await expect(sickCount).toHaveText("2");
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

			// StatusLegend should show counts
			const legend = page.locator("#status-legend").first();
			const oofCount = legend.locator("#count-oof");
			await expect(oofCount).toHaveText("1");

			const holidayCount = legend.locator("#count-holiday");
			await expect(holidayCount).toHaveText("1");

			const sickCount = legend.locator("#count-sick");
			await expect(sickCount).toHaveText("2");
		});
	});
});
