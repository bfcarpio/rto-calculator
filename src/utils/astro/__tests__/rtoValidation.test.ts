import { describe, it, expect } from "vitest";
import {
  getStartOfWeek,
  getFirstWeekStart,
  getWeekDates,
  getWorkFromHomeDates,
  groupDatesByWeek,
  calculateOfficeDaysInWeek,
  calculateWeekCompliance,
  validateTop8Weeks,
  getWeekCompliance,
  isInEvaluationPeriod,
  createDaySelection,
  elementToDaySelection,
  DEFAULT_RTO_POLICY,
  type DaySelection,
} from "../rtoValidation";

describe("getStartOfWeek", () => {
  it("should return Monday for a Sunday date", () => {
    const date = new Date(2025, 0, 5); // Sunday, Jan 5, 2025
    const result = getStartOfWeek(date);
    expect(result.getDay()).toBe(1); // Monday
    expect(result.getDate()).toBe(30); // Dec 30, 2024 (Monday of same week)
    expect(result.getMonth()).toBe(11); // December
    expect(result.getFullYear()).toBe(2024);
  });

  it("should return Monday for a Friday date", () => {
    const date = new Date(2025, 0, 10); // Friday, Jan 10, 2025
    const result = getStartOfWeek(date);
    expect(result.getDay()).toBe(1);
    expect(result.getDate()).toBe(6);
  });

  it("should set time to midnight", () => {
    const date = new Date(2025, 0, 6, 14, 30, 45);
    const result = getStartOfWeek(date);
    expect(result.getHours()).toBe(0);
    expect(result.getMinutes()).toBe(0);
    expect(result.getSeconds()).toBe(0);
  });
});

describe("getFirstWeekStart", () => {
  it("should return Monday for a Sunday date", () => {
    const date = new Date(2025, 0, 5); // Sunday, Jan 5, 2025
    const result = getFirstWeekStart(date);
    expect(result.getDay()).toBe(1); // Monday
    expect(result.getDate()).toBe(6); // Jan 6, 2025 (next Monday)
    expect(result.getMonth()).toBe(0); // January
    expect(result.getFullYear()).toBe(2025);
  });

  it("should return same Monday for a Monday date", () => {
    const date = new Date(2025, 0, 6); // Monday, Jan 6, 2025
    const result = getFirstWeekStart(date);
    expect(result.getDay()).toBe(1);
    expect(result.getDate()).toBe(6);
  });

  it("should return next Monday for a Tuesday date", () => {
    const date = new Date(2025, 0, 7); // Tuesday, Jan 7, 2025
    const result = getFirstWeekStart(date);
    expect(result.getDay()).toBe(1);
    expect(result.getDate()).toBe(13); // Next Monday
  });

  it("should return next Monday for a Friday date", () => {
    const date = new Date(2025, 0, 10); // Friday, Jan 10, 2025
    const result = getFirstWeekStart(date);
    expect(result.getDay()).toBe(1);
    expect(result.getDate()).toBe(13); // Next Monday
  });

  it("should return next Monday for a Saturday date", () => {
    const date = new Date(2025, 0, 11); // Saturday, Jan 11, 2025
    const result = getFirstWeekStart(date);
    expect(result.getDay()).toBe(1);
    expect(result.getDate()).toBe(13); // Next Monday
  });

  it("should set time to midnight", () => {
    const date = new Date(2025, 0, 6, 14, 30, 45);
    const result = getFirstWeekStart(date);
    expect(result.getHours()).toBe(0);
    expect(result.getMinutes()).toBe(0);
    expect(result.getSeconds()).toBe(0);
  });
});

describe("getWeekDates", () => {
  it("should return 5 weekdays starting from Monday", () => {
    const weekStart = new Date(2025, 0, 6); // Monday, Jan 6, 2025
    const dates = getWeekDates(weekStart);
    expect(dates).toHaveLength(5);
    expect(dates[0]?.getDay()).toBe(1); // Monday
    expect(dates[4]?.getDay()).toBe(5); // Friday
  });

  it("should return consecutive dates", () => {
    const weekStart = new Date(2025, 0, 6);
    const dates = getWeekDates(weekStart);
    expect(dates[0]?.getDate()).toBe(6);
    expect(dates[1]?.getDate()).toBe(7);
    expect(dates[2]?.getDate()).toBe(8);
    expect(dates[3]?.getDate()).toBe(9);
    expect(dates[4]?.getDate()).toBe(10);
  });
});

