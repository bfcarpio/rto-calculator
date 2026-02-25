// Import holiday data source types and classes
import type {
	Holiday as DataSourceHoliday,
	DataSourceStatus,
	HolidayCheckResult,
	HolidayDataSource,
	HolidayDataSourceConfig,
	HolidayDataSourceErrorType,
	HolidayDataSourceFactory as HolidayDataSourceFactoryType,
	HolidayDataSourceProgressCallback,
	DateRange as HolidayDateRange,
	HolidayQueryOptions,
	HolidayQueryResult,
	HolidayType,
} from "./holiday-data-source";

import { HolidayDataSourceError } from "./holiday-data-source";

// Re-export types
export type {
	HolidayType,
	DataSourceHoliday,
	HolidayDateRange,
	HolidayDataSourceConfig,
	HolidayQueryOptions,
	HolidayCheckResult,
	HolidayQueryResult,
	DataSourceStatus,
	HolidayDataSource,
	HolidayDataSourceFactoryType,
	HolidayDataSourceErrorType,
	HolidayDataSourceProgressCallback,
};

// Re-export error class
export { HolidayDataSourceError };

/**
 * Represents a single day in the calendar
 */
export interface DayData {
	date: Date;
	isOfficeDay: boolean;
	isValid: boolean;
	validationMessage?: string;
	isHoliday?: boolean;
	holidayName?: string;
	isUserSelected?: boolean;
}

/**
 * Represents a single day with embedded DOM element reference
 * Used in validation system for efficient DOM updates
 */
export interface DayInfo {
	date: Date;
	element: HTMLElement; // Direct DOM reference - no cache needed
	isWeekday: boolean;
	isSelected: boolean;
	selectionType: "out-of-office" | "office" | null;
}

/**
 * Week status types for validation feedback
 */
export type WeekStatus =
	| "compliant"
	| "invalid"
	| "pending"
	| "excluded"
	| "ignored";

/**
 * Represents a week's compliance data
 */
export interface WeekData {
	startDate: Date;
	officeDays: number;
	totalDays: number;
	compliance: number;
	violations: string[];
}

/**
 * Represents a week with embedded DOM element references
 * Used in validation system for efficient UI updates
 */
export interface WeekInfo {
	weekStart: Date;
	weekNumber: number;
	days: DayInfo[];
	wfhCount: number;
	officeDays: number;
	isCompliant: boolean;
	isUnderEvaluation: boolean;
	status: WeekStatus;
}

/**
 * Represents rolling period evaluation data
 */
export interface RollingPeriodData {
	weeks: WeekData[];
	overallCompliance: number;
	lastValidated: Date;
	trend: "improving" | "stable" | "declining";
}

/**
 * RTO-specific holiday data structure (for calendar display and validation)
 * This is different from DataSourceHoliday which is used for API data
 */
export interface RTOHoliday {
	date: Date;
	name: string;
	type: "company" | "public";
	recurring?: boolean;
	countryCode?: string; // ISO 3166-1 alpha-2 country code
	localName?: string; // Local name of the holiday
	source?: "nager-date" | "manual" | "company"; // Where this holiday data came from
}

/**
 * User preferences
 */
export interface UserPreferences {
	theme: "light" | "dark" | "high-contrast";
	/**
	 * Color scheme option combining palette (tol-bright, tol-vibrant, tol-muted) with mode (light, dark)
	 * Format: "tol-{palette}-{mode}"
	 * - tol-bright-light / tol-bright-dark: High saturation, CVD-safe
	 * - tol-vibrant-light / tol-vibrant-dark: Vibrant colors, CVD-safe
	 * - tol-muted-light / tol-muted-dark: Softer, professional
	 */
	colorScheme:
		| "tol-bright-light"
		| "tol-bright-dark"
		| "tol-vibrant-light"
		| "tol-vibrant-dark"
		| "tol-muted-light"
		| "tol-muted-dark";
	language: string;
	timezone: string;
	firstDayOfWeek: number;
	defaultPattern: number[] | null; // Array of day indices [0-6] to always select
}

/**
 * Default color scheme - Tol Muted Light
 */
export const DEFAULT_COLOR_SCHEME: UserPreferences["colorScheme"] =
	"tol-muted-light";

/**
 * Calendar state for localStorage
 * Selected dates are stored as "YYYY-MM-DD:selectionType" strings
 * where selectionType is "work-from-home" or "office"
 */
export interface CalendarState {
	selectedDates: string[]; // Format: "YYYY-MM-DD:selectionType"
	lastUpdated: string;
}
