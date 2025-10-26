"use client";

import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";

interface HeroClientProps {
  heading?: string;
  subheading?: string | null;
  ctaLabel: string;
  ctaHref: string;
  customContent?: string | null;
  showCountdown: boolean;
  countdownLabel?: string | null;
  countdownTarget?: string;
}

interface CountdownState {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

function calculateCountdown(targetIso?: string): CountdownState | null {
  if (!targetIso) return null;
  const targetDate = new Date(targetIso);
  if (Number.isNaN(targetDate.getTime())) return null;

  const difference = targetDate.getTime() - Date.now();
  if (difference <= 0) {
    return null;
  }

  const totalSeconds = Math.floor(difference / 1000);
  const days = Math.floor(totalSeconds / (60 * 60 * 24));
  const hours = Math.floor((totalSeconds % (60 * 60 * 24)) / (60 * 60));
  const minutes = Math.floor((totalSeconds % (60 * 60)) / 60);
  const seconds = totalSeconds % 60;

  return { days, hours, minutes, seconds };
}

export default function HeroClient({
  heading,
  subheading,
  ctaLabel,
  ctaHref,
  customContent,
  showCountdown,
  countdownLabel,
  countdownTarget,
}: HeroClientProps) {
  const [mounted, setMounted] = useState(false);
  const [countdown, setCountdown] = useState<CountdownState | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!showCountdown || !countdownTarget || !mounted) {
      setCountdown(null);
      return;
    }

    setCountdown(calculateCountdown(countdownTarget));
    const interval = window.setInterval(() => {
      setCountdown(calculateCountdown(countdownTarget));
    }, 1000);

    return () => window.clearInterval(interval);
  }, [showCountdown, countdownTarget, mounted]);

  const countdownDisplay = useMemo(() => {
    if (!countdown) return null;
    const segments = [
      { label: "D", value: countdown.days },
      { label: "H", value: countdown.hours },
      { label: "M", value: countdown.minutes },
      { label: "S", value: countdown.seconds },
    ];

    return segments.map((segment) => (
      <div
        key={segment.label}
        className="flex h-16 w-16 flex-col items-center justify-center rounded-xl border border-cream-light/30 bg-charcoal/80 text-cream-light shadow-sm backdrop-blur"
      >
        <span className="text-2xl font-semibold tabular-nums">{segment.value.toString().padStart(2, "0")}</span>
        <span className="text-xs uppercase tracking-[0.2em] text-cream-light/70">{segment.label}</span>
      </div>
    ));
  }, [countdown]);

  return (
    <section
      className="relative flex min-h-screen min-h-[100dvh] items-center justify-center overflow-hidden bg-charcoal-dark pb-12 pt-12 sm:pt-20"
      data-nav-tone="dark"
    >
      <div className="absolute inset-0 film-grain opacity-20" />

      <div className="relative z-10 mx-auto w-full max-w-7xl px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: "easeOut" }}
          className="mb-10 sm:mb-14 flex justify-center"
        >
          <img
            src="/logo.svg"
            alt="Elucid LDN"
            draggable="false"
            onContextMenu={(e) => e.preventDefault()}
            className="w-48 sm:w-60 md:w-80 lg:w-[520px] xl:w-[640px] drop-shadow-2xl invert brightness-0 contrast-200 select-none pointer-events-none transform -translate-x-[14px]"
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.1 }}
          className="space-y-6"
        >
          {heading && (
            <h1 className="font-serif text-3xl text-cream-light md:text-5xl lg:text-6xl">
              {heading}
            </h1>
          )}
          {subheading && (
            <p className="text-cream-light/70 text-base md:text-lg font-light tracking-[0.35em] uppercase">
              {subheading}
            </p>
          )}
          {customContent && (
            <p className="mx-auto max-w-xl text-sm text-cream-light/70 md:text-base">
              {customContent}
            </p>
          )}
        </motion.div>

        {showCountdown && mounted && countdownDisplay && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="mx-auto mt-12 max-w-4xl space-y-4"
          >
            {countdownLabel && (
              <p className="text-sm uppercase tracking-[0.35em] text-cream-light/60">
                {countdownLabel}
              </p>
            )}
            <div className="flex flex-wrap items-center justify-center gap-4">
              {countdownDisplay}
            </div>
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.5 }}
          className="mt-16"
        >
          <a
            href={ctaHref}
            className="inline-flex items-center justify-center rounded-2xl border border-cream-light/30 px-14 py-4 text-sm uppercase tracking-[0.35em] text-cream-light transition-all duration-300 hover:bg-cream-light hover:text-charcoal-dark"
          >
            {ctaLabel}
          </a>
        </motion.div>
      </div>
    </section>
  );
}
