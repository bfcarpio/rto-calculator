/**
 * Week dot rendering — shared between WindowExplorer, WindowBreakdown, and status-details.
 *
 * Pure functions with no DOM dependency. Both WindowWeekDetail and DotInfo
 * satisfy the DotInfo interface structurally — no adapter code needed.
 */

import { fmtShort } from "../dateUtils";

/** Minimal contract for rendering a week dot. */
export interface DotInfo {
	weekStart: Date;
	officeDays: number;
	isBest: boolean;
	isCompliant: boolean;
}

/** Returns the CSS class string for a week dot (e.g. "we-dot we-dot--best-ok"). */
export function buildDotClass(info: DotInfo): string {
	if (info.isBest) {
		return info.isCompliant
			? "we-dot we-dot--best-ok"
			: "we-dot we-dot--best-bad";
	}
	return info.isCompliant
		? "we-dot we-dot--drop-ok"
		: "we-dot we-dot--drop-bad";
}

/** Returns the full HTML string for a week dot (wrapper + class + aria label + tooltip). */
export function buildDotHtml(info: DotInfo): string {
	const tipDate = fmtShort(info.weekStart);
	const stateDesc = info.isBest ? "evaluated" : "dropped";
	const complianceDesc = info.isCompliant ? "compliant" : "non-compliant";
	const ariaLabel = `${tipDate}: ${info.officeDays} office days, ${stateDesc}, ${complianceDesc}`;
	const tipText = info.isBest
		? `${tipDate}: ${info.officeDays} days`
		: `${tipDate}: ${info.officeDays} days (dropped)`;
	const dotClass = buildDotClass(info);

	return `<span class="we-dot-wrap"><span class="${dotClass}" role="img" aria-label="${ariaLabel}"></span><span class="we-dot-tip" aria-hidden="true">${tipText}</span></span>`;
}
