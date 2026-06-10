/**
 * Auto-Compliance Module
 *
 * Singleton that subscribes to datepainter state changes, debounces computation,
 * reads calendar data, runs sliding-window validation across ALL 12-week windows,
 * and dispatches `rto:state-changed` CustomEvents with compliance data.
 *
 * @module auto-compliance
 */

import type { CalendarInstance } from "../../packages/datepainter/src/types";
import { dispatchRTOStateEvent, RTO_STATE_CHANGED } from "../types/events";
import {
	convertWeeksToCompliance,
	type WeekInfo,
} from "./calendar-data-reader";
import { buildWindowRangeLabel } from "./ui/windowRange";
import type { WindowSummary } from "./validation/all-windows";
import { FRIDAY_OFFSET } from "./validation/constants";
import {
	evaluateSingleWindow,
	getStartOfWeek,
	type RTOPolicyConfig,
} from "./validation/rto-core";
import {
	computeWindowEvaluation,
	type WindowEvaluationResult,
} from "./validation/window-evaluation";

// ─── Public Types ───────────────────────────────────────────────────

export interface ComplianceEventData {
	/** The exact same WindowSummary object that Explorer uses — guarantees matching date ranges */
	selectedSummary: WindowSummary;
	/** Number of best weeks evaluated (up to BEST_WEEKS_COUNT) */
	bestWeekCount: number;
	/** Average office days across best weeks */
	averageOfficeDays: number;
	/** Weeks with >= REQUIRED_OFFICE_DAYS in the window */
	goodWeeks: number;
	/** Droppable slots minus non-compliant dropped weeks */
	bufferWeeks: number;
	/** Earliest dropped-compliant week that can be taken as full WFH */
	nextWfhWeek: Date | null;

	/** Current (possibly incomplete) week, shown separately */
	currentWeek: { weekStart: Date; weekEnd: Date; officeDays: number };

	/** Raw day counts from full window */
	totalWfhDays: number;
	totalHolidayDays: number;
	totalSickDays: number;
	totalWorkingDays: number;

	/** Overall compliance summary */
	isCompliant: boolean;
	compliancePercentage: number;
	message: string;

	/** Human-readable date range label for the window */
	rangeLabel: string;

	/** Whether percentage rounding is enabled */
	roundPercentage: boolean;

	/** Policy settings used for compliance calculation */
	/** Total weeks in the rolling window (from settings: rollingPeriodWeeks) */
	totalWeeks: number;
	/** Required office days per week (from settings: minOfficeDays) */
	requiredDays: number;
}

// ─── Event Helpers ──────────────────────────────────────────────────

export function onComplianceUpdated(
	cb: (data: ComplianceEventData) => void,
): () => void {
	// Handler for unified event
	const handler = (e: Event): void => {
		const event = e as CustomEvent;
		if (event.detail?.type === "compliance" && event.detail.compliance) {
			cb(event.detail.compliance);
		}
	};

	window.addEventListener(RTO_STATE_CHANGED, handler);

	return () => {
		window.removeEventListener(RTO_STATE_CHANGED, handler);
	};
}

/** Latest cached result for late-loading components */
let latestResult: ComplianceEventData | null = null;

export function getLatestCompliance(): ComplianceEventData | null {
	return latestResult;
}

/**
 * Check if auto-compliance has finished initializing.
 * Used by external modules (e.g., settings modal) to know when it's safe to interact.
 */
export function isAutoComplianceReady(): boolean {
	return initialized;
}

// ─── Computing State Helpers ────────────────────────────────────────

function setComputingState(active: boolean): void {
	for (const selector of [".status-details", ".summary-bar"]) {
		const el = document.querySelector(selector);
		if (el) el.classList.toggle("computing", active);
	}
}

// ─── Evaluated Set Algorithm ────────────────────────────────────────

/**
 * Build a set of week timestamps that appear in the best-K of at least one
 * sliding window. A week NOT in this set is safe to zero out — it's already
 * dropped in every window that contains it.
 */
