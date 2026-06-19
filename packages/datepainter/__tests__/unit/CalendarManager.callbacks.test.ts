import { describe, expect, it, vi } from "vitest";
import { CalendarManager } from "../../src/CalendarManager";
import { currentMonth, selectedDates } from "../../src/stores/calendarStore";
import type { DateState, DateString } from "../../src/types";

/**
 * Helper to create a minimal valid CalendarConfig for testing.
 */
function createConfig() {
	return {
		dateRange: {
			start: new Date(2026, 0, 1),
			end: new Date(2026, 11, 31),
		},
		states: {
			oof: { label: "OOF", color: "#000", bgColor: "#fee2e2", icon: "📍" },
			holiday: {
				label: "Holiday",
				color: "#f59e0b",
				bgColor: "#fef3c7",
				icon: "🎄",
			},
			sick: { label: "Sick", color: "#1890ff", bgColor: "#e6f7ff", icon: "💊" },
		},
	};
}

/**
 * Helper to create a CalendarManager with a DOM container.
 * Returns the manager and a cleanup function.
 */
function createManager(): { manager: CalendarManager; cleanup: () => void } {
	const container = document.createElement("div");
	container.id = "test-calendar";
	document.body.appendChild(container);

	const manager = new CalendarManager("#test-calendar", createConfig());
	manager.init();

	const cleanup = () => {
		manager.destroy();
		container.remove();
		selectedDates.set(new Map());
		currentMonth.set(new Date());
	};

	return { manager, cleanup };
}

