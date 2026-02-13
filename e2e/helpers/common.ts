/**
 * Common test helpers for page setup and navigation
 */

import type { Page } from "@playwright/test";

export const BASE_URL = "/rto-calculator/";

/**
 * Navigate to the app
 */
export async function navigateToApp(page: Page): Promise<void> {
	await page.goto(BASE_URL);
}

/**
 * Wait for the app to be fully loaded
 */
export async function waitForAppLoad(page: Page): Promise<void> {
	await page.waitForSelector(".air-datepicker", { state: "visible" });
	await page.waitForSelector("#status-legend", { state: "visible" });
}

/**
 * Reload the page
 */
export async function reloadPage(page: Page): Promise<void> {
	await page.reload();
	await waitForAppLoad(page);
}

/**
 * Check if we're on mobile viewport
 */
export function isMobileViewport(page: Page): boolean {
	const viewport = page.viewportSize();
	return viewport ? viewport.width < 768 : false;
}

/**
 * Check if we're on tablet viewport
 */
export function isTabletViewport(page: Page): boolean {
	const viewport = page.viewportSize();
	return viewport ? viewport.width >= 768 && viewport.width < 1024 : false;
}

/**
 * Check if we're on desktop viewport
 */
export function isDesktopViewport(page: Page): boolean {
	const viewport = page.viewportSize();
	return viewport ? viewport.width >= 1024 : false;
}
