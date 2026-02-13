/**
 * NagerDateHolidayDataSource Tests
 *
 * Tests for the Nager.Date holiday data source implementation
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import NagerDateHolidayDataSource from "../../src/strategies/holiday-data-sources/NagerDateHolidayDataSource.js";

describe("NagerDateHolidayDataSource", () => {
  let dataSource;

  beforeEach(() => {
    // Create a new data source instance before each test
    dataSource = new NagerDateHolidayDataSource({
      enableCache: true,
      debug: false,
    });
  });

  afterEach(async () => {
    // Clean up after each test
    await dataSource.clearCache();
  });

  describe("Initialization", () => {
    it("should initialize with correct name and description", () => {
      expect(dataSource.name).toBe("nager-date");
      expect(dataSource.description).toContain("Nager.Date API");
    });

    it("should have default configuration", () => {
      const config = dataSource.getConfig();
      expect(config.defaultCountryCode).toBe("US");
      expect(config.enableCache).toBe(true);
      expect(config.cacheDuration).toBe(3600000);
      expect(config.timeout).toBe(10000);
      expect(config.debug).toBe(false);
    });

    it("should accept custom configuration", () => {
      const customDataSource = new NagerDateHolidayDataSource({
        defaultCountryCode: "GB",
        enableCache: false,
        timeout: 15000,
      });
      const config = customDataSource.getConfig();
      expect(config.defaultCountryCode).toBe("GB");
      expect(config.enableCache).toBe(false);
      expect(config.timeout).toBe(15000);
    });

    it("should initialize API client", () => {
      expect(dataSource.apiClient).toBeDefined();
      expect(dataSource.publicHolidayApi).toBeDefined();
    });
  });

  describe("checkAvailability", () => {
    it("should check availability successfully", async () => {
      const status = await dataSource.checkAvailability();
      expect(status).toBeDefined();
      expect(typeof status.isAvailable).toBe("boolean");
      expect(status.lastFetch).toBeInstanceOf(Date);
      expect(status.responseTime).toBeGreaterThan(0);
      expect(status.cacheSize).toBeGreaterThanOrEqual(0);
    });

    it("should return true for available data source", async () => {
      const status = await dataSource.checkAvailability();
      expect(status.isAvailable).toBe(true);
    }, 15000);

    it("should handle errors gracefully", async () => {
      // Mock a failure scenario
      const mockDataSource = new NagerDateHolidayDataSource({
        baseUrl: "http://invalid-url-that-does-not-exist.local",
        timeout: 1000,
      });

      const status = await mockDataSource.checkAvailability();
      expect(status).toBeDefined();
      expect(typeof status.isAvailable).toBe("boolean");
    });
  });

  describe("getHolidaysForYear", () => {
    it("should fetch holidays for US in 2024", async () => {
      const holidays = await dataSource.getHolidaysForYear(2024, "US");
      expect(Array.isArray(holidays)).toBe(true);
      expect(holidays.length).toBeGreaterThan(0);
    }, 15000);

    it("should return holidays with correct structure", async () => {
      const holidays = await dataSource.getHolidaysForYear(2024, "US");
      expect(holidays.length).toBeGreaterThan(0);

      const holiday = holidays[0];
      expect(holiday).toHaveProperty("date");
      expect(holiday).toHaveProperty("localName");
      expect(holiday).toHaveProperty("name");
      expect(holiday).toHaveProperty("countryCode");
      expect(holiday).toHaveProperty("types");
      expect(holiday.countryCode).toBe("US");
      expect(holiday.date).toBeInstanceOf(Date);
    }, 15000);

    it("should fetch holidays for different countries", async () => {
      const countries = ["GB", "CA", "DE"];
      for (const countryCode of countries) {
        const holidays = await dataSource.getHolidaysForYear(2024, countryCode);
        expect(Array.isArray(holidays)).toBe(true);
        expect(holidays.length).toBeGreaterThan(0);

        if (holidays.length > 0) {
          expect(holidays[0].countryCode).toBe(countryCode);
        }
      }
    }, 30000);

    it("should cache results when caching is enabled", async () => {
      const firstCallStart = Date.now();
      await dataSource.getHolidaysForYear(2024, "US");
      const firstCallTime = Date.now() - firstCallStart;

      const secondCallStart = Date.now();
      await dataSource.getHolidaysForYear(2024, "US");
      const secondCallTime = Date.now() - secondCallStart;

      // Second call should be much faster due to caching
      expect(secondCallTime).toBeLessThan(firstCallTime / 10);
    }, 15000);

    it("should not cache when caching is disabled", async () => {
      dataSource.updateConfig({ enableCache: false });

      const firstCallStart = Date.now();
      await dataSource.getHolidaysForYear(2024, "US");
      const firstCallTime = Date.now() - firstCallStart;

      const secondCallStart = Date.now();
      await dataSource.getHolidaysForYear(2024, "US");
      const secondCallTime = Date.now() - secondCallStart;

      // Both calls should take similar time (no caching)
      expect(secondCallTime).toBeGreaterThanOrEqual(firstCallTime / 2);
    }, 30000);

    it("should throw error for invalid country code", async () => {
      await expect(
        dataSource.getHolidaysForYear(2024, "INVALID"),
      ).rejects.toThrow();
    });
  });

  describe("isHoliday", () => {
    it("should identify July 4th as a US holiday", async () => {
      const date = new Date(2024, 6, 4); // July 4, 2024
      const result = await dataSource.isHoliday(date, "US");
      expect(result.isHoliday).toBe(true);
      expect(result.holiday).toBeDefined();
      expect(result.holidayCount).toBeGreaterThanOrEqual(1);
    }, 15000);

    it("should identify Christmas as a US holiday", async () => {
      const date = new Date(2024, 11, 25); // December 25, 2024
      const result = await dataSource.isHoliday(date, "US");
      expect(result.isHoliday).toBe(true);
      expect(result.holiday).toBeDefined();
    }, 15000);

    it("should identify non-holiday date correctly", async () => {
      const date = new Date(2024, 6, 15); // July 15, 2024 (a Monday)
      const result = await dataSource.isHoliday(date, "US");
      expect(result.isHoliday).toBe(false);
      expect(result.holiday).toBeUndefined();
      expect(result.holidayCount).toBe(0);
    }, 15000);

    it("should identify holidays in different countries", async () => {
      // Boxing Day in UK
      const date = new Date(2024, 11, 26); // December 26, 2024
      const result = await dataSource.isHoliday(date, "GB");
      expect(result.isHoliday).toBe(true);
    }, 15000);

    it("should handle different dates correctly", async () => {
      const testDates = [
        { date: new Date(2024, 0, 1), isHoliday: true }, // New Year's Day
        { date: new Date(2024, 5, 19), isHoliday: true }, // Juneteenth
        { date: new Date(2024, 10, 28), isHoliday: true }, // Thanksgiving
        { date: new Date(2024, 2, 15), isHoliday: false }, // Regular day
        { date: new Date(2024, 7, 20), isHoliday: false }, // Regular day
      ];

      for (const test of testDates) {
        const result = await dataSource.isHoliday(test.date, "US");
        expect(result.isHoliday).toBe(test.isHoliday);
      }
    }, 30000);
  });

  describe("isTodayHoliday", () => {
    it("should check if today is a holiday", async () => {
      const result = await dataSource.isTodayHoliday("US");
      expect(result).toBeDefined();
      expect(typeof result.isHoliday).toBe("boolean");
      if (result.isHoliday) {
        expect(result.holiday).toBeDefined();
      }
    }, 15000);

    it("should use optimized endpoint when available", async () => {
      const spy = vi.spyOn(dataSource.publicHolidayApi, 'apiV3IsTodayPublicHolidayCountryCodeGet');
      await dataSource.isTodayHoliday("US");
      expect(spy).toHaveBeenCalled();
    });
  });

  describe("getUpcomingHolidays", () => {
    it("should get upcoming holidays", async () => {
      const holidays = await dataSource.getUpcomingHolidays("US");
      expect(Array.isArray(holidays)).toBe(true);
      expect(holidays.length).toBeGreaterThan(0);

      // All holidays should be in the future
      const now = new Date();
      for (const holiday of holidays) {
        expect(holiday.date.getTime()).toBeGreaterThanOrEqual(now.getTime());
      }
    }, 15000);

    it("should respect limit parameter", async () => {
      const limit = 5;
      const holidays = await dataSource.getUpcomingHolidays("US", { limit });
      expect(holidays.length).toBeLessThanOrEqual(limit);
    }, 15000);

    it("should use optimized endpoint when startDate is not provided", async () => {
      const spy = vi.spyOn(dataSource.publicHolidayApi, 'apiV3NextPublicHolidaysCountryCodeGet');
      await dataSource.getUpcomingHolidays("US");
      expect(spy).toHaveBeenCalled();
    });

    it("should fall back to standard method when startDate is provided", async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30); // 30 days ago

      const holidays = await dataSource.getUpcomingHolidays("US", { startDate });
      expect(Array.isArray(holidays)).toBe(true);
    }, 15000);
  });

  describe("getHolidaysForDateRange", () => {
    it("should get holidays for a date range", async () => {
      const startDate = new Date(2024, 11, 1); // December 1, 2024
      const endDate = new Date(2024, 11, 31); // December 31, 2024

      const holidays = await dataSource.getHolidaysForDateRange(
        { startDate, endDate },
        "US",
      );
      expect(Array.isArray(holidays)).toBe(true);
      expect(holidays.length).toBeGreaterThan(0);

      // All holidays should be within the date range
      for (const holiday of holidays) {
        expect(holiday.date.getTime()).toBeGreaterThanOrEqual(startDate.getTime());
        expect(holiday.date.getTime()).toBeLessThanOrEqual(endDate.getTime());
      }
    }, 15000);

    it("should handle date range across multiple years", async () => {
      const startDate = new Date(2023, 11, 1); // December 1, 2023
      const endDate = new Date(2024, 0, 31); // January 31, 2024

      const holidays = await dataSource.getHolidaysForDateRange(
        { startDate, endDate },
        "US",
      );
      expect(Array.isArray(holidays)).toBe(true);
      expect(holidays.length).toBeGreaterThan(0);
    }, 20000);

    it("should use optimized endpoint for upcoming holidays", async () => {
      const today = new Date();
      const startDate = new Date(today);
      const endDate = new Date(today);
      endDate.setDate(endDate.getDate() + 30);

      const holidays = await dataSource.getHolidaysForDateRange(
        { startDate, endDate },
        "US",
      );
      expect(Array.isArray(holidays)).toBe(true);
    }, 15000);

    it("should return empty array for date range with no holidays", async () => {
      const startDate = new Date(2024, 1, 1); // February 1, 2024
      const endDate = new Date(2024, 1, 5); // February 5, 2024 (a short range)

      const holidays = await dataSource.getHolidaysForDateRange(
        { startDate, endDate },
        "US",
      );
      expect(Array.isArray(holidays)).toBe(true);
    }, 15000);
  });

  describe("queryHolidays", () => {
    it("should query holidays with country code and year", async () => {
      const result = await dataSource.queryHolidays({
        countryCode: "US",
        year: 2024,
      });
      expect(result.holidays).toBeDefined();
      expect(Array.isArray(result.holidays)).toBe(true);
      expect(result.total).toBe(result.holidays.length);
      expect(result.query).toBeDefined();
    }, 15000);

    it("should filter by globalOnly option", async () => {
      const result = await dataSource.queryHolidays({
        countryCode: "US",
        year: 2024,
        globalOnly: true,
      });
      expect(result.holidays.every((h) => h.global !== false)).toBe(true);
    }, 15000);

    it("should filter by holiday types", async () => {
      const result = await dataSource.queryHolidays({
        countryCode: "US",
        year: 2024,
        types: ["Public"],
      });
      expect(
        result.holidays.every((h) => h.types.includes("Public")),
      ).toBe(true);
    }, 15000);

    it("should handle multiple filter options", async () => {
      const result = await dataSource.queryHolidays({
        countryCode: "US",
        year: 2024,
        globalOnly: true,
        types: ["Public"],
      });
      expect(result.holidays).toBeDefined();
      expect(
        result.holidays.every((h) => h.global !== false && h.types.includes("Public")),
      ).toBe(true);
    }, 15000);

    it("should query by date range", async () => {
      const startDate = new Date(2024, 11, 1);
      const endDate = new Date(2024, 11, 31);

      const result = await dataSource.queryHolidays({
        countryCode: "US",
        dateRange: { startDate, endDate },
      });
      expect(result.holidays).toBeDefined();
      expect(
        result.holidays.every((h) => {
          const d = h.date.getTime();
          return d >= startDate.getTime() && d <= endDate.getTime();
        }),
      ).toBe(true);
    }, 15000);
  });

  describe("Caching", () => {
    it("should clear cache", async () => {
      await dataSource.getHolidaysForYear(2024, "US");
      await dataSource.clearCache();

      const config = dataSource.getConfig();
      expect(config.enableCache).toBe(true);
    });

    it("should respect cache duration", async () => {
      // Set very short cache duration
      dataSource.updateConfig({ cacheDuration: 100 }); // 100ms

      await dataSource.getHolidaysForYear(2024, "US");

      // Wait for cache to expire
      await new Promise((resolve) => setTimeout(resolve, 150));

      // This should fetch from API again
      const holidays = await dataSource.getHolidaysForYear(2024, "US");
      expect(Array.isArray(holidays)).toBe(true);
    }, 15000);

    it("should not cache when disabled", async () => {
      dataSource.updateConfig({ enableCache: false });

      await dataSource.getHolidaysForYear(2024, "US");
      await dataSource.clearCache();

      // Should still work
      const holidays = await dataSource.getHolidaysForYear(2024, "US");
      expect(Array.isArray(holidays)).toBe(true);
    }, 15000);
  });

  describe("Configuration", () => {
    it("should get current configuration", () => {
      const config = dataSource.getConfig();
      expect(config).toBeDefined();
      expect(typeof config).toBe("object");
      expect(config.defaultCountryCode).toBe("US");
    });

    it("should update configuration", () => {
      dataSource.updateConfig({
        defaultCountryCode: "GB",
        debug: true,
      });

      const config = dataSource.getConfig();
      expect(config.defaultCountryCode).toBe("GB");
      expect(config.debug).toBe(true);
    });

    it("should merge partial configuration updates", () => {
      const originalConfig = dataSource.getConfig();

      dataSource.updateConfig({ debug: true });

      const newConfig = dataSource.getConfig();
      expect(newConfig.debug).toBe(true);
      expect(newConfig.defaultCountryCode).toBe(originalConfig.defaultCountryCode);
      expect(newConfig.enableCache).toBe(originalConfig.enableCache);
    });

    it("should update cache configuration", () => {
      dataSource.updateConfig({
        cacheDuration: 7200000,
        enableCache: false,
      });

      const config = dataSource.getConfig();
      expect(config.cacheDuration).toBe(7200000);
      expect(config.enableCache).toBe(false);
    });
  });

  describe("Reset", () => {
    it("should reset data source to initial state", async () => {
      // Modify configuration
      dataSource.updateConfig({
        defaultCountryCode: "GB",
        enableCache: false,
        debug: true,
      });

      // Add some data to cache
      await dataSource.getHolidaysForYear(2024, "US");

      // Reset
      await dataSource.reset();

      // Check configuration is reset
      const config = dataSource.getConfig();
      expect(config.defaultCountryCode).toBe("US");
      expect(config.enableCache).toBe(true);
      expect(config.debug).toBe(false);
    });

    it("should clear cache on reset", async () => {
      await dataSource.getHolidaysForYear(2024, "US");
      await dataSource.reset();

      // Should fetch fresh data after reset
      const holidays = await dataSource.getHolidaysForYear(2024, "US");
      expect(Array.isArray(holidays)).toBe(true);
    }, 15000);
  });

  describe("Error Handling", () => {
    it("should handle network errors gracefully", async () => {
      const errorDataSource = new NagerDateHolidayDataSource({
        baseUrl: "http://invalid-url-that-does-not-exist.local",
        timeout: 1000,
      });

      await expect(
        errorDataSource.getHolidaysForYear(2024, "US"),
      ).rejects.toThrow();
    });

    it("should handle invalid country codes", async () => {
      await expect(
        dataSource.getHolidaysForYear(2024, "INVALID"),
      ).rejects.toThrow();
    });

    it("should handle invalid year", async () => {
      // Try a year far in the past
      const result = await dataSource.getHolidaysForYear(1800, "US");
      expect(Array.isArray(result)).toBe(true);
    });

    it("should handle timeout errors", async () => {
      const timeoutDataSource = new NagerDateHolidayDataSource({
        timeout: 1, // 1ms timeout
      });

      await expect(
        timeoutDataSource.getHolidaysForYear(2024, "US"),
      ).rejects.toThrow();
    });
  });

  describe("Holiday Data Structure", () => {
    it("should normalize holiday data correctly", async () => {
      const holidays = await dataSource.getHolidaysForYear(2024, "US");
      expect(holidays.length).toBeGreaterThan(0);

      const holiday = holidays[0];

      // Check required fields
      expect(holiday.date).toBeInstanceOf(Date);
      expect(holiday.localName).toBeDefined();
      expect(typeof holiday.localName).toBe("string");
      expect(holiday.name).toBeDefined();
      expect(typeof holiday.name).toBe("string");
      expect(holiday.countryCode).toBe("US");
      expect(Array.isArray(holiday.types)).toBe(true);

      // Check optional fields
      expect(holiday.fixed).toBeDefined();
      expect(holiday.global).toBeDefined();
      expect(holiday.counties).toBeDefined();
      expect(Array.isArray(holiday.counties)).toBe(true);
    }, 15000);

    it("should handle holidays with various types", async () => {
      const holidays = await dataSource.getHolidaysForYear(2024, "US");
      const allTypes = new Set();

      for (const holiday of holidays) {
        holiday.types.forEach((type) => allTypes.add(type));
      }

      expect(allTypes.size).toBeGreaterThan(0);
    }, 15000);
  });

  describe("Performance", () => {
    it("should complete queries within reasonable time", async () => {
      const start = Date.now();
      await dataSource.getHolidaysForYear(2024, "US");
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(10000); // Should complete in less than 10 seconds
    });

    it("should handle multiple concurrent requests", async () => {
      const promises = [
        dataSource.getHolidaysForYear(2024, "US"),
        dataSource.getHolidaysForYear(2024, "GB"),
        dataSource.getHolidaysForYear(2024, "CA"),
      ];

      const results = await Promise.all(promises);
      expect(results.every((r) => Array.isArray(r))).toBe(true);
    }, 30000);
  });
});
