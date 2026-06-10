/**
 * Window row rendering — shared between WindowExplorer and WindowBreakdown.
 *
 * Produces identical HTML for a window summary row, ensuring both components
 * display the same date ranges, dots, and PASS/FAIL tags for the same data.
 */

import type { WindowSummary } from "../validation/all-windows";
import { buildDotHtml } from "./weekDot";
import { buildWindowRangeLabel } from "./windowRange";

/**
 * Build the HTML for a single window row.
 *
 * Uses `we-row-*` CSS classes shared by WindowExplorer and WindowBreakdown.
 * The label shows the date range, the tag shows PASS/FAIL, dots show week
 * compliance state, and avg shows the average office days across best weeks.
 */
export function buildWindowRowHtml(summary: WindowSummary): string {
	const label = buildWindowRangeLabel(summary.weekDetails);
	const tagClass = summary.isValid ? "we-row-tag--pass" : "we-row-tag--fail";
	const tagText = summary.isValid ? "PASS" : "FAIL";

	const dots = summary.weekDetails.map(buildDotHtml).join("");

	return `<div class="we-row">
	<span class="we-row-label">${label}</span>
	<span class="we-row-tag ${tagClass}">${tagText}</span>
	<span class="we-row-dots">${dots}</span>
	<span class="we-row-avg">${summary.averageOfficeDays.toFixed(1)}</span>
</div>`;
}
