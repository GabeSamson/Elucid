import { Product } from '@/types/product.types';
import {
  convertBetweenCurrencies,
  convertFromBase,
  getBaseCurrency,
} from './currency';

type PricedProduct = Pick<Product, 'price' | 'priceOverrides' | 'compareAtPrice'>;

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

const getOverrideValue = (
  product: PricedProduct,
  currency: string,
): number | undefined => {
  const overrides = product.priceOverrides;
  if (!overrides) return undefined;

  const value = overrides[currency];
  return isFiniteNumber(value) ? value : undefined;
};

export const getProductPriceInCurrency = (
  product: PricedProduct,
  currency?: string,
): number => {
  const baseCurrency = getBaseCurrency();
  const targetCurrency = (currency || baseCurrency).toUpperCase();

  if (targetCurrency === baseCurrency) {
    return product.price;
  }

  const override = getOverrideValue(product, targetCurrency);
  if (override !== undefined) {
    return override;
  }

  return convertFromBase(product.price, targetCurrency);
};

export const getProductPriceInBaseCurrency = (
  product: PricedProduct,
  currency?: string,
): number => {
  const baseCurrency = getBaseCurrency();
  const targetCurrency = (currency || baseCurrency).toUpperCase();

  if (targetCurrency === baseCurrency) {
    return product.price;
  }

  const override = getOverrideValue(product, targetCurrency);
  if (override === undefined) {
    return product.price;
  }

  return convertBetweenCurrencies(override, targetCurrency, baseCurrency);
};

export const getProductCompareAtPriceInCurrency = (
  product: PricedProduct,
  currency?: string,
): number | null => {
  if (!isFiniteNumber(product.compareAtPrice)) {
    return null;
  }

  const baseCurrency = getBaseCurrency();
  const targetCurrency = (currency || baseCurrency).toUpperCase();

  if (targetCurrency === baseCurrency) {
    return product.compareAtPrice ?? null;
  }

  return convertFromBase(product.compareAtPrice!, targetCurrency);
};

export const hasPriceOverrideForCurrency = (
  product: PricedProduct,
  currency?: string,
): boolean => {
  if (!product.priceOverrides) {
    return false;
  }

  const baseCurrency = getBaseCurrency();
  const targetCurrency = (currency || baseCurrency).toUpperCase();

  if (targetCurrency === baseCurrency) {
    return false;
  }

  return isFiniteNumber(product.priceOverrides[targetCurrency]);
};
