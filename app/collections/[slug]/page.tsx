"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import ProductCard from "@/components/ProductCard";
import { Collection, Product } from "@/types/product.types";

export default function CollectionPage() {
  const params = useParams();
  const slug = params.slug as string;
  const [collection, setCollection] = useState<Collection & { products?: Product[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetchCollection();
  }, [slug]);

  const fetchCollection = async () => {
    try {
      const res = await fetch(`/api/collections/${slug}`);
      const data = await res.json();

      if (res.ok) {
        setCollection(data.collection);
      } else {
        setError(true);
      }
    } catch (error) {
      console.error('Error fetching collection:', error);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-cream flex items-center justify-center">
        <div className="text-charcoal/60 text-lg uppercase tracking-wider">
          Loading...
        </div>
      </main>
    );
  }

  if (error || !collection) {
    return (
      <main className="min-h-screen bg-cream">
        <Navigation />
        <div className="pt-32 pb-20 px-6 flex items-center justify-center">
          <div className="text-center">
            <h1 className="font-serif text-4xl text-charcoal-dark mb-4">
              Collection Not Found
            </h1>
            <p className="text-charcoal-light mb-8">
              The collection you're looking for doesn't exist
            </p>
            <a
              href="/collections"
              className="px-8 py-3 bg-charcoal-dark text-cream-light hover:bg-charcoal transition-colors duration-300 tracking-wider text-sm uppercase inline-block"
            >
              View All Collections
            </a>
          </div>
        </div>
        <Footer />
      </main>
    );
  }

  const products = collection.products || [];

  return (
    <main className="min-h-screen bg-cream">
      <Navigation />

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
              {collection.name}
            </h1>
            {collection.description && (
              <p className="text-charcoal-light text-lg max-w-2xl">
                {collection.description}
              </p>
            )}
          </motion.div>

          {/* Products Grid */}
          {products.length === 0 ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <p className="text-charcoal/60 text-lg uppercase tracking-wider mb-2">
                  No products in this collection yet
                </p>
                <p className="text-charcoal/40 text-sm mb-8">
                  Check back soon for new arrivals
                </p>
                <a
                  href="/shop"
                  className="px-8 py-3 bg-charcoal-dark text-cream-light hover:bg-charcoal transition-colors duration-300 tracking-wider text-sm uppercase inline-block"
                >
                  Shop All Products
                </a>
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
