/**
 * Mobile Interactions Unit Tests
 *
 * Tests mobile interaction logic including:
 * - Touch event handling for calendar selection
 * - Swipe gesture detection
 * - Touch point tracking
 * - Mobile keyboard navigation logic
 * - Touch scrolling coordination
 * - Mock TouchEvent and PointerEvent
 *
 * Aligns with E2E mobile interaction tests.
 */

import { beforeEach, describe, expect, it } from "vitest";
import { createMockDayElement } from "../testHelpers";

// ============================================================================
// Touch Event Types and Interfaces
// ============================================================================

interface TouchPoint {
	identifier: number;
	x: number;
	y: number;
}

interface TouchGesture {
	startPoint: TouchPoint;
	endPoint: TouchPoint;
	duration: number;
	type: "tap" | "swipe" | "longpress" | "none";
}

// ============================================================================
// Touch Event Creation Helpers
// ============================================================================

function createTouch(
	identifier: number,
	x: number,
	y: number,
	target: EventTarget,
): Touch {
	return {
		identifier,
		target,
		clientX: x,
		clientY: y,
		pageX: x,
		pageY: y,
		screenX: x,
		screenY: y,
		radiusX: 0,
		radiusY: 0,
		rotationAngle: 0,
		force: 1,
	} as Touch;
}

function createTouchEvent(
	type: string,
	touches: Touch[],
	target: EventTarget,
	options: { bubbles?: boolean; cancelable?: boolean } = {},
): TouchEvent {
	const event = new TouchEvent(type, {
		touches,
		targetTouches: touches,
		changedTouches: touches,
		bubbles: options.bubbles ?? true,
		cancelable: options.cancelable ?? true,
	});
	Object.defineProperty(event, "target", { value: target, writable: false });
	return event;
}

function createMockTouchEvent(
	type: string,
	touches: Array<{ identifier: number; clientX: number; clientY: number }>,
	target: EventTarget,
): TouchEvent {
	const touchList = touches.map((t) =>
		createTouch(t.identifier, t.clientX, t.clientY, target),
	);
	return createTouchEvent(type, touchList, target);
}

// ============================================================================
// Touch Handler Functions (to be tested)
// ============================================================================

class TouchHandler {
	private activeTouches: Map<number, TouchPoint> = new Map();
	private gestureStartTime: number = 0;
	private touchStartPoint: TouchPoint | null = null;
	private readonly TAP_THRESHOLD_MS = 200;
	private readonly SWIPE_THRESHOLD_PX = 50;
	private readonly LONGPRESS_THRESHOLD_MS = 500;

	onTouchStart(event: TouchEvent): void {
		const touch = event.touches[0];
		if (!touch) return;

		const point: TouchPoint = {
			identifier: touch.identifier,
			x: touch.clientX,
			y: touch.clientY,
		};

		this.activeTouches.set(touch.identifier, point);
		this.touchStartPoint = point;
		this.gestureStartTime = Date.now();
	}

	onTouchMove(event: TouchEvent): void {
		const touch = event.touches[0];
		if (!touch) return;

		const point: TouchPoint = {
			identifier: touch.identifier,
			x: touch.clientX,
			y: touch.clientY,
		};

		this.activeTouches.set(touch.identifier, point);
	}

	onTouchEnd(event: TouchEvent): TouchGesture {
		const touch = event.changedTouches[0];
		if (!touch || !this.touchStartPoint) {
			return {
				startPoint: { identifier: 0, x: 0, y: 0 },
				endPoint: { identifier: 0, x: 0, y: 0 },
				duration: 0,
				type: "none",
			};
		}

		const endPoint: TouchPoint = {
			identifier: touch.identifier,
			x: touch.clientX,
			y: touch.clientY,
		};

		const duration = Date.now() - this.gestureStartTime;
		const distance = this.calculateDistance(this.touchStartPoint, endPoint);

		let gestureType: TouchGesture["type"] = "none";

		if (
			distance < this.SWIPE_THRESHOLD_PX &&
			duration < this.TAP_THRESHOLD_MS
		) {
			gestureType = "tap";
		} else if (distance >= this.SWIPE_THRESHOLD_PX) {
			gestureType = "swipe";
		} else if (duration >= this.LONGPRESS_THRESHOLD_MS) {
			gestureType = "longpress";
		}

		this.activeTouches.delete(touch.identifier);

		return {
			startPoint: this.touchStartPoint,
			endPoint,
			duration,
			type: gestureType,
		};
	}

