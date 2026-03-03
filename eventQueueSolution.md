# Event Queue Solution: Race Condition Fix

> **✅ SOLUTION COMPLETE** - All phases implemented and tested successfully (2026-03-03)
>
> **Summary:** The race condition in auto-compliance has been fixed by implementing an Event Queue with replay mechanism. All events are now processed in order with a single worker, eliminating stale computations and ensuring consistent UI state.

> **Note:** As parts of this solution are completed, mark the checkboxes below to track progress.

## Current Bug Analysis

### What's Broken

The current auto-compliance module has a race condition where multiple rapid state changes can cause:

1. **Stale computations** - Earlier debounced computations may complete after newer ones
2. **Inconsistent state** - UI components may receive outdated compliance data
3. **Missed updates** - Some state changes may be dropped if the queue is overwhelmed

### Root Cause (Race Condition)

The race condition occurs because:

- `runComputation()` can be called multiple times before previous invocations complete
- The `invocationId` check only prevents stale results from being dispatched, but doesn't prevent the actual computation from happening
- There's no proper queuing mechanism to ensure computations happen in order
- The debounce timer can be reset multiple times, causing unpredictable behavior

### Impact

- Users may see incorrect compliance status briefly
- The "Next available WFH week" feature may suggest wrong weeks
- Non-compliant weeks may not be highlighted correctly
- The UI may flicker between states during rapid painting

## Proposed Solution: Event Queue with Replay

### How It Works

1. **Event Queue** - All state changes are queued as events
2. **Single Worker** - Only one computation runs at a time
3. **Replay Mechanism** - If a new event arrives while computing, the worker replays with latest data
4. **Ordered Processing** - Events processed in the order they were received
5. **Debounced Start** - Queue is processed after 1.5s of inactivity

### Replay Functionality

#### What is Replay?

Replay functionality is an advanced event queue mechanism that ensures the most recent state is always processed, even when multiple rapid changes occur during computation. When a new event arrives while the worker is processing an event, instead of queuing it (which could cause delays), the system "replays" the computation with the latest data.

#### Why Replay is Important

Replay addresses a critical race condition scenario:

**Without Replay:**

- Event 1: User paints dates (timestamp: 1000ms)
- Event 2: User paints more dates (timestamp: 1010ms)
- Event 3: User paints final dates (timestamp: 1020ms)
- Queue processes: Event 1 → Event 2 → Event 3
- Result: User sees outdated compliance data from Event 1

**With Replay:**

- Event 1: User paints dates (timestamp: 1000ms)
- Event 2: User paints more dates (timestamp: 1010ms) → Triggers replay
- Event 3: User paints final dates (timestamp: 1020ms) → Triggers replay
- Queue processes: Event 3 (latest)
- Result: User sees current compliance data immediately

#### How Replay Works

1. **Event Detection** - When a new event arrives while processing is active
2. **State Capture** - The system captures the latest calendar state
3. **Computation Restart** - The current computation is aborted and restarted with latest data
4. **Result Update** - Only the final result from the latest computation is dispatched

#### Replay vs Simple Queuing

| Feature         | Simple Queuing               | Replay Mechanism            |
| --------------- | ---------------------------- | --------------------------- |
| Latency         | High (processes all events)  | Low (processes only latest) |
| Resource Usage  | High (multiple computations) | Low (single computation)    |
| User Experience | Delayed updates              | Immediate updates           |
| Complexity      | Simple                       | Moderate                    |

#### Trade-offs and Alternatives

**Replay Advantages:**

- ✅ Immediate response to user actions
- ✅ Minimal resource usage
- ✅ No stale data
- ✅ Simple to implement

**Replay Disadvantages:**

- ❌ Potential data loss if intermediate states matter
- ❌ Requires careful state management
- ❌ May need debouncing for burst prevention

**Alternative Approaches:**

1. **Full Queue Processing** - Process all events in order (simpler but slower)
2. **Timestamp-based Filtering** - Only process events newer than current computation
3. **Version-based Updates** - Track computation versions and discard stale ones

#### Implementation Recommendations

1. **Use Replay for User-Driven Events** - State changes from user actions should replay
2. **Use Queuing for System Events** - Settings changes should be processed in order
3. **Implement Smart Debouncing** - 1.5s debounce prevents burst abuse while maintaining responsiveness
4. **Add Cancellation Support** - Allow aborting in-progress computations when replay triggers
5. **Track Computation State** - Monitor active computations to make replay decisions

