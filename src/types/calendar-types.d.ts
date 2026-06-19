/**
 * Calendar Types
 * Type definitions used by the calendar interaction system
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
 * Drag state for calendar interactions
 */
export interface DragState {
	isDragging: boolean;
	startPoint: DateString | null;
	currentPoint: DateString | null;
	direction: "forward" | "backward" | null;
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
