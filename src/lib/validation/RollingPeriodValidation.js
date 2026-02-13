/**
 * Rolling Period Validation Strategy
 * Validates RTO compliance over rolling 12-week periods
 * Implements the ValidationStrategy interface
 */

class RollingPeriodValidation {
  constructor() {
    this.name = "rolling-period";
    this.description = "Validates RTO compliance over rolling 12-week periods";
    this.defaultConfig = {
      minOfficeDaysPerWeek: 3,
      totalWeekdaysPerWeek: 5,
      rollingPeriodWeeks: 12,
      thresholdPercentage: 0.6, // 3/5 = 60%
      debug: false,
    };

    this.cache = new Map();
    this.weekStart = null;
  }

  /**
   * Validate selections according to rolling period rules
   * @param {ValidationContext} context - Validation context
   * @returns {ValidationResult} Validation result
   */
  validate(context) {
    if (!context.selectedDays || context.selectedDays.length === 0) {
      return {
        isValid: true,
        message: "No selections to validate",
        overallCompliance: 100,
        windowResults: [],
        violatingWindows: [],
        compliantWindows: [],
      };
    }

    const config = { ...this.defaultConfig, ...context.config };
    this.weekStart = this._getStartOfWeek(context.selectedDays[0]);

    // Group selections by week
    const weeksByWFH = this._groupDaysByWeek(
      context.selectedDays,
      this.weekStart,
    );

    // Calculate total windows to validate
    const totalWeeksInCalendar = this._getTotalWeeks(context);
    const totalWindows = totalWeeksInCalendar - config.rollingPeriodWeeks;

    // Validate each window
    const windowResults = [];
    for (let windowStart = 0; windowStart <= totalWindows; windowStart++) {
      const windowCompliance = this.getWindowCompliance(
        windowStart,
        config.rollingPeriodWeeks,
        { ...context, weeksByWFH },
      );
      windowResults.push(windowCompliance);
    }

    // Separate violating and compliant windows
    const violatingWindows = windowResults.filter((w) => !w.isCompliant);
    const compliantWindows = windowResults.filter((w) => w.isCompliant);

    // Determine overall compliance (use first violating window or first window)
    const resultWindow =
      violatingWindows.length > 0
        ? violatingWindows[0]
        : windowResults[0] || null;

    const overallCompliance = resultWindow
      ? resultWindow.compliancePercentage
      : 100;

    const isValid = overallCompliance >= config.thresholdPercentage * 100;

    const avgOfficeDays = resultWindow
      ? resultWindow.averageOfficeDaysPerWeek
      : config.minOfficeDaysPerWeek;

    const message = isValid
      ? `✓ RTO Compliant: ${avgOfficeDays.toFixed(1)} avg office days (${overallCompliance.toFixed(0)}%) of 5 weekdays. Required: ${config.minOfficeDaysPerWeek} days (${(config.thresholdPercentage * 100).toFixed(0)}%)`
      : `✗ RTO Violation: ${avgOfficeDays.toFixed(1)} avg office days (${overallCompliance.toFixed(0)}%) of 5 weekdays. Required: ${config.minOfficeDaysPerWeek} days (${(config.thresholdPercentage * 100).toFixed(0)}%)`;

    if (config.debug) {
      console.log(`[RollingPeriodValidation] Validation complete`);
      console.log(
        `[RollingPeriodValidation] Total windows: ${windowResults.length}`,
      );
      console.log(
        `[RollingPeriodValidation] Violating windows: ${violatingWindows.length}`,
      );
    }

    return {
      isValid,
      message,
      overallCompliance,
      windowResults,
      violatingWindows,
      compliantWindows,
    };
  }

  /**
   * Get compliance status for a specific week
   * @param {Date} weekStart - Start date of week
   * @param {ValidationContext} context - Validation context
   * @returns {WeekCompliance} Week compliance information
   */
  getWeekCompliance(weekStart, context) {
    const config = { ...this.defaultConfig, ...context.config };
    const weekKey = weekStart.getTime();

    const weeksByWFH =
      context.weeksByWFH ||
      this._groupDaysByWeek(
        context.selectedDays || [],
        this._getStartOfWeek(weekStart),
      );

    const wfhDays = weeksByWFH.get(weekKey) || 0;
    const officeDays = config.totalWeekdaysPerWeek - wfhDays;
    const percentage = (officeDays / config.totalWeekdaysPerWeek) * 100;
    const isCompliant = percentage >= config.thresholdPercentage * 100;

    if (config.debug) {
      console.log(
        `[RollingPeriodValidation] Week ${weekKey}: ${officeDays}/${config.totalWeekdaysPerWeek} office days (${percentage.toFixed(0)}%)`,
      );
    }

    return {
      weekStart: new Date(weekStart),
      weekNumber: this._getWeekNumber(weekStart),
      totalDays: config.totalWeekdaysPerWeek,
      workFromHomeDays: wfhDays,
      officeDays,
      isCompliant,
      percentage,
    };
  }

