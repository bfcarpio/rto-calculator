/**
 * Compliance Data Transformation Layer
 *
 * Transforms validation results into UI-friendly data structures for
 * SummaryBar and StatusDetails components. This layer acts as a
 * pure transformation bridge between the validation system and UI.
 *
 * @module complianceData
 */

import type { CalendarDataResult, WeekInfo } from "./calendar-data-reader";
import { DEFAULT_POLICY, RTO_CONFIG } from "./rto-config";
import type { RTOPolicyConfig, WeekCompliance } from "./validation/rto-core";
import {
	type OrchestratedValidationResult,
	orchestrateValidation,
} from "./validation/ValidationOrchestrator";

/**
 * Non-compliant week information for display
 */
export interface NonCompliantWeekInfo {
	weekRange: string;
	daysWorked: number;
	target: number;
}

/**
 * Data structure for UI components to display compliance information
 */
export interface ComplianceDisplayData {
	// Summary statistics
	averageDays: number;
	weeksTracked: number;
	totalWeeks: number;
	workingDays: number;
	oofDays: number;
	holidayDays: number;

	// Window compliance
	bestWeeks: number;
	targetDays: number;

	// Buffer calculation for future OOF planning
	goodWeeks: number;
	weeksNeeded: number;
	oofWeeksAvailable: number;

	// Current week progress
	currentWeekDays: number;
	currentWeekTarget: number;

	// Violations
	nonCompliantWeeks: NonCompliantWeekInfo[];

	// Overall status
	isCompliant: boolean;
	compliancePercentage: number;
	message: string;
}

/**
 * Configuration for compliance data transformation
 */
interface ComplianceDataConfig {
	policy: RTOPolicyConfig;
	currentWeekStart?: Date;
}

/**
 * Default configuration for compliance data transformation
 */
const DEFAULT_COMPLIANCE_CONFIG: ComplianceDataConfig = {
	policy: DEFAULT_POLICY,
};

/**
 * Format a week range string for display
 * @param weekStart - Start date of the week
 * @returns Formatted week range string (e.g., "Jan 1-5")
 */
function formatWeekRange(weekStart: Date): string {
	const weekEnd = new Date(weekStart);
	weekEnd.setDate(weekStart.getDate() + 4); // Friday

	const startMonth = weekStart.toLocaleDateString("en-US", { month: "short" });
	const startDay = weekStart.getDate();
	const endMonth = weekEnd.toLocaleDateString("en-US", { month: "short" });
	const endDay = weekEnd.getDate();

	if (startMonth === endMonth) {
		return `${startMonth} ${startDay}-${endDay}`;
	}
	return `${startMonth} ${startDay} - ${endMonth} ${endDay}`;
}

/**
 * Calculate working days (excluding holidays)
 * @param weeks - Array of week information
 * @returns Total working days count
 */
function calculateWorkingDays(weeks: WeekInfo[]): number {
	return weeks.reduce((sum, week) => sum + week.totalDays, 0);
}

/**
 * Calculate out-of-office days (excluding holidays)
 * @param weeks - Array of week information
 * @returns Total OOF days count
 */
function calculateOofDays(weeks: WeekInfo[]): number {
	return weeks.reduce((sum, week) => sum + week.oofDays, 0);
}

/**
 * Calculate future OOF capacity based on buffer
 * @param goodWeeks - Number of weeks meeting target
 * @param weeksNeeded - Number of weeks required
 * @returns Number of full-week OOF periods available
 */
function calculateFutureOofCapacity(
	goodWeeks: number,
	weeksNeeded: number,
): number {
	const buffer = goodWeeks - weeksNeeded;
	return Math.max(0, buffer);
}

/**
 * Identify non-compliant weeks for display
 * @param weeks - Array of week compliance data
 * @param targetDays - Minimum days required per week
 * @returns Array of non-compliant week information
 */
