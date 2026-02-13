// Re-export everything for easy importing

// Export CalendarManager
export { CalendarManager } from "../CalendarManager";
// Export utility functions from lib
export { formatDate } from "../lib/dateUtils";
// Export utility functions from stores
export {
	clearDateState,
	getAllDates,
	setDateState,
} from "../stores/calendarStore";
export type {
	CalendarConfig,
	CalendarInstance,
	DateRangeOptions,
	DateState,
	DateString,
	MarkedDateRange,
} from "../types";
export * from "./CalendarRenderer";
export * from "./DayRenderer";
export * from "./EventHandler";
export * from "./MonthRenderer";
