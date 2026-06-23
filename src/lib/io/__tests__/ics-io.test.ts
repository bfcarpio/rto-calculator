import { describe, expect, it, vi } from "vitest";
import { mockCalendarInstance } from "../../../utils/astro/__tests__/testHelpers";
import { buildExportICS, importICS } from "../ics-io";

// --- ICS Fixtures ---

const VALID_ICS = [
	"BEGIN:VCALENDAR",
	"VERSION:2.0",
	"PRODID:-//Test//EN",
	"BEGIN:VEVENT",
	"UID:test-1@test",
	"DTSTAMP:20260213T000000Z",
	"DTSTART;VALUE=DATE:20260105",
	"DTEND;VALUE=DATE:20260106",
	"SUMMARY:Work From Home",
	"CATEGORIES:oof",
	"END:VEVENT",
	"END:VCALENDAR",
].join("\r\n");

const MULTI_DAY_ICS = [
	"BEGIN:VCALENDAR",
	"VERSION:2.0",
	"PRODID:-//Test//EN",
	"BEGIN:VEVENT",
	"UID:test-2@test",
	"DTSTAMP:20260213T000000Z",
	"DTSTART;VALUE=DATE:20260302",
	"DTEND;VALUE=DATE:20260305",
	"SUMMARY:Work From Home",
	"CATEGORIES:oof",
	"END:VEVENT",
	"END:VCALENDAR",
].join("\r\n");

const HOLIDAY_ICS = [
	"BEGIN:VCALENDAR",
	"VERSION:2.0",
	"PRODID:-//Test//EN",
	"BEGIN:VEVENT",
	"UID:test-3@test",
	"DTSTAMP:20260213T000000Z",
	"DTSTART;VALUE=DATE:20260401",
	"DTEND;VALUE=DATE:20260402",
	"SUMMARY:Holiday Time",
	"CATEGORIES:holiday",
	"END:VEVENT",
	"END:VCALENDAR",
].join("\r\n");

const SUMMARY_ONLY_SICK_ICS = [
	"BEGIN:VCALENDAR",
	"VERSION:2.0",
	"PRODID:-//Test//EN",
	"BEGIN:VEVENT",
	"UID:test-4@test",
	"DTSTAMP:20260213T000000Z",
	"DTSTART;VALUE=DATE:20260501",
	"DTEND;VALUE=DATE:20260502",
	"SUMMARY:Sick Day",
	"END:VEVENT",
	"END:VCALENDAR",
].join("\r\n");

const UNKNOWN_SUMMARY_ICS = [
	"BEGIN:VCALENDAR",
	"VERSION:2.0",
	"PRODID:-//Test//EN",
	"BEGIN:VEVENT",
	"UID:test-5@test",
	"DTSTAMP:20260213T000000Z",
	"DTSTART;VALUE=DATE:20260601",
	"DTEND;VALUE=DATE:20260602",
	"SUMMARY:Vacation",
	"END:VEVENT",
	"END:VCALENDAR",
].join("\r\n");

const EMPTY_CALENDAR_ICS = [
	"BEGIN:VCALENDAR",
	"VERSION:2.0",
	"PRODID:-//Test//EN",
	"END:VCALENDAR",
].join("\r\n");

describe("exportICS", () => {
	it("produces valid ICS string", () => {
		const cal = mockCalendarInstance({ oof: ["2026-01-05", "2026-01-06"] });
		const ics = buildExportICS(cal);
		expect(ics).toContain("BEGIN:VCALENDAR");
		expect(ics).toContain("VERSION:2.0");
		expect(ics).toContain("PRODID:");
	});

	it("creates one VEVENT per contiguous range", () => {
		const cal = mockCalendarInstance({
			oof: ["2026-03-02", "2026-03-03", "2026-03-04"],
			holiday: ["2026-04-01", "2026-04-04"],
			sick: [],
		});
		const ics = buildExportICS(cal);
		// 1 oof range + 2 separate holiday events = 3 VEVENTs
		const eventCount = (ics.match(/BEGIN:VEVENT/g) ?? []).length;
		expect(eventCount).toBe(3);
	});

	it("sets DTSTART/DTEND as DATE type", () => {
		const cal = mockCalendarInstance({
			oof: ["2026-01-05"],
			holiday: [],
			sick: [],
		});
		const ics = buildExportICS(cal);
		expect(ics).toContain("DTSTART;VALUE=DATE:20260105");
		// DTEND should be exclusive: Jan 6
		expect(ics).toContain("DTEND;VALUE=DATE:20260106");
	});

	it("includes CATEGORIES with state key", () => {
		const cal = mockCalendarInstance({
			oof: ["2026-01-05"],
			holiday: [],
			sick: [],
		});
		const ics = buildExportICS(cal);
		expect(ics).toContain("CATEGORIES:oof");
	});

	it("sets SUMMARY to state label", () => {
		const cal = mockCalendarInstance({
			oof: ["2026-01-05"],
			holiday: [],
			sick: [],
		});
		const ics = buildExportICS(cal);
		expect(ics).toContain("SUMMARY:Work From Home");
	});
});

