/**
 * Status Details Module Tests
 *
 * Tests for extracted StatusDetails functions.
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type {
	AnnotatedWeek,
	ComplianceEventData,
} from "../../lib/auto-compliance";
import {
	getStatusColor,
	renderWindowBreakdown,
	updateStats,
} from "../status-details";

// ─── Test Fixtures ───────────────────────────────────────────────────────

function createMockWeek(overrides: Partial<AnnotatedWeek> = {}): AnnotatedWeek {
	return {
		weekStart: new Date(2025, 0, 6), // Jan 6, 2025 (local time)
		officeDays: 3,
		oofCount: 0,
		holidayCount: 0,
		sickCount: 0,
		isBest: true,
		isIgnored: false,
		isCompliant: true,
		...overrides,
	};
}

function createMockComplianceData(
	overrides: Partial<ComplianceEventData> = {},
): ComplianceEventData {
	return {
		windowWeeks: [createMockWeek()],
		bestWeekCount: 8,
		averageOfficeDays: 3.5,
		goodWeeks: 10,
		bufferWeeks: 2,
		nextWfhWeek: null,
		currentWeek: {
			weekStart: new Date(2025, 0, 6), // Jan 6, 2025 (local time)
			weekEnd: new Date(2025, 0, 12), // Jan 12, 2025 (local time)
			officeDays: 3,
		},
		totalWfhDays: 5,
		totalHolidayDays: 0,
		totalSickDays: 0,
		totalWorkingDays: 55,
		isCompliant: true,
		compliancePercentage: 100,
		message: "Compliant",
		slidingWindowResult: {
			isValid: true,
			message: "Compliant",
			overallCompliance: 100,
			windowStart: new Date(2025, 0, 6).getTime(),
			windowWeekStarts: [new Date(2025, 0, 6).getTime()],
			evaluatedWeekStarts: [new Date(2025, 0, 6).getTime()],
			invalidWeekStart: null,
		},
		roundPercentage: true,
		totalWeeks: 12,
		requiredDays: 3,
		...overrides,
	};
}

// ─── Tests ────────────────────────────────────────────────────────────────

describe("status-details module", () => {
	describe("getStatusColor", () => {
		it("should return success color when current >= target", () => {
			expect(getStatusColor(3, 3)).toBe("has-text-success");
			expect(getStatusColor(4, 3)).toBe("has-text-success");
		});

		it("should return warning color when within 0.5 of target", () => {
			expect(getStatusColor(2.5, 3)).toBe("has-text-warning");
			expect(getStatusColor(2.6, 3)).toBe("has-text-warning");
		});

		it("should return danger color when below target by more than 0.5", () => {
			expect(getStatusColor(2, 3)).toBe("has-text-danger");
			expect(getStatusColor(0, 3)).toBe("has-text-danger");
		});
	});

	describe("renderWindowBreakdown", () => {
		let mockContent: HTMLElement;
		let mockLabel: HTMLElement;

		beforeEach(() => {
			// Create mock DOM elements
			document.body.innerHTML = `
				<div id="window-breakdown-label"></div>
				<div id="window-breakdown-content"></div>
			`;
			mockContent = document.getElementById("window-breakdown-content")!;
			mockLabel = document.getElementById("window-breakdown-label")!;
		});

		afterEach(() => {
			document.body.innerHTML = "";
		});

		it("should render empty message when no weeks data", () => {
			const data = createMockComplianceData({ windowWeeks: [] });
			renderWindowBreakdown(data);

			expect(mockContent.innerHTML).toContain(
				"Mark dates to see window breakdown",
			);
			expect(mockLabel.textContent).toBe("Mark dates to see window breakdown");
		});

		it("should not throw if content element is missing", () => {
			document.body.innerHTML = "";
			const data = createMockComplianceData();

			expect(() => renderWindowBreakdown(data)).not.toThrow();
		});

		it("should render PASS tag when compliant", () => {
			const data = createMockComplianceData({ isCompliant: true });
			renderWindowBreakdown(data);

			expect(mockContent.innerHTML).toContain("PASS");
			expect(mockContent.innerHTML).toContain("wb-row-tag--pass");
		});

		it("should render FAIL tag when not compliant", () => {
			const data = createMockComplianceData({ isCompliant: false });
			renderWindowBreakdown(data);

			expect(mockContent.innerHTML).toContain("FAIL");
			expect(mockContent.innerHTML).toContain("wb-row-tag--fail");
		});

		it("should render dots for each week", () => {
			const weeks = [
				createMockWeek({ weekStart: new Date(2025, 0, 6), officeDays: 3 }),
				createMockWeek({ weekStart: new Date(2025, 0, 13), officeDays: 4 }),
				createMockWeek({ weekStart: new Date(2025, 0, 20), officeDays: 2 }),
			];
			const data = createMockComplianceData({ windowWeeks: weeks });

			renderWindowBreakdown(data);

			// Should have 3 dot elements
			const dots = mockContent.querySelectorAll(".we-dot");
			expect(dots).toHaveLength(3);
		});

		it("should render correct dot classes for compliant best weeks", () => {
			const weeks = [createMockWeek({ isBest: true, isCompliant: true })];
			const data = createMockComplianceData({ windowWeeks: weeks });

			renderWindowBreakdown(data);

			expect(mockContent.innerHTML).toContain("we-dot--best-ok");
		});

		it("should render correct dot classes for non-compliant best weeks", () => {
			const weeks = [createMockWeek({ isBest: true, isCompliant: false })];
			const data = createMockComplianceData({ windowWeeks: weeks });

			renderWindowBreakdown(data);

			expect(mockContent.innerHTML).toContain("we-dot--best-bad");
		});

		it("should render correct dot classes for dropped weeks", () => {
			const weeks = [
				createMockWeek({ isBest: false, isCompliant: true }),
				createMockWeek({ isBest: false, isCompliant: false }),
			];
			const data = createMockComplianceData({ windowWeeks: weeks });

			renderWindowBreakdown(data);

			expect(mockContent.innerHTML).toContain("we-dot--drop-ok");
			expect(mockContent.innerHTML).toContain("we-dot--drop-bad");
		});

		it("should display average office days", () => {
			const data = createMockComplianceData({ averageOfficeDays: 3.75 });
			renderWindowBreakdown(data);

			expect(mockContent.innerHTML).toContain("3.8");
		});
	});

	describe("updateStats", () => {
		beforeEach(() => {
			// Create mock DOM structure
			document.body.innerHTML = `
				<div id="stat-buffer"></div>
				<div id="stat-oof-available"></div>
				<div id="stat-next-wfh"></div>
				<div id="stat-current-week-range"></div>
				<div id="stat-current-week-days"></div>
				<div id="current-week-office"></div>
				<div id="buffer-warning" style="display: none;"></div>
				<div id="compliance-label"></div>
				<div id="compliance-status-box" class="box compliance-status"></div>
				<div id="window-breakdown-content"></div>
				<div id="window-breakdown-label"></div>
			`;
		});

		afterEach(() => {
			document.body.innerHTML = "";
		});

		it("should update buffer stats", () => {
			const data = createMockComplianceData({
				goodWeeks: 8,
				bestWeekCount: 8,
			});
			updateStats(data);

			const el = document.getElementById("stat-buffer");
			expect(el?.textContent).toBe("Good weeks = 8 of 8 needed");
		});

		it("should update OOF available stats", () => {
			const data = createMockComplianceData({ bufferWeeks: 3 });
			updateStats(data);

			const el = document.getElementById("stat-oof-available");
			expect(el?.textContent).toBe("3 full weeks WFH");
		});

		it("should update next WFH week display", () => {
			const nextWeek = new Date(2025, 1, 10); // Feb 10, 2025 (local time)
			const data = createMockComplianceData({ nextWfhWeek: nextWeek });
			updateStats(data);

			const el = document.getElementById("stat-next-wfh");
			expect(el?.textContent).toBe("Week of Feb 10, 2025");
		});

		it("should show em-dash when no next WFH week available", () => {
			const data = createMockComplianceData({ nextWfhWeek: null });
			updateStats(data);

			const el = document.getElementById("stat-next-wfh");
			expect(el?.textContent).toBe("\u2014");
		});

		it("should update current week range", () => {
			const data = createMockComplianceData({
				currentWeek: {
					weekStart: new Date(2025, 0, 13), // Jan 13, 2025 (local time)
					weekEnd: new Date(2025, 0, 19), // Jan 19, 2025 (local time)
					officeDays: 3,
				},
			});
			updateStats(data);

			const el = document.getElementById("stat-current-week-range");
			expect(el?.textContent).toBe("Jan 13, 2025 - Jan 19, 2025");
		});

		it("should update current week office days with correct color", () => {
			const data = createMockComplianceData({
				currentWeek: {
					weekStart: new Date("2025-01-06"),
					weekEnd: new Date("2025-01-12"),
					officeDays: 3,
				},
				requiredDays: 3,
			});
			updateStats(data);

			const elDays = document.getElementById("stat-current-week-days");
			const elOffice = document.getElementById("current-week-office");

			expect(elOffice?.textContent).toBe("3");
			expect(elDays?.className).toContain("has-text-success");
		});

		it("should show buffer warning when 1 buffer week and multiple drop slots", () => {
			const weeks = [
				createMockWeek({ isBest: true }),
				createMockWeek({ isBest: true }),
				createMockWeek({ isBest: true }),
				createMockWeek({ isBest: false, isCompliant: true }),
				createMockWeek({ isBest: false, isCompliant: true }),
			];
			const data = createMockComplianceData({
				windowWeeks: weeks,
				bestWeekCount: 3,
				bufferWeeks: 1,
				isCompliant: true,
			});
			updateStats(data);

			const el = document.getElementById("buffer-warning");
			expect(el?.style.display).toBe("");
		});

		it("should hide buffer warning when not 1 buffer week", () => {
			const data = createMockComplianceData({
				bufferWeeks: 2,
				isCompliant: true,
			});
			updateStats(data);

			const el = document.getElementById("buffer-warning");
			expect(el?.style.display).toBe("none");
		});

		it("should update compliance status box to success when compliant", () => {
			const data = createMockComplianceData({ isCompliant: true });
			updateStats(data);

			const el = document.getElementById("compliance-status-box");
			expect(el?.className).toContain("is-success");
		});

		it("should update compliance status box to warning when not compliant", () => {
			const data = createMockComplianceData({ isCompliant: false });
			updateStats(data);

			const el = document.getElementById("compliance-status-box");
			expect(el?.className).toContain("is-warning");
		});
	});

	describe("StatusDetailsController", () => {
		let controllerContainer: HTMLElement;

		beforeEach(() => {
			// Create mock DOM structure with a container
			document.body.innerHTML = `
				<div class="status-details" id="controller-container">
					<div id="stat-buffer"></div>
					<div id="stat-oof-available"></div>
					<div id="stat-next-wfh"></div>
					<div id="stat-current-week-range"></div>
					<div id="stat-current-week-days"></div>
					<div id="current-week-office"></div>
					<div id="buffer-warning" style="display: none;"></div>
					<div id="compliance-label"></div>
					<div id="compliance-status-box" class="box compliance-status"></div>
					<div id="window-breakdown-content"></div>
					<div id="window-breakdown-label"></div>
				</div>
			`;
			controllerContainer = document.getElementById(
				"controller-container",
			)! as HTMLElement;
		});

		afterEach(() => {
			document.body.innerHTML = "";
		});

		describe("constructor", () => {
			it("should accept a container element", async () => {
				const { StatusDetailsController } = await import("../status-details");
				const controller = new StatusDetailsController(controllerContainer);
				expect(controller).toBeDefined();
			});
		});

		describe("init", () => {
			it("should subscribe to compliance events", async () => {
				const { StatusDetailsController } = await import("../status-details");
				const controller = new StatusDetailsController(controllerContainer);
				controller.init();

				// Controller should have subscribed (verified by checking destroy works)
				controller.destroy();
			});
		});

		describe("destroy", () => {
			it("should clean up without error", async () => {
				const { StatusDetailsController } = await import("../status-details");
				const controller = new StatusDetailsController(controllerContainer);
				controller.init();

				// Should not throw
				expect(() => controller.destroy()).not.toThrow();
			});

			it("should be safe to call destroy multiple times", async () => {
				const { StatusDetailsController } = await import("../status-details");
				const controller = new StatusDetailsController(controllerContainer);
				controller.init();

				controller.destroy();
				controller.destroy(); // Second call should not throw

				expect(true).toBe(true);
			});
		});

		describe("updateStats", () => {
			it("should update elements within container scope", async () => {
				const { StatusDetailsController } = await import("../status-details");
				const controller = new StatusDetailsController(controllerContainer);
				controller.init();

				const data = createMockComplianceData({
					goodWeeks: 7,
					bestWeekCount: 8,
				});
				controller.updateStats(data);

				const el = controllerContainer.querySelector("#stat-buffer");
				expect(el?.textContent).toBe("Good weeks = 7 of 8 needed");

				controller.destroy();
			});

			it("should not affect elements outside container", async () => {
				// Add another element outside the container
				const outsideEl = document.createElement("div");
				outsideEl.id = "stat-buffer";
				outsideEl.textContent = "outside";
				document.body.appendChild(outsideEl);

				const { StatusDetailsController } = await import("../status-details");
				const controller = new StatusDetailsController(controllerContainer);
				controller.init();

				const data = createMockComplianceData({
					goodWeeks: 5,
					bestWeekCount: 8,
				});
				controller.updateStats(data);

				// Outside element should not be affected
				expect(outsideEl.textContent).toBe("outside");

				// Container element should be updated
				const insideEl = controllerContainer.querySelector("#stat-buffer");
				expect(insideEl?.textContent).toBe("Good weeks = 5 of 8 needed");

				controller.destroy();
			});
		});

		describe("renderWindowBreakdown", () => {
			it("should render dots within container scope", async () => {
				const { StatusDetailsController } = await import("../status-details");
				const controller = new StatusDetailsController(controllerContainer);
				controller.init();

				const weeks = [
					createMockWeek({ weekStart: new Date(2025, 0, 6), officeDays: 3 }),
					createMockWeek({ weekStart: new Date(2025, 0, 13), officeDays: 4 }),
				];
				const data = createMockComplianceData({ windowWeeks: weeks });
				controller.renderWindowBreakdown(data);

				const dots = controllerContainer.querySelectorAll(".we-dot");
				expect(dots).toHaveLength(2);

				controller.destroy();
			});
		});
	});
});
