/**
 * Status Details Module
 *
 * Extracted functions for updating the StatusDetails component.
 * Handles compliance status display, capacity stats, and window breakdown rendering.
 *
 * Also provides StatusDetailsController for component lifecycle management.
 */

import type { ComplianceEventData } from "../lib/auto-compliance";
import { fmtDate } from "../lib/dateUtils";
import {
	complianceStore,
	onComplianceChange,
} from "../lib/stores/complianceStore";
import { buildWindowRangeLabel } from "../lib/ui/windowRange";
import { buildWindowRowHtml } from "../lib/ui/windowRow";

// ─── Helper Functions ───────────────────────────────────────────────────

/**
 * Get the appropriate color class based on current vs target days
 */
export function getStatusColor(current: number, target: number): string {
	if (current >= target) return "has-text-success";
	if (current >= target - 0.5) return "has-text-warning";
	return "has-text-danger";
}

// ─── DOM Update Functions ────────────────────────────────────────────────

/**
 * Render the window breakdown section into a given root element.
 * Uses buildWindowRowHtml to produce the same HTML as WindowExplorer.
 */
function renderBreakdownInto(
	data: ComplianceEventData,
	root: Document | HTMLElement,
): void {
	const elContent = root.querySelector<HTMLDivElement>(
		"#window-breakdown-content",
	);
	const elLabel = root.querySelector<HTMLDivElement>("#window-breakdown-label");

	// Early exit if container not found
	if (!elContent) return;

	const hasData =
		data.selectedSummary && data.selectedSummary.weekDetails.length > 0;

	// Handle empty data
	if (!hasData) {
		if (elLabel) {
			elLabel.textContent = "Mark dates to see window breakdown";
		}
		elContent.innerHTML =
			'<p class="has-text-centered has-text-grey-light is-size-7">Mark dates to see window breakdown</p>';
		return;
	}

	if (elLabel) {
		elLabel.textContent = data.isCompliant
			? `Window ${data.selectedSummary.windowIndex + 1} of ${data.allSummaries.length} — earliest window (${data.rangeLabel})`
			: `Window ${data.selectedSummary.windowIndex + 1} of ${data.allSummaries.length} — failing window (${data.rangeLabel})`;
	}

	elContent.innerHTML = buildWindowRowHtml(data.selectedSummary);

	// Debug: log date values to console for comparison with Explorer
	console.group("[Breakdown] Window Dates Debug");
	console.log("selectedSummary.windowIndex:", data.selectedSummary.windowIndex);
	console.log("selectedSummary.isValid:", data.selectedSummary.isValid);
	console.log(
		"selectedSummary.windowStart:",
		data.selectedSummary.windowStart.toISOString(),
		"|",
		data.selectedSummary.windowStart.toString(),
	);
	console.log(
		"selectedSummary.windowEnd:",
		data.selectedSummary.windowEnd.toISOString(),
		"|",
		data.selectedSummary.windowEnd.toString(),
	);
	console.log("rangeLabel (pre-computed):", data.rangeLabel);
	console.log(
		"rangeLabel (recomputed):",
		buildWindowRangeLabel(data.selectedSummary.weekDetails),
	);
	for (let i = 0; i < data.selectedSummary.weekDetails.length; i++) {
		const w = data.selectedSummary.weekDetails[i];
		if (!w) continue;
		console.log(
			`  week[${i}] weekStart: iso=${w.weekStart.toISOString()} local=${w.weekStart.toString()} day=${w.weekStart.getDay()} date=${w.weekStart.getDate()}`,
		);
	}
	console.log("isCompliant:", data.isCompliant);
	console.log(
		`selectedSummary (${data.isCompliant ? "earliest" : "first failing"} of ${data.allSummaries.length} windows, index=${data.selectedSummary.windowIndex})`,
	);
	console.log(
		"currentWeek.weekStart:",
		data.currentWeek.weekStart.toISOString(),
		"|",
		data.currentWeek.weekStart.toString(),
	);
	console.log(
		"currentWeek.weekEnd:",
		data.currentWeek.weekEnd.toISOString(),
		"|",
		data.currentWeek.weekEnd.toString(),
	);
	console.groupEnd();
}

/**
 * Standalone export: render window breakdown into the global document.
 */
export function renderWindowBreakdown(data: ComplianceEventData): void {
	renderBreakdownInto(data, document);
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
		const totalDropSlots =
			data.selectedSummary.weekDetails.length - data.bestWeekCount;
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

	// Update setting indicators from compliance data to stay in sync with policy
	const elMinDays = document.querySelector(
		'.setting-value[data-setting-key="minOfficeDaysPerWeek"]',
	);
	if (elMinDays) {
		elMinDays.textContent = String(data.requiredDays);
	}

	// Render window breakdown
	renderWindowBreakdown(data);

	// Update compliance status box styling
	const elStatusBox = document.getElementById("compliance-status-box");
	if (elStatusBox) {
		elStatusBox.className = `box compliance-status ${data.isCompliant ? "is-success" : "is-warning"}`;
	}
}

