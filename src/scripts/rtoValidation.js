// @ts-check
/**
 * RTO Validation Client-Side Script
 *
 * Validates that weeks meet the RTO policy requirement of 3+ office days per week.
 * This uses a rolling 12-week validation starting from the current week.
 *
 * Validation Logic:
 * - Office days = Weekdays (Mon-Fri) that are NOT marked as work-from-home
 * - Work-from-home days reduce the office day count
 * - Week is compliant if office days >= 3 (60%)
 */

// Configuration
const CONFIG = {
    MIN_OFFICE_DAYS_PER_WEEK: 3,
    TOTAL_WEEKDAYS_PER_WEEK: 5,
    ROLLING_PERIOD_WEEKS: 12,
    THRESHOLD_PERCENTAGE: 0.6, // 3/5 = 60%
    DEBUG: false,
};

// State
let validationTimeout = null;

/**
 * Get the Monday (start) of the week for a given date
 * @param {Date} date - The reference date
 * @returns {Date} Monday of that week
 */
function getStartOfWeek(date) {
    const d = new Date(date);
    const day = d.getDay();
    // Sunday (0) -> go back 6 days to Monday
    // Monday (1) -> same day
    // Tuesday (2) -> go back 1 day
    // etc.
    const daysToSubtract = day === 0 ? 6 : day - 1;
    d.setDate(d.getDate() - daysToSubtract);
    d.setHours(0, 0, 0, 0);
    return d;
}

/**
 * Get all work-from-home dates from the DOM
 * @returns {Array<Date>} Array of work-from-home dates
 */
function getWorkFromHomeDates() {
    const wfhCells = document.querySelectorAll(
        '.calendar-day.selected.work-from-home[data-year][data-month][data-day]'
    );
    const wfhDates = [];

    wfhCells.forEach((cell) => {
        const year = parseInt(cell.dataset.year);
        const month = parseInt(cell.dataset.month);
        const day = parseInt(cell.dataset.day);
        const date = new Date(year, month, day);
        wfhDates.push(date);
    });

    if (CONFIG.DEBUG) {
        console.log(`[RTO Validation] Found ${wfhDates.length} work-from-home dates`);
    }

    return wfhDates;
}

/**
 * Get the Monday of the current week
 * @returns {Date|null} Monday of current week, or null if no calendar found
 */
function getCurrentWeekStart() {
    // Find any calendar cell to determine current week
    const calendarCells = document.querySelectorAll(
        '.calendar-day[data-year][data-month][data-day]:not(.empty)'
    );

    if (calendarCells.length === 0) {
        return null;
    }

    const firstCell = calendarCells[0];
    const year = parseInt(firstCell.dataset.year);
    const month = parseInt(firstCell.dataset.month);
    const day = parseInt(firstCell.dataset.day);

    return getStartOfWeek(new Date(year, month, day));
}

/**
 * Group work-from-home dates by week
 * @param {Array<Date>} wfhDates - Work-from-home dates
 * @returns {Map<number, number>} Map of week start timestamp to WFH day count
 */
function groupDatesByWeek(wfhDates) {
    const weeksMap = new Map();

    wfhDates.forEach((date) => {
        const weekStart = getStartOfWeek(date);
        const weekKey = weekStart.getTime();
        weeksMap.set(weekKey, (weeksMap.get(weekKey) || 0) + 1);
    });

    if (CONFIG.DEBUG) {
        console.log(`[RTO Validation] Grouped dates into ${weeksMap.size} weeks`);
    }

    return weeksMap;
}

/**
 * Calculate compliance for a specific week
 * @param {Date} weekStart - Monday of the week
 * @param {Map<number, number>} weeksByWFH - Map of weeks with WFH counts
 * @returns {Object} Week compliance data
 */
function calculateWeekCompliance(weekStart, weeksByWFH) {
    const weekKey = weekStart.getTime();
    const wfhDays = weeksByWFH.get(weekKey) || 0;
    const officeDays = CONFIG.TOTAL_WEEKDAYS_PER_WEEK - wfhDays;
    const isCompliant = officeDays >= CONFIG.MIN_OFFICE_DAYS_PER_WEEK;
    const percentage = (officeDays / CONFIG.TOTAL_WEEKDAYS_PER_WEEK) * 100;

    return {
        weekStart: new Date(weekStart),
        officeDays,
        wfhDays,
        totalDays: CONFIG.TOTAL_WEEKDAYS_PER_WEEK,
        isCompliant,
        percentage,
    };
}

/**
 * Get all days in a week (Monday-Friday)
 * @param {Date} weekStart - Monday of the week
 * @returns {Array<Date>} Weekday dates for the week
 */
function getWeekDates(weekStart) {
    const dates = [];
    for (let i = 0; i < 5; i++) {
        const d = new Date(weekStart);
        d.setDate(weekStart.getDate() + i);
        dates.push(d);
    }
    return dates;
}

