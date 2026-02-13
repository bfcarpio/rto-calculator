/**
 * Nager.Date Holiday Data Source
 * Implementation of HolidayDataSourceStrategy using the Nager.Date API
 */

import type {
	Configuration,
	PublicHolidayApi,
	PublicHolidayV3Dto,
	VersionApi,
} from "nager_date_api_reference";
import HolidayDataSourceStrategy from "./HolidayDataSourceStrategy";
import type {
	DataSourceStatus,
	DateRange,
	Holiday,
	HolidayCheckResult,
	HolidayType,
} from "./types";

interface NagerDateConfig {
	baseUrl?: string;
	timeout?: number;
	[key: string]: unknown;
}

interface FullConfig extends NagerDateConfig {
	defaultCountryCode: string;
	enableCache: boolean;
	cacheDuration: number;
	timeout: number;
	debug: boolean;
}

class NagerDateHolidayDataSource extends HolidayDataSourceStrategy {
	private configuration: Configuration | null = null;
	private publicHolidayApi: PublicHolidayApi | null = null;
	declare config: FullConfig;

	constructor(config: NagerDateConfig = {}) {
		super(
			"nager-date",
			"Nager.Date API - Free public service for public holidays and long weekends worldwide",
			config,
		);

		this.configuration = null;
		this.publicHolidayApi = null;
		this._initializeApiClient();
	}

	/**
	 * Initialize the Nager.Date API client
	 * @private
	 */
	private async _initializeApiClient(): Promise<void> {
		try {
			const apiModule = await import("nager_date_api_reference");
			const { Configuration, PublicHolidayApi } = apiModule as {
				Configuration: new (params?: { basePath?: string }) => Configuration;
				PublicHolidayApi: new (config?: Configuration) => PublicHolidayApi;
			};

			const basePath = this.config.baseUrl ?? "https://date.nager.at";
			this.configuration = new Configuration({ basePath });

			this.publicHolidayApi = new PublicHolidayApi(this.configuration);

			this._debug("Nager.Date API client initialized successfully");
		} catch (error: unknown) {
			const errorMessage =
				error instanceof Error ? error.message : String(error);
			this._debug(
				`Failed to initialize Nager.Date API client: ${errorMessage}`,
			);
			this.configuration = null;
			this.publicHolidayApi = null;
		}
	}

	/**
	 * Fetch holidays for a specific year and country from Nager.Date API
	 * @param {number} year - Year to fetch holidays for
	 * @param {string} countryCode - ISO 3166-1 alpha-2 country code
	 * @returns {Promise<Holiday[]>} Array of holidays
	 * @protected
	 */
	protected override async _fetchHolidaysForYear(
		year: number,
		countryCode: string,
	): Promise<Holiday[]> {
		if (!this.publicHolidayApi) {
			await this._initializeApiClient();
			if (!this.publicHolidayApi) {
				throw new Error("Nager.Date API client not initialized");
			}
		}

		this._debug(`Fetching holidays for ${countryCode} - ${year}`);

		try {
			const api = this.publicHolidayApi;
			if (!api) {
				throw new Error("PublicHolidayApi not initialized");
			}

			const request = { year, countryCode };
			const holidays = await api.apiV3PublicHolidaysYearCountryCodeGet(request);

			this._debug(
				`Successfully fetched ${holidays?.length || 0} holidays for ${countryCode} - ${year}`,
			);

			return (holidays || []).map((apiHoliday) =>
				this._normalizeHoliday(apiHoliday),
			);
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : String(error);
			this._debug(
				`Error fetching holidays for ${countryCode} - ${year}: ${errorMessage}`,
			);

			if (error && typeof error === "object" && "response" in error) {
				const response = (error as { response?: { status?: number } }).response;
				if (response?.status === 404) {
					throw new Error(
						`Country '${countryCode}' not found or no holiday data available for year ${year}`,
					);
				} else if (response?.status === 400) {
					throw new Error(`Invalid request parameters: ${errorMessage}`);
				} else if (response?.status && response.status >= 500) {
					throw new Error(`Nager.Date API server error: ${errorMessage}`);
				}
			}

			if (error && typeof error === "object" && "code" in error) {
				const code = (error as { code?: string }).code;
				if (code === "ECONNABORTED" || code === "ETIMEDOUT") {
					throw new Error(
						`Request timeout after ${this.config.timeout}ms. The Nager.Date API may be slow or unavailable.`,
					);
				}
				if (
					code === "ECONNREFUSED" ||
					code === "ENOTFOUND" ||
					code === "ENETUNREACH"
				) {
					throw new Error(
						"Failed to connect to Nager.Date API. Please check your internet connection.",
					);
				}
			}

			if (errorMessage.includes("fetch failed")) {
				throw new Error(
					"Failed to connect to Nager.Date API. Please check your internet connection.",
				);
			}

			throw new Error(`Failed to fetch holidays: ${errorMessage}`);
		}
	}

