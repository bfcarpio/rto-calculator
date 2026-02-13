/**
 * Holiday Manager Tests
 *
 * Unit tests for the HolidayManager class which manages holiday data
 * fetching, caching, and filtering with company-specific policies.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HolidayManager } from "../holiday/HolidayManager";
import { HolidayDataSourceFactory } from "../holiday/sources";

// Mock holiday data for testing
const mockHolidays = {
	"US-2024": [
		{
			date: new Date(2024, 0, 1),
			name: "New Year's Day",
			countryCode: "US",
			localName: "New Year's Day",
			types: ["Public"],
			global: true,
		},
		{
			date: new Date(2024, 6, 4),
			name: "Independence Day",
			countryCode: "US",
			localName: "Independence Day",
			types: ["Public"],
			global: true,
		},
		{
			date: new Date(2024, 11, 25),
			name: "Christmas Day",
			countryCode: "US",
			localName: "Christmas Day",
			types: ["Public"],
			global: true,
		},
	],
	"US-2025": [
		{
			date: new Date(2025, 0, 1),
			name: "New Year's Day",
			countryCode: "US",
			localName: "New Year's Day",
			types: ["Public"],
			global: true,
		},
	],
	"CA-2024": [
		{
			date: new Date(2024, 6, 1),
			name: "Canada Day",
			countryCode: "CA",
			localName: "Canada Day",
			types: ["Public"],
			global: true,
		},
	],
};

describe("HolidayManager", () => {
	let manager: HolidayManager;
	let mockDataSource: any;

	beforeEach(async () => {
		// Clear any existing instance
		(HolidayManager as any).instance = null;

		// Create mock data source
		mockDataSource = {
			getHolidaysByYear: vi.fn(),
			getHolidaysByDateRange: vi.fn(),
			getUpcomingHolidays: vi.fn(),
			isHoliday: vi.fn(),
			isTodayHoliday: vi.fn(),
			queryHolidays: vi.fn(),
			getStatistics: vi.fn(),
			resetStatistics: vi.fn(),
			clearCache: vi.fn(),
			updateConfig: vi.fn(),
			name: "mock-data-source",
			description: "Mock data source",
			config: {},
		};

		// Mock the factory to return our mock data source
		vi.spyOn(HolidayDataSourceFactory, "getInstance").mockReturnValue({
			dataSources: new Map([["mock-data-source", mockDataSource]]),
			defaultDataSourceName: "mock-data-source",
			getDataSource: vi.fn().mockReturnValue(mockDataSource),
			getAllDataSources: vi.fn().mockReturnValue([mockDataSource]),
			getDataSourceNames: vi.fn().mockReturnValue(["mock-data-source"]),
			hasDataSource: vi.fn().mockReturnValue(true),
			registerDataSource: vi.fn(),
			unregisterDataSource: vi.fn(),
			getDefaultDataSource: vi.fn().mockReturnValue(mockDataSource),
			setDefaultDataSource: vi.fn(),
			checkAllDataSources: vi.fn().mockResolvedValue(new Map()),
			clearAllCaches: vi.fn().mockResolvedValue(undefined),
			resetAllDataSources: vi.fn().mockResolvedValue(undefined),
			getStatistics: vi.fn().mockReturnValue({
				totalDataSources: 1,
				defaultDataSource: "mock-data-source",
				dataSources: {},
			}),
			reloadDataSource: vi.fn(),
			_initializeDefaultDataSources: vi.fn(),
			_resetInstance: vi.fn(),
		} as any);

		manager = await HolidayManager.getInstance();
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	describe("Singleton Pattern", () => {
		it("should return the same instance on multiple calls", async () => {
			const instance1 = await HolidayManager.getInstance();
			const instance2 = await HolidayManager.getInstance();
			expect(instance1).toBe(instance2);
		});
	});

	describe("Configuration Management", () => {
		it("should get default configuration", () => {
			const config = manager.getConfig();
			expect(config).toEqual({
				countryCode: null,
				companyName: null,
			});
		});

		it("should set configuration", () => {
			manager.setConfig({
				countryCode: "US",
				companyName: "Acme Corp",
			});

			const config = manager.getConfig();
			expect(config.countryCode).toBe("US");
			expect(config.companyName).toBe("Acme Corp");
		});

		it("should create a copy of configuration when getting", () => {
			manager.setConfig({
				countryCode: "US",
				companyName: "Acme Corp",
			});

			const config1 = manager.getConfig();
			const config2 = manager.getConfig();
			expect(config1).not.toBe(config2);
		});
	});

	describe("Cache Management", () => {
		it("should clear cache", () => {
			manager.clearCache();
			// No error should be thrown
			expect(() => manager.clearCache()).not.toThrow();
		});
	});

	describe("Fetching Holidays", () => {
		beforeEach(() => {
			// Setup mock to return different holidays based on year/country
			mockDataSource.getHolidaysByYear.mockImplementation(
				async (year: number, countryCode: string) => {
					const key = `${countryCode}-${year}`;
					return mockHolidays[key as keyof typeof mockHolidays] || [];
				},
			);
		});

		it("should fetch holidays for a single year", async () => {
			const result = await manager.fetchHolidays({
				countryCode: "US",
				years: [2024],
			});

			expect(result.holidays).toHaveLength(3);
			expect(result.countryCode).toBe("US");
			expect(result.years).toEqual([2024]);
			expect(mockDataSource.getHolidaysByYear).toHaveBeenCalledWith(2024, "US");
		});

		it("should fetch holidays for multiple years", async () => {
			const result = await manager.fetchHolidays({
				countryCode: "US",
				years: [2024, 2025],
			});

			expect(result.holidays).toHaveLength(4);
			expect(result.years).toEqual([2024, 2025]);
			expect(mockDataSource.getHolidaysByYear).toHaveBeenCalledWith(2024, "US");
			expect(mockDataSource.getHolidaysByYear).toHaveBeenCalledWith(2025, "US");
		});

		it("should count weekday holidays correctly", async () => {
			const result = await manager.fetchHolidays({
				countryCode: "US",
				years: [2024],
				onlyWeekdays: true,
			});

			// Jan 1, 2024 is a Monday (weekday)
			// July 4, 2024 is a Thursday (weekday)
			// Dec 25, 2024 is a Wednesday (weekday)
			expect(result.weekdayHolidays).toBe(3);
		});

		it("should return empty result on API error", async () => {
			mockDataSource.getHolidaysByYear.mockRejectedValue(
				new Error("API Error"),
			);

			const result = await manager.fetchHolidays({
				countryCode: "US",
				years: [2024],
			});

			expect(result.holidays).toHaveLength(0);
			expect(result.totalHolidays).toBe(0);
		});

		it("should use cache for repeated requests", async () => {
			await manager.fetchHolidays({
				countryCode: "US",
				years: [2024],
			});

			const result1 = await manager.fetchHolidays({
				countryCode: "US",
				years: [2024],
			});

			expect(mockDataSource.getHolidaysByYear).toHaveBeenCalledTimes(1);
			expect(result1.holidays).toHaveLength(3);
		});

		describe("Company Filtering", () => {
			beforeEach(async () => {
				// Mock the getCompanyHolidays method to return specific filters
				vi.spyOn(manager as any, "getCompanyHolidays").mockReturnValue(
					new Set(["New Year's Day", "Christmas Day"]),
				);
			});

			it("should filter holidays by company name", async () => {
				const result = await manager.fetchHolidays({
					countryCode: "US",
					companyName: "TechCo",
					years: [2024],
				});

				expect(result.holidays).toHaveLength(2);
				expect(result.holidays[0]?.name).toBe("New Year's Day");
				expect(result.holidays[1]?.name).toBe("Christmas Day");
				expect(result.filteredCount).toBe(1);
			});

			it("should return all holidays when company is null", async () => {
				const result = await manager.fetchHolidays({
					countryCode: "US",
					companyName: null,
					years: [2024],
				});

				expect(result.holidays).toHaveLength(3);
				expect(result.filteredCount).toBe(0);
			});

			it("should return all holidays when company is empty string", async () => {
				const result = await manager.fetchHolidays({
					countryCode: "US",
					companyName: "",
					years: [2024],
				});

				expect(result.holidays).toHaveLength(3);
				expect(result.filteredCount).toBe(0);
			});
		});
	});

	describe("Getting Holiday Dates", () => {
		beforeEach(() => {
			mockDataSource.getHolidaysByYear.mockImplementation(
				async (year: number, countryCode: string) => {
					const key = `${countryCode}-${year}`;
					return mockHolidays[key as keyof typeof mockHolidays] || [];
				},
			);
		});

		it("should return holiday dates as a Set", async () => {
			const holidayDates = await manager.getHolidayDates("US", null, [2024]);

			expect(holidayDates).toBeInstanceOf(Set);
			expect(holidayDates.size).toBe(3);
		});

		it("should filter by company when specified", async () => {
			vi.spyOn(manager as any, "getCompanyHolidays").mockReturnValue(
				new Set(["New Year's Day"]),
			);

			const holidayDates = await manager.getHolidayDates(
				"US",
				"TechCo",
				[2024],
			);

			expect(holidayDates.size).toBe(1);
		});

		it("should only return weekday holidays when requested", async () => {
			const holidayDates = await manager.getHolidayDates(
				"US",
				null,
				[2024],
				true,
			);

			// All 3 holidays in 2024 are on weekdays
			expect(holidayDates.size).toBe(3);
		});
	});

	describe("Checking if Date is Holiday", () => {
		beforeEach(() => {
			mockDataSource.getHolidaysByYear.mockImplementation(
				async (year: number, countryCode: string) => {
					const key = `${countryCode}-${year}`;
					return mockHolidays[key as keyof typeof mockHolidays] || [];
				},
			);
		});

		it("should return true for a known holiday", async () => {
			const isHoliday = await manager.isHoliday(new Date(2024, 0, 1), "US");

			expect(isHoliday).toBe(true);
		});

		it("should return false for a non-holiday", async () => {
			const isHoliday = await manager.isHoliday(new Date(2024, 0, 2), "US");

			expect(isHoliday).toBe(false);
		});

		it("should check multiple years for safety", async () => {
			// Check a date in 2023 when we only have 2024 data
			const isHoliday = await manager.isHoliday(new Date(2023, 6, 4), "US");

			expect(isHoliday).toBe(false);
			// Should check year before, current year, and year after
			expect(mockDataSource.getHolidaysByYear).toHaveBeenCalledWith(2022, "US");
			expect(mockDataSource.getHolidaysByYear).toHaveBeenCalledWith(2023, "US");
			expect(mockDataSource.getHolidaysByYear).toHaveBeenCalledWith(2024, "US");
		});

		it("should filter by company when specified", async () => {
			vi.spyOn(manager as any, "getCompanyHolidays").mockReturnValue(
				new Set(["New Year's Day", "Christmas Day"]),
			);

			// Independence Day is not in the company filter
			const isHoliday = await manager.isHoliday(
				new Date("2024-07-04"),
				"US",
				"TechCo",
			);

			expect(isHoliday).toBe(false);
		});
	});

	describe("Applying Holidays to Calendar", () => {
		beforeEach(() => {
			// Setup DOM environment
			document.body.innerHTML = `
        <div class="calendar-day" data-year="2024" data-month="0" data-day="1">1</div>
        <div class="calendar-day" data-year="2024" data-month="0" data-day="2">2</div>
        <div class="calendar-day" data-year="2024" data-month="6" data-day="4">4</div>
        <div class="calendar-day" data-year="2024" data-month="11" data-day="25">25</div>
      `;

			mockDataSource.getHolidaysByYear.mockImplementation(
				async (year: number, countryCode: string) => {
					const key = `${countryCode}-${year}`;
					return mockHolidays[key as keyof typeof mockHolidays] || [];
				},
			);
		});

		afterEach(() => {
			document.body.innerHTML = "";
		});

		it("should add holiday class to holiday cells", async () => {
			await manager.applyHolidaysToCalendar("US", null, [2024]);

			const holidayCells = document.querySelectorAll(".calendar-day.holiday");
			expect(holidayCells).toHaveLength(3);

			// Check specific cells
			const jan1 = document.querySelector(
				'[data-year="2024"][data-month="0"][data-day="1"]',
			);
			expect(jan1?.classList.contains("holiday")).toBe(true);
		});

		it("should add holiday name as data attribute", async () => {
			await manager.applyHolidaysToCalendar("US", null, [2024]);

			const jul4 = document.querySelector(
				'[data-year="2024"][data-month="6"][data-day="4"]',
			) as HTMLElement;

			expect(jul4?.dataset.holidayName).toBe("Independence Day");
			expect(jul4?.dataset.holidayCountry).toBe("US");
		});

		it("should update aria-label with holiday info", async () => {
			await manager.applyHolidaysToCalendar("US", null, [2024]);

			const dec25 = document.querySelector(
				'[data-year="2024"][data-month="11"][data-day="25"]',
			);

			const label = dec25?.getAttribute("aria-label");
			expect(label).toContain("Christmas Day");
			expect(label).toContain("Holiday");
		});

		it("should add title attribute for tooltip", async () => {
			await manager.applyHolidaysToCalendar("US", null, [2024]);

			const jul4 = document.querySelector(
				'[data-year="2024"][data-month="6"][data-day="4"]',
			);

			expect(jul4?.getAttribute("title")).toContain("Independence Day");
			expect(jul4?.getAttribute("title")).toContain("(US)");
		});

		it("should filter by company when applying", async () => {
			vi.spyOn(manager as any, "getCompanyHolidays").mockReturnValue(
				new Set(["New Year's Day"]),
			);

			await manager.applyHolidaysToCalendar("US", "TechCo", [2024]);

			const holidayCells = document.querySelectorAll(".calendar-day.holiday");
			expect(holidayCells).toHaveLength(1);

			const cell = holidayCells[0] as HTMLElement;
			expect(cell.dataset.holidayName).toBe("New Year's Day");
		});
	});

	describe("Removing Holidays from Calendar", () => {
		beforeEach(() => {
			document.body.innerHTML = `
        <div class="calendar-day holiday" data-year="2024" data-month="0" data-day="1"
          data-holiday="true" data-holiday-name="New Year's Day"
          aria-label="Jan 1, 2024. New Year's Day (Holiday)"
          title="New Year's Day (US)">1</div>
        <div class="calendar-day" data-year="2024" data-month="0" data-day="2">2</div>
      `;
		});

		afterEach(() => {
			document.body.innerHTML = "";
		});

		it("should remove holiday class from all cells", () => {
			manager.removeHolidaysFromCalendar();

			const holidayCells = document.querySelectorAll(".calendar-day.holiday");
			expect(holidayCells).toHaveLength(0);
		});

		it("should remove holiday data attributes", () => {
			manager.removeHolidaysFromCalendar();

			const cell = document.querySelector(
				'[data-year="2024"][data-month="0"][data-day="1"]',
			) as HTMLElement;
			expect(cell?.dataset.holiday).toBeUndefined();
			expect(cell?.dataset.holidayName).toBeUndefined();
			expect(cell?.dataset.holidayCountry).toBeUndefined();
		});

		it("should remove holiday suffix from aria-label", () => {
			manager.removeHolidaysFromCalendar();

			const cell = document.querySelector(
				'[data-year="2024"][data-month="0"][data-day="1"]',
			);
			const label = cell?.getAttribute("aria-label");
			expect(label).not.toContain("Holiday");
		});

		it("should remove title attribute", () => {
			manager.removeHolidaysFromCalendar();

			const cell = document.querySelector(
				'[data-year="2024"][data-month="0"][data-day="1"]',
			);
			expect(cell?.getAttribute("title")).toBe("");
		});
	});

	describe("Refreshing Calendar Holidays", () => {
		beforeEach(() => {
			document.body.innerHTML = `
        <div class="calendar-day holiday" data-year="2024" data-month="0" data-day="1"
          data-holiday="true" data-holiday-name="Old Holiday">1</div>
        <div class="calendar-day" data-year="2024" data-month="0" data-day="2">2</div>
        <div class="calendar-day" data-year="2024" data-month="6" data-day="4">4</div>
        <div class="calendar-day" data-year="2024" data-month="11" data-day="25">25</div>
      `;

			mockDataSource.getHolidaysByYear.mockImplementation(
				async (year: number, countryCode: string) => {
					const key = `${countryCode}-${year}`;
					return mockHolidays[key as keyof typeof mockHolidays] || [];
				},
			);
		});

		afterEach(() => {
			document.body.innerHTML = "";
		});

		it("should remove existing holidays before applying new ones", async () => {
			manager.setConfig({ countryCode: "US", companyName: null });

			await manager.refreshCalendarHolidays([2024]);

			const holidayCells = document.querySelectorAll(".calendar-day.holiday");
			// Should have new holidays, not the old one
			expect(holidayCells).toHaveLength(3);
		});

		it("should not apply holidays when no country is selected", async () => {
			manager.setConfig({ countryCode: null, companyName: null });

			await manager.refreshCalendarHolidays([2024]);

			const holidayCells = document.querySelectorAll(".calendar-day.holiday");
			expect(holidayCells).toHaveLength(0);
		});
	});

	describe("Holiday Summary", () => {
		it("should generate summary for holidays", async () => {
			mockDataSource.getHolidaysByYear.mockResolvedValue(
				mockHolidays["US-2024"],
			);

			const result = await manager.fetchHolidays({
				countryCode: "US",
				years: [2024],
			});

			const summary = manager.getHolidaySummary(result);

			expect(summary).toContain("3 holiday");
			expect(summary).toContain("US");
			expect(summary).toContain("3 on weekdays");
		});

		it("should generate summary for filtered holidays", async () => {
			mockDataSource.getHolidaysByYear.mockResolvedValue(
				mockHolidays["US-2024"],
			);

			vi.spyOn(manager as any, "getCompanyHolidays").mockReturnValue(
				new Set(["New Year's Day"]),
			);

			const result = await manager.fetchHolidays({
				countryCode: "US",
				companyName: "TechCo",
				years: [2024],
			});

			const summary = manager.getHolidaySummary(result);

			expect(summary).toContain("1 holiday");
			expect(summary).toContain("filtered by TechCo");
		});

		it("should generate summary for no holidays", async () => {
			mockDataSource.getHolidaysByYear.mockResolvedValue([]);

			const result = await manager.fetchHolidays({
				countryCode: "XX",
				years: [2024],
			});

			const summary = manager.getHolidaySummary(result);

			expect(summary).toContain("No holidays found");
			expect(summary).toContain("XX");
		});
	});

	describe("Getting Available Companies", () => {
		it("should return companies for a country with filters", () => {
			const companies = manager.getAvailableCompanies("US");

			expect(Array.isArray(companies)).toBe(true);
			expect(companies.length).toBeGreaterThan(0);
			expect(companies).toContain("Acme Corp");
		});

		it("should return empty array for country without filters", () => {
			const companies = manager.getAvailableCompanies("XX");

			expect(companies).toEqual([]);
		});
	});

	describe("Checking Company Filter Availability", () => {
		it("should return true for country with company filters", () => {
			const hasFilters = manager.hasCompanyFilters("US");
			expect(hasFilters).toBe(true);
		});

		it("should return false for country without company filters", () => {
			const hasFilters = manager.hasCompanyFilters("XX");
			expect(hasFilters).toBe(false);
		});
	});
});