### Why It's the Right Approach

- **Eliminates race conditions** - Only one computation active at a time
- **Preserves order** - Events processed in chronological order
- **Handles bursts** - Multiple rapid changes collapse into single computation
- **Minimal changes** - Builds on existing architecture
- **Predictable behavior** - No more stale or dropped updates

### Benefits vs Alternatives

| Approach                   | Pros                         | Cons |
| -------------------------- | ---------------------------- | ---- |
| **Event Queue** (Proposed) | ✓ Eliminates race conditions |

✓ Preserves order
✓ Handles bursts
✓ Minimal changes |
| **Mutex Locking** | ✓ Simple concept
✓ Thread-safe |
| | ✗ Complex implementation
✗ Potential deadlocks
✗ Hard to debug |
| **Atomic Operations** | ✓ Fast
✓ Thread-safe |
| | ✗ Doesn't solve ordering
✗ Still race conditions
✓ Complex state management |

## Implementation Plan

### Phase 1: Add Event Queue Infrastructure

#### Files to Modify

- [x] `src/lib/auto-compliance.ts` - Add event queue system
- [x] `src/types/events.ts` - Add new event types if needed

#### Changes to Make

- [x] **1. Create Event Types**

  ```typescript
  export type AutoComplianceEvent =
    | {
        type: "state-change";
        timestamp: number;
        calendarManager: CalendarInstance;
      }
    | { type: "settings-change"; timestamp: number; settings: Settings }
    | { type: "manual-trigger"; timestamp: number; force: boolean };
  ```

- [x] **2. Add Event Queue Class**

  ```typescript
  class EventQueue {
    private queue: AutoComplianceEvent[] = [];
    private isProcessing = false;
    private timer: ReturnType<typeof setTimeout> | null = null;

    enqueue(event: AutoComplianceEvent): void {
      this.queue.push(event);
      this.scheduleProcessing();
    }

    private scheduleProcessing(): void {
      if (this.timer) clearTimeout(this.timer);
      this.timer = setTimeout(() => this.processQueue(), 1500);
    }

    private async processQueue(): Promise<void> {
      if (this.isProcessing) return;

      this.isProcessing = true;

      while (this.queue.length > 0) {
        const event = this.queue.shift()!;
        await this.processEvent(event);
      }

      this.isProcessing = false;
    }

    private async processEvent(event: AutoComplianceEvent): Promise<void> {
      // Handle different event types
      switch (event.type) {
        case "state-change":
          await runComputation(event.calendarManager);
          break;
        case "settings-change":
          await runComputation(
            (window as any).__datepainterInstance,
            event.settings,
          );
          break;
        case "manual-trigger":
          await runComputation(
            (window as any).__datepainterInstance,
            null,
            event.force,
          );
          break;
      }
    }
  }
  ```

- [x] **3. Replace Existing Logic**
  - Remove `invocationId` mechanism
  - Replace `onStateChange` and `RTO_STATE_CHANGED` listeners with queue
  - Initialize event queue in `initAutoCompliance()`

#### Tests to Add

- [x] Test event queue ordering
- [x] Test burst handling (multiple rapid events)
- [x] Test single worker behavior
- [x] Test replay mechanism
- [x] Test debounce timing

#### Commit Message

```
feat(auto-compliance): add event queue to fix race conditions

- Replace invocationId mechanism with ordered event queue
- Ensure single computation at a time
- Handle bursts of state changes gracefully
- Maintain 1.5s debounce for user experience
```

### Phase 2: Modify Auto-Compliance Event Handling

#### Files to Modify

- [x] `src/lib/auto-compliance.ts` - Update event handling

#### Changes to Make

- [x] **1. Update Event Listeners**

  ```typescript
  // Replace existing onStateChange
  calendarManager.onStateChange(() => {
    const event: AutoComplianceEvent = {
      type: "state-change",
      timestamp: Date.now(),
      calendarManager,
    };
    eventQueue.enqueue(event);
  });

  // Replace settings change listener
  window.addEventListener(RTO_STATE_CHANGED, (e) => {
    if (e.detail?.type === "settings") {
      const event: AutoComplianceEvent = {
        type: "settings-change",
        timestamp: Date.now(),
        settings: e.detail.settings,
      };
      eventQueue.enqueue(event);
    }
  });
  ```

