import { formatDate } from "../lib/dateUtils";
import type { CalendarConfig } from "../types";

/**
 * MonthRenderer class - Renders individual month grids
 * Updates DOM incrementally for performance
 */
export class MonthRenderer {
  private container: HTMLElement | null = null;

  // Config will be stored for Phase 8.3+ when actual rendering is implemented
  constructor(container: string | HTMLElement, config: CalendarConfig) {
    if (typeof container === "string") {
      const el = document.querySelector<HTMLElement>(container);
      if (!el) {
        throw new Error("Container element not found");
      }
      this.container = el;
    } else {
      this.container = container;
    }

    // Config stored for future use in rendering (Phase 8.3+)
    void config;
  }

  /**
   * Render month for given date
   */
  renderMonth(date: Date): void {
    if (!this.container) {
      throw new Error("MonthRenderer not initialized - call init() first");
    }

    // TODO: Implement actual month grid rendering
    // Will need: date.getFullYear(), date.getMonth(), getDaysInMonth(), getFirstDayOfMonth()
    console.log("Rendering month:", formatDate(date));
  }

  /**
   * Update DOM incrementally (no full re-render)
   */
  updateMonthGrid(dates: Date[]): void {
    // TODO: Update DOM with new date selections
    console.log("Updating month with", dates.length, "dates");
  }

  /**
   * Clean up month from DOM
   */
  destroy(): void {
    if (this.container) {
      this.container.innerHTML = "";
    }
  }
}
