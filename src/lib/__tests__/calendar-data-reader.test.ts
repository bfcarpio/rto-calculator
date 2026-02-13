/**
 * Calendar Data Reader – Penalize Settings Tests
 *
 * Tests readCalendarData() with various combinations of
 * holidayPenalize and sickDaysPenalize settings to ensure
 * office-day and total-effective-day calculations are correct.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ─── Mocks ───────────────────────────────────────────────────────

vi.mock("../../utils/logger", () => ({
	logger: { debug: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

vi.mock("../dateUtils", () => ({
	getDateRange: vi.fn(),
}));

vi.mock("../holiday/CalendarHolidayIntegration", () => ({
	getHolidayDatesForValidation: vi.fn(),
}));

vi.mock("../validation/rto-core", () => ({
	getStartOfWeek: vi.fn((d: Date) => {
		// Return the Monday of the week containing d
		const day = d.getDay();
		const diff = day === 0 ? -6 : 1 - day;
		const monday = new Date(d);
		monday.setDate(d.getDate() + diff);
		monday.setHours(0, 0, 0, 0);
		return monday;
	}),
	isWeekday: vi.fn((d: Date) => {
		const day = d.getDay();
		return day >= 1 && day <= 5;
	}),
}));

import type { CalendarInstance } from "../../../packages/datepainter/src/types";
import { readCalendarData } from "../calendar-data-reader";
import { getDateRange } from "../dateUtils";
import { getHolidayDatesForValidation } from "../holiday/CalendarHolidayIntegration";

// ─── Helpers ─────────────────────────────────────────────────────

/** Create a Monday date for a given YYYY-MM-DD */
function monday(dateStr: string): Date {
	const d = new Date(`${dateStr}T00:00:00`);
	d.setHours(0, 0, 0, 0);
	return d;
}

/**
 * Build a mock CalendarInstance whose getAllDates() returns the given map.
 * dateMap keys are "YYYY-MM-DD" strings, values are "oof" | "holiday" | "sick".
 */
function mockCalendar(dateMap: Map<string, string>): CalendarInstance {
	return {
		getAllDates: vi.fn(() => dateMap),
	} as unknown as CalendarInstance;
}

/**
 * Set localStorage to simulate specific penalize settings.
 */
function setSettings(opts: {
	sickDaysPenalize?: boolean;
	holidayPenalize?: boolean;
}): void {
	const settings: Record<string, unknown> = {
		saveData: true,
	};
	if (opts.sickDaysPenalize !== undefined)
		settings.sickDaysPenalize = opts.sickDaysPenalize;
	if (opts.holidayPenalize !== undefined)
		settings.holidayPenalize = opts.holidayPenalize;
	localStorage.setItem("rto-calculator-settings", JSON.stringify(settings));
}

/**
 * Configure mocks for a single-week scenario starting on the given Monday.
 * The week range is Mon–Fri (5 weekdays).
 */
function setupSingleWeek(mondayDate: string): void {
	const start = monday(mondayDate);
	const end = new Date(start);
	end.setDate(start.getDate() + 4); // Friday

	vi.mocked(getDateRange).mockReturnValue({
		startDate: start,
		endDate: end,
	});
	vi.mocked(getHolidayDatesForValidation).mockResolvedValue(new Set<Date>());
}

// ─── Tests ───────────────────────────────────────────────────────