describe("getWorkFromHomeDates", () => {
  it("should filter and return only work-from-home selections", () => {
    const selections: DaySelection[] = [
      createDaySelection(2025, 0, 6, "work-from-home"),
      createDaySelection(2025, 0, 7, "office"),
      createDaySelection(2025, 0, 8, "none"),
      createDaySelection(2025, 0, 9, "work-from-home"),
    ];
    const result = getWorkFromHomeDates(selections);
    expect(result).toHaveLength(2);
    expect(result[0]?.getDate()).toBe(6);
    expect(result[1]?.getDate()).toBe(9);
  });

  it("should return empty array when no work-from-home selections", () => {
    const selections: DaySelection[] = [
      createDaySelection(2025, 0, 6, "office"),
      createDaySelection(2025, 0, 7, "none"),
    ];
    const result = getWorkFromHomeDates(selections);
    expect(result).toHaveLength(0);
  });

  it("should return empty array for empty input", () => {
    const result = getWorkFromHomeDates([]);
    expect(result).toHaveLength(0);
  });
});

describe("groupDatesByWeek", () => {
  it("should group dates by week start", () => {
    const dates = [
      new Date(2025, 0, 6), // Monday, Jan 6
      new Date(2025, 0, 7), // Tuesday, Jan 7
      new Date(2025, 0, 13), // Monday, Jan 13
      new Date(2025, 0, 14), // Tuesday, Jan 14
    ];
    const result = groupDatesByWeek(dates);
    expect(result.size).toBe(2);

    const firstWeek = new Date(2025, 0, 6);
    const secondWeek = new Date(2025, 0, 13);

    expect(result.get(firstWeek.getTime())).toBe(2);
    expect(result.get(secondWeek.getTime())).toBe(2);
  });

  it("should count multiple dates in same week", () => {
    const dates = [
      new Date(2025, 0, 6),
      new Date(2025, 0, 7),
      new Date(2025, 0, 8),
      new Date(2025, 0, 9),
    ];
    const result = groupDatesByWeek(dates);
    expect(result.size).toBe(1);

    const weekStart = getStartOfWeek(new Date(2025, 0, 6));
    expect(result.get(weekStart.getTime())).toBe(4);
  });

  it("should return empty map for empty input", () => {
    const result = groupDatesByWeek([]);
    expect(result.size).toBe(0);
  });
});

describe("calculateOfficeDaysInWeek", () => {
  it("should calculate office days correctly", () => {
    const weeksByWFH = groupDatesByWeek([
      new Date(2025, 0, 6),
      new Date(2025, 0, 7),
    ]);
    const weekStart = new Date(2025, 0, 6);

    const result = calculateOfficeDaysInWeek(weeksByWFH, weekStart);
    expect(result).toBe(3); // 5 weekdays - 2 WFH days
  });

  it("should return 5 when no WFH days", () => {
    const weeksByWFH = new Map();
    const weekStart = new Date(2025, 0, 6);

    const result = calculateOfficeDaysInWeek(weeksByWFH, weekStart);
    expect(result).toBe(5);
  });

  it("should return 0 when all days are WFH", () => {
    const weekDates = getWeekDates(new Date(2025, 0, 6));
    const wfhDates = weekDates.map((d: Date) => new Date(d));
    const weeksByWFH = groupDatesByWeek(wfhDates);
    const weekStart = new Date(2025, 0, 6);

    const result = calculateOfficeDaysInWeek(weeksByWFH, weekStart);
    expect(result).toBe(0);
  });
});

