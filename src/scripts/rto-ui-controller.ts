/**
 * RTO Validation UI Module
 *
 * Provides UI integration for the RTO Calculator validation system.
 * Handles DOM event handlers and coordinates with the core validation
 * library layers (data reader and orchestrator).
 *
 * Layer Architecture:
 * - Data extraction: src/lib/calendar-data-reader.ts (pure function, datepainter API)
 * - Validation orchestration: src/lib/validation/ValidationOrchestrator.ts (no DOM dependencies)
 * - UI integration: This file (only UI event handlers)
 */

import type { CalendarInstance } from "../../packages/datepainter/src/types";
import { readCalendarData } from "../lib/calendar-data-reader";
import { DEFAULT_RTO_POLICY } from "../lib/validation/rto-core";
import {
	clearAllValidationHighlights,
	orchestrateValidation,
	type RTOOrchestratorConfig,
} from "../lib/validation/ValidationOrchestrator";
import type { ValidationResult } from "../types/validation-strategy";
import { logger } from "../utils/logger";
import {
	clearValidationMessage,
	displayValidationResults,
} from "./validation-result-display";

// ==================== Configuration ====================

/**
 * UI Configuration
 */
interface UIConfig {
	DEBUG: boolean;
}

/**
 * RTO validation UI configuration
 */
const CONFIG: UIConfig = {
	DEBUG: false,
};

/**
 * Orchestrator configuration using library defaults
 */
const ORCHESTRATOR_CONFIG: RTOOrchestratorConfig = {
	policy: DEFAULT_RTO_POLICY,
	DEBUG: false,
};

/** Global calendar manager instance - must be set before validation can run */
let globalCalendarManager: CalendarInstance | null = null;

/**
 * Set the global calendar manager instance
 * Must be called before running validation
 *
 * @param manager - CalendarInstance providing access to calendar state
 * @throws {Error} If manager is null or undefined
 */
export function setCalendarManager(manager: CalendarInstance): void {
	if (!manager) {
		throw new Error("calendarManager is required");
	}
	globalCalendarManager = manager;
	logger.info("[RTO Validation UI] Calendar manager set");
}

/**
 * Get the global calendar manager instance
 *
 * @returns The current CalendarInstance or null if not set
 */
export function getCalendarManager(): CalendarInstance | null {
	return globalCalendarManager;
}

// ==================== Main Validation Functions ====================

/**
 * Run validation with real-time highlighting of evaluated weeks
 * Uses the layered architecture: data reader → orchestrator → UI update
 *
 * @throws {Error} If calendar manager is not set
 */
export async function runValidationWithHighlights(): Promise<void> {
	// Guard clause - ensure calendar manager is set
	if (!globalCalendarManager) {
		throw new Error(
			"Calendar manager not set. Call setCalendarManager() before running validation.",
		);
	}

	// Local variable with narrowed type (TypeScript doesn't narrow outer scope variables)
	const calendarManager = globalCalendarManager;

	try {
		logger.info(
			"[RTO Validation UI] ==================== Validation Started ====================",
		);

		// Step 1: Read calendar data from datepainter API (holiday-aware)
		logger.info(
			"[RTO Validation UI] Step 1: Reading calendar data from datepainter API...",
		);
		const calendarData = await readCalendarData(calendarManager, {
			DEBUG: CONFIG.DEBUG,
		});

		if (calendarData.totalWeeks === 0) {
			logger.warn(
				"[RTO Validation UI] WARNING: No weeks data found in calendar!",
			);
			alert(
				"No weeks found in calendar. Please ensure that calendar is properly rendered.",
			);
			return;
		}

		// Step 2: Clear previous highlights
		logger.info("[RTO Validation UI] Step 2: Clearing previous highlights...");
		clearAllValidationHighlights();

		// Step 3: Orchestrate validation (no DOM access here)
		logger.info(
			"[RTO Validation UI] Step 3: Running sliding window validation...",
		);
		const result = orchestrateValidation(calendarData, ORCHESTRATOR_CONFIG);

		logger.info(
			`[RTO Validation UI]   Validation result: ${result.isValid ? "VALID" : "INVALID"}`,
		);
		logger.info(
			`[RTO Validation UI]   Overall compliance: ${result.compliancePercentage.toFixed(1)}%`,
		);

		// Step 4: Update week status cells in DOM
		logger.info("[RTO Validation UI] Step 4: Updating week statuses...");
		const { updateWeekStatusCells } = await import(
			"../lib/validation/ValidationOrchestrator"
		);
		updateWeekStatusCells(result.evaluatedWeeks);

		// Step 5: Display validation results to user
		logger.info("[RTO Validation UI] Step 5: Displaying results...");
		clearValidationMessage();

		displayValidationResults({
			isValid: result.isValid,
			overallCompliance: result.compliancePercentage,
			message: result.message,
			windowResults: [],
			violatingWindows: [],
			compliantWindows: [],
		} as ValidationResult);

		if (CONFIG.DEBUG) {
			logger.debug("[RTO Validation UI] Validation completed successfully");
		}
	} catch (error) {
		logger.error("[RTO Validation UI] Error during validation:", error);
		alert("An error occurred during validation. Please try again.");
	}
}

/**
 * Clear all validation status highlights from the calendar
 */
export function clearAllValidationHighlightsUI(): void {
	clearAllValidationHighlights();
}

// ==================== Event Listeners ====================

/**
 * Attach event listeners to validate buttons (wait for DOM if needed)
 */
function attachValidateButtonListeners(): void {
	const validateButtons = document.querySelectorAll('[id^="validate-button-"]');
	logger.info(
		`[RTO Validation UI] Found ${validateButtons.length} validate button(s)`,
	);

	validateButtons.forEach((button) => {
		const buttonElement = button as HTMLElement;
		buttonElement.addEventListener("click", () => {
			logger.debug("[RTO Validation UI] Validate button clicked");
			runValidationWithHighlights();
		});
		logger.debug(
			`[RTO Validation UI] Attached click listener to validate button: ${buttonElement.id}`,
		);
	});
}

// Attach event listeners to validate buttons (wait for DOM if needed)
if (document.readyState === "loading") {
	document.addEventListener("DOMContentLoaded", attachValidateButtonListeners);
} else {
	attachValidateButtonListeners();
}

// Expose validation functions to window for global access
if (typeof window !== "undefined") {
	(
		window as {
			rtoValidation?: {
				clearAllValidationHighlights(): void;
				runValidationWithHighlights(): void;
			};
		}
	).rtoValidation = {
		clearAllValidationHighlights: clearAllValidationHighlightsUI,
		runValidationWithHighlights,
	};
}

if (CONFIG.DEBUG) {
	logger.debug("[RTO Validation UI] Attached validate button event listeners");
}
