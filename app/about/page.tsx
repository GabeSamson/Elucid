"use client";

import { motion } from "framer-motion";
import { Suspense } from "react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-cream">
      <Suspense fallback={<div className="h-20" />}>
        <Navigation />
      </Suspense>

      <div className="pt-32 pb-20 px-6">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="mb-16 text-center"
          >
            <h1 className="font-serif text-5xl md:text-7xl text-charcoal-dark mb-6">
              About Elucid LDN
            </h1>
            <p className="text-xl text-charcoal-light italic">
              Shade to the light
            </p>
          </motion.div>

          {/* Content */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="space-y-8"
          >
            <div className="py-12 px-8 border border-charcoal/10 bg-white rounded-2xl film-grain">
              <p className="text-lg md:text-xl text-charcoal leading-relaxed text-center">
                A new growing streetwear business based in London that will have more and more to come.
              </p>
            </div>

            <div className="py-12 px-8 border border-charcoal/10 bg-cream-light rounded-2xl">
              <p className="text-charcoal/60 text-center italic">
                Stay tuned for updates as we continue to grow and expand our collection.
              </p>
            </div>
          </motion.div>
        </div>
      </div>

      <Footer />
    </main>
  );
}
