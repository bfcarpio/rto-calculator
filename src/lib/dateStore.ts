/**
 * Date Store - In-memory reactive state management
 * No localStorage - data clears on page refresh
 * Priority: Holiday > OOF > Working
 */

import {
	type DateRange,
	formatDateISO,
	getDateRange,
	isDateInRange,
	parseDateISO,
} from "./dateUtils";

export type DateState = "working" | "oof" | "holiday";
export type MarkingMode = DateState;

interface DateStoreState {
	dateStates: Map<string, DateState>;
	markingMode: MarkingMode;
	dateRange: DateRange;
	isInitialized: boolean;
}

interface StoreStatistics {
	workingDays: number;
	oofDays: number;
	holidayDays: number;
	totalMarkedDays: number;
}

const STATE_PRIORITY: DateState[] = ["holiday", "oof", "working"];

function normalizeDate(date: Date | string): string {
	if (typeof date === "string") {
		const parsed = parseDateISO(date);
		if (!parsed) {
			throw new Error(`Invalid date string: ${date}`);
		}
		return formatDateISO(parsed);
	}
	return formatDateISO(date);
}

function getStatePriority(state: DateState): number {
	return STATE_PRIORITY.indexOf(state);
}

export class DateStore {
	private state: DateStoreState;
	private listeners: Set<
		(state: DateStoreState, stats: StoreStatistics) => void
	> = new Set();

	constructor() {
		this.state = {
			dateStates: new Map(),
			markingMode: "working",
			dateRange: getDateRange(),
			isInitialized: false,
		};
	}

	initialize(): void {
		if (this.state.isInitialized) {
			return;
		}

		this.state = {
			...this.state,
			isInitialized: true,
		};

		this.notifyListeners();
	}

	/**
	 * Mark a date with the specified state
	 * If date already has a higher priority state, it won't be overwritten
	 * unless force is true
	 */
	markDate(date: Date | string, state: DateState, force = false): void {
		const normalizedDate = normalizeDate(date);
		const parsedDate = typeof date === "string" ? parseDateISO(date) : date;

		if (!parsedDate) {
			throw new Error(`Invalid date: ${date}`);
		}

		// Check if date is in valid range
		if (!isDateInRange(parsedDate, this.state.dateRange)) {
			throw new Error(`Date ${normalizedDate} is outside the valid range`);
		}

		const currentState = this.state.dateStates.get(normalizedDate);

		if (currentState && !force) {
			const currentPriority = getStatePriority(currentState);
			const newPriority = getStatePriority(state);

			// Don't overwrite if current state has higher priority
			if (currentPriority < newPriority) {
				return;
			}
		}

		this.state.dateStates.set(normalizedDate, state);
		this.notifyListeners();
	}

	/**
	 * Mark multiple dates at once
	 */
	markDates(dates: Array<Date | string>, state: DateState): void {
		for (const date of dates) {
			try {
				this.markDate(date, state, true); // Force to overwrite existing
			} catch (error) {
				// Skip dates outside range, continue with others
				if (
					error instanceof Error &&
					!error.message.includes("outside the valid range")
				) {
					throw error;
				}
			}
		}
		this.notifyListeners();
	}

	/**
	 * Clear the state of a specific date
	 */
	clearDate(date: Date | string): void {
		const normalizedDate = normalizeDate(date);
		this.state.dateStates.delete(normalizedDate);
		this.notifyListeners();
	}

	/**
	 * Clear all marked dates
	 */
	clearAll(): void {
		this.state.dateStates.clear();
		this.notifyListeners();
	}

	/**
	 * Get the state of a specific date
	 */
	getDateState(date: Date | string): DateState | null {
		const normalizedDate = normalizeDate(date);
		return this.state.dateStates.get(normalizedDate) || null;
	}

	/**
	 * Get all marked dates
	 */
	getAllMarkedDates(): Array<{ date: string; state: DateState }> {
		const result: Array<{ date: string; state: DateState }> = [];
		for (const [date, state] of this.state.dateStates.entries()) {
			result.push({ date, state });
		}
		return result.sort((a, b) => a.date.localeCompare(b.date));
	}

