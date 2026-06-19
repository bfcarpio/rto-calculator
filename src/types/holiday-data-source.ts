/**
 * Holiday Data Source Types
 * Single source of truth for holiday data source types and interfaces.
 * All holiday data source implementations must conform to these types.
 */

/**
 * Holiday type classification
 */
export type HolidayType =
	| "Public"
	| "Bank"
	| "School"
	| "Authorities"
	| "Optional"
	| "Observance";

/**
 * Holiday information
 */
export interface Holiday {
	/** The date of the holiday */
	date: Date;
	/** Local name of the holiday */
	localName: string;
	/** English name of the holiday */
	name: string;
	/** ISO 3166-1 alpha-2 country code */
	countryCode: string;
	/** List of holiday types this holiday is classified under */
	types: HolidayType[];
	/** Indicates if this holiday occurs on the same date every year */
	fixed?: boolean;
	/** Indicates if this holiday applies to the entire country */
	global?: boolean;
	/** ISO-3166-2 codes of subdivisions where this holiday applies */
	counties?: string[];
	/** The year the holiday was first observed */
	launchYear?: number;
}

/**
 * Date range for holiday queries
 */
export interface DateRange {
	startDate: Date;
	endDate: Date;
}

/**
 * Holiday data source configuration
 */
export interface HolidayDataSourceConfig {
	/** Default country code (ISO 3166-1 alpha-2) */
	defaultCountryCode?: string;
	/** Cache holidays for performance */
	enableCache?: boolean;
	/** Cache duration in milliseconds */
	cacheDuration?: number;
	/** API endpoint base URL */
	baseUrl?: string;
	/** Timeout for API requests in milliseconds */
	timeout?: number;
	/** Enable debug logging */
	debug?: boolean;
}

/**
 * Holiday query options
 */
export interface HolidayQueryOptions {
	/** Country code (ISO 3166-1 alpha-2) */
	countryCode: string;
	/** Year to query holidays for */
	year?: number;
	/** Date range to query holidays for */
	dateRange?: DateRange;
	/** Include only global holidays */
	globalOnly?: boolean;
	/** Specific subdivision codes to filter */
	counties?: string[];
	/** Holiday types to include */
	types?: HolidayType[];
}

/**
 * Holiday check result
 */
export interface HolidayCheckResult {
	/** Whether the date is a holiday */
	isHoliday: boolean;
	/** Holiday information if it's a holiday */
	holiday?: Holiday;
	/** Count of holidays on this date */
	holidayCount?: number;
}

/**
 * Holiday query result
 */
export interface HolidayQueryResult {
	/** Array of holidays matching the query */
	holidays: Holiday[];
	/** Total number of holidays found */
	totalCount: number;
	/** Country code the query was for */
	countryCode: string;
	/** Date range the query was for, if applicable */
	dateRange?: DateRange;
}

/**
 * Data source status information
 */
export interface DataSourceStatus {
	/** Whether the data source is available and operational */
	isAvailable: boolean;
	/** Last time data was successfully fetched */
	lastFetch?: Date;
	/** Number of items currently cached */
	cacheSize: number;
	/** Response time in milliseconds for the last check */
	responseTime: number;
	/** Error message if the data source is unavailable */
	error?: string;
}

/**
 * Data source usage statistics
 */
export interface DataSourceStatistics {
	/** Total number of API calls made */
	totalCalls: number;
	/** Number of successful API calls */
	successfulCalls: number;
	/** Number of failed API calls */
	failedCalls: number;
	/** Average response time in milliseconds */
	averageResponseTime: number;
	/** Cache hit rate (0-1) */
	cacheHitRate: number;
	/** Total number of holidays fetched */
	totalHolidaysFetched: number;
}

/**
 * Holiday Data Source Interface
 * All holiday data source implementations must implement this interface
 */
export interface HolidayDataSource {
	/** Unique identifier for this data source */
	name: string;
	/** Human-readable description of the data source */
	description: string;
	/** Configuration options */
	config: HolidayDataSourceConfig;
	/** Optional accessor for current configuration */
	getConfig?: () => HolidayDataSourceConfig;

	/**
	 * Check if the data source is available and operational
	 * @returns Promise that resolves to the data source status
	 */
	checkAvailability(): Promise<DataSourceStatus>;

