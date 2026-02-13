import { beforeEach, describe, expect, it } from "vitest";
import {
	clearDateState,
	currentMonth,
	getAllDates,
	selectedDates,
	setCurrentMonth,
	setDateState,
	validationResult,
} from "../../src/stores/calendarStore";
import type { DateState, DateString } from "../../src/types";

describe("calendarStore", () => {
	beforeEach(() => {
		// Clear all stores before each test
		selectedDates.set(new Map());
		currentMonth.set(new Date(2026, 1, 1));
		validationResult.set(null);
	});

	it("should update derived state on date toggle", () => {
		// Toggle a date
		setDateState("2026-02-06" as DateString, "oof" as DateState);

		// Verify derived state is updated
		const dates = getAllDates();
		expect(dates.size).toBe(1);
		expect(dates.get("2026-02-06" as DateString)).toBe("oof");
	});

	it("should sync selection changes to validation", () => {
		// Set some dates
		setDateState("2026-02-06" as DateString, "oof" as DateState);
		setDateState("2026-02-07" as DateString, "oof" as DateState);
		setDateState("2026-02-08" as DateString, "oof" as DateState);

		// Set validation result based on selection
		const dates = getAllDates();
		const markedDays = Array.from(dates.values()).filter(
			(state) => state === "oof",
		).length;

		validationResult.set({
			isValid: markedDays >= 3,
			message:
				markedDays >= 3
					? "Sufficient office days selected"
					: "Insufficient office days selected",
		});

		const result = validationResult.get();
		expect(result?.isValid).toBe(true);
		expect(result?.message).toBe("Sufficient office days selected");
	});

	it("should handle month navigation correctly", () => {
		// Start with February 2026
		setCurrentMonth(new Date(2026, 1, 1));
		let month = currentMonth.get();
		expect(month.getMonth()).toBe(1);

		// Navigate to March
		setCurrentMonth(new Date(2026, 2, 1));
		month = currentMonth.get();
		expect(month.getMonth()).toBe(2);

		// Navigate back to January
		setCurrentMonth(new Date(2026, 0, 1));
		month = currentMonth.get();
		expect(month.getMonth()).toBe(0);

		// Navigate across year boundary to December 2025
		setCurrentMonth(new Date(2025, 11, 1));
		month = currentMonth.get();
		expect(month.getFullYear()).toBe(2025);
		expect(month.getMonth()).toBe(11);
	});

	it("should maintain state consistency", () => {
		// Set multiple dates
		setDateState("2026-02-06" as DateString, "oof" as DateState);
		setDateState("2026-02-07" as DateString, "holiday" as DateState);
		setDateState("2026-02-08" as DateString, "sick" as DateState);

		// Set current month
		setCurrentMonth(new Date(2026, 1, 1));

		// Verify state is consistent
		const dates = getAllDates();
		const month = currentMonth.get();
		expect(dates.size).toBe(3);
		expect(month.getMonth()).toBe(1);

		// Update one date
		clearDateState("2026-02-07" as DateString);
		setDateState("2026-02-07" as DateString, "sick" as DateState);

		// Verify state is still consistent
		const updatedDates = getAllDates();
		expect(updatedDates.size).toBe(3);
		expect(updatedDates.get("2026-02-07" as DateString)).toBe("sick");
	});

	it("should clear state on destroy", () => {
		// Set some state
		setDateState("2026-02-06" as DateString, "oof" as DateState);
		setDateState("2026-02-07" as DateString, "oof" as DateState);
		setCurrentMonth(new Date(2026, 1, 1));
		validationResult.set({
			isValid: true,
			message: "Valid",
		});

		// Verify state is set
		expect(selectedDates.get().size).toBe(2);
		expect(currentMonth.get().getMonth()).toBe(1);
		expect(validationResult.get()?.isValid).toBe(true);

		// Clear all state (simulating destroy)
		selectedDates.set(new Map());
		currentMonth.set(new Date());
		validationResult.set(null);

		// Verify state is cleared
		expect(selectedDates.get().size).toBe(0);
		expect(validationResult.get()).toBe(null);
	});
});
