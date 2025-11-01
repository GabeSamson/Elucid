'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';

interface ReviewFormProps {
  productId?: string;
  productName?: string;
}

export default function ReviewForm({ productId, productName }: ReviewFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    rating: 5,
    title: '',
    content: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    setSubmitting(true);

    try {
      const res = await fetch('/api/reviews/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email || undefined,
          rating: formData.rating,
          title: formData.title || undefined,
          content: formData.content,
          productId: productId || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit review');
      }

      setFeedback({
        type: 'success',
        message: data.message || 'Thank you for your review!',
      });

      // Reset form
      setFormData({
        name: '',
        email: '',
        rating: 5,
        title: '',
        content: '',
      });
    } catch (error: any) {
      setFeedback({
        type: 'error',
        message: error.message || 'Failed to submit review',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="pt-32 pb-20 px-6">
      <div className="max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12"
        >
          <h1 className="font-serif text-5xl md:text-7xl text-charcoal-dark mb-4">
            {productName ? `Review: ${productName}` : 'Share Your Feedback'}
          </h1>
          <p className="text-charcoal-light text-lg">
            {productName
              ? 'Tell us about your experience with this product'
              : "We'd love to hear about your experience with Elucid LDN"}
          </p>
        </motion.div>

        {feedback && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`border px-6 py-4 mb-8 ${
              feedback.type === 'success'
                ? 'bg-beige/20 border-beige text-charcoal-dark'
                : 'bg-cream-dark border-charcoal text-charcoal-dark'
            }`}
          >
            {feedback.message}
          </motion.div>
        )}

        <motion.form
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          onSubmit={handleSubmit}
          className="bg-cream-light p-8 space-y-6"
        >
          <div>
            <label className="block text-sm font-medium text-charcoal mb-2">
              Your Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              className="w-full px-4 py-3 bg-cream border border-charcoal/20 focus:border-charcoal focus:outline-none"
              placeholder="John Doe"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-charcoal mb-2">
              Email (Optional)
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-3 bg-cream border border-charcoal/20 focus:border-charcoal focus:outline-none"
              placeholder="john@example.com"
            />
            <p className="text-xs text-charcoal/60 mt-1">
              We'll never share your email publicly
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-charcoal mb-2">
              Rating *
            </label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setFormData({ ...formData, rating: star })}
                  className="text-3xl focus:outline-none transition-transform hover:scale-110"
                >
                  {star <= formData.rating ? (
                    <span className="text-charcoal-dark">★</span>
                  ) : (
                    <span className="text-charcoal/30">★</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-charcoal mb-2">
              Review Title (Optional)
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              maxLength={200}
              className="w-full px-4 py-3 bg-cream border border-charcoal/20 focus:border-charcoal focus:outline-none"
              placeholder="What did you think?"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-charcoal mb-2">
              Your Review *
            </label>
            <textarea
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              required
              rows={6}
              minLength={10}
              maxLength={2000}
              className="w-full px-4 py-3 bg-cream border border-charcoal/20 focus:border-charcoal focus:outline-none"
              placeholder="Tell us about your experience..."
            />
            <p className="text-xs text-charcoal/60 mt-1">
              Minimum 10 characters ({formData.content.length}/2000)
            </p>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-4 bg-charcoal-dark text-cream hover:bg-charcoal transition-colors duration-300 tracking-wider text-sm uppercase disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Submitting...' : 'Submit Review'}
          </button>

          <p className="text-xs text-charcoal/60 text-center">
            Your review will be published after approval by our team
          </p>
        </motion.form>
      </div>
    </div>
  );
}
