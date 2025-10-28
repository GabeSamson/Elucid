type RatesMap = Record<string, number>;
type SymbolMap = Record<string, string>;

const DEFAULT_BASE = (process.env.NEXT_PUBLIC_BASE_CURRENCY || 'GBP').toUpperCase();
const DEFAULT_ACTIVE = (process.env.NEXT_PUBLIC_CURRENCY || DEFAULT_BASE).toUpperCase();
const DEFAULT_LOCALE = process.env.NEXT_PUBLIC_LOCALE || 'en-GB';

const DEFAULT_SYMBOLS: SymbolMap = {
  GBP: '£',
  USD: '$',
  EUR: '€',
  CAD: 'CA$',
  AUD: 'A$',
  JPY: '¥',
  CHF: 'CHF',
  CNY: '¥',
  INR: '₹',
  NZD: 'NZ$',
  SGD: 'S$',
  HKD: 'HK$',
  KRW: '₩',
  SEK: 'kr',
  NOK: 'kr',
  DKK: 'kr',
  MXN: '$',
  BRL: 'R$',
  ZAR: 'R',
  AED: 'د.إ',
};

// Default exchange rates (relative to GBP = 1)
// These are fallback rates - live rates are fetched from API
const DEFAULT_RATES: RatesMap = {
  'GBP': 1.00,
  'USD': 1.27,
  'EUR': 1.16,
  'CAD': 1.73,
  'AUD': 1.92,
  'JPY': 189.50,
  'CHF': 1.12,
  'CNY': 9.18,
  'INR': 106.50,
  'NZD': 2.10,
  'SGD': 1.70,
  'HKD': 9.90,
  'KRW': 1720.00,
  'SEK': 13.20,
  'NOK': 13.80,
  'DKK': 8.65,
  'MXN': 24.50,
  'BRL': 6.35,
  'ZAR': 22.80,
  'AED': 4.67,
};

// Store live rates fetched from API
let liveRates: RatesMap | null = null;

const parseRatesFromEnv = (): RatesMap => {
  try {
    // First, check if we have live rates
    if (liveRates) {
      return { ...liveRates };
    }

    // Then check environment variable
    if (process.env.NEXT_PUBLIC_CURRENCY_RATES) {
      const parsed = JSON.parse(process.env.NEXT_PUBLIC_CURRENCY_RATES);

      if (typeof parsed === 'object' && parsed !== null) {
        return Object.entries(parsed as Record<string, unknown>).reduce<RatesMap>(
          (acc, [currency, value]) => {
            const upper = currency.toUpperCase();
            const numeric = Number(value);
            if (Number.isFinite(numeric) && numeric > 0) {
              acc[upper] = numeric;
            }
            return acc;
          },
          { ...DEFAULT_RATES },
        );
      }
    }

    return { ...DEFAULT_RATES };
  } catch (error) {
    console.warn('Failed to parse currency rates. Falling back to defaults.', error);
    return { ...DEFAULT_RATES };
  }
};

// Function to update live rates (called by client-side code)
export const updateLiveRates = (rates: RatesMap) => {
  liveRates = rates;
  cachedSettings = null; // Clear cache to force rebuild with new rates
};

interface CurrencySettings {
  base: string;
  active: string;
  locale: string;
  rates: RatesMap;
  symbols: SymbolMap;
}

let cachedSettings: CurrencySettings | null = null;

const buildCurrencySettings = (): CurrencySettings => {
  const rates = parseRatesFromEnv();
  const base = DEFAULT_BASE;

  if (!rates[base]) {
    rates[base] = 1;
  }

  const active = rates[DEFAULT_ACTIVE] ? DEFAULT_ACTIVE : base;

  const symbols: SymbolMap = {
    ...DEFAULT_SYMBOLS,
  };

  if (process.env.NEXT_PUBLIC_CURRENCY_SYMBOL) {
    symbols[active] = process.env.NEXT_PUBLIC_CURRENCY_SYMBOL;
  }

  return {
    base,
    active,
    locale: DEFAULT_LOCALE,
    rates,
    symbols,
  };
};

