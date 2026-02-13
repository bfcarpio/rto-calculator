import { validateConfig } from "../config/validate";
import type { CalendarConfig, DateState, DateString } from "../types";

/**
 * DayRenderer class - Renders individual calendar day cells
 * Handles click events and selection states
 *
 * @example
 * ```ts
 * const renderer = new DayRenderer('#calendar-container', config);
 * const dayElement = renderer.renderDay('2026-02-06', 'oof', true);
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
	 * icons, and click handlers based on day's state.
	 *
	 * @param date - Date string in YYYY-MM-DD format
	 * @param state - Current state of day (oof/holiday/sick), or null for unselected
	 * @param isToday - Whether this date is today's date (default: false)
	 * @returns HTMLElement representing calendar day cell
	 *
	 * @example
	 * ```ts
	 * const dayEl = renderer.renderDay('2026-02-06', 'oof', true);
	 * container.appendChild(dayEl);
	 * ```
	 */
	renderDay(
		date: DateString,
		state: DateState | null,
		isToday = false,
	): HTMLElement {
		const dayEl = document.createElement("div");
		dayEl.className = this.getDayClasses(state);
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
	 * Generates a space-separated string of CSS classes based on day's
	 * current state and whether it's today.
	 *
	 * @param date - Date string in YYYY-MM-DD format
	 * @param state - Current state of day (oof/holiday/sick), or null for unselected
	 * @returns Space-separated CSS class names
	 *
	 * @example
	 * ```ts
	 * const classes = renderer.getDayClasses('2026-02-06', 'oof');
	 * // Returns: 'datepainter-day datepainter-day--oof datepainter-day--today'
	 * ```
	 */
	private getDayClasses(state: DateState | null): string {
		const classes: string[] = ["datepainter-day"];

		if (state) {
			classes.push(`datepainter-day--${state}`);
		}

		return classes.join(" ");
	}

	/**
	 * Returns the next state in the toggle cycle
	 *
	 * Toggle cycle: oof -> holiday -> sick -> oof
	 *
	 * @example
	 * ```ts
	 * renderer.getNewState('oof');     // Returns 'holiday'
	 * renderer.getNewState('holiday');  // Returns 'sick'
	 * renderer.getNewState('sick');    // Returns 'oof'
	 * renderer.getNewState(null);      // Returns 'oof'
	 * ```
	 */
	private getNewState(currentState: DateState | null): DateState {
		const stateCycle: DateState[] = ["oof", "holiday", "sick"];
		const currentIndex = stateCycle.indexOf(currentState as DateState);

		if (currentIndex === -1) {
			return "oof";
		}

		const nextIndex = (currentIndex + 1) % stateCycle.length;
		const nextMode = stateCycle[nextIndex];
		if (!nextMode) {
			throw new Error(`Invalid state cycle state at index ${nextIndex}`);
		}
		return nextMode;
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
