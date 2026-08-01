"use client";

import { useEffect } from "react";
import { trackEvent, trackEventOnce } from "@/lib/analytics";
import { getCurrentAttribution } from "@/lib/attribution";
import { createPaidLandingMetadata } from "@/lib/paid-landing-metadata";
import { sendPaidLandingBeacon } from "@/lib/paid-landing-beacon";
import { getSafeReferrerHost } from "@/lib/paid-traffic-receipt";

export function PaidLandingAnalytics({
  sourcePage,
}: {
  sourcePage: string;
}) {
  useEffect(() => {
    const attribution = getCurrentAttribution();
    const metadata = createPaidLandingMetadata({
      attribution,
      sourcePage,
      userAgent: window.navigator.userAgent,
      viewportWidth: window.innerWidth,
    });

    trackEventOnce(`landing_page_view:${sourcePage}`, "landing_page_view", {
      source_page: sourcePage,
    });
    trackEventOnce(
      `paid_landing_view:${sourcePage}`,
      "paid_landing_view",
      metadata,
    );

    if (metadata.has_gclid || metadata.medium.toLowerCase() === "cpc") {
      void sendPaidLandingBeacon({
        event_type: "paid_landing_client_beacon",
        route: window.location.pathname,
        source: metadata.source,
        medium: metadata.medium,
        campaign: metadata.campaign,
        has_gclid: metadata.has_gclid,
        has_utm: metadata.has_utm,
        device_category: metadata.device_category,
        referrer_host: getSafeReferrerHost(document.referrer),
      }).catch(() => undefined);
    }

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
