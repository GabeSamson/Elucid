"use client";

import { useCurrency } from '@/contexts/CurrencyContext';
import { formatCurrency as baseFormatCurrency, FormatCurrencyOptions } from '@/lib/currency';

/**
 * Client-side hook that formats currency using the user's preferred currency from context
 */
export function useCurrencyFormat() {
  const { currency } = useCurrency();

  const formatCurrency = (amount: number, options?: Omit<FormatCurrencyOptions, 'currency'>) => {
    return baseFormatCurrency(amount, { ...options, currency });
  };

  return { formatCurrency, currency };
}
