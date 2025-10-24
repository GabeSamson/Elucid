type RatesMap = Record<string, number>;
type SymbolMap = Record<string, string>;

const DEFAULT_BASE = (process.env.NEXT_PUBLIC_BASE_CURRENCY || 'GBP').toUpperCase();
const DEFAULT_ACTIVE = (process.env.NEXT_PUBLIC_CURRENCY || DEFAULT_BASE).toUpperCase();
const DEFAULT_LOCALE = process.env.NEXT_PUBLIC_LOCALE || 'en-GB';

const DEFAULT_SYMBOLS: SymbolMap = {
  GBP: '£',
  USD: '$',
  EUR: '€',
  CAD: '$',
  AUD: '$',
  JPY: '¥',
};

const parseRatesFromEnv = (): RatesMap => {
  try {
    if (!process.env.NEXT_PUBLIC_CURRENCY_RATES) {
      return {};
    }

    const parsed = JSON.parse(process.env.NEXT_PUBLIC_CURRENCY_RATES);

    if (typeof parsed !== 'object' || parsed === null) {
      return {};
    }

    return Object.entries(parsed as Record<string, unknown>).reduce<RatesMap>(
      (acc, [currency, value]) => {
        const upper = currency.toUpperCase();
        const numeric = Number(value);
        if (!Number.isFinite(numeric) || numeric <= 0) {
          return acc;
        }
        acc[upper] = numeric;
        return acc;
      },
      {},
    );
  } catch (error) {
    console.warn('Failed to parse NEXT_PUBLIC_CURRENCY_RATES. Falling back to defaults.', error);
    return {};
  }
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

interface FormatCurrencyOptions {
  currency?: string;
  convert?: boolean;
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
}

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
    const formatter = new Intl.NumberFormat(settings.locale, {
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
