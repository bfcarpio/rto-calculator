/**
 * Auto-Compliance Module
 *
 * Singleton that subscribes to datepainter state changes, debounces computation,
 * reads calendar data, runs sliding-window validation across ALL 12-week windows,
 * and writes compliance results to the complianceStore nanostore.
 *
 * The computation logic is separated into compute-compliance.ts.
 *
 * @module auto-compliance
 */

import type { CalendarInstance } from "../../packages/datepainter/src/types";
import { logger } from "../utils/logger";
import { computeComplianceData } from "./compute-compliance";
import { complianceStore } from "./stores/complianceStore";
import { onSettingsChange } from "./stores/settingsStore";
import { computeWindowEvaluation } from "./validation/window-evaluation";

// Re-export ComplianceEventData for backward compatibility
export type { ComplianceEventData } from "./compute-compliance";

// ─── Public API ────────────────────────────────────────────────────

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
		if (el) {
			el.classList.toggle("computing", active);
		}
	}
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
	private settingsUnsub: (() => void) | null = null;
	private dateStateUnsub: (() => void) | null = null;

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
	 * Store the settings unsubscribe function for cleanup on destroy.
	 */
	setSettingsUnsubscribe(unsub: () => void): void {
		this.settingsUnsub = unsub;
	}

	/**
	 * Store the date state unsubscribe function for cleanup on destroy.
	 */
	setDateStateUnsubscribe(unsub: () => void): void {
		this.dateStateUnsub = unsub;
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
		if (this.isProcessing) {
			return;
		}

		// Guard: Nothing to process
		if (this.queue.length === 0) {
			return;
		}

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
			logger.error("EventQueue processing error:", error);
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
		if (this.settingsUnsub) {
			this.settingsUnsub();
			this.settingsUnsub = null;
		}
		if (this.dateStateUnsub) {
			this.dateStateUnsub();
			this.dateStateUnsub = null;
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
	complianceStore.set(data);
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
	// Only recompute compliance when dates change, not on month navigation
	_eventQueue.setDateStateUnsubscribe(
		calendarManager.onDateStateChange(() => {
			enqueueEvent({
				type: "state-change",
				timestamp: Date.now(),
				calendarManager,
			});
		}),
	);

	// Subscribe to settings changes via nanostore (replaces CustomEvent listener)
	_eventQueue.setSettingsUnsubscribe(
		onSettingsChange(() => {
			enqueueEvent({
				type: "settings-change",
				timestamp: Date.now(),
			});
		}),
	);
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
	if (!eventQueue) {
		return;
	}

	for (const event of pendingEvents) {
		eventQueue.enqueue(event);
	}
	pendingEvents = [];
}

function initAutoCompliance(): void {
	if (initialized) {
		return;
	}

	const calendarManager = window.__datepainterInstance;
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
