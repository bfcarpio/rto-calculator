import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type {
	CalendarInstance,
	DateState,
	DateString,
} from "../../../packages/datepainter/src/types";
import { HistoryManager } from "../../lib/history/HistoryManager";
import type { ValidationConfig } from "../../types/validation-strategy";
import { KeyboardShortcuts } from "../keyboard-shortcuts";
import type { ValidationManager } from "../ValidationManager";

// Mock ValidationManager
const createMockValidationManager = (): ValidationManager => {
	const config: ValidationConfig = {
		minOfficeDaysPerWeek: 3,
		totalWeekdaysPerWeek: 5,
		rollingPeriodWeeks: 12,
		thresholdPercentage: 0.75,
		debug: false,
	};

	return {
		config,
		getConfig: vi.fn(() => ({ ...config })),
		updateConfig: vi.fn((newConfig: Partial<ValidationConfig>) => {
			Object.assign(config, newConfig);
		}),
		setDebugMode: vi.fn((enabled: boolean) => {
			config.debug = enabled;
		}),
		getDebugMode: vi.fn(() => config.debug),
	} as unknown as ValidationManager;
};

// Mock CalendarManager
const createMockCalendarManager = () => {
	const stateMap = new Map<DateString, DateState>();
	const stateChangeCallbacks: Array<
		(date: DateString, state: DateState | null) => void
	> = [];

	return {
		getAllDates: vi.fn(() => new Map(stateMap)),
		getCurrentMonth: vi.fn(() => new Date(2026, 0, 1)),
		clearDates: vi.fn((dates: DateString[]) => {
			for (const date of dates) {
				stateMap.delete(date);
				for (const cb of stateChangeCallbacks) {
					cb(date, null);
				}
			}
		}),
		setDates: vi.fn((dates: DateString[], state: DateState) => {
			for (const date of dates) {
				stateMap.set(date, state);
				for (const cb of stateChangeCallbacks) {
					cb(date, state);
				}
			}
		}),
		onStateChange: vi.fn(
			(callback: (date: DateString, state: DateState | null) => void) => {
				stateChangeCallbacks.push(callback);
				return () => {
					const index = stateChangeCallbacks.indexOf(callback);
					if (index > -1) {
						stateChangeCallbacks.splice(index, 1);
					}
				};
			},
		),
		init: vi.fn(),
		destroy: vi.fn(),
		navigateToDate: vi.fn(),
		_stateMap: stateMap, // Expose for testing
	} as unknown as CalendarInstance & { _stateMap: Map<DateString, DateState> };
};