describe("calculateWeekCompliance", () => {
  it("should mark week as compliant with 3+ office days", () => {
    const weeksByWFH = groupDatesByWeek([
      new Date(2025, 0, 6),
      new Date(2025, 0, 7),
    ]);
    const weekStart = new Date(2025, 0, 6);

    const result = calculateWeekCompliance(1, weekStart, weeksByWFH);
    expect(result.isCompliant).toBe(true);
    expect(result.officeDays).toBe(3);
    expect(result.wfhDays).toBe(2);
  });

  it("should mark week as non-compliant with <3 office days", () => {
    const weeksByWFH = groupDatesByWeek([
      new Date(2025, 0, 6),
      new Date(2025, 0, 7),
      new Date(2025, 0, 8),
      new Date(2025, 0, 9),
    ]);
    const weekStart = new Date(2025, 0, 6);

    const result = calculateWeekCompliance(1, weekStart, weeksByWFH);
    expect(result.isCompliant).toBe(false);
    expect(result.officeDays).toBe(1);
    expect(result.wfhDays).toBe(4);
  });

  it("should use custom policy configuration", () => {
    const customPolicy = { ...DEFAULT_RTO_POLICY, minOfficeDaysPerWeek: 4 };
    const weeksByWFH = groupDatesByWeek([
      new Date(2025, 0, 6),
      new Date(2025, 0, 7),
    ]);
    const weekStart = new Date(2025, 0, 6);

    const result = calculateWeekCompliance(
      1,
      weekStart,
      weeksByWFH,
      customPolicy,
    );
    expect(result.isCompliant).toBe(false); // Only 3 office days, need 4
    expect(result.officeDays).toBe(3);
  });

  it("should return week number and dates", () => {
    const weeksByWFH = new Map();
    const weekStart = new Date(2025, 0, 6);

    const result = calculateWeekCompliance(3, weekStart, weeksByWFH);
    expect(result.weekNumber).toBe(3);
    expect(result.weekStart.getTime()).toBe(weekStart.getTime());
  });
});

