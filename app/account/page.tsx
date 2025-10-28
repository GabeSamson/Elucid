"use client";

import { motion } from "framer-motion";
import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import AuthModal from "@/components/AuthModal";
import { Order } from "@/types/product.types";
import { useCurrency } from "@/contexts/CurrencyContext";
import { getSupportedCurrencies } from "@/lib/geolocation";
import { useCurrencyFormat } from "@/hooks/useCurrencyFormat";

export const dynamic = 'force-dynamic';

export default function AccountPage() {
  return (
    <Suspense fallback={<AccountPageLoading />}>
      <AccountPageContent />
    </Suspense>
  );
}

function AccountPageContent() {
  const { data: session, status } = useSession();
  const searchParams = useSearchParams();
  const { currency, setCurrency } = useCurrency();
  const { formatCurrency } = useCurrencyFormat();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [currencyUpdating, setCurrencyUpdating] = useState(false);
  const signInMessage =
    searchParams.get('redirect') === '/checkout'
      ? 'Please sign in to continue to checkout.'
      : 'Please sign in to access your account.';

  useEffect(() => {
    if (status === "authenticated") {
      setAuthModalOpen(false);
      setLoading(true);
      fetchOrders();
    } else if (status === "unauthenticated") {
      setAuthModalOpen(true);
    }
  }, [status]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/orders');
      const data = await res.json();
      if (res.ok) {
        setOrders(data.orders || []);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCurrencyChange = async (newCurrency: string) => {
    setCurrencyUpdating(true);
    try {
      await setCurrency(newCurrency);
      // Refresh orders to show in new currency
      if (status === "authenticated") {
        await fetchOrders();
      }
    } catch (error) {
      console.error('Failed to update currency:', error);
      alert('Failed to update currency preference');
    } finally {
      setCurrencyUpdating(false);
    }
  };

  const handleDeleteAccount = async () => {
    const confirmed = window.confirm(
      'Are you sure you want to delete your account? This action cannot be undone. Your order history will be preserved but you will lose access to your account.'
    );
    if (!confirmed) return;

    const doubleConfirm = window.confirm(
      'This is your final warning. Are you absolutely sure you want to permanently delete your account?'
    );
    if (!doubleConfirm) return;

    setDeleting(true);

    try {
      const res = await fetch('/api/user/delete-account', {
        method: 'DELETE',
      });

      const data = await res.json();

      if (res.ok) {
        alert('Your account has been deleted. You will now be logged out.');
        // Sign out and redirect to home
        window.location.href = '/api/auth/signout';
      } else {
        alert(data.error || 'Failed to delete account');
      }
    } catch (error) {
      alert('An unexpected error occurred');
    } finally {
      setDeleting(false);
    }
  };

  if (status === "loading") {
    return <AccountPageLoading />;
  }

  if (status === "unauthenticated") {
    return (
      <main className="min-h-screen bg-cream">
        <Suspense fallback={<div className="h-20" />}>
          <Navigation />
        </Suspense>

        <div className="pt-32 pb-20 px-6 flex items-center justify-center">
          <div className="max-w-md text-center">
            <h1 className="font-serif text-4xl text-charcoal-dark mb-4">
              Sign In Required
            </h1>
            <p className="text-charcoal-light mb-8">
              {signInMessage}
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={() => setAuthModalOpen(true)}
                className="px-8 py-3 bg-charcoal-dark text-cream-light hover:bg-charcoal transition-colors duration-300 tracking-wider text-sm uppercase"
              >
                Sign In
              </button>
              <a
                href="/"
                className="px-8 py-3 border border-charcoal-dark text-charcoal-dark hover:bg-charcoal-dark hover:text-cream transition-colors duration-300 tracking-wider text-sm uppercase"
              >
                Continue Shopping
              </a>
            </div>
          </div>
        </div>

        <Footer />

        <AuthModal
          isOpen={authModalOpen}
          onClose={() => setAuthModalOpen(false)}
          initialMode="signin"
        />
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
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="mb-16"
          >
            <h1 className="font-serif text-5xl md:text-7xl text-charcoal-dark mb-4">
              My Account
            </h1>
            <p className="text-charcoal-light text-lg">
              Welcome back, {session?.user?.name || session?.user?.email}
            </p>
          </motion.div>

          {/* Profile Section */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mb-12 p-8 bg-cream-light"
          >
            <h2 className="font-serif text-2xl text-charcoal-dark mb-4">
              Profile Information
            </h2>
            <div className="space-y-3 text-charcoal-light mb-6">
              <p>
                <span className="font-medium text-charcoal">Name:</span> {session?.user?.name || "Not set"}
              </p>
              <p>
                <span className="font-medium text-charcoal">Email:</span> {session?.user?.email}
              </p>
            </div>

            {/* Currency Preference */}
            <div className="mb-6 pb-6 border-b border-charcoal/10">
              <h3 className="text-sm uppercase tracking-wider text-charcoal-dark mb-3 font-medium">
                Currency Preference
              </h3>
              <div className="flex items-center gap-4">
                <select
                  value={currency}
                  onChange={(e) => handleCurrencyChange(e.target.value)}
                  disabled={currencyUpdating}
                  className="select-modern-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {getSupportedCurrencies().map((curr) => (
                    <option key={curr} value={curr}>
                      {curr}
                    </option>
                  ))}
                </select>
                {currencyUpdating && (
                  <span className="text-sm text-charcoal/60">Updating...</span>
                )}
              </div>
              <p className="text-xs text-charcoal/60 mt-2">
                All prices on the site will be displayed in your selected currency
              </p>
            </div>

            {/* Danger Zone */}
            <div className="pt-6 border-t border-charcoal/10">
              <h3 className="text-sm uppercase tracking-wider text-charcoal-dark mb-3 font-medium">
                Danger Zone
              </h3>
              <button
                onClick={handleDeleteAccount}
                disabled={deleting}
                className="px-4 py-2 text-sm bg-charcoal-dark text-cream hover:bg-charcoal transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deleting ? 'Deleting Account...' : 'Delete My Account'}
              </button>
              <p className="text-xs text-charcoal/60 mt-2">
                This action is permanent and cannot be undone
              </p>
            </div>
          </motion.div>

          {/* Orders Section */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <h2 className="font-serif text-3xl text-charcoal-dark mb-8">
              Order History
            </h2>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-charcoal/60 text-lg uppercase tracking-wider">
                  Loading orders...
                </div>
              </div>
            ) : orders.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-charcoal/60 text-lg uppercase tracking-wider mb-4">
                  No orders yet
                </p>
                <a
                  href="/shop"
                  className="inline-block px-8 py-3 bg-charcoal-dark text-cream-light hover:bg-charcoal transition-colors duration-300 tracking-wider text-sm uppercase"
                >
                  Start Shopping
                </a>
              </div>
            ) : (
              <div className="space-y-6">
                {orders.map((order) => (
                  <div key={order.id} className="p-6 bg-cream-light border-l-4 border-charcoal-dark">
                    <div className="flex flex-col md:flex-row md:items-center justify-between mb-4">
                      <div>
                        <p className="text-sm text-charcoal/60 uppercase tracking-wider mb-1">
                          Order #{order.id.slice(0, 8)}
                        </p>
                        <p className="text-lg font-medium text-charcoal-dark">
                          {formatCurrency(order.total)}
                        </p>
                      </div>
                      <div className="mt-3 md:mt-0">
                        <span className={`inline-block px-4 py-2 text-xs uppercase tracking-wider ${
                          order.status === 'DELIVERED' ? 'bg-beige/30 text-charcoal-dark' :
                          order.status === 'SHIPPED' ? 'bg-beige text-charcoal' :
                          order.status === 'PROCESSING' ? 'bg-cream-dark text-charcoal' :
                          order.status === 'CANCELLED' ? 'bg-charcoal-dark text-cream' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {order.status}
                        </span>
                      </div>
                    </div>

                    <p className="text-sm text-charcoal-light mb-4">
                      Placed on {new Date(order.createdAt).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric'
                      })}
                    </p>

                    {order.trackingNumber && (
                      <p className="text-sm text-charcoal">
                        <span className="font-medium">Tracking:</span> {order.trackingNumber}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        </div>
      </div>

      <Footer />
    </main>
  );
}

function AccountPageLoading() {
  return (
    <main className="min-h-screen bg-cream flex items-center justify-center">
      <div className="text-charcoal/60 text-lg uppercase tracking-wider">
        Loading...
      </div>
    </main>
  );
}
