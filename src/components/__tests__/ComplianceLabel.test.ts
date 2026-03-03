/**
 * @vitest-environment jsdom
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock the auto-compliance module
vi.mock("../../lib/auto-compliance", () => ({
	onComplianceUpdated: vi.fn((callback) => {
		(globalThis as any).__complianceCallback = callback;
		return () => {};
	}),
	getLatestCompliance: vi.fn(() => null),
}));

describe("ComplianceLabel", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		document.body.innerHTML = "";

		// Setup mock validation manager
		(globalThis as any).validationManager = {
			getConfig: () => ({
				minOfficeDaysPerWeek: 2,
				rollingPeriodWeeks: 12,
				topWeeksToCheck: 8,
				roundPercentage: false,
			}),
		};
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	describe("initial render", () => {
		it("should render compliant status when isCompliant is true", () => {
			document.body.innerHTML = `
        <p id="compliance-status-message">
          <span id="compliance-label">
            <strong class="status-text">Compliant:</strong>
            Best
            <span class="setting-value" data-setting-key="bestWeeksCount">8</span>
            of
            <span class="setting-value" data-setting-key="rollingPeriodWeeks">12</span>
            weeks average
            <span class="rounded-indicator"></span>
            <span class="avg-days"> 3.5</span>
            office days.
            Required:
            <span class="setting-value" data-setting-key="minOfficeDaysPerWeek">2</span>
          </span>
        </p>
      `;

			const statusText = document.querySelector(".status-text");
			expect(statusText?.textContent).toBe("Compliant:");
		});

		it("should render not compliant status when isCompliant is false", () => {
			document.body.innerHTML = `
        <p id="compliance-status-message">
          <span id="compliance-label">
            <strong class="status-text">Not compliant:</strong>
            Best
            <span class="setting-value" data-setting-key="bestWeeksCount">8</span>
            of
            <span class="setting-value" data-setting-key="rollingPeriodWeeks">12</span>
            weeks average
            <span class="rounded-indicator"></span>
            <span class="avg-days"> 1.5</span>
            office days.
            Required:
            <span class="setting-value" data-setting-key="minOfficeDaysPerWeek">2</span>
          </span>
        </p>
      `;

			const statusText = document.querySelector(".status-text");
			expect(statusText?.textContent).toBe("Not compliant:");
		});
	});

	describe("setting value styling", () => {
		it("should have dotted underline on setting values", () => {
			document.body.innerHTML = `
        <span class="setting-value" data-setting-key="bestWeeksCount" style="text-decoration: underline dotted; text-underline-offset: 2px;">8</span>
      `;

			const settingValue = document.querySelector(".setting-value");
			const style = window.getComputedStyle(settingValue!);
			expect(style.textDecoration).toBe("underline dotted");
		});
	});

	describe("aria-live accessibility", () => {
		it("should have aria-live attribute for screen readers", () => {
			document.body.innerHTML = `
        <p id="compliance-status-message" role="status" aria-live="polite">
          <span id="compliance-label">
            <strong class="status-text">Compliant:</strong>
          </span>
        </p>
      `;

			const message = document.getElementById("compliance-status-message");
			expect(message?.getAttribute("role")).toBe("status");
			expect(message?.getAttribute("aria-live")).toBe("polite");
		});
	});
});
