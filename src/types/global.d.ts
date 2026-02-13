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

// Declare nager_date_api_reference module
declare module "nager_date_api_reference" {
	export class ApiClient {
		constructor(baseUrl?: string);
		static instance: ApiClient;
	}

	export class CountryApi {
		constructor(apiClient?: ApiClient);
		apiV3AvailableCountriesGet(
			callback: (
				error: Error | null,
				data: Array<{ countryCode: string; name: string }> | undefined,
			) => void,
		): void;
	}

	export class PublicHolidayApi {
		constructor(apiClient?: ApiClient);
		apiV3PublicHolidaysYearCountryCodeGet(
			year: number,
			countryCode: string,
			callback: (
				error: Error | null,
				data:
					| Array<{ date: string; name: string; localName: string }>
					| undefined,
			) => void,
		): void;
	}
}
