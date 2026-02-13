/**
 * KeyboardShortcuts - Manages keyboard shortcuts for calendar interactions
 *
 * Handles Ctrl+Z (undo), Ctrl+S (validate), and Enter key for buttons.
 * Integrates with HistoryManager, CalendarManager, and ValidationManager.
 *
 * @module KeyboardShortcuts
 */

import type {
	CalendarInstance,
	DateState,
	DateString,
} from "../../packages/datepainter/src/types";
import type { HistoryManager } from "../lib/history/HistoryManager";
import type { ValidationMode } from "../lib/validation";
import type {
	DaySelectionType,
	SelectedDay,
	ValidationConfig,
} from "../types/validation-strategy";
import type { ValidationManager } from "./ValidationManager";

/**
 * Represents a complete snapshot of application state for undo functionality
 *
 * @interface UndoSnapshot
 */
export interface UndoSnapshot {
	/** Calendar date states (e.g., "oof", "holiday", "sick") */
	calendarState: Map<DateString, DateState>;
	/** Current month being displayed */
	currentMonth: Date;
	/** Current validation configuration */
	validationConfig: ValidationConfig & { validationMode?: ValidationMode };
	/** Unix timestamp when snapshot was created */
	timestamp: number;
}

/**
 * Manages keyboard shortcuts and state snapshots for undo/redo functionality
 *
 * @class KeyboardShortcuts
 * @implements {EarlyExit} - Validates inputs with guard clauses
 * @implements {AtomicPredictability} - Debounced pushState maintains predictability
 * @implements {FailFast} - Throws descriptive errors for invalid operations
 * @implements {IntentionalNaming} - Clear, self-documenting method names
 */
export class KeyboardShortcuts {
	/** History manager for undo/redo operations */
	private historyManager: HistoryManager;

	/** Calendar manager for date and month operations */
	private calendarManager: CalendarInstance;

	/** Validation manager for validation operations */
	private validationManager: ValidationManager;

	/** Debounce timeout ID for state pushing */
	private debounceTimeout: ReturnType<typeof setTimeout> | null = null;

	/** Debounce delay in milliseconds (500ms) */
	private readonly DEBOUNCE_DELAY = 500;

	/** Event listeners for cleanup */
	private eventListeners: Array<{
		target: EventTarget;
		type: string;
		handler: EventListener;
	}> = [];

	/** Unsubscribe function for calendar state changes */
	private stateChangeUnsubscribe: (() => void) | null = null;

	/** Flag to track if shortcuts are initialized */
	private isInitialized = false;

	/**
	 * Creates a new KeyboardShortcuts instance
	 *
	 * @param historyManager - HistoryManager instance for undo/redo
	 * @param calendarManager - CalendarManager instance for calendar operations
	 * @param validationManager - ValidationManager instance for validation operations
	 * @throws {Error} If any manager is null or undefined
	 */
	constructor(
		historyManager: HistoryManager,
		calendarManager: CalendarInstance,
		validationManager: ValidationManager,
	) {
		if (!historyManager) {
			throw new Error("HistoryManager is required");
		}
		if (!calendarManager) {
			throw new Error("CalendarManager is required");
		}
		if (!validationManager) {
			throw new Error("ValidationManager is required");
		}

		this.historyManager = historyManager;
		this.calendarManager = calendarManager;
		this.validationManager = validationManager;
	}

	/**
	 * Initializes keyboard shortcuts and state change tracking
	 *
	 * Attaches event listeners for Ctrl+Z, Ctrl+S, and Enter key.
	 * Hooks into CalendarManager state changes for undo state snapshots.
	 *
	 * @throws {Error} If already initialized
	 */
	initialize(): void {
		if (this.isInitialized) {
			throw new Error("KeyboardShortcuts already initialized");
		}

		this.attachKeyboardListeners();
		this.attachButtonKeyboardSupport();
		this.attachStateChangeObserver();

		this.isInitialized = true;
	}