	/**
	 * Get all holidays for a specific year and country
	 * @param year - The year to get holidays for
	 * @param countryCode - ISO 3166-1 alpha-2 country code
	 * @returns Promise that resolves to an array of holidays
	 */
	getHolidaysByYear(year: number, countryCode: string): Promise<Holiday[]>;

	/**
	 * Get holidays for a specific date range
	 * @param dateRange - Start and end dates
	 * @param countryCode - ISO 3166-1 alpha-2 country code
	 * @returns Promise that resolves to an array of holidays
	 */
	getHolidaysForDateRange(
		dateRange: DateRange,
		countryCode: string,
	): Promise<Holiday[]>;

	/**
	 * Get upcoming holidays from today
	 * @param countryCode - ISO 3166-1 alpha-2 country code
	 * @param options - Query options
	 * @returns Promise that resolves to an array of holidays
	 */
	getUpcomingHolidays(
		countryCode: string,
		options?: { limit?: number; startDate?: Date },
	): Promise<Holiday[]>;

	/**
	 * Check if a specific date is a holiday
	 * @param date - The date to check
	 * @param countryCode - ISO 3166-1 alpha-2 country code
	 * @returns Promise that resolves to the holiday check result
	 */
	isHoliday(date: Date, countryCode: string): Promise<HolidayCheckResult>;

	/**
	 * Check if today is a holiday
	 * @param countryCode - ISO 3166-1 alpha-2 country code
	 * @returns Promise that resolves to the holiday check result
	 */
	isTodayHoliday(countryCode: string): Promise<HolidayCheckResult>;

	/**
	 * Query holidays with custom options
	 * @param options - Query options
	 * @returns Promise that resolves to the holiday query result
	 */
	queryHolidays(options: HolidayQueryOptions): Promise<HolidayQueryResult>;

	/**
	 * Clear the holiday cache
	 */
	clearCache(): void;

	/**
	 * Update the data source configuration
	 * @param config - New configuration options (merged with existing)
	 */
	updateConfig(config: Partial<HolidayDataSourceConfig>): void;

	/**
	 * Reset the data source to its initial state
	 */
	reset?(): Promise<void> | void;
}

/**
 * Holiday Data Source Factory
 * Creates and manages holiday data source instances
 */
export interface HolidayDataSourceFactory {
	/**
	 * Get a data source by name
	 * @param name - Data source name
	 * @returns Data source instance or undefined
	 */
	getDataSource(name: string): HolidayDataSource | undefined;

	/**
	 * Get all available data sources
	 * @returns Array of all available data sources
	 */
	getAllDataSources(): HolidayDataSource[];

	/**
	 * Register a new data source
	 * @param dataSource - Data source to register
	 */
	registerDataSource(dataSource: HolidayDataSource): void;

	/**
	 * Get the default data source
	 * @returns Default data source instance
	 */
	getDefaultDataSource(): HolidayDataSource;

	/**
	 * Set the default data source
	 * @param name - Name of the data source to set as default
	 */
	setDefaultDataSource(name: string): void;

	/**
	 * Check health of all data sources
	 * @returns Promise resolving to map of data source names to their status
	 */
	checkAllDataSources(): Promise<Map<string, DataSourceStatus>>;
}

/**
 * Holiday data source error types
 */
export type HolidayDataSourceErrorType =
	| "NETWORK_ERROR"
	| "API_ERROR"
	| "INVALID_PARAMETER"
	| "NOT_FOUND"
	| "RATE_LIMIT"
	| "TIMEOUT"
	| "CACHE_ERROR";

/**
 * Holiday data source error
 */
export class HolidayDataSourceError extends Error {
	constructor(
		message: string,
		public type: HolidayDataSourceErrorType,
		public originalError?: Error,
	) {
		super(message);
		this.name = "HolidayDataSourceError";
	}
}

/**
 * Type guard to check if an object implements HolidayDataSource
 * @param obj - Object to check
 * @returns True if the object implements HolidayDataSource
 */
export function isHolidayDataSource(obj: unknown): obj is HolidayDataSource {
	if (typeof obj !== "object" || obj === null) return false;
	const candidate = obj as Record<string, unknown>;
	return (
		typeof candidate.name === "string" &&
		typeof candidate.description === "string" &&
		typeof candidate.checkAvailability === "function" &&
		typeof candidate.getHolidaysByYear === "function"
	);
}

/**
 * Progress callback for long-running operations
 */
export type HolidayDataSourceProgressCallback = (
	current: number,
	total: number,
	message: string,
) => void;