function buildEvaluatedSet(
	allWeeks: WeekInfo[],
	policy: RTOPolicyConfig,
): Set<number> {
	const evaluated = new Set<number>();
	const W = policy.rollingPeriodWeeks;
	const weeks = convertWeeksToCompliance(allWeeks);

	if (weeks.length < W) {
		for (const w of evaluateSingleWindow(weeks, policy).bestWeeks) {
			evaluated.add(w.weekStart.getTime());
		}
		return evaluated;
	}

	for (let start = 0; start <= weeks.length - W; start++) {
		const windowWeeks = weeks.slice(start, start + W);
		for (const w of evaluateSingleWindow(windowWeeks, policy).bestWeeks) {
			evaluated.add(w.weekStart.getTime());
		}
	}

	return evaluated;
}

/**
 * Find the earliest future week that can safely be taken as full WFH.
 * A week is safe iff: it's in the future, currently compliant, and NOT in the
 * evaluated set (i.e., it's already dropped in every sliding window containing it).
 *
 * Returns null if not currently compliant or no safe week exists.
 */
function findNextSafeWfhWeek(
	allWeeks: WeekInfo[],
	policy: RTOPolicyConfig,
	isCompliant: boolean,
): Date | null {
	if (!isCompliant) return null;

	const evaluated = buildEvaluatedSet(allWeeks, policy);
	const today = new Date();
	today.setHours(0, 0, 0, 0);

	const candidates = allWeeks
		.filter(
			(w) =>
				w.weekStart > today &&
				w.officeDays >= policy.minOfficeDaysPerWeek &&
				!evaluated.has(w.weekStart.getTime()),
		)
		.sort((a, b) => a.weekStart.getTime() - b.weekStart.getTime());

	return candidates[0]?.weekStart ?? null;
}

// ─── Core Computation ───────────────────────────────────────────────

function isWeekComplete(weekStart: Date): boolean {
	const friday = new Date(weekStart);
	friday.setDate(friday.getDate() + FRIDAY_OFFSET);
	const today = new Date();
	today.setHours(23, 59, 59, 999);
	return friday <= today;
}

