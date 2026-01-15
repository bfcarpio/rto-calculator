/**
 * Drag selection utility for RTO Calendar
 * Enables selecting multiple dates by dragging over calendar cells
 */

import { isWeekend, isPastDate, formatDateISO } from "./dateUtils";
import type {
  IDragSelectionManager,
  CellPosition,
  DateString,
  SelectionValidationResult,
  DragState,
} from "../../types/calendar-types";

/**
 * Drag selection manager for calendar
 * Implements IDragSelectionManager interface
 */
export class DragSelectionManager implements IDragSelectionManager {
  private dragState: DragState = {
    isDragging: false,
    startPoint: null,
    currentPoint: null,
    direction: null,
  };

  private selectedDates: Set<DateString>;
  private onSelectionChange: (selectedDates: Set<DateString>) => void;
  private validateSelection: (
    date: Date,
    selectedDates: Set<DateString>,
    minOfficeDaysPerWeek: number,
  ) => SelectionValidationResult;
  private minOfficeDaysPerWeek: number;

  constructor(
    initialSelectedDates: Set<DateString>,
    onSelectionChange: (selectedDates: Set<DateString>) => void,
    validateSelection: (
      date: Date,
      selectedDates: Set<DateString>,
      minOfficeDaysPerWeek: number,
    ) => SelectionValidationResult,
    minOfficeDaysPerWeek: number,
  ) {
    this.selectedDates = new Set(initialSelectedDates);
    this.onSelectionChange = onSelectionChange;
    this.validateSelection = validateSelection;
    this.minOfficeDaysPerWeek = minOfficeDaysPerWeek;
  }

  /**
   * Get current drag state
   */
  get state(): Readonly<DragState> {
    return Object.freeze({ ...this.dragState });
  }

  /**
   * Get all currently selected dates
   */
  get selectedDates(): ReadonlySet<DateString> {
    return new Set(this.selectedDates) as ReadonlySet<DateString>;
  }

  /**
   * Start drag selection from a cell position
   */
  startDrag(startPoint: CellPosition): void {
    const dateStr = this.cellPositionToDate(startPoint);
    this.dragState = {
      isDragging: true,
      startPoint: dateStr,
      currentPoint: dateStr,
      direction: null,
    };
  }

  /**
   * Update drag selection to a new cell position
   */
  updateDrag(currentPoint: CellPosition): void {
    const dateStr = this.cellPositionToDate(currentPoint);
    if (!this.dragState.isDragging || !this.dragState.startPoint) {
      return;
    }

    this.dragState.currentPoint = dateStr;

    // Determine drag direction
    const startDate = new Date(this.dragState.startPoint);
    const currentDate = new Date(dateStr);

    this.dragState.direction =
      currentDate >= startDate ? "forward" : "backward";
  }

  /**
   * End drag selection and apply changes
   */
  endDrag(): void {
    if (!this.dragState.isDragging) {
      return;
    }

    this.dragState.isDragging = false;
    this.dragState.startPoint = null;
    this.dragState.currentPoint = null;
    this.dragState.direction = null;

    // Apply the selection
    this.updateSelection();
  }

  /**
   * Clear all selections
   */
  clearSelection(): void {
    this.selectedDates.clear();
    this.onSelectionChange(new Set<DateString>());
  }

  /**
   * Add a date to selection
   */
  addSelection(dateString: DateString): void {
    this.selectedDates.add(dateString);
    this.onSelectionChange(new Set(this.selectedDates));
  }

  /**
   * Remove a date from selection
   */
  removeSelection(dateString: DateString): void {
    this.selectedDates.delete(dateString);
    this.onSelectionChange(new Set(this.selectedDates));
  }

  /**
   * Toggle a date's selection state
   */
  toggleSelection(dateString: DateString): void {
    if (this.selectedDates.has(dateString)) {
      this.removeSelection(dateString);
    } else {
      this.addSelection(dateString);
    }
  }

  /**
   * Validate a date for selection
   */
  validateSelection(dateString: DateString): SelectionValidationResult {
    const date = new Date(dateString);

    const isWeekendDate = isWeekend(date);
    const isPastDateValue = isPastDate(date);

    if (isWeekendDate) {
      return {
        isValid: false,
        message: "Cannot select weekend days",
        violationType: "weekend",
      };
    }

    if (isPastDateValue) {
      return {
        isValid: false,
        message: "Cannot select past dates",
        violationType: "past-date",
      };
    }

    return {
      isValid: true,
    };
  }

  /**
   * Destroy the drag selection manager and clean up
   */
  destroy(): void {
    this.clearSelection();
    this.dragState = {
      isDragging: false,
      startPoint: null,
      currentPoint: null,
      direction: null,
    };
  }

  /**
   * Get all dates between start and current drag points
   */
  private getDragSelectionRange(): DateString[] {
    if (!this.dragState.startPoint || !this.dragState.currentPoint) {
      return [];
    }

    const startDate = new Date(this.dragState.startPoint);
    const currentDate = new Date(this.dragState.currentPoint);

    // Ensure we work with dates at midnight for accurate comparison
    startDate.setHours(0, 0, 0, 0);
    currentDate.setHours(0, 0, 0, 0);

    const dates: DateString[] = [];
    const currentDateCopy = new Date(startDate);

    // Determine step direction
    const step = currentDate >= startDate ? 1 : -1;

    // Generate all dates between start and current (include all days like travel websites)
    while (
      (step > 0 && currentDateCopy <= currentDate) ||
      (step < 0 && currentDateCopy >= currentDate)
    ) {
      dates.push(formatDateISO(currentDateCopy));
      currentDateCopy.setDate(currentDateCopy.getDate() + step);
    }

    return dates;
  }

  /**
   * Update selected dates based on drag selection
   */
  private updateSelection(): void {
    if (!this.dragState.startPoint || !this.dragState.currentPoint) {
      return;
    }

    // Get range of dates to select
    const dragRange = this.getDragSelectionRange();

    if (dragRange.length === 0) {
      return;
    }

    // Create a copy of current selections
    const newSelectedDates = new Set(this.selectedDates);

    // Determine if we're adding or removing dates based on state of start point
    const shouldSelect = !this.selectedDates.has(this.dragState.startPoint);

    // Update all dates in range
    dragRange.forEach((dateStr) => {
      if (shouldSelect) {
        // Add date to selection
        newSelectedDates.add(dateStr);
      } else {
        // Remove date from selection
        newSelectedDates.delete(dateStr);
      }
    });

    // Update selection
    this.selectedDates = newSelectedDates;
    this.onSelectionChange(newSelectedDates);
  }

  /**
   * Convert cell position to date string
   */
  private cellPositionToDate(position: CellPosition): DateString {
    const year = (position.row % 2000) + 2000; // Simplified logic
    const month = Math.floor(position.row / 12);
    const day = (position.col % 31) + 1;
    return `${year}-${String(month + 1).padStart(2, "0")}-${String(
      day,
    ).padStart(2, "0")}`;
  }
}
