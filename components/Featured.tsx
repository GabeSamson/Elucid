"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import ProductCard from "./ProductCard";
import { Product } from "@/types/product.types";

interface HomepageConfig {
  featuredTitle?: string | null;
  featuredSubtitle?: string | null;
  featuredDescription?: string | null;
}

export default function Featured() {
  const [products, setProducts] = useState<Product[]>([]);
  const [config, setConfig] = useState<HomepageConfig>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [productsRes, configRes] = await Promise.all([
        fetch('/api/products?featured=true&limit=3'),
        fetch('/api/homepage-config')
      ]);

      const [productsData, configData] = await Promise.all([
        productsRes.json(),
        configRes.json()
      ]);

      if (productsRes.ok) {
        setProducts(productsData.products || []);
      }

      if (configRes.ok) {
        setConfig(configData);
      }
    } catch (error) {
      console.error('Error fetching featured data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <section className="py-32 px-6 bg-cream">
        <div className="max-w-7xl mx-auto flex items-center justify-center">
          <div className="text-charcoal/60 text-lg uppercase tracking-wider">
            Loading...
          </div>
        </div>
      </section>
    );
  }

  if (products.length === 0) {
    return null;
  }

  return (
    <section className="py-32 px-6 bg-cream">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="mb-20 text-center md:text-left space-y-4"
        >
          <h2 className="font-serif text-5xl md:text-7xl text-charcoal-dark">
            {config.featuredTitle || "Featured"}
          </h2>
          {config.featuredSubtitle && (
            <p className="text-xl md:text-2xl text-charcoal/80">
              {config.featuredSubtitle}
            </p>
          )}
          {config.featuredDescription && (
            <p className="text-base md:text-lg text-charcoal/60 max-w-3xl">
              {config.featuredDescription}
            </p>
          )}
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-md md:max-w-none mx-auto">
          {products.map((product, index) => (
            <ProductCard key={product.id} product={product} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
}
