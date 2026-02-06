/**
 * Event Handlers for RTO Calendar
 *
 * Provides centralized event handling for calendar interactions including:
 * - Click/tap handlers for date selection
 * - Drag handlers for multi-date painting
 * - Keyboard navigation handlers
 * - Clear button handlers
 * - Screen reader announcements for accessibility
 *
 * All handlers are SSR-safe and integrate with CalendarManager
 * and nanostore-based state management system.
 *
 * @module eventHandlers
 */

import { formatDate } from "../lib/dateUtils";
import {
  clearDateState,
  dragState as dragStateStore,
  getAllDates,
  setDateState,
} from "../stores/calendarStore";
import type { CalendarConfig, DateState, DateString } from "../types";

/**
 * Extended drag state interface for event handling
 *
 * Tracks the state of an ongoing drag/paint operation across calendar cells.
 * Extends the store's drag state with DOM-specific information.
 */
interface DragHandlerState {
  /** Whether a drag operation is currently in progress */
  isDragging: boolean;
  /** The DOM element of the starting cell */
  startCell: HTMLElement | null;
  /** The state type being applied during the drag (e.g., 'oof', 'working') */
  selectionIntent: DateState | null;
}

/**
 * Configuration for event handler initialization
 */
interface EventHandlerConfig {
  /** Calendar container selector or element */
  container: HTMLElement;
  /** Calendar configuration object */
  config: CalendarConfig;
  /** Callback invoked when a date state changes */
  onDateChange?: (date: DateString, state: DateState | null) => void;
}

/**
 * Calendar Event Handlers Class
 *
 * Manages all DOM event interactions for the calendar widget.
 * Uses event delegation for performance and SSR-safe initialization.
 *
 * @example
 * ```ts
 * import { CalendarEventHandlers } from './scripts/eventHandlers';
 * import { CalendarManager } from './CalendarManager';
 *
 * const manager = new CalendarManager('#calendar', config);
 * manager.init();
 *
 * const handlers = new CalendarEventHandlers({
 *   container: manager.container,
 *   config,
 *   onDateChange: (date, state) => console.log(date, state)
 * });
 * handlers.initialize();
 * ```
 */
export class CalendarEventHandlers {
  /** Internal drag state tracking */
  private dragState: DragHandlerState = {
    isDragging: false,
    startCell: null,
    selectionIntent: null,
  };

  /** DOM element containing the calendar */
  private container: HTMLElement;

  /** Calendar configuration */
  private config: CalendarConfig;

  /** Callback for date state changes */
  private onDateChange?: EventHandlerConfig["onDateChange"];

  /** Timer for updating "today" highlight */
  private todayTimer: number | null = null;

  /** Cleanup function references */
  private cleanupFunctions: Array<() => void> = [];

  /**
   * Creates a new CalendarEventHandlers instance
   *
   * @param config - Event handler configuration
   * @throws {Error} If container is not found
   */
  constructor(config: EventHandlerConfig) {
    if (!config.container) {
      throw new Error("Container element is required");
    }
    this.container = config.container;
    this.config = config.config;
    this.onDateChange = config.onDateChange;
  }

  /**
   * Initializes all event handlers
   *
   * Attaches event listeners to the calendar container and document.
   * Safe to call multiple times - checks for SSR environment first.
   *
   * @throws {Error} If not called in a browser environment
   */
  initialize(): void {
    // Guard clause: SSR safety check
    if (typeof window === "undefined") {
      return;
    }

    this.attachCalendarGridEvents();
    this.attachDocumentEvents();
    this.attachClearButtonHandlers();
    this.updateTodayHighlight();
    this.startTodayTimer();
  }

  /**
   * Destroys all event handlers and cleans up resources
   *
   * Removes all event listeners, clears timers, and resets internal state.
   * Should be called when the calendar instance is being removed from the DOM.
   */
  destroy(): void {
    // Clear today timer
    if (this.todayTimer !== null) {
      clearInterval(this.todayTimer);
      this.todayTimer = null;
    }

    // Clear drag state
    this.clearDragState();

    // Execute all cleanup functions
    for (const cleanup of this.cleanupFunctions) {
      cleanup();
    }
    this.cleanupFunctions = [];
  }

