/**
 * Holiday Data Sources Module
 *
 * This module provides a strategy pattern implementation for holiday data sources,
 * allowing easy switching between different holiday data providers.
 *
 * @module holiday-data-sources
 */

// Export the factory for managing data sources
export { default as HolidayDataSourceFactory } from "./HolidayDataSourceFactory.js";
// Export the base strategy class
export { default as HolidayDataSourceStrategy } from "./HolidayDataSourceStrategy.js";
// Export the Nager.Date implementation
export { default as NagerDateHolidayDataSource } from "./NagerDateHolidayDataSource.js";

// Export a convenience function to get the default data source
export function getDefaultHolidayDataSource() {
	const factory = HolidayDataSourceFactory.getInstance();
	return factory.getDefaultDataSource();
}

// Export a convenience function to get a specific data source
export function getHolidayDataSource(name) {
	const factory = HolidayDataSourceFactory.getInstance();
	return factory.getDataSource(name);
}

// Export a convenience function to register a custom data source
export function registerHolidayDataSource(dataSource) {
	const factory = HolidayDataSourceFactory.getInstance();
	factory.registerDataSource(dataSource);
}

// Export all available data source names
export function getAvailableHolidayDataSources() {
	const factory = HolidayDataSourceFactory.getInstance();
	return factory.getDataSourceNames();
}
