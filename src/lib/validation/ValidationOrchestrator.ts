/**
 * RTO Validation Orchestrator
 *
 * Orchestrates validation without any DOM dependencies.
 * Takes typed data from the data reader layer and coordinates
 * validation using the core validation library.
 *
 * @module ValidationOrchestrator
 */

import { logger } from "../../utils/logger";
import {
	type CalendarDataResult,
	convertWeeksToCompliance,
	type WeekInfo,
} from "../calendar-data-reader";
import { DEFAULT_POLICY, RTO_CONFIG } from "../rto-config";
import {
	type RTOPolicyConfig,
	type SlidingWindowResult,
	validateSlidingWindow,
} from "./rto-core";

/**
 * Configuration for the RTO orchestrator
 */
export interface RTOOrchestratorConfig {
	policy: RTOPolicyConfig;
	DEBUG: boolean;
}

/**
 * Default configuration for the orchestrator
 */
export const DEFAULT_ORCHESTRATOR_CONFIG: RTOOrchestratorConfig = {
	policy: DEFAULT_POLICY,
	DEBUG: RTO_CONFIG.DEBUG,
};

/**
 * Create a type-safe copy of WeekInfo
 * Ensures all properties including statusCellElement are properly copied
 *
 * @param week - The week to copy
 * @returns A new WeekInfo object with the same values
 */
function copyWeekInfo(week: WeekInfo): WeekInfo {
	return {
		...week,
		days: [...week.days], // Shallow copy the days array
		statusCellElement: week.statusCellElement, // Explicitly preserve DOM reference
	};
}

/**
 * Orchestrated validation result with enhanced metadata
 */
export interface OrchestratedValidationResult {
	slidingWindowResult: SlidingWindowResult;
	evaluatedWeeks: WeekInfo[];
	totalWeeksEvaluated: number;
	compliancePercentage: number;
	isValid: boolean;
	message: string;
}

/**
 * Orchestrate validation for calendar data
 *
 * This function takes calendar data from the reader layer and runs
 * the full validation pipeline without any DOM dependencies.
 *
 * @param calendarData - The calendar data to validate
 * @param config - Orchestration configuration
 * @returns Orchestrated validation result
 */
export function orchestrateValidation(
	calendarData: CalendarDataResult,
	config: Partial<RTOOrchestratorConfig> = {},
): OrchestratedValidationResult {
	const mergedConfig = { ...DEFAULT_ORCHESTRATOR_CONFIG, ...config };
	const { policy } = mergedConfig;

	// Convert WeekInfo to WeekCompliance for validation
	const weeksForValidation = convertWeeksToCompliance(calendarData.weeks);

	// Run sliding window validation
	const slidingWindowResult = validateSlidingWindow(weeksForValidation, policy);

	// Update week statuses based on validation results
	const evaluatedTimestamps = new Set(slidingWindowResult.evaluatedWeekStarts);
	const isInvalid = !slidingWindowResult.isValid;
	const invalidWeekStart = slidingWindowResult.invalidWeekStart;

	const evaluatedWeeks: WeekInfo[] = [];

	for (const week of calendarData.weeks) {
		const weekCopy = copyWeekInfo(week);

		if (evaluatedTimestamps.has(week.weekStart.getTime())) {
			weekCopy.isUnderEvaluation = true;
			weekCopy.status = slidingWindowResult.isValid ? "compliant" : "invalid";
		} else {
			weekCopy.isUnderEvaluation = false;
			weekCopy.status = "pending";
		}

		// If invalid and we have an invalid week start, mark that week
		if (
			isInvalid &&
			invalidWeekStart !== null &&
			week.weekStart.getTime() === invalidWeekStart
		) {
			weekCopy.status = "invalid";
		}

		evaluatedWeeks.push(weekCopy);
	}

	const result: OrchestratedValidationResult = {
		slidingWindowResult,
		evaluatedWeeks,
		totalWeeksEvaluated: evaluatedWeeks.length,
		compliancePercentage: slidingWindowResult.overallCompliance,
		isValid: slidingWindowResult.isValid,
		message: slidingWindowResult.message,
	};

	if (mergedConfig.DEBUG) {
		logger.debug("[RTO Orchestrator] Validation orchestrated successfully");
		logger.debug(`[RTO Orchestrator]   Valid: ${result.isValid}`);
		logger.debug(
			`[RTO Orchestrator]   Compliance: ${result.compliancePercentage.toFixed(1)}%`,
		);
		logger.debug(
			`[RTO Orchestrator]   Weeks evaluated: ${result.totalWeeksEvaluated}`,
		);
	}

	return result;
}

/**
 * Update week status cells based on validation results
 *
 * This function updates the DOM status cells for evaluated weeks.
 * It requires DOM access but only for the specific status cell elements.
 *
 * @param evaluatedWeeks - The weeks with updated statuses
 */
export function updateWeekStatusCells(evaluatedWeeks: WeekInfo[]): void {
	for (const week of evaluatedWeeks) {
		if (week.statusCellElement) {
			const container = week.statusCellElement;
			const iconElement = container.querySelector(".week-status-icon");
			const srElement = container.querySelector(".sr-only");

			if (iconElement) {
				iconElement.textContent = "";
				iconElement.classList.remove("violation", "least-attended");
			}
			if (srElement) {
				srElement.textContent = "";
			}

			if (week.status === "compliant" && iconElement && srElement) {
				iconElement.textContent = "✓";
				srElement.textContent = "Compliant";
			} else if (week.status === "invalid" && iconElement && srElement) {
				iconElement.textContent = "✗";
				srElement.textContent = "Not compliant";
			}
		}
	}
}

/**
 * Clear all validation status highlights from the calendar
 *
 * This function clears status indicators without re-running validation.
 *
 * @param statusContainerSelector - CSS selector for status containers
 */
export function clearAllValidationHighlights(
	statusContainerSelector: string = ".week-status-container",
): void {
	const statusCells = document.querySelectorAll(statusContainerSelector);

	statusCells.forEach((cell) => {
		const iconElement = cell.querySelector(".week-status-icon");
		const srElement = cell.querySelector(".sr-only");

		if (iconElement) {
			iconElement.textContent = "";
			iconElement.classList.remove("violation", "least-attended");
		}
		if (srElement) {
			srElement.textContent = "";
		}
	});
}

/**
 * Get compliance summary for display
 *
 * @param result - The orchestrated validation result
 * @returns Object with formatted summary data
 */
export function getComplianceSummary(result: OrchestratedValidationResult): {
	isValid: boolean;
	compliancePercentage: string;
	message: string;
	weeksEvaluated: number;
} {
	return {
		isValid: result.isValid,
		compliancePercentage: `${result.compliancePercentage.toFixed(1)}%`,
		message: result.message,
		weeksEvaluated: result.totalWeeksEvaluated,
	};
}
