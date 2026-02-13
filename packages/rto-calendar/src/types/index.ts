// Base date string type
export type DateString = `${number}-${number}-${number}`;

// Selection type for calendar days
export type SelectionType = "selected" | "work-from-home" | "office";

// Date state type
export type DateState = "working" | "oof" | "holiday";

// Date range type
export interface DateRange {
  start: Date;
  end: Date;
}

// Cell position in grid
export interface CellPosition {
  row: number;
  col: number;
}

// Drag state
export interface DragState {
  isDragging: boolean;
  startPoint: DateString | null;
  currentPoint: DateString | null;
  direction: "forward" | "backward" | null;
}

// State config for calendar states
export interface StateConfig {
  label: string;
  color: string;
  bgColor: string;
  icon?: string;
  position?: "above" | "below" | "left" | "right";
}

// Calendar configuration
export interface CalendarConfig {
  dateRange: DateRange;
  states: Record<string, StateConfig>;
  styling?: {
    cellSize?: number;
    showWeekdays?: boolean;
    showWeekNumbers?: boolean;
    firstDayOfWeek?: 0 | 1;
  };
  painting?: {
    enabled?: boolean;
    paintOnDrag?: boolean;
    defaultState?: DateState;
  };
}

// Calendar instance interface for public API
export interface CalendarInstance {
  getSelectedDates(): DateString[];
  getState(date: DateString): DateState | null;
  getDatesByState(state: DateState): DateString[];
  setDates(dates: DateString[], state: DateState): void;
  clearDates(dates: DateString[]): void;
  clearAll(): void;
  toggleDate(date: DateString, state: DateState): void;
  updateConfig(newConfig: Partial<CalendarConfig>): void;
  onStateChange(callback: (date: DateString, state: DateState | null) => void): () => void;
  destroy(): void;
}

// Validation result type
export interface ValidationResult {
  isValid: boolean;
  message?: string;
}
