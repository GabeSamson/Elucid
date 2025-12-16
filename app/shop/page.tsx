"use client";

import { motion } from "framer-motion";
import { useEffect, useState, Suspense } from "react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import ProductCard from "@/components/ProductCard";
import { Product, Collection } from "@/types/product.types";

export default function ShopPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState("createdAt-desc");
  const [collections, setCollections] = useState<Collection[]>([]);
  const [activeCollection, setActiveCollection] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    fetchProducts();
  }, [sortBy, debouncedSearch, activeCollection]);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm.trim());
    }, 300);

    return () => clearTimeout(handler);
  }, [searchTerm]);

  useEffect(() => {
    const fetchCollections = async () => {
      try {
        const res = await fetch('/api/collections');
        if (!res.ok) return;
        const data = await res.json();
        setCollections(data.collections || []);
      } catch (error) {
        console.error('Error fetching collections:', error);
      }
    };

    fetchCollections();
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const [sort, order] = sortBy.split('-');
      const params = new URLSearchParams({
        sort,
        order,
      });

      if (activeCollection) {
        params.set('collection', activeCollection);
      }

      if (debouncedSearch) {
        params.set('search', debouncedSearch);
      }

      const res = await fetch(`/api/products?${params.toString()}`);
      const data = await res.json();

      if (res.ok) {
        setProducts(data.products || []);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const activeCollectionName =
    activeCollection === ""
      ? "All"
      : collections.find((collection) => collection.id === activeCollection)?.name ?? "All";

  const activeCollectionSubtitle =
    activeCollection === ""
      ? "Browse the full range — new arrivals, essentials, and limited drops crafted in London."
      : collections.find((collection) => collection.id === activeCollection)?.description?.trim() ||
        `Shop ${activeCollectionName} — curated pieces, available while they last.`;

  return (
    <main className="min-h-screen bg-cream">
      <Suspense fallback={<div className="h-20" />}>
        <Navigation />
      </Suspense>

      <div className="pt-32 pb-20 px-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="mb-16 text-center md:text-left"
          >
            <h1 className="font-serif text-5xl md:text-7xl text-charcoal-dark mb-4">
              {`Shop ${activeCollectionName}`}
            </h1>
            <p className="text-charcoal-light text-lg max-w-2xl">
              {activeCollectionSubtitle}
            </p>
          </motion.div>

          {/* Filters */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mb-12 space-y-4"
          >
            {/* Search Bar */}
            <div className="relative max-w-md">
              <input
                type="text"
                placeholder="Search products..."
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className="input-modern pr-16"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute inset-y-0 right-3 flex items-center text-sm text-charcoal/60 hover:text-charcoal transition-colors"
                >
                  Clear
                </button>
              )}
            </div>

            <div className="flex items-center justify-between flex-wrap gap-4">
              {/* Filter Buttons */}
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => setActiveCollection("")}
                  className={`px-4 py-2 text-sm uppercase tracking-wider transition-colors ${
                    activeCollection === ""
                      ? "bg-charcoal-dark text-cream-light"
                      : "border border-charcoal/20 text-charcoal hover:border-charcoal"
                  }`}
                >
                  All
                </button>
                {collections.map((collection) => {
                  const isActive = activeCollection === collection.id;
                  return (
                    <button
                      key={collection.id}
                      type="button"
                      onClick={() =>
                        setActiveCollection(isActive ? "" : collection.id)
                      }
                      className={`px-4 py-2 text-sm uppercase tracking-wider transition-colors ${
                        isActive
                          ? "bg-charcoal text-cream-light"
                          : "border border-charcoal/20 text-charcoal hover:border-charcoal"
                      }`}
                    >
                      {collection.name}
                    </button>
                  );
                })}
              </div>

              {/* Sort */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="select-modern text-sm uppercase tracking-wider"
              >
                <option value="createdAt-desc">Newest First</option>
                <option value="createdAt-asc">Oldest First</option>
                <option value="price-asc">Price: Low to High</option>
                <option value="price-desc">Price: High to Low</option>
                <option value="name-asc">Name: A to Z</option>
                <option value="name-desc">Name: Z to A</option>
              </select>
            </div>
          </motion.div>

          {/* Products Grid */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-charcoal/60 text-lg uppercase tracking-wider">
                Loading...
              </div>
            </div>
          ) : products.length === 0 ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <p className="text-charcoal/60 text-lg uppercase tracking-wider mb-2">
                  No products found
                </p>
                <p className="text-charcoal/40 text-sm">
                  Try adjusting your filters
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-md md:max-w-none mx-auto">
              {products.map((product, index) => (
                <ProductCard key={product.id} product={product} index={index} />
              ))}
            </div>
          )}
        </div>
      </div>

      <Footer />
    </main>
  );
}