describe("validateTop8Weeks", () => {
  it("should validate compliant scenario", () => {
    // 2 WFH days per week = 3 office days = 60% compliant
    const selections: DaySelection[] = [];
    const weekStarts = [
      new Date(2025, 0, 6), // Week 1: Jan 6-10
      new Date(2025, 0, 13), // Week 2: Jan 13-17
      new Date(2025, 0, 20), // Week 3: Jan 20-24
      new Date(2025, 0, 27), // Week 4: Jan 27-31
      new Date(2025, 1, 3), // Week 5: Feb 3-7
      new Date(2025, 1, 10), // Week 6: Feb 10-14
      new Date(2025, 1, 17), // Week 7: Feb 17-21
      new Date(2025, 1, 24), // Week 8: Feb 24-28
    ];

    for (let week = 0; week < 8; week++) {
      const weekStart = weekStarts[week]!;
      // Add 2 WFH days (Monday and Tuesday)
      selections.push(
        createDaySelection(
          weekStart!.getFullYear(),
          weekStart!.getMonth(),
          weekStart!.getDate(),
          "work-from-home",
        ),
      );
      selections.push(
        createDaySelection(
          weekStart!.getFullYear(),
          weekStart!.getMonth(),
          weekStart!.getDate() + 1,
          "work-from-home",
        ),
      );
    }

    const result = validateTop8Weeks(selections, new Date(2025, 0, 1));
    expect(result.isValid).toBe(true);
    expect(result.averageOfficeDays).toBe(3);
    expect(result.averageOfficePercentage).toBe(60);
  });

  it("should validate violation scenario", () => {
    // 3 WFH days per week = 2 office days = 40% violation
    const selections: DaySelection[] = [];
    const weekStarts = [
      new Date(2025, 0, 6), // Week 1: Jan 6-10
      new Date(2025, 0, 13), // Week 2: Jan 13-17
      new Date(2025, 0, 20), // Week 3: Jan 20-24
      new Date(2025, 0, 27), // Week 4: Jan 27-31
      new Date(2025, 1, 3), // Week 5: Feb 3-7
      new Date(2025, 1, 10), // Week 6: Feb 10-14
      new Date(2025, 1, 17), // Week 7: Feb 17-21
      new Date(2025, 1, 24), // Week 8: Feb 24-28
    ];

    for (let week = 0; week < 8; week++) {
      const weekStart = weekStarts[week]!;
      // Add 3 WFH days (Mon, Tue, Wed)
      selections.push(
        createDaySelection(
          weekStart!.getFullYear(),
          weekStart!.getMonth(),
          weekStart!.getDate(),
          "work-from-home",
        ),
      );
      selections.push(
        createDaySelection(
          weekStart!.getFullYear(),
          weekStart!.getMonth(),
          weekStart!.getDate() + 1,
          "work-from-home",
        ),
      );
      selections.push(
        createDaySelection(
          weekStart!.getFullYear(),
          weekStart!.getMonth(),
          weekStart!.getDate() + 2,
          "work-from-home",
        ),
      );
    }

    const result = validateTop8Weeks(selections, new Date(2025, 0, 1));
    expect(result.isValid).toBe(false);
    expect(result.averageOfficeDays).toBe(2);
    expect(result.averageOfficePercentage).toBe(40);
  });

  it("should handle empty selections as compliant", () => {
    const result = validateTop8Weeks([], new Date(2025, 0, 1));
    expect(result.isValid).toBe(true);
    expect(result.averageOfficeDays).toBe(5);
    expect(result.averageOfficePercentage).toBe(100);
  });

  it("should calculate correct totals", () => {
    const selections: DaySelection[] = [];
    const weekStarts = [
      new Date(2025, 0, 6), // Week 1
      new Date(2025, 0, 13), // Week 2
      new Date(2025, 0, 20), // Week 3
      new Date(2025, 0, 27), // Week 4
      new Date(2025, 1, 3), // Week 5
      new Date(2025, 1, 10), // Week 6
      new Date(2025, 1, 17), // Week 7
      new Date(2025, 1, 24), // Week 8
    ];

    for (let week = 0; week < 8; week++) {
      const weekStart = weekStarts[week]!;
      selections.push(
        createDaySelection(
          weekStart!.getFullYear(),
          weekStart!.getMonth(),
          weekStart!.getDate(),
          "work-from-home",
        ),
      );
    }

    const result = validateTop8Weeks(selections, new Date(2025, 0, 1));
    expect(result.totalOfficeDays).toBe(32); // (5-1)*8
    expect(result.totalWeekdays).toBe(40); // 5*8
    expect(result.weeksData).toHaveLength(8);
  });

  it("should use custom policy configuration", () => {
    const customPolicy = {
      ...DEFAULT_RTO_POLICY,
      minOfficeDaysPerWeek: 4,
      topWeeksToCheck: 4,
    };
    const selections: DaySelection[] = [
      createDaySelection(2025, 0, 6, "work-from-home"), // Week 1 Monday
      createDaySelection(2025, 0, 7, "work-from-home"), // Week 1 Tuesday
      createDaySelection(2025, 0, 8, "work-from-home"), // Week 1 Wednesday
    ];

    const result = validateTop8Weeks(
      selections,
      new Date(2025, 0, 1),
      customPolicy,
    );
    expect(result.weeksData).toHaveLength(4);
    expect(result.isValid).toBe(true); // Week 1 has 2 office days (5-3), but other 3 weeks have 5 office days, average = (2+5+5+5)/4 = 4.25, which is >= 4
  });

  it("should generate appropriate compliant message", () => {
    const result = validateTop8Weeks([], new Date(2025, 0, 1));
    expect(result.message).toContain("✓ RTO Compliant");
    expect(result.message).toContain("60%");
  });

  it("should generate appropriate violation message", () => {
    const selections: DaySelection[] = [];
    // Add WFH days across multiple weeks to cause violation
    // Week 1: 4 WFH days
    selections.push(createDaySelection(2025, 0, 6, "work-from-home")); // Monday
    selections.push(createDaySelection(2025, 0, 7, "work-from-home")); // Tuesday
    selections.push(createDaySelection(2025, 0, 8, "work-from-home")); // Wednesday
    selections.push(createDaySelection(2025, 0, 9, "work-from-home")); // Thursday
    // Week 2: 2 WFH days
    selections.push(createDaySelection(2025, 0, 13, "work-from-home")); // Monday
    selections.push(createDaySelection(2025, 0, 14, "work-from-home")); // Tuesday
    // Week 3: 2 WFH days
    selections.push(createDaySelection(2025, 0, 20, "work-from-home")); // Monday
    selections.push(createDaySelection(2025, 0, 21, "work-from-home")); // Tuesday
    // Week 4: 2 WFH days
    selections.push(createDaySelection(2025, 0, 27, "work-from-home")); // Monday
    selections.push(createDaySelection(2025, 0, 28, "work-from-home")); // Tuesday
    // Week 5: 2 WFH days
    selections.push(createDaySelection(2025, 1, 3, "work-from-home")); // Monday
    selections.push(createDaySelection(2025, 1, 4, "work-from-home")); // Tuesday
    // Week 6: 2 WFH days
    selections.push(createDaySelection(2025, 1, 10, "work-from-home")); // Monday
    selections.push(createDaySelection(2025, 1, 11, "work-from-home")); // Tuesday
    // Week 7: 2 WFH days
    selections.push(createDaySelection(2025, 1, 17, "work-from-home")); // Monday
    selections.push(createDaySelection(2025, 1, 18, "work-from-home")); // Tuesday
    // Week 8: 1 WFH day
    selections.push(createDaySelection(2025, 1, 24, "work-from-home")); // Monday

    const result = validateTop8Weeks(selections, new Date(2025, 0, 1));
    expect(result.message).toContain("✗ RTO Violation");
  });

  it("should handle boundary case - exactly 60% compliant", () => {
    const selections: DaySelection[] = [];
    const weekStarts = [
      new Date(2025, 0, 6), // Week 1
      new Date(2025, 0, 13), // Week 2
      new Date(2025, 0, 20), // Week 3
      new Date(2025, 0, 27), // Week 4
      new Date(2025, 1, 3), // Week 5
      new Date(2025, 1, 10), // Week 6
      new Date(2025, 1, 17), // Week 7
      new Date(2025, 1, 24), // Week 8
    ];

    for (let week = 0; week < 8; week++) {
      const weekStart = weekStarts[week]!;
      // 2 WFH days = 3 office days = 60%
      selections.push(
        createDaySelection(
          weekStart!.getFullYear(),
          weekStart!.getMonth(),
          weekStart!.getDate(),
          "work-from-home",
        ),
      );
      selections.push(
        createDaySelection(
          weekStart!.getFullYear(),
          weekStart!.getMonth(),
          weekStart!.getDate() + 1,
          "work-from-home",
        ),
      );
    }

    const result = validateTop8Weeks(selections, new Date(2025, 0, 1));
    expect(result.isValid).toBe(true);
    expect(result.averageOfficePercentage).toBe(60);
  });

  it("should handle boundary case - just below 60%", () => {
    const selections: DaySelection[] = [];
    // Need more WFH to drop below 60%
    // 23 office days / 40 weekdays = 57.5% (violation)
    // That means 17 WFH days across 8 weeks
    const weekWFHCounts = [2, 2, 2, 2, 2, 2, 2, 3]; // Total = 17
    const weekStarts = [
      new Date(2025, 0, 6), // Week 1
      new Date(2025, 0, 13), // Week 2
      new Date(2025, 0, 20), // Week 3
      new Date(2025, 0, 27), // Week 4
      new Date(2025, 1, 3), // Week 5
      new Date(2025, 1, 10), // Week 6
      new Date(2025, 1, 17), // Week 7
      new Date(2025, 1, 24), // Week 8
    ];

    for (let week = 0; week < 8; week++) {
      const weekStart = weekStarts[week];
      const wfhCount = weekWFHCounts[week]!;
      for (let day = 0; day < wfhCount; day++) {
        selections.push(
          createDaySelection(
            weekStart!.getFullYear(),
            weekStart!.getMonth(),
            weekStart!.getDate() + day,
            "work-from-home",
          ),
        );
      }
    }

    const result = validateTop8Weeks(selections, new Date(2025, 0, 1));
    expect(result.averageOfficePercentage).toBeCloseTo(57.5, 1);
    expect(result.isValid).toBe(false);
  });
});

