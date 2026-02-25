import type {
	CalendarInstance,
	DateRangeOptions,
	DateState,
	DateString,
	MarkedDateRange,
} from "datepainter";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { validateExportData } from "../schema";

// Mock settings-reader so tests don't depend on actual localStorage reads through it
vi.mock("../../settings-reader", async () => {
	const actual = await vi.importActual<typeof import("../../settings-reader")>(
		"../../settings-reader",
	);
	return {
		...actual,
		readSettings: vi.fn(() => ({
			debug: false,
			saveData: true,
			minOfficeDays: 3,
			rollingWindowWeeks: 12,
			bestWeeksCount: 8,
			sickDaysPenalize: true,
			holidayPenalize: true,
			startingWeek: null,
			defaultPattern: null,
			holidays: { countryCode: null, holidaysAsOOF: true, companyName: null },
		})),
		writeSettings: vi.fn(),
		SETTINGS_KEY: actual.SETTINGS_KEY,
	};
});

import { readSettings, writeSettings } from "../../settings-reader";
import { buildExportJSON, importJSON } from "../json-io";

function mockCalendar(dates: Record<string, string[]>): CalendarInstance {
	const dateMap = new Map<DateString, DateState>();
	const rangesByState = new Map<DateState, MarkedDateRange[]>();

	for (const [state, ds] of Object.entries(dates)) {
		for (const d of ds) dateMap.set(d as DateString, state as DateState);

		const sorted = [...ds].sort();
		const stateRanges: MarkedDateRange[] = [];
		let i = 0;
		while (i < sorted.length) {
			const start = new Date(`${sorted[i]}T12:00:00`);
			let end = start;
			while (
				i + 1 < sorted.length &&
				new Date(`${sorted[i + 1]}T12:00:00`).getTime() - end.getTime() ===
					86400000
			) {
				i++;
				end = new Date(`${sorted[i]}T12:00:00`);
			}
			stateRanges.push({ start, end, state: state as DateState });
			i++;
		}
		rangesByState.set(state as DateState, stateRanges);
	}

	return {
		getAllDates: vi.fn(() => dateMap),
		getDatesByState: vi.fn((s: DateState) => (dates[s] ?? []) as DateString[]),
		getDateRanges: vi.fn((opts?: DateRangeOptions) =>
			opts?.state
				? (rangesByState.get(opts.state) ?? [])
				: [...rangesByState.values()].flat(),
		),
		clearAll: vi.fn(),
		setDates: vi.fn(),
		clearDates: vi.fn(),
		getSelectedDates: vi.fn(() => []),
		getState: vi.fn(() => null),
		getCurrentMonth: vi.fn(() => new Date()),
		toggleDate: vi.fn(),
		setPaintingState: vi.fn(),
		updateConfig: vi.fn(),
		onStateChange: vi.fn(() => () => {}),
		navigateToDate: vi.fn(),
		nextMonth: vi.fn(),
		prevMonth: vi.fn(),
		destroy: vi.fn(),
	} as CalendarInstance;
}

