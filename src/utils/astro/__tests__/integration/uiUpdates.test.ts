/**
 * UI Updates Integration Tests
 *
 * Tests UI-specific functionality for validation results display
 * and user feedback.
 *
 * Focus: UI state management and visual feedback mechanisms.
 */

import { beforeEach, describe, expect, it } from "vitest";
import { setupBasicCalendarDOM } from "../test.setup";

// Mock UI update functions (pattern/selection helpers)
const mockUIUpdates = {
	showValidationMessage: (message: string, type: "success" | "error") => {
		const messageContainer = document.getElementById(
			"validation-message",
		) as HTMLElement;
		if (!messageContainer) return;

		messageContainer.textContent = message;
		messageContainer.style.display = "block";
		messageContainer.style.visibility = "visible";

		if (type === "success") {
			messageContainer.classList.add("message-success");
			messageContainer.classList.remove("message-error");
		} else {
			messageContainer.classList.add("message-error");
			messageContainer.classList.remove("message-success");
		}
	},

	hideValidationMessage: () => {
		const messageContainer = document.getElementById(
			"validation-message",
		) as HTMLElement;
		if (!messageContainer) return;

		messageContainer.style.display = "none";
		messageContainer.style.visibility = "hidden";
	},

	applyPatternToCalendar: (
		_pattern: "mwf" | "tt" | "all",
		patternDays: number[],
	) => {
		const cells = document.querySelectorAll(".calendar-day");
		cells.forEach((cell) => {
			const cellEl = cell as HTMLElement;
			const isSelected = cellEl.dataset.selected === "true";
			const selectionType = cellEl.dataset.selectionType;

			// Only apply to unselected days
			if (!isSelected && !selectionType) {
				const year = parseInt(cellEl.dataset.year || "0", 10);
				const month = parseInt(cellEl.dataset.month || "0", 10);
				const day = parseInt(cellEl.dataset.day || "0", 10);
				const date = new Date(year, month, day);
				const dayOfWeek = date.getDay();

				// Only apply pattern to weekdays (1-5 = Mon-Fri)
				const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;
				if (isWeekday && patternDays.includes(dayOfWeek)) {
					// Apply work-from-home selection
					cellEl.dataset.selected = "true";
					cellEl.dataset.selectionType = "work-from-home";
					cellEl.classList.add("selected", "work-from-home");
					cellEl.setAttribute("aria-selected", "true");
				}
			}
		});
	},

	clearAllSelections: () => {
		document.querySelectorAll(".calendar-day").forEach((cell) => {
			const cellEl = cell as HTMLElement;
			cellEl.dataset.selected = "false";
			cellEl.dataset.selectionType = "";
			cellEl.classList.remove("selected", "work-from-home", "office");
			cellEl.ariaSelected = "false";
		});
	},
};

// ============================================================================
// Validation Message Display Tests
// ============================================================================

describe("UI Updates - Validation Message Display", () => {
	beforeEach(() => {
		setupBasicCalendarDOM(3);
	});

	it("should display validation message after validation", () => {
		const messageContainer = document.getElementById(
			"validation-message",
		) as HTMLElement;

		expect(messageContainer.style.display).toBe("none");

		mockUIUpdates.showValidationMessage("Test message", "success");

		expect(messageContainer.style.display).toBe("block");
		expect(messageContainer.style.visibility).toBe("visible");
		expect(messageContainer.textContent).toBe("Test message");
	});

	it("should set visibility to visible when displaying message", () => {
		const messageContainer = document.getElementById(
			"validation-message",
		) as HTMLElement;

		mockUIUpdates.showValidationMessage("Test", "success");

		expect(messageContainer.style.display).toBe("block");
		expect(messageContainer.style.visibility).toBe("visible");
	});
});

// ============================================================================
// Clear and Reset Tests
// ============================================================================

