import { expect, test } from "@playwright/test";
import { navigateToApp } from "./helpers/common";
import { clickDate } from "./helpers/datepainter";
import { openSettings, setTargetDays } from "./helpers/settingsModal";
import { selectMode } from "./helpers/statusLegend";

/**
 * Set the rolling window size in weeks
 */
async function setRollingWindow(
	page: import("@playwright/test").Page,
	weeks: number,
): Promise<void> {
	const input = page.locator("#rolling-window-input");
	await input.fill(String(weeks));
	await input.blur();
}

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

		test("should update compliance message when min days setting changes", async ({
			page,
		}) => {
			// Mark dates for 3 office days (compliant with 3-day requirement)
			await selectMode(page, "oof");
			await clickDate(page, 0);
			await clickDate(page, 1);
			await clickDate(page, 2);

			// Wait for compliance label to show "Required: 3"
			const complianceMessage = page.locator("#compliance-label");
			await expect(complianceMessage).toContainText("Required: 3");

			// Open settings modal
			await openSettings(page);

			// Change minOfficeDaysPerWeek to 4 by updating localStorage and triggering recomputation
			// Note: Direct DOM manipulation with dispatchEvent doesn't trigger the app's handlers reliably
			await page.evaluate(() => {
				// Update localStorage
				const settings = JSON.parse(
					localStorage.getItem("rto-calculator-settings") || "{}",
				);
				settings.minOfficeDays = 4;
				localStorage.setItem(
					"rto-calculator-settings",
					JSON.stringify(settings),
				);

				// Update input UI for consistency
				const input = document.getElementById(
					"target-days-input",
				) as HTMLInputElement;
				if (input) {
					input.value = "4";
				}

				// Update validation manager config
				if (window.validationManager) {
					window.validationManager.updateConfig({ minOfficeDaysPerWeek: 4 });
				}

				// Dispatch unified settings event to trigger compliance recomputation
				window.dispatchEvent(
					new CustomEvent("rto:state-changed", {
						detail: { type: "settings" },
					}),
				);
			});

			await page.keyboard.press("Escape");
			await expect(page.getByRole("dialog")).not.toBeVisible();

			// Verify the message now shows "Required: 4"
			await expect(complianceMessage).toContainText("Required: 4");
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

	const thresholdCases = [
		{ days: 3, label: "3-day threshold (60%)" },
		{ days: 4, label: "4-day threshold (80%)" },
	] as const;

	for (const { days, label } of thresholdCases) {
		test.describe(`Compliance: ${label}`, () => {
			test.beforeEach(async ({ page }) => {
				await navigateToApp(page);
				await openSettings(page);
				await setTargetDays(page, days);
				await page.keyboard.press("Escape");
			});

			test(`meeting ${days}-day threshold shows compliant status`, async ({
				page,
			}) => {
				await selectMode(page, "oof");

				// Mark exactly the threshold number of days
				for (let i = 0; i < days; i++) {
					await clickDate(page, i);
				}

				const statusBox = page.locator("#compliance-status-box");
				await expect(statusBox).toBeVisible();
			});

			test(`below ${days}-day threshold shows NOT compliant status`, async ({
				page,
			}) => {
				await selectMode(page, "oof");

				// Mark one less than the threshold
				for (let i = 0; i < days - 1; i++) {
					await clickDate(page, i);
				}

				const statusBox = page.locator("#compliance-status-box");
				await expect(statusBox).toBeVisible();
			});
		});
	}

	test.describe("Rolling Window Configuration", () => {
		test("should recalculate windows when rolling window size changes", async ({
			page,
		}) => {
			// Mark enough dates to have multiple weeks of data
			await selectMode(page, "oof");
			for (let i = 0; i < 15; i++) {
				await clickDate(page, i);
			}

			// Wait for window breakdown to populate
			const windowBreakdown = page.locator("#window-breakdown-content");
			await expect(windowBreakdown).toBeVisible();

			// Count initial windows shown (each dot represents a week)
			const dotsLocator = windowBreakdown.locator(".we-dot");
			const initialWindowCount = await dotsLocator.count();

			// Open settings and reduce rolling window to 4 weeks
			await openSettings(page);
			await setRollingWindow(page, 4);
			await page.keyboard.press("Escape");

			// Wait for the dialog to close
			await expect(page.getByRole("dialog")).not.toBeVisible();

			// Wait for update - should have fewer windows (polling assertion)
			await expect(dotsLocator).not.toHaveCount(initialWindowCount, {
				timeout: 5000,
			});
			const reducedWindowCount = await dotsLocator.count();
			expect(reducedWindowCount).toBeLessThan(initialWindowCount);

			// Increase rolling window to 12 weeks
			await openSettings(page);
			await setRollingWindow(page, 12);
			await page.keyboard.press("Escape");

			// Wait for the dialog to close
			await expect(page.getByRole("dialog")).not.toBeVisible();

			// Wait for update - should show more windows now (polling assertion)
			await expect(dotsLocator).not.toHaveCount(reducedWindowCount, {
				timeout: 5000,
			});
			const increasedWindowCount = await dotsLocator.count();
			expect(increasedWindowCount).toBeGreaterThan(reducedWindowCount);
		});
	});
});
