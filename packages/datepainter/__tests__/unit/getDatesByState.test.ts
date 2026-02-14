import { beforeEach, describe, expect, it } from "vitest";
import {
	selectedDates,
	setDateState,
} from "../../src/stores/calendarStore";
import { CalendarManager } from "../../src/CalendarManager";
import type { DateState, DateString } from "../../src/types";

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

describe("getDatesByState", () => {
	let manager: CalendarManager;

	beforeEach(() => {
		selectedDates.set(new Map());
		manager = createManager();
	});

	it("returns all dates for a state when no options given", () => {
		setDateState("2026-03-02" as DateString, "oof" as DateState);
		setDateState("2026-03-03" as DateString, "oof" as DateState);
		setDateState("2026-03-04" as DateString, "holiday" as DateState);

		const dates = manager.getDatesByState("oof");
		expect(dates).toHaveLength(2);
		expect(dates).toContain("2026-03-02");
		expect(dates).toContain("2026-03-03");
	});

	it("excludes dates on or before `after` boundary", () => {
		setDateState("2026-06-10" as DateString, "sick" as DateState);
		setDateState("2026-06-11" as DateString, "sick" as DateState);
		setDateState("2026-06-12" as DateString, "sick" as DateState);

		const dates = manager.getDatesByState("sick", {
			after: new Date(2026, 5, 10),
		});
		expect(dates).toEqual(
			expect.arrayContaining(["2026-06-11", "2026-06-12"]),
		);
		expect(dates).not.toContain("2026-06-10");
	});

	it("excludes dates on or after `before` boundary", () => {
		setDateState("2026-06-10" as DateString, "sick" as DateState);
		setDateState("2026-06-11" as DateString, "sick" as DateState);
		setDateState("2026-06-12" as DateString, "sick" as DateState);

		const dates = manager.getDatesByState("sick", {
			before: new Date(2026, 5, 12),
		});
		expect(dates).toEqual(
			expect.arrayContaining(["2026-06-10", "2026-06-11"]),
		);
		expect(dates).not.toContain("2026-06-12");
	});

	it("excludes weekends when onlyWeekdays is true", () => {
		// 2026-02-14 is Saturday, 2026-02-15 is Sunday
		setDateState("2026-02-13" as DateString, "oof" as DateState); // Fri
		setDateState("2026-02-14" as DateString, "oof" as DateState); // Sat
		setDateState("2026-02-15" as DateString, "oof" as DateState); // Sun
		setDateState("2026-02-16" as DateString, "oof" as DateState); // Mon

		const dates = manager.getDatesByState("oof", { onlyWeekdays: true });
		expect(dates).toContain("2026-02-13");
		expect(dates).toContain("2026-02-16");
		expect(dates).not.toContain("2026-02-14");
		expect(dates).not.toContain("2026-02-15");
	});

	it("combines after, before, and onlyWeekdays filters", () => {
		// Week of 2026-03-09 (Mon) to 2026-03-15 (Sun)
		setDateState("2026-03-09" as DateString, "oof" as DateState); // Mon
		setDateState("2026-03-10" as DateString, "oof" as DateState); // Tue
		setDateState("2026-03-11" as DateString, "oof" as DateState); // Wed
		setDateState("2026-03-14" as DateString, "oof" as DateState); // Sat
		setDateState("2026-03-15" as DateString, "oof" as DateState); // Sun

		const dates = manager.getDatesByState("oof", {
			after: new Date(2026, 2, 9),   // excludes Mar 9
			before: new Date(2026, 2, 15),  // excludes Mar 15
			onlyWeekdays: true,
		});
		expect(dates).toEqual(
			expect.arrayContaining(["2026-03-10", "2026-03-11"]),
		);
		expect(dates).toHaveLength(2);
	});

	it("returns empty array for state with no dates", () => {
		const dates = manager.getDatesByState("holiday");
		expect(dates).toEqual([]);
	});
});
