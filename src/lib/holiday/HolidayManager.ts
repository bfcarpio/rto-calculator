/**
 * Holiday Manager Service
 *
 * Core singleton for holiday data management. Business logic and data access
 * are delegated to focused modules:
 * - holiday-data.ts — Data fetching, caching, and company filtering
 * - holiday-dom-adapter.ts — DOM manipulation for calendar cells
 *
 * @module holiday-manager
 */

import type { HolidayDataSource } from "../../types/holiday-data-source";
import {
	buildHolidaySummary,
	createDataSource,
	fetchHolidaysFromSource,
	generateCacheKey,
	getAvailableCompaniesForCountry,
	hasCompanyFiltersForCountry,
	normalizeDate,
} from "./holiday-data";
import {
	applyHolidaysToCalendarDOM,
	removeHolidaysFromCalendarDOM,
} from "./holiday-dom-adapter";

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
	countryCode: string;
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
 * company-specific holiday policies. Delegates DOM operations to
 * holiday-dom-adapter and data access to holiday-data.
 */
export class HolidayManager {
	private static instance: HolidayManager | null = null;
	private dataSource: HolidayDataSource | null = null;
	private cache: Map<string, HolidayResult> = new Map();
	private currentConfig: HolidayFilterConfig = {
		countryCode: null,
		companyName: null,
	};
	private initialized = false;

	private constructor() {
		// Async initialization moved to initialize() method
	}

	/**
	 * Initialize the holiday manager with a data source
	 * @private
	 */
	private async initialize(): Promise<void> {
		if (this.initialized) {
			return;
		}

		this.dataSource = await createDataSource();
		this.initialized = true;
	}

	/**
	 * Get the singleton instance
	 */
	public static async getInstance(): Promise<HolidayManager> {
		if (!HolidayManager.instance) {
			HolidayManager.instance = new HolidayManager();
			await HolidayManager.instance.initialize();
		}
		return HolidayManager.instance;
	}

	/**
	 * Get the current holiday filter configuration
	 */
	public getConfig(): HolidayFilterConfig {
		return { ...this.currentConfig };
	}

	/**
	 * Set the holiday filter configuration
	 */
	public setConfig(config: HolidayFilterConfig): void {
		this.currentConfig = { ...config };
	}

	/**
	 * Clear the holiday cache
	 */
	public clearCache(): void {
		this.cache.clear();
	}

	/**
	 * Fetch holidays for specified years and options
	 */
	public async fetchHolidays(
		options: FetchHolidaysOptions,
	): Promise<HolidayResult> {
		// Check cache first
		const cacheKey = generateCacheKey(options);
		const cached = this.cache.get(cacheKey);
		if (cached) {
			return cached;
		}

		// Fail fast if data source is not initialized
		if (!this.dataSource) {
			throw new Error(
				"HolidayManager data source not initialized. " +
					"Call initialize() before fetching holidays.",
			);
		}

		const { countryCode, companyName, years } = options;
		const result = await fetchHolidaysFromSource(this.dataSource, options);

		// Build full HolidayResult with metadata
		const holidayResult: HolidayResult = {
			holidays: result.holidays,
			totalHolidays: result.totalHolidays,
			weekdayHolidays: result.weekdayHolidays,
			filteredCount: result.filteredCount,
			years,
			countryCode,
			companyName: companyName ?? null,
		};

		// Cache the result
		this.cache.set(cacheKey, holidayResult);

		return holidayResult;
	}

	/**
	 * Get holiday dates as a Set for easy lookup
	 */
	public async getHolidayDates(
		countryCode: string,
		companyName: string | null,
		years: number[],
		onlyWeekdays: boolean = false,
	): Promise<Set<Date>> {
		const result = await this.fetchHolidays({
			countryCode,
			companyName: companyName ?? null,
			years,
			onlyWeekdays,
		});

		return new Set(result.holidays.map((h) => h.date));
	}