	/**
	 * Destroys keyboard shortcuts and cleans up event listeners
	 *
	 * Removes all attached event listeners and unsubscribes from state changes.
	 */
	destroy(): void {
		// Remove all event listeners
		for (const { target, type, handler } of this.eventListeners) {
			target.removeEventListener(type, handler);
		}
		this.eventListeners = [];

		// Unsubscribe from state changes
		if (this.stateChangeUnsubscribe) {
			this.stateChangeUnsubscribe();
			this.stateChangeUnsubscribe = null;
		}

		// Clear debounce timeout
		if (this.debounceTimeout) {
			clearTimeout(this.debounceTimeout);
			this.debounceTimeout = null;
		}

		this.isInitialized = false;
	}

	/**
	 * Attaches keyboard event listeners for global shortcuts
	 *
	 * Handles Ctrl+Z (undo), Ctrl+S (validate).
	 * Supports both Ctrl and Meta (Cmd on Mac) keys.
	 *
	 * @private
	 */
	private attachKeyboardListeners(): void {
		const handleKeyDown = (e: Event): void => {
			if (!(e instanceof KeyboardEvent)) {
				return;
			}

			const isCtrlOrMeta = e.ctrlKey || e.metaKey;
			if (!isCtrlOrMeta) {
				return;
			}

			// Ctrl+Z / Cmd+Z - Undo
			if (e.key === "z" && !e.shiftKey) {
				e.preventDefault();
				this.handleUndo();
				return;
			}

			// Ctrl+S / Cmd+S - Save/Validate
			if (e.key === "s") {
				e.preventDefault();
				this.handleSave();
				return;
			}
		};

		// Store listener for cleanup
		this.eventListeners.push({
			target: document,
			type: "keydown",
			handler: handleKeyDown,
		});

		document.addEventListener("keydown", handleKeyDown);
	}

	/**
	 * Attaches Enter key support for today and clear buttons
	 *
	 * Allows pressing Enter to trigger button clicks when buttons are focused.
	 *
	 * @private
	 */
	private attachButtonKeyboardSupport(): void {
		const handleButtonKeyDown = (e: Event): void => {
			if (!(e instanceof KeyboardEvent)) {
				return;
			}

			if (e.key !== "Enter") {
				return;
			}

			const target = e.target as HTMLElement;

			// Check if target is a button or has button role
			if (
				target.tagName === "BUTTON" ||
				target.getAttribute("role") === "button"
			) {
				e.preventDefault();

				// Trigger click event
				target.click();
			}
		};

		// Store listener for cleanup
		this.eventListeners.push({
			target: document,
			type: "keydown",
			handler: handleButtonKeyDown,
		});

		document.addEventListener("keydown", handleButtonKeyDown);
	}

	/**
	 * Attaches observer to calendar state changes for undo snapshots
	 *
	 * Uses debounced state pushing to avoid rapid snapshot creation
	 * during drag operations or rapid clicking.
	 *
	 * @private
	 */
	private attachStateChangeObserver(): void {
		// Check if calendarManager has onStateChange method
		if (typeof this.calendarManager.onStateChange !== "function") {
			// CalendarManager interface might not expose this method yet
			// This is a graceful fallback
			return;
		}

		// Type assertion for CalendarManager's onStateChange
		const calendarManagerWithCallback = this.calendarManager as {
			onStateChange: (
				callback: (date: DateString, state: DateState | null) => void,
			) => () => void;
		};

		this.stateChangeUnsubscribe = calendarManagerWithCallback.onStateChange(
			() => {
				this.pushStateToHistory();
			},
		);
	}

