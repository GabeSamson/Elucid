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
  isAnonymous: boolean;
  hideAuthor: boolean;
}

interface ProductReviewsProps {
  productId: string;
  productName: string;
  showReviews?: boolean;
  allowReviews?: boolean;
}

export default function ProductReviews({ productId, productName, showReviews = true, allowReviews = true }: ProductReviewsProps) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProductReviews();
  }, [productId]);

  const fetchProductReviews = async () => {
    try {
      const res = await fetch(`/api/reviews?productId=${productId}`, {
        cache: 'no-store',
      });
      const data = await res.json();

      if (res.ok) {
        setReviews(data.reviews || []);
      }
    } catch (error) {
      console.error('Error fetching product reviews:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return null;
  }

  // Don't show the reviews section if:
  // 1. showReviews is false, OR
  // 2. There are no reviews and allowReviews is false (can't write reviews either)
  if (!showReviews || (reviews.length === 0 && !allowReviews)) {
    return null;
  }

  // If there are no reviews but reviews are allowed, still show the "Write a Review" button
  // but hide the entire reviews section (as requested)
  if (reviews.length === 0) {
    return null;
  }

  // Calculate average rating
  const averageRating = reviews.length > 0
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : '0';

  return (
    <section className="py-16 px-6 bg-cream">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-12">
          <div>
            <h2 className="font-serif text-4xl md:text-5xl text-charcoal-dark mb-2">
              Customer Reviews
            </h2>
            {reviews.length > 0 && (
              <div className="flex items-center gap-3 mt-3">
                <div className="flex items-center">
                  <span className="text-2xl font-serif text-charcoal-dark mr-2">{averageRating}</span>
                  <div className="text-charcoal-dark text-lg">
                    {'★'.repeat(Math.round(parseFloat(averageRating)))}
                    <span className="text-charcoal/20">
                      {'★'.repeat(5 - Math.round(parseFloat(averageRating)))}
                    </span>
                  </div>
                </div>
                <span className="text-charcoal-light text-sm">
                  Based on {reviews.length} {reviews.length === 1 ? 'review' : 'reviews'}
                </span>
              </div>
            )}
          </div>
          {allowReviews && (
            <Link
              href={`/reviews?productId=${productId}`}
              className="inline-block px-8 py-4 bg-charcoal-dark text-cream hover:bg-charcoal transition-colors duration-300 tracking-wider text-sm uppercase mt-6 md:mt-0"
            >
              Write a Review
            </Link>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {reviews.map((review, index) => (
            <motion.div
              key={review.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              className="bg-cream-light p-6 border border-charcoal/10 hover:border-charcoal/20 transition-colors"
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

              <p className="text-sm text-charcoal-light mb-4">
                {review.content}
              </p>

              <div className="flex items-center justify-between border-t border-charcoal/10 pt-3">
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
        </div>
      </div>
    </section>
  );
}
