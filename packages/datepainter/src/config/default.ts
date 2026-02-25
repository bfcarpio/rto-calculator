import type { CalendarConfig } from "../types";

export const defaultConfig: CalendarConfig = {
	dateRange: {
		start: new Date(),
		end: new Date(),
	},
	states: {
		oof: {
			label: "Work From Home",
			color: "#ffffff",
			bgColor: "#44AA99",
			icon: "🏠",
			position: "below",
		},
		holiday: {
			label: "Holiday",
			color: "#3a3520",
			bgColor: "#DDCC77",
			icon: "☀️",
			position: "below",
		},
		sick: {
			label: "Sick Day",
			color: "#ffffff",
			bgColor: "#332288",
			icon: "💊",
			position: "below",
		},
	},
	styling: {
		cellSize: 40,
		showWeekdays: true,
		showWeekNumbers: true,
		firstDayOfWeek: 0,
	},
	painting: {
		enabled: true,
		paintOnDrag: true,
	},
};
