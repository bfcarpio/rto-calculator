import { beforeEach, describe, expect, it } from "vitest";
import {
	selectedDates,
	setDateState,
} from "../../src/stores/calendarStore";
import { CalendarManager } from "../../src/CalendarManager";
import type { DateState, DateString } from "../../src/types";

/**
 * Creates a minimal CalendarManager wired to the shared nanostore.
 * Uses jsdom so DOM operations work in vitest.
 */
function createManager(): CalendarManager {
	const container = document.createElement("div");
	document.body.appendChild(container);

	const manager = new CalendarManager(container, {
		dateRange: {
			start: new Date(2026, 0, 1),
			end: new Date(2026, 11, 31),
		},
		states: {
			oof: { label: "Out of Office", color: "#ef4444", bgColor: "#fee2e2" },
			holiday: { label: "Holiday", color: "#f59e0b", bgColor: "#fef3c7" },
			sick: { label: "Sick Day", color: "#1890ff", bgColor: "#e6f7ff" },
		},
		painting: { enabled: true, defaultState: "oof" },
	});
	manager.init();
	return manager;
}

describe("getDateRanges", () => {
	let manager: CalendarManager;

	beforeEach(() => {
		selectedDates.set(new Map());
		manager = createManager();
	});

	it("returns empty array when no dates are set", () => {
		expect(manager.getDateRanges()).toEqual([]);
	});

	it("returns a single range where start equals end for one date", () => {
		setDateState("2026-02-10" as DateString, "oof" as DateState);

		const ranges = manager.getDateRanges();
		expect(ranges).toHaveLength(1);
		expect(ranges[0]!.start).toEqual(new Date(2026, 1, 10));
		expect(ranges[0]!.end).toEqual(new Date(2026, 1, 10));
		expect(ranges[0]!.state).toBe("oof");
	});

	it("merges three consecutive same-state dates into one range", () => {
		setDateState("2026-03-02" as DateString, "oof" as DateState);
		setDateState("2026-03-03" as DateString, "oof" as DateState);
		setDateState("2026-03-04" as DateString, "oof" as DateState);

		const ranges = manager.getDateRanges();
		expect(ranges).toHaveLength(1);
		expect(ranges[0]!.start).toEqual(new Date(2026, 2, 2));
		expect(ranges[0]!.end).toEqual(new Date(2026, 2, 4));
		expect(ranges[0]!.state).toBe("oof");
	});

	it("produces two ranges when there is a gap between dates", () => {
		setDateState("2026-04-01" as DateString, "holiday" as DateState);
		setDateState("2026-04-02" as DateString, "holiday" as DateState);
		// gap on April 3
		setDateState("2026-04-04" as DateString, "holiday" as DateState);

		const ranges = manager.getDateRanges();
		expect(ranges).toHaveLength(2);
		expect(ranges[0]!.start).toEqual(new Date(2026, 3, 1));
		expect(ranges[0]!.end).toEqual(new Date(2026, 3, 2));
		expect(ranges[1]!.start).toEqual(new Date(2026, 3, 4));
		expect(ranges[1]!.end).toEqual(new Date(2026, 3, 4));
	});

	it("filters by state and returns only matching ranges", () => {
		setDateState("2026-05-01" as DateString, "oof" as DateState);
		setDateState("2026-05-02" as DateString, "holiday" as DateState);
		setDateState("2026-05-03" as DateString, "oof" as DateState);

		const ranges = manager.getDateRanges({ state: "holiday" });
		expect(ranges).toHaveLength(1);
		expect(ranges[0]!.state).toBe("holiday");
		expect(ranges[0]!.start).toEqual(new Date(2026, 4, 2));
	});

	it("excludes dates on or after `before` boundary", () => {
		setDateState("2026-06-10" as DateString, "sick" as DateState);
		setDateState("2026-06-11" as DateString, "sick" as DateState);
		setDateState("2026-06-12" as DateString, "sick" as DateState);

		// before June 12 — excludes June 12 itself
		const ranges = manager.getDateRanges({ before: new Date(2026, 5, 12) });
		expect(ranges).toHaveLength(1);
		expect(ranges[0]!.start).toEqual(new Date(2026, 5, 10));
		expect(ranges[0]!.end).toEqual(new Date(2026, 5, 11));
	});

	it("excludes dates on or before `after` boundary", () => {
		setDateState("2026-06-10" as DateString, "sick" as DateState);
		setDateState("2026-06-11" as DateString, "sick" as DateState);
		setDateState("2026-06-12" as DateString, "sick" as DateState);

		// after June 10 — excludes June 10 itself
		const ranges = manager.getDateRanges({ after: new Date(2026, 5, 10) });
		expect(ranges).toHaveLength(1);
		expect(ranges[0]!.start).toEqual(new Date(2026, 5, 11));
		expect(ranges[0]!.end).toEqual(new Date(2026, 5, 12));
	});

	it("combines state + before + after filters", () => {
		setDateState("2026-07-01" as DateString, "oof" as DateState);
		setDateState("2026-07-02" as DateString, "oof" as DateState);
		setDateState("2026-07-03" as DateString, "holiday" as DateState);
		setDateState("2026-07-04" as DateString, "oof" as DateState);
		setDateState("2026-07-05" as DateString, "oof" as DateState);

		const ranges = manager.getDateRanges({
			state: "oof",
			after: new Date(2026, 6, 1),   // excludes July 1
			before: new Date(2026, 6, 5),  // excludes July 5
		});

		expect(ranges).toHaveLength(2);
		// July 2 (oof)
		expect(ranges[0]!.start).toEqual(new Date(2026, 6, 2));
		expect(ranges[0]!.end).toEqual(new Date(2026, 6, 2));
		// July 4 (oof)
		expect(ranges[1]!.start).toEqual(new Date(2026, 6, 4));
		expect(ranges[1]!.end).toEqual(new Date(2026, 6, 4));
	});

	it("produces separate ranges for consecutive dates with different states", () => {
		setDateState("2026-08-10" as DateString, "oof" as DateState);
		setDateState("2026-08-11" as DateString, "holiday" as DateState);
		setDateState("2026-08-12" as DateString, "sick" as DateState);

		const ranges = manager.getDateRanges();
		expect(ranges).toHaveLength(3);
		expect(ranges[0]!.state).toBe("oof");
		expect(ranges[1]!.state).toBe("holiday");
		expect(ranges[2]!.state).toBe("sick");
		// Each range is a single day
		expect(ranges[0]!.start).toEqual(ranges[0]!.end);
		expect(ranges[1]!.start).toEqual(ranges[1]!.end);
		expect(ranges[2]!.start).toEqual(ranges[2]!.end);
	});

	it("excludes weekend dates when onlyWeekdays is true", () => {
		// 2026-02-13 Fri, 2026-02-14 Sat, 2026-02-15 Sun, 2026-02-16 Mon
		setDateState("2026-02-13" as DateString, "oof" as DateState);
		setDateState("2026-02-14" as DateString, "oof" as DateState);
		setDateState("2026-02-15" as DateString, "oof" as DateState);
		setDateState("2026-02-16" as DateString, "oof" as DateState);

		const ranges = manager.getDateRanges({ onlyWeekdays: true });
		expect(ranges).toHaveLength(2);
		// Fri stands alone (Sat/Sun removed breaks adjacency with Mon)
		expect(ranges[0]!.start).toEqual(new Date(2026, 1, 13));
		expect(ranges[0]!.end).toEqual(new Date(2026, 1, 13));
		// Mon stands alone
		expect(ranges[1]!.start).toEqual(new Date(2026, 1, 16));
		expect(ranges[1]!.end).toEqual(new Date(2026, 1, 16));
	});

	it("weekday-only filtering splits ranges that span weekends", () => {
		// Mon–Fri full week + next Mon
		setDateState("2026-03-09" as DateString, "oof" as DateState); // Mon
		setDateState("2026-03-10" as DateString, "oof" as DateState); // Tue
		setDateState("2026-03-11" as DateString, "oof" as DateState); // Wed
		setDateState("2026-03-12" as DateString, "oof" as DateState); // Thu
		setDateState("2026-03-13" as DateString, "oof" as DateState); // Fri
		setDateState("2026-03-14" as DateString, "oof" as DateState); // Sat
		setDateState("2026-03-15" as DateString, "oof" as DateState); // Sun
		setDateState("2026-03-16" as DateString, "oof" as DateState); // Mon

		const ranges = manager.getDateRanges({ onlyWeekdays: true });
		expect(ranges).toHaveLength(2);
		expect(ranges[0]!.start).toEqual(new Date(2026, 2, 9));
		expect(ranges[0]!.end).toEqual(new Date(2026, 2, 13));
		expect(ranges[1]!.start).toEqual(new Date(2026, 2, 16));
		expect(ranges[1]!.end).toEqual(new Date(2026, 2, 16));
	});

	it("returns ranges sorted chronologically", () => {
		// Set dates in non-chronological order
		setDateState("2026-09-15" as DateString, "oof" as DateState);
		setDateState("2026-09-01" as DateString, "holiday" as DateState);
		setDateState("2026-09-10" as DateString, "sick" as DateState);

		const ranges = manager.getDateRanges();
		expect(ranges).toHaveLength(3);
		expect(ranges[0]!.start).toEqual(new Date(2026, 8, 1));
		expect(ranges[1]!.start).toEqual(new Date(2026, 8, 10));
		expect(ranges[2]!.start).toEqual(new Date(2026, 8, 15));
	});
});
