/**
 * Test helpers for Settings Modal interactions
 */

import { expect, type Page } from "@playwright/test";

/**
 * Open the settings modal
 */
export async function openSettings(page: Page): Promise<void> {
	await page.waitForLoadState("networkidle");

	const settingsButton = page.locator("#settings-button");
	await settingsButton.waitFor({ state: "attached", timeout: 30000 });
	await settingsButton.click();
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
 * Check if settings modal is open
 */
export async function isSettingsOpen(page: Page): Promise<boolean> {
	const dialog = page.getByRole("dialog");
	return await dialog.isVisible().catch(() => false);
}
