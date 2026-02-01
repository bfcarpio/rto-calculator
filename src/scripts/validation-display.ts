/**
 * Validation Display Utility
 *
 * This module handles displaying validation results to users in a clear,
 * user-friendly way. It translates technical validation results into
 * understandable messages and displays them in the validation message container.
 *
 * @module validation-display
 */

/**
 * Display validation results to user
 * @param validation - The validation result to display
 */
export function displayValidationResults(validation: {
	isValid: boolean;
	overallCompliance: number;
	message?: string;
	evaluatedWeekStarts: number[];
	windowWeekStarts: number[];
	invalidWeekStart: number | null;
	windowStart: number | null;
}): void {
	const messageContainer = document.getElementById("validation-message");
	if (!messageContainer) {
		console.warn("[ValidationDisplay] Validation message container not found");
		return;
	}

	// Build user-friendly message
	let message = "";
	let messageType: "error" | "warning" | "success" = "success";

	if (validation.isValid) {
		const compliance = validation.overallCompliance.toFixed(1);
		message = `✓ Your schedule is compliant with RTO policy (${compliance}% attendance)`;
		messageType = "success";
	} else {
		const compliance = validation.overallCompliance.toFixed(1);
		message = `✗ Your schedule does not meet RTO requirements (${compliance}% attendance)`;
		messageType = "error";

		// Add additional context
		const minDays = 3; // Default minimum office days
		const evalWeeks = 8; // Default evaluation weeks
		message += `. You need at least ${minDays} office days in ${evalWeeks} of 12 weeks.`;
	}

	// Update the validation message container
	messageContainer.textContent = message;
	messageContainer.className = `validation-message ${messageType}`;
	messageContainer.style.display = "block";
	messageContainer.style.visibility = "visible";

	console.log(`[ValidationDisplay] Displayed ${messageType} message:`, message);

	// Auto-hide success messages after 5 seconds
	if (messageType === "success") {
		setTimeout(() => {
			messageContainer.style.display = "none";
			messageContainer.style.visibility = "hidden";
			console.log("[ValidationDisplay] Auto-hid success message");
		}, 5000);
	}
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
