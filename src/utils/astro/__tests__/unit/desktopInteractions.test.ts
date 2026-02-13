/**
 * Desktop Interactions Unit Tests
 *
 * Tests desktop interaction logic including:
 * - Drag selection functionality
 * - Mouse movement tracking
 * - Keyboard shortcut handling
 * - Rapid click debouncing
 * - Multi-cell selection state management
 * - Mock MouseEvent and KeyboardEvent
 *
 * Aligns with E2E desktop interaction tests.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createMockDayElement } from "../testHelpers";

// ============================================================================
// Drag Selection Types and Interfaces
// ============================================================================

interface Point {
	x: number;
	y: number;
}

interface DragState {
	isDragging: boolean;
	startPoint: Point | null;
	currentPoint: Point | null;
	startElement: HTMLElement | null;
	selectedElements: Set<HTMLElement>;
}

interface KeyboardShortcut {
	key: string;
	ctrlKey?: boolean;
	shiftKey?: boolean;
	altKey?: boolean;
	metaKey?: boolean;
}

// ============================================================================
// Drag Selection Handler
// ============================================================================

class DragSelectionHandler {
	private state: DragState = {
		isDragging: false,
		startPoint: null,
		currentPoint: null,
		startElement: null,
		selectedElements: new Set(),
	};

	private readonly DRAG_THRESHOLD = 5; // pixels

	onMouseDown(element: HTMLElement, point: Point): void {
		this.state.isDragging = true;
		this.state.startPoint = point;
		this.state.currentPoint = point;
		this.state.startElement = element;
	}

	onMouseMove(point: Point): void {
		if (!this.state.isDragging) return;
		this.state.currentPoint = point;
	}

	onMouseUp(): DragState {
		const wasDragging = this.state.isDragging;
		this.state.isDragging = false;
		return { ...this.state, isDragging: wasDragging };
	}

	isDragging(): boolean {
		return this.state.isDragging;
	}

	getDragDistance(): number {
		if (!this.state.startPoint || !this.state.currentPoint) return 0;

		const dx = this.state.currentPoint.x - this.state.startPoint.x;
		const dy = this.state.currentPoint.y - this.state.startPoint.y;
		return Math.sqrt(dx * dx + dy * dy);
	}

	hasExceededThreshold(): boolean {
		return this.getDragDistance() > this.DRAG_THRESHOLD;
	}

	addToSelection(element: HTMLElement): void {
		this.state.selectedElements.add(element);
		element.classList.add("selected");
		element.setAttribute("aria-selected", "true");
	}

	removeFromSelection(element: HTMLElement): void {
		this.state.selectedElements.delete(element);
		element.classList.remove("selected");
		element.setAttribute("aria-selected", "false");
	}

	clearSelection(): void {
		this.state.selectedElements.forEach((element) => {
			element.classList.remove("selected");
			element.setAttribute("aria-selected", "false");
		});
		this.state.selectedElements.clear();
	}

	getSelectedCount(): number {
		return this.state.selectedElements.size;
	}

	getSelectedElements(): HTMLElement[] {
		return Array.from(this.state.selectedElements);
	}

	isSelected(element: HTMLElement): boolean {
		return this.state.selectedElements.has(element);
	}
}

// ============================================================================
// Mouse Movement Tracker
// ============================================================================

class MouseMovementTracker {
	private positions: Array<{ x: number; y: number; timestamp: number }> = [];
	private readonly MAX_HISTORY = 50;

	recordPosition(x: number, y: number): void {
		this.positions.push({ x, y, timestamp: Date.now() });

		// Keep only recent positions
		if (this.positions.length > this.MAX_HISTORY) {
			this.positions.shift();
		}
	}

	getVelocity(): { x: number; y: number } {
		if (this.positions.length < 2) {
			return { x: 0, y: 0 };
		}

		const current = this.positions[this.positions.length - 1];
		const previous = this.positions[this.positions.length - 2];

		if (!current || !previous) {
			return { x: 0, y: 0 };
		}

		const dt = current.timestamp - previous.timestamp;
		if (dt === 0) return { x: 0, y: 0 };

		return {
			x: (current.x - previous.x) / dt,
			y: (current.y - previous.y) / dt,
		};
	}

	getSpeed(): number {
		const velocity = this.getVelocity();
		return Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y);
	}

	isMoving(): boolean {
		return this.getSpeed() > 0.1;
	}

	clearHistory(): void {
		this.positions = [];
	}
}

// ============================================================================
// Keyboard Shortcut Handler
// ============================================================================

class KeyboardShortcutHandler {
	private shortcuts: Map<
		string,
		{ shortcut: KeyboardShortcut; handler: () => void }
	> = new Map();

	registerShortcut(
		name: string,
		shortcut: KeyboardShortcut,
		handler: () => void,
	): void {
		this.shortcuts.set(name, { shortcut, handler });
	}

	unregisterShortcut(name: string): void {
		this.shortcuts.delete(name);
	}

	handleKeyDown(event: KeyboardEvent): boolean {
		for (const [, { shortcut, handler }] of this.shortcuts) {
			if (this.matchesShortcut(event, shortcut)) {
				event.preventDefault();
				handler();
				return true;
			}
		}
		return false;
	}

	private matchesShortcut(
		event: KeyboardEvent,
		shortcut: KeyboardShortcut,
	): boolean {
		return (
			event.key === shortcut.key &&
			!!event.ctrlKey === !!shortcut.ctrlKey &&
			!!event.shiftKey === !!shortcut.shiftKey &&
			!!event.altKey === !!shortcut.altKey &&
			!!event.metaKey === !!shortcut.metaKey
		);
	}

	getRegisteredShortcuts(): string[] {
		return Array.from(this.shortcuts.keys());
	}
}

// ============================================================================
// Rapid Click Debouncer
// ============================================================================

class RapidClickDebouncer {
	private lastClickTime: number = 0;
	private clickCount: number = 0;
	private timeoutId: ReturnType<typeof setTimeout> | null = null;
	private readonly DEBOUNCE_MS = 300;
	private readonly MAX_CLICKS = 3;

	onClick(handler: (clickCount: number) => void): void {
		const now = Date.now();
		const timeSinceLastClick = now - this.lastClickTime;

		if (timeSinceLastClick < this.DEBOUNCE_MS) {
			this.clickCount = Math.min(this.clickCount + 1, this.MAX_CLICKS);
		} else {
			this.clickCount = 1;
		}

		this.lastClickTime = now;

		// Clear existing timeout
		if (this.timeoutId) {
			clearTimeout(this.timeoutId);
		}

		// Set new timeout to execute handler
		this.timeoutId = setTimeout(() => {
			handler(this.clickCount);
			this.clickCount = 0;
			this.timeoutId = null;
		}, this.DEBOUNCE_MS);
	}

	reset(): void {
		if (this.timeoutId) {
			clearTimeout(this.timeoutId);
			this.timeoutId = null;
		}
		this.clickCount = 0;
		this.lastClickTime = 0;
	}

	getClickCount(): number {
		return this.clickCount;
	}
}

// ============================================================================
// Multi-Cell Selection Manager
// ============================================================================

class MultiCellSelectionManager {
	private selectedCells: Map<HTMLElement, boolean> = new Map();
	private isCtrlPressed: boolean = false;
	private isShiftPressed: boolean = false;
	private lastSelectedCell: HTMLElement | null = null;

	onKeyDown(event: KeyboardEvent): void {
		if (event.key === "Control" || event.key === "Meta") {
			this.isCtrlPressed = true;
		}
		if (event.key === "Shift") {
			this.isShiftPressed = true;
		}
	}

	onKeyUp(event: KeyboardEvent): void {
		if (event.key === "Control" || event.key === "Meta") {
			this.isCtrlPressed = false;
		}
		if (event.key === "Shift") {
			this.isShiftPressed = false;
		}
	}

	selectCell(cell: HTMLElement, allCells: HTMLElement[]): boolean {
		if (this.isShiftPressed && this.lastSelectedCell) {
			// Range selection
			this.selectRange(this.lastSelectedCell, cell, allCells);
		} else if (this.isCtrlPressed) {
			// Toggle selection
			this.toggleCell(cell);
		} else {
			// Single selection (clear others)
			this.clearSelection();
			this.addCell(cell);
		}

		this.lastSelectedCell = cell;
		return true;
	}

	private toggleCell(cell: HTMLElement): void {
		if (this.selectedCells.has(cell)) {
			this.selectedCells.delete(cell);
			cell.classList.remove("selected");
			cell.setAttribute("aria-selected", "false");
		} else {
			this.addCell(cell);
		}
	}

	private addCell(cell: HTMLElement): void {
		this.selectedCells.set(cell, true);
		cell.classList.add("selected");
		cell.setAttribute("aria-selected", "true");
	}

	private selectRange(
		start: HTMLElement,
		end: HTMLElement,
		allCells: HTMLElement[],
	): void {
		const startIndex = allCells.indexOf(start);
		const endIndex = allCells.indexOf(end);

		if (startIndex === -1 || endIndex === -1) return;

		const minIndex = Math.min(startIndex, endIndex);
		const maxIndex = Math.max(startIndex, endIndex);

		// Add all cells in range
		for (let i = minIndex; i <= maxIndex; i++) {
			const cell = allCells[i];
			if (cell) {
				this.addCell(cell);
			}
		}
	}

	clearSelection(): void {
		this.selectedCells.forEach((_, cell) => {
			cell.classList.remove("selected");
			cell.setAttribute("aria-selected", "false");
		});
		this.selectedCells.clear();
	}

	getSelectedCount(): number {
		return this.selectedCells.size;
	}

	getSelectedCells(): HTMLElement[] {
		return Array.from(this.selectedCells.keys());
	}

	isCellSelected(cell: HTMLElement): boolean {
		return this.selectedCells.has(cell);
	}
}

// ============================================================================
// Drag Selection Handler Tests
// ============================================================================

describe("Desktop Interactions - Drag Selection Handler", () => {
	let handler: DragSelectionHandler;
	let mockElement1: HTMLElement;
	let mockElement2: HTMLElement;

	beforeEach(() => {
		handler = new DragSelectionHandler();
		mockElement1 = createMockDayElement(2025, 0, 6, null);
		mockElement2 = createMockDayElement(2025, 0, 7, null);
	});

	describe("onMouseDown", () => {
		it("should start drag on mousedown", () => {
			handler.onMouseDown(mockElement1, { x: 100, y: 200 });

			expect(handler.isDragging()).toBe(true);
		});

		it("should record start point on mousedown", () => {
			handler.onMouseDown(mockElement1, { x: 100, y: 200 });

			expect(handler.getDragDistance()).toBe(0);
		});
	});

	describe("onMouseMove", () => {
		it("should update current point during drag", () => {
			handler.onMouseDown(mockElement1, { x: 100, y: 200 });
			handler.onMouseMove({ x: 150, y: 250 });

			const distance = handler.getDragDistance();
			expect(distance).toBeGreaterThan(0);
		});

		it("should not update if not dragging", () => {
			handler.onMouseMove({ x: 150, y: 250 });

			const distance = handler.getDragDistance();
			expect(distance).toBe(0);
		});

		it("should detect when drag exceeds threshold", () => {
			handler.onMouseDown(mockElement1, { x: 100, y: 200 });
			handler.onMouseMove({ x: 200, y: 300 }); // 141px movement

			expect(handler.hasExceededThreshold()).toBe(true);
		});
	});

	describe("onMouseUp", () => {
		it("should end drag on mouseup", () => {
			handler.onMouseDown(mockElement1, { x: 100, y: 200 });
			const state = handler.onMouseUp();

			expect(state.isDragging).toBe(true); // Returns previous state
			expect(handler.isDragging()).toBe(false); // But clears internally
		});
	});

	describe("selection management", () => {
		it("should add element to selection", () => {
			handler.addToSelection(mockElement1);

			expect(handler.getSelectedCount()).toBe(1);
			expect(mockElement1.classList.contains("selected")).toBe(true);
			expect(mockElement1.getAttribute("aria-selected")).toBe("true");
		});

		it("should remove element from selection", () => {
			handler.addToSelection(mockElement1);
			handler.removeFromSelection(mockElement1);

			expect(handler.getSelectedCount()).toBe(0);
			expect(mockElement1.classList.contains("selected")).toBe(false);
			expect(mockElement1.getAttribute("aria-selected")).toBe("false");
		});

		it("should clear all selections", () => {
			handler.addToSelection(mockElement1);
			handler.addToSelection(mockElement2);
			handler.clearSelection();

			expect(handler.getSelectedCount()).toBe(0);
			expect(mockElement1.classList.contains("selected")).toBe(false);
			expect(mockElement2.classList.contains("selected")).toBe(false);
		});

		it("should check if element is selected", () => {
			handler.addToSelection(mockElement1);

			expect(handler.isSelected(mockElement1)).toBe(true);
			expect(handler.isSelected(mockElement2)).toBe(false);
		});

		it("should return selected elements as array", () => {
			handler.addToSelection(mockElement1);
			handler.addToSelection(mockElement2);

			const selected = handler.getSelectedElements();
			expect(selected).toHaveLength(2);
			expect(selected).toContain(mockElement1);
			expect(selected).toContain(mockElement2);
		});
	});
});

// ============================================================================
// Mouse Movement Tracker Tests
// ============================================================================

describe("Desktop Interactions - Mouse Movement Tracker", () => {
	let tracker: MouseMovementTracker;

	beforeEach(() => {
		tracker = new MouseMovementTracker();
	});

	describe("recordPosition", () => {
		it("should record mouse position", () => {
			tracker.recordPosition(100, 200);
			// Should not throw
			expect(tracker.isMoving()).toBe(false); // Single point, no movement
		});

		it("should maintain position history", () => {
			tracker.recordPosition(100, 200);
			tracker.recordPosition(110, 210);

			const velocity = tracker.getVelocity();
			expect(velocity.x).not.toBe(0);
			expect(velocity.y).not.toBe(0);
		});
	});

	describe("getVelocity", () => {
		it("should return zero velocity with single position", () => {
			tracker.recordPosition(100, 200);
			const velocity = tracker.getVelocity();

			expect(velocity.x).toBe(0);
			expect(velocity.y).toBe(0);
		});

		it("should calculate velocity from position changes", () => {
			tracker.recordPosition(100, 200);
			tracker.recordPosition(150, 250);

			const velocity = tracker.getVelocity();
			expect(velocity.x).toBeGreaterThan(0);
			expect(velocity.y).toBeGreaterThan(0);
		});
	});

	describe("getSpeed", () => {
		it("should return zero speed when not moving", () => {
			expect(tracker.getSpeed()).toBe(0);
		});

		it("should return positive speed when moving", () => {
			tracker.recordPosition(100, 200);
			tracker.recordPosition(150, 250);

			expect(tracker.getSpeed()).toBeGreaterThan(0);
		});
	});

	describe("isMoving", () => {
		it("should return false when stationary", () => {
			expect(tracker.isMoving()).toBe(false);
		});

		it("should return true when moving", () => {
			tracker.recordPosition(100, 200);
			tracker.recordPosition(200, 300);

			expect(tracker.isMoving()).toBe(true);
		});
	});

	describe("clearHistory", () => {
		it("should clear position history", () => {
			tracker.recordPosition(100, 200);
			tracker.recordPosition(150, 250);
			tracker.clearHistory();

			expect(tracker.getSpeed()).toBe(0);
			expect(tracker.isMoving()).toBe(false);
		});
	});
});

// ============================================================================
// Keyboard Shortcut Handler Tests
// ============================================================================

describe("Desktop Interactions - Keyboard Shortcut Handler", () => {
	let handler: KeyboardShortcutHandler;
	let mockHandler: any;

	beforeEach(() => {
		handler = new KeyboardShortcutHandler();
		mockHandler = vi.fn();
	});

	describe("registerShortcut", () => {
		it("should register keyboard shortcut", () => {
			handler.registerShortcut(
				"save",
				{ key: "s", ctrlKey: true },
				mockHandler,
			);
			const shortcuts = handler.getRegisteredShortcuts();

			expect(shortcuts).toContain("save");
		});

		it("should handle multiple shortcuts", () => {
			handler.registerShortcut(
				"save",
				{ key: "s", ctrlKey: true },
				mockHandler,
			);
			handler.registerShortcut(
				"undo",
				{ key: "z", ctrlKey: true },
				mockHandler,
			);

			expect(handler.getRegisteredShortcuts()).toHaveLength(2);
		});
	});

	describe("handleKeyDown", () => {
		it("should execute shortcut handler on matching key", () => {
			handler.registerShortcut(
				"save",
				{ key: "s", ctrlKey: true },
				mockHandler,
			);

			const event = new KeyboardEvent("keydown", {
				key: "s",
				ctrlKey: true,
				bubbles: true,
			});
			handler.handleKeyDown(event);

			expect(mockHandler).toHaveBeenCalled();
		});

		it("should not execute on non-matching key", () => {
			handler.registerShortcut(
				"save",
				{ key: "s", ctrlKey: true },
				mockHandler,
			);

			const event = new KeyboardEvent("keydown", {
				key: "a",
				ctrlKey: true,
				bubbles: true,
			});
			handler.handleKeyDown(event);

			expect(mockHandler).not.toHaveBeenCalled();
		});

		it("should respect modifier keys", () => {
			handler.registerShortcut(
				"save",
				{ key: "s", ctrlKey: true },
				mockHandler,
			);

			// Same key without modifier
			const event = new KeyboardEvent("keydown", {
				key: "s",
				bubbles: true,
			});
			handler.handleKeyDown(event);

			expect(mockHandler).not.toHaveBeenCalled();
		});

		it("should prevent default when shortcut executed", () => {
			handler.registerShortcut(
				"save",
				{ key: "s", ctrlKey: true },
				mockHandler,
			);

			const event = new KeyboardEvent("keydown", {
				key: "s",
				ctrlKey: true,
				bubbles: true,
				cancelable: true,
			});
			const preventDefaultSpy = vi.spyOn(event, "preventDefault");

			handler.handleKeyDown(event);

			expect(preventDefaultSpy).toHaveBeenCalled();
		});
	});

	describe("unregisterShortcut", () => {
		it("should remove registered shortcut", () => {
			handler.registerShortcut(
				"save",
				{ key: "s", ctrlKey: true },
				mockHandler,
			);
			handler.unregisterShortcut("save");

			const event = new KeyboardEvent("keydown", {
				key: "s",
				ctrlKey: true,
				bubbles: true,
			});
			handler.handleKeyDown(event);

			expect(mockHandler).not.toHaveBeenCalled();
		});
	});
});

// ============================================================================
// Rapid Click Debouncer Tests
// ============================================================================

describe("Desktop Interactions - Rapid Click Debouncer", () => {
	let debouncer: RapidClickDebouncer;
	let mockHandler: any;

	beforeEach(() => {
		debouncer = new RapidClickDebouncer();
		mockHandler = vi.fn();
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	describe("onClick", () => {
		it("should execute handler after debounce period", () => {
			debouncer.onClick(mockHandler);
			expect(mockHandler).not.toHaveBeenCalled();

			vi.advanceTimersByTime(300);
			expect(mockHandler).toHaveBeenCalledWith(1);
		});

		it("should count multiple rapid clicks", () => {
			debouncer.onClick(mockHandler);
			debouncer.onClick(mockHandler);
			debouncer.onClick(mockHandler);

			expect(debouncer.getClickCount()).toBe(3);

			vi.advanceTimersByTime(300);
			expect(mockHandler).toHaveBeenCalledWith(3);
		});

		it("should reset count after debounce period", () => {
			debouncer.onClick(mockHandler);
			vi.advanceTimersByTime(300);

			expect(debouncer.getClickCount()).toBe(0);
		});

		it("should cap click count at maximum", () => {
			// Click 5 times rapidly (max is 3)
			debouncer.onClick(mockHandler);
			debouncer.onClick(mockHandler);
			debouncer.onClick(mockHandler);
			debouncer.onClick(mockHandler);
			debouncer.onClick(mockHandler);

			expect(debouncer.getClickCount()).toBe(3);
		});
	});

	describe("reset", () => {
		it("should cancel pending handler", () => {
			debouncer.onClick(mockHandler);
			debouncer.reset();
			vi.advanceTimersByTime(300);

			expect(mockHandler).not.toHaveBeenCalled();
		});

		it("should reset click count", () => {
			debouncer.onClick(mockHandler);
			debouncer.reset();

			expect(debouncer.getClickCount()).toBe(0);
		});
	});
});

// ============================================================================
// Multi-Cell Selection Manager Tests
// ============================================================================

describe("Desktop Interactions - Multi-Cell Selection Manager", () => {
	let manager: MultiCellSelectionManager;
	let cells: HTMLElement[];

	beforeEach(() => {
		manager = new MultiCellSelectionManager();
		// Create 6 cells (simulating calendar days)
		cells = Array.from({ length: 6 }, (_, i) =>
			createMockDayElement(2025, 0, i + 1, null),
		);
	});

	describe("single selection", () => {
		it("should select single cell", () => {
			manager.selectCell(cells[0]!, cells);

			expect(manager.isCellSelected(cells[0]!)).toBe(true);
			expect(manager.getSelectedCount()).toBe(1);
		});

		it("should clear previous selection on single select", () => {
			manager.selectCell(cells[0]!, cells);
			manager.selectCell(cells[1]!, cells);

			expect(manager.isCellSelected(cells[0]!)).toBe(false);
			expect(manager.isCellSelected(cells[1]!)).toBe(true);
			expect(manager.getSelectedCount()).toBe(1);
		});
	});

	describe("ctrl + click multi-selection", () => {
		it("should add to selection with ctrl pressed", () => {
			const ctrlEvent = new KeyboardEvent("keydown", { key: "Control" });
			manager.onKeyDown(ctrlEvent);

			manager.selectCell(cells[0]!, cells);
			manager.selectCell(cells[1]!, cells);

			expect(manager.getSelectedCount()).toBe(2);
			expect(manager.isCellSelected(cells[0]!)).toBe(true);
			expect(manager.isCellSelected(cells[1]!)).toBe(true);
		});

		it("should toggle selection with ctrl pressed", () => {
			const ctrlEvent = new KeyboardEvent("keydown", { key: "Control" });
			manager.onKeyDown(ctrlEvent);

			manager.selectCell(cells[0]!, cells);
			manager.selectCell(cells[0]!, cells); // Toggle off

			expect(manager.isCellSelected(cells[0]!)).toBe(false);
			expect(manager.getSelectedCount()).toBe(0);
		});

		it("should handle Ctrl key release", () => {
			const ctrlDownEvent = new KeyboardEvent("keydown", { key: "Control" });
			const ctrlUpEvent = new KeyboardEvent("keyup", { key: "Control" });

			manager.onKeyDown(ctrlDownEvent);
			manager.selectCell(cells[0]!, cells);
			manager.onKeyUp(ctrlUpEvent);
			manager.selectCell(cells[1]!, cells);

			// Second selection should clear first (no longer ctrl mode)
			expect(manager.isCellSelected(cells[0]!)).toBe(false);
			expect(manager.isCellSelected(cells[1]!)).toBe(true);
		});
	});

	describe("shift + click range selection", () => {
		it("should select range with shift pressed", () => {
			// First select without shift
			manager.selectCell(cells[0]!, cells);

			// Then shift+click another cell
			const shiftEvent = new KeyboardEvent("keydown", { key: "Shift" });
			manager.onKeyDown(shiftEvent);
			manager.selectCell(cells[3]!, cells);

			// Should select cells 0-3
			expect(manager.getSelectedCount()).toBe(4);
			expect(manager.isCellSelected(cells[0]!)).toBe(true);
			expect(manager.isCellSelected(cells[1]!)).toBe(true);
			expect(manager.isCellSelected(cells[2]!)).toBe(true);
			expect(manager.isCellSelected(cells[3]!)).toBe(true);
		});

		it("should handle reverse range selection", () => {
			manager.selectCell(cells[4]!, cells);

			const shiftEvent = new KeyboardEvent("keydown", { key: "Shift" });
			manager.onKeyDown(shiftEvent);
			manager.selectCell(cells[1]!, cells);

			// Should select cells 1-4
			expect(manager.getSelectedCount()).toBe(4);
		});
	});

	describe("clearSelection", () => {
		it("should clear all selected cells", () => {
			manager.selectCell(cells[0]!, cells);
			manager.selectCell(cells[1]!, cells);
			manager.clearSelection();

			expect(manager.getSelectedCount()).toBe(0);
			expect(cells[0]!.classList.contains("selected")).toBe(false);
			expect(cells[1]!.classList.contains("selected")).toBe(false);
		});
	});
});

// ============================================================================
// Mock Event Tests
// ============================================================================

describe("Desktop Interactions - Mock Event Creation", () => {
	describe("MouseEvent", () => {
		it("should create mousedown event", () => {
			const event = new MouseEvent("mousedown", {
				clientX: 100,
				clientY: 200,
				bubbles: true,
				cancelable: true,
			});

			expect(event.type).toBe("mousedown");
			expect(event.clientX).toBe(100);
			expect(event.clientY).toBe(200);
		});

		it("should create mousemove event", () => {
			const event = new MouseEvent("mousemove", {
				clientX: 150,
				clientY: 250,
				bubbles: true,
			});

			expect(event.type).toBe("mousemove");
		});

		it("should create mouseup event", () => {
			const event = new MouseEvent("mouseup", {
				clientX: 200,
				clientY: 300,
				bubbles: true,
			});

			expect(event.type).toBe("mouseup");
		});
	});

	describe("KeyboardEvent", () => {
		it("should create keydown event with key", () => {
			const event = new KeyboardEvent("keydown", {
				key: "Enter",
				bubbles: true,
				cancelable: true,
			});

			expect(event.type).toBe("keydown");
			expect(event.key).toBe("Enter");
		});

		it("should create keydown with modifier keys", () => {
			const event = new KeyboardEvent("keydown", {
				key: "s",
				ctrlKey: true,
				shiftKey: false,
				altKey: false,
				metaKey: false,
			});

			expect(event.ctrlKey).toBe(true);
		});

		it("should create keyup event", () => {
			const event = new KeyboardEvent("keyup", {
				key: "Control",
				bubbles: true,
			});

			expect(event.type).toBe("keyup");
			expect(event.key).toBe("Control");
		});
	});
});
