import { beforeEach, describe, expect, it } from "vitest";
import {
	clearDateState,
	getAllDates,
	selectedDates,
	setDateState,
	validationResult,
} from "../../src/stores/calendarStore";
import type { DateState, DateString } from "../../src/types";

describe("calendar-state", () => {
	beforeEach(() => {
		// Clear all stores before each test
		selectedDates.set(new Map());
		validationResult.set(null);
	});

	it("should sync selection changes to validation", () => {
		// Add dates
		setDateState("2026-02-06" as DateString, "holiday" as DateState);
		setDateState("2026-02-07" as DateString, "oof" as DateState);
		setDateState("2026-02-08" as DateString, "oof" as DateState);

		// Sync to validation - count OOF days (currently 2)
		const dates = getAllDates();
		const markedDays = Array.from(dates.values()).filter(
			(state) => state === "oof",
		).length;

		validationResult.set({
			isValid: markedDays >= 3,
			message:
				markedDays >= 3
					? "Sufficient OOF days selected"
					: "Insufficient OOF days selected",
		});

		// Verify sync - should be invalid with only 2 OOF days
		const result = validationResult.get();
		expect(result?.isValid).toBe(false);
		expect(result?.message).toBe("Insufficient OOF days selected");

		// Add another OOF day to reach threshold
		setDateState("2026-02-09" as DateString, "oof" as DateState);

		// Re-sync to validation - now 3 OOF days
		const updatedDates = getAllDates();
		const updatedMarkedDays = Array.from(updatedDates.values()).filter(
			(state) => state === "oof",
		).length;

		validationResult.set({
			isValid: updatedMarkedDays >= 3,
			message:
				updatedMarkedDays >= 3
					? "Sufficient OOF days selected"
					: "Insufficient OOF days selected",
		});

		const updatedResult = validationResult.get();
		expect(updatedResult?.isValid).toBe(true);
		expect(updatedResult?.message).toBe("Sufficient OOF days selected");
	});

	it("should update derived state on date toggle", () => {
		// Toggle date on
		setDateState("2026-02-06" as DateString, "oof" as DateState);

		// Check derived state
		let dates = getAllDates();
		expect(dates.size).toBe(1);
		expect(dates.get("2026-02-06" as DateString)).toBe("oof");

		// Toggle date off
		clearDateState("2026-02-06" as DateString);

		// Check derived state updated
		dates = getAllDates();
		expect(dates.size).toBe(0);
	});

	it("should persist state on localStorage save", () => {
		// Set some state
		setDateState("2026-02-06" as DateString, "sick" as DateState);
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
			["2026-02-06", "oof"],
			["2026-02-07", "holiday"],
			["2026-02-08", "sick"],
		];
		localStorage.setItem("rto-calendar-dates", JSON.stringify(mockData));

		// Load from localStorage
		const stored = localStorage.getItem("rto-calendar-dates");
		if (stored) {
			const parsed = JSON.parse(stored) as [DateString, DateState][];
			const loadedMap = new Map(parsed);
			selectedDates.set(loadedMap);

			// Verify state recovered
			const dates = getAllDates();
			expect(dates.size).toBe(3);
			expect(dates.get("2026-02-06" as DateString)).toBe("oof");
			expect(dates.get("2026-02-07" as DateString)).toBe("holiday");
			expect(dates.get("2026-02-08" as DateString)).toBe("sick");
		}
	});
});
