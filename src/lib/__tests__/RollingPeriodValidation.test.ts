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
// Note: Using dynamic import to handle module loading
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

		it("should have expected properties", () => {
			const validation = new RollingPeriodValidation();

			expect(validation.name).toBe("rolling-period");
			expect(validation.description).toBe(
				"Validates RTO compliance over rolling 12-week periods",
			);
			expect(validation.defaultConfig).toBeDefined();
		});

		// This test is no longer applicable as the implementation has changed
		// weekStart is no longer a property of the main class
		it.skip("should initialize with null weekStart", () => {
			// This property no longer exists in the simplified implementation
		});
	});

	describe("validate() - Empty Selections", () => {
		it("should return valid result with 100% compliance for empty selections", () => {
			const validation = new RollingPeriodValidation();

			const context = {
				selectedDays: [],
				config: {
					minOfficeDaysPerWeek: 3,
					totalWeekdaysPerWeek: 5,
					rollingPeriodWeeks: 12,
					thresholdPercentage: 0.6,
					debug: false,
				},
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
				selectedDays: undefined,
			} as any;

			const result = validation.validate(context);

			expect(result.isValid).toBe(true);
			expect(result.overallCompliance).toBe(100);
		});

		it("should default to strict mode when validationMode not specified", () => {
			const validation = new RollingPeriodValidation();

			const context = {
				selectedDays: [],
				config: {
					minOfficeDaysPerWeek: 3,
					totalWeekdaysPerWeek: 5,
					rollingPeriodWeeks: 12,
					thresholdPercentage: 0.6,
					debug: false,
				},
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
					{ year: 2025, month: 0, day: 6, type: "out-of-office" }, // Monday
					{ year: 2025, month: 0, day: 7, type: "out-of-office" }, // Tuesday
				],
				config: {
					minOfficeDaysPerWeek: 3,
					totalWeekdaysPerWeek: 5,
					rollingPeriodWeeks: 12,
					thresholdPercentage: 0.6,
					debug: false,
				},
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
					{ year: 2025, month: 0, day: 6, type: "out-of-office" }, // Monday
					{ year: 2025, month: 0, day: 7, type: "out-of-office" }, // Tuesday
					{ year: 2025, month: 0, day: 8, type: "out-of-office" }, // Wednesday
				],
				config: {
					minOfficeDaysPerWeek: 3,
					totalWeekdaysPerWeek: 5,
					rollingPeriodWeeks: 12,
					thresholdPercentage: 0.6,
					debug: false,
				},
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
					{ year: 2025, month: 0, day: 6, type: "out-of-office" },
					{ year: 2025, month: 0, day: 7, type: "out-of-office" },
					{ year: 2025, month: 0, day: 8, type: "out-of-office" },
				],
				config: {
					minOfficeDaysPerWeek: 3,
					totalWeekdaysPerWeek: 5,
					rollingPeriodWeeks: 12,
					thresholdPercentage: 0.8, // Require 80% = 4 office days
					debug: false,
				},
			};

			const result = validation.validate(context, "strict");

			// 3 WFH days = 2 office days = 40% < 80% required = not compliant
			expect(result.isValid).toBe(false);
		});
	});

	describe("validate() - Average Mode", () => {
		it("should calculate rolling window compliance in average mode", () => {
			const validation = new RollingPeriodValidation();

			// Create context with partial selections
			const context = {
				selectedDays: [
					{ year: 2025, month: 0, day: 6, type: "out-of-office" },
					{ year: 2025, month: 0, day: 7, type: "out-of-office" },
				],
				config: {
					minOfficeDaysPerWeek: 3,
					totalWeekdaysPerWeek: 5,
					rollingPeriodWeeks: 12,
					thresholdPercentage: 0.6,
					debug: false,
				},
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

			// Create selections for 10 weeks with high WFH days
			// Need enough weeks with low office days to bring average below 60%
			const selections = [];
			for (let week = 0; week < 10; week++) {
				for (let day = 0; day < 4; day++) {
					selections.push({
						year: 2025,
						month: 0,
						day: 6 + week * 7 + day,
						type: "out-of-office",
					});
				}
			}

			const context = {
				selectedDays: selections,
				config: {
					minOfficeDaysPerWeek: 3,
					totalWeekdaysPerWeek: 5,
					rollingPeriodWeeks: 12,
					thresholdPercentage: 0.6,
					debug: false,
				},
				calendarStartDate: new Date(2025, 0, 1),
				calendarEndDate: new Date(2025, 2, 31),
			};

			const result = validation.validate(context, "average");

			// 10 weeks with 4 WFH days = 10 office days
			// 2 weeks with 0 WFH days = 10 office days
			// Total = 20 office days / 60 weekdays = 33.33% < 60%
			expect(result.isValid).toBe(false);
		});

		it("should include windowResults in average mode", () => {
			const validation = new RollingPeriodValidation();

			const context = {
				selectedDays: [{ year: 2025, month: 0, day: 6, type: "out-of-office" }],
				config: {
					minOfficeDaysPerWeek: 3,
					totalWeekdaysPerWeek: 5,
					rollingPeriodWeeks: 12,
					thresholdPercentage: 0.6,
					debug: false,
				},
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

			const weekStart = new Date(2025, 0, 5); // Sunday
			const context = {
				selectedDays: [{ year: 2025, month: 0, day: 6, type: "out-of-office" }], // Monday Jan 6
				config: {
					minOfficeDaysPerWeek: 3,
					totalWeekdaysPerWeek: 5,
					rollingPeriodWeeks: 12,
					thresholdPercentage: 0.6,
					debug: false,
				},
			};

			const compliance = validation.getWeekCompliance(
				weekStart,
				context,
				"strict",
			);

			expect(compliance.weekStart).toEqual(weekStart);
			expect(compliance.totalDays).toBe(5);
			expect(compliance.workFromHomeDays).toBe(1);
			expect(compliance.officeDays).toBe(4);
			expect(compliance.percentage).toBe(80);
			expect(compliance.isCompliant).toBe(true);
		});

		it("should return non-compliant for weeks with too many WFH days", () => {
			const validation = new RollingPeriodValidation();

			const weekStart = new Date(2025, 0, 5); // Sunday
			const context = {
				selectedDays: [
					{ year: 2025, month: 0, day: 6, type: "out-of-office" },
					{ year: 2025, month: 0, day: 7, type: "out-of-office" },
					{ year: 2025, month: 0, day: 8, type: "out-of-office" },
				],
				config: {
					minOfficeDaysPerWeek: 3,
					totalWeekdaysPerWeek: 5,
					rollingPeriodWeeks: 12,
					thresholdPercentage: 0.6,
					debug: false,
				},
			};

			const compliance = validation.getWeekCompliance(
				weekStart,
				context,
				"strict",
			);

			expect(compliance.workFromHomeDays).toBe(3);
			expect(compliance.officeDays).toBe(2);
			expect(compliance.percentage).toBe(40);
			expect(compliance.isCompliant).toBe(false);
		});

		it("should handle custom configuration", () => {
			const validation = new RollingPeriodValidation();

			const weekStart = new Date(2025, 0, 5); // Sunday
			const context = {
				selectedDays: [
					{ year: 2025, month: 0, day: 6, type: "out-of-office" },
					{ year: 2025, month: 0, day: 7, type: "out-of-office" },
				],
				config: {
					minOfficeDaysPerWeek: 3,
					totalWeekdaysPerWeek: 5,
					rollingPeriodWeeks: 12,
					thresholdPercentage: 0.8, // Require 80% = 4 office days
					debug: false,
				},
			};

			const compliance = validation.getWeekCompliance(
				weekStart,
				context,
				"strict",
			);

			// 2 WFH days = 3 office days = 60% < 80% required = not compliant
			expect(compliance.isCompliant).toBe(false);
		});
	});

	describe("getWindowCompliance()", () => {
		it("should return compliance for a multi-week window", () => {
			const validation = new RollingPeriodValidation();

			const context = {
				selectedDays: [
					{ year: 2025, month: 0, day: 6, type: "out-of-office" },
					{ year: 2025, month: 0, day: 7, type: "out-of-office" },
				],
				config: {
					minOfficeDaysPerWeek: 3,
					totalWeekdaysPerWeek: 5,
					rollingPeriodWeeks: 12,
					thresholdPercentage: 0.6,
					debug: false,
				},
			};

			// First call validate to initialize the week start
			validation.validate(context, "average");

			// Now we can call getWindowCompliance
			const windowCompliance = validation.getWindowCompliance(
				0,
				12,
				context,
				"average",
			);

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
						type: "out-of-office",
					});
				}
			}

			const context = {
				selectedDays: selections,
				config: {
					minOfficeDaysPerWeek: 3,
					totalWeekdaysPerWeek: 5,
					rollingPeriodWeeks: 12,
					thresholdPercentage: 0.6,
					debug: false,
				},
			};

			const windowCompliance = validation.getWindowCompliance(
				0,
				12,
				context,
				"average",
			);

			// 2 WFH days per week = 3 office days per week = 60% = compliant
			expect(windowCompliance.isCompliant).toBe(true);
			expect(windowCompliance.averageOfficeDaysPerWeek).toBe(3);
			expect(windowCompliance.compliancePercentage).toBe(60);
		});
	});

	describe("reset()", () => {
		// This test is no longer applicable as the implementation has changed
		// The cache and weekStart are now internal to the strategy classes
		it.skip("should clear internal state", () => {
			// Cache and weekStart are now internal to the strategy classes and not exposed
		});
	});

	describe("isApplicable()", () => {
		it("should return true when selections exist", () => {
			const validation = new RollingPeriodValidation();

			const context = {
				selectedDays: [{ year: 2025, month: 0, day: 6, type: "out-of-office" }],
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
				selectedDays: undefined,
			} as any;

			expect(validation.isApplicable(context)).toBe(false);
		});
	});

	// These private helper methods are now internal to the strategy classes
	// and no longer accessible from the main RollingPeriodValidation class
	it.skip("Private Helper Methods", () => {
		// These methods are now internal to the strategy classes and not exposed
	});

	describe("Edge Cases and Error Handling", () => {
		it("should handle dates in different months", () => {
			const validation = new RollingPeriodValidation();

			const context = {
				selectedDays: [
					{ year: 2025, month: 0, day: 27, type: "out-of-office" }, // Late January
					{ year: 2025, month: 1, day: 3, type: "out-of-office" }, // Early February
				],
				config: {
					minOfficeDaysPerWeek: 3,
					totalWeekdaysPerWeek: 5,
					rollingPeriodWeeks: 12,
					thresholdPercentage: 0.6,
					debug: false,
				},
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
					{ year: 2024, month: 1, day: 28, type: "out-of-office" }, // Feb 28
					{ year: 2024, month: 1, day: 29, type: "out-of-office" }, // Feb 29 (leap day)
				],
				config: {
					minOfficeDaysPerWeek: 3,
					totalWeekdaysPerWeek: 5,
					rollingPeriodWeeks: 12,
					thresholdPercentage: 0.6,
					debug: false,
				},
			};

			const result = validation.validate(context);

			expect(result).toBeDefined();
			expect(result.isValid).toBeDefined();
		});

		it("should handle year boundary crossings", () => {
			const validation = new RollingPeriodValidation();

			const context = {
				selectedDays: [
					{ year: 2024, month: 11, day: 30, type: "out-of-office" }, // Dec 30
					{ year: 2025, month: 0, day: 2, type: "out-of-office" }, // Jan 2
				],
				config: {
					minOfficeDaysPerWeek: 3,
					totalWeekdaysPerWeek: 5,
					rollingPeriodWeeks: 12,
					thresholdPercentage: 0.6,
					debug: false,
				},
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
					{ year: 2025, month: 0, day: 6, type: "out-of-office" }, // Monday
					{ year: 2025, month: 0, day: 7, type: "out-of-office" }, // Tuesday
					{ year: 2025, month: 0, day: 8, type: "out-of-office" }, // Wednesday
				],
				config: {
					minOfficeDaysPerWeek: 3,
					totalWeekdaysPerWeek: 5,
					rollingPeriodWeeks: 12,
					thresholdPercentage: 0.6,
					debug: false,
				},
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