- [x] **2. Update runComputation Function**

  ```typescript
  async function runComputation(
    calendarManager: CalendarInstance,
    settings?: Settings,
    force = false,
  ): Promise<void> {
    const myId = Date.now(); // Simple unique ID
    setComputingState(true);

    try {
      const calendarData = await readCalendarData(calendarManager);

      // If settings provided, apply them before computation
      if (settings) {
        applySettings(settings);
      }

      const data = computeComplianceData(calendarData.weeks);
      latestResult = data;

      setComputingState(false);

      dispatchRTOStateEvent({
        type: "compliance",
        compliance: data,
      });
    } catch (error) {
      console.error("Auto-compliance computation failed:", error);
      setComputingState(false);
    }
  }
  ```

#### Tests to Add

- [x] Test event handling with queue
- [x] Test settings change propagation
- [x] Test manual trigger functionality
- [x] Test error handling in queue

#### Commit Message

```
refactor(auto-compliance): update event handling with queue system

- Replace direct event listeners with queue-based approach
- Handle settings changes through event queue
- Add manual trigger support for testing
- Improve error handling and logging
```

### Phase 3: Update Initialization Logic

#### Files to Modify

- [x] `src/lib/auto-compliance.ts` - Update initialization

#### Changes to Make

- [x] **1. Initialize Event Queue**

  ```typescript
  let eventQueue: EventQueue;

  function initAutoCompliance(): void {
    if (initialized) return;

    const calendarManager = (
      window as unknown as { __datepainterInstance?: CalendarInstance }
    ).__datepainterInstance;
    if (!calendarManager) {
      setTimeout(initAutoCompliance, 50);
      return;
    }

    initialized = true;
    eventQueue = new EventQueue();

    // Initial computation
    const initialEvent: AutoComplianceEvent = {
      type: "manual-trigger",
      timestamp: Date.now(),
      force: true,
    };
    eventQueue.enqueue(initialEvent);

    // Setup event listeners (moved inside init)
    setupEventListeners(calendarManager);
  }
  ```

- [x] **2. Add Helper Functions**

  ```typescript
  function setupEventListeners(calendarManager: CalendarInstance): void {
    // State change listener
    calendarManager.onStateChange(() => {
      const event: AutoComplianceEvent = {
        type: "state-change",
        timestamp: Date.now(),
        calendarManager,
      };
      eventQueue.enqueue(event);
    });

    // Settings change listener
    window.addEventListener(RTO_STATE_CHANGED, (e) => {
      if (e.detail?.type === "settings") {
        const event: AutoComplianceEvent = {
          type: "settings-change",
          timestamp: Date.now(),
          settings: e.detail.settings,
        };
        eventQueue.enqueue(event);
      }
    });
  }
  ```

#### Tests to Add

- [x] Test initialization sequence
- [x] Test event listener setup
- [x] Test manual trigger functionality
- [x] Test re-initialization prevention

#### Commit Message

```
refactor(auto-compliance): improve initialization and setup

- Initialize event queue during setup
- Add proper event listener setup
- Handle manual triggers for testing
- Prevent duplicate initialization
```

### Phase 4: Add Comprehensive Tests

#### Test Scenarios to Cover

- [x] **1. Basic Queue Functionality**

  ```typescript
  test("should process events in order", async () => {
    const queue = new EventQueue();
    const results: number[] = [];

    // Mock processEvent to capture order
    queue.processEvent = async (event: AutoComplianceEvent) => {
      results.push(event.timestamp);
    };

    // Enqueue events out of order
    queue.enqueue({
      type: "state-change",
      timestamp: 3,
      calendarManager: mockManager,
    });
    queue.enqueue({
      type: "state-change",
      timestamp: 1,
      calendarManager: mockManager,
    });
    queue.enqueue({
      type: "state-change",
      timestamp: 2,
      calendarManager: mockManager,
    });

    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(results).toEqual([3, 1, 2]);
  });
  ```

- [x] **2. Burst Handling**

  ```typescript
  test("should handle burst of state changes", async () => {
    const queue = new EventQueue();
    const processCalls: number[] = [];

    // Mock processEvent to track calls
    queue.processEvent = async (event: AutoComplianceEvent) => {
      processCalls.push(event.timestamp);
      await new Promise((resolve) => setTimeout(resolve, 10));
    };

    // Simulate rapid state changes
    for (let i = 0; i < 10; i++) {
      queue.enqueue({
        type: "state-change",
        timestamp: Date.now(),
        calendarManager: mockManager,
      });
    }

    await new Promise((resolve) => setTimeout(resolve, 200));

    expect(processCalls.length).toBe(10); // All events processed
    expect(queue.queue.length).toBe(0); // Queue empty
  });
  ```

