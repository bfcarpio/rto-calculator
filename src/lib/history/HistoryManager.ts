/**
 * HistoryManager
 *
 * Manages undo/redo stacks of state snapshots for the RTO Calculator.
 * Implements proper deep copying to ensure snapshot immutability.
 *
 * @module HistoryManager
 */

import type {
	DateState,
	DateString,
} from "../../../packages/datepainter/src/types";
import type { ValidationConfig } from "../../types/validation-strategy";

/**
 * Represents a complete snapshot of application state
 *
 * @interface StateSnapshot
 */
export interface StateSnapshot {
	/** Calendar date states (e.g., "oof", "holiday", "sick") */
	calendarState: Map<DateString, DateState>;
	/** Current month being displayed */
	currentMonth: Date;
	/** Current validation configuration */
	validationConfig: ValidationConfig;
	/** Unix timestamp when snapshot was created */
	timestamp: number;
}

/**
 * Manages a stack of state snapshots for undo functionality
 *
 * @class HistoryManager
 * @implements {EarlyExit} - Validates inputs with guard clauses
 * @implements {ParseDontValidate} - Accepts typed data, performs deep copy at boundary
 * @implements {AtomicPredictability} - Pure methods with predictable outputs
 * @implements {FailFast} - Throws descriptive errors for invalid operations
 * @implements {IntentionalNaming} - Clear, self-documenting method names
 */
export class HistoryManager {
	/** Undo stack of state snapshots */
	private stack: StateSnapshot[] = [];

	/** Redo stack of state snapshots */
	private redoStack: StateSnapshot[] = [];

	/** Maximum number of snapshots to retain */
	private maxSize: number;

	/**
	 * Creates a new HistoryManager instance
	 *
	 * @param maxSize - Maximum number of snapshots to retain (default: 10)
	 * @throws {Error} If maxSize is less than 1
	 */
	constructor(maxSize: number = 10) {
		if (maxSize < 1) {
			throw new Error(
				`HistoryManager maxSize must be at least 1, received: ${maxSize}`,
			);
		}

		this.maxSize = maxSize;
	}

	/**
	 * Push a new state snapshot onto the stack
	 *
	 * Performs deep copying of Map and Date objects to ensure immutability.
	 * Removes oldest snapshot if stack exceeds maxSize.
	 *
	 * @param snapshot - State snapshot to push
	 * @throws {Error} If snapshot is null or undefined
	 * @throws {Error} If required snapshot fields are missing
	 */
	push(snapshot: StateSnapshot): void {
		if (!snapshot) {
			throw new Error("Cannot push null or undefined snapshot");
		}

		if (
			!snapshot.calendarState ||
			!snapshot.currentMonth ||
			!snapshot.validationConfig
		) {
			throw new Error(
				"Snapshot must contain calendarState, currentMonth, and validationConfig",
			);
		}

		// Deep copy Map
		const copiedCalendarState = new Map<DateString, DateState>();
		for (const [date, state] of snapshot.calendarState.entries()) {
			copiedCalendarState.set(date, state);
		}

		// Deep copy Date
		const copiedCurrentMonth = new Date(snapshot.currentMonth);

		// Deep copy ValidationConfig (plain object, spread is sufficient)
		const copiedValidationConfig = { ...snapshot.validationConfig };

		const deepCopy: StateSnapshot = {
			calendarState: copiedCalendarState,
			currentMonth: copiedCurrentMonth,
			validationConfig: copiedValidationConfig,
			timestamp: Date.now(),
		};

		this.stack.push(deepCopy);
		this.redoStack = [];

		// Remove oldest snapshot if stack exceeds maxSize
		if (this.stack.length > this.maxSize) {
			this.stack.shift();
		}
	}

	/**
	 * Pop the most recent snapshot from the undo stack and push it to redo stack
	 *
	 * @returns The most recent snapshot, or undefined if stack is empty
	 */
	undo(): StateSnapshot | undefined {
		if (this.stack.length === 0) {
			return undefined;
		}

		const snapshot = this.stack.pop();
		if (!snapshot) return undefined;
		this.redoStack.push(snapshot);
		return snapshot;
	}

	/**
	 * Pop the most recent snapshot from the redo stack and push it to undo stack
	 *
	 * @returns The most recent redo snapshot, or undefined if redo stack is empty
	 */
	redo(): StateSnapshot | undefined {
		if (this.redoStack.length === 0) {
			return undefined;
		}

		const snapshot = this.redoStack.pop();
		if (!snapshot) return undefined;
		this.stack.push(snapshot);
		return snapshot;
	}

	canUndo(): boolean {
		return this.stack.length > 0;
	}

	canRedo(): boolean {
		return this.redoStack.length > 0;
	}

	/**
	 * Remove all snapshots from both stacks
	 */
	clear(): void {
		this.stack = [];
		this.redoStack = [];
	}

	/**
	 * Get the number of snapshots currently in the stack
	 *
	 * @returns Number of snapshots
	 */
	get size(): number {
		return this.stack.length;
	}

	/**
	 * Get the maximum stack size
	 *
	 * @returns Maximum number of snapshots the stack can hold
	 */
	get maxStackSize(): number {
		return this.maxSize;
	}

	/**
	 * Peek at the most recent snapshot without removing it
	 *
	 * @returns The most recent snapshot, or undefined if stack is empty
	 */
	peek(): StateSnapshot | undefined {
		if (this.stack.length === 0) {
			return undefined;
		}

		// Return a deep copy to prevent external mutation
		const latest = this.stack[this.stack.length - 1];

		if (!latest) {
			return undefined;
		}

		const copiedCalendarState = new Map<DateString, DateState>();
		for (const [date, state] of latest.calendarState.entries()) {
			copiedCalendarState.set(date, state);
		}

		return {
			calendarState: copiedCalendarState,
			currentMonth: new Date(latest.currentMonth),
			validationConfig: { ...latest.validationConfig },
			timestamp: latest.timestamp,
		};
	}
}

export default HistoryManager;
