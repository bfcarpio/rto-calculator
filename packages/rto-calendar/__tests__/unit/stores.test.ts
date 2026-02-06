import { beforeEach, describe, it, expect, vi } from "vitest";
import {
	selectedDates,
	currentMonth,
	dragState,
	validationResult,
	setDateState,
	clearDateState,
	getAllDates,
	getCurrentMonth,
	setCurrentMonth,
} from "../../src/stores/calendarStore";
import type { DateString, DateState } from "../../src/types";

describe("stores", () => {
	beforeEach(() => {
		// Clear all stores before each test
		selectedDates.set(new Map());
		currentMonth.set(new Date());
		dragState.set({
			isDragging: false,
			startPoint: null,
			currentPoint: null,
			direction: null,
		});
		validationResult.set(null);
	});

	describe("selectedDates", () => {
		it("should initialize with empty selected dates", () => {
			const dates = selectedDates.get();
			expect(dates).toBeInstanceOf(Map);
			expect(dates.size).toBe(0);
		});

		it("should toggle date selection (add)", () => {
			setDateState("2026-02-06" as DateString, "working" as DateState);
			const dates = selectedDates.get();
			expect(dates.size).toBe(1);
			expect(dates.get("2026-02-06" as DateString)).toBe("working");
		});

		it("should toggle date selection (remove)", () => {
			setDateState("2026-02-06" as DateString, "working" as DateState);
			clearDateState("2026-02-06" as DateString);
			const dates = selectedDates.get();
			expect(dates.size).toBe(0);
		});

		it("should clear all dates", () => {
			setDateState("2026-02-06" as DateString, "working" as DateState);
			setDateState("2026-02-07" as DateString, "oof" as DateState);
			selectedDates.set(new Map());
			const dates = selectedDates.get();
			expect(dates.size).toBe(0);
		});

		it("should update existing date state", () => {
			setDateState("2026-02-06" as DateString, "working" as DateState);
			setDateState("2026-02-06" as DateString, "oof" as DateState);
			const dates = selectedDates.get();
			expect(dates.get("2026-02-06" as DateString)).toBe("oof");
		});

		it("should get all dates", () => {
			setDateState("2026-02-06" as DateString, "working" as DateState);
			setDateState("2026-02-07" as DateString, "oof" as DateState);
			const dates = getAllDates();
			expect(dates.size).toBe(2);
			expect(dates.get("2026-02-06" as DateString)).toBe("working");
			expect(dates.get("2026-02-07" as DateString)).toBe("oof");
		});
	});

	describe("currentMonth", () => {
		it("should initialize with current date", () => {
			const month = currentMonth.get();
			expect(month).toBeInstanceOf(Date);
		});

		it("should set current month", () => {
			const newMonth = new Date(2026, 1, 1);
			setCurrentMonth(newMonth);
			const month = currentMonth.get();
			expect(month.getFullYear()).toBe(2026);
			expect(month.getMonth()).toBe(1);
		});

		it("should get current month", () => {
			const testMonth = new Date(2026, 5, 15);
			currentMonth.set(testMonth);
			const month = getCurrentMonth();
			expect(month.getFullYear()).toBe(2026);
			expect(month.getMonth()).toBe(5);
		});

		it("should handle month navigation correctly", () => {
			let month = currentMonth.get();
			const initialMonth = month.getMonth();

			// Navigate to next month
			const nextMonth = new Date(month.getFullYear(), month.getMonth() + 1, 1);
			setCurrentMonth(nextMonth);
			month = currentMonth.get();
			expect(month.getMonth()).toBe((initialMonth + 1) % 12);
		});
	});

	describe("dragState", () => {
		it("should start drag with correct state", () => {
			dragState.set({
				isDragging: true,
				startPoint: "2026-02-06" as DateString,
				currentPoint: "2026-02-06" as DateString,
				direction: "forward",
			});
			const state = dragState.get();
			expect(state.isDragging).toBe(true);
			expect(state.startPoint).toBe("2026-02-06");
			expect(state.currentPoint).toBe("2026-02-06");
			expect(state.direction).toBe("forward");
		});

		it("should end drag and clear state", () => {
			dragState.set({
				isDragging: true,
				startPoint: "2026-02-06" as DateString,
				currentPoint: "2026-02-10" as DateString,
				direction: "forward",
			});

			dragState.set({
				isDragging: false,
				startPoint: null,
				currentPoint: null,
				direction: null,
			});

			const state = dragState.get();
			expect(state.isDragging).toBe(false);
			expect(state.startPoint).toBe(null);
			expect(state.currentPoint).toBe(null);
			expect(state.direction).toBe(null);
		});

		it("should update drag direction (forward)", () => {
			dragState.set({
				isDragging: true,
				startPoint: "2026-02-06" as DateString,
				currentPoint: "2026-02-10" as DateString,
				direction: "forward",
			});
			const state = dragState.get();
			expect(state.direction).toBe("forward");
		});

		it("should update drag direction (backward)", () => {
			dragState.set({
				isDragging: true,
				startPoint: "2026-02-10" as DateString,
				currentPoint: "2026-02-06" as DateString,
				direction: "backward",
			});
			const state = dragState.get();
			expect(state.direction).toBe("backward");
		});
	});

	describe("validationResult", () => {
		it("should initialize with null validation result", () => {
			const result = validationResult.get();
			expect(result).toBe(null);
		});

		it("should set validation result", () => {
			validationResult.set({
				isValid: true,
				message: "Valid",
			});
			const result = validationResult.get();
			expect(result?.isValid).toBe(true);
			expect(result?.message).toBe("Valid");
		});

		it("should set validation result with error message", () => {
			validationResult.set({
				isValid: false,
				message: "Insufficient office days",
			});
			const result = validationResult.get();
			expect(result?.isValid).toBe(false);
			expect(result?.message).toBe("Insufficient office days");
		});
	});

	describe("localStorage persistence", () => {
		it("should persist to localStorage", () => {
			setDateState("2026-02-06" as DateString, "working" as DateState);
			const dates = getAllDates();
			const serialized = JSON.stringify(Array.from(dates.entries()));
			localStorage.setItem("selectedDates", serialized);
			expect(localStorage.getItem("selectedDates")).toBe(serialized);
		});

		it("should load from localStorage", () => {
			const mockData = [["2026-02-06", "working"], ["2026-02-07", "oof"]];
			localStorage.setItem("selectedDates", JSON.stringify(mockData));

			const stored = localStorage.getItem("selectedDates");
			if (stored) {
				const parsed = JSON.parse(stored) as [DateString, DateState][];
				const loadedMap = new Map(parsed);
				selectedDates.set(loadedMap);

				const dates = getAllDates();
				expect(dates.size).toBe(2);
				expect(dates.get("2026-02-06" as DateString)).toBe("working");
				expect(dates.get("2026-02-07" as DateString)).toBe("oof");
			}
		});

		it("should clear localStorage", () => {
			localStorage.setItem("selectedDates", JSON.stringify([["2026-02-06", "working"]]));
			localStorage.clear();
			expect(localStorage.getItem("selectedDates")).toBe(null);
		});
	});

	describe("state consistency", () => {
		it("should maintain state consistency", () => {
			// Set multiple dates
			setDateState("2026-02-06" as DateString, "working" as DateState);
			setDateState("2026-02-07" as DateString, "oof" as DateState);
			setDateState("2026-02-08" as DateString, "holiday" as DateState);

			// Verify all dates are present
			const dates = getAllDates();
			expect(dates.size).toBe(3);

			// Update one date
			clearDateState("2026-02-07" as DateString);
			const updatedDates = getAllDates();
			expect(updatedDates.size).toBe(2);
			expect(updatedDates.get("2026-02-07" as DateString)).toBe(undefined);
		});
	});
});
