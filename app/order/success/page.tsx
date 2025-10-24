"use client";

import { motion } from "framer-motion";
import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useCart } from "@/contexts/CartContext";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";

function OrderSuccessContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const { clearCart } = useCart();
  const [confirmationState, setConfirmationState] = useState<'idle' | 'pending' | 'success' | 'error'>('idle');

  useEffect(() => {
    if (!sessionId || confirmationState !== 'idle') {
      return;
    }

    let cancelled = false;

    const confirmOrder = async () => {
      setConfirmationState('pending');
      try {
        const res = await fetch('/api/orders/confirm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId }),
        });

        if (!res.ok) {
          throw new Error('Failed to confirm order');
        }

        if (!cancelled) {
          setConfirmationState('success');
          clearCart();
        }
      } catch (error) {
        console.error('Order confirmation failed:', error);
        if (!cancelled) {
          setConfirmationState('error');
        }
      }
    };

    confirmOrder();

    return () => {
      cancelled = true;
    };
  }, [sessionId, confirmationState, clearCart]);

  return (
    <main className="min-h-screen bg-cream">
      <Suspense fallback={<div className="h-20" />}>
        <Navigation />
      </Suspense>

      <div className="pt-32 pb-20 px-6">
        <div className="max-w-xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
            className="bg-cream-light p-10"
          >
            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-beige/30 flex items-center justify-center">
              <svg className="w-9 h-9 text-charcoal-dark" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>

            <h1 className="font-serif text-4xl md:text-5xl text-charcoal-dark mb-4">
              Payment Successful
            </h1>

            <p className="text-charcoal/70 text-base md:text-lg mb-8">
              It went through. We&apos;ll pack everything up and send shipping details to your email as soon as it&apos;s on the way.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <a
                href="/account"
                className="inline-flex items-center justify-center px-8 py-3 bg-charcoal-dark text-cream-light hover:bg-charcoal transition-colors duration-300 tracking-wider text-sm uppercase"
              >
                View Orders
              </a>
              <a
                href="/shop"
                className="inline-flex items-center justify-center px-8 py-3 border border-charcoal/20 text-charcoal hover:border-charcoal transition-colors duration-300 tracking-wider text-sm uppercase"
              >
                Continue Shopping
              </a>
            </div>
          </motion.div>

          <p className="mt-8 text-sm text-charcoal/60">
            Need anything else? Drop us a message and we&apos;ll jump on it.
          </p>
          {confirmationState === 'error' && (
            <p className="mt-4 text-sm text-charcoal-dark">
              We couldn&apos;t sync your order automatically. If it doesn&apos;t appear in a minute, refresh or contact support and we&apos;ll sort it.
            </p>
          )}
        </div>
      </div>

      <Footer />
    </main>
  );
}

export default function OrderSuccessPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-cream">
        <div className="h-20" />
        <div className="pt-32 pb-20 px-6 flex items-center justify-center">
          <div className="text-center text-charcoal/60">Loading...</div>
        </div>
      </main>
    }>
      <OrderSuccessContent />
    </Suspense>
  );
}
