/**
 * Holiday Data Source Strategy
 * Base class for all holiday data source implementations
 * Implements the HolidayDataSource interface
 */

import type {
	DataSourceStatistics,
	DataSourceStatus,
	DateRange,
	Holiday,
	HolidayCheckResult,
	HolidayDataSource,
	HolidayDataSourceConfig,
	HolidayQueryOptions,
	HolidayQueryResult,
} from "./types";

abstract class HolidayDataSourceStrategy implements HolidayDataSource {
	name: string;
	description: string;
	config: HolidayDataSourceConfig;
	protected defaultConfig: HolidayDataSourceConfig;
	protected cache: Map<string, Holiday[]>;
	protected cacheTimestamps: Map<string, number>;

	/**
	 * Constructs a new HolidayDataSourceStrategy
	 * @param {string} name - Unique identifier for this data source
	 * @param {string} description - Human-readable description
	 * @param {HolidayDataSourceConfig} config - Initial configuration
	 */
	constructor(
		name: string,
		description: string,
		config: HolidayDataSourceConfig = {},
	) {
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
	async checkAvailability(): Promise<DataSourceStatus> {
		const startTime = Date.now();
		try {
			// Attempt to fetch a simple test query
			const currentYear = new Date().getFullYear();
			await this.getHolidaysByYear(
				currentYear,
				this.config.defaultCountryCode || "US",
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
			const errorMessage =
				error instanceof Error ? error.message : String(error);
			return {
				isAvailable: false,
				cacheSize: this.cache.size,
				error: errorMessage,
				responseTime,
			};
		}
	}

	/**
	 * Get all holidays for a specific year and country
	 * @param {number} year - Year to get holidays for
	 * @param {string} countryCode - ISO 3166-1 alpha-2 country code
	 * @returns {Promise<Holiday[]>} Array of holidays
	 */
	async getHolidaysByYear(
		year: number,
		countryCode: string,
	): Promise<Holiday[]> {
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
	 * @returns {Promise<Holiday[]>} Array of holidays
	 */
	async getHolidaysForDateRange(
		dateRange: DateRange,
		countryCode: string,
	): Promise<Holiday[]> {
		const { startDate, endDate } = dateRange;
		const startYear = startDate.getFullYear();
		const endYear = endDate.getFullYear();

		// Fetch holidays for all years in range
		const holidays: Holiday[] = [];
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
	 * @returns {Promise<Holiday[]>} Array of upcoming holidays
	 */
	async getUpcomingHolidays(
		countryCode: string,
		options: { limit?: number; startDate?: Date } = {},
	): Promise<Holiday[]> {
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
	async isHoliday(
		date: Date,
		countryCode: string,
	): Promise<HolidayCheckResult> {
		const year = date.getFullYear();
		const holidays = await this.getHolidaysByYear(year, countryCode);

		const dateStr = this._formatDate(date);
		const matchingHolidays = holidays.filter((holiday) => {
			const holidayDate = new Date(holiday.date);
			return this._formatDate(holidayDate) === dateStr;
		});

		const foundHoliday = matchingHolidays[0];
		if (foundHoliday) {
			return {
				isHoliday: true,
				holiday: foundHoliday,
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
	async isTodayHoliday(countryCode: string): Promise<HolidayCheckResult> {
		const today = new Date();
		return this.isHoliday(today, countryCode);
	}

	/**
	 * Query holidays with custom options
	 * @param {HolidayQueryOptions} options - Query options
	 * @returns {Promise<HolidayQueryResult>} Holiday query result
	 */
	async queryHolidays(
		options: HolidayQueryOptions,
	): Promise<HolidayQueryResult> {
		const {
			countryCode,
			year,
			dateRange,
			globalOnly = false,
			counties,
			types,
		} = options;

		let holidays: Holiday[];

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

		const result: HolidayQueryResult = {
			holidays,
			totalCount: holidays.length,
			countryCode,
		};

		if (dateRange) {
			result.dateRange = dateRange;
		}

		return result;
	}

	/**
	 * Clear any internal cache
	 * @returns {void}
	 */
	clearCache(): void {
		this.cache.clear();
		this.cacheTimestamps.clear();
		if (this.config.debug) {
			console.log(`[HolidayDataSource] Cache cleared`);
		}
	}

	/**
	 * Get data source statistics
	 */
	getStatistics(): DataSourceStatistics {
		// Implement a basic return to satisfy the interface or full stats if needed
		return {
			totalCalls: 0,
			successfulCalls: 0,
			failedCalls: 0,
			averageResponseTime: 0,
			cacheHitRate: 0,
			totalHolidaysFetched: 0,
		};
	}

	/**
	 * Reset the data source statistics
	 */
	resetStatistics(): void {
		// No-op for base class, or reset specific stats if we had them
	}

	/**
	 * Reset the data source to initial state
	 * @returns {Promise<void>}
	 */
	async reset(): Promise<void> {
		this.clearCache();
		this.config = { ...this.defaultConfig };
		if (this.config.debug) {
			console.log(`[HolidayDataSource] Reset complete`);
		}
	}

	/**
	 * Update configuration for this data source
	 * @param {Partial<HolidayDataSourceConfig>} config - New configuration values
	 */
	updateConfig(config: Partial<HolidayDataSourceConfig>): void {
		this.config = { ...this.config, ...config };
		if (this.config.debug) {
			console.log(`[HolidayDataSource] Configuration updated`);
		}
	}

	/**
	 * Get current configuration
	 * @returns {HolidayDataSourceConfig} Current configuration
	 */
	getConfig(): HolidayDataSourceConfig {
		return { ...this.config };
	}

	// Abstract methods that must be implemented by subclasses

	/**
	 * Fetch holidays for a specific year and country from the data source
	 * @abstract
	 * @param {number} year - Year to fetch holidays for
	 * @param {string} countryCode - ISO 3166-1 alpha-2 country code
	 * @returns {Promise<Holiday[]>} Array of holidays
	 * @protected
	 */
	protected abstract _fetchHolidaysForYear(
		year: number,
		countryCode: string,
	): Promise<Holiday[]>;

	// Protected helper methods

	/**
	 * Get value from cache if not expired
	 * @param {string} key - Cache key
	 * @returns {Holiday[] | null} Cached value or null
	 * @protected
	 */
	protected _getFromCache(key: string): Holiday[] | null {
		if (!this.cache.has(key)) {
			return null;
		}

		const timestamp = this.cacheTimestamps.get(key) || 0;
		const now = Date.now();
		const age = now - timestamp;

		if (this.config.cacheDuration && age > this.config.cacheDuration) {
			this.cache.delete(key);
			this.cacheTimestamps.delete(key);
			return null;
		}

		return this.cache.get(key) || null;
	}

	/**
	 * Set value in cache
	 * @param {string} key - Cache key
	 * @param {Holiday[]} value - Value to cache
	 * @protected
	 */
	protected _setCache(key: string, value: Holiday[]): void {
		this.cache.set(key, value);
		this.cacheTimestamps.set(key, Date.now());
	}

	/**
	 * Format date to YYYY-MM-DD string for comparison
	 * @param {Date} date - Date to format
	 * @returns {string} Formatted date string
	 * @protected
	 */
	protected _formatDate(date: Date): string {
		const year = date.getFullYear();
		const month = String(date.getMonth() + 1).padStart(2, "0");
		const day = String(date.getDate()).padStart(2, "0");
		return `${year}-${month}-${day}`;
	}

	/**
	 * Normalize holiday data from API response to standard format
	 * @param {unknown} apiHoliday - Raw holiday data from API
	 * @returns {Holiday} Normalized holiday object
	 * @protected
	 */
	protected _normalizeHoliday(apiHoliday: unknown): Holiday {
		// Default implementation, should be overridden or used if structure matches
		const h = apiHoliday as any;
		return {
			date: new Date(h.date),
			localName: h.localName,
			name: h.name,
			countryCode: h.countryCode,
			types: h.types || [],
			fixed: h.fixed,
			global: h.global,
			counties: h.counties,
			launchYear: h.launchYear,
		};
	}

	/**
	 * Log debug message
	 * @param {string} message - Message to log
	 * @protected
	 */
	protected _debug(message: string): void {
		if (this.config.debug) {
			console.log(`[HolidayDataSource:${this.name}] ${message}`);
		}
	}
}

export default HolidayDataSourceStrategy;