	private calculateDistance(p1: TouchPoint, p2: TouchPoint): number {
		const dx = p2.x - p1.x;
		const dy = p2.y - p1.y;
		return Math.sqrt(dx * dx + dy * dy);
	}

	getActiveTouchCount(): number {
		return this.activeTouches.size;
	}

	getTouchPoint(identifier: number): TouchPoint | undefined {
		return this.activeTouches.get(identifier);
	}
}

// ============================================================================
// Swipe Detection Functions
// ============================================================================

function detectSwipeDirection(
	startPoint: TouchPoint,
	endPoint: TouchPoint,
): "left" | "right" | "up" | "down" | null {
	const dx = endPoint.x - startPoint.x;
	const dy = endPoint.y - startPoint.y;
	const absDx = Math.abs(dx);
	const absDy = Math.abs(dy);

	// Minimum threshold for swipe detection
	const THRESHOLD = 50;

	if (Math.max(absDx, absDy) < THRESHOLD) {
		return null;
	}

	// Determine dominant direction
	if (absDx > absDy) {
		return dx > 0 ? "right" : "left";
	} else {
		return dy > 0 ? "down" : "up";
	}
}

function isSwipeGesture(gesture: TouchGesture): boolean {
	return gesture.type === "swipe";
}

function isTapGesture(gesture: TouchGesture): boolean {
	return gesture.type === "tap";
}

// ============================================================================
// Calendar Touch Selection Functions
// ============================================================================

class CalendarTouchSelector {
	private selectedCells: Set<HTMLElement> = new Set();
	private isMultiSelecting: boolean = false;

	handleTouchSelect(element: HTMLElement, gesture: TouchGesture): boolean {
		if (!isTapGesture(gesture)) return false;

		if (this.isMultiSelecting) {
			this.toggleSelection(element);
		} else {
			this.selectSingle(element);
		}

		return true;
	}

	startMultiSelect(): void {
		this.isMultiSelecting = true;
	}

	endMultiSelect(): void {
		this.isMultiSelecting = false;
	}

	private toggleSelection(element: HTMLElement): void {
		if (this.selectedCells.has(element)) {
			this.selectedCells.delete(element);
			element.classList.remove("selected");
			element.setAttribute("aria-selected", "false");
		} else {
			this.selectedCells.add(element);
			element.classList.add("selected");
			element.setAttribute("aria-selected", "true");
		}
	}

	private selectSingle(element: HTMLElement): void {
		// Clear previous selection
		this.clearSelection();
		this.selectedCells.add(element);
		element.classList.add("selected");
		element.setAttribute("aria-selected", "true");
	}

	clearSelection(): void {
		this.selectedCells.forEach((cell) => {
			cell.classList.remove("selected");
			cell.setAttribute("aria-selected", "false");
		});
		this.selectedCells.clear();
	}

	getSelectedCount(): number {
		return this.selectedCells.size;
	}
}

// ============================================================================
// Touch Scrolling Coordination
// ============================================================================

class TouchScrollCoordinator {
	private isScrolling: boolean = false;
	private scrollStartY: number = 0;
	private scrollThreshold: number = 10;

	onTouchStart(y: number): void {
		this.scrollStartY = y;
		this.isScrolling = false;
	}

	onTouchMove(y: number): boolean {
		const deltaY = Math.abs(y - this.scrollStartY);

		if (deltaY > this.scrollThreshold) {
			this.isScrolling = true;
			return true; // Indicates scrolling is active
		}

		return false;
	}

	onTouchEnd(): boolean {
		const wasScrolling = this.isScrolling;
		this.isScrolling = false;
		this.scrollStartY = 0;
		return wasScrolling;
	}

