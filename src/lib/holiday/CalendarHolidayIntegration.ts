/**
 * Calendar Holiday Integration
 *
 * This module provides integration between the holiday management system
 * and the calendar UI. It handles fetching holidays based on user settings
 * and applying them to the calendar with proper visual markers.
 *
 * @module calendar-holiday-integration
 */

import { getHolidayManager } from "./HolidayManager";

/**
 * Check if debug mode is enabled
 * Debug mode can be enabled via localStorage or a global window flag
 */
function isDebugEnabled(): boolean {
	if (typeof window === "undefined") return false;
	return (
		localStorage.getItem("rto-debug") === "true" ||
		(window as { __RTO_DEBUG__?: boolean }).__RTO_DEBUG__ === true
	);
}

/**
 * Calendar holiday integration configuration
 */
export interface CalendarHolidayConfig {
	countryCode: string | null;
	companyName: string | null;
	calendarYears: number[];
}

/**
 * Initialize holiday integration for the calendar
 * This should be called when the calendar is loaded
 */
export function initializeHolidayIntegration(): void {
	if (isDebugEnabled()) {
		console.log(
			"[HolidayIntegration] Initializing calendar holiday integration",
		);
	}

	// Listen for settings changes
	document.addEventListener("settings-changed", handleSettingsChanged);

	// Listen for calendar load events
	document.addEventListener("calendar-loaded", handleCalendarLoaded);

	// Apply holidays when DOM is ready if calendar exists
	if (document.readyState === "complete") {
		applySavedHolidays();
	} else {
		window.addEventListener("load", applySavedHolidays);
	}
}

/**
 * Get the years displayed in the calendar
 */
export function getCalendarYears(): number[] {
	const calendarMonths = document.querySelectorAll(".calendar-month");
	if (calendarMonths.length === 0) {
		return [new Date().getFullYear()];
	}

	const yearsSet = new Set<number>();

	calendarMonths.forEach((monthElement) => {
		const element = monthElement as HTMLElement;
		const monthId = element.id;
		// Extract year from month-id like "month-2024-0"
		if (typeof monthId === "string") {
			const match = monthId.match(/month-(\d+)-\d+/);
			if (match?.[1]) {
				yearsSet.add(parseInt(match[1], 10));
			}
		}
	});

	const years = Array.from(yearsSet).sort((a, b) => a - b);

	// Default to current year if no years found
	if (years.length === 0) {
		const currentYear = new Date().getFullYear();
		return [currentYear];
	}

	return years;
}

/**
 * Apply holidays to the calendar based on saved settings
 */
export async function applySavedHolidays(): Promise<void> {
	try {
		// Load saved settings
		const savedSettings = localStorage.getItem("rto-calculator-settings");
		if (!savedSettings) {
			if (isDebugEnabled()) {
				console.log("[HolidayIntegration] No saved settings found");
			}
			return;
		}

		const settings = JSON.parse(savedSettings);

		// Check if data saving is enabled before applying saved holidays
		if (settings.saveData !== true) {
			if (isDebugEnabled()) {
				console.log(
					"[HolidayIntegration] Data saving disabled, skipping saved holidays",
				);
			}
			return;
		}

		const holidayConfig = settings.holidays;

		if (!holidayConfig || !holidayConfig.countryCode) {
			if (isDebugEnabled()) {
				console.log("[HolidayIntegration] No country selected in settings");
			}
			return;
		}

		if (isDebugEnabled()) {
			console.log(
				`[HolidayIntegration] Applying holidays for ${holidayConfig.countryCode}`,
			);
		}

		// Get calendar years
		const calendarYears = getCalendarYears();

		// Apply holidays to calendar
		await applyHolidaysToCalendar({
			countryCode: holidayConfig.countryCode,
			companyName: holidayConfig.companyName,
			calendarYears,
		});
	} catch (error) {
		console.error("[HolidayIntegration] Error applying saved holidays:", error);
	}
}

/**
 * Apply holidays to the calendar
 */
