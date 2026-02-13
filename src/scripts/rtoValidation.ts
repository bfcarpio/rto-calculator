/**
 * RTO Validation UI Module
 *
 * Provides UI integration for the RTO Calculator validation system.
 * Handles DOM reading, updating UI elements, and coordinating with the
 * core validation library (src/lib/rtoValidation.ts).
 */

import { getHolidayDatesForValidation } from "../lib/calendar-holiday-integration";

import {
	DEFAULT_RTO_POLICY,
	getStartOfWeek,
	isWeekday,
	type RTOPolicyConfig,
	validateSlidingWindow,
	type WeekCompliance,
} from "../lib/rtoValidation";
import {
	clearValidationMessage as clearValidationDisplay,
	displayValidationResults,
} from "./validation-result-display";

// ==================== Type Definitions ====================

/**
 * Day information for a single day
 * Includes direct reference to DOM element for efficient updates
 */
interface DayInfo {
	date: Date;
	element: HTMLElement;
	isWeekday: boolean;
	isSelected: boolean;
	selectionType: "out-of-office" | null;
	isHoliday: boolean;
}

/**
 * Week status types for validation feedback
 */
type WeekStatus = "compliant" | "invalid" | "pending" | "excluded" | "ignored";

/**
 * Week information for tracking
 * All DOM references stored directly in data structure
 */
interface WeekInfo {
	weekStart: Date;
	weekNumber: number;
	days: DayInfo[];
	oofCount: number; // Renamed from wfhCount
	officeDays: number;
	totalDays: number;
	oofDays: number; // Renamed from wfhDays
	isCompliant: boolean;
	isUnderEvaluation: boolean;
	status: WeekStatus;
	statusCellElement: HTMLElement | null;
}

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
 * Policy configuration (uses library defaults)
 */
const POLICY: RTOPolicyConfig = DEFAULT_RTO_POLICY;

// ==================== State Management ====================

/**
 * Cached week data from DOM
 */
let weeksData: WeekInfo[] = [];

// ==================== DOM Reading ====================

/**
 * Read calendar data from DOM into pure data structure
 * This function queries the DOM once and builds a complete data model
 * Integrates holiday dates to properly treat holidays as non-office days
 */
async function readCalendarData(): Promise<WeekInfo[]> {
	const startTime = performance.now();

	// Get holiday dates for validation (holidays are non-office days)
	const holidayDates = await getHolidayDatesForValidation();
	const holidaySet = new Set(
		Array.from(holidayDates).map((d: Date) => d.toDateString()),
	);

	// Find all calendar cells - single DOM query, excluding empty cells
	const cells = document.querySelectorAll(
		".calendar-day:not(.empty)[data-year][data-month][data-day]",
	);

	// Query all status cells and build lookup map keyed by week start timestamp
	const statusCellElements = document.querySelectorAll(
		".week-status-cell[data-week-start]",
	);
	const statusCellMap = new Map<number, HTMLElement>();
	for (const cell of statusCellElements) {
		const element = cell as HTMLElement;
		const weekStartAttr = element.dataset.weekStart;
		if (!weekStartAttr) continue;

		const weekStartTimestamp = parseInt(weekStartAttr, 10);
		if (Number.isNaN(weekStartTimestamp)) continue;

		statusCellMap.set(weekStartTimestamp, element);
	}

	// Group cells by week - element references stored in DayInfo objects
	const weekMap = new Map<number, DayInfo[]>();
	const dayCountPerWeek = new Map<number, number>();

	cells.forEach((cell) => {
		const element = cell as HTMLElement;
		const year = parseInt(element.dataset.year || "0");
		const month = parseInt(element.dataset.month || "0");
		const day = parseInt(element.dataset.day || "0");
		const date = new Date(year, month, day);

		// Check if this is a weekday using library function
		const weekday = isWeekday(date);

		// Check if this is a holiday (holidays are non-office days)
		const isHoliday = holidaySet.has(date.toDateString());

		// Check selection state
		const isSelected = element.classList.contains("selected");
		const selectionType = element.dataset.selectionType as
			| "out-of-office"
			| null;

		// Store element reference directly in DayInfo
		const dayInfo: DayInfo = {
			date,
			element, // Direct DOM reference embedded in data structure
			isWeekday: weekday,
			isSelected,
			selectionType,
			isHoliday,
		};

		// Group by week start using library function
		const weekStart = getStartOfWeek(date);
		const weekKey = weekStart.getTime();

		if (!weekMap.has(weekKey)) {
			// Preallocate array for 5 weekdays (typical work week)
			weekMap.set(weekKey, new Array<DayInfo>(5));
			dayCountPerWeek.set(weekKey, 0);
		}
		const weekDays = weekMap.get(weekKey)!;
		const currentCount = dayCountPerWeek.get(weekKey)!;
		weekDays[currentCount] = dayInfo;
		dayCountPerWeek.set(weekKey, currentCount + 1);
	});

	// Convert map to sorted array of WeekInfo
	const sortedWeekStarts = Array.from(weekMap.keys()).sort((a, b) => a - b);

	// Build weeks array with holiday-aware statistics
	const weeks: WeekInfo[] = [];
	let totalHolidayDays = 0; // Track total holidays across all weeks

	for (const weekStartTimestamp of sortedWeekStarts) {
		const weekStart = new Date(weekStartTimestamp);
		const weekDays = weekMap.get(weekStartTimestamp)!;
		const actualDayCount = dayCountPerWeek.get(weekStartTimestamp)!;

		// Trim to actual day count (handles partial weeks)
		const days = weekDays.slice(0, actualDayCount);

		// Calculate week statistics (holidays are not counted as WFH or office)
		const weekdayDays = days.filter((d) => d.isWeekday);
		const holidayDays = days.filter((d) => d.isHoliday && d.isWeekday);
		totalHolidayDays += holidayDays.length;
		const oofCount = days.filter(
			(d) => d.selectionType === "out-of-office" && d.isWeekday && !d.isHoliday,
		).length;

		// Office days = weekdays that are not OOF and not holidays
		const officeDays = weekdayDays.length - holidayDays.length - oofCount;

		const totalEffectiveDays = weekdayDays.length - holidayDays.length;
		const isCompliant = officeDays >= POLICY.minOfficeDaysPerWeek;

		const weekInfo: WeekInfo = {
			weekStart,
			weekNumber: weeks.length + 1,
			days,
			oofCount,
			officeDays,
			totalDays: totalEffectiveDays,
			oofDays: oofCount,
			isCompliant,
			isUnderEvaluation: true,
			status: isCompliant ? "compliant" : "invalid",
			statusCellElement: null,
		};

		weeks.push(weekInfo);
	}

	if (CONFIG.DEBUG) {
		console.log(
			`[RTO Validation UI] Calendar data read in ${(performance.now() - startTime).toFixed(2)}ms`,
		);
		console.log(`[RTO Validation UI]   Found ${weeks.length} weeks`);
		console.log(
			`[RTO Validation UI]   Total holidays across all weeks: ${totalHolidayDays}`,
		);
	}

	return weeks;
}

