/**
 * Global type declarations for window object extensions
 */

import type { CalendarInstance } from "../../packages/datepainter/src/types";
import type { Country } from "../lib/holiday/data/countries";
import type { HolidayManager } from "../lib/holiday/HolidayManager";
import type { CalendarEventManager } from "../scripts/eventHandlers";
import type { KeyboardShortcuts } from "../scripts/keyboard-shortcuts";
import type { ValidationManager } from "../scripts/ValidationManager";

declare global {
	interface Window {
		/**
		 * Debug flag for RTO application
		 */
		__RTO_DEBUG__?: boolean;

		/**
		 * Sorted array of holiday countries available globally
		 */
		__holidayCountries?: Country[];

		/**
		 * Holiday manager getter available globally
		 * Returns a Promise that resolves to a HolidayManager instance
		 */
		__getHolidayManager?: () => Promise<HolidayManager>;

		/**
		 * Calendar manager instance exposed for cross-component access
		 */
		__datepainterInstance?: CalendarInstance | null;

		/**
		 * Keyboard shortcuts instance for global access
		 */
		__keyboardShortcutsInstance?: KeyboardShortcuts | null;

		/**
		 * Calendar event manager instance for global access
		 */
		__calendarEventManager?: CalendarEventManager | null;

		/**
		 * Validation manager for settings integration
		 */
		validationManager?: ValidationManager;

		/**
		 * Storage manager for data-saving settings
		 */
		storageManager?: {
			setDataSavingEnabled(enabled: boolean): void;
		};
	}
}

// nager_date_api_reference types are provided by the installed package
