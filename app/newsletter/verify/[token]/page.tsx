"use client";

import { useEffect, useState, Suspense } from "react";
import { useParams } from "next/navigation";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { motion } from "framer-motion";

export default function NewsletterVerifyPage() {
  const params = useParams();
  const token = params.token as string;
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("Invalid verification link");
      return;
    }

    const verify = async () => {
      try {
        const res = await fetch(`/api/newsletter/verify/${token}`);
        const data = await res.json();

        if (res.ok) {
          setStatus("success");
          setMessage(data.message || "Email verified successfully");
        } else {
          setStatus("error");
          setMessage(data.error || "Verification failed");
        }
      } catch (error) {
        console.error("Verification error:", error);
        setStatus("error");
        setMessage("An unexpected error occurred");
      }
    };

    verify();
  }, [token]);

  return (
    <main className="min-h-screen bg-cream">
      <Suspense fallback={<div className="h-20" />}>
        <Navigation />
      </Suspense>

      <div className="pt-32 pb-20 px-6">
        <div className="max-w-2xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            {status === "loading" && (
              <>
                <div className="text-charcoal/60 text-lg uppercase tracking-wider mb-4">
                  Verifying...
                </div>
                <p className="text-charcoal-light">
                  Please wait while we verify your email address.
                </p>
              </>
            )}

            {status === "success" && (
              <>
                <div className="mb-6 inline-flex items-center justify-center w-20 h-20 rounded-full bg-charcoal-dark text-cream-light">
                  <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h1 className="font-serif text-4xl text-charcoal-dark mb-6">
                  Email Verified!
                </h1>
                <p className="text-charcoal-light text-lg mb-8">
                  {message}
                </p>
                <p className="text-charcoal-light mb-8">
                  You're now subscribed to the Elucid LDN newsletter and will receive updates about new releases, exclusive offers, and more.
                </p>
                <a
                  href="/"
                  className="inline-block px-8 py-4 bg-charcoal-dark text-cream-light hover:bg-charcoal transition-colors duration-300 tracking-wider text-sm uppercase"
                >
                  Back to Homepage
                </a>
              </>
            )}

            {status === "error" && (
              <>
                <div className="mb-6 inline-flex items-center justify-center w-20 h-20 rounded-full bg-charcoal/10 text-charcoal-dark">
                  <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
                <h1 className="font-serif text-4xl text-charcoal-dark mb-6">
                  Verification Failed
                </h1>
                <p className="text-charcoal-light text-lg mb-8">
                  {message}
                </p>
                <p className="text-charcoal-light mb-8">
                  The verification link may have expired or is invalid. Please try subscribing again.
                </p>
                <a
                  href="/"
                  className="inline-block px-8 py-4 bg-charcoal-dark text-cream-light hover:bg-charcoal transition-colors duration-300 tracking-wider text-sm uppercase"
                >
                  Back to Homepage
                </a>
              </>
            )}
          </motion.div>
        </div>
      </div>

      <Footer />
    </main>
  );
}
