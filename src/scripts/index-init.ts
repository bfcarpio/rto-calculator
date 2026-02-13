import { initializeHolidayIntegration } from "../lib/holiday/CalendarHolidayIntegration";
import { initializeLocalStorage } from "../scripts/localStorage";
import { setupEventListeners } from "../utils/astro/calendarFunctions";
import { debugLog, getDebugEnabled } from "./debug";

declare global {
	interface Window {
		validationManager?: {
			setDebugMode(enabled: boolean): void;
			getDebugMode(): boolean;
			updateConfig(config: { minOfficeDaysPerWeek: number }): void;
			getConfig(): { minOfficeDaysPerWeek?: number };
		};
	}
}

/**
 * Dispatch calendar-loaded custom event to notify other modules
 */
function dispatchCalendarLoadedEvent() {
	const event = new CustomEvent("calendar-loaded", {
		bubbles: true,
		detail: {
			timestamp: Date.now(),
			monthsCount: 12,
		},
	});
	document.dispatchEvent(event);
	debugLog("[Index] Dispatched calendar-loaded event");
}

/**
 * Initialize the RTO calendar application
 * Sets up holiday data, local storage, calendar events,
 * and validation display functionality
 */
export function initializeIndex() {
	initializeLocalStorage();

	if (document.readyState === "loading") {
		document.addEventListener("DOMContentLoaded", setupEventListeners);
	} else {
		setupEventListeners();
	}

	initializeHolidayIntegration();

	const isDebugEnabled =
		window.validationManager?.getDebugMode() ?? getDebugEnabled();
	if (isDebugEnabled) {
		debugLog("[Index] Calendar initialized.");
	}

	if (document.readyState === "loading") {
		document.addEventListener("DOMContentLoaded", dispatchCalendarLoadedEvent);
	} else {
		dispatchCalendarLoadedEvent();
	}

	if (isDebugEnabled) {
		debugLog("[Index] Calendar initialized.");
	}
}

/**
 * Cleanup calendar event manager and other resources
 * Useful for testing or future SPA navigation
 * Removes event listeners and clears timers
 */
export function cleanupIndex(): void {
	// Datepainter handles its own cleanup
	debugLog("[Index] Cleaned up calendar resources");
}
