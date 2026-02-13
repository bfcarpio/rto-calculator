import type { CalendarConfig } from "../types";

export const defaultConfig: CalendarConfig = {
  dateRange: {
    start: new Date(),
    end: new Date(),
  },
  states: {
    working: {
      label: "Working",
      color: "#334155",
      bgColor: "#ffffff",
    },
    oof: {
      label: "Out of Office",
      color: "#ffffff",
      bgColor: "#ef4444",
      icon: "🏖️",
      position: "below",
    },
    holiday: {
      label: "Holiday",
      color: "#ffffff",
      bgColor: "#10b981",
      icon: "🎉",
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
