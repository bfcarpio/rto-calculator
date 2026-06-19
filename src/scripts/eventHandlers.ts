/**
 * Centralized calendar event handling with event delegation
 * Refactored to use CalendarManager public API for state management
 *
 * This module handles all user interactions with the calendar including:
 * - Drag painting (click-drag selection) — delegated to drag-painting module
 * - Keyboard navigation — delegated to keyboard-navigation module
 * - Clear operations
 * - Today highlighting
 * - Screen reader announcements
 *
 * @packageDocumentation
 */

import type { CalendarManager } from "../../packages/datepainter/src/CalendarManager";
import { dragState } from "../../packages/datepainter/src/stores/calendarStore";
import type {
	DateState,
	DateString,
} from "../../packages/datepainter/src/types";
import { announceToScreenReader } from "../utils/accessibility";
import { logger } from "../utils/logger";
import {
	applySelectionToDate,
	clearMonthSelections,
	createInternalDragState,
	getDateFromCell,
	getDragDirection,
	type InternalDragState,
	resetDragState,
	type SelectionIntent,
	updateCellDOM,
} from "./drag-painting";
import { navigateKeyboard, toggleCellSelection } from "./keyboard-navigation";

// Re-export types for backward compatibility
export type { InternalDragState, SelectionIntent } from "./drag-painting";
export {
	applySelectionToDate,
	clearMonthSelections,
	getCellFromDate,
	getDateFromCell,
	getDragDirection,
	parseDate,
	updateCellDOM,
} from "./drag-painting";
export { navigateKeyboard, toggleCellSelection } from "./keyboard-navigation";

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
	private internalDragState: InternalDragState = createInternalDragState();

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
			if (!clearButton) {
				return;
			}

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
				const count = clearMonthSelections(
					clearButton as HTMLElement,
					this.manager,
				).length;
				announceToScreenReader(`Cleared ${count} selections`);
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
				updateCellDOM(date, state);
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
		if (!cell) {
			return;
		}

		// Guard clause: only left-click (button 0)
		if (e.button !== 0) {
			return;
		}

		e.preventDefault();

		const cellElement = cell as HTMLElement;
		const date = getDateFromCell(cellElement);
		if (!date) {
			return;
		}

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
		applySelectionToDate(this.manager, date, intendedSelection);
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
		if (!this.internalDragState.isDragging) {
			return;
		}

		const target = e.target as Element;
		const cell = target.closest(".calendar-day");
		if (!cell) {
			return;
		}

		const cellElement = cell as HTMLElement;
		const date = getDateFromCell(cellElement);
		if (!date) {
			return;
		}

		const startCell = this.internalDragState.startCell;
		if (!startCell) {
			return;
		}

		const startDate = getDateFromCell(startCell);
		if (!startDate) {
			return;
		}

		// Update package drag state current point
		const direction = getDragDirection(startDate, date);
		dragState.set({
			isDragging: true,
			startPoint: startDate,
			currentPoint: date,
			direction,
		});

		// Apply the same selection intent to all cells during drag
		applySelectionToDate(
			this.manager,
			date,
			this.internalDragState.selectionIntent,
		);
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
			this.internalDragState = resetDragState();

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
		if (!cell) {
			return;
		}

		const cellElement = cell as HTMLElement;
		const date = getDateFromCell(cellElement);
		if (!date) {
			return;
		}

		switch (e.key) {
			case "Enter":
			case " ": {
				e.preventDefault();
				const currentState = this.manager.getState(date);
				toggleCellSelection(this.manager, date, currentState);
				break;
			}

			case "ArrowUp":
			case "ArrowDown":
			case "ArrowLeft":
			case "ArrowRight":
				e.preventDefault();
				navigateKeyboard(e.key, cellElement);
				break;

			case "Escape":
				this.clearDragState();
				break;
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
		announceToScreenReader("Cleared all selections");
	}

	/**
	 * Clears the drag state
	 *
	 * Resets both internal and package drag states.
	 *
	 * @private
	 */
	private clearDragState(): void {
		this.internalDragState = resetDragState();

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
 * import { CalendarManager } from '../../packages/datepainter/src/CalendarManager';
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
	window.__calendarEventManager = eventManager;

	return eventManager;
}

export { CalendarEventManager };