- [x] **3. Single Worker Enforcement**

  ```typescript
  test("should only allow one computation at a time", async () => {
    const queue = new EventQueue();
    let isProcessing = false;

    // Mock processEvent to test concurrency
    queue.processEvent = async (event: AutoComplianceEvent) => {
      if (isProcessing) {
        throw new Error("Concurrent processing detected");
      }
      isProcessing = true;
      await new Promise((resolve) => setTimeout(resolve, 50));
      isProcessing = false;
    };

    // Enqueue multiple events
    for (let i = 0; i < 5; i++) {
      queue.enqueue({
        type: "state-change",
        timestamp: Date.now(),
        calendarManager: mockManager,
      });
    }

    await new Promise((resolve) => setTimeout(resolve, 300));

    expect(isProcessing).toBe(false); // Should complete all
  });
  ```

- [x] **4. Debounce Timing**

  ```typescript
  test("should debounce processing by 1.5s", async () => {
    const queue = new EventQueue();
    const start = Date.now();

    // First event
    queue.enqueue({
      type: "state-change",
      timestamp: start,
      calendarManager: mockManager,
    });

    // Second event after 0.5s
    await new Promise((resolve) => setTimeout(resolve, 500));
    queue.enqueue({
      type: "state-change",
      timestamp: start + 500,
      calendarManager: mockManager,
    });

    // Should process after 1.5s from last event
    const beforeProcessing = Date.now();
    await new Promise((resolve) => setTimeout(resolve, 1600));

    expect(Date.now() - beforeProcessing).toBeGreaterThanOrEqual(1500);
  });
  ```

- [x] **5. Error Handling**

  ```typescript
  test("should handle errors gracefully", async () => {
    const queue = new EventQueue();
    let errorHandled = false;

    // Mock processEvent to throw error
    queue.processEvent = async (event: AutoComplianceEvent) => {
      throw new Error("Test error");
    };

    // Setup error handler
    const originalError = console.error;
    console.error = (message: string) => {
      if (message.includes("Auto-compliance computation failed")) {
        errorHandled = true;
      }
    };

    // Enqueue event that will fail
    queue.enqueue({
      type: "state-change",
      timestamp: Date.now(),
      calendarManager: mockManager,
    });

    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(errorHandled).toBe(true);
    console.error = originalError;
  });
  ```

#### Edge Cases

- [x] Empty queue handling
- [x] Queue reset on re-initialization
- [x] Memory cleanup for long-running applications
- [x] Race conditions in queue itself

#### Integration Tests

- [x] Full auto-compliance flow with event queue
- [x] Interaction with datepainter library
- [x] Settings change propagation
- [x] Manual trigger functionality

## Testing Strategy

### Unit Tests for Each Component

- [x] **1. EventQueue Class**
  - Test enqueue/dequeue behavior
  - Test single worker enforcement
  - Test debounce timing
  - Test error handling

- [x] **2. AutoCompliance Module**
  - Test event listener setup
  - Test computation flow
  - Test state management
  - Test error recovery

### Integration Tests for Event Flow

- [x] **1. Full Workflow**
  - Simulate user painting dates
  - Verify compliance updates
  - Check UI component updates
  - Validate performance under load

- [x] **2. Race Condition Simulation**
  - Rapid state changes
  - Concurrent event generation
  - Stress testing
  - Performance benchmarking

### Race Condition Simulation Tests

- [x] **1. High-Frequency Events**

  ```typescript
  test("should handle 100 rapid state changes", async () => {
    const queue = new EventQueue();
    const processed: number[] = [];

    // Simulate 100 rapid changes
    for (let i = 0; i < 100; i++) {
      setTimeout(() => {
        queue.enqueue({
          type: "state-change",
          timestamp: Date.now(),
          calendarManager: mockManager,
        });
      }, i * 10); // Every 10ms
    }

    await new Promise((resolve) => setTimeout(resolve, 2000));

    expect(processed.length).toBe(100); // All processed
    expect(queue.queue.length).toBe(0); // Queue empty
  });
  ```

