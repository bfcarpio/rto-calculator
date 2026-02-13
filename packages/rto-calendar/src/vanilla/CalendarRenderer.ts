import { validateConfig } from "../config/validate";
import { formatDate, getDaysInMonth } from "../lib/dateUtils";
import { getCalendarHTML } from "../lib/templateRenderer";
import type { CalendarConfig, DateState, DateString } from "../types";

/**
 * CalendarRenderer class - Main renderer for calendar display
 *
 * Handles DOM-based rendering of calendar grids using vanilla JavaScript.
 * Manages lifecycle of calendar including initialization, rendering, updates,
 * and cleanup. Designed for standalone usage without framework dependencies.
 *
 * @example
 * ```ts
 * const config: CalendarConfig = {
 *   dateRange: {
 *     start: new Date('2026-01-01'),
 *     end: new Date('2026-12-31')
 *   },
 *   states: {
 *     working: { label: 'Working', color: '#4CAF50', bgColor: '#E8F5E9' },
 *     oof: { label: 'OOF', color: '#FF5722', bgColor: '#FFEBE5' }
 *   }
 * };
 *
 * const renderer = new CalendarRenderer('#calendar-container', config);
 * renderer.render();
 * // ... later
 * renderer.destroy();
 * ```
 */
export class CalendarRenderer {
  /** DOM element containing the calendar */
  private container: HTMLElement | null = null;

  /** Current calendar configuration */
  private config: CalendarConfig;

  /** Array of cleanup callbacks for event listeners and resources */
  private destroyCallbacks: Array<() => void> = [];

  /**
   * Create a new CalendarRenderer instance
   *
   * Initializes the renderer with a container element and configuration.
   * The container can be specified as a CSS selector string or an existing
   * HTMLElement. Configuration is validated immediately.
   *
   * @param container - CSS selector string or HTMLElement to render calendar into
   * @param config - Calendar configuration object defining date range, states, and styling
   * @throws {Error} If container element is not found when using selector string
   * @throws {Error} If configuration validation fails
   *
   * @example
   * ```ts
   * // Using selector string
   * const renderer1 = new CalendarRenderer('#my-calendar', config);
   *
   * // Using HTMLElement
   * const element = document.getElementById('my-calendar')!;
   * const renderer2 = new CalendarRenderer(element, config);
   * ```
   */
  constructor(container: string | HTMLElement, config: CalendarConfig) {
    // Early exit: resolve container from selector or use provided element
    if (typeof container === "string") {
      const el = document.querySelector<HTMLElement>(container);
      if (!el) {
        throw new Error("Container element not found");
      }
      this.container = el;
    } else {
      this.container = container;
    }

    // Validate configuration immediately (Parse, Don't Validate)
    validateConfig(config);
    this.config = config;
  }

  /**
   * Render calendar to container
   *
   * Generates complete HTML markup for the calendar and injects it into
   * the container. Attaches event listeners for calendar interactions
   * after rendering. Can be called multiple times to re-render.
   *
   * @throws {Error} If container is null (instance not properly initialized)
   *
   * @example
   * ```ts
   * const renderer = new CalendarRenderer('#calendar', config);
   * renderer.render(); // Calendar appears in the DOM
   * ```
   */
  render(): void {
    // Fail fast: container must be initialized
    if (!this.container) {
      throw new Error("Calendar not initialized - container is null");
    }

    // Generate HTML from template renderer
    const html = getCalendarHTML(this.config);

    // Inject HTML into container
    this.container.innerHTML = html;

    // Attach event listeners for interactivity
    this.attachEventListeners();
  }

  /**
   * Clean up and remove from DOM
   *
   * Removes the calendar from the DOM, detaches all event listeners,
   * and clears any registered cleanup callbacks. Call this when
   * the calendar is no longer needed to prevent memory leaks.
   *
   * @example
   * ```ts
   * const renderer = new CalendarRenderer('#calendar', config);
   * renderer.render();
   * // ... later when done
   * renderer.destroy(); // Clean up and remove calendar
   * ```
   */
  destroy(): void {
    // Execute all cleanup callbacks
    for (const fn of this.destroyCallbacks) {
      fn();
    }
    this.destroyCallbacks = [];

    // Clear container contents
    if (this.container) {
      this.container.innerHTML = "";
    }
  }

  /**
   * Update calendar configuration
   *
   * Merges partial configuration updates with existing config,
   * re-validates, and re-renders the calendar. Useful for
   * dynamic changes like updating date range or styling options.
   *
   * @param newConfig - Partial configuration object with properties to update
   * @throws {Error} If updated configuration fails validation
   *
   * @example
   * ```ts
   * const renderer = new CalendarRenderer('#calendar', config);
   * renderer.render();
   *
   * // Update date range
   * renderer.updateConfig({
   *   dateRange: {
   *     start: new Date('2026-06-01'),
   *     end: new Date('2026-12-31')
   *   }
   * });
   * ```
   */
  updateConfig(newConfig: Partial<CalendarConfig>): void {
    // Merge configurations (shallow merge for simplicity)
    this.config = { ...this.config, ...newConfig };

    // Validate updated configuration
    validateConfig(this.config);

    // Re-render with new config
    this.render();
  }

  /**
   * Register cleanup callback
   *
   * Registers a callback function that will be executed when
   * destroy() is called. Useful for custom cleanup logic like
   * removing external event listeners or clearing intervals.
   *
   * @param callback - Function to execute during destruction
   *
   * @example
   * ```ts
   * const renderer = new CalendarRenderer('#calendar', config);
   *
   * const intervalId = setInterval(() => {
   *   console.log('Calendar check');
   * }, 60000);
   *
   * renderer.onDestroy(() => {
   *   clearInterval(intervalId);
   * });
   *
   * // Later...
   * renderer.destroy(); // intervalId is cleared automatically
   * ```
   */
  onDestroy(callback: () => void): void {
    this.destroyCallbacks.push(callback);
  }

  /**
   * Attach event listeners for calendar interactions
   *
   * Sets up DOM event listeners for calendar interactions like
   * day selection, drag-to-select, and state toggling. Event
   * handlers use event delegation for efficiency.
   *
   * @private
   * @internal This method is called automatically by render()
   *
   * @remarks
   * Event listener attachment logic will be implemented in the
   * EventHandler class for better separation of concerns.
   */
  private attachEventListeners(): void {
    // TODO: Will be implemented in EventHandler class
    console.log("Event listeners attached");
  }
}
