/**
 * Nager.Date API Client wrapper with async/await support
 */

import * as NagerApi from "nager_date_api_reference";

// Local type definitions for the nager API response data
interface CountryV3Dto {
	countryCode: string;
	name: string;
}

interface PublicHolidayV3Dto {
	date: string;
	localName: string;
	name: string;
}

interface Country {
	code: string;
	name: string;
}

interface Holiday {
	date: string; // YYYY-MM-DD
	name: string;
	localName: string;
}

const BASE_URL = "https://date.nager.at";

export class NagerDateClient {
	private countryApi: InstanceType<typeof NagerApi.CountryApi>;
	private holidayApi: InstanceType<typeof NagerApi.PublicHolidayApi>;

	constructor() {
		const apiClient = new NagerApi.ApiClient(BASE_URL);
		this.countryApi = new NagerApi.CountryApi(apiClient);
		this.holidayApi = new NagerApi.PublicHolidayApi(apiClient);
	}

	async getAvailableCountries(): Promise<Country[]> {
		return new Promise((resolve, reject) => {
			this.countryApi.apiV3AvailableCountriesGet(
				(error: Error | null, data: CountryV3Dto[] | undefined) => {
					if (error) {
						reject(error);
					} else {
						const countries: Country[] = (data || []).map((c) => ({
							code: c.countryCode,
							name: c.name,
						}));
						// Sort by name
						countries.sort((a, b) => a.name.localeCompare(b.name));
						resolve(countries);
					}
				},
			);
		});
	}

	async getHolidaysForYear(
		year: number,
		countryCode: string,
	): Promise<Holiday[]> {
		return new Promise((resolve, reject) => {
			this.holidayApi.apiV3PublicHolidaysYearCountryCodeGet(
				year,
				countryCode,
				(error: Error | null, data: PublicHolidayV3Dto[] | undefined) => {
					if (error) {
						reject(error);
					} else {
						const holidays: Holiday[] = (data || []).map((h) => ({
							date: h.date,
							name: h.name,
							localName: h.localName,
						}));
						resolve(holidays);
					}
				},
			);
		});
	}
}

// Singleton instance
let clientInstance: NagerDateClient | null = null;

export function getNagerDateClient(): NagerDateClient {
	if (!clientInstance) {
		clientInstance = new NagerDateClient();
	}
	return clientInstance;
}
