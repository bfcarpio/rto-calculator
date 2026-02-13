/**
 * Represents a single day in the calendar
 */
export interface DayData {
  date: Date;
  isOfficeDay: boolean;
  isValid: boolean;
  validationMessage?: string;
  isHoliday?: boolean;
  holidayName?: string;
  isUserSelected?: boolean;
}

/**
 * Represents a week's compliance data
 */
export interface WeekData {
  startDate: Date;
  officeDays: number;
  totalDays: number;
  compliance: number;
  violations: string[];
}

/**
 * Represents rolling period evaluation data
 */
export interface RollingPeriodData {
  weeks: WeekData[];
  overallCompliance: number;
  lastValidated: Date;
  trend: 'improving' | 'stable' | 'declining';
}

/**
 * RTO Policy configuration
 */
export interface RTOPolicy {
  minOfficeDaysPerWeek: number;
  evaluationMethod: 'rolling' | 'per-unit';
  rollingPeriodLength: number;
  blackoutPeriods: Date[];
  advanceNoticeRequired: boolean;
  advanceNoticeDays: number;
  customValidationRules: ValidationRule[];
  timezone: string;
}

/**
 * Holiday data structure
 */
export interface Holiday {
  date: Date;
  name: string;
  type: 'company' | 'public';
  recurring?: boolean;
}

/**
 * Validation rule definition
 */
export interface ValidationRule {
  id: string;
  name: string;
  description: string;
  validator: (data: DayData[]) => boolean;
  message: string;
  severity: 'error' | 'warning';
}

/**
 * User preferences
 */
export interface UserPreferences {
  theme: 'light' | 'dark' | 'high-contrast';
  colorScheme: 'default' | 'protanopia' | 'deuteranopia' | 'tritanopia' | 'achromatopsia';
  language: string;
  timezone: string;
  firstDayOfWeek: number;
}

/**
 * Calendar state for localStorage
 */
export interface CalendarState {
  selectedDates: string[]; // ISO date strings
  lastUpdated: string;
}
