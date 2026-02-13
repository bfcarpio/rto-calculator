/**
 * Type definitions for rtoValidation.js
 * Provides types for RTO validation operations to satisfy TypeScript
 */

/**
 * Compliance result from validation
 */
interface ComplianceResult {
    isValid: boolean;
    message: string;
    overallCompliance: number;
}

/**
 * Week information for tracking
 */
interface WeekInfo {
    week: Date;
    weekNumber: number;
    wfhCount: number;
}

/**
 * RTO Validation API
 */
interface RTOValidationAPI {
    /**
     * Configuration object
     */
    CONFIG: RTOValidationConfig;

    /**
     * Calculate rolling compliance over a 12-week period
     */
    calculateRollingCompliance(): ComplianceResult;

    /**
     * Update compliance indicator display
     */
    updateComplianceIndicator(result?: ComplianceResult): void;

    /**
     * Highlight current week in calendar
     */
    highlightCurrentWeek(): void;

    /**
     * Run basic validation without highlighting
     */
    runValidation(): void;

    /**
     * Run validation with real-time highlighting of evaluated weeks
     */
    runValidationWithHighlights(): void;

    /**
     * Clear all validation highlights from calendar
     */
    clearAllValidationHighlights(): void;

    /**
     * Clean up RTO validation resources and event listeners
     */
    cleanupRTOValidation(): void;
}

/**
 * RTO Validation Configuration
 */
interface RTOValidationConfig {
    DEBUG: boolean;
    MIN_OFFICE_DAYS_PER_WEEK: number;
    TOTAL_WEEKDAYS_PER_WEEK: number;
    ROLLING_PERIOD_WEEKS: number;
    THRESHOLD_PERCENTAGE: number;
}

declare global {
    interface Window {
        RTOValidation?: RTOValidationAPI;
        validationManager?: import("../scripts/ValidationManager").ValidationManager;
    }
}

export {};
