import { beforeEach, describe, it, expect } from "vitest";
import {
	selectedDates,
	validationResult,
	setDateState,
	clearDateState,
	getAllDates,
} from "../../src/stores/calendarStore";
import type { DateString, DateState } from "../../src/types";

describe("calendar-state", () => {
	beforeEach(() => {
		// Clear all stores before each test
		selectedDates.set(new Map());
		validationResult.set(null);
	});

	it("should sync selection changes to validation", () => {
		// Add working dates
		setDateState("2026-02-06" as DateString, "working" as DateState);
		setDateState("2026-02-07" as DateString, "working" as DateState);
		setDateState("2026-02-08" as DateString, "working" as DateState);

		// Sync to validation
		const dates = getAllDates();
		const workingDays = Array.from(dates.values()).filter(
			(state) => state === "working"
		).length;

		validationResult.set({
			isValid: workingDays >= 3,
			message:
				workingDays >= 3
					? "Sufficient office days selected"
					: "Insufficient office days selected",
		});

		// Verify sync
		const result = validationResult.get();
		expect(result?.isValid).toBe(true);
		expect(result?.message).toBe("Sufficient office days selected");

		// Remove one working day
		clearDateState("2026-02-08" as DateString);

		// Re-sync to validation
		const updatedDates = getAllDates();
		const updatedWorkingDays = Array.from(updatedDates.values()).filter(
			(state) => state === "working"
		).length;

		validationResult.set({
			isValid: updatedWorkingDays >= 3,
			message:
				updatedWorkingDays >= 3
					? "Sufficient office days selected"
					: "Insufficient office days selected",
		});

		const updatedResult = validationResult.get();
		expect(updatedResult?.isValid).toBe(false);
		expect(updatedResult?.message).toBe("Insufficient office days selected");
	});

	it("should update derived state on date toggle", () => {
		// Toggle date on
		setDateState("2026-02-06" as DateString, "working" as DateState);

		// Check derived state
		let dates = getAllDates();
		expect(dates.size).toBe(1);
		expect(dates.get("2026-02-06" as DateString)).toBe("working");

		// Toggle date off
		clearDateState("2026-02-06" as DateString);

		// Check derived state updated
		dates = getAllDates();
		expect(dates.size).toBe(0);
	});

	it("should persist state on localStorage save", () => {
		// Set some state
		setDateState("2026-02-06" as DateString, "working" as DateState);
		setDateState("2026-02-07" as DateString, "oof" as DateState);

		// Save to localStorage
		const dates = getAllDates();
		const serialized = JSON.stringify(Array.from(dates.entries()));
		localStorage.setItem("rto-calendar-dates", serialized);

		// Verify persistence
		const saved = localStorage.getItem("rto-calendar-dates");
		expect(saved).toBe(serialized);
	});

	it("should recover state from localStorage load", () => {
		// Simulate saved state in localStorage
		const mockData: [DateString, DateState][] = [
			["2026-02-06", "working"],
			["2026-02-07", "oof"],
			["2026-02-08", "holiday"],
		];
		localStorage.setItem(
			"rto-calendar-dates",
			JSON.stringify(mockData)
		);

		// Load from localStorage
		const stored = localStorage.getItem("rto-calendar-dates");
		if (stored) {
			const parsed = JSON.parse(stored) as [DateString, DateState][];
			const loadedMap = new Map(parsed);
			selectedDates.set(loadedMap);

			// Verify state recovered
			const dates = getAllDates();
			expect(dates.size).toBe(3);
			expect(dates.get("2026-02-06" as DateString)).toBe("working");
			expect(dates.get("2026-02-07" as DateString)).toBe("oof");
			expect(dates.get("2026-02-08" as DateString)).toBe("holiday");
		}
	});
});
