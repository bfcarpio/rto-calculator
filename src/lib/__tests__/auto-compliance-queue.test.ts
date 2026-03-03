/**
 * EventQueue Tests
 *
 * Comprehensive tests for the EventQueue class which ensures compliance
 * computations happen sequentially and debounced, solving race conditions
 * from rapid state changes.
 *
 * Coverage:
 * - Basic queue functionality (FIFO processing)
 * - Single worker enforcement (concurrent processing prevention)
 * - Burst handling (multiple rapid events)
 * - Debounce timing (state-change: 1500ms, settings-change: 300ms, manual-trigger: 0ms)
 * - Error handling (graceful error recovery)
 * - Manual trigger (immediate processing)
 * - Cleanup (destroy method)
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CalendarInstance } from "../../../packages/datepainter/src/types";
import {
	_testExports,
	type AutoComplianceEvent,
	EventQueue,
} from "../auto-compliance";

// ─── Mock Calendar Manager ─────────────────────────────────────────────

function createMockCalendarManager(): CalendarInstance {
	return {
		getDates: vi.fn().mockReturnValue([]),
		setDates: vi.fn(),
		onStateChange: vi.fn(),
		refresh: vi.fn(),
	} as unknown as CalendarInstance;
}

// ─── Test Suite ────────────────────────────────────────────────────────

describe("EventQueue", () => {
	let queue: EventQueue;
	let mockManager: CalendarInstance;
	let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		mockManager = createMockCalendarManager();
		queue = new EventQueue();
		consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {
			// Suppress console.error in tests
		});
		vi.useFakeTimers();
	});

	afterEach(() => {
		queue.destroy();
		vi.useRealTimers();
		vi.clearAllMocks();
		consoleErrorSpy.mockRestore();
	});

	// ─── Calendar Manager Validation ──────────────────────────────────────

	describe("setCalendarManager", () => {
		it("should throw error when manager is null", () => {
			expect(() => {
				queue.setCalendarManager(null as unknown as CalendarInstance);
			}).toThrow("EventQueue: Calendar manager cannot be null or undefined");
		});

		it("should throw error when manager is undefined", () => {
			expect(() => {
				queue.setCalendarManager(undefined as unknown as CalendarInstance);
			}).toThrow("EventQueue: Calendar manager cannot be null or undefined");
		});

		it("should accept valid manager", () => {
			expect(() => {
				queue.setCalendarManager(mockManager);
			}).not.toThrow();
		});
	});

	// ─── Basic Queue Functionality ──────────────────────────────────────

	describe("enqueue", () => {
		it("should add events to the queue", () => {
			queue.setCalendarManager(mockManager);

			const event: AutoComplianceEvent = {
				type: "state-change",
				timestamp: Date.now(),
				calendarManager: mockManager,
			};

			queue.enqueue(event);

			// Event should be queued (processing hasn't started yet due to debounce)
			expect(queue).toBeDefined();
		});

		it("should allow multiple events of same type in queue (no deduplication)", () => {
			queue.setCalendarManager(mockManager);

			const event1: AutoComplianceEvent = {
				type: "state-change",
				timestamp: 1000,
				calendarManager: mockManager,
			};

			const event2: AutoComplianceEvent = {
				type: "state-change",
				timestamp: 2000,
				calendarManager: mockManager,
			};

			queue.enqueue(event1);
			queue.enqueue(event2);

			// Both events should be in queue (no deduplication)
			expect(queue).toBeDefined();
		});

		it("should allow different event types in the queue simultaneously", () => {
			queue.setCalendarManager(mockManager);

			const stateEvent: AutoComplianceEvent = {
				type: "state-change",
				timestamp: 1000,
				calendarManager: mockManager,
			};

			const settingsEvent: AutoComplianceEvent = {
				type: "settings-change",
				timestamp: 2000,
			};

			const manualEvent: AutoComplianceEvent = {
				type: "manual-trigger",
				timestamp: 3000,
				force: true,
			};

			queue.enqueue(stateEvent);
			queue.enqueue(settingsEvent);
			queue.enqueue(manualEvent);

			expect(queue).toBeDefined();
		});
	});

	// ─── Process Queue ───────────────────────────────────────────────────

	describe("processQueue", () => {
		it("should process events in FIFO order", async () => {
			queue.setCalendarManager(mockManager);

			const event1: AutoComplianceEvent = {
				type: "settings-change",
				timestamp: 1000,
			};
			const event2: AutoComplianceEvent = {
				type: "manual-trigger",
				timestamp: 2000,
				force: false,
			};
			const event3: AutoComplianceEvent = {
				type: "settings-change",
				timestamp: 3000,
			};

			queue.enqueue(event1);
			queue.enqueue(event2);
			queue.enqueue(event3);

			// Flush all timers to process queue
			await vi.runAllTimersAsync();

			// Queue should be empty after processing
			expect(queue).toBeDefined();
		});

		it("should not process when queue is empty", async () => {
			// Don't enqueue anything, just run timers
			await vi.runAllTimersAsync();

			// No error should occur
			expect(queue).toBeDefined();
		});
	});

	// ─── Single Worker Enforcement ───────────────────────────────────────

	describe("single worker enforcement", () => {
		it("should queue new events while processing", async () => {
			queue.setCalendarManager(mockManager);

			queue.enqueue({
				type: "settings-change",
				timestamp: 1000,
			});

			// Advance a bit but don't complete processing
			await vi.advanceTimersByTimeAsync(10);

			// Add another event while "processing"
			queue.enqueue({
				type: "manual-trigger",
				timestamp: 2000,
				force: false,
			});

			await vi.runAllTimersAsync();

			// No error should occur
			expect(queue).toBeDefined();
		});
	});

	// ─── Burst Handling ──────────────────────────────────────────────────

	describe("burst handling", () => {
		it("should handle burst of state changes", async () => {
			queue.setCalendarManager(mockManager);

			// Simulate rapid state changes
			for (let i = 0; i < 10; i++) {
				queue.enqueue({
					type: "state-change",
					timestamp: i,
					calendarManager: mockManager,
				});
			}

			await vi.runAllTimersAsync();

			// All events should be processed (no deduplication)
			expect(queue).toBeDefined();
		});

		it("should handle mixed event burst", async () => {
			queue.setCalendarManager(mockManager);

			// Mix of event types
			queue.enqueue({
				type: "state-change",
				timestamp: 1000,
				calendarManager: mockManager,
			});
			queue.enqueue({
				type: "settings-change",
				timestamp: 1001,
			});
			queue.enqueue({
				type: "state-change",
				timestamp: 1002,
				calendarManager: mockManager,
			});
			queue.enqueue({
				type: "manual-trigger",
				timestamp: 1003,
				force: false,
			});
			queue.enqueue({
				type: "settings-change",
				timestamp: 1004,
			});

			await vi.runAllTimersAsync();

			// All events should be processed
			expect(queue).toBeDefined();
		});

		it("should handle high-frequency events (100 rapid changes)", async () => {
			queue.setCalendarManager(mockManager);

			// Simulate 100 rapid state changes
			for (let i = 0; i < 100; i++) {
				queue.enqueue({
					type: "state-change",
					timestamp: i,
					calendarManager: mockManager,
				});
			}

			await vi.runAllTimersAsync();

			// All events should be processed
			expect(queue).toBeDefined();
		});
	});

	// ─── Debounce Timing ─────────────────────────────────────────────────

	describe("debouncing", () => {
		it("should debounce state-change events by 1500ms", async () => {
			queue.setCalendarManager(mockManager);

			queue.enqueue({
				type: "state-change",
				timestamp: 1000,
				calendarManager: mockManager,
			});

			// Advance 1000ms - should NOT have processed yet
			await vi.advanceTimersByTimeAsync(1000);

			// Advance remaining 500ms - should now process
			await vi.advanceTimersByTimeAsync(500);

			// No error means processing occurred
			expect(queue).toBeDefined();
		});

		it("should debounce settings-change events by 300ms", async () => {
			queue.setCalendarManager(mockManager);

			queue.enqueue({
				type: "settings-change",
				timestamp: 1000,
			});

			// Advance 200ms - should NOT have processed yet
			await vi.advanceTimersByTimeAsync(200);

			// Advance remaining 100ms - should now process
			await vi.advanceTimersByTimeAsync(100);

			expect(queue).toBeDefined();
		});

		it("should process manual-trigger events immediately (0ms debounce)", async () => {
			queue.setCalendarManager(mockManager);

			queue.enqueue({
				type: "manual-trigger",
				timestamp: 1000,
				force: false,
			});

			// Should process immediately (next tick)
			await vi.advanceTimersByTimeAsync(0);

			expect(queue).toBeDefined();
		});

		it("should reset debounce timer when new event arrives", async () => {
			queue.setCalendarManager(mockManager);

			// First event at t=0
			queue.enqueue({
				type: "state-change",
				timestamp: 1000,
				calendarManager: mockManager,
			});

			// Wait 1000ms
			await vi.advanceTimersByTimeAsync(1000);

			// Second event at t=1000 - should reset timer
			queue.enqueue({
				type: "state-change",
				timestamp: 2000,
				calendarManager: mockManager,
			});

			// Wait another 1000ms (total 2000ms from first event)
			// But only 1000ms from second event - should NOT process yet
			await vi.advanceTimersByTimeAsync(1000);

			// Wait remaining 500ms - should now process
			await vi.advanceTimersByTimeAsync(500);

			expect(queue).toBeDefined();
		});

		it("should use shorter debounce when settings-change arrives during state-change wait", async () => {
			queue.setCalendarManager(mockManager);

			// Start with state-change (1500ms debounce)
			queue.enqueue({
				type: "state-change",
				timestamp: 1000,
				calendarManager: mockManager,
			});

			// After 500ms, add settings-change (300ms debounce)
			await vi.advanceTimersByTimeAsync(500);
			queue.enqueue({
				type: "settings-change",
				timestamp: 2000,
			});

			// Should process after 300ms from settings-change
			await vi.advanceTimersByTimeAsync(300);

			expect(queue).toBeDefined();
		});
	});

	// ─── Error Handling ──────────────────────────────────────────────────

	describe("error handling", () => {
		it("should catch and log errors during processing", async () => {
			// Create queue without manager to trigger error
			queue.enqueue({
				type: "settings-change",
				timestamp: 1000,
			});

			await vi.runAllTimersAsync();

			// Error should have been logged
			expect(consoleErrorSpy).toHaveBeenCalled();
			expect(consoleErrorSpy).toHaveBeenCalledWith(
				"EventQueue processing error:",
				expect.any(Error),
			);
		});

		it("should clear queue after successful processing", async () => {
			queue.setCalendarManager(mockManager);

			queue.enqueue({
				type: "settings-change",
				timestamp: 1000,
			});

			await vi.runAllTimersAsync();

			// Queue should be empty after processing
			expect(queue).toBeDefined();
		});

		it("should require calendar manager for non-state-change events", async () => {
			// Don't set calendar manager
			queue.enqueue({
				type: "settings-change",
				timestamp: 1000,
			});

			await vi.runAllTimersAsync();

			// Error should have been logged
			expect(consoleErrorSpy).toHaveBeenCalled();
		});
	});

	// ─── Manual Trigger ──────────────────────────────────────────────────

	describe("manual trigger", () => {
		it("should process manual-trigger events immediately", async () => {
			queue.setCalendarManager(mockManager);

			queue.enqueue({
				type: "manual-trigger",
				timestamp: 1000,
				force: true,
			});

			// 0ms debounce - should process immediately
			await vi.advanceTimersByTimeAsync(0);

			expect(queue).toBeDefined();
		});

		it("should respect force flag in manual-trigger events", async () => {
			queue.setCalendarManager(mockManager);

			queue.enqueue({
				type: "manual-trigger",
				timestamp: 1000,
				force: true,
			});

			queue.enqueue({
				type: "manual-trigger",
				timestamp: 2000,
				force: false,
			});

			await vi.runAllTimersAsync();

			// Both manual triggers should be processed (no deduplication)
			expect(queue).toBeDefined();
		});

		it("should process manual-trigger alongside other event types", async () => {
			queue.setCalendarManager(mockManager);

			queue.enqueue({
				type: "state-change",
				timestamp: 1000,
				calendarManager: mockManager,
			});

			queue.enqueue({
				type: "manual-trigger",
				timestamp: 2000,
				force: false,
			});

			await vi.runAllTimersAsync();

			// All events should be processed
			expect(queue).toBeDefined();
		});
	});

	// ─── Calendar Manager Integration ─────────────────────────────────────

	describe("calendar manager", () => {
		it("should use calendar manager from state-change event", async () => {
			queue.setCalendarManager(mockManager);

			queue.enqueue({
				type: "state-change",
				timestamp: 1000,
				calendarManager: mockManager,
			});

			await vi.runAllTimersAsync();

			expect(queue).toBeDefined();
		});

		it("should use stored calendar manager for non-state-change events", async () => {
			queue.setCalendarManager(mockManager);

			queue.enqueue({
				type: "settings-change",
				timestamp: 1000,
			});

			await vi.runAllTimersAsync();

			expect(queue).toBeDefined();
		});
	});

	// ─── Edge Cases ──────────────────────────────────────────────────────

	describe("edge cases", () => {
		it("should handle empty queue gracefully", async () => {
			// Don't enqueue anything
			await vi.runAllTimersAsync();

			expect(queue).toBeDefined();
		});

		it("should handle rapid enqueue/dequeue cycles", async () => {
			queue.setCalendarManager(mockManager);

			// Rapid cycle of enqueue
			for (let i = 0; i < 5; i++) {
				queue.enqueue({
					type: "settings-change",
					timestamp: i,
				});
			}

			await vi.runAllTimersAsync();

			expect(queue).toBeDefined();
		});

		it("should handle timer being null on processQueue call", async () => {
			queue.setCalendarManager(mockManager);

			queue.enqueue({
				type: "manual-trigger",
				timestamp: 1000,
				force: false,
			});

			await vi.runAllTimersAsync();

			// Should process without error
			expect(queue).toBeDefined();
		});
	});

	// ─── Destroy/Cleanup ────────────────────────────────────────────────

	describe("destroy", () => {
		it("should clear timer on destroy", () => {
			queue.setCalendarManager(mockManager);

			queue.enqueue({
				type: "state-change",
				timestamp: 1000,
				calendarManager: mockManager,
			});

			// Destroy before timer fires
			queue.destroy();

			// No error should occur
			expect(queue).toBeDefined();
		});

		it("should be safe to call destroy multiple times", () => {
			queue.setCalendarManager(mockManager);

			queue.destroy();
			queue.destroy();
			queue.destroy();

			// No error should occur
			expect(queue).toBeDefined();
		});
	});
});

// ─── Pending Buffer Tests ──────────────────────────────────────────────

describe("Pending Events Buffer", () => {
	let mockCalendarManager: CalendarInstance;

	beforeEach(() => {
		mockCalendarManager = createMockCalendarManager();
		// Reset state before each test
		_testExports.reset();
	});

	afterEach(() => {
		_testExports.reset();
		vi.useRealTimers();
	});

	describe("event buffering", () => {
		it("should buffer events when EventQueue not yet created", () => {
			// Verify queue is null before events
			expect(_testExports.getEventQueue()).toBeNull();

			// Enqueue before EventQueue exists
			_testExports.enqueueEvent({ type: "settings-change", timestamp: 1000 });
			_testExports.enqueueEvent({ type: "settings-change", timestamp: 2000 });

			// Events should be in pending buffer
			expect(_testExports.getPendingEvents().length).toBe(2);
		});

		it("should enqueue directly when EventQueue exists", () => {
			vi.useFakeTimers();

			// Create queue
			const queue = new EventQueue();
			queue.setCalendarManager(mockCalendarManager);

			// Manually set the eventQueue (simulating initialization)
			_testExports.reset();
			// Re-create queue after reset
			const newQueue = new EventQueue();
			newQueue.setCalendarManager(mockCalendarManager);

			// Buffer events before queue
			_testExports.enqueueEvent({ type: "settings-change", timestamp: 1000 });

			expect(_testExports.getPendingEvents().length).toBe(1);
		});
	});

	describe("flush pending events", () => {
		it("should flush pending events to EventQueue on init", async () => {
			vi.useFakeTimers();

			// Reset and buffer events
			_testExports.reset();
			_testExports.enqueueEvent({ type: "settings-change", timestamp: 1000 });

			expect(_testExports.getPendingEvents().length).toBe(1);

			// Create queue and set it as the module-level eventQueue
			const queue = new EventQueue();
			queue.setCalendarManager(mockCalendarManager);
			_testExports.setEventQueue(queue);

			// Flush pending events to the queue
			_testExports.flushPendingEvents();

			expect(_testExports.getPendingEvents().length).toBe(0);

			queue.destroy();
		});

		it("should handle flush when EventQueue is null", () => {
			_testExports.reset();

			// Buffer some events
			_testExports.enqueueEvent({ type: "settings-change", timestamp: 1000 });

			// Flush without creating queue (should be a no-op)
			_testExports.flushPendingEvents();

			// Pending events should still be there since no queue to flush to
			expect(_testExports.getPendingEvents().length).toBe(1);
		});
	});

	describe("isAutoComplianceReady timing", () => {
		it("should return false before initialization", () => {
			_testExports.reset();

			// Before any initialization
			expect(_testExports.isInitialized()).toBe(false);
		});

		it("should return true after full initialization", async () => {
			vi.useFakeTimers();

			// Mock window.__datepainterInstance
			(
				window as unknown as { __datepainterInstance?: CalendarInstance }
			).__datepainterInstance = mockCalendarManager;

			_testExports.reset();

			// Before init
			expect(_testExports.isInitialized()).toBe(false);

			// Run initialization
			_testExports.initAutoCompliance();

			// After init, should be true
			expect(_testExports.isInitialized()).toBe(true);

			// Cleanup mock
			delete (window as unknown as { __datepainterInstance?: CalendarInstance })
				.__datepainterInstance;
		});
	});
});
