"use client";

import { motion } from "framer-motion";
import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Collection } from "@/types/product.types";

export default function CollectionsPage() {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCollections();
  }, []);

  const fetchCollections = async () => {
    try {
      const res = await fetch('/api/collections');
      const data = await res.json();
      if (res.ok) {
        setCollections(data.collections || []);
      }
    } catch (error) {
      console.error('Error fetching collections:', error);
    } finally {
      setLoading(false);
    }
  };

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
              Collections
            </h1>
            <p className="text-charcoal-light text-lg max-w-2xl">
              Subtitle here
            </p>
          </motion.div>

          {/* Collections Grid */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-charcoal/60 text-lg uppercase tracking-wider">
                Loading...
              </div>
            </div>
          ) : collections.length === 0 ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <p className="text-charcoal/60 text-lg uppercase tracking-wider mb-2">
                  No collections found
                </p>
                <p className="text-charcoal/40 text-sm">
                  Check back soon for new collections
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-md md:max-w-none mx-auto">
              {collections.map((collection, index) => (
                <motion.div
                  key={collection.id}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  className="group cursor-pointer"
                >
                  <Link href={`/collections/${collection.slug}`}>
                    {/* Collection Image */}
                    <div className="relative aspect-[4/5] bg-cream-dark film-grain mb-6 overflow-hidden">
                      {collection.imageUrl && (
                        <img
                          src={collection.imageUrl}
                          alt={collection.name}
                          className="absolute inset-0 w-full h-full object-cover"
                        />
                      )}
                      <div className="absolute inset-0 bg-charcoal-dark opacity-0 group-hover:opacity-10 transition-opacity duration-500" />
                    </div>

                    {/* Collection Info */}
                    <div className="space-y-2">
                      <h3 className="font-serif text-2xl text-charcoal-dark">
                        {collection.name}
                      </h3>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>

      <Footer />
    </main>
  );
}
