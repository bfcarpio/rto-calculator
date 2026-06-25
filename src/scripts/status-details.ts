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

/**
 * Render all stats into a given root element.
 *
 * Shared implementation used by both the standalone updateStats export
 * and the StatusDetailsController.updateStats method.
 *
 * @param root - The document or container element to query
 * @param data - Compliance event data to render
 */
function renderStatsInto(
	root: Document | HTMLElement,
	data: ComplianceEventData,
): void {
	// Update capacity stats
	const elBuffer = root.querySelector<HTMLElement>("#stat-buffer");
	const elOof = root.querySelector<HTMLElement>("#stat-oof-available");

	if (elBuffer) {
		elBuffer.textContent = `Good weeks = ${data.goodWeeks} of ${data.bestWeekCount} needed`;
	}
	if (elOof) {
		elOof.textContent = `${data.bufferWeeks} full weeks WFH`;
	}

	// Buffer warning: show when exactly 1 buffer week and total drop slots > 1
	const elBufferWarning = root.querySelector<HTMLElement>("#buffer-warning");
	if (elBufferWarning) {
		const totalDropSlots =
			data.selectedSummary.weekDetails.length - data.bestWeekCount;
		const showWarning =
			data.isCompliant && data.bufferWeeks === 1 && totalDropSlots > 1;
		elBufferWarning.style.display = showWarning ? "" : "none";
	}

	// Next WFH week
	const elNextWfh = root.querySelector<HTMLElement>("#stat-next-wfh");
	if (elNextWfh) {
		elNextWfh.textContent = data.nextWfhWeek
			? `Week of ${fmtDate(data.nextWfhWeek)}`
			: "\u2014";
	}

	// Current week range
	const elWeekRange = root.querySelector<HTMLElement>(
		"#stat-current-week-range",
	);
	if (elWeekRange) {
		elWeekRange.textContent = `${fmtDate(data.currentWeek.weekStart)} - ${fmtDate(data.currentWeek.weekEnd)}`;
	}

	// Current week office days
	const elWeekDays = root.querySelector<HTMLElement>("#stat-current-week-days");
	const elCurrentWeekOffice = root.querySelector<HTMLElement>(
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
	const elMinDays = root.querySelector(
		'.setting-value[data-setting-key="minOfficeDaysPerWeek"]',
	);
	if (elMinDays) {
		elMinDays.textContent = String(data.requiredDays);
	}

	// Render window breakdown
	renderBreakdownInto(data, root);

	// Update compliance status box styling
	const elStatusBox = root.querySelector<HTMLElement>("#compliance-status-box");
	if (elStatusBox) {
		elStatusBox.className = `box compliance-status ${data.isCompliant ? "is-success" : "is-warning"}`;
	}
}

// ─── Standalone Exports ────────────────────────────────────────────────

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

	// Early exit if container not found
	if (!elContent) return;

	const hasData =
		data.selectedSummary && data.selectedSummary.weekDetails.length > 0;

	// Handle empty data
	if (!hasData) {
		elContent.innerHTML =
			'<p class="has-text-centered has-text-grey-light is-size-7">Mark dates to see window breakdown</p>';
		return;
	}

	elContent.innerHTML = buildWindowRowHtml(data.selectedSummary);
}

/**
 * Standalone export: render window breakdown into the global document.
 */
export function renderWindowBreakdown(data: ComplianceEventData): void {
	renderBreakdownInto(data, document);
}

/**
 * Update all stats in the StatusDetails panel (standalone version).
 * Delegates to renderStatsInto with the global document.
 */
export function updateStats(data: ComplianceEventData): void {
	renderStatsInto(document, data);
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
		renderStatsInto(this.container, data);
	}

	/**
	 * Render the window breakdown section with dots representing each week.
	 * Delegates to the shared renderBreakdownInto helper with scoped container.
	 */
	renderWindowBreakdown(data: ComplianceEventData): void {
		renderBreakdownInto(data, this.container);
	}
}
