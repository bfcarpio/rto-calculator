/**
 * localStorage integration for RTO Calculator
 * Handles auto-saving and loading of calendar selections
 */

import {
	clearSelectedDates,
	loadSelectedDates,
	saveSelectedDates,
} from "../utils/storage";

const STORAGE_DEBUG = false;

/**
 * Flag to control whether data saving is enabled
 * Can be toggled via settings modal
 */
let dataSavingEnabled = false;

/**
 * Get all currently selected dates from the DOM
 * @returns Map of ISO date strings to selection type
 */
function getSelectedDatesFromDOM(): Map<string, string> {
	const selectedDates = new Map<string, string>();
	const selectedCells = document.querySelectorAll(".calendar-day.selected");

	selectedCells.forEach((cell) => {
		const element = cell as HTMLElement;
		const yearStr = element.dataset.year ?? "0";
		const monthStr = element.dataset.month ?? "0";
		const dayStr = element.dataset.day ?? "0";
		const selectionType = element.dataset.selectionType ?? "";

		const year = parseInt(yearStr, 10);
		const month = parseInt(monthStr, 10);
		const day = parseInt(dayStr, 10);

		// Create ISO date string
		const date = new Date(year, month, day);
		const isoString = date.toISOString().split("T")[0]!; // YYYY-MM-DD format

		selectedDates.set(isoString, selectionType);
	});

	if (STORAGE_DEBUG) {
		console.log(
			"[LocalStorage] Found selections:",
			selectedDates.size,
			"dates",
		);
	}

	return selectedDates;
}

/**
 * Apply saved selections to DOM elements
 * @param savedDates - Map of ISO date strings to selection type
 */
function applySelectionsToDOM(savedDates: Map<string, string>): void {
	const allCells = document.querySelectorAll(".calendar-day[data-day]");

	allCells.forEach((cell) => {
		const element = cell as HTMLElement;
		const yearStr = element.dataset.year ?? "0";
		const monthStr = element.dataset.month ?? "0";
		const dayStr = element.dataset.day ?? "0";

		const year = parseInt(yearStr, 10);
		const month = parseInt(monthStr, 10);
		const day = parseInt(dayStr, 10);

		// Create ISO date string to match saved format
		const date = new Date(year, month, day);
		const isoString = date.toISOString().split("T")[0]!;

		// Check if this date has a saved selection
		if (savedDates.has(isoString)) {
			const selectionType = savedDates.get(isoString);

			// Apply selection to the element
			if (selectionType) {
				element.dataset.selected = "true";
				element.dataset.selectionType = selectionType;
				element.classList.add("selected", selectionType);
				element.ariaSelected = "true";

				// Update aria-label
				const selectionLabels: Record<string, string> = {
					"out-of-office": "Out of office",
				};
				const label = selectionLabels[selectionType] || selectionType;
				if (element.ariaLabel) {
					element.ariaLabel = element.ariaLabel.replace(/\. .*$/, `.${label}`);
				}

				if (STORAGE_DEBUG) {
					console.log(
						`[LocalStorage] Restored ${isoString} as ${selectionType}`,
					);
				}
			}
		}
	});
}

/**
 * Save current selections to localStorage
 */
function saveSelections(): void {
	if (!dataSavingEnabled) {
		if (STORAGE_DEBUG) {
			console.log("[LocalStorage] Data saving disabled, skipping save");
		}
		return;
	}

	const selectedDates = getSelectedDatesFromDOM();

	// Convert Map to Set of ISO strings for storage
	const dateSet = new Set<string>();
	selectedDates.forEach((type, date) => {
		// Store both date and type in the string: "YYYY-MM-DD:type"
		dateSet.add(`${date}:${type}`);
	});

	saveSelectedDates(dateSet);

	if (STORAGE_DEBUG) {
		console.log("[LocalStorage] Saved", dateSet.size, "selections");
	}
}

/**
 * Load and apply selections from localStorage
 */
