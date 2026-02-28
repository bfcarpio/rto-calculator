/**
 * Status Details Module
 *
 * Extracted functions for updating the StatusDetails component.
 * Handles compliance status display, capacity stats, and window breakdown rendering.
 */

import type {
	AnnotatedWeek,
	ComplianceEventData,
} from "../lib/auto-compliance";
import { fmtDate, fmtShort } from "../lib/dateUtils";

// ─── Helper Functions ───────────────────────────────────────────────────

/**
 * Get the appropriate color class based on current vs target days
 */
export function getStatusColor(current: number, target: number): string {
	if (current >= target) return "has-text-success";
	if (current >= target - 0.5) return "has-text-warning";
	return "has-text-danger";
}

/**
 * Build HTML for a single week dot with tooltip
 */
function buildWeekDot(w: AnnotatedWeek): string {
	const tipDate = fmtShort(w.weekStart);
	const stateDesc = w.isBest ? "evaluated" : "dropped";
	const complianceDesc = w.isCompliant ? "compliant" : "non-compliant";
	const ariaLabel = `${tipDate}: ${w.officeDays} office days, ${stateDesc}, ${complianceDesc}`;
	const tipText = w.isBest
		? `${tipDate}: ${w.officeDays} days`
		: `${tipDate}: ${w.officeDays} days (dropped)`;

	let dotClass: string;
	if (w.isBest) {
		dotClass = w.isCompliant
			? "we-dot we-dot--best-ok"
			: "we-dot we-dot--best-bad";
	} else {
		dotClass = w.isCompliant
			? "we-dot we-dot--drop-ok"
			: "we-dot we-dot--drop-bad";
	}

	return `<span class="we-dot-wrap"><span class="${dotClass}" role="img" aria-label="${ariaLabel}"></span><span class="we-dot-tip" aria-hidden="true">${tipText}</span></span>`;
}

/**
 * Build the window date range label
 */
function buildWindowRangeLabel(data: ComplianceEventData): string {
	const ws = data.slidingWindowResult.windowStart;
	if (ws === null) return "";

	const windowStart = new Date(ws);
	const lastWeek = data.windowWeeks[data.windowWeeks.length - 1];
	if (!lastWeek) return "";

	const windowEnd = new Date(lastWeek.weekStart);
	windowEnd.setDate(windowEnd.getDate() + 4);
	return `${fmtShort(windowStart)} – ${fmtShort(windowEnd)}`;
}

// ─── DOM Update Functions ────────────────────────────────────────────────

/**
 * Render the window breakdown section with dots representing each week
 */
export function renderWindowBreakdown(data: ComplianceEventData): void {
	const elContent = document.getElementById("window-breakdown-content");
	const elLabel = document.getElementById("window-breakdown-label");

	// Early exit if container not found
	if (!elContent) return;

	// Handle empty data
	if (data.windowWeeks.length === 0) {
		if (elLabel) {
			elLabel.textContent = "Mark dates to see window breakdown";
		}
		elContent.innerHTML =
			'<p class="has-text-centered has-text-grey-light is-size-7">Mark dates to see window breakdown</p>';
		return;
	}

	// Build window date range label
	const rangeLabel = buildWindowRangeLabel(data);

	if (elLabel) {
		elLabel.textContent = data.isCompliant
			? `Showing most recent window (${rangeLabel})`
			: `Showing first failing window (${rangeLabel})`;
	}

	// Build dot row
	const tagClass = data.isCompliant ? "wb-row-tag--pass" : "wb-row-tag--fail";
	const tagText = data.isCompliant ? "PASS" : "FAIL";

	const dots = data.windowWeeks.map(buildWeekDot).join("");

	elContent.innerHTML = `<div class="wb-row">
		<span class="wb-row-tag ${tagClass}">${tagText}</span>
		<span class="wb-row-dots">${dots}</span>
		<span class="wb-row-avg">${data.averageOfficeDays.toFixed(1)}</span>
	</div>`;
}

/**
 * Update all stats in the StatusDetails panel
 */
export function updateStats(data: ComplianceEventData): void {
	// Update capacity stats
	const elBuffer = document.getElementById("stat-buffer");
	const elOof = document.getElementById("stat-oof-available");
	const elWeekRange = document.getElementById("stat-current-week-range");
	const elWeekDays = document.getElementById("stat-current-week-days");

	if (elBuffer) {
		elBuffer.textContent = `Good weeks = ${data.goodWeeks} of ${data.bestWeekCount} needed`;
	}
	if (elOof) {
		elOof.textContent = `${data.bufferWeeks} full weeks WFH`;
	}

	// Buffer warning: show when exactly 1 buffer week and total drop slots > 1
	const elBufferWarning = document.getElementById("buffer-warning");
	if (elBufferWarning) {
		const totalDropSlots = data.windowWeeks.length - data.bestWeekCount;
		const showWarning =
			data.isCompliant && data.bufferWeeks === 1 && totalDropSlots > 1;
		elBufferWarning.style.display = showWarning ? "" : "none";
	}

	// Next WFH week
	const elNextWfh = document.getElementById("stat-next-wfh");
	if (elNextWfh) {
		elNextWfh.textContent = data.nextWfhWeek
			? `Week of ${fmtDate(data.nextWfhWeek)}`
			: "\u2014";
	}

	// Current week range
	if (elWeekRange) {
		elWeekRange.textContent = `${fmtDate(data.currentWeek.weekStart)} - ${fmtDate(data.currentWeek.weekEnd)}`;
	}

	// Current week office days
	const elCurrentWeekOffice = document.getElementById("current-week-office");
	if (elCurrentWeekOffice) {
		elCurrentWeekOffice.textContent = `${data.currentWeek.officeDays}`;
	}
	if (elWeekDays) {
		elWeekDays.className = `has-text-weight-bold ${getStatusColor(
			data.currentWeek.officeDays,
			data.requiredDays,
		)}`;
	}

	// Render window breakdown
	renderWindowBreakdown(data);

	// Update compliance status box
	const elStatusLabel = document.getElementById("compliance-label");
	const elStatusBox = document.getElementById("compliance-status-box");

	if (!elStatusLabel || !elStatusBox) return;

	elStatusBox.className = `box compliance-status ${data.isCompliant ? "is-success" : "is-warning"}`;

	// Build message with SettingIndicator structure
	const statusLabel = data.isCompliant ? "Compliant" : "Not compliant";
	const avgDaysStr = data.roundPercentage
		? `${Math.round(data.averageOfficeDays)}`
		: data.averageOfficeDays.toFixed(1);
	const indicator = data.roundPercentage ? " (rounded)" : "";

	elStatusLabel.innerHTML = `
		<strong>${statusLabel}:</strong>
		Best
		<span class="setting-indicator" data-setting-key="topWeeksToCheck">
			<span class="setting-value" data-setting-key="topWeeksToCheck">${data.bestWeekCount}</span>
		</span>
		of
		<span class="setting-indicator" data-setting-key="rollingPeriodWeeks">
			<span class="setting-value" data-setting-key="rollingPeriodWeeks">${data.totalWeeks}</span>
		</span>
		weeks average${indicator}
		${avgDaysStr}
		office days.
		Required:
		<span class="setting-indicator" data-setting-key="minOfficeDaysPerWeek">
			<span class="setting-value" data-setting-key="minOfficeDaysPerWeek">${data.requiredDays}</span>
		</span>
	`;
}
