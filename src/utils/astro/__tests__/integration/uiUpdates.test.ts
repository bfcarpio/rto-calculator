/**
 * UI Updates Integration Tests
 *
 * Tests UI-specific functionality for validation results display,
 * including status icons, compliance indicators, and user feedback.
 *
 * Focus: UI state management and visual feedback mechanisms.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { setupBasicCalendarDOM } from "../test.setup";
import { createMockWeekInfo } from "../testHelpers";
import type { WeekInfo } from "../../../../types";

// Mock UI update functions
const mockUIUpdates = {
  updateComplianceIndicator: (isValid: boolean, percentage: number) => {
    const indicator = document.getElementById(
      "compliance-indicator",
    ) as HTMLElement;
    const icon = document.getElementById("compliance-icon") as HTMLElement;
    const text = document.getElementById("compliance-text") as HTMLElement;
    const messageContainer = document.getElementById(
      "validation-message",
    ) as HTMLElement;

    if (!indicator || !icon || !text) return;

    // Clear previous classes
    indicator.classList.remove("compliant", "non-compliant");

    const percentageValue = Math.round(percentage * 100);

    if (isValid) {
      indicator.classList.add("compliant");
      icon.textContent = "✓";
      text.textContent = `Compliant (${percentageValue}%)`;
      messageContainer.textContent = `✓ RTO Compliant: Best 8 of 12 weeks average ${percentageValue}% compliance. Required: 60%`;
    } else {
      indicator.classList.add("non-compliant");
      icon.textContent = "✗";
      text.textContent = `Not Compliant (${percentageValue}%)`;
      messageContainer.textContent = `✗ RTO Not Compliant: Below required 60% threshold (${percentageValue}%).`;
    }

    messageContainer.style.display = "block";
    messageContainer.style.visibility = "visible";
  },

  updateWeekStatusIcon: (
    weekInfo: WeekInfo,
    inBest8: boolean,
    isCompliant?: boolean,
  ) => {
    const container = weekInfo.statusCellElement?.querySelector(
      ".week-status-container",
    ) as HTMLElement;
    if (!container) return;

    const icon = container.querySelector(".week-status-icon") as HTMLElement;
    const sr = container.querySelector(".sr-only") as HTMLElement;

    // Clear previous classes
    container.classList.remove("compliant", "non-compliant", "least-attended");

    if (inBest8) {
      const compliant =
        isCompliant !== undefined ? isCompliant : weekInfo.isCompliant;
      container.classList.add(compliant ? "compliant" : "non-compliant");
      icon.textContent = compliant ? "✓" : "✗";
      sr.textContent = compliant ? "Compliant week" : "Non-compliant week";
    } else {
      container.classList.add("least-attended");
      icon.textContent = "○";
      sr.textContent = "Week excluded from best 8";
    }

    container.classList.add("evaluated");
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
        "least-attended",
      );
      const icon = container.querySelector(".week-status-icon") as HTMLElement;
      const sr = container.querySelector(".sr-only") as HTMLElement;
      if (icon) icon.textContent = "";
      if (sr) sr.textContent = "";
    });
  },

  applyPatternToCalendar: (
    _pattern: "mwf" | "tt" | "all",
    officeDays: number[],
  ) => {
    const cells = document.querySelectorAll(".calendar-day");
    cells.forEach((cell) => {
      const cellEl = cell as HTMLElement;
      const year = parseInt(cellEl.dataset.year || "0");
      const month = parseInt(cellEl.dataset.month || "0");
      const day = parseInt(cellEl.dataset.day || "0");
      const date = new Date(year, month, day);
      const dayOfWeek = date.getDay();

      // Clear previous selection
      cellEl.classList.remove("selected");
      cellEl.removeAttribute("data-selection-type");

      // Apply pattern if weekday matches
      if (dayOfWeek >= 1 && dayOfWeek <= 5 && officeDays.includes(dayOfWeek)) {
        cellEl.classList.add("selected");
        cellEl.setAttribute("data-selection-type", "office");
      }
    });
  },

  clearAllSelections: () => {
    document.querySelectorAll(".calendar-day").forEach((cell) => {
      const cellEl = cell as HTMLElement;
      cellEl.classList.remove("selected");
      cellEl.removeAttribute("data-selection-type");
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
    });

    mockUIUpdates.updateWeekStatusIcon(week, true);

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

  it("should show red X for non-compliant weeks in best 8", () => {
    const weekStart = new Date(2025, 0, 6);
    const week: WeekInfo = createMockWeekInfo(weekStart, [], {
      weekNumber: 1,
      wfhCount: 3,
      officeDays: 2,
      isCompliant: false,
    });

    mockUIUpdates.updateWeekStatusIcon(week, true);

    const icon = week.statusCellElement?.querySelector(
      ".week-status-icon",
    ) as HTMLElement;
    const container = week.statusCellElement?.querySelector(
      ".week-status-container",
    ) as HTMLElement;

    expect(icon?.textContent).toBe("✗");
    expect(container?.classList.contains("non-compliant")).toBe(true);
  });

  it("should show grey marker for excluded weeks not in best 8", () => {
    const weekStart = new Date(2025, 0, 6);
    const week: WeekInfo = createMockWeekInfo(weekStart, [], {
      weekNumber: 1,
      wfhCount: 2,
      officeDays: 3,
      isCompliant: true,
    });

    mockUIUpdates.updateWeekStatusIcon(week, false);

    const icon = week.statusCellElement?.querySelector(
      ".week-status-icon",
    ) as HTMLElement;
    const container = week.statusCellElement?.querySelector(
      ".week-status-container",
    ) as HTMLElement;

    expect(icon?.textContent).toBe("○");
    expect(container?.classList.contains("least-attended")).toBe(true);
    expect(container?.classList.contains("compliant")).toBe(false);
  });

  it("should not have conflicting classes on status cells", () => {
    const weekStart = new Date(2025, 0, 6);
    const week: WeekInfo = createMockWeekInfo(weekStart, [], {
      weekNumber: 1,
      wfhCount: 2,
      officeDays: 3,
      isCompliant: true,
    });

    // First mark as compliant
    mockUIUpdates.updateWeekStatusIcon(week, true);
    let container = week.statusCellElement?.querySelector(
      ".week-status-container",
    ) as HTMLElement;
    expect(container?.classList.contains("compliant")).toBe(true);
    expect(container?.classList.contains("non-compliant")).toBe(false);

    // Then mark as excluded
    mockUIUpdates.updateWeekStatusIcon(week, false);
    container = week.statusCellElement?.querySelector(
      ".week-status-container",
    ) as HTMLElement;
    expect(container?.classList.contains("least-attended")).toBe(true);
    expect(container?.classList.contains("compliant")).toBe(false);
    expect(container?.classList.contains("non-compliant")).toBe(false);
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
    });

    // Manually add conflicting classes
    const container = week.statusCellElement?.querySelector(
      ".week-status-container",
    ) as HTMLElement;
    container.classList.add("non-compliant", "least-attended");

    // Update should clear old classes
    mockUIUpdates.updateWeekStatusIcon(week, true);

    expect(container?.classList.contains("compliant")).toBe(true);
    expect(container?.classList.contains("non-compliant")).toBe(false);
    expect(container?.classList.contains("least-attended")).toBe(false);
  });

  it("should only have violation class on non-compliant weeks", () => {
    const weekStart = new Date(2025, 0, 6);
    const week: WeekInfo = createMockWeekInfo(weekStart, [], {
      weekNumber: 1,
      wfhCount: 3,
      officeDays: 2,
      isCompliant: false,
    });

    mockUIUpdates.updateWeekStatusIcon(week, true);

    const container = week.statusCellElement?.querySelector(
      ".week-status-container",
    ) as HTMLElement;
    expect(container?.classList.contains("non-compliant")).toBe(true);
    expect(container?.classList.contains("compliant")).toBe(false);
    expect(container?.classList.contains("least-attended")).toBe(false);
  });

  it("should only have least-attended class on excluded weeks", () => {
    const weekStart = new Date(2025, 0, 6);
    const week: WeekInfo = createMockWeekInfo(weekStart, [], {
      weekNumber: 1,
      wfhCount: 2,
      officeDays: 3,
      isCompliant: true,
    });

    mockUIUpdates.updateWeekStatusIcon(week, false);

    const container = week.statusCellElement?.querySelector(
      ".week-status-container",
    ) as HTMLElement;
    expect(container?.classList.contains("least-attended")).toBe(true);
    expect(container?.classList.contains("compliant")).toBe(false);
    expect(container?.classList.contains("non-compliant")).toBe(false);
  });

  it("should not apply compliant or non-compliant class to excluded weeks", () => {
    const weekStart = new Date(2025, 0, 6);
    const week: WeekInfo = createMockWeekInfo(weekStart, [], {
      weekNumber: 1,
      wfhCount: 2,
      officeDays: 3,
      isCompliant: true,
    });

    mockUIUpdates.updateWeekStatusIcon(week, false);

    const container = week.statusCellElement?.querySelector(
      ".week-status-container",
    ) as HTMLElement;
    expect(container?.classList.contains("least-attended")).toBe(true);
    expect(container?.classList.contains("compliant")).toBe(false);
    expect(container?.classList.contains("non-compliant")).toBe(false);
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

    const indicator = document.getElementById(
      "compliance-indicator",
    ) as HTMLElement;
    const icon = document.getElementById("compliance-icon") as HTMLElement;
    const text = document.getElementById("compliance-text") as HTMLElement;
    const messageContainer = document.getElementById(
      "validation-message",
    ) as HTMLElement;

    expect(indicator?.classList.contains("compliant")).toBe(true);
    expect(indicator?.classList.contains("non-compliant")).toBe(false);
    expect(icon?.textContent).toBe("✓");
    expect(text?.textContent).toBe("Compliant (75%)");
    expect(messageContainer?.textContent).toContain("RTO Compliant");
    expect(messageContainer?.textContent).toContain("75%");
  });

  it("should show violation message for invalid results", () => {
    mockUIUpdates.updateComplianceIndicator(false, 0.4);

    const indicator = document.getElementById(
      "compliance-indicator",
    ) as HTMLElement;
    const icon = document.getElementById("compliance-icon") as HTMLElement;
    const text = document.getElementById("compliance-text") as HTMLElement;
    const messageContainer = document.getElementById(
      "validation-message",
    ) as HTMLElement;

    expect(indicator?.classList.contains("non-compliant")).toBe(true);
    expect(indicator?.classList.contains("compliant")).toBe(false);
    expect(icon?.textContent).toBe("✗");
    expect(text?.textContent).toBe("Not Compliant (40%)");
    expect(messageContainer?.textContent).toContain("Not Compliant");
    expect(messageContainer?.textContent).toContain("60%");
  });

  it("should set visibility to visible when displaying message", () => {
    const messageContainer = document.getElementById(
      "validation-message",
    ) as HTMLElement;

    mockUIUpdates.showValidationMessage("Test", "success");

    expect(messageContainer.style.display).toBe("block");
    expect(messageContainer.style.visibility).toBe("visible");
  });

  it("should update indicator icon and text correctly", () => {
    mockUIUpdates.updateComplianceIndicator(true, 0.8);

    const icon = document.getElementById("compliance-icon") as HTMLElement;
    const text = document.getElementById("compliance-text") as HTMLElement;

    expect(icon?.textContent).toBe("✓");
    expect(text?.textContent).toBe("Compliant (80%)");

    mockUIUpdates.updateComplianceIndicator(false, 0.3);

    expect(icon?.textContent).toBe("✗");
    expect(text?.textContent).toBe("Not Compliant (30%)");
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
    (cells[1] as HTMLElement).classList.add("selected");
    (cells[1] as HTMLElement).setAttribute("data-selection-type", "office");

    // Clear all selections
    mockUIUpdates.clearAllSelections();

    // Verify all cleared
    cells.forEach((cell) => {
      const cellEl = cell as HTMLElement;
      expect(cellEl.classList.contains("selected")).toBe(false);
      expect(cellEl.getAttribute("data-selection-type")).toBeNull();
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
    expect(monday?.getAttribute("data-selection-type")).toBe("office");

    // Jan 7 (Tuesday) should not be selected
    const tuesday = document.querySelector('[data-day="7"]') as HTMLElement;
    expect(tuesday?.classList.contains("selected")).toBe(false);
    expect(tuesday?.getAttribute("data-selection-type")).toBeNull();

    // Jan 8 (Wednesday) should be selected
    const wednesday = document.querySelector('[data-day="8"]') as HTMLElement;
    expect(wednesday?.classList.contains("selected")).toBe(true);
    expect(wednesday?.getAttribute("data-selection-type")).toBe("office");

    // Jan 10 (Friday) should be selected
    const friday = document.querySelector('[data-day="10"]') as HTMLElement;
    expect(friday?.classList.contains("selected")).toBe(true);
    expect(friday?.getAttribute("data-selection-type")).toBe("office");
  });

  it("should apply Tue-Thu pattern correctly", () => {
    mockUIUpdates.applyPatternToCalendar("tt", [2, 4]);

    // Jan 7 (Tuesday) should be selected
    const tuesday = document.querySelector('[data-day="7"]') as HTMLElement;
    expect(tuesday?.classList.contains("selected")).toBe(true);
    expect(tuesday?.getAttribute("data-selection-type")).toBe("office");

    // Jan 9 (Thursday) should be selected
    const thursday = document.querySelector('[data-day="9"]') as HTMLElement;
    expect(thursday?.classList.contains("selected")).toBe(true);
    expect(thursday?.getAttribute("data-selection-type")).toBe("office");

    // Monday should not be selected
    const monday = document.querySelector('[data-day="6"]') as HTMLElement;
    expect(monday?.classList.contains("selected")).toBe(false);
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
        expect(cellEl.getAttribute("data-selection-type")).toBe("office");
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
    (cells[0] as HTMLElement).setAttribute("data-selection-type", "office");

    // Apply empty pattern
    mockUIUpdates.applyPatternToCalendar("mwf", []);

    // All should be cleared
    cells.forEach((cell) => {
      const cellEl = cell as HTMLElement;
      expect(cellEl.classList.contains("selected")).toBe(false);
      expect(cellEl.getAttribute("data-selection-type")).toBeNull();
    });
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

    // Update all status icons (all in best 8)
    weeks.forEach((week) => mockUIUpdates.updateWeekStatusIcon(week, true));

    // Verify
    const indicator = document.getElementById(
      "compliance-indicator",
    ) as HTMLElement;
    expect(indicator?.classList.contains("compliant")).toBe(true);

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

    // Update all status icons
    weeks.forEach((week) => mockUIUpdates.updateWeekStatusIcon(week, true));

    // Verify
    const indicator = document.getElementById(
      "compliance-indicator",
    ) as HTMLElement;
    expect(indicator?.classList.contains("non-compliant")).toBe(true);

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
      const isBadWeek = i >= 8; // Last 4 weeks are bad
      const week = createMockWeekInfo(weekStart, [], {
        weekNumber: i + 1,
        wfhCount: isBadWeek ? 3 : 2,
        officeDays: isBadWeek ? 2 : 3,
        isCompliant: !isBadWeek,
      });
      weeks.push(week);
    }

    // First 8 in best 8, last 4 excluded
    weeks.forEach((week, index) => {
      const inBest8 = index < 8;
      mockUIUpdates.updateWeekStatusIcon(week, inBest8);
    });

    // Verify counts
    let compliantCount = 0;
    let nonCompliantCount = 0;
    let excludedCount = 0;

    weeks.forEach((week) => {
      const container = week.statusCellElement?.querySelector(
        ".week-status-container",
      ) as HTMLElement;
      if (container?.classList.contains("compliant")) compliantCount++;
      else if (container?.classList.contains("non-compliant"))
        nonCompliantCount++;
      else if (container?.classList.contains("least-attended")) excludedCount++;
    });

    expect(compliantCount).toBe(8);
    expect(nonCompliantCount).toBe(0);
    expect(excludedCount).toBe(4);
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
    });

    mockUIUpdates.updateWeekStatusIcon(week, true);

    const sr = week.statusCellElement?.querySelector(".sr-only") as HTMLElement;
    expect(sr?.textContent).toBe("Compliant week");
  });

  it("should provide screen reader text for non-compliant weeks", () => {
    const weekStart = new Date(2025, 0, 6);
    const week: WeekInfo = createMockWeekInfo(weekStart, [], {
      weekNumber: 1,
      wfhCount: 3,
      officeDays: 2,
      isCompliant: false,
    });

    mockUIUpdates.updateWeekStatusIcon(week, true);

    const sr = week.statusCellElement?.querySelector(".sr-only") as HTMLElement;
    expect(sr?.textContent).toBe("Non-compliant week");
  });

  it("should provide screen reader text for excluded weeks", () => {
    const weekStart = new Date(2025, 0, 6);
    const week: WeekInfo = createMockWeekInfo(weekStart, [], {
      weekNumber: 1,
      wfhCount: 2,
      officeDays: 3,
      isCompliant: true,
    });

    mockUIUpdates.updateWeekStatusIcon(week, false);

    const sr = week.statusCellElement?.querySelector(".sr-only") as HTMLElement;
    expect(sr?.textContent).toBe("Week excluded from best 8");
  });

  it("should keep icon with aria-hidden attribute", () => {
    const weekStart = new Date(2025, 0, 6);
    const week: WeekInfo = createMockWeekInfo(weekStart, [], {
      weekNumber: 1,
      wfhCount: 2,
      officeDays: 3,
      isCompliant: true,
    });

    mockUIUpdates.updateWeekStatusIcon(week, true);

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

    weeks.forEach((week) => mockUIUpdates.updateWeekStatusIcon(week, true));

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

    weeks.forEach((week) => mockUIUpdates.updateWeekStatusIcon(week, true));

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

    const indicator = document.getElementById(
      "compliance-indicator",
    ) as HTMLElement;
    const text = document.getElementById("compliance-text") as HTMLElement;

    expect(indicator?.classList.contains("compliant")).toBe(true);
    expect(text?.textContent).toBe("Compliant (100%)");
  });

  it("should handle boundary case with exactly 60% compliance", () => {
    mockUIUpdates.updateComplianceIndicator(true, 0.6);

    const indicator = document.getElementById(
      "compliance-indicator",
    ) as HTMLElement;
    const text = document.getElementById("compliance-text") as HTMLElement;

    expect(indicator?.classList.contains("compliant")).toBe(true);
    expect(text?.textContent).toBe("Compliant (60%)");
  });

  it("should handle boundary case just below 60% (59%)", () => {
    mockUIUpdates.updateComplianceIndicator(false, 0.59);

    const indicator = document.getElementById(
      "compliance-indicator",
    ) as HTMLElement;
    const text = document.getElementById("compliance-text") as HTMLElement;

    expect(indicator?.classList.contains("non-compliant")).toBe(true);
    expect(text?.textContent).toBe("Not Compliant (59%)");
  });

  it("should handle weeks with identical office day counts", () => {
    const week1 = createMockWeekInfo(new Date(2025, 0, 6), [], {
      weekNumber: 1,
      wfhCount: 2,
      officeDays: 3,
      isCompliant: true,
    });

    const week2 = createMockWeekInfo(new Date(2025, 0, 13), [], {
      weekNumber: 2,
      wfhCount: 2,
      officeDays: 3,
      isCompliant: true,
    });

    // First in best 8, second excluded
    mockUIUpdates.updateWeekStatusIcon(week1, true);
    mockUIUpdates.updateWeekStatusIcon(week2, false);

    const container1 = week1.statusCellElement?.querySelector(
      ".week-status-container",
    ) as HTMLElement;
    const container2 = week2.statusCellElement?.querySelector(
      ".week-status-container",
    ) as HTMLElement;

    expect(container1?.classList.contains("compliant")).toBe(true);
    expect(container2?.classList.contains("least-attended")).toBe(true);
  });
});
