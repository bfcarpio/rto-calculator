import { initializeHolidayIntegration } from "../lib/calendar-holiday-integration";
import { initHolidayDataLoader } from "../lib/holiday-data-loader";
import {
	type CalendarEventManager,
	initializeCalendarEvents,
} from "../scripts/calendar-events";
import { initializeLocalStorage } from "../scripts/localStorage";
import {
	displayInitialPrompt,
	displayValidationResults,
} from "../scripts/validation-result-display";
import { setupEventListeners } from "../utils/astro/calendarFunctions";
import "../scripts/rtoValidation";
import { debugLog, getDebugEnabled } from "./debug";

declare global {
	interface Window {
		displayValidationResults?: (validationResult: any) => void;
		validationManager?: {
			setDebugMode(enabled: boolean): void;
			getDebugMode(): boolean;
			SetValidator(strategy: string): void;
			updateConfig(config: { minOfficeDaysPerWeek: number }): void;
			getConfig(): { minOfficeDaysPerWeek?: number };
		};
		__calendarEventManager?: CalendarEventManager;
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
	initHolidayDataLoader();
	initializeLocalStorage();

	if (document.readyState === "loading") {
		document.addEventListener("DOMContentLoaded", setupEventListeners);
	} else {
		setupEventListeners();
	}

	initializeHolidayIntegration();

	if (document.readyState === "loading") {
		document.addEventListener("DOMContentLoaded", initializeCalendarEvents);
	} else {
		initializeCalendarEvents();
	}

	window.displayValidationResults = (validationResult: any) => {
		displayValidationResults(validationResult);
	};

	displayInitialPrompt();

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
	const manager = (window as any).__calendarEventManager as
		| CalendarEventManager
		| undefined;
	if (manager) {
		manager.destroy();
		delete (window as any).__calendarEventManager;
		debugLog("[Index] Cleaned up calendar event manager");
	}
}
