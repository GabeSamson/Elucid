"use client";

import { motion } from "framer-motion";
import { useSession } from "next-auth/react";
import { useState, Suspense, useEffect } from "react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import AuthModal from "@/components/AuthModal";
import { useWishlist } from "@/contexts/WishlistContext";
import { useCart } from "@/contexts/CartContext";
import { useCurrencyFormat } from "@/hooks/useCurrencyFormat";
import Image from "next/image";
import Link from "next/link";

export const dynamic = 'force-dynamic';

export default function WishlistPage() {
  return (
    <Suspense fallback={<WishlistPageLoading />}>
      <WishlistPageContent />
    </Suspense>
  );
}

function WishlistPageContent() {
  const { data: session, status } = useSession();
  const { wishlist, removeFromWishlist, loading } = useWishlist();
  const { addToCart } = useCart();
  const { formatCurrency } = useCurrencyFormat();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [addingToCartId, setAddingToCartId] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      setAuthModalOpen(true);
    }
  }, [status]);

  const handleRemove = async (productId: string) => {
    setRemovingId(productId);
    try {
      await removeFromWishlist(productId);
    } finally {
      setRemovingId(null);
    }
  };

  const handleAddToCart = async (wishlistItem: any) => {
    const item = wishlistItem.product;
    setAddingToCartId(item.id);
    try {
      // Parse images if it's a JSON string
      const images = typeof item.images === 'string' ? JSON.parse(item.images) : item.images;

      // Convert wishlist item to Product format expected by addToCart
      const product = {
        id: item.id,
        name: item.name,
        price: item.price,
        images: images || [],
        stock: item.stock,
        sizes: [],
        colors: [],
      };

      addToCart(product as any, 1, undefined, undefined);

      // Remove from wishlist after adding to cart
      await removeFromWishlist(item.id);
    } catch (error) {
      console.error('Failed to add to cart:', error);
      alert('Failed to add item to cart');
    } finally {
      setAddingToCartId(null);
    }
  };

  if (status === "loading") {
    return <WishlistPageLoading />;
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
              Please sign in to view your wishlist.
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
              My Wishlist
            </h1>
            <p className="text-charcoal-light text-lg">
              Items you've saved for later
            </p>
          </motion.div>

          {/* Wishlist Items */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-charcoal/60 text-lg uppercase tracking-wider">
                  Loading wishlist...
                </div>
              </div>
            ) : wishlist.length === 0 ? (
              <div className="text-center py-12">
                <svg
                  className="w-16 h-16 mx-auto mb-4 text-charcoal/20"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                  />
                </svg>
                <p className="text-charcoal/60 text-lg uppercase tracking-wider mb-4">
                  Your wishlist is empty
                </p>
                <a
                  href="/shop"
                  className="inline-block px-8 py-3 bg-charcoal-dark text-cream-light hover:bg-charcoal transition-colors duration-300 tracking-wider text-sm uppercase"
                >
                  Start Shopping
                </a>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {wishlist.map((wishlistItem) => {
                  const item = wishlistItem.product;
                  const images = typeof item.images === 'string' ? JSON.parse(item.images) : item.images;
                  const firstImage = Array.isArray(images) ? images[0] : null;
                  const inStock = item.stock > 0;

                  return (
                    <motion.div
                      key={wishlistItem.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.3 }}
                      className="bg-cream-light group relative"
                    >
                      <Link href={`/products/${item.id}`}>
                        <div className="aspect-square relative bg-cream-dark mb-4 overflow-hidden">
                          {firstImage ? (
                            <Image
                              src={firstImage}
                              alt={item.name}
                              fill
                              className="object-cover group-hover:scale-105 transition-transform duration-500"
                              sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-charcoal/20">
                              No image
                            </div>
                          )}

                          {!inStock && (
                            <div className="absolute inset-0 bg-charcoal-dark/60 flex items-center justify-center">
                              <span className="text-cream text-sm uppercase tracking-wider">
                                Out of Stock
                              </span>
                            </div>
                          )}
                        </div>
                      </Link>

                      <div className="p-4">
                        <Link href={`/products/${item.id}`}>
                          <h3 className="font-serif text-xl text-charcoal-dark mb-2 group-hover:text-charcoal transition-colors">
                            {item.name}
                          </h3>
                        </Link>

                        <p className="text-charcoal-light mb-4">
                          {formatCurrency(item.price)}
                        </p>

                        <div className="flex flex-col gap-2">
                          <button
                            onClick={() => handleAddToCart(wishlistItem)}
                            disabled={!inStock || addingToCartId === item.id}
                            className="w-full px-4 py-3 bg-charcoal-dark text-cream text-sm uppercase tracking-wider hover:bg-charcoal transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {addingToCartId === item.id
                              ? 'Adding...'
                              : inStock
                              ? 'Add to Cart'
                              : 'Out of Stock'}
                          </button>

                          <button
                            onClick={() => handleRemove(item.id)}
                            disabled={removingId === item.id}
                            className="w-full px-4 py-3 border border-charcoal-dark text-charcoal-dark text-sm uppercase tracking-wider hover:bg-charcoal-dark hover:text-cream transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {removingId === item.id ? 'Removing...' : 'Remove'}
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </motion.div>

          {/* Back to Account Link */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="mt-12 text-center"
          >
            <Link
              href="/account"
              className="inline-flex items-center gap-2 text-charcoal-dark hover:text-charcoal transition-colors"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 19l-7-7m0 0l7-7m-7 7h18"
                />
              </svg>
              Back to Account
            </Link>
          </motion.div>
        </div>
      </div>

      <Footer />
    </main>
  );
}

function WishlistPageLoading() {
  return (
    <main className="min-h-screen bg-cream flex items-center justify-center">
      <div className="text-charcoal/60 text-lg uppercase tracking-wider">
        Loading...
      </div>
    </main>
  );
}
