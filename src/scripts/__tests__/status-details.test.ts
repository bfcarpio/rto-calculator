/**
 * Status Details Module Tests
 *
 * Tests for extracted StatusDetails functions.
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { ComplianceEventData } from "../../lib/auto-compliance";
import { parseLocalDate } from "../../lib/date-helpers";
import type { WindowWeekDetail } from "../../lib/validation/all-windows";
import type { RTOPolicyConfig } from "../../lib/validation/rto-core";
import {
	getStatusColor,
	renderWindowBreakdown,
	updateStats,
} from "../status-details";

// ─── Test Fixtures ───────────────────────────────────────────────────────

const MOCK_POLICY: RTOPolicyConfig = {
	minOfficeDaysPerWeek: 3,
	totalWeekdaysPerWeek: 5,
	thresholdPercentage: 60,
	rollingPeriodWeeks: 12,
	topWeeksToCheck: 8,
	roundPercentage: true,
};

function createMockWeekDetail(
	overrides: Partial<WindowWeekDetail> = {},
): WindowWeekDetail {
	return {
		weekStart: new Date(2025, 0, 5), // Jan 5, 2025 (Sunday)
		officeDays: 3,
		isBest: true,
		isCompliant: true,
		...overrides,
	};
}

function createMockComplianceData(
	overrides: Partial<ComplianceEventData> = {},
): ComplianceEventData {
	return {
		selectedSummary: {
			windowIndex: 0,
			windowStart: new Date(2025, 0, 5),
			windowEnd: new Date(2025, 2, 28),
			isValid: true,
			averageOfficeDays: 3.5,
			weekDetails: [createMockWeekDetail()],
		},
		bestWeekCount: 8,
		averageOfficeDays: 3.5,
		goodWeeks: 10,
		bufferWeeks: 2,
		nextWfhWeek: null,
		rangeLabel: "Jan 5 – Jan 10",
		currentWeek: {
			weekStart: new Date(2025, 0, 5),
			weekEnd: new Date(2025, 0, 10), // Friday after Sunday
			officeDays: 3,
		},
		totalWfhDays: 5,
		totalHolidayDays: 0,
		totalSickDays: 0,
		totalWorkingDays: 55,
		isCompliant: true,
		compliancePercentage: 100,
		message: "Compliant",
		roundPercentage: true,
		totalWeeks: 12,
		requiredDays: 3,
		allSummaries: [],
		policy: MOCK_POLICY,
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
			const data = createMockComplianceData({
				selectedSummary: {
					windowIndex: 0,
					windowStart: new Date(2025, 0, 5),
					windowEnd: new Date(2025, 0, 10),
					isValid: true,
					averageOfficeDays: 0,
					weekDetails: [],
				},
			});
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
			expect(mockContent.innerHTML).toContain("we-row-tag--pass");
		});

		it("should render FAIL tag when not compliant", () => {
			const data = createMockComplianceData({
				isCompliant: false,
				selectedSummary: {
					windowIndex: 0,
					windowStart: new Date(2025, 0, 5),
					windowEnd: new Date(2025, 2, 28),
					isValid: false,
					averageOfficeDays: 3.5,
					weekDetails: [createMockWeekDetail()],
				},
			});
			renderWindowBreakdown(data);

			expect(mockContent.innerHTML).toContain("FAIL");
			expect(mockContent.innerHTML).toContain("we-row-tag--fail");
		});

		it("should render dots for each week", () => {
			const weekDetails = [
				createMockWeekDetail({
					weekStart: new Date(2025, 0, 5),
					officeDays: 3,
				}),
				createMockWeekDetail({
					weekStart: new Date(2025, 0, 12),
					officeDays: 4,
				}),
				createMockWeekDetail({
					weekStart: new Date(2025, 0, 19),
					officeDays: 2,
				}),
			];
			const data = createMockComplianceData({
				selectedSummary: {
					windowIndex: 0,
					windowStart: new Date(2025, 0, 5),
					windowEnd: new Date(2025, 0, 24),
					isValid: true,
					averageOfficeDays: 3,
					weekDetails,
				},
			});

			renderWindowBreakdown(data);

			// Should have 3 dot elements
			const dots = mockContent.querySelectorAll(".we-dot");
			expect(dots).toHaveLength(3);
		});

		it("should render correct dot classes for compliant best weeks", () => {
			const weekDetails = [
				createMockWeekDetail({ isBest: true, isCompliant: true }),
			];
			const data = createMockComplianceData({
				selectedSummary: {
					windowIndex: 0,
					windowStart: new Date(2025, 0, 5),
					windowEnd: new Date(2025, 0, 10),
					isValid: true,
					averageOfficeDays: 3,
					weekDetails,
				},
			});

			renderWindowBreakdown(data);

			expect(mockContent.innerHTML).toContain("we-dot--best-ok");
		});

		it("should render correct dot classes for non-compliant best weeks", () => {
			const weekDetails = [
				createMockWeekDetail({ isBest: true, isCompliant: false }),
			];
			const data = createMockComplianceData({
				selectedSummary: {
					windowIndex: 0,
					windowStart: new Date(2025, 0, 5),
					windowEnd: new Date(2025, 0, 10),
					isValid: false,
					averageOfficeDays: 1,
					weekDetails,
				},
			});

			renderWindowBreakdown(data);

			expect(mockContent.innerHTML).toContain("we-dot--best-bad");
		});

		it("should render correct dot classes for dropped weeks", () => {
			const weekDetails = [
				createMockWeekDetail({ isBest: false, isCompliant: true }),
				createMockWeekDetail({ isBest: false, isCompliant: false }),
			];
			const data = createMockComplianceData({
				selectedSummary: {
					windowIndex: 0,
					windowStart: new Date(2025, 0, 5),
					windowEnd: new Date(2025, 0, 17),
					isValid: true,
					averageOfficeDays: 3,
					weekDetails,
				},
			});

			renderWindowBreakdown(data);

			expect(mockContent.innerHTML).toContain("we-dot--drop-ok");
			expect(mockContent.innerHTML).toContain("we-dot--drop-bad");
		});

		it("should display average office days", () => {
			const data = createMockComplianceData({
				selectedSummary: {
					windowIndex: 0,
					windowStart: new Date(2025, 0, 5),
					windowEnd: new Date(2025, 0, 10),
					isValid: true,
					averageOfficeDays: 3.75,
					weekDetails: [createMockWeekDetail()],
				},
			});
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
			const nextWeek = new Date(2025, 1, 9); // Feb 9, 2025 (Sunday)
			const data = createMockComplianceData({ nextWfhWeek: nextWeek });
			updateStats(data);

			const el = document.getElementById("stat-next-wfh");
			expect(el?.textContent).toBe("Week of Feb 9, 2025");
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
					weekStart: new Date(2025, 0, 12), // Jan 12, 2025 (Sunday)
					weekEnd: new Date(2025, 0, 17), // Jan 17, 2025 (Friday)
					officeDays: 3,
				},
			});
			updateStats(data);

			const el = document.getElementById("stat-current-week-range");
			expect(el?.textContent).toBe("Jan 12, 2025 - Jan 17, 2025");
		});

		it("should update current week office days with correct color", () => {
			const data = createMockComplianceData({
				currentWeek: {
					weekStart: parseLocalDate("2025-01-05"),
					weekEnd: parseLocalDate("2025-01-10"),
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
			const weekDetails = [
				createMockWeekDetail({ isBest: true }),
				createMockWeekDetail({ isBest: true }),
				createMockWeekDetail({ isBest: true }),
				createMockWeekDetail({ isBest: false, isCompliant: true }),
				createMockWeekDetail({ isBest: false, isCompliant: true }),
			];
			const data = createMockComplianceData({
				selectedSummary: {
					windowIndex: 0,
					windowStart: new Date(2025, 0, 5),
					windowEnd: new Date(2025, 1, 7),
					isValid: true,
					averageOfficeDays: 3,
					weekDetails,
				},
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

	describe("renderBreakdownInto via HTMLElement root", () => {
		/** Creates a container element with the required breakdown children. */
		function createTestContainer(): HTMLElement {
			const container = document.createElement("div");
			container.innerHTML = `
				<div id="window-breakdown-label"></div>
				<div id="window-breakdown-content"></div>
			`;
			return container;
		}

		it("should render empty message when no weeks data", async () => {
			const { StatusDetailsController } = await import("../status-details");
			const container = createTestContainer();
			const controller = new StatusDetailsController(container);
			const data = createMockComplianceData({
				selectedSummary: {
					windowIndex: 0,
					windowStart: new Date(2025, 0, 5),
					windowEnd: new Date(2025, 0, 10),
					isValid: true,
					averageOfficeDays: 0,
					weekDetails: [],
				},
			});

			controller.renderWindowBreakdown(data);

			const content = container.querySelector("#window-breakdown-content")!;
			const label = container.querySelector("#window-breakdown-label")!;
			expect(content.innerHTML).toContain("Mark dates to see window breakdown");
			expect(label.textContent).toBe("Mark dates to see window breakdown");
		});

		it("should render PASS tag when compliant via container root", async () => {
			const { StatusDetailsController } = await import("../status-details");
			const container = createTestContainer();
			const controller = new StatusDetailsController(container);
			const data = createMockComplianceData({ isCompliant: true });

			controller.renderWindowBreakdown(data);

			const content = container.querySelector("#window-breakdown-content")!;
			expect(content.innerHTML).toContain("PASS");
			expect(content.innerHTML).toContain("we-row-tag--pass");
		});

		it("should render FAIL tag when not compliant via container root", async () => {
			const { StatusDetailsController } = await import("../status-details");
			const container = createTestContainer();
			const controller = new StatusDetailsController(container);
			const data = createMockComplianceData({
				isCompliant: false,
				selectedSummary: {
					windowIndex: 0,
					windowStart: new Date(2025, 0, 5),
					windowEnd: new Date(2025, 2, 28),
					isValid: false,
					averageOfficeDays: 3.5,
					weekDetails: [createMockWeekDetail()],
				},
			});

			controller.renderWindowBreakdown(data);

			const content = container.querySelector("#window-breakdown-content")!;
			expect(content.innerHTML).toContain("FAIL");
			expect(content.innerHTML).toContain("we-row-tag--fail");
		});

		it("should render dots for each week via container root", async () => {
			const { StatusDetailsController } = await import("../status-details");
			const container = createTestContainer();
			const controller = new StatusDetailsController(container);

			const weekDetails = [
				createMockWeekDetail({
					weekStart: new Date(2025, 0, 5),
					officeDays: 3,
				}),
				createMockWeekDetail({
					weekStart: new Date(2025, 0, 12),
					officeDays: 4,
				}),
			];
			const data = createMockComplianceData({
				selectedSummary: {
					windowIndex: 0,
					windowStart: new Date(2025, 0, 5),
					windowEnd: new Date(2025, 0, 17),
					isValid: true,
					averageOfficeDays: 3.5,
					weekDetails,
				},
			});
			controller.renderWindowBreakdown(data);

			const dots = container.querySelectorAll(".we-dot");
			expect(dots).toHaveLength(2);
		});

		it("should not affect elements outside container", async () => {
			const { StatusDetailsController } = await import("../status-details");
			const container = createTestContainer();
			const controller = new StatusDetailsController(container);

			// Add a separate element with the same ID to document body
			const outsideContent = document.createElement("div");
			outsideContent.id = "window-breakdown-content";
			outsideContent.innerHTML = "outside";
			document.body.appendChild(outsideContent);

			const data = createMockComplianceData({ isCompliant: true });
			controller.renderWindowBreakdown(data);

			// Outside element should not be touched
			expect(outsideContent.innerHTML).toBe("outside");

			document.body.removeChild(outsideContent);
		});

		it("should not throw if content element is missing in container", async () => {
			const { StatusDetailsController } = await import("../status-details");
			const emptyContainer = document.createElement("div");
			const controller = new StatusDetailsController(emptyContainer);

			const data = createMockComplianceData();
			expect(() => controller.renderWindowBreakdown(data)).not.toThrow();
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

				const weekDetails = [
					createMockWeekDetail({
						weekStart: new Date(2025, 0, 5),
						officeDays: 3,
					}),
					createMockWeekDetail({
						weekStart: new Date(2025, 0, 12),
						officeDays: 4,
					}),
				];
				const data = createMockComplianceData({
					selectedSummary: {
						windowIndex: 0,
						windowStart: new Date(2025, 0, 5),
						windowEnd: new Date(2025, 0, 17),
						isValid: true,
						averageOfficeDays: 3.5,
						weekDetails,
					},
				});
				controller.renderWindowBreakdown(data);

				const dots = controllerContainer.querySelectorAll(".we-dot");
				expect(dots).toHaveLength(2);

				controller.destroy();
			});
		});
	});
});
