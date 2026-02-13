/**
 * Validation Manager - Strategy Pattern Implementation
 * Manages validation strategies and provides a unified interface for validation
 */

class ValidationManager {
	constructor() {
		this.strategies = new Map();
		this.currentStrategy = null;
		this.config = {
			minOfficeDaysPerWeek: 3,
			totalWeekdaysPerWeek: 5,
			rollingPeriodWeeks: 12,
			thresholdPercentage: 0.6, // 3/5 = 60%
			validationMode: "strict",
			debug: false,
		};
		this.observers = new Set();

		// Register default strategies
		this._registerDefaultStrategies();
	}

	/**
	 * Register default validation strategies
	 * @private
	 */
	_registerDefaultStrategies() {
		if (typeof RollingPeriodValidation !== "undefined") {
			this.registerValidator(new RollingPeriodValidation());
		}
	}

	/**
	 * Register a new validation strategy
	 * @param {ValidationStrategy} strategy - Strategy to register
	 */
	registerValidator(strategy) {
		if (!strategy || !strategy.name) {
			console.error("[ValidationManager] Invalid strategy provided");
			return;
		}

		this.strategies.set(strategy.name, strategy);

		if (this.config.debug) {
			console.log(`[ValidationManager] Registered strategy: ${strategy.name}`);
		}
	}

	/**
	 * Get a validation strategy by name
	 * @param {string} name - Strategy name
	 * @returns {ValidationStrategy|undefined} Strategy instance or undefined
	 */
	getValidator(name) {
		return this.strategies.get(name);
	}

	/**
	 * Get all available validation strategies
	 * @returns {ValidationStrategy[]} Array of all available strategies
	 */
	getAllValidators() {
		return Array.from(this.strategies.values());
	}

	/**
	 * Get the default validation strategy
	 * @returns {ValidationStrategy} Default strategy instance
	 */
	GetDefaultValidator() {
		// Prefer rolling-period strategy, otherwise use first available
		let defaultStrategy = this.strategies.get("rolling-period");

		if (!defaultStrategy && this.strategies.size > 0) {
			defaultStrategy = this.strategies.values().next().value;
		}

		if (!defaultStrategy) {
			throw new Error(
				"[ValidationManager] No validation strategies registered",
			);
		}

		return defaultStrategy;
	}

	/**
	 * Set the current active validation strategy
	 * @param {string} name - Strategy name to activate
	 */
	SetValidator(name) {
		const strategy = this.getValidator(name);

		if (!strategy) {
			console.error(`[ValidationManager] Strategy not found: ${name}`);
			return false;
		}

		this.currentStrategy = strategy;

		if (this.config.debug) {
			console.log(`[ValidationManager] Set active strategy: ${name}`);
		}

		this._notifyObservers({ type: "strategy-changed", strategy });
		return true;
	}

	/**
	 * Get the current active strategy
	 * @returns {ValidationStrategy} Current strategy instance
	 */
	GetCurrentValidator() {
		return this.currentStrategy || this.GetDefaultValidator();
	}

	/**
	 * Update configuration settings
	 * @param {Partial<ValidationConfig>} newConfig - New configuration values
	 */
	updateConfig(newConfig) {
		this.config = { ...this.config, ...newConfig };

		if (this.config.debug) {
			console.log("[ValidationManager] Configuration updated:", this.config);
		}

		this._notifyObservers({ type: "config-changed", config: this.config });
	}

	/**
	 * Get current configuration
	 * @returns {ValidationConfig} Current configuration
	 */
	getConfig() {
		return { ...this.config };
	}

	/**
	 * Toggle debug mode
	 * @param {boolean} enabled - Enable or disable debug mode
	 */
	setDebugMode(enabled) {
		this.config.debug = enabled;

		if (this.config.debug) {
			console.log("[ValidationManager] Debug mode enabled");
		}

		this._notifyObservers({ type: "debug-toggled", debug: enabled });
	}

	/**
	 * Get debug mode status
	 * @returns {boolean} Debug mode enabled
	 */
	getDebugMode() {
		return this.config.debug;
	}

	/**
	 * Validate selections using the current strategy
	 * @param {SelectedDay[]} selectedDays - Array of selected days
	 * @param {Object} options - Additional validation options
	 * @returns {Promise<ValidationResult>} Validation result
	 */
	async validate(selectedDays, options = {}) {
		const strategy = this.GetCurrentValidator();

		if (!strategy) {
			throw new Error("[ValidationManager] No validation strategy available");
		}

		const context = {
			selectedDays,
			config: { ...this.config, ...options.config },
			calendarStartDate: options.calendarStartDate,
			calendarEndDate: options.calendarEndDate,
		};

		if (!strategy.isApplicable(context)) {
			const result = {
				isValid: true,
				message: "Validation not applicable for current selections",
				overallCompliance: 100,
				windowResults: [],
				violatingWindows: [],
				compliantWindows: [],
			};

			if (this.config.debug) {
				console.log(
					"[ValidationManager] Strategy not applicable:",
					strategy.name,
				);
			}

			return result;
		}

		if (this.config.debug) {
			console.log(
				`[ValidationManager] Running validation with strategy: ${strategy.name}`,
			);
			console.log("[ValidationManager] Selected days:", selectedDays.length);
		}

		const result = await strategy.validate(context, this.config.validationMode);

		this._notifyObservers({ type: "validation-complete", result });

		if (this.config.debug) {
			console.log("[ValidationManager] Validation result:", result);
		}

		return result;
	}