	isCurrentlyScrolling(): boolean {
		return this.isScrolling;
	}
}

// ============================================================================
// Mobile Keyboard Navigation
// ============================================================================

interface KeyboardNavigationState {
	currentElement: HTMLElement | null;
	rowCount: number;
	columnCount: number;
}

function navigateCalendarGrid(
	state: KeyboardNavigationState,
	direction: "up" | "down" | "left" | "right",
	gridElements: HTMLElement[],
): HTMLElement | null {
	if (!state.currentElement) return null;

	const currentIndex = gridElements.indexOf(state.currentElement);
	if (currentIndex === -1) return null;

	let newIndex: number;

	switch (direction) {
		case "up":
			newIndex = currentIndex - state.columnCount;
			break;
		case "down":
			newIndex = currentIndex + state.columnCount;
			break;
		case "left":
			newIndex = currentIndex - 1;
			break;
		case "right":
			newIndex = currentIndex + 1;
			break;
	}

	if (newIndex >= 0 && newIndex < gridElements.length) {
		return gridElements[newIndex] ?? null;
	}

	return null;
}

// ============================================================================
// Touch Handler Tests
// ============================================================================

describe("Mobile Interactions - Touch Handler", () => {
	let touchHandler: TouchHandler;
	let mockElement: HTMLElement;

	beforeEach(() => {
		touchHandler = new TouchHandler();
		mockElement = document.createElement("div");
	});

	describe("onTouchStart", () => {
		it("should register active touch on touchstart", () => {
			const touch = createTouch(1, 100, 200, mockElement);
			const event = createTouchEvent("touchstart", [touch], mockElement);

			touchHandler.onTouchStart(event);

			expect(touchHandler.getActiveTouchCount()).toBe(1);
			expect(touchHandler.getTouchPoint(1)?.x).toBe(100);
		});

		it("should handle multiple simultaneous touches", () => {
			const touch1 = createTouch(1, 100, 200, mockElement);
			const touch2 = createTouch(2, 150, 250, mockElement);

			touchHandler.onTouchStart(
				createTouchEvent("touchstart", [touch1], mockElement),
			);
			touchHandler.onTouchStart(
				createTouchEvent("touchstart", [touch2], mockElement),
			);

			expect(touchHandler.getActiveTouchCount()).toBe(2);
		});
	});

	describe("onTouchMove", () => {
		it("should update touch position on touchmove", () => {
			const startTouch = createTouch(1, 100, 200, mockElement);
			touchHandler.onTouchStart(
				createTouchEvent("touchstart", [startTouch], mockElement),
			);

			const moveTouch = createTouch(1, 120, 220, mockElement);
			touchHandler.onTouchMove(
				createTouchEvent("touchmove", [moveTouch], mockElement),
			);

			const point = touchHandler.getTouchPoint(1);
			expect(point?.x).toBe(120);
			expect(point?.y).toBe(220);
		});
	});

	describe("onTouchEnd", () => {
		it("should detect tap gesture for quick touch", () => {
			const startTouch = createTouch(1, 100, 200, mockElement);
			touchHandler.onTouchStart(
				createTouchEvent("touchstart", [startTouch], mockElement),
			);

			const endTouch = createTouch(1, 105, 205, mockElement);
			const gesture = touchHandler.onTouchEnd(
				createTouchEvent("touchend", [endTouch], mockElement),
			);

			expect(gesture.type).toBe("tap");
		});

		it("should detect swipe gesture for movement exceeding threshold", () => {
			const startTouch = createTouch(1, 100, 200, mockElement);
			touchHandler.onTouchStart(
				createTouchEvent("touchstart", [startTouch], mockElement),
			);

			const endTouch = createTouch(1, 200, 200, mockElement); // 100px horizontal movement
			const gesture = touchHandler.onTouchEnd(
				createTouchEvent("touchend", [endTouch], mockElement),
			);

			expect(gesture.type).toBe("swipe");
		});

		it("should remove touch from active touches on touchend", () => {
			const touch = createTouch(1, 100, 200, mockElement);
			touchHandler.onTouchStart(
				createTouchEvent("touchstart", [touch], mockElement),
			);

			touchHandler.onTouchEnd(
				createTouchEvent("touchend", [touch], mockElement),
			);

			expect(touchHandler.getActiveTouchCount()).toBe(0);
		});
	});
});

