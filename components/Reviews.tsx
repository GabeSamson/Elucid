'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

interface Review {
  id: string;
  name: string;
  rating: number;
  title: string | null;
  content: string;
  createdAt: string;
  pinLocation: 'AUTO' | 'HOME' | 'PRODUCT';
  productId: string | null;
  isAnonymous: boolean;
  hideAuthor: boolean;
}

export default function Reviews() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [carouselEnabled, setCarouselEnabled] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    fetchConfig();
    fetchPinnedReviews();
  }, []);

  // Auto-rotate carousel
  useEffect(() => {
    if (!carouselEnabled || reviews.length <= 3) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => {
        const maxIndex = Math.ceil(reviews.length / 3) - 1;
        return prev >= maxIndex ? 0 : prev + 1;
      });
    }, 5000); // Rotate every 5 seconds

    return () => clearInterval(interval);
  }, [carouselEnabled, reviews.length]);

  const fetchConfig = async () => {
    try {
      const res = await fetch('/api/homepage-config', { cache: 'no-store' });
      const data = await res.json();
      if (res.ok && data.config) {
        setCarouselEnabled(data.config.rotateHomepageReviews || false);
      }
    } catch (error) {
      console.error('Error fetching config:', error);
    }
  };

  const fetchPinnedReviews = async () => {
    try {
      const res = await fetch('/api/reviews?pinned=true&feedbackOnly=true&pinLocation=HOME', {
        cache: 'no-store',
      });
      const data = await res.json();

      if (res.ok) {
        setReviews(data.reviews || []);
      }
    } catch (error) {
      console.error('Error fetching reviews:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || reviews.length === 0) {
    return null;
  }

  // Calculate which reviews to display
  const displayedReviews = carouselEnabled && reviews.length > 3
    ? reviews.slice(currentIndex * 3, currentIndex * 3 + 3)
    : reviews;

  const totalPages = carouselEnabled && reviews.length > 3
    ? Math.ceil(reviews.length / 3)
    : 1;

  return (
    <section className="py-20 px-6 bg-cream-light">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2 className="font-serif text-4xl md:text-5xl text-charcoal-dark mb-4">
            What Our Customers Say
          </h2>
          <p className="text-charcoal-light max-w-2xl mx-auto">
            Feedback from the community
          </p>
          <p className="text-charcoal/60 text-sm mt-3">
            Tell us what you loved, what could be better, or how we can help next.
          </p>
        </motion.div>

        <div className="relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentIndex}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.4 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8"
            >
              {displayedReviews.map((review, index) => (
                <motion.div
                  key={review.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  className="bg-cream p-6 border border-charcoal/10 hover:border-charcoal/20 transition-colors"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <div className="text-charcoal-dark text-lg">
                      {'★'.repeat(review.rating)}
                      <span className="text-charcoal/20">{'★'.repeat(5 - review.rating)}</span>
                    </div>
                  </div>

                  {review.title && (
                    <h3 className="font-medium text-charcoal-dark mb-2">
                      {review.title}
                    </h3>
                  )}

                  <p className="text-sm text-charcoal-light mb-4 line-clamp-4">
                    {review.content}
                  </p>

                  <div className="flex items-center justify-between">
                    {!review.hideAuthor && (
                      <span className="text-sm font-medium text-charcoal">
                        {review.isAnonymous ? 'Anonymous' : review.name}
                      </span>
                    )}
                    <span className="text-xs text-charcoal/60">
                      {new Date(review.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </AnimatePresence>

          {/* Pagination dots - only show if carousel enabled and more than 3 reviews */}
          {carouselEnabled && totalPages > 1 && (
            <div className="flex justify-center gap-2 mb-8">
              {Array.from({ length: totalPages }).map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentIndex(index)}
                  className={`w-2 h-2 rounded-full transition-all ${
                    index === currentIndex
                      ? 'bg-charcoal-dark w-8'
                      : 'bg-charcoal/30 hover:bg-charcoal/50'
                  }`}
                  aria-label={`Go to page ${index + 1}`}
                />
              ))}
            </div>
          )}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="text-center"
        >
          <Link
            href="/reviews"
            className="inline-block px-8 py-4 bg-charcoal-dark text-cream hover:bg-charcoal transition-colors duration-300 tracking-wider text-sm uppercase"
          >
            Share Your Feedback
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