function identifyNonCompliantWeeks(
	weeks: WeekCompliance[],
	targetDays: number,
): NonCompliantWeekInfo[] {
	return weeks
		.filter((week) => week.officeDays < targetDays)
		.map((week) => ({
			weekRange: formatWeekRange(week.weekStart),
			daysWorked: week.officeDays,
			target: targetDays,
		}));
}

/**
 * Count weeks meeting the target (good weeks)
 * @param weeks - Array of week compliance data
 * @param targetDays - Minimum days required per week
 * @returns Number of good weeks
 */
function countGoodWeeks(weeks: WeekCompliance[], targetDays: number): number {
	return weeks.filter((week) => week.officeDays >= targetDays).length;
}

/**
 * Calculate current week office days
 * @param weeks - Array of week information
 * @param currentWeekStart - Start date of current week
 * @returns Number of office days in current week
 */
function calculateCurrentWeekDays(
	weeks: WeekInfo[],
	currentWeekStart?: Date,
): number {
	if (!currentWeekStart) {
		const now = new Date();
		currentWeekStart = getStartOfWeek(now);
	}

	const currentWeek = weeks.find(
		(week) => week.weekStart.getTime() === currentWeekStart.getTime(),
	);

	return currentWeek?.officeDays ?? 0;
}

/**
 * Get the start of the week (Monday) for a given date
 * @param date - The reference date
 * @returns Date object representing Monday of that week
 */
function getStartOfWeek(date: Date): Date {
	const d = new Date(date.getTime());
	const day = d.getDay();
	const daysToSubtract = day === 0 ? 6 : day - 1;
	d.setDate(d.getDate() - daysToSubtract);
	d.setHours(0, 0, 0, 0);
	return d;
}

/**
 * Transform orchestrated validation result into UI-friendly display data
 * @param calendarData - Calendar data from the reader layer
 * @param validationResult - Orchestrated validation result
 * @param config - Configuration for transformation
 * @returns Compliance display data for UI components
 */
export function transformToComplianceData(
	calendarData: CalendarDataResult,
	validationResult: OrchestratedValidationResult,
	config: Partial<ComplianceDataConfig> = {},
): ComplianceDisplayData {
	const mergedConfig = { ...DEFAULT_COMPLIANCE_CONFIG, ...config };
	const { policy } = mergedConfig;

	const slidingResult = validationResult.slidingWindowResult;

	// Calculate base statistics
	const weeksTracked = calendarData.weeks.length;
	const totalWeeks = policy.rollingPeriodWeeks;
	const workingDays = calculateWorkingDays(calendarData.weeks);
	const oofDays = calculateOofDays(calendarData.weeks);
	const holidayDays = calendarData.totalHolidayDays;

	// Calculate average from sliding window result
	const averageDays =
		slidingResult.overallCompliance > 0
			? (slidingResult.overallCompliance / 100) * policy.totalWeekdaysPerWeek
			: 0;

	// Convert weeks to compliance format for analysis
	const weeksForValidation = convertWeeksToCompliance(calendarData.weeks);

	// Calculate good weeks (weeks meeting target)
	const goodWeeks = countGoodWeeks(
		weeksForValidation,
		policy.minOfficeDaysPerWeek,
	);
	const weeksNeeded = policy.topWeeksToCheck;
	const oofWeeksAvailable = calculateFutureOofCapacity(goodWeeks, weeksNeeded);

	// Current week progress
	const currentWeekDays = calculateCurrentWeekDays(
		calendarData.weeks,
		mergedConfig.currentWeekStart,
	);

	// Identify non-compliant weeks
	const nonCompliantWeeks = identifyNonCompliantWeeks(
		weeksForValidation,
		policy.minOfficeDaysPerWeek,
	);

	return {
		averageDays: Number.parseFloat(averageDays.toFixed(1)),
		weeksTracked,
		totalWeeks,
		workingDays,
		oofDays,
		holidayDays,
		bestWeeks: slidingResult.evaluatedWeekStarts.length,
		targetDays: policy.minOfficeDaysPerWeek,
		goodWeeks,
		weeksNeeded,
		oofWeeksAvailable,
		currentWeekDays,
		currentWeekTarget: policy.minOfficeDaysPerWeek,
		nonCompliantWeeks,
		isCompliant: validationResult.isValid,
		compliancePercentage: validationResult.compliancePercentage,
		message: validationResult.message,
	};
}

