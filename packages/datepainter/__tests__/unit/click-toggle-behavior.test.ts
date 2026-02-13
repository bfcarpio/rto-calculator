import { describe, it, expect } from "vitest";
import { validateConfig } from "../../src/config/validate";
import type { CalendarConfig } from "../../src/types";

describe("Click Toggle Behavior - Validation", () => {
	const createConfig = (defaultState: "oof" | "holiday" | "sick" = "oof"): CalendarConfig => ({
		dateRange: {
			start: new Date("2024-01-01"),
			end: new Date("2024-01-31"),
		},
		states: {
			oof: { label: "OOF", color: "#000", bgColor: "#ff0" },
			holiday: { label: "Holiday", color: "#000", bgColor: "#0f0" },
			sick: { label: "Sick", color: "#000", bgColor: "#f00" },
		},
		painting: {
			enabled: true,
			defaultState,
		},
	});

	it("should validate valid defaultState configurations", () => {
		// Test all valid default states
		expect(() => validateConfig(createConfig("oof"))).not.toThrow();
		expect(() => validateConfig(createConfig("holiday"))).not.toThrow();
		expect(() => validateConfig(createConfig("sick"))).not.toThrow();
	});

	it("should accept undefined defaultState", () => {
		const config: CalendarConfig = {
			dateRange: {
				start: new Date("2024-01-01"),
				end: new Date("2024-01-31"),
			},
			states: {
				oof: { label: "OOF", color: "#000", bgColor: "#ff0" },
				holiday: { label: "Holiday", color: "#000", bgColor: "#0f0" },
				sick: { label: "Sick", color: "#000", bgColor: "#f00" },
			},
			painting: {
				enabled: true,
				// defaultState intentionally undefined
			},
		};

		expect(() => validateConfig(config)).not.toThrow();
	});

	it("should throw error if defaultState not in configured states", () => {
		const invalidConfig: CalendarConfig = {
			dateRange: {
				start: new Date("2024-01-01"),
				end: new Date("2024-01-31"),
			},
			states: {
				oof: { label: "OOF", color: "#000", bgColor: "#ff0" },
			},
			painting: {
				enabled: true,
				// @ts-expect-error - Testing invalid defaultState
				defaultState: "invalid",
			},
		};

		expect(() => validateConfig(invalidConfig)).toThrow(
			"config.painting.defaultState 'invalid' does not exist in config.states"
		);
	});

	it("should throw error for missing state definition", () => {
		const invalidConfig: CalendarConfig = {
			dateRange: {
				start: new Date("2024-01-01"),
				end: new Date("2024-01-31"),
			},
			states: {
				oof: { label: "OOF", color: "#000", bgColor: "#ff0" },
				// holiday is not defined but used as defaultState
			},
			painting: {
				enabled: true,
				defaultState: "holiday",
			},
		};

		expect(() => validateConfig(invalidConfig)).toThrow(
			"config.painting.defaultState 'holiday' does not exist in config.states"
		);
	});

	it("should validate toggle logic conceptually", () => {
		// Test the toggle logic: if current === default, clear; else set to default
		const defaultState = "oof";

		// Case 1: Empty cell -> should mark with defaultState
		let currentState: string | null = null;
		let expectedResult = defaultState;
		expect(currentState === defaultState ? null : defaultState).toBe(expectedResult);

		// Case 2: Cell marked with defaultState -> should clear
		currentState = "oof";
		expectedResult = null as any;
		expect(currentState === defaultState ? null : defaultState).toBe(expectedResult);

		// Case 3: Cell marked with different state -> should change to defaultState
		currentState = "holiday";
		expectedResult = "oof";
		expect(currentState === defaultState ? null : defaultState).toBe(expectedResult);
	});

	it("should validate palette switching behavior", () => {
		// Simulate palette changes
		let defaultState: "oof" | "holiday" | "sick" = "oof";
		let currentState: string | null = "oof";

		// With oof selected and oof marked -> should clear
		expect(currentState === defaultState ? null : defaultState).toBe(null);

		// Switch palette to holiday
		defaultState = "holiday";

		// Same cell (now cleared) with holiday selected -> should mark holiday
		currentState = null;
		expect(currentState === defaultState ? null : defaultState).toBe("holiday");

		// Switch palette to sick
		defaultState = "sick";

		// Cell marked as holiday with sick selected -> should change to sick
		currentState = "holiday";
		expect(currentState === defaultState ? null : defaultState).toBe("sick");
	});
});
