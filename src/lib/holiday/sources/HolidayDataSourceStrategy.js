/**
 * Holiday Data Source Strategy
 * Base class for all holiday data source implementations
 * Implements the HolidayDataSource interface
 */

class HolidayDataSourceStrategy {
	/**
	 * Constructs a new HolidayDataSourceStrategy
	 * @param {string} name - Unique identifier for this data source
	 * @param {string} description - Human-readable description
	 * @param {object} config - Initial configuration
	 */
	constructor(name, description, config = {}) {
		this.name = name;
		this.description = description;
		this.defaultConfig = {
			defaultCountryCode: "US",
			enableCache: true,
			cacheDuration: 3600000, // 1 hour
			timeout: 10000, // 10 seconds
			debug: false,
		};
		this.config = { ...this.defaultConfig, ...config };
		this.cache = new Map();
		this.cacheTimestamps = new Map();
	}

	/**
	 * Check if this data source is available and ready to use
	 * @returns {Promise<DataSourceStatus>} Data source status
	 */
	async checkAvailability() {
		const startTime = Date.now();
		try {
			// Attempt to fetch a simple test query
			const currentYear = new Date().getFullYear();
			const _holidays = await this.getHolidaysByYear(
				currentYear,
				this.config.defaultCountryCode,
			);

			const responseTime = Date.now() - startTime;
			return {
				isAvailable: true,
				lastFetch: new Date(),
				cacheSize: this.cache.size,
				responseTime,
			};
		} catch (error) {
			const responseTime = Date.now() - startTime;
			return {
				isAvailable: false,
				lastFetch: undefined,
				cacheSize: this.cache.size,
				error: error.message,
				responseTime,
			};
		}
	}

	/**
	 * Get all holidays for a specific year and country
	 * @param {number} year - Year to get holidays for
	 * @param {string} countryCode - ISO 3166-1 alpha-2 country code
	 * @returns {Promise<Array<Holiday>>} Array of holidays
	 */
	async getHolidaysByYear(year, countryCode) {
		const cacheKey = `${countryCode}-${year}`;

		if (this.config.enableCache) {
			const cached = this._getFromCache(cacheKey);
			if (cached) {
				if (this.config.debug) {
					console.log(`[HolidayDataSource] Cache hit for ${cacheKey}`);
				}
				return cached;
			}
		}

		if (this.config.debug) {
			console.log(
				`[HolidayDataSource] Fetching holidays for ${countryCode} ${year}`,
			);
		}

		const holidays = await this._fetchHolidaysForYear(year, countryCode);

		if (this.config.enableCache) {
			this._setCache(cacheKey, holidays);
		}

		return holidays;
	}

	/**
	 * Get holidays within a date range
	 * @param {DateRange} dateRange - Date range to query
	 * @param {string} countryCode - ISO 3166-1 alpha-2 country code
	 * @returns {Promise<Array<Holiday>>} Array of holidays
	 */
	async getHolidaysForDateRange(dateRange, countryCode) {
		const { startDate, endDate } = dateRange;
		const startYear = startDate.getFullYear();
		const endYear = endDate.getFullYear();

		// Fetch holidays for all years in range
		const holidays = [];
		for (let year = startYear; year <= endYear; year++) {
			const yearHolidays = await this.getHolidaysByYear(year, countryCode);
			holidays.push(...yearHolidays);
		}

		// Filter to date range
		return holidays.filter((holiday) => {
			const holidayDate = new Date(holiday.date);
			return holidayDate >= startDate && holidayDate <= endDate;
		});
	}

	/**
	 * Get upcoming holidays
	 * @param {string} countryCode - ISO 3166-1 alpha-2 country code
	 * @param {object} options - Optional query options
	 * @returns {Promise<Array<Holiday>>} Array of upcoming holidays
	 */
	async getUpcomingHolidays(countryCode, options = {}) {
		const { limit = 365, startDate = new Date() } = options;
		const endDate = new Date(startDate);
		endDate.setDate(startDate.getDate() + limit);

		const holidays = await this.getHolidaysForDateRange(
			{ startDate, endDate },
			countryCode,
		);

		// Filter to future holidays only
		return holidays.filter((holiday) => new Date(holiday.date) >= startDate);
	}

	/**
	 * Check if a specific date is a holiday
	 * @param {Date} date - Date to check
	 * @param {string} countryCode - ISO 3166-1 alpha-2 country code
	 * @returns {Promise<HolidayCheckResult>} Holiday check result
	 */
	async isHoliday(date, countryCode) {
		const year = date.getFullYear();
		const holidays = await this.getHolidaysByYear(year, countryCode);

		const dateStr = this._formatDate(date);
		const matchingHolidays = holidays.filter((holiday) => {
			const holidayDate = new Date(holiday.date);
			return this._formatDate(holidayDate) === dateStr;
		});

		if (matchingHolidays.length > 0) {
			return {
				isHoliday: true,
				holiday: matchingHolidays[0],
				holidayCount: matchingHolidays.length,
			};
		}

		return {
			isHoliday: false,
			holidayCount: 0,
		};
	}

	/**
	 * Check if today is a holiday
	 * @param {string} countryCode - ISO 3166-1 alpha-2 country code
	 * @returns {Promise<HolidayCheckResult>} Holiday check result
	 */
	async isTodayHoliday(countryCode) {
		const today = new Date();
		return this.isHoliday(today, countryCode);
	}

