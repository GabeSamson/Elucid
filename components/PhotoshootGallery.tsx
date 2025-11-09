"use client";

import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { useState, useEffect } from "react";

interface PhotoshootImage {
  id: string;
  imageUrl: string;
  title: string | null;
}

interface PhotoshootGalleryProps {
  images: PhotoshootImage[];
  enableSlideshow?: boolean;
  title?: string | null;
  subtitle?: string | null;
  showImageTitles?: boolean;
}

export default function PhotoshootGallery({
  images,
  enableSlideshow = false,
  title = null,
  subtitle = null,
  showImageTitles = false,
}: PhotoshootGalleryProps) {
  const [selectedImage, setSelectedImage] = useState<PhotoshootImage | null>(null);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);

  useEffect(() => {
    if (!enableSlideshow || images.length === 0) return;

    const interval = setInterval(() => {
      setCurrentSlideIndex((prev) => (prev + 1) % images.length);
    }, 5000); // Change slide every 5 seconds

    return () => clearInterval(interval);
  }, [enableSlideshow, images.length]);

  if (!images || images.length === 0) {
    return null;
  }

  // Determine grid classes based on number of images
  const getGridClasses = () => {
    const count = images.length;
    if (count === 1) return "grid grid-cols-1 max-w-md mx-auto";
    if (count === 2) return "grid grid-cols-2 max-w-2xl mx-auto gap-4";
    if (count === 3) return "grid grid-cols-3 max-w-4xl mx-auto gap-4";
    return "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4";
  };

  if (enableSlideshow) {
    return (
      <section className="py-20 px-6 bg-charcoal-dark">
        <div className="max-w-7xl mx-auto">
          {(title || subtitle) && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="text-center mb-12"
            >
              {title && (
                <h2 className="font-serif text-4xl md:text-6xl text-cream mb-4">
                  {title}
                </h2>
              )}
              {subtitle && (
                <p className="text-cream-light text-lg">
                  {subtitle}
                </p>
              )}
            </motion.div>
          )}

          {/* Slideshow */}
          <div className="relative max-w-5xl mx-auto aspect-[16/10] overflow-hidden rounded-lg">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentSlideIndex}
                initial={{ opacity: 0, x: 100 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -100 }}
                transition={{ duration: 0.5 }}
                className="absolute inset-0"
              >
                <Image
                  src={images[currentSlideIndex].imageUrl}
                  alt={images[currentSlideIndex].title || `Gallery image ${currentSlideIndex + 1}`}
                  fill
                  className="object-cover"
                  sizes="(max-width: 1280px) 100vw, 1280px"
                  priority={currentSlideIndex === 0}
                />
                {showImageTitles && images[currentSlideIndex].title && (
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6">
                    <p className="text-cream text-xl font-medium">
                      {images[currentSlideIndex].title}
                    </p>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>

            {/* Navigation dots */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
              {images.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentSlideIndex(index)}
                  className={`w-2 h-2 rounded-full transition-all ${
                    index === currentSlideIndex
                      ? 'bg-cream w-8'
                      : 'bg-cream/50 hover:bg-cream/75'
                  }`}
                  aria-label={`Go to slide ${index + 1}`}
                />
              ))}
            </div>

            {/* Previous/Next buttons */}
            <button
              onClick={() => setCurrentSlideIndex((prev) => (prev - 1 + images.length) % images.length)}
              className="absolute left-4 top-1/2 -translate-y-1/2 bg-charcoal/50 hover:bg-charcoal/75 text-cream p-3 rounded-full transition-colors z-10"
              aria-label="Previous slide"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={() => setCurrentSlideIndex((prev) => (prev + 1) % images.length)}
              className="absolute right-4 top-1/2 -translate-y-1/2 bg-charcoal/50 hover:bg-charcoal/75 text-cream p-3 rounded-full transition-colors z-10"
              aria-label="Next slide"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-20 px-6 bg-charcoal-dark">
      <div className="max-w-7xl mx-auto">
        {(title || subtitle) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-center mb-12"
          >
            {title && (
              <h2 className="font-serif text-4xl md:text-6xl text-cream mb-4">
                {title}
              </h2>
            )}
            {subtitle && (
              <p className="text-cream-light text-lg">
                {subtitle}
              </p>
            )}
          </motion.div>
        )}

        <div className={getGridClasses()}>
          {images.map((image, index) => (
            <motion.div
              key={image.id}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="aspect-square relative overflow-hidden cursor-pointer group rounded-lg"
              onClick={() => setSelectedImage(image)}
            >
              <Image
                src={image.imageUrl}
                alt={image.title || `Gallery image ${index + 1}`}
                fill
                className="object-cover group-hover:scale-110 transition-transform duration-500"
                sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300" />
              {showImageTitles && image.title && (
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                  <p className="text-cream text-sm font-medium truncate">{image.title}</p>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </div>

      {/* Lightbox Modal */}
      {selectedImage && (
        <div
          className="fixed inset-0 bg-charcoal-dark/90 z-50 flex items-center justify-center p-6"
          onClick={() => setSelectedImage(null)}
        >
          <button
            className="absolute top-6 right-6 text-cream hover:text-cream-light transition-colors z-10"
            onClick={() => setSelectedImage(null)}
          >
            <svg
              className="w-8 h-8"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>

          <div className="relative max-w-5xl max-h-[90vh] w-full h-full">
            <Image
              src={selectedImage.imageUrl}
              alt={selectedImage.title || "Gallery image"}
              fill
              className="object-contain"
              sizes="90vw"
              onClick={(e) => e.stopPropagation()}
            />
            {showImageTitles && selectedImage.title && (
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-6 text-center">
                <p className="text-cream text-2xl font-medium">{selectedImage.title}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
