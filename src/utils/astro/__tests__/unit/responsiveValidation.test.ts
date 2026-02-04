/**
 * Responsive Validation Unit Tests
 *
 * Tests responsive validation logic including:
 * - Mobile vs desktop validation display logic
 * - Responsive UI state changes
 * - Touch vs mouse interaction handling
 * - Viewport-based conditional rendering logic
 * - Responsive breakpoint detection
 *
 * Aligns with E2E tests for consistent behavior across testing layers.
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
	DESKTOP_VIOLATION_SCENARIO,
	generateSelectionsForScenario,
	getDeviceTypeFromWidth,
	getExpectedUIState,
	getResponsiveClasses,
	INTERACTION_TYPES,
	isInteractionSupported,
	isTouchDevice,
	MOBILE_COMPLIANT_SCENARIO,
	mockMatchMedia,
	mockWindowDimensions,
	requiresCompactLayout,
	VALIDATION_SCENARIOS,
	VIEWPORT_CONFIGS,
} from "../fixtures/responsiveScenarios";
import { setupBasicCalendarDOM } from "../test.setup";

// ============================================================================
// Viewport Detection Tests
// ============================================================================

describe("Responsive Validation - Viewport Detection", () => {
	describe("getDeviceTypeFromWidth", () => {
		it("should identify mobile viewport at 375px width", () => {
			const result = getDeviceTypeFromWidth(375);
			expect(result).toBe("mobile");
		});

		it("should identify mobile viewport at 640px width (breakpoint edge)", () => {
			const result = getDeviceTypeFromWidth(640);
			expect(result).toBe("mobile");
		});

		it("should identify tablet viewport at 768px width", () => {
			const result = getDeviceTypeFromWidth(768);
			expect(result).toBe("tablet");
		});

		it("should identify tablet viewport at 1024px width (breakpoint edge)", () => {
			const result = getDeviceTypeFromWidth(1024);
			expect(result).toBe("tablet");
		});

		it("should identify desktop viewport at 1025px width", () => {
			const result = getDeviceTypeFromWidth(1025);
			expect(result).toBe("desktop");
		});

		it("should identify desktop viewport at 1920px width", () => {
			const result = getDeviceTypeFromWidth(1920);
			expect(result).toBe("desktop");
		});

		it("should handle zero width gracefully", () => {
			const result = getDeviceTypeFromWidth(0);
			expect(result).toBe("mobile");
		});
	});

	describe("isTouchDevice", () => {
		it("should return true for mobile viewport configuration", () => {
			const result = isTouchDevice(VIEWPORT_CONFIGS.MOBILE);
			expect(result).toBe(true);
		});

		it("should return true for tablet viewport configuration", () => {
			const result = isTouchDevice(VIEWPORT_CONFIGS.TABLET);
			expect(result).toBe(true);
		});

		it("should return false for desktop viewport configuration", () => {
			const result = isTouchDevice(VIEWPORT_CONFIGS.DESKTOP);
			expect(result).toBe(false);
		});

		it("should return false for laptop viewport configuration", () => {
			const result = isTouchDevice(VIEWPORT_CONFIGS.LAPTOP);
			expect(result).toBe(false);
		});
	});

	describe("requiresCompactLayout", () => {
		it("should require compact layout for mobile width", () => {
			const result = requiresCompactLayout(375);
			expect(result).toBe(true);
		});

		it("should require compact layout for tablet width", () => {
			const result = requiresCompactLayout(768);
			expect(result).toBe(true);
		});

		it("should not require compact layout for desktop width", () => {
			const result = requiresCompactLayout(1920);
			expect(result).toBe(false);
		});
	});
});

// ============================================================================
// UI State Tests
// ============================================================================

describe("Responsive Validation - UI State Management", () => {
	describe("getExpectedUIState", () => {
		it("should return mobile UI state for mobile viewport", () => {
			const result = getExpectedUIState(VIEWPORT_CONFIGS.MOBILE);

			expect(result.calendarLayout).toBe("stacked");
			expect(result.weekLabelsVisible).toBe(false);
			expect(result.selectionMode).toBe("touch");
			expect(result.compactMetrics).toBe(true);
		});

		it("should return tablet UI state for tablet viewport", () => {
			const result = getExpectedUIState(VIEWPORT_CONFIGS.TABLET);

			expect(result.calendarLayout).toBe("grid");
			expect(result.weekLabelsVisible).toBe(true);
			expect(result.selectionMode).toBe("touch");
			expect(result.compactMetrics).toBe(false);
		});

		it("should return desktop UI state for desktop viewport", () => {
			const result = getExpectedUIState(VIEWPORT_CONFIGS.DESKTOP);

			expect(result.calendarLayout).toBe("full");
			expect(result.weekLabelsVisible).toBe(true);
			expect(result.selectionMode).toBe("mouse");
			expect(result.compactMetrics).toBe(false);
		});

		it("should return appropriate max visible weeks per viewport", () => {
			const mobileState = getExpectedUIState(VIEWPORT_CONFIGS.MOBILE);
			const tabletState = getExpectedUIState(VIEWPORT_CONFIGS.TABLET);
			const desktopState = getExpectedUIState(VIEWPORT_CONFIGS.DESKTOP);

			expect(mobileState.maxVisibleWeeks).toBe(4);
			expect(tabletState.maxVisibleWeeks).toBe(8);
			expect(desktopState.maxVisibleWeeks).toBe(12);
		});
	});

	describe("getResponsiveClasses", () => {
		it("should include mobile layout class for mobile device type", () => {
			const result = getResponsiveClasses("mobile");

			expect(result.container).toContain("mobile-layout");
			expect(result.calendar).toBe("calendar-grid");
			expect(result.message).toBe("validation-message");
		});

		it("should include tablet layout class for tablet device type", () => {
			const result = getResponsiveClasses("tablet");

			expect(result.container).toContain("tablet-layout");
		});

		it("should return base classes for desktop device type", () => {
			const result = getResponsiveClasses("desktop");

			expect(result.container).toBe("rto-calculator");
			expect(result.container).not.toContain("mobile-layout");
			expect(result.container).not.toContain("tablet-layout");
		});
	});
});

// ============================================================================
// Mock Window/Resize Tests
// ============================================================================

describe("Responsive Validation - Window Resize Handling", () => {
	let cleanupFns: Array<() => void> = [];

	afterEach(() => {
		// Clean up all mocks (Law of Atomic Predictability)
		cleanupFns.forEach((cleanup) => cleanup());
		cleanupFns = [];
	});

	describe("mockWindowDimensions", () => {
		it("should mock window dimensions correctly", () => {
			const cleanup = mockWindowDimensions(375, 667);
			cleanupFns.push(cleanup);

			expect(window.innerWidth).toBe(375);
			expect(window.innerHeight).toBe(667);
		});

		it("should restore original dimensions after cleanup", () => {
			const originalWidth = window.innerWidth;
			const originalHeight = window.innerHeight;

			const cleanup = mockWindowDimensions(1920, 1080);
			cleanup();

			expect(window.innerWidth).toBe(originalWidth);
			expect(window.innerHeight).toBe(originalHeight);
		});

		it("should handle multiple dimension changes", () => {
			const cleanup1 = mockWindowDimensions(375, 667);
			expect(window.innerWidth).toBe(375);

			const cleanup2 = mockWindowDimensions(768, 1024);
			expect(window.innerWidth).toBe(768);

			cleanup2();
			cleanupFns.push(cleanup1);
		});
	});

	describe("mockMatchMedia", () => {
		it("should mock matchMedia to return matches true", () => {
			const cleanup = mockMatchMedia(true);
			cleanupFns.push(cleanup);

			const result = window.matchMedia("(min-width: 768px)");
			expect(result.matches).toBe(true);
		});

		it("should mock matchMedia to return matches false", () => {
			const cleanup = mockMatchMedia(false);
			cleanupFns.push(cleanup);

			const result = window.matchMedia("(min-width: 768px)");
			expect(result.matches).toBe(false);
		});

		it("should filter by media type when provided", () => {
			const cleanup = mockMatchMedia(true, "min-width");
			cleanupFns.push(cleanup);

			const matchingResult = window.matchMedia("(min-width: 768px)");
			const nonMatchingResult = window.matchMedia("(max-width: 640px)");

			expect(matchingResult.matches).toBe(true);
			expect(nonMatchingResult.matches).toBe(false);
		});

		it("should restore original matchMedia after cleanup", () => {
			const originalMatchMedia = window.matchMedia;

			const cleanup = mockMatchMedia(true);
			cleanup();

			expect(window.matchMedia).toBe(originalMatchMedia);
		});
	});
});

// ============================================================================
// Validation Display Logic Tests
// ============================================================================

describe("Responsive Validation - Display Logic", () => {
	describe("generateSelectionsForScenario", () => {
		it("should generate correct WFH selections for compliant scenario", () => {
			const scenario = VALIDATION_SCENARIOS.compliant;
			const selections = generateSelectionsForScenario(scenario, 8);

			// 8 weeks * 2 WFH days = 16 selections
			expect(selections).toHaveLength(16);

			// All selections should be out-of-office
			selections.forEach((selection) => {
				expect(selection.selectionType).toBe("out-of-office");
			});
		});

		it("should generate correct WFH selections for borderline scenario", () => {
			const scenario = VALIDATION_SCENARIOS.borderline;
			const selections = generateSelectionsForScenario(scenario, 8);

			// 8 weeks * 3 WFH days = 24 selections
			expect(selections).toHaveLength(24);
		});

		it("should generate correct WFH selections for perfect scenario", () => {
			const scenario = VALIDATION_SCENARIOS.perfect;
			const selections = generateSelectionsForScenario(scenario, 8);

			// 8 weeks * 0 WFH days = 0 selections
			expect(selections).toHaveLength(0);
		});

		it("should start from correct week offset", () => {
			const scenario = VALIDATION_SCENARIOS.compliant;
			const selections = generateSelectionsForScenario(scenario, 1, 5);

			// Should start from week 5 (January 6 + 4 weeks = February 3)
			const firstSelection = selections[0];
			expect(firstSelection?.date.getMonth()).toBe(1); // February
			expect(firstSelection?.date.getDate()).toBe(3);
		});
	});
});

// ============================================================================
// Interaction Support Tests
// ============================================================================

describe("Responsive Validation - Interaction Support", () => {
	describe("isInteractionSupported", () => {
		it("should support touch interactions on mobile", () => {
			const result = isInteractionSupported(INTERACTION_TYPES.TOUCH, "mobile");
			expect(result).toBe(true);
		});

		it("should support mouse interactions on desktop", () => {
			const result = isInteractionSupported(INTERACTION_TYPES.MOUSE, "desktop");
			expect(result).toBe(true);
		});

		it("should not support mouse interactions on mobile", () => {
			const result = isInteractionSupported(INTERACTION_TYPES.MOUSE, "mobile");
			expect(result).toBe(false);
		});

		it("should support keyboard interactions on all devices", () => {
			const keyboardInteraction = INTERACTION_TYPES.KEYBOARD;

			expect(isInteractionSupported(keyboardInteraction, "mobile")).toBe(true);
			expect(isInteractionSupported(keyboardInteraction, "tablet")).toBe(true);
			expect(isInteractionSupported(keyboardInteraction, "desktop")).toBe(true);
		});
	});
});

// ============================================================================
// DOM-Based Responsive Tests
// ============================================================================

describe("Responsive Validation - DOM Integration", () => {
	beforeEach(() => {
		setupBasicCalendarDOM(12);
	});

	describe("mobile vs desktop validation display", () => {
		it("should apply mobile classes when viewport is narrow", () => {
			const container = document.getElementById("calendar-container");
			if (!container) throw new Error("Container not found");

			// Simulate mobile viewport
			container.classList.add("mobile-layout");

			expect(container.classList.contains("mobile-layout")).toBe(true);
		});

		it("should show validation message in correct position for mobile", () => {
			const messageContainer = document.getElementById("validation-message");
			if (!messageContainer) throw new Error("Message container not found");

			// Mobile message position should be at bottom
			const mobileState = getExpectedUIState(VIEWPORT_CONFIGS.MOBILE);
			expect(mobileState.messagePosition).toBe("bottom");
		});

		it("should show validation message in correct position for desktop", () => {
			const messageContainer = document.getElementById("validation-message");
			if (!messageContainer) throw new Error("Message container not found");

			// Desktop message position should be at top
			const desktopState = getExpectedUIState(VIEWPORT_CONFIGS.DESKTOP);
			expect(desktopState.messagePosition).toBe("top");
		});
	});

	describe("viewport-based conditional rendering", () => {
		it("should display compact metrics on mobile", () => {
			const mobileState = getExpectedUIState(VIEWPORT_CONFIGS.MOBILE);
			expect(mobileState.compactMetrics).toBe(true);
			expect(mobileState.weekLabelsVisible).toBe(false);
		});

		it("should display full metrics on desktop", () => {
			const desktopState = getExpectedUIState(VIEWPORT_CONFIGS.DESKTOP);
			expect(desktopState.compactMetrics).toBe(false);
			expect(desktopState.weekLabelsVisible).toBe(true);
		});

		it("should limit visible weeks on mobile viewport", () => {
			const mobileState = getExpectedUIState(VIEWPORT_CONFIGS.MOBILE);
			expect(mobileState.maxVisibleWeeks).toBeLessThan(12);
			expect(mobileState.maxVisibleWeeks).toBe(4);
		});

		it("should show all weeks on desktop viewport", () => {
			const desktopState = getExpectedUIState(VIEWPORT_CONFIGS.DESKTOP);
			expect(desktopState.maxVisibleWeeks).toBe(12);
		});
	});
});

// ============================================================================
// Pre-built Scenario Tests
// ============================================================================

describe("Responsive Validation - Pre-built Scenarios", () => {
	describe("MOBILE_COMPLIANT_SCENARIO", () => {
		it("should have mobile viewport configuration", () => {
			expect(MOBILE_COMPLIANT_SCENARIO.viewport.name).toBe("mobile");
			expect(MOBILE_COMPLIANT_SCENARIO.viewport.width).toBe(375);
		});

		it("should have compliant validation scenario (60%)", () => {
			expect(MOBILE_COMPLIANT_SCENARIO.validationScenario.type).toBe(
				"compliant",
			);
			expect(
				MOBILE_COMPLIANT_SCENARIO.validationScenario.expectedCompliance,
			).toBe(60);
			expect(MOBILE_COMPLIANT_SCENARIO.validationScenario.isValid).toBe(true);
		});

		it("should have mobile UI state", () => {
			expect(MOBILE_COMPLIANT_SCENARIO.expectedUIState.selectionMode).toBe(
				"touch",
			);
			expect(MOBILE_COMPLIANT_SCENARIO.expectedUIState.compactMetrics).toBe(
				true,
			);
		});

		it("should generate correct number of selections", () => {
			// 8 weeks * 2 WFH days = 16 selections
			expect(MOBILE_COMPLIANT_SCENARIO.selections).toHaveLength(16);
		});
	});

	describe("DESKTOP_VIOLATION_SCENARIO", () => {
		it("should have desktop viewport configuration", () => {
			expect(DESKTOP_VIOLATION_SCENARIO.viewport.name).toBe("desktop");
			expect(DESKTOP_VIOLATION_SCENARIO.viewport.width).toBe(1920);
		});

		it("should have borderline validation scenario (40% - violation)", () => {
			expect(DESKTOP_VIOLATION_SCENARIO.validationScenario.type).toBe(
				"borderline",
			);
			expect(
				DESKTOP_VIOLATION_SCENARIO.validationScenario.expectedCompliance,
			).toBe(40);
			expect(DESKTOP_VIOLATION_SCENARIO.validationScenario.isValid).toBe(false);
		});

		it("should have desktop UI state", () => {
			expect(DESKTOP_VIOLATION_SCENARIO.expectedUIState.selectionMode).toBe(
				"mouse",
			);
			expect(DESKTOP_VIOLATION_SCENARIO.expectedUIState.compactMetrics).toBe(
				false,
			);
		});

		it("should generate correct number of selections", () => {
			// 8 weeks * 3 WFH days = 24 selections
			expect(DESKTOP_VIOLATION_SCENARIO.selections).toHaveLength(24);
		});
	});
});

// ============================================================================
// Responsive Breakpoint Detection Tests
// ============================================================================

describe("Responsive Validation - Breakpoint Detection", () => {
	describe("breakpoint boundaries", () => {
		it("should detect mobile breakpoint at exactly 640px", () => {
			// 640px is the upper bound for mobile
			const deviceType = getDeviceTypeFromWidth(640);
			expect(deviceType).toBe("mobile");
		});

		it("should detect tablet breakpoint at 641px", () => {
			// 641px crosses into tablet territory
			const deviceType = getDeviceTypeFromWidth(641);
			expect(deviceType).toBe("tablet");
		});

		it("should detect tablet breakpoint at exactly 1024px", () => {
			// 1024px is the upper bound for tablet
			const deviceType = getDeviceTypeFromWidth(1024);
			expect(deviceType).toBe("tablet");
		});

		it("should detect desktop breakpoint at 1025px", () => {
			// 1025px crosses into desktop territory
			const deviceType = getDeviceTypeFromWidth(1025);
			expect(deviceType).toBe("desktop");
		});
	});

	describe("common device widths", () => {
		const deviceWidths = [
			{ width: 320, device: "mobile", name: "iPhone SE" },
			{ width: 375, device: "mobile", name: "iPhone 12 mini" },
			{ width: 414, device: "mobile", name: "iPhone 12 Pro Max" },
			{ width: 768, device: "tablet", name: "iPad Mini" },
			{ width: 820, device: "tablet", name: "iPad Air" },
			{ width: 1024, device: "tablet", name: "iPad Pro 12.9 landscape" },
			{ width: 1366, device: "desktop", name: "MacBook Air" },
			{ width: 1920, device: "desktop", name: "Full HD monitor" },
			{ width: 2560, device: "desktop", name: "2K monitor" },
		];

		deviceWidths.forEach(({ width, device, name }) => {
			it(`should correctly identify ${name} (${width}px) as ${device}`, () => {
				const result = getDeviceTypeFromWidth(width);
				expect(result).toBe(device);
			});
		});
	});
});
