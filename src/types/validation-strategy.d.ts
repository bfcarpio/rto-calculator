/**
 * Validation Strategy Interface
 * Defines the contract for all validation implementations
 */

/**
 * Date range for validation
 */
export interface DateRange {
    startDate: Date;
    endDate: Date;
}

/**
 * Individual day selection type
 */
export type DaySelectionType = 'work-from-home' | 'office' | 'unselected';

/**
 * Selected day information
 */
export interface SelectedDay {
    year: number;
    month: number; // 0-11 (January-December)
    day: number; // 1-31
    type: DaySelectionType;
}

/**
 * Week compliance information
 */
export interface WeekCompliance {
    weekStart: Date;
    weekNumber: number;
    totalDays: number;
    workFromHomeDays: number;
    officeDays: number;
    isCompliant: boolean;
    percentage: number;
}

/**
 * Window compliance result for a multi-week period
 */
export interface WindowCompliance {
    windowStart: number; // Starting week index
    windowEnd: number;   // Ending week index
    weeks: WeekCompliance[];
    totalOfficeDays: number;
    totalWeekdays: number;
    averageOfficeDaysPerWeek: number;
    compliancePercentage: number;
    isCompliant: boolean;
    requiredOfficeDays: number;
    requiredPercentage: number;
}

/**
 * Overall validation result
 */
export interface ValidationResult {
    isValid: boolean;
    message: string;
    overallCompliance: number;
    windowResults: WindowCompliance[];
    violatingWindows: WindowCompliance[];
    compliantWindows: WindowCompliance[];
}

/**
 * Validation configuration options
 */
export interface ValidationConfig {
    minOfficeDaysPerWeek: number;
    totalWeekdaysPerWeek: number;
    rollingPeriodWeeks: number;
    thresholdPercentage: number;
    debug: boolean;
}

/**
 * Context provided to validation strategies
 */
export interface ValidationContext {
    selectedDays: SelectedDay[];
    config: ValidationConfig;
    calendarStartDate?: Date;
    calendarEndDate?: Date;
}

/**
 * Validation Strategy Interface
 * All validation implementations must implement this interface
 */
export interface ValidationStrategy {
    /**
     * Unique identifier for this validation strategy
     */
    readonly name: string;

    /**
     * Human-readable description of what this strategy validates
     */
    readonly description: string;

    /**
     * Default configuration for this strategy
     */
    readonly defaultConfig: ValidationConfig;

    /**
     * Validate the selections according to this strategy's rules
     * @param context - Validation context with selections and configuration
     * @returns Validation result with compliance information
     */
    validate(context: ValidationContext): Promise<ValidationResult> | ValidationResult;

    /**
     * Get the compliance status for a specific week
     * @param weekStart - Start date of the week
     * @param context - Validation context
     * @returns Week compliance information
     */
    getWeekCompliance(weekStart: Date, context: ValidationContext): WeekCompliance;

    /**
     * Get compliance status for a multi-week window
     * @param windowStart - Starting week index
     * @param windowSize - Number of weeks in the window
     * @param context - Validation context
     * @returns Window compliance information
     */
    getWindowCompliance(
        windowStart: number,
        windowSize: number,
        context: ValidationContext
    ): WindowCompliance;

    /**
     * Reset any internal state or caches
     */
    reset(): void;

    /**
     * Check if this strategy is applicable to the current selections
     * @param context - Validation context
     * @returns True if this strategy can be applied
     */
    isApplicable(context: ValidationContext): boolean;
}

/**
 * Validation Strategy Factory
 * Creates and manages validation strategy instances
 */
export interface ValidationStrategyFactory {
    /**
     * Get a validation strategy by name
     * @param name - Strategy name
     * @returns Validation strategy instance or undefined
     */
    getStrategy(name: string): ValidationStrategy | undefined;

    /**
     * Get all available validation strategies
     * @returns Array of all available strategies
     */
    getAllStrategies(): ValidationStrategy[];

    /**
     * Register a new validation strategy
     * @param strategy - Strategy to register
     */
    registerStrategy(strategy: ValidationStrategy): void;

    /**
     * Get the default validation strategy
     * @returns Default strategy instance
     */
    getDefaultStrategy(): ValidationStrategy;
}

/**
 * Validation result display format
 */
export interface ValidationResultDisplay {
    icon: string;
    message: string;
    details: string;
    style: 'success' | 'warning' | 'error' | 'info';
}

/**
 * Progress callback for long-running validations
 */
export type ValidationProgressCallback = (
    currentWeek: number,
    totalWeeks: number,
    message: string
) => void;
