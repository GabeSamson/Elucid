'use client';

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface LockCarouselProps {
  images: string[];
  enableSlideshow?: boolean;
}

export default function LockCarousel({ images, enableSlideshow = false }: LockCarouselProps) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!enableSlideshow || images.length <= 1) return;
    const id = window.setInterval(() => {
      setIndex((prev) => (prev + 1) % images.length);
    }, 4500);
    return () => window.clearInterval(id);
  }, [enableSlideshow, images.length]);

  if (!images.length) return null;

  const goTo = (next: number) => setIndex((next + images.length) % images.length);

  return (
    <section className="bg-charcoal-dark py-10 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="relative overflow-hidden rounded-2xl border border-cream/10 bg-charcoal">
          <AnimatePresence mode="wait">
            <motion.div
              key={images[index]}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.45 }}
              className="aspect-[4/3] sm:aspect-video bg-charcoal flex items-center justify-center"
            >
              <img
                src={images[index]}
                alt={`Lock screen image ${index + 1}`}
                className="max-h-full max-w-full object-contain"
                draggable={false}
              />
            </motion.div>
          </AnimatePresence>

          {images.length > 1 && (
            <>
              <div className="absolute inset-x-0 bottom-3 flex justify-center gap-2">
                {images.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => goTo(i)}
                    className={`h-2 w-8 rounded-full transition-all ${i === index ? 'bg-cream' : 'bg-cream/30 hover:bg-cream/60'}`}
                    aria-label={`Go to image ${i + 1}`}
                  />
                ))}
              </div>
              <button
                onClick={() => goTo(index - 1)}
                className="absolute left-3 top-1/2 -translate-y-1/2 bg-charcoal/70 text-cream p-2 rounded-full hover:bg-charcoal/90 transition-colors"
                aria-label="Previous"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                onClick={() => goTo(index + 1)}
                className="absolute right-3 top-1/2 -translate-y-1/2 bg-charcoal/70 text-cream p-2 rounded-full hover:bg-charcoal/90 transition-colors"
                aria-label="Next"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