	/**
	 * Get dates by state
	 */
	getDatesByState(state: DateState): string[] {
		const result: string[] = [];
		for (const [date, dateState] of this.state.dateStates.entries()) {
			if (dateState === state) {
				result.push(date);
			}
		}
		return result.sort();
	}

	/**
	 * Set the current marking mode
	 */
	setMarkingMode(mode: MarkingMode): void {
		this.state.markingMode = mode;
		this.notifyListeners();
	}

	/**
	 * Get the current marking mode
	 */
	getMarkingMode(): MarkingMode {
		return this.state.markingMode;
	}

	/**
	 * Cycle to the next marking mode
	 * working -> oof -> holiday -> working
	 */
	cycleMarkingMode(): MarkingMode {
		const modes: MarkingMode[] = ["working", "oof", "holiday"];
		const currentIndex = modes.indexOf(this.state.markingMode);

		if (currentIndex === -1) {
			throw new Error(`Invalid marking mode: ${this.state.markingMode}`);
		}

		const nextIndex = (currentIndex + 1) % modes.length;
		const nextMode = modes[nextIndex];

		if (!nextMode) {
			throw new Error(
				`Failed to cycle marking mode from ${this.state.markingMode}`,
			);
		}

		this.setMarkingMode(nextMode);
		return nextMode;
	}

	/**
	 * Get the date range
	 */
	getDateRange(): DateRange {
		return {
			startDate: new Date(this.state.dateRange.startDate),
			endDate: new Date(this.state.dateRange.endDate),
		};
	}

	/**
	 * Get statistics for the StatusLegend
	 */
	getStatistics(): StoreStatistics {
		let workingDays = 0;
		let oofDays = 0;
		let holidayDays = 0;

		for (const state of this.state.dateStates.values()) {
			if (state === "working") workingDays++;
			else if (state === "oof") oofDays++;
			else if (state === "holiday") holidayDays++;
		}

		return {
			workingDays,
			oofDays,
			holidayDays,
			totalMarkedDays: workingDays + oofDays + holidayDays,
		};
	}

	/**
	 * Subscribe to store changes
	 */
	subscribe(
		callback: (state: DateStoreState, stats: StoreStatistics) => void,
	): () => void {
		this.listeners.add(callback);
		// Immediately call with current state
		callback(this.getStateSnapshot(), this.getStatistics());

		return () => {
			this.listeners.delete(callback);
		};
	}

	private getStateSnapshot(): DateStoreState {
		return {
			dateStates: new Map(this.state.dateStates),
			markingMode: this.state.markingMode,
			dateRange: {
				startDate: new Date(this.state.dateRange.startDate),
				endDate: new Date(this.state.dateRange.endDate),
			},
			isInitialized: this.state.isInitialized,
		};
	}

	private notifyListeners(): void {
		const stateSnapshot = this.getStateSnapshot();
		const stats = this.getStatistics();

		this.listeners.forEach((callback) => {
			try {
				callback(stateSnapshot, stats);
			} catch (error) {
				console.error("DateStore listener error:", error);
			}
		});
	}
}

// Singleton instance
let globalDateStore: DateStore | null = null;

export function getDateStore(): DateStore {
	if (!globalDateStore) {
		globalDateStore = new DateStore();
	}
	return globalDateStore;
}

export function initializeDateStore(): void {
	const store = getDateStore();
	store.initialize();
}

export function setMarkingMode(mode: MarkingMode): void {
	const store = getDateStore();
	store.setMarkingMode(mode);
}

export function getMarkingMode(): MarkingMode {
	const store = getDateStore();
	return store.getMarkingMode();
}

export function markDate(date: Date | string, state: DateState): void {
	const store = getDateStore();
	store.markDate(date, state);
}

export function getDateState(date: Date | string): DateState | null {
	const store = getDateStore();
	return store.getDateState(date);
}

export function getStatistics(): StoreStatistics {
	const store = getDateStore();
	return store.getStatistics();
}

export function subscribeToStore(
	callback: (state: DateStoreState, stats: StoreStatistics) => void,
): () => void {
	const store = getDateStore();
	return store.subscribe(callback);
}