export async function applyHolidaysToCalendar(
	config: CalendarHolidayConfig,
): Promise<void> {
	const { countryCode, companyName, calendarYears } = config;

	if (!countryCode) {
		if (isDebugEnabled()) {
			console.log("[HolidayIntegration] No country code provided");
		}
		return;
	}

	const companyDisplay = companyName ? companyName : "all holidays";
	if (isDebugEnabled()) {
		console.log(
			`[HolidayIntegration] Fetching holidays for ${countryCode} (${companyDisplay}), years: ${calendarYears.join(", ")}`,
		);
	}

	try {
		const manager = await getHolidayManager();
		await manager.applyHolidaysToCalendar(
			countryCode,
			companyName,
			calendarYears,
		);

		// Trigger validation update since holidays affect compliance
		const validationEvent = new CustomEvent("holidays-applied", {
			bubbles: true,
			detail: {
				countryCode,
				companyName,
				years: calendarYears,
			},
		});
		document.dispatchEvent(validationEvent);

		if (isDebugEnabled()) {
			console.log("[HolidayIntegration] Holidays applied successfully");
		}
	} catch (error) {
		console.error("[HolidayIntegration] Error applying holidays:", error);
	}
}

/**
 * Remove all holidays from the calendar
 */
export async function removeHolidaysFromCalendar(): Promise<void> {
	try {
		const manager = await getHolidayManager();
		manager.removeHolidaysFromCalendar();

		// Trigger validation update
		const validationEvent = new CustomEvent("holidays-removed", {
			bubbles: true,
		});
		document.dispatchEvent(validationEvent);

		if (isDebugEnabled()) {
			console.log("[HolidayIntegration] Holidays removed successfully");
		}
	} catch (error) {
		console.error("[HolidayIntegration] Error removing holidays:", error);
	}
}

/**
 * Refresh holidays on the calendar
 * This removes existing holidays and applies new ones based on current settings
 */
export async function refreshCalendarHolidays(): Promise<void> {
	if (isDebugEnabled()) {
		console.log("[HolidayIntegration] Refreshing calendar holidays");
	}

	// Remove existing holidays first
	await removeHolidaysFromCalendar();

	// Load and apply new holidays
	await applySavedHolidays();
}

/**
 * Handle settings changed event
 */
async function handleSettingsChanged(event: Event): Promise<void> {
	const customEvent = event as CustomEvent;
	const { holidays } = customEvent.detail;

	if (!holidays) {
		return;
	}

	if (isDebugEnabled()) {
		console.log(
			`[HolidayIntegration] Settings changed: country=${holidays.countryCode}, company=${holidays.companyName}`,
		);
	}

	// Remove existing holidays
	await removeHolidaysFromCalendar();

	// Apply new holidays if a country is selected
	if (holidays.countryCode) {
		const calendarYears = getCalendarYears();
		await applyHolidaysToCalendar({
			countryCode: holidays.countryCode,
			companyName: holidays.companyName,
			calendarYears,
		});
	}
}

/**
 * Handle calendar loaded event
 */
async function handleCalendarLoaded(): Promise<void> {
	if (isDebugEnabled()) {
		console.log("[HolidayIntegration] Calendar loaded, applying holidays");
	}
	await applySavedHolidays();
}

/**
 * Get holiday dates as a Set for validation calculations
 * This is used by the validation system to exclude holidays from compliance checks
 */
export async function getHolidayDatesForValidation(): Promise<Set<Date>> {
	try {
		const savedSettings = localStorage.getItem("rto-calculator-settings");
		if (!savedSettings) {
			return new Set();
		}

		const settings = JSON.parse(savedSettings);

		// Check if data saving is enabled before using saved holiday settings
		if (settings.saveData !== true) {
			if (isDebugEnabled()) {
				console.log(
					"[HolidayIntegration] Data saving disabled, returning empty holiday set for validation",
				);
			}
			return new Set();
		}

		const holidayConfig = settings.holidays;

		if (!holidayConfig || !holidayConfig.countryCode) {
			return new Set();
		}

		// Extract country code after null check to satisfy TypeScript
		const countryCode = holidayConfig.countryCode;
		if (!countryCode) {
			return new Set();
		}

		const manager = await getHolidayManager();
		const calendarYears = getCalendarYears();

		// Get only weekday holidays (weekend holidays don't affect office day calculations)
		const holidayDates = await manager.getHolidayDates(
			countryCode,
			holidayConfig.companyName ?? null,
			calendarYears,
			true, // only weekdays
		);

		return holidayDates;
	} catch (error) {
		console.error(
			"[HolidayIntegration] Error getting holiday dates for validation:",
			error,
		);
		return new Set();
	}
}

/**
 * Export a singleton instance for easy access
 */
export const calendarHolidayIntegration = {
	initialize: initializeHolidayIntegration,
	getCalendarYears,
	applySavedHolidays,
	applyHolidays: applyHolidaysToCalendar,
	removeHolidays: removeHolidaysFromCalendar,
	refresh: refreshCalendarHolidays,
	getHolidayDates: getHolidayDatesForValidation,
};

// Auto-initialization removed - module is now explicitly initialized from index.astro
