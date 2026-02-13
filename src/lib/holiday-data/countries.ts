/**
 * Countries supported by Nager.Date API with flag emojis
 *
 * This list includes only the specified countries available in the Nager.Date public API.
 * Each country has a 2-letter ISO 3166-1 alpha-2 code, English name, and flag emoji.
 *
 * @see https://date.nager.at/Api
 */
export interface Country {
  code: string;
  name: string;
  flag: string;
}

export const COUNTRIES: readonly Country[] = [
  { code: "AD", name: "Andorra", flag: "🇦🇩" },
  { code: "AL", name: "Albania", flag: "🇦🇱" },
  { code: "AM", name: "Armenia", flag: "🇦🇲" },
  { code: "AR", name: "Argentina", flag: "🇦🇷" },
  { code: "AT", name: "Austria", flag: "🇦🇹" },
  { code: "AU", name: "Australia", flag: "🇦🇺" },
  { code: "AX", name: "Åland Islands", flag: "🇦🇽" },
  { code: "BA", name: "Bosnia and Herzegovina", flag: "🇧🇦" },
  { code: "BB", name: "Barbados", flag: "🇧🇧" },
  { code: "BE", name: "Belgium", flag: "🇧🇪" },
  { code: "BG", name: "Bulgaria", flag: "🇧🇬" },
  { code: "BJ", name: "Benin", flag: "🇧🇯" },
  { code: "BO", name: "Bolivia", flag: "🇧🇴" },
  { code: "BR", name: "Brazil", flag: "🇧🇷" },
  { code: "BS", name: "Bahamas", flag: "🇧🇸" },
  { code: "BW", name: "Botswana", flag: "🇧🇼" },
  { code: "BY", name: "Belarus", flag: "🇧🇾" },
  { code: "BZ", name: "Belize", flag: "🇧🇿" },
  { code: "CA", name: "Canada", flag: "🇨🇦" },
  { code: "CD", name: "Democratic Republic of the Congo", flag: "🇨🇩" },
  { code: "CG", name: "Republic of the Congo", flag: "🇨🇬" },
  { code: "CH", name: "Switzerland", flag: "🇨🇭" },
  { code: "CL", name: "Chile", flag: "🇨🇱" },
  { code: "CN", name: "China", flag: "🇨🇳" },
  { code: "CO", name: "Colombia", flag: "🇨🇴" },
  { code: "CR", name: "Costa Rica", flag: "🇨🇷" },
  { code: "CU", name: "Cuba", flag: "🇨🇺" },
  { code: "CY", name: "Cyprus", flag: "🇨🇾" },
  { code: "CZ", name: "Czech Republic", flag: "🇨🇿" },
  { code: "DE", name: "Germany", flag: "🇩🇪" },
  { code: "DK", name: "Denmark", flag: "🇩🇰" },
  { code: "DO", name: "Dominican Republic", flag: "🇩🇴" },
  { code: "EC", name: "Ecuador", flag: "🇪🇨" },
  { code: "EE", name: "Estonia", flag: "🇪🇪" },
  { code: "EG", name: "Egypt", flag: "🇪🇬" },
  { code: "ES", name: "Spain", flag: "🇪🇸" },
  { code: "FI", name: "Finland", flag: "🇫🇮" },
  { code: "FO", name: "Faroe Islands", flag: "🇫🇴" },
  { code: "FR", name: "France", flag: "🇫🇷" },
  { code: "GA", name: "Gabon", flag: "🇬🇦" },
  { code: "GB", name: "United Kingdom", flag: "🇬🇧" },
  { code: "GD", name: "Grenada", flag: "🇬🇩" },
  { code: "GE", name: "Georgia", flag: "🇬🇪" },
  { code: "GG", name: "Guernsey", flag: "🇬🇬" },
  { code: "GH", name: "Ghana", flag: "🇬🇭" },
  { code: "GI", name: "Gibraltar", flag: "🇬🇮" },
  { code: "GL", name: "Greenland", flag: "🇬🇱" },
  { code: "GM", name: "Gambia", flag: "🇬🇲" },
  { code: "GR", name: "Greece", flag: "🇬🇷" },
  { code: "GT", name: "Guatemala", flag: "🇬🇹" },
  { code: "GY", name: "Guyana", flag: "🇬🇾" },
  { code: "HK", name: "Hong Kong", flag: "🇭🇰" },
  { code: "HN", name: "Honduras", flag: "🇭🇳" },
  { code: "HR", name: "Croatia", flag: "🇭🇷" },
  { code: "HT", name: "Haiti", flag: "🇭🇹" },
  { code: "HU", name: "Hungary", flag: "🇭🇺" },
  { code: "ID", name: "Indonesia", flag: "🇮🇩" },
  { code: "IE", name: "Ireland", flag: "🇮🇪" },
  { code: "IM", name: "Isle of Man", flag: "🇮🇲" },
  { code: "IS", name: "Iceland", flag: "🇮🇸" },
  { code: "IT", name: "Italy", flag: "🇮🇹" },
  { code: "JE", name: "Jersey", flag: "🇯🇪" },
  { code: "JM", name: "Jamaica", flag: "🇯🇲" },
  { code: "JP", name: "Japan", flag: "🇯🇵" },
  { code: "KE", name: "Kenya", flag: "🇰🇪" },
  { code: "KR", name: "South Korea", flag: "🇰🇷" },
  { code: "KZ", name: "Kazakhstan", flag: "🇰🇿" },
  { code: "LI", name: "Liechtenstein", flag: "🇱🇮" },
  { code: "LS", name: "Lesotho", flag: "🇱🇸" },
  { code: "LT", name: "Lithuania", flag: "🇱🇹" },
  { code: "LU", name: "Luxembourg", flag: "🇱🇺" },
  { code: "LV", name: "Latvia", flag: "🇱🇻" },
  { code: "MA", name: "Morocco", flag: "🇲🇦" },
  { code: "MC", name: "Monaco", flag: "🇲🇨" },
  { code: "MD", name: "Moldova", flag: "🇲🇩" },
  { code: "ME", name: "Montenegro", flag: "🇲🇪" },
  { code: "MG", name: "Madagascar", flag: "🇲🇬" },
  { code: "MK", name: "North Macedonia", flag: "🇲🇰" },
  { code: "MN", name: "Mongolia", flag: "🇲🇳" },
  { code: "MS", name: "Montserrat", flag: "🇲🇸" },
  { code: "MT", name: "Malta", flag: "🇲🇹" },
  { code: "MX", name: "Mexico", flag: "🇲🇽" },
  { code: "MZ", name: "Mozambique", flag: "🇲🇿" },
  { code: "NA", name: "Namibia", flag: "🇳🇦" },
  { code: "NE", name: "Niger", flag: "🇳🇪" },
  { code: "NG", name: "Nigeria", flag: "🇳🇬" },
  { code: "NI", name: "Nicaragua", flag: "🇳🇮" },
  { code: "NL", name: "Netherlands", flag: "🇳🇱" },
  { code: "NO", name: "Norway", flag: "🇳🇴" },
  { code: "NZ", name: "New Zealand", flag: "🇳🇿" },
  { code: "PA", name: "Panama", flag: "🇵🇦" },
  { code: "PE", name: "Peru", flag: "🇵🇪" },
  { code: "PG", name: "Papua New Guinea", flag: "🇵🇬" },
  { code: "PH", name: "Philippines", flag: "🇵🇭" },
  { code: "PL", name: "Poland", flag: "🇵🇱" },
  { code: "PR", name: "Puerto Rico", flag: "🇵🇷" },
  { code: "PT", name: "Portugal", flag: "🇵🇹" },
  { code: "PY", name: "Paraguay", flag: "🇵🇾" },
  { code: "RO", name: "Romania", flag: "🇷🇴" },
  { code: "RS", name: "Serbia", flag: "🇷🇸" },
  { code: "RU", name: "Russia", flag: "🇷🇺" },
  { code: "SE", name: "Sweden", flag: "🇸🇪" },
  { code: "SG", name: "Singapore", flag: "🇸🇬" },
  { code: "SI", name: "Slovenia", flag: "🇸🇮" },
  { code: "SJ", name: "Svalbard and Jan Mayen", flag: "🇸🇯" },
  { code: "SK", name: "Slovakia", flag: "🇸🇰" },
  { code: "SM", name: "San Marino", flag: "🇸🇲" },
  { code: "SR", name: "Suriname", flag: "🇸🇷" },
  { code: "SV", name: "El Salvador", flag: "🇸🇻" },
  { code: "TN", name: "Tunisia", flag: "🇹🇳" },
  { code: "TR", name: "Turkey", flag: "🇹🇷" },
  { code: "UA", name: "Ukraine", flag: "🇺🇦" },
  { code: "US", name: "United States", flag: "🇺🇸" },
  { code: "UY", name: "Uruguay", flag: "🇺🇾" },
  { code: "VA", name: "Vatican City", flag: "🇻🇦" },
  { code: "VE", name: "Venezuela", flag: "🇻🇪" },
  { code: "VN", name: "Vietnam", flag: "🇻🇳" },
  { code: "ZA", name: "South Africa", flag: "🇿🇦" },
  { code: "ZM", name: "Zambia", flag: "🇿🇲" },
  { code: "ZW", name: "Zimbabwe", flag: "🇿🇼" },
] as const;

