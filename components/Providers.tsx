"use client";

import { SessionProvider } from "next-auth/react";
import { CartProvider } from "@/contexts/CartContext";
import { CurrencyInitializer } from "./CurrencyInitializer";
import PageViewTracker from "./PageViewTracker";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <CurrencyInitializer>
        <CartProvider>
          <PageViewTracker />
          {children}
        </CartProvider>
      </CurrencyInitializer>
    </SessionProvider>
  );
}