  /**
   * Attaches event listeners to the calendar grid for cell interactions
   *
   * Uses event delegation for optimal performance with many calendar cells.
   *
   * @private
   */
  private attachCalendarGridEvents(): void {
    const grid = this.container.querySelector(".rto-calendar__days");
    if (!grid) {
      console.warn("[CalendarEventHandlers] Calendar grid not found");
      return;
    }

    // Handle mousedown (start drag or toggle single cell)
    const mousedownHandler = (e: Event) => this.handleGridMouseDown(e as MouseEvent);
    grid.addEventListener("mousedown", mousedownHandler);
    this.cleanupFunctions.push(() => grid.removeEventListener("mousedown", mousedownHandler));

    // Handle mouseover (drag over cells)
    const mouseoverHandler = (e: Event) => this.handleGridMouseOver(e as MouseEvent);
    grid.addEventListener("mouseover", mouseoverHandler);
    this.cleanupFunctions.push(() => grid.removeEventListener("mouseover", mouseoverHandler));

    // Handle keyboard navigation
    const keydownHandler = (e: Event) => this.handleGridKeyDown(e as KeyboardEvent);
    grid.addEventListener("keydown", keydownHandler);
    this.cleanupFunctions.push(() => grid.removeEventListener("keydown", keydownHandler));
  }

  /**
   * Attaches event listeners to the document for global drag state management
   *
   * @private
   */
  private attachDocumentEvents(): void {
    // Handle global mouseup to end drag anywhere
    const mouseupHandler = this.handleDocumentMouseUp.bind(this);
    document.addEventListener("mouseup", mouseupHandler);
    this.cleanupFunctions.push(() => document.removeEventListener("mouseup", mouseupHandler));

    // Handle mouseleave document to end drag
    const mouseleaveHandler = this.handleDocumentMouseUp.bind(this);
    document.addEventListener("mouseleave", mouseleaveHandler);
    this.cleanupFunctions.push(() => document.removeEventListener("mouseleave", mouseleaveHandler));
  }

  /**
   * Attaches event listeners for clear buttons using event delegation
   *
   * @private
   */
  private attachClearButtonHandlers(): void {
    const clickHandler = (e: Event) => {
      const target = e.target as Element;
      const clearButton = target.closest('[data-action="clear"]');

      if (!clearButton) return;

      const button = clearButton as HTMLElement;
      const scope = button.dataset.scope;

      if (scope === "all") {
        this.clearAllSelections();
      } else if (scope === "month") {
        const monthId = button.dataset.month;
        if (monthId) {
          this.clearMonthSelections(monthId);
        }
      }
    };

    this.container.addEventListener("click", clickHandler);
    this.cleanupFunctions.push(() => this.container.removeEventListener("click", clickHandler));
  }

  /**
   * Handles mousedown events on calendar grid cells
   *
   * Initiates a drag operation if painting is enabled, or toggles the cell state.
   * Only left-click (button 0) is handled - right-click and middle-click are ignored.
   *
   * @param e - Mouse event
   * @private
   */
  private handleGridMouseDown(e: MouseEvent): void {
    const target = e.target as Element;
    const cell = target.closest(".rto-calendar__day[data-date]");

    // Guard clause: ignore if not on a date cell
    if (!cell) return;

    // Guard clause: only left-click
    if (e.button !== 0) return;

    e.preventDefault();

    const cellElement = cell as HTMLElement;
    const dateStr = cellElement.dataset.date as DateString;

    // Guard clause: validate date string
    if (!dateStr) {
      console.warn("[CalendarEventHandlers] Cell missing date attribute");
      return;
    }

    // Get current state from store
    const currentState = getAllDates().get(dateStr);

    // Determine selection intent based on cell's current state
    // If already has a state, we want to clear; otherwise, set to default
    const defaultState = this.config.painting?.defaultState || "working";
    const intendedSelection: DateState | null = currentState ? null : defaultState;

    // Update drag state if painting is enabled
    if (this.config.painting?.enabled) {
      this.dragState.isDragging = true;
      this.dragState.startCell = cellElement;
      this.dragState.selectionIntent = intendedSelection;

      // Update store drag state for external subscribers
      dragStateStore.set({
        isDragging: true,
        startPoint: dateStr,
        currentPoint: dateStr,
        direction: null,
      });
    }

    // Apply selection to the clicked cell
    this.applySelectionToCell(cellElement, intendedSelection);
  }

