/**
 * Astro-specific calendar functions for RTO Calculator
 * These functions are designed to work specifically within Astro components
 */

import type {
  DateString,
  IDragSelectionManager,
} from "../../types/calendar-types";
import {
  getCalendarDates,
  formatDateISO,
  formatDateDisplay,
  isWeekend,
  isPastDate,
  isSameDay,
  getStartOfWeek,
  getWeekDates,
} from "../dateUtils";
import { clearSavedSelections } from "../../scripts/localStorage";

// Week start configuration
export type WeekStart = "sunday" | "monday";

export const DEFAULT_WEEK_START: WeekStart = "sunday";

export function getLocaleWeekStart(): WeekStart {
  // For now, default to Sunday start
  // In a real implementation, this would detect based on locale
  return DEFAULT_WEEK_START;
}

import {
  validateWeek,
  validateSelection,
  DEFAULT_POLICY,
} from "../validation";

import { saveSelectedDates } from "../storage";

// State management
let selectedDates: Set<DateString> = new Set<DateString>();
let weekStart: WeekStart = DEFAULT_WEEK_START;
let weekDataMap = new Map<string, any>();
let dragSelectionManager: IDragSelectionManager | null = null;
const today = new Date();
today.setHours(0, 0, 0, 0);

/**
 * Group dates by month for calendar display
 * @param dates - Array of dates to group
 * @returns Record with months as keys and date arrays as values
 */
export function groupDatesByMonth(dates: Date[]): Record<string, Date[]> {
  const months: Record<string, Date[]> = {};

  dates.forEach((date) => {
    const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
    if (!months[monthKey]) {
      months[monthKey] = [];
    }
    months[monthKey].push(date);
  });

  return months;
}

/**
 * Get the first day of the week for a given date
 * @param date - The reference date
 * @param weekStart - The day the week starts on (default: Sunday)
 * @returns Date object representing the start of that week
 */
