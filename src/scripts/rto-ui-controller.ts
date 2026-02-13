/**
 * RTO Validation UI Module
 *
 * Provides UI integration for the RTO Calculator validation system.
 * Handles DOM event handlers and coordinates with the core validation
 * library layers (data reader and orchestrator).
 *
 * Layer Architecture:
 * - Data extraction: src/lib/calendar-data-reader.ts (pure function, DOM reading)
 * - Validation orchestration: src/lib/validation/ValidationOrchestrator.ts (no DOM dependencies)
 * - UI integration: This file (only UI event handlers)
 */

import { readCalendarData } from "../lib/calendar-data-reader";
import { DEFAULT_RTO_POLICY } from "../lib/validation/rto-core";
import {
	clearAllValidationHighlights,
	orchestrateValidation,
	type RTOOrchestratorConfig,
} from "../lib/validation/ValidationOrchestrator";
import type { ValidationResult } from "../types/validation-strategy";
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

// ==================== Main Validation Functions ====================

/**
 * Run validation with real-time highlighting of evaluated weeks
 * Uses the layered architecture: data reader → orchestrator → UI update
 */
export async function runValidationWithHighlights(): Promise<void> {
	try {
		console.log(
			"[RTO Validation UI] ==================== Validation Started ====================",
		);

		// Step 1: Read DOM once into pure data structure (holiday-aware)
		console.log(
			"[RTO Validation UI] Step 1: Reading calendar data from DOM...",
		);
		const calendarData = await readCalendarData({ DEBUG: CONFIG.DEBUG });

		if (calendarData.totalWeeks === 0) {
			console.warn(
				"[RTO Validation UI] WARNING: No weeks data found in calendar!",
			);
			alert(
				"No weeks found in calendar. Please ensure that calendar is properly rendered.",
			);
			return;
		}

		// Step 2: Clear previous highlights
		console.log("[RTO Validation UI] Step 2: Clearing previous highlights...");
		clearAllValidationHighlights();

		// Step 3: Orchestrate validation (no DOM access here)
		console.log(
			"[RTO Validation UI] Step 3: Running sliding window validation...",
		);
		const result = orchestrateValidation(calendarData, ORCHESTRATOR_CONFIG);

		console.log(
			`[RTO Validation UI]   Validation result: ${result.isValid ? "VALID" : "INVALID"}`,
		);
		console.log(
			`[RTO Validation UI]   Overall compliance: ${result.compliancePercentage.toFixed(1)}%`,
		);

		// Step 4: Update week status cells in DOM
		console.log("[RTO Validation UI] Step 4: Updating week statuses...");
		const { updateWeekStatusCells } = await import(
			"../lib/validation/ValidationOrchestrator"
		);
		updateWeekStatusCells(result.evaluatedWeeks);

		// Step 5: Display validation results to user
		console.log("[RTO Validation UI] Step 5: Displaying results...");
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
			console.log("[RTO Validation UI] Validation completed successfully");
		}
	} catch (error) {
		console.error("[RTO Validation UI] Error during validation:", error);
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
	console.log(
		`[RTO Validation UI] Found ${validateButtons.length} validate button(s)`,
	);

	validateButtons.forEach((button) => {
		const buttonElement = button as HTMLElement;
		buttonElement.addEventListener("click", () => {
			console.log("[RTO Validation UI] Validate button clicked");
			runValidationWithHighlights();
		});
		console.log(
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
	console.log("[RTO Validation UI] Attached validate button event listeners");
}
