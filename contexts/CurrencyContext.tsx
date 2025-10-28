"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { detectCurrencyFromLocation, isSupportedCurrency } from '@/lib/geolocation';
import Cookies from 'js-cookie';

interface CurrencyContextType {
  currency: string;
  setCurrency: (currency: string) => Promise<void>;
  isLoading: boolean;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

const CURRENCY_COOKIE_NAME = 'preferred_currency';
const CURRENCY_COOKIE_DAYS = 365;

interface CurrencyProviderProps {
  children: ReactNode;
  userId?: string | null;
  initialCurrency?: string | null;
}

export function CurrencyProvider({ children, userId, initialCurrency }: CurrencyProviderProps) {
  const [currency, setCurrencyState] = useState<string>('GBP');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    initializeCurrency();
  }, [userId, initialCurrency]);

  const initializeCurrency = async () => {
    setIsLoading(true);

    try {
      // Priority 1: User's database preference (if logged in)
      if (initialCurrency && isSupportedCurrency(initialCurrency)) {
        setCurrencyState(initialCurrency.toUpperCase());
        Cookies.set(CURRENCY_COOKIE_NAME, initialCurrency.toUpperCase(), { expires: CURRENCY_COOKIE_DAYS });
        setIsLoading(false);
        return;
      }

      // Priority 2: Cookie preference
      const cookieCurrency = Cookies.get(CURRENCY_COOKIE_NAME);
      if (cookieCurrency && isSupportedCurrency(cookieCurrency)) {
        setCurrencyState(cookieCurrency.toUpperCase());
        setIsLoading(false);
        return;
      }

      // Priority 3: Auto-detect from location
      const detectedCurrency = await detectCurrencyFromLocation();
      setCurrencyState(detectedCurrency.toUpperCase());
      Cookies.set(CURRENCY_COOKIE_NAME, detectedCurrency.toUpperCase(), { expires: CURRENCY_COOKIE_DAYS });
    } catch (error) {
      console.error('Failed to initialize currency:', error);
      setCurrencyState('GBP'); // Fallback to GBP
    } finally {
      setIsLoading(false);
    }
  };

  const setCurrency = async (newCurrency: string): Promise<void> => {
    const upper = newCurrency.toUpperCase();

    if (!isSupportedCurrency(upper)) {
      console.warn(`Unsupported currency: ${upper}`);
      return;
    }

    // Update local state and cookie
    setCurrencyState(upper);
    Cookies.set(CURRENCY_COOKIE_NAME, upper, { expires: CURRENCY_COOKIE_DAYS });

    // Update database if user is logged in
    if (userId) {
      try {
        await fetch('/api/user/currency', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ currency: upper }),
        });
      } catch (error) {
        console.error('Failed to save currency preference to database:', error);
      }
    }
  };

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, isLoading }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (context === undefined) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
}