describe("CalendarManager granular callbacks", () => {
	describe("onDateStateChange", () => {
		it("should fire when a date is selected", () => {
			const { manager, cleanup } = createManager();
			const callback = vi.fn();

			manager.onDateStateChange(callback);
			manager.setDates(["2026-01-15"] as DateString[], "oof" as DateState);

			expect(callback).toHaveBeenCalled();
			const calls = callback.mock.calls;
			const lastCallArgs = calls[calls.length - 1];
			expect(lastCallArgs).toBeDefined();
			expect(lastCallArgs![0]).toBeInstanceOf(Map);
			expect(lastCallArgs![0].get("2026-01-15")).toBe("oof");

			cleanup();
		});

		it("should fire when a date is deselected", () => {
			const { manager, cleanup } = createManager();
			const callback = vi.fn();

			manager.setDates(["2026-01-15"] as DateString[], "oof" as DateState);
			manager.onDateStateChange(callback);
			callback.mockClear();

			manager.clearDates(["2026-01-15"] as DateString[]);

			expect(callback).toHaveBeenCalled();
			const calls = callback.mock.calls;
			const lastCallArgs = calls[calls.length - 1];
			expect(lastCallArgs).toBeDefined();
			expect(lastCallArgs![0].get("2026-01-15")).toBeUndefined();

			cleanup();
		});

		it("should NOT fire on month navigation", () => {
			const { manager, cleanup } = createManager();
			const callback = vi.fn();

			manager.onDateStateChange(callback);
			// nanostore subscribe fires immediately with current value
			const initialCallCount = callback.mock.calls.length;

			manager.nextMonth();

			// Should not have been called again after initial subscription
			expect(callback.mock.calls.length).toBe(initialCallCount);

			cleanup();
		});

		it("should return an unsubscribe function that stops callbacks", () => {
			const { manager, cleanup } = createManager();
			const callback = vi.fn();

			const unsubscribe = manager.onDateStateChange(callback);
			// Initial call from subscribe
			const initialCallCount = callback.mock.calls.length;

			unsubscribe();

			// Setting dates should not trigger the callback anymore
			manager.setDates(["2026-01-15"] as DateString[], "oof" as DateState);
			expect(callback.mock.calls.length).toBe(initialCallCount);

			cleanup();
		});

		it("should fire with the full dates map on each change", () => {
			const { manager, cleanup } = createManager();
			const callback = vi.fn();

			manager.onDateStateChange(callback);
			// Initial subscription call
			callback.mockClear();

			manager.setDates(["2026-01-10"] as DateString[], "oof" as DateState);
			manager.setDates(["2026-01-15"] as DateString[], "holiday" as DateState);

			// Each state change fires the callback with the full map
			const calls = callback.mock.calls;
			const lastCallArgs = calls[calls.length - 1];
			expect(lastCallArgs).toBeDefined();
			const lastMap = lastCallArgs![0] as Map<DateString, DateState>;
			expect(lastMap.size).toBe(2);
			expect(lastMap.get("2026-01-10")).toBe("oof");
			expect(lastMap.get("2026-01-15")).toBe("holiday");

			cleanup();
		});
	});

	describe("onMonthChange", () => {
		it("should fire on month navigation", () => {
			const { manager, cleanup } = createManager();
			const callback = vi.fn();

			manager.onMonthChange(callback);
			// nanostore subscribe fires immediately with current value
			callback.mockClear();

			manager.nextMonth();

			expect(callback).toHaveBeenCalledTimes(1);
			const monthArgs = callback.mock.calls[0];
			expect(monthArgs).toBeDefined();
			expect(monthArgs![0]).toBeInstanceOf(Date);

			cleanup();
		});

		it("should NOT fire on date selection changes", () => {
			const { manager, cleanup } = createManager();
			const callback = vi.fn();

			manager.onMonthChange(callback);
			// Initial call from subscribe
			const initialCallCount = callback.mock.calls.length;

			manager.setDates(["2026-01-15"] as DateString[], "oof" as DateState);

			expect(callback.mock.calls.length).toBe(initialCallCount);

			cleanup();
		});

		it("should receive the new month date", () => {
			const { manager, cleanup } = createManager();
			const callback = vi.fn();

			manager.onMonthChange(callback);
			callback.mockClear();

			manager.nextMonth();

			const monthArgs = callback.mock.calls[0];
			expect(monthArgs).toBeDefined();
			const receivedMonth = monthArgs![0] as Date;
			// The month should be February 2026 (next month from Jan 2026)
			expect(receivedMonth.getMonth()).toBe(1); // February = 1
			expect(receivedMonth.getFullYear()).toBe(2026);

			cleanup();
		});

		it("should return an unsubscribe function that stops callbacks", () => {
			const { manager, cleanup } = createManager();
			const callback = vi.fn();

			const unsubscribe = manager.onMonthChange(callback);
			// Initial call from subscribe
			const initialCallCount = callback.mock.calls.length;

			unsubscribe();

			// Navigating months should not trigger the callback anymore
			manager.nextMonth();
			expect(callback.mock.calls.length).toBe(initialCallCount);

			cleanup();
		});
	});

	describe("destroy() cleanup", () => {
		it("should stop onDateStateChange callbacks after destroy", () => {
			const container = document.createElement("div");
			container.id = "test-destroy-date";
			document.body.appendChild(container);

			const manager = new CalendarManager("#test-destroy-date", createConfig());
			manager.init();

			const callback = vi.fn();
			manager.onDateStateChange(callback);
			const initialCallCount = callback.mock.calls.length;

			manager.destroy();

			// Direct nanostore change should NOT reach the destroyed manager's callback
			selectedDates.set(
				new Map([["2026-01-20" as DateString, "oof" as DateState]]),
			);
			expect(callback.mock.calls.length).toBe(initialCallCount);

			container.remove();
			selectedDates.set(new Map());
			currentMonth.set(new Date());
		});

		it("should stop onMonthChange callbacks after destroy", () => {
			const container = document.createElement("div");
			container.id = "test-destroy-month";
			document.body.appendChild(container);

			const manager = new CalendarManager(
				"#test-destroy-month",
				createConfig(),
			);
			manager.init();

			const callback = vi.fn();
			manager.onMonthChange(callback);
			const initialCallCount = callback.mock.calls.length;

			manager.destroy();

			// Direct nanostore change should NOT reach the destroyed manager's callback
			currentMonth.set(new Date(2026, 5, 1));
			expect(callback.mock.calls.length).toBe(initialCallCount);

			container.remove();
			selectedDates.set(new Map());
			currentMonth.set(new Date());
		});
	});
});
