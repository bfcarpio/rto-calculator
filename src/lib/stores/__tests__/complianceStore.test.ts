import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ComplianceEventData } from "../../auto-compliance";
import { complianceStore, onComplianceChange } from "../complianceStore";

// Minimal mock for testing
const mockComplianceData: ComplianceEventData = {
	selectedSummary: {
		windowIndex: 0,
		isValid: true,
		isCompliant: true,
		weekDetails: [],
		totalOfficeDays: 0,
		requiredDays: 3,
	},
	bestWeekCount: 0,
	averageOfficeDays: 0,
	goodWeeks: 0,
	bufferWeeks: 0,
	nextWfhWeek: null,
	currentWeek: {
		weekStart: new Date(2025, 2, 23),
		weekEnd: new Date(2025, 2, 28),
		officeDays: 3,
	},
	totalWfhDays: 0,
	totalHolidayDays: 0,
	totalSickDays: 0,
	totalWorkingDays: 5,
	isCompliant: true,
	compliancePercentage: 100,
	message: "test",
	rangeLabel: "Mar 23 - Mar 28",
	roundPercentage: false,
	totalWeeks: 1,
	requiredDays: 3,
	allSummaries: [],
	policy: {
		rollingWindowWeeks: 12,
		bestWeeksCount: 4,
		requiredDaysPerWeek: 3,
	},
} as unknown as ComplianceEventData;

describe("complianceStore", () => {
	beforeEach(() => {
		complianceStore.set(null);
	});

	it("should start as null", () => {
		expect(complianceStore.get()).toBeNull();
	});

	it("should set and get compliance data", () => {
		complianceStore.set(mockComplianceData);
		expect(complianceStore.get()).toBe(mockComplianceData);
	});

	it("should notify subscribers on change", () => {
		const callback = vi.fn();
		complianceStore.subscribe(callback);
		callback.mockClear(); // nanostores fires immediately on subscribe
		complianceStore.set(mockComplianceData);
		// Nanostores subscribe passes extra args beyond the value
		const lastCall = callback.mock.calls.at(-1);
		expect(lastCall?.[0]).toBe(mockComplianceData);
	});

	it("should unsubscribe correctly", () => {
		const callback = vi.fn();
		const unsub = complianceStore.subscribe(callback);
		unsub();
		complianceStore.set(mockComplianceData);
		expect(callback).not.toHaveBeenCalledWith(mockComplianceData);
	});
});

describe("onComplianceChange", () => {
	beforeEach(() => {
		complianceStore.set(null);
	});

	it("should invoke callback when compliance data changes from null", () => {
		const callback = vi.fn();
		onComplianceChange(callback);
		complianceStore.set(mockComplianceData);
		expect(callback).toHaveBeenCalledWith(mockComplianceData);
	});

	it("should not invoke callback when set to null", () => {
		const callback = vi.fn();
		onComplianceChange(callback);
		complianceStore.set(null);
		expect(callback).not.toHaveBeenCalled();
	});

	it("should not invoke callback when same reference is set again", () => {
		complianceStore.set(mockComplianceData);
		const callback = vi.fn();
		onComplianceChange(callback);
		callback.mockClear(); // nanostores fires immediately on subscribe
		complianceStore.set(mockComplianceData); // same reference
		expect(callback).not.toHaveBeenCalled();
	});

	it("should invoke callback when reference changes", () => {
		complianceStore.set(mockComplianceData);
		const callback = vi.fn();
		onComplianceChange(callback);
		const newData = { ...mockComplianceData, message: "updated" };
		complianceStore.set(newData);
		expect(callback).toHaveBeenCalledWith(newData);
	});
});