  /**
   * Handles mouseover events during drag operations
   *
   * Applies the same selection state to all cells during a drag operation.
   * The selection intent is captured on the first click and persists throughout the drag.
   *
   * @param e - Mouse event
   * @private
   */
  private handleGridMouseOver(e: MouseEvent): void {
    // Guard clause: only process during active drag
    if (!this.dragState.isDragging) return;

    const target = e.target as Element;
    const cell = target.closest(".rto-calendar__day[data-date]");

    // Guard clause: ignore if not on a date cell
    if (!cell) return;

    const cellElement = cell as HTMLElement;
    const dateStr = cellElement.dataset.date as DateString;

    // Guard clause: validate date string
    if (!dateStr) return;

    // Apply the same selection intent to all cells during drag
    this.applySelectionToCell(cellElement, this.dragState.selectionIntent);

    // Update store drag state
    dragStateStore.set({
      isDragging: true,
      startPoint: (this.dragState.startCell?.dataset.date as DateString | null) || null,
      currentPoint: dateStr,
      direction: null, // Can be calculated if needed
    });
  }

  /**
   * Handles mouseup events on the document to end drag operations
   *
   * Clears drag state when the user releases the mouse anywhere on the page.
   *
   * @private
   */
  private handleDocumentMouseUp(): void {
    if (this.dragState.isDragging) {
      this.clearDragState();
    }
  }

  /**
   * Handles keyboard navigation and selection events
   *
   * Supports:
   * - Enter/Space: Toggle cell state
   * - Arrow keys: Navigate between cells
   * - Escape: Cancel drag operation
   *
   * @param e - Keyboard event
   * @private
   */
  private handleGridKeyDown(e: KeyboardEvent): void {
    const target = e.target as Element;
    const cell = target.closest(".rto-calendar__day[data-date]");

    // Guard clause: ignore if not on a date cell
    if (!cell) return;

    switch (e.key) {
      case "Enter":
      case " ": {
        e.preventDefault();
        // Toggle cell state
        const cellElement = cell as HTMLElement;
        const dateStr = cellElement.dataset.date as DateString;

        if (!dateStr) return;

        const currentState = getAllDates().get(dateStr);
        const defaultState = this.config.painting?.defaultState || "working";
        const newState: DateState | null = currentState ? null : defaultState;

        this.applySelectionToCell(cellElement, newState);
        break;
      }

      case "ArrowUp":
      case "ArrowDown":
      case "ArrowLeft":
      case "ArrowRight":
        e.preventDefault();
        this.navigateKeyboard(e.key, cell as HTMLElement);
        break;

      case "Escape":
        this.clearDragState();
        break;
    }
  }

  /**
   * Navigates between calendar cells using arrow keys
   *
   * Supports 4-directional navigation within the calendar grid.
   * Empty cells are skipped during navigation.
   *
   * @param direction - Arrow key direction ('ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight')
   * @param currentCell - Currently focused cell element
   * @private
   */
  private navigateKeyboard(direction: string, currentCell: HTMLElement): void {
    const allCells = Array.from(
      this.container.querySelectorAll(
        ".rto-calendar__day[data-date]:not(.rto-calendar__day--empty)"
      )
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
        nextIndex = (currentIndex + 7) % allCells.length; // 7 days in a week
        break;
      case "ArrowUp":
        nextIndex = (currentIndex - 7 + allCells.length) % allCells.length;
        break;
      default:
        return; // Invalid direction
    }

    // Move focus to next cell
    if (allCells[nextIndex]) {
      (allCells[nextIndex] as HTMLElement).focus();
    }
  }

  /**
   * Applies a selection state to a calendar cell
   *
   * Updates both the DOM and the store. Dispatches a custom event
   * for external listeners and calls the registered callback.
   *
   * @param cell - DOM element of the calendar cell
   * @param state - State to apply ('working', 'oof', 'holiday', or null to clear)
   * @private
   */
  private applySelectionToCell(cell: HTMLElement, state: DateState | null): void {
    const dateStr = cell.dataset.date as DateString;

    // Guard clause: validate date string
    if (!dateStr) {
      console.warn("[CalendarEventHandlers] Cell missing date attribute");
      return;
    }

    if (state === null) {
      // Clear selection
      clearDateState(dateStr);
      cell.dataset.state = "";
      cell.classList.remove(
        "rto-calendar__day--working",
        "rto-calendar__day--oof",
        "rto-calendar__day--holiday"
      );
    } else {
      // Apply selection state
      setDateState(dateStr, state);
      cell.dataset.state = state;
      cell.classList.add(`rto-calendar__day--${state}`);
    }

    // Update ARIA attributes for accessibility
    cell.setAttribute("aria-pressed", state ? "true" : "false");

    // Dispatch custom event for external listeners
    cell.dispatchEvent(
      new CustomEvent("rto-selection-changed", {
        bubbles: true,
        detail: { date: dateStr, state },
      })
    );

    // Invoke registered callback
    if (this.onDateChange) {
      this.onDateChange(dateStr, state);
    }
  }