	/**
	 * Check if today is a holiday using the optimized endpoint
	 * @param {string} countryCode - ISO 3166-1 alpha-2 country code
	 * @returns {Promise<HolidayCheckResult>} Holiday check result
	 */
	override async isTodayHoliday(
		countryCode: string,
	): Promise<HolidayCheckResult> {
		if (!this.publicHolidayApi) {
			await this._initializeApiClient();
			if (!this.publicHolidayApi) {
				return super.isTodayHoliday(countryCode);
			}
		}

		this._debug(`Checking if today is a holiday for ${countryCode}`);

		try {
			const api = this.publicHolidayApi;
			if (!api) {
				throw new Error("PublicHolidayApi not initialized");
			}

			const request = { countryCode };
			const response =
				await api.apiV3IsTodayPublicHolidayCountryCodeGetRaw(request);
			const isHoliday = response.raw.status === 200;

			if (isHoliday) {
				const today = new Date();
				const year = today.getFullYear();
				const holidays = await this.getHolidaysByYear(year, countryCode);

				const dateStr = this._formatDate(today);
				const matchingHolidays = holidays.filter((holiday) => {
					const holidayDate = new Date(holiday.date);
					return this._formatDate(holidayDate) === dateStr;
				});

				const result: HolidayCheckResult = {
					isHoliday: true,
					holidayCount: matchingHolidays.length,
				};
				if (matchingHolidays[0]) {
					result.holiday = matchingHolidays[0];
				}
				return result;
			}

			return {
				isHoliday: false,
				holidayCount: 0,
			};
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : String(error);
			this._debug(
				`Optimized isTodayHoliday check failed, falling back to standard method: ${errorMessage}`,
			);
			return super.isTodayHoliday(countryCode);
		}
	}

	/**
	 * Get upcoming holidays using the optimized endpoint
	 * @param {string} countryCode - ISO 3166-1 alpha-2 country code
	 * @param {object} options - Optional query options
	 * @returns {Promise<Holiday[]>} Array of upcoming holidays
	 */
	override async getUpcomingHolidays(
		countryCode: string,
		options: { limit?: number; startDate?: Date } = {},
	): Promise<Holiday[]> {
		if (!this.publicHolidayApi) {
			await this._initializeApiClient();
			if (!this.publicHolidayApi) {
				return super.getUpcomingHolidays(countryCode, options);
			}
		}

		const { limit, startDate } = options;

		if (startDate) {
			return super.getUpcomingHolidays(countryCode, options);
		}

		this._debug(`Fetching upcoming holidays for ${countryCode}`);

		try {
			const api = this.publicHolidayApi;
			if (!api) {
				throw new Error("PublicHolidayApi not initialized");
			}

			const request = { countryCode };
			const holidays = await api.apiV3NextPublicHolidaysCountryCodeGet(request);

			this._debug(
				`Successfully fetched ${holidays?.length || 0} upcoming holidays for ${countryCode}`,
			);

			const normalizedHolidays = (holidays || []).map((apiHoliday) =>
				this._normalizeHoliday(apiHoliday as PublicHolidayV3Dto),
			);

			if (limit && limit > 0) {
				return normalizedHolidays.slice(0, limit);
			}

			return normalizedHolidays;
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : String(error);
			this._debug(
				`Error fetching upcoming holidays for ${countryCode}: ${errorMessage}`,
			);
			this._debug(
				`Optimized getUpcomingHolidays failed, falling back to standard method: ${errorMessage}`,
			);
			return super.getUpcomingHolidays(countryCode, options);
		}
	}

