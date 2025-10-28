"use client";

import { useSession } from 'next-auth/react';
import { CurrencyProvider } from '@/contexts/CurrencyContext';
import { ReactNode, useEffect, useState } from 'react';
import { updateLiveRates } from '@/lib/currency';

interface CurrencyInitializerProps {
  children: ReactNode;
}

export function CurrencyInitializer({ children }: CurrencyInitializerProps) {
  const { data: session, status } = useSession();
  const [userCurrency, setUserCurrency] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  // Fetch live currency rates on mount
  useEffect(() => {
    const fetchLiveRates = async () => {
      try {
        const res = await fetch('/api/currency/rates');
        if (res.ok) {
          const data = await res.json();
          if (data.rates) {
            updateLiveRates(data.rates);
            console.log('Live currency rates loaded:', data.source);
          }
        }
      } catch (error) {
        console.error('Failed to fetch live currency rates:', error);
      }
    };

    fetchLiveRates();
  }, []);

  useEffect(() => {
    const fetchUserCurrency = async () => {
      if (status === 'loading') return;

      if (status === 'authenticated' && session?.user?.id) {
        try {
          const res = await fetch('/api/user/profile');
          if (res.ok) {
            const data = await res.json();
            setUserCurrency(data.user?.preferredCurrency || null);
          }
        } catch (error) {
          console.error('Failed to fetch user currency:', error);
        }
      }

      setLoaded(true);
    };

    fetchUserCurrency();
  }, [session, status]);

  if (!loaded && status === 'loading') {
    return <>{children}</>;
  }

  return (
    <CurrencyProvider
      userId={session?.user?.id}
      initialCurrency={userCurrency}
    >
      {children}
    </CurrencyProvider>
  );
}