/**
 * Get country by code
 */
export function getCountryByCode(code: string): Country | undefined {
  return COUNTRIES.find((c) => c.code === code);
}

/**
 * Get country by name
 */
export function getCountryByName(name: string): Country | undefined {
  return COUNTRIES.find((c) => c.name.toLowerCase() === name.toLowerCase());
}

/**
 * Sort countries alphabetically by name
 */
export function sortCountriesByName(): Country[] {
  console.log(
    `[Countries] sortCountriesByName: COUNTRIES array length = ${COUNTRIES.length}`,
  );

  if (COUNTRIES.length === 0) {
    console.error("[Countries] sortCountriesByName: COUNTRIES array is empty!");
  } else {
    console.log(
      `[Countries] First 3 countries: ${COUNTRIES.slice(0, 3)
        .map((c) => `${c.flag} ${c.name}`)
        .join(", ")}`,
    );
    console.log(
      `[Countries] Last 3 countries: ${COUNTRIES.slice(-3)
        .map((c) => `${c.flag} ${c.name}`)
        .join(", ")}`,
    );
  }

  const sorted = [...COUNTRIES].sort((a, b) => a.name.localeCompare(b.name));
  console.log(
    `[Countries] sortCountriesByName: Returning ${sorted.length} sorted countries`,
  );
  return sorted;
}
