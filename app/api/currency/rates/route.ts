import { NextResponse } from 'next/server';

// Cache rates for 1 hour to avoid excessive API calls
let cachedRates: Record<string, number> | null = null;
let lastFetch: number = 0;
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour in milliseconds

export async function GET() {
  try {
    const now = Date.now();

    // Return cached rates if still valid
    if (cachedRates && (now - lastFetch) < CACHE_DURATION) {
      return NextResponse.json({ rates: cachedRates, cached: true });
    }

    // Fetch live rates from exchangerate-api.io (free tier: 1,500 requests/month)
    // Alternative: fixer.io, currencyapi.com, or exchangeratesapi.io
    const baseCurrency = process.env.NEXT_PUBLIC_BASE_CURRENCY || 'GBP';
    const apiKey = process.env.EXCHANGE_RATE_API_KEY;

    if (!apiKey) {
      console.warn('EXCHANGE_RATE_API_KEY not set, using fallback rates');
      return NextResponse.json({
        rates: getDefaultRates(),
        cached: false,
        source: 'fallback'
      });
    }

    // Using exchangerate-api.io
    const response = await fetch(
      `https://v6.exchangerate-api.com/v6/${apiKey}/latest/${baseCurrency}`,
      { next: { revalidate: 3600 } } // Cache for 1 hour
    );

    if (!response.ok) {
      throw new Error('Failed to fetch exchange rates');
    }

    const data = await response.json();

    if (data.result !== 'success') {
      throw new Error('Exchange rate API returned error');
    }

    // Extract rates
    const rates = {
      GBP: data.conversion_rates.GBP || 1,
      USD: data.conversion_rates.USD,
      EUR: data.conversion_rates.EUR,
      CAD: data.conversion_rates.CAD,
      AUD: data.conversion_rates.AUD,
      JPY: data.conversion_rates.JPY,
      CHF: data.conversion_rates.CHF,
      CNY: data.conversion_rates.CNY,
      INR: data.conversion_rates.INR,
      NZD: data.conversion_rates.NZD,
      SGD: data.conversion_rates.SGD,
      HKD: data.conversion_rates.HKD,
      KRW: data.conversion_rates.KRW,
      SEK: data.conversion_rates.SEK,
      NOK: data.conversion_rates.NOK,
      DKK: data.conversion_rates.DKK,
      MXN: data.conversion_rates.MXN,
      BRL: data.conversion_rates.BRL,
      ZAR: data.conversion_rates.ZAR,
      AED: data.conversion_rates.AED,
    };

    // Cache the rates
    cachedRates = rates;
    lastFetch = now;

    return NextResponse.json({
      rates,
      cached: false,
      timestamp: new Date(data.time_last_update_unix * 1000).toISOString(),
      source: 'live'
    });

  } catch (error) {
    console.error('Error fetching currency rates:', error);

    // Return cached rates if available, otherwise fallback
    if (cachedRates) {
      return NextResponse.json({
        rates: cachedRates,
        cached: true,
        source: 'cached-fallback'
      });
    }

    return NextResponse.json({
      rates: getDefaultRates(),
      cached: false,
      source: 'error-fallback'
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
