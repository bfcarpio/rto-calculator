/**
 * Centralized calendar event handling with event delegation
 * Simplified model: Left-click toggles OOF selection only
 */

interface DragState {
	isDragging: boolean;
	startCell: HTMLElement | null;
	selectionIntent: "out-of-office" | null; // What to apply during drag
}

class CalendarEventManager {
	private dragState: DragState = {
		isDragging: false,
		startCell: null,
		selectionIntent: null,
	};
	private todayTimer: number | null = null;

	initialize(): void {
		this.attachCalendarGridEvents();
		this.attachDocumentEvents();
		this.attachClearButtonHandlers();
		this.updateTodayHighlight();
		this.startTodayTimer();
		console.log("[CalendarEvents] Initialized with OOF-only selection");
	}

	// Event delegation for calendar grid
	private attachCalendarGridEvents(): void {
		const grid = document.querySelector(".months-grid");
		if (!grid) {
			console.warn("[CalendarEvents] Calendar grid not found");
			return;
		}

		// Handle mousedown (left-click only for OOF toggle)
		grid.addEventListener(
			"mousedown",
			this.handleGridMouseDown.bind(this) as EventListener,
		);

		// Handle mouseover (for drag selection)
		grid.addEventListener(
			"mouseover",
			this.handleGridMouseOver.bind(this) as EventListener,
		);

		// Handle keyboard navigation
		grid.addEventListener(
			"keydown",
			this.handleGridKeyDown.bind(this) as EventListener,
		);

		console.log("[CalendarEvents] Attached event listeners to calendar grid");
	}

	// Handle global document events
	private attachDocumentEvents(): void {
		document.addEventListener("mouseup", this.handleDocumentMouseUp.bind(this));
		document.addEventListener(
			"mouseleave",
			this.handleDocumentMouseUp.bind(this),
		);
	}

	// Handle day cell left-click (start drag or toggle)
	private handleGridMouseDown(e: MouseEvent): void {
		const target = e.target as Element;
		const cell = target.closest(".calendar-day");
		if (!cell) return;

		// Only left-click (button 0)
		if (e.button !== 0) return;

		e.preventDefault();

		const cellElement = cell as HTMLElement;
		const isSelected = cellElement.dataset.selected === "true";
		const selectionType = cellElement.dataset.selectionType;

		// Determine selection intent based on cell's current state
		// If already OOF, we want to clear; otherwise, we want to select OOF
		const intendedSelection =
			isSelected && selectionType === "out-of-office" ? null : "out-of-office";

		// Start dragging and store the intended selection to apply to all cells
		this.dragState.isDragging = true;
		this.dragState.startCell = cellElement;
		this.dragState.selectionIntent = intendedSelection;

		// Apply the intended selection to the clicked cell
		this.applySelectionToCell(cellElement, intendedSelection);
	}

	// Handle drag over cells
	private handleGridMouseOver(e: MouseEvent): void {
		if (!this.dragState.isDragging) return;

		const target = e.target as Element;
		const cell = target.closest(".calendar-day");
		if (!cell) return;

		const cellElement = cell as HTMLElement;
		const startCell = this.dragState.startCell;

		if (!startCell) return;

		// Apply the same selection intent to all cells during drag
		// The intent is captured on first click and doesn't change during drag
		this.applySelectionToCell(cellElement, this.dragState.selectionIntent);
	}

	// Handle global mouse up to end drag
	private handleDocumentMouseUp(): void {
		if (this.dragState.isDragging) {
			this.dragState.isDragging = false;
			this.dragState.startCell = null;
			this.dragState.selectionIntent = null;
		}
	}

	// Handle keyboard navigation and selection
	private handleGridKeyDown(e: KeyboardEvent): void {
		const target = e.target as Element;
		const cell = target.closest(".calendar-day");
		if (!cell) return;

		switch (e.key) {
			case "Enter":
			case " ": {
				e.preventDefault();
				// Toggle OOF selection
				const cellElement = cell as HTMLElement;
				const isSelected = cellElement.dataset.selected === "true";
				const selectionType = cellElement.dataset.selectionType;
				const wasOOF = isSelected && selectionType === "out-of-office";

				if (wasOOF) {
					this.applySelectionToCell(cellElement, null);
				} else {
					this.applySelectionToCell(cellElement, "out-of-office");
				}
				break;
			}

			case "ArrowUp":
			case "ArrowDown":
			case "ArrowLeft":
			case "ArrowRight":
				e.preventDefault();
				this.navigateKeyboard(e.key, cell as HTMLElement);
				break;

			case "Escape":
				this.clearDragState();
				break;
		}
	}

	// Navigate between day cells with arrow keys
	private navigateKeyboard(direction: string, currentCell: HTMLElement): void {
		const allCells = Array.from(
			document.querySelectorAll(".calendar-day:not(.empty)"),
		);
		const currentIndex = allCells.indexOf(currentCell);

		if (currentIndex === -1) return;

		let nextIndex: number;
		switch (direction) {
			case "ArrowRight":
				nextIndex = (currentIndex + 1) % allCells.length;
				break;
			case "ArrowLeft":
				nextIndex = (currentIndex - 1 + allCells.length) % allCells.length;
				break;
			case "ArrowDown":
				nextIndex = (currentIndex + 7) % allCells.length;
				break;
			case "ArrowUp":
				nextIndex = (currentIndex - 7 + allCells.length) % allCells.length;
				break;
			default:
				return;
		}

		if (nextIndex !== undefined && allCells[nextIndex]) {
			(allCells[nextIndex] as HTMLElement).focus();
		}
	}

