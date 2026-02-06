import type {
  CalendarConfig,
  DateString,
  DateState,
} from '../types';
import {
  formatDate,
  getFirstDayOfMonth,
  getDaysInMonth,
  getWeekNumber,
} from './dateUtils';

/**
 * Get CSS classes for a day cell based on state and position
 *
 * Generates the CSS class string for a calendar day cell based on its state
 * (working, OOF, holiday), whether it's today, and any additional styling needs.
 * Classes follow a BEM-like naming convention with the `rto-calendar` prefix.
 *
 * @param date - The date string for the cell (YYYY-MM-DD format)
 * @param state - The state of the date (working, oof, holiday) or null if unassigned
 * @returns A space-separated string of CSS class names
 *
 * @example
 * ```ts
 * getDayCellClasses('2026-02-06', 'oof');
 * // Returns: 'rto-calendar-day rto-calendar-day--oof'
 *
 * getDayCellClasses('2026-02-06', null);
 * // Returns: 'rto-calendar-day rto-calendar-day--today' (if today)
 * ```
 */
export function getDayCellClasses(
  date: DateString,
  state: DateState | null
): string {
  const classes: string[] = [];

  // Base class for all day cells
  classes.push('rto-calendar-day');

  // State class for visual differentiation
  if (state) {
    classes.push(`rto-calendar-day--${state}`);
  }

  // Today class for current date highlighting
  const today = formatDate(new Date());
  if (date === today) {
    classes.push('rto-calendar-day--today');
  }

  return classes.join(' ');
}

/**
 * Get icon HTML for a day cell
 *
 * Generates HTML markup for an icon element to be displayed within a day cell.
 * The icon can be positioned above, below, left, or right of the day number.
 * Icons are marked with aria-hidden="true" since they're decorative.
 *
 * @param icon - The icon character or HTML string to display
 * @param position - The position relative to the day number (default: 'below')
 * @returns HTML string containing the icon span element
 *
 * @example
 * ```ts
 * getIconHTML('🏠', 'below');
 * // Returns: '<span class="rto-calendar-day__icon rto-calendar-day__icon--below" aria-hidden="true">🏠</span>'
 *
 * getIconHTML(); // Returns: ''
 * ```
 */
export function getIconHTML(
  icon?: string,
  position: 'above' | 'below' | 'left' | 'right' = 'below'
): string {
  if (!icon) return '';

  const positionClass = `rto-calendar-day__icon--${position}`;
  return `<span class="rto-calendar-day__icon ${positionClass}" aria-hidden="true">${icon}</span>`;
}

/**
 * Generate calendar HTML for a given configuration
 *
 * Creates the complete HTML markup for a calendar grid based on the provided
 * configuration. The calendar includes:
 * - Weekday headers (configurable show/hide)
 * - Week numbers (configurable show/hide)
 * - Month labels with year
 * - Day cells with empty padding for alignment
 *
 * State-based styling (working, OOF, holiday) is applied dynamically via
 * DOM updates after initial render. The initial HTML includes the structure
 * and data attributes needed for state management.
 *
 * @param config - The calendar configuration object containing:
 *   - dateRange: Start and end dates for the calendar
 *   - states: Configuration for different date states
 *   - styling: Optional styling preferences (weekdays, week numbers, first day)
 * @returns Complete HTML string for the calendar grid
 *
 * @example
 * ```ts
 * const config: CalendarConfig = {
 *   dateRange: {
 *     start: new Date('2026-01-01'),
 *     end: new Date('2026-03-31')
 *   },
 *   states: {
 *     working: { label: 'Working', color: '#4CAF50' },
 *     oof: { label: 'OOF', color: '#FF5722' },
 *     holiday: { label: 'Holiday', color: '#2196F3' }
 *   },
 *   styling: {
 *     showWeekdays: true,
 *     showWeekNumbers: true,
 *     firstDayOfWeek: 0
 *   }
 * };
 *
 * const html = getCalendarHTML(config);
 * // Returns complete calendar HTML structure
 * ```
 */
export function getCalendarHTML(config: CalendarConfig): string {
  const { dateRange, styling } = config;
  const { start, end } = dateRange;

  // Get first day of week (Sunday = 0, Monday = 1)
  const firstDayOfWeek = styling?.firstDayOfWeek ?? 0;

  // Get all dates in range by month
  const dates: Date[] = [];
  const currentDate = new Date(start);

  while (currentDate <= end) {
    dates.push(new Date(currentDate));
    currentDate.setMonth(currentDate.getMonth() + 1);
  }

  let html = '<div class="rto-calendar">';

  // Generate weekday headers
  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const adjustedWeekdays = [
    ...weekdays.slice(firstDayOfWeek),
    ...weekdays.slice(0, firstDayOfWeek),
  ];

  if (styling?.showWeekdays !== false) {
    html += '<div class="rto-calendar__weekdays">';
    for (const day of adjustedWeekdays) {
      html += `<div class="rto-calendar__weekday">${day}</div>`;
    }
    html += '</div>';
  }

  // Generate month grids
  for (const date of dates) {
    const year = date.getFullYear();
    const month = date.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(date);
    const weekNumber = getWeekNumber(date);

    html += `<div class="rto-calendar__month" data-month="${year}-${month + 1}">`;

    // Week numbers (if enabled)
    if (styling?.showWeekNumbers !== false) {
      html += `<div class="rto-calendar__week-number">W${weekNumber}</div>`;
    }

    // Month label
    const monthNames = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];
    html += `<div class="rto-calendar__month-label">${monthNames[month]} ${year}</div>`;

    // Day grid
    html += '<div class="rto-calendar__days">';

    // Empty cells for alignment (padding days from previous month)
    for (let i = 0; i < firstDay; i++) {
      html += '<div class="rto-calendar__day rto-calendar__day--empty"></div>';
    }

    // Day cells for each day of the month
    for (let i = 1; i <= daysInMonth; i++) {
      const dayDate = new Date(year, month, i);
      const dayString = formatDate(dayDate);
      const cellClasses = getDayCellClasses(dayString, null); // State will be set dynamically

      html += `<div class="rto-calendar__day ${cellClasses}" data-date="${dayString}">`;
      html += `<span class="rto-calendar__day-number">${i}</span>`;

      // Note: Icons will be rendered dynamically via DOM updates,
      // not in initial HTML, since state changes happen after initial render.
      // Example: html += getIconHTML(state?.icon, state?.position || 'below');

      html += '</div>';
    }

    html += '</div>';
    html += '</div>';
  }

  html += '</div>';

  return html;
}
