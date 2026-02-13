/**
 * Builder pattern for creating test scenarios
 */

import { formatDate, getRelativeDate } from "./dateFixtures";

type DateState = "working" | "oof" | "holiday";

interface TestScenario {
	name: string;
	dates: Array<{ date: string; state: DateState }>;
	expectedWorking: number;
	expectedOof: number;
	expectedHoliday: number;
}

export class TestScenarioBuilder {
	private scenario: TestScenario;

	constructor(name: string) {
		this.scenario = {
			name,
			dates: [],
			expectedWorking: 0,
			expectedOof: 0,
			expectedHoliday: 0,
		};
	}

	withWorkingDates(count: number, startOffset = 0): this {
		for (let i = 0; i < count; i++) {
			this.scenario.dates.push({
				date: formatDate(getRelativeDate(startOffset + i)),
				state: "working",
			});
		}
		this.scenario.expectedWorking += count;
		return this;
	}

	withOOFDates(count: number, startOffset = 0): this {
		for (let i = 0; i < count; i++) {
			this.scenario.dates.push({
				date: formatDate(getRelativeDate(startOffset + i)),
				state: "oof",
			});
		}
		this.scenario.expectedOof += count;
		return this;
	}

	withHolidayDates(count: number, startOffset = 0): this {
		for (let i = 0; i < count; i++) {
			this.scenario.dates.push({
				date: formatDate(getRelativeDate(startOffset + i)),
				state: "holiday",
			});
		}
		this.scenario.expectedHoliday += count;
		return this;
	}

	withOOFSlice(startDay: number, endDay: number): this {
		for (let i = startDay; i <= endDay; i++) {
			this.scenario.dates.push({
				date: formatDate(getRelativeDate(i)),
				state: "oof",
			});
		}
		this.scenario.expectedOof += endDay - startDay + 1;
		return this;
	}

	withWorkingSlice(startDay: number, endDay: number): this {
		for (let i = startDay; i <= endDay; i++) {
			this.scenario.dates.push({
				date: formatDate(getRelativeDate(i)),
				state: "working",
			});
		}
		this.scenario.expectedWorking += endDay - startDay + 1;
		return this;
	}

	build(): TestScenario {
		return { ...this.scenario };
	}
}

// Pre-built common scenarios
export const SCENARIOS = {
	empty: () => new TestScenarioBuilder("empty").build(),

	allWorking: () =>
		new TestScenarioBuilder("all-working").withWorkingDates(5).build(),

	allOOF: () => new TestScenarioBuilder("all-oof").withOOFDates(5).build(),

	allHoliday: () =>
		new TestScenarioBuilder("all-holiday").withHolidayDates(5).build(),

	mixed: () =>
		new TestScenarioBuilder("mixed")
			.withWorkingDates(3)
			.withOOFDates(2)
			.withHolidayDates(1)
			.build(),

	weekLongVacation: () =>
		new TestScenarioBuilder("week-long-vacation")
			.withOOFSlice(0, 4)
			.withWorkingSlice(5, 6)
			.build(),
} as const;