function loadSelections(): void {
	if (!dataSavingEnabled) {
		if (STORAGE_DEBUG) {
			console.log("[LocalStorage] Data saving disabled, skipping load");
		}
		return;
	}

	const savedDates = loadSelectedDates();

	if (savedDates.size === 0) {
		if (STORAGE_DEBUG) {
			console.log("[LocalStorage] No saved selections found");
		}
		return;
	}

	// Convert Set back to Map of date strings to selection types
	const savedMap = new Map<string, string>();
	savedDates.forEach((item) => {
		// Split "YYYY-MM-DD:type" format
		const [date, type] = item.split(":");
		if (date && type) {
			savedMap.set(date, type);
		}
	});

	if (STORAGE_DEBUG) {
		console.log("[LocalStorage] Loaded", savedMap.size, "saved selections");
	}

	applySelectionsToDOM(savedMap);
}

/**
 * Clear saved selections from localStorage
 */
export function clearSavedSelections(): void {
	clearSelectedDates();
	if (STORAGE_DEBUG) {
		console.log("[LocalStorage] Cleared saved selections");
	}
}

/**
 * Debounce function to limit save frequency
 */
function debounce(
	func: (...args: any[]) => void,
	delay: number,
): (...args: any[]) => void {
	let timeoutId: ReturnType<typeof setTimeout> | null = null;

	return (...args: any[]) => {
		if (timeoutId) {
			clearTimeout(timeoutId);
		}
		timeoutId = setTimeout(() => {
			func(...args);
			timeoutId = null;
		}, delay);
	};
}

// Debounced save function (save after 500ms of inactivity)
const debouncedSave = debounce(saveSelections, 500);

/**
 * Set whether data saving is enabled
 * @param enabled - Whether to enable data saving to localStorage
 */
export function setDataSavingEnabled(enabled: boolean): void {
	dataSavingEnabled = enabled;
	if (STORAGE_DEBUG) {
		console.log("[LocalStorage] Data saving", enabled ? "enabled" : "disabled");
	}
}

/**
 * Handle selection change events
 */
function handleSelectionChange(event: Event): void {
	const customEvent = event as CustomEvent;
	if (customEvent.detail) {
		if (STORAGE_DEBUG) {
			console.log("[LocalStorage] Selection changed:", customEvent.detail);
		}
		debouncedSave();
	}
}

/**
 * Handle clear all events
 */

/**
 * Initialize localStorage integration
 */
export function initializeLocalStorage(): void {
	if (STORAGE_DEBUG) {
		console.log("[LocalStorage] Initializing localStorage integration...");
	}

	// Expose storage manager to window for settings modal
	(window as any).storageManager = {
		setDataSavingEnabled,
	};

	// Load saved selections and attach event listeners when DOM is ready
	const setupIntegration = () => {
		// Small delay to ensure calendar cells and buttons are rendered
		setTimeout(() => {
			loadSelections();

			if (STORAGE_DEBUG) {
				console.log("[LocalStorage] Integration initialized");
			}
		}, 100);
	};

	if (document.readyState === "loading") {
		document.addEventListener("DOMContentLoaded", setupIntegration);
	} else {
		// DOM is already ready
		setupIntegration();
	}

	// Listen for selection changes
	// The day.astro component dispatches "rto-selection-changed" events
	document.addEventListener("rto-selection-changed", handleSelectionChange);
}

/**
 * Cleanup localStorage integration
 */
export function cleanupLocalStorage(): void {
	document.removeEventListener("rto-selection-changed", handleSelectionChange);

	const clearAllButtons = document.querySelectorAll(
		'[id^="clear-all-button-"]',
	);
	clearAllButtons.forEach(() => {
		// The event listener is now managed by calendarFunctions.ts, so no removal is needed here
	});

	if (STORAGE_DEBUG) {
		console.log("[LocalStorage] Integration cleaned up");
	}
}