function computeComplianceData(
	evaluation: WindowEvaluationResult,
): ComplianceEventData {
	const { summaries, policy, allWeeks, filteredWeeks } = evaluation;

	// Identify current incomplete week for display, but include ALL weeks
	// (including future) in validation so marking future months triggers violations
	const currentWeekInfo = allWeeks.find((w) => !isWeekComplete(w.weekStart));

	// Select the same window that validateSlidingWindow would pick:
	// - If any window is invalid: use the FIRST failing window
	// - If all windows are valid: use the LAST window
	// Edge case: no weeks → no summaries
	if (summaries.length === 0) {
		const now = new Date();
		const currentWeekStart = getStartOfWeek(now);
		const currentWeekEnd = new Date(currentWeekStart);
		currentWeekEnd.setDate(currentWeekStart.getDate() + 6);

		// Build an empty sentinel summary for the no-data case
		const emptySummary: WindowSummary = {
			windowIndex: 0,
			windowStart: currentWeekStart,
			windowEnd: currentWeekEnd,
			isValid: true,
			averageOfficeDays: 0,
			weekDetails: [],
		};

		return {
			selectedSummary: emptySummary,
			bestWeekCount: 0,
			averageOfficeDays: 0,
			goodWeeks: 0,
			bufferWeeks: 0,
			nextWfhWeek: null,
			rangeLabel: "",
			currentWeek: {
				weekStart: currentWeekStart,
				weekEnd: currentWeekEnd,
				officeDays: currentWeekInfo?.officeDays ?? 0,
			},
			totalWfhDays: 0,
			totalHolidayDays: 0,
			totalSickDays: 0,
			totalWorkingDays: 0,
			isCompliant: true,
			compliancePercentage: 0,
			message: "No weeks data available",
			roundPercentage: policy.roundPercentage ?? true,
			totalWeeks: policy.rollingPeriodWeeks,
			requiredDays: policy.minOfficeDaysPerWeek,
		};
	}

	const firstFailing = summaries.find((s) => !s.isValid);
	const lastSummary = summaries[summaries.length - 1];
	if (!lastSummary) {
		throw new Error(
			"No windows available after evaluateAllWindows — empty result",
		);
	}
	const selectedSummary: WindowSummary = firstFailing ?? lastSummary;

	// Get the selected window's week starts for matching with original WeekInfo data
	const selectedWeekStarts = new Set(
		selectedSummary.weekDetails.map((w) => w.weekStart.getTime()),
	);

	// Aggregate stats from original WeekInfo objects that match the selected window
	const windowWeekInfos = filteredWeeks.filter((w) =>
		selectedWeekStarts.has(w.weekStart.getTime()),
	);

	// Stats over best weeks
	const bestDetails = selectedSummary.weekDetails.filter((w) => w.isBest);
	const bestCount = bestDetails.length;
	const totalOfficeDays = bestDetails.reduce((sum, w) => sum + w.officeDays, 0);
	const averageOfficeDays = bestCount > 0 ? totalOfficeDays / bestCount : 0;

	// goodWeeks = weeks with >= REQUIRED_OFFICE_DAYS in all window weeks
	const goodWeeksInWindow = selectedSummary.weekDetails.filter(
		(w) => w.isCompliant,
	).length;
	// bufferWeeks = droppable slots minus slots used by non-compliant weeks
	const droppableSlots = Math.max(
		0,
		selectedSummary.weekDetails.length - policy.topWeeksToCheck,
	);
	const droppedNonCompliant = selectedSummary.weekDetails.filter(
		(w) => !w.isBest && !w.isCompliant,
	).length;
	const bufferWeeks = Math.max(0, droppableSlots - droppedNonCompliant);

	// Overall compliance: ALL windows must be valid for the user to be compliant
	const isCompliant = summaries.every((s) => s.isValid);

	// Find the earliest future week safe for full WFH using evaluated-set algorithm.
	const nextWfhWeek = findNextSafeWfhWeek(filteredWeeks, policy, isCompliant);

	// Day counts from window weeks — use original WeekInfo for OOF/holiday/sick
	let totalWfhDays = 0;
	let totalHolidayDays = 0;
	let totalSickDays = 0;
	for (const w of windowWeekInfos) {
		totalWfhDays += w.oofCount;
		totalHolidayDays += w.holidayCount;
		totalSickDays += w.sickCount;
	}
	const totalWeekdays = windowWeekInfos.length * 5;
	const totalWorkingDays =
		totalWeekdays - totalWfhDays - totalHolidayDays - totalSickDays;

	// Current week
	const now = new Date();
	const currentWeekStart = getStartOfWeek(now);
	const currentWeekEnd = new Date(currentWeekStart);
	currentWeekEnd.setDate(currentWeekStart.getDate() + 6);

	const currentWeek = {
		weekStart: currentWeekStart,
		weekEnd: currentWeekEnd,
		officeDays: currentWeekInfo?.officeDays ?? 0,
	};

	const compliancePercentage =
		bestCount > 0
			? (bestDetails.filter((w) => w.isCompliant).length / bestCount) * 100
			: 0;

	// Build a human-readable message from the selected summary
	const indicator = policy.roundPercentage !== false ? " (rounded)" : "";
	const avgDaysStr =
		policy.roundPercentage !== false
			? `${Math.round(selectedSummary.averageOfficeDays)}`
			: `${selectedSummary.averageOfficeDays.toFixed(1)}`;
	const label = selectedSummary.isValid ? "Compliant" : "Not compliant";
	const message = `${label}: Best ${bestCount} of ${selectedSummary.weekDetails.length} weeks average${indicator} ${avgDaysStr} office days. Required: ${policy.minOfficeDaysPerWeek}`;

	return {
		selectedSummary,
		bestWeekCount: bestCount,
		averageOfficeDays,
		goodWeeks: goodWeeksInWindow,
		bufferWeeks,
		nextWfhWeek,
		rangeLabel: buildWindowRangeLabel(selectedSummary.weekDetails),
		currentWeek,
		totalWfhDays,
		totalHolidayDays,
		totalSickDays,
		totalWorkingDays,
		isCompliant,
		compliancePercentage,
		message,
		roundPercentage: policy.roundPercentage ?? true,
		totalWeeks: policy.rollingPeriodWeeks,
		requiredDays: policy.minOfficeDaysPerWeek,
	};
}

// ─── Event Queue Infrastructure ───────────────────────────────────────