// ============================================================================
// Swipe Detection Tests
// ============================================================================

describe("Mobile Interactions - Swipe Detection", () => {
	describe("detectSwipeDirection", () => {
		it("should detect right swipe", () => {
			const startPoint: TouchPoint = { identifier: 1, x: 100, y: 200 };
			const endPoint: TouchPoint = { identifier: 1, x: 200, y: 200 };

			const direction = detectSwipeDirection(startPoint, endPoint);
			expect(direction).toBe("right");
		});

		it("should detect left swipe", () => {
			const startPoint: TouchPoint = { identifier: 1, x: 200, y: 200 };
			const endPoint: TouchPoint = { identifier: 1, x: 100, y: 200 };

			const direction = detectSwipeDirection(startPoint, endPoint);
			expect(direction).toBe("left");
		});

		it("should detect down swipe", () => {
			const startPoint: TouchPoint = { identifier: 1, x: 100, y: 100 };
			const endPoint: TouchPoint = { identifier: 1, x: 100, y: 200 };

			const direction = detectSwipeDirection(startPoint, endPoint);
			expect(direction).toBe("down");
		});

		it("should detect up swipe", () => {
			const startPoint: TouchPoint = { identifier: 1, x: 100, y: 200 };
			const endPoint: TouchPoint = { identifier: 1, x: 100, y: 100 };

			const direction = detectSwipeDirection(startPoint, endPoint);
			expect(direction).toBe("up");
		});

		it("should return null for movement below threshold", () => {
			const startPoint: TouchPoint = { identifier: 1, x: 100, y: 200 };
			const endPoint: TouchPoint = { identifier: 1, x: 110, y: 205 }; // Only 11px movement

			const direction = detectSwipeDirection(startPoint, endPoint);
			expect(direction).toBeNull();
		});
	});

	describe("isSwipeGesture", () => {
		it("should return true for swipe gesture", () => {
			const gesture: TouchGesture = {
				startPoint: { identifier: 1, x: 100, y: 200 },
				endPoint: { identifier: 1, x: 200, y: 200 },
				duration: 100,
				type: "swipe",
			};
			expect(isSwipeGesture(gesture)).toBe(true);
		});

		it("should return false for tap gesture", () => {
			const gesture: TouchGesture = {
				startPoint: { identifier: 1, x: 100, y: 200 },
				endPoint: { identifier: 1, x: 105, y: 205 },
				duration: 50,
				type: "tap",
			};
			expect(isSwipeGesture(gesture)).toBe(false);
		});
	});
});

// ============================================================================
// Calendar Touch Selection Tests
// ============================================================================

