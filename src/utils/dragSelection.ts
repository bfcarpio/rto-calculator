/**
 * Drag selection utility for RTO Calendar
 * Enables selecting multiple dates by dragging over calendar cells
 */

import { isWeekend, isPastDate, formatDateISO } from "./dateUtils";

/**
 * Drag selection state
 */
interface DragState {
  isDragging: boolean;
  startPoint: string | null;
  currentPoint: string | null;
  direction: "forward" | "backward" | null;
}

/**
 * Drag selection manager for calendar
 */
export class DragSelectionManager {
  private dragState: DragState = {
    isDragging: false,
    startPoint: null,
    currentPoint: null,
    direction: null,
  };

  private selectedDates: Set<string>;
  private onSelectionChange: (selectedDates: Set<string>) => void;
  private validateSelection: (
    date: Date,
    selectedDates: Set<string>,
    minOfficeDaysPerWeek: number,
  ) => { isValid: boolean; message?: string };
  private minOfficeDaysPerWeek: number;

  constructor(
    initialSelectedDates: Set<string>,
    onSelectionChange: (selectedDates: Set<string>) => void,
    validateSelection: (
      date: Date,
      selectedDates: Set<string>,
      minOfficeDaysPerWeek: number,
    ) => { isValid: boolean; message?: string },
    minOfficeDaysPerWeek: number,
  ) {
    this.selectedDates = new Set(initialSelectedDates);
    this.onSelectionChange = onSelectionChange;
    this.validateSelection = validateSelection;
    this.minOfficeDaysPerWeek = minOfficeDaysPerWeek;
  }

  /**
   * Start drag selection from a date
   */
  startDrag(dateStr: string): void {
    this.dragState = {
      isDragging: true,
      startPoint: dateStr,
      currentPoint: dateStr,
      direction: null,
    };
  }

  /**
   * Update drag selection to a new date
   */
  updateDrag(dateStr: string): void {
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
  }

  /**
   * Check if drag selection is currently active
   */
  isDragging(): boolean {
    return this.dragState.isDragging;
  }

  /**
   * Get all dates between start and current drag points
   */
  getDragSelectionRange(): string[] {
    if (!this.dragState.startPoint || !this.dragState.currentPoint) {
      return [];
    }

    const startDate = new Date(this.dragState.startPoint);
    const currentDate = new Date(this.dragState.currentPoint);

    // Ensure we work with dates at midnight for accurate comparison
    startDate.setHours(0, 0, 0, 0);
    currentDate.setHours(0, 0, 0, 0);

    const dates: string[] = [];
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
  updateSelection(): void {
    if (!this.dragState.startPoint || !this.dragState.currentPoint) {
      return;
    }

    // Get the range of dates to select
    const dragRange = this.getDragSelectionRange();

    if (dragRange.length === 0) {
      return;
    }

    // Create a copy of current selections
    const newSelectedDates = new Set(this.selectedDates);

    // Determine if we're adding or removing dates based on the state of the start point
    const shouldSelect = !this.selectedDates.has(this.dragState.startPoint);

    // Update all dates in the range
    dragRange.forEach((dateStr) => {
      if (shouldSelect) {
        // Add date to selection
        newSelectedDates.add(dateStr);
      } else {
        // Remove date from selection
        newSelectedDates.delete(dateStr);
      }
    });

    // Update the selection
    this.selectedDates = newSelectedDates;
    this.onSelectionChange(newSelectedDates);
  }

  /**
   * Update the internal selected dates set
   */
  updateSelectedDates(selectedDates: Set<string>): void {
    this.selectedDates = new Set(selectedDates);
  }

  /**
   * Reset drag state
   */
  reset(): void {
    this.dragState = {
      isDragging: false,
      startPoint: null,
      currentPoint: null,
      direction: null,
    };
  }
}
