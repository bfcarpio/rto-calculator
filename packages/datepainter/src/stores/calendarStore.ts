import { type WritableAtom, atom } from "nanostores";
import type { DateState, DateString } from "../types";

/**
 * Atom store for managing selected dates in the calendar.
 * Maps date strings (YYYY-MM-DD) to their state (working, oof, holiday).
 *
 * @example
 * ```ts
 * import { selectedDates, setDateState } from './stores/calendarStore';
 * setDateState('2026-02-06', 'working');
 * const dates = selectedDates.get(); // Map { '2026-02-06' => 'working' }
 * ```
 */
export const selectedDates: WritableAtom<Map<DateString, DateState>> = atom<
  Map<DateString, DateState>
>(new Map());

/**
 * Atom store for the currently displayed month in the calendar.
 * Used for navigation between months.
 *
 * @example
 * ```ts
 * import { currentMonth, setCurrentMonth } from './stores/calendarStore';
 * setCurrentMonth(new Date(2026, 1, 1)); // February 2026
 * const month = currentMonth.get();
 * ```
 */
export const currentMonth: WritableAtom<Date> = atom<Date>(new Date());

/**
 * Atom store for managing drag state during click-drag painting operations.
 * Tracks whether the user is currently dragging, the start and current points,
 * and the drag direction.
 *
 * @example
 * ```ts
 * import { dragState } from './stores/calendarStore';
 * dragState.set({
 *   isDragging: true,
 *   startPoint: '2026-02-06',
 *   currentPoint: '2026-02-10',
 *   direction: 'forward'
 * });
 * ```
 */
export const dragState: WritableAtom<{
  /** Whether a drag operation is currently in progress */
  isDragging: boolean;
  /** The starting date string of the drag operation */
  startPoint: DateString | null;
  /** The current date string of the drag operation */
  currentPoint: DateString | null;
  /** The direction of the drag (forward or backward in date order) */
  direction: "forward" | "backward" | null;
}> = atom<{
  /** Whether a drag operation is currently in progress */
  isDragging: boolean;
  /** The starting date string of the drag operation */
  startPoint: DateString | null;
  /** The current date string of the drag operation */
  currentPoint: DateString | null;
  /** The direction of the drag (forward or backward in date order) */
  direction: "forward" | "backward" | null;
}>({
  isDragging: false,
  startPoint: null,
  currentPoint: null,
  direction: null,
});

/**
 * Atom store for validation results from calendar operations.
 * Contains validity status and optional error message.
 *
 * @example
 * ```ts
 * import { validationResult } from './stores/calendarStore';
 * validationResult.set({
 *   isValid: false,
 *   message: 'Insufficient office days selected'
 * });
 * ```
 */
export const validationResult: WritableAtom<{
  /** Whether the current state is valid */
  isValid: boolean;
  /** Optional error or validation message */
  message?: string;
} | null> = atom<{
  /** Whether the current state is valid */
  isValid: boolean;
  /** Optional error or validation message */
  message?: string;
} | null>(null);

/**
 * Sets the state for a specific date in the selected dates map.
 * Creates a new map instance to trigger reactivity.
 *
 * @param date - The date string in YYYY-MM-DD format
 * @param state - The state to set (working, oof, or holiday)
 *
 * @example
 * ```ts
 * import { setDateState } from './stores/calendarStore';
 * setDateState('2026-02-06', 'working');
 * ```
 */
export function setDateState(date: DateString, state: DateState): void {
  selectedDates.set(new Map(selectedDates.get()).set(date, state));
}

/**
 * Clears the state for a specific date from the selected dates map.
 * Creates a new map instance to trigger reactivity.
 *
 * @param date - The date string in YYYY-MM-DD format to clear
 *
 * @example
 * ```ts
 * import { clearDateState } from './stores/calendarStore';
 * clearDateState('2026-02-06');
 * ```
 */
export function clearDateState(date: DateString): void {
  const current = selectedDates.get();
  const newMap = new Map(current);
  newMap.delete(date);
  selectedDates.set(newMap);
}

/**
 * Retrieves all currently selected dates and their states.
 *
 * @returns A Map of date strings to their state
 *
 * @example
 * ```ts
 * import { getAllDates } from './stores/calendarStore';
 * const dates = getAllDates();
 * // Map { '2026-02-06' => 'working', '2026-02-07' => 'oof' }
 * ```
 */
export function getAllDates(): Map<DateString, DateState> {
  return selectedDates.get();
}

/**
 * Retrieves the currently displayed month.
 *
 * @returns The Date object representing the current month
 *
 * @example
 * ```ts
 * import { getCurrentMonth } from './stores/calendarStore';
 * const month = getCurrentMonth();
 * console.log(month.getMonth()); // 1 for February
 * ```
 */
export function getCurrentMonth(): Date {
  return currentMonth.get();
}

/**
 * Sets the currently displayed month for navigation.
 *
 * @param date - The Date object representing the new month to display
 *
 * @example
 * ```ts
 * import { setCurrentMonth } from './stores/calendarStore';
 * setCurrentMonth(new Date(2026, 1, 1)); // February 2026
 * ```
 */
export function setCurrentMonth(date: Date): void {
  currentMonth.set(date);
}
