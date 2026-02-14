import { describe, expect, it } from "vitest";
import type { StateSnapshot } from "../HistoryManager";
import { HistoryManager } from "../HistoryManager";

function makeSnapshot(overrides: Partial<StateSnapshot> = {}): StateSnapshot {
	return {
		calendarState: new Map(),
		currentMonth: new Date(2026, 0, 1),
		validationConfig: {
			minOfficeDaysPerWeek: 3,
			totalWeekdaysPerWeek: 5,
			rollingPeriodWeeks: 12,
			thresholdPercentage: 0.75,
			debug: false,
		},
		timestamp: Date.now(),
		...overrides,
	};
}

describe("HistoryManager", () => {
	describe("redo", () => {
		it("returns undefined when redo stack is empty", () => {
			const hm = new HistoryManager();
			expect(hm.redo()).toBeUndefined();
		});

		it("undo pushes snapshot to redo stack", () => {
			const hm = new HistoryManager();
			hm.push(makeSnapshot());
			expect(hm.canRedo()).toBe(false);

			hm.undo();
			expect(hm.canRedo()).toBe(true);
		});

		it("redo pops from redo stack and pushes to undo stack", () => {
			const hm = new HistoryManager();
			hm.push(makeSnapshot());
			hm.undo();

			expect(hm.canUndo()).toBe(false);
			expect(hm.canRedo()).toBe(true);

			const snapshot = hm.redo();
			expect(snapshot).toBeDefined();
			expect(hm.canUndo()).toBe(true);
			expect(hm.canRedo()).toBe(false);
		});

		it("push clears redo stack", () => {
			const hm = new HistoryManager();
			hm.push(makeSnapshot());
			hm.undo();
			expect(hm.canRedo()).toBe(true);

			hm.push(makeSnapshot());
			expect(hm.canRedo()).toBe(false);
		});

		it("clear resets both stacks", () => {
			const hm = new HistoryManager();
			hm.push(makeSnapshot());
			hm.push(makeSnapshot());
			hm.undo();

			expect(hm.canUndo()).toBe(true);
			expect(hm.canRedo()).toBe(true);

			hm.clear();
			expect(hm.canUndo()).toBe(false);
			expect(hm.canRedo()).toBe(false);
		});

		it("supports multiple undo/redo cycles", () => {
			const hm = new HistoryManager();
			hm.push(makeSnapshot({ timestamp: 1 }));
			hm.push(makeSnapshot({ timestamp: 2 }));
			hm.push(makeSnapshot({ timestamp: 3 }));

			// Undo twice
			const s3 = hm.undo();
			const s2 = hm.undo();
			expect(s3).toBeDefined();
			expect(s2).toBeDefined();

			// Redo once
			const redone = hm.redo();
			expect(redone).toBeDefined();

			// Still one more redo available
			expect(hm.canRedo()).toBe(true);

			// One more redo
			hm.redo();
			expect(hm.canRedo()).toBe(false);
		});
	});

	describe("canRedo", () => {
		it("returns false initially", () => {
			const hm = new HistoryManager();
			expect(hm.canRedo()).toBe(false);
		});

		it("returns true after undo", () => {
			const hm = new HistoryManager();
			hm.push(makeSnapshot());
			hm.undo();
			expect(hm.canRedo()).toBe(true);
		});

		it("returns false after push invalidates redo", () => {
			const hm = new HistoryManager();
			hm.push(makeSnapshot());
			hm.undo();
			hm.push(makeSnapshot());
			expect(hm.canRedo()).toBe(false);
		});
	});
});