	/**
	 * Get compliance status for a specific week
	 * @param {Date} weekStart - Start date of week
	 * @param {SelectedDay[]} selectedDays - Array of selected days
	 * @returns {WeekCompliance} Week compliance information
	 */
	getWeekCompliance(weekStart, selectedDays) {
		const strategy = this.GetCurrentValidator();

		if (!strategy) {
			throw new Error("[ValidationManager] No validation strategy available");
		}

		const context = {
			selectedDays,
			config: this.config,
		};

		return strategy.getWeekCompliance(weekStart, context);
	}

	/**
	 * Get compliance status for a multi-week window
	 * @param {number} windowStart - Starting week index
	 * @param {number} windowSize - Number of weeks in window
	 * @param {SelectedDay[]} selectedDays - Array of selected days
	 * @returns {WindowCompliance} Window compliance information
	 */
	getWindowCompliance(windowStart, windowSize, selectedDays) {
		const strategy = this.GetCurrentValidator();

		if (!strategy) {
			throw new Error("[ValidationManager] No validation strategy available");
		}

		const context = {
			selectedDays,
			config: this.config,
		};

		return strategy.getWindowCompliance(windowStart, windowSize, context);
	}

	/**
	 * Reset the current strategy
	 */
	reset() {
		if (this.currentStrategy) {
			this.currentStrategy.reset();
		}

		if (this.config.debug) {
			console.log("[ValidationManager] Validation reset");
		}
	}

	/**
	 * Add an observer to be notified of validation events
	 * @param {Function} observer - Observer function
	 */
	addObserver(observer) {
		if (typeof observer === "function") {
			this.observers.add(observer);
		}
	}

	/**
	 * Remove an observer
	 * @param {Function} observer - Observer function to remove
	 */
	removeObserver(observer) {
		this.observers.delete(observer);
	}

	/**
	 * Notify all observers of an event
	 * @param {Object} event - Event object
	 * @private
	 */
	_notifyObservers(event) {
		this.observers.forEach((observer) => {
			try {
				observer(event);
			} catch (error) {
				console.error("[ValidationManager] Observer error:", error);
			}
		});
	}

	/**
	 * Get strategy information for UI display
	 * @returns {Array} Array of strategy info objects
	 */
	getValidatorInfo() {
		return Array.from(this.strategies.values()).map((strategy) => ({
			name: strategy.name,
			description: strategy.description,
			isActive:
				this.currentStrategy && this.currentStrategy.name === strategy.name,
		}));
	}

	/**
	 * Initialize validation manager with DOM integration
	 * @param {Object} options - Initialization options
	 */
	initialize(options = {}) {
		if (options.debug !== undefined) {
			this.setDebugMode(options.debug);
		}

		if (options.strategy) {
			this.SetValidator(options.strategy);
		}

		if (options.config) {
			this.updateConfig(options.config);
		}

		if (this.config.debug) {
			console.log("[ValidationManager] Initialized with", {
				strategies: this.strategies.size,
				currentStrategy: this.GetCurrentValidator().name,
				config: this.config,
			});
		}
	}

	/**
	 * Get selected days from DOM
	 * @returns {SelectedDay[]} Array of selected days
	 */
	getSelectedDaysFromDOM() {
		const selectedCells = document.querySelectorAll(
			".calendar-day.selected[data-year][data-month][data-day]",
		);

		const selectedDays = [];
		selectedCells.forEach((cell) => {
			const year = parseInt(cell.dataset.year, 10);
			const month = parseInt(cell.dataset.month, 10);
			const day = parseInt(cell.dataset.day, 10);
			const type = cell.dataset.selectionType || "work-from-home";

			selectedDays.push({ year, month, day, type });
		});

		if (this.config.debug) {
			console.log(
				`[ValidationManager] Found ${selectedDays.length} selected days from DOM`,
			);
		}

		return selectedDays;
	}
}

// Create global singleton instance
const validationManager = new ValidationManager();

// Export for module systems
if (typeof module !== "undefined" && module.exports) {
	module.exports = ValidationManager;
	module.exports.default = validationManager;
} else {
	window.validationManager = validationManager;
}