export function getFirstDayOfWeek(
  date: Date,
  weekStart: WeekStart = DEFAULT_WEEK_START,
): Date {
  const d = new Date(date);
  const day = d.getDay();

  if (weekStart === "sunday") {
    // Sunday start: 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    const diff = d.getDate() - day;
    d.setDate(diff);
  } else {
    // Monday start: 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
    d.setDate(diff);
  }

  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Generate weeks for a month, including days from adjacent months
 * @param monthDates - Array of dates for the month
 * @param weekStart - The day the week starts on (default: Sunday)
 * @returns Array of weeks, each containing 7 days
 */
export function getWeeksForMonth(
  monthDates: Date[],
  weekStart: WeekStart = DEFAULT_WEEK_START,
): Date[][] {
  if (monthDates.length === 0) return [];

  const weeks: Date[][] = [];
  let currentWeek: Date[] = [];

  // Fill in days from the beginning of the week to the first date
  const firstDate = monthDates[0];
  if (!firstDate) return [];
  const firstDay = firstDate.getDay();

  let daysToAdd;
  if (weekStart === "sunday") {
    // Sunday start: 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    daysToAdd = firstDay;
  } else {
    // Monday start: 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    daysToAdd = firstDay === 0 ? 6 : firstDay - 1; // Sunday maps to 6, Monday maps to 0, etc.
  }

  // Add preceding days from previous month
  for (let i = daysToAdd; i > 0; i--) {
    const prevDate = new Date(firstDate ?? new Date());
    prevDate.setDate((firstDate ?? new Date()).getDate() - i);
    currentWeek.push(prevDate);
  }

  // Add all dates for the month
  monthDates.forEach((date) => {
    currentWeek.push(date);

    // Start a new week when we complete 7 days
    if (currentWeek.length === 7) {
      weeks.push([...currentWeek]);
      currentWeek = [];
    }
  });

  // Fill in remaining days of the last week
  if (currentWeek.length > 0) {
    const remainingDays = 7 - currentWeek.length;
    const lastDate = currentWeek[currentWeek.length - 1] ?? new Date();

    for (let i = 1; i <= remainingDays; i++) {
      const nextDate = new Date(lastDate);
      nextDate.setDate(lastDate.getDate() + i);
      currentWeek.push(nextDate);
    }

    weeks.push([...currentWeek]);
  }

  return weeks;
}

/**
 * Create a day cell element for the calendar
 * @param date - The date for this cell
 * @param weekStart - The day the week starts on
 * @returns Button element representing the day
 */
export function createDayCell(
  date: Date,
  currentMonth: number,
  _weekStart: WeekStart = DEFAULT_WEEK_START,
): HTMLButtonElement {
  const isoDate = formatDateISO(date) as DateString;
  const isSelected = selectedDates.has(isoDate);
  const isWeekendDay = isWeekend(date);
  const isPast = isPastDate(date);
  const isToday = isSameDay(date, new Date());

  const cell = document.createElement("button");
  cell.className = "day-cell";
  cell.setAttribute("data-date", isoDate);
  cell.setAttribute("tabindex", "0");
  cell.setAttribute("role", "button");
  cell.setAttribute("aria-label", formatDateDisplay(date));

  if (isSelected) {
    cell.classList.add("selected");
    cell.setAttribute(
      "aria-label",
      cell.getAttribute("aria-label") + " (Selected)",
    );
  }

  if (isWeekendDay) {
    cell.classList.add("weekend");
  }

  if (isPast) {
    cell.classList.add("past");
    cell.setAttribute("aria-disabled", "true");
  }

  if (isToday) {
    cell.classList.add("today");
  }

  // Add day number
  const dayNumber = document.createElement("span");
  dayNumber.className = "day-number";
  dayNumber.textContent = date.getDate().toString();
  cell.appendChild(dayNumber);

  // Hide days that are not in the current month
  if (date.getMonth() !== currentMonth) {
    cell.classList.add("disabled");
    cell.setAttribute("aria-hidden", "true");
    cell.setAttribute("tabindex", "-1");
  }

  return cell;
}

/**
 * Create a month element for the calendar
 * @param monthKey - The key for this month (year-month)
 * @param monthDates - Array of dates for this month
 * @param weekStart - The day the week starts on (default: Sunday)
 * @returns Div element containing the month calendar
 */
export function createMonthElement(
  monthKey: string,
  monthDates: Date[],
  weekStart: WeekStart = DEFAULT_WEEK_START,
): HTMLDivElement {
  const [year, monthIndex] = monthKey.split("-").map(Number);
  const monthDate = new Date(year ?? 0, (monthIndex ?? 0) - 1, 1);

  const monthContainer = document.createElement("div");
  monthContainer.className = "month-block";

  // Create month header
  const header = document.createElement("h2");
  header.className = "month-header";
  header.textContent = monthDate.toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
  monthContainer.appendChild(header);

  // Create grid
  const grid = document.createElement("div");
  grid.className = "month-grid";
  grid.setAttribute("role", "grid");

  // Add day of week headers based on weekStart setting
  const daysOfWeek =
    weekStart === "sunday"
      ? ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
      : ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  daysOfWeek.forEach((day) => {
    const dayHeader = document.createElement("div");
    dayHeader.className = "day-header";
    dayHeader.setAttribute("role", "columnheader");
    dayHeader.textContent = day;
    grid.appendChild(dayHeader);
  });

  // Create weeks and days
  const weeks = getWeeksForMonth(monthDates, weekStart);
  weeks.forEach((week) => {
    week.forEach((date) => {
      const dayCell = createDayCell(date, (monthIndex ?? 0) - 1, weekStart);
      grid.appendChild(dayCell);
    });
  });

  monthContainer.appendChild(grid);
  return monthContainer;
}

/**
 * Render the calendar grid with all months
 * @param calendarContainer - The container element for the calendar
 * @param weekStart - The day the week starts on (default: Sunday)
 */

/**
 * Validate and update the calendar UI
 * @param weekStart - The day the week starts on (default: Sunday)
 */
/**
 * Render the calendar
 */
export function renderCalendar(
  container: HTMLElement,
  weekStart: WeekStart = DEFAULT_WEEK_START,
): void {
  container.innerHTML = "";
  container.className = "calendar-grid-container";

  const dates = getCalendarDates();
  const months = groupDatesByMonth(dates);

  // Sort months chronologically
  const sortedMonthKeys = Object.keys(months).sort((a, b) => {
    const partsA = a.split("-").map(Number);
    const partsB = b.split("-").map(Number);
    const yearA = partsA[0] ?? 0;
    const monthA = partsA[1] ?? 0;
    const yearB = partsB[0] ?? 0;
    const monthB = partsB[1] ?? 0;
    if (yearA !== yearB) return yearA - yearB;
    return monthA - monthB;
  });

  sortedMonthKeys.forEach((monthKey) => {
    const monthDates = months[monthKey] ?? [];
    const monthElement = createMonthElement(monthKey, monthDates, weekStart);
    container.appendChild(monthElement);
  });

  // After rendering, update the calendar state
  validateAndUpdateCalendar(weekStart);
}

export function validateAndUpdateCalendar(
  _weekStart: WeekStart = DEFAULT_WEEK_START,
): void {
  const calendarContainer = document.getElementById("calendar-container");
  if (!calendarContainer) return;

  const dayCells = calendarContainer.querySelectorAll(".day-cell");
  const weeksMap = new Map<string, any>();

  // Process each day cell to determine week data
  dayCells.forEach((dayCell) => {
    const dateStr = (dayCell as HTMLElement).getAttribute("data-date");
    if (!dateStr) return;

    const date = new Date(dateStr);
    const weekStartLocal = getStartOfWeek(date);
    const weekKey = formatDateISO(weekStartLocal) as DateString;

    if (!weeksMap.has(weekKey)) {
      const weekDates = getWeekDates(date);
      const weekData = validateWeek(
        weekDates,
        selectedDates as Set<string>,
        DEFAULT_POLICY.minOfficeDaysPerWeek,
      );
      weeksMap.set(weekKey, weekData);
    }

    weeksMap.get(weekKey);
    (dayCell as HTMLElement).setAttribute(
      "aria-describedby",
      `week-${weekKey}`,
    );
  });

  // Update visual state of each cell
  dayCells.forEach((dayCell) => {
    const dateStr = (dayCell as HTMLElement).getAttribute("data-date");
    if (!dateStr) return;

    const date = new Date(dateStr);
    const weekStartLocal = getStartOfWeek(date);
    const weekKey = formatDateISO(weekStartLocal) as DateString;
    const weekData = weeksMap.get(weekKey);

    // Update selected state
    if (dateStr && selectedDates.has(dateStr as DateString)) {
      (dayCell as HTMLElement).classList.add("selected");
    } else {
      (dayCell as HTMLElement).classList.remove("selected");
    }

    // Update cell styles based on week data
    if (weekData && !isWeekend(date) && !isPastDate(date)) {
      if (weekData.compliant) {
        (dayCell as HTMLElement).classList.remove("violation");
        (dayCell as HTMLElement).classList.add("compliant");
      } else {
        (dayCell as HTMLElement).classList.remove("compliant");
        (dayCell as HTMLElement).classList.add("violation");
      }
    }
  });
}

/**
 * Handle day click event
 * @param event - The click event
 */
export function handleDayClick(event: Event): void {
  const target = event.target as HTMLElement;
  if (!target.classList.contains("day-cell")) return;

  const dateStr = target.getAttribute("data-date");
  if (!dateStr) return;

  // Toggle selection
  const dateString = dateStr as DateString;
  if (dateStr && selectedDates.has(dateString)) {
    selectedDates.delete(dateString);
  } else if (dateStr) {
    // Validate selection before adding
    const date = new Date(dateStr);
    const validation = validateSelection(
      date,
      selectedDates,
      DEFAULT_POLICY.minOfficeDaysPerWeek,
    );

    if (!validation.isValid && validation.message) {
      console.warn(validation.message);
    }

    selectedDates.add(dateString);
  }

  // Save selections
  saveSelectedDates(selectedDates);

  // Update drag selection manager
  if (dragSelectionManager) {
    dragSelectionManager.updateSelectedDates(selectedDates as Set<DateString>);
  }

  // Update UI
  updateDayCell(target, dateStr);
  validateAndUpdateCalendar(weekStart);
}

/**
 * Handle day mouse down event for drag selection
 * @param event - The mouse down event
 */
export function handleDayMouseDown(event: Event): void {
  // Prevent default drag behavior (text selection, native drag)
  event.preventDefault();
  event.stopPropagation();

  console.log("handleDayMouseDown triggered");
  const target = event.target as HTMLElement;
  console.log("Target class:", target.className);
  if (!target.classList.contains("day-cell")) return;

  const dateStr = target.getAttribute("data-date");
  if (!dateStr) return;

  console.log("Starting drag on date:", dateStr);
  if (dragSelectionManager) {
    dragSelectionManager.startDrag(dateStr as DateString);
    console.log("Drag started successfully");
  } else {
    console.log("ERROR: dragSelectionManager is null!");
  }
}

/**
 * Handle day mouse over event for drag selection
 * @param event - The mouse over event
 */
export function handleDayMouseOver(event: Event): void {
  const target = event.target as HTMLElement;
  if (!target.classList.contains("day-cell")) return;

  const dateStr = target.getAttribute("data-date");
  if (!dateStr) return;

  if (dragSelectionManager) {
    if (dragSelectionManager.isDragging()) {
      dragSelectionManager.updateDrag(dateStr as DateString);
      dragSelectionManager.updateSelection();

      // Update UI for all affected cells
      validateAndUpdateCalendar(weekStart);
    }
  }
}

/**
 * Handle day mouse up event to end drag selection
 */
export function handleDayMouseUp(): void {
  console.log("handleDayMouseUp triggered");
  if (dragSelectionManager) {
    dragSelectionManager.endDrag();
    console.log("Drag ended");
  }
}

/**
 * Update the visual state of a day cell
 * @param cell - The day cell element
 * @param dateStr - The date string for this cell
 */
export function updateDayCell(cell: HTMLElement, dateStr: string): void {
  const isSelected = selectedDates.has(dateStr as DateString);
  const date = new Date(dateStr);

  if (isSelected) {
    cell.classList.add("selected");
    cell.setAttribute("aria-label", formatDateDisplay(date) + " (Selected)");
  } else {
    cell.classList.remove("selected");
    cell.setAttribute("aria-label", formatDateDisplay(date));
  }
}

/**
 * Update the compliance display using validation message
 */
// Old updateComplianceIndicator function removed - replaced by proper validation system

// Old show/hideValidationMessage functions removed - replaced by validation-result-display module

/**
 * Clear all selections
 */
export function clearAllSelections(): void {
  selectedDates.clear();
  saveSelectedDates(selectedDates);
  clearSavedSelections();

  // Update drag selection manager
  if (dragSelectionManager) {
    dragSelectionManager.updateSelectedDates(selectedDates as Set<DateString>);
  }

  // Directly clear all selections from DOM elements
  const dayCells = document.querySelectorAll(
    '.calendar-day[data-selected="true"]',
  );
  dayCells.forEach((cell) => {
    const cellElement = cell as HTMLElement;

    // Remove selection classes
    cellElement.classList.remove("selected", "out-of-office");

    // Reset data attributes
    cellElement.dataset.selected = "false";
    cellElement.dataset.selectionType = "";

    // Update aria attributes
    cellElement.ariaSelected = "false";

    // Update aria-label to reflect unselected state
    const currentLabel = cellElement.getAttribute("aria-label") || "";
    const selectionRegex =
      /\.( Out of office|Work from home|Office day|Vacation|Sick leave|Personal day)$/;
    if (selectionRegex.test(currentLabel)) {
      const newLabel = currentLabel.replace(selectionRegex, ". Unselected");
      cellElement.setAttribute("aria-label", newLabel);
    } else if (!currentLabel.includes(". Unselected")) {
      // If no selection suffix, add unselected
      const datePart = currentLabel.replace(/\..*$/, "");
      cellElement.setAttribute("aria-label", `${datePart}. Unselected`);
    }
  });

  // Clear all validation highlights
  if (typeof window !== "undefined" && (window as any).rtoValidation) {
    (window as any).rtoValidation.clearAllValidationHighlights();
  }

  validateAndUpdateCalendar(weekStart);
}

/**
 * Export selections to JSON
 */
export function exportSelections(): void {
  const data = {
    selectedDates: Array.from(selectedDates),
    exportDate: new Date().toISOString(),
    policy: DEFAULT_POLICY,
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "rto-selection-export.json";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Setup event listeners for the calendar
 */
export function setupEventListeners(): void {
  let calendarContainer = document.getElementById("calendar-container");

  // Fallback to old ID if new one not found
  if (!calendarContainer) {
    calendarContainer = document.getElementById("calendar");
    if (calendarContainer) {
      console.warn(
        "[CalendarFunctions] Using fallback ID 'calendar' instead of 'calendar-container'",
      );
    }
  }

  if (!calendarContainer) {
    console.error(
      "[CalendarFunctions] Calendar container not found. Button event listeners not attached.",
    );
    return;
  }

  // Click events
  calendarContainer.addEventListener("click", handleDayClick);
  console.log("[CalendarFunctions] Attached calendar click handler");

  // Drag selection events
  calendarContainer.addEventListener("mousedown", handleDayMouseDown);
  calendarContainer.addEventListener("mouseover", handleDayMouseOver);
  document.addEventListener("mouseup", handleDayMouseUp);
  console.log("[CalendarFunctions] Attached drag selection handlers");

  // Action buttons
  const clearAllButtons = document.querySelectorAll(
    '[id^="clear-all-button-"]',
  );
  console.log(
    `[CalendarFunctions] Found ${clearAllButtons.length} clear-all button(s)`,
  );
  clearAllButtons.forEach((button) => {
    const buttonElement = button as HTMLElement;
    buttonElement.addEventListener("click", clearAllSelections);
    console.log(
      `[CalendarFunctions] Attached click listener to clear-all button: ${buttonElement.id}`,
    );
  });

  const exportButtons = document.querySelectorAll('[id^="export-button-"]');
  console.log(
    `[CalendarFunctions] Found ${exportButtons.length} export button(s)`,
  );
  exportButtons.forEach((button) => {
    const buttonElement = button as HTMLElement;
    buttonElement.addEventListener("click", exportSelections);
    console.log(
      `[CalendarFunctions] Attached click listener to export button: ${buttonElement.id}`,
    );
  });
}

// Old init() function removed - initialization now handled by separate modules

// Export getter functions for state variables
export function getSelectedDates(): Set<string> {
  return selectedDates;
}

export function getWeekDataMap(): Map<string, any> {
  return weekDataMap;
}

export function getDragSelectionManager(): IDragSelectionManager | null {
  return dragSelectionManager;
}

// Export setter functions for state variables
export function setSelectedDates(newSelectedDates: Set<string>): void {
  selectedDates = new Set(newSelectedDates) as Set<DateString>;
}

export function setWeekDataMap(newWeekDataMap: Map<string, any>): void {
  weekDataMap = newWeekDataMap;
}

export function setDragSelectionManager(
  newDragSelectionManager: IDragSelectionManager | null,
): void {
  dragSelectionManager = newDragSelectionManager;
}
