/**
 * RollingPeriodValidation Tests
 *
 * Tests for the RollingPeriodValidation class that validates RTO compliance
 * over rolling 12-week periods.
 *
 * @module RollingPeriodValidation.test
 */

import { beforeEach, describe, expect, it } from "vitest";

// Import the RollingPeriodValidation class
// Note: Using dynamic import to handle CommonJS module
let RollingPeriodValidation: any;

describe("RollingPeriodValidation", () => {
	beforeEach(async () => {
		// Import the module dynamically for each test
		const module = await import("../validation/RollingPeriodValidation.js");
		RollingPeriodValidation = module.default || module;
	});

	describe("Class Instantiation", () => {
		it("should create instance with default configuration", () => {
			const validation = new RollingPeriodValidation();

			expect(validation.name).toBe("rolling-period");
			expect(validation.description).toBe(
				"Validates RTO compliance over rolling 12-week periods",
			);
			expect(validation.defaultConfig).toBeDefined();
			expect(validation.defaultConfig.minOfficeDaysPerWeek).toBe(3);
			expect(validation.defaultConfig.totalWeekdaysPerWeek).toBe(5);
			expect(validation.defaultConfig.rollingPeriodWeeks).toBe(12);
			expect(validation.defaultConfig.thresholdPercentage).toBe(0.6);
		});

		it("should initialize with empty cache", () => {
			const validation = new RollingPeriodValidation();

			expect(validation.cache).toBeInstanceOf(Map);
			expect(validation.cache.size).toBe(0);
		});

		it("should initialize with null weekStart", () => {
			const validation = new RollingPeriodValidation();

			expect(validation.weekStart).toBeNull();
		});
	});

	describe("validate() - Empty Selections", () => {
		it("should return valid result with 100% compliance for empty selections", () => {
			const validation = new RollingPeriodValidation();

			const context = {
				selectedDays: [],
				config: {},
				calendarStartDate: new Date(2025, 0, 1),
				calendarEndDate: new Date(2025, 2, 31),
			};

			const result = validation.validate(context);

			expect(result.isValid).toBe(true);
			expect(result.message).toBe("No selections to validate");
			expect(result.overallCompliance).toBe(100);
			expect(result.windowResults).toHaveLength(0);
			expect(result.violatingWindows).toHaveLength(0);
			expect(result.compliantWindows).toHaveLength(0);
		});

		it("should return valid result when selectedDays is undefined", () => {
			const validation = new RollingPeriodValidation();

			const context = {
				selectedDays: undefined as any,
				config: {},
			};

			const result = validation.validate(context);

			expect(result.isValid).toBe(true);
			expect(result.overallCompliance).toBe(100);
		});

		it("should default to strict mode when validationMode not specified", () => {
			const validation = new RollingPeriodValidation();

			const context = {
				selectedDays: [],
				config: {},
			};

			const result = validation.validate(context);

			expect(result.validationMode).toBe("strict");
		});
	});

	describe("validate() - Strict Mode", () => {
		it("should validate each week individually in strict mode", () => {
			const validation = new RollingPeriodValidation();

			// Create context with selections that are all compliant
			const context = {
				selectedDays: [
					{ year: 2025, month: 0, day: 6 }, // Monday
					{ year: 2025, month: 0, day: 7 }, // Tuesday
				],
				config: {},
				calendarStartDate: new Date(2025, 0, 1),
				calendarEndDate: new Date(2025, 0, 31),
			};

			const result = validation.validate(context, "strict");

			// 2 WFH days = 3 office days = compliant
			expect(result.isValid).toBe(true);
			expect(result.validationMode).toBe("strict");
		});

		it("should fail on first violating week in strict mode", () => {
			const validation = new RollingPeriodValidation();

			// Create context with selections that violate compliance
			const context = {
				selectedDays: [
					{ year: 2025, month: 0, day: 6 }, // Monday
					{ year: 2025, month: 0, day: 7 }, // Tuesday
					{ year: 2025, month: 0, day: 8 }, // Wednesday
				],
				config: {},
				calendarStartDate: new Date(2025, 0, 1),
				calendarEndDate: new Date(2025, 0, 31),
			};

			const result = validation.validate(context, "strict");

			// 3 WFH days = 2 office days = not compliant
			expect(result.isValid).toBe(false);
			expect(result.violatingWindows.length).toBeGreaterThan(0);
		});

		it("should use custom configuration in strict mode", () => {
			const validation = new RollingPeriodValidation();

			const context = {
				selectedDays: [
					{ year: 2025, month: 0, day: 6 },
					{ year: 2025, month: 0, day: 7 },
				],
				config: {
					minOfficeDaysPerWeek: 4, // Stricter requirement
				},
			};

			const result = validation.validate(context, "strict");

			// 2 WFH days = 3 office days < 4 required = not compliant
			expect(result.isValid).toBe(false);
		});
	});

	describe("validate() - Average Mode", () => {
		it("should calculate rolling window compliance in average mode", () => {
			const validation = new RollingPeriodValidation();

			// Create context with partial selections
			const context = {
				selectedDays: [
					{ year: 2025, month: 0, day: 6 },
					{ year: 2025, month: 0, day: 7 },
				],
				config: {},
				calendarStartDate: new Date(2025, 0, 1),
				calendarEndDate: new Date(2025, 2, 31),
			};

			const result = validation.validate(context, "average");

			expect(result.validationMode).toBe("average");
			// 2 WFH days in first week = 3 office days = 60% = compliant
			expect(result.isValid).toBe(true);
		});

		it("should detect violations in average mode", () => {
			const validation = new RollingPeriodValidation();

			// Create context with many WFH days
			const context = {
				selectedDays: [
					{ year: 2025, month: 0, day: 6 },
					{ year: 2025, month: 0, day: 7 },
					{ year: 2025, month: 0, day: 8 },
					{ year: 2025, month: 0, day: 9 },
				],
				config: {},
				calendarStartDate: new Date(2025, 0, 1),
				calendarEndDate: new Date(2025, 2, 31),
			};

			const result = validation.validate(context, "average");

			// 4 WFH days = 1 office day = 20% = not compliant
			expect(result.isValid).toBe(false);
		});

		it("should include windowResults in average mode", () => {
			const validation = new RollingPeriodValidation();

			const context = {
				selectedDays: [{ year: 2025, month: 0, day: 6 }],
				config: {},
				calendarStartDate: new Date(2025, 0, 1),
				calendarEndDate: new Date(2025, 11, 31),
			};

			const result = validation.validate(context, "average");

			expect(result.windowResults).toBeInstanceOf(Array);
			expect(result.windowResults.length).toBeGreaterThan(0);
		});
	});

	describe("getWeekCompliance()", () => {
		it("should return correct compliance for a week", () => {
			const validation = new RollingPeriodValidation();

			// First set weekStart by calling validate
			validation.validate({
				selectedDays: [{ year: 2025, month: 0, day: 6 }],
				config: {},
			});

			const weekStart = new Date(2025, 0, 6);
			const context = {
				selectedDays: [],
				config: {},
			};

			const compliance = validation.getWeekCompliance(weekStart, context);

			expect(compliance.weekStart).toEqual(weekStart);
			expect(compliance.totalDays).toBe(5);
			expect(compliance.workFromHomeDays).toBe(1);
			expect(compliance.officeDays).toBe(4);
			expect(compliance.percentage).toBe(80);
			expect(compliance.isCompliant).toBe(true);
		});

		it("should return non-compliant for weeks with too many WFH days", () => {
			const validation = new RollingPeriodValidation();

			// First set weekStart by calling validate
			validation.validate({
				selectedDays: [
					{ year: 2025, month: 0, day: 6 },
					{ year: 2025, month: 0, day: 7 },
					{ year: 2025, month: 0, day: 8 },
				],
				config: {},
			});

			const weekStart = new Date(2025, 0, 6);
			const context = {
				selectedDays: [],
				config: {},
			};

			const compliance = validation.getWeekCompliance(weekStart, context);

			expect(compliance.workFromHomeDays).toBe(3);
			expect(compliance.officeDays).toBe(2);
			expect(compliance.percentage).toBe(40);
			expect(compliance.isCompliant).toBe(false);
		});

		it("should handle custom configuration", () => {
			const validation = new RollingPeriodValidation();

			validation.validate({
				selectedDays: [
					{ year: 2025, month: 0, day: 6 },
					{ year: 2025, month: 0, day: 7 },
				],
				config: {
					minOfficeDaysPerWeek: 4,
				},
			});

			const weekStart = new Date(2025, 0, 6);
			const context = {
				selectedDays: [],
				config: {
					minOfficeDaysPerWeek: 4,
				},
			};

			const compliance = validation.getWeekCompliance(weekStart, context);

			// 2 WFH days = 3 office days < 4 required = not compliant
			expect(compliance.isCompliant).toBe(false);
		});
	});

	describe("getWindowCompliance()", () => {
		it("should return compliance for a multi-week window", () => {
			const validation = new RollingPeriodValidation();

			validation.validate({
				selectedDays: [
					{ year: 2025, month: 0, day: 6 },
					{ year: 2025, month: 0, day: 7 },
				],
				config: {},
			});

			const context = {
				selectedDays: [],
				config: {},
			};

			const windowCompliance = validation.getWindowCompliance(0, 12, context);

			expect(windowCompliance.windowStart).toBe(0);
			expect(windowCompliance.windowEnd).toBe(11);
			expect(windowCompliance.weeks).toBeInstanceOf(Array);
			expect(windowCompliance.totalOfficeDays).toBeDefined();
			expect(windowCompliance.totalWeekdays).toBeDefined();
			expect(windowCompliance.averageOfficeDaysPerWeek).toBeDefined();
			expect(windowCompliance.compliancePercentage).toBeDefined();
			expect(windowCompliance.isCompliant).toBeDefined();
			expect(windowCompliance.requiredOfficeDays).toBe(3);
			expect(windowCompliance.requiredPercentage).toBe(60);
		});

		it("should calculate correct average for window", () => {
			const validation = new RollingPeriodValidation();

			// Create selections for multiple weeks
			const selections = [];
			for (let week = 0; week < 12; week++) {
				for (let day = 0; day < 2; day++) {
					selections.push({
						year: 2025,
						month: 0,
						day: 6 + week * 7 + day,
					});
				}
			}

			validation.validate({
				selectedDays: selections,
				config: {},
			});

			const context = {
				selectedDays: [],
				config: {},
			};

			const windowCompliance = validation.getWindowCompliance(0, 12, context);

			// 2 WFH days per week = 3 office days per week = 60% = compliant
			expect(windowCompliance.isCompliant).toBe(true);
			expect(windowCompliance.averageOfficeDaysPerWeek).toBe(3);
			expect(windowCompliance.compliancePercentage).toBe(60);
		});
	});

	describe("reset()", () => {
		it("should clear cache and reset weekStart", () => {
			const validation = new RollingPeriodValidation();

			// First run validation to populate cache
			validation.validate({
				selectedDays: [{ year: 2025, month: 0, day: 6 }],
				config: {},
			});

			expect(validation.cache.size).toBeGreaterThan(0);
			expect(validation.weekStart).not.toBeNull();

			// Reset
			validation.reset();

			expect(validation.cache.size).toBe(0);
			expect(validation.weekStart).toBeNull();
		});
	});

	describe("isApplicable()", () => {
		it("should return true when selections exist", () => {
			const validation = new RollingPeriodValidation();

			const context = {
				selectedDays: [{ year: 2025, month: 0, day: 6 }],
			};

			expect(validation.isApplicable(context)).toBe(true);
		});

		it("should return false when selections is empty array", () => {
			const validation = new RollingPeriodValidation();

			const context = {
				selectedDays: [],
			};

			expect(validation.isApplicable(context)).toBe(false);
		});

		it("should return false when selectedDays is undefined", () => {
			const validation = new RollingPeriodValidation();

			const context = {
				selectedDays: undefined as any,
			};

			expect(validation.isApplicable(context)).toBe(false);
		});
	});

	describe("Private Helper Methods", () => {
		it("_getStartOfWeek should return Sunday for any date", () => {
			const validation = new RollingPeriodValidation();

			// Test with Monday
			const monday = new Date(2025, 0, 6);
			const weekStart = (validation as any)._getStartOfWeek(monday);
			expect(weekStart.getDay()).toBe(0); // Sunday

			// Test with Friday
			const friday = new Date(2025, 0, 10);
			const weekStart2 = (validation as any)._getStartOfWeek(friday);
			expect(weekStart2.getDay()).toBe(0); // Sunday

			// Test with Sunday
			const sunday = new Date(2025, 0, 12);
			const weekStart3 = (validation as any)._getStartOfWeek(sunday);
			expect(weekStart3.getDay()).toBe(0); // Sunday
		});

		it("_getWeekNumber should return correct week number", () => {
			const validation = new RollingPeriodValidation();

			const date1 = new Date(2025, 0, 6); // Week 2 (Jan 6 is in week 2)
			const weekNum1 = (validation as any)._getWeekNumber(date1);
			expect(weekNum1).toBeGreaterThan(0);

			const date2 = new Date(2025, 0, 1); // Week 1
			const weekNum2 = (validation as any)._getWeekNumber(date2);
			expect(weekNum2).toBeGreaterThan(0);
		});

		it("_groupDaysByWeek should group by week correctly", () => {
			const validation = new RollingPeriodValidation();

			const days = [
				{ year: 2025, month: 0, day: 6 }, // Week 1, Monday
				{ year: 2025, month: 0, day: 7 }, // Week 1, Tuesday
				{ year: 2025, month: 0, day: 13 }, // Week 2, Monday
			];

			const weekStart = new Date(2025, 0, 5); // Sunday before Jan 6
			const grouped = (validation as any)._groupDaysByWeek(days, weekStart);

			expect(grouped).toBeInstanceOf(Map);
			expect(grouped.size).toBe(2); // Two different weeks

			// Count the values in the map
			let totalDays = 0;
			for (const count of grouped.values()) {
				totalDays += count;
			}
			expect(totalDays).toBe(3); // Total of 3 days
		});

		it("_getTotalWeeks should return correct number of weeks", () => {
			const validation = new RollingPeriodValidation();

			// With calendar dates
			const context1 = {
				calendarStartDate: new Date(2025, 0, 1),
				calendarEndDate: new Date(2025, 0, 28), // 4 weeks
			};
			const weeks1 = (validation as any)._getTotalWeeks(context1);
			expect(weeks1).toBe(4);

			// Without calendar dates (default 52 weeks)
			const context2 = {
				selectedDays: [],
			};
			const weeks2 = (validation as any)._getTotalWeeks(context2);
			expect(weeks2).toBe(52);
		});
	});

	describe("Edge Cases and Error Handling", () => {
		it("should handle dates in different months", () => {
			const validation = new RollingPeriodValidation();

			const context = {
				selectedDays: [
					{ year: 2025, month: 0, day: 27 }, // Late January
					{ year: 2025, month: 1, day: 3 }, // Early February
				],
				config: {},
			};

			const result = validation.validate(context);

			expect(result).toBeDefined();
			expect(result.windowResults).toBeInstanceOf(Array);
		});

		it("should handle leap year dates", () => {
			const validation = new RollingPeriodValidation();

			// 2024 is a leap year
			const context = {
				selectedDays: [
					{ year: 2024, month: 1, day: 28 }, // Feb 28
					{ year: 2024, month: 1, day: 29 }, // Feb 29 (leap day)
				],
				config: {},
			};

			const result = validation.validate(context);

			expect(result).toBeDefined();
			expect(result.isValid).toBeDefined();
		});

		it("should handle year boundary crossings", () => {
			const validation = new RollingPeriodValidation();

			const context = {
				selectedDays: [
					{ year: 2024, month: 11, day: 30 }, // Dec 30
					{ year: 2025, month: 0, day: 2 }, // Jan 2
				],
				config: {},
			};

			const result = validation.validate(context);

			expect(result).toBeDefined();
			expect(result.isValid).toBeDefined();
		});
	});

	describe("Integration with Mock Holiday Data", () => {
		it("should exclude holidays from WFH counts when provided", () => {
			const validation = new RollingPeriodValidation();

			const context = {
				selectedDays: [
					{ year: 2025, month: 0, day: 6 }, // Monday
					{ year: 2025, month: 0, day: 7 }, // Tuesday
					{ year: 2025, month: 0, day: 8 }, // Wednesday
				],
				config: {},
				holidayDates: [new Date(2025, 0, 6)], // Monday is a holiday
			};

			const result = validation.validate(context, "average");

			// Monday holiday should not count as WFH
			// So we effectively have 2 WFH days instead of 3
			// This should still be compliant (60%)
			expect(result.isValid).toBe(true);
		});
	});
});
