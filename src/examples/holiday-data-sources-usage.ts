import process from "process";

import { HolidayDataSourceFactory } from "../lib/holiday/sources";
import type { HolidayDataSource } from "../lib/holiday/sources/types";

type ExtendedDataSource = HolidayDataSource & {
	getConfig?: () => HolidayDataSource["config"];
	updateConfig?: (config: Partial<HolidayDataSource["config"]>) => void;
	reset?: () => Promise<void> | void;
	clearCache?: () => void;
};

function printResult(title: string, data: unknown): void {
	console.log(`\n${title}`);
	console.log("=".repeat(title.length));
	console.log(JSON.stringify(data, null, 2));
}

function printError(error: unknown): void {
	if (error instanceof Error) {
		console.error(`\n❌ Error: ${error.message}`);
		return;
	}
	console.error("\n❌ Error", error);
}

async function getDefaultDataSource(): Promise<ExtendedDataSource> {
	const factory = await HolidayDataSourceFactory.getInstance();
	return factory.getDefaultDataSource() as ExtendedDataSource;
}

async function example1_getDefaultDataSource(): Promise<void> {
	console.log(`\n${"=".repeat(60)}`);
	console.log("Example 1: Get Default Holiday Data Source");
	console.log("=".repeat(60));

	try {
		const dataSource = await getDefaultDataSource();
		printResult("Default Data Source Info", {
			name: dataSource.name,
			description: dataSource.description,
			config: dataSource.getConfig?.(),
		});
	} catch (error) {
		printError(error);
	}
}

async function example2_checkAvailability(): Promise<void> {
	console.log(`\n${"=".repeat(60)}`);
	console.log("Example 2: Check Data Source Availability");
	console.log("=".repeat(60));

	try {
		const dataSource = await getDefaultDataSource();
		const status = await dataSource.checkAvailability();
		printResult("Data Source Status", status);
	} catch (error) {
		printError(error);
	}
}

async function example3_getHolidaysForYear(): Promise<void> {
	console.log(`\n${"=".repeat(60)}`);
	console.log("Example 3: Get Holidays for a Year");
	console.log("=".repeat(60));

	try {
		const dataSource = await getDefaultDataSource();
		const year = 2024;
		const countryCode = "US";

		console.log(`Fetching holidays for ${countryCode} in ${year}...`);

		const holidays = await dataSource.getHolidaysByYear(year, countryCode);

		printResult("Holidays Found", {
			year,
			countryCode,
			count: holidays.length,
			holidays: holidays.slice(0, 5),
		});
	} catch (error) {
		printError(error);
	}
}

