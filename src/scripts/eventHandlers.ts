/**
 * Centralized calendar event handling with event delegation
 * Refactored to use CalendarManager public API for state management
 *
 * This module handles all user interactions with the calendar including:
 * - Drag painting (click-drag selection)
 * - Keyboard navigation
 * - Clear operations
 * - Today highlighting
 * - Screen reader announcements
 *
 * @packageDocumentation
 */

import type { CalendarManager } from "../../packages/rto-calendar/src/CalendarManager";
import { formatDate } from "../../packages/rto-calendar/src/lib/dateUtils";
import { dragState } from "../../packages/rto-calendar/src/stores/calendarStore";
import type {
	DateState,
	DateString,
} from "../../packages/rto-calendar/src/types";
import { logger } from "../utils/logger";

/**
 * Selection intent type for drag painting operations
 * Determines what state should be applied during drag operations
 */
type SelectionIntent = DateState | null;

/**
 * Internal drag state tracking
 * Extended from package dragState to include selection intent and DOM cell reference
 */
interface InternalDragState {
	/** Whether a drag operation is currently in progress */
	isDragging: boolean;
	/** The DOM element of the starting cell */
	startCell: HTMLElement | null;
	/** The selection intent to apply during drag (state or null to clear) */
	selectionIntent: SelectionIntent;
}

/**
 * CalendarEventManager - Handles all calendar UI interactions
 *
 * Uses CalendarManager public API for all state mutations and maintains
 * drag state via nanostores. Provides event delegation for performance.
 *
 * @example
 * ```ts
 * const manager = new CalendarManager('#calendar', config);
 * manager.init();
 * const eventManager = new CalendarEventManager(manager);
 * eventManager.initialize();
 * ```
 */
class CalendarEventManager {
	/** Reference to the CalendarManager instance for state operations */
	private manager: CalendarManager;

	/** Internal drag state tracking (extends package dragState) */
	private internalDragState: InternalDragState = {
		isDragging: false,
		startCell: null,
		selectionIntent: null,
	};

	/** Timer for updating today's date highlight */
	private todayTimer: number | null = null;

	/** Unsubscribe function for drag state subscription */
	private dragStateUnsubscribe: (() => void) | null = null;

	/** State change callback unregister function */
	private stateChangeUnsubscribe: (() => void) | null = null;

	/** Cleanup function references for event listeners */
	private cleanupFunctions: Array<() => void> = [];

	/**
	 * Creates a new CalendarEventManager instance
	 *
	 * @param manager - The CalendarManager instance to use for state operations
	 * @throws {Error} If manager is not provided
	 */
	constructor(manager: CalendarManager) {
		if (!manager) {
			throw new Error("CalendarManager instance is required");
		}
		this.manager = manager;
	}

	/**
	 * Initializes the event manager
	 *
	 * Attaches event listeners, subscribes to store changes,
	 * and starts the today timer.
	 *
	 * @throws {Error} If not running in browser environment
	 */
	initialize(): void {
		// Guard clause: SSR safety check
		if (typeof window === "undefined") {
			return;
		}

		this.attachCalendarGridEvents();
		this.attachDocumentEvents();
		this.attachClearButtonHandlers();
		this.subscribeToStoreChanges();
		this.updateTodayHighlight();
		this.startTodayTimer();
		logger.info("[EventHandlers] Initialized with CalendarManager integration");
	}