describe("importICS", () => {
	it("succeeds with valid ICS", () => {
		const cal = mockCalendarInstance({ oof: [], holiday: [], sick: [] });
		const result = importICS(VALID_ICS, cal);
		expect(result.success).toBe(true);
		expect(cal.clearAll).toHaveBeenCalled();
		expect(cal.setDates).toHaveBeenCalled();
	});

	it("resolves state from CATEGORIES", () => {
		const cal = mockCalendarInstance({ oof: [], holiday: [], sick: [] });
		importICS(HOLIDAY_ICS, cal);
		expect(cal.setDates).toHaveBeenCalledWith(["2026-04-01"], "holiday");
	});

	it("falls back to SUMMARY matching", () => {
		const cal = mockCalendarInstance({ oof: [], holiday: [], sick: [] });
		importICS(SUMMARY_ONLY_SICK_ICS, cal);
		expect(cal.setDates).toHaveBeenCalledWith(["2026-05-01"], "sick");
	});

	it("defaults to oof for unknown events", () => {
		const cal = mockCalendarInstance({ oof: [], holiday: [], sick: [] });
		importICS(UNKNOWN_SUMMARY_ICS, cal);
		expect(cal.setDates).toHaveBeenCalledWith(["2026-06-01"], "oof");
	});

	it("expands multi-day range to individual dates", () => {
		const cal = mockCalendarInstance({ oof: [], holiday: [], sick: [] });
		importICS(MULTI_DAY_ICS, cal);
		// DTSTART Mar 2, DTEND Mar 5 (exclusive) → Mar 2, 3, 4
		expect(cal.setDates).toHaveBeenCalledWith(
			["2026-03-02", "2026-03-03", "2026-03-04"],
			"oof",
		);
	});

	it("handles single-day events", () => {
		const cal = mockCalendarInstance({ oof: [], holiday: [], sick: [] });
		importICS(VALID_ICS, cal);
		expect(cal.setDates).toHaveBeenCalledWith(["2026-01-05"], "oof");
	});

	it("rejects invalid ICS string", () => {
		const cal = mockCalendarInstance({ oof: [], holiday: [], sick: [] });
		const result = importICS("not an ics file", cal);
		expect(result.success).toBe(false);
	});

	it("rejects ICS with no events", () => {
		const cal = mockCalendarInstance({ oof: [], holiday: [], sick: [] });
		const result = importICS(EMPTY_CALENDAR_ICS, cal);
		expect(result.success).toBe(false);
		expect(result.error).toContain("No events");
	});

	it("round-trip: export then import restores state", () => {
		const dates = {
			oof: ["2026-01-05", "2026-01-06"],
			holiday: ["2026-02-17"],
			sick: ["2026-03-01"],
		};
		const srcCal = mockCalendarInstance(dates);
		const ics = buildExportICS(srcCal);

		const dstCal = mockCalendarInstance({ oof: [], holiday: [], sick: [] });
		const result = importICS(ics, dstCal);
		expect(result.success).toBe(true);

		// Verify oof dates were set
		const oofCall = vi
			.mocked(dstCal.setDates)
			.mock.calls.find((c: [unknown, unknown]) => c[1] === "oof");
		expect(oofCall).toBeDefined();
		expect(oofCall![0].sort()).toEqual(["2026-01-05", "2026-01-06"]);

		// Verify holiday
		const holidayCall = vi
			.mocked(dstCal.setDates)
			.mock.calls.find((c: [unknown, unknown]) => c[1] === "holiday");
		expect(holidayCall).toBeDefined();
		expect(holidayCall![0]).toEqual(["2026-02-17"]);

		// Verify sick
		const sickCall = vi
			.mocked(dstCal.setDates)
			.mock.calls.find((c: [unknown, unknown]) => c[1] === "sick");
		expect(sickCall).toBeDefined();
		expect(sickCall![0]).toEqual(["2026-03-01"]);
	});
});
