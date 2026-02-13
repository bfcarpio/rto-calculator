/**
 * Nager.Date Holiday Data Source
 * Implementation of HolidayDataSourceStrategy using the Nager.Date API
 */

import HolidayDataSourceStrategy from "./HolidayDataSourceStrategy.js";

class NagerDateHolidayDataSource extends HolidayDataSourceStrategy {
	/**
	 * Constructs a new NagerDateHolidayDataSource
	 * @param {object} config - Configuration options
	 */
	constructor(config = {}) {
		super(
			"nager-date",
			"Nager.Date API - Free public service for public holidays and long weekends worldwide",
			config,
		);

		this.apiClient = null;
		this.publicHolidayApi = null;
		this._initializeApiClient();
	}

	/**
	 * Initialize the Nager.Date API client
	 * @private
	 */
	async _initializeApiClient() {
		try {
			// Import the ApiClient and PublicHolidayApi from nager_date_api_reference
			// Use dynamic import for ES modules
			const apiModule = await import("nager_date_api_reference");
			const { ApiClient, PublicHolidayApi } = apiModule;

			// Configure API client with explicit base URL to ensure correct endpoint
			if (this.config.baseUrl) {
				this.apiClient = new ApiClient(this.config.baseUrl);
			} else {
				this.apiClient = new ApiClient("https://date.nager.at");
			}

			// Set timeout if provided
			if (this.config.timeout) {
				this.apiClient.timeout = this.config.timeout;
			}

			// Initialize PublicHolidayApi
			this.publicHolidayApi = new PublicHolidayApi(this.apiClient);

			this._debug("Nager.Date API client initialized successfully");
		} catch (error) {
			this._debug(
				`Failed to initialize Nager.Date API client: ${error.message}`,
			);
			this.apiClient = null;
			this.publicHolidayApi = null;
		}
	}

	/**
	 * Fetch holidays for a specific year and country from Nager.Date API
	 * @param {number} year - Year to fetch holidays for
	 * @param {string} countryCode - ISO 3166-1 alpha-2 country code
	 * @returns {Promise<Array<Holiday>>} Array of holidays
	 * @protected
	 */
	async _fetchHolidaysForYear(year, countryCode) {
		if (!this.publicHolidayApi) {
			// Try to reinitialize if API client is not available
			await this._initializeApiClient();
			if (!this.publicHolidayApi) {
				throw new Error("Nager.Date API client not initialized");
			}
		}

		this._debug(`Fetching holidays for ${countryCode} - ${year}`);

		try {
			const holidays = await new Promise((resolve, reject) => {
				this.publicHolidayApi.apiV3PublicHolidaysYearCountryCodeGet(
					year,
					countryCode,
					(error, data, _response) => {
						if (error) {
							reject(error);
						} else {
							resolve(data);
						}
					},
				);
			});

			this._debug(
				`Successfully fetched ${holidays?.length || 0} holidays for ${countryCode} - ${year}`,
			);

			// Normalize each holiday to our standard format
			return holidays.map((apiHoliday) => this._normalizeHoliday(apiHoliday));
		} catch (error) {
			this._debug(
				`Error fetching holidays for ${countryCode} - ${year}: ${error.message}`,
			);

			// Handle various error types
			if (error.response?.status) {
				if (error.response.status === 404) {
					throw new Error(
						`Country '${countryCode}' not found or no holiday data available for year ${year}`,
					);
				} else if (error.response.status === 400) {
					throw new Error(`Invalid request parameters: ${error.message}`);
				} else if (error.response.status >= 500) {
					throw new Error(`Nager.Date API server error: ${error.message}`);
				}
			}

			// Handle timeout errors
			if (error.code === "ECONNABORTED" || error.code === "ETIMEDOUT") {
				throw new Error(
					`Request timeout after ${this.config.timeout}ms. The Nager.Date API may be slow or unavailable.`,
				);
			}

			// Handle network errors
			if (
				error.code === "ECONNREFUSED" ||
				error.code === "ENOTFOUND" ||
				error.code === "ENETUNREACH"
			) {
				throw new Error(
					"Failed to connect to Nager.Date API. Please check your internet connection.",
				);
			}

			// Handle generic network errors
			if (error.message?.includes("fetch failed")) {
				throw new Error(
					"Failed to connect to Nager.Date API. Please check your internet connection.",
				);
			}

			// Re-throw other errors
			throw new Error(`Failed to fetch holidays: ${error.message}`);
		}
	}

