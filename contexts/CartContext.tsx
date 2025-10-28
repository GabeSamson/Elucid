"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { Product, CartItem } from "@/types/product.types";
import { useCurrency } from "@/contexts/CurrencyContext";
import { getProductPriceInBaseCurrency } from "@/lib/productPricing";

interface CartContextType {
  items: CartItem[];
  addToCart: (product: Product, quantity: number, size?: string, color?: string) => void;
  removeFromCart: (productId: string, size?: string, color?: string) => void;
  updateQuantity: (productId: string, quantity: number, size?: string, color?: string) => void;
  clearCart: () => void;
  totalItems: number;
  totalPrice: number;
  isCartOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { currency } = useCurrency();
  const [items, setItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Load cart from localStorage on mount
  useEffect(() => {
    const savedCart = localStorage.getItem("cart");
    if (savedCart) {
      try {
        setItems(JSON.parse(savedCart));
      } catch (error) {
        console.error("Error loading cart:", error);
      }
    }
  }, []);

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem("cart", JSON.stringify(items));
  }, [items]);

  const addToCart = (product: Product, quantity: number, size?: string, color?: string) => {
    setItems((currentItems) => {
      // Check if item already exists with same product, size, and color
      const existingIndex = currentItems.findIndex(
        (item) =>
          item.product.id === product.id &&
          item.size === size &&
          item.color === color
      );

      const preorderCap = 10;

      if (existingIndex > -1) {
        // Update quantity of existing item
        const newItems = [...currentItems];
        const existingItem = newItems[existingIndex];
        const maxQuantity = product.comingSoon
          ? preorderCap
          : Math.max(product.stock, 0);
        if (!product.comingSoon && maxQuantity === 0) {
          return currentItems;
        }
        const newQuantity =
          maxQuantity > 0
            ? Math.min(existingItem.quantity + quantity, maxQuantity)
            : existingItem.quantity + quantity;
        newItems[existingIndex] = {
          ...existingItem,
          quantity: newQuantity,
        };
        return newItems;
      } else {
        // Add new item
        const maxQuantity = product.comingSoon
          ? preorderCap
          : Math.max(product.stock, 0);
        if (!product.comingSoon && maxQuantity === 0) {
          return currentItems;
        }
        const initialQuantity =
          maxQuantity > 0 ? Math.min(quantity, maxQuantity) : quantity;
        return [...currentItems, { product, quantity: initialQuantity, size, color }];
      }
    });
  };

  const removeFromCart = (productId: string, size?: string, color?: string) => {
    setItems((currentItems) =>
      currentItems.filter(
        (item) =>
          !(
            item.product.id === productId &&
            item.size === size &&
            item.color === color
          )
      )
    );
  };

  const updateQuantity = (productId: string, quantity: number, size?: string, color?: string) => {
    if (quantity <= 0) {
      removeFromCart(productId, size, color);
      return;
    }

    setItems((currentItems) =>
      currentItems.map((item) => {
        if (
          item.product.id === productId &&
          item.size === size &&
          item.color === color
        ) {
          const maxQuantity = item.product.comingSoon
            ? 10
            : Math.max(item.product.stock, 0);
          const clampedQuantity =
            maxQuantity > 0 ? Math.min(quantity, maxQuantity) : quantity;

          return {
            ...item,
            quantity: clampedQuantity,
          };
        }

        return item;
      })
    );
  };

  const clearCart = () => {
    setItems([]);
  };

  const openCart = () => setIsCartOpen(true);
  const closeCart = () => setIsCartOpen(false);

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = items.reduce((sum, item) => {
    const unitPrice = getProductPriceInBaseCurrency(item.product, currency);
    return sum + unitPrice * item.quantity;
  }, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        totalItems,
        totalPrice,
        isCartOpen,
        openCart,
        closeCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
