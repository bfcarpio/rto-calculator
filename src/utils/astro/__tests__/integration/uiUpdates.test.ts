/**
 * UI Updates Integration Tests
 *
 * Tests UI-specific functionality for validation results display,
 * including status icons, compliance indicators, and user feedback.
 *
 * Focus: UI state management and visual feedback mechanisms.
 */

import { beforeEach, describe, expect, it } from "vitest";
import type { WeekInfo } from "../../../../types";
import { setupBasicCalendarDOM } from "../test.setup";
import { createMockWeekInfo } from "../testHelpers";

// Mock UI update functions
const mockUIUpdates = {
	updateComplianceIndicator: (isValid: boolean, percentage: number) => {
		const messageContainer = document.getElementById(
			"validation-message",
		) as HTMLElement;

		if (!messageContainer) return;

		// Clear previous color classes
		messageContainer.classList.remove("success", "error", "warning");

		const percentageValue = Math.round(percentage * 100);

		if (isValid) {
			messageContainer.classList.add("success");
			messageContainer.textContent = `✓ RTO Compliant: Best 8 of 12 weeks average ${percentageValue}% compliance. Required: 60%`;
		} else {
			messageContainer.classList.add("error");
			messageContainer.textContent = `✗ RTO Not Compliant: Below required 60% threshold (${percentageValue}%.`;
		}

		messageContainer.style.display = "block";
		messageContainer.style.visibility = "visible";
	},

	updateWeekStatusIcon: (weekInfo: WeekInfo) => {
		const container = weekInfo.statusCellElement?.querySelector(
			".week-status-container",
		) as HTMLElement;
		if (!container) return;

		const icon = container.querySelector(".week-status-icon") as HTMLElement;
		const sr = container.querySelector(".sr-only") as HTMLElement;

		// Clear previous classes
		container.classList.remove(
			"evaluated",
			"compliant",
			"non-compliant",
			"excluded",
			"least-attended",
			"ignored",
		);

		// Five states based on WeekStatus:
		// "compliant": Green checkmark
		// "invalid": Red X
		// "pending": Hourglass
		// "excluded": Grey circle (weeks in 12-week window but not in evaluated set)
		// "ignored": Empty - no icon (weeks not in 12-week window)
		switch (weekInfo.status) {
			case "compliant":
				container.classList.add("evaluated", "compliant");
				icon.textContent = "✓";
				sr.textContent = "Compliant week";
				break;
			case "invalid":
				container.classList.add("evaluated", "non-compliant");
				icon.textContent = "✗";
				sr.textContent = "Invalid week - lowest office days in evaluated set";
				break;
			case "pending":
				container.classList.add("evaluated");
				icon.textContent = "⏳";
				sr.textContent = "Pending evaluation - part of invalid window";
				break;
			case "excluded":
				container.classList.add("evaluated", "excluded");
				icon.textContent = "○";
				sr.textContent =
					"Excluded - in evaluation window but not evaluated (worst 4 weeks)";
				break;
			case "ignored":
			default:
				// Empty status for weeks not in the 12-week evaluation window
				icon.textContent = "";
				sr.textContent = "";
				break;
		}
	},

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

	clearAllStatusIcons: () => {
		document.querySelectorAll(".week-status-container").forEach((container) => {
			const containerEl = container as HTMLElement;
			containerEl.classList.remove(
				"evaluated",
				"compliant",
				"non-compliant",
				"excluded",
				"least-attended",
				"ignored",
			);
			const icon = container.querySelector(".week-status-icon") as HTMLElement;
			const sr = container.querySelector(".sr-only") as HTMLElement;
			if (icon) icon.textContent = "";
			if (sr) sr.textContent = "";
		});
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
				const year = parseInt(cellEl.dataset.year || "0");
				const month = parseInt(cellEl.dataset.month || "0");
				const day = parseInt(cellEl.dataset.day || "0");
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
// Status Icon Tests
// ============================================================================

describe("UI Updates - Status Icon States", () => {
	beforeEach(() => {
		setupBasicCalendarDOM(3);
	});

	it("should show green checkmark for compliant weeks in best 8", () => {
		const weekStart = new Date(2025, 0, 6);
		const week: WeekInfo = createMockWeekInfo(weekStart, [], {
			weekNumber: 1,
			wfhCount: 2,
			officeDays: 3,
			isCompliant: true,
			status: "compliant",
		});

		mockUIUpdates.updateWeekStatusIcon(week);

		const icon = week.statusCellElement?.querySelector(
			".week-status-icon",
		) as HTMLElement;
		const container = week.statusCellElement?.querySelector(
			".week-status-container",
		) as HTMLElement;

		expect(icon?.textContent).toBe("✓");
		expect(container?.classList.contains("compliant")).toBe(true);
		expect(container?.classList.contains("evaluated")).toBe(true);
	});

	it("should show red X for invalid weeks", () => {
		const weekStart = new Date(2025, 0, 6);
		const week: WeekInfo = createMockWeekInfo(weekStart, [], {
			weekNumber: 1,
			wfhCount: 3,
			officeDays: 2,
			isCompliant: false,
			status: "invalid",
		});

		mockUIUpdates.updateWeekStatusIcon(week);

		const icon = week.statusCellElement?.querySelector(
			".week-status-icon",
		) as HTMLElement;
		const container = week.statusCellElement?.querySelector(
			".week-status-container",
		) as HTMLElement;

		expect(icon?.textContent).toBe("✗");
		expect(container?.classList.contains("non-compliant")).toBe(true);
	});

	it("should show empty status for ignored weeks (not in evaluated window)", () => {
		const weekStart = new Date(2025, 0, 6);
		const week: WeekInfo = createMockWeekInfo(weekStart, [], {
			weekNumber: 1,
			wfhCount: 2,
			officeDays: 3,
			isCompliant: true,
			status: "ignored",
		});

		mockUIUpdates.updateWeekStatusIcon(week);

		const icon = week.statusCellElement?.querySelector(
			".week-status-icon",
		) as HTMLElement;
		const container = week.statusCellElement?.querySelector(
			".week-status-container",
		) as HTMLElement;

		expect(icon?.textContent).toBe("");
		expect(container?.classList.contains("evaluated")).toBe(false);
		expect(container?.classList.contains("compliant")).toBe(false);
	});

	it("should show grey circle for excluded weeks (in window but not evaluated)", () => {
		const weekStart = new Date(2025, 0, 6);
		const week: WeekInfo = createMockWeekInfo(weekStart, [], {
			weekNumber: 1,
			wfhCount: 2,
			officeDays: 3,
			isCompliant: true,
			status: "excluded",
		});

		mockUIUpdates.updateWeekStatusIcon(week);

		const icon = week.statusCellElement?.querySelector(
			".week-status-icon",
		) as HTMLElement;
		const container = week.statusCellElement?.querySelector(
			".week-status-container",
		) as HTMLElement;

		expect(icon?.textContent).toBe("○");
		expect(container?.classList.contains("evaluated")).toBe(true);
		expect(container?.classList.contains("excluded")).toBe(true);
		expect(container?.classList.contains("compliant")).toBe(false);
	});

	it("should show hourglass for pending weeks in invalid window", () => {
		const weekStart = new Date(2025, 0, 6);
		const week: WeekInfo = createMockWeekInfo(weekStart, [], {
			weekNumber: 1,
			wfhCount: 2,
			officeDays: 3,
			isCompliant: true,
			status: "pending",
		});

		mockUIUpdates.updateWeekStatusIcon(week);

		const icon = week.statusCellElement?.querySelector(
			".week-status-icon",
		) as HTMLElement;
		const container = week.statusCellElement?.querySelector(
			".week-status-container",
		) as HTMLElement;

		expect(icon?.textContent).toBe("⏳");
		expect(container?.classList.contains("evaluated")).toBe(true);
	});

	it("should not have conflicting classes on status cells", () => {
		const weekStart = new Date(2025, 0, 6);
		const week: WeekInfo = createMockWeekInfo(weekStart, [], {
			weekNumber: 1,
			wfhCount: 2,
			officeDays: 3,
			isCompliant: true,
			status: "ignored",
		});

		// First mark as compliant
		week.status = "compliant";
		mockUIUpdates.updateWeekStatusIcon(week);
		let container = week.statusCellElement?.querySelector(
			".week-status-container",
		) as HTMLElement;
		expect(container?.classList.contains("compliant")).toBe(true);
		expect(container?.classList.contains("non-compliant")).toBe(false);

		// Then mark as ignored
		week.status = "ignored";
		mockUIUpdates.updateWeekStatusIcon(week);
		container = week.statusCellElement?.querySelector(
			".week-status-container",
		) as HTMLElement;
		expect(container?.classList.contains("evaluated")).toBe(false);
		expect(container?.classList.contains("compliant")).toBe(false);
		expect(container?.classList.contains("non-compliant")).toBe(false);
		expect(container?.classList.contains("excluded")).toBe(false);
		expect(container?.classList.contains("ignored")).toBe(false);
	});
});

// ============================================================================
// Icon Class Management Tests
// ============================================================================

describe("UI Updates - Icon Class Management", () => {
	beforeEach(() => {
		setupBasicCalendarDOM(3);
	});

	it("should remove all old classes before applying new ones", () => {
		const weekStart = new Date(2025, 0, 6);
		const week: WeekInfo = createMockWeekInfo(weekStart, [], {
			weekNumber: 1,
			wfhCount: 2,
			officeDays: 3,
			isCompliant: true,
			status: "compliant",
		});

		// Manually add conflicting classes
		const container = week.statusCellElement?.querySelector(
			".week-status-container",
		) as HTMLElement;
		container.classList.add("non-compliant");

		// Update should clear old classes
		mockUIUpdates.updateWeekStatusIcon(week);

		expect(container?.classList.contains("compliant")).toBe(true);
		expect(container?.classList.contains("non-compliant")).toBe(false);
	});

	it("should only have violation class on invalid weeks", () => {
		const weekStart = new Date(2025, 0, 6);
		const week: WeekInfo = createMockWeekInfo(weekStart, [], {
			weekNumber: 1,
			wfhCount: 3,
			officeDays: 2,
			isCompliant: false,
			status: "invalid",
		});

		mockUIUpdates.updateWeekStatusIcon(week);

		const container = week.statusCellElement?.querySelector(
			".week-status-container",
		) as HTMLElement;
		expect(container?.classList.contains("non-compliant")).toBe(true);
		expect(container?.classList.contains("compliant")).toBe(false);
	});

	it("should not have evaluated class on ignored weeks", () => {
		const weekStart = new Date(2025, 0, 6);
		const week: WeekInfo = createMockWeekInfo(weekStart, [], {
			weekNumber: 1,
			wfhCount: 2,
			officeDays: 3,
			isCompliant: true,
			status: "ignored",
		});

		mockUIUpdates.updateWeekStatusIcon(week);

		const container = week.statusCellElement?.querySelector(
			".week-status-container",
		) as HTMLElement;
		expect(container?.classList.contains("evaluated")).toBe(false);
		expect(container?.classList.contains("compliant")).toBe(false);
		expect(container?.classList.contains("non-compliant")).toBe(false);
		expect(container?.classList.contains("ignored")).toBe(false);
	});

	it("should not apply compliant or non-compliant class to ignored weeks", () => {
		const weekStart = new Date(2025, 0, 6);
		const week: WeekInfo = createMockWeekInfo(weekStart, [], {
			weekNumber: 1,
			wfhCount: 2,
			officeDays: 3,
			isCompliant: true,
			status: "ignored",
		});

		mockUIUpdates.updateWeekStatusIcon(week);

		const container = week.statusCellElement?.querySelector(
			".week-status-container",
		) as HTMLElement;
		expect(container?.classList.contains("evaluated")).toBe(false);
		expect(container?.classList.contains("compliant")).toBe(false);
		expect(container?.classList.contains("non-compliant")).toBe(false);
		expect(container?.classList.contains("ignored")).toBe(false);
	});
});

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

	it("should show compliant message for valid results", () => {
		mockUIUpdates.updateComplianceIndicator(true, 0.75);

		const messageContainer = document.getElementById(
			"validation-message",
		) as HTMLElement;

		expect(messageContainer?.classList.contains("success")).toBe(true);
		expect(messageContainer?.classList.contains("error")).toBe(false);
		expect(messageContainer?.textContent).toContain("RTO Compliant");
		expect(messageContainer?.textContent).toContain("75%");
	});

	it("should show violation message for invalid results", () => {
		mockUIUpdates.updateComplianceIndicator(false, 0.4);

		const messageContainer = document.getElementById(
			"validation-message",
		) as HTMLElement;

		expect(messageContainer?.classList.contains("error")).toBe(true);
		expect(messageContainer?.classList.contains("success")).toBe(false);
		expect(messageContainer?.textContent).toContain("Not Compliant");
		expect(messageContainer?.textContent).toContain("40%");
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
			const year = parseInt(cellEl.dataset.year || "0");
			const month = parseInt(cellEl.dataset.month || "0");
			const day = parseInt(cellEl.dataset.day || "0");
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
			const year = parseInt(cellEl.getAttribute("data-year") || "0");
			const month = parseInt(cellEl.getAttribute("data-month") || "0");
			const day = parseInt(cellEl.getAttribute("data-day") || "0");
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

// ============================================================================
// Integration Scenarios
// ============================================================================

describe("UI Updates - Integration Scenarios", () => {
	beforeEach(() => {
		setupBasicCalendarDOM(12);
	});

	it("should handle full validation cycle with compliant result", () => {
		const weeks: WeekInfo[] = [];
		for (let i = 0; i < 8; i++) {
			const weekStart = new Date(2025, 0, 6 + i * 7);
			const week = createMockWeekInfo(weekStart, [], {
				weekNumber: i + 1,
				wfhCount: 2,
				officeDays: 3,
				isCompliant: true,
			});
			weeks.push(week);
		}

		// Update compliance indicator
		mockUIUpdates.updateComplianceIndicator(true, 0.6);

		// Update all status icons (all compliant)
		weeks.forEach((week) => {
			week.status = "compliant";
			mockUIUpdates.updateWeekStatusIcon(week);
		});

		// Verify
		const messageContainer = document.getElementById(
			"validation-message",
		) as HTMLElement;
		expect(messageContainer?.classList.contains("success")).toBe(true);
		expect(messageContainer?.classList.contains("error")).toBe(false);

		weeks.forEach((week) => {
			const container = week.statusCellElement?.querySelector(
				".week-status-container",
			) as HTMLElement;
			expect(container?.classList.contains("compliant")).toBe(true);
			const icon = container?.querySelector(".week-status-icon") as HTMLElement;
			expect(icon?.textContent).toBe("✓");
		});
	});

	it("should handle full validation cycle with violation result", () => {
		const weeks: WeekInfo[] = [];
		for (let i = 0; i < 8; i++) {
			const weekStart = new Date(2025, 0, 6 + i * 7);
			const week = createMockWeekInfo(weekStart, [], {
				weekNumber: i + 1,
				wfhCount: 3,
				officeDays: 2,
				isCompliant: false,
			});
			weeks.push(week);
		}

		// Update compliance indicator
		mockUIUpdates.updateComplianceIndicator(false, 0.4);

		// Update all status icons (all invalid in this scenario)
		weeks.forEach((week) => {
			week.status = "invalid";
			mockUIUpdates.updateWeekStatusIcon(week);
		});

		// Verify
		const messageContainer = document.getElementById(
			"validation-message",
		) as HTMLElement;
		expect(messageContainer?.classList.contains("error")).toBe(true);
		expect(messageContainer?.classList.contains("success")).toBe(false);

		weeks.forEach((week) => {
			const container = week.statusCellElement?.querySelector(
				".week-status-container",
			) as HTMLElement;
			expect(container?.classList.contains("non-compliant")).toBe(true);
			const icon = container?.querySelector(".week-status-icon") as HTMLElement;
			expect(icon?.textContent).toBe("✗");
		});
	});

	it("should handle mixed compliance scenario", () => {
		const weeks: WeekInfo[] = [];
		for (let i = 0; i < 12; i++) {
			const weekStart = new Date(2025, 0, 6 + i * 7);
			const week = createMockWeekInfo(weekStart, [], {
				weekNumber: i + 1,
				wfhCount: 2,
				officeDays: 3,
				isCompliant: true,
			});
			weeks.push(week);
		}

		// First 8 weeks are compliant (in evaluated set), last 4 are ignored
		weeks.forEach((week, index) => {
			week.status = index < 8 ? "compliant" : "ignored";
			mockUIUpdates.updateWeekStatusIcon(week);
		});

		// Verify counts
		let compliantCount = 0;
		let ignoredCount = 0;

		weeks.forEach((week) => {
			const container = week.statusCellElement?.querySelector(
				".week-status-container",
			) as HTMLElement;
			const icon = container?.querySelector(".week-status-icon") as HTMLElement;

			if (container?.classList.contains("compliant")) compliantCount++;
			else if (
				icon?.textContent === "" &&
				!container?.classList.contains("ignored")
			)
				ignoredCount++;
		});

		expect(compliantCount).toBe(8);
		expect(ignoredCount).toBe(4);
	});

	it("should mark individual non-compliant weeks as invalid even when overall validation is valid", () => {
		const weeks: WeekInfo[] = [];

		// Create weeks with mixed compliance:
		// Weeks 1-4: 2 WFH (3 office days = 60%) - compliant
		// Week 5: 5 WFH (0 office days = 0%) - NOT compliant
		// Weeks 6-8: 0 WFH (5 office days = 100%) - compliant
		const wfhPatterns = [2, 2, 2, 2, 5, 0, 0, 0];

		for (let i = 0; i < 8; i++) {
			const weekStart = new Date(2025, 0, 6 + i * 7);
			const wfhCount = wfhPatterns[i]!;
			const officeDays = 5 - wfhCount;
			const week = createMockWeekInfo(weekStart, [], {
				weekNumber: i + 1,
				wfhCount,
				officeDays,
				isCompliant: officeDays >= 3, // Only week 5 is not compliant
			});
			weeks.push(week);
		}

		// Simulate overall validation being valid (average >= 60%)
		// But individual week compliance should still be checked
		weeks.forEach((week) => {
			// This is the corrected logic: check individual compliance first
			if (!week.isCompliant) {
				week.status = "invalid";
			} else {
				week.status = "compliant";
			}
			mockUIUpdates.updateWeekStatusIcon(week);
		});

		// Verify that week 5 (0 office days) is marked as invalid
		const week5Container = weeks[4]?.statusCellElement?.querySelector(
			".week-status-container",
		) as HTMLElement;
		expect(week5Container?.classList.contains("non-compliant")).toBe(true);
		const week5Icon = week5Container?.querySelector(
			".week-status-icon",
		) as HTMLElement;
		expect(week5Icon?.textContent).toBe("✗");

		// Verify that compliant weeks are marked as compliant
		for (let i = 0; i < 8; i++) {
			if (i === 4) continue; // Skip week 5
			const container = weeks[i]?.statusCellElement?.querySelector(
				".week-status-container",
			) as HTMLElement;
			expect(container?.classList.contains("compliant")).toBe(true);
			const icon = container?.querySelector(".week-status-icon") as HTMLElement;
			expect(icon?.textContent).toBe("✓");
		}
	});
});

// ============================================================================
// Accessibility Tests
// ============================================================================

describe("UI Updates - Accessibility", () => {
	beforeEach(() => {
		setupBasicCalendarDOM(3);
	});

	it("should provide screen reader text for compliant weeks", () => {
		const weekStart = new Date(2025, 0, 6);
		const week: WeekInfo = createMockWeekInfo(weekStart, [], {
			weekNumber: 1,
			wfhCount: 2,
			officeDays: 3,
			isCompliant: true,
			status: "compliant",
		});

		mockUIUpdates.updateWeekStatusIcon(week);

		const sr = week.statusCellElement?.querySelector(".sr-only") as HTMLElement;
		expect(sr?.textContent).toBe("Compliant week");
	});

	it("should provide screen reader text for invalid weeks", () => {
		const weekStart = new Date(2025, 0, 6);
		const week: WeekInfo = createMockWeekInfo(weekStart, [], {
			weekNumber: 1,
			wfhCount: 3,
			officeDays: 2,
			isCompliant: false,
			status: "invalid",
		});

		mockUIUpdates.updateWeekStatusIcon(week);

		const sr = week.statusCellElement?.querySelector(".sr-only") as HTMLElement;
		expect(sr?.textContent).toBe(
			"Invalid week - lowest office days in evaluated set",
		);
	});

	it("should provide no screen reader text for ignored weeks", () => {
		const weekStart = new Date(2025, 0, 6);
		const week: WeekInfo = createMockWeekInfo(weekStart, [], {
			weekNumber: 1,
			wfhCount: 2,
			officeDays: 3,
			isCompliant: true,
			status: "ignored",
		});

		mockUIUpdates.updateWeekStatusIcon(week);

		const sr = week.statusCellElement?.querySelector(".sr-only") as HTMLElement;
		expect(sr?.textContent).toBe("");
	});

	it("should keep icon with aria-hidden attribute", () => {
		const weekStart = new Date(2025, 0, 6);
		const week: WeekInfo = createMockWeekInfo(weekStart, [], {
			weekNumber: 1,
			wfhCount: 2,
			officeDays: 3,
			isCompliant: true,
			status: "compliant",
		});

		mockUIUpdates.updateWeekStatusIcon(week);

		const icon = week.statusCellElement?.querySelector(
			".week-status-icon",
		) as HTMLElement;
		expect(icon?.getAttribute("aria-hidden")).toBe("true");
	});
});

// ============================================================================
// Edge Cases
// ============================================================================

describe("UI Updates - Edge Cases", () => {
	beforeEach(() => {
		setupBasicCalendarDOM(3);
	});

	it("should handle scenario where all weeks are compliant", () => {
		const weeks: WeekInfo[] = [];
		for (let i = 0; i < 3; i++) {
			const weekStart = new Date(2025, 0, 6 + i * 7);
			const week = createMockWeekInfo(weekStart, [], {
				weekNumber: i + 1,
				wfhCount: 2,
				officeDays: 3,
				isCompliant: true,
			});
			weeks.push(week);
		}

		weeks.forEach((week) => {
			week.status = "compliant";
			mockUIUpdates.updateWeekStatusIcon(week);
		});

		weeks.forEach((week) => {
			const container = week.statusCellElement?.querySelector(
				".week-status-container",
			) as HTMLElement;
			expect(container?.classList.contains("compliant")).toBe(true);
			expect(container?.classList.contains("non-compliant")).toBe(false);
		});
	});

	it("should handle scenario where all weeks are non-compliant", () => {
		const weeks: WeekInfo[] = [];
		for (let i = 0; i < 3; i++) {
			const weekStart = new Date(2025, 0, 6 + i * 7);
			const week = createMockWeekInfo(weekStart, [], {
				weekNumber: i + 1,
				wfhCount: 3,
				officeDays: 2,
				isCompliant: false,
			});
			weeks.push(week);
		}

		weeks.forEach((week) => {
			week.status = "invalid";
			mockUIUpdates.updateWeekStatusIcon(week);
		});

		weeks.forEach((week) => {
			const container = week.statusCellElement?.querySelector(
				".week-status-container",
			) as HTMLElement;
			expect(container?.classList.contains("non-compliant")).toBe(true);
			expect(container?.classList.contains("compliant")).toBe(false);
		});
	});

	it("should handle empty selections scenario", () => {
		mockUIUpdates.updateComplianceIndicator(true, 1.0);

		const messageContainer = document.getElementById(
			"validation-message",
		) as HTMLElement;

		expect(messageContainer?.classList.contains("success")).toBe(true);
		expect(messageContainer?.textContent).toContain("100%");
	});

	it("should handle boundary case with exactly 60% compliance", () => {
		mockUIUpdates.updateComplianceIndicator(true, 0.6);

		const messageContainer = document.getElementById(
			"validation-message",
		) as HTMLElement;

		expect(messageContainer?.classList.contains("success")).toBe(true);
		expect(messageContainer?.textContent).toContain("60%");
	});

	it("should handle boundary case just below 60% (59%)", () => {
		mockUIUpdates.updateComplianceIndicator(false, 0.59);

		const messageContainer = document.getElementById(
			"validation-message",
		) as HTMLElement;

		expect(messageContainer?.classList.contains("error")).toBe(true);
		expect(messageContainer?.textContent).toContain("59%");
	});

	it("should handle weeks with identical office day counts", () => {
		const week1 = createMockWeekInfo(new Date(2025, 0, 6), [], {
			weekNumber: 1,
			wfhCount: 2,
			officeDays: 3,
			isCompliant: true,
			status: "compliant",
		});

		const week2 = createMockWeekInfo(new Date(2025, 0, 13), [], {
			weekNumber: 2,
			wfhCount: 2,
			officeDays: 3,
			isCompliant: true,
			status: "ignored",
		});

		// First in evaluated set, second ignored
		mockUIUpdates.updateWeekStatusIcon(week1);
		mockUIUpdates.updateWeekStatusIcon(week2);

		const container1 = week1.statusCellElement?.querySelector(
			".week-status-container",
		) as HTMLElement;
		const container2 = week2.statusCellElement?.querySelector(
			".week-status-container",
		) as HTMLElement;

		expect(container1?.classList.contains("compliant")).toBe(true);
		expect(container2?.classList.contains("evaluated")).toBe(false);
		expect(container2?.classList.contains("compliant")).toBe(false);
		expect(container2?.classList.contains("non-compliant")).toBe(false);
	});
});
