import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type {
	CalendarInstance,
	DateState,
	DateString,
} from "../../../packages/datepainter/src/types";
import { HistoryManager } from "../../lib/history/HistoryManager";
import { KeyboardShortcuts } from "../keyboard-shortcuts";
import { ValidationManager } from "../ValidationManager";

vi.mock("../../utils/logger", () => ({
	logger: {
		debug: vi.fn(),
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
	},
}));

function createMockCalendarManager(): CalendarInstance {
	const stateMap = new Map<DateString, DateState>();

	return {
		getSelectedDates: vi.fn(() => Array.from(stateMap.keys())),
		getState: vi.fn((date: DateString) => stateMap.get(date) ?? null),
		getDatesByState: vi.fn(() => []),
		getAllDates: vi.fn(() => new Map(stateMap)),
		getDateRanges: vi.fn(() => []),
		getCurrentMonth: vi.fn(() => new Date(2026, 0, 1)),
		setDates: vi.fn((dates: DateString[], state: DateState) => {
			for (const d of dates) stateMap.set(d, state);
		}),
		clearDates: vi.fn((dates: (DateString | Date)[]) => {
			for (const d of dates) {
				if (typeof d === "string") stateMap.delete(d);
			}
		}),
		clearAll: vi.fn(() => stateMap.clear()),
		toggleDate: vi.fn(),
		setPaintingState: vi.fn(),
		updateConfig: vi.fn(),
		onStateChange: vi.fn(() => vi.fn()),
		onDateStateChange: vi.fn(() => vi.fn()),
		onMonthChange: vi.fn(() => vi.fn()),
		navigateToDate: vi.fn(),
		nextMonth: vi.fn(),
		prevMonth: vi.fn(),
		destroy: vi.fn(),
	};
}