describe("getWeekCompliance", () => {
  it("should return compliance data for specific week", () => {
    const selections: DaySelection[] = [
      createDaySelection(2025, 0, 6, "work-from-home"),
      createDaySelection(2025, 0, 7, "work-from-home"),
    ];
    const weekStart = new Date(2025, 0, 6);

    const result = getWeekCompliance(weekStart, selections);
    expect(result.officeDays).toBe(3);
    expect(result.wfhDays).toBe(2);
    expect(result.isCompliant).toBe(true);
  });
});

describe("isInEvaluationPeriod", () => {
  it("should return true for weeks in evaluation period", () => {
    const calendarStartDate = new Date(2025, 0, 1);
    const week1Start = getStartOfWeek(new Date(2025, 0, 6));

    expect(isInEvaluationPeriod(week1Start, calendarStartDate)).toBe(true);
  });

  it("should return false for weeks outside evaluation period", () => {
    const calendarStartDate = new Date(2025, 0, 1);
    const week9Start = new Date(2025, 0, 6);
    week9Start.setDate(week9Start.getDate() + 8 * 7); // Week 9

    expect(isInEvaluationPeriod(week9Start, calendarStartDate)).toBe(false);
  });

  it("should handle weeks before calendar start", () => {
    const calendarStartDate = new Date(2025, 0, 15);
    const weekBefore = new Date(2025, 0, 6);

    expect(isInEvaluationPeriod(weekBefore, calendarStartDate)).toBe(false);
  });

  it("should use custom policy configuration", () => {
    const customPolicy = { ...DEFAULT_RTO_POLICY, topWeeksToCheck: 4 };
    const calendarStartDate = new Date(2025, 0, 1);
    const week5Start = new Date(2025, 0, 6);
    week5Start.setDate(week5Start.getDate() + 4 * 7);

    expect(
      isInEvaluationPeriod(week5Start, calendarStartDate, customPolicy),
    ).toBe(false);
  });
});

