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
  showFeedbackButton: boolean;
  heroImageUrl?: string | null;
  useCustomHeroImage?: boolean;
  locked?: boolean;
  isAdmin?: boolean;
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
  showFeedbackButton,
  heroImageUrl,
  useCustomHeroImage,
  locked = false,
  isAdmin = false,
}: HeroClientProps) {
  const [mounted, setMounted] = useState(false);
  const [countdown, setCountdown] = useState<CountdownState | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const updateViewportHeight = () => {
      document.documentElement.style.setProperty(
        "--app-viewport-height",
        `${window.innerHeight}px`
      );
    };

    updateViewportHeight();
    window.addEventListener("resize", updateViewportHeight);
    window.addEventListener("orientationchange", updateViewportHeight);

    return () => {
      window.removeEventListener("resize", updateViewportHeight);
      window.removeEventListener("orientationchange", updateViewportHeight);
    };
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
        className="flex h-14 w-14 flex-col items-center justify-center rounded-xl border border-cream-light/30 bg-charcoal/80 text-cream-light shadow-sm backdrop-blur sm:h-16 sm:w-16"
      >
        <span className="text-xl font-semibold tabular-nums sm:text-2xl">{segment.value.toString().padStart(2, "0")}</span>
        <span className="text-xs uppercase tracking-[0.2em] text-cream-light/70">{segment.label}</span>
      </div>
    ));
  }, [countdown]);

  const heroLogoClasses = useCustomHeroImage && heroImageUrl
    ? "mx-auto h-auto w-[min(80vw,720px)] max-h-[42vh] object-contain drop-shadow-2xl select-none pointer-events-none"
    : "mx-auto h-auto w-[min(80vw,720px)] max-h-[42vh] object-contain drop-shadow-2xl invert brightness-0 contrast-200 select-none pointer-events-none transform -translate-x-[10px]";

  return (
    <section
      className="relative flex min-h-screen min-h-[100svh] min-h-[100dvh] items-center justify-center overflow-hidden bg-charcoal-dark"
      style={{
        height: "var(--app-viewport-height, 100dvh)",
        paddingTop: "max(5.5rem, calc(env(safe-area-inset-top) + 3.5rem))",
        paddingBottom: "max(4rem, calc(env(safe-area-inset-bottom) + 1.5rem))",
      }}
      data-nav-tone="dark"
    >
      <div className="absolute inset-0 film-grain opacity-20" />

      <div className="relative z-10 mx-auto w-full max-w-7xl px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: "easeOut" }}
          className="mb-4 sm:mb-6 flex justify-center"
        >
          <img
            src={useCustomHeroImage && heroImageUrl ? heroImageUrl : "/logo.svg"}
            alt="Elucid LDN"
            draggable="false"
            onContextMenu={(e) => e.preventDefault()}
            className={heroLogoClasses}
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.1 }}
          className="space-y-4 sm:space-y-6"
        >
          {heading && !locked && (
            <h1 className="font-serif text-3xl text-cream-light md:text-5xl lg:text-6xl">
              {heading}
            </h1>
          )}
          {subheading && !locked && (
            <p className="text-cream-light/70 text-base md:text-lg font-light tracking-[0.35em] uppercase">
              {subheading}
            </p>
          )}
          {customContent && !locked && (
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
            className="mx-auto mt-6 max-w-4xl space-y-4 sm:mt-10 md:mt-12"
          >
            {countdownLabel && (
              <p className="text-sm uppercase tracking-[0.35em] text-cream-light/60">
                {countdownLabel}
              </p>
            )}
            <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4">
              {countdownDisplay}
            </div>
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.5 }}
          className="mt-6 sm:mt-10 md:mt-12"
        >
          {!locked && (
            <>
              <a
                href={ctaHref}
                className="inline-flex items-center justify-center rounded-xl border border-cream-light/30 px-10 py-3 text-xs uppercase tracking-[0.28em] text-cream-light transition-all duration-300 hover:bg-cream-light hover:text-charcoal-dark sm:rounded-2xl sm:px-14 sm:py-4 sm:text-sm sm:tracking-[0.35em]"
              >
                {ctaLabel}
              </a>
              {showFeedbackButton && (
                <div className="mt-4 sm:mt-6">
                  <a
                    href="/reviews"
                    className="inline-flex items-center justify-center gap-3 rounded-full border border-cream-light/20 px-6 py-3 text-xs uppercase tracking-[0.3em] text-cream-light/80 hover:text-cream-light"
                  >
                    Share Feedback
                  </a>
                </div>
              )}
            </>
          )}
          {locked && isAdmin && (
            <div className="mt-4">
              <a
                href="/admin"
                className="inline-flex items-center justify-center rounded-full border border-cream-light/30 px-6 py-2 text-xs uppercase tracking-[0.3em] text-cream-light/80 hover:text-cream-light"
              >
                Go to Admin
              </a>
            </div>
          )}
        </motion.div>
      </div>
    </section>
  );
}
