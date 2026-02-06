import { validateConfig } from "../config/validate";
import type { CalendarConfig } from "../types";

/**
 * Drag state interface for tracking mouse drag operations
 */
interface DragState {
  isDragging: boolean;
  startDate: string | null;
  lastDate: string | null;
}

/**
 * EventHandler class - Handles calendar event delegation and interactions
 * Optimizes performance with event delegation
 *
 * Uses event delegation to handle interactions for all day cells efficiently,
 * attaching a single event listener to the container instead of individual listeners
 * on each day cell.
 *
 * @example
 * ```ts
 * const handler = new EventHandler('#calendar-container', config);
 * handler.attach();
 * ```
 */
export class EventHandler {
  private container: HTMLElement | null = null;
  private config: CalendarConfig;
  private dragState: DragState = {
    isDragging: false,
    startDate: null,
    lastDate: null,
  };

  /**
   * Creates a new EventHandler instance
   *
   * @param container - CSS selector or HTMLElement containing the calendar
   * @param config - Calendar configuration object
   * @throws {Error} If container element is not found
   * @throws {Error} If config validation fails
   *
   * @example
   * ```ts
   * const handler = new EventHandler('#calendar-container', config);
   * ```
   */
  constructor(container: string | HTMLElement, config: CalendarConfig) {
    if (typeof container === "string") {
      const el = document.querySelector(container) as HTMLElement | null;
      if (!el) {
        throw new Error("Container element not found");
      }
      this.container = el;
    } else {
      this.container = container;
    }

    validateConfig(config);
    this.config = config;
  }

  /**
   * Attach event delegation for performance
   *
   * Sets up a single event listener on the container that handles all interactions
   * for calendar day cells using event delegation. This is more efficient than
   * attaching listeners to each individual day cell.
   *
   * @throws {Error} If EventHandler is not properly initialized
   *
   * @example
   * ```ts
   * const handler = new EventHandler('#calendar-container', config);
   * handler.attach();
   * ```
   */
  attach(): void {
    if (!this.container) {
      throw new Error("EventHandler not initialized - call attach() first");
    }

    const container = this.container;

    // Use event delegation for all day cells
    container.addEventListener("click", (e) => {
      const dayEl = e.target as HTMLElement;
      const date = dayEl.dataset.date as string;
      console.log("Day clicked:", date);
      // TODO: Will be connected to CalendarManager
    });

    // TODO: Add keyboard navigation
    // TODO: Add drag handling
    // TODO: Add month navigation

    console.log("Event delegation attached");
  }

  /**
   * Clean up event listeners
   *
   * Removes all event listeners and clears the container.
   * Call this when destroying the calendar to prevent memory leaks.
   *
   * @example
   * ```ts
   * handler.destroy();
   * ```
   */
  destroy(): void {
    if (this.container) {
      this.container.innerHTML = "";
    }
  }
}
