import { validateConfig } from "./config/validate";
import { formatDate } from "./lib/dateUtils";
import {
  clearDateState,
  getAllDates,
  selectedDates,
  setDateState,
} from "./stores/calendarStore";
import type { CalendarConfig, CalendarInstance, DateState, DateString } from "./types";

/**
 * CalendarManager - Core class for managing calendar instances
 *
 * Implements the CalendarInstance interface to provide a public API for
 * calendar operations including date selection, state management, and
 * configuration updates.
 *
 * @example
 * ```ts
 * const manager = new CalendarManager('#calendar-container', {
 *   dateRange: { start: new Date(2026, 0, 1), end: new Date(2026, 11, 31) },
 *   states: {
 *     working: { label: 'Working', color: '#10b981', bgColor: '#d1fae5' },
 *     oof: { label: 'OOO', color: '#ef4444', bgColor: '#fee2e2' },
 *     holiday: { label: 'Holiday', color: '#f59e0b', bgColor: '#fef3c7' }
 *   }
 * });
 * manager.init();
 * ```
 */
export class CalendarManager implements CalendarInstance {
  /** DOM element containing the calendar UI */
  private container: HTMLElement | null = null;

  /** Calendar configuration object */
  private config: CalendarConfig;

  /** Whether the calendar has been initialized */
  private isInitialized = false;

  /** Callbacks registered for state change notifications */
  private stateChangeCallbacks: Array<(date: DateString, state: DateState | null) => void> = [];

  /** Unsubscribe functions for store subscriptions */
  private unsubscribeFns: Array<() => void> = [];

  /**
   * Creates a new CalendarManager instance
   *
   * @param containerSelector - CSS selector or HTMLElement for the calendar container
   * @param config - Calendar configuration object
   * @throws {Error} If configuration is invalid
   */
  constructor(
    private containerSelector: string | HTMLElement,
    config: CalendarConfig
  ) {
    // Validate configuration at construction time
    validateConfig(config);
    this.config = config;
  }

  /**
   * Initializes the calendar instance
   *
   * Resolves the container, renders the initial UI, attaches event listeners,
   * and subscribes to store changes.
   *
   * @throws {Error} If already initialized or container not found
   */
  init(): void {
    if (this.isInitialized) {
      throw new Error("Calendar already initialized");
    }

    // Resolve container from selector or use provided element
    if (typeof this.containerSelector === "string") {
      this.container = document.querySelector(this.containerSelector);
      if (!this.container) {
        throw new Error("Container element not found");
      }
    } else {
      this.container = this.containerSelector;
    }

    // Render calendar HTML structure
    this.render();

    // Attach DOM event listeners
    this.attachEventListeners();

    // Subscribe to nanostore updates
    this.subscribeToStoreChanges();

    this.isInitialized = true;
  }

  /**
   * Destroys the calendar instance
   *
   * Removes all event listeners, clears the container, and resets state.
   * After calling destroy, the instance cannot be used again.
   */
  destroy(): void {
    // Remove all event listener subscriptions
    for (const fn of this.unsubscribeFns) {
      fn();
    }
    this.unsubscribeFns = [];

    // Clear state change callbacks
    this.stateChangeCallbacks = [];

    // Clear container HTML
    if (this.container) {
      this.container.innerHTML = "";
    }

    this.isInitialized = false;
  }

  /**
   * Gets all selected dates with their current states
   *
   * @returns Array of date strings (YYYY-MM-DD) that have been selected
   * @throws {Error} If calendar not initialized
   */
  getSelectedDates(): DateString[] {
    if (!this.isInitialized) {
      throw new Error("Calendar not initialized");
    }
    return Array.from(getAllDates().keys());
  }

  /**
   * Gets the state for a specific date
   *
   * @param date - Date string (YYYY-MM-DD) or Date object
   * @returns The state of the date, or null if not selected
   * @throws {Error} If calendar not initialized
   *
   * @example
   * ```ts
   * manager.getState('2026-02-06'); // 'working'
   * manager.getState(new Date(2026, 1, 6)); // 'working'
   * manager.getState('2026-02-07'); // null (not selected)
   * ```
   */
  getState(date: DateString | Date): DateState | null {
    if (!this.isInitialized) {
      throw new Error("Calendar not initialized");
    }
    const dateStr = typeof date === "string" ? date : formatDate(date);
    return getAllDates().get(dateStr) ?? null;
  }

  /**
   * Gets all dates that have a specific state
   *
   * @param state - The state to filter by (e.g., 'working', 'oof', 'holiday')
   * @returns Array of date strings (YYYY-MM-DD) with the specified state
   * @throws {Error} If calendar not initialized
   *
   * @example
   * ```ts
   * manager.getDatesByState('working'); // ['2026-02-06', '2026-02-07']
   * ```
   */
  getDatesByState(state: DateState): DateString[] {
    if (!this.isInitialized) {
      throw new Error("Calendar not initialized");
    }
    const allDates = getAllDates();
    return Array.from(allDates.entries())
      .filter(([_, s]) => s === state)
      .map(([date]) => date);
  }