describe("KeyboardShortcuts", () => {
	let historyManager: HistoryManager;
	let calendarManager: CalendarInstance;
	let validationManager: ValidationManager;
	let shortcuts: KeyboardShortcuts;

	beforeEach(() => {
		vi.useFakeTimers();
		document.body.innerHTML = "";

		historyManager = new HistoryManager();
		calendarManager = createMockCalendarManager();
		validationManager = new ValidationManager();
		shortcuts = new KeyboardShortcuts(
			historyManager,
			calendarManager,
			validationManager,
		);
	});

	afterEach(() => {
		shortcuts.destroy();
		vi.useRealTimers();
	});

	describe("constructor", () => {
		it("should throw if historyManager is null", () => {
			expect(
				() =>
					new KeyboardShortcuts(
						null as never,
						calendarManager,
						validationManager,
					),
			).toThrow("HistoryManager is required");
		});

		it("should throw if calendarManager is null", () => {
			expect(
				() =>
					new KeyboardShortcuts(
						historyManager,
						null as never,
						validationManager,
					),
			).toThrow("CalendarManager is required");
		});

		it("should throw if validationManager is null", () => {
			expect(
				() =>
					new KeyboardShortcuts(historyManager, calendarManager, null as never),
			).toThrow("ValidationManager is required");
		});
	});

	describe("initialize / destroy", () => {
		it("should throw if initialized twice", () => {
			shortcuts.initialize();
			expect(() => shortcuts.initialize()).toThrow("already initialized");
		});

		it("should allow re-initialization after destroy", () => {
			shortcuts.initialize();
			shortcuts.destroy();
			expect(() => shortcuts.initialize()).not.toThrow();
		});

		it("should attach state change observer if onStateChange exists", () => {
			shortcuts.initialize();
			expect(calendarManager.onStateChange).toHaveBeenCalled();
		});
	});

	describe("undo (Ctrl+Z)", () => {
		it("should restore calendar state on undo", () => {
			shortcuts.initialize();

			// Trigger debounce to push state
			shortcuts.pushStateToHistory();
			vi.advanceTimersByTime(600);

			// Simulate Ctrl+Z
			document.dispatchEvent(
				new KeyboardEvent("keydown", {
					key: "z",
					ctrlKey: true,
					bubbles: true,
				}),
			);

			// After undo, the snapshot should be consumed
			expect(historyManager.canUndo()).toBe(false);
		});

		it("should not crash when undo stack is empty", () => {
			shortcuts.initialize();

			expect(() => {
				document.dispatchEvent(
					new KeyboardEvent("keydown", {
						key: "z",
						ctrlKey: true,
						bubbles: true,
					}),
				);
			}).not.toThrow();
		});

		it("should handle Cmd+Z (metaKey) for Mac users", () => {
			shortcuts.initialize();

			shortcuts.pushStateToHistory();
			vi.advanceTimersByTime(600);

			expect(historyManager.canUndo()).toBe(true);

			document.dispatchEvent(
				new KeyboardEvent("keydown", {
					key: "z",
					metaKey: true,
					bubbles: true,
				}),
			);

			expect(historyManager.canUndo()).toBe(false);
		});
	});

	describe("redo (Ctrl+Y)", () => {
		it("should restore state on redo after undo", () => {
			shortcuts.initialize();

			shortcuts.pushStateToHistory();
			vi.advanceTimersByTime(600);

			// Undo
			document.dispatchEvent(
				new KeyboardEvent("keydown", {
					key: "z",
					ctrlKey: true,
					bubbles: true,
				}),
			);

			expect(historyManager.canRedo()).toBe(true);

			// Redo
			document.dispatchEvent(
				new KeyboardEvent("keydown", {
					key: "y",
					ctrlKey: true,
					bubbles: true,
				}),
			);

			expect(historyManager.canRedo()).toBe(false);
		});

		it("should handle Ctrl+Shift+Z as redo", () => {
			shortcuts.initialize();

			shortcuts.pushStateToHistory();
			vi.advanceTimersByTime(600);

			// Undo
			document.dispatchEvent(
				new KeyboardEvent("keydown", {
					key: "z",
					ctrlKey: true,
					bubbles: true,
				}),
			);

			// Redo via Ctrl+Shift+Z
			document.dispatchEvent(
				new KeyboardEvent("keydown", {
					key: "z",
					ctrlKey: true,
					shiftKey: true,
					bubbles: true,
				}),
			);

			expect(historyManager.canRedo()).toBe(false);
		});
	});

	describe("debounce behavior", () => {
		it("should debounce rapid state pushes", () => {
			const pushSpy = vi.spyOn(historyManager, "push");
			shortcuts.initialize();

			shortcuts.pushStateToHistory();
			shortcuts.pushStateToHistory();
			shortcuts.pushStateToHistory();

			expect(pushSpy).not.toHaveBeenCalled();

			vi.advanceTimersByTime(600);

			expect(pushSpy).toHaveBeenCalledTimes(1);
		});

		it("should reset debounce timer on new push", () => {
			const pushSpy = vi.spyOn(historyManager, "push");
			shortcuts.initialize();

			shortcuts.pushStateToHistory();
			vi.advanceTimersByTime(300);

			shortcuts.pushStateToHistory(); // Reset timer
			vi.advanceTimersByTime(300);

			expect(pushSpy).not.toHaveBeenCalled();

			vi.advanceTimersByTime(300);
			expect(pushSpy).toHaveBeenCalledTimes(1);
		});

		it("should dispatch history-changed event after push", () => {
			const eventSpy = vi.fn();
			window.addEventListener("history-changed", eventSpy);

			shortcuts.initialize();
			shortcuts.pushStateToHistory();
			vi.advanceTimersByTime(600);

			expect(eventSpy).toHaveBeenCalledTimes(1);
			const detail = (eventSpy.mock.calls[0]?.[0] as CustomEvent).detail;
			expect(detail).toHaveProperty("canUndo");
			expect(detail).toHaveProperty("canRedo");

			window.removeEventListener("history-changed", eventSpy);
		});
	});

	describe("snapshot creation", () => {
		it("should capture calendar state in snapshot", () => {
			const pushSpy = vi.spyOn(historyManager, "push");
			shortcuts.initialize();

			shortcuts.pushStateToHistory();
			vi.advanceTimersByTime(600);

			const snapshot = pushSpy.mock.calls[0]?.[0];
			expect(snapshot).toBeDefined();
			expect(snapshot).toHaveProperty("calendarState");
			expect(snapshot).toHaveProperty("currentMonth");
			expect(snapshot).toHaveProperty("validationConfig");
			expect(snapshot).toHaveProperty("timestamp");
		});

		it("should include validation config in snapshot", () => {
			const pushSpy = vi.spyOn(historyManager, "push");
			validationManager.updateConfig({ minOfficeDaysPerWeek: 4 });
			shortcuts.initialize();

			shortcuts.pushStateToHistory();
			vi.advanceTimersByTime(600);

			const snapshot = pushSpy.mock.calls[0]?.[0];
			expect(snapshot?.validationConfig.minOfficeDaysPerWeek).toBe(4);
		});
	});

	describe("button keyboard support", () => {
		it("should trigger click on focused button when Enter is pressed", () => {
			shortcuts.initialize();

			const button = document.createElement("button");
			button.textContent = "Test";
			document.body.appendChild(button);

			const clickSpy = vi.fn();
			button.addEventListener("click", clickSpy);

			button.dispatchEvent(
				new KeyboardEvent("keydown", {
					key: "Enter",
					bubbles: true,
				}),
			);

			expect(clickSpy).toHaveBeenCalledTimes(1);
		});

		it("should trigger click on element with role='button' when Enter is pressed", () => {
			shortcuts.initialize();

			const div = document.createElement("div");
			div.setAttribute("role", "button");
			document.body.appendChild(div);

			const clickSpy = vi.fn();
			div.addEventListener("click", clickSpy);

			div.dispatchEvent(
				new KeyboardEvent("keydown", {
					key: "Enter",
					bubbles: true,
				}),
			);

			expect(clickSpy).toHaveBeenCalledTimes(1);
		});
	});
});