  /**
   * Clears all date selections in the calendar
   *
   * Resets all cells to unselected state and clears the store.
   */
  clearAllSelections(): void {
    const selectedCells = this.container.querySelectorAll(".rto-calendar__day[data-state]");

    for (const cell of selectedCells) {
      this.applySelectionToCell(cell as HTMLElement, null);
    }

    this.announceToScreenReader("Cleared all selections");
  }

  /**
   * Clears selections for a specific month
   *
   * @param monthId - Month identifier in format 'YYYY-MM' or a container ID
   */
  clearMonthSelections(monthId: string): void {
    const monthContainer = this.container.querySelector(`[data-month="${monthId}"]`);

    if (!monthContainer) {
      console.warn(`[CalendarEventHandlers] Month container not found: ${monthId}`);
      return;
    }

    const selectedCells = monthContainer.querySelectorAll(".rto-calendar__day[data-state]");

    const count = selectedCells.length;

    for (const cell of selectedCells) {
      this.applySelectionToCell(cell as HTMLElement, null);
    }

    this.announceToScreenReader(`Cleared ${count} selections`);
  }

  /**
   * Clears internal drag state
   *
   * @private
   */
  private clearDragState(): void {
    this.dragState.isDragging = false;
    this.dragState.startCell = null;
    this.dragState.selectionIntent = null;

    // Reset store drag state
    dragStateStore.set({
      isDragging: false,
      startPoint: null,
      currentPoint: null,
      direction: null,
    });
  }

  /**
   * Updates the "today" highlight on the calendar
   *
   * Finds the cell representing today's date and adds/removes styling accordingly.
   * Called initially and then periodically to handle midnight crossover.
   */
  updateTodayHighlight(): void {
    const today = formatDate(new Date());

    const allCells = this.container.querySelectorAll(".rto-calendar__day[data-date]");

    for (const cell of allCells) {
      const el = cell as HTMLElement;
      const cellDate = el.dataset.date as DateString;

      if (cellDate === today) {
        el.classList.add("rto-calendar__day--today");
        el.setAttribute("aria-current", "date");
      } else {
        el.classList.remove("rto-calendar__day--today");
        el.removeAttribute("aria-current");
      }
    }
  }

  /**
   * Starts a periodic timer to update the today highlight
   *
   * Runs every minute to handle midnight crossover automatically.
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
   * Creates a temporary ARIA live region element, appends it to the DOM,
   * and removes it after the announcement is made.
   *
   * @param message - Message to announce to screen readers
   * @private
   */
  private announceToScreenReader(message: string): void {
    const announcement = document.createElement("div");
    announcement.setAttribute("role", "status");
    announcement.setAttribute("aria-live", "polite");
    announcement.setAttribute("aria-atomic", "true");
    announcement.className = "rto-calendar__sr-only";
    announcement.textContent = message;

    document.body.appendChild(announcement);

    // Remove after announcement is made
    setTimeout(() => {
      if (document.body.contains(announcement)) {
        document.body.removeChild(announcement);
      }
    }, 1000);
  }
}

/**
 * Initializes event handlers for a calendar container
 *
 * Convenience function that creates and initializes a CalendarEventHandlers
 * instance in one step. Returns the instance for cleanup or manual control.
 *
 * @param config - Event handler configuration
 * @returns The initialized CalendarEventHandlers instance
 *
 * @example
 * ```ts
 * import { initializeEventHandlers } from './scripts/eventHandlers';
 *
 * const container = document.querySelector('#calendar');
 * const handlers = initializeEventHandlers({
 *   container,
 *   config: calendarConfig
 * });
 *
 * // Later, when cleaning up:
 * handlers.destroy();
 * ```
 */
export function initializeEventHandlers(config: EventHandlerConfig): CalendarEventHandlers {
  const handlers = new CalendarEventHandlers(config);
  handlers.initialize();
  return handlers;
}
