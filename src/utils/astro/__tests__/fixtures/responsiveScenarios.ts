/**
 * Responsive Test Scenarios and Fixtures
 *
 * Shared test fixtures for both unit and E2E tests covering responsive behavior,
 * viewport configurations, validation scenarios, and interaction types.
 *
 * These fixtures align with E2E test scenarios to ensure consistency.
 */

import type { DaySelection } from "../../../../lib/validation/rto-core";
import { createDaySelection } from "../../../../lib/validation/rto-core";

// ============================================================================
// Viewport Configurations (Aligned with E2E)
// ============================================================================

/**
 * Standard viewport sizes for responsive testing
 */
export const VIEWPORT_CONFIGS = {
	MOBILE: {
		width: 375,
		height: 667,
		name: "mobile",
		description: "iPhone SE / Small mobile devices",
		userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)",
		deviceScaleFactor: 2,
		isMobile: true,
		hasTouch: true,
	},
	TABLET: {
		width: 768,
		height: 1024,
		name: "tablet",
		description: "iPad Mini / Tablets",
		userAgent: "Mozilla/5.0 (iPad; CPU OS 16_0 like Mac OS X)",
		deviceScaleFactor: 2,
		isMobile: true,
		hasTouch: true,
	},
	DESKTOP: {
		width: 1920,
		height: 1080,
		name: "desktop",
		description: "Full HD Desktop",
		userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
		deviceScaleFactor: 1,
		isMobile: false,
		hasTouch: false,
	},
	LAPTOP: {
		width: 1366,
		height: 768,
		name: "laptop",
		description: "Standard laptop resolution",
		userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
		deviceScaleFactor: 1,
		isMobile: false,
		hasTouch: false,
	},
} as const;

export type ViewportConfig =
	(typeof VIEWPORT_CONFIGS)[keyof typeof VIEWPORT_CONFIGS];

// ============================================================================
// Responsive Breakpoints
// ============================================================================

/**
 * CSS breakpoint definitions aligned with app styles
 */
export const RESPONSIVE_BREAKPOINTS = {
	MOBILE_MAX: 640, // sm breakpoint
	TABLET_MAX: 1024, // lg breakpoint
	DESKTOP_MIN: 1025,
} as const;

/**
 * Determine device type from viewport width
 * Uses early exit pattern for clarity
 */
export function getDeviceTypeFromWidth(
	width: number,
): "mobile" | "tablet" | "desktop" {
	if (width <= RESPONSIVE_BREAKPOINTS.MOBILE_MAX) return "mobile";
	if (width <= RESPONSIVE_BREAKPOINTS.TABLET_MAX) return "tablet";
	return "desktop";
}

/**
 * Check if viewport supports touch interactions
 */
export function isTouchDevice(viewport: ViewportConfig): boolean {
	return viewport.hasTouch;
}

/**
 * Check if viewport requires compact UI layout
 */
export function requiresCompactLayout(width: number): boolean {
	return width < RESPONSIVE_BREAKPOINTS.TABLET_MAX;
}

// ============================================================================
// Validation Scenarios (60% RTO Compliance Threshold)
// ============================================================================

/**
 * Validation scenario types aligned with E2E tests
 */
export type ValidationScenarioType =
	| "compliant"
	| "borderline"
	| "perfect"
	| "violation";

interface ValidationScenario {
	type: ValidationScenarioType;
	description: string;
	wfhDaysPerWeek: number;
	expectedCompliance: number;
	isValid: boolean;
}

/**
 * Pre-defined validation scenarios matching E2E test data
 */
export const VALIDATION_SCENARIOS: Record<
	ValidationScenarioType,
	ValidationScenario
> = {
	compliant: {
		type: "compliant",
		description: "60% compliance - exactly at threshold (3 office days)",
		wfhDaysPerWeek: 2,
		expectedCompliance: 60,
		isValid: true,
	},
	borderline: {
		type: "borderline",
		description: "40% compliance - just below threshold (2 office days)",
		wfhDaysPerWeek: 3,
		expectedCompliance: 40,
		isValid: false,
	},
	perfect: {
		type: "perfect",
		description: "100% compliance - all office days",
		wfhDaysPerWeek: 0,
		expectedCompliance: 100,
		isValid: true,
	},
	violation: {
		type: "violation",
		description: "0% compliance - all WFH days",
		wfhDaysPerWeek: 5,
		expectedCompliance: 0,
		isValid: false,
	},
} as const;

// ============================================================================
// Interaction Types
// ============================================================================

/**
 * Supported interaction types for device-appropriate testing
 */
