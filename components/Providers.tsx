"use client";

import { Suspense } from "react";
import { SessionProvider } from "next-auth/react";
import { CartProvider } from "@/contexts/CartContext";
import { WishlistProvider } from "@/contexts/WishlistContext";
import { CurrencyInitializer } from "./CurrencyInitializer";
import PageViewTracker from "./PageViewTracker";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <CurrencyInitializer>
        <CartProvider>
          <WishlistProvider>
            <Suspense fallback={null}>
              <PageViewTracker />
            </Suspense>
            {children}
          </WishlistProvider>
        </CartProvider>
      </CurrencyInitializer>
    </SessionProvider>
  );
}