	/**
	 * Attaches event listeners to the calendar grid
	 *
	 * Uses event delegation for performance: single listener on grid container
	 * handles all cell interactions.
	 *
	 * @private
	 */
	private attachCalendarGridEvents(): void {
		const grid = document.querySelector(".months-grid");
		if (!grid) {
			logger.warn("[EventHandlers] Calendar grid not found");
			return;
		}

		// Handle mousedown (left-click only for drag start)
		const mousedownHandler = this.handleGridMouseDown.bind(this);
		grid.addEventListener("mousedown", mousedownHandler as EventListener);
		this.cleanupFunctions.push(() =>
			grid.removeEventListener("mousedown", mousedownHandler as EventListener),
		);

		// Handle mouseover (for drag painting)
		const mouseoverHandler = this.handleGridMouseOver.bind(this);
		grid.addEventListener("mouseover", mouseoverHandler as EventListener);
		this.cleanupFunctions.push(() =>
			grid.removeEventListener("mouseover", mouseoverHandler as EventListener),
		);

		// Handle keyboard navigation
		const keydownHandler = this.handleGridKeyDown.bind(this);
		grid.addEventListener("keydown", keydownHandler as EventListener);
		this.cleanupFunctions.push(() =>
			grid.removeEventListener("keydown", keydownHandler as EventListener),
		);

		logger.info("[EventHandlers] Attached event listeners to calendar grid");
	}

	/**
	 * Attaches global document event listeners
	 *
	 * Handles mouse up and document mouse leave for drag termination.
	 *
	 * @private
	 */
	private attachDocumentEvents(): void {
		// Handle global mouseup to end drag
		const mouseupHandler = this.handleDocumentMouseUp.bind(this);
		document.addEventListener("mouseup", mouseupHandler);
		this.cleanupFunctions.push(() =>
			document.removeEventListener("mouseup", mouseupHandler),
		);

		// Handle mouseleave document to end drag
		const mouseleaveHandler = this.handleDocumentMouseUp.bind(this);
		document.addEventListener("mouseleave", mouseleaveHandler);
		this.cleanupFunctions.push(() =>
			document.removeEventListener("mouseleave", mouseleaveHandler),
		);
	}

	/**
	 * Attaches clear button handlers via event delegation
	 *
	 * Handles clear-all and clear-month button clicks.
	 *
	 * @private
	 */
	private attachClearButtonHandlers(): void {
		const clickHandler = (e: Event) => {
			const target = e.target as Element;
			const clearButton = target.closest('[id^="clear-"]');
			if (!clearButton) return;

			const buttonId = clearButton.id;

			// Handle global clear buttons
			if (
				buttonId === "clear-all-button-top" ||
				buttonId === "clear-all-button-bottom"
			) {
				this.clearAllSelections();
			}
			// Handle month-specific clear buttons
			else if (buttonId.startsWith("clear-")) {
				this.clearMonthSelections(clearButton as HTMLElement);
			}
		};

		document.addEventListener("click", clickHandler);
		this.cleanupFunctions.push(() =>
			document.removeEventListener("click", clickHandler),
		);
	}

	/**
	 * Subscribes to nanostore changes for reactive updates
	 *
	 * Tracks drag state from package and registers state change callback
	 * with CalendarManager.
	 *
	 * @private
	 */
	private subscribeToStoreChanges(): void {
		// Subscribe to drag state changes from package
		this.dragStateUnsubscribe = dragState.subscribe((state) => {
			// Sync package drag state with internal state
			this.internalDragState.isDragging = state.isDragging;
		});

		// Register state change callback with CalendarManager
		this.stateChangeUnsubscribe = this.manager.onStateChange(
			(date: DateString, state: DateState | null) => {
				// Update DOM cell when state changes via CalendarManager
				this.updateCellDOM(date, state);
			},
		);
	}