describe("UI Updates - Clear and Reset", () => {
	beforeEach(() => {
		setupBasicCalendarDOM(3);
	});

	it("should clear validation message", () => {
		const messageContainer = document.getElementById(
			"validation-message",
		) as HTMLElement;

		// Show message
		mockUIUpdates.showValidationMessage("Test message", "success");
		expect(messageContainer.style.display).toBe("block");

		// Hide message
		mockUIUpdates.hideValidationMessage();

		expect(messageContainer.style.display).toBe("none");
		expect(messageContainer.style.visibility).toBe("hidden");
	});

	it("should clear all selections from calendar", () => {
		// Setup: Select some cells
		const cells = document.querySelectorAll(".calendar-day");
		(cells[0] as HTMLElement).classList.add("selected");
		(cells[0] as HTMLElement).setAttribute(
			"data-selection-type",
			"work-from-home",
		);
		(cells[0] as HTMLElement).dataset.selected = "true";
		(cells[1] as HTMLElement).classList.add("selected");
		(cells[1] as HTMLElement).setAttribute("data-selection-type", "office");
		(cells[1] as HTMLElement).dataset.selected = "true";

		// Clear all selections
		mockUIUpdates.clearAllSelections();

		// Verify all cleared
		cells.forEach((cell) => {
			const cellEl = cell as HTMLElement;
			expect(cellEl.classList.contains("selected")).toBe(false);
			expect(cellEl.getAttribute("data-selection-type")).toBe("");
			expect(cellEl.dataset.selected).toBe("false");
		});
	});
});

// ============================================================================
// Pattern Application Tests
// ============================================================================

