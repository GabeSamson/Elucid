"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Product } from "@/types/product.types";
import { useCurrencyFormat } from "@/hooks/useCurrencyFormat";
import { trackSearch } from "@/lib/analytics";

interface SearchBarProps {
  variant?: "dark" | "light";
  onClose?: () => void;
}

export default function SearchBar({ variant = "light", onClose }: SearchBarProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [results, setResults] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { formatCurrency } = useCurrencyFormat();

  const isDark = variant === "dark";
  const inputClasses = `w-full px-4 py-2 text-sm border transition-colors ${
    isDark
      ? "bg-charcoal-dark/50 border-cream-light/20 text-cream-light placeholder:text-cream-light/40 focus:border-cream-light/60"
      : "bg-white/50 border-charcoal/20 text-charcoal placeholder:text-charcoal/40 focus:border-charcoal/60"
  } focus:outline-none`;

  useEffect(() => {
    const handler = setTimeout(() => {
      if (searchTerm.trim().length >= 2) {
        performSearch(searchTerm.trim());
      } else {
        setResults([]);
        setShowResults(false);
      }
    }, 300);

    return () => clearTimeout(handler);
  }, [searchTerm]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const performSearch = async (query: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}&limit=5`);
      const data = await res.json();

      if (res.ok) {
        setResults(data.products || []);
        setShowResults(true);

        // Track search in GA4
        trackSearch(query);
      }
    } catch (error) {
      console.error("Error searching:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleResultClick = () => {
    setShowResults(false);
    setSearchTerm("");
    onClose?.();
  };

  const handleViewAll = () => {
    router.push(`/shop?search=${encodeURIComponent(searchTerm)}`);
    setShowResults(false);
    setSearchTerm("");
    onClose?.();
  };

  return (
    <div ref={searchRef} className="relative w-full">
      <div className="relative">
        <input
          type="text"
          placeholder="Search products..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className={inputClasses}
        />
        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className={`w-4 h-4 border-2 border-t-transparent rounded-full animate-spin ${
              isDark ? "border-cream-light" : "border-charcoal"
            }`} />
          </div>
        )}
      </div>

      {/* Search Results Dropdown */}
      {showResults && results.length > 0 && (
        <div
          className={`absolute top-full left-0 right-0 mt-2 border shadow-lg overflow-hidden z-50 ${
            isDark
              ? "bg-charcoal-dark border-cream-light/20"
              : "bg-white border-charcoal/10"
          }`}
        >
          <div className="max-h-96 overflow-y-auto">
            {results.map((product) => {
              const firstImage = product.images && (product.images as string[]).length > 0
                ? (product.images as string[])[0]
                : null;

              return (
                <Link
                  key={product.id}
                  href={`/products/${product.id}`}
                  onClick={handleResultClick}
                  className={`flex items-center gap-4 p-3 transition-colors ${
                    isDark
                      ? "hover:bg-cream-light/10"
                      : "hover:bg-charcoal/5"
                  }`}
                >
                  {firstImage && (
                    <img
                      src={firstImage}
                      alt={product.name}
                      className="w-12 h-12 object-cover"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className={`font-medium truncate ${
                      isDark ? "text-cream-light" : "text-charcoal-dark"
                    }`}>
                      {product.name}
                    </p>
                    <p className={`text-sm ${
                      isDark ? "text-cream-light/60" : "text-charcoal/60"
                    }`}>
                      {formatCurrency(product.price)}
                    </p>
                  </div>
                  {product.stock === 0 && (
                    <span className="text-xs px-2 py-1 bg-red-100 text-red-600 rounded">
                      Out of stock
                    </span>
                  )}
                </Link>
              );
            })}
          </div>

          {/* View All Results Button */}
          <button
            onClick={handleViewAll}
            className={`w-full p-3 text-sm text-center border-t transition-colors ${
              isDark
                ? "border-cream-light/20 text-cream-light hover:bg-cream-light/10"
                : "border-charcoal/10 text-charcoal hover:bg-charcoal/5"
            }`}
          >
            View all results for "{searchTerm}"
          </button>
        </div>
      )}

      {/* No Results */}
      {showResults && !loading && results.length === 0 && searchTerm.trim().length >= 2 && (
        <div
          className={`absolute top-full left-0 right-0 mt-2 p-4 border text-center text-sm ${
            isDark
              ? "bg-charcoal-dark border-cream-light/20 text-cream-light/60"
              : "bg-white border-charcoal/10 text-charcoal/60"
          }`}
        >
          No products found for "{searchTerm}"
        </div>
      )}
    </div>
  );
}
