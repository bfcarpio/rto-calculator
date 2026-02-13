/**
 * Holiday Data Loader
 *
 * This module loads holiday-related data and makes it available globally
 * for inline scripts that cannot use TypeScript imports.
 *
 * It loads countries data and the holiday manager onto the window object.
 */

import { sortCountriesByName } from "./holiday-data/countries";
import { getHolidayManager } from "./holiday-manager";

/**
 * Check if debug mode is enabled
 */
function isDebugEnabled(): boolean {
	if (typeof window === "undefined") return false;
	return (
		localStorage.getItem("rto-debug") === "true" ||
		(window as any).__RTO_DEBUG__ === true
	);
}

/**
 * Initialize holiday data loader
 * This should be called early in the application lifecycle
 */
export function initHolidayDataLoader(): void {
	// Only run in browser environment
	if (typeof window === "undefined") {
		if (isDebugEnabled()) {
			console.log(
				"[HolidayDataLoader] Skipping initialization - not in browser environment",
			);
		}
		return;
	}

	if (isDebugEnabled()) {
		console.log("[HolidayDataLoader] Initializing holiday data loader...");
		console.log(
			`[HolidayDataLoader] Document ready state: ${document.readyState}`,
		);
		console.log(
			`[HolidayDataLoader] Window.__holidayCountries exists: ${!!(window as any).__holidayCountries}`,
		);
		console.log(
			`[HolidayDataLoader] Window.__getHolidayManager exists: ${!!(window as any).__getHolidayManager}`,
		);
	}

	// Load countries onto window
	try {
		if (isDebugEnabled()) {
			console.log("[HolidayDataLoader] Starting to load countries data...");
		}
		const sortedCountries = sortCountriesByName();
		if (isDebugEnabled()) {
			console.log(
				`[HolidayDataLoader] Sorted ${sortedCountries.length} countries alphabetically`,
			);
		}

		// Cast to any to bypass TypeScript's strict typing for window object
		(window as any).__holidayCountries = sortedCountries;
		(window as any).__getHolidayManager = getHolidayManager;

		if (isDebugEnabled()) {
			console.log(
				`[HolidayDataLoader] ✓ Successfully loaded ${sortedCountries.length} countries and holiday manager onto window`,
			);
			console.log(
				`[HolidayDataLoader] First 3 countries: ${sortedCountries
					.slice(0, 3)
					.map((c) => c.name)
					.join(", ")}...`,
			);
			console.log(
				`[HolidayDataLoader] Last 3 countries: ...${sortedCountries
					.slice(-3)
					.map((c) => c.name)
					.join(", ")}`,
			);
		}

		// Dispatch event to notify components that holiday data is ready
		const event = new CustomEvent("holiday-data-loaded", {
			detail: {
				countries: sortedCountries,
				timestamp: Date.now(),
			},
		});
		window.dispatchEvent(event);
		if (isDebugEnabled()) {
			console.log("[HolidayDataLoader] ✓ Dispatched holiday-data-loaded event");
		}
	} catch (error) {
		console.error("[HolidayDataLoader] ✗ Failed to load holiday data:", error);
		console.error("[HolidayDataLoader] Error details:", {
			message: error instanceof Error ? error.message : String(error),
			stack: error instanceof Error ? error.stack : undefined,
		});
	}
}

/**
 * Get countries from global window object
 */
export function getHolidayCountries(): any[] {
	if (typeof window === "undefined") {
		if (isDebugEnabled()) {
			console.log(
				"[HolidayDataLoader] getHolidayCountries: Not in browser environment, returning empty array",
			);
		}
		return [];
	}
	const countries = (window as any).__holidayCountries || [];
	if (isDebugEnabled()) {
		console.log(
			`[HolidayDataLoader] getHolidayCountries: Returning ${countries.length} countries`,
		);
	}
	return countries;
}

/**
 * Get holiday manager from global window object
 */
export function getGlobalHolidayManager(): any {
	if (typeof window === "undefined") {
		if (isDebugEnabled()) {
			console.log(
				"[HolidayDataLoader] getGlobalHolidayManager: Not in browser environment, returning null",
			);
		}
		return null;
	}
	const manager = (window as any).__getHolidayManager || null;
	if (isDebugEnabled()) {
		console.log(
			`[HolidayDataLoader] getGlobalHolidayManager: Returning ${manager ? "holiday manager instance" : "null"}`,
		);
	}
	return manager;
}

/**
 * Check if holiday data is loaded
 */
export function isHolidayDataLoaded(): boolean {
	if (typeof window === "undefined") {
		if (isDebugEnabled()) {
			console.log(
				"[HolidayDataLoader] isHolidayDataLoaded: Not in browser environment, returning false",
			);
		}
		return false;
	}
	const hasCountries = !!(window as any).__holidayCountries;
	const hasManager = !!(window as any).__getHolidayManager;
	const isLoaded = hasCountries && hasManager;
	if (isDebugEnabled()) {
		console.log(
			`[HolidayDataLoader] isHolidayDataLoaded: ${isLoaded} (countries: ${hasCountries}, manager: ${hasManager})`,
		);
	}
	return isLoaded;
}

// Auto-initialization removed - module is now explicitly initialized from index.astro
