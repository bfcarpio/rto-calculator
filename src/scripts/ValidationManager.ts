import {
	BEST_WEEKS_COUNT,
	COMPLIANCE_THRESHOLD,
	MINIMUM_COMPLIANT_DAYS,
	ROLLING_WINDOW_WEEKS,
	TOTAL_WEEK_DAYS,
} from "../lib/validation/constants";
import { RollingPeriodValidation } from "../lib/validation/RollingPeriodValidation";
import type {
	SelectedDay,
	ValidationConfig,
	ValidationResult,
	ValidatorContext,
	WeekCompliance,
	WindowCompliance,
} from "../types/validation-strategy";
import { logger } from "../utils/logger";

type ValidationMode = "strict" | "average";

type ManagedValidator = {
	readonly name: string;
	readonly description: string;
	readonly defaultConfig?: ValidationConfig;
	validate: (
		context: ValidatorContext,
		mode?: ValidationMode,
	) => ValidationResult | Promise<ValidationResult>;
	getWeekCompliance: (
		weekStart: Date,
		context: ValidatorContext,
	) => WeekCompliance;
	getWindowCompliance: (
		windowStart: number,
		windowSize: number,
		context: ValidatorContext,
	) => WindowCompliance;
	isApplicable: (context: ValidatorContext) => boolean;
	reset: () => void;
};

type ValidationEvent =
	| { type: "strategy-changed"; strategy: ManagedValidator }
	| {
			type: "config-changed";
			config: ValidationConfig & { validationMode: ValidationMode };
	  }
	| { type: "debug-toggled"; debug: boolean }
	| { type: "validation-complete"; result: ValidationResult };

type ValidationObserver = (event: ValidationEvent) => void;

interface ValidationOptions {
	config?: Partial<ValidationConfig & { validationMode?: ValidationMode }>;
	calendarStartDate?: Date;
	calendarEndDate?: Date;
}

type ScriptSelectedDay = SelectedDay & { type: string };

const DEFAULT_MANAGER_CONFIG: ValidationConfig & {
	validationMode: ValidationMode;
} = {
	minOfficeDaysPerWeek: MINIMUM_COMPLIANT_DAYS,
	totalWeekdaysPerWeek: TOTAL_WEEK_DAYS,
	rollingPeriodWeeks: ROLLING_WINDOW_WEEKS,
	thresholdPercentage: COMPLIANCE_THRESHOLD,
	bestWeeksCount: BEST_WEEKS_COUNT,
	debug: false,
	validationMode: "strict",
};

/**
 * Validation Manager orchestrates validation strategies using the Strategy pattern.
 */
export class ValidationManager {
	private readonly strategies: Map<string, ManagedValidator> = new Map();
	private currentStrategy: ManagedValidator | null = null;
	private config: ValidationConfig & { validationMode: ValidationMode } =
		DEFAULT_MANAGER_CONFIG;
	private readonly observers: Set<ValidationObserver> = new Set();

	constructor() {
		this._registerDefaultStrategies();
	}

	/**
	 * Register built-in strategies.
	 */
	private _registerDefaultStrategies(): void {
		this.registerValidator(new RollingPeriodValidation());
	}

	/**
	 * Register a new validation strategy.
	 *
	 * @param strategy - Strategy instance to register
	 */
	registerValidator(strategy: ManagedValidator): void {
		if (!strategy?.name) {
			logger.error("[ValidationManager] Invalid strategy provided");
			return;
		}

		this.strategies.set(strategy.name, strategy);

		if (this.config.debug) {
			logger.debug(`[ValidationManager] Registered strategy: ${strategy.name}`);
		}
	}

	/**
	 * Retrieve a validator by name.
	 */
	getValidator(name: string): ManagedValidator | undefined {
		return this.strategies.get(name);
	}

	/**
	 * List all available validators.
	 */
	getAllValidators(): ManagedValidator[] {
		return Array.from(this.strategies.values());
	}

	/**
	 * Get default validator, preferring rolling-period.
	 */
	GetDefaultValidator(): ManagedValidator {
		const rolling = this.strategies.get("rolling-period");
		if (rolling) return rolling;

		const [first] = this.strategies.values();
		if (first) return first;

		throw new Error("[ValidationManager] No validation strategies registered");
	}

	/**
	 * Set the active validator by name.
	 */
	SetValidator(name: string): boolean {
		const strategy = this.getValidator(name);
		if (!strategy) {
			logger.error(`[ValidationManager] Strategy not found: ${name}`);
			return false;
		}

		this.currentStrategy = strategy;
		this._notifyObservers({ type: "strategy-changed", strategy });
		return true;
	}

	/**
	 * Get the current active strategy.
	 */
	GetCurrentValidator(): ManagedValidator {
		return this.currentStrategy ?? this.GetDefaultValidator();
	}

	/**
	 * Update configuration.
	 */
	updateConfig(
		newConfig: Partial<ValidationConfig & { validationMode?: ValidationMode }>,
	): void {
		const { validationMode, ...rest } = newConfig;
		this.config = {
			...this.config,
			...rest,
			validationMode: validationMode ?? this.config.validationMode,
		};
		this._notifyObservers({ type: "config-changed", config: this.config });
	}