	/**
	 * Query holidays with custom options
	 * @param {HolidayQueryOptions} options - Query options
	 * @returns {Promise<HolidayQueryResult>} Holiday query result
	 */
	async queryHolidays(options) {
		const {
			countryCode,
			year,
			dateRange,
			globalOnly = false,
			counties,
			types,
		} = options;

		let holidays;

		if (dateRange) {
			holidays = await this.getHolidaysForDateRange(dateRange, countryCode);
		} else if (year) {
			holidays = await this.getHolidaysByYear(year, countryCode);
		} else {
			// Default to current year
			const currentYear = new Date().getFullYear();
			holidays = await this.getHolidaysByYear(currentYear, countryCode);
		}

		// Apply filters
		if (globalOnly) {
			holidays = holidays.filter((holiday) => holiday.global !== false);
		}

		if (counties && counties.length > 0) {
			holidays = holidays.filter((holiday) => {
				if (!holiday.counties || holiday.counties.length === 0) {
					return true; // Global holiday applies to all
				}
				return holiday.counties.some((county) => counties.includes(county));
			});
		}

		if (types && types.length > 0) {
			holidays = holidays.filter((holiday) => {
				return holiday.types.some((type) => types.includes(type));
			});
		}

		return {
			holidays,
			total: holidays.length,
			query: options,
			cached: false, // Subclasses can override this if they track cache hits
		};
	}

	/**
	 * Clear any internal cache
	 * @returns {Promise<void>}
	 */
	async clearCache() {
		this.cache.clear();
		this.cacheTimestamps.clear();
		if (this.config.debug) {
			console.log(`[HolidayDataSource] Cache cleared`);
		}
	}

	/**
	 * Reset the data source to initial state
	 * @returns {Promise<void>}
	 */
	async reset() {
		await this.clearCache();
		this.config = { ...this.defaultConfig };
		if (this.config.debug) {
			console.log(`[HolidayDataSource] Reset complete`);
		}
	}

	/**
	 * Update configuration for this data source
	 * @param {Partial<HolidayDataSourceConfig>} config - New configuration values
	 */
	updateConfig(config) {
		this.config = { ...this.config, ...config };
		if (this.config.debug) {
			console.log(`[HolidayDataSource] Configuration updated`);
		}
	}

	/**
	 * Get current configuration
	 * @returns {HolidayDataSourceConfig} Current configuration
	 */
	getConfig() {
		return { ...this.config };
	}

	// Abstract methods that must be implemented by subclasses

	/**
	 * Fetch holidays for a specific year and country from the data source
	 * @abstract
	 * @param {number} year - Year to fetch holidays for
	 * @param {string} countryCode - ISO 3166-1 alpha-2 country code
	 * @returns {Promise<Array<Holiday>>} Array of holidays
	 * @protected
	 */
	async _fetchHolidaysForYear(_year, _countryCode) {
		throw new Error(`_fetchHolidaysForYear must be implemented by subclass`);
	}

	// Protected helper methods

	/**
	 * Get value from cache if not expired
	 * @param {string} key - Cache key
	 * @returns {any|null} Cached value or null
	 * @protected
	 */
	_getFromCache(key) {
		if (!this.cache.has(key)) {
			return null;
		}

		const timestamp = this.cacheTimestamps.get(key);
		const now = Date.now();
		const age = now - timestamp;

		if (age > this.config.cacheDuration) {
			this.cache.delete(key);
			this.cacheTimestamps.delete(key);
			return null;
		}

		return this.cache.get(key);
	}

	/**
	 * Set value in cache
	 * @param {string} key - Cache key
	 * @param {any} value - Value to cache
	 * @protected
	 */
	_setCache(key, value) {
		this.cache.set(key, value);
		this.cacheTimestamps.set(key, Date.now());
	}

	/**
	 * Format date to YYYY-MM-DD string for comparison
	 * @param {Date} date - Date to format
	 * @returns {string} Formatted date string
	 * @protected
	 */
	_formatDate(date) {
		const year = date.getFullYear();
		const month = String(date.getMonth() + 1).padStart(2, "0");
		const day = String(date.getDate()).padStart(2, "0");
		return `${year}-${month}-${day}`;
	}

	/**
	 * Normalize holiday data from API response to standard format
	 * @param {object} apiHoliday - Raw holiday data from API
	 * @returns {Holiday} Normalized holiday object
	 * @protected
	 */
	_normalizeHoliday(apiHoliday) {
		return {
			date: new Date(apiHoliday.date),
			localName: apiHoliday.localName,
			name: apiHoliday.name,
			countryCode: apiHoliday.countryCode,
			types: apiHoliday.types || [],
			fixed: apiHoliday.fixed,
			global: apiHoliday.global,
			counties: apiHoliday.counties,
			launchYear: apiHoliday.launchYear,
		};
	}

	/**
	 * Log debug message
	 * @param {string} message - Message to log
	 * @protected
	 */
	_debug(message) {
		if (this.config.debug) {
			console.log(`[HolidayDataSource:${this.name}] ${message}`);
		}
	}
}

// Export for use in holiday data source implementations
export default HolidayDataSourceStrategy;
