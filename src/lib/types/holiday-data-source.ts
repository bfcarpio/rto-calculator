/**
 * Holiday Data Source Types
 * Defines types and interfaces for holiday data source implementations
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
  /** ISO-3166-2 codes of the subdivisions where this holiday applies */
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
  /** Count of holidays on this date (for countries with multiple holiday systems) */
  holidayCount?: number;
}

/**
 * Holiday query result
 */
export interface HolidayQueryResult {
  /** Array of holidays found */
  holidays: Holiday[];
  /** Total count of holidays */
  total: number;
  /** Query parameters used */
  query: HolidayQueryOptions;
  /** Cache hit status */
  cached?: boolean;
}

/**
 * Data source health/status
 */
export interface DataSourceStatus {
  /** Whether the data source is available */
  isAvailable: boolean;
  /** Last successful fetch timestamp */
  lastFetch?: Date;
  /** Cache size (number of cached items) */
  cacheSize?: number;
  /** Error message if unavailable */
  error?: string;
  /** Response time in milliseconds */
  responseTime?: number;
}

/**
 * Holiday Data Source Interface
 * All holiday data source implementations must implement this interface
 */
export interface HolidayDataSource {
  /**
   * Unique identifier for this data source
   */
  readonly name: string;

  /**
   * Human-readable description of this data source
   */
  readonly description: string;

  /**
   * Default configuration for this data source
   */
  readonly defaultConfig: HolidayDataSourceConfig;

  /**
   * Check if this data source is available and ready to use
   * @returns Promise resolving to data source status
   */
  checkAvailability(): Promise<DataSourceStatus>;

  /**
   * Get all holidays for a specific year and country
   * @param year - Year to get holidays for
   * @param countryCode - ISO 3166-1 alpha-2 country code
   * @returns Promise resolving to array of holidays
   */
  getHolidaysForYear(
    year: number,
    countryCode: string,
  ): Promise<Holiday[]>;

  /**
   * Get holidays within a date range
   * @param dateRange - Date range to query
   * @param countryCode - ISO 3166-1 alpha-2 country code
   * @returns Promise resolving to array of holidays
   */
  getHolidaysForDateRange(
    dateRange: DateRange,
    countryCode: string,
  ): Promise<Holiday[]>;

  /**
   * Get upcoming holidays (next 365 days or specified limit)
   * @param countryCode - ISO 3166-1 alpha-2 country code
   * @param options - Optional query options
   * @returns Promise resolving to array of upcoming holidays
   */
  getUpcomingHolidays(
    countryCode: string,
    options?: {
      /** Maximum number of holidays to return */
      limit?: number;
      /** Start date for query (defaults to today) */
      startDate?: Date;
    },
  ): Promise<Holiday[]>;

  /**
   * Check if a specific date is a holiday
   * @param date - Date to check
   * @param countryCode - ISO 3166-1 alpha-2 country code
   * @returns Promise resolving to holiday check result
   */
  isHoliday(
    date: Date,
    countryCode: string,
  ): Promise<HolidayCheckResult>;

  /**
   * Check if today is a holiday
   * @param countryCode - ISO 3166-1 alpha-2 country code
   * @returns Promise resolving to holiday check result
   */
  isTodayHoliday(
    countryCode: string,
  ): Promise<HolidayCheckResult>;

  /**
   * Query holidays with custom options
   * @param options - Query options
   * @returns Promise resolving to holiday query result
   */
  queryHolidays(
    options: HolidayQueryOptions,
  ): Promise<HolidayQueryResult>;

  /**
   * Clear any internal cache
   * @returns Promise resolving when cache is cleared
   */
  clearCache(): Promise<void>;

  /**
   * Reset the data source to initial state
   * @returns Promise resolving when reset is complete
   */
  reset(): Promise<void>;

  /**
   * Update configuration for this data source
   * @param config - New configuration values (merged with existing)
   */
  updateConfig(config: Partial<HolidayDataSourceConfig>): void;

  /**
   * Get current configuration
   * @returns Current configuration
   */
  getConfig(): HolidayDataSourceConfig;
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
 * Progress callback for long-running operations
 */
export type HolidayDataSourceProgressCallback = (
  current: number,
  total: number,
  message: string,
) => void;
