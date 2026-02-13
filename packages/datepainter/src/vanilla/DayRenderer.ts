import { validateConfig } from "../config/validate";
import { formatDate } from "../lib/dateUtils";
import type { CalendarConfig, DateState, DateString } from "../types";

/**
 * DayRenderer class - Renders individual calendar day cells
 * Handles click events and selection states
 *
 * @example
 * ```ts
 * const renderer = new DayRenderer('#calendar-container', config);
 * const dayElement = renderer.renderDay('2026-02-06', 'working', true);
 * container.appendChild(dayElement);
 * ```
 */
export class DayRenderer {
  private container: HTMLElement | null = null;
  private config: CalendarConfig;

  /**
   * Creates a new DayRenderer instance
   *
   * @param container - CSS selector or HTMLElement to render days into
   * @param config - Calendar configuration object
   * @throws {Error} If container element is not found
   * @throws {Error} If config validation fails
   *
   * @example
   * ```ts
   * const renderer = new DayRenderer('#calendar-container', config);
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

    // Silently acknowledge container and config are stored for future use
    void this.container;
    void this.config;
  }

  /**
   * Render single day cell
   *
   * Creates a DOM element for a calendar day with appropriate classes,
   * icons, and click handlers based on the day's state.
   *
   * @param date - Date string in YYYY-MM-DD format
   * @param state - Current state of the day (working/oof/holiday), or null for unselected
   * @param isToday - Whether this date is today's date (default: false)
   * @returns HTMLElement representing the calendar day cell
   *
   * @example
   * ```ts
   * const dayEl = renderer.renderDay('2026-02-06', 'working', true);
   * container.appendChild(dayEl);
   * ```
   */
  renderDay(date: DateString, state: DateState | null, isToday = false): HTMLElement {
    const dayEl = document.createElement("div");
    dayEl.className = this.getDayClasses(date, state);
    if (isToday) {
      dayEl.classList.add("datepainter-day--today");
    }

    const dayNumber = date.split("-").pop() || "";
    dayEl.textContent = dayNumber;

    // Icon
    if (state && this.config.states[state]?.icon) {
      const icon = this.config.states[state].icon;
      const iconEl = document.createElement("span");
      iconEl.className = "datepainter-day__icon";
      iconEl.textContent = icon;
      iconEl.setAttribute("aria-hidden", "true");
      dayEl.appendChild(iconEl);
    }

    // Data attributes
    dayEl.dataset.date = date;

    // Click handler
    dayEl.addEventListener("click", () => {
      const newState = this.getNewState(state);
      this.onDayClick(date, newState);
    });

    return dayEl;
  }

  /**
   * Get CSS classes for day based on state
   *
   * Generates a space-separated string of CSS classes based on the day's
   * current state and whether it's today.
   *
   * @param date - Date string in YYYY-MM-DD format
   * @param state - Current state of the day (working/oof/holiday), or null for unselected
   * @returns Space-separated CSS class names
   *
   * @example
   * ```ts
   * const classes = renderer.getDayClasses('2026-02-06', 'working');
   * // Returns: 'datepainter-day datepainter-day--working datepainter-day--today'
   * ```
   */
  private getDayClasses(date: DateString, state: DateState | null): string {
    const classes: string[] = ["datepainter-day"];

    if (state) {
      classes.push(`datepainter-day--${state}`);
    }

    if (this.isToday(date)) {
      classes.push("datepainter-day--today");
    }

    return classes.join(" ");
  }

  /**
   * Check if date is today
   *
   * Compares the given date string with today's date.
   *
   * @param date - Date string in YYYY-MM-DD format
   * @returns True if the date is today, false otherwise
   *
   * @example
   * ```ts
   * renderer.isToday('2026-02-06'); // Returns true if today is February 6, 2026
   * ```
   */
  private isToday(date: DateString): boolean {
    const today = formatDate(new Date());
    return date === today;
  }

  /**
   * Get new state after toggle
   *
   * Determines the next state when a day is toggled based on current state.
   * The toggle cycle is: working → oof → working
   * Holidays reset to working
   *
   * @param currentState - Current state of the day (working/oof/holiday), or null for unselected
   * @returns The new state after toggle
   *
   * @example
   * ```ts
   * renderer.getNewState('working'); // Returns 'oof'
   * renderer.getNewState('oof');     // Returns 'working'
   * renderer.getNewState('holiday');  // Returns 'working'
   * renderer.getNewState(null);      // Returns 'working'
   * ```
   */
  private getNewState(currentState: DateState | null): DateState {
    if (currentState === "working") {
      return "oof";
    }
    if (currentState === "oof") {
      return "working";
    }
    if (currentState === "holiday") {
      return "working";
    }
    return "working";
  }

  /**
   * Day click callback
   *
   * Handles day click events. Currently logs to console for debugging.
   * Will be connected to CalendarManager in later phases.
   *
   * @param date - The date that was clicked, in YYYY-MM-DD format
   * @param newState - The new state after the toggle
   *
   * @private
   * @internal
   */
  private onDayClick(date: DateString, newState: DateState): void {
    console.log(`Day clicked: ${date} -> ${newState}`);
    // TODO: Will be connected to CalendarManager
  }
}
