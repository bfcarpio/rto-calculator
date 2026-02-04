/**
 * Navigation Helpers Unit Tests
 *
 * Tests navigation utilities including:
 * - Navigation state management functions
 * - URL change detection utilities
 * - Navigation flow helpers
 * - Route parameter parsing
 * - History management
 *
 * Aligns with E2E navigation tests for consistent behavior.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// Navigation State Types
// ============================================================================

interface NavigationState {
	currentPath: string;
	previousPath: string | null;
	scrollPosition: number;
	isNavigating: boolean;
}

interface RouteParams {
	[key: string]: string | undefined;
}

// ============================================================================
// Navigation State Management Functions (to be tested)
// ============================================================================

function createNavigationState(
	currentPath: string,
	previousPath: string | null = null,
): NavigationState {
	return {
		currentPath,
		previousPath,
		scrollPosition: window.scrollY,
		isNavigating: false,
	};
}

function updateNavigationPath(
	state: NavigationState,
	newPath: string,
): NavigationState {
	return {
		...state,
		previousPath: state.currentPath,
		currentPath: newPath,
		scrollPosition: window.scrollY,
	};
}

function isPathChanged(state: NavigationState, newPath: string): boolean {
	return state.currentPath !== newPath;
}

function canGoBack(state: NavigationState): boolean {
	return state.previousPath !== null && state.previousPath !== "";
}

function startNavigation(state: NavigationState): NavigationState {
	return { ...state, isNavigating: true };
}

function endNavigation(state: NavigationState): NavigationState {
	return { ...state, isNavigating: false };
}

// ============================================================================
// URL Change Detection Functions
// ============================================================================

function hasQueryParamChanged(
	previousUrl: string,
	currentUrl: string,
	paramName: string,
): boolean {
	const prevParams = parseQueryParams(previousUrl);
	const currParams = parseQueryParams(currentUrl);
	return prevParams[paramName] !== currParams[paramName];
}

function hasHashChanged(previousUrl: string, currentUrl: string): boolean {
	const prevHash = extractHash(previousUrl);
	const currHash = extractHash(currentUrl);
	return prevHash !== currHash;
}

function hasPathChanged(previousUrl: string, currentUrl: string): boolean {
	const prevPath = extractPath(previousUrl);
	const currPath = extractPath(currentUrl);
	return prevPath !== currPath;
}

function extractPath(url: string): string {
	try {
		const urlObj = new URL(url, window.location.origin);
		return urlObj.pathname;
	} catch {
		// Fallback for relative URLs
		const parts = url.split("?")[0]?.split("#")[0] ?? "";
		return parts;
	}
}

function extractHash(url: string): string {
	const hashIndex = url.indexOf("#");
	return hashIndex >= 0 ? url.substring(hashIndex) : "";
}

function parseQueryParams(url: string): RouteParams {
	const params: RouteParams = {};
	try {
		const urlObj = new URL(url, window.location.origin);
		urlObj.searchParams.forEach((value, key) => {
			params[key] = value;
		});
	} catch {
		// Fallback for relative URLs
		const queryString = url.split("?")[1]?.split("#")[0] ?? "";
		const pairs = queryString.split("&");
		pairs.forEach((pair) => {
			const [key, value] = pair.split("=");
			if (key) {
				params[key] = value ? decodeURIComponent(value) : undefined;
			}
		});
	}
	return params;
}

// ============================================================================
// Route Parameter Parsing Functions
// ============================================================================

function parseRouteParams(path: string, pattern: string): RouteParams | null {
	const pathParts = path.split("/").filter(Boolean);
	const patternParts = pattern.split("/").filter(Boolean);

	if (pathParts.length !== patternParts.length) {
		return null;
	}

	const params: RouteParams = {};

	for (let i = 0; i < patternParts.length; i++) {
		const patternPart = patternParts[i];
		const pathPart = pathParts[i];

		if (!patternPart || !pathPart) return null;

		if (patternPart.startsWith(":")) {
			const paramName = patternPart.substring(1);
			params[paramName] = pathPart;
		} else if (patternPart !== pathPart) {
			return null;
		}
	}

	return params;
}

function buildUrlWithParams(
	basePath: string,
	params: RouteParams,
	queryParams?: RouteParams,
): string {
	let url = basePath;

	// Replace route params
	Object.entries(params).forEach(([key, value]) => {
		if (value !== undefined) {
			url = url.replace(`:${key}`, encodeURIComponent(value));
		}
	});

	// Add query params
	if (queryParams && Object.keys(queryParams).length > 0) {
		const queryString = Object.entries(queryParams)
			.filter(([, value]) => value !== undefined)
			.map(([key, value]) => `${key}=${encodeURIComponent(value ?? "")}`)
			.join("&");
		url += `?${queryString}`;
	}

	return url;
}

// ============================================================================
// History Management Functions
// ============================================================================

interface HistoryEntry {
	path: string;
	title: string;
	state: unknown;
	timestamp: number;
}

function createHistoryEntry(
	path: string,
	title: string,
	state: unknown = null,
): HistoryEntry {
	return {
		path,
		title,
		state,
		timestamp: Date.now(),
	};
}

function saveScrollPosition(): number {
	return window.scrollY;
}

function restoreScrollPosition(position: number): void {
	window.scrollTo(0, position);
}

// ============================================================================
// Navigation Flow Helpers
// ============================================================================

function shouldPreventNavigation(
	currentPath: string,
	targetPath: string,
	unsavedChanges: boolean,
): boolean {
	// Prevent navigation if there are unsaved changes and path is changing
	if (!unsavedChanges) return false;
	return currentPath !== targetPath;
}

function getNavigationDirection(
	previousPath: string | null,
	currentPath: string,
): "forward" | "back" | "same" {
	if (previousPath === null) return "forward";
	if (previousPath === currentPath) return "same";
	return "forward"; // In real app, would compare history stack positions
}

function validateRouteAccess(
	requiredPermission: string,
	userPermissions: string[],
): boolean {
	return userPermissions.indexOf(requiredPermission) >= 0;
}

// ============================================================================
// Navigation State Management Tests
// ============================================================================

describe("Navigation Helpers - State Management", () => {
	describe("createNavigationState", () => {
		it("should create initial navigation state with current path", () => {
			const state = createNavigationState("/calendar");

			expect(state.currentPath).toBe("/calendar");
			expect(state.previousPath).toBeNull();
			expect(state.isNavigating).toBe(false);
		});

		it("should capture current scroll position", () => {
			// Mock scroll position
			Object.defineProperty(window, "scrollY", { value: 100, writable: true });

			const state = createNavigationState("/calendar");
			expect(state.scrollPosition).toBe(100);
		});
	});

	describe("updateNavigationPath", () => {
		it("should update current path and preserve previous path", () => {
			const initialState = createNavigationState("/calendar");
			const updatedState = updateNavigationPath(initialState, "/settings");

			expect(updatedState.currentPath).toBe("/settings");
			expect(updatedState.previousPath).toBe("/calendar");
		});

		it("should update scroll position on path change", () => {
			const initialState = createNavigationState("/calendar");
			Object.defineProperty(window, "scrollY", { value: 200, writable: true });

			const updatedState = updateNavigationPath(initialState, "/settings");
			expect(updatedState.scrollPosition).toBe(200);
		});
	});

	describe("isPathChanged", () => {
		it("should return true when path is different", () => {
			const state = createNavigationState("/calendar");
			const result = isPathChanged(state, "/settings");
			expect(result).toBe(true);
		});

		it("should return false when path is the same", () => {
			const state = createNavigationState("/calendar");
			const result = isPathChanged(state, "/calendar");
			expect(result).toBe(false);
		});
	});

	describe("canGoBack", () => {
		it("should return true when previous path exists", () => {
			const state = createNavigationState("/settings", "/calendar");
			const result = canGoBack(state);
			expect(result).toBe(true);
		});

		it("should return false when no previous path", () => {
			const state = createNavigationState("/calendar");
			const result = canGoBack(state);
			expect(result).toBe(false);
		});
	});

	describe("startNavigation and endNavigation", () => {
		it("should set isNavigating to true when starting navigation", () => {
			const state = createNavigationState("/calendar");
			const navigatingState = startNavigation(state);
			expect(navigatingState.isNavigating).toBe(true);
		});

		it("should set isNavigating to false when ending navigation", () => {
			const state = createNavigationState("/calendar");
			const navigatingState = startNavigation(state);
			const endedState = endNavigation(navigatingState);
			expect(endedState.isNavigating).toBe(false);
		});
	});
});

// ============================================================================
// URL Change Detection Tests
// ============================================================================

describe("Navigation Helpers - URL Change Detection", () => {
	describe("hasQueryParamChanged", () => {
		it("should detect when query parameter value changes", () => {
			const previousUrl = "/calendar?month=1&year=2025";
			const currentUrl = "/calendar?month=2&year=2025";

			const result = hasQueryParamChanged(previousUrl, currentUrl, "month");
			expect(result).toBe(true);
		});

		it("should not detect change when query parameter value is same", () => {
			const previousUrl = "/calendar?month=1&year=2025";
			const currentUrl = "/calendar?month=1&year=2025";

			const result = hasQueryParamChanged(previousUrl, currentUrl, "month");
			expect(result).toBe(false);
		});

		it("should detect when query parameter is added", () => {
			const previousUrl = "/calendar";
			const currentUrl = "/calendar?filter=active";

			const result = hasQueryParamChanged(previousUrl, currentUrl, "filter");
			expect(result).toBe(true);
		});

		it("should detect when query parameter is removed", () => {
			const previousUrl = "/calendar?filter=active";
			const currentUrl = "/calendar";

			const result = hasQueryParamChanged(previousUrl, currentUrl, "filter");
			expect(result).toBe(true);
		});
	});

	describe("hasHashChanged", () => {
		it("should detect when hash changes", () => {
			const previousUrl = "/calendar#week1";
			const currentUrl = "/calendar#week2";

			const result = hasHashChanged(previousUrl, currentUrl);
			expect(result).toBe(true);
		});

		it("should not detect change when hash is the same", () => {
			const previousUrl = "/calendar#week1";
			const currentUrl = "/calendar#week1";

			const result = hasHashChanged(previousUrl, currentUrl);
			expect(result).toBe(false);
		});

		it("should detect when hash is added", () => {
			const previousUrl = "/calendar";
			const currentUrl = "/calendar#section";

			const result = hasHashChanged(previousUrl, currentUrl);
			expect(result).toBe(true);
		});

		it("should detect when hash is removed", () => {
			const previousUrl = "/calendar#section";
			const currentUrl = "/calendar";

			const result = hasHashChanged(previousUrl, currentUrl);
			expect(result).toBe(true);
		});
	});

	describe("hasPathChanged", () => {
		it("should detect when path changes", () => {
			const previousUrl = "/calendar";
			const currentUrl = "/settings";

			const result = hasPathChanged(previousUrl, currentUrl);
			expect(result).toBe(true);
		});

		it("should not detect change when path is the same", () => {
			const previousUrl = "/calendar";
			const currentUrl = "/calendar";

			const result = hasPathChanged(previousUrl, currentUrl);
			expect(result).toBe(false);
		});

		it("should ignore query params when detecting path change", () => {
			const previousUrl = "/calendar?month=1";
			const currentUrl = "/calendar?month=2";

			const result = hasPathChanged(previousUrl, currentUrl);
			expect(result).toBe(false);
		});

		it("should ignore hash when detecting path change", () => {
			const previousUrl = "/calendar#week1";
			const currentUrl = "/calendar#week2";

			const result = hasPathChanged(previousUrl, currentUrl);
			expect(result).toBe(false);
		});
	});

	describe("extractPath", () => {
		it("should extract path from absolute URL", () => {
			const result = extractPath("https://example.com/calendar?month=1");
			expect(result).toBe("/calendar");
		});

		it("should extract path from relative URL", () => {
			const result = extractPath("/calendar?month=1#week1");
			expect(result).toBe("/calendar");
		});

		it("should handle URL without query params or hash", () => {
			const result = extractPath("/settings");
			expect(result).toBe("/settings");
		});
	});

	describe("parseQueryParams", () => {
		it("should parse query parameters from URL", () => {
			const result = parseQueryParams("/calendar?month=1&year=2025");
			expect(result).toEqual({ month: "1", year: "2025" });
		});

		it("should handle URL without query params", () => {
			const result = parseQueryParams("/calendar");
			expect(result).toEqual({});
		});

		it("should decode URL-encoded values", () => {
			const result = parseQueryParams("/calendar?name=John%20Doe");
			expect(result.name).toBe("John Doe");
		});

		it("should handle empty parameter values", () => {
			const result = parseQueryParams("/calendar?filter=");
			expect(result.filter).toBe("");
		});
	});
});

// ============================================================================
// Route Parameter Parsing Tests
// ============================================================================

describe("Navigation Helpers - Route Parameter Parsing", () => {
	describe("parseRouteParams", () => {
		it("should parse simple route parameter", () => {
			const result = parseRouteParams("/calendar/2025", "/calendar/:year");
			expect(result).toEqual({ year: "2025" });
		});

		it("should parse multiple route parameters", () => {
			const result = parseRouteParams(
				"/calendar/2025/01",
				"/calendar/:year/:month",
			);
			expect(result).toEqual({ year: "2025", month: "01" });
		});

		it("should return null when path does not match pattern", () => {
			const result = parseRouteParams("/settings", "/calendar/:year");
			expect(result).toBeNull();
		});

		it("should return null when segment count differs", () => {
			const result = parseRouteParams(
				"/calendar/2025",
				"/calendar/:year/:month",
			);
			expect(result).toBeNull();
		});

		it("should handle static path segments", () => {
			const result = parseRouteParams("/api/v1/users", "/api/v1/:resource");
			expect(result).toEqual({ resource: "users" });
		});
	});

	describe("buildUrlWithParams", () => {
		it("should build URL with route parameters", () => {
			const result = buildUrlWithParams("/calendar/:year", { year: "2025" });
			expect(result).toBe("/calendar/2025");
		});

		it("should build URL with multiple route parameters", () => {
			const result = buildUrlWithParams("/calendar/:year/:month", {
				year: "2025",
				month: "01",
			});
			expect(result).toBe("/calendar/2025/01");
		});

		it("should encode special characters in parameters", () => {
			const result = buildUrlWithParams("/user/:name", { name: "John Doe" });
			expect(result).toBe("/user/John%20Doe");
		});

		it("should add query parameters when provided", () => {
			const result = buildUrlWithParams(
				"/calendar/:year",
				{ year: "2025" },
				{ view: "month", filter: "all" },
			);
			expect(result).toBe("/calendar/2025?view=month&filter=all");
		});

		it("should skip undefined query parameters", () => {
			const result = buildUrlWithParams(
				"/calendar",
				{},
				{ view: "month", filter: undefined },
			);
			expect(result).toBe("/calendar?view=month");
		});
	});
});

// ============================================================================
// History Management Tests
// ============================================================================

describe("Navigation Helpers - History Management", () => {
	describe("createHistoryEntry", () => {
		it("should create history entry with path and title", () => {
			const entry = createHistoryEntry("/calendar", "Calendar");

			expect(entry.path).toBe("/calendar");
			expect(entry.title).toBe("Calendar");
			expect(entry.timestamp).toBeGreaterThan(0);
		});

		it("should include state in history entry", () => {
			const state = { scrollPosition: 100 };
			const entry = createHistoryEntry("/calendar", "Calendar", state);

			expect(entry.state).toEqual(state);
		});

		it("should set timestamp to current time", () => {
			const beforeTimestamp = Date.now();
			const entry = createHistoryEntry("/calendar", "Calendar");
			const afterTimestamp = Date.now();

			expect(entry.timestamp).toBeGreaterThanOrEqual(beforeTimestamp);
			expect(entry.timestamp).toBeLessThanOrEqual(afterTimestamp);
		});
	});

	describe("saveScrollPosition", () => {
		it("should return current window scroll position", () => {
			Object.defineProperty(window, "scrollY", { value: 150, writable: true });

			const position = saveScrollPosition();
			expect(position).toBe(150);
		});
	});

	describe("restoreScrollPosition", () => {
		it("should scroll to specified position", () => {
			const scrollToMock = vi.fn();
			window.scrollTo = scrollToMock;

			restoreScrollPosition(200);
			expect(scrollToMock).toHaveBeenCalledWith(0, 200);
		});
	});
});

// ============================================================================
// Navigation Flow Helper Tests
// ============================================================================

describe("Navigation Helpers - Navigation Flow", () => {
	describe("shouldPreventNavigation", () => {
		it("should prevent navigation when there are unsaved changes and path changes", () => {
			const result = shouldPreventNavigation("/calendar", "/settings", true);
			expect(result).toBe(true);
		});

		it("should not prevent navigation when no unsaved changes", () => {
			const result = shouldPreventNavigation("/calendar", "/settings", false);
			expect(result).toBe(false);
		});

		it("should not prevent navigation when path is the same", () => {
			const result = shouldPreventNavigation("/calendar", "/calendar", true);
			expect(result).toBe(false);
		});
	});

	describe("getNavigationDirection", () => {
		it("should return 'forward' for initial navigation", () => {
			const result = getNavigationDirection(null, "/calendar");
			expect(result).toBe("forward");
		});

		it("should return 'same' when navigating to same path", () => {
			const result = getNavigationDirection("/calendar", "/calendar");
			expect(result).toBe("same");
		});

		it("should return 'forward' for different paths", () => {
			const result = getNavigationDirection("/calendar", "/settings");
			expect(result).toBe("forward");
		});
	});

	describe("validateRouteAccess", () => {
		it("should allow access when user has required permission", () => {
			const result = validateRouteAccess("admin", ["user", "admin", "editor"]);
			expect(result).toBe(true);
		});

		it("should deny access when user lacks required permission", () => {
			const result = validateRouteAccess("admin", ["user", "editor"]);
			expect(result).toBe(false);
		});

		it("should deny access when user has no permissions", () => {
			const result = validateRouteAccess("admin", []);
			expect(result).toBe(false);
		});
	});
});

// ============================================================================
// DOM Integration Tests
// ============================================================================

describe("Navigation Helpers - DOM Integration", () => {
	describe("navigation state with actual window object", () => {
		it("should track scroll position from actual window", () => {
			const state = createNavigationState("/calendar");
			expect(typeof state.scrollPosition).toBe("number");
		});
	});

	describe("URL parsing with window.location context", () => {
		it("should parse URLs relative to window.location.origin", () => {
			const result = parseQueryParams("/calendar?test=value");
			expect(result.test).toBe("value");
		});
	});
});
