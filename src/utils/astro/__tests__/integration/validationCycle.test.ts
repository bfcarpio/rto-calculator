/**
 * Validation Cycle Integration Tests
 *
 * Tests the full validation flow from day selection → validation → UI update.
 * Uses mocked DOM to simulate calendar interactions.
 *
 * @module validationCycle.test
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

// Import the modules we'll be testing
let validation: typeof import("../../../validation");
let dateUtils: typeof import("../../../dateUtils");

describe("Validation Cycle Integration", () => {
	beforeEach(async () => {
		vi.resetAllMocks();

		// Import modules fresh for each test
		validation = await import("../../../validation");
		dateUtils = await import("../../../dateUtils");
	});

	describe("Full Selection → Validation → UI Update Flow", () => {
		it("should validate selection and update week compliance", async () => {
			// Step 1: Create mock selected dates
			const selectedDates = new Set<string>(["2025-01-06", "2025-01-07"]); // Monday, Tuesday

			// Step 2: Get the week dates for validation
			const weekStart = dateUtils.getStartOfWeek(new Date(2025, 0, 6));
			const weekDates = dateUtils.getWeekDates(weekStart);

			// Step 3: Validate the week
			const weekData = validation.validateWeek(weekDates, selectedDates);

			// Verify: Week with 2 selected days should have 3 office days
			expect(weekData.officeDays).toBe(3); // 5 - 2 = 3
			expect(weekData.totalDays).toBe(5);
			expect(weekData.compliance).toBe(60); // 3/5 = 60%
			expect(weekData.violations).toHaveLength(0); // Compliant (>= 60%)
		});

		it("should detect violation when too many days selected", async () => {
			// Step 1: Create mock selected dates (3 days = 2 office days = 40%)
			const selectedDates = new Set<string>([
				"2025-01-06",
				"2025-01-07",
				"2025-01-08",
			]);

			// Step 2: Get the week dates for validation
			const weekStart = dateUtils.getStartOfWeek(new Date(2025, 0, 6));
			const weekDates = dateUtils.getWeekDates(weekStart);

			// Step 3: Validate the week
			const weekData = validation.validateWeek(weekDates, selectedDates);

			// Verify: Week with 3 selected days should have 2 office days (violation)
			expect(weekData.officeDays).toBe(2); // 5 - 3 = 2
			expect(weekData.compliance).toBe(40); // 2/5 = 40%
			expect(weekData.violations.length).toBeGreaterThan(0); // Has violations
		});

		it("should handle rolling period validation", async () => {
			// Step 1: Create mock selected dates across multiple weeks
			const selectedDates = new Set<string>([
				// Week 1: 2 selected days (3 office days = 60%)
				"2025-01-06",
				"2025-01-07",
				// Week 2: 1 selected day (4 office days = 80%)
				"2025-01-13",
				// Week 3-12: No selections (5 office days = 100%)
			]);

			// Step 2: Validate the rolling period
			const startDate = new Date(2025, 0, 1);
			const rollingData = validation.validateRollingPeriod(
				startDate,
				selectedDates,
				12, // 12-week period
				3, // Min 3 office days per week
			);

			// Verify: Should have 12 weeks of data
			expect(rollingData.weeks).toHaveLength(12);

			// Verify: Overall compliance should be high
			expect(rollingData.overallCompliance).toBeGreaterThan(60);
		});

		it("should update validation state when selection changes", async () => {
			// Initial state: No selections
			let selectedDates = new Set<string>([]);

			let weekStart = dateUtils.getStartOfWeek(new Date(2025, 0, 6));
			let weekDates = dateUtils.getWeekDates(weekStart);
			let weekData = validation.validateWeek(weekDates, selectedDates);

			// With no selections, 5 office days (100%)
			expect(weekData.officeDays).toBe(5);
			expect(weekData.compliance).toBe(100);

			// User adds a selection
			selectedDates = new Set<string>(["2025-01-06"]);

			weekStart = dateUtils.getStartOfWeek(new Date(2025, 0, 6));
			weekDates = dateUtils.getWeekDates(weekStart);
			weekData = validation.validateWeek(weekDates, selectedDates);

			// With 1 selection, 4 office days (80%)
			expect(weekData.officeDays).toBe(4);
			expect(weekData.compliance).toBe(80);

			// User adds another selection
			selectedDates = new Set<string>(["2025-01-06", "2025-01-07"]);

			weekStart = dateUtils.getStartOfWeek(new Date(2025, 0, 6));
			weekDates = dateUtils.getWeekDates(weekStart);
			weekData = validation.validateWeek(weekDates, selectedDates);

			// With 2 selections, 3 office days (60% - boundary)
			expect(weekData.officeDays).toBe(3);
			expect(weekData.compliance).toBe(60);

			// User adds a third selection (violation)
			selectedDates = new Set<string>([
				"2025-01-06",
				"2025-01-07",
				"2025-01-08",
			]);

			weekStart = dateUtils.getStartOfWeek(new Date(2025, 0, 6));
			weekDates = dateUtils.getWeekDates(weekStart);
			weekData = validation.validateWeek(weekDates, selectedDates);

			// With 3 selections, 2 office days (40% - violation)
			expect(weekData.officeDays).toBe(2);
			expect(weekData.compliance).toBe(40);
			expect(weekData.violations.length).toBeGreaterThan(0);
		});
	});

	describe("Affected Weeks Validation", () => {
		it("should validate all affected weeks when selection changes", async () => {
			// User selects a day in week 1
			const selectedDate = new Date(2025, 0, 6); // Monday of week 1

			// Get affected weeks
			const affectedWeeks = validation.validateAffectedWeeks(
				selectedDate,
				new Set<string>(["2025-01-06"]),
				12, // Rolling period length
				3, // Min office days
			);

			// Should validate at least the affected week
			expect(affectedWeeks.length).toBeGreaterThan(0);

			// First week should be the one with the selection
			expect(affectedWeeks[0]!.officeDays).toBe(4); // 5 - 1 = 4
		});

		it("should cascade validation to rolling period", async () => {
			// User selects a day
			const selectedDate = new Date(2025, 0, 6);
			const selectedDates = new Set<string>(["2025-01-06"]);

			// Get all affected weeks including rolling period
			const affectedWeeks = validation.validateAffectedWeeks(
				selectedDate,
				selectedDates,
				12,
				3,
			);

			// Should include the rolling period weeks
			expect(affectedWeeks.length).toBeGreaterThan(1);
		});
	});

	describe("Selection Validation", () => {
		it("should validate before adding selection", async () => {
			// Current selections
			const currentSelections = new Set<string>(["2025-01-06", "2025-01-07"]);

			// User wants to select another day
			const newDate = new Date(2025, 0, 8); // Wednesday

			// Validate the selection
			const validationResult = validation.validateSelection(
				newDate,
				currentSelections,
				3, // Min office days
			);

			// With 3 selected days = 2 office days = 40% (violation)
			expect(validationResult.isValid).toBe(false);
			expect(validationResult.message).toBeDefined();
		});

		it("should allow valid selection", async () => {
			// Current selections
			const currentSelections = new Set<string>(["2025-01-06"]);

			// User wants to select a weekday
			const newDate = new Date(2025, 0, 8); // Wednesday

			// Validate the selection
			const validationResult = validation.validateSelection(
				newDate,
				currentSelections,
				3, // Min office days
			);

			// With 2 selected days = 3 office days = 60% (compliant)
			expect(validationResult.isValid).toBe(true);
		});

		it("should skip validation for weekends", async () => {
			// User wants to select a Saturday
			const weekendDate = new Date(2025, 0, 4); // Saturday

			// Validate the selection
			const validationResult = validation.validateSelection(
				weekendDate,
				new Set<string>(),
				3,
			);

			// Weekends are always valid
			expect(validationResult.isValid).toBe(true);
		});

		it("should skip validation for past dates", async () => {
			// User wants to select a past date
			const pastDate = new Date(2020, 0, 1);

			// Validate the selection
			const validationResult = validation.validateSelection(
				pastDate,
				new Set<string>(),
				3,
			);

			// Past dates are always valid
			expect(validationResult.isValid).toBe(true);
		});
	});

	describe("Compliance Status Display", () => {
		it("should return correct status for different compliance levels", async () => {
			// 100% - Fully Compliant
			expect(validation.getComplianceStatus(100).status).toBe(
				"Fully Compliant",
			);

			// 85% - Mostly Compliant
			expect(validation.getComplianceStatus(85).status).toBe(
				"Mostly Compliant",
			);

			// 70% - Partially Compliant
			expect(validation.getComplianceStatus(70).status).toBe(
				"Partially Compliant",
			);

			// 50% - Non-Compliant
			expect(validation.getComplianceStatus(50).status).toBe("Non-Compliant");
		});

		it("should return correct color classes", async () => {
			const greenStatus = validation.getComplianceStatus(100);
			const yellowStatus = validation.getComplianceStatus(85);
			const orangeStatus = validation.getComplianceStatus(70);
			const redStatus = validation.getComplianceStatus(50);

			expect(greenStatus.colorClass).toContain("green");
			expect(yellowStatus.colorClass).toContain("yellow");
			expect(orangeStatus.colorClass).toContain("orange");
			expect(redStatus.colorClass).toContain("red");
		});
	});

	describe("All Weeks Validation", () => {
		it("should validate all weeks in the calendar", async () => {
			// Create mock calendar dates (12 weeks)
			const calendarDates: Date[] = [];
			const startDate = new Date(2025, 0, 6); // Monday, Jan 6

			for (let week = 0; week < 12; week++) {
				for (let day = 0; day < 5; day++) {
					const date = new Date(startDate);
					date.setDate(startDate.getDate() + week * 7 + day);
					calendarDates.push(date);
				}
			}

			// Select some days
			const selectedDates = new Set<string>([
				"2025-01-06", // Week 1, Monday
				"2025-01-07", // Week 1, Tuesday
			]);

			// Validate all weeks
			const allWeeksData = validation.validateAllWeeks(
				calendarDates,
				selectedDates,
				3, // Min office days
			);

			// Should have 12 weeks of data
			expect(allWeeksData.length).toBe(12);

			// First week should have fewer office days due to selections
			expect(allWeeksData[0]!.officeDays).toBe(3);

			// Later weeks should have full office days
			expect(allWeeksData[1]!.officeDays).toBe(5);
		});
	});

	describe("Day Validation", () => {
		it("should validate individual days", async () => {
			// Weekday should be valid
			const weekdayResult = validation.validateDay({
				date: new Date(2025, 0, 6),
				isOfficeDay: true,
				isValid: true,
			});
			expect(weekdayResult.isValid).toBe(true);

			// Weekend should be valid (non-office by default)
			const weekendResult = validation.validateDay({
				date: new Date(2025, 0, 4),
				isOfficeDay: false,
				isValid: true,
			});
			expect(weekendResult.isValid).toBe(true);

			// Past date should be valid
			const pastResult = validation.validateDay({
				date: new Date(2020, 0, 1),
				isOfficeDay: true,
				isValid: true,
			});
			expect(pastResult.isValid).toBe(true);
		});
	});

	describe("Date Utilities Integration", () => {
		it("should correctly identify weekday vs weekend", async () => {
			// Test various dates
			const testCases = [
				{ date: new Date(2025, 0, 6), expectedWeekday: true }, // Monday
				{ date: new Date(2025, 0, 7), expectedWeekday: true }, // Tuesday
				{ date: new Date(2025, 0, 8), expectedWeekday: true }, // Wednesday
				{ date: new Date(2025, 0, 9), expectedWeekday: true }, // Thursday
				{ date: new Date(2025, 0, 10), expectedWeekday: true }, // Friday
				{ date: new Date(2025, 0, 4), expectedWeekday: false }, // Saturday
				{ date: new Date(2025, 0, 5), expectedWeekday: false }, // Sunday
			];

			for (const { date, expectedWeekday } of testCases) {
				expect(dateUtils.isWeekday(date)).toBe(expectedWeekday);
				expect(dateUtils.isWeekend(date)).toBe(!expectedWeekday);
			}
		});

		it("should correctly calculate week start", async () => {
			// Monday should return itself
			const monday = new Date(2025, 0, 6);
			expect(dateUtils.getStartOfWeek(monday).getDay()).toBe(1);

			// Friday should return previous Monday
			const friday = new Date(2025, 0, 10);
			const weekStart = dateUtils.getStartOfWeek(friday);
			expect(weekStart.getDay()).toBe(1);
			expect(weekStart.getDate()).toBe(6);
		});

		it("should correctly generate week dates", async () => {
			const weekStart = new Date(2025, 0, 6); // Monday
			const weekDates = dateUtils.getWeekDates(weekStart);

			expect(weekDates).toHaveLength(5);
			expect(weekDates[0]!.getDate()).toBe(6); // Monday
			expect(weekDates[1]!.getDate()).toBe(7); // Tuesday
			expect(weekDates[2]!.getDate()).toBe(8); // Wednesday
			expect(weekDates[3]!.getDate()).toBe(9); // Thursday
			expect(weekDates[4]!.getDate()).toBe(10); // Friday
		});
	});
});