	/**
	 * Handles mouse down on calendar grid
	 *
	 * Initiates drag operation and determines selection intent based on
	 * the clicked cell's current state.
	 *
	 * @param e - Mouse event
	 * @private
	 */
	private handleGridMouseDown(e: MouseEvent): void {
		const target = e.target as Element;
		const cell = target.closest(".calendar-day");
		if (!cell) return;

		// Guard clause: only left-click (button 0)
		if (e.button !== 0) return;

		e.preventDefault();

		const cellElement = cell as HTMLElement;
		const date = this.getDateFromCell(cellElement);
		if (!date) return;

		const currentState = this.manager.getState(date);

		// Determine selection intent based on current state
		// If already has a state (OOF), we want to clear; otherwise, select as OOF
		const intendedSelection: SelectionIntent = currentState ? null : "oof";

		// Update internal drag state
		this.internalDragState = {
			isDragging: true,
			startCell: cellElement,
			selectionIntent: intendedSelection,
		};

		// Update package drag state
		dragState.set({
			isDragging: true,
			startPoint: date,
			currentPoint: date,
			direction: null,
		});

		// Apply selection to the clicked cell
		this.applySelectionToDate(date, intendedSelection);
	}

	/**
	 * Handles mouse over on calendar grid during drag
	 *
	 * Applies the drag selection intent to hovered cells.
	 *
	 * @param e - Mouse event
	 * @private
	 */
	private handleGridMouseOver(e: MouseEvent): void {
		// Guard clause: only process during active drag
		if (!this.internalDragState.isDragging) return;

		const target = e.target as Element;
		const cell = target.closest(".calendar-day");
		if (!cell) return;

		const cellElement = cell as HTMLElement;
		const date = this.getDateFromCell(cellElement);
		if (!date) return;

		const startCell = this.internalDragState.startCell;
		if (!startCell) return;

		const startDate = this.getDateFromCell(startCell);
		if (!startDate) return;

		// Update package drag state current point
		const direction = this.getDragDirection(startDate, date);
		dragState.set({
			isDragging: true,
			startPoint: startDate,
			currentPoint: date,
			direction,
		});

		// Apply the same selection intent to all cells during drag
		this.applySelectionToDate(date, this.internalDragState.selectionIntent);
	}

	/**
	 * Handles global mouse up to end drag operation
	 *
	 * Resets all drag states.
	 *
	 * @private
	 */
	private handleDocumentMouseUp(): void {
		if (this.internalDragState.isDragging) {
			// Reset internal drag state
			this.internalDragState = {
				isDragging: false,
				startCell: null,
				selectionIntent: null,
			};

			// Reset package drag state
			dragState.set({
				isDragging: false,
				startPoint: null,
				currentPoint: null,
				direction: null,
			});
		}
	}

	/**
	 * Handles keyboard navigation and selection
	 *
	 * Supports Enter/Space for toggle, Arrow keys for navigation,
	 * and Escape to cancel drag.
	 *
	 * @param e - Keyboard event
	 * @private
	 */
	private handleGridKeyDown(e: KeyboardEvent): void {
		const target = e.target as Element;
		const cell = target.closest(".calendar-day");
		if (!cell) return;

		const cellElement = cell as HTMLElement;
		const date = this.getDateFromCell(cellElement);
		if (!date) return;

		switch (e.key) {
			case "Enter":
			case " ": {
				e.preventDefault();
				// Toggle OOF selection
				const currentState = this.manager.getState(date);
				const wasOOF = currentState === "oof";

				if (wasOOF) {
					this.applySelectionToDate(date, null);
				} else {
					this.applySelectionToDate(date, "oof");
				}
				break;
			}

			case "ArrowUp":
			case "ArrowDown":
			case "ArrowLeft":
			case "ArrowRight":
				e.preventDefault();
				this.navigateKeyboard(e.key, cellElement);
				break;

			case "Escape":
				this.clearDragState();
				break;
		}
	}

