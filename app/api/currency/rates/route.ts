import { NextResponse } from 'next/server';

// Cache rates for 1 hour to avoid excessive API calls
let cachedRates: Record<string, number> | null = null;
let lastFetch: number = 0;
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour in milliseconds

const SUPPORTED_CODES = [
  'GBP', 'USD', 'EUR', 'CAD', 'AUD', 'JPY', 'CHF', 'CNY', 'INR', 'NZD',
  'SGD', 'HKD', 'KRW', 'SEK', 'NOK', 'DKK', 'MXN', 'BRL', 'ZAR', 'AED',
];

export async function GET() {
  try {
    const now = Date.now();

    // Return cached rates if still valid
    if (cachedRates && (now - lastFetch) < CACHE_DURATION) {
      return NextResponse.json({ rates: cachedRates, cached: true, source: 'cache' });
    }

    const baseCurrency = (process.env.NEXT_PUBLIC_BASE_CURRENCY || 'GBP').toUpperCase();
    const symbols = Array.from(new Set([...SUPPORTED_CODES, baseCurrency])).join(',');

    // Using exchangerate.host (free, no API key, generous limits)
    const response = await fetch(
      `https://api.exchangerate.host/latest?base=${baseCurrency}&symbols=${symbols}`,
      { next: { revalidate: 3600 } } // Cache externally for 1 hour
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch exchange rates (status ${response.status})`);
    }

    const data = await response.json();

    if (data.success === false || !data.rates) {
      throw new Error('Exchange rate API returned an error response');
    }

    const fallbackRates = getDefaultRates();
    const rates: Record<string, number> = {};

    for (const code of SUPPORTED_CODES) {
      if (code === baseCurrency) {
        rates[code] = 1;
        continue;
      }

      const rate = data.rates[code];
      rates[code] = typeof rate === 'number' ? rate : fallbackRates[code];
    }

    // Ensure base currency is present
    rates[baseCurrency] = rates[baseCurrency] || 1;

    cachedRates = rates;
    lastFetch = now;

    return NextResponse.json({
      rates,
      cached: false,
      timestamp: data.date ? new Date(data.date).toISOString() : undefined,
      source: 'live',
      provider: 'exchangerate.host',
    });

  } catch (error) {
    console.error('Error fetching currency rates:', error);

    if (cachedRates) {
      return NextResponse.json({
        rates: cachedRates,
        cached: true,
        source: 'cached-fallback',
      });
    }

    return NextResponse.json({
      rates: getDefaultRates(),
      cached: false,
      source: 'error-fallback',
    });
  }
}

function getDefaultRates(): Record<string, number> {
  return {
    GBP: 1.00,
    USD: 1.27,
    EUR: 1.16,
    CAD: 1.73,
    AUD: 1.92,
    JPY: 189.50,
    CHF: 1.12,
    CNY: 9.18,
    INR: 106.50,
    NZD: 2.10,
    SGD: 1.70,
    HKD: 9.90,
    KRW: 1720.00,
    SEK: 13.20,
    NOK: 13.80,
    DKK: 8.65,
    MXN: 24.50,
    BRL: 6.35,
    ZAR: 22.80,
    AED: 4.67,
  };
}