async function example4_checkIfHoliday(): Promise<void> {
	console.log(`\n${"=".repeat(60)}`);
	console.log("Example 4: Check If a Date Is a Holiday");
	console.log("=".repeat(60));

	try {
		const dataSource = await getDefaultDataSource();
		const countryCode = "US";

		const independenceDay = new Date(2024, 6, 4);
		const result1 = await dataSource.isHoliday(independenceDay, countryCode);

		printResult("July 4, 2024", {
			date: independenceDay.toDateString(),
			isHoliday: result1.isHoliday,
			holiday: result1.holiday,
		});

		const regularDay = new Date(2024, 6, 15);
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

async function example5_checkTodayHoliday(): Promise<void> {
	console.log(`\n${"=".repeat(60)}`);
	console.log("Example 5: Check If Today Is a Holiday");
	console.log("=".repeat(60));

	try {
		const dataSource = await getDefaultDataSource();
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

async function example6_getUpcomingHolidays(): Promise<void> {
	console.log(`\n${"=".repeat(60)}`);
	console.log("Example 6: Get Upcoming Holidays");
	console.log("=".repeat(60));

	try {
		const dataSource = await getDefaultDataSource();
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

async function example7_getHolidaysForDateRange(): Promise<void> {
	console.log(`\n${"=".repeat(60)}`);
	console.log("Example 7: Get Holidays for Date Range");
	console.log("=".repeat(60));

	try {
		const dataSource = await getDefaultDataSource();
		const countryCode = "US";

		const startDate = new Date(2024, 11, 1);
		const endDate = new Date(2024, 11, 31);

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

async function example8_queryWithOptions(): Promise<void> {
	console.log(`\n${"=".repeat(60)}`);
	console.log("Example 8: Query Holidays with Custom Options");
	console.log("=".repeat(60));

	try {
		const dataSource = await getDefaultDataSource();

		const result1 = await dataSource.queryHolidays({
			countryCode: "US",
			year: 2024,
			globalOnly: true,
		});

		printResult("Global Holidays Only (US 2024)", {
			count: result1.totalCount,
			holidays: result1.holidays.map((h) => ({
				date: new Date(h.date).toDateString(),
				name: h.name,
				global: h.global,
			})),
		});

		const result2 = await dataSource.queryHolidays({
			countryCode: "US",
			year: 2024,
			types: ["Public"],
		});

		printResult("Public Holidays Only (US 2024)", {
			count: result2.totalCount,
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

async function example9_useFactory(): Promise<void> {
	console.log(`\n${"=".repeat(60)}`);
	console.log("Example 9: Use Factory to Manage Data Sources");
	console.log("=".repeat(60));

	try {
		const factory = await HolidayDataSourceFactory.getInstance();

		const availableSources = factory.getDataSourceNames();
		printResult("Available Data Sources", { sources: availableSources });

		const nagerDataSource = factory.getDataSource("nager-date");
		if (nagerDataSource) {
			printResult("Nager.Date Data Source", {
				name: nagerDataSource.name,
				description: nagerDataSource.description,
			});
		}

		const exists = factory.hasDataSource("nager-date");
		printResult("Data Source Exists Check", { exists });

		const stats = factory.getStatistics();
		printResult("Data Source Statistics", stats);
	} catch (error) {
		printError(error);
	}
}

async function example10_caching(): Promise<void> {
	console.log(`\n${"=".repeat(60)}`);
	console.log("Example 10: Caching and Performance");
	console.log("=".repeat(60));

	try {
		const dataSource = await getDefaultDataSource();
		const countryCode = "US";
		const year = 2024;

		dataSource.updateConfig?.({ debug: true, enableCache: true });

		console.log("First fetch (not cached)...");
		const start1 = Date.now();
		await dataSource.getHolidaysByYear(year, countryCode);
		const time1 = Date.now() - start1;

		console.log("Second fetch (should be cached)...");
		const start2 = Date.now();
		await dataSource.getHolidaysByYear(year, countryCode);
		const time2 = Date.now() - start2;

		printResult("Cache Performance", {
			firstFetchTime: `${time1}ms`,
			secondFetchTime: `${time2}ms`,
			speedup: `${(time1 / Math.max(time2, 1)).toFixed(2)}x`,
			cacheEnabled: dataSource.getConfig?.().enableCache,
		});

		if (dataSource.clearCache) {
			console.log("Clearing cache...");
			dataSource.clearCache();
		}

		console.log("Fetch after cache clear...");
		const start3 = Date.now();
		await dataSource.getHolidaysByYear(year, countryCode);
		const time3 = Date.now() - start3;

		printResult("After Cache Clear", {
			fetchTime: `${time3}ms`,
			cacheCleared: true,
		});
	} catch (error) {
		printError(error);
	}
}

async function example11_checkAllDataSources(): Promise<void> {
	console.log(`\n${"=".repeat(60)}`);
	console.log("Example 11: Check All Data Sources Health");
	console.log("=".repeat(60));

	try {
		const factory = await HolidayDataSourceFactory.getInstance();

		console.log("Checking health of all registered data sources...");

		const statusMap = await factory.checkAllDataSources();
		const results: Record<string, unknown> = {};
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

async function example12_errorHandling(): Promise<void> {
	console.log(`\n${"=".repeat(60)}`);
	console.log("Example 12: Error Handling");
	console.log("=".repeat(60));

	try {
		const dataSource = await getDefaultDataSource();

		console.log("Attempting to fetch holidays for invalid country code...");
		try {
			await dataSource.getHolidaysByYear(2024, "INVALID");
		} catch (error) {
			printResult("Invalid Country Code Error", {
				message: error instanceof Error ? error.message : String(error),
				type: error instanceof Error ? error.name : "Error",
			});
		}

		console.log("\nAttempting to fetch holidays for a very future year...");
		try {
			const futureYear = new Date().getFullYear() + 10;
			const holidays = await dataSource.getHolidaysByYear(futureYear, "US");
			printResult("Future Year Result", {
				year: futureYear,
				found: holidays.length,
			});
		} catch (error) {
			printResult("Future Year Error", {
				message: error instanceof Error ? error.message : String(error),
			});
		}
	} catch (error) {
		printError(error);
	}
}

async function example13_multipleCountries(): Promise<void> {
	console.log(`\n${"=".repeat(60)}`);
	console.log("Example 13: Working with Multiple Countries");
	console.log("=".repeat(60));

	try {
		const dataSource = await getDefaultDataSource();
		const year = 2024;
		const countries = ["US", "GB", "CA", "DE"];

		console.log(
			`Fetching holidays for ${countries.length} countries in ${year}...`,
		);

		const results: Record<string, unknown> = {};
		for (const countryCode of countries) {
			try {
				const holidays = await dataSource.getHolidaysByYear(year, countryCode);
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
					error: error instanceof Error ? error.message : String(error),
				};
			}
		}

		printResult("Multi-Country Holiday Data", results);
	} catch (error) {
		printError(error);
	}
}

async function example14_resetAndReconfigure(): Promise<void> {
	console.log(`\n${"=".repeat(60)}`);
	console.log("Example 14: Reset and Reconfigure Data Source");
	console.log("=".repeat(60));

	try {
		const dataSource = await getDefaultDataSource();

		const initialConfig = dataSource.getConfig?.();
		printResult("Initial Configuration", initialConfig ?? {});

		console.log("\nUpdating configuration...");
		if (dataSource.updateConfig) {
			dataSource.updateConfig({
				defaultCountryCode: "GB",
				cacheDuration: 7_200_000,
				timeout: 15_000,
			});
		}

		const updatedConfig = dataSource.getConfig?.();
		printResult("Updated Configuration", updatedConfig ?? {});

		if (dataSource.reset) {
			console.log("\nResetting data source...");
			await dataSource.reset();
		}

		const resetConfig = dataSource.getConfig?.();
		printResult("Configuration After Reset", resetConfig ?? {});
	} catch (error) {
		printError(error);
	}
}

async function runAllExamples(): Promise<void> {
	console.log(`\n${"=".repeat(60)}`);
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

		console.log(`\n${"=".repeat(60)}`);
		console.log("All examples completed successfully! ✓");
		console.log("=".repeat(60));
	} catch (error) {
		console.error(`\n${"=".repeat(60)}`);
		console.error("Examples failed with error:");
		console.error("=".repeat(60));
		printError(error);
		process.exit(1);
	}
}

if (import.meta.url === `file://${process.argv[1]}`) {
	void runAllExamples();
}

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
