/**
 * Rounding Behavior Tests
 *
 * Tests for: roundToNearest20Percent and validateTopKWeeks rounding integration.
 */

import { describe, expect, it, test } from "vitest";
import {
	createDaySelection,
	type DaySelection,
	DEFAULT_RTO_POLICY,
	type RTOPolicyConfig,
	roundToNearest20Percent,
	validateTopKWeeks,
} from "../../../../lib/validation/rto-core";

describe("roundToNearest20Percent", () => {
	test.each([
		[57.5, 60],
		[57.4, 60],
		[55, 60],
		[54, 60],
		[45, 40],
		[35, 40],
		[25, 20],
		[75, 80],
		[74, 80],
		[0, 0],
		[100, 100],
	])("rounds %s to %i", (input, expected) => {
		expect(roundToNearest20Percent(input)).toBe(expected);
	});
});

describe("validateTopKWeeks - Rounding Behavior", () => {
	it("returns rounded percentage when roundPercentage is true", () => {
		const simpleSelections: DaySelection[] = [
			// Week 1: 3 WFH = 2 office days
			createDaySelection(2025, 0, 6, "out-of-office"),
			createDaySelection(2025, 0, 7, "out-of-office"),
			createDaySelection(2025, 0, 8, "out-of-office"),
			// Week 2: 3 WFH = 2 office days
			createDaySelection(2025, 0, 13, "out-of-office"),
			createDaySelection(2025, 0, 14, "out-of-office"),
			createDaySelection(2025, 0, 15, "out-of-office"),
			// Week 3: 3 WFH = 2 office days
			createDaySelection(2025, 0, 20, "out-of-office"),
			createDaySelection(2025, 0, 21, "out-of-office"),
			createDaySelection(2025, 0, 22, "out-of-office"),
			// Week 4: 3 WFH = 2 office days
			createDaySelection(2025, 0, 27, "out-of-office"),
			createDaySelection(2025, 0, 28, "out-of-office"),
			createDaySelection(2025, 0, 29, "out-of-office"),
			// Week 5: 3 WFH = 2 office days
			createDaySelection(2025, 1, 3, "out-of-office"),
			createDaySelection(2025, 1, 4, "out-of-office"),
			createDaySelection(2025, 1, 5, "out-of-office"),
			// Week 6: 3 WFH = 2 office days
			createDaySelection(2025, 1, 10, "out-of-office"),
			createDaySelection(2025, 1, 11, "out-of-office"),
			createDaySelection(2025, 1, 12, "out-of-office"),
			// Week 7: 3 WFH = 2 office days
			createDaySelection(2025, 1, 17, "out-of-office"),
			createDaySelection(2025, 1, 18, "out-of-office"),
			createDaySelection(2025, 1, 19, "out-of-office"),
			// Week 8: 2 WFH = 3 office days (best week)
			createDaySelection(2025, 1, 24, "out-of-office"),
			createDaySelection(2025, 1, 25, "out-of-office"),
			// Add more weeks with high office days so they get selected
			// Week 9: 0 WFH = 5 office days
			createDaySelection(2025, 2, 3, "out-of-office"),
			createDaySelection(2025, 2, 4, "out-of-office"),
			createDaySelection(2025, 2, 5, "out-of-office"),
			createDaySelection(2025, 2, 6, "out-of-office"),
			createDaySelection(2025, 2, 7, "out-of-office"),
			// Week 10: 0 WFH = 5 office days
			createDaySelection(2025, 2, 10, "out-of-office"),
			createDaySelection(2025, 2, 11, "out-of-office"),
			createDaySelection(2025, 2, 12, "out-of-office"),
			createDaySelection(2025, 2, 13, "out-of-office"),
			createDaySelection(2025, 2, 14, "out-of-office"),
			// Week 11: 0 WFH = 5 office days
			createDaySelection(2025, 2, 17, "out-of-office"),
			createDaySelection(2025, 2, 18, "out-of-office"),
			createDaySelection(2025, 2, 19, "out-of-office"),
			createDaySelection(2025, 2, 20, "out-of-office"),
			createDaySelection(2025, 2, 21, "out-of-office"),
			// Week 12: 0 WFH = 5 office days
			createDaySelection(2025, 2, 24, "out-of-office"),
			createDaySelection(2025, 2, 25, "out-of-office"),
			createDaySelection(2025, 2, 26, "out-of-office"),
			createDaySelection(2025, 2, 27, "out-of-office"),
			createDaySelection(2025, 2, 28, "out-of-office"),
		];

		const calendarStartDate = new Date(2025, 0, 1);
		const policy: RTOPolicyConfig = {
			...DEFAULT_RTO_POLICY,
			roundPercentage: true,
		};

		const result = validateTopKWeeks(
			simpleSelections,
			calendarStartDate,
			policy,
		);
		// With this setup, the 8 weeks with lowest office days are selected
		// 7 weeks with 2 office + 1 week with 3 office = 17 office / 40 = 42.5% -> rounds to 40%
		// This test verifies rounding from 42.5% to 40%
		expect(result.averageOfficePercentage).toBe(40);
	});

	it("returns raw percentage when roundPercentage is false", () => {
		const simpleSelections: DaySelection[] = [
			// Week 1-7: 3 WFH = 2 office days each
			createDaySelection(2025, 0, 6, "out-of-office"),
			createDaySelection(2025, 0, 7, "out-of-office"),
			createDaySelection(2025, 0, 8, "out-of-office"),
			createDaySelection(2025, 0, 13, "out-of-office"),
			createDaySelection(2025, 0, 14, "out-of-office"),
			createDaySelection(2025, 0, 15, "out-of-office"),
			createDaySelection(2025, 0, 20, "out-of-office"),
			createDaySelection(2025, 0, 21, "out-of-office"),
			createDaySelection(2025, 0, 22, "out-of-office"),
			createDaySelection(2025, 0, 27, "out-of-office"),
			createDaySelection(2025, 0, 28, "out-of-office"),
			createDaySelection(2025, 0, 29, "out-of-office"),
			createDaySelection(2025, 1, 3, "out-of-office"),
			createDaySelection(2025, 1, 4, "out-of-office"),
			createDaySelection(2025, 1, 5, "out-of-office"),
			createDaySelection(2025, 1, 10, "out-of-office"),
			createDaySelection(2025, 1, 11, "out-of-office"),
			createDaySelection(2025, 1, 12, "out-of-office"),
			createDaySelection(2025, 1, 17, "out-of-office"),
			createDaySelection(2025, 1, 18, "out-of-office"),
			createDaySelection(2025, 1, 19, "out-of-office"),
			// Week 8: 2 WFH = 3 office days
			createDaySelection(2025, 1, 24, "out-of-office"),
			createDaySelection(2025, 1, 25, "out-of-office"),
			// Add better weeks so they get selected
			// Week 9-12: 0 WFH = 5 office days each
			createDaySelection(2025, 2, 3, "out-of-office"),
			createDaySelection(2025, 2, 4, "out-of-office"),
			createDaySelection(2025, 2, 5, "out-of-office"),
			createDaySelection(2025, 2, 6, "out-of-office"),
			createDaySelection(2025, 2, 7, "out-of-office"),
			createDaySelection(2025, 2, 10, "out-of-office"),
			createDaySelection(2025, 2, 11, "out-of-office"),
			createDaySelection(2025, 2, 12, "out-of-office"),
			createDaySelection(2025, 2, 13, "out-of-office"),
			createDaySelection(2025, 2, 14, "out-of-office"),
			createDaySelection(2025, 2, 17, "out-of-office"),
			createDaySelection(2025, 2, 18, "out-of-office"),
			createDaySelection(2025, 2, 19, "out-of-office"),
			createDaySelection(2025, 2, 20, "out-of-office"),
			createDaySelection(2025, 2, 21, "out-of-office"),
			createDaySelection(2025, 2, 24, "out-of-office"),
			createDaySelection(2025, 2, 25, "out-of-office"),
			createDaySelection(2025, 2, 26, "out-of-office"),
			createDaySelection(2025, 2, 27, "out-of-office"),
			createDaySelection(2025, 2, 28, "out-of-office"),
		];

		const calendarStartDate = new Date(2025, 0, 1);
		const policy: RTOPolicyConfig = {
			...DEFAULT_RTO_POLICY,
			roundPercentage: false,
		};

		const result = validateTopKWeeks(
			simpleSelections,
			calendarStartDate,
			policy,
		);
		// Selected weeks: 7 with 2 office + 1 with 3 office = 17/40 = 42.5%
		expect(result.averageOfficePercentage).toBeCloseTo(42.5, 1);
	});

	it("defaults to rounding when roundPercentage is undefined", () => {
		const simpleSelections: DaySelection[] = [
			// Week 1-7: 3 WFH = 2 office days each
			createDaySelection(2025, 0, 6, "out-of-office"),
			createDaySelection(2025, 0, 7, "out-of-office"),
			createDaySelection(2025, 0, 8, "out-of-office"),
			createDaySelection(2025, 0, 13, "out-of-office"),
			createDaySelection(2025, 0, 14, "out-of-office"),
			createDaySelection(2025, 0, 15, "out-of-office"),
			createDaySelection(2025, 0, 20, "out-of-office"),
			createDaySelection(2025, 0, 21, "out-of-office"),
			createDaySelection(2025, 0, 22, "out-of-office"),
			createDaySelection(2025, 0, 27, "out-of-office"),
			createDaySelection(2025, 0, 28, "out-of-office"),
			createDaySelection(2025, 0, 29, "out-of-office"),
			createDaySelection(2025, 1, 3, "out-of-office"),
			createDaySelection(2025, 1, 4, "out-of-office"),
			createDaySelection(2025, 1, 5, "out-of-office"),
			createDaySelection(2025, 1, 10, "out-of-office"),
			createDaySelection(2025, 1, 11, "out-of-office"),
			createDaySelection(2025, 1, 12, "out-of-office"),
			createDaySelection(2025, 1, 17, "out-of-office"),
			createDaySelection(2025, 1, 18, "out-of-office"),
			createDaySelection(2025, 1, 19, "out-of-office"),
			// Week 8: 2 WFH = 3 office days
			createDaySelection(2025, 1, 24, "out-of-office"),
			createDaySelection(2025, 1, 25, "out-of-office"),
			// Add better weeks so they get selected
			createDaySelection(2025, 2, 3, "out-of-office"),
			createDaySelection(2025, 2, 4, "out-of-office"),
			createDaySelection(2025, 2, 5, "out-of-office"),
			createDaySelection(2025, 2, 6, "out-of-office"),
			createDaySelection(2025, 2, 7, "out-of-office"),
			createDaySelection(2025, 2, 10, "out-of-office"),
			createDaySelection(2025, 2, 11, "out-of-office"),
			createDaySelection(2025, 2, 12, "out-of-office"),
			createDaySelection(2025, 2, 13, "out-of-office"),
			createDaySelection(2025, 2, 14, "out-of-office"),
			createDaySelection(2025, 2, 17, "out-of-office"),
			createDaySelection(2025, 2, 18, "out-of-office"),
			createDaySelection(2025, 2, 19, "out-of-office"),
			createDaySelection(2025, 2, 20, "out-of-office"),
			createDaySelection(2025, 2, 21, "out-of-office"),
			createDaySelection(2025, 2, 24, "out-of-office"),
			createDaySelection(2025, 2, 25, "out-of-office"),
			createDaySelection(2025, 2, 26, "out-of-office"),
			createDaySelection(2025, 2, 27, "out-of-office"),
			createDaySelection(2025, 2, 28, "out-of-office"),
		];

		const calendarStartDate = new Date(2025, 0, 1);
		const policy: RTOPolicyConfig = {
			...DEFAULT_RTO_POLICY,
		};

		const result = validateTopKWeeks(
			simpleSelections,
			calendarStartDate,
			policy,
		);
		// Default rounding: 42.5% -> 40%
		expect(result.averageOfficePercentage).toBe(40);
	});
});
