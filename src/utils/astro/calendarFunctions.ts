/**
 * Astro-specific calendar functions for RTO Calculator
 * These functions are designed to work specifically within Astro components
 */

import type { WeekData } from "../../types";
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
  validateAllWeeks,
  validateSelection,
  getComplianceStatus,
  DEFAULT_POLICY,
} from "../validation";

import { saveSelectedDates, loadSelectedDates } from "../storage";

import { DragSelectionManager } from "../dragSelection";

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
      showValidationMessage(validation.message, "warning");
      // Still allow selection despite warning
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
  updateComplianceIndicator();
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
      updateComplianceIndicator();
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
 * Update the compliance indicator display
 */
export function updateComplianceIndicator(): void {
  const indicator = document.getElementById("compliance-indicator");
  const icon = document.getElementById("compliance-icon");
  const text = document.getElementById("compliance-text");

  if (!indicator || !icon || !text) return;

  // Calculate overall compliance
  const dates = getCalendarDates();
  const weekData = validateAllWeeks(
    dates,
    selectedDates,
    DEFAULT_POLICY.minOfficeDaysPerWeek,
  );

  const totalOfficeDays = weekData.reduce(
    (sum: number, week: WeekData) => sum + week.officeDays,
    0,
  );
  const totalWeekdays = weekData.reduce(
    (sum: number, week: WeekData) => sum + week.totalDays,
    0,
  );
  const overallCompliance =
    totalWeekdays > 0 ? (totalOfficeDays / totalWeekdays) * 100 : 100;

  const status = getComplianceStatus(overallCompliance);

  // Update UI
  icon.textContent = status.colorClass.includes("green") ? "✓" : "⚠";
  text.textContent = `${Math.round(overallCompliance)}% compliant (${totalOfficeDays}/${totalWeekdays} office days)`;
  indicator.className = `compliance-indicator ${status.colorClass.replace("text-", "")}`;
}

/**
 * Show a validation message
 * @param message - The message to display
 * @param type - The type of message ("error", "warning", "success")
 */
export function showValidationMessage(
  message: string,
  type: "error" | "warning" | "success",
): void {
  const messageEl = document.getElementById("validation-message");
  if (!messageEl) return;

  messageEl.textContent = message;
  messageEl.className = `validation-message ${type}`;
  messageEl.style.display = "block";

  // Auto-hide success messages after 3 seconds
  if (type === "success") {
    setTimeout(() => {
      hideValidationMessage();
    }, 3000);
  }
}

/**
 * Hide the validation message
 */
export function hideValidationMessage(): void {
  const messageEl = document.getElementById("validation-message");
  if (messageEl) {
    messageEl.style.display = "none";
  }
}

/**
 * Clear all selections
 */
export function clearAllSelections(): void {
  selectedDates.clear();
  saveSelectedDates(selectedDates);

  // Update drag selection manager
  if (dragSelectionManager) {
    dragSelectionManager.updateSelectedDates(selectedDates as Set<DateString>);
  }

  const calendarContainer = document.getElementById("calendar-container");
  if (calendarContainer) {
    renderCalendar(calendarContainer, weekStart);
  }
  validateAndUpdateCalendar(weekStart);
  updateComplianceIndicator();
  showValidationMessage("All selections cleared.", "success");
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
  const calendarContainer = document.getElementById("calendar-container");
  if (!calendarContainer) return;

  // Click events
  calendarContainer.addEventListener("click", handleDayClick);

  // Drag selection events
  calendarContainer.addEventListener("mousedown", handleDayMouseDown);
  calendarContainer.addEventListener("mouseover", handleDayMouseOver);
  document.addEventListener("mouseup", handleDayMouseUp);

  // Action buttons
  const clearButton = document.getElementById("clear-button");
  if (clearButton) {
    clearButton.addEventListener("click", clearAllSelections);
  }

  const exportButton = document.getElementById("export-button");
  if (exportButton) {
    exportButton.addEventListener("click", exportSelections);
  }

  // Setup event listeners
  setupEventListeners();

  // Initial compliance check
  updateComplianceIndicator();
}

/**
 * Initialize application
 */
export function init(): void {
  // Set week start based on locale
  weekStart = getLocaleWeekStart();

  // Load saved selections
  selectedDates = loadSelectedDates() as Set<DateString>;

  // Render calendar
  const calendarContainer = document.getElementById("calendar-container");
  if (calendarContainer) {
    renderCalendar(calendarContainer, weekStart);
  }

  // Initialize drag selection manager
  dragSelectionManager = new DragSelectionManager(
    selectedDates as Set<DateString>,
    (newDates: Set<DateString>) => {
      selectedDates = newDates;
      saveSelectedDates(selectedDates);
      validateAndUpdateCalendar(weekStart);
      updateComplianceIndicator();
    },
  ) as IDragSelectionManager | null;

  // Setup event listeners
  setupEventListeners();
  // Initial compliance check
  updateComplianceIndicator();
}

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
