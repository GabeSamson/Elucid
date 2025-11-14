"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

type AttributionTouch = {
  timestamp: string;
  path: string;
  referrer: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
};

interface AttributionPayload {
  firstTouch: AttributionTouch;
  lastTouch: AttributionTouch;
  visitCount: number;
  updatedAt: string;
}

const STORAGE_KEY = "elucid_attribution";

const buildTouch = (
  pathname: string,
  referrer: string | null,
  utmSource: string | null,
  utmMedium: string | null,
  utmCampaign: string | null,
): AttributionTouch => ({
  timestamp: new Date().toISOString(),
  path: pathname,
  referrer,
  utmSource,
  utmMedium,
  utmCampaign,
});

const persistAttribution = (touch: AttributionTouch) => {
  if (typeof window === "undefined") {
    return;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const now = new Date().toISOString();
    if (!raw) {
      const payload: AttributionPayload = {
        firstTouch: touch,
        lastTouch: touch,
        visitCount: 1,
        updatedAt: now,
      };
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
      return;
    }

    const parsed = JSON.parse(raw) as Partial<AttributionPayload>;
    const visitCount = typeof parsed.visitCount === "number" ? parsed.visitCount + 1 : 1;
    const payload: AttributionPayload = {
      firstTouch: parsed.firstTouch ?? touch,
      lastTouch: touch,
      visitCount,
      updatedAt: now,
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch (error) {
    console.error("Failed to persist attribution data:", error);
  }
};

export default function PageViewTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Track page view when pathname changes
    const trackPageView = async () => {
      try {
        // Get referrer
        const referrer = document.referrer || null;

        // Extract UTM parameters
        const utmSource = searchParams.get("utm_source") || null;
        const utmMedium = searchParams.get("utm_medium") || null;
        const utmCampaign = searchParams.get("utm_campaign") || null;

        const touchPayload = buildTouch(
          pathname,
          referrer,
          utmSource,
          utmMedium,
          utmCampaign,
        );

        persistAttribution(touchPayload);

        // Send tracking data to API
        await fetch("/api/analytics/pageview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            path: pathname,
            referrer,
            utmSource,
            utmMedium,
            utmCampaign,
          }),
        });
      } catch (error) {
        // Silently fail - don't disrupt user experience
        console.error("Failed to track page view:", error);
      }
    };

    trackPageView();
  }, [pathname, searchParams]);

  // This component renders nothing
  return null;
}
