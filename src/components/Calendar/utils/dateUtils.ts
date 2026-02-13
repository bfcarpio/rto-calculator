/**
 * Date utility functions for RTO Calculator
 * These functions are used in the browser and handle week start configuration
 */

/**
 * Get the start of the week for a given date
 * @param date - The reference date
 * @param firstDayOfWeek - Day of week to start week (0 = Sunday, 1 = Monday)
 * @returns Date object representing the first day of that week
 */
export function getStartOfWeek(date: Date, firstDayOfWeek: number = 1): Date {
  const d = new Date(date);
  const day = d.getDay();
  let diff;

  if (firstDayOfWeek === 0) {
    // Sunday start
    diff = d.getDate() - day + (day === 0 ? 0 : -day);
  } else {
    // Monday start (default)
    diff = d.getDate() - day + (day === 0 ? -6 : 1);
  }

  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Get the end of the week (Friday) for a given date
 * @param date - The reference date
 * @returns Date object representing Friday of that week
 */
export function getEndOfWeek(date: Date): Date {
  const start = getStartOfWeek(date);
  const end = new Date(start);
  end.setDate(start.getDate() + 4); // Monday + 4 = Friday
  end.setHours(23, 59, 59, 999);
  return end;
}

/**
 * Check if a date is a weekend (Saturday or Sunday)
 * @param date - The date to check
 * @returns true if the date is a weekend
 */
export function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6; // 0 = Sunday, 6 = Saturday
}

/**
 * Check if a date is a weekday (Monday-Friday)
 * @param date - The date to check
 * @returns true if the date is a weekday
 */
export function isWeekday(date: Date): boolean {
  return !isWeekend(date);
}

/**
 * Get all dates in a week
 * @param date - Any date within the week
 * @param firstDayOfWeek - Day of week to start week (0 = Sunday, 1 = Monday)
 * @returns Array of Date objects for Monday-Friday
 */
export function getWeekDates(date: Date, firstDayOfWeek: number = 1): Date[] {
  const start = getStartOfWeek(date, firstDayOfWeek);
  const dates: Date[] = [];

  for (let i = 0; i < 5; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    dates.push(d);
  }

  return dates;
}

/**
 * Check if a date is in the past
 * @param date - The date to check
 * @returns true if the date is before today
 */
export function isPastDate(date: Date): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const checkDate = new Date(date);
  checkDate.setHours(0, 0, 0, 0);
  return checkDate < today;
}

/**
 * Format date as ISO string (YYYY-MM-DD)
 * @param date - The date to format
 * @returns ISO date string
 */
export function formatDateISO(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Parse ISO date string to Date object
 * @param isoString - ISO date string (YYYY-MM-DD)
 * @returns Date object
 */
export function parseDateISO(isoString: string): Date {
  const [year, month, day] = isoString.split("-").map(Number);
  return new Date(year, month - 1, day);
}

/**
 * Format date for display (e.g., "Jan 10, 2025")
 * @param date - The date to format
 * @returns Formatted date string
 */
export function formatDateDisplay(date: Date): string {
  const options: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "short",
    day: "numeric",
  };
  return date.toLocaleDateString("en-US", options);
}

/**
 * Format date with day of week (e.g., "Fri, Jan 10, 2025")
 * @param date - The date to format
 * @returns Formatted date string with day of week
 */
export function formatDateWithDay(date: Date): string {
  const options: Intl.DateTimeFormatOptions = {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  };
  return date.toLocaleDateString("en-US", options);
}

/**
 * Get the day of week name
 * @param date - The date
 * @returns Day name (e.g., "Monday")
 */
export function getDayName(date: Date): string {
  const options: Intl.DateTimeFormatOptions = { weekday: "long" };
  return date.toLocaleDateString("en-US", options);
}

/**
 * Get short day of week name
 * @param date - The date
 * @returns Short day name (e.g., "Mon")
 */
export function getDayNameShort(date: Date): string {
  const options: Intl.DateTimeFormatOptions = { weekday: "short" };
  return date.toLocaleDateString("en-US", options);
}

/**
 * Check if two dates are the same day
 * @param date1 - First date
 * @param date2 - Second date
 * @returns true if dates are the same day
 */
export function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

/**
 * Get all dates for a 365-day calendar starting from today
 * @returns Array of Date objects for the next 365 days
 */
export function getCalendarDates(): Date[] {
  const dates = [];

  // Start from the first day of the current month
  const startDate = new Date();
  startDate.setDate(1); // Set to first day of current month
  startDate.setHours(0, 0, 0, 0);

  // End on the last day of the month that is 365 days from now
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + 365); // 365 days from now
  endDate.setMonth(endDate.getMonth() + 1, 0); // Last day of that month
  endDate.setHours(0, 0, 0, 0);

  // Generate all dates from start to end
  const currentDate = new Date(startDate);
  while (currentDate <= endDate) {
    dates.push(new Date(currentDate));
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return dates;
}

/**
 * Get month name
 * @param date - The date
 * @returns Month name (e.g., "January")
 */
export function getMonthName(date: Date): string {
  const options: Intl.DateTimeFormatOptions = { month: "long" };
  return date.toLocaleDateString("en-US", options);
}

/**
 * Get short month name
 * @param date - The date
 * @returns Short month name (e.g., "Jan")
 */
export function getMonthNameShort(date: Date): string {
  const options: Intl.DateTimeFormatOptions = { month: "short" };
  return date.toLocaleDateString("en-US", options);
}
