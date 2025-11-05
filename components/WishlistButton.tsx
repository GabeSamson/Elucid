"use client";

import { useState } from "react";
import { useWishlist } from "@/contexts/WishlistContext";

interface WishlistButtonProps {
  productId: string;
  variant?: "icon" | "button";
  size?: "sm" | "md" | "lg";
  className?: string;
}

export default function WishlistButton({
  productId,
  variant = "icon",
  size = "md",
  className = "",
}: WishlistButtonProps) {
  const { isInWishlist, addToWishlist, removeFromWishlist, loading } = useWishlist();
  const [isAnimating, setIsAnimating] = useState(false);

  const inWishlist = isInWishlist(productId);

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (loading) return;

    setIsAnimating(true);
    setTimeout(() => setIsAnimating(false), 600);

    if (inWishlist) {
      await removeFromWishlist(productId);
    } else {
      await addToWishlist(productId);
    }
  };

  const sizeClasses = {
    sm: "w-6 h-6",
    md: "w-8 h-8",
    lg: "w-10 h-10",
  };

  if (variant === "icon") {
    return (
      <button
        onClick={handleClick}
        disabled={loading}
        className={`${sizeClasses[size]} flex items-center justify-center transition-transform ${
          isAnimating ? "scale-125" : ""
        } ${className}`}
        aria-label={inWishlist ? "Remove from wishlist" : "Add to wishlist"}
        title={inWishlist ? "Remove from wishlist" : "Add to wishlist"}
      >
        <svg
          className={`w-full h-full transition-colors ${
            inWishlist
              ? "fill-red-500 stroke-red-500"
              : "fill-none stroke-current"
          }`}
          strokeWidth="2"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
          />
        </svg>
      </button>
    );
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className={`flex items-center gap-2 px-4 py-2 border transition-colors ${
        inWishlist
          ? "bg-red-50 border-red-300 text-red-700 hover:bg-red-100"
          : "bg-white border-charcoal/20 text-charcoal hover:border-charcoal"
      } ${loading ? "opacity-50 cursor-not-allowed" : ""} ${className}`}
    >
      <svg
        className={`w-5 h-5 transition-colors ${
          inWishlist ? "fill-red-500 stroke-red-500" : "fill-none stroke-current"
        }`}
        strokeWidth="2"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
        />
      </svg>
      <span className="text-sm uppercase tracking-wider">
        {inWishlist ? "In Wishlist" : "Add to Wishlist"}
      </span>
    </button>
  );
}
