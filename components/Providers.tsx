"use client";

import { Suspense } from "react";
import { SessionProvider } from "next-auth/react";
import { CartProvider } from "@/contexts/CartContext";
import { CurrencyInitializer } from "./CurrencyInitializer";
import PageViewTracker from "./PageViewTracker";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <CurrencyInitializer>
        <CartProvider>
          <Suspense fallback={null}>
            <PageViewTracker />
          </Suspense>
          {children}
        </CartProvider>
      </CurrencyInitializer>
    </SessionProvider>
  );
}
