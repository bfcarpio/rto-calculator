/**
 * Test helpers for StatusLegend interactions
 */

import { expect, type Page } from "@playwright/test";

export type MarkingMode = "working" | "oof" | "holiday";

export async function selectMode(page: Page, mode: MarkingMode): Promise<void> {
	const button = page.getByTestId(`mode-${mode}`);
	await button.click();
}

export async function expectModeActive(
	page: Page,
	mode: MarkingMode,
): Promise<void> {
	const button = page.getByTestId(`mode-${mode}`);
	await expect(button).toHaveClass(/is-active/);
}

export async function getModeCounts(page: Page): Promise<{
	working: number;
	oof: number;
	holiday: number;
}> {
	const oofText = await page.getByTestId("mode-oof").textContent();
	const holidayText = await page.getByTestId("mode-holiday").textContent();

	// Extract numbers from text like "OOF: 3"
	const extractCount = (text: string | null): number => {
		if (!text) return 0;
		const match = text.match(/(\d+)/);
		return match && match[1] ? parseInt(match[1], 10) : 0;
	};

	return {
		working: 0, // Working has no counter
		oof: extractCount(oofText),
		holiday: extractCount(holidayText),
	};
}

export async function expectModeCount(
	page: Page,
	mode: "oof" | "holiday",
	expected: number,
): Promise<void> {
	const counts = await getModeCounts(page);
	expect(counts[mode]).toBe(expected);
}
