/**
 * Test helpers for Settings Modal interactions
 */

import { expect, type Page } from "@playwright/test";

/**
 * Open the settings modal
 */
export async function openSettings(page: Page): Promise<void> {
	await page.getByTestId("settings-button").click();
	await expect(page.getByRole("dialog")).toBeVisible();
}

/**
 * Close the settings modal
 */
export async function closeSettings(page: Page): Promise<void> {
	const dialog = page.getByRole("dialog");
	await dialog.getByLabel("Close settings").click();
	await expect(dialog).not.toBeVisible();
}

/**
 * Change the target days setting
 */
export async function setTargetDays(page: Page, days: number): Promise<void> {
	const input = page.locator("#target-days-input");
	await input.fill(String(days));
	await input.blur();
}

/**
 * Get the current target days value
 */
export async function getTargetDays(page: Page): Promise<number> {
	const input = page.locator("#target-days-input");
	const value = await input.inputValue();
	return parseInt(value, 10);
}

/**
 * Select validation mode
 */
export async function selectValidationMode(
	page: Page,
	mode: "strict" | "average4" | "average12",
): Promise<void> {
	const radio = page.locator(`input[name="validationMode"][value="${mode}"]`);
	await radio.click();
}

/**
 * Get the currently selected validation mode
 */
export async function getSelectedValidationMode(page: Page): Promise<string> {
	const selected = page.locator('input[name="validationMode"]:checked');
	const value = await selected.getAttribute("value");
	return value ?? "strict";
}

/**
 * Check if settings modal is open
 */
export async function isSettingsOpen(page: Page): Promise<boolean> {
	const dialog = page.getByRole("dialog");
	return await dialog.isVisible().catch(() => false);
}