	// Apply selection to a cell (OOF or null)
	private applySelectionToCell(
		cell: HTMLElement,
		type: "out-of-office" | null,
	): void {
		const currentLabel = cell.getAttribute("aria-label") || "";

		if (type === null) {
			// Clear selection
			cell.dataset.selected = "false";
			cell.dataset.selectionType = "";
			cell.classList.remove("selected", "out-of-office");
			cell.ariaSelected = "false";

			// Update aria-label for accessibility
			const newLabel = currentLabel.replace(/\. .*$/, ". Unselected");
			cell.setAttribute("aria-label", newLabel);
		} else {
			// Apply OOF selection
			cell.dataset.selected = "true";
			cell.dataset.selectionType = "out-of-office";
			cell.classList.add("selected", "out-of-office");
			cell.ariaSelected = "true";

			// Update aria-label for accessibility
			const newLabel = currentLabel.replace(/\. .*$/, ". Out of office");
			cell.setAttribute("aria-label", newLabel);
		}

		// Dispatch event for other modules (validation, localStorage)
		cell.dispatchEvent(
			new CustomEvent("rto-selection-changed", {
				bubbles: true,
				detail: { cell, selectionType: type },
			}),
		);
	}

	// Attach clear button handlers via delegation
	private attachClearButtonHandlers(): void {
		document.addEventListener("click", (e: Event) => {
			const target = e.target as Element;
			const clearButton = target.closest('[id^="clear-"]');
			if (!clearButton) return;

			if (
				clearButton.id === "clear-all-button-top" ||
				clearButton.id === "clear-all-button-bottom"
			) {
				this.clearAllSelections();
			} else if (clearButton.id.startsWith("clear-")) {
				this.clearMonthSelections(clearButton as HTMLElement);
			}
		});
	}

	// Clear all selections globally
	private clearAllSelections(): void {
		const selectedCells = document.querySelectorAll(".calendar-day.selected");
		selectedCells.forEach((cell) => {
			this.applySelectionToCell(cell as HTMLElement, null);
		});
		this.announceToScreenReader("Cleared all selections");
	}

	// Clear selections for a specific month
	private clearMonthSelections(button: HTMLElement): void {
		const monthId = button.getAttribute("aria-controls");
		if (!monthId) return;

		const monthContainer = document.getElementById(monthId);
		if (!monthContainer) return;

		const selectedCells = monthContainer.querySelectorAll(
			".calendar-day.selected",
		);
		const count = selectedCells.length;

		selectedCells.forEach((cell) => {
			this.applySelectionToCell(cell as HTMLElement, null);
		});
		this.announceToScreenReader(`Cleared ${count} selections`);
	}

	// Clear drag state
	private clearDragState(): void {
		this.dragState.isDragging = false;
		this.dragState.startCell = null;
		this.dragState.selectionIntent = null;
	}

	// Update today's date highlight
	private updateTodayHighlight(): void {
		const today = new Date();
		today.setHours(0, 0, 0, 0);

		const allCells = document.querySelectorAll(
			".calendar-day[data-year][data-month][data-day]",
		);

		allCells.forEach((cell) => {
			const el = cell as HTMLElement;
			const cellDate = new Date(
				parseInt(el.dataset.year || "0", 10),
				parseInt(el.dataset.month || "0", 10),
				parseInt(el.dataset.day || "0", 10),
			);
			cellDate.setHours(0, 0, 0, 0);

			if (cellDate.getTime() === today.getTime()) {
				el.classList.add("today");
				el.setAttribute("aria-current", "date");
			} else {
				el.classList.remove("today");
				el.removeAttribute("aria-current");
			}
		});
	}

	// Update highlight every minute (catches midnight crossover)
	private startTodayTimer(): void {
		this.todayTimer = window.setInterval(() => {
			this.updateTodayHighlight();
		}, 60000); // Check every minute
	}

	// Announce to screen readers
	private announceToScreenReader(message: string): void {
		const announcement = document.createElement("div");
		announcement.setAttribute("role", "status");
		announcement.setAttribute("aria-live", "polite");
		announcement.setAttribute("aria-atomic", "true");
		announcement.className = "sr-only calendar-announcement";
		announcement.textContent = message;

		document.body.appendChild(announcement);

		setTimeout(() => {
			document.body.removeChild(announcement);
		}, 1000);
	}

	// Cleanup timer and event handlers
	destroy(): void {
		if (this.todayTimer !== null) {
			clearInterval(this.todayTimer);
			this.todayTimer = null;
		}
		this.clearDragState();
	}
}

// Export initialization function
export function initializeCalendarEvents(): void {
	const manager = new CalendarEventManager();
	manager.initialize();

	// Expose for debugging/cleanup if needed
	(
		window as { __calendarEventManager?: CalendarEventManager }
	).__calendarEventManager = manager;
}

export { CalendarEventManager };