/**
 * Events that trigger compliance computation.
 * - state-change: Calendar data changed (user marked/unmarked dates)
 * - settings-change: Policy settings changed
 * - manual-trigger: Explicit request to recompute
 */
export type AutoComplianceEvent =
	| {
			type: "state-change";
			timestamp: number;
			calendarManager: CalendarInstance;
	  }
	| { type: "settings-change"; timestamp: number }
	| { type: "manual-trigger"; timestamp: number; force: boolean };

/**
 * Debounce delays for different event types.
 * - state-change: 1500ms (wait for user to finish marking dates)
 * - settings-change: 300ms (more responsive for settings UI)
 * - manual-trigger: 0ms (immediate)
 */
const DEBOUNCE_DELAYS = {
	"state-change": 1500,
	"settings-change": 300,
	"manual-trigger": 0,
} as const;

/**
 * EventQueue ensures compliance computations happen sequentially and debounced.
 *
 * Problem it solves: Multiple rapid state changes (e.g., dragging to mark dates)
 * can trigger many computation requests before previous ones complete, leading
 * to race conditions where stale results overwrite fresh ones.
 *
 * Solution:
 * - Single queue: All events are queued and processed FIFO
 * - Single worker: Only one computation runs at a time
 * - Debouncing: Waits for inactivity before starting processing
 * - Type-aware: Settings changes use shorter debounce (300ms) for responsiveness
 */
class EventQueue {
	private queue: AutoComplianceEvent[] = [];
	private isProcessing = false;
	private timer: ReturnType<typeof setTimeout> | null = null;
	private calendarManager: CalendarInstance | null = null;

	/**
	 * Set the calendar manager instance for processing state-change events.
	 * Must be called before enqueueing state-change events.
	 * @throws Error if manager is null or undefined
	 */
	setCalendarManager(manager: CalendarInstance): void {
		if (!manager) {
			throw new Error(
				"EventQueue: Calendar manager cannot be null or undefined",
			);
		}
		this.calendarManager = manager;
	}

	/**
	 * Add an event to the queue and schedule processing.
	 */
	enqueue(event: AutoComplianceEvent): void {
		this.queue.push(event);
		this.scheduleProcessing(event.type);
	}

	/**
	 * Schedule queue processing with appropriate debounce delay.
	 */
	private scheduleProcessing(eventType: AutoComplianceEvent["type"]): void {
		if (this.timer) {
			clearTimeout(this.timer);
		}

		const delay = DEBOUNCE_DELAYS[eventType];

		this.timer = setTimeout(() => {
			this.processQueue();
		}, delay);
	}

	/**
	 * Process all queued events sequentially.
	 * Only one invocation runs at a time; new events arriving during
	 * processing are queued for the next cycle.
	 */
	private async processQueue(): Promise<void> {
		// Guard: Don't start if already processing
		if (this.isProcessing) return;

		// Guard: Nothing to process
		if (this.queue.length === 0) return;

		// Clear any pending timer
		if (this.timer) {
			clearTimeout(this.timer);
			this.timer = null;
		}

		this.isProcessing = true;
		setComputingState(true);

		try {
			// Process all events in order
			while (this.queue.length > 0) {
				const event = this.queue.shift();
				if (event) {
					await this.processEvent(event);
				}
			}
		} catch (error) {
			console.error("EventQueue processing error:", error);
		} finally {
			this.isProcessing = false;
			setComputingState(false);
		}
	}

	/**
	 * Process a single event and run computation.
	 */
	private async processEvent(event: AutoComplianceEvent): Promise<void> {
		// Get calendar manager from event or stored instance
		const manager =
			event.type === "state-change"
				? event.calendarManager
				: this.calendarManager;

		if (!manager) {
			throw new Error(
				"EventQueue: Calendar manager not set. Call setCalendarManager() before processing events.",
			);
		}

		await runComputation(manager);
	}

	/**
	 * Cleanup resources. Call this when disposing of the EventQueue.
	 */
	destroy(): void {
		if (this.timer) {
			clearTimeout(this.timer);
			this.timer = null;
		}
		this.queue = [];
		this.calendarManager = null;
	}
}