	/**
	 * Check if today is a holiday using the optimized endpoint
	 * @param {string} countryCode - ISO 3166-1 alpha-2 country code
	 * @returns {Promise<HolidayCheckResult>} Holiday check result
	 */
	async isTodayHoliday(countryCode) {
		if (!this.publicHolidayApi) {
			// Try to reinitialize if API client is not available
			await this._initializeApiClient();
			if (!this.publicHolidayApi) {
				return super.isTodayHoliday(countryCode);
			}
		}

		this._debug(`Checking if today is a holiday for ${countryCode}`);

		try {
			// Use the optimized IsTodayPublicHoliday endpoint
			const statusCode = await new Promise((resolve, reject) => {
				this.publicHolidayApi.apiV3IsTodayPublicHolidayCountryCodeGet(
					countryCode,
					{},
					(error, _data, response) => {
						if (error) {
							reject(error);
						} else {
							resolve(response?.status ? response.status : 200);
						}
					},
				);
			});

			// HTTP 200 means today is a holiday, 204 means it's not
			const isHoliday = statusCode === 200;

			if (isHoliday) {
				// If today is a holiday, fetch the holiday details
				const today = new Date();
				const year = today.getFullYear();
				const holidays = await this.getHolidaysByYear(year, countryCode);

				const dateStr = this._formatDate(today);
				const matchingHolidays = holidays.filter((holiday) => {
					const holidayDate = new Date(holiday.date);
					return this._formatDate(holidayDate) === dateStr;
				});

				return {
					isHoliday: true,
					holiday: matchingHolidays[0] || null,
					holidayCount: matchingHolidays.length,
				};
			}

			return {
				isHoliday: false,
				holidayCount: 0,
			};
		} catch (error) {
			// If the optimized endpoint fails, fall back to the standard method
			this._debug(
				`Optimized isTodayHoliday check failed, falling back to standard method: ${error.message}`,
			);
			return super.isTodayHoliday(countryCode);
		}
	}

	/**
	 * Get upcoming holidays using the optimized endpoint
	 * @param {string} countryCode - ISO 3166-1 alpha-2 country code
	 * @param {object} options - Optional query options
	 * @returns {Promise<Array<Holiday>>} Array of upcoming holidays
	 */
	async getUpcomingHolidays(countryCode, options = {}) {
		if (!this.publicHolidayApi) {
			// Try to reinitialize if API client is not available
			await this._initializeApiClient();
			if (!this.publicHolidayApi) {
				return super.getUpcomingHolidays(countryCode, options);
			}
		}

		const { limit, startDate } = options;

		// If a custom startDate is provided, use the standard method
		if (startDate) {
			return super.getUpcomingHolidays(countryCode, options);
		}

		this._debug(`Fetching upcoming holidays for ${countryCode}`);

		try {
			const holidays = await new Promise((resolve, reject) => {
				this.publicHolidayApi.apiV3NextPublicHolidaysCountryCodeGet(
					countryCode,
					(error, data, _response) => {
						if (error) {
							reject(error);
						} else {
							resolve(data);
						}
					},
				);
			});

			this._debug(
				`Successfully fetched ${holidays?.length || 0} upcoming holidays for ${countryCode}`,
			);

			// Normalize holidays
			const normalizedHolidays = holidays.map((apiHoliday) =>
				this._normalizeHoliday(apiHoliday),
			);

			// Apply limit if specified
			if (limit && limit > 0) {
				return normalizedHolidays.slice(0, limit);
			}

			return normalizedHolidays;
		} catch (error) {
			this._debug(
				`Error fetching upcoming holidays for ${countryCode}: ${error.message}`,
			);

			// Fall back to standard method if optimized endpoint fails
			this._debug(
				`Optimized getUpcomingHolidays failed, falling back to standard method: ${error.message}`,
			);
			return super.getUpcomingHolidays(countryCode, options);
		}
	}