export const INTERACTION_TYPES = {
	TOUCH: {
		name: "touch",
		supportedDevices: ["mobile", "tablet"] as string[],
		events: ["touchstart", "touchmove", "touchend", "tap"],
	},
	MOUSE: {
		name: "mouse",
		supportedDevices: ["desktop", "laptop"] as string[],
		events: ["mousedown", "mousemove", "mouseup", "click", "dblclick"],
	},
	KEYBOARD: {
		name: "keyboard",
		supportedDevices: ["mobile", "tablet", "desktop", "laptop"] as string[],
		events: ["keydown", "keyup", "keypress"],
	},
	POINTER: {
		name: "pointer",
		supportedDevices: ["mobile", "tablet", "desktop", "laptop"] as string[],
		events: ["pointerdown", "pointermove", "pointerup"],
	},
} as const;

export type InteractionType =
	(typeof INTERACTION_TYPES)[keyof typeof INTERACTION_TYPES];

/**
 * Check if an interaction type is supported on a device
 */
export function isInteractionSupported(
	interactionType: InteractionType,
	deviceType: string,
): boolean {
	return interactionType.supportedDevices.indexOf(deviceType) >= 0;
}

// ============================================================================
// Expected UI States by Viewport
// ============================================================================

/**
 * UI state configurations for each viewport type
 */
export const UI_STATES_BY_VIEWPORT = {
	MOBILE: {
		calendarLayout: "stacked",
		weekLabelsVisible: false,
		selectionMode: "touch",
		statusIconSize: "small",
		messagePosition: "bottom",
		compactMetrics: true,
		maxVisibleWeeks: 4,
	},
	TABLET: {
		calendarLayout: "grid",
		weekLabelsVisible: true,
		selectionMode: "touch",
		statusIconSize: "medium",
		messagePosition: "top",
		compactMetrics: false,
		maxVisibleWeeks: 8,
	},
	DESKTOP: {
		calendarLayout: "full",
		weekLabelsVisible: true,
		selectionMode: "mouse",
		statusIconSize: "large",
		messagePosition: "top",
		compactMetrics: false,
		maxVisibleWeeks: 12,
	},
} as const;

export type UIState =
	(typeof UI_STATES_BY_VIEWPORT)[keyof typeof UI_STATES_BY_VIEWPORT];

/**
 * Get expected UI state for a viewport configuration
 */
export function getExpectedUIState(viewport: ViewportConfig): UIState {
	const deviceType = getDeviceTypeFromWidth(viewport.width);

	switch (deviceType) {
		case "mobile":
			return UI_STATES_BY_VIEWPORT.MOBILE;
		case "tablet":
			return UI_STATES_BY_VIEWPORT.TABLET;
		default:
			return UI_STATES_BY_VIEWPORT.DESKTOP;
	}
}

// ============================================================================
// Test Data Generators
// ============================================================================

/**
 * Generate DaySelection objects for a validation scenario
 */
export function generateSelectionsForScenario(
	scenario: ValidationScenario,
	weekCount: number = 8,
	startWeek: number = 1,
): DaySelection[] {
	const selections: DaySelection[] = [];
	const baseDate = new Date(2025, 0, 6); // Monday, Jan 6, 2025

	for (let week = 0; week < weekCount; week++) {
		const weekStart = new Date(baseDate);
		weekStart.setDate(baseDate.getDate() + (startWeek - 1 + week) * 7);

		// Add WFH days based on scenario
		for (let day = 0; day < scenario.wfhDaysPerWeek; day++) {
			selections.push(
				createDaySelection(
					weekStart.getFullYear(),
					weekStart.getMonth(),
					weekStart.getDate() + day,
					"out-of-office",
				),
			);
		}
	}

	return selections;
}

/**
 * Create a complete test scenario with viewport, validation, and UI state
 */
export interface CompleteTestScenario {
	name: string;
	viewport: ViewportConfig;
	validationScenario: ValidationScenario;
	expectedUIState: UIState;
	selections: DaySelection[];
}

/**
 * Generate all combinations of viewport and validation scenarios
 */
export function generateAllTestScenarios(): CompleteTestScenario[] {
	const scenarios: CompleteTestScenario[] = [];
	const viewportKeys: Array<keyof typeof VIEWPORT_CONFIGS> = [
		"MOBILE",
		"TABLET",
		"DESKTOP",
		"LAPTOP",
	];
	const validationKeys: Array<keyof typeof VALIDATION_SCENARIOS> = [
		"compliant",
		"borderline",
		"perfect",
		"violation",
	];

	for (const viewportKey of viewportKeys) {
		for (const validationKey of validationKeys) {
			const viewport = VIEWPORT_CONFIGS[viewportKey];
			const validation = VALIDATION_SCENARIOS[validationKey];
			scenarios.push({
				name: `${viewport.name} - ${validation.type}`,
				viewport,
				validationScenario: validation,
				expectedUIState: getExpectedUIState(viewport),
				selections: generateSelectionsForScenario(validation),
			});
		}
	}

	return scenarios;
}

