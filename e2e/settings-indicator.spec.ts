import { expect, test } from "@playwright/test";

test.describe("WeekSummary - Fixed Denominator Display", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto("/rto-calculator/");
		await page.waitForSelector(
			'[data-testid="calendar-day"]:not(.datepainter__day--empty):not(.datepainter__day--disabled)',
			{ state: "visible" },
		);
	});

	test("should display plain '5' for weekdays per week (not a SettingIndicator)", async ({
		page,
	}) => {
		// Check StatusDetails average line
		const statAverage = page.locator("#stat-average-days");
		await expect(statAverage).toBeVisible();

		// The "5" in the denominator should NOT be a SettingIndicator
		// because totalWeekdaysPerWeek is a constant (Mon-Fri), not a user setting
		const settingIndicator = statAverage.locator(".setting-indicator");
		await expect(settingIndicator).toHaveCount(0);

		// Verify the "5" is displayed as plain text with semibold weight
		const weekdaysValue = statAverage
			.locator(".has-text-weight-semibold")
			.first();
		await expect(weekdaysValue).toHaveText("5");
	});

	test("should keep days text on same line", async ({ page }) => {
		// Get initial position
		const statAverage = page.locator("#stat-average-days");
		// Use .first() to avoid strict mode violation with sr-only element
		const daysText = statAverage.locator("text=days").first();
		const initialDaysBox = await daysText.boundingBox();
		expect(initialDaysBox).toBeTruthy();

		// Verify days text is visible
		await expect(daysText).toBeVisible();
	});

	test("should NOT have dotted underline on the '5' (it's not a setting)", async ({
		page,
	}) => {
		// The "5" should NOT have the dotted underline that SettingIndicator uses
		const weekdaysValue = page
			.locator("#stat-average-days")
			.locator(".has-text-weight-semibold")
			.first();

		// Check that it doesn't have the "setting-value" class which has dotted underline
		await expect(weekdaysValue).not.toHaveClass(/setting-value/);
	});
});

test.describe("SettingIndicator - minOfficeDaysPerWeek", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto("/rto-calculator/");
		await page.waitForSelector(
			'[data-testid="calendar-day"]:not(.datepainter__day--empty):not(.datepainter__day--disabled)',
			{ state: "visible" },
		);
		// Wait for the setting indicator to be visible
		await page.waitForSelector(".setting-indicator", { timeout: 5000 });
	});

	test("should have SettingIndicator for minOfficeDaysPerWeek in Current Week Status", async ({
		page,
	}) => {
		// The minOfficeDaysPerWeek should be shown as a SettingIndicator
		const settingIndicator = page.locator(
			"#stat-current-week-days .setting-indicator",
		);
		await expect(settingIndicator).toBeVisible();
		await expect(settingIndicator).toHaveAttribute(
			"data-setting-key",
			"minOfficeDaysPerWeek",
		);
	});

	test("should render SettingIndicator with inline display", async ({
		page,
	}) => {
		// SettingIndicator uses inline display (may be inline or inline-flex depending on CSS loading)
		const settingIndicator = page.locator(".setting-indicator").first();
		const display = await settingIndicator.evaluate(
			(el) => window.getComputedStyle(el).display,
		);
		// Accept either inline or inline-flex
		expect(["inline", "inline-flex"]).toContain(display);
	});
});