export const getCurrencySettings = (): CurrencySettings => {
  if (!cachedSettings) {
    cachedSettings = buildCurrencySettings();
  }
  return cachedSettings;
};

export const getActiveCurrency = (): string => getCurrencySettings().active;

export const getBaseCurrency = (): string => getCurrencySettings().base;

export const getCurrencySymbol = (currency?: string): string => {
  const settings = getCurrencySettings();
  const target = currency?.toUpperCase() || settings.active;
  return settings.symbols[target] || target;
};

export const convertFromBase = (amount: number, targetCurrency?: string): number => {
  const settings = getCurrencySettings();
  const target = targetCurrency?.toUpperCase() || settings.active;
  const rate = settings.rates[target];

  if (!rate) {
    return amount;
  }

  return amount * rate;
};

export const convertBetweenCurrencies = (
  amount: number,
  fromCurrency: string,
  toCurrency: string,
): number => {
  const settings = getCurrencySettings();
  const from = fromCurrency.toUpperCase();
  const to = toCurrency.toUpperCase();

  if (from === to) {
    return amount;
  }

  const baseRate = settings.rates[from];
  const targetRate = settings.rates[to];

  if (!baseRate || !targetRate) {
    return amount;
  }

  const amountInBase = amount / baseRate;
  return amountInBase * targetRate;
};

export interface FormatCurrencyOptions {
  currency?: string;
  convert?: boolean;
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
}

// Get appropriate locale for currency formatting
const getLocaleForCurrency = (currency: string): string => {
  const localeMap: Record<string, string> = {
    'GBP': 'en-GB',
    'USD': 'en-US',
    'EUR': 'de-DE',
    'CAD': 'en-CA',
    'AUD': 'en-AU',
    'JPY': 'ja-JP',
    'CHF': 'de-CH',
    'CNY': 'zh-CN',
    'INR': 'en-IN',
    'NZD': 'en-NZ',
    'SGD': 'en-SG',
    'HKD': 'zh-HK',
    'KRW': 'ko-KR',
    'SEK': 'sv-SE',
    'NOK': 'nb-NO',
    'DKK': 'da-DK',
    'MXN': 'es-MX',
    'BRL': 'pt-BR',
    'ZAR': 'en-ZA',
    'AED': 'ar-AE',
  };
  return localeMap[currency.toUpperCase()] || 'en-GB';
};

export const formatCurrency = (
  amount: number,
  options?: FormatCurrencyOptions,
): string => {
  const settings = getCurrencySettings();
  const targetCurrency = (options?.currency || settings.active).toUpperCase();
  const shouldConvert = options?.convert ?? true;

  let value = amount;

  if (shouldConvert && targetCurrency !== settings.base) {
    value = convertBetweenCurrencies(amount, settings.base, targetCurrency);
  }

  try {
    const locale = getLocaleForCurrency(targetCurrency);
    const formatter = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: targetCurrency,
      ...(options?.minimumFractionDigits !== undefined
        ? { minimumFractionDigits: options.minimumFractionDigits }
        : {}),
      ...(options?.maximumFractionDigits !== undefined
        ? { maximumFractionDigits: options.maximumFractionDigits }
        : {}),
    });

    return formatter.format(value);
  } catch (error) {
    const symbol = getCurrencySymbol(targetCurrency);
    const fixed = value.toFixed(
      options?.maximumFractionDigits ?? options?.minimumFractionDigits ?? 2,
    );
    return `${symbol}${fixed}`;
  }
};

const parseFloatEnv = (value: string | undefined, fallback: number): number => {
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
};

export const getShippingFee = (): number =>
  parseFloatEnv(process.env.NEXT_PUBLIC_FLAT_SHIPPING_FEE, 5);

export const getFreeShippingThreshold = (): number =>
  parseFloatEnv(process.env.NEXT_PUBLIC_FREE_SHIPPING_THRESHOLD, 50);
