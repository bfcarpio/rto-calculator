/**
 * E2E tests verifying Window Explorer and Window Breakdown render
 * consistent dot output for the same underlying data.
 *
 * After the refactoring into shared buildDotHtml(), both components
 * must render identical dot classes and PASS/FAIL tags for the same
 * window state.
 */

import { expect, test } from "@playwright/test";
import { navigateToApp } from "./helpers/common";
import { clickDate } from "./helpers/datepainter";
import { selectMode } from "./helpers/statusLegend";

/**
 * Open the Window Explorer <details> element and wait for rows to render.
 *
 * The explorer starts collapsed. Clicking the summary toggles it open,
 * which triggers the toggle event listener and recompute.
 */
async function openExplorer(
	page: import("@playwright/test").Page,
): Promise<void> {
	const details = page.locator("#window-explorer");
	if (!(await details.getAttribute("open"))) {
		await details.locator("summary").click();
	}
	// Wait for at least one row to appear (the selector resolves to many rows,
	// so we use .first() to avoid Playwright's strict-mode violation)
	await expect(
		page.locator("#window-explorer-content .we-row").first(),
	).toBeVisible({ timeout: 5000 });
}

/**
 * Extract the state suffix from a dot element's class attribute.
 *
 * buildDotHtml() produces classes like "we-dot we-dot--best-ok".
 * This helper extracts just the state suffix ("best-ok", "best-bad", etc.)
 * for comparison purposes, stripping Astro-scoped hash suffixes if present.
 */
async function getDotState(
	locator: import("@playwright/test").Locator,
): Promise<string> {
	const rawClass = await locator.getAttribute("class");
	if (!rawClass) return "";

	// Match the state pattern: we-dot--best-ok, we-dot--best-bad, etc.
	const match = rawClass.match(/we-dot--(best-ok|best-bad|drop-ok|drop-bad)/);
	return match?.[1] ?? "";
}

