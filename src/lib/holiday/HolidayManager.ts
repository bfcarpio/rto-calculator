/**
 * Holiday Manager Service
 *
 * This service manages holiday data fetching, filtering, and application
 * to the calendar. It integrates with the holiday data source strategy pattern
 * and provides company-specific holiday filtering.
 *
 * @module holiday-manager
 */

import type { Holiday } from "../types/holiday-data-source";
import companyFilters from "./data/company-filters.json";
import { HolidayDataSourceFactory } from "./sources";
import type { HolidayDataSource } from "./sources/types";

/**
 * Type for company filters JSON structure
 */
interface CompanyFilters {
	[countryCode: string]: {
		name: string;
		companies: {
			[companyName: string]: string[];
		};
	};
}

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

		const factory = await HolidayDataSourceFactory.getInstance();
		const dataSource = factory.getDataSource("nager-date");

		// Type guard to ensure it's a valid HolidayDataSource
		if (!dataSource || typeof dataSource.getHolidaysByYear !== "function") {
			throw new Error("Invalid holiday data source");
		}

		this.dataSource = dataSource as HolidayDataSource;
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
	 * Generate a cache key for the given options
	 */
	private generateCacheKey(options: FetchHolidaysOptions): string {
		const { countryCode, companyName, years, onlyWeekdays } = options;
		const company = companyName || "all";
		const weekday = onlyWeekdays ? "weekdays" : "all";
		const yearsStr = years.sort().join(",");
		return `${countryCode}:${company}:${yearsStr}:${weekday}`;
	}

	/**
	 * Check if a date is a weekday (Monday-Friday)
	 */
	private isWeekday(date: Date): boolean {
		const day = date.getDay();
		return day >= 1 && day <= 5; // 1 = Monday, 5 = Friday
	}

	/**
	 * Normalize date to midnight for consistent comparison
	 */
	private normalizeDate(date: Date): Date {
		const normalized = new Date(date);
		normalized.setHours(0, 0, 0, 0);
		return normalized;
	}

	/**
	 * Get company holiday filters for a country
	 */
	private getCompanyHolidays(
		countryCode: string,
		companyName: string,
	): Set<string> | null {
		const filters = companyFilters as CompanyFilters;
		const countryData = filters[countryCode];
		if (!countryData || !countryData.companies) {
			return null;
		}

		const companyData = countryData.companies[companyName];
		if (!companyData || !Array.isArray(companyData)) {
			return null;
		}

		return new Set(companyData);
	}

	/**
	 * Fetch holidays for specified years and options
	 */
	public async fetchHolidays(
		options: FetchHolidaysOptions,
	): Promise<HolidayResult> {
		const { countryCode, companyName, years, onlyWeekdays = false } = options;

		// Ensure companyName is null if undefined
		const companyFilter: string | null =
			companyName === undefined ? null : companyName;

		// Check cache first
		const cacheKey = this.generateCacheKey(options);
		const cached = this.cache.get(cacheKey);
		if (cached) {
			return cached;
		}

		try {
			// Fail fast if data source is not initialized
			if (!this.dataSource) {
				throw new Error(
					"HolidayManager data source not initialized. " +
						"Call initialize() before fetching holidays.",
				);
			}

			// Fetch holidays for all years
			const allHolidays: Holiday[] = [];
			for (const year of years) {
				const holidays = await this.dataSource.getHolidaysByYear(
					year,
					countryCode,
				);
				allHolidays.push(...holidays);
			}

			// Get company filter if specified
			const companyHolidays =
				companyFilter && companyFilter !== null && companyFilter !== ""
					? this.getCompanyHolidays(countryCode, companyFilter)
					: null;

			// Filter and transform holidays
			const holidayInfoList: HolidayInfo[] = allHolidays
				.filter((holiday) => {
					// Filter by company if specified
					if (companyHolidays) {
						return companyHolidays.has(holiday.name);
					}
					return true;
				})
				.map((holiday) => ({
					date: this.normalizeDate(holiday.date),
					name: holiday.name,
					countryCode: holiday.countryCode,
					isWeekday: this.isWeekday(holiday.date),
				}))
				.filter((holiday) => {
					// Filter to only weekdays if specified
					if (onlyWeekdays) {
						return holiday.isWeekday;
					}
					return true;
				});

			const weekdayHolidays = holidayInfoList.filter((h) => h.isWeekday).length;

			const result: HolidayResult = {
				holidays: holidayInfoList,
				totalHolidays: holidayInfoList.length,
				weekdayHolidays,
				filteredCount:
					companyHolidays && companyFilter !== null
						? allHolidays.length - holidayInfoList.length
						: 0,
				years,
				countryCode,
				companyName: companyFilter,
			};

			// Cache the result
			this.cache.set(cacheKey, result);

			return result;
		} catch (error) {
			console.error("Error fetching holidays:", error);
			// Return empty result on error
			return {
				holidays: [],
				totalHolidays: 0,
				weekdayHolidays: 0,
				filteredCount: 0,
				years,
				countryCode,
				companyName: companyName || null,
			};
		}
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
		const normalizedDate = this.normalizeDate(date);
		const year = normalizedDate.getFullYear();
		const years = [year - 1, year, year + 1]; // Check surrounding years to be safe

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
	 * This adds visual markers to calendar day cells
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

		result.holidays.forEach((holiday) => {
			const year = holiday.date.getFullYear();
			const month = holiday.date.getMonth();
			const day = holiday.date.getDate();

			// Find the calendar day cell
			const cell = document.querySelector(
				`.calendar-day[data-year="${year}"][data-month="${month}"][data-day="${day}"]`,
			) as HTMLElement;

			if (!cell) return;

			// Skip if already marked as a holiday to prevent duplicate processing
			if (cell.classList.contains("holiday")) return;

			// Always add holiday class for visual styling
			cell.classList.add("holiday");

			// Only mark as OOF if holidaysAsOOF is enabled
			if (holidaysAsOOF) {
				cell.dataset.selected = "true";
				cell.dataset.selectionType = "out-of-office";
				cell.classList.add("selected", "out-of-office");
			}

			// Add data attribute for holiday info
			cell.dataset.holiday = "true";
			cell.dataset.holidayName = holiday.name;
			cell.dataset.holidayCountry = holiday.countryCode;

			// Update aria-label for accessibility
			const currentLabel = cell.getAttribute("aria-label") || "";
			const holidayLabel = ` - ${holiday.name} (Holiday)`;
			cell.setAttribute("aria-label", currentLabel + holidayLabel);

			// Add title for hover tooltip
			cell.title = `${holiday.name} (${holiday.countryCode})`;
		});
	}

	/**
	 * Remove holiday markers from the calendar
	 */
	public removeHolidaysFromCalendar(): void {
		const holidayCells = document.querySelectorAll(
			".calendar-day[data-holiday='true']",
		);

		holidayCells.forEach((cell) => {
			const element = cell as HTMLElement;
			element.classList.remove("holiday");
			delete element.dataset.holiday;
			delete element.dataset.holidayName;
			delete element.dataset.holidayCountry;

			// Also remove OOF selection that was applied to holidays
			element.classList.remove("selected", "out-of-office");
			element.dataset.selected = "false";
			element.dataset.selectionType = "";
			element.ariaSelected = "false";

			// Remove holiday suffix from aria-label
			const currentLabel = element.getAttribute("aria-label") || "";
			const holidaySuffix = " (Holiday)";
			if (currentLabel.includes(holidaySuffix)) {
				const baseLabel = currentLabel.replace(holidaySuffix, "");
				element.setAttribute("aria-label", baseLabel);
			}

			// Remove title
			element.title = "";
		});
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
		const { totalHolidays, weekdayHolidays, countryCode, companyName } = result;

		if (totalHolidays === 0) {
			return `No holidays found for ${countryCode}`;
		}

		let summary = `${totalHolidays} holiday${totalHolidays !== 1 ? "s" : ""} found for ${countryCode}`;

		if (weekdayHolidays > 0) {
			summary += ` (${weekdayHolidays} on weekdays)`;
		}

		if (companyName) {
			summary += ` filtered by ${companyName}`;
		}

		return summary;
	}

	/**
	 * Get available companies for a country
	 */
	public getAvailableCompanies(countryCode: string): string[] {
		const filters = companyFilters as CompanyFilters;
		const countryData = filters[countryCode];
		if (!countryData || !countryData.companies) {
			return [];
		}

		return Object.keys(countryData.companies);
	}

	/**
	 * Get available countries from the data source
	 */
	public async getAvailableCountries(): Promise<
		Array<{ code: string; name: string }>
	> {
		if (!this.dataSource) {
			throw new Error(
				"HolidayManager data source not initialized. " +
					"Call initialize() before fetching countries.",
			);
		}

		return this.dataSource.getAvailableCountries();
	}

	/**
	 * Check if a country has company filters available
	 */
	public hasCompanyFilters(countryCode: string): boolean {
		const filters = companyFilters as CompanyFilters;
		const countryData = filters[countryCode];
		return !!countryData && !!countryData.companies;
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