describe("createDaySelection", () => {
  it("should create work-from-home selection", () => {
    const result = createDaySelection(2025, 0, 6, "work-from-home");
    expect(result.year).toBe(2025);
    expect(result.month).toBe(0);
    expect(result.day).toBe(6);
    expect(result.selectionType).toBe("work-from-home");
    expect(result.date.getFullYear()).toBe(2025);
  });

  it("should create office selection", () => {
    const result = createDaySelection(2025, 0, 6, "office");
    expect(result.selectionType).toBe("office");
  });

  it("should create none selection", () => {
    const result = createDaySelection(2025, 0, 6, "none");
    expect(result.selectionType).toBe("none");
  });
});

describe("elementToDaySelection", () => {
  it("should convert valid DOM element to selection", () => {
    const mockElement = {
      dataset: {
        year: "2025",
        month: "0",
        day: "6",
        selectionType: "work-from-home",
      },
    } as unknown as HTMLElement;

    const result = elementToDaySelection(mockElement);
    expect(result).not.toBeNull();
    expect(result?.year).toBe(2025);
    expect(result?.month).toBe(0);
    expect(result?.day).toBe(6);
    expect(result?.selectionType).toBe("work-from-home");
  });

  it("should return null for element without year", () => {
    const mockElement = {
      dataset: {
        month: "0",
        day: "6",
        selectionType: "work-from-home",
      },
    } as unknown as HTMLElement;

    const result = elementToDaySelection(mockElement);
    expect(result).toBeNull();
  });

  it("should return null for element without month", () => {
    const mockElement = {
      dataset: {
        year: "2025",
        day: "6",
        selectionType: "work-from-home",
      },
    } as unknown as HTMLElement;

    const result = elementToDaySelection(mockElement);
    expect(result).toBeNull();
  });

  it("should return null for element without day", () => {
    const mockElement = {
      dataset: {
        year: "2025",
        month: "0",
        selectionType: "work-from-home",
      },
    } as unknown as HTMLElement;

    const result = elementToDaySelection(mockElement);
    expect(result).toBeNull();
  });

  it("should handle missing selection type", () => {
    const mockElement = {
      dataset: {
        year: "2025",
        month: "0",
        day: "6",
      },
    } as unknown as HTMLElement;

    const result = elementToDaySelection(mockElement);
    expect(result?.selectionType).toBe("none");
  });

  it("should handle empty dataset", () => {
    const mockElement = {
      dataset: {},
    } as unknown as HTMLElement;

    const result = elementToDaySelection(mockElement);
    expect(result).toBeNull();
  });
});

