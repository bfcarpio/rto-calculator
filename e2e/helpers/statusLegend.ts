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
	const oofText = await legend.getByTestId("mode-oof").textContent();
	const holidayText = await legend.getByTestId("mode-holiday").textContent();
	const sickText = await legend.getByTestId("mode-sick").textContent();

	// Extract numbers from text like "OOF: 3"
	const extractCount = (text: string | null): number => {
		if (!text) return 0;
		const match = text.match(/(\d+)/);
		return match?.[1] ? parseInt(match[1], 10) : 0;
	};

	return {
		oof: extractCount(oofText),
		holiday: extractCount(holidayText),
		sick: extractCount(sickText),
	};
}

export async function expectModeCount(
	page: Page,
	mode: "oof" | "holiday" | "sick",
	expected: number,
): Promise<void> {
	const counts = await getModeCounts(page);
	expect(counts[mode]).toBe(expected);
}
