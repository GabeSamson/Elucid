"use client";

import { motion } from "framer-motion";
import { useEffect, useState, Suspense } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/contexts/CartContext";
import { useSession } from "next-auth/react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { formatCurrency, getShippingFee, getFreeShippingThreshold } from "@/lib/currency";

type DiscountType = 'PERCENTAGE' | 'FIXED';

interface AppliedPromo {
  id: string;
  code: string;
  description?: string | null;
  discountType: DiscountType;
  amount: number;
  minimumOrderValue?: number | null;
}

export default function CheckoutPage() {
  const router = useRouter();
  const { items, totalPrice, clearCart } = useCart();
  const { data: session, status } = useSession();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [promoInput, setPromoInput] = useState("");
  const [promoError, setPromoError] = useState<string | null>(null);
  const [appliedPromo, setAppliedPromo] = useState<AppliedPromo | null>(null);
  const [applyingPromo, setApplyingPromo] = useState(false);

  const [formData, setFormData] = useState({
    email: session?.user?.email || "",
    name: session?.user?.name || "",
    line1: "",
    line2: "",
    city: "",
    state: "",
    postalCode: "",
    country: "GB",
  });

  const shippingFee = getShippingFee();
  const freeShippingThreshold = getFreeShippingThreshold();
  const isFreeShipping = totalPrice >= freeShippingThreshold;
  const shipping = isFreeShipping ? 0 : shippingFee;
  const amountUntilFreeShipping = Math.max(freeShippingThreshold - totalPrice, 0);
  const tax = 0;
  const rawDiscount = appliedPromo
    ? appliedPromo.discountType === 'PERCENTAGE'
      ? totalPrice * (appliedPromo.amount / 100)
      : appliedPromo.amount
    : 0;
  const discount = Math.min(Math.max(rawDiscount, 0), totalPrice);
  const subtotalAfterDiscount = Math.max(totalPrice - discount, 0);
const total = subtotalAfterDiscount + shipping;

// Require authentication to checkout
useEffect(() => {
  if (status === 'loading') return; // Wait for session to load
  if (status === 'unauthenticated') {
    // Redirect to account page (sign in)
    router.push('/account?redirect=/checkout');
  }
}, [status, router]);

useEffect(() => {
  if (!appliedPromo) return;
  if (appliedPromo.minimumOrderValue && totalPrice < appliedPromo.minimumOrderValue) {
    setAppliedPromo(null);
    setPromoError(
      `Order total must be at least ${formatCurrency(appliedPromo.minimumOrderValue)} to use ${appliedPromo.code}.`
    );
  }
}, [appliedPromo, totalPrice]);

  const handleApplyPromo = async () => {
    const code = promoInput.trim();
    if (!code) {
      setPromoError('Enter a promo code to apply.');
      return;
    }

    setApplyingPromo(true);
    setPromoError(null);

    try {
      const response = await fetch('/api/promocodes/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, subtotal: totalPrice }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Promo code is invalid');
      }

      setAppliedPromo({
        id: data.promo.id,
        code: data.promo.code,
        description: data.promo.description,
        discountType: data.promo.discountType,
        amount: data.promo.amount,
        minimumOrderValue: data.promo.minimumOrderValue,
      });
      setPromoError(null);
      setPromoInput(data.promo.code);
    } catch (err) {
      console.error('Apply promo error:', err);
      setAppliedPromo(null);
      setPromoError(err instanceof Error ? err.message : 'Failed to apply promo code');
    } finally {
      setApplyingPromo(false);
    }
  };

  const handleRemovePromo = () => {
    setAppliedPromo(null);
    setPromoInput('');
    setPromoError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // Create Stripe checkout session
      const res = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: items.map(item => {
            const colorSpecificImage =
              item.color && item.product.colorImages
                ? item.product.colorImages[item.color]?.[0]
                : undefined;

            return {
              productId: item.product.id,
              productName: item.product.name,
              productImage: colorSpecificImage || (item.product.images && item.product.images[0]) || null,
              quantity: item.quantity,
              size: item.size,
              color: item.color,
              priceAtPurchase: item.product.price,
            };
          }),
          email: formData.email,
          name: formData.name,
          address: {
            line1: formData.line1,
            line2: formData.line2,
            city: formData.city,
            state: formData.state,
            postalCode: formData.postalCode,
            country: formData.country,
          },
          subtotal: totalPrice,
          subtotalAfterDiscount,
          shipping,
          tax,
          discount,
          promoCode: appliedPromo?.code ?? null,
          promoCodeId: appliedPromo?.id ?? null,
          total,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create checkout session');
      }

      // Redirect to Stripe Checkout using the session URL
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error('No checkout URL returned from server');
      }
    } catch (err: any) {
      console.error('Checkout error:', err);
      setError(err.message || 'An error occurred during checkout');
      setLoading(false);
    }
  };

  // Show loading while checking authentication
  if (status === 'loading') {
    return (
      <main className="min-h-screen bg-cream">
        <Suspense fallback={<div className="h-20" />}>
          <Navigation />
        </Suspense>
        <div className="pt-32 pb-20 px-6 flex items-center justify-center">
          <div className="text-center text-charcoal/60">
            Loading...
          </div>
        </div>
        <Footer />
      </main>
    );
  }

  // Show message if not authenticated (brief, before redirect)
  if (status === 'unauthenticated') {
    return (
      <main className="min-h-screen bg-cream">
        <Suspense fallback={<div className="h-20" />}>
          <Navigation />
        </Suspense>
        <div className="pt-32 pb-20 px-6 flex items-center justify-center">
          <div className="text-center">
            <h1 className="font-serif text-4xl text-charcoal-dark mb-4">
              Sign In Required
            </h1>
            <p className="text-charcoal-light mb-8">
              Please sign in to continue to checkout
            </p>
          </div>
        </div>
        <Footer />
      </main>
    );
  }

  if (items.length === 0) {
    return (
      <main className="min-h-screen bg-cream">
        <Suspense fallback={<div className="h-20" />}>
          <Navigation />
        </Suspense>
        <div className="pt-32 pb-20 px-6 flex items-center justify-center">
          <div className="text-center">
            <h1 className="font-serif text-4xl text-charcoal-dark mb-4">
              Your cart is empty
            </h1>
            <p className="text-charcoal-light mb-8">
              Add some items to your cart to checkout
            </p>
            <a
              href="/shop"
              className="inline-block px-8 py-3 bg-charcoal-dark text-cream-light hover:bg-charcoal transition-colors duration-300 tracking-wider text-sm uppercase"
            >
              Continue Shopping
            </a>
          </div>
        </div>
        <Footer />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-cream">
      <Suspense fallback={<div className="h-20" />}>
        <Navigation />
      </Suspense>

      <div className="pt-32 pb-20 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="font-serif text-5xl md:text-7xl text-charcoal-dark mb-12"
          >
            Checkout
          </motion.h1>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Left: Form */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              <form onSubmit={handleSubmit} noValidate className="space-y-6">
                <div>
                  <h2 className="font-serif text-2xl text-charcoal-dark mb-4">
                    Contact Information
                  </h2>
                  <div className="space-y-4">
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="Email"
                      required
                      className="w-full px-4 py-3 bg-cream-light border border-charcoal/20 focus:border-charcoal focus:outline-none"
                    />
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Full Name"
                      required
                      className="w-full px-4 py-3 bg-cream-light border border-charcoal/20 focus:border-charcoal focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <h2 className="font-serif text-2xl text-charcoal-dark mb-4">
                    Shipping Address
                  </h2>
                  <div className="space-y-4">
                    <input
                      type="text"
                      value={formData.line1}
                      onChange={(e) => setFormData({ ...formData, line1: e.target.value })}
                      placeholder="Address Line 1"
                      required
                      className="w-full px-4 py-3 bg-cream-light border border-charcoal/20 focus:border-charcoal focus:outline-none"
                    />
                    <input
                      type="text"
                      value={formData.line2}
                      onChange={(e) => setFormData({ ...formData, line2: e.target.value })}
                      placeholder="Address Line 2 (Optional)"
                      className="w-full px-4 py-3 bg-cream-light border border-charcoal/20 focus:border-charcoal focus:outline-none"
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <input
                        type="text"
                        value={formData.city}
                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                        placeholder="City"
                        required
                        className="w-full px-4 py-3 bg-cream-light border border-charcoal/20 focus:border-charcoal focus:outline-none"
                      />
                      <input
                        type="text"
                        value={formData.state}
                        onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                        placeholder="County/State"
                        required
                        className="w-full px-4 py-3 bg-cream-light border border-charcoal/20 focus:border-charcoal focus:outline-none"
                      />
                    </div>
                    <input
                      type="text"
                      name="postalCode"
                      value={formData.postalCode}
                      onChange={(e) => setFormData({ ...formData, postalCode: e.target.value.toUpperCase() })}
                      placeholder="Postal Code"
                      autoComplete="postal-code"
                      className="w-full px-4 py-3 bg-cream-light border border-charcoal/20 focus:border-charcoal focus:outline-none"
                    />
                  </div>
                </div>

                {error && (
                  <div className="p-4 bg-cream-dark border border-beige text-charcoal-dark text-sm">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 bg-charcoal-dark text-cream-light hover:bg-charcoal transition-colors duration-300 tracking-wider text-sm uppercase disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Processing...' : 'Continue to Payment'}
                </button>

                <p className="text-xs text-charcoal/60 text-center">
                  You will be redirected to Stripe to complete your payment securely
                </p>
              </form>
            </motion.div>

            {/* Right: Order Summary */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-cream-light p-8"
            >
              <h2 className="font-serif text-2xl text-charcoal-dark mb-6">
                Order Summary
              </h2>

              <div className="mb-6 space-y-2">
                <label className="block text-sm font-medium text-charcoal">
                  Promo Code
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={promoInput}
                    onChange={(event) => setPromoInput(event.target.value.toUpperCase())}
                    placeholder="Enter code"
                    className="input-modern"
                    disabled={applyingPromo}
                  />
                  {appliedPromo ? (
                    <button
                      type="button"
                      onClick={handleRemovePromo}
                      className="px-6 py-3 border border-charcoal/30 rounded-lg bg-cream hover:border-charcoal transition-colors"
                    >
                      Remove
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleApplyPromo}
                      disabled={applyingPromo}
                      className="px-6 py-3 bg-charcoal text-cream rounded-lg hover:bg-charcoal/90 transition-colors disabled:opacity-50"
                    >
                      {applyingPromo ? 'Applying…' : 'Apply'}
                    </button>
                  )}
                </div>
                {promoError && (
                  <p className="text-xs text-charcoal-dark">{promoError}</p>
                )}
                {appliedPromo && !promoError && (
                  <p className="text-xs text-charcoal-dark">
                    {appliedPromo.description || 'Promo code applied.'}
                  </p>
                )}
              </div>

              <div className="space-y-4 mb-6">
                {items.map((item, index) => {
                  const colorSpecificImage =
                    item.color && item.product.colorImages
                      ? item.product.colorImages[item.color]?.[0]
                      : undefined;
                  const displayImage =
                    colorSpecificImage || (item.product.images && item.product.images[0]) || null;

                  return (
                    <div key={index} className="flex gap-4 pb-4 border-b border-charcoal/10">
                      <div className="w-20 h-24 bg-cream-dark film-grain">
                        {displayImage ? (
                          <img
                            src={displayImage}
                            alt={item.product.name}
                            className="w-full h-full object-cover"
                          />
                        ) : null}
                      </div>
                      <div className="flex-1">
                        <h3 className="text-charcoal-dark font-medium mb-1">
                          {item.product.name}
                        </h3>
                        <p className="text-sm text-charcoal-light">
                          {item.size && `Size: ${item.size}`}
                          {item.size && item.color && ' • '}
                          {item.color && `Color: ${item.color}`}
                        </p>
                        <p className="text-sm text-charcoal-light">
                          Qty: {item.quantity}
                        </p>
                        <p className="text-charcoal-dark font-medium mt-2">
                          {formatCurrency(item.product.price * item.quantity)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-charcoal-light">Subtotal</span>
                  <span className="text-charcoal-dark">{formatCurrency(totalPrice)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-charcoal-light">Shipping</span>
                  <span className="text-charcoal-dark">
                    {shipping === 0 ? 'Free' : formatCurrency(shipping)}
                  </span>
                </div>
                {!isFreeShipping && amountUntilFreeShipping > 0 && (
                  <p className="text-xs text-charcoal/60">
                    Spend {formatCurrency(amountUntilFreeShipping)} more to unlock free shipping.
                  </p>
                )}
                {discount > 0 && (
                  <div className="flex justify-between text-charcoal-dark">
                    <span className="text-charcoal-light">Discount</span>
                    <span>-{formatCurrency(discount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-medium pt-4 border-t border-charcoal/10">
                  <span className="text-charcoal-dark">Total</span>
                  <span className="text-charcoal-dark">{formatCurrency(total)}</span>
                </div>
                <p className="text-xs text-charcoal/60 text-right">Prices include VAT.</p>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      <Footer />
    </main>
  );
}
