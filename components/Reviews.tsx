'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
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
}

export default function Reviews() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPinnedReviews();
  }, []);

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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {reviews.map((review, index) => (
            <motion.div
              key={review.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
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
                <span className="text-sm font-medium text-charcoal">
                  {review.name}
                </span>
                <span className="text-xs text-charcoal/60">
                  {new Date(review.createdAt).toLocaleDateString()}
                </span>
              </div>
            </motion.div>
          ))}
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