  /**
   * Get compliance status for a multi-week window
   * @param {number} windowStart - Starting week index
   * @param {number} windowSize - Number of weeks in window
   * @param {ValidationContext} context - Validation context
   * @returns {WindowCompliance} Window compliance information
   */
  getWindowCompliance(windowStart, windowSize, context) {
    const config = { ...this.defaultConfig, ...context.config };
    const weeksByWFH =
      context.weeksByWFH ||
      this._groupDaysByWeek(
        context.selectedDays || [],
        this._getStartOfWeek(context.selectedDays?.[0]),
      );

    let totalOfficeDays = 0;
    let totalWeekdays = 0;
    const weeks = [];

    for (
      let weekIndex = windowStart;
      weekIndex < windowStart + windowSize;
      weekIndex++
    ) {
      const weekStart = new Date(this.weekStart);
      weekStart.setDate(this.weekStart.getDate() + weekIndex * 7);

      const weekCompliance = this.getWeekCompliance(weekStart, {
        ...context,
        weeksByWFH,
      });

      weeks.push(weekCompliance);
      totalOfficeDays += weekCompliance.officeDays;
      totalWeekdays += weekCompliance.totalDays;
    }

    const averageOfficeDaysPerWeek = totalOfficeDays / windowSize;
    const compliancePercentage =
      totalWeekdays > 0 ? (totalOfficeDays / totalWeekdays) * 100 : 100;
    const isCompliant =
      compliancePercentage >= config.thresholdPercentage * 100;

    if (config.debug) {
      console.log(
        `[RollingPeriodValidation] Window ${windowStart}-${windowStart + windowSize - 1}: ${averageOfficeDaysPerWeek.toFixed(1)} avg office days (${compliancePercentage.toFixed(0)}%)`,
      );
    }

    return {
      windowStart,
      windowEnd: windowStart + windowSize - 1,
      weeks,
      totalOfficeDays,
      totalWeekdays,
      averageOfficeDaysPerWeek,
      compliancePercentage,
      isCompliant,
      requiredOfficeDays: config.minOfficeDaysPerWeek,
      requiredPercentage: config.thresholdPercentage * 100,
    };
  }

  /**
   * Reset any internal state or caches
   */
  reset() {
    this.cache.clear();
    this.weekStart = null;
  }

  /**
   * Check if this strategy is applicable to current selections
   * @param {ValidationContext} context - Validation context
   * @returns {boolean} True if this strategy can be applied
   */
  isApplicable(context) {
    // This strategy is always applicable as long as we have selections
    return context.selectedDays && context.selectedDays.length > 0;
  }

  /**
   * Get start of week (Sunday) for a given date
   * @param {Date|Object} date - Date object or selected day object
   * @returns {Date} Start of week (Sunday)
   * @private
   */
  _getStartOfWeek(date) {
    let d = new Date(date);
    if (date.year !== undefined) {
      // If it's a selected day object
      d = new Date(date.year, date.month, date.day);
    }

    const dayOfWeek = d.getDay();
    const daysToSubtract = dayOfWeek; // Sunday (0) -> 0, Monday (1) -> 1, etc.
    d.setDate(d.getDate() - daysToSubtract);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  /**
   * Get week number from start of year
   * @param {Date} date - Date to get week number for
   * @returns {number} Week number (1-based)
   * @private
   */
  _getWeekNumber(date) {
    const yearStart = new Date(date.getFullYear(), 0, 1);
    const diffTime = date.getTime() - yearStart.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return Math.floor(diffDays / 7) + 1;
  }

  /**
   * Get total weeks in calendar
   * @param {ValidationContext} context - Validation context
   * @returns {number} Total weeks
   * @private
   */
  _getTotalWeeks(context) {
    if (context.calendarStartDate && context.calendarEndDate) {
      const diffTime =
        context.calendarEndDate.getTime() - context.calendarStartDate.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      return Math.ceil(diffDays / 7);
    }

    // Default to 52 weeks for a full year
    return 52;
  }

  /**
   * Group days by week start date
   * @param {Array} days - Array of selected days
   * @param {Date} weekStart - Reference week start
   * @returns {Map} Map of week start timestamp to work-from-home count
   * @private
   */
  _groupDaysByWeek(days, weekStart) {
    const weeksMap = new Map();

    days.forEach((day) => {
      const dayDate = new Date(day.year, day.month, day.day);
      const dayOfWeek = dayDate.getDay();
      const daysToSubtract = dayOfWeek;
      const sundayDate = new Date(dayDate);
      sundayDate.setDate(dayDate.getDate() - daysToSubtract);
      sundayDate.setHours(0, 0, 0, 0);

      const weekKey = sundayDate.getTime();
      const currentCount = weeksMap.get(weekKey) || 0;
      weeksMap.set(weekKey, currentCount + 1);
    });

    return weeksMap;
  }
}

// Export for use in validation system
if (typeof module !== "undefined" && module.exports) {
  module.exports = RollingPeriodValidation;
} else {
  window.RollingPeriodValidation = RollingPeriodValidation;
}