describe("Integration Tests", () => {
  it("should handle realistic multi-week scenario", () => {
    // Create a realistic scenario with varying WFH days
    const selections: DaySelection[] = [
      // Week 1: 2 WFH (compliant) - Jan 6-10
      createDaySelection(2025, 0, 6, "work-from-home"), // Monday
      createDaySelection(2025, 0, 7, "work-from-home"), // Tuesday
      // Week 2: 1 WFH (compliant) - Jan 13-17
      createDaySelection(2025, 0, 13, "work-from-home"), // Monday
      // Week 3: 3 WFH (non-compliant) - Jan 20-24
      createDaySelection(2025, 0, 20, "work-from-home"), // Monday
      createDaySelection(2025, 0, 21, "work-from-home"), // Tuesday
      createDaySelection(2025, 0, 22, "work-from-home"), // Wednesday
      // Week 4: 0 WFH (compliant) - Jan 27-31
      // Week 5: 2 WFH (compliant) - Feb 3-7
      createDaySelection(2025, 1, 3, "work-from-home"), // Monday
      createDaySelection(2025, 1, 4, "work-from-home"), // Tuesday
      // Week 6: 4 WFH (non-compliant) - Feb 10-14
      createDaySelection(2025, 1, 10, "work-from-home"), // Monday
      createDaySelection(2025, 1, 11, "work-from-home"), // Tuesday
      createDaySelection(2025, 1, 12, "work-from-home"), // Wednesday
      createDaySelection(2025, 1, 13, "work-from-home"), // Thursday
      // Week 7: 2 WFH (compliant) - Feb 17-21
      createDaySelection(2025, 1, 17, "work-from-home"), // Monday
      createDaySelection(2025, 1, 18, "work-from-home"), // Tuesday
      // Week 8: 2 WFH (compliant) - Feb 24-28
      createDaySelection(2025, 1, 24, "work-from-home"), // Monday
      createDaySelection(2025, 1, 25, "work-from-home"), // Tuesday
    ];

    const result = validateTop8Weeks(selections, new Date(2025, 0, 1));

    // Total WFH: 2+1+3+0+2+4+2+2 = 16
    // Total office: 40 - 16 = 24
    // Average: 24/8 = 3 days = 60%
    expect(result.averageOfficeDays).toBe(3);
    expect(result.isValid).toBe(true);
  });

  it("should handle selections across month boundaries", () => {
    const selections: DaySelection[] = [
      // Week spanning Jan and Feb
      createDaySelection(2025, 0, 30, "work-from-home"), // Jan 30 (Thu)
      createDaySelection(2025, 0, 31, "work-from-home"), // Jan 31 (Fri)
    ];

    const result = validateTop8Weeks(selections, new Date(2025, 0, 1));
    expect(result.weeksData.length).toBe(8);
  });
});

