"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useCart } from "@/contexts/CartContext";
import Link from "next/link";
import { formatCurrency } from "@/lib/currency";

export default function CartModal() {
  const { items, removeFromCart, updateQuantity, totalPrice, isCartOpen, closeCart } = useCart();

  return (
    <AnimatePresence>
      {isCartOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeCart}
            className="fixed inset-0 bg-charcoal-dark/80 z-50 backdrop-blur-sm"
          />

          {/* Cart Drawer */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-cream z-50 flex flex-col shadow-2xl"
          >
            {/* Header */}
            <div className="p-6 border-b border-charcoal/10">
              <div className="flex items-center justify-between">
                <h2 className="font-serif text-3xl text-charcoal-dark">
                  Cart ({items.length})
                </h2>
                <button
                  onClick={closeCart}
                  className="text-charcoal/60 hover:text-charcoal transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Cart Items */}
            <div className="flex-1 overflow-y-auto p-6">
              {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <p className="text-charcoal/60 text-lg uppercase tracking-wider mb-4">
                    Your cart is empty
                  </p>
                  <button
                    onClick={closeCart}
                    className="px-8 py-3 bg-charcoal-dark text-cream-light hover:bg-charcoal transition-colors duration-300 tracking-wider text-sm uppercase"
                  >
                    Continue Shopping
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  {items.map((item) => {
                    const itemKey = `${item.product.id}-${item.size || ''}-${item.color || ''}`;
                    const colorSpecificImage =
                      item.color && item.product.colorImages
                        ? item.product.colorImages[item.color]?.[0]
                        : undefined;
                    const displayImage =
                      colorSpecificImage || (item.product.images && item.product.images[0]);

                    return (
                      <div key={itemKey} className="flex gap-4 pb-6 border-b border-charcoal/10 last:border-0">
                        {/* Product Image */}
                        <div className="w-24 h-32 bg-cream-dark film-grain overflow-hidden flex-shrink-0">
                          {displayImage ? (
                            <img
                              src={displayImage}
                              alt={item.product.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <span className="text-charcoal/20 text-xs uppercase">No Image</span>
                            </div>
                          )}
                        </div>

                        {/* Product Info */}
                        <div className="flex-1 flex flex-col">
                          <h3 className="font-serif text-lg text-charcoal-dark mb-1">
                            {item.product.name}
                          </h3>

                          {(item.size || item.color) && (
                            <div className="text-sm text-charcoal-light mb-2">
                              {item.size && <span>Size: {item.size}</span>}
                              {item.size && item.color && <span> • </span>}
                              {item.color && <span>Color: {item.color}</span>}
                            </div>
                          )}

                          <p className="text-charcoal-dark font-medium mb-3">
                            {formatCurrency(item.product.price)}
                          </p>

                          {/* Quantity Controls */}
                          <div className="flex items-center gap-3 mt-auto">
                            <div className="flex items-center border border-charcoal/20">
                              <button
                                onClick={() => updateQuantity(item.product.id, item.quantity - 1, item.size, item.color)}
                                className="w-8 h-8 hover:bg-cream-dark transition-colors flex items-center justify-center"
                              >
                                -
                              </button>
                              <span className="w-12 text-center text-sm">
                                {item.quantity}
                              </span>
                              <button
                                onClick={() => updateQuantity(item.product.id, item.quantity + 1, item.size, item.color)}
                                disabled={item.quantity >= item.product.stock}
                                className="w-8 h-8 hover:bg-cream-dark transition-colors flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                +
                              </button>
                            </div>

                            <button
                              onClick={() => removeFromCart(item.product.id, item.size, item.color)}
                              className="text-sm text-charcoal/60 hover:text-charcoal transition-colors uppercase tracking-wider ml-auto"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            {items.length > 0 && (
              <div className="p-6 border-t border-charcoal/10 bg-cream-light">
                <div className="flex items-center justify-between mb-6">
                  <span className="text-lg uppercase tracking-wider text-charcoal">
                    Subtotal
                  </span>
                  <span className="text-2xl font-medium text-charcoal-dark">
                    {formatCurrency(totalPrice)}
                  </span>
                </div>

                <Link
                  href="/checkout"
                  onClick={closeCart}
                  className="block w-full py-4 bg-charcoal-dark text-cream-light hover:bg-charcoal transition-colors duration-300 tracking-wider text-sm uppercase text-center mb-3"
                >
                  Proceed to Checkout
                </Link>

                <button
                  onClick={closeCart}
                  className="w-full py-3 border border-charcoal/20 text-charcoal hover:border-charcoal transition-colors duration-300 tracking-wider text-sm uppercase"
                >
                  Continue Shopping
                </button>

                <p className="text-xs text-charcoal/60 text-center mt-4">
                  Shipping calculated at checkout. Prices include VAT.
                </p>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
