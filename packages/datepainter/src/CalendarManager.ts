import { validateConfig } from "./config/validate";
import { formatDate } from "./lib/dateUtils";
import {
	getDayCellClasses,
	getIconHTML,
	getSingleMonthHTML,
	isAtMonthBoundary,
} from "./lib/templateRenderer";
import {
	clearDateState,
	getAllDates,
	selectedDates,
	setCurrentMonth,
	setDateState,
} from "./stores/calendarStore";
import type {
	CalendarConfig,
	CalendarInstance,
	DateState,
	DateString,
} from "./types";

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
 *     oof: { label: 'Out of Office', color: '#ef4444', bgColor: '#fee2e2', icon: '📍' },
 *     holiday: { label: 'Holiday', color: '#f59e0b', bgColor: '#fef3c7', icon: '🎄' },
 *     sick: { label: 'Sick Day', color: '#1890ff', bgColor: '#e6f7ff', icon: '💊' }
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
	private stateChangeCallbacks: Array<
		(date: DateString, state: DateState | null) => void
	> = [];

	/** Unsubscribe functions for store subscriptions */
	private unsubscribeFns: Array<() => void> = [];

	/** Tracked event listeners for cleanup */
	private attachedListeners: Array<{
		element: EventTarget;
		type: string;
		handler: EventListener;
	}> = [];

	/** Current view date for single month mode */
	private currentViewDate!: Date;

	/** Keyboard navigation handler */
	private keyboardHandler: ((e: Event) => void) | null = null;

	/**
	 * Creates a new CalendarManager instance
	 *
	 * @param containerSelector - CSS selector or HTMLElement for the calendar container
	 * @param config - Calendar configuration object
	 * @throws {Error} If configuration is invalid
	 */
	constructor(
		private containerSelector: string | HTMLElement,
		config: CalendarConfig,
	) {
		// Validate configuration at construction time
		validateConfig(config);
		this.config = config;
		// Initialize view date to start of date range
		this.currentViewDate = new Date(config.dateRange.start);
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

		// Initialize view date to start of date range and update store
		this.currentViewDate = new Date(this.config.dateRange.start);
		setCurrentMonth(this.currentViewDate);

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
		// Remove all event listeners
		for (const { element, type, handler } of this.attachedListeners) {
			element.removeEventListener(type, handler);
		}
		this.attachedListeners = [];

		// Unsubscribe from store
		for (const unsubscribe of this.unsubscribeFns) {
			unsubscribe();
		}
		this.unsubscribeFns = [];

		// Clear state change callbacks
		this.stateChangeCallbacks = [];

		// Clear container
		if (this.container) {
			this.container.innerHTML = "";
			this.container = null;
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
	 * Gets all dates with their current states
	 *
	 * @returns Map of date strings to their state
	 * @throws {Error} If calendar not initialized
	 *
	 * @example
	 * ```ts
	 * const dates = manager.getAllDates();
	 * // Map { '2026-02-06' => 'oof', '2026-02-07' => 'holiday' }
	 * ```
	 */
	getAllDates(): Map<DateString, DateState> {
		if (!this.isInitialized) {
			throw new Error("Calendar not initialized");
		}
		return getAllDates();
	}

	/**
	 * Gets the currently displayed month
	 *
	 * @returns Date object representing the current month view
	 * @throws {Error} If calendar not initialized
	 *
	 * @example
	 * ```ts
	 * const month = manager.getCurrentMonth();
	 * console.log(month.getMonth()); // 1 for February
	 * ```
	 */
	getCurrentMonth(): Date {
		if (!this.isInitialized) {
			throw new Error("Calendar not initialized");
		}
		return new Date(this.currentViewDate);
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
	onStateChange(
		callback: (date: DateString, state: DateState | null) => void,
	): () => void {
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
	 * Navigate to next month in date range
	 * @throws Error if at end of date range
	 */
	nextMonth(): void {
		if (!this.isInitialized) {
			throw new Error("Calendar not initialized. Call init() first.");
		}
		this.handleNavigation("next");
	}

	/**
	 * Navigate to previous month in date range
	 * @throws Error if at start of date range
	 */
	prevMonth(): void {
		if (!this.isInitialized) {
			throw new Error("Calendar not initialized. Call init() first.");
		}
		this.handleNavigation("prev");
	}

	/**
	 * Renders the calendar UI
	 *
	 * Generates and inserts the HTML structure for the calendar using the
	 * templateRenderer. Updates day cells to show current state icons.
	 *
	 * @private
	 */
	private render(): void {
		if (!this.container) return;
		const html = getSingleMonthHTML(this.currentViewDate, this.config);
		this.container.innerHTML = html;
		this.updateDayCells();
	}

	/**
	 * Updates day cell classes and icons based on current state
	 *
	 * Iterates through all day cells in the calendar and updates their CSS
	 * classes and icon elements to reflect the current state from the store.
	 *
	 * @private
	 */
	private updateDayCells(): void {
		if (!this.container) return;
		const allDates = getAllDates();

		const dayCells = this.container.querySelectorAll(".datepainter__day");
		for (const cell of dayCells) {
			const date = cell.getAttribute("data-date") as DateString;
			if (!date) continue;

			const state = allDates.get(date) ?? null;

			cell.className = `datepainter__day ${getDayCellClasses(date, state)}`;

			const oldIcon = cell.querySelector(".datepainter-day__icon");
			if (oldIcon) oldIcon.remove();

			if (state) {
				const stateConfig = this.config.states[state];
				if (stateConfig?.icon) {
					const iconHtml = getIconHTML(stateConfig.icon, "below");
					cell.insertAdjacentHTML("beforeend", iconHtml);
				}
			}
		}
	}

	/**
	 * Handles navigation to previous or next month
	 * @param action - Navigation direction ('prev' or 'next')
	 * @throws Error if at boundary of date range
	 * @private
	 */
	private handleNavigation(action: "prev" | "next"): void {
		const boundary = isAtMonthBoundary(
			this.currentViewDate,
			action,
			this.config,
		);
		if (boundary) {
			const message =
				action === "prev"
					? "Cannot navigate prev - at start of date range"
					: "Cannot navigate next - at end of date range";
			throw new Error(message);
		}

		// Update the view date
		if (action === "prev") {
			this.currentViewDate.setMonth(this.currentViewDate.getMonth() - 1);
		} else {
			this.currentViewDate.setMonth(this.currentViewDate.getMonth() + 1);
		}

		// Update store and re-render
		setCurrentMonth(this.currentViewDate);
		this.render();
	}

	/**
	 * Handles keyboard navigation for month switching
	 * @param e - Keyboard event
	 * @private
	 */
	private handleKeyboardNavigation(e: KeyboardEvent): void {
		if (e.key === "ArrowLeft") {
			e.preventDefault();
			this.handleNavigation("prev");
		} else if (e.key === "ArrowRight") {
			e.preventDefault();
			this.handleNavigation("next");
		}
	}

	/**
	 * Attaches DOM event listeners to calendar elements
	 *
	 * Sets up click, drag, and other interaction handlers. Supports single-click
	 * date toggling and drag-to-select painting when enabled.
	 *
	 * @private
	 */
	private attachEventListeners(): void {
		if (!this.container) return;

		let isDragging = false;
		let dragDate: DateString | null = null;
		let hasDragged = false;

		const mousedownHandler = (e: MouseEvent) => {
			const target = e.target as HTMLElement;
			const dayCell = target.closest(".datepainter__day");

			if (dayCell && !dayCell.classList.contains("datepainter__day--empty")) {
				const date = dayCell.getAttribute("data-date") as DateString | null;
				if (date && this.config.painting?.enabled) {
					isDragging = true;
					dragDate = date;
					hasDragged = false;

					const currentState = this.getState(date);
					const defaultState = this.config.painting.defaultState || "oof";
					const newState = currentState === defaultState ? null : defaultState;

					if (newState) {
						this.toggleDate(date, newState);
					} else {
						this.clearDates([date]);
					}
				}
			}
		};

		const mouseoverHandler = (e: MouseEvent) => {
			if (!isDragging) return;

			const target = e.target as HTMLElement;
			const dayCell = target.closest(".datepainter__day");

			if (dayCell && !dayCell.classList.contains("datepainter__day--empty")) {
				const date = dayCell.getAttribute("data-date") as DateString | null;
				if (date) {
					const defaultState = this.config.painting?.defaultState || "oof";
					if (!this.getState(date)) {
						hasDragged = true;
						this.toggleDate(date, defaultState);
					}
				}
			}
		};

		const mouseupHandler = () => {
			isDragging = false;
		};

		const clickHandler = (e: MouseEvent) => {
			const target = e.target as HTMLElement;
			const dayCell = target.closest(".datepainter__day");

			if (dayCell && !dayCell.classList.contains("datepainter__day--empty")) {
				const date = dayCell.getAttribute("data-date") as DateString | null;
				if (date && (!dragDate || hasDragged)) {
					const currentState = this.getState(date);
					const stateOrder: (DateState | null)[] = [
						"oof",
						"holiday",
						"sick",
						null,
					];
					const currentIndex = stateOrder.indexOf(currentState);
					const nextIndex = (currentIndex + 1) % stateOrder.length;
					const newState = stateOrder[nextIndex];

					if (newState) {
						this.toggleDate(date, newState);
					} else {
						this.clearDates([date]);
					}
					// Clear drag state after click handler runs
					dragDate = null;
					hasDragged = false;
				}
			}
		};

		// Navigation button click handler
		const navHandler = (e: MouseEvent) => {
			const target = e.target as HTMLElement;
			const navBtn = target.closest(".datepainter__nav-btn");

			if (navBtn) {
				const action = navBtn.getAttribute("data-action") as "prev" | "next";
				try {
					this.handleNavigation(action);
				} catch (_error) {
					// Silently handle boundary errors for button clicks
					// Buttons are already disabled, but double-check for programmatic calls
				}
			}
		};

		// Store references for cleanup
		this.attachedListeners.push(
			{
				element: this.container,
				type: "mousedown",
				handler: mousedownHandler as EventListener,
			},
			{
				element: this.container,
				type: "mouseover",
				handler: mouseoverHandler as EventListener,
			},
			{
				element: this.container,
				type: "click",
				handler: clickHandler as EventListener,
			},
			{
				element: document,
				type: "mouseup",
				handler: mouseupHandler as EventListener,
			},
		);

		// Attach listeners
		this.container.addEventListener("mousedown", mousedownHandler);
		this.container.addEventListener("mouseover", mouseoverHandler);
		this.container.addEventListener("click", clickHandler);
		document.addEventListener("mouseup", mouseupHandler);

		// Add navigation button click handler
		this.attachedListeners.push({
			element: this.container,
			type: "click",
			handler: navHandler as EventListener,
		});
		this.container.addEventListener("click", navHandler);

		// Add keyboard navigation handler
		this.keyboardHandler = (e: Event) => {
			if (e instanceof KeyboardEvent) {
				// Only handle navigation when focus is not on an interactive element
				if (
					e.target instanceof HTMLElement &&
					(e.target.tagName === "INPUT" ||
						e.target.tagName === "TEXTAREA" ||
						e.target.isContentEditable)
				) {
					return;
				}
				this.handleKeyboardNavigation(e);
			}
		};

		this.attachedListeners.push({
			element: this.container,
			type: "keydown",
			handler: this.keyboardHandler as EventListener,
		});
		this.container.addEventListener(
			"keydown",
			this.keyboardHandler as EventListener,
		);
	}

	/**
	 * Subscribes to store changes for reactive updates
	 *
	 * Monitors the selected dates store and notifies registered callbacks
	 * when any date state changes. Also updates the calendar UI to reflect changes.
	 *
	 * @private
	 */
	private subscribeToStoreChanges(): void {
		const unsubscribe = selectedDates.subscribe(() => {
			this.updateDayCells();

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