	/**
	 * Pushes current application state to history stack
	 *
	 * Captures snapshot including calendar state, current month, and validation config.
	 * Debounced to prevent rapid successive pushes during drag operations.
	 */
	pushStateToHistory(): void {
		// Clear existing timeout to debounce rapid changes
		if (this.debounceTimeout) {
			clearTimeout(this.debounceTimeout);
		}

		// Set new timeout to push state after debounce delay
		this.debounceTimeout = setTimeout(() => {
			try {
				const snapshot = this.createStateSnapshot();
				this.historyManager.push(snapshot);
				this.debounceTimeout = null;
			} catch (error) {
				// Log error but don't throw to avoid disrupting user interaction
				console.error("Failed to push state to history:", error);
			}
		}, this.DEBOUNCE_DELAY);
	}

	/**
	 * Creates a state snapshot from current application state
	 *
	 * @returns Complete snapshot of calendar, month, and validation state
	 * @throws {Error} If calendarManager does not support getAllDates
	 * @private
	 */
	private createStateSnapshot(): UndoSnapshot {
		// Check if calendarManager supports getAllDates
		if (
			typeof (this.calendarManager as { getAllDates?: () => unknown })
				.getAllDates !== "function"
		) {
			throw new Error("CalendarManager does not support getAllDates");
		}

		const calendarManagerWithMethods = this.calendarManager as {
			getAllDates: () => Map<DateString, DateState>;
			getCurrentMonth?: () => Date;
		};

		const calendarState = calendarManagerWithMethods.getAllDates();

		// Get current month from manager or use default
		let currentMonth: Date;
		if (typeof calendarManagerWithMethods.getCurrentMonth === "function") {
			currentMonth = calendarManagerWithMethods.getCurrentMonth();
		} else {
			// Fallback: use today's date if getCurrentMonth not available
			currentMonth = new Date();
		}

		const validationConfig = this.validationManager.getConfig();

		return {
			calendarState,
			currentMonth,
			validationConfig,
			timestamp: Date.now(),
		};
	}

	/**
	 * Handles undo operation (Ctrl+Z / Cmd+Z)
	 *
	 * Pops most recent snapshot from history and restores state.
	 *
	 * @private
	 */
	private handleUndo(): void {
		const snapshot = this.historyManager.undo();
		if (!snapshot) {
			return;
		}

		// Restore calendar state
		const calendarManagerWithMethods = this.calendarManager as {
			clearDates?: (dates: (DateString | Date)[]) => void;
			setDates?: (dates: (DateString | Date)[], state: DateState) => void;
		};

		// Clear all dates first
		if (typeof calendarManagerWithMethods.clearDates === "function") {
			const allDates = Array.from(snapshot.calendarState.keys());
			calendarManagerWithMethods.clearDates(allDates);
		}

		// Set all dates from snapshot
		if (typeof calendarManagerWithMethods.setDates === "function") {
			const entries = Array.from(snapshot.calendarState.entries());
			for (const [date, state] of entries) {
				if (state) {
					calendarManagerWithMethods.setDates([date], state);
				}
			}
		}

		// Restore validation config
		this.validationManager.updateConfig(snapshot.validationConfig);
	}

	/**
	 * Handles save operation (Ctrl+S / Cmd+S)
	 *
	 * Triggers validation using the ValidationManager.
	 *
	 * @private
	 */
	private handleSave(): void {
		// Extract selected days from calendar
		const validationManagerWithMethods = this.validationManager as {
			getSelectedDaysFromDOM?: () => Array<{
				year: number;
				month: number;
				day: number;
				type: string;
			}>;
		};

		if (
			typeof validationManagerWithMethods.getSelectedDaysFromDOM !== "function"
		) {
			console.warn("ValidationManager does not support getSelectedDaysFromDOM");
			return;
		}

		const rawSelectedDays =
			validationManagerWithMethods.getSelectedDaysFromDOM();

		// Map string type to DaySelectionType for type safety
		const selectedDays: SelectedDay[] = rawSelectedDays.map((day) => ({
			...day,
			type: ((day.type as string) === "out-of-office"
				? "out-of-office"
				: "none") satisfies DaySelectionType,
		}));

		// Trigger validation
		void this.validationManager.validate(selectedDays);
	}
}

export default KeyboardShortcuts;
