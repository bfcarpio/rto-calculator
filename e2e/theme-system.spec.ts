import { expect, test } from "@playwright/test";
import { openSettings } from "./helpers/settingsModal";

test.describe("Theme System", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto("/rto-calculator");
	});

	test("should open settings via gear button", async ({ page }) => {
		await openSettings(page);
		await expect(page.locator(".settings-modal")).toBeVisible();
	});

	test("should have color scheme dropdown in settings", async ({ page }) => {
		await openSettings(page);

		// Check for color scheme dropdown
		const colorSchemeSelect = page.locator("#color-scheme-select");
		await expect(colorSchemeSelect).toBeVisible();

		// Check all 6 options exist (options exist in DOM even when dropdown is closed)
		await expect(
			colorSchemeSelect.locator("option[value='tol-bright-light']"),
		).toBeAttached();
		await expect(
			colorSchemeSelect.locator("option[value='tol-bright-dark']"),
		).toBeAttached();
		await expect(
			colorSchemeSelect.locator("option[value='tol-vibrant-light']"),
		).toBeAttached();
		await expect(
			colorSchemeSelect.locator("option[value='tol-vibrant-dark']"),
		).toBeAttached();
		await expect(
			colorSchemeSelect.locator("option[value='tol-muted-light']"),
		).toBeAttached();
		await expect(
			colorSchemeSelect.locator("option[value='tol-muted-light']"),
		).toBeAttached();
	});

	test("should apply tol-bright-light palette", async ({ page }) => {
		await openSettings(page);

		const select = page.locator("#color-scheme-select");
		await select.selectOption("tol-bright-light");

		// Verify data-palette attribute is set on body
		await expect(page.locator("body")).toHaveAttribute(
			"data-palette",
			"tol-bright",
		);
	});

	test("should apply tol-muted-light palette", async ({ page }) => {
		await openSettings(page);

		const select = page.locator("#color-scheme-select");
		await select.selectOption("tol-muted-light");

		// Verify data-palette attribute is set on body
		await expect(page.locator("body")).toHaveAttribute(
			"data-palette",
			"tol-muted",
		);
		// Verify light mode (no dark-mode class)
		await expect(page.locator("body")).not.toHaveClass(/dark-mode/);
	});

	test("should persist color scheme selection", async ({ page }) => {
		// Select a color scheme
		await openSettings(page);
		const select = page.locator("#color-scheme-select");
		await select.selectOption("tol-vibrant-dark");

		// Close settings (press escape)
		await page.keyboard.press("Escape");

		// Reload page
		await page.reload();

		// Verify selection persisted
		await openSettings(page);
		await expect(select).toHaveValue("tol-vibrant-dark");
	});
});
