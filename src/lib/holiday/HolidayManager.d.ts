/**
 * Holiday Manager Module Type Declarations
 *
 * This file provides TypeScript type declarations for the holiday-manager module
 * which manages holiday data fetching, caching, and application.
 */

/**
 * Holiday filter configuration
 */
export interface HolidayFilterConfig {
	countryCode: string | null;
	companyName: string | null;
}

/**
 * Holiday information with computed properties
 */
export interface HolidayInfo {
	date: Date;
	name: string;
	countryCode: string;
	isWeekday: boolean;
}

/**
 * Holiday result with metadata
 */
export interface HolidayResult {
	holidays: HolidayInfo[];
	totalHolidays: number;
	weekdayHolidays: number;
	filteredCount: number;
	years: number[];
	countryCode: string | null;
	companyName: string | null;
}

/**
 * Options for fetching holidays
 */
export interface FetchHolidaysOptions {
	countryCode: string;
	companyName?: string | null;
	years: number[];
	onlyWeekdays?: boolean;
}

/**
 * Holiday Manager Class
 *
 * Manages holiday data fetching, caching, and filtering with support for
 * company-specific holiday policies.
 */
export declare class HolidayManager {
	private static instance: HolidayManager | null;
	private dataSource: unknown;
	private cache: Map<string, HolidayResult>;
	private currentConfig: HolidayFilterConfig;

	/**
	 * Get the singleton instance
	 */
	static getInstance(): HolidayManager;

	/**
	 * Get the current holiday filter configuration
	 */
	getConfig(): HolidayFilterConfig;

	/**
	 * Set the holiday filter configuration
	 */
	setConfig(config: HolidayFilterConfig): void;

	/**
	 * Clear the holiday cache
	 */
	clearCache(): void;

	/**
	 * Generate a cache key for the given options
	 */
	private generateCacheKey(options: FetchHolidaysOptions): string;

	/**
	 * Check if a date is a weekday (Monday-Friday)
	 */
	private isWeekday(date: Date): boolean;

	/**
	 * Normalize date to midnight for consistent comparison
	 */
	private normalizeDate(date: Date): Date;

	/**
	 * Get company holiday filters for a country
	 */
	private getCompanyHolidays(
		countryCode: string,
		companyName: string,
	): Set<string> | null;

	/**
	 * Fetch holidays for specified years and options
	 */
	fetchHolidays(options: FetchHolidaysOptions): Promise<HolidayResult>;

	/**
	 * Get holiday dates as a Set for easy lookup
	 */
	getHolidayDates(
		countryCode: string,
		companyName: string | null,
		years: number[],
		onlyWeekdays?: boolean,
	): Promise<Set<Date>>;

	/**
	 * Check if a specific date is a holiday
	 */
	isHoliday(
		date: Date,
		countryCode: string,
		companyName?: string | null,
	): Promise<boolean>;

	/**
	 * Apply holidays to the calendar UI
	 * This adds visual markers to calendar day cells
	 */
	applyHolidaysToCalendar(
		countryCode: string,
		companyName: string | null,
		calendarYears: number[],
	): Promise<void>;

	/**
	 * Remove holiday markers from the calendar
	 */
	removeHolidaysFromCalendar(): void;

	/**
	 * Refresh holidays on the calendar based on current config
	 */
	refreshCalendarHolidays(calendarYears: number[]): Promise<void>;

	/**
	 * Get a summary of holiday data for display
	 */
	getHolidaySummary(result: HolidayResult): string;

	/**
	 * Get available companies for a country
	 */
	getAvailableCompanies(countryCode: string): string[];

	/**
	 * Check if a country has company filters available
	 */
	hasCompanyFilters(countryCode: string): boolean;
}

/**
 * Get the singleton HolidayManager instance
 */
export declare function getHolidayManager(): HolidayManager;

/**
 * Fetch holidays with specified options
 */
export declare function fetchHolidays(
	options: FetchHolidaysOptions,
): Promise<HolidayResult>;

/**
 * Get holiday dates as a Set
 */
export declare function getHolidayDates(
	countryCode: string,
	companyName: string | null,
	years: number[],
	onlyWeekdays?: boolean,
): Promise<Set<Date>>;

/**
 * Check if a specific date is a holiday
 */
export declare function isHoliday(
	date: Date,
	countryCode: string,
	companyName?: string | null,
): Promise<boolean>;

/**
 * Apply holidays to the calendar UI
 */
export declare function applyHolidaysToCalendar(
	countryCode: string,
	companyName: string | null,
	calendarYears: number[],
): Promise<void>;

/**
 * Get available companies for a country
 */
export declare function getAvailableCompanies(countryCode: string): string[];