// Export for testing
export { EventQueue };

// ─── Singleton Initialization ───────────────────────────────────────

let initialized = false;
let eventQueue: EventQueue | null = null;
// Buffer for events that arrive before EventQueue is ready
let pendingEvents: AutoComplianceEvent[] = [];

async function runComputation(
	calendarManager: CalendarInstance,
): Promise<void> {
	const evaluation = await computeWindowEvaluation(calendarManager);
	const data = computeComplianceData(evaluation);
	latestResult = data;

	dispatchRTOStateEvent({
		type: "compliance",
		compliance: data,
	});
}

/**
 * Setup event listeners for calendar state changes and settings changes.
 *
 * This helper isolates event subscription logic from initialization logic,
 * making the codebase easier to maintain and test.
 *
 * @param calendarManager - The datepainter calendar instance
 * @param eventQueue - The event queue for processing compliance computations
 */
function setupEventListeners(
	calendarManager: CalendarInstance,
	_eventQueue: EventQueue,
): void {
	// Subscribe to calendar state changes
	calendarManager.onStateChange(() => {
		enqueueEvent({
			type: "state-change",
			timestamp: Date.now(),
			calendarManager,
		});
	});

	// Subscribe to settings changes
	window.addEventListener(RTO_STATE_CHANGED, ((e: CustomEvent) => {
		if (e.detail?.type !== "settings") return;
		enqueueEvent({
			type: "settings-change",
			timestamp: Date.now(),
		});
	}) as EventListener);
}

/**
 * Enqueue an event, buffering if EventQueue not yet initialized.
 * This prevents race conditions where events arrive during initialization.
 */
function enqueueEvent(event: AutoComplianceEvent): void {
	if (eventQueue) {
		eventQueue.enqueue(event);
	} else {
		pendingEvents.push(event);
	}
}

/**
 * Flush any pending events to the EventQueue.
 * Called once after EventQueue is initialized.
 */
function flushPendingEvents(): void {
	if (!eventQueue) return;

	for (const event of pendingEvents) {
		eventQueue.enqueue(event);
	}
	pendingEvents = [];
}

function initAutoCompliance(): void {
	if (initialized) return;

	const calendarManager = (
		window as unknown as { __datepainterInstance?: CalendarInstance }
	).__datepainterInstance;
	if (!calendarManager) {
		setTimeout(initAutoCompliance, 50);
		return;
	}

	// Initialize event queue
	eventQueue = new EventQueue();
	eventQueue.setCalendarManager(calendarManager);

	// Flush any events that arrived during initialization
	flushPendingEvents();

	// Initial computation (no debounce)
	eventQueue.enqueue({
		type: "manual-trigger",
		timestamp: Date.now(),
		force: true,
	});

	// Setup event listeners
	setupEventListeners(calendarManager, eventQueue);

	// Mark initialized AFTER event listeners are ready
	// This ensures isAutoComplianceReady() only returns true when events won't be lost
	initialized = true;
}

// Auto-initialize when module is imported (skip in test environments)
// Check for Vitest by looking for its globals
const isTestEnvironment =
	(typeof globalThis !== "undefined" && Object.hasOwn(globalThis, "vi")) ||
	(typeof globalThis !== "undefined" &&
		(globalThis as unknown as { __vitest__?: boolean }).__vitest__ === true);

if (!isTestEnvironment) {
	if (document.readyState === "loading") {
		document.addEventListener("DOMContentLoaded", initAutoCompliance);
	} else {
		initAutoCompliance();
	}
}

// ─── Test Exports ──────────────────────────────────────────────────────

/**
 * Test-only exports for testing internal state and pending buffer behavior.
 * These are intentionally not part of the public API.
 */
export const _testExports = {
	getPendingEvents: (): AutoComplianceEvent[] => pendingEvents,
	getEventQueue: (): EventQueue | null => eventQueue,
	isInitialized: (): boolean => initialized,
	reset: (): void => {
		pendingEvents = [];
		eventQueue = null;
		initialized = false;
	},
	setEventQueue: (queue: EventQueue | null): void => {
		eventQueue = queue;
	},
	enqueueEvent,
	flushPendingEvents,
	initAutoCompliance,
};