// ==================== DOM Updates ====================

/**
 * Clear all validation status highlights from the calendar
 */
export function clearAllValidationHighlights(): void {
	const statusCells = document.querySelectorAll(".week-status-container");

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


// ==================== Main Validation Functions ====================

/**
 * Run validation with real-time highlighting of evaluated weeks
 * Uses holiday-aware data to ensure holidays are treated as non-office days
 */
export async function runValidationWithHighlights(): Promise<void> {
	try {
		console.log(
			"[RTO Validation UI] ==================== Validation Started ====================",
		);

		// Clear any cached data to ensure fresh read
		weeksData = [];

		// Step 1: Read DOM once into pure data structure (holiday-aware)
		console.log(
			"[RTO Validation UI] Step 1: Reading calendar data from DOM...",
		);
		weeksData = await readCalendarData();

		if (weeksData.length === 0) {
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

		// Step 3: Perform calculations using library functions
		console.log(
			"[RTO Validation UI] Step 3: Running sliding window validation...",
		);
		// Convert WeekInfo[] to WeekCompliance[] for validation
		const weeksForValidation: WeekCompliance[] = weeksData.map((week) => ({
			weekNumber: week.weekNumber,
			weekStart: week.weekStart,
			officeDays: week.officeDays,
			totalDays: week.totalDays,
			oofDays: week.oofCount, // oofCount represents WFH days
			wfhDays: week.oofCount,
			isCompliant: week.isCompliant,
			status: week.isCompliant ? "compliant" : "violation",
		}));

		const validation = validateSlidingWindow(weeksForValidation, POLICY);
		console.log(
			`[RTO Validation UI]   Validation result: ${validation.isValid ? "VALID" : "INVALID"}`,
		);
		console.log(
			`[RTO Validation UI]   Overall compliance: ${validation.overallCompliance.toFixed(1)}%`,
		);

		// Step 4: Update week data with evaluation status
		console.log("[RTO Validation UI] Step 4: Updating week statuses...");
		const evaluatedTimestamps = new Set(validation.evaluatedWeekStarts);
		const isInvalid = !validation.isValid;
		const invalidWeekStart = validation.invalidWeekStart;

		// Update week info with validation results
		for (const week of weeksData) {
			if (evaluatedTimestamps.has(week.weekStart.getTime())) {
				week.isUnderEvaluation = true;
				week.status = validation.isValid ? "compliant" : "invalid";
			} else {
				week.isUnderEvaluation = false;
				week.status = "pending";
			}

			// If invalid and we have an invalid week start, mark that week
			if (
				isInvalid &&
				invalidWeekStart !== null &&
				week.weekStart.getTime() === invalidWeekStart
			) {
				week.status = "invalid";
			}

			// Find status cell for this week and update it
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

		// Hide validation message (will be replaced by displayValidationResults)
		// Clear validation message (will be replaced by displayValidationResults)
		clearValidationDisplay();

		// Display validation results to user
		displayValidationResults({
			isValid: validation.isValid,
			overallCompliance: validation.overallCompliance,
			message: validation.message,
			evaluatedWeekStarts: validation.evaluatedWeekStarts,
			windowWeekStarts: validation.windowWeekStarts,
			invalidWeekStart: validation.invalidWeekStart,
			windowStart: validation.windowStart,
		});

		if (CONFIG.DEBUG) {
			console.log("[RTO Validation UI] Cleared all validation highlights");
		}
	} catch (error) {
		console.error("[RTO Validation UI] Error during validation:", error);
		alert("An error occurred during validation. Please try again.");
	}
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
	(window as any).rtoValidation = {
		clearAllValidationHighlights,
		runValidationWithHighlights,
	};
}

if (CONFIG.DEBUG) {
	console.log("[RTO Validation UI] Attached validate button event listeners");
}
