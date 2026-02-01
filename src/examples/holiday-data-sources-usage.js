/**
 * Holiday Data Sources Usage Examples
 *
 * This file demonstrates how to use the holiday data source strategy pattern
 * to fetch and work with holiday data from various sources.
 *
 * Run with: node src/examples/holiday-data-sources-usage.js
 */

import {
	getAvailableHolidayDataSources,
	getDefaultHolidayDataSource,
	getHolidayDataSource,
	HolidayDataSourceFactory,
	registerHolidayDataSource,
} from "../lib/holiday-data-sources/index.js";

// Helper function to pretty-print results
function printResult(title, data) {
	console.log(`\n${title}`);
	console.log("=".repeat(title.length));
	console.log(JSON.stringify(data, null, 2));
}

// Helper function to print error
function printError(error) {
	console.error(`\n❌ Error: ${error.message}`);
	if (error.stack && error.config?.debug) {
		console.error(error.stack);
	}
}

/**
 * Example 1: Get the default holiday data source
 */
async function example1_getDefaultDataSource() {
	console.log("\n" + "=".repeat(60));
	console.log("Example 1: Get Default Holiday Data Source");
	console.log("=".repeat(60));

	try {
		const dataSource = getDefaultHolidayDataSource();
		printResult("Default Data Source Info", {
			name: dataSource.name,
			description: dataSource.description,
			config: dataSource.getConfig(),
		});
	} catch (error) {
		printError(error);
	}
}

/**
 * Example 2: Check data source availability
 */
async function example2_checkAvailability() {
	console.log("\n" + "=".repeat(60));
	console.log("Example 2: Check Data Source Availability");
	console.log("=".repeat(60));

	try {
		const dataSource = getDefaultHolidayDataSource();
		const status = await dataSource.checkAvailability();
		printResult("Data Source Status", status);
	} catch (error) {
		printError(error);
	}
}

/**
 * Example 3: Get holidays for a specific year and country
 */
async function example3_getHolidaysForYear() {
	console.log("\n" + "=".repeat(60));
	console.log("Example 3: Get Holidays for a Year");
	console.log("=".repeat(60));

	try {
		const dataSource = getDefaultHolidayDataSource();
		const year = 2024;
		const countryCode = "US";

		console.log(`Fetching holidays for ${countryCode} in ${year}...`);

		const holidays = await dataSource.getHolidaysForYear(year, countryCode);

		printResult("Holidays Found", {
			year,
			countryCode,
			count: holidays.length,
			holidays: holidays.slice(0, 5), // Show first 5 holidays
		});
	} catch (error) {
		printError(error);
	}
}

/**
 * Example 4: Check if a specific date is a holiday
 */
async function example4_checkIfHoliday() {
	console.log("\n" + "=".repeat(60));
	console.log("Example 4: Check If a Date Is a Holiday");
	console.log("=".repeat(60));

	try {
		const dataSource = getDefaultHolidayDataSource();
		const countryCode = "US";

		// Check July 4th (Independence Day in US)
		const independenceDay = new Date(2024, 6, 4); // July 4, 2024
		const result1 = await dataSource.isHoliday(independenceDay, countryCode);

		printResult("July 4, 2024", {
			date: independenceDay.toDateString(),
			isHoliday: result1.isHoliday,
			holiday: result1.holiday,
		});

		// Check a non-holiday date
		const regularDay = new Date(2024, 6, 15); // July 15, 2024
		const result2 = await dataSource.isHoliday(regularDay, countryCode);

		printResult("July 15, 2024", {
			date: regularDay.toDateString(),
			isHoliday: result2.isHoliday,
			holiday: result2.holiday,
		});
	} catch (error) {
		printError(error);
	}
}

/**
 * Example 5: Check if today is a holiday
 */
async function example5_checkTodayHoliday() {
	console.log("\n" + "=".repeat(60));
	console.log("Example 5: Check If Today Is a Holiday");
	console.log("=".repeat(60));

	try {
		const dataSource = getDefaultHolidayDataSource();
		const countryCode = "US";

		console.log(
			`Checking if today (${new Date().toDateString()}) is a holiday...`,
		);

		const result = await dataSource.isTodayHoliday(countryCode);

		printResult("Today's Holiday Status", {
			date: new Date().toDateString(),
			isHoliday: result.isHoliday,
			holiday: result.holiday,
		});
	} catch (error) {
		printError(error);
	}
}

/**
 * Example 6: Get upcoming holidays
 */
async function example6_getUpcomingHolidays() {
	console.log("\n" + "=".repeat(60));
	console.log("Example 6: Get Upcoming Holidays");
	console.log("=".repeat(60));

	try {
		const dataSource = getDefaultHolidayDataSource();
		const countryCode = "US";

		console.log("Fetching next 10 upcoming holidays...");

		const holidays = await dataSource.getUpcomingHolidays(countryCode, {
			limit: 10,
		});

		printResult("Upcoming Holidays", {
			countryCode,
			count: holidays.length,
			holidays: holidays.map((h) => ({
				date: new Date(h.date).toDateString(),
				name: h.name,
			})),
		});
	} catch (error) {
		printError(error);
	}
}