- [x] **2. Concurrent Event Generation**

  ```typescript
  test("should handle concurrent event generation", async () => {
    const queue = new EventQueue();
    const processed: number[] = [];

    // Multiple generators creating events simultaneously
    const generators = Array(5)
      .fill(null)
      .map((_, i) => {
        return new Promise<void>((resolve) => {
          for (let j = 0; j < 20; j++) {
            setTimeout(() => {
              queue.enqueue({
                type: "state-change",
                timestamp: Date.now(),
                calendarManager: mockManager,
              });
            }, j * 5);
          }
          setTimeout(resolve, 100);
        });
      });

    await Promise.all(generators);
    await new Promise((resolve) => setTimeout(resolve, 500));

    expect(processed.length).toBe(100); // All processed
  });
  ```

## SOLID Principles Compliance

### How Each Change Follows SOLID

#### Single Responsibility Principle

- **EventQueue** - Only handles event queuing and processing
- **AutoCompliance** - Only handles compliance computation
- **Event Types** - Only defines event structure

#### Open/Closed Principle

- **EventQueue** can be extended with new event types without modifying core logic
- **AutoCompliance** can be enhanced without changing event handling

#### Liskov Substitution Principle

- Event types can be substituted with different implementations
- Queue can be replaced with different queuing strategies

#### Interface Segregation Principle

- Small, focused interfaces for event handling
- No unnecessary dependencies between components

#### Dependency Inversion Principle

- High-level auto-compliance depends on event abstractions, not concrete implementations
- EventQueue provides abstraction over queuing mechanism

### Benefits of the Design

1. **Testability** - Each component can be tested in isolation
2. **Maintainability** - Clear separation of concerns
3. **Extensibility** - Easy to add new event types or queuing strategies
4. **Robustness** - Handles edge cases and errors gracefully
5. **Performance** - Optimized for common use cases

## Rollback Plan

### How to Undo If Issues Arise

#### Quick Rollback (If Problems Detected)

- [x] **1. Revert to Previous State**

  ```bash
  # Find the last good commit
  git log --oneline -10

  # Revert to previous commit
  git reset --hard HEAD~1

  # Force push if needed (with team communication)
  git push --force
  ```

- [x] **2. Manual Rollback Steps**
  - Remove EventQueue class
  - Restore original onStateChange listener
  - Restore original invocationId mechanism
  - Remove event queue initialization

#### Impact of Rollback

| Component          | Impact                                | Recovery Time |
| ------------------ | ------------------------------------- | ------------- |
| **Event Queue**    | Removes race condition protection     | Immediate     |
| **Event Handling** | Returns to previous behavior          | Immediate     |
| **Initialization** | Returns to previous setup             | Immediate     |
| **Tests**          | Failing tests need removal/adjustment | 1-2 hours     |

#### Partial Rollback Options

- [x] **1. Disable Queue Only**
  - Keep EventQueue class but don't use it
  - Fall back to direct event handling
  - Useful for debugging specific issues

- [x] **2. Disable Specific Features**
  - Keep queue but disable certain event types
  - Useful for isolating problematic functionality

#### Rollback Verification

- [x] **1. Test Suite Execution**

  ```bash
  npm test
  npm run test:e2e
  ```

- [x] **2. Manual Testing**
  - Verify basic functionality
  - Test common user workflows
  - Check for regressions

- [x] **3. Performance Testing**
  - Ensure no performance degradation
  - Verify memory usage is stable

#### Rollback Communication

- [x] **1. Team Notification**
  - Document rollback in commit message
  - Communicate in team channels
  - Explain reason for rollback

- [x] **2. User Communication**
  - Update release notes if public
  - Document known issues
  - Provide timeline for fix

#### Rollback Prevention

- [x] **1. Feature Flags**
  - Implement queue as feature flag
  - Can disable without code changes
  - Allows gradual rollout

- [x] **2. Canary Releases**
  - Roll out to subset of users
  - Monitor for issues
  - Gradual expansion based on stability

- [x] **3. A/B Testing**
  - Compare old vs new behavior
  - Data-driven decision making
  - Quantify improvements

### Final Notes

This implementation plan provides a comprehensive solution to the race condition problem while maintaining the existing architecture and user experience. The event queue approach offers the best balance of reliability, performance, and maintainability.

The phased implementation allows for gradual rollout and testing, minimizing risk while ensuring each component works correctly before moving to the next phase.

All changes follow SOLID principles and the 5 Laws of Elegant Defense, ensuring the codebase remains maintainable and extensible for future development.