describe("exportJSON", () => {
	beforeEach(() => {
		localStorage.clear();
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("returns valid JSON matching schema", () => {
		const cal = mockCalendar({
			oof: ["2026-01-05", "2026-01-06", "2026-01-07"],
			holiday: ["2026-02-17"],
			sick: [],
		});

		const json = buildExportJSON(cal);
		const parsed = JSON.parse(json);
		const result = validateExportData(parsed);
		expect(result.success).toBe(true);
		expect(parsed.categories.oof.dates).toHaveLength(3);
		expect(parsed.categories.holiday.dates).toHaveLength(1);
	});

	it("includes sorted dates per category", () => {
		const cal = mockCalendar({
			oof: ["2026-03-15", "2026-03-01", "2026-03-10"],
			holiday: [],
			sick: [],
		});

		const parsed = JSON.parse(buildExportJSON(cal));
		expect(parsed.categories.oof.dates).toEqual([
			"2026-03-01",
			"2026-03-10",
			"2026-03-15",
		]);
	});

	it("includes settings from readSettings()", () => {
		vi.mocked(readSettings).mockReturnValue({
			debug: false,
			saveData: true,
			minOfficeDays: 3,
			rollingWindowWeeks: 16,
			bestWeeksCount: 10,
			sickDaysPenalize: true,
			holidayPenalize: true,
			startingWeek: null,
			defaultPattern: null,
			roundPercentage: true,
			holidays: { countryCode: null, holidaysAsOOF: true, companyName: null },
		});

		const cal = mockCalendar({ oof: [], holiday: [], sick: [] });
		const parsed = JSON.parse(buildExportJSON(cal));
		expect(parsed.settings.rollingWindowWeeks).toBe(16);
	});

	it("includes ranges computed from dates", () => {
		const cal = mockCalendar({
			oof: ["2026-01-05", "2026-01-06", "2026-01-07", "2026-01-20"],
			holiday: [],
			sick: [],
		});

		const parsed = JSON.parse(buildExportJSON(cal));
		expect(parsed.categories.oof.ranges).toEqual([
			{ start: "2026-01-05", end: "2026-01-07" },
			{ start: "2026-01-20", end: "2026-01-20" },
		]);
	});

	it("omits debug and saveData from settings", () => {
		const cal = mockCalendar({ oof: [], holiday: [], sick: [] });
		const parsed = JSON.parse(buildExportJSON(cal));
		expect(parsed.settings).not.toHaveProperty("debug");
		expect(parsed.settings).not.toHaveProperty("saveData");
	});
});

describe("importJSON", () => {
	beforeEach(() => {
		localStorage.clear();
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	function validExportJSON(overrides?: Record<string, unknown>): string {
		return JSON.stringify({
			version: 1,
			exportDate: "2026-02-13T00:00:00.000Z",
			categories: {
				oof: {
					label: "Work From Home",
					color: "#ef4444",
					emoji: "🏠",
					dates: ["2026-01-05", "2026-01-06"],
				},
				holiday: {
					label: "Holiday",
					color: "#f59e0b",
					emoji: "☀️",
					dates: ["2026-02-17"],
				},
				sick: {
					label: "Sick Day",
					color: "#1890ff",
					emoji: "💊",
					dates: ["2026-03-01", "2026-03-02", "2026-03-03"],
				},
			},
			...overrides,
		});
	}

	it("succeeds with valid data", () => {
		const cal = mockCalendar({ oof: [], holiday: [], sick: [] });
		const result = importJSON(validExportJSON(), cal);
		expect(result.success).toBe(true);
		expect(cal.clearAll).toHaveBeenCalled();
	});

	it("restores all three states", () => {
		const cal = mockCalendar({ oof: [], holiday: [], sick: [] });
		importJSON(validExportJSON(), cal);
		expect(cal.setDates).toHaveBeenCalledTimes(3);
	});

	it("applies settings and dispatches event", () => {
		const cal = mockCalendar({ oof: [], holiday: [], sick: [] });
		const spy = vi.fn();
		document.addEventListener("settings-changed", spy);

		importJSON(validExportJSON({ settings: { rollingWindowWeeks: 16 } }), cal);

		expect(writeSettings).toHaveBeenCalledWith({ rollingWindowWeeks: 16 });
		expect(spy).toHaveBeenCalled();
		document.removeEventListener("settings-changed", spy);
	});

	it("rejects invalid JSON string", () => {
		const cal = mockCalendar({ oof: [], holiday: [], sick: [] });
		const result = importJSON("{ broken", cal);
		expect(result.success).toBe(false);
		expect(result.error).toBe("Invalid JSON");
	});

	it("rejects wrong version", () => {
		const cal = mockCalendar({ oof: [], holiday: [], sick: [] });
		const result = importJSON(validExportJSON({ version: 2 }), cal);
		expect(result.success).toBe(false);
	});

	it("rejects missing categories", () => {
		const cal = mockCalendar({ oof: [], holiday: [], sick: [] });
		const result = importJSON(
			JSON.stringify({ version: 1, exportDate: "x" }),
			cal,
		);
		expect(result.success).toBe(false);
	});

	it("rejects invalid date format", () => {
		const cal = mockCalendar({ oof: [], holiday: [], sick: [] });
		const data = JSON.parse(validExportJSON());
		data.categories.oof.dates = ["01/05/2026"];
		const result = importJSON(JSON.stringify(data), cal);
		expect(result.success).toBe(false);
	});

	it("handles empty categories", () => {
		const cal = mockCalendar({ oof: [], holiday: [], sick: [] });
		const data = JSON.parse(validExportJSON());
		data.categories.oof.dates = [];
		data.categories.holiday.dates = [];
		data.categories.sick.dates = [];
		const result = importJSON(JSON.stringify(data), cal);
		expect(result.success).toBe(true);
		expect(cal.setDates).not.toHaveBeenCalled();
	});

	it("imports ranges-only (empty dates)", () => {
		const cal = mockCalendar({ oof: [], holiday: [], sick: [] });
		const data = JSON.parse(validExportJSON());
		data.categories.oof.dates = [];
		data.categories.oof.ranges = [{ start: "2026-01-05", end: "2026-01-08" }];
		data.categories.holiday.dates = [];
		data.categories.sick.dates = [];
		const result = importJSON(JSON.stringify(data), cal);
		expect(result.success).toBe(true);
		expect(cal.setDates).toHaveBeenCalledWith(
			["2026-01-05", "2026-01-06", "2026-01-07", "2026-01-08"],
			"oof",
		);
	});

	it("imports dates + ranges with overlap (deduplication)", () => {
		const cal = mockCalendar({ oof: [], holiday: [], sick: [] });
		const data = JSON.parse(validExportJSON());
		data.categories.oof.dates = ["2026-01-05", "2026-01-06", "2026-01-10"];
		data.categories.oof.ranges = [{ start: "2026-01-05", end: "2026-01-08" }];
		data.categories.holiday.dates = [];
		data.categories.sick.dates = [];
		const result = importJSON(JSON.stringify(data), cal);
		expect(result.success).toBe(true);
		expect(cal.setDates).toHaveBeenCalledWith(
			["2026-01-05", "2026-01-06", "2026-01-07", "2026-01-08", "2026-01-10"],
			"oof",
		);
	});

	it("round-trip: export then import restores state", () => {
		const dates = {
			oof: ["2026-01-05", "2026-01-06"],
			holiday: ["2026-02-17"],
			sick: ["2026-03-01"],
		};
		const srcCal = mockCalendar(dates);
		const json = buildExportJSON(srcCal);

		const dstCal = mockCalendar({ oof: [], holiday: [], sick: [] });
		const result = importJSON(json, dstCal);
		expect(result.success).toBe(true);

		expect(dstCal.setDates).toHaveBeenCalledWith(
			["2026-01-05", "2026-01-06"],
			"oof",
		);
		expect(dstCal.setDates).toHaveBeenCalledWith(["2026-02-17"], "holiday");
		expect(dstCal.setDates).toHaveBeenCalledWith(["2026-03-01"], "sick");
	});
});