/**
 * Example 7: Get holidays for a date range
 */
async function example7_getHolidaysForDateRange() {
	console.log("\n" + "=".repeat(60));
	console.log("Example 7: Get Holidays for Date Range");
	console.log("=".repeat(60));

	try {
		const dataSource = getDefaultHolidayDataSource();
		const countryCode = "US";

		const startDate = new Date(2024, 11, 1); // December 1, 2024
		const endDate = new Date(2024, 11, 31); // December 31, 2024

		console.log(
			`Fetching holidays from ${startDate.toDateString()} to ${endDate.toDateString()}...`,
		);

		const holidays = await dataSource.getHolidaysForDateRange(
			{ startDate, endDate },
			countryCode,
		);

		printResult("Holidays in December 2024", {
			countryCode,
			startDate: startDate.toDateString(),
			endDate: endDate.toDateString(),
			count: holidays.length,
			holidays: holidays.map((h) => ({
				date: new Date(h.date).toDateString(),
				name: h.name,
				localName: h.localName,
			})),
		});
	} catch (error) {
		printError(error);
	}
}

/**
 * Example 8: Query holidays with custom options
 */
async function example8_queryWithOptions() {
	console.log("\n" + "=".repeat(60));
	console.log("Example 8: Query Holidays with Custom Options");
	console.log("=".repeat(60));

	try {
		const dataSource = getDefaultHolidayDataSource();

		// Query only global holidays
		const result1 = await dataSource.queryHolidays({
			countryCode: "US",
			year: 2024,
			globalOnly: true,
		});

		printResult("Global Holidays Only (US 2024)", {
			count: result1.total,
			holidays: result1.holidays.map((h) => ({
				date: new Date(h.date).toDateString(),
				name: h.name,
				global: h.global,
			})),
		});

		// Query holidays by type
		const result2 = await dataSource.queryHolidays({
			countryCode: "US",
			year: 2024,
			types: ["Public"],
		});

		printResult("Public Holidays Only (US 2024)", {
			count: result2.total,
			holidays: result2.holidays.map((h) => ({
				date: new Date(h.date).toDateString(),
				name: h.name,
				types: h.types,
			})),
		});
	} catch (error) {
		printError(error);
	}
}

/**
 * Example 9: Use the factory to manage data sources
 */
async function example9_useFactory() {
	console.log("\n" + "=".repeat(60));
	console.log("Example 9: Use Factory to Manage Data Sources");
	console.log("=".repeat(60));

	try {
		const factory = HolidayDataSourceFactory.getInstance();

		// Get all available data sources
		const availableSources = factory.getDataSourceNames();
		printResult("Available Data Sources", { sources: availableSources });

		// Get a specific data source
		const nagerDataSource = factory.getDataSource("nager-date");
		printResult("Nager.Date Data Source", {
			name: nagerDataSource.name,
			description: nagerDataSource.description,
		});

		// Check if a data source exists
		const exists = factory.hasDataSource("nager-date");
		printResult("Data Source Exists Check", { exists });

		// Get statistics
		const stats = factory.getStatistics();
		printResult("Data Source Statistics", stats);
	} catch (error) {
		printError(error);
	}
}

/**
 * Example 10: Caching and performance
 */
async function example10_caching() {
	console.log("\n" + "=".repeat(60));
	console.log("Example 10: Caching and Performance");
	console.log("=".repeat(60));

	try {
		const dataSource = getDefaultHolidayDataSource();
		const countryCode = "US";
		const year = 2024;

		// Enable debug mode and caching
		dataSource.updateConfig({ debug: true, enableCache: true });

		console.log("First fetch (not cached)...");
		const start1 = Date.now();
		await dataSource.getHolidaysForYear(year, countryCode);
		const time1 = Date.now() - start1;

		console.log("Second fetch (should be cached)...");
		const start2 = Date.now();
		await dataSource.getHolidaysForYear(year, countryCode);
		const time2 = Date.now() - start2;

		printResult("Cache Performance", {
			firstFetchTime: `${time1}ms`,
			secondFetchTime: `${time2}ms`,
			speedup: ` ${(time1 / time2).toFixed(2)}x`,
			cacheEnabled: dataSource.getConfig().enableCache,
		});

		// Clear cache
		console.log("Clearing cache...");
		await dataSource.clearCache();

		console.log("Fetch after cache clear...");
		const start3 = Date.now();
		await dataSource.getHolidaysForYear(year, countryCode);
		const time3 = Date.now() - start3;

		printResult("After Cache Clear", {
			fetchTime: `${time3}ms`,
			cacheCleared: true,
		});
	} catch (error) {
		printError(error);
	}
}

/**
 * Example 11: Check all data sources health
 */
async function example11_checkAllDataSources() {
	console.log("\n" + "=".repeat(60));
	console.log("Example 11: Check All Data Sources Health");
	console.log("=".repeat(60));

	try {
		const factory = HolidayDataSourceFactory.getInstance();

		console.log("Checking health of all registered data sources...");

		const statusMap = await factory.checkAllDataSources();

		const results = {};
		for (const [name, status] of statusMap.entries()) {
			results[name] = {
				available: status.isAvailable,
				responseTime: `${status.responseTime}ms`,
				error: status.error,
			};
		}

		printResult("Health Check Results", results);
	} catch (error) {
		printError(error);
	}
}

