// Re-export everything for easy importing
export * from "./CalendarRenderer";
export * from "./MonthRenderer";
export * from "./DayRenderer";
export * from "./EventHandler";

// Export CalendarManager
export { CalendarManager } from "../CalendarManager";

// Export utility functions from stores
export { setDateState, clearDateState, getAllDates } from "../stores/calendarStore";

// Export utility functions from lib
export { formatDate } from "../lib/dateUtils";

export type { CalendarConfig, DateString, DateState } from "../types";
