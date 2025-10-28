// Currency mapping by country code
const COUNTRY_CURRENCY_MAP: Record<string, string> = {
  // Europe
  GB: 'GBP',
  UK: 'GBP',
  DE: 'EUR',
  FR: 'EUR',
  IT: 'EUR',
  ES: 'EUR',
  NL: 'EUR',
  BE: 'EUR',
  AT: 'EUR',
  IE: 'EUR',
  PT: 'EUR',
  FI: 'EUR',
  GR: 'EUR',
  SE: 'SEK',
  NO: 'NOK',
  DK: 'DKK',
  CH: 'CHF',

  // Americas
  US: 'USD',
  CA: 'CAD',
  MX: 'MXN',
  BR: 'BRL',
  AR: 'USD',

  // Asia-Pacific
  AU: 'AUD',
  NZ: 'NZD',
  JP: 'JPY',
  CN: 'CNY',
  HK: 'HKD',
  SG: 'SGD',
  IN: 'INR',
  KR: 'KRW',

  // Middle East & Africa
  AE: 'AED',
  ZA: 'ZAR',

  // Default fallback
  DEFAULT: 'GBP',
};

export interface GeolocationData {
  country?: string;
  countryCode?: string;
  currency?: string;
}

/**
 * Detects user's currency based on their location using ipapi.co
 * Falls back to GBP if detection fails
 */
export async function detectCurrencyFromLocation(): Promise<string> {
  try {
    const response = await fetch('https://ipapi.co/json/', {
      // Add timeout
      signal: AbortSignal.timeout(3000),
    });

    if (!response.ok) {
      console.warn('Geolocation API returned non-OK status:', response.status);
      return COUNTRY_CURRENCY_MAP.DEFAULT;
    }

    const data = await response.json();
    const countryCode = data.country_code?.toUpperCase();

    if (!countryCode) {
      console.warn('No country code in geolocation response');
      return COUNTRY_CURRENCY_MAP.DEFAULT;
    }

    const currency = COUNTRY_CURRENCY_MAP[countryCode] || COUNTRY_CURRENCY_MAP.DEFAULT;

    console.log(`Detected location: ${countryCode}, currency: ${currency}`);

    return currency;
  } catch (error) {
    console.warn('Failed to detect location, using default currency:', error);
    return COUNTRY_CURRENCY_MAP.DEFAULT;
  }
}

/**
 * Maps a country code to a supported currency
 */
export function getCurrencyForCountry(countryCode: string): string {
  const code = countryCode?.toUpperCase();
  return COUNTRY_CURRENCY_MAP[code] || COUNTRY_CURRENCY_MAP.DEFAULT;
}

/**
 * Gets all supported currencies
 */
export function getSupportedCurrencies(): string[] {
  return [
    'GBP', 'USD', 'EUR', 'CAD', 'AUD', 'JPY',
    'CHF', 'CNY', 'INR', 'NZD', 'SGD', 'HKD',
    'KRW', 'SEK', 'NOK', 'DKK', 'MXN', 'BRL',
    'ZAR', 'AED'
  ];
}

/**
 * Validates if a currency is supported
 */
export function isSupportedCurrency(currency: string): boolean {
  return getSupportedCurrencies().includes(currency.toUpperCase());
}