	/**
	 * Navigates between day cells with arrow keys
	 *
	 * Calculates the next cell based on direction and moves focus.
	 *
	 * @param direction - Arrow key direction
	 * @param currentCell - Currently focused cell
	 * @private
	 */
	private navigateKeyboard(direction: string, currentCell: HTMLElement): void {
		const allCells = Array.from(
			document.querySelectorAll(".calendar-day:not(.empty)"),
		);
		const currentIndex = allCells.indexOf(currentCell);

		// Guard clause: current cell not found in list
		if (currentIndex === -1) return;

		let nextIndex: number;
		switch (direction) {
			case "ArrowRight":
				nextIndex = (currentIndex + 1) % allCells.length;
				break;
			case "ArrowLeft":
				nextIndex = (currentIndex - 1 + allCells.length) % allCells.length;
				break;
			case "ArrowDown":
				nextIndex = (currentIndex + 7) % allCells.length;
				break;
			case "ArrowUp":
				nextIndex = (currentIndex - 7 + allCells.length) % allCells.length;
				break;
			default:
				return; // Invalid direction
		}

		// Move focus to next cell
		if (nextIndex !== undefined && allCells[nextIndex]) {
			(allCells[nextIndex] as HTMLElement).focus();
		}
	}

	/**
	 * Applies a selection state to a specific date
	 *
	 * Uses CalendarManager API to mutate state and updates the DOM.
	 * Dispatches events for other modules.
	 *
	 * @param date - Date string in YYYY-MM-DD format
	 * @param type - Selection state to apply (DateState or null to clear)
	 * @private
	 */
	private applySelectionToDate(date: DateString, type: SelectionIntent): void {
		if (type === null) {
			// Clear selection using CalendarManager API
			this.manager.clearDates([date]);
		} else {
			// Apply selection state using CalendarManager API
			this.manager.setDates([date], type);
		}

		// Update DOM directly for immediate feedback
		this.updateCellDOM(date, type);

		// Dispatch event for other modules (validation, localStorage)
		const cell = this.getCellFromDate(date);
		if (cell) {
			cell.dispatchEvent(
				new CustomEvent("rto-selection-changed", {
					bubbles: true,
					detail: { cell, selectionType: type, date },
				}),
			);
		}
	}

	/**
	 * Updates a cell's DOM to reflect its selection state
	 *
	 * Updates data attributes, classes, and ARIA attributes.
	 *
	 * @param date - Date string in YYYY-MM-DD format
	 * @param state - Selection state or null
	 * @private
	 */
	private updateCellDOM(date: DateString, state: DateState | null): void {
		const cell = this.getCellFromDate(date);
		if (!cell) return;

		const currentLabel = cell.getAttribute("aria-label") || "";

		if (state === null) {
			// Clear selection
			cell.dataset.selected = "false";
			cell.dataset.selectionType = "";
			cell.classList.remove("selected", "out-of-office");
			cell.ariaSelected = "false";

			// Update aria-label for accessibility
			const newLabel = currentLabel.replace(/\. .*$/, ". Unselected");
			cell.setAttribute("aria-label", newLabel);
		} else {
			// Apply selection state
			const selectionClass = state === "oof" ? "out-of-office" : state;
			cell.dataset.selected = "true";
			cell.dataset.selectionType = state;
			cell.classList.add("selected", selectionClass);
			cell.ariaSelected = "true";

			// Update aria-label for accessibility
			const label =
				state === "oof"
					? "Out of office"
					: state === "working"
						? "Working"
						: state;
			const newLabel = currentLabel.replace(/\. .*$/, `.${label}`);
			cell.setAttribute("aria-label", newLabel);
		}
	}

	/**
	 * Clears all selections globally
	 *
	 * Uses CalendarManager API to clear all selected dates.
	 *
	 * @private
	 */
	private clearAllSelections(): void {
		this.manager.clearAll();
		this.announceToScreenReader("Cleared all selections");
	}

	/**
	 * Clears selections for a specific month
	 *
	 * Clears all selected dates within the month controlled by the clear button.
	 *
	 * @param button - The clear button element
	 * @private
	 */
	private clearMonthSelections(button: HTMLElement): void {
		const monthId = button.getAttribute("aria-controls");
		if (!monthId) return;

		const monthContainer = document.getElementById(monthId);
		if (!monthContainer) {
			logger.warn(`[EventHandlers] Month container not found: ${monthId}`);
			return;
		}

		const selectedCells = monthContainer.querySelectorAll(
			".calendar-day.selected",
		);
		const count = selectedCells.length;

		const datesToClear: DateString[] = [];
		selectedCells.forEach((cell) => {
			const date = this.getDateFromCell(cell as HTMLElement);
			if (date) datesToClear.push(date);
		});

		if (datesToClear.length > 0) {
			this.manager.clearDates(datesToClear);
		}

		this.announceToScreenReader(`Cleared ${count} selections`);
	}

