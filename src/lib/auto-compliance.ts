/**
 * Auto-Compliance Module
 *
 * Singleton that subscribes to datepainter state changes, debounces computation,
 * reads calendar data, computes best-8-of-12 sliding window stats (excluding
 * the current incomplete week), and dispatches a `compliance-updated` CustomEvent.
 *
 * @module auto-compliance
 */

import type { CalendarInstance } from "../../packages/datepainter/src/types";
import { readCalendarData, type WeekInfo } from "./calendar-data-reader";
import {
	BEST_WEEKS_COUNT,
	REQUIRED_OFFICE_DAYS,
	ROLLING_WINDOW_WEEKS,
} from "./validation/constants";
import {
	orchestrateValidation,
	type OrchestratedValidationResult,
} from "./validation/ValidationOrchestrator";
import { DEFAULT_RTO_POLICY } from "./validation/rto-core";

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
	/** Weeks with >= REQUIRED_OFFICE_DAYS in window */
	goodWeeks: number;
	/** max(0, goodWeeks - BEST_WEEKS_COUNT) */
	bufferWeeks: number;

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

	/** Sliding-window validation result (orchestrator output) */
	validationResult: OrchestratedValidationResult;
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

// ─── Core Computation ───────────────────────────────────────────────

function isWeekComplete(weekStart: Date): boolean {
	const friday = new Date(weekStart);
	friday.setDate(friday.getDate() + 4);
	const today = new Date();
	today.setHours(23, 59, 59, 999);
	return friday <= today;
}

function computeComplianceData(
	allWeeks: WeekInfo[],
): Omit<ComplianceEventData, "validationResult"> {
	// Separate current incomplete week
	const completedWeeks = allWeeks.filter((w) => isWeekComplete(w.weekStart));
	const currentWeekInfo = allWeeks.find((w) => !isWeekComplete(w.weekStart));

	// Take up to ROLLING_WINDOW_WEEKS most recent completed weeks
	const windowWeeks = completedWeeks.slice(-ROLLING_WINDOW_WEEKS);

	// Sort by officeDays descending to pick best
	const sorted = [...windowWeeks].sort((a, b) => b.officeDays - a.officeDays);
	const bestCount = Math.min(BEST_WEEKS_COUNT, sorted.length);
	const bestWeeks = new Set(sorted.slice(0, bestCount));

	// Annotate weeks
	const annotated: AnnotatedWeek[] = windowWeeks.map((w) => ({
		weekStart: w.weekStart,
		officeDays: w.officeDays,
		oofCount: w.oofCount,
		holidayCount: w.holidayCount,
		sickCount: w.sickCount,
		isBest: bestWeeks.has(w),
		isIgnored: !bestWeeks.has(w),
		isCompliant: w.officeDays >= REQUIRED_OFFICE_DAYS,
	}));

	// Stats over best weeks only
	const bestAnnotated = annotated.filter((w) => w.isBest);
	const goodWeeks = bestAnnotated.filter((w) => w.isCompliant).length;
	const totalOfficeDays = bestAnnotated.reduce(
		(sum, w) => sum + w.officeDays,
		0,
	);
	const averageOfficeDays =
		bestAnnotated.length > 0 ? totalOfficeDays / bestAnnotated.length : 0;
	const bufferWeeks = Math.max(0, goodWeeks - BEST_WEEKS_COUNT);

	// Day counts from window (all weeks in window)
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

	// Overall compliance
	const isCompliant = goodWeeks >= BEST_WEEKS_COUNT;
	const compliancePercentage =
		bestAnnotated.length > 0
			? (goodWeeks / bestAnnotated.length) * 100
			: 0;
	const message = isCompliant
		? `Compliant: ${goodWeeks} of ${bestCount} weeks meet the ${REQUIRED_OFFICE_DAYS}-day target`
		: `Not compliant: only ${goodWeeks} of ${bestCount} weeks meet the ${REQUIRED_OFFICE_DAYS}-day target (need ${BEST_WEEKS_COUNT})`;

	return {
		windowWeeks: annotated,
		bestWeekCount: bestCount,
		averageOfficeDays,
		goodWeeks,
		bufferWeeks,
		currentWeek,
		totalWfhDays,
		totalHolidayDays,
		totalSickDays,
		totalWorkingDays,
		isCompliant,
		compliancePercentage,
		message,
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

	const complianceData = computeComplianceData(calendarData.weeks);
	const validationResult = orchestrateValidation(calendarData, {
		policy: DEFAULT_RTO_POLICY,
		DEBUG: false,
	});

	const data: ComplianceEventData = { ...complianceData, validationResult };
	latestResult = data;

	setComputingState(false);

	window.dispatchEvent(
		new CustomEvent<ComplianceEventData>(COMPLIANCE_EVENT, { detail: data }),
	);
}

function initAutoCompliance(): void {
	if (initialized) return;

	const calendarManager = (window as any).__datepainterInstance as
		| CalendarInstance
		| undefined;
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
}

// Auto-initialize when module is imported
if (document.readyState === "loading") {
	document.addEventListener("DOMContentLoaded", initAutoCompliance);
} else {
	initAutoCompliance();
}
