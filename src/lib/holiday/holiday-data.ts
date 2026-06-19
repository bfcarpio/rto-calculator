/**
 * Holiday data fetching, caching, and company filtering logic
 *
 * Extracted from HolidayManager to separate data access concerns
 * from the singleton lifecycle management.
 *
 * @module holiday-data
 */

import type {
	Holiday,
	HolidayDataSource,
} from "../../types/holiday-data-source";
import { logger } from "../../utils/logger";
import { isCompanyFilters } from "../type-guards";
import companyFiltersJson from "./data/company-filters.json";
import type { FetchHolidaysOptions, HolidayInfo } from "./HolidayManager";
import { HolidayDataSourceFactory } from "./sources";

const { $schema: _, ...rawCompanyFilters } = companyFiltersJson;

// Parse company filters once at module scope with validation
const companyFilters: CompanyFilters = isCompanyFilters(rawCompanyFilters)
	? rawCompanyFilters
	: {};

/**
 * Extra holiday: fixed date or day-after another holiday
 */
type ExtraHoliday =
	| { name: string; month: number; day: number }
	| { name: string; after: string };

/**
 * Company holiday filter entry
 */
interface CompanyEntry {
	holidays: string[];
	extra?: ExtraHoliday[];
}

/**
 * Type for company filters JSON structure
 */
export interface CompanyFilters {
	[countryCode: string]: {
		name: string;
		companies: {
			[companyName: string]: CompanyEntry;
		};
	};
}

/**
 * Create and initialize a holiday data source
 *
 * @returns An initialized HolidayDataSource
 * @throws Error if data source initialization fails
 */
export async function createDataSource(): Promise<HolidayDataSource> {
	const factory = await HolidayDataSourceFactory.getInstance();
	const dataSource = factory.getDataSource("nager-date");

	// Type guard to ensure it's a valid HolidayDataSource
	if (!dataSource || typeof dataSource.getHolidaysByYear !== "function") {
		throw new Error("Invalid holiday data source");
	}

	return dataSource as HolidayDataSource;
}

/**
 * Check if a date is a weekday (Monday-Friday)
 */
export function isWeekday(date: Date): boolean {
	const day = date.getDay();
	return day >= 1 && day <= 5; // 1 = Monday, 5 = Friday
}

/**
 * Normalize date to midnight for consistent comparison
 */
export function normalizeDate(date: Date): Date {
	const normalized = new Date(date);
	normalized.setHours(0, 0, 0, 0);
	return normalized;
}

/**
 * Get company holiday filters for a country
 *
 * @param countryCode - ISO country code
 * @param companyName - Name of the company
 * @returns Set of holiday names for the company, or null if not found
 */
export function getCompanyHolidays(
	countryCode: string,
	companyName: string,
): Set<string> | null {
	const filters = companyFilters;
	const countryData = filters[countryCode];
	if (!countryData || !countryData.companies) {
		return null;
	}

	const companyData = countryData.companies[companyName];
	if (!companyData || !companyData.holidays) {
		return null;
	}

	return new Set(companyData.holidays);
}

/**
 * Resolve extra holidays for a company into HolidayInfo objects
 *
 * Handles two types of extra holidays:
 * - Fixed date: Creates one per year
 * - Day-after: Day after a named holiday
 *
 * @param countryCode - ISO country code
 * @param companyName - Name of the company
 * @param apiHolidays - List of API-fetched holidays to resolve "after" rules against
 * @param years - Years to generate fixed-date holidays for
 * @returns Array of additional HolidayInfo objects
 */
export function resolveExtraHolidays(
	countryCode: string,
	companyName: string,
	apiHolidays: HolidayInfo[],
	years: number[],
): HolidayInfo[] {
	const filters = companyFilters;
	const companyData = filters[countryCode]?.companies?.[companyName];
	if (!companyData?.extra) {
		return [];
	}

	const extras: HolidayInfo[] = [];
	for (const rule of companyData.extra) {
		if ("month" in rule) {
			// Fixed date: create one per year
			for (const year of years) {
				const date = new Date(year, rule.month - 1, rule.day);
				extras.push({
					date: normalizeDate(date),
					name: rule.name,
					countryCode,
					isWeekday: isWeekday(date),
				});
			}
		} else if ("after" in rule) {
			// Day after a named holiday
			for (const h of apiHolidays) {
				if (h.name === rule.after) {
					const date = new Date(h.date);
					date.setDate(date.getDate() + 1);
					extras.push({
						date: normalizeDate(date),
						name: rule.name,
						countryCode,
						isWeekday: isWeekday(date),
					});
				}
			}
		}
	}
	return extras;
}

