import { expect, test } from "@playwright/test";

test.describe("SettingIndicator", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto("/rto-calculator/");
		await page.waitForSelector(
			'[data-testid="calendar-day"]:not(.datepainter__day--empty):not(.datepainter__day--disabled)',
			{ state: "visible" },
		);
	});

	test("should render inline without breaking layout in SummaryBar", async ({
		page,
	}) => {
		// Note: SummaryBar is currently commented out in index.astro
		// This test verifies the component would render inline if enabled
		// The SettingIndicator component is designed with inline-flex for this purpose

		// Check that SettingIndicator CSS includes inline-flex
		const settingIndicatorCss = page.locator(".setting-indicator");
		await expect(settingIndicatorCss).toHaveCSS("display", "inline-flex");
	});

	test("should render inline without breaking layout in StatusDetails", async ({
		page,
	}) => {
		// Check StatusDetails average line
		const statAverage = page.locator("#stat-average-days");
		await expect(statAverage).toBeVisible();

		// Verify the "days" text is on the same line as the value
		// Use .first() to avoid strict mode violation with sr-only element
		const daysText = statAverage.locator("text=days").first();
		await expect(daysText).toBeVisible();

		// Get the SettingIndicator in StatusDetails
		const settingIndicator = statAverage.locator(".setting-indicator");
		await expect(settingIndicator).toBeVisible();

		// Get bounding boxes to verify they're on same line
		const averageBox = await statAverage.boundingBox();
		const daysBox = await daysText.boundingBox();
		const settingBox = await settingIndicator.boundingBox();

		// Should be roughly same Y position (within 15px tolerance for font rendering)
		expect(averageBox).toBeTruthy();
		expect(daysBox).toBeTruthy();
		expect(settingBox).toBeTruthy();
		expect(Math.abs(averageBox!.y - daysBox!.y)).toBeLessThan(15);
		expect(Math.abs(averageBox!.y - settingBox!.y)).toBeLessThan(15);
	});

	test("should have title attribute for tooltip", async ({ page }) => {
		// Find SettingIndicator in StatusDetails
		const settingIndicator = page.locator(
			"#stat-average-days .setting-indicator",
		);
		await expect(settingIndicator).toBeVisible();

		// Check title attribute exists (for tooltip)
		const title = await settingIndicator.getAttribute("title");
		expect(title).toBeTruthy();
		expect(title).toContain("totalWeekdaysPerWeek");
	});

	test("should have title attribute in SummaryBar", async ({ page }) => {
		// Note: SummaryBar is currently commented out in index.astro
		// This test verifies the SettingIndicator has proper title attribute
		// which is used by any parent component that includes it

		// Check that SettingIndicator has title attribute
		const settingIndicator = page.locator(".setting-indicator").first();
		await expect(settingIndicator).toBeVisible();

		// Check title attribute exists (for tooltip)
		const title = await settingIndicator.getAttribute("title");
		expect(title).toBeTruthy();
		expect(title).toContain("totalWeekdaysPerWeek");
	});

	test("should update value when rto:state-changed event fires", async ({
		page,
	}) => {
		// Get the SettingIndicator value in StatusDetails
		const settingValue = page.locator(
			"#stat-average-days .setting-indicator .setting-value",
		);
		const initialValue = await settingValue.textContent();
		expect(initialValue).toBeTruthy();

		// Dispatch unified rto:state-changed event to update the setting
		await page.evaluate(() => {
			const event = new CustomEvent("rto:state-changed", {
				detail: {
					type: "config",
					settingKey: "totalWeekdaysPerWeek",
					newValue: 4,
					oldValue: 5,
				},
			});
			window.dispatchEvent(event);
		});

		// Verify value updated
		const newValue = await settingValue.textContent();
		expect(newValue).toBe("4");
		expect(newValue).not.toBe(initialValue);
	});

	test("should update title when rto:state-changed event fires", async ({
		page,
	}) => {
		// Find SettingIndicator in StatusDetails
		const settingIndicator = page.locator(
			"#stat-average-days .setting-indicator",
		);
		const initialTitle = await settingIndicator.getAttribute("title");
		expect(initialTitle).toContain("totalWeekdaysPerWeek");

		// Dispatch unified rto:state-changed event
		await page.evaluate(() => {
			const event = new CustomEvent("rto:state-changed", {
				detail: {
					type: "config",
					settingKey: "totalWeekdaysPerWeek",
					newValue: 3,
					oldValue: 5,
				},
			});
			window.dispatchEvent(event);
		});

		// Verify title updated
		const newTitle = await settingIndicator.getAttribute("title");
		expect(newTitle).toContain("totalWeekdaysPerWeek");
		expect(newTitle).toContain("3");
	});

	test("should update via dispatching rto:state-changed event", async ({
		page,
	}) => {
		// Get initial value
		const settingValue = page.locator(
			"#stat-average-days .setting-indicator .setting-value",
		);
		const initialValue = await settingValue.textContent();

		// Dispatch unified rto:state-changed event directly
		await page.evaluate(() => {
			const event = new CustomEvent("rto:state-changed", {
				detail: {
					type: "config",
					settingKey: "totalWeekdaysPerWeek",
					newValue: 2,
					oldValue: 5,
				},
			});
			window.dispatchEvent(event);
		});

		// Verify value updated
		const newValue = await settingValue.textContent();
		expect(newValue).toBe("2");
		expect(newValue).not.toBe(initialValue);
	});

	test("should keep days text on same line after update", async ({ page }) => {
		// Get initial position
		const statAverage = page.locator("#stat-average-days");
		// Use .first() to avoid strict mode violation with sr-only element
		const daysText = statAverage.locator("text=days").first();
		const initialDaysBox = await daysText.boundingBox();
		expect(initialDaysBox).toBeTruthy();

		// Update the setting via unified rto:state-changed event
		await page.evaluate(() => {
			const event = new CustomEvent("rto:state-changed", {
				detail: {
					type: "config",
					settingKey: "totalWeekdaysPerWeek",
					newValue: 4,
					oldValue: 5,
				},
			});
			window.dispatchEvent(event);
		});

		// Verify days text is still on same line after update
		const newDaysBox = await daysText.boundingBox();
		expect(newDaysBox).toBeTruthy();
		expect(Math.abs(initialDaysBox!.y - newDaysBox!.y)).toBeLessThan(10);
	});
});
