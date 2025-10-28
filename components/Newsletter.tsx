"use client";

import { motion } from "framer-motion";
import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import AuthModal from "./AuthModal";

export default function Newsletter() {
  const { data: session, status } = useSession();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [alreadySubscribed, setAlreadySubscribed] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [pendingSubscription, setPendingSubscription] = useState(false);

  const closeAuthModal = () => {
    setAuthModalOpen(false);
    setPendingSubscription(false);
  };

  const subscribeWithAccountEmail = useCallback(async () => {
    const email = session?.user?.email;

    if (!email) {
      setError('We could not find an email associated with your account.');
      setPendingSubscription(false);
      return;
    }

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
        setMessage(data.message || 'Thanks for subscribing!');
        setAlreadySubscribed(Boolean(data.alreadySubscribed));
        setError("");
        return;
      }

      if (
        typeof data.error === 'string' &&
        data.error.toLowerCase().includes('already subscribed')
      ) {
        setMessage(data.error);
        setAlreadySubscribed(true);
        setError("");
      } else {
        setAlreadySubscribed(false);
        setError(data.error || 'Failed to subscribe');
      }
    } catch (err) {
      setAlreadySubscribed(false);
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
      setPendingSubscription(false);
    }
  }, [session?.user?.email]);

  useEffect(() => {
    if (status === "authenticated" && pendingSubscription) {
      setAuthModalOpen(false);
      subscribeWithAccountEmail();
    }
  }, [status, pendingSubscription, subscribeWithAccountEmail]);

  useEffect(() => {
    if (status === "authenticated") {
      setAuthModalOpen(false);
    }
  }, [status]);

  const handleSubscribe = () => {
    setMessage("");
    setError("");

    if (alreadySubscribed) {
      return;
    }

    if (status !== "authenticated") {
      setPendingSubscription(true);
      setAuthModalOpen(true);
      return;
    }

    subscribeWithAccountEmail();
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

          <div className="flex flex-col sm:flex-row gap-4 max-w-xl mx-auto mb-4 justify-center">
            <button
              onClick={handleSubscribe}
              disabled={loading || status === "loading" || alreadySubscribed}
              className="px-10 py-4 bg-charcoal-dark text-cream-light hover:bg-charcoal transition-colors duration-300 tracking-wider text-sm uppercase disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Subscribing...' : alreadySubscribed ? 'Already Subscribed' : 'Subscribe'}
            </button>
          </div>

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

      <AuthModal
        isOpen={authModalOpen}
        onClose={closeAuthModal}
        initialMode="signin"
      />
    </section>
  );
}
