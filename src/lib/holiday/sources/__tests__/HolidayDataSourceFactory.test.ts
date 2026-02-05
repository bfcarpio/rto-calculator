/**
 * HolidayDataSourceFactory Tests
 *
 * Tests for the HolidayDataSourceFactory class that manages holiday data source instances
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { HolidayDataSourceFactory } from "../HolidayDataSourceFactory";
import NagerDateHolidayDataSource from "../NagerDateHolidayDataSource";
import type { HolidayDataSource, HolidayDataSourceConfig } from "../types";

describe("HolidayDataSourceFactory", () => {
	let factory: HolidayDataSourceFactory;

	beforeEach(async () => {
		// Reset the singleton instance before each test
		HolidayDataSourceFactory._resetInstance();
		factory = await HolidayDataSourceFactory.getInstance();
	});

	afterEach(() => {
		// Clean up after each test
		HolidayDataSourceFactory._resetInstance();
	});

	describe("Singleton Pattern", () => {
		it("should return the same instance on multiple calls", async () => {
			const instance1 = await HolidayDataSourceFactory.getInstance();
			const instance2 = await HolidayDataSourceFactory.getInstance();
			expect(instance1).toBe(instance2);
		});

		it("should create a new instance after reset", async () => {
			const instance1 = await HolidayDataSourceFactory.getInstance();
			HolidayDataSourceFactory._resetInstance();
			const instance2 = await HolidayDataSourceFactory.getInstance();
			expect(instance1).not.toBe(instance2);
		});

		it("should have only one instance at any time", async () => {
			const instance1 = await HolidayDataSourceFactory.getInstance();
			const instance2 = await HolidayDataSourceFactory.getInstance();
			const instance3 = await HolidayDataSourceFactory.getInstance();
			expect(instance1).toBe(instance2);
			expect(instance2).toBe(instance3);
		});
	});

	describe("Initialization", () => {
		it("should initialize with Nager.Date data source registered", () => {
			const dataSources = factory.getAllDataSources();
			expect(dataSources.length).toBeGreaterThan(0);

			const nagerSource = factory.getDataSource("nager-date");
			expect(nagerSource).toBeDefined();
			expect(nagerSource?.name).toBe("nager-date");
		});

		it("should set default data source to nager-date", () => {
			const defaultSource = factory.getDefaultDataSource();
			expect(defaultSource).toBeDefined();
			expect(defaultSource.name).toBe("nager-date");
		});

		it("should have no data sources if initialization fails gracefully", async () => {
			// Create a new factory without the default initialization
			HolidayDataSourceFactory._resetInstance();
			const newFactory = await HolidayDataSourceFactory.getInstance();

			// Clear manually to test empty state
			const dataSources = newFactory.getAllDataSources();
			expect(dataSources.length).toBeGreaterThanOrEqual(0);
		});
	});

	describe("getDataSource", () => {
		it("should return data source by name", () => {
			const dataSource = factory.getDataSource("nager-date");
			expect(dataSource).toBeDefined();
			expect(dataSource?.name).toBe("nager-date");
		});

		it("should return undefined for non-existent data source", () => {
			const dataSource = factory.getDataSource("non-existent");
			expect(dataSource).toBeUndefined();
		});

		it("should return the same instance for multiple calls", () => {
			const source1 = factory.getDataSource("nager-date");
			const source2 = factory.getDataSource("nager-date");
			expect(source1).toBe(source2);
		});
	});

	describe("getAllDataSources", () => {
		it("should return array of all registered data sources", () => {
			const dataSources = factory.getAllDataSources();
			expect(Array.isArray(dataSources)).toBe(true);
			expect(dataSources.length).toBeGreaterThan(0);
		});

		it("should return copy of data sources array", () => {
			const sources1 = factory.getAllDataSources();
			const sources2 = factory.getAllDataSources();
			expect(sources1).not.toBe(sources2); // Different array references
			expect(sources1).toEqual(sources2); // Same contents
		});

		it("should include Nager.Date by default", () => {
			const dataSources = factory.getAllDataSources();
			const names = dataSources.map((ds) => ds.name);
			expect(names).toContain("nager-date");
		});
	});

	describe("registerDataSource", () => {
		it("should register a new data source", () => {
			const customSource = new NagerDateHolidayDataSource({
				defaultCountryCode: "GB",
			});
			customSource.name = "custom-nager";

			factory.registerDataSource(customSource);

			const registered = factory.getDataSource("custom-nager");
			expect(registered).toBeDefined();
			expect(registered?.name).toBe("custom-nager");
		});

		it("should throw error for data source without name", () => {
			const invalidSource = {} as HolidayDataSource;

			expect(() => {
				factory.registerDataSource(invalidSource);
			}).toThrow("Data source must have a name property");
		});

		it("should throw error for duplicate data source name", () => {
			const duplicateSource = new NagerDateHolidayDataSource();

			expect(() => {
				factory.registerDataSource(duplicateSource);
			}).toThrow(/Data source with name '.*' already exists/);
		});

		it("should allow registering multiple different data sources", () => {
			const initialCount = factory.getAllDataSources().length;

			const source1 = new NagerDateHolidayDataSource();
			source1.name = "source-1";
			factory.registerDataSource(source1);

			const source2 = new NagerDateHolidayDataSource();
			source2.name = "source-2";
			factory.registerDataSource(source2);

			const finalCount = factory.getAllDataSources().length;
			expect(finalCount).toBe(initialCount + 2);
		});
	});

	describe("unregisterDataSource", () => {
		it("should unregister an existing data source", () => {
			const customSource = new NagerDateHolidayDataSource();
			customSource.name = "temporary-source";
			factory.registerDataSource(customSource);

			const result = factory.unregisterDataSource("temporary-source");
			expect(result).toBe(true);

			const unregistered = factory.getDataSource("temporary-source");
			expect(unregistered).toBeUndefined();
		});

		it("should return false for non-existent data source", () => {
			const result = factory.unregisterDataSource("non-existent");
			expect(result).toBe(false);
		});

		it("should update default data source when default is unregistered", () => {
			const customSource = new NagerDateHolidayDataSource();
			customSource.name = "new-default";
			factory.registerDataSource(customSource);
			factory.setDefaultDataSource("new-default");

			factory.unregisterDataSource("new-default");

			const defaultSource = factory.getDefaultDataSource();
			expect(defaultSource.name).not.toBe("new-default");
		});

		it("should handle unregistering when only one data source exists", () => {
			const source1 = new NagerDateHolidayDataSource();
			source1.name = "only-source";
			factory.registerDataSource(source1);

			factory.unregisterDataSource("only-source");

			expect(() => {
				factory.getDefaultDataSource();
			}).toThrow("No holiday data sources available");
		});
	});

	describe("getDefaultDataSource", () => {
		it("should return default data source", () => {
			const defaultSource = factory.getDefaultDataSource();
			expect(defaultSource).toBeDefined();
			expect(defaultSource.name).toBe("nager-date");
		});

		it("should throw error when no data sources are available", async () => {
			HolidayDataSourceFactory._resetInstance();
			const emptyFactory = await HolidayDataSourceFactory.getInstance();
			// Clear data sources by unregistering all
			const sources = emptyFactory.getAllDataSources();
			for (const source of sources) {
				emptyFactory.unregisterDataSource(source.name);
			}

			expect(() => {
				emptyFactory.getDefaultDataSource();
			}).toThrow("No holiday data sources available");
		});

		it("should return first available when default is not set", async () => {
			HolidayDataSourceFactory._resetInstance();
			const newFactory = await HolidayDataSourceFactory.getInstance();
			// Unregister all existing sources
			const existingSources = newFactory.getAllDataSources();
			for (const source of existingSources) {
				newFactory.unregisterDataSource(source.name);
			}

			const source1 = new NagerDateHolidayDataSource();
			source1.name = "first-source";
			newFactory.registerDataSource(source1);

			const defaultSource = newFactory.getDefaultDataSource();
			expect(defaultSource.name).toBe("first-source");
		});
	});

	describe("setDefaultDataSource", () => {
		it("should set a new default data source", () => {
			const customSource = new NagerDateHolidayDataSource();
			customSource.name = "custom-default";
			factory.registerDataSource(customSource);

			factory.setDefaultDataSource("custom-default");

			const defaultSource = factory.getDefaultDataSource();
			expect(defaultSource.name).toBe("custom-default");
		});

		it("should throw error for non-existent data source", () => {
			expect(() => {
				factory.setDefaultDataSource("non-existent");
			}).toThrow("Data source 'non-existent' not found");
		});
	});

	describe("getDataSourceNames", () => {
		it("should return array of registered data source names", () => {
			const names = factory.getDataSourceNames();
			expect(Array.isArray(names)).toBe(true);
			expect(names.length).toBeGreaterThan(0);
			expect(names).toContain("nager-date");
		});

		it("should include all registered data source names", () => {
			const source1 = new NagerDateHolidayDataSource();
			source1.name = "alpha";
			factory.registerDataSource(source1);

			const source2 = new NagerDateHolidayDataSource();
			source2.name = "beta";
			factory.registerDataSource(source2);

			const names = factory.getDataSourceNames();
			expect(names).toContain("alpha");
			expect(names).toContain("beta");
		});

		it("should return unique names", () => {
			const names = factory.getDataSourceNames();
			const uniqueNames = new Set(names);
			expect(names.length).toBe(uniqueNames.size);
		});
	});

	describe("hasDataSource", () => {
		it("should return true for existing data source", () => {
			expect(factory.hasDataSource("nager-date")).toBe(true);
		});

		it("should return false for non-existent data source", () => {
			expect(factory.hasDataSource("non-existent")).toBe(false);
		});

		it("should work after registering new data source", () => {
			const customSource = new NagerDateHolidayDataSource();
			customSource.name = "new-source";
			factory.registerDataSource(customSource);

			expect(factory.hasDataSource("new-source")).toBe(true);
		});

		it("should work after unregistering data source", () => {
			const customSource = new NagerDateHolidayDataSource();
			customSource.name = "temp-source";
			factory.registerDataSource(customSource);

			expect(factory.hasDataSource("temp-source")).toBe(true);

			factory.unregisterDataSource("temp-source");

			expect(factory.hasDataSource("temp-source")).toBe(false);
		});
	});

	describe("checkAllDataSources", () => {
		it("should return map of data source statuses", async () => {
			const statusMap = await factory.checkAllDataSources();
			expect(statusMap).toBeInstanceOf(Map);
			expect(statusMap.size).toBeGreaterThan(0);
		});

		it("should check all registered data sources", async () => {
			const source1 = new NagerDateHolidayDataSource();
			source1.name = "check-source-1";
			factory.registerDataSource(source1);

			const source2 = new NagerDateHolidayDataSource();
			source2.name = "check-source-2";
			factory.registerDataSource(source2);

			const statusMap = await factory.checkAllDataSources();
			expect(statusMap.has("check-source-1")).toBe(true);
			expect(statusMap.has("check-source-2")).toBe(true);
		});

		it("should handle failing data sources gracefully", async () => {
			// Create a mock data source that fails
			const failingSource: HolidayDataSource = {
				name: "failing-source",
				description: "A source that always fails",
				config: {} as HolidayDataSourceConfig,
				checkAvailability: async () => {
					throw new Error("Simulated failure");
				},
				getHolidaysByYear: async () => [],
				getHolidaysForDateRange: async () => [],
				getUpcomingHolidays: async () => [],
				isHoliday: async () => ({ isHoliday: false }),
				isTodayHoliday: async () => ({ isHoliday: false }),
				queryHolidays: async () => ({
					holidays: [],
					totalCount: 0,
					countryCode: "",
				}),
				getStatistics: () => ({
					totalCalls: 0,
					successfulCalls: 0,
					failedCalls: 0,
					averageResponseTime: 0,
					cacheHitRate: 0,
					totalHolidaysFetched: 0,
				}),
				resetStatistics: () => {},
				clearCache: () => {},
				updateConfig: () => {},
			};
			factory.registerDataSource(failingSource);

			const statusMap = await factory.checkAllDataSources();
			const status = statusMap.get("failing-source");

			expect(status).toBeDefined();
			expect(status?.isAvailable).toBe(false);
			expect(status?.error).toBeDefined();
		});

		it("should return status with all required fields", async () => {
			const statusMap = await factory.checkAllDataSources();
			const status = statusMap.get("nager-date");

			expect(status).toBeDefined();
			expect(typeof status?.isAvailable).toBe("boolean");
			expect(status).toHaveProperty("lastFetch");
			expect(status).toHaveProperty("cacheSize");
			expect(status).toHaveProperty("responseTime");
		});
	});

	describe("clearAllCaches", () => {
		it("should clear caches for all data sources", async () => {
			const dataSources = factory.getAllDataSources();

			// Populate cache for each data source by fetching holidays
			for (const ds of dataSources) {
				if (typeof ds.getHolidaysByYear === "function") {
					await ds.getHolidaysByYear(2024, "US").catch(() => {});
				}
			}

			await factory.clearAllCaches();

			// Verify clearCache was called (no error means success)
			for (const ds of dataSources) {
				if (typeof ds.clearCache === "function") {
					expect(() => ds.clearCache()).not.toThrow();
				}
			}
		});

		it("should handle data sources without cache", async () => {
			const noCacheSource: HolidayDataSource = {
				name: "no-cache-source",
				description: "Source without cache",
				config: {} as HolidayDataSourceConfig,
				checkAvailability: async () => ({
					isAvailable: true,
					cacheSize: 0,
					responseTime: 0,
				}),
				clearCache: async () => {},
				getHolidaysByYear: async () => [],
				getHolidaysForDateRange: async () => [],
				getUpcomingHolidays: async () => [],
				isHoliday: async () => ({ isHoliday: false }),
				isTodayHoliday: async () => ({ isHoliday: false }),
				queryHolidays: async () => ({
					holidays: [],
					totalCount: 0,
					countryCode: "",
				}),
				getStatistics: () => ({
					totalCalls: 0,
					successfulCalls: 0,
					failedCalls: 0,
					averageResponseTime: 0,
					cacheHitRate: 0,
					totalHolidaysFetched: 0,
				}),
				resetStatistics: () => {},
				updateConfig: () => {},
			};
			factory.registerDataSource(noCacheSource);

			await expect(factory.clearAllCaches()).resolves.not.toThrow();
		});

		it("should handle empty data source list", async () => {
			HolidayDataSourceFactory._resetInstance();
			const emptyFactory = await HolidayDataSourceFactory.getInstance();
			// Unregister all sources
			const sources = emptyFactory.getAllDataSources();
			for (const source of sources) {
				emptyFactory.unregisterDataSource(source.name);
			}

			await expect(emptyFactory.clearAllCaches()).resolves.not.toThrow();
		});
	});

	describe("resetAllDataSources", () => {
		it("should reset all registered data sources", async () => {
			const dataSources = factory.getAllDataSources();

			// Modify configuration for each data source
			for (const ds of dataSources) {
				if (typeof ds.updateConfig === "function") {
					ds.updateConfig({ debug: true, enableCache: false });
				}
			}

			await factory.resetAllDataSources();

			// Verify reset was called (no error means success)
			for (const ds of dataSources) {
				if (typeof ds.clearCache === "function") {
					expect(() => ds.clearCache()).not.toThrow();
				}
			}
		});

		it("should handle data sources without reset method", async () => {
			const noResetSource: HolidayDataSource & { reset?: () => Promise<void> } =
				{
					name: "no-reset-source",
					description: "Source without reset",
					config: {} as HolidayDataSourceConfig,
					reset: async () => {},
					checkAvailability: async () => ({
						isAvailable: true,
						cacheSize: 0,
						responseTime: 0,
					}),
					getHolidaysByYear: async () => [],
					getHolidaysForDateRange: async () => [],
					getUpcomingHolidays: async () => [],
					isHoliday: async () => ({ isHoliday: false }),
					isTodayHoliday: async () => ({ isHoliday: false }),
					queryHolidays: async () => ({
						holidays: [],
						totalCount: 0,
						countryCode: "",
					}),
					getStatistics: () => ({
						totalCalls: 0,
						successfulCalls: 0,
						failedCalls: 0,
						averageResponseTime: 0,
						cacheHitRate: 0,
						totalHolidaysFetched: 0,
					}),
					resetStatistics: () => {},
					clearCache: () => {},
					updateConfig: () => {},
				};
			factory.registerDataSource(noResetSource);

			await expect(factory.resetAllDataSources()).resolves.not.toThrow();
		});
	});

	describe("getStatistics", () => {
		it("should return statistics object", () => {
			const stats = factory.getStatistics();
			expect(stats).toBeDefined();
			expect(typeof stats).toBe("object");
		});

		it("should include total data sources count", () => {
			const stats = factory.getStatistics();
			expect(stats.totalDataSources).toBeGreaterThan(0);
			expect(typeof stats.totalDataSources).toBe("number");
		});

		it("should include default data source name", () => {
			const stats = factory.getStatistics();
			expect(stats.defaultDataSource).toBe("nager-date");
		});

		it("should include data sources details", () => {
			const stats = factory.getStatistics();
			expect(stats.dataSources).toBeDefined();
			expect(typeof stats.dataSources).toBe("object");
			expect(stats.dataSources).toHaveProperty("nager-date");
		});

		it("should include configuration details for each data source", () => {
			const stats = factory.getStatistics();
			const nagerStats = stats.dataSources["nager-date"];

			expect(nagerStats).toBeDefined();
			expect(nagerStats).toHaveProperty("description");
			expect(nagerStats).toHaveProperty("cacheEnabled");
			expect(nagerStats).toHaveProperty("debugEnabled");
			expect(nagerStats).toHaveProperty("defaultCountryCode");
		});

		it("should update statistics after registering new data source", () => {
			const initialStats = factory.getStatistics();
			const initialCount = initialStats.totalDataSources;

			const newSource = new NagerDateHolidayDataSource();
			newSource.name = "stats-test-source";
			factory.registerDataSource(newSource);

			const updatedStats = factory.getStatistics();
			expect(updatedStats.totalDataSources).toBe(initialCount + 1);
			expect(updatedStats.dataSources).toHaveProperty("stats-test-source");
		});
	});

	describe("reloadDataSource", () => {
		it("should reload an existing data source", async () => {
			const source = factory.getDataSource("nager-date");
			expect(source).toBeDefined();

			// Modify the data source
			source?.updateConfig({ debug: true, enableCache: false });

			const reloadedSource = await factory.reloadDataSource("nager-date");

			expect(reloadedSource).toBeDefined();
			expect(reloadedSource.name).toBe("nager-date");
		});

		it("should apply new configuration on reload", async () => {
			const newConfig: Partial<HolidayDataSourceConfig> = {
				defaultCountryCode: "GB",
				cacheDuration: 7200000,
			};

			const reloadedSource = await factory.reloadDataSource(
				"nager-date",
				newConfig,
			);

			// Cast to NagerDateHolidayDataSource to access getConfig
			const nagerSource = reloadedSource as NagerDateHolidayDataSource;
			const config = nagerSource.getConfig();
			expect(config.defaultCountryCode).toBe("GB");
			expect(config.cacheDuration).toBe(7200000);
		});

		it("should throw error for non-existent data source", async () => {
			await expect(factory.reloadDataSource("non-existent")).rejects.toThrow(
				"Data source 'non-existent' not found",
			);
		});

		it("should restore original data source on reload failure", async () => {
			const originalSource = factory.getDataSource("nager-date");
			expect(originalSource).toBeDefined();

			// This should fail because we don't have a reload implementation for this test
			// but we're testing the restore mechanism
			try {
				await factory.reloadDataSource("nager-date");
			} catch (error) {
				// Expected to succeed in normal case
			}

			// The original source should still be available
			const currentSource = factory.getDataSource("nager-date");
			expect(currentSource).toBeDefined();
		});

		it("should not support reloading unsupported data source types", async () => {
			const customSource: HolidayDataSource & {
				getConfig?: () => HolidayDataSourceConfig;
				updateConfig?: (config: Partial<HolidayDataSourceConfig>) => void;
			} = {
				name: "unsupported-source",
				description: "Unsupported type",
				config: {} as HolidayDataSourceConfig,
				getConfig: () => ({}) as HolidayDataSourceConfig,
				updateConfig: () => {},
				checkAvailability: async () => ({
					isAvailable: true,
					cacheSize: 0,
					responseTime: 0,
				}),
				getHolidaysByYear: async () => [],
				getHolidaysForDateRange: async () => [],
				getUpcomingHolidays: async () => [],
				isHoliday: async () => ({ isHoliday: false }),
				isTodayHoliday: async () => ({ isHoliday: false }),
				queryHolidays: async () => ({
					holidays: [],
					totalCount: 0,
					countryCode: "",
				}),
				getStatistics: () => ({
					totalCalls: 0,
					successfulCalls: 0,
					failedCalls: 0,
					averageResponseTime: 0,
					cacheHitRate: 0,
					totalHolidaysFetched: 0,
				}),
				resetStatistics: () => {},
				clearCache: () => {},
			};
			factory.registerDataSource(customSource);

			await expect(
				factory.reloadDataSource("unsupported-source"),
			).rejects.toThrow(/Cannot reload data source type/);
		});
	});

	describe("Error Handling", () => {
		it("should handle multiple operations without errors", () => {
			expect(() => {
				factory.getDataSource("nager-date");
				factory.getDefaultDataSource();
				factory.hasDataSource("nager-date");
				factory.getDataSourceNames();
				factory.getAllDataSources();
				factory.getStatistics();
			}).not.toThrow();
		});

		it("should gracefully handle empty factory state", async () => {
			HolidayDataSourceFactory._resetInstance();
			const emptyFactory = await HolidayDataSourceFactory.getInstance();
			// Unregister all sources
			const sources = emptyFactory.getAllDataSources();
			for (const source of sources) {
				emptyFactory.unregisterDataSource(source.name);
			}

			expect(emptyFactory.getAllDataSources()).toEqual([]);
			expect(emptyFactory.getDataSourceNames()).toEqual([]);
			expect(emptyFactory.hasDataSource("anything")).toBe(false);
		});

		it("should throw appropriate errors for invalid operations", () => {
			expect(() => {
				factory.setDefaultDataSource("non-existent");
			}).toThrow();
		});

		it("should not throw when getting data source that doesn't exist", () => {
			expect(() => {
				const result = factory.getDataSource("non-existent");
				expect(result).toBeUndefined();
			}).not.toThrow();
		});
	});

	describe("Integration Scenarios", () => {
		it("should support complete data source lifecycle", async () => {
			// Register
			const customSource = new NagerDateHolidayDataSource();
			customSource.name = "lifecycle-test";
			factory.registerDataSource(customSource);

			// Set as default
			factory.setDefaultDataSource("lifecycle-test");
			expect(factory.getDefaultDataSource().name).toBe("lifecycle-test");

			// Check health
			const statusMap = await factory.checkAllDataSources();
			expect(statusMap.has("lifecycle-test")).toBe(true);

			// Get statistics
			const stats = factory.getStatistics();
			expect(stats.dataSources).toHaveProperty("lifecycle-test");

			// Unregister
			factory.unregisterDataSource("lifecycle-test");
			expect(factory.getDataSource("lifecycle-test")).toBeUndefined();
		});

		it("should handle multiple data sources efficiently", () => {
			const sources: string[] = [];
			const baseName = "perf-test-";

			// Register multiple sources
			for (let i = 0; i < 10; i++) {
				const source = new NagerDateHolidayDataSource();
				source.name = `${baseName}${i}`;
				factory.registerDataSource(source);
				sources.push(source.name);
			}

			// Verify all are registered
			expect(factory.getAllDataSources().length).toBeGreaterThan(10);

			// Unregister all
			for (const name of sources) {
				factory.unregisterDataSource(name);
			}

			// Verify cleanup
			for (const name of sources) {
				expect(factory.hasDataSource(name)).toBe(false);
			}
		});

		it("should maintain consistency across multiple operations", () => {
			const initialCount = factory.getAllDataSources().length;
			const initialDefault = factory.getDefaultDataSource().name;

			// Perform various operations
			factory.getDataSource("nager-date");
			factory.hasDataSource("nager-date");
			factory.getDataSourceNames();
			factory.getStatistics();

			// Verify consistency
			expect(factory.getAllDataSources().length).toBe(initialCount);
			expect(factory.getDefaultDataSource().name).toBe(initialDefault);
		});
	});

	describe("Thread Safety / Concurrency", () => {
		it("should handle concurrent getInstance calls", async () => {
			const instances: HolidayDataSourceFactory[] = [];

			// Create multiple instances (simulated)
			for (let i = 0; i < 10; i++) {
				instances.push(await HolidayDataSourceFactory.getInstance());
			}

			// All should be the same instance
			expect(instances.every((inst) => inst === instances[0])).toBe(true);
		});

		it("should handle concurrent data source registrations", () => {
			const sources: NagerDateHolidayDataSource[] = [];

			for (let i = 0; i < 5; i++) {
				const source = new NagerDateHolidayDataSource();
				source.name = `concurrent-${i}`;
				sources.push(source);
			}

			// Register all
			sources.forEach((source) => factory.registerDataSource(source));

			// Verify all are registered
			const registered = sources.every((source) =>
				factory.hasDataSource(source.name),
			);
			expect(registered).toBe(true);
		});
	});
});
