/**
 * Holiday Data Source Factory
 * Manages holiday data source instances using the Factory pattern
 * Implements Singleton pattern to ensure single instance
 */

import { logger } from "../../../utils/logger";
import NagerDateHolidayDataSource from "./NagerDateHolidayDataSource";
import type {
	DataSourceStatus,
	HolidayDataSource,
	HolidayDataSourceConfig,
} from "./types";

type ReloadConfig = HolidayDataSourceConfig & Record<string, unknown>;

interface DataSourceStats {
	totalDataSources: number;
	defaultDataSource: string | null;
	dataSources: Record<
		string,
		{
			description: string;
			cacheEnabled?: boolean | undefined;
			debugEnabled?: boolean | undefined;
			defaultCountryCode?: string | undefined;
		}
	>;
}

export class HolidayDataSourceFactory {
	private static _instance: HolidayDataSourceFactory | null = null;
	private dataSources: Map<string, HolidayDataSource>;
	private defaultDataSourceName: string | null;
	private initialized: boolean;

	/**
	 * Get the singleton instance of the factory
	 * @returns {Promise<HolidayDataSourceFactory>} Factory instance
	 */
	static async getInstance(): Promise<HolidayDataSourceFactory> {
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
	async initialize(): Promise<void> {
		if (this.initialized) {
			return;
		}

		try {
			// Create and register NagerDateHolidayDataSource directly
			const nagerDataSource = new NagerDateHolidayDataSource();
			this.registerDataSource(nagerDataSource);
			this.defaultDataSourceName = "nager-date";
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : String(error);
			logger.warn(
				`[HolidayDataSourceFactory] Failed to initialize default data sources: ${errorMessage}`,
			);
		}

		this.initialized = true;
	}

	/**
	 * Get a data source by name
	 * @param {string} name - Data source name
	 * @returns {HolidayDataSource | undefined} Data source instance or undefined
	 * @throws {Error} If factory is not initialized
	 */
	getDataSource(name: string): HolidayDataSource | undefined {
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
	getAllDataSources(): HolidayDataSource[] {
		return Array.from(this.dataSources.values());
	}

	/**
	 * Register a new data source
	 * @param {HolidayDataSource} dataSource - Data source to register
	 * @throws {Error} If data source with same name already exists
	 */
	registerDataSource(dataSource: HolidayDataSource): void {
		if (!dataSource.name) {
			throw new Error("Data source must have a name property");
		}

		if (this.dataSources.has(dataSource.name)) {
			throw new Error(
				`Data source with name '${dataSource.name}' already exists`,
			);
		}

		this.dataSources.set(dataSource.name, dataSource);

		const config = dataSource.config;
		if (config?.debug) {
			logger.debug(
				`[HolidayDataSourceFactory] Registered data source: ${dataSource.name}`,
			);
		}
	}

	/**
	 * Unregister a data source by name
	 * @param {string} name - Name of the data source to unregister
	 * @returns {boolean} True if data source was unregistered, false if not found
	 */
	unregisterDataSource(name: string): boolean {
		const result = this.dataSources.delete(name);

		if (result && this.defaultDataSourceName === name) {
			// Reset default to first available data source
			const remaining = this.getAllDataSources();
			if (remaining.length > 0) {
				this.defaultDataSourceName = remaining[0]!.name;
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
	getDefaultDataSource(): HolidayDataSource {
		if (this.defaultDataSourceName) {
			const dataSource = this.dataSources.get(this.defaultDataSourceName);
			if (dataSource) {
				return dataSource;
			}
		}

		// If default is not set or not found, try to use first available
		const allDataSources = this.getAllDataSources();
		const [first] = allDataSources;
		if (first) {
			this.defaultDataSourceName = first.name;
			return first;
		}

		throw new Error("No holiday data sources available");
	}

	/**
	 * Set the default data source
	 * @param {string} name - Name of the data source to set as default
	 * @throws {Error} If data source with given name doesn't exist
	 */
	setDefaultDataSource(name: string): void {
		if (!this.dataSources.has(name)) {
			throw new Error(`Data source '${name}' not found`);
		}
		this.defaultDataSourceName = name;
	}

	/**
	 * Check health of all data sources
	 * @returns {Promise<Map<string, DataSourceStatus>>} Map of data source names to their status
	 */
	async checkAllDataSources(): Promise<Map<string, DataSourceStatus>> {
		const statusMap = new Map<string, DataSourceStatus>();
		const dataSources = this.getAllDataSources();

		const checkPromises = dataSources.map(async (dataSource) => {
			try {
				const status = await dataSource.checkAvailability();
				statusMap.set(dataSource.name, status);
			} catch (error) {
				const errorMessage =
					error instanceof Error ? error.message : String(error);
				statusMap.set(dataSource.name, {
					isAvailable: false,
					error: errorMessage,
					cacheSize: 0,
					responseTime: 0,
				} as DataSourceStatus);
			}
		});

		await Promise.all(checkPromises);

		return statusMap;
	}

	/**
	 * Get a list of all registered data source names
	 * @returns {Array<string>} Array of data source names
	 */
	getDataSourceNames(): string[] {
		return Array.from(this.dataSources.keys());
	}

	/**
	 * Check if a data source with the given name exists
	 * @param {string} name - Name to check
	 * @returns {boolean} True if data source exists
	 */
	hasDataSource(name: string): boolean {
		return this.dataSources.has(name);
	}

	/**
	 * Clear all caches for all registered data sources
	 * @returns {Promise<void>}
	 */
	async clearAllCaches(): Promise<void> {
		const dataSources = this.getAllDataSources();
		dataSources.forEach((dataSource) => {
			if (dataSource.clearCache) {
				dataSource.clearCache();
			}
		});
	}

	/**
	 * Reset all registered data sources to their initial state
	 * @returns {Promise<void>}
	 */
	async resetAllDataSources(): Promise<void> {
		const dataSources = this.getAllDataSources();
		await Promise.all(
			dataSources.map(async (dataSource) => {
				if (typeof dataSource.reset === "function") {
					await dataSource.reset();
				}
			}),
		);
	}

	/**
	 * Get data source statistics
	 * @returns {DataSourceStats} Statistics object with data source information
	 */
	getStatistics(): DataSourceStats {
		const dataSources = this.getAllDataSources();
		const stats: DataSourceStats = {
			totalDataSources: dataSources.length,
			defaultDataSource: this.defaultDataSourceName,
			dataSources: {},
		};

		for (const dataSource of dataSources) {
			const config = dataSource.config || {};
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
	 * @param {Partial<HolidayDataSourceConfig>} config - Optional new configuration
	 * @returns {Promise<HolidayDataSource>} Reloaded data source instance
	 * @throws {Error} If data source doesn't exist or cannot be reloaded
	 */
	async reloadDataSource(
		name: string,
		config: ReloadConfig = {},
	): Promise<HolidayDataSource> {
		const existingDataSource = this.dataSources.get(name);

		if (!existingDataSource) {
			throw new Error(`Data source '${name}' not found`);
		}

		// Remove existing data source
		this.unregisterDataSource(name);

		try {
			// Re-create the data source
			let newDataSource: HolidayDataSource;

			if (name === "nager-date") {
				newDataSource = new NagerDateHolidayDataSource(config);
				this.registerDataSource(newDataSource);
				return newDataSource;
			} else {
				throw new Error(
					`Cannot reload data source type '${name}' - not supported`,
				);
			}
		} catch (error) {
			// Try to restore the original data source on failure
			try {
				this.registerDataSource(existingDataSource);
			} catch (restoreError) {
				const errorMessage =
					restoreError instanceof Error
						? restoreError.message
						: String(restoreError);
				logger.error(
					`[HolidayDataSourceFactory] Failed to restore original data source: ${errorMessage}`,
				);
			}
			const errorMessage =
				error instanceof Error ? error.message : String(error);
			throw new Error(
				`Failed to reload data source '${name}': ${errorMessage}`,
			);
		}
	}

	/**
	 * Reset the factory instance (useful for testing)
	 * @private
	 */
	static _resetInstance(): void {
		HolidayDataSourceFactory._instance = null;
	}
}

export default HolidayDataSourceFactory;