/**
 * Example 12: Error handling
 */
async function example12_errorHandling() {
	console.log("\n" + "=".repeat(60));
	console.log("Example 12: Error Handling");
	console.log("=".repeat(60));

	try {
		const dataSource = getDefaultHolidayDataSource();

		// Try with invalid country code
		console.log("Attempting to fetch holidays for invalid country code...");
		try {
			await dataSource.getHolidaysForYear(2024, "INVALID");
		} catch (error) {
			printResult("Invalid Country Code Error", {
				message: error.message,
				type: error.name,
			});
		}

		// Try with future year (may not have data yet)
		console.log("\nAttempting to fetch holidays for a very future year...");
		try {
			const futureYear = new Date().getFullYear() + 10;
			const holidays = await dataSource.getHolidaysForYear(futureYear, "US");
			printResult("Future Year Result", {
				year: futureYear,
				found: holidays.length,
			});
		} catch (error) {
			printResult("Future Year Error", {
				message: error.message,
			});
		}
	} catch (error) {
		printError(error);
	}
}

/**
 * Example 13: Working with multiple countries
 */
async function example13_multipleCountries() {
	console.log("\n" + "=".repeat(60));
	console.log("Example 13: Working with Multiple Countries");
	console.log("=".repeat(60));

	try {
		const dataSource = getDefaultHolidayDataSource();
		const year = 2024;
		const countries = ["US", "GB", "CA", "DE"];

		console.log(
			`Fetching holidays for ${countries.length} countries in ${year}...`,
		);

		const results = {};
		for (const countryCode of countries) {
			try {
				const holidays = await dataSource.getHolidaysForYear(year, countryCode);
				results[countryCode] = {
					success: true,
					holidayCount: holidays.length,
					firstHoliday: holidays[0]
						? {
								date: new Date(holidays[0].date).toDateString(),
								name: holidays[0].name,
							}
						: null,
				};
			} catch (error) {
				results[countryCode] = {
					success: false,
					error: error.message,
				};
			}
		}

		printResult("Multi-Country Holiday Data", results);
	} catch (error) {
		printError(error);
	}
}

/**
 * Example 14: Reset and reconfigure data source
 */
async function example14_resetAndReconfigure() {
	console.log("\n" + "=".repeat(60));
	console.log("Example 14: Reset and Reconfigure Data Source");
	console.log("=".repeat(60));

	try {
		const dataSource = getDefaultHolidayDataSource();

		// Get initial config
		const initialConfig = dataSource.getConfig();
		printResult("Initial Configuration", initialConfig);

		// Update configuration
		console.log("\nUpdating configuration...");
		dataSource.updateConfig({
			defaultCountryCode: "GB",
			cacheDuration: 7200000, // 2 hours
			timeout: 15000, // 15 seconds
		});

		const updatedConfig = dataSource.getConfig();
		printResult("Updated Configuration", updatedConfig);

		// Reset data source
		console.log("\nResetting data source...");
		await dataSource.reset();

		const resetConfig = dataSource.getConfig();
		printResult("Configuration After Reset", resetConfig);
	} catch (error) {
		printError(error);
	}
}

/**
 * Run all examples
 */
async function runAllExamples() {
	console.log("\n" + "=".repeat(60));
	console.log("Holiday Data Sources - Usage Examples");
	console.log("=".repeat(60));
	console.log("This file demonstrates various ways to use the holiday");
	console.log("data source strategy pattern with Nager.Date API.");

	try {
		await example1_getDefaultDataSource();
		await example2_checkAvailability();
		await example3_getHolidaysForYear();
		await example4_checkIfHoliday();
		await example5_checkTodayHoliday();
		await example6_getUpcomingHolidays();
		await example7_getHolidaysForDateRange();
		await example8_queryWithOptions();
		await example9_useFactory();
		await example10_caching();
		await example11_checkAllDataSources();
		await example12_errorHandling();
		await example13_multipleCountries();
		await example14_resetAndReconfigure();

		console.log("\n" + "=".repeat(60));
		console.log("All examples completed successfully! ✓");
		console.log("=".repeat(60));
	} catch (error) {
		console.error("\n" + "=".repeat(60));
		console.error("Examples failed with error:");
		console.error("=".repeat(60));
		printError(error);
		process.exit(1);
	}
}

// Run the examples if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
	runAllExamples();
}

// Export individual examples for use in other modules
export {
	example1_getDefaultDataSource,
	example2_checkAvailability,
	example3_getHolidaysForYear,
	example4_checkIfHoliday,
	example5_checkTodayHoliday,
	example6_getUpcomingHolidays,
	example7_getHolidaysForDateRange,
	example8_queryWithOptions,
	example9_useFactory,
	example10_caching,
	example11_checkAllDataSources,
	example12_errorHandling,
	example13_multipleCountries,
	example14_resetAndReconfigure,
	runAllExamples,
};
