// Base date string type
export type DateString = `${number}-${number}-${number}`;

// Selection type for calendar days
export type SelectionType = "selected" | "work-from-home" | "office";

// Date state type
export type DateState = "oof" | "holiday" | "sick";

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
	locale?: string;
	states: Record<string, StateConfig>;
	styling?: {
		cellSize?: number;
		showWeekdays?: boolean;
		showWeekNumbers?: boolean;
		firstDayOfWeek?: 0 | 1;
	};
	painting?: {
		/** Enable date painting interactions */
		enabled?: boolean;
		/** Allow painting while dragging across cells */
		paintOnDrag?: boolean;
		/**
		 * Default state for painting operations.
		 * Controls both click and drag behavior:
		 * - Click: toggles between this state and cleared
		 * - Drag: paints cells with this state
		 * @default "oof"
		 */
		defaultState?: DateState;
	};
}

// Calendar instance interface for public API
export interface CalendarInstance {
	getSelectedDates(): DateString[];
	getState(date: DateString): DateState | null;
	getDatesByState(state: DateState): DateString[];
	getAllDates(): Map<DateString, DateState>;
	getCurrentMonth(): Date;
	setDates(dates: DateString[], state: DateState): void;
	clearDates(dates: DateString[]): void;
	clearAll(): void;
	toggleDate(date: DateString, state: DateState): void;
	setPaintingState(state: DateState): void;
	updateConfig(newConfig: Partial<CalendarConfig>): void;
	onStateChange(
		callback: (date: DateString, state: DateState | null) => void,
	): () => void;
	nextMonth(): void;
	prevMonth(): void;
	destroy(): void;
}

// Validation result type
export interface ValidationResult {
	isValid: boolean;
	message?: string;
}