// ─── Controller Class ─────────────────────────────────────────────────────

/**
 * Controller for StatusDetails component lifecycle.
 *
 * Manages event subscriptions and DOM updates for the status details panel.
 * Use `init()` to start listening for compliance events, and `destroy()` to clean up.
 *
 * @example
 * ```typescript
 * const container = document.querySelector('.status-details');
 * const controller = new StatusDetailsController(container as HTMLElement);
 * controller.init();
 *
 * // Later, when component unmounts:
 * controller.destroy();
 * ```
 */
export class StatusDetailsController {
	private unsubscribe: (() => void) | null = null;

	/**
	 * Create a new controller instance.
	 * @param container - The root container element for status details
	 */
	constructor(private container: HTMLElement) {}

	/**
	 * Initialize the controller by subscribing to compliance store.
	 * If compliance data is already in the store, immediately updates the UI.
	 */
	init(): void {
		// Subscribe to compliance store updates (deduplicated)
		this.unsubscribe = onComplianceChange((data) => {
			this.updateStats(data);
		});

		// If compliance data is already cached in the store, use it immediately
		const cached = complianceStore.get();
		if (cached) {
			this.updateStats(cached);
		}
	}

	/**
	 * Clean up event subscriptions.
	 * Call this when the component is removed from the DOM.
	 */
	destroy(): void {
		if (this.unsubscribe) {
			this.unsubscribe();
			this.unsubscribe = null;
		}
	}

	/**
	 * Update all stats in the StatusDetails panel.
	 * Uses the container element for scoped DOM queries.
	 */
	updateStats(data: ComplianceEventData): void {
		// Update capacity stats
		const elBuffer =
			this.container.querySelector<HTMLParagraphElement>("#stat-buffer");
		const elOof = this.container.querySelector<HTMLParagraphElement>(
			"#stat-oof-available",
		);
		const elWeekRange = this.container.querySelector<HTMLSpanElement>(
			"#stat-current-week-range",
		);
		const elWeekDays = this.container.querySelector<HTMLParagraphElement>(
			"#stat-current-week-days",
		);

		if (elBuffer) {
			elBuffer.textContent = `Good weeks = ${data.goodWeeks} of ${data.bestWeekCount} needed`;
		}
		if (elOof) {
			elOof.textContent = `${data.bufferWeeks} full weeks WFH`;
		}

		// Buffer warning: show when exactly 1 buffer week and total drop slots > 1
		const elBufferWarning =
			this.container.querySelector<HTMLParagraphElement>("#buffer-warning");
		if (elBufferWarning) {
			const totalDropSlots =
				data.selectedSummary.weekDetails.length - data.bestWeekCount;
			const showWarning =
				data.isCompliant && data.bufferWeeks === 1 && totalDropSlots > 1;
			elBufferWarning.style.display = showWarning ? "" : "none";
		}

		// Next WFH week
		const elNextWfh =
			this.container.querySelector<HTMLParagraphElement>("#stat-next-wfh");
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
		const elCurrentWeekOffice = this.container.querySelector<HTMLSpanElement>(
			"#current-week-office",
		);
		if (elCurrentWeekOffice) {
			elCurrentWeekOffice.textContent = `${data.currentWeek.officeDays}`;
		}
		if (elWeekDays) {
			elWeekDays.className = `has-text-weight-bold ${getStatusColor(
				data.currentWeek.officeDays,
				data.requiredDays,
			)}`;
		}

		// Update setting indicators from compliance data to stay in sync with policy
		const elMinDays = this.container.querySelector(
			'.setting-value[data-setting-key="minOfficeDaysPerWeek"]',
		);
		if (elMinDays) {
			elMinDays.textContent = String(data.requiredDays);
		}

		// Render window breakdown
		this.renderWindowBreakdown(data);

		// Update compliance status box styling
		const elStatusBox = this.container.querySelector<HTMLDivElement>(
			"#compliance-status-box",
		);
		if (elStatusBox) {
			elStatusBox.className = `box compliance-status ${data.isCompliant ? "is-success" : "is-warning"}`;
		}
	}

	/**
	 * Render the window breakdown section with dots representing each week.
	 * Delegates to the shared renderBreakdownInto helper with scoped container.
	 */
	renderWindowBreakdown(data: ComplianceEventData): void {
		renderBreakdownInto(data, this.container);
	}
}