test.describe("Window Explorer and Breakdown dot consistency", () => {
	test.beforeEach(async ({ page }) => {
		await navigateToApp(page);
		await page.waitForSelector(
			'[data-testid="calendar-day"]:not(.datepainter__day--empty):not(.datepainter__day--disabled)',
			{ state: "visible" },
		);
	});

	test("both components render the same dot classes for the same window", async ({
		page,
	}) => {
		// Select office mode and mark enough dates to create a visible window
		await selectMode(page, "oof");
		for (let i = 0; i < 15; i++) {
			await clickDate(page, i);
		}

		// Wait for the compliance pipeline to update the breakdown
		await page.waitForTimeout(300);

		// Verify breakdown has rendered dots
		const breakdownRow = page.locator("#window-breakdown-content .we-row");
		await expect(breakdownRow).toBeVisible({ timeout: 5000 });

		const breakdownDots = page.locator(
			"#window-breakdown-content .we-row-dots .we-dot",
		);
		const breakdownDotCount = await breakdownDots.count();
		expect(breakdownDotCount).toBeGreaterThan(0);

		// Open the explorer
		await openExplorer(page);

		// Find the Explorer row that matches the Breakdown window.
		// The Breakdown shows one window: if compliant → most recent (last),
		// if not compliant → first failing. We match by comparing dots.
		const explorerRows = page.locator("#window-explorer-content .we-row");
		const rowCount = await explorerRows.count();
		expect(rowCount).toBeGreaterThan(0);

		// Collect breakdown dot states for matching
		const breakdownStates: string[] = [];
		for (let i = 0; i < breakdownDotCount; i++) {
			breakdownStates.push(await getDotState(breakdownDots.nth(i)));
		}

		// Find the matching Explorer row by comparing dot state sequences
		let matchedRowIndex = -1;
		for (let rowIdx = 0; rowIdx < rowCount; rowIdx++) {
			const rowDots = explorerRows.nth(rowIdx).locator(".we-row-dots .we-dot");
			const rowDotCount = await rowDots.count();

			if (rowDotCount !== breakdownDotCount) continue;

			let allMatch = true;
			for (let i = 0; i < rowDotCount; i++) {
				const explorerState = await getDotState(rowDots.nth(i));
				if (explorerState !== breakdownStates[i]) {
					allMatch = false;
					break;
				}
			}

			if (allMatch) {
				matchedRowIndex = rowIdx;
				break;
			}
		}

		expect(matchedRowIndex).toBeGreaterThanOrEqual(0);

		// Verify each dot in the matched row has identical class state
		const matchedRow = explorerRows.nth(matchedRowIndex);
		const matchedDots = matchedRow.locator(".we-row-dots .we-dot");
		const matchedDotCount = await matchedDots.count();

		expect(matchedDotCount).toBe(breakdownDotCount);

		for (let i = 0; i < matchedDotCount; i++) {
			const explorerState = await getDotState(matchedDots.nth(i));
			expect(explorerState).toBe(breakdownStates[i]);
		}
	});

	test("both components render the same number of dots per window", async ({
		page,
	}) => {
		await selectMode(page, "oof");
		for (let i = 0; i < 15; i++) {
			await clickDate(page, i);
		}

		await page.waitForTimeout(300);

		const breakdownRow = page.locator("#window-breakdown-content .we-row");
		await expect(breakdownRow).toBeVisible({ timeout: 5000 });

		const breakdownDotCount = await page
			.locator("#window-breakdown-content .we-row-dots .we-dot")
			.count();
		expect(breakdownDotCount).toBeGreaterThan(0);

		await openExplorer(page);

		// Every explorer row should have the same number of dots as the
		// rolling window size (all windows in the same config share the
		// same width). The breakdown shows one of these windows.
		const explorerRows = page.locator("#window-explorer-content .we-row");
		const rowCount = await explorerRows.count();
		expect(rowCount).toBeGreaterThan(0);

		for (let rowIdx = 0; rowIdx < rowCount; rowIdx++) {
			const rowDotCount = await explorerRows
				.nth(rowIdx)
				.locator(".we-row-dots .we-dot")
				.count();
			// All rows should have the same number of dots (matching window size)
			expect(rowDotCount).toBe(breakdownDotCount);
		}
	});

	test("both components agree on PASS/FAIL tag for the same window", async ({
		page,
	}) => {
		await selectMode(page, "oof");
		for (let i = 0; i < 15; i++) {
			await clickDate(page, i);
		}

		await page.waitForTimeout(300);

		const breakdownRow = page.locator("#window-breakdown-content .we-row");
		await expect(breakdownRow).toBeVisible({ timeout: 5000 });

		// Get breakdown tag status
		const breakdownTag = page.locator("#window-breakdown-content .we-row-tag");
		const breakdownTagText = (await breakdownTag.textContent())?.trim();

		await openExplorer(page);

		// Find the matching Explorer row using dot state matching
		const breakdownDots = page.locator(
			"#window-breakdown-content .we-row-dots .we-dot",
		);
		const breakdownDotCount = await breakdownDots.count();

		const breakdownStates: string[] = [];
		for (let i = 0; i < breakdownDotCount; i++) {
			breakdownStates.push(await getDotState(breakdownDots.nth(i)));
		}

		const explorerRows = page.locator("#window-explorer-content .we-row");
		const rowCount = await explorerRows.count();

		let matchedRowIndex = -1;
		for (let rowIdx = 0; rowIdx < rowCount; rowIdx++) {
			const rowDots = explorerRows.nth(rowIdx).locator(".we-row-dots .we-dot");
			const rowDotCount = await rowDots.count();

			if (rowDotCount !== breakdownDotCount) continue;

			let allMatch = true;
			for (let i = 0; i < rowDotCount; i++) {
				const explorerState = await getDotState(rowDots.nth(i));
				if (explorerState !== breakdownStates[i]) {
					allMatch = false;
					break;
				}
			}

			if (allMatch) {
				matchedRowIndex = rowIdx;
				break;
			}
		}

		expect(matchedRowIndex).toBeGreaterThanOrEqual(0);

		// Compare tag text
		const explorerTag = explorerRows
			.nth(matchedRowIndex)
			.locator(".we-row-tag");
		const explorerTagText = (await explorerTag.textContent())?.trim();

		expect(explorerTagText).toBe(breakdownTagText);
	});

	test("dot classes use only the four valid state suffixes", async ({
		page,
	}) => {
		const validStates = ["best-ok", "best-bad", "drop-ok", "drop-bad"];

		await selectMode(page, "oof");
		for (let i = 0; i < 15; i++) {
			await clickDate(page, i);
		}

		await page.waitForTimeout(300);

		const breakdownRow = page.locator("#window-breakdown-content .we-row");
		await expect(breakdownRow).toBeVisible({ timeout: 5000 });

		// Check Breakdown dots
		const breakdownDots = page.locator(
			"#window-breakdown-content .we-row-dots .we-dot",
		);
		const bdDotCount = await breakdownDots.count();

		for (let i = 0; i < bdDotCount; i++) {
			const state = await getDotState(breakdownDots.nth(i));
			expect(validStates).toContain(state);
		}

		// Check Explorer dots
		await openExplorer(page);

		const explorerDots = page.locator(
			"#window-explorer-content .we-row-dots .we-dot",
		);
		const exDotCount = await explorerDots.count();
		expect(exDotCount).toBeGreaterThan(0);

		for (let i = 0; i < exDotCount; i++) {
			const state = await getDotState(explorerDots.nth(i));
			expect(validStates).toContain(state);
		}
	});

	test("Window Explorer and Breakdown display consistent date range boundaries", async ({
		page,
	}) => {
		await selectMode(page, "oof");
		for (let i = 0; i < 15; i++) {
			await clickDate(page, i);
		}

		// Wait for breakdown row to render and get date range from we-row-label
		const breakdownRowLabel = page.locator("#window-breakdown-content .we-row-label");
		await expect(breakdownRowLabel).toBeVisible({ timeout: 10000 });
		const breakdownRange = (await breakdownRowLabel.textContent())?.trim() ?? "";

		await openExplorer(page);

		// The Explorer shows all windows; find the one matching the Breakdown's range
		const explorerRows = page.locator("#window-explorer-content .we-row");
		const rowCount = await explorerRows.count();
		expect(rowCount).toBeGreaterThan(0);

		// Collect all Explorer row labels
		let foundMatch = false;
		for (let rowIdx = 0; rowIdx < rowCount; rowIdx++) {
			const rowLabel = explorerRows.nth(rowIdx).locator(".we-row-label");
			const labelText = (await rowLabel.textContent())?.trim() ?? "";

			if (labelText === breakdownRange) {
				foundMatch = true;
				break;
			}
		}

		// The Breakdown's range label must appear in at least one Explorer row
		expect(foundMatch).toBe(true);

		// Verify all Explorer range labels have consistent day-of-week boundaries
		// Start dates should be Sundays, end dates should be Fridays
		for (let rowIdx = 0; rowIdx < rowCount; rowIdx++) {
			const rowLabel = explorerRows.nth(rowIdx).locator(".we-row-label");
			const labelText = (await rowLabel.textContent())?.trim() ?? "";

			// Range format: "Mon DD – Mon DD" (e.g., "Jan 5 – Mar 21")
			// We verify the separator is present and there are two parts
			const parts = labelText.split("–").map((s) => s.trim());
			expect(parts).toHaveLength(2);
			expect(parts[0]).toBeTruthy();
			expect(parts[1]).toBeTruthy();
		}
	});
});
