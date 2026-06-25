/**
 * Calendar Data Reader – Penalize Settings Tests
 *
 * Tests readCalendarData() with various combinations of
 * holidayPenalize and sickDaysPenalize settings to ensure
 * office-day and total-effective-day calculations are correct.
 */

import { afterEach, beforeEach, describe, expect, it, test, vi } from "vitest";

// ─── Mocks ───────────────────────────────────────────────────────

vi.mock("../../utils/logger", () => ({
	logger: { debug: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

vi.mock("../dateUtils", async (importOriginal) => {
	const actual = await importOriginal<typeof import("../dateUtils")>();
	return {
		...actual,
		getDateRange: vi.fn(),
	};
});

vi.mock("../holiday/CalendarHolidayIntegration", () => ({
	getHolidayDatesForValidation: vi.fn(),
}));

const mockSettings = {
	debug: false,
	saveData: true,
	minOfficeDays: 3,
	rollingWindowWeeks: 12,
	bestWeeksCount: 8,
	sickDaysPenalize: true,
	holidayPenalize: true,
	weekendBonus: false,
	startingWeek: null as string | null,
	defaultPattern: null as number[] | null,
	roundPercentage: true,
	holidays: { countryCode: null, holidaysAsOOF: true, companyName: null },
};

vi.mock("../stores/settingsStore", () => ({
	settingsStore: {
		get: vi.fn(() => ({ ...mockSettings })),
		set: vi.fn(),
		subscribe: vi.fn(() => vi.fn()),
	},
}));

import { mockCalendarFromMap } from "../../utils/astro/__tests__/testHelpers";
import { readCalendarData } from "../calendar-data-reader";
import { getDateRange } from "../dateUtils";
import { getHolidayDatesForValidation } from "../holiday/CalendarHolidayIntegration";
import { settingsStore } from "../stores/settingsStore";

// ─── Helpers ─────────────────────────────────────────────────────

/** Create a Sunday date for a given YYYY-MM-DD (used as week start) */
function sunday(dateStr: string): Date {
	const d = new Date(`${dateStr}T00:00:00`);
	d.setHours(0, 0, 0, 0);
	return d;
}

/**
 * Configure settingsStore to simulate specific penalize settings.
 */
function setSettings(opts: {
	sickDaysPenalize?: boolean;
	holidayPenalize?: boolean;
	weekendBonus?: boolean;
}): void {
	vi.mocked(settingsStore.get).mockReturnValue({
		...mockSettings,
		...opts,
	});
}

/**
 * Configure mocks for a single-week scenario starting on the given Sunday.
 * The week range is Mon–Fri (5 weekdays) within the Sun–Sat week.
 */
function setupSingleWeek(sundayDate: string): void {
	const start = sunday(sundayDate);
	const end = new Date(start);
	end.setDate(start.getDate() + 6); // Saturday

	vi.mocked(getDateRange).mockReturnValue({
		startDate: start,
		endDate: end,
	});
	vi.mocked(getHolidayDatesForValidation).mockResolvedValue(new Set<Date>());
}

// ─── Tests ───────────────────────────────────────────────────────

describe("readCalendarData – penalize settings", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		// Reset to default settings
		vi.mocked(settingsStore.get).mockReturnValue({ ...mockSettings });
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	// --- Holiday penalize ON (default) ---

	it("default: holidays reduce officeDays (penalize ON)", async () => {
		setupSingleWeek("2025-06-01"); // Mon Jun 2
		// Mark Wed as holiday
		const dates = new Map<string, string>([["2025-06-04", "holiday"]]);
		const cal = mockCalendarFromMap(dates);

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
		setupSingleWeek("2025-06-01");
		const dates = new Map<string, string>([
			["2025-06-03", "holiday"],
			["2025-06-04", "holiday"],
		]);
		const cal = mockCalendarFromMap(dates);

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
		setupSingleWeek("2025-06-01");
		const dates = new Map<string, string>([["2025-06-04", "holiday"]]);
		const cal = mockCalendarFromMap(dates);

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
		setupSingleWeek("2025-06-01");
		const dates = new Map<string, string>([
			["2025-06-02", "holiday"],
			["2025-06-03", "holiday"],
			["2025-06-04", "holiday"],
			["2025-06-05", "holiday"],
			["2025-06-06", "holiday"],
		]);
		const cal = mockCalendarFromMap(dates);

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
		setupSingleWeek("2025-06-01");
		const dates = new Map<string, string>([
			["2025-06-02", "holiday"],
			["2025-06-03", "holiday"],
			["2025-06-04", "holiday"],
			["2025-06-05", "holiday"],
			["2025-06-06", "holiday"],
		]);
		const cal = mockCalendarFromMap(dates);

		const result = await readCalendarData(cal);
		const week = result.weeks[0]!;

		// All 5 holidays penalized → officeDays = 5 - 5 = 0
		expect(week.officeDays).toBe(0);
		expect(week.totalDays).toBe(5);
		expect(week.isCompliant).toBe(false);
	});

	// --- Penalize setting combinations ---

	test.each([
		{
			name: "both penalize ON: holidays and sick days reduce officeDays",
			settings: { holidayPenalize: true, sickDaysPenalize: true },
			expected: {
				officeDays: 2,
				totalDays: 5,
				isCompliant: false,
				oofCount: 1,
				holidayCount: 1,
				sickCount: 1,
			},
		},
		{
			name: "both penalize OFF: holidays and sick days reduce totalEffectiveDays",
			settings: { holidayPenalize: false, sickDaysPenalize: false },
			expected: {
				officeDays: 4,
				totalDays: 3,
				isCompliant: true,
				oofCount: 1,
				holidayCount: 1,
				sickCount: 1,
			},
		},
		{
			name: "holiday penalize OFF, sick penalize ON: mixed behavior",
			settings: { holidayPenalize: false, sickDaysPenalize: true },
			expected: {
				officeDays: 3,
				totalDays: 4,
				isCompliant: true,
				oofCount: 1,
				holidayCount: 1,
				sickCount: 1,
			},
		},
		{
			name: "holiday penalize ON, sick penalize OFF: mixed behavior",
			settings: { holidayPenalize: true, sickDaysPenalize: false },
			expected: {
				officeDays: 3,
				totalDays: 4,
				isCompliant: true,
				oofCount: 1,
				holidayCount: 1,
				sickCount: 1,
			},
		},
	])("$name", async ({ settings, expected }) => {
		setSettings(settings);
		setupSingleWeek("2025-06-01");
		const dates = new Map<string, string>([
			["2025-06-02", "holiday"],
			["2025-06-03", "sick"],
			["2025-06-04", "oof"],
		]);
		const cal = mockCalendarFromMap(dates);

		const result = await readCalendarData(cal);
		const week = result.weeks[0]!;

		expect(week.oofCount).toBe(expected.oofCount);
		expect(week.holidayCount).toBe(expected.holidayCount);
		expect(week.sickCount).toBe(expected.sickCount);
		expect(week.officeDays).toBe(expected.officeDays);
		expect(week.totalDays).toBe(expected.totalDays);
		expect(week.isCompliant).toBe(expected.isCompliant);
	});

	// --- No settings in localStorage (defaults) ---

	it("no settings in localStorage: defaults to penalize both", async () => {
		// Default settings have both penalize flags = true
		vi.mocked(settingsStore.get).mockReturnValue({ ...mockSettings });
		setupSingleWeek("2025-06-01");
		const dates = new Map<string, string>([
			["2025-06-02", "holiday"],
			["2025-06-03", "sick"],
		]);
		const cal = mockCalendarFromMap(dates);

		const result = await readCalendarData(cal);
		const week = result.weeks[0]!;

		// Default: both penalize → officeDays = 5 - 1 (holiday) - 1 (sick) = 3
		// totalEffectiveDays = 5
		expect(week.officeDays).toBe(3);
		expect(week.totalDays).toBe(5);
	});

	it("malformed localStorage: defaults to penalize both", async () => {
		// Even with no localStorage data, default settings have both flags = true
		vi.mocked(settingsStore.get).mockReturnValue({ ...mockSettings });
		setupSingleWeek("2025-06-01");
		const dates = new Map<string, string>([
			["2025-06-02", "holiday"],
			["2025-06-03", "sick"],
		]);
		const cal = mockCalendarFromMap(dates);

		const result = await readCalendarData(cal);
		const week = result.weeks[0]!;

		// Malformed → defaults → penalize both
		expect(week.officeDays).toBe(3);
		expect(week.totalDays).toBe(5);
	});

	// --- Clean week (no marked days) ---

	it("clean week with no marks: 5 office days regardless of settings", async () => {
		setSettings({ holidayPenalize: false, sickDaysPenalize: false });
		setupSingleWeek("2025-06-01");
		const cal = mockCalendarFromMap(new Map());

		const result = await readCalendarData(cal);
		const week = result.weeks[0]!;

		expect(week.officeDays).toBe(5);
		expect(week.totalDays).toBe(5);
		expect(week.isCompliant).toBe(true);
	});

	// --- Compliance boundary ---

	it("holidayPenalize=true with 2 holidays + 1 oof → non-compliant (2 < 3)", async () => {
		setSettings({ holidayPenalize: true });
		setupSingleWeek("2025-06-01");
		const dates = new Map<string, string>([
			["2025-06-02", "holiday"],
			["2025-06-03", "holiday"],
			["2025-06-04", "oof"],
		]);
		const cal = mockCalendarFromMap(dates);

		const result = await readCalendarData(cal);
		const week = result.weeks[0]!;

		// officeDays = 5 - 1 (oof) - 2 (holiday) = 2
		expect(week.officeDays).toBe(2);
		expect(week.isCompliant).toBe(false);
	});

	it("holidayPenalize=false with 2 holidays + 1 oof → compliant (4 >= 3)", async () => {
		setSettings({ holidayPenalize: false });
		setupSingleWeek("2025-06-01");
		const dates = new Map<string, string>([
			["2025-06-02", "holiday"],
			["2025-06-03", "holiday"],
			["2025-06-04", "oof"],
		]);
		const cal = mockCalendarFromMap(dates);

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
		vi.clearAllMocks();
		vi.mocked(settingsStore.get).mockReturnValue({ ...mockSettings });
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("external holiday dates are counted as holidays", async () => {
		setSettings({ holidayPenalize: true });
		const start = sunday("2025-06-01");
		const end = new Date(start);
		end.setDate(start.getDate() + 6); // Saturday

		vi.mocked(getDateRange).mockReturnValue({ startDate: start, endDate: end });

		// External holiday on Wednesday Jun 4
		const wed = new Date("2025-06-04T00:00:00");
		wed.setHours(0, 0, 0, 0);
		vi.mocked(getHolidayDatesForValidation).mockResolvedValue(
			new Set<Date>([wed]),
		);

		// No painted dates
		const cal = mockCalendarFromMap(new Map());

		const result = await readCalendarData(cal);
		const week = result.weeks[0]!;

		expect(week.holidayCount).toBe(1);
		// With penalize ON: officeDays = 5 - 1 = 4
		expect(week.officeDays).toBe(4);
	});

	it("external holiday + holidayPenalize=false → excused", async () => {
		setSettings({ holidayPenalize: false });
		const start = sunday("2025-06-01");
		const end = new Date(start);
		end.setDate(start.getDate() + 6); // Saturday

		vi.mocked(getDateRange).mockReturnValue({ startDate: start, endDate: end });

		const wed = new Date("2025-06-04T00:00:00");
		wed.setHours(0, 0, 0, 0);
		vi.mocked(getHolidayDatesForValidation).mockResolvedValue(
			new Set<Date>([wed]),
		);

		const cal = mockCalendarFromMap(new Map());

		const result = await readCalendarData(cal);
		const week = result.weeks[0]!;

		expect(week.holidayCount).toBe(1);
		// With penalize OFF: officeDays = 5, totalDays = 4
		expect(week.officeDays).toBe(5);
		expect(week.totalDays).toBe(4);
	});
});

describe("readCalendarData – weekend bonus", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(settingsStore.get).mockReturnValue({ ...mockSettings });
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("weekendBonus=false: weekend work has no effect on officeDays", async () => {
		setSettings({ weekendBonus: false });
		setupSingleWeek("2025-06-01"); // Sun Jun 1 → Sat Jun 7
		// Saturday Jun 7 marked as some work state (not OOF)
		const dates = new Map<string, string>([["2025-06-07", "work"]]);
		const cal = mockCalendarFromMap(dates);

		const result = await readCalendarData(cal);
		const week = result.weeks[0]!;

		// Weekend work ignored: officeDays = 5 (clean weekday week)
		expect(week.officeDays).toBe(5);
		expect(week.totalDays).toBe(5);
	});

	it("weekendBonus=true: Saturday work adds to officeDays", async () => {
		setSettings({ weekendBonus: true });
		setupSingleWeek("2025-06-01"); // Sun Jun 1 → Sat Jun 7
		// Mon-Wed OOF (3 days), Saturday marked as work
		const dates = new Map<string, string>([
			["2025-06-02", "oof"],
			["2025-06-03", "oof"],
			["2025-06-04", "oof"],
			["2025-06-07", "work"],
		]);
		const cal = mockCalendarFromMap(dates);

		const result = await readCalendarData(cal);
		const week = result.weeks[0]!;

		// 5 weekdays - 3 OOF = 2, + 1 weekend bonus = 3
		expect(week.officeDays).toBe(3);
		// Denominator unchanged
		expect(week.totalDays).toBe(5);
	});

	it("weekendBonus=true: totalDays never changes from weekend work", async () => {
		setSettings({ weekendBonus: true });
		setupSingleWeek("2025-06-01");
		// Both Sun (Jun 1) and Sat (Jun 7) marked as work
		const dates = new Map<string, string>([
			["2025-06-01", "work"],
			["2025-06-07", "work"],
		]);
		const cal = mockCalendarFromMap(dates);

		const result = await readCalendarData(cal);
		const week = result.weeks[0]!;

		// officeDays = 5 + 2 weekend bonus = 7
		expect(week.officeDays).toBe(7);
		// Denominator stays 5
		expect(week.totalDays).toBe(5);
	});

	it("weekendBonus=true: both Sat and Sun marked as office", async () => {
		setSettings({ weekendBonus: true });
		setupSingleWeek("2025-06-01");
		// Mon-Thu OOF, Sun (Jun 1) + Sat (Jun 7) work
		const dates = new Map<string, string>([
			["2025-06-02", "oof"],
			["2025-06-03", "oof"],
			["2025-06-04", "oof"],
			["2025-06-05", "oof"],
			["2025-06-01", "work"],
			["2025-06-07", "work"],
		]);
		const cal = mockCalendarFromMap(dates);

		const result = await readCalendarData(cal);
		const week = result.weeks[0]!;

		// 5 - 4 OOF = 1, + 2 weekend = 3
		expect(week.officeDays).toBe(3);
		expect(week.totalDays).toBe(5);
		expect(week.isCompliant).toBe(true); // 3 >= 3
	});

	it("weekendBonus=true: weekend OOF does NOT count as bonus", async () => {
		setSettings({ weekendBonus: true });
		setupSingleWeek("2025-06-01");
		// Saturday marked as OOF (out-of-office) — should not count
		// Sunday marked as work — should count
		const dates = new Map<string, string>([
			["2025-06-07", "oof"],
			["2025-06-01", "work"],
		]);
		const cal = mockCalendarFromMap(dates);

		const result = await readCalendarData(cal);
		const week = result.weeks[0]!;

		// Only Sunday work counts: 5 + 1 = 6
		expect(week.officeDays).toBe(6);
		expect(week.totalDays).toBe(5);
	});

	it("weekendBonus=true: unmarked weekend days do NOT count", async () => {
		setSettings({ weekendBonus: true });
		setupSingleWeek("2025-06-01");
		// No weekend dates painted at all
		const cal = mockCalendarFromMap(new Map());

		const result = await readCalendarData(cal);
		const week = result.weeks[0]!;

		expect(week.officeDays).toBe(5);
		expect(week.totalDays).toBe(5);
	});

	it("weekendBonus=true: stacks with holiday penalize settings", async () => {
		setSettings({ weekendBonus: true, holidayPenalize: true });
		setupSingleWeek("2025-06-01");
		// 1 holiday (Wed), 1 OOF (Mon), Saturday work
		const dates = new Map<string, string>([
			["2025-06-02", "oof"],
			["2025-06-04", "holiday"],
			["2025-06-07", "work"],
		]);
		const cal = mockCalendarFromMap(dates);

		const result = await readCalendarData(cal);
		const week = result.weeks[0]!;

		// 5 - 1 (oof) - 1 (holiday) = 3, + 1 weekend = 4
		expect(week.officeDays).toBe(4);
		expect(week.totalDays).toBe(5);
		expect(week.isCompliant).toBe(true);
	});

	it("weekendBonus=true: stacks with sick day penalize", async () => {
		setSettings({ weekendBonus: true, sickDaysPenalize: true });
		setupSingleWeek("2025-06-01");
		// 1 sick (Tue), 1 OOF (Thu), Saturday work
		const dates = new Map<string, string>([
			["2025-06-03", "sick"],
			["2025-06-05", "oof"],
			["2025-06-07", "work"],
		]);
		const cal = mockCalendarFromMap(dates);

		const result = await readCalendarData(cal);
		const week = result.weeks[0]!;

		// 5 - 1 (oof) - 1 (sick) = 3, + 1 weekend = 4
		expect(week.officeDays).toBe(4);
		expect(week.totalDays).toBe(5);
	});

	it("weekendBonus example from spec: 3 weekdays + Saturday = 4/5", async () => {
		setSettings({ weekendBonus: true });
		setupSingleWeek("2025-06-01");
		// Mon-Wed office (no marks), Thu-Fri OOF, Saturday work
		const dates = new Map<string, string>([
			["2025-06-05", "oof"],
			["2025-06-06", "oof"],
			["2025-06-07", "work"],
		]);
		const cal = mockCalendarFromMap(dates);

		const result = await readCalendarData(cal);
		const week = result.weeks[0]!;

		// 5 - 2 (oof) = 3, + 1 weekend = 4
		// 4/5 = 80%
		expect(week.officeDays).toBe(4);
		expect(week.totalDays).toBe(5);
		expect(week.isCompliant).toBe(true);
	});
});
