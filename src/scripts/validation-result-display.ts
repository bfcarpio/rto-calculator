/**
 * Validation Result Display
 *
 * This module handles displaying user-friendly validation results
 * in the RTO Calculator. It translates technical validation
 * results into understandable messages and displays them in the
 * validation message container.
 */

import type { RTOPolicyConfig } from "../lib/validation/rto-core";
import type { ValidationResult } from "../types/validation-strategy";

/**
 * Validation result display configuration
 */
const VALIDATION_CONFIG: RTOPolicyConfig = {
	minOfficeDaysPerWeek: 3,
	totalWeekdaysPerWeek: 5,
	thresholdPercentage: 66.7,
	rollingPeriodWeeks: 12,
	topWeeksToCheck: 8,
};

/**
 * Display initial prompt to user
 * Shows a message encouraging users to select days and validate
 */
export function displayInitialPrompt(): void {
	const messageContainer = document.getElementById("validation-message");
	if (!messageContainer) {
		console.warn("[ValidationDisplay] Validation message container not found");
		return;
	}

	const promptMessage =
		"📋 Select your out-of-office days, then click the Validate button to check RTO compliance";

	messageContainer.textContent = promptMessage;
	messageContainer.className = "validation-message centered-message";
	messageContainer.style.display = "block";
	messageContainer.style.visibility = "visible";

	console.log("[ValidationDisplay] Displayed initial prompt");
}

/**
 * Display validation results to user
 * @param validation - The validation result to display
 */
export function displayValidationResults(validation: ValidationResult): void {
	const messageContainer = document.getElementById("validation-message");
	if (!messageContainer) {
		console.warn("[ValidationDisplay] Validation message container not found");
		return;
	}

	// Build user-friendly message
	let displayMessage = "";
	let messageType: "error" | "warning" | "success" = "success";

	if (validation.isValid) {
		const compliance = validation.overallCompliance.toFixed(1);
		displayMessage = `✓ Your schedule is compliant with RTO policy (${compliance}% attendance)`;
		messageType = "success";
	} else {
		const compliance = validation.overallCompliance.toFixed(1);
		displayMessage = `✗ Your schedule does not meet RTO requirements (${compliance}% attendance)`;
		messageType = "error";

		// Add additional context
		const minDays = VALIDATION_CONFIG.minOfficeDaysPerWeek;
		const evalWeeks = VALIDATION_CONFIG.topWeeksToCheck;
		displayMessage += `. You need at least ${minDays} office days in ${evalWeeks} of 12 weeks.`;
	}

	// Update the validation message container
	messageContainer.textContent = displayMessage;
	messageContainer.className = `validation-message ${messageType}`;
	messageContainer.style.display = "block";
	messageContainer.style.visibility = "visible";

	console.log(
		`[ValidationDisplay] Displayed ${messageType} message:`,
		displayMessage,
	);

	// Keep message visible - no auto-hide to reduce screen jittering
}

/**
 * Clear validation message display
 */
export function clearValidationMessage(): void {
	const messageContainer = document.getElementById("validation-message");
	if (messageContainer) {
		messageContainer.style.display = "none";
		messageContainer.style.visibility = "hidden";
		console.log("[ValidationDisplay] Cleared validation message");
	}
}
