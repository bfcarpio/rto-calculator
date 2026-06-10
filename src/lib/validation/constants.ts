import { DEFAULT_POLICY, RTO_CONFIG } from "../rto-config";

export const REQUIRED_OFFICE_DAYS = RTO_CONFIG.minOfficeDaysPerWeek;
export const MINIMUM_COMPLIANT_DAYS = RTO_CONFIG.minOfficeDaysPerWeek;
export const TOTAL_WEEK_DAYS = RTO_CONFIG.totalWeekdaysPerWeek;
export const ROLLING_WINDOW_WEEKS = DEFAULT_POLICY.rollingPeriodWeeks;
export const BEST_WEEKS_COUNT = DEFAULT_POLICY.topWeeksToCheck;
export const COMPLIANCE_THRESHOLD = DEFAULT_POLICY.thresholdPercentage;

// Offset from week start (Sunday) to Friday: Sunday=0, Mon=1, Tue=2, Wed=3, Thu=4, Fri=5
export const FRIDAY_OFFSET = 5;
