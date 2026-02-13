import { initializeHolidayIntegration } from "../lib/calendar-holiday-integration";
import { initHolidayDataLoader } from "../lib/holiday-data-loader";
import { initializeCalendarEvents } from "../scripts/calendar-events";
import { initializeLocalStorage } from "../scripts/localStorage";
import {
	displayInitialPrompt,
	displayValidationResults,
} from "../scripts/validation-result-display";
import { setupEventListeners } from "../utils/astro/calendarFunctions";
import "../scripts/rtoValidation";

declare global {
	interface Window {
		displayValidationResults?: (validationResult: any) => void;
	}
}

function dispatchCalendarLoadedEvent() {
	const event = new CustomEvent("calendar-loaded", {
		bubbles: true,
		detail: {
			timestamp: Date.now(),
			monthsCount: 12,
		},
	});
	document.dispatchEvent(event);
	console.log("[Index] Dispatched calendar-loaded event");
}

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
	console.log("[Index] Calendar initialized.");

	if (document.readyState === "loading") {
		document.addEventListener("DOMContentLoaded", dispatchCalendarLoadedEvent);
	} else {
		dispatchCalendarLoadedEvent();
	}

	console.log("[Index] Calendar initialized.");
}
