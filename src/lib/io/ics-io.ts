/**
 * ICS import/export for calendar state.
 * Uses ts-ics for generation and @ts-ics/schema-zod for validated parsing.
 */

import type { CalendarInstance, DateState, DateString } from "datepainter";
import { addDays, format } from "date-fns";
import type { IcsCalendar, IcsEvent } from "ts-ics";
import { generateIcsCalendar } from "ts-ics";
import { parseIcsCalendar } from "@ts-ics/schema-zod";
import { STATE_DEFAULTS } from "../state-defaults";
import { downloadFile } from "./download";

/** Export calendar state as ICS and trigger download */
export function exportICS(calendar: CalendarInstance): void {
	const ics = buildExportICS(calendar);
	const timestamp = new Date().toISOString().slice(0, 10);
	downloadFile(ics, `rto-export-${timestamp}.ics`, "text/calendar");
}

/** Build the ICS string (also useful for testing) */
export function buildExportICS(calendar: CalendarInstance): string {
	const ranges = calendar.getDateRanges();
	const events: IcsEvent[] = ranges.map((range) => {
		const meta = STATE_DEFAULTS[range.state];
		const startStr = format(range.start, "yyyy-MM-dd");
		const endExclusive = addDays(range.end, 1);

		return {
			summary: meta?.label ?? range.state,
			uid: `rto-${range.state}-${startStr}@rto-calculator`,
			stamp: { date: new Date() },
			start: { date: range.start, type: "DATE" as const },
			end: { date: endExclusive, type: "DATE" as const },
			categories: [range.state],
		};
	});

	const cal: IcsCalendar = {
		version: "2.0",
		prodId: "-//RTO Calculator//EN",
		events,
	};

	return generateIcsCalendar(cal);
}

/** Resolve a state key from ICS event categories or summary */
function resolveState(event: IcsEvent): DateState {
	// Try CATEGORIES first (machine-readable)
	if (event.categories && event.categories.length > 0) {
		const cat = event.categories[0]?.toLowerCase();
		if (cat && cat in STATE_DEFAULTS) return cat as DateState;
	}

	// Fallback: match SUMMARY to known labels
	const summary = event.summary.toLowerCase();
	for (const [key, meta] of Object.entries(STATE_DEFAULTS)) {
		if (summary.includes(meta.label.toLowerCase())) return key as DateState;
	}

	// Default to oof
	return "oof";
}

/** Format a Date as YYYY-MM-DD using UTC components (avoids timezone day-shift) */
function formatUTCDate(d: Date): string {
	const y = d.getUTCFullYear();
	const m = String(d.getUTCMonth() + 1).padStart(2, "0");
	const day = String(d.getUTCDate()).padStart(2, "0");
	return `${y}-${m}-${day}`;
}

/** Expand a VEVENT date range into individual YYYY-MM-DD strings */
function expandEventDates(event: IcsEvent): string[] {
	const startMs = event.start.date.getTime();
	// DTEND is exclusive in ICS spec; subtract 1 day for the inclusive end
	const endMs = event.end
		? event.end.date.getTime() - 86_400_000
		: startMs;

	if (endMs < startMs) return [formatUTCDate(event.start.date)];

	const dates: string[] = [];
	for (let ms = startMs; ms <= endMs; ms += 86_400_000) {
		dates.push(formatUTCDate(new Date(ms)));
	}
	return dates;
}

/** Import ICS string into calendar. Returns result with optional error. */
export function importICS(
	data: string,
	calendar: CalendarInstance,
): { success: boolean; error?: string } {
	let parsed: IcsCalendar;
	try {
		parsed = parseIcsCalendar(data);
	} catch {
		return { success: false, error: "Invalid ICS data" };
	}

	const events = parsed.events ?? [];
	if (events.length === 0) {
		return { success: false, error: "No events found in ICS file" };
	}

	// Group dates by state
	const datesByState = new Map<DateState, string[]>();
	for (const event of events) {
		const state = resolveState(event);
		const dates = expandEventDates(event);
		const existing = datesByState.get(state) ?? [];
		datesByState.set(state, [...existing, ...dates]);
	}

	// Apply to calendar
	calendar.clearAll();
	for (const [state, dates] of datesByState) {
		if (dates.length > 0) {
			calendar.setDates(dates as DateString[], state);
		}
	}

	return { success: true };
}
