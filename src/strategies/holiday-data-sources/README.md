# Holiday Data Sources Module

A strategy pattern implementation for fetching and managing holiday data from various sources. This module provides a unified interface for working with different holiday data providers, making it easy to switch between data sources or add new ones.

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [API Reference](#api-reference)
- [Available Data Sources](#available-data-sources)
- [Configuration](#configuration)
- [Examples](#examples)
- [Extensibility](#extensibility)
- [Error Handling](#error-handling)
- [Performance](#performance)
- [Testing](#testing)

## Overview

The Holiday Data Sources module implements the Strategy pattern to provide a flexible, extensible system for retrieving holiday information. It abstracts away the differences between various holiday data APIs, giving you a consistent interface regardless of which provider you use.

### Key Benefits

- **Unified Interface**: Same API regardless of data source
- **Easy Switching**: Change data providers without rewriting code
- **Caching**: Built-in caching for improved performance
- **Type Safety**: Full TypeScript support with comprehensive type definitions
- **Extensibility**: Simple to add new data sources
- **Factory Pattern**: Centralized management of data source instances

## Features

- ✅ Multiple holiday data sources (Nager.Date API)
- ✅ Automatic caching with configurable TTL
- ✅ Optimized API endpoints for common queries
- ✅ Support for multiple countries
- ✅ Date range queries
- ✅ Holiday type filtering
- ✅ Subdivision/county-level support
- ✅ Health checking for data sources
- ✅ Debug logging
- ✅ Error handling with specific error types
- ✅ TypeScript support

## Architecture

```
src/strategies/holiday-data-sources/
├── HolidayDataSourceStrategy.js    # Base class (abstract strategy)
├── NagerDateHolidayDataSource.js   # Nager.Date API implementation
├── HolidayDataSourceFactory.js     # Factory for managing instances
├── index.js                        # Module exports
└── README.md                       # This file
```

### Strategy Pattern

The module uses the Strategy pattern to define a family of algorithms (data sources), encapsulate each one, and make them interchangeable.

```
┌─────────────────────────────────────────┐
│   HolidayDataSourceStrategy (Base)      │
│   - name: string                        │
│   - description: string                 │
│   - config: HolidayDataSourceConfig     │
│   + checkAvailability()                 │
│   + getHolidaysForYear()                │
│   + isHoliday()                         │
│   + ...                                 │
└─────────────┬───────────────────────────┘
              │
              │ implements
              │
┌─────────────▼───────────────────────────┐
│   NagerDateHolidayDataSource            │
│   - apiClient: ApiClient                │
│   - publicHolidayApi: PublicHolidayApi  │
│   + _fetchHolidaysForYear()             │
│   + _initializeApiClient()              │
└─────────────────────────────────────────┘
```

### Factory Pattern

The factory manages data source instances and provides a single point of access:

```javascript
const factory = HolidayDataSourceFactory.getInstance();
const dataSource = factory.getDefaultDataSource();
```

## Installation

The module is part of the RTO Calculator project and is installed via npm:

```bash
npm install
```

## Quick Start

### Basic Usage

```javascript
import { getDefaultHolidayDataSource } from './strategies/holiday-data-sources/index.js';

// Get the default data source
const dataSource = getDefaultHolidayDataSource();

// Check if a date is a holiday
const result = await dataSource.isHoliday(new Date(2024, 6, 4), 'US');
console.log(result.isHoliday); // true (Independence Day)

// Get holidays for a year
const holidays = await dataSource.getHolidaysForYear(2024, 'US');
console.log(holidays);
```

### Using the Factory

```javascript
import { HolidayDataSourceFactory } from './strategies/holiday-data-sources/index.js';

const factory = HolidayDataSourceFactory.getInstance();

// Get a specific data source
const nagerDate = factory.getDataSource('nager-date');

// Get all available data sources
const sources = factory.getAllDataSources();

// Check health of all data sources
const healthStatus = await factory.checkAllDataSources();
```

## API Reference

### HolidayDataSource Interface

All data sources implement the following interface:

#### `name: string`
Unique identifier for the data source.

#### `description: string`
Human-readable description of the data source.

#### `defaultConfig: HolidayDataSourceConfig`
Default configuration for the data source.

#### Methods

##### `checkAvailability(): Promise<DataSourceStatus>`
Check if the data source is available and ready to use.

```javascript
const status = await dataSource.checkAvailability();
// Returns: { isAvailable: boolean, lastFetch: Date, cacheSize: number, ... }
```

##### `getHolidaysForYear(year: number, countryCode: string): Promise<Holiday[]>`
Get all holidays for a specific year and country.

```javascript
const holidays = await dataSource.getHolidaysForYear(2024, 'US');
```

##### `getHolidaysForDateRange(dateRange: DateRange, countryCode: string): Promise<Holiday[]>`
Get holidays within a date range.

```javascript
const holidays = await dataSource.getHolidaysForDateRange(
  { startDate: new Date('2024-12-01'), endDate: new Date('2024-12-31') },
  'US'
);
```

##### `getUpcomingHolidays(countryCode: string, options?: object): Promise<Holiday[]>`
Get upcoming holidays (next 365 days by default).

```javascript
const holidays = await dataSource.getUpcomingHolidays('US', { limit: 10 });
```

##### `isHoliday(date: Date, countryCode: string): Promise<HolidayCheckResult>`
Check if a specific date is a holiday.

```javascript
const result = await dataSource.isHoliday(new Date('2024-07-04'), 'US');
// Returns: { isHoliday: true, holiday: {...}, holidayCount: 1 }
```

##### `isTodayHoliday(countryCode: string): Promise<HolidayCheckResult>`
Check if today is a holiday.

```javascript
const result = await dataSource.isTodayHoliday('US');
```

##### `queryHolidays(options: HolidayQueryOptions): Promise<HolidayQueryResult>`
Query holidays with custom filters.

```javascript
const result = await dataSource.queryHolidays({
  countryCode: 'US',
  year: 2024,
  globalOnly: true,
  types: ['Public']
});
```

##### `clearCache(): Promise<void>`
Clear the internal cache.

```javascript
await dataSource.clearCache();
```

##### `reset(): Promise<void>`
Reset the data source to initial state.

```javascript
await dataSource.reset();
```

##### `updateConfig(config: Partial<HolidayDataSourceConfig>): void`
Update configuration.

```javascript
dataSource.updateConfig({ enableCache: false, debug: true });
```

##### `getConfig(): HolidayDataSourceConfig`
Get current configuration.

```javascript
const config = dataSource.getConfig();
```

### HolidayDataSourceFactory

#### `getInstance(): HolidayDataSourceFactory`
Get the singleton factory instance.

#### `getDataSource(name: string): HolidayDataSource | undefined`
Get a specific data source by name.

#### `getAllDataSources(): HolidayDataSource[]`
Get all registered data sources.

#### `registerDataSource(dataSource: HolidayDataSource): void`
Register a new data source.

#### `getDefaultDataSource(): HolidayDataSource`
Get the default data source.

#### `setDefaultDataSource(name: string): void`
Set the default data source.

#### `checkAllDataSources(): Promise<Map<string, DataSourceStatus>>`
Check health of all data sources.

#### `getStatistics(): object`
Get statistics about registered data sources.

#### `clearAllCaches(): Promise<void>`
Clear caches for all data sources.

#### `resetAllDataSources(): Promise<void>`
Reset all data sources.

## Available Data Sources

### Nager.Date

**Name**: `nager-date`  
**Description**: Free public service for public holidays and long weekends worldwide  
**Website**: https://date.nager.at/  
**Features**:
- Support for 100+ countries
- Optimized endpoints for common queries
- Subdivision/county-level data
- Multiple holiday types
- No API key required

**Supported Operations**:
- ✅ Holidays by year
- ✅ Upcoming holidays
- ✅ Today's holiday check
- ✅ Date range queries
- ✅ Holiday type filtering

## Configuration

### HolidayDataSourceConfig

```typescript
interface HolidayDataSourceConfig {
  defaultCountryCode?: string;    // Default: 'US'
  enableCache?: boolean;          // Default: true
  cacheDuration?: number;         // Default: 3600000 (1 hour in ms)
  baseUrl?: string;              // API base URL
  timeout?: number;              // Default: 10000 (10 seconds in ms)
  debug?: boolean;               // Default: false
}
```

### Example Configuration

```javascript
const dataSource = getDefaultHolidayDataSource();
dataSource.updateConfig({
  defaultCountryCode: 'GB',
  enableCache: true,
  cacheDuration: 7200000,  // 2 hours
  timeout: 15000,          // 15 seconds
  debug: true
});
```

## Examples

### Example 1: Check if a Date is a Holiday

```javascript
import { getDefaultHolidayDataSource } from './strategies/holiday-data-sources/index.js';

const dataSource = getDefaultHolidayDataSource();
const date = new Date(2024, 11, 25); // Christmas

const result = await dataSource.isHoliday(date, 'US');
if (result.isHoliday) {
  console.log(`${date.toDateString()} is a holiday: ${result.holiday.name}`);
} else {
  console.log(`${date.toDateString()} is not a holiday`);
}
```

### Example 2: Get Upcoming Holidays

```javascript
const holidays = await dataSource.getUpcomingHolidays('US', {
  limit: 5,
  startDate: new Date()
});

holidays.forEach(holiday => {
  console.log(`${holiday.date}: ${holiday.name}`);
});
```

### Example 3: Filter by Holiday Type

```javascript
const result = await dataSource.queryHolidays({
  countryCode: 'US',
  year: 2024,
  types: ['Public'],  // Only public holidays
  globalOnly: true     // Only nationwide holidays
});

console.log(`Found ${result.total} public holidays`);
```

### Example 4: Work with Multiple Countries

```javascript
const countries = ['US', 'GB', 'CA', 'DE'];
const year = 2024;

for (const countryCode of countries) {
  const holidays = await dataSource.getHolidaysForYear(year, countryCode);
  console.log(`${countryCode}: ${holidays.length} holidays`);
}
```

### Example 5: Use Caching for Performance

```javascript
// Enable caching
dataSource.updateConfig({ enableCache: true, cacheDuration: 3600000 });

// First call - fetches from API
const holidays1 = await dataSource.getHolidaysForYear(2024, 'US');

// Second call - returns from cache (much faster)
const holidays2 = await dataSource.getHolidaysForYear(2024, 'US');

// Clear cache when needed
await dataSource.clearCache();
```

For more examples, see `src/examples/holiday-data-sources-usage.js`.

## Extensibility

### Creating a Custom Data Source

To add a new data source, extend the `HolidayDataSourceStrategy` class:

```javascript
import HolidayDataSourceStrategy from './HolidayDataSourceStrategy.js';

class MyCustomDataSource extends HolidayDataSourceStrategy {
  constructor(config = {}) {
    super(
      'my-custom',
      'Description of my custom data source',
      config
    );
    
    // Initialize your API client
    this.apiClient = ...;
  }
  
  // Implement the required method
  async _fetchHolidaysForYear(year, countryCode) {
    // Your implementation
    const response = await this.apiClient.getHolidays(year, countryCode);
    
    // Normalize to standard format
    return response.data.map(holiday => this._normalizeHoliday(holiday));
  }
  
  // Optionally override other methods for optimization
}

// Register the data source
import { HolidayDataSourceFactory } from './HolidayDataSourceFactory.js';
const factory = HolidayDataSourceFactory.getInstance();
factory.registerDataSource(new MyCustomDataSource());
```

### Adding New Holiday Types

The system supports custom holiday types through the `HolidayQueryOptions`:

```javascript
const result = await dataSource.queryHolidays({
  countryCode: 'US',
  year: 2024,
  types: ['Public', 'Bank', 'School', 'CustomType']
});
```

## Error Handling

### Error Types

```typescript
type HolidayDataSourceErrorType =
  | "NETWORK_ERROR"      // Network connection issues
  | "API_ERROR"          // API returned an error
  | "INVALID_PARAMETER"  // Invalid request parameters
  | "NOT_FOUND"          // Requested resource not found
  | "RATE_LIMIT"         // API rate limit exceeded
  | "TIMEOUT"            // Request timeout
  | "CACHE_ERROR";       // Cache-related errors
```

### Example Error Handling

```javascript
try {
  const holidays = await dataSource.getHolidaysForYear(2024, 'INVALID');
} catch (error) {
  if (error.type === 'NOT_FOUND') {
    console.log('Country not found');
  } else if (error.type === 'NETWORK_ERROR') {
    console.log('Network error - check your connection');
  } else {
    console.error('Unexpected error:', error.message);
  }
}
```

### Common Errors and Solutions

| Error Type | Cause | Solution |
|------------|-------|----------|
| `NOT_FOUND` | Invalid country code | Use valid ISO 3166-1 alpha-2 codes |
| `TIMEOUT` | API request took too long | Increase timeout in config |
| `NETWORK_ERROR` | Connection failed | Check internet connection |
| `API_ERROR` | API returned error | Check API status, try again later |

## Performance

### Caching

The module includes built-in caching to minimize API calls:

```javascript
// Cache is automatically used when enabled
dataSource.updateConfig({ enableCache: true, cacheDuration: 3600000 });
```

**Cache Behavior**:
- Cache is checked before making API calls
- Cache entries expire after `cacheDuration`
- Cache can be cleared manually or by calling `reset()`
- Debug mode logs cache hits/misses

### Performance Tips

1. **Enable caching** for frequently accessed data
2. **Use date range queries** instead of multiple single-date checks
3. **Batch queries** by year when possible
4. **Use optimized endpoints** (e.g., `isTodayHoliday` for today's check)
5. **Set appropriate timeout** values based on your network

### Benchmark Results

Typical performance with caching enabled:

```
First fetch (uncached):  ~200-500ms
Subsequent fetches:     ~1-5ms (from cache)
Speedup:                 ~40-500x
```

## Testing

### Running Tests

```bash
# Run all tests
npm test

# Run with coverage
npm test -- --coverage

# Run specific test file
npm test -- holiday-data-sources.test.js
```

### Test Structure

Tests are organized by data source and functionality:

```
tests/
└── holiday-data-sources/
    ├── HolidayDataSourceStrategy.test.js
    ├── NagerDateHolidayDataSource.test.js
    ├── HolidayDataSourceFactory.test.js
    └── integration/
        └── end-to-end.test.js
```

### Writing Tests

```javascript
import { getDefaultHolidayDataSource } from '../src/strategies/holiday-data-sources/index.js';

describe('NagerDateHolidayDataSource', () => {
  let dataSource;
  
  beforeEach(() => {
    dataSource = getDefaultHolidayDataSource();
  });
  
  test('should fetch holidays for a year', async () => {
    const holidays = await dataSource.getHolidaysForYear(2024, 'US');
    expect(Array.isArray(holidays)).toBe(true);
    expect(holidays.length).toBeGreaterThan(0);
  });
  
  test('should identify a holiday date', async () => {
    const result = await dataSource.isHoliday(new Date(2024, 6, 4), 'US');
    expect(result.isHoliday).toBe(true);
  });
});
```

## License

This module is part of the RTO Calculator project. See the main LICENSE.md file for details.

## Contributing

To add a new data source or improve existing ones:

1. Extend `HolidayDataSourceStrategy`
2. Implement required methods
3. Add comprehensive tests
4. Update this README
5. Submit a pull request

## Support

For issues, questions, or contributions, please visit the main RTO Calculator repository.