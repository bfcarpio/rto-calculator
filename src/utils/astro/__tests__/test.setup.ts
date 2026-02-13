/**
 * Shared Test Setup
 *
 * Provides common test configuration, cleanup, and utilities
 * to be used across all test files in the RTO Calculator.
 */

import { beforeEach, afterEach, vi } from "vitest";
import { cleanupMockElements, restoreDOM } from "./testHelpers";

/**
 * Global test setup - runs before each test
 * Ensures a clean DOM state for every test
 */
beforeEach(() => {
  // Reset the DOM to a clean state
  document.body.innerHTML = "";
});

/**
 * Global test teardown - runs after each test
 * Ensures no DOM pollution between tests
 */
afterEach(() => {
  // Clean up any mock elements created during tests
  cleanupMockElements();

  // Restore original DOM state
  restoreDOM();
});

/**
 * Configure console warnings to be less noisy in tests
 * This can be adjusted based on project needs
 */
vi.spyOn(console, "warn").mockImplementation(() => {
  // Suppress warnings in tests unless explicitly needed
});

/**
 * Shared test utilities export for convenience
 * Re-exports commonly used helpers from testHelpers.ts
 */
export * from "./testHelpers";

/**
 * Common test data constants
 */
export const TEST_CALENDAR_CONFIG = {
  startYear: 2025,
  startMonth: 0, // January
  startDay: 1,
  totalWeeks: 12,
  weekdaysPerWeek: 5,
};

/**
 * Helper to create a basic DOM structure for tests
 * This provides a minimal calendar structure for UI tests
 */
export function setupBasicCalendarDOM(weekCount: number = 3): void {
  const container = document.createElement("div");
  container.className = "calendar-container";
  container.id = "calendar-container";

  // Compliance indicator removed - validation message now provides color-coded feedback

  // Create message container
  const messageContainer = document.createElement("div");
  messageContainer.id = "validation-message";
  messageContainer.style.display = "none";
  container.appendChild(messageContainer);

  // Create calendar weeks
  for (let week = 0; week < weekCount; week++) {
    const weekDiv = document.createElement("div");
    weekDiv.className = "calendar-week";

    // Status cell
    const statusCell = document.createElement("td");
    statusCell.className = "week-status-cell";
    statusCell.dataset.weekStart = new Date(2025, 0, 6 + week * 7)
      .getTime()
      .toString();
    statusCell.innerHTML = `
      <div class="week-status-container">
        <span class="week-status-icon"></span>
        <span class="sr-only">Week status</span>
      </div>
    `;
    weekDiv.appendChild(statusCell);

    // Day cells (5 weekdays)
    for (let day = 0; day < 5; day++) {
      const dayCell = document.createElement("td");
      dayCell.className = "calendar-day";
      dayCell.dataset.year = "2025";
      dayCell.dataset.month = "0";
      dayCell.dataset.day = String(6 + week * 7 + day);
      dayCell.innerHTML = `<span class="day-number">${6 + week * 7 + day}</span>`;
      weekDiv.appendChild(dayCell);
    }

    container.appendChild(weekDiv);
  }

  document.body.appendChild(container);
}

/**
 * Helper to wait for DOM updates in async tests
 */
export async function waitForDOMUpdate(): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
}

/**
 * Helper to simulate user interaction on an element
 */
export function simulateClick(element: HTMLElement): void {
  const event = new MouseEvent("click", {
    bubbles: true,
    cancelable: true,
    view: window,
  });
  element.dispatchEvent(event);
}

/**
 * Helper to simulate keyboard interaction
 */
export function simulateKeyPress(
  element: HTMLElement,
  key: string,
  options: KeyboardEventInit = {},
): void {
  const event = new KeyboardEvent("keydown", {
    key,
    bubbles: true,
    cancelable: true,
    ...options,
  });
  element.dispatchEvent(event);
}
