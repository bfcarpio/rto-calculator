/**
 * Week Compliance & DOM Adapter Tests
 *
 * Tests for: calculateWeekCompliance, getWeekCompliance, elementToDaySelection.
 * Covers compliance calculation logic and DOM-to-selection conversion.
 */

import { describe, expect, it, test } from "vitest";
import { elementToDaySelection } from "../../../../lib/dom-adapters";
import {
	calculateWeekCompliance,
	createDaySelection,
	type DaySelection,
	DEFAULT_RTO_POLICY,
	getWeekCompliance,
	type RTOPolicyConfig,
} from "../../../../lib/validation/rto-core";

describe("calculateWeekCompliance", () => {
	it("should mark week as compliant with >=3 office days", () => {
		const weekStart = new Date(2025, 0, 5); // Sunday, Jan 5
		const weeksByOOF = new Map<number, number>();
		weeksByOOF.set(new Date(2025, 0, 5).getTime(), 2); // 2 OOF days = 3 office days

		const result = calculateWeekCompliance(1, weekStart, weeksByOOF);

		expect(result.isCompliant).toBe(true);
		expect(result.oofDays).toBe(2);
		expect(result.wfhDays).toBe(2);
		expect(result.officeDays).toBe(3);
	});

	it("should mark week as non-compliant with <3 office days", () => {
		const weekStart = new Date(2025, 0, 5); // Sunday, Jan 5
		const weeksByOOF = new Map<number, number>();
		weeksByOOF.set(new Date(2025, 0, 5).getTime(), 3); // 3 OOF days = 2 office days

		const result = calculateWeekCompliance(1, weekStart, weeksByOOF);

		expect(result.isCompliant).toBe(false);
		expect(result.oofDays).toBe(3);
		expect(result.wfhDays).toBe(3);
		expect(result.officeDays).toBe(2);
	});

	it("should use custom policy configuration", () => {
		const customPolicy: RTOPolicyConfig = {
			...DEFAULT_RTO_POLICY,
			minOfficeDaysPerWeek: 4, // Stricter requirement
		};

		const weekStart = new Date(2025, 0, 5); // Sunday, Jan 5
		const weeksByOOF = new Map<number, number>();
		weeksByOOF.set(new Date(2025, 0, 5).getTime(), 3); // 3 OOF days

		const result = calculateWeekCompliance(
			1,
			weekStart,
			weeksByOOF,
			customPolicy,
		);

		expect(result.isCompliant).toBe(false); // 3 < 4, so not compliant
		expect(result.oofDays).toBe(3);
	});

	it("should return week number and dates", () => {
		const weekStart = new Date(2025, 0, 5); // Sunday, Jan 5
		const weeksByOOF = new Map<number, number>();
		weeksByOOF.set(new Date(2025, 0, 5).getTime(), 3);

		const result = calculateWeekCompliance(5, weekStart, weeksByOOF);

		expect(result.weekNumber).toBe(5);
		expect(result.weekStart).toEqual(weekStart);
		expect(result.totalDays).toBe(5);
	});
});

describe("getWeekCompliance", () => {
	it("should return compliance data for specific week", () => {
		const selections: DaySelection[] = [
			createDaySelection(2025, 0, 6, "out-of-office"),
			createDaySelection(2025, 0, 7, "out-of-office"),
		];

		const weekStart = new Date(2025, 0, 5); // Sunday, Jan 5
		const result = getWeekCompliance(weekStart, selections);

		expect(result.isCompliant).toBe(true);
		expect(result.oofDays).toBe(2);
		expect(result.wfhDays).toBe(2);
		expect(result.officeDays).toBe(3);
	});
});

describe("elementToDaySelection", () => {
	it("should convert valid DOM element to selection", () => {
		const mockElement = {
			dataset: {
				year: "2025",
				month: "0",
				day: "6",
				selectionType: "out-of-office",
			},
		} as unknown as HTMLElement;

		const result = elementToDaySelection(mockElement);

		expect(result).not.toBeNull();
		expect(result?.date).toEqual(new Date(2025, 0, 6));
		expect(result?.selectionType).toBe("out-of-office");
	});

	test.each([
		{
			desc: "year",
			dataset: { month: "0", day: "6", selectionType: "out-of-office" },
		},
		{
			desc: "month",
			dataset: { year: "2025", day: "6", selectionType: "out-of-office" },
		},
		{
			desc: "day",
			dataset: { year: "2025", month: "0", selectionType: "out-of-office" },
		},
		{ desc: "all attributes (empty dataset)", dataset: {} },
	])("should return null for element without $desc", ({ dataset }) => {
		const mockElement = { dataset } as unknown as HTMLElement;
		const result = elementToDaySelection(mockElement);
		expect(result).toBeNull();
	});

	it("should handle missing selection type", () => {
		const mockElement = {
			dataset: {
				year: "2025",
				month: "0",
				day: "6",
				selectionType: "",
			},
		} as unknown as HTMLElement;

		const result = elementToDaySelection(mockElement);
		expect(result!.selectionType).toBe("none");
	});

	it("should handle empty dataset", () => {
		const mockElement = {
			dataset: {},
		} as unknown as HTMLElement;

		const result = elementToDaySelection(mockElement);
		expect(result).toBeNull();
	});
});