	/**
	 * Get holidays for a specific date range using optimized fetching
	 * @param {DateRange} dateRange - Date range to query
	 * @param {string} countryCode - ISO 3166-1 alpha-2 country code
	 * @returns {Promise<Holiday[]>} Array of holidays
	 */
	override async getHolidaysForDateRange(
		dateRange: DateRange,
		countryCode: string,
	): Promise<Holiday[]> {
		const { startDate, endDate } = dateRange;
		const today = new Date();

		if (
			startDate >= today &&
			endDate <= new Date(today.getTime() + 365 * 24 * 60 * 60 * 1000)
		) {
			try {
				const upcomingHolidays = await this.getUpcomingHolidays(countryCode);

				return upcomingHolidays.filter((holiday) => {
					const holidayDate = new Date(holiday.date);
					return holidayDate >= startDate && holidayDate <= endDate;
				});
			} catch (error) {
				const errorMessage =
					error instanceof Error ? error.message : String(error);
				this._debug(
					`Optimized date range fetch failed, using standard method: ${errorMessage}`,
				);
			}
		}

		return super.getHolidaysForDateRange(dateRange, countryCode);
	}

	/**
	 * Check availability with Nager.Date API health check
	 * @returns {Promise<DataSourceStatus>} Data source status
	 */
	override async checkAvailability(): Promise<DataSourceStatus> {
		const startTime = Date.now();

		try {
			if (!this.publicHolidayApi) {
				await this._initializeApiClient();
			}

			if (!this.publicHolidayApi) {
				const responseTime = Date.now() - startTime;
				return {
					isAvailable: false,
					lastFetch: undefined as unknown as Date,
					cacheSize: this.cache.size,
					error: "API client not initialized",
					responseTime,
				};
			}

			const apiModule = await import("nager_date_api_reference");
			const { VersionApi } = apiModule as {
				VersionApi: new (config?: Configuration) => VersionApi;
			};

			if (!this.configuration) {
				const responseTime = Date.now() - startTime;
				return {
					isAvailable: false,
					lastFetch: undefined as unknown as Date,
					cacheSize: this.cache.size,
					error: "Configuration not initialized",
					responseTime,
				};
			}

			const versionApi = new VersionApi(this.configuration);
			await versionApi.apiV3VersionGet();

			const responseTime = Date.now() - startTime;

			return {
				isAvailable: true,
				lastFetch: new Date(),
				cacheSize: this.cache.size,
				responseTime,
			};
		} catch (error) {
			const responseTime = Date.now() - startTime;
			void responseTime; // Explicitly mark as used
			const errorMessage =
				error instanceof Error ? error.message : String(error);
			this._debug(`Health check failed: ${errorMessage}`);
			return super.checkAvailability();
		}
	}

	/**
	 * Normalize holiday data from Nager.Date API response
	 * @param {unknown} apiHoliday - Raw holiday data from Nager.Date API
	 * @returns {Holiday} Normalized holiday object
	 * @protected
	 */
	protected override _normalizeHoliday(apiHoliday: unknown): Holiday {
		const h = apiHoliday as {
			date: string | Date;
			localName: string;
			name: string;
			countryCode: string;
			types?: string[];
			fixed?: boolean;
			global?: boolean;
			counties?: string[];
			launchYear?: number;
		};

		// Parse date string to avoid UTC/local timezone mismatch
		// API returns "YYYY-MM-DD" strings which should be treated as local dates
		const dateValue =
			typeof h.date === "string" ? h.date : h.date.toISOString();
		const dateStr = dateValue.split("T")[0] || dateValue;
		const parts = dateStr.split("-");
		if (parts.length !== 3) {
			throw new Error(`Invalid date format: ${h.date}`);
		}
		const year = Number(parts[0]);
		const month = Number(parts[1]);
		const day = Number(parts[2]);
		if (Number.isNaN(year) || Number.isNaN(month) || Number.isNaN(day)) {
			throw new Error(`Invalid date format: ${h.date}`);
		}
		const localDate = new Date(year, month - 1, day); // month is 0-indexed in JS Date

		const result: Holiday = {
			date: localDate,
			localName: h.localName,
			name: h.name,
			countryCode: h.countryCode,
			types: (h.types || []) as HolidayType[],
			counties: h.counties || [],
		};

		if (h.fixed !== undefined) {
			result.fixed = h.fixed;
		}
		if (h.global !== undefined) {
			result.global = h.global;
		}
		if (h.launchYear !== undefined) {
			result.launchYear = h.launchYear;
		}

		return result;
	}
}

export default NagerDateHolidayDataSource;