/**
 * Convert WeekInfo array to WeekCompliance format for validation
 * @param weeks - Array of week information
 * @returns Array of week compliance objects
 */
function convertWeeksToCompliance(weeks: WeekInfo[]): WeekCompliance[] {
	return weeks.map((week, index) => ({
		weekNumber: index + 1,
		weekStart: week.weekStart,
		officeDays: week.officeDays,
		totalDays: week.totalDays,
		oofDays: week.oofDays,
		wfhDays: week.oofCount,
		isCompliant: week.isCompliant,
		status: week.isCompliant ? "compliant" : "violation",
	}));
}

/**
 * Main function to get compliance display data for UI
 * Orchestrates validation and transforms results into display format
 * @param calendarData - Calendar data from the reader layer
 * @param config - Optional configuration overrides
 * @returns Promise resolving to compliance display data
 */
export async function getComplianceDisplayData(
	calendarData: CalendarDataResult,
	config: Partial<ComplianceDataConfig> = {},
): Promise<ComplianceDisplayData> {
	const mergedConfig = { ...DEFAULT_COMPLIANCE_CONFIG, ...config };

	// Run validation through orchestrator
	const validationResult = orchestrateValidation(calendarData, {
		policy: mergedConfig.policy,
		DEBUG: RTO_CONFIG.DEBUG,
	});

	// Transform to display format
	return transformToComplianceData(
		calendarData,
		validationResult,
		mergedConfig,
	);
}

/**
 * Calculate buffer summary for quick display
 * Provides a concise summary of OOF capacity
 * @param goodWeeks - Number of weeks meeting target
 * @param weeksNeeded - Number of weeks required
 * @returns Buffer summary string
 */
export function getBufferSummary(
	goodWeeks: number,
	weeksNeeded: number,
): string {
	const buffer = goodWeeks - weeksNeeded;

	if (buffer > 0) {
		return `${buffer} week${buffer === 1 ? "" : "s"} buffer available`;
	}
	if (buffer === 0) {
		return "No buffer - at minimum requirement";
	}
	return `Need ${Math.abs(buffer)} more good week${Math.abs(buffer) === 1 ? "" : "s"}`;
}

/**
 * Quick check if user can take a full-week OOF
 * @param complianceData - Compliance display data
 * @returns True if user has buffer for full-week OOF
 */
export function canTakeFullWeekOof(
	complianceData: ComplianceDisplayData,
): boolean {
	return complianceData.oofWeeksAvailable > 0;
}

/**
 * Get recommendation for current week
 * @param complianceData - Compliance display data
 * @returns Recommendation string for display
 */
export function getCurrentWeekRecommendation(
	complianceData: ComplianceDisplayData,
): string {
	const { currentWeekDays, currentWeekTarget, oofWeeksAvailable } =
		complianceData;
	const remainingDays = currentWeekTarget - currentWeekDays;

	// Already met target
	if (remainingDays <= 0) {
		return "Target met - full week OOF available if needed";
	}

	// Need more days
	if (oofWeeksAvailable > 0) {
		return `Need ${remainingDays} more day${remainingDays === 1 ? "" : "s"} this week (buffer available)`;
	}

	return `Need ${remainingDays} more day${remainingDays === 1 ? "" : "s"} this week to maintain compliance`;
}

export type {
	ComplianceDataConfig,
	OrchestratedValidationResult,
	WeekCompliance,
};
export { formatWeekRange };