	/**
	 * Check if a specific date is a holiday
	 */
	public async isHoliday(
		date: Date,
		countryCode: string,
		companyName: string | null = null,
	): Promise<boolean> {
		const normalizedDate = normalizeDate(date);
		const year = normalizedDate.getFullYear();
		const years = [year - 1, year, year + 1]; // Check surrounding years

		const holidays = await this.fetchHolidays({
			countryCode,
			companyName: companyName ?? null,
			years,
			onlyWeekdays: false,
		});

		return holidays.holidays.some(
			(h) => h.date.getTime() === normalizedDate.getTime(),
		);
	}

	/**
	 * Apply holidays to the calendar UI
	 *
	 * Delegates to holiday-dom-adapter for DOM manipulation.
	 */
	public async applyHolidaysToCalendar(
		countryCode: string,
		companyName: string | null,
		calendarYears: number[],
		holidaysAsOOF: boolean = true,
	): Promise<void> {
		const result = await this.fetchHolidays({
			countryCode,
			companyName: companyName ?? null,
			years: calendarYears,
			onlyWeekdays: false,
		});

		applyHolidaysToCalendarDOM(result.holidays, holidaysAsOOF);
	}

	/**
	 * Remove holiday markers from the calendar
	 *
	 * Delegates to holiday-dom-adapter for DOM manipulation.
	 */
	public removeHolidaysFromCalendar(): void {
		removeHolidaysFromCalendarDOM();
	}

	/**
	 * Refresh holidays on the calendar based on current config
	 */
	public async refreshCalendarHolidays(
		calendarYears: number[],
		holidaysAsOOF: boolean = true,
	): Promise<void> {
		// Remove existing holidays first
		this.removeHolidaysFromCalendar();

		// Apply new holidays if a country is selected
		if (this.currentConfig.countryCode) {
			await this.applyHolidaysToCalendar(
				this.currentConfig.countryCode,
				this.currentConfig.companyName ?? null,
				calendarYears,
				holidaysAsOOF,
			);
		}
	}

	/**
	 * Get a summary of holiday data for display
	 */
	public getHolidaySummary(result: HolidayResult): string {
		return buildHolidaySummary(result);
	}

	/**
	 * Get available companies for a country
	 */
	public getAvailableCompanies(countryCode: string): string[] {
		return getAvailableCompaniesForCountry(countryCode);
	}

	/**
	 * Check if a country has company filters available
	 */
	public hasCompanyFilters(countryCode: string): boolean {
		return hasCompanyFiltersForCountry(countryCode);
	}
}

// Export convenience functions
export async function getHolidayManager(): Promise<HolidayManager> {
	return HolidayManager.getInstance();
}

export async function fetchHolidays(
	options: FetchHolidaysOptions,
): Promise<HolidayResult> {
	const manager = await getHolidayManager();
	return manager.fetchHolidays(options);
}

export async function getHolidayDates(
	countryCode: string,
	companyName: string | null,
	years: number[],
	onlyWeekdays: boolean = false,
): Promise<Set<Date>> {
	const manager = await getHolidayManager();
	return manager.getHolidayDates(countryCode, companyName, years, onlyWeekdays);
}

export async function isHoliday(
	date: Date,
	countryCode: string,
	companyName: string | null = null,
): Promise<boolean> {
	const manager = await getHolidayManager();
	return manager.isHoliday(date, countryCode, companyName);
}

export async function applyHolidaysToCalendar(
	countryCode: string,
	companyName: string | null,
	calendarYears: number[],
	holidaysAsOOF: boolean = true,
): Promise<void> {
	const manager = await getHolidayManager();
	return manager.applyHolidaysToCalendar(
		countryCode,
		companyName,
		calendarYears,
		holidaysAsOOF,
	);
}

export async function getAvailableCompanies(
	countryCode: string,
): Promise<string[]> {
	const manager = await getHolidayManager();
	return manager.getAvailableCompanies(countryCode);
}
