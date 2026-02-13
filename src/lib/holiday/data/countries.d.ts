/**
 * Countries Module Type Declarations
 *
 * This file provides TypeScript type declarations for the countries module
 * which is used for populating country dropdowns in the settings.
 */

/**
 * Country information with ISO code, name, and flag emoji
 */
export interface Country {
	code: string;
	name: string;
	flag: string;
}

/**
 * Sorted array of countries
 */
export const COUNTRIES: readonly Country[];

/**
 * Get country by ISO 3166-1 alpha-2 code
 * @param code - 2-letter country code
 * @returns Country object or undefined if not found
 */
export function getCountryByCode(code: string): Country | undefined;

/**
 * Get country by name
 * @param name - Full country name
 * @returns Country object or undefined if not found
 */
export function getCountryByName(name: string): Country | undefined;

/**
 * Sort countries alphabetically by name
 * @returns Array of countries sorted by name
 */
export function sortCountriesByName(): Country[];
