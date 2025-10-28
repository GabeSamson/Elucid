"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

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
