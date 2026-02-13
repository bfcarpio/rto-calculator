/**
 * Global type declarations for window object extensions
 */

import type { HolidayManager } from "../lib/holiday/HolidayManager";
import type { Country } from "../lib/holiday/data/countries";

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
	}
}

// nager_date_api_reference types are provided by the installed package