describe("KeyboardShortcuts - Undo/Redo", () => {
	let historyManager: HistoryManager;
	let calendarManager: ReturnType<typeof createMockCalendarManager>;
	let validationManager: ReturnType<typeof createMockValidationManager>;
	let keyboardShortcuts: KeyboardShortcuts;

	beforeEach(() => {
		// Reset DOM
		document.body.innerHTML = "";

		// Create instances
		historyManager = new HistoryManager(10);
		calendarManager = createMockCalendarManager();
		validationManager = createMockValidationManager();
		keyboardShortcuts = new KeyboardShortcuts(
			historyManager,
			calendarManager,
			validationManager,
		);

		// Initialize (but don't attach DOM listeners for unit tests)
		keyboardShortcuts.initialize();
	});

	afterEach(() => {
		keyboardShortcuts.destroy();
	});

	describe("captureStateImmediate", () => {
		it("should capture current state immediately", () => {
			// Set some dates
			calendarManager._stateMap.set(
				"2026-01-15" as DateString,
				"oof" as DateState,
			);

			// Capture state
			keyboardShortcuts.captureStateImmediate();

			// Verify state was pushed
			expect(historyManager.canUndo()).toBe(true);
		});

		it("should push to history manager", () => {
			keyboardShortcuts.captureStateImmediate();

			expect(historyManager.size).toBe(1);
		});

		it("should dispatch history-changed event", () => {
			const listener = vi.fn();
			window.addEventListener("history-changed", listener);

			keyboardShortcuts.captureStateImmediate();

			expect(listener).toHaveBeenCalled();
			window.removeEventListener("history-changed", listener);
		});

		it("should capture empty state", () => {
			keyboardShortcuts.captureStateImmediate();

			expect(historyManager.size).toBe(1);
			expect(historyManager.canUndo()).toBe(true);
		});
	});

	describe("handleUndo", () => {
		it("should warn when undo stack is empty", () => {
			const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

			keyboardShortcuts.handleUndo();

			expect(warnSpy).toHaveBeenCalledWith(
				"Undo stack empty, cannot undo further",
			);
			warnSpy.mockRestore();
		});

		it("should restore to previous state after one action", () => {
			// Capture initial empty state
			keyboardShortcuts.captureStateImmediate();
			expect(historyManager.size).toBe(1);

			// Mark a date
			calendarManager._stateMap.set(
				"2026-01-15" as DateString,
				"oof" as DateState,
			);
			keyboardShortcuts.captureStateImmediate();
			expect(historyManager.size).toBe(2);

			// Undo
			keyboardShortcuts.handleUndo();

			// Verify clearDates was called (restoring to empty state)
			expect(calendarManager.clearDates).toHaveBeenCalledWith(["2026-01-15"]);
		});

		it("should restore to correct state after multiple actions", () => {
			// Initial state
			keyboardShortcuts.captureStateImmediate();

			// Mark date 1
			calendarManager._stateMap.set(
				"2026-01-15" as DateString,
				"oof" as DateState,
			);
			keyboardShortcuts.captureStateImmediate();

			// Mark date 2
			calendarManager._stateMap.set(
				"2026-01-16" as DateString,
				"holiday" as DateState,
			);
			keyboardShortcuts.captureStateImmediate();

			// Clear mocks
			vi.clearAllMocks();

			// Undo (should go back to state with only date 1)
			keyboardShortcuts.handleUndo();

			// Verify dates were cleared
			expect(calendarManager.clearDates).toHaveBeenCalled();

			// Verify date 1 was restored
			expect(calendarManager.setDates).toHaveBeenCalledWith(
				["2026-01-15"],
				"oof",
			);
		});

		it("should set restoringState flag during restoration", () => {
			// Capture initial state
			keyboardShortcuts.captureStateImmediate();

			// Mark a date
			calendarManager._stateMap.set(
				"2026-01-15" as DateString,
				"oof" as DateState,
			);
			keyboardShortcuts.captureStateImmediate();

			// Spy on pushStateToHistory to verify it's not called during restore
			const pushSpy = vi.spyOn(keyboardShortcuts, "pushStateToHistory");

			// Undo
			keyboardShortcuts.handleUndo();

			// pushStateToHistory should not be called during restoration
			// (because restoringState flag suppresses it)
			expect(pushSpy).not.toHaveBeenCalled();
		});

		it("should dispatch history-changed event after undo", () => {
			const listener = vi.fn();
			window.addEventListener("history-changed", listener);

			// Setup state
			keyboardShortcuts.captureStateImmediate();
			calendarManager._stateMap.set(
				"2026-01-15" as DateString,
				"oof" as DateState,
			);
			keyboardShortcuts.captureStateImmediate();

			// Clear previous calls
			listener.mockClear();

			// Undo
			keyboardShortcuts.handleUndo();

			expect(listener).toHaveBeenCalled();
			window.removeEventListener("history-changed", listener);
		});
	});

	describe("handleRedo", () => {
		it("should not restore when redo stack is empty", () => {
			keyboardShortcuts.handleRedo();

			// No calls to restore methods
			expect(calendarManager.clearDates).not.toHaveBeenCalled();
			expect(calendarManager.setDates).not.toHaveBeenCalled();
		});

		it("should restore to future state after undo", () => {
			// Setup: initial state + marked state
			keyboardShortcuts.captureStateImmediate();
			calendarManager._stateMap.set(
				"2026-01-15" as DateString,
				"oof" as DateState,
			);
			keyboardShortcuts.captureStateImmediate();

			// Undo
			keyboardShortcuts.handleUndo();

			// Clear mocks
			vi.clearAllMocks();

			// Redo
			keyboardShortcuts.handleRedo();

			// Should restore the marked state
			expect(calendarManager.setDates).toHaveBeenCalledWith(
				["2026-01-15"],
				"oof",
			);
		});

		it("should set restoringState flag during restoration", () => {
			// Setup
			keyboardShortcuts.captureStateImmediate();
			calendarManager._stateMap.set(
				"2026-01-15" as DateString,
				"oof" as DateState,
			);
			keyboardShortcuts.captureStateImmediate();
			keyboardShortcuts.handleUndo();

			// Spy on pushStateToHistory
			const pushSpy = vi.spyOn(keyboardShortcuts, "pushStateToHistory");

			// Redo
			keyboardShortcuts.handleRedo();

			// pushStateToHistory should not be called during restoration
			expect(pushSpy).not.toHaveBeenCalled();
		});
	});

	describe("State restoration", () => {
		it("should clear dates and restore to empty state", () => {
			// Initial empty state
			keyboardShortcuts.captureStateImmediate();

			// Mark dates
			calendarManager._stateMap.set(
				"2026-01-15" as DateString,
				"oof" as DateState,
			);
			calendarManager._stateMap.set(
				"2026-01-16" as DateString,
				"holiday" as DateState,
			);
			keyboardShortcuts.captureStateImmediate();

			// Clear mocks
			vi.clearAllMocks();

			// Undo to empty state
			keyboardShortcuts.handleUndo();

			// Should clear both dates
			expect(calendarManager.clearDates).toHaveBeenCalledWith(
				expect.arrayContaining(["2026-01-15", "2026-01-16"]),
			);

			// Should not set any dates (empty state)
			expect(calendarManager.setDates).not.toHaveBeenCalled();
		});

		it("should handle multiple undo/redo cycles correctly", () => {
			// State 1: empty
			keyboardShortcuts.captureStateImmediate();

			// State 2: one date
			calendarManager._stateMap.set(
				"2026-01-15" as DateString,
				"oof" as DateState,
			);
			keyboardShortcuts.captureStateImmediate();

			// State 3: two dates
			calendarManager._stateMap.set(
				"2026-01-16" as DateString,
				"holiday" as DateState,
			);
			keyboardShortcuts.captureStateImmediate();

			// Undo twice (should go back to empty state)
			keyboardShortcuts.handleUndo(); // Back to state 2
			keyboardShortcuts.handleUndo(); // Back to state 1

			// Verify empty state restored
			vi.clearAllMocks();
			const peek = historyManager.peek();
			expect(peek?.calendarState.size).toBe(0);

			// Redo once (should restore one date)
			keyboardShortcuts.handleRedo();

			// Should restore date 15
			expect(calendarManager.setDates).toHaveBeenCalledWith(
				["2026-01-15"],
				"oof",
			);

			// Redo again (should restore two dates)
			vi.clearAllMocks();
			keyboardShortcuts.handleRedo();

			// Should restore both dates
			expect(calendarManager.setDates).toHaveBeenCalledWith(
				["2026-01-15"],
				"oof",
			);
			expect(calendarManager.setDates).toHaveBeenCalledWith(
				["2026-01-16"],
				"holiday",
			);
		});

		it("should restore validation config", () => {
			// Initial state
			keyboardShortcuts.captureStateImmediate();

			// Change validation config
			const newConfig: ValidationConfig = {
				minOfficeDaysPerWeek: 4,
				totalWeekdaysPerWeek: 5,
				rollingPeriodWeeks: 8,
				thresholdPercentage: 0.8,
				debug: true,
			};
			// Update the mock's internal config via updateConfig
			validationManager.updateConfig(newConfig);
			keyboardShortcuts.captureStateImmediate();

			// Clear mock calls
			vi.clearAllMocks();

			// Undo
			keyboardShortcuts.handleUndo();

			// Should restore original config
			expect(validationManager.updateConfig).toHaveBeenCalledWith({
				minOfficeDaysPerWeek: 3,
				totalWeekdaysPerWeek: 5,
				rollingPeriodWeeks: 12,
				thresholdPercentage: 0.75,
				debug: false,
			});
		});
	});
});