describe("Mobile Interactions - Calendar Touch Selection", () => {
	let selector: CalendarTouchSelector;
	let mockElement1: HTMLElement;
	let mockElement2: HTMLElement;
	let tapGesture: TouchGesture;

	beforeEach(() => {
		selector = new CalendarTouchSelector();
		mockElement1 = createMockDayElement(2025, 0, 6, null);
		mockElement2 = createMockDayElement(2025, 0, 7, null);
		tapGesture = {
			startPoint: { identifier: 1, x: 100, y: 200 },
			endPoint: { identifier: 1, x: 100, y: 200 },
			duration: 50,
			type: "tap",
		};
	});

	describe("handleTouchSelect", () => {
		it("should select cell on tap gesture", () => {
			const result = selector.handleTouchSelect(mockElement1, tapGesture);

			expect(result).toBe(true);
			expect(mockElement1.classList.contains("selected")).toBe(true);
			expect(mockElement1.getAttribute("aria-selected")).toBe("true");
		});

		it("should not select on swipe gesture", () => {
			const swipeGesture: TouchGesture = { ...tapGesture, type: "swipe" };
			const result = selector.handleTouchSelect(mockElement1, swipeGesture);

			expect(result).toBe(false);
			expect(mockElement1.classList.contains("selected")).toBe(false);
		});

		it("should clear previous selection when selecting single cell", () => {
			selector.handleTouchSelect(mockElement1, tapGesture);
			selector.handleTouchSelect(mockElement2, tapGesture);

			expect(mockElement1.classList.contains("selected")).toBe(false);
			expect(mockElement2.classList.contains("selected")).toBe(true);
		});
	});

	describe("multi-select mode", () => {
		it("should allow multiple selections in multi-select mode", () => {
			selector.startMultiSelect();
			selector.handleTouchSelect(mockElement1, tapGesture);
			selector.handleTouchSelect(mockElement2, tapGesture);

			expect(selector.getSelectedCount()).toBe(2);
			expect(mockElement1.classList.contains("selected")).toBe(true);
			expect(mockElement2.classList.contains("selected")).toBe(true);
		});

		it("should toggle selection in multi-select mode", () => {
			selector.startMultiSelect();
			selector.handleTouchSelect(mockElement1, tapGesture);
			selector.handleTouchSelect(mockElement1, tapGesture); // Toggle off

			expect(selector.getSelectedCount()).toBe(0);
			expect(mockElement1.classList.contains("selected")).toBe(false);
		});

		it("should return to single select mode after endMultiSelect", () => {
			selector.startMultiSelect();
			selector.handleTouchSelect(mockElement1, tapGesture);
			selector.endMultiSelect();
			selector.handleTouchSelect(mockElement2, tapGesture);

			expect(selector.getSelectedCount()).toBe(1);
			expect(mockElement1.classList.contains("selected")).toBe(false);
		});
	});

	describe("clearSelection", () => {
		it("should clear all selections", () => {
			selector.handleTouchSelect(mockElement1, tapGesture);
			selector.handleTouchSelect(mockElement2, tapGesture);
			selector.clearSelection();

			expect(selector.getSelectedCount()).toBe(0);
			expect(mockElement1.classList.contains("selected")).toBe(false);
			expect(mockElement2.classList.contains("selected")).toBe(false);
		});
	});
});

// ============================================================================
// Touch Scrolling Coordination Tests
// ============================================================================

describe("Mobile Interactions - Touch Scrolling Coordination", () => {
	let coordinator: TouchScrollCoordinator;

	beforeEach(() => {
		coordinator = new TouchScrollCoordinator();
	});

	describe("onTouchStart", () => {
		it("should initialize scroll state on touch start", () => {
			coordinator.onTouchStart(100);
			expect(coordinator.isCurrentlyScrolling()).toBe(false);
		});
	});

	describe("onTouchMove", () => {
		it("should detect scrolling when movement exceeds threshold", () => {
			coordinator.onTouchStart(100);
			const isScrolling = coordinator.onTouchMove(120); // 20px movement

			expect(isScrolling).toBe(true);
			expect(coordinator.isCurrentlyScrolling()).toBe(true);
		});

		it("should not detect scrolling when movement is below threshold", () => {
			coordinator.onTouchStart(100);
			const isScrolling = coordinator.onTouchMove(105); // 5px movement

			expect(isScrolling).toBe(false);
			expect(coordinator.isCurrentlyScrolling()).toBe(false);
		});
	});

	describe("onTouchEnd", () => {
		it("should return whether scrolling was active", () => {
			coordinator.onTouchStart(100);
			coordinator.onTouchMove(150);
			const wasScrolling = coordinator.onTouchEnd();

			expect(wasScrolling).toBe(true);
			expect(coordinator.isCurrentlyScrolling()).toBe(false);
		});

		it("should reset scroll state on touch end", () => {
			coordinator.onTouchStart(100);
			coordinator.onTouchMove(150);
			coordinator.onTouchEnd();

			expect(coordinator.isCurrentlyScrolling()).toBe(false);
		});
	});
});

// ============================================================================
// Mobile Keyboard Navigation Tests
// ============================================================================