	/**
	 * Get current configuration snapshot.
	 */
	getConfig(): ValidationConfig & { validationMode: ValidationMode } {
		return { ...this.config };
	}

	/**
	 * Toggle debug logging.
	 */
	setDebugMode(enabled: boolean): void {
		this.config = { ...this.config, debug: enabled };
		this._notifyObservers({ type: "debug-toggled", debug: enabled });
	}

	/**
	 * Check whether debug mode is enabled.
	 */
	getDebugMode(): boolean {
		return this.config.debug;
	}

	/**
	 * Run validation using the active strategy.
	 */
	async validate(
		selectedDays: SelectedDay[],
		options: ValidationOptions = {},
	): Promise<ValidationResult> {
		const strategy = this.GetCurrentValidator();
		const context = this._buildContext(selectedDays, options);

		if (!strategy.isApplicable(context)) {
			const result: ValidationResult = {
				isValid: true,
				message: "Validation not applicable for current selections",
				overallCompliance: 100,
				windowResults: [],
				violatingWindows: [],
				compliantWindows: [],
			};
			return result;
		}

		const result = await strategy.validate(
			context,
			options.config?.validationMode ?? this.config.validationMode,
		);
		this._notifyObservers({ type: "validation-complete", result });
		return result;
	}

	/**
	 * Compute week compliance through the active strategy.
	 */
	getWeekCompliance(
		weekStart: Date,
		selectedDays: SelectedDay[],
		options: ValidationOptions = {},
	): WeekCompliance {
		const strategy = this.GetCurrentValidator();
		const context = this._buildContext(selectedDays, options);
		return strategy.getWeekCompliance(weekStart, context);
	}

	/**
	 * Compute window compliance through the active strategy.
	 */
	getWindowCompliance(
		windowStart: number,
		windowSize: number,
		selectedDays: SelectedDay[],
		options: ValidationOptions = {},
	): WindowCompliance {
		const strategy = this.GetCurrentValidator();
		const context = this._buildContext(selectedDays, options);
		return strategy.getWindowCompliance(windowStart, windowSize, context);
	}

	/**
	 * Reset the current strategy state.
	 */
	reset(): void {
		this.currentStrategy?.reset();
	}

	/**
	 * Subscribe to validation events.
	 */
	addObserver(observer: ValidationObserver): void {
		this.observers.add(observer);
	}

	/**
	 * Unsubscribe from validation events.
	 */
	removeObserver(observer: ValidationObserver): void {
		this.observers.delete(observer);
	}

	/**
	 * Expose validator metadata for UI.
	 */
	getValidatorInfo(): Array<{
		name: string;
		description: string;
		isActive: boolean;
	}> {
		return Array.from(this.strategies.values()).map((strategy) => ({
			name: strategy.name,
			description: strategy.description,
			isActive: this.GetCurrentValidator().name === strategy.name,
		}));
	}

	/**
	 * Initialize manager with provided options.
	 */
	initialize(
		options: ValidationOptions & { strategy?: string; debug?: boolean } = {},
	): void {
		if (options.debug !== undefined) {
			this.setDebugMode(options.debug);
		}

		if (options.strategy) {
			this.SetValidator(options.strategy);
		}

		if (options.config) {
			this.updateConfig(options.config);
		}
	}

	/**
	 * Extract selected days from DOM.
	 */
	getSelectedDaysFromDOM(): ScriptSelectedDay[] {
		const selectedCells = document.querySelectorAll<HTMLElement>(
			".calendar-day.selected[data-year][data-month][data-day]",
		);

		const selectedDays: ScriptSelectedDay[] = [];
		selectedCells.forEach((cell) => {
			const year = Number.parseInt(cell.dataset.year ?? "", 10);
			const month = Number.parseInt(cell.dataset.month ?? "", 10);
			const day = Number.parseInt(cell.dataset.day ?? "", 10);
			const selectionType = cell.dataset.selectionType;
			const type: SelectedDay["type"] =
				selectionType === "out-of-office" || selectionType === "none"
					? selectionType
					: "out-of-office";

			if (Number.isNaN(year) || Number.isNaN(month) || Number.isNaN(day)) {
				return;
			}

			selectedDays.push({ year, month, day, type });
		});

		return selectedDays;
	}

	private _notifyObservers(event: ValidationEvent): void {
		this.observers.forEach((observer) => {
			try {
				observer(event);
			} catch (error) {
				logger.error("[ValidationManager] Observer error:", error);
			}
		});
	}

	private _buildContext(
		selectedDays: SelectedDay[],
		options: ValidationOptions,
	): ValidatorContext {
		const { validationMode, ...config } = {
			...this.config,
			...options.config,
		};

		const context: ValidatorContext = {
			selectedDays,
			config,
		};

		if (options.calendarStartDate) {
			context.calendarStartDate = options.calendarStartDate;
		}
		if (options.calendarEndDate) {
			context.calendarEndDate = options.calendarEndDate;
		}

		void validationMode; // validation mode is handled separately
		return context;
	}
}

export const validationManager = new ValidationManager();

if (typeof window !== "undefined") {
	(
		window as typeof window & { validationManager?: ValidationManager }
	).validationManager = validationManager;
}

export default validationManager;
