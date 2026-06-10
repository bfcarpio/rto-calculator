/**
 * Window Evaluation Tests
 *
 * Tests for computeWindowEvaluation — the shared pipeline that reads calendar
 * data, applies the startingWeek filter, and evaluates all sliding windows.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CalendarInstance } from "../../../../packages/datepainter/src/types";
import type { WeekInfo } from "../../calendar-data-reader";
import type { WindowSummary } from "../all-windows";
import { DEFAULT_RTO_POLICY, type RTOPolicyConfig } from "../rto-core";

// ─── Mocks ───────────────────────────────────────────────────────

vi.mock("../../calendar-data-reader", () => ({
	readCalendarData: vi.fn(),
	convertWeeksToCompliance: vi.fn((weeks: WeekInfo[]) =>
		weeks.map((w, i) => ({
			weekNumber: i + 1,
			weekStart: w.weekStart,
			officeDays: w.officeDays,
			totalDays: 5,
			oofDays: 5 - w.officeDays,
			wfhDays: 5 - w.officeDays,
			isCompliant: w.isCompliant,
			status: w.isCompliant ? ("compliant" as const) : ("violation" as const),
		})),
	),
}));

vi.mock("../../settings-reader", () => ({
	readSettings: vi.fn(),
	buildPolicyFromSettings: vi.fn(),
}));

vi.mock("../all-windows", () => ({
	evaluateAllWindows: vi.fn(),
}));

// ─── Helpers ──────────────────────────────────────────────────────

function makeWeekInfo(
	weekStart: Date,
	officeDays: number,
	overrides: Partial<WeekInfo> = {},
): WeekInfo {
	return {
		weekStart,
		weekNumber: 1,
		days: [],
		oofCount: 5 - officeDays,
		holidayCount: 0,
		sickCount: 0,
		officeDays,
		totalDays: 5,
		oofDays: 5 - officeDays,
		isCompliant: officeDays >= DEFAULT_RTO_POLICY.minOfficeDaysPerWeek,
		isUnderEvaluation: false,
		status:
			officeDays >= DEFAULT_RTO_POLICY.minOfficeDaysPerWeek
				? "compliant"
				: "invalid",
		...overrides,
	};
}

function makeWindowSummary(
	windowIndex: number,
	isValid: boolean,
): WindowSummary {
	return {
		windowIndex,
		windowStart: new Date(2025, 0, 6 + windowIndex * 7),
		windowEnd: new Date(2025, 0, 12 + windowIndex * 7),
		isValid,
		averageOfficeDays: isValid ? 3 : 1,
		weekDetails: [],
	};
}

const MOCK_CALENDAR_MANAGER = {} as CalendarInstance;
const MONDAY = new Date(2025, 0, 6); // Jan 6, 2025

// ─── Tests ────────────────────────────────────────────────────────

describe("computeWindowEvaluation", () => {
	let readCalendarData: ReturnType<typeof vi.fn>;
	let readSettings: ReturnType<typeof vi.fn>;
	let buildPolicyFromSettings: ReturnType<typeof vi.fn>;
	let evaluateAllWindows: ReturnType<typeof vi.fn>;

	beforeEach(async () => {
		vi.clearAllMocks();

		const calendarMod = await import("../../calendar-data-reader");
		readCalendarData = calendarMod.readCalendarData as ReturnType<typeof vi.fn>;

		const settingsMod = await import("../../settings-reader");
		readSettings = settingsMod.readSettings as ReturnType<typeof vi.fn>;
		buildPolicyFromSettings = settingsMod.buildPolicyFromSettings as ReturnType<
			typeof vi.fn
		>;

		const allWindowsMod = await import("../all-windows");
		evaluateAllWindows = allWindowsMod.evaluateAllWindows as ReturnType<
			typeof vi.fn
		>;

		buildPolicyFromSettings.mockReturnValue(DEFAULT_RTO_POLICY);
	});

	it("returns empty summaries when calendar has no weeks", async () => {
		readCalendarData.mockResolvedValue({ weeks: [] });
		readSettings.mockReturnValue({ startingWeek: null });
		evaluateAllWindows.mockReturnValue([]);

		const { computeWindowEvaluation } = await import("../window-evaluation");
		const result = await computeWindowEvaluation(MOCK_CALENDAR_MANAGER);

		expect(result.summaries).toEqual([]);
		expect(result.allWeeks).toEqual([]);
		expect(result.filteredWeeks).toEqual([]);
		expect(result.policy).toBe(DEFAULT_RTO_POLICY);
	});

	it("produces one summary for a single week", async () => {
		const weeks = [makeWeekInfo(MONDAY, 3)];
		readCalendarData.mockResolvedValue({ weeks });
		readSettings.mockReturnValue({ startingWeek: null });
		evaluateAllWindows.mockReturnValue([makeWindowSummary(0, true)]);

		const { computeWindowEvaluation } = await import("../window-evaluation");
		const result = await computeWindowEvaluation(MOCK_CALENDAR_MANAGER);

		expect(result.summaries).toHaveLength(1);
		expect(result.allWeeks).toHaveLength(1);
		expect(result.filteredWeeks).toHaveLength(1);
	});

	it("trims earlier weeks when startingWeek is set", async () => {
		const week1 = makeWeekInfo(new Date(2025, 0, 6), 3); // Jan 6
		const week2 = makeWeekInfo(new Date(2025, 0, 13), 4); // Jan 13
		const week3 = makeWeekInfo(new Date(2025, 0, 20), 2); // Jan 20
		const weeks = [week1, week2, week3];

		readCalendarData.mockResolvedValue({ weeks });
		readSettings.mockReturnValue({ startingWeek: "2025-01-13" });
		evaluateAllWindows.mockReturnValue([makeWindowSummary(0, true)]);

		const { computeWindowEvaluation } = await import("../window-evaluation");
		const result = await computeWindowEvaluation(MOCK_CALENDAR_MANAGER);

		expect(result.allWeeks).toHaveLength(3);
		expect(result.filteredWeeks).toHaveLength(2);
		expect(result.filteredWeeks[0]!.weekStart).toEqual(new Date(2025, 0, 13));
	});

	it("returns allWeeks unfiltered for stats aggregation", async () => {
		const week1 = makeWeekInfo(new Date(2025, 0, 6), 3);
		const week2 = makeWeekInfo(new Date(2025, 0, 13), 1);
		const week3 = makeWeekInfo(new Date(2025, 0, 20), 0);
		const weeks = [week1, week2, week3];

		readCalendarData.mockResolvedValue({ weeks });
		readSettings.mockReturnValue({ startingWeek: "2025-01-13" });
		evaluateAllWindows.mockReturnValue([]);

		const { computeWindowEvaluation } = await import("../window-evaluation");
		const result = await computeWindowEvaluation(MOCK_CALENDAR_MANAGER);

		// allWeeks preserves the original 3 weeks (needed for oofCount, holidayCount, etc.)
		expect(result.allWeeks).toHaveLength(3);
		expect(result.allWeeks[0]!.officeDays).toBe(3);
		expect(result.allWeeks[1]!.officeDays).toBe(1);
		expect(result.allWeeks[2]!.officeDays).toBe(0);

		// filteredWeeks starts from startingWeek
		expect(result.filteredWeeks).toHaveLength(2);
	});

	it("does not slice when startingWeek matches the first week", async () => {
		const weeks = [
			makeWeekInfo(new Date(2025, 0, 6), 3),
			makeWeekInfo(new Date(2025, 0, 13), 4),
		];

		readCalendarData.mockResolvedValue({ weeks });
		readSettings.mockReturnValue({ startingWeek: "2025-01-06" });
		evaluateAllWindows.mockReturnValue([makeWindowSummary(0, true)]);

		const { computeWindowEvaluation } = await import("../window-evaluation");
		const result = await computeWindowEvaluation(MOCK_CALENDAR_MANAGER);

		// startIdx === 0, so no slicing occurs
		expect(result.filteredWeeks).toHaveLength(2);
		expect(result.allWeeks).toHaveLength(2);
	});

	it("passes filtered weeks and policy to evaluateAllWindows", async () => {
		const weeks = [
			makeWeekInfo(new Date(2025, 0, 6), 3),
			makeWeekInfo(new Date(2025, 0, 13), 4),
		];
		const customPolicy: RTOPolicyConfig = {
			...DEFAULT_RTO_POLICY,
			rollingPeriodWeeks: 8,
		};

		readCalendarData.mockResolvedValue({ weeks });
		readSettings.mockReturnValue({ startingWeek: "2025-01-13" });
		buildPolicyFromSettings.mockReturnValue(customPolicy);
		evaluateAllWindows.mockReturnValue([]);

		const { computeWindowEvaluation } = await import("../window-evaluation");
		await computeWindowEvaluation(MOCK_CALENDAR_MANAGER);

		expect(evaluateAllWindows).toHaveBeenCalledOnce();
		const call = evaluateAllWindows.mock.calls[0];
		expect(call).toBeDefined();
		const [passedWeeks, passedPolicy] = call!;
		expect(passedPolicy).toBe(customPolicy);
		// Only 1 week after filter
		expect(passedWeeks).toHaveLength(1);
		expect(passedWeeks[0].weekStart).toEqual(new Date(2025, 0, 13));
	});
});
