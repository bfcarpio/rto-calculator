/**
 * Temporary DateStore Stub
 *
 * Provides minimal compatibility for components during migration.
 * This will be replaced once all components are migrated to use datepainter directly.
 *
 * Status: STUB - Remove after full migration to datepainter
 */

import { clearDateState, getAllDates, setDateState } from "datepainter";

export type DateState = "oof" | "holiday" | "sick";
export type MarkingMode = DateState;

export interface DateRange {
	startDate: Date;
	endDate: Date;
}

// Default date range - 12 months from today
const DEFAULT_START_DATE = new Date();
const DEFAULT_END_DATE = new Date();
DEFAULT_END_DATE.setMonth(DEFAULT_END_DATE.getMonth() + 11);
DEFAULT_END_DATE.setDate(DEFAULT_END_DATE.getDate() + 30);

const currentDateRange: DateRange = {
	startDate: DEFAULT_START_DATE,
	endDate: DEFAULT_END_DATE,
};

function formatDate(date: Date): string {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const day = String(date.getDate()).padStart(2, "0");
	return `${year}-${month}-${day}`;
}

// Stub store
export function getDateStore() {
	return {
		getDateRange(): DateRange {
			return currentDateRange;
		},

		getDateState(date: Date): DateState | null {
			const dateStr = formatDate(date);
			// Type assertion needed because formatDate returns string, not template literal
			return (
				getAllDates().get(dateStr as `${number}-${number}-${number}`) || null
			);
		},

		markDate(date: Date, state: DateState, _skipUpdate = false): void {
			const dateStr = formatDate(date);
			// Type assertion needed because formatDate returns string, not template literal
			setDateState(dateStr as `${number}-${number}-${number}`, state);
		},

		clearDate(date: Date): void {
			const dateStr = formatDate(date);
			// Type assertion needed because formatDate returns string, not template literal
			clearDateState(dateStr as `${number}-${number}-${number}`);
		},

		subscribe(_callback: (state: any, _stats: any) => void): () => void {
			// Simple stub - components will need to use datepainter's events
			return () => {};
		},

		getAllMarkedDates(): Array<{ date: string; state: DateState }> {
			const allDates = getAllDates();
			return Array.from(allDates.entries()).map(([dateStr, state]) => ({
				date: dateStr,
				state,
			}));
		},
	};
}

// Stub function for marking mode
export function setMarkingMode(_mode: MarkingMode): void {
	// Stub - will be implemented with datepainter
}

// Stub type for compatibility with old subscribe signature
export type StoreState = {
	markingMode: MarkingMode;
};