/**
 * Get the week number for a date within the rolling period
 * @param {Date} weekStart - Monday of the week
 * @returns {number} Week number (0-11 for rolling period)
 */
function getRollingWeekNumber(weekStart) {
    const currentWeekStart = getCurrentWeekStart();
    if (!currentWeekStart) return 0;

    const weekDiff = Math.round(
        (weekStart.getTime() - currentWeekStart.getTime()) / (7 * 24 * 60 * 60 * 1000)
    );

    // Normalize to 0-11 range
    return Math.max(0, Math.min(weekDiff, 11));
}

/**
 * Calculate rolling 12-week compliance
 * @returns {Object} Overall compliance data
 */
function calculateRollingCompliance() {
    const wfhDates = getWorkFromHomeDates();
    const weeksByWFH = groupDatesByWeek(wfhDates);
    const currentWeekStart = getCurrentWeekStart();

    if (!currentWeekStart) {
        return {
            isValid: true,
            message: 'No calendar data available',
            weeksData: [],
            overallCompliance: 100,
        };
    }

    // Get data for rolling 12-week period
    const weeksData = [];
    for (let week = 0; week < CONFIG.ROLLING_PERIOD_WEEKS; week++) {
        const weekStart = new Date(currentWeekStart);
        weekStart.setDate(currentWeekStart.getDate() + week * 7);
        const weekData = calculateWeekCompliance(weekStart, weeksByWFH);
        weeksData.push(weekData);
    }

    // Calculate overall compliance
    const totalOfficeDays = weeksData.reduce((sum, week) => sum + week.officeDays, 0);
    const totalWeekdays = weeksData.reduce((sum, week) => sum + week.totalDays, 0);
    const overallCompliance = totalWeekdays > 0 ? (totalOfficeDays / totalWeekdays) * 100 : 100;
    const isValid = overallCompliance >= (CONFIG.THRESHOLD_PERCENTAGE * 100);

    // Generate message
    const avgOfficeDays = totalOfficeDays / CONFIG.ROLLING_PERIOD_WEEKS;
    const avgPercentage = overallCompliance;
    const requiredPercentage = CONFIG.THRESHOLD_PERCENTAGE * 100;

    const message = isValid
        ? `✓ RTO Compliant: ${avgOfficeDays.toFixed(1)} avg office days (${avgPercentage.toFixed(0)}%) of 5 weekdays. Required: ${CONFIG.MIN_OFFICE_DAYS_PER_WEEK} days (${requiredPercentage.toFixed(0)}%)`
        : `✗ RTO Violation: ${avgOfficeDays.toFixed(1)} avg office days (${avgPercentage.toFixed(0)}%) of 5 weekdays. Required: ${CONFIG.MIN_OFFICE_DAYS_PER_WEEK} days (${requiredPercentage.toFixed(0)}%)`;

    if (CONFIG.DEBUG) {
        console.log('[RTO Validation] Weeks Data:', weeksData);
        console.log('[RTO Validation] Overall Compliance:', {
            totalOfficeDays,
            totalWeekdays,
            avgOfficeDays,
            avgPercentage,
            requiredPercentage,
            isValid,
        });
    }

    return {
        isValid,
        message,
        weeksData,
        overallCompliance,
        currentWeekNumber: getRollingWeekNumber(currentWeekStart),
    };
}

/**
 * Update the compliance indicator in the UI
 */
function updateComplianceIndicator() {
    const result = calculateRollingCompliance();
    const indicator = document.getElementById('compliance-indicator');
    const icon = document.getElementById('compliance-icon');
    const text = document.getElementById('compliance-text');
    const validationMessage = document.getElementById('validation-message');

    if (!indicator || !icon || !text) return;

    // Remove all status classes
    indicator.classList.remove('compliant', 'violation', 'warning');

    if (result.isValid) {
        indicator.classList.add('compliant');
        icon.textContent = '✓';
        text.textContent = `${result.overallCompliance.toFixed(0)}% Compliant`;
    } else {
        indicator.classList.add('violation');
        icon.textContent = '✗';
        text.textContent = `${result.overallCompliance.toFixed(0)}% Compliant`;
    }

    // Update detailed validation message
    if (validationMessage) {
        validationMessage.textContent = result.message;
        validationMessage.style.display = 'flex';
        validationMessage.className = `validation-message centered-message ${result.isValid ? 'success' : 'error'}`;
    }

    // Announce to screen readers
    announceToScreenReader(result.message);
}

/**
 * Highlight the current week being evaluated
 */
