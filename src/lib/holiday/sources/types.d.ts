/**
 * Holiday Data Sources Type Definitions
 *
 * Re-exports all types from the canonical holiday-data-source module.
 * All holiday data source implementations use these types.
 */

export type {
	HolidayType,
	Holiday,
	DateRange,
	HolidayDataSourceConfig,
	HolidayQueryOptions,
	HolidayCheckResult,
	HolidayQueryResult,
	DataSourceStatus,
	DataSourceStatistics,
	HolidayDataSource,
	HolidayDataSourceFactory,
	HolidayDataSourceErrorType,
	HolidayDataSourceProgressCallback,
} from "../../../types/holiday-data-source";

export { isHolidayDataSource } from "../../../types/holiday-data-source";
