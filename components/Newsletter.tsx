"use client";

import { motion } from "framer-motion";
import { useState } from "react";

export default function Newsletter() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (res.ok) {
        setMessage("Thanks for subscribing!");
        setEmail("");
      } else {
        setError(data.error || 'Failed to subscribe');
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="py-32 px-6 bg-cream-dark">
      <div className="max-w-4xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          <h2 className="font-serif text-5xl md:text-6xl mb-6 text-charcoal-dark">
            Stay Connected
          </h2>
          <p className="text-charcoal-light text-lg mb-12 max-w-2xl mx-auto">
            Subscribe to receive updates on new releases, exclusive drops, and stories from the streets of London.
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-4 max-w-xl mx-auto mb-4">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
              disabled={loading}
              className="flex-1 px-6 py-4 bg-cream border border-charcoal/20 focus:border-charcoal focus:outline-none transition-colors disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={loading}
              className="px-10 py-4 bg-charcoal-dark text-cream-light hover:bg-charcoal transition-colors duration-300 tracking-wider text-sm uppercase disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Subscribing...' : 'Subscribe'}
            </button>
          </form>

          {message && (
            <p className="text-charcoal-dark text-sm">
              {message}
            </p>
          )}

          {error && (
            <p className="text-charcoal-dark text-sm">
              {error}
            </p>
          )}
        </motion.div>
      </div>
    </section>
  );
}