function highlightCurrentWeek() {
    const currentWeekStart = getCurrentWeekStart();
    if (!currentWeekStart) return;

    const weekDates = getWeekDates(currentWeekStart);

    // Clear previous highlights
    document.querySelectorAll('.calendar-day.current-week').forEach((cell) => {
        cell.classList.remove('current-week');
    });

    // Highlight current week
    weekDates.forEach((date) => {
        const dayCells = document.querySelectorAll(
            `.calendar-day[data-year="${date.getFullYear()}"][data-month="${date.getMonth()}"][data-day="${date.getDate()}"]`
        );
        dayCells.forEach((cell) => {
            cell.classList.add('current-week');
        });
    });
}

/**
 * Update week status column in calendar
 */
function updateWeekStatusColumn() {
    const currentWeekStart = getCurrentWeekStart();
    if (!currentWeekStart) return;

    const wfhDates = getWorkFromHomeDates();
    const weeksByWFH = groupDatesByWeek(wfhDates);

    // Update status for current week only
    const weekData = calculateWeekCompliance(currentWeekStart, weeksByWFH);
    const statusCell = document.querySelector(`[data-week-start="${currentWeekStart.getTime()}"]`);

    if (statusCell) {
        const statusContainer = statusCell.querySelector('.week-status-container');
        if (statusContainer) {
            statusContainer.innerHTML = `
                <div class="week-status ${weekData.isCompliant ? 'compliant' : 'non-compliant'}"
                     aria-live="polite"
                     aria-label="Week: ${weekData.isCompliant ? 'Compliant' : 'Not Compliant'}">
                    <span class="week-status-icon">${weekData.isCompliant ? '✓' : '✗'}</span>
                    <span class="sr-only">${weekData.isCompliant ? 'Compliant' : 'Not Compliant'}: ${weekData.officeDays}/5 office days</span>
                </div>
            `;
        }
    }
}

/**
 * Dim weekends in the calendar
 */
function dimWeekends() {
    const allCells = document.querySelectorAll('.calendar-day[data-day]');

    allCells.forEach((cell) => {
        const year = parseInt(cell.dataset.year);
        const month = parseInt(cell.dataset.month);
        const day = parseInt(cell.dataset.day);
        const date = new Date(year, month, day);
        const dayOfWeek = date.getDay();

        // Saturday (6) or Sunday (0)
        if (dayOfWeek === 0 || dayOfWeek === 6) {
            cell.classList.add('weekend');
        } else {
            cell.classList.remove('weekend');
        }
    });
}

/**
 * Announce a message to screen readers
 * @param {string} message - The message to announce
 */
function announceToScreenReader(message) {
    const announcement = document.createElement('div');
    announcement.setAttribute('role', 'status');
    announcement.setAttribute('aria-live', 'polite');
    announcement.setAttribute('aria-atomic', 'true');
    announcement.className = 'sr-only calendar-announcement';
    announcement.textContent = message;
    document.body.appendChild(announcement);

    setTimeout(() => {
        document.body.removeChild(announcement);
    }, 1000);
}

/**
 * Initialize RTO validation
 */
function initRTOValidation() {
    // Highlight current week
    highlightCurrentWeek();

    // Dim weekends
    dimWeekends();

    // Run initial validation
    updateComplianceIndicator();

    // Set up MutationObserver to watch for selection changes
    const observer = new MutationObserver((mutations) => {
        let needsUpdate = false;

        mutations.forEach((mutation) => {
            if (
                mutation.type === 'attributes' &&
                (mutation.attributeName === 'data-selected' ||
                 mutation.attributeName === 'data-selection-type' ||
                 mutation.attributeName === 'class')
            ) {
                needsUpdate = true;
            }
        });

        if (needsUpdate) {
            if (validationTimeout) {
                clearTimeout(validationTimeout);
            }
            validationTimeout = setTimeout(() => {
                updateComplianceIndicator();
                updateWeekStatusColumn();
            }, 100);
        }
    });

    // Observe all day cells
    const dayCells = document.querySelectorAll(
        '.calendar-day[data-year][data-month][data-day]:not(.empty)'
    );

    dayCells.forEach((cell) => {
        observer.observe(cell, {
            attributes: true,
            attributeFilter: ['data-selected', 'data-selection-type', 'class'],
        });
    });

    // Store observer for cleanup
    window.rtoValidationObserver = observer;

    if (CONFIG.DEBUG) {
        console.log('[RTO Validation] Initialized');
    }
}

/**
 * Clean up RTO validation resources
 */
function cleanupRTOValidation() {
    if (window.rtoValidationObserver) {
        window.rtoValidationObserver.disconnect();
    }
    if (validationTimeout) {
        clearTimeout(validationTimeout);
    }

    if (CONFIG.DEBUG) {
        console.log('[RTO Validation] Cleaned up');
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initRTOValidation);
} else {
    initRTOValidation();
}

// Export functions for external access if needed
window.RTOValidation = {
    calculateRollingCompliance,
    updateComplianceIndicator,
    highlightCurrentWeek,
    cleanupRTOValidation,
};