  /**
   * Sets multiple dates to a specific state
   *
   * @param dates - Array of date strings (YYYY-MM-DD) or Date objects
   * @param state - The state to set on the dates
   * @throws {Error} If calendar not initialized or state not in config
   *
   * @example
   * ```ts
   * manager.setDates(['2026-02-06', '2026-02-07'], 'working');
   * manager.setDates([new Date(2026, 1, 8)], 'oof');
   * ```
   */
  setDates(dates: (DateString | Date)[], state: DateState): void {
    if (!this.isInitialized) {
      throw new Error("Calendar not initialized");
    }
    if (!this.config.states[state]) {
      throw new Error(`State '${state}' does not exist in config`);
    }
    for (const date of dates) {
      const dateStr = typeof date === "string" ? date : formatDate(date);
      setDateState(dateStr, state);
    }
  }

  /**
   * Clears the state from multiple dates
   *
   * @param dates - Array of date strings (YYYY-MM-DD) or Date objects to clear
   * @throws {Error} If calendar not initialized
   *
   * @example
   * ```ts
   * manager.clearDates(['2026-02-06', '2026-02-07']);
   * ```
   */
  clearDates(dates: (DateString | Date)[]): void {
    if (!this.isInitialized) {
      throw new Error("Calendar not initialized");
    }
    for (const date of dates) {
      const dateStr = typeof date === "string" ? date : formatDate(date);
      clearDateState(dateStr);
    }
  }

  /**
   * Clears the state from all selected dates
   *
   * @throws {Error} If calendar not initialized
   *
   * @example
   * ```ts
   * manager.clearAll(); // Removes all date selections
   * ```
   */
  clearAll(): void {
    if (!this.isInitialized) {
      throw new Error("Calendar not initialized");
    }
    const allDates = getAllDates();
    allDates.forEach((_, dateStr) => {
      clearDateState(dateStr);
    });
  }

  /**
   * Toggles a date between a state and unselected
   *
   * If the date already has the specified state, it will be cleared.
   * Otherwise, it will be set to that state.
   *
   * @param date - Date string (YYYY-MM-DD) or Date object
   * @param state - The state to toggle
   * @throws {Error} If calendar not initialized
   *
   * @example
   * ```ts
   * manager.toggleDate('2026-02-06', 'working'); // Sets to 'working'
   * manager.toggleDate('2026-02-06', 'working'); // Clears state
   * ```
   */
  toggleDate(date: DateString | Date, state: DateState): void {
    if (!this.isInitialized) {
      throw new Error("Calendar not initialized");
    }
    const dateStr = typeof date === "string" ? date : formatDate(date);
    const currentState = getAllDates().get(dateStr);

    if (currentState === state) {
      clearDateState(dateStr);
    } else {
      setDateState(dateStr, state);
    }
  }

  /**
   * Updates the calendar configuration
   *
   * Merges partial configuration with existing config, validates the result,
   * and re-renders the calendar.
   *
   * @param newConfig - Partial configuration object with properties to update
   * @throws {Error} If merged configuration is invalid
   *
   * @example
   * ```ts
   * manager.updateConfig({
   *   styling: { cellSize: 48 }
   * });
   * ```
   */
  updateConfig(newConfig: Partial<CalendarConfig>): void {
    this.config = { ...this.config, ...newConfig };
    validateConfig(this.config);
    this.render();
  }

  /**
   * Registers a callback for state change notifications
   *
   * The callback is invoked whenever any date state changes.
   *
   * @param callback - Function to call when a date state changes
   * @returns Unsubscribe function to remove the callback
   *
   * @example
   * ```ts
   * const unsubscribe = manager.onStateChange((date, state) => {
   *   console.log(`Date ${date} is now ${state}`);
   * });
   * // Later...
   * unsubscribe();
   * ```
   */
  onStateChange(callback: (date: DateString, state: DateState | null) => void): () => void {
    this.stateChangeCallbacks.push(callback);

    // Return unsubscribe function
    return () => {
      const index = this.stateChangeCallbacks.indexOf(callback);
      if (index > -1) {
        this.stateChangeCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Renders the calendar UI
   *
   * Generates and inserts the HTML structure for the calendar.
   * Placeholder implementation - full rendering will be added in Phase 6.
   *
   * @private
   */
  private render(): void {
    if (!this.container) return;
    // TODO: Will be implemented in Phase 6 (templateRenderer)
    this.container.innerHTML = '<div class="rto-calendar">Calendar rendering placeholder</div>';
  }

  /**
   * Attaches DOM event listeners to calendar elements
   *
   * Sets up click, drag, and other interaction handlers.
   * Placeholder implementation - full event handling will be added in Phase 7.
   *
   * @private
   */
  private attachEventListeners(): void {
    // TODO: Will be implemented in Phase 7 (event handlers)
  }

  /**
   * Subscribes to store changes for reactive updates
   *
   * Monitors the selected dates store and notifies registered callbacks
   * when any date state changes.
   *
   * @private
   */
  private subscribeToStoreChanges(): void {
    const unsubscribe = selectedDates.subscribe(() => {
      // Notify all registered callbacks of state changes
      const allDates = getAllDates();
      for (const [dateStr, state] of allDates) {
        for (const cb of this.stateChangeCallbacks) {
          cb(dateStr, state);
        }
      }
    });
    this.unsubscribeFns.push(unsubscribe);
  }
}