describe("Sliding Window Optimization", () => {
  it("should calculate compliance for first 8 weeks (expanding window)", () => {
    const selections: DaySelection[] = [
      // Week 1: 3 WFH = 2 office days (40%)
      createDaySelection(2025, 0, 6, "work-from-home"), // Mon
      createDaySelection(2025, 0, 7, "work-from-home"), // Tue
      createDaySelection(2025, 0, 8, "work-from-home"), // Wed
      // Week 2: 2 WFH = 3 office days (60%)
      createDaySelection(2025, 0, 13, "work-from-home"), // Mon
      createDaySelection(2025, 0, 14, "work-from-home"), // Tue
      // Week 3: 1 WFH = 4 office days (80%)
      createDaySelection(2025, 0, 20, "work-from-home"), // Mon
      // Week 4: 0 WFH = 5 office days (100%)
      // Week 5: 2 WFH = 3 office days (60%)
      createDaySelection(2025, 1, 3, "work-from-home"), // Mon
      createDaySelection(2025, 1, 4, "work-from-home"), // Tue
      // Week 6: 1 WFH = 4 office days (80%)
      createDaySelection(2025, 1, 10, "work-from-home"), // Mon
      // Week 7: 0 WFH = 5 office days (100%)
      // Week 8: 2 WFH = 3 office days (60%)
      createDaySelection(2025, 1, 24, "work-from-home"), // Mon
      createDaySelection(2025, 1, 25, "work-from-home"), // Tue
      // Week 9: 4 WFH = 1 office day (20%) - should not affect top 8
      createDaySelection(2025, 2, 3, "work-from-home"), // Mon
      createDaySelection(2025, 2, 4, "work-from-home"), // Tue
      createDaySelection(2025, 2, 5, "work-from-home"), // Wed
      createDaySelection(2025, 2, 6, "work-from-home"), // Thu
      // Week 10: 0 WFH = 5 office days (100%) - should not affect top 8
      // Week 11: 1 WFH = 4 office days (80%) - should not affect top 8
      createDaySelection(2025, 2, 17, "work-from-home"), // Mon
      // Week 12: 3 WFH = 2 office days (40%) - should not affect top 8
      createDaySelection(2025, 2, 24, "work-from-home"), // Mon
      createDaySelection(2025, 2, 25, "work-from-home"), // Tue
      createDaySelection(2025, 2, 26, "work-from-home"), // Wed
    ];

    const result = validateTop8Weeks(selections, new Date(2025, 0, 1));

    // Top 8 weeks only: 2+3+4+5+3+4+5+3 = 29 office days
    // Average: 29/8 = 3.625 days = 72.5%
    // Weeks 9-12 should NOT affect the calculation
    expect(result.averageOfficeDays).toBeCloseTo(3.63, 1);
    expect(result.isValid).toBe(true); // 72.5% > 60%
    expect(result.weeksData.length).toBe(8);
  });

  it("should handle mixed compliance across all 12 weeks", () => {
    const selections: DaySelection[] = [];

    // Create patterns for all 12 weeks
    for (let week = 0; week < 12; week++) {
      const weekStart = new Date(2025, 0, 6 + week * 7);
      const wfhCount = week < 8 ? 3 : 0; // First 8 weeks non-compliant, last 4 compliant

      for (let day = 0; day < wfhCount; day++) {
        selections.push(
          createDaySelection(
            weekStart.getFullYear(),
            weekStart.getMonth(),
            weekStart.getDate() + day,
            "work-from-home",
          ),
        );
      }
    }

    const result = validateTop8Weeks(selections, new Date(2025, 0, 1));

    // Top 8 weeks all have 3 WFH = 2 office days each
    // Total office: 2 * 8 = 16 days
    // Average: 16/8 = 2 days = 40%
    expect(result.averageOfficeDays).toBe(2);
    expect(result.isValid).toBe(false); // 40% < 60%
  });

  it("should correctly calculate top 8 weeks regardless of later weeks", () => {
    const selections: DaySelection[] = [
      // Week 1: 0 WFH = 5 office days (in top 8)
      // Week 2: 0 WFH = 5 office days (in top 8)
      // Week 3: 5 WFH = 0 office days (in top 8)
      createDaySelection(2025, 0, 20, "work-from-home"), // Mon
      createDaySelection(2025, 0, 21, "work-from-home"), // Tue
      createDaySelection(2025, 0, 22, "work-from-home"), // Wed
      createDaySelection(2025, 0, 23, "work-from-home"), // Thu
      createDaySelection(2025, 0, 24, "work-from-home"), // Fri
      // Week 4: 0 WFH = 5 office days (in top 8)
      // Week 5: 0 WFH = 5 office days (in top 8)
      // Week 6: 0 WFH = 5 office days (in top 8)
      // Week 7: 0 WFH = 5 office days (in top 8)
      // Week 8: 0 WFH = 5 office days (in top 8)
      // Week 9-12: NOT in top 8, so they don't affect calculation
    ];

    const result = validateTop8Weeks(selections, new Date(2025, 0, 1));

    // Top 8 weeks: 5+5+0+5+5+5+5+5 = 35 office days
    // Average: 35/8 = 4.375 days = 87.5%
    // Week 9-12 should NOT affect calculation (not in top 8)
    expect(result.averageOfficeDays).toBe(4.375);
    expect(result.isValid).toBe(true); // 87.5% > 60%
  });
});
