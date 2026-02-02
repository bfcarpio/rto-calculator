/**
 * Holiday Data Source Factory
 * Manages holiday data source instances using the Factory pattern
 * Implements Singleton pattern to ensure single instance
 */

class HolidayDataSourceFactory {
	/**
	 * Get the singleton instance of the factory
	 * @returns {Promise<HolidayDataSourceFactory>} Factory instance
	 */
	static async getInstance() {
		if (!HolidayDataSourceFactory._instance) {
			HolidayDataSourceFactory._instance = new HolidayDataSourceFactory();
			await HolidayDataSourceFactory._instance.initialize();
		}
		return HolidayDataSourceFactory._instance;
	}

	/**
	 * Constructs a new HolidayDataSourceFactory (private constructor)
	 * @private
	 */
	constructor() {
		this.dataSources = new Map();
		this.defaultDataSourceName = "nager-date";
		this.initialized = false;
	}

	/**
	 * Initialize default data sources - must be called before using the factory
	 * @returns {Promise<void>}
	 */
	async initialize() {
		if (this.initialized) {
			return;
		}

		try {
			// Dynamically import and register NagerDateHolidayDataSource
			const { default: NagerDateHolidayDataSource } = await import(
				"./NagerDateHolidayDataSource.js"
			);
			const nagerDataSource = new NagerDateHolidayDataSource();
			this.registerDataSource(nagerDataSource);
			this.defaultDataSourceName = "nager-date";
		} catch (error) {
			console.warn(
				`[HolidayDataSourceFactory] Failed to initialize default data sources: ${error.message}`,
			);
		}

		this.initialized = true;
	}

	/**
	 * Get a data source by name
	 * @param {string} name - Data source name
	 * @returns {HolidayDataSource|undefined} Data source instance or undefined
	 * @throws {Error} If factory is not initialized
	 */
	getDataSource(name) {
		if (!this.initialized) {
			throw new Error(
				"HolidayDataSourceFactory not initialized. Call initialize() first.",
			);
		}
		return this.dataSources.get(name);
	}

	/**
	 * Get all available data sources
	 * @returns {Array<HolidayDataSource>} Array of all available data sources
	 */
	getAllDataSources() {
		return Array.from(this.dataSources.values());
	}

	/**
	 * Register a new data source
	 * @param {HolidayDataSource} dataSource - Data source to register
	 * @throws {Error} If data source with same name already exists
	 */
	registerDataSource(dataSource) {
		if (!dataSource.name) {
			throw new Error("Data source must have a name property");
		}

		if (this.dataSources.has(dataSource.name)) {
			throw new Error(
				`Data source with name '${dataSource.name}' already exists`,
			);
		}

		this.dataSources.set(dataSource.name, dataSource);

		if (dataSource.config?.debug) {
			console.log(
				`[HolidayDataSourceFactory] Registered data source: ${dataSource.name}`,
			);
		}
	}

	/**
	 * Unregister a data source by name
	 * @param {string} name - Name of the data source to unregister
	 * @returns {boolean} True if data source was unregistered, false if not found
	 */
	unregisterDataSource(name) {
		const result = this.dataSources.delete(name);

		if (result && this.defaultDataSourceName === name) {
			// Reset default to first available data source
			const remaining = this.getAllDataSources();
			if (remaining.length > 0) {
				this.defaultDataSourceName = remaining[0].name;
			} else {
				this.defaultDataSourceName = null;
			}
		}

		return result;
	}

	/**
	 * Get the default data source
	 * @returns {HolidayDataSource} Default data source instance
	 * @throws {Error} If no data sources are available
	 */
	getDefaultDataSource() {
		if (this.defaultDataSourceName) {
			const dataSource = this.dataSources.get(this.defaultDataSourceName);
			if (dataSource) {
				return dataSource;
			}
		}

		// If default is not set or not found, try to use first available
		const allDataSources = this.getAllDataSources();
		if (allDataSources.length > 0) {
			this.defaultDataSourceName = allDataSources[0].name;
			return allDataSources[0];
		}

		throw new Error("No holiday data sources available");
	}

