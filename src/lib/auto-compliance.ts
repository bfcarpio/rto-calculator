/**
 * Auto-Compliance Module
 *
 * Singleton that subscribes to datepainter state changes, debounces computation,
 * reads calendar data, runs sliding-window validation across ALL 12-week windows,
 * and dispatches a `compliance-updated` CustomEvent.
 *
 * @module auto-compliance
 */

import type { CalendarInstance } from "../../packages/datepainter/src/types";
import {
	convertWeeksToCompliance,
	readCalendarData,
	type WeekInfo,
} from "./calendar-data-reader";
import { buildPolicyFromSettings, readSettings } from "./settings-reader";
import {
	evaluateSingleWindow,
	type RTOPolicyConfig,
	type SlidingWindowResult,
	validateSlidingWindow,
} from "./validation/rto-core";

// ─── Public Types ───────────────────────────────────────────────────

export interface AnnotatedWeek {
	weekStart: Date;
	officeDays: number;
	oofCount: number;
	holidayCount: number;
	sickCount: number;
	isBest: boolean;
	isIgnored: boolean;
	isCompliant: boolean;
}

export interface ComplianceEventData {
	/** All weeks in the evaluation window, annotated */
	windowWeeks: AnnotatedWeek[];
	/** Number of best weeks evaluated (up to BEST_WEEKS_COUNT) */
	bestWeekCount: number;
	/** Average office days across best weeks */
	averageOfficeDays: number;
	/** Weeks with >= REQUIRED_OFFICE_DAYS in the window */
	goodWeeks: number;
	/** Droppable slots minus non-compliant dropped weeks */
	bufferWeeks: number;
	/** Earliest dropped-compliant week that can be taken as full WFH */
	nextWfhWeek: Date | null;

	/** Current (possibly incomplete) week, shown separately */
	currentWeek: { weekStart: Date; weekEnd: Date; officeDays: number };

	/** Raw day counts from full window */
	totalWfhDays: number;
	totalHolidayDays: number;
	totalSickDays: number;
	totalWorkingDays: number;

	/** Overall compliance summary */
	isCompliant: boolean;
	compliancePercentage: number;
	message: string;

	/** Sliding-window validation result */
	slidingWindowResult: SlidingWindowResult;

	/** Whether percentage rounding is enabled */
	roundPercentage: boolean;

	/** Policy settings used for compliance calculation */
	/** Total weeks in the rolling window (from settings: rollingPeriodWeeks) */
	totalWeeks: number;
	/** Required office days per week (from settings: minOfficeDays) */
	requiredDays: number;
}

// ─── Event Helpers ──────────────────────────────────────────────────

export const COMPLIANCE_EVENT = "compliance-updated";

export function onComplianceUpdated(
	cb: (data: ComplianceEventData) => void,
): () => void {
	const handler = (e: Event) =>
		cb((e as CustomEvent<ComplianceEventData>).detail);
	window.addEventListener(COMPLIANCE_EVENT, handler);
	return () => window.removeEventListener(COMPLIANCE_EVENT, handler);
}

/** Latest cached result for late-loading components */
let latestResult: ComplianceEventData | null = null;

export function getLatestCompliance(): ComplianceEventData | null {
	return latestResult;
}

// ─── Computing State Helpers ────────────────────────────────────────

function setComputingState(active: boolean): void {
	for (const selector of [".status-details", ".summary-bar"]) {
		const el = document.querySelector(selector);
		if (el) el.classList.toggle("computing", active);
	}
}

// ─── Evaluated Set Algorithm ────────────────────────────────────────

/**
 * Build a set of week timestamps that appear in the best-K of at least one
 * sliding window. A week NOT in this set is safe to zero out — it's already
 * dropped in every window that contains it.
 */
function buildEvaluatedSet(
	allWeeks: WeekInfo[],
	policy: RTOPolicyConfig,
): Set<number> {
	const evaluated = new Set<number>();
	const W = policy.rollingPeriodWeeks;
	const weeks = convertWeeksToCompliance(allWeeks);

	if (weeks.length < W) {
		for (const w of evaluateSingleWindow(weeks, policy).bestWeeks) {
			evaluated.add(w.weekStart.getTime());
		}
		return evaluated;
	}

	for (let start = 0; start <= weeks.length - W; start++) {
		const windowWeeks = weeks.slice(start, start + W);
		for (const w of evaluateSingleWindow(windowWeeks, policy).bestWeeks) {
			evaluated.add(w.weekStart.getTime());
		}
	}

	return evaluated;
}

