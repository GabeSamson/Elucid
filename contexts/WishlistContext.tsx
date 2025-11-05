"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useSession } from "next-auth/react";

interface WishlistProduct {
  id: string;
  name: string;
  price: number;
  compareAtPrice?: number | null;
  images: string | string[];
  stock: number;
  isActive: boolean;
}

interface WishlistItem {
  id: string;
  productId: string;
  product: WishlistProduct;
  createdAt: string;
}

interface WishlistContextType {
  wishlist: WishlistItem[];
  isInWishlist: (productId: string) => boolean;
  addToWishlist: (productId: string) => Promise<void>;
  removeFromWishlist: (productId: string) => Promise<void>;
  loading: boolean;
  refreshWishlist: () => Promise<void>;
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

export function WishlistProvider({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch wishlist when user logs in
  useEffect(() => {
    if (status === "authenticated") {
      fetchWishlist();
    } else {
      setWishlist([]);
    }
  }, [status]);

  const fetchWishlist = async () => {
    try {
      const res = await fetch('/api/wishlist');
      const data = await res.json();
      if (res.ok) {
        setWishlist(data.wishlist || []);
      }
    } catch (error) {
      console.error('Error fetching wishlist:', error);
    }
  };

  const refreshWishlist = async () => {
    if (status === "authenticated") {
      await fetchWishlist();
    }
  };

  const isInWishlist = (productId: string): boolean => {
    return wishlist.some(item => item.productId === productId);
  };

  const addToWishlist = async (productId: string) => {
    if (status !== "authenticated") {
      alert('Please sign in to add items to your wishlist');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/wishlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId }),
      });

      if (res.ok) {
        await fetchWishlist();
      } else {
        const data = await res.json();
        console.error('Error adding to wishlist:', data.error);
      }
    } catch (error) {
      console.error('Error adding to wishlist:', error);
    } finally {
      setLoading(false);
    }
  };

  const removeFromWishlist = async (productId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/wishlist?productId=${productId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setWishlist(prev => prev.filter(item => item.productId !== productId));
      }
    } catch (error) {
      console.error('Error removing from wishlist:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <WishlistContext.Provider
      value={{
        wishlist,
        isInWishlist,
        addToWishlist,
        removeFromWishlist,
        loading,
        refreshWishlist,
      }}
    >
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const context = useContext(WishlistContext);
  if (context === undefined) {
    throw new Error("useWishlist must be used within a WishlistProvider");
  }
  return context;
}