	/**
	 * Clears the drag state
	 *
	 * Resets both internal and package drag states.
	 *
	 * @private
	 */
	private clearDragState(): void {
		this.internalDragState = {
			isDragging: false,
			startCell: null,
			selectionIntent: null,
		};

		dragState.set({
			isDragging: false,
			startPoint: null,
			currentPoint: null,
			direction: null,
		});
	}

	/**
	 * Updates today's date highlight
	 *
	 * Adds/removes "today" class and sets aria-current attribute.
	 *
	 * @private
	 */
	private updateTodayHighlight(): void {
		const today = new Date();
		today.setHours(0, 0, 0, 0);

		const allCells = document.querySelectorAll(
			".calendar-day[data-year][data-month][data-day]",
		);

		allCells.forEach((cell) => {
			const el = cell as HTMLElement;
			const cellDate = new Date(
				parseInt(el.dataset.year || "0", 10),
				parseInt(el.dataset.month || "0", 10),
				parseInt(el.dataset.day || "0", 10),
			);
			cellDate.setHours(0, 0, 0, 0);

			if (cellDate.getTime() === today.getTime()) {
				el.classList.add("today");
				el.setAttribute("aria-current", "date");
			} else {
				el.classList.remove("today");
				el.removeAttribute("aria-current");
			}
		});
	}

	/**
	 * Starts the today timer
	 *
	 * Updates today's highlight every minute to catch midnight crossover.
	 *
	 * @private
	 */
	private startTodayTimer(): void {
		// Guard clause: don't start multiple timers
		if (this.todayTimer !== null) {
			return;
		}

		this.todayTimer = window.setInterval(() => {
			this.updateTodayHighlight();
		}, 60000); // Check every minute
	}

	/**
	 * Announces a message to screen readers
	 *
	 * Creates a temporary ARIA live region and removes it after announcement.
	 *
	 * @param message - The message to announce
	 * @private
	 */
	private announceToScreenReader(message: string): void {
		const announcement = document.createElement("div");
		announcement.setAttribute("role", "status");
		announcement.setAttribute("aria-live", "polite");
		announcement.setAttribute("aria-atomic", "true");
		announcement.className = "sr-only calendar-announcement";
		announcement.textContent = message;

		document.body.appendChild(announcement);

		setTimeout(() => {
			if (document.body.contains(announcement)) {
				document.body.removeChild(announcement);
			}
		}, 1000);
	}

	/**
	 * Gets the date string from a calendar cell element
	 *
	 * Extracts year, month, day from data attributes and formats as YYYY-MM-DD.
	 *
	 * @param cell - The calendar cell element
	 * @returns The date string or null if invalid
	 * @private
	 */
	private getDateFromCell(cell: HTMLElement): DateString | null {
		const year = parseInt(cell.dataset.year || "0", 10);
		const month = parseInt(cell.dataset.month || "0", 10);
		const day = parseInt(cell.dataset.day || "0", 10);

		// Guard clause: validate date components
		if (!year || !month || !day) return null;
		if (Number.isNaN(year) || Number.isNaN(month) || Number.isNaN(day))
			return null;

		try {
			const date = new Date(year, month, day);
			const dateStr = formatDate(date);
			return dateStr;
		} catch (error) {
			logger.warn("[EventHandlers] Failed to format date from cell", error);
			return null;
		}
	}

