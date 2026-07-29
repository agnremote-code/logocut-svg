"use client";

import { useEffect } from "react";
import { trackEvent } from "@/lib/analytics";
import { getCurrentAttribution } from "@/lib/attribution";
import { createPaidLandingMetadata } from "@/lib/paid-landing-metadata";

export function PaidLandingAnalytics({
  sourcePage,
}: {
  sourcePage: string;
}) {
  useEffect(() => {
    const metadata = createPaidLandingMetadata({
      attribution: getCurrentAttribution(),
      sourcePage,
      userAgent: window.navigator.userAgent,
      viewportWidth: window.innerWidth,
    });

    trackEvent("landing_page_view", {
      source_page: sourcePage,
    });
    trackEvent("paid_landing_view", metadata);

    const pricing = document.getElementById("paid-landing-pricing");
    const uploader = document.querySelector("[data-logocut-uploader]");

    if (!pricing && !uploader) {
      return;
    }

    let pricingWasTracked = false;
    let uploaderWasTracked = false;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) {
            continue;
          }

          if (entry.target === pricing && !pricingWasTracked) {
            pricingWasTracked = true;
            trackEvent("pricing_viewed", {
              source_page: sourcePage,
            });
            observer.unobserve(entry.target);
          }

          if (entry.target === uploader && !uploaderWasTracked) {
            uploaderWasTracked = true;
            trackEvent("uploader_visible", {
              source_page: sourcePage,
            });
            observer.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.6 },
    );

    if (pricing) {
      observer.observe(pricing);
    }
    if (uploader) {
      observer.observe(uploader);
    }

    return () => observer.disconnect();
  }, [sourcePage]);

  return null;
}
