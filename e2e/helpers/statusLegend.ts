/**
 * Test helpers for StatusLegend interactions
 * Updated for 3-state datepainter system (oof, holiday, sick)
 */

import { expect, type Page } from "@playwright/test";

export type MarkingMode = "oof" | "holiday" | "sick";

/**
 * Get the main StatusLegend (first one, not panel toggle copies)
 */
function getMainLegend(page: Page) {
	// The main legend is the first one in the calendar section
	return page.locator("#status-legend").first();
}

export async function selectMode(page: Page, mode: MarkingMode): Promise<void> {
	const legend = getMainLegend(page);
	const button = legend.locator(`[data-testid="mode-${mode}"]`);
	await button.waitFor({ state: "visible" });
	await button.scrollIntoViewIfNeeded();
	await button.click();
}

export async function expectModeActive(
	page: Page,
	mode: MarkingMode,
): Promise<void> {
	const legend = getMainLegend(page);
	const button = legend.locator(`[data-testid="mode-${mode}"]`);
	await expect(button).toHaveClass(/is-active/);
}

export async function getModeCounts(page: Page): Promise<{
	oof: number;
	holiday: number;
	sick: number;
}> {
	const legend = getMainLegend(page);
	const oofText = await legend.locator("#count-oof").textContent();
	const holidayText = await legend.locator("#count-holiday").textContent();
	const sickText = await legend.locator("#count-sick").textContent();

	return {
		oof: parseInt(oofText || "0", 10),
		holiday: parseInt(holidayText || "0", 10),
		sick: parseInt(sickText || "0", 10),
	};
}

export async function expectModeCount(
	page: Page,
	mode: "oof" | "holiday" | "sick",
	expected: number,
): Promise<void> {
	const legend = getMainLegend(page);
	const countEl = legend.locator(`#count-${mode}`);
	await expect(countEl).toHaveText(String(expected));
}