describe("readCalendarData – penalize settings", () => {
	beforeEach(() => {
		localStorage.clear();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	// --- Holiday penalize ON (default) ---

	it("default: holidays reduce officeDays (penalize ON)", async () => {
		setupSingleWeek("2025-06-02"); // Mon Jun 2
		// Mark Wed as holiday
		const dates = new Map<string, string>([["2025-06-04", "holiday"]]);
		const cal = mockCalendar(dates);

		const result = await readCalendarData(cal);
		const week = result.weeks[0]!;

		// 5 weekdays, 1 holiday → officeDays = 5 - 0 (oof) - 1 (holiday) = 4
		// totalDays = 5 (holiday penalizes, so not subtracted from effective)
		expect(week.holidayCount).toBe(1);
		expect(week.officeDays).toBe(4);
		expect(week.totalDays).toBe(5);
	});

	it("holidayPenalize=true: holidays reduce officeDays", async () => {
		setSettings({ holidayPenalize: true });
		setupSingleWeek("2025-06-02");
		const dates = new Map<string, string>([
			["2025-06-03", "holiday"],
			["2025-06-04", "holiday"],
		]);
		const cal = mockCalendar(dates);

		const result = await readCalendarData(cal);
		const week = result.weeks[0]!;

		// 2 holidays penalized → officeDays = 5 - 2 = 3
		expect(week.holidayCount).toBe(2);
		expect(week.officeDays).toBe(3);
		expect(week.totalDays).toBe(5);
		expect(week.isCompliant).toBe(true); // 3 >= 3
	});

	// --- Holiday penalize OFF ---

	it("holidayPenalize=false: holidays reduce totalEffectiveDays instead", async () => {
		setSettings({ holidayPenalize: false });
		setupSingleWeek("2025-06-02");
		const dates = new Map<string, string>([["2025-06-04", "holiday"]]);
		const cal = mockCalendar(dates);

		const result = await readCalendarData(cal);
		const week = result.weeks[0]!;

		// Holiday not penalized → officeDays = 5 - 0 (oof) = 5
		// totalEffectiveDays = 5 - 1 (holiday) = 4
		expect(week.holidayCount).toBe(1);
		expect(week.officeDays).toBe(5);
		expect(week.totalDays).toBe(4);
	});

	it("holidayPenalize=false: full week of holidays → compliant", async () => {
		setSettings({ holidayPenalize: false });
		setupSingleWeek("2025-06-02");
		const dates = new Map<string, string>([
			["2025-06-02", "holiday"],
			["2025-06-03", "holiday"],
			["2025-06-04", "holiday"],
			["2025-06-05", "holiday"],
			["2025-06-06", "holiday"],
		]);
		const cal = mockCalendar(dates);

		const result = await readCalendarData(cal);
		const week = result.weeks[0]!;

		// All 5 days are holidays, not penalized
		// officeDays = 5 - 0 (oof) = 5
		// totalEffectiveDays = 5 - 5 = 0
		expect(week.holidayCount).toBe(5);
		expect(week.officeDays).toBe(5);
		expect(week.totalDays).toBe(0);
		expect(week.isCompliant).toBe(true);
	});

	it("holidayPenalize=true: full week of holidays → non-compliant", async () => {
		setSettings({ holidayPenalize: true });
		setupSingleWeek("2025-06-02");
		const dates = new Map<string, string>([
			["2025-06-02", "holiday"],
			["2025-06-03", "holiday"],
			["2025-06-04", "holiday"],
			["2025-06-05", "holiday"],
			["2025-06-06", "holiday"],
		]);
		const cal = mockCalendar(dates);

		const result = await readCalendarData(cal);
		const week = result.weeks[0]!;

		// All 5 holidays penalized → officeDays = 5 - 5 = 0
		expect(week.officeDays).toBe(0);
		expect(week.totalDays).toBe(5);
		expect(week.isCompliant).toBe(false);
	});

	// --- Sick penalize interactions ---

	it("both penalize ON: holidays and sick days reduce officeDays", async () => {
		setSettings({ holidayPenalize: true, sickDaysPenalize: true });
		setupSingleWeek("2025-06-02");
		const dates = new Map<string, string>([
			["2025-06-02", "holiday"],
			["2025-06-03", "sick"],
			["2025-06-04", "oof"],
		]);
		const cal = mockCalendar(dates);

		const result = await readCalendarData(cal);
		const week = result.weeks[0]!;

		// officeDays = 5 - 1 (oof) - 1 (holiday) - 1 (sick) = 2
		// totalEffectiveDays = 5
		expect(week.oofCount).toBe(1);
		expect(week.holidayCount).toBe(1);
		expect(week.sickCount).toBe(1);
		expect(week.officeDays).toBe(2);
		expect(week.totalDays).toBe(5);
		expect(week.isCompliant).toBe(false);
	});

	it("both penalize OFF: holidays and sick days reduce totalEffectiveDays", async () => {
		setSettings({ holidayPenalize: false, sickDaysPenalize: false });
		setupSingleWeek("2025-06-02");
		const dates = new Map<string, string>([
			["2025-06-02", "holiday"],
			["2025-06-03", "sick"],
			["2025-06-04", "oof"],
		]);
		const cal = mockCalendar(dates);

		const result = await readCalendarData(cal);
		const week = result.weeks[0]!;

		// officeDays = 5 - 1 (oof) = 4
		// totalEffectiveDays = 5 - 1 (holiday) - 1 (sick) = 3
		expect(week.officeDays).toBe(4);
		expect(week.totalDays).toBe(3);
		expect(week.isCompliant).toBe(true);
	});

	it("holiday penalize OFF, sick penalize ON: mixed behavior", async () => {
		setSettings({ holidayPenalize: false, sickDaysPenalize: true });
		setupSingleWeek("2025-06-02");
		const dates = new Map<string, string>([
			["2025-06-02", "holiday"],
			["2025-06-03", "sick"],
			["2025-06-04", "oof"],
		]);
		const cal = mockCalendar(dates);

		const result = await readCalendarData(cal);
		const week = result.weeks[0]!;

		// officeDays = 5 - 1 (oof) - 1 (sick) = 3
		// totalEffectiveDays = 5 - 1 (holiday) = 4
		expect(week.officeDays).toBe(3);
		expect(week.totalDays).toBe(4);
		expect(week.isCompliant).toBe(true);
	});

	it("holiday penalize ON, sick penalize OFF: mixed behavior", async () => {
		setSettings({ holidayPenalize: true, sickDaysPenalize: false });
		setupSingleWeek("2025-06-02");
		const dates = new Map<string, string>([
			["2025-06-02", "holiday"],
			["2025-06-03", "sick"],
			["2025-06-04", "oof"],
		]);
		const cal = mockCalendar(dates);

		const result = await readCalendarData(cal);
		const week = result.weeks[0]!;

		// officeDays = 5 - 1 (oof) - 1 (holiday) = 3
		// totalEffectiveDays = 5 - 1 (sick) = 4
		expect(week.officeDays).toBe(3);
		expect(week.totalDays).toBe(4);
		expect(week.isCompliant).toBe(true);
	});

	// --- No settings in localStorage (defaults) ---

	it("no settings in localStorage: defaults to penalize both", async () => {
		// localStorage is already clear from beforeEach
		setupSingleWeek("2025-06-02");
		const dates = new Map<string, string>([
			["2025-06-02", "holiday"],
			["2025-06-03", "sick"],
		]);
		const cal = mockCalendar(dates);

		const result = await readCalendarData(cal);
		const week = result.weeks[0]!;

		// Default: both penalize → officeDays = 5 - 1 (holiday) - 1 (sick) = 3
		// totalEffectiveDays = 5
		expect(week.officeDays).toBe(3);
		expect(week.totalDays).toBe(5);
	});

	it("malformed localStorage: defaults to penalize both", async () => {
		localStorage.setItem("rto-calculator-settings", "not-valid-json");
		setupSingleWeek("2025-06-02");
		const dates = new Map<string, string>([
			["2025-06-02", "holiday"],
			["2025-06-03", "sick"],
		]);
		const cal = mockCalendar(dates);

		const result = await readCalendarData(cal);
		const week = result.weeks[0]!;

		// Malformed → defaults → penalize both
		expect(week.officeDays).toBe(3);
		expect(week.totalDays).toBe(5);
	});

	// --- Clean week (no marked days) ---

	it("clean week with no marks: 5 office days regardless of settings", async () => {
		setSettings({ holidayPenalize: false, sickDaysPenalize: false });
		setupSingleWeek("2025-06-02");
		const cal = mockCalendar(new Map());

		const result = await readCalendarData(cal);
		const week = result.weeks[0]!;

		expect(week.officeDays).toBe(5);
		expect(week.totalDays).toBe(5);
		expect(week.isCompliant).toBe(true);
	});

	// --- Compliance boundary ---

	it("holidayPenalize=true with 2 holidays + 1 oof → non-compliant (2 < 3)", async () => {
		setSettings({ holidayPenalize: true });
		setupSingleWeek("2025-06-02");
		const dates = new Map<string, string>([
			["2025-06-02", "holiday"],
			["2025-06-03", "holiday"],
			["2025-06-04", "oof"],
		]);
		const cal = mockCalendar(dates);

		const result = await readCalendarData(cal);
		const week = result.weeks[0]!;

		// officeDays = 5 - 1 (oof) - 2 (holiday) = 2
		expect(week.officeDays).toBe(2);
		expect(week.isCompliant).toBe(false);
	});

	it("holidayPenalize=false with 2 holidays + 1 oof → compliant (4 >= 3)", async () => {
		setSettings({ holidayPenalize: false });
		setupSingleWeek("2025-06-02");
		const dates = new Map<string, string>([
			["2025-06-02", "holiday"],
			["2025-06-03", "holiday"],
			["2025-06-04", "oof"],
		]);
		const cal = mockCalendar(dates);

		const result = await readCalendarData(cal);
		const week = result.weeks[0]!;

		// officeDays = 5 - 1 (oof) = 4
		// totalEffectiveDays = 5 - 2 (holiday) = 3
		expect(week.officeDays).toBe(4);
		expect(week.totalDays).toBe(3);
		expect(week.isCompliant).toBe(true);
	});
});

describe("readCalendarData – holiday dates from external source", () => {
	beforeEach(() => {
		localStorage.clear();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("external holiday dates are counted as holidays", async () => {
		setSettings({ holidayPenalize: true });
		const start = monday("2025-06-02");
		const end = new Date(start);
		end.setDate(start.getDate() + 4);

		vi.mocked(getDateRange).mockReturnValue({ startDate: start, endDate: end });

		// External holiday on Wednesday Jun 4
		const wed = new Date("2025-06-04T00:00:00");
		wed.setHours(0, 0, 0, 0);
		vi.mocked(getHolidayDatesForValidation).mockResolvedValue(
			new Set<Date>([wed]),
		);

		// No painted dates
		const cal = mockCalendar(new Map());

		const result = await readCalendarData(cal);
		const week = result.weeks[0]!;

		expect(week.holidayCount).toBe(1);
		// With penalize ON: officeDays = 5 - 1 = 4
		expect(week.officeDays).toBe(4);
	});

	it("external holiday + holidayPenalize=false → excused", async () => {
		setSettings({ holidayPenalize: false });
		const start = monday("2025-06-02");
		const end = new Date(start);
		end.setDate(start.getDate() + 4);

		vi.mocked(getDateRange).mockReturnValue({ startDate: start, endDate: end });

		const wed = new Date("2025-06-04T00:00:00");
		wed.setHours(0, 0, 0, 0);
		vi.mocked(getHolidayDatesForValidation).mockResolvedValue(
			new Set<Date>([wed]),
		);

		const cal = mockCalendar(new Map());

		const result = await readCalendarData(cal);
		const week = result.weeks[0]!;

		expect(week.holidayCount).toBe(1);
		// With penalize OFF: officeDays = 5, totalDays = 4
		expect(week.officeDays).toBe(5);
		expect(week.totalDays).toBe(4);
	});
});