/**
 * Find the earliest future week that can safely be taken as full WFH.
 * A week is safe iff: it's in the future, currently compliant, and NOT in the
 * evaluated set (i.e., it's already dropped in every sliding window containing it).
 *
 * Returns null if not currently compliant or no safe week exists.
 */
function findNextSafeWfhWeek(
	allWeeks: WeekInfo[],
	policy: RTOPolicyConfig,
	isCompliant: boolean,
): Date | null {
	if (!isCompliant) return null;

	const evaluated = buildEvaluatedSet(allWeeks, policy);
	const today = new Date();
	today.setHours(0, 0, 0, 0);

	const candidates = allWeeks
		.filter(
			(w) =>
				w.weekStart > today &&
				w.officeDays >= policy.minOfficeDaysPerWeek &&
				!evaluated.has(w.weekStart.getTime()),
		)
		.sort((a, b) => a.weekStart.getTime() - b.weekStart.getTime());

	return candidates[0]?.weekStart ?? null;
}

// ─── Core Computation ───────────────────────────────────────────────

function isWeekComplete(weekStart: Date): boolean {
	const friday = new Date(weekStart);
	friday.setDate(friday.getDate() + 4);
	const today = new Date();
	today.setHours(23, 59, 59, 999);
	return friday <= today;
}

function computeComplianceData(allWeeks: WeekInfo[]): ComplianceEventData {
	// Identify current incomplete week for display, but include ALL weeks
	// (including future) in validation so marking future months triggers violations
	const currentWeekInfo = allWeeks.find((w) => !isWeekComplete(w.weekStart));

	// Build dynamic policy from user settings
	const settings = readSettings();
	const policy = buildPolicyFromSettings();

	// Trim weeks to starting week if configured
	let weeks = allWeeks;
	if (settings.startingWeek) {
		const startDate = new Date(`${settings.startingWeek}T00:00:00`);
		const startIdx = allWeeks.findIndex((w) => w.weekStart >= startDate);
		if (startIdx > 0) {
			weeks = allWeeks.slice(startIdx);
		}
	}

	// Run sliding window validation on ALL weeks in the calendar
	const weeksForValidation = convertWeeksToCompliance(weeks);
	const slidingWindowResult = validateSlidingWindow(weeksForValidation, policy);

	// Determine which 12-week window to display:
	// - If invalid: the first failing window
	// - If valid: the last window evaluated
	const windowWeekStartSet = new Set(slidingWindowResult.windowWeekStarts);
	const bestWeekStartSet = new Set(slidingWindowResult.evaluatedWeekStarts);

	// Get the weeks in the display window
	const windowWeeks = weeks.filter((w) =>
		windowWeekStartSet.has(w.weekStart.getTime()),
	);

	// Annotate weeks
	const annotated: AnnotatedWeek[] = windowWeeks.map((w) => {
		const isBest = bestWeekStartSet.has(w.weekStart.getTime());
		return {
			weekStart: w.weekStart,
			officeDays: w.officeDays,
			oofCount: w.oofCount,
			holidayCount: w.holidayCount,
			sickCount: w.sickCount,
			isBest,
			isIgnored: !isBest,
			isCompliant: w.officeDays >= policy.minOfficeDaysPerWeek,
		};
	});

	// Stats over best weeks
	const bestAnnotated = annotated.filter((w) => w.isBest);
	const bestCount = bestAnnotated.length;
	const totalOfficeDays = bestAnnotated.reduce(
		(sum, w) => sum + w.officeDays,
		0,
	);
	const averageOfficeDays = bestCount > 0 ? totalOfficeDays / bestCount : 0;

	// goodWeeks = weeks with >= REQUIRED_OFFICE_DAYS in all window weeks
	const goodWeeksInWindow = annotated.filter((w) => w.isCompliant).length;
	// bufferWeeks = droppable slots minus slots used by non-compliant weeks
	const droppableSlots = Math.max(
		0,
		annotated.length - settings.bestWeeksCount,
	);
	const droppedNonCompliant = annotated.filter(
		(w) => w.isIgnored && !w.isCompliant,
	).length;
	const bufferWeeks = Math.max(0, droppableSlots - droppedNonCompliant);

	// Find the earliest future week safe for full WFH using evaluated-set algorithm.
	// Gates on overall compliance (slidingWindowResult.isValid checks ALL windows).
	const nextWfhWeek = findNextSafeWfhWeek(
		weeks,
		policy,
		slidingWindowResult.isValid,
	);

	// Day counts from display window
	let totalWfhDays = 0;
	let totalHolidayDays = 0;
	let totalSickDays = 0;
	for (const w of windowWeeks) {
		totalWfhDays += w.oofCount;
		totalHolidayDays += w.holidayCount;
		totalSickDays += w.sickCount;
	}
	const totalWeekdays = windowWeeks.length * 5;
	const totalWorkingDays =
		totalWeekdays - totalWfhDays - totalHolidayDays - totalSickDays;

	// Current week
	const now = new Date();
	const dayOfWeek = now.getDay();
	const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
	const currentWeekStart = new Date(now);
	currentWeekStart.setDate(now.getDate() + mondayOffset);
	currentWeekStart.setHours(0, 0, 0, 0);
	const currentWeekEnd = new Date(currentWeekStart);
	currentWeekEnd.setDate(currentWeekStart.getDate() + 6);

	const currentWeek = {
		weekStart: currentWeekStart,
		weekEnd: currentWeekEnd,
		officeDays: currentWeekInfo?.officeDays ?? 0,
	};

	// Overall compliance from sliding window
	const isCompliant = slidingWindowResult.isValid;
	const compliancePercentage =
		bestCount > 0
			? (bestAnnotated.filter((w) => w.isCompliant).length / bestCount) * 100
			: 0;
	const message = slidingWindowResult.message;

	return {
		windowWeeks: annotated,
		bestWeekCount: bestCount,
		averageOfficeDays,
		goodWeeks: goodWeeksInWindow,
		bufferWeeks,
		nextWfhWeek,
		currentWeek,
		totalWfhDays,
		totalHolidayDays,
		totalSickDays,
		totalWorkingDays,
		isCompliant,
		compliancePercentage,
		message,
		slidingWindowResult,
		roundPercentage: policy.roundPercentage ?? true,
		totalWeeks: policy.rollingPeriodWeeks,
		requiredDays: policy.minOfficeDaysPerWeek,
	};
}

