"use client";

import { useEffect } from "react";
import { trackEvent } from "@/lib/analytics";

export function PaidLandingAnalytics({
  sourcePage,
}: {
  sourcePage: string;
}) {
  useEffect(() => {
    trackEvent("landing_page_view", {
      source_page: sourcePage,
    });

    const pricing = document.getElementById("paid-landing-pricing");

    if (!pricing) {
      return;
    }

    let wasTracked = false;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting || wasTracked) {
          return;
        }

        wasTracked = true;
        trackEvent("pricing_viewed", {
          source_page: sourcePage,
        });
        observer.disconnect();
      },
      { threshold: 0.6 },
    );

    observer.observe(pricing);
    return () => observer.disconnect();
  }, [sourcePage]);

  return null;
}
