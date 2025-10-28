"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Product } from "@/types/product.types";
import { useCurrencyFormat } from "@/hooks/useCurrencyFormat";

interface ProductCardProps {
  product: Product;
  index?: number;
}

export default function ProductCard({ product, index = 0 }: ProductCardProps) {
  const { formatCurrency } = useCurrencyFormat();
  const hasDiscount = product.compareAtPrice && product.compareAtPrice > product.price;
  const isComingSoon = product.comingSoon;
  const releaseDate = product.releaseDate ? new Date(product.releaseDate) : null;
  const releaseLabel = releaseDate
    ? releaseDate.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, delay: index * 0.1 }}
      className="group cursor-pointer h-full"
    >
      <Link
        href={`/products/${product.id}`}
        className="flex h-full flex-col"
      >
        {/* Product Image */}
        <div className="relative aspect-square md:aspect-[3/4] max-h-[400px] md:max-h-none bg-cream-dark film-grain overflow-hidden">
          {product.images && product.images.length > 0 && (
            <img
              src={product.images[0]}
              alt={product.name}
              className="absolute inset-0 h-full w-full object-cover"
            />
          )}
          <div className="absolute inset-0 bg-charcoal-dark opacity-0 transition-opacity duration-500 group-hover:opacity-10" />

          {/* Status Overlay */}
          {isComingSoon && (
            <div className="absolute inset-0 flex items-center justify-center bg-charcoal-dark/70">
              <span className="text-lg uppercase tracking-wider text-cream-light">
                Pre-order
              </span>
            </div>
          )}
          {!isComingSoon && product.stock === 0 && (
            <div className="absolute inset-0 flex items-center justify-center bg-charcoal-dark/80">
              <span className="text-lg uppercase tracking-wider text-cream-light">
                Out of Stock
              </span>
            </div>
          )}
        </div>

        {/* Product Info */}
        <div className="mt-4 flex min-h-[118px] flex-col gap-2 md:mt-6">
          <div className="flex items-center justify-between">
            <h3 className="font-serif text-lg md:text-2xl text-charcoal-dark">
              {product.name}
            </h3>
            {isComingSoon ? (
              <span className="text-xs uppercase tracking-wider text-charcoal/60">
                Coming Soon
              </span>
            ) : (
              product.stock <= 5 && product.stock > 0 && (
              <span className="text-xs uppercase tracking-wider text-charcoal/60">
                Low Stock
              </span>
              )
            )}
          </div>

          <div className="flex items-center gap-3">
            <p className="text-charcoal-dark font-medium text-sm md:text-base">
              {formatCurrency(product.price)}
            </p>
            {hasDiscount && product.compareAtPrice !== undefined && product.compareAtPrice !== null && (
              <p className="text-charcoal-light line-through text-xs md:text-sm">
                {formatCurrency(product.compareAtPrice)}
              </p>
            )}
          </div>

          <div className="space-y-1">
            {product.collection && (
              <p className="text-charcoal-light text-xs md:text-sm uppercase tracking-wider">
                {product.collection.name}
              </p>
            )}
            {isComingSoon && (
              <p className="text-xs uppercase tracking-wider text-charcoal/50">
                {releaseLabel ? `Ships ${releaseLabel}` : 'Pre-order now'}
              </p>
            )}
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
