/**
 * JSON import/export for calendar state.
 * Exports all marked dates + settings; imports with zod validation.
 */

import type { CalendarInstance, DateState } from "datepainter";
import { type AppSettings, readSettings, writeSettings } from "../settings-reader";
import { STATE_DEFAULTS } from "../state-defaults";
import { downloadFile } from "./download";
import { type ExportData, validateExportData } from "./schema";

/** Export calendar state as JSON and trigger download */
export function exportJSON(calendar: CalendarInstance): void {
	const json = buildExportJSON(calendar);
	const timestamp = new Date().toISOString().slice(0, 10);
	downloadFile(json, `rto-export-${timestamp}.json`, "application/json");
}

/** Build the export JSON string (also useful for testing) */
export function buildExportJSON(calendar: CalendarInstance): string {
	const data = buildExportData(calendar);
	return JSON.stringify(data, null, 2);
}

function buildExportData(calendar: CalendarInstance): ExportData {
	const settings = readSettings();
	// Omit internal-only fields
	const { debug: _debug, saveData: _saveData, ...exportableSettings } = settings;

	const categories: ExportData["categories"] = {
		oof: buildCategory("oof", calendar),
		holiday: buildCategory("holiday", calendar),
		sick: buildCategory("sick", calendar),
	};

	return {
		version: 1,
		exportDate: new Date().toISOString(),
		categories,
		settings: exportableSettings,
	};
}

function buildCategory(
	state: DateState,
	calendar: CalendarInstance,
): ExportData["categories"]["oof"] {
	const meta = STATE_DEFAULTS[state]!;
	const dates = calendar.getDatesByState(state).slice().sort();
	return {
		label: meta.label,
		color: meta.bgColor,
		emoji: meta.emoji,
		dates,
	};
}

/** Import JSON string into calendar. Returns result with optional error. */
export function importJSON(
	data: string,
	calendar: CalendarInstance,
): { success: boolean; error?: string } {
	let parsed: Record<string, unknown>;
	try {
		parsed = JSON.parse(data);
	} catch {
		return { success: false, error: "Invalid JSON" };
	}

	const validation = validateExportData(parsed);
	if (!validation.success || !validation.data) {
		return { success: false, error: validation.error ?? "Validation failed" };
	}

	const exportData = validation.data;

	// Apply dates
	calendar.clearAll();
	for (const [state, category] of Object.entries(exportData.categories)) {
		if (category.dates.length > 0) {
			calendar.setDates(
				category.dates as `${number}-${number}-${number}`[],
				state as DateState,
			);
		}
	}

	// Apply settings if present
	if (exportData.settings) {
		writeSettings(exportData.settings as Partial<AppSettings>);
		document.dispatchEvent(
			new CustomEvent("settings-changed", { bubbles: true }),
		);
	}

	return { success: true };
}