	/**
	 * Set the default data source
	 * @param {string} name - Name of the data source to set as default
	 * @throws {Error} If data source with given name doesn't exist
	 */
	setDefaultDataSource(name) {
		if (!this.dataSources.has(name)) {
			throw new Error(`Data source '${name}' not found`);
		}
		this.defaultDataSourceName = name;
	}

	/**
	 * Check health of all data sources
	 * @returns {Promise<Map<string, DataSourceStatus>>} Map of data source names to their status
	 */
	async checkAllDataSources() {
		const statusMap = new Map();
		const dataSources = this.getAllDataSources();

		const checkPromises = dataSources.map(async (dataSource) => {
			try {
				const status = await dataSource.checkAvailability();
				statusMap.set(dataSource.name, status);
			} catch (error) {
				statusMap.set(dataSource.name, {
					isAvailable: false,
					error: error.message,
				});
			}
		});

		await Promise.all(checkPromises);

		return statusMap;
	}

	/**
	 * Get a list of all registered data source names
	 * @returns {Array<string>} Array of data source names
	 */
	getDataSourceNames() {
		return Array.from(this.dataSources.keys());
	}

	/**
	 * Check if a data source with the given name exists
	 * @param {string} name - Name to check
	 * @returns {boolean} True if data source exists
	 */
	hasDataSource(name) {
		return this.dataSources.has(name);
	}

	/**
	 * Clear all caches for all registered data sources
	 * @returns {Promise<void>}
	 */
	async clearAllCaches() {
		const dataSources = this.getAllDataSources();
		const clearPromises = dataSources.map((dataSource) =>
			dataSource.clearCache(),
		);
		await Promise.all(clearPromises);
	}

	/**
	 * Reset all registered data sources to their initial state
	 * @returns {Promise<void>}
	 */
	async resetAllDataSources() {
		const dataSources = this.getAllDataSources();
		const resetPromises = dataSources.map((dataSource) => dataSource.reset());
		await Promise.all(resetPromises);
	}

	/**
	 * Get data source statistics
	 * @returns {object} Statistics object with data source information
	 */
	getStatistics() {
		const dataSources = this.getAllDataSources();
		const stats = {
			totalDataSources: dataSources.length,
			defaultDataSource: this.defaultDataSourceName,
			dataSources: {},
		};

		for (const dataSource of dataSources) {
			const config = dataSource.getConfig ? dataSource.getConfig() : {};
			stats.dataSources[dataSource.name] = {
				description: dataSource.description || "No description",
				cacheEnabled: config.enableCache,
				debugEnabled: config.debug,
				defaultCountryCode: config.defaultCountryCode,
			};
		}

		return stats;
	}

	/**
	 * Reload a data source (unregister and reinitialize)
	 * @param {string} name - Name of the data source to reload
	 * @param {object} config - Optional new configuration
	 * @returns {HolidayDataSource} Reloaded data source instance
	 * @throws {Error} If data source doesn't exist or cannot be reloaded
	 */
	async reloadDataSource(name, config = {}) {
		const existingDataSource = this.dataSources.get(name);

		if (!existingDataSource) {
			throw new Error(`Data source '${name}' not found`);
		}

		// Remove existing data source
		this.unregisterDataSource(name);

		try {
			// Re-create the data source
			let newDataSource;

			if (name === "nager-date") {
				const { default: NagerDateHolidayDataSource } = await import(
					"./NagerDateHolidayDataSource.js"
				);
				newDataSource = new NagerDateHolidayDataSource(config);
			} else {
				throw new Error(
					`Cannot reload data source type '${name}' - not supported`,
				);
			}

			this.registerDataSource(newDataSource);
			return newDataSource;
		} catch (error) {
			// Try to restore the original data source on failure
			try {
				this.registerDataSource(existingDataSource);
			} catch (restoreError) {
				console.error(
					`[HolidayDataSourceFactory] Failed to restore original data source: ${restoreError.message}`,
				);
			}
			throw new Error(
				`Failed to reload data source '${name}': ${error.message}`,
			);
		}
	}

	/**
	 * Reset the factory instance (useful for testing)
	 * @private
	 */
	static _resetInstance() {
		HolidayDataSourceFactory._instance = null;
	}
}

// Export the singleton instance getter as the default export
export default HolidayDataSourceFactory;

// Also export the class itself for testing purposes (named export)
export { HolidayDataSourceFactory };