// ============================================================================
// Mock Window/Viewport Helpers
// ============================================================================

/**
 * Mock window dimensions for testing
 */
export function mockWindowDimensions(
	width: number,
	height: number,
): () => void {
	const originalInnerWidth = window.innerWidth;
	const originalInnerHeight = window.innerHeight;

	Object.defineProperty(window, "innerWidth", {
		writable: true,
		configurable: true,
		value: width,
	});

	Object.defineProperty(window, "innerHeight", {
		writable: true,
		configurable: true,
		value: height,
	});

	// Return cleanup function (Law of Atomic Predictability)
	return () => {
		Object.defineProperty(window, "innerWidth", {
			writable: true,
			configurable: true,
			value: originalInnerWidth,
		});
		Object.defineProperty(window, "innerHeight", {
			writable: true,
			configurable: true,
			value: originalInnerHeight,
		});
	};
}

/**
 * Mock matchMedia for responsive breakpoint testing
 */
export function mockMatchMedia(
	matches: boolean,
	media: string = "",
): () => void {
	const originalMatchMedia = window.matchMedia;

	window.matchMedia = vi.fn().mockImplementation((query: string) => ({
		matches: matches && (media ? query.indexOf(media) >= 0 : true),
		media: query,
		onchange: null,
		addListener: vi.fn(),
		removeListener: vi.fn(),
		addEventListener: vi.fn(),
		removeEventListener: vi.fn(),
		dispatchEvent: vi.fn(),
	}));

	return () => {
		window.matchMedia = originalMatchMedia;
	};
}

// ============================================================================
// Pre-built Test Scenarios for Common Cases
// ============================================================================

/**
 * Mobile compliant scenario - for E2E alignment
 */
export const MOBILE_COMPLIANT_SCENARIO: CompleteTestScenario = {
	name: "Mobile - Compliant (60%)",
	viewport: VIEWPORT_CONFIGS.MOBILE,
	validationScenario: VALIDATION_SCENARIOS.compliant,
	expectedUIState: UI_STATES_BY_VIEWPORT.MOBILE,
	selections: generateSelectionsForScenario(VALIDATION_SCENARIOS.compliant),
};

/**
 * Desktop violation scenario - for E2E alignment
 */
export const DESKTOP_VIOLATION_SCENARIO: CompleteTestScenario = {
	name: "Desktop - Violation (40%)",
	viewport: VIEWPORT_CONFIGS.DESKTOP,
	validationScenario: VALIDATION_SCENARIOS.borderline,
	expectedUIState: UI_STATES_BY_VIEWPORT.DESKTOP,
	selections: generateSelectionsForScenario(VALIDATION_SCENARIOS.borderline),
};

/**
 * Tablet perfect scenario - for E2E alignment
 */
export const TABLET_PERFECT_SCENARIO: CompleteTestScenario = {
	name: "Tablet - Perfect (100%)",
	viewport: VIEWPORT_CONFIGS.TABLET,
	validationScenario: VALIDATION_SCENARIOS.perfect,
	expectedUIState: UI_STATES_BY_VIEWPORT.TABLET,
	selections: generateSelectionsForScenario(VALIDATION_SCENARIOS.perfect),
};

/**
 * All pre-built scenarios for easy iteration
 */
export const PREBUILT_SCENARIOS = [
	MOBILE_COMPLIANT_SCENARIO,
	DESKTOP_VIOLATION_SCENARIO,
	TABLET_PERFECT_SCENARIO,
] as const;

// ============================================================================
// Test Helper Functions
// ============================================================================

/**
 * Simulate resize event for testing responsive behavior
 */
export function simulateResize(width: number, height: number): void {
	mockWindowDimensions(width, height);
	window.dispatchEvent(new Event("resize"));
}

/**
 * Get responsive class names based on viewport
 */
export function getResponsiveClasses(deviceType: string): {
	container: string;
	calendar: string;
	message: string;
} {
	const baseClasses = {
		container: "rto-calculator",
		calendar: "calendar-grid",
		message: "validation-message",
	};

	switch (deviceType) {
		case "mobile":
			return {
				...baseClasses,
				container: `${baseClasses.container} mobile-layout`,
			};
		case "tablet":
			return {
				...baseClasses,
				container: `${baseClasses.container} tablet-layout`,
			};
		default:
			return baseClasses;
	}
}

// Import vi for mock functions
declare const vi: typeof import("vitest").vi;