	/**
	 * Get holidays for a specific date range using optimized fetching
	 * @param {DateRange} dateRange - Date range to query
	 * @param {string} countryCode - ISO 3166-1 alpha-2 country code
	 * @returns {Promise<Array<Holiday>>} Array of holidays
	 */
	async getHolidaysForDateRange(dateRange, countryCode) {
		const { startDate, endDate } = dateRange;
		const today = new Date();

		// If the date range is for upcoming holidays (starts from today or future),
		// we can use the optimized NextPublicHolidays endpoint
		if (
			startDate >= today &&
			endDate <= new Date(today.getTime() + 365 * 24 * 60 * 60 * 1000)
		) {
			try {
				const upcomingHolidays = await this.getUpcomingHolidays(countryCode);

				// Filter to the requested date range
				return upcomingHolidays.filter((holiday) => {
					const holidayDate = new Date(holiday.date);
					return holidayDate >= startDate && holidayDate <= endDate;
				});
			} catch (error) {
				this._debug(
					`Optimized date range fetch failed, using standard method: ${error.message}`,
				);
			}
		}

		// If the date range is for upcoming holidays (starts from today or future),
		// we can use the optimized NextPublicHolidays endpoint
		// Fall back to standard method
		return super.getHolidaysForDateRange(dateRange, countryCode);
	}

	/**
	 * Check availability with Nager.Date API health check
	 * @returns {Promise<DataSourceStatus>} Data source status
	 */
	async checkAvailability() {
		const startTime = Date.now();

		try {
			// Try to reinitialize if needed
			if (!this.publicHolidayApi) {
				await this._initializeApiClient();
			}

			// If API client is still not available, return not available
			if (!this.publicHolidayApi) {
				const responseTime = Date.now() - startTime;
				return {
					isAvailable: false,
					lastFetch: undefined,
					cacheSize: this.cache.size,
					error: "API client not initialized",
					responseTime,
				};
			}

			// Try to fetch version info as a health check
			const apiModule = await import("nager_date_api_reference");
			const { VersionApi } = apiModule;
			const versionApi = new VersionApi(this.apiClient);

			await new Promise((resolve, reject) => {
				versionApi.apiV3VersionGet((error, data, _response) => {
					if (error) {
						reject(error);
					} else {
						resolve(data);
					}
				});
			});

			const responseTime = Date.now() - startTime;

			return {
				isAvailable: true,
				lastFetch: new Date(),
				cacheSize: this.cache.size,
				responseTime,
			};
		} catch (error) {
			const _responseTime = Date.now() - startTime;
			this._debug(`Health check failed: ${error.message}`);

			// Fall back to the parent's availability check
			return super.checkAvailability();
		}
	}

	/**
	 * Normalize holiday data from Nager.Date API response
	 * @param {object} apiHoliday - Raw holiday data from Nager.Date API
	 * @returns {Holiday} Normalized holiday object
	 * @protected
	 */
	_normalizeHoliday(apiHoliday) {
		// The Nager.Date API already provides most fields in the correct format
		// We just need to ensure proper date conversion and type handling
		return {
			date: new Date(apiHoliday.date),
			localName: apiHoliday.localName,
			name: apiHoliday.name,
			countryCode: apiHoliday.countryCode,
			types: apiHoliday.types || [],
			fixed: apiHoliday.fixed !== undefined ? apiHoliday.fixed : undefined,
			global: apiHoliday.global !== undefined ? apiHoliday.global : undefined,
			counties: apiHoliday.counties || [],
			launchYear: apiHoliday.launchYear,
		};
	}
}

// Export for use in holiday data source factory
export default NagerDateHolidayDataSource;
