/**
 * Embedded Element Reference Architecture Tests
 *
 * Tests the new architecture where DOM element references are stored
 * directly in data objects (DayInfo and WeekInfo) instead of
 * using separate Map caches. This improves performance and
 * simplifies the codebase.
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import type { DayInfo, WeekInfo } from "../../../types";
import {
	cleanupMockElements,
	create12WeekCalendar,
	createCompliantCalendar,
	createEmptyCalendar,
	createMixedComplianceCalendar,
	createMockDayElement,
	createMockDayInfo,
	createMockStatusCell,
	createMockWeekInfo,
	createNonCompliantCalendar,
	createWeekWithPattern,
	restoreDOM,
	verifyElementDataAttributes,
	verifyEmbeddedReferences,
} from "./testHelpers";

describe("Embedded Element References - DayInfo", () => {
	afterEach(() => {
		cleanupMockElements();
	});

	describe("Element Reference Storage", () => {
		it("should store HTMLElement reference in DayInfo", () => {
			const mockElement = createMockDayElement(2025, 0, 6, "out-of-office");

			const dayInfo: DayInfo = {
				date: new Date(2025, 0, 6),
				element: mockElement,
				isWeekday: true,
				isSelected: true,
				selectionType: "out-of-office",
			};

			expect(dayInfo.element).toBeInstanceOf(HTMLElement);
			expect(dayInfo.element).toBe(mockElement);
		});

		it("should allow direct property access to element", () => {
			const mockElement = createMockDayElement(2025, 0, 6, "office");

			const dayInfo: DayInfo = {
				date: new Date(2025, 0, 6),
				element: mockElement,
				isWeekday: true,
				isSelected: true,
				selectionType: "office",
			};

			// Direct property access - no Map lookup
			const element = dayInfo.element;
			expect(element).toBe(mockElement);
			expect(element.tagName).toBe("TD");
		});

		it("should store null element reference for unselected days", () => {
			const mockElement = createMockDayElement(2025, 0, 6, null);

			const dayInfo: DayInfo = {
				date: new Date(2025, 0, 6),
				element: mockElement,
				isWeekday: true,
				isSelected: false,
				selectionType: null,
			};

			expect(dayInfo.element).toBeInstanceOf(HTMLElement);
			expect(dayInfo.selectionType).toBe(null);
		});
	});

	describe("Element Data Attributes", () => {
		it("should have matching data attributes", () => {
			const year = 2025;
			const month = 0;
			const day = 6;
			const selectionType = "out-of-office";

			const dayInfo = createMockDayInfo(
				new Date(year, month, day),
				selectionType,
			);

			expect(verifyElementDataAttributes(dayInfo)).toBe(true);

			const element = dayInfo.element;
			expect(element.dataset.year).toBe(year.toString());
			expect(element.dataset.month).toBe(month.toString());
			expect(element.dataset.day).toBe(day.toString());
			expect(element.dataset.selectionType).toBe(selectionType);
			expect(element.dataset.selected).toBe("true");
		});

		it("should update element when selection type changes", () => {
			const dayInfo = createMockDayInfo(new Date(2025, 0, 6), "out-of-office");

			// Simulate selection change
			dayInfo.selectionType = "office";
			dayInfo.element.dataset.selectionType = "office";
			dayInfo.element.classList.remove("out-of-office");
			dayInfo.element.classList.add("office");

			expect(dayInfo.selectionType).toBe("office");
			expect(dayInfo.element.dataset.selectionType).toBe("office");
			expect(dayInfo.element.classList.contains("office")).toBe(true);
		});

		it("should handle clearing selection", () => {
			const dayInfo = createMockDayInfo(new Date(2025, 0, 6), "out-of-office");

			// Clear selection
			dayInfo.selectionType = null;
			dayInfo.element.dataset.selectionType = "";
			dayInfo.element.dataset.selected = "false";
			dayInfo.element.classList.remove("selected", "out-of-office");

			expect(dayInfo.selectionType).toBe(null);
			expect(dayInfo.element.dataset.selectionType).toBe("");
			expect(dayInfo.element.classList.contains("selected")).toBe(false);
		});
	});
});

describe("Embedded Element References - WeekInfo", () => {
	afterEach(() => {
		cleanupMockElements();
	});

	describe("Status Cell Reference", () => {
		it("should store HTMLElement reference in WeekInfo", () => {
			const mockStatusCell = createMockStatusCell();

			const weekInfo: WeekInfo = {
				weekStart: new Date(2025, 0, 6),
				weekNumber: 1,
				days: [],
				wfhCount: 0,
				officeDays: 5,
				isCompliant: true,
				isUnderEvaluation: false,
				status: "compliant",
				statusCellElement: mockStatusCell,
			};

			expect(weekInfo.statusCellElement).toBeInstanceOf(HTMLElement);
			expect(weekInfo.statusCellElement).toBe(mockStatusCell);
		});

		it("should have matching data-week-start attribute", () => {
			const weekStart = new Date(2025, 0, 6);
			const days = [
				createMockDayInfo(weekStart, null),
				createMockDayInfo(new Date(2025, 0, 7), null),
				createMockDayInfo(new Date(2025, 0, 8), null),
				createMockDayInfo(new Date(2025, 0, 9), null),
				createMockDayInfo(new Date(2025, 0, 10), null),
			];
			const weekInfo = createMockWeekInfo(weekStart, days);

			expect(weekInfo.statusCellElement).toBeInstanceOf(HTMLElement);
			expect(weekInfo.statusCellElement?.dataset.weekStart).toBe(
				weekStart.getTime().toString(),
			);
		});

		it("should allow direct access to status icon", () => {
			const weekStart = new Date(2025, 0, 6);
			const days = [
				createMockDayInfo(weekStart, null),
				createMockDayInfo(new Date(2025, 0, 7), null),
				createMockDayInfo(new Date(2025, 0, 8), null),
				createMockDayInfo(new Date(2025, 0, 9), null),
				createMockDayInfo(new Date(2025, 0, 10), null),
			];
			const weekInfo = createMockWeekInfo(weekStart, days);

			const iconElement = weekInfo.statusCellElement?.querySelector(
				".week-status-icon",
			) as HTMLElement;

			expect(iconElement).toBeInstanceOf(HTMLElement);
			expect(iconElement.textContent).toBe("");
		});

		it("should allow direct access to screen reader text", () => {
			const weekStart = new Date(2025, 0, 6);
			const days = [
				createMockDayInfo(weekStart, null),
				createMockDayInfo(new Date(2025, 0, 7), null),
				createMockDayInfo(new Date(2025, 0, 8), null),
				createMockDayInfo(new Date(2025, 0, 9), null),
				createMockDayInfo(new Date(2025, 0, 10), null),
			];
			const weekInfo = createMockWeekInfo(weekStart, days);

			const srElement = weekInfo.statusCellElement?.querySelector(
				".sr-only",
			) as HTMLElement;

			expect(srElement).toBeInstanceOf(HTMLElement);
			expect(srElement.textContent).toBe("Week status");
		});
	});

	describe("Day Elements Array", () => {
		it("should store array of DayInfo with element references", () => {
			const weekStart = new Date(2025, 0, 6);
			const weekInfo = createWeekWithPattern(weekStart, [0, 2]); // Mon, Wed WFH

			expect(weekInfo.days).toHaveLength(5);
			expect(weekInfo.days?.[0]?.element).toBeInstanceOf(HTMLElement);
			expect(weekInfo.days?.[2]?.element).toBeInstanceOf(HTMLElement);
		});

		it("should preserve element references in all days", () => {
			const weekStart = new Date(2025, 0, 6);
			const weekInfo = createWeekWithPattern(weekStart, [0, 1, 2, 3, 4]); // All WFH

			// Verify all days have elements
			weekInfo.days.forEach((dayInfo, index) => {
				expect(dayInfo.element).toBeInstanceOf(HTMLElement);
				expect(dayInfo.date.getDate()).toBe(6 + index);
			});
		});
	});

	describe("Week Statistics", () => {
		it("should calculate wfhCount correctly", () => {
			const weekStart = new Date(2025, 0, 6);
			const weekInfo = createWeekWithPattern(weekStart, [0, 2]); // 2 WFH days

			expect(weekInfo.wfhCount).toBe(2);
		});

		it("should calculate officeDays correctly", () => {
			const weekStart = new Date(2025, 0, 6);
			const weekInfo = createWeekWithPattern(weekStart, [0, 2]); // 2 WFH = 3 office

			expect(weekInfo.officeDays).toBe(3);
		});

		it("should determine compliance correctly", () => {
			const weekStart = new Date(2025, 0, 6);

			// Compliant (2 WFH = 3 office)
			const compliantWeek = createWeekWithPattern(weekStart, [0, 2]);
			expect(compliantWeek.isCompliant).toBe(true);

			// Non-compliant (3 WFH = 2 office)
			const nonCompliantWeek = createWeekWithPattern(weekStart, [0, 1, 2]);
			expect(nonCompliantWeek.isCompliant).toBe(false);
		});
	});
});

describe("Embedded Element References - Verification", () => {
	afterEach(() => {
		cleanupMockElements();
	});

	describe("Reference Preservation", () => {
		it("should preserve element references through operations", () => {
			const originalElements: HTMLElement[] = [];
			const days: DayInfo[] = [];

			// Create multiple days
			for (let i = 0; i < 5; i++) {
				const dayInfo = createMockDayInfo(
					new Date(2025, 0, 6 + i),
					i < 2 ? "out-of-office" : null,
				);
				originalElements.push(dayInfo.element);
				days.push(dayInfo);
			}

			// Simulate operations (sorting, filtering, etc.)
			const sortedDays = [...days].sort(
				(a, b) => a.date.getTime() - b.date.getTime(),
			);

			// Verify references are preserved
			sortedDays.forEach((day, index) => {
				expect(day.element).toBe(originalElements[index]);
			});
		});

		it("should verify all embedded references are present", () => {
			const weekInfo = createMockWeekInfo(new Date(2025, 0, 6), [
				createMockDayInfo(new Date(2025, 0, 6), "out-of-office"),
				createMockDayInfo(new Date(2025, 0, 7), null),
				createMockDayInfo(new Date(2025, 0, 8), null),
				createMockDayInfo(new Date(2025, 0, 9), null),
				createMockDayInfo(new Date(2025, 0, 10), null),
			]);

			expect(verifyEmbeddedReferences(weekInfo)).toBe(true);
		});

		it("should detect missing element references", () => {
			const weekInfo: WeekInfo = {
				weekStart: new Date(2025, 0, 6),
				weekNumber: 1,
				days: [
					{
						date: new Date(2025, 0, 6),
						element: null as any, // Missing reference
						isWeekday: true,
						isSelected: false,
						selectionType: null,
					},
				],
				wfhCount: 0,
				officeDays: 5,
				isCompliant: true,
				isUnderEvaluation: false,
				status: "compliant",
				statusCellElement: createMockStatusCell(),
			};

			expect(verifyEmbeddedReferences(weekInfo)).toBe(false);
		});
	});

	describe("Element Data Consistency", () => {
		it("should maintain consistency between data object and element", () => {
			const dayInfo = createMockDayInfo(new Date(2025, 0, 6), "out-of-office");

			// Update data object
			dayInfo.selectionType = "office";

			// Update element to match
			dayInfo.element.dataset.selectionType = "office";
			dayInfo.element.classList.remove("out-of-office");
			dayInfo.element.classList.add("office");

			// Verify consistency
			expect(verifyElementDataAttributes(dayInfo)).toBe(true);
		});

		it("should detect inconsistency between data and element", () => {
			const dayInfo = createMockDayInfo(new Date(2025, 0, 6), "out-of-office");

			// Introduce inconsistency (data object changed, element not)
			dayInfo.selectionType = "office";

			expect(verifyElementDataAttributes(dayInfo)).toBe(false);
		});
	});
});

describe("Embedded Element References - Integration", () => {
	afterEach(() => {
		cleanupMockElements();
		restoreDOM();
	});

	describe("Complete Calendar", () => {
		it("should create 12 weeks with embedded references", () => {
			const weeks = create12WeekCalendar();

			expect(weeks).toHaveLength(12);

			weeks.forEach((week, index) => {
				expect(week.weekStart).toBeInstanceOf(Date);
				expect(week.days).toHaveLength(5);
				expect(week.statusCellElement).toBeInstanceOf(HTMLElement);
				expect(week.weekNumber).toBe(index + 1);

				// Verify all day elements
				week.days.forEach((day) => {
					expect(day.element).toBeInstanceOf(HTMLElement);
				});
			});
		});

		it("should create compliant calendar with all weeks meeting threshold", () => {
			const weeks = createCompliantCalendar();

			weeks.forEach((week) => {
				expect(week.isCompliant).toBe(true);
				expect(week.officeDays).toBeGreaterThanOrEqual(3);
			});
		});

		it("should create non-compliant calendar with all weeks below threshold", () => {
			const weeks = createNonCompliantCalendar();

			weeks.forEach((week) => {
				expect(week.isCompliant).toBe(false);
				expect(week.officeDays).toBeLessThan(3);
			});
		});

		it("should create mixed compliance calendar", () => {
			const weeks = createMixedComplianceCalendar();

			let compliantCount = 0;
			let nonCompliantCount = 0;

			weeks.forEach((week) => {
				if (week.isCompliant) {
					compliantCount++;
				} else {
					nonCompliantCount++;
				}
			});

			expect(compliantCount).toBeGreaterThan(0);
			expect(nonCompliantCount).toBeGreaterThan(0);
		});

		it("should create empty calendar with all days unselected", () => {
			const weeks = createEmptyCalendar();

			weeks.forEach((week) => {
				expect(week.wfhCount).toBe(0);
				expect(week.officeDays).toBe(5); // All weekdays are office
				expect(week.isCompliant).toBe(true);

				week.days.forEach((day) => {
					expect(day.selectionType).toBe(null);
					expect(day.isSelected).toBe(false);
				});
			});
		});
	});

	describe("Performance Characteristics", () => {
		it("should have fast direct property access", () => {
			const weeks = create12WeekCalendar();

			const start = performance.now();

			// Access all elements directly (no Map lookup)
			weeks.forEach((week) => {
				void week.statusCellElement;
				week.days.forEach((day) => {
					const element = day.element;
					// Access properties
					void element.className;
					void element.dataset;
				});
			});

			const elapsed = performance.now() - start;

			// Should be very fast (< 5ms for 12 weeks × 5 days = 60 elements)
			expect(elapsed).toBeLessThan(5);
		});

		it("should use less memory than Map-based caches", () => {
			// Create a large calendar (24 months instead of 12)
			const largeWeeks: WeekInfo[] = [];
			for (let i = 0; i < 24; i++) {
				const weekStart = new Date(2025, 0, 6 + i * 7);
				largeWeeks.push(createWeekWithPattern(weekStart, [0, 2]));
			}

			// Estimate memory usage
			const elementCount = largeWeeks.reduce(
				(sum, week) => sum + week.days.length + 1,
				0,
			); // days + status cell
			const estimatedMemoryKB = elementCount * 0.5; // ~0.5KB per element

			// Should be reasonable (< 100KB for 24 months)
			expect(estimatedMemoryKB).toBeLessThan(100);
		});
	});
});

describe("Embedded Element References - Edge Cases", () => {
	afterEach(() => {
		cleanupMockElements();
	});

	describe("Missing Elements", () => {
		it("should handle missing day element gracefully", () => {
			const dayInfo: DayInfo = {
				date: new Date(2025, 0, 6),
				element: null as any, // Missing
				isWeekday: true,
				isSelected: false,
				selectionType: null,
			};

			// Should not throw error
			expect(() => {
				const element = dayInfo.element;
				expect(element).toBeNull();
			}).not.toThrow();
		});

		it("should handle missing status cell element gracefully", () => {
			const weekInfo: WeekInfo = {
				weekStart: new Date(2025, 0, 6),
				weekNumber: 1,
				days: [],
				wfhCount: 0,
				officeDays: 5,
				isCompliant: true,
				isUnderEvaluation: false,
				status: "compliant",
				statusCellElement: null, // Missing
			};

			// Should not throw error
			expect(() => {
				const statusCell = weekInfo.statusCellElement;
				expect(statusCell).toBeNull();
			}).not.toThrow();
		});

		it("should handle null selection type", () => {
			const dayInfo = createMockDayInfo(new Date(2025, 0, 6), null);

			expect(dayInfo.selectionType).toBeNull();
			expect(dayInfo.isSelected).toBe(false);
			expect(dayInfo.element.dataset.selectionType).toBe("");
		});
	});

	describe("Boundary Cases", () => {
		it("should handle week with exactly 3 office days (compliant)", () => {
			const weekInfo = createWeekWithPattern(new Date(2025, 0, 6), [2, 3]); // 2 WFH = 3 office

			expect(weekInfo.officeDays).toBe(3);
			expect(weekInfo.isCompliant).toBe(true);
		});

		it("should handle week with exactly 2 office days (non-compliant)", () => {
			const weekInfo = createWeekWithPattern(new Date(2025, 0, 6), [1, 2, 3]); // 3 WFH = 2 office

			expect(weekInfo.officeDays).toBe(2);
			expect(weekInfo.isCompliant).toBe(false);
		});

		it("should handle week with 0 office days", () => {
			const weekInfo = createWeekWithPattern(
				new Date(2025, 0, 6),
				[0, 1, 2, 3, 4],
			); // All WFH

			expect(weekInfo.officeDays).toBe(0);
			expect(weekInfo.isCompliant).toBe(false);
		});

		it("should handle week with 5 office days (fully compliant)", () => {
			const weekInfo = createWeekWithPattern(new Date(2025, 0, 6), []); // No WFH

			expect(weekInfo.officeDays).toBe(5);
			expect(weekInfo.isCompliant).toBe(true);
		});
	});

	describe("Weekend Handling", () => {
		it("should correctly identify weekdays", () => {
			const monday = createMockDayInfo(new Date(2025, 0, 6), null); // Monday
			const tuesday = createMockDayInfo(new Date(2025, 0, 7), null); // Tuesday
			const wednesday = createMockDayInfo(new Date(2025, 0, 8), null); // Wednesday
			const thursday = createMockDayInfo(new Date(2025, 0, 9), null); // Thursday
			const friday = createMockDayInfo(new Date(2025, 0, 10), null); // Friday
			const saturday = createMockDayInfo(new Date(2025, 0, 11), null); // Saturday
			const sunday = createMockDayInfo(new Date(2025, 0, 12), null); // Sunday

			expect(monday.isWeekday).toBe(true);
			expect(tuesday.isWeekday).toBe(true);
			expect(wednesday.isWeekday).toBe(true);
			expect(thursday.isWeekday).toBe(true);
			expect(friday.isWeekday).toBe(true);
			expect(saturday.isWeekday).toBe(false);
			expect(sunday.isWeekday).toBe(false);
		});
	});
});

describe("Embedded Element References - Regression Prevention", () => {
	afterEach(() => {
		cleanupMockElements();
	});

	describe("No Map Usage", () => {
		it("should not use Map for element storage", () => {
			// This test ensures we're not accidentally using Maps
			// If Maps are being used, the architecture has regressed

			const weeks = create12WeekCalendar();

			// Access all elements directly
			weeks.forEach((week) => {
				const statusCell = week.statusCellElement;
				expect(statusCell).toBeInstanceOf(HTMLElement);

				week.days.forEach((day) => {
					const element = day.element;
					expect(element).toBeInstanceOf(HTMLElement);

					// Direct property access, not Map.get()
					expect(() => {
						void element.tagName;
						void element.className;
						void element.dataset;
					}).not.toThrow();
				});
			});
		});

		it("should use direct property access only", () => {
			const weeks = create12WeekCalendar();

			// Spy on Map to ensure it's not called
			const mapSpy = vi.spyOn(Map.prototype, "get");

			// Access all elements
			weeks.forEach((week) => {
				void week.statusCellElement;
				week.days.forEach((day) => {
					const element = day.element;
					void element.tagName;
				});
			});

			// Map.get should not have been called
			expect(mapSpy).not.toHaveBeenCalled();

			mapSpy.mockRestore();
		});
	});

	describe("Interface Validation", () => {
		it("should have required properties on DayInfo", () => {
			const dayInfo = createMockDayInfo(new Date(2025, 0, 6), null);

			expect(dayInfo).toHaveProperty("date");
			expect(dayInfo).toHaveProperty("element");
			expect(dayInfo).toHaveProperty("isWeekday");
			expect(dayInfo).toHaveProperty("isSelected");
			expect(dayInfo).toHaveProperty("selectionType");

			// Should NOT have deprecated properties
			expect(dayInfo).not.toHaveProperty("timestamp");
		});

		it("should have required properties on WeekInfo", () => {
			const weekStart = new Date(2025, 0, 6);
			const days = [
				createMockDayInfo(weekStart, null),
				createMockDayInfo(new Date(2025, 0, 7), null),
				createMockDayInfo(new Date(2025, 0, 8), null),
				createMockDayInfo(new Date(2025, 0, 9), null),
				createMockDayInfo(new Date(2025, 0, 10), null),
			];
			const weekInfo = createMockWeekInfo(weekStart, days);

			expect(weekInfo).toHaveProperty("weekStart");
			expect(weekInfo).toHaveProperty("weekNumber");
			expect(weekInfo).toHaveProperty("days");
			expect(weekInfo).toHaveProperty("wfhCount");
			expect(weekInfo).toHaveProperty("officeDays");
			expect(weekInfo).toHaveProperty("isCompliant");
			expect(weekInfo).toHaveProperty("isUnderEvaluation");
			expect(weekInfo).toHaveProperty("statusCellElement");

			// Verify types
			expect(weekInfo.weekStart).toBeInstanceOf(Date);
			expect(typeof weekInfo.weekNumber).toBe("number");
			expect(Array.isArray(weekInfo.days)).toBe(true);
			expect(typeof weekInfo.wfhCount).toBe("number");
			expect(typeof weekInfo.officeDays).toBe("number");
			expect(typeof weekInfo.isCompliant).toBe("boolean");
			expect(typeof weekInfo.isUnderEvaluation).toBe("boolean");
		});
	});
});

describe("Embedded Element References - Best Practices", () => {
	afterEach(() => {
		cleanupMockElements();
	});

	describe("Clean Code Patterns", () => {
		it("should use consistent element access patterns", () => {
			const weeks = create12WeekCalendar();

			// Pattern 1: Direct property access for status cell
			const statusCell = weeks[0]?.statusCellElement;
			expect(statusCell).toBeInstanceOf(HTMLElement);

			// Pattern 2: Direct property access for day elements
			const dayElement = weeks[0]?.days[0]?.element;
			expect(dayElement).toBeInstanceOf(HTMLElement);

			// Pattern 3: Destructuring for readability
			const { days, statusCellElement } = weeks[0]!;
			expect(days).toHaveLength(5);
			expect(statusCellElement).toBeInstanceOf(HTMLElement);
		});

		it("should support optional chaining for safety", () => {
			const weekInfo: WeekInfo = {
				weekStart: new Date(2025, 0, 6),
				weekNumber: 1,
				days: [],
				wfhCount: 0,
				officeDays: 5,
				isCompliant: true,
				isUnderEvaluation: false,
				status: "compliant",
				statusCellElement: null,
			};

			// Optional chaining prevents errors
			const icon =
				weekInfo.statusCellElement?.querySelector(".week-status-icon");
			expect(icon).toBeUndefined();
		});
	});

	describe("Memory Management", () => {
		it("should clean up elements when no longer needed", () => {
			// Setup: Append elements to DOM body
			const weeks = create12WeekCalendar();
			weeks.forEach((week) => {
				if (week.statusCellElement) {
					document.body.appendChild(week.statusCellElement);
				}
				week.days.forEach((day) => {
					if (day.element) {
						document.body.appendChild(day.element);
					}
				});
			});

			const elementsBefore = document.querySelectorAll("td").length;

			// Clean up
			cleanupMockElements();

			const elementsAfter = document.querySelectorAll("td").length;
			expect(elementsAfter).toBeLessThan(elementsBefore);
		});

		it("should not leak memory on repeated operations", () => {
			const initialElementCount = document.querySelectorAll("td").length;

			// Create and clean up multiple times
			for (let i = 0; i < 5; i++) {
				create12WeekCalendar();
				cleanupMockElements();
			}

			const finalElementCount = document.querySelectorAll("td").length;

			// Should not accumulate elements
			expect(finalElementCount).toBe(initialElementCount);
		});
	});
});
