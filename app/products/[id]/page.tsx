"use client";

import { motion } from "framer-motion";
import { useEffect, useState, useMemo, Suspense } from "react";
import { useParams } from "next/navigation";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { useCart } from "@/contexts/CartContext";
import { Product } from "@/types/product.types";
import ColorSelector from "@/components/ColorSelector";
import { formatCurrency, getFreeShippingThreshold } from "@/lib/currency";

export default function ProductPage() {
  const params = useParams();
  const id = params.id as string;
  const { addToCart, openCart } = useCart();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [selectedSize, setSelectedSize] = useState("");
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    fetchProduct();
  }, [id]);

  const fetchProduct = async () => {
    try {
      const res = await fetch(`/api/products/${id}`);
      const data = await res.json();

      if (res.ok) {
        setProduct(data.product);
        // Set default selections
        if (data.product.sizes && data.product.sizes.length > 0) {
          setSelectedSize(data.product.sizes[0]);
        }
        if (data.product.colors && data.product.colors.length > 0) {
          setSelectedColor(data.product.colors[0].name);
        }
      } else {
        setError(true);
      }
    } catch (error) {
      console.error('Error fetching product:', error);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  const displayImages = useMemo(() => {
    if (!product) return [];
    if (
      selectedColor &&
      product.colorImages &&
      product.colorImages[selectedColor] &&
      product.colorImages[selectedColor].length > 0
    ) {
      return product.colorImages[selectedColor];
    }
    return product?.images || [];
  }, [product, selectedColor]);

  useEffect(() => {
    setSelectedImage(0);
  }, [selectedColor, product?.id]);

  useEffect(() => {
    if (selectedImage >= displayImages.length) {
      setSelectedImage(0);
    }
  }, [displayImages.length, selectedImage]);

  // Calculate current variant stock
  const currentVariant = useMemo(() => {
    if (!product?.variants || !selectedSize || !selectedColor) return null;
    return product.variants.find(
      (v) => v.size === selectedSize && v.color === selectedColor
    );
  }, [product, selectedSize, selectedColor]);

  const currentStock = currentVariant ? currentVariant.stock : product?.stock || 0;

  // Get available colors for selected size
  const availableColors = useMemo(() => {
    if (!product?.variants || !selectedSize) return product?.colors.map((c) => c.name) || [];
    const colorsWithStock = product.variants
      .filter((v) => v.size === selectedSize && v.stock > 0)
      .map((v) => v.color);
    return colorsWithStock;
  }, [product, selectedSize]);

  // Get available sizes for selected color
  const availableSizes = useMemo(() => {
    if (!product?.variants || !selectedColor) return product?.sizes || [];
    const sizesWithStock = product.variants
      .filter((v) => v.color === selectedColor && v.stock > 0)
      .map((v) => v.size);
    return sizesWithStock;
  }, [product, selectedColor]);

  const handleAddToCart = () => {
    if (!product) return;

    addToCart(
      product,
      quantity,
      product.sizes && product.sizes.length > 0 ? selectedSize : undefined,
      product.colors && product.colors.length > 0 ? selectedColor || undefined : undefined
    );

    openCart();
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

  if (error || !product) {
    return (
      <main className="min-h-screen bg-cream">
        <Suspense fallback={<div className="h-20" />}>
          <Navigation />
        </Suspense>
        <div className="pt-32 pb-20 px-6 flex items-center justify-center">
          <div className="text-center">
            <h1 className="font-serif text-4xl text-charcoal-dark mb-4">
              Product Not Found
            </h1>
            <p className="text-charcoal-light mb-8">
              The product you're looking for doesn't exist
            </p>
            <a
              href="/shop"
              className="px-8 py-3 bg-charcoal-dark text-cream-light hover:bg-charcoal transition-colors duration-300 tracking-wider text-sm uppercase inline-block"
            >
              Shop All Products
            </a>
          </div>
        </div>
        <Footer />
      </main>
    );
  }

  const hasDiscount = product.compareAtPrice && product.compareAtPrice > product.price;
const discountPercent = hasDiscount
  ? Math.round(((product.compareAtPrice! - product.price) / product.compareAtPrice!) * 100)
  : 0;
  const freeShippingThreshold = getFreeShippingThreshold();

  return (
    <main className="min-h-screen bg-cream">
      <Suspense fallback={<div className="h-20" />}>
        <Navigation />
      </Suspense>

      <div className="pt-32 pb-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20">
            {/* Images */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
            >
              {/* Main Image */}
              <div className="relative aspect-[3/4] bg-cream-dark film-grain mb-4 overflow-hidden">
                {displayImages.length > 0 && (
                  <img
                    src={displayImages[selectedImage]}
                    alt={product.name}
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                )}
              </div>

              {/* Thumbnail Images */}
              {displayImages.length > 1 && (
                <div className="grid grid-cols-4 gap-4">
                  {displayImages.map((image, index) => (
                    <button
                      key={index}
                      onClick={() => setSelectedImage(index)}
                      className={`relative aspect-square bg-cream-dark film-grain overflow-hidden border-2 transition-colors ${
                        selectedImage === index ? "border-charcoal-dark" : "border-transparent"
                      }`}
                    >
                      <img
                        src={image}
                        alt={`${product.name} view ${index + 1}`}
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </motion.div>

            {/* Product Info */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              className="flex flex-col"
            >
              {/* Collection Tag */}
              {product.collection && (
                <div className="mb-4">
                  <a
                    href={`/collections/${product.collection.slug}`}
                    className="text-sm uppercase tracking-wider text-charcoal-light hover:text-charcoal transition-colors"
                  >
                    {product.collection.name}
                  </a>
                </div>
              )}

              {/* Product Name */}
              <h1 className="font-serif text-4xl md:text-5xl text-charcoal-dark mb-6">
                {product.name}
              </h1>

              {/* Price */}
              <div className="mb-8">
                <div className="flex items-center gap-4 mb-2">
                  <p className="text-3xl text-charcoal-dark font-medium">
                    {formatCurrency(product.price)}
                  </p>
                  {hasDiscount && product.compareAtPrice !== undefined && product.compareAtPrice !== null && (
                    <>
                      <p className="text-xl text-charcoal-light line-through">
                        {formatCurrency(product.compareAtPrice)}
                      </p>
                      <span className="px-3 py-1 bg-charcoal-dark text-cream-light text-sm uppercase tracking-wider">
                        {discountPercent}% Off
                      </span>
                    </>
                  )}
                </div>
                {currentStock <= 5 && currentStock > 0 && (
                  <p className="text-sm text-charcoal-light">
                    Only {currentStock} left in stock
                  </p>
                )}
              </div>

              {/* Description */}
              <div className="mb-8">
                <p className="text-charcoal-light leading-relaxed">
                  {product.description}
                </p>
              </div>

              {/* Size Selection */}
              {product.sizes && product.sizes.length > 0 && (
                <div className="mb-6">
                  <label className="block text-sm uppercase tracking-wider text-charcoal mb-3">
                    Size
                  </label>
                  <div className="flex flex-wrap gap-3">
                    {product.sizes.map((size) => {
                      const isAvailable = availableSizes.includes(size);
                      return (
                        <button
                          key={size}
                          onClick={() => isAvailable && setSelectedSize(size)}
                          disabled={!isAvailable}
                          className={`px-6 py-3 text-sm uppercase tracking-wider transition-colors ${
                            selectedSize === size
                              ? "bg-charcoal-dark text-cream-light"
                              : isAvailable
                              ? "border border-charcoal/20 text-charcoal hover:border-charcoal"
                              : "border border-charcoal/10 text-charcoal/30 cursor-not-allowed"
                          }`}
                        >
                          {size}
                          {!isAvailable && <span className="ml-1 text-xs">(Out)</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Color Selection */}
              {product.colors && product.colors.length > 0 && (
                <div className="mb-8">
                  <ColorSelector
                    colors={product.colors}
                    selectedColor={selectedColor}
                    onColorSelect={setSelectedColor}
                    availableColors={availableColors}
                  />
                </div>
              )}

              {/* Quantity */}
              <div className="mb-8">
                <label className="block text-sm uppercase tracking-wider text-charcoal mb-3">
                  Quantity
                </label>
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-12 h-12 border border-charcoal/20 hover:border-charcoal transition-colors flex items-center justify-center"
                  >
                    -
                  </button>
                  <span className="text-lg font-medium w-12 text-center">
                    {quantity}
                  </span>
                  <button
                    onClick={() => setQuantity(Math.min(currentStock, quantity + 1))}
                    disabled={quantity >= currentStock}
                    className="w-12 h-12 border border-charcoal/20 hover:border-charcoal transition-colors flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Add to Cart */}
              <button
                onClick={handleAddToCart}
                disabled={currentStock === 0}
                className="w-full py-4 bg-charcoal-dark text-cream-light hover:bg-charcoal transition-colors duration-300 tracking-wider text-sm uppercase disabled:opacity-50 disabled:cursor-not-allowed mb-4"
              >
                {currentStock === 0 ? 'Out of Stock' : 'Add to Cart'}
              </button>

              {/* Additional Info */}
              <div className="mt-8 pt-8 border-t border-charcoal/10 space-y-4 text-sm text-charcoal-light">
                <p>
                  Free shipping on orders over {formatCurrency(freeShippingThreshold, { convert: true })}
                </p>
                <p>Returns accepted within 30 days</p>
                <p>Authenticity guaranteed</p>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      <Footer />
    </main>
  );
}