describe("Mobile Interactions - Keyboard Navigation", () => {
	let gridElements: HTMLElement[];

	beforeEach(() => {
		// Create a 3x3 grid for testing
		gridElements = Array.from({ length: 9 }, (_, i) => {
			const el = document.createElement("div");
			el.setAttribute("data-index", i.toString());
			return el;
		});
	});

	describe("navigateCalendarGrid", () => {
		it("should navigate right in grid", () => {
			const state: KeyboardNavigationState = {
				currentElement: gridElements[0] ?? null,
				rowCount: 3,
				columnCount: 3,
			};

			const newElement = navigateCalendarGrid(state, "right", gridElements);
			expect(newElement).toBe(gridElements[1]);
		});

		it("should navigate down in grid", () => {
			const state: KeyboardNavigationState = {
				currentElement: gridElements[0] ?? null,
				rowCount: 3,
				columnCount: 3,
			};

			const newElement = navigateCalendarGrid(state, "down", gridElements);
			expect(newElement).toBe(gridElements[3]);
		});

		it("should navigate left in grid", () => {
			const state: KeyboardNavigationState = {
				currentElement: gridElements[1] ?? null,
				rowCount: 3,
				columnCount: 3,
			};

			const newElement = navigateCalendarGrid(state, "left", gridElements);
			expect(newElement).toBe(gridElements[0]);
		});

		it("should navigate up in grid", () => {
			const state: KeyboardNavigationState = {
				currentElement: gridElements[3] ?? null,
				rowCount: 3,
				columnCount: 3,
			};

			const newElement = navigateCalendarGrid(state, "up", gridElements);
			expect(newElement).toBe(gridElements[0]);
		});

		it("should return null when navigating beyond grid bounds", () => {
			const state: KeyboardNavigationState = {
				currentElement: gridElements[0] ?? null,
				rowCount: 3,
				columnCount: 3,
			};

			const newElement = navigateCalendarGrid(state, "left", gridElements);
			expect(newElement).toBeNull();
		});

		it("should return null when current element is null", () => {
			const state: KeyboardNavigationState = {
				currentElement: null,
				rowCount: 3,
				columnCount: 3,
			};

			const newElement = navigateCalendarGrid(state, "right", gridElements);
			expect(newElement).toBeNull();
		});
	});
});

// ============================================================================
// Touch Event Mocking Tests
// ============================================================================

describe("Mobile Interactions - Touch Event Mocking", () => {
	describe("createTouch", () => {
		it("should create touch object with correct properties", () => {
			const target = document.createElement("div");
			const touch = createTouch(1, 100, 200, target);

			expect(touch.identifier).toBe(1);
			expect(touch.clientX).toBe(100);
			expect(touch.clientY).toBe(200);
			expect(touch.target).toBe(target);
		});
	});

	describe("createTouchEvent", () => {
		it("should create TouchEvent with correct type", () => {
			const target = document.createElement("div");
			const touch = createTouch(1, 100, 200, target);
			const event = createTouchEvent("touchstart", [touch], target);

			expect(event.type).toBe("touchstart");
		});

		it("should include touches in event", () => {
			const target = document.createElement("div");
			const touch = createTouch(1, 100, 200, target);
			const event = createTouchEvent("touchstart", [touch], target);

			expect(event.touches.length).toBe(1);
			expect(event.touches[0]?.identifier).toBe(1);
		});

		it("should set correct target on event", () => {
			const target = document.createElement("div");
			const touch = createTouch(1, 100, 200, target);
			const event = createTouchEvent("touchstart", [touch], target);

			expect(event.target).toBe(target);
		});
	});

	describe("createMockTouchEvent", () => {
		it("should create mock touch event from simplified touch data", () => {
			const target = document.createElement("div");
			const event = createMockTouchEvent(
				"touchstart",
				[{ identifier: 1, clientX: 100, clientY: 200 }],
				target,
			);

			expect(event.type).toBe("touchstart");
			expect(event.touches[0]?.clientX).toBe(100);
			expect(event.touches[0]?.clientY).toBe(200);
		});
	});
});