/**
 * Fetch holidays from the data source for given options
 *
 * @param dataSource - The initialized holiday data source
 * @param options - Fetch options (country, company, years, filter)
 * @returns Processed holiday result
 */
export async function fetchHolidaysFromSource(
	dataSource: HolidayDataSource,
	options: FetchHolidaysOptions,
): Promise<{
	holidays: HolidayInfo[];
	totalHolidays: number;
	weekdayHolidays: number;
	filteredCount: number;
}> {
	const { countryCode, companyName, years, onlyWeekdays = false } = options;

	// Ensure companyName is null if undefined
	const companyFilter: string | null =
		companyName === undefined ? null : companyName;

	try {
		// Fetch holidays for all years
		const allHolidays: Holiday[] = [];
		for (const year of years) {
			const holidays = await dataSource.getHolidaysByYear(year, countryCode);
			allHolidays.push(...holidays);
		}

		// Get company filter if specified
		const companyHolidaySet =
			companyFilter && companyFilter !== null && companyFilter !== ""
				? getCompanyHolidays(countryCode, companyFilter)
				: null;

		// Filter and transform holidays
		const holidayInfoList: HolidayInfo[] = allHolidays
			.filter((holiday) => {
				// Filter by company if specified
				if (companyHolidaySet) {
					return companyHolidaySet.has(holiday.name);
				}
				return true;
			})
			.map((holiday) => ({
				date: normalizeDate(holiday.date),
				name: holiday.name,
				countryCode: holiday.countryCode,
				isWeekday: isWeekday(holiday.date),
			}))
			.filter((holiday) => {
				// Filter to only weekdays if specified
				if (onlyWeekdays) {
					return holiday.isWeekday;
				}
				return true;
			});

		// Inject extra company holidays (fixed dates, day-after rules)
		if (companyFilter && companyFilter !== "") {
			const extras = resolveExtraHolidays(
				countryCode,
				companyFilter,
				holidayInfoList,
				years,
			);
			for (const extra of extras) {
				if (!onlyWeekdays || extra.isWeekday) {
					holidayInfoList.push(extra);
				}
			}
		}

		const weekdayHolidays = holidayInfoList.filter((h) => h.isWeekday).length;
		const filteredCount =
			companyHolidaySet && companyFilter !== null
				? allHolidays.length - holidayInfoList.length
				: 0;

		return {
			holidays: holidayInfoList,
			totalHolidays: holidayInfoList.length,
			weekdayHolidays,
			filteredCount,
		};
	} catch (error) {
		logger.error("Error fetching holidays:", error);
		return {
			holidays: [],
			totalHolidays: 0,
			weekdayHolidays: 0,
			filteredCount: 0,
		};
	}
}

/**
 * Generate a cache key for holiday fetch options
 */
export function generateCacheKey(options: FetchHolidaysOptions): string {
	const { countryCode, companyName, years, onlyWeekdays } = options;
	const company = companyName || "all";
	const weekday = onlyWeekdays ? "weekdays" : "all";
	const yearsStr = years.sort().join(",");
	return `${countryCode}:${company}:${yearsStr}:${weekday}`;
}

/**
 * Build a human-readable summary of holiday data
 */
export function buildHolidaySummary(result: {
	totalHolidays: number;
	weekdayHolidays: number;
	countryCode: string;
	companyName: string | null;
}): string {
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
export function getAvailableCompaniesForCountry(countryCode: string): string[] {
	const filters = companyFilters;
	const countryData = filters[countryCode];
	if (!countryData || !countryData.companies) {
		return [];
	}

	return Object.keys(countryData.companies);
}

/**
 * Check if a country has company filters available
 */
export function hasCompanyFiltersForCountry(countryCode: string): boolean {
	const filters = companyFilters;
	const countryData = filters[countryCode];
	return !!countryData && !!countryData.companies;
}