describe("UI Updates - Pattern Application", () => {
	beforeEach(() => {
		setupBasicCalendarDOM(3);
	});

	it("should apply Mon-Wed-Fri pattern correctly", () => {
		mockUIUpdates.applyPatternToCalendar("mwf", [1, 3, 5]);

		// Jan 6 (Monday) should be selected
		const monday = document.querySelector('[data-day="6"]') as HTMLElement;
		expect(monday?.classList.contains("selected")).toBe(true);
		expect(monday?.getAttribute("data-selection-type")).toBe("work-from-home");

		// Jan 7 (Tuesday) should NOT be selected
		const tuesday = document.querySelector('[data-day="7"]') as HTMLElement;
		expect(tuesday?.classList.contains("selected")).toBe(false);
		const selectionType = tuesday?.getAttribute("data-selection-type");
		expect(selectionType === null || selectionType === "").toBe(true);

		// Jan 8 (Wednesday) should be selected
		const wednesday = document.querySelector('[data-day="8"]') as HTMLElement;
		expect(wednesday?.classList.contains("selected")).toBe(true);
		expect(wednesday?.getAttribute("data-selection-type")).toBe(
			"work-from-home",
		);

		// Jan 10 (Friday) should be selected
		const friday = document.querySelector('[data-day="10"]') as HTMLElement;
		expect(friday?.classList.contains("selected")).toBe(true);
		expect(friday?.getAttribute("data-selection-type")).toBe("work-from-home");
	});

	it("should apply Tue-Thu pattern correctly", () => {
		mockUIUpdates.applyPatternToCalendar("tt", [2, 4]);

		// Jan 7 (Tuesday) should be selected
		const tuesday = document.querySelector('[data-day="7"]') as HTMLElement;
		expect(tuesday?.classList.contains("selected")).toBe(true);
		expect(tuesday?.getAttribute("data-selection-type")).toBe("work-from-home");

		// Jan 9 (Thursday) should be selected
		const thursday = document.querySelector('[data-day="9"]') as HTMLElement;
		expect(thursday?.classList.contains("selected")).toBe(true);
		expect(thursday?.getAttribute("data-selection-type")).toBe(
			"work-from-home",
		);

		// Monday should not be selected
		const monday = document.querySelector('[data-day="6"]') as HTMLElement;
		expect(monday?.classList.contains("selected")).toBe(false);
		const selectionType = monday?.getAttribute("data-selection-type");
		expect(selectionType === null || selectionType === "").toBe(true);
	});

	it("should apply all weekdays pattern correctly", () => {
		mockUIUpdates.applyPatternToCalendar("all", [1, 2, 3, 4, 5]);

		const cells = document.querySelectorAll(".calendar-day");
		let selectedCount = 0;

		cells.forEach((cell) => {
			const cellEl = cell as HTMLElement;
			const year = parseInt(cellEl.dataset.year || "0", 10);
			const month = parseInt(cellEl.dataset.month || "0", 10);
			const day = parseInt(cellEl.dataset.day || "0", 10);
			const date = new Date(year, month, day);
			const dayOfWeek = date.getDay();

			if (dayOfWeek >= 1 && dayOfWeek <= 5) {
				expect(cellEl.classList.contains("selected")).toBe(true);
				expect(cellEl.getAttribute("data-selection-type")).toBe(
					"work-from-home",
				);
				selectedCount++;
			}
		});

		// Should have selected all weekdays (5 per week * 3 weeks = 15)
		expect(selectedCount).toBe(15);
	});

	it("should handle empty pattern", () => {
		// First select some cells
		const cells = document.querySelectorAll(".calendar-day");
		(cells[0] as HTMLElement).classList.add("selected");
		(cells[0] as HTMLElement).setAttribute(
			"data-selection-type",
			"work-from-home",
		);
		(cells[0] as HTMLElement).classList.add("work-from-home");
		(cells[0] as HTMLElement).dataset.selected = "true";

		// Apply empty pattern
		mockUIUpdates.applyPatternToCalendar("mwf", []);

		// Already-selected cells should remain selected
		const cellEl0 = cells[0] as HTMLElement;
		expect(cellEl0.classList.contains("selected")).toBe(true);
		expect(cellEl0.getAttribute("data-selection-type")).toBe("work-from-home");

		// Other cells should remain unselected
		for (let i = 1; i < cells.length; i++) {
			const cellEl = cells[i] as HTMLElement;
			expect(cellEl.classList.contains("selected")).toBe(false);
			const selectionType = cellEl.getAttribute("data-selection-type");
			expect(selectionType === null || selectionType === "").toBe(true);
		}
	});

	it("should allow pattern application after clearing all selections", () => {
		// Setup: Select some cells
		const cells = document.querySelectorAll(".calendar-day");
		(cells[0] as HTMLElement).classList.add("selected");
		(cells[0] as HTMLElement).setAttribute(
			"data-selection-type",
			"work-from-home",
		);
		(cells[0] as HTMLElement).classList.add("work-from-home");
		(cells[0] as HTMLElement).dataset.selected = "true";
		(cells[1] as HTMLElement).classList.add("selected");
		(cells[1] as HTMLElement).setAttribute(
			"data-selection-type",
			"work-from-home",
		);
		(cells[1] as HTMLElement).classList.add("work-from-home");
		(cells[1] as HTMLElement).dataset.selected = "true";

		// Clear all selections
		mockUIUpdates.clearAllSelections();

		// Verify cells are properly reset
		cells.forEach((cell) => {
			const cellEl = cell as HTMLElement;
			expect(cellEl.classList.contains("selected")).toBe(false);
			const selectionType = cellEl.getAttribute("data-selection-type");
			expect(selectionType === null || selectionType === "").toBe(true);
			expect(cellEl.dataset.selected).toBe("false");
		});

		// Apply pattern (Mon-Wed-Fri = [1, 3, 5])
		mockUIUpdates.applyPatternToCalendar("mwf", [1, 3, 5]);

		// Verify pattern was applied to unselected weekday cells
		let appliedCount = 0;
		cells.forEach((cell) => {
			const cellEl = cell as HTMLElement;
			const year = parseInt(cellEl.getAttribute("data-year") || "0", 10);
			const month = parseInt(cellEl.getAttribute("data-month") || "0", 10);
			const day = parseInt(cellEl.getAttribute("data-day") || "0", 10);
			const date = new Date(year, month, day);
			const dayOfWeek = date.getDay();

			// Check if this is a weekday in the pattern
			if (dayOfWeek >= 1 && dayOfWeek <= 5 && [1, 3, 5].includes(dayOfWeek)) {
				// Should be selected with work-from-home
				expect(cellEl.classList.contains("selected")).toBe(true);
				expect(cellEl.classList.contains("work-from-home")).toBe(true);
				expect(cellEl.getAttribute("data-selection-type")).toBe(
					"work-from-home",
				);
				expect(cellEl.dataset.selected).toBe("true");
				appliedCount++;
			} else {
				// Should remain unselected
				expect(cellEl.classList.contains("selected")).toBe(false);
				const selectionType = cellEl.getAttribute("data-selection-type");
				expect(selectionType === null || selectionType === "").toBe(true);
				expect(cellEl.dataset.selected).toBe("false");
			}
		});

		// Should have applied pattern to weekdays
		expect(appliedCount).toBeGreaterThan(0);
	});
});