// ─── Singleton Initialization ───────────────────────────────────────

let initialized = false;
let invocationId = 0;

async function runComputation(
	calendarManager: CalendarInstance,
): Promise<void> {
	const myId = ++invocationId;
	setComputingState(true);

	const calendarData = await readCalendarData(calendarManager);

	// Stale check: if a newer invocation started, bail
	if (myId !== invocationId) return;

	const data = computeComplianceData(calendarData.weeks);
	latestResult = data;

	setComputingState(false);

	window.dispatchEvent(
		new CustomEvent<ComplianceEventData>(COMPLIANCE_EVENT, { detail: data }),
	);
}

function initAutoCompliance(): void {
	if (initialized) return;

	const calendarManager = (
		window as unknown as { __datepainterInstance?: CalendarInstance }
	).__datepainterInstance;
	if (!calendarManager) {
		setTimeout(initAutoCompliance, 50);
		return;
	}

	initialized = true;

	// Run immediately on init (no debounce)
	runComputation(calendarManager);

	// Subscribe with debounce
	let debounceTimer: ReturnType<typeof setTimeout> | null = null;

	calendarManager.onStateChange(() => {
		setComputingState(true);

		if (debounceTimer) clearTimeout(debounceTimer);
		debounceTimer = setTimeout(() => {
			runComputation(calendarManager);
		}, 1500);
	});

	// Re-compute when settings change (shorter debounce for responsiveness)
	document.addEventListener("settings-changed", () => {
		setComputingState(true);

		if (debounceTimer) clearTimeout(debounceTimer);
		debounceTimer = setTimeout(() => {
			runComputation(calendarManager);
		}, 300);
	});
}

// Auto-initialize when module is imported
if (document.readyState === "loading") {
	document.addEventListener("DOMContentLoaded", initAutoCompliance);
} else {
	initAutoCompliance();
}
