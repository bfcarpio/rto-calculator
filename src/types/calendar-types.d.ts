/**
 * Calendar Types
 * Comprehensive type definitions for the RTO Calendar system
 */

/**
 * Date string in ISO format (YYYY-MM-DD)
 */
export type DateString = `${number}-${number}-${number}`;

/**
 * Cell position in the calendar grid
 */
export interface CellPosition {
  row: number;
  col: number;
}

/**
 * Selection type for a calendar day
 */
export type SelectionType = "unselected" | "work-from-home" | "office";

/**
 * Calendar day information
 */
export interface CalendarDay {
  year: number;
  month: number; // 0-11 (January-December)
  day: number; // 1-31
  dateString: DateString;
  isWeekend: boolean;
  isPastDate: boolean;
  isSelected: boolean;
  selectionType: SelectionType;
}

/**
 * Week data information
 */
export interface WeekData {
  weekNumber: number;
  weekStart: DateString;
  weekEnd: DateString;
  totalDays: number;
  weekdays: number; // Monday-Friday count
  weekends: number; // Saturday-Sunday count
  workFromHomeDays: number;
  officeDays: number;
  isCompliant: boolean;
  compliancePercentage: number;
}

/**
 * Month configuration
 */
export interface MonthConfig {
  year: number;
  month: number; // 0-11
  daysInMonth: number;
  startDayOfWeek: number; // 0-6 (Sunday-Saturday)
}

/**
 * Calendar grid configuration
 */
export interface GridConfig {
  rows: number;
  cols: number;
  showWeekNumbers: boolean;
  showStatusColumn: boolean;
}

/**
 * Week start configuration
 */
export type WeekStart = "sunday" | "monday";

/**
 * Selection state information
 */
export interface SelectionState {
  selectedDates: Set<DateString>;
  totalSelected: number;
  workFromHomeCount: number;
  officeCount: number;
  weekData: Map<DateString, WeekData>;
}

/**
 * Drag state for calendar interactions
 */
export interface DragState {
  isDragging: boolean;
  startPoint: DateString | null;
  currentPoint: DateString | null;
  direction: "forward" | "backward" | null;
}

/**
 * Drag selection configuration
 */
export interface DragSelectionConfig {
  allowWeekendSelection: boolean;
  allowPastDateSelection: boolean;
  minOfficeDaysPerWeek: number;
}

/**
 * Selection validation result
 */
export interface SelectionValidationResult {
  isValid: boolean;
  message?: string;
  violationType?: "weekend" | "past-date" | "min-office-days";
}

/**
 * Calendar event types
 */
export type CalendarEventType =
  | "selection"
  | "validation"
  | "highlight"
  | "clear";

/**
 * Calendar event payload
 */
export interface CalendarEvent {
  type: CalendarEventType;
  timestamp: number;
  data: unknown;
}

/**
 * Selection change callback type
 */
export type SelectionChangeCallback = (
  selectedDates: Set<DateString>,
  weekData: Map<DateString, WeekData>,
) => void;

/**
 * Validation callback type
 */
export type ValidationCallback = (
  isValid: boolean,
  message: string,
  weekData: Map<DateString, WeekData>,
) => void;

/**
 * Drag selection manager interface
 */
export interface IDragSelectionManager {
  readonly state: Readonly<DragState>;
  readonly selectedDates: ReadonlySet<DateString>;
  startDrag(startPoint: CellPosition): void;
  startDrag(dateString: DateString): void;
  updateDrag(currentPoint: CellPosition): void;
  updateDrag(dateString: DateString): void;
  endDrag(): void;
  clearSelection(): void;
  addSelection(dateString: DateString): void;
  removeSelection(dateString: DateString): void;
  toggleSelection(dateString: DateString): void;
  validateSelection(dateString: DateString): SelectionValidationResult;
  updateSelectedDates(selectedDates: Set<DateString>): void;
  updateSelection(): void;
  isDragging(): boolean;
  destroy(): void;
}

/**
 * Calendar cell element data attributes
 */
export interface CalendarCellDataAttributes {
  "data-year": string;
  "data-month": string;
  "data-day": string;
  "data-date-string": DateString;
  "data-selected"?: "true" | "false";
  "data-selection-type"?: SelectionType;
  "data-weekend"?: "true" | "false";
  "data-past-date"?: "true" | "false";
}

/**
 * Compliance status
 */
export type ComplianceStatus =
  | "compliant"
  | "violation"
  | "warning"
  | "unknown";

/**
 * Compliance result
 */
export interface ComplianceResult {
  status: ComplianceStatus;
  message: string;
  details: string;
  overallPercentage: number;
  requiredPercentage: number;
  windowResults: WindowResult[];
}

/**
 * Window compliance result
 */
export interface WindowResult {
  windowStart: number;
  windowEnd: number;
  weeks: WeekData[];
  totalOfficeDays: number;
  totalWeekdays: number;
  averageOfficeDaysPerWeek: number;
  compliancePercentage: number;
  isCompliant: boolean;
}

/**
 * Calendar view mode
 */
export type CalendarViewMode = "year" | "quarter" | "month";

/**
 * Calendar configuration options
 */
export interface CalendarOptions {
  weekStart: WeekStart;
  showWeekends: boolean;
  showWeekNumbers: boolean;
  showStatusColumn: boolean;
  allowPastSelection: boolean;
  minOfficeDaysPerWeek: number;
  rollingPeriodWeeks: number;
}

/**
 * Export data format
 */
export interface CalendarExportData {
  version: string;
  exportDate: DateString;
  options: CalendarOptions;
  selectedDates: {
    dateString: DateString;
    selectionType: SelectionType;
  }[];
  compliance: ComplianceResult | null;
}

/**
 * Import data format
 */
export interface CalendarImportData extends CalendarExportData {
  importedDate: DateString;
}