	/**
	 * Gets a cell element from a date string
	 *
	 * Finds the calendar cell corresponding to the given date.
	 *
	 * @param date - The date string in YYYY-MM-DD format
	 * @returns The cell element or null if not found
	 * @private
	 */
	private getCellFromDate(date: DateString): HTMLElement | null {
		const parsed = this.parseDate(date);
		if (!parsed) return null;

		return document.querySelector(
			`.calendar-day[data-year="${parsed.year}"][data-month="${parsed.month}"][data-day="${parsed.day}"]`,
		) as HTMLElement | null;
	}

	/**
	 * Parses a date string into components
	 *
	 * @param date - The date string in YYYY-MM-DD format
	 * @returns The parsed components or null if invalid
	 * @private
	 */
	private parseDate(
		date: DateString,
	): { year: number; month: number; day: number } | null {
		const parts = date.split("-");
		if (parts.length !== 3) return null;

		// We've validated the length, so these elements exist
		const year = parseInt(parts[0] || "0", 10);
		const month = parseInt(parts[1] || "0", 10);
		const day = parseInt(parts[2] || "0", 10);

		if (Number.isNaN(year) || Number.isNaN(month) || Number.isNaN(day))
			return null;

		return { year, month, day };
	}

	/**
	 * Gets the drag direction between two dates
	 *
	 * @param startDate - The starting date string
	 * @param currentDate - The current date string
	 * @returns The drag direction or null
	 * @private
	 */
	private getDragDirection(
		startDate: DateString,
		currentDate: DateString,
	): "forward" | "backward" | null {
		if (startDate === currentDate) return null;

		// Simple string comparison works for YYYY-MM-DD format
		return startDate < currentDate ? "forward" : "backward";
	}

	/**
	 * Destroys the event manager
	 *
	 * Removes all event listeners, clears timers, unsubscribes from stores,
	 * and unregisters callbacks.
	 */
	destroy(): void {
		// Clear timers
		if (this.todayTimer !== null) {
			clearInterval(this.todayTimer);
			this.todayTimer = null;
		}

		// Unsubscribe from drag state
		if (this.dragStateUnsubscribe) {
			this.dragStateUnsubscribe();
			this.dragStateUnsubscribe = null;
		}

		// Unregister state change callback
		if (this.stateChangeUnsubscribe) {
			this.stateChangeUnsubscribe();
			this.stateChangeUnsubscribe = null;
		}

		// Clear drag state
		this.clearDragState();

		// Execute all cleanup functions
		for (const cleanup of this.cleanupFunctions) {
			cleanup();
		}
		this.cleanupFunctions = [];

		logger.info("[EventHandlers] Destroyed event manager");
	}
}

/**
 * Initializes calendar event handlers with CalendarManager integration
 *
 * Creates a new CalendarEventManager instance and attaches it to a CalendarManager instance.
 *
 * @param manager - The CalendarManager instance (required)
 * @throws {Error} If not running in browser environment or manager is not provided
 *
 * @example
 * ```ts
 * import { CalendarManager } from '../../packages/rto-calendar/src/CalendarManager';
 * import { initializeEventHandlers } from './eventHandlers';
 *
 * const manager = new CalendarManager('#calendar', config);
 * manager.init();
 * const eventManager = initializeEventHandlers(manager);
 *
 * // Later, when cleaning up:
 * eventManager.destroy();
 * ```
 */
export function initializeEventHandlers(
	manager: CalendarManager,
): CalendarEventManager {
	// Guard clause: SSR safety check
	if (typeof window === "undefined") {
		throw new Error("Event handlers can only be initialized in browser");
	}

	if (!manager) {
		throw new Error("CalendarManager is required");
	}

	const eventManager = new CalendarEventManager(manager);
	eventManager.initialize();

	// Expose for debugging/cleanup if needed
	(
		window as unknown as { __calendarEventManager?: CalendarEventManager }
	).__calendarEventManager = eventManager;

	return eventManager;
}

export { CalendarEventManager };
