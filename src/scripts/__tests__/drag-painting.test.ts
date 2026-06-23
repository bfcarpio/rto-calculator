import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CalendarManager } from "../../../packages/datepainter/src/CalendarManager";
import type { DateString } from "../../../packages/datepainter/src/types";
import {
	clearMonthSelections,
	createInternalDragState,
	getDateFromCell,
	getDragDirection,
	parseDate,
	resetDragState,
	updateCellDOM,
} from "../drag-painting";

vi.mock("../../utils/logger", () => ({
	logger: {
		debug: vi.fn(),
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
	},
}));

/**
 * Helper: creates a cell with data attributes matching what getCellFromDate queries.
 * parseDate returns integer values (e.g., month "01" → 1), so the querySelector
 * uses [data-month="1"]. We must store numeric strings (no leading zeros).
 */
function createCellForDateString(dateStr: string): HTMLElement {
	const parts = dateStr.split("-");
	const cell = document.createElement("td");
	cell.className = "calendar-day";
	cell.dataset.year = String(parseInt(parts[0] || "0", 10));
	cell.dataset.month = String(parseInt(parts[1] || "0", 10));
	cell.dataset.day = String(parseInt(parts[2] || "0", 10));
	return cell;
}

describe("drag-painting", () => {
	beforeEach(() => {
		document.body.innerHTML = "";
	});

	describe("createInternalDragState", () => {
		it("should return default drag state", () => {
			const state = createInternalDragState();
			expect(state).toEqual({
				isDragging: false,
				startCell: null,
				selectionIntent: null,
			});
		});
	});

	describe("resetDragState", () => {
		it("should return a fresh default state", () => {
			const state = resetDragState();
			expect(state.isDragging).toBe(false);
			expect(state.startCell).toBeNull();
			expect(state.selectionIntent).toBeNull();
		});

		it("should return a new object each time", () => {
			const state1 = resetDragState();
			const state2 = resetDragState();
			expect(state1).not.toBe(state2);
		});
	});

	describe("getDragDirection", () => {
		it("should return 'forward' when current date is after start date", () => {
			expect(getDragDirection("2026-01-05", "2026-01-10")).toBe("forward");
		});

		it("should return 'backward' when current date is before start date", () => {
			expect(getDragDirection("2026-01-10", "2026-01-05")).toBe("backward");
		});

		it("should return null when dates are the same", () => {
			expect(getDragDirection("2026-01-05", "2026-01-05")).toBeNull();
		});

		it("should work correctly across month boundaries", () => {
			expect(getDragDirection("2026-01-30", "2026-02-01")).toBe("forward");
			expect(getDragDirection("2026-02-01", "2026-01-30")).toBe("backward");
		});

		it("should work correctly across year boundaries", () => {
			expect(getDragDirection("2025-12-31", "2026-01-01")).toBe("forward");
			expect(getDragDirection("2026-01-01", "2025-12-31")).toBe("backward");
		});
	});

	describe("parseDate", () => {
		it("should parse valid YYYY-MM-DD date string", () => {
			expect(parseDate("2026-01-15")).toEqual({
				year: 2026,
				month: 1,
				day: 15,
			});
		});

		it("should parse date with leading zeros", () => {
			expect(parseDate("2026-03-05")).toEqual({
				year: 2026,
				month: 3,
				day: 5,
			});
		});

		it("should return null for invalid format with too few parts", () => {
			expect(parseDate("2026-01" as DateString)).toBeNull();
		});

		it("should return null for invalid format with too many parts", () => {
			expect(parseDate("2026-01-15-extra" as DateString)).toBeNull();
		});

		it("should return null for non-numeric parts", () => {
			expect(parseDate("abcd-ef-gh" as DateString)).toBeNull();
		});

		it("should return null for empty string", () => {
			expect(parseDate("" as DateString)).toBeNull();
		});
	});

	describe("getDateFromCell", () => {
		it("should extract date string from cell data attributes", () => {
			// data-month="1" → new Date(2026, 1, 15) = Feb 15
			// The function uses 0-indexed JS Date month, so data-month=1 → February
			const cell = document.createElement("td");
			cell.className = "calendar-day";
			cell.dataset.year = "2026";
			cell.dataset.month = "1";
			cell.dataset.day = "15";
			const date = getDateFromCell(cell);
			expect(date).toBe("2026-02-15");
		});

		it("should return null when year is missing", () => {
			const cell = document.createElement("td");
			cell.dataset.month = "1";
			cell.dataset.day = "15";
			expect(getDateFromCell(cell)).toBeNull();
		});

		it("should return null when month is missing", () => {
			const cell = document.createElement("td");
			cell.dataset.year = "2026";
			cell.dataset.day = "15";
			expect(getDateFromCell(cell)).toBeNull();
		});

		it("should return null when day is missing", () => {
			const cell = document.createElement("td");
			cell.dataset.year = "2026";
			cell.dataset.month = "1";
			expect(getDateFromCell(cell)).toBeNull();
		});

		it("should return null when month is zero (guard clause rejects falsy values)", () => {
			// !month when month=0 is true, so January (month=0) is rejected
			const cell = document.createElement("td");
			cell.dataset.year = "2026";
			cell.dataset.month = "0";
			cell.dataset.day = "15";
			expect(getDateFromCell(cell)).toBeNull();
		});
	});

	describe("updateCellDOM", () => {
		it("should apply selection state to a cell", () => {
			// Use 1-based month matching what getCellFromDate parses from "2026-01-15"
			const cell = createCellForDateString("2026-01-15");
			cell.setAttribute("aria-label", "January 15. Office");
			document.body.appendChild(cell);

			updateCellDOM("2026-01-15", "oof");

			expect(cell.dataset.selected).toBe("true");
			expect(cell.dataset.selectionType).toBe("oof");
			expect(cell.classList.contains("selected")).toBe(true);
			expect(cell.classList.contains("out-of-office")).toBe(true);
			expect(cell.ariaSelected).toBe("true");
		});

		it("should apply holiday selection state", () => {
			const cell = createCellForDateString("2026-01-15");
			cell.setAttribute("aria-label", "January 15. Office");
			document.body.appendChild(cell);

			updateCellDOM("2026-01-15", "holiday");

			expect(cell.dataset.selectionType).toBe("holiday");
			expect(cell.classList.contains("holiday")).toBe(true);
		});

		it("should clear selection state when state is null", () => {
			const cell = createCellForDateString("2026-01-15");
			cell.setAttribute("aria-label", "January 15. Out of office");
			cell.dataset.selected = "true";
			cell.dataset.selectionType = "oof";
			cell.classList.add("selected", "out-of-office");
			cell.ariaSelected = "true";
			document.body.appendChild(cell);

			updateCellDOM("2026-01-15", null);

			expect(cell.dataset.selected).toBe("false");
			expect(cell.dataset.selectionType).toBe("");
			expect(cell.classList.contains("selected")).toBe(false);
			expect(cell.classList.contains("out-of-office")).toBe(false);
			expect(cell.ariaSelected).toBe("false");
		});

		it("should update aria-label for oof state", () => {
			const cell = createCellForDateString("2026-01-15");
			cell.setAttribute("aria-label", "January 15. Office");
			document.body.appendChild(cell);

			updateCellDOM("2026-01-15", "oof");

			const label = cell.getAttribute("aria-label");
			expect(label).toContain("Out of office");
		});

		it("should handle missing cell gracefully", () => {
			// No cell in DOM — should not throw
			expect(() => updateCellDOM("2026-01-15", "oof")).not.toThrow();
		});
	});

	describe("clearMonthSelections", () => {
		it("should clear selected cells in a month container", () => {
			const container = document.createElement("div");
			container.id = "month-feb";

			// Use month=2 (March) so getDateFromCell guard passes (!month is false)
			const cell1 = document.createElement("td");
			cell1.className = "calendar-day selected";
			cell1.dataset.year = "2026";
			cell1.dataset.month = "2";
			cell1.dataset.day = "5";

			const cell2 = document.createElement("td");
			cell2.className = "calendar-day selected";
			cell2.dataset.year = "2026";
			cell2.dataset.month = "2";
			cell2.dataset.day = "6";

			const cell3 = document.createElement("td");
			cell3.className = "calendar-day";
			cell3.dataset.year = "2026";
			cell3.dataset.month = "2";
			cell3.dataset.day = "7";

			container.appendChild(cell1);
			container.appendChild(cell2);
			container.appendChild(cell3);
			document.body.appendChild(container);

			const button = document.createElement("button");
			button.setAttribute("aria-controls", "month-feb");

			const mockManager = {
				clearDates: vi.fn(),
			} as unknown as CalendarManager;

			const cleared = clearMonthSelections(button, mockManager);

			expect(cleared).toHaveLength(2);
			expect(mockManager.clearDates).toHaveBeenCalledWith(
				expect.arrayContaining([expect.stringMatching(/^2026-03-0[56]$/)]),
			);
		});

		it("should return empty array when button has no aria-controls", () => {
			const button = document.createElement("button");
			const mockManager = {
				clearDates: vi.fn(),
			} as unknown as CalendarManager;

			const cleared = clearMonthSelections(button, mockManager);
			expect(cleared).toEqual([]);
		});

		it("should return empty array when month container is not found", () => {
			const button = document.createElement("button");
			button.setAttribute("aria-controls", "nonexistent");
			const mockManager = {
				clearDates: vi.fn(),
			} as unknown as CalendarManager;

			const cleared = clearMonthSelections(button, mockManager);
			expect(cleared).toEqual([]);
		});

		it("should return empty array when no cells are selected", () => {
			const container = document.createElement("div");
			container.id = "month-feb";

			const cell = document.createElement("td");
			cell.className = "calendar-day";
			cell.dataset.year = "2026";
			cell.dataset.month = "2";
			cell.dataset.day = "1";
			container.appendChild(cell);
			document.body.appendChild(container);

			const button = document.createElement("button");
			button.setAttribute("aria-controls", "month-feb");

			const mockManager = {
				clearDates: vi.fn(),
			} as unknown as CalendarManager;

			const cleared = clearMonthSelections(button, mockManager);
			expect(cleared).toEqual([]);
			expect(mockManager.clearDates).not.toHaveBeenCalled();
		});
	});
});
