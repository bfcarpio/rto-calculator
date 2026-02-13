/**
 * Test helpers for theme interactions
 */

import { expect, type Page } from "@playwright/test";

export type ThemeMode = "system" | "light" | "dark";

export async function openSettings(page: Page): Promise<void> {
	await page.getByTestId("settings-button").click();
	await expect(page.getByRole("dialog")).toBeVisible();
}

export async function closeSettings(page: Page): Promise<void> {
	const dialog = page.getByRole("dialog");
	await dialog.getByLabel("Close settings").click();
	await expect(dialog).not.toBeVisible();
}

export async function getCurrentTheme(page: Page): Promise<string> {
	const themeButton = page.locator("#theme-cycle-button");
	const label = await themeButton.locator("#theme-label").textContent();
	return label || "system";
}

export async function cycleTheme(page: Page): Promise<string> {
	const themeButton = page.locator("#theme-cycle-button");
	await themeButton.click();
	return getCurrentTheme(page);
}

export async function expectTheme(
	page: Page,
	expected: ThemeMode,
): Promise<void> {
	const current = await getCurrentTheme(page);
	expect(current.toLowerCase()).toBe(expected);
}

export async function isDarkModeActive(page: Page): Promise<boolean> {
	const body = page.locator("body");
	const classList = await body.getAttribute("class");
	return classList?.includes("dark-mode") || false;
}
