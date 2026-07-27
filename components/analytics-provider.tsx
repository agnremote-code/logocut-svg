"use client";

import Script from "next/script";
import { useEffect } from "react";
import { flushAnalyticsQueue } from "@/lib/analytics";
import { getCurrentAttribution } from "@/lib/attribution";

export function AnalyticsProvider() {
  const measurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

  useEffect(() => {
    const flush = () => flushAnalyticsQueue();

    getCurrentAttribution();

    if (measurementId) {
      window.dataLayer = window.dataLayer ?? [];
      window.gtag =
        window.gtag ??
        ((...args: unknown[]) => {
          window.dataLayer?.push(args);
        });

      if (window.__logocutGaConfigured !== measurementId) {
        window.gtag("js", new Date());
        window.gtag("config", measurementId, {
          send_page_view: false,
          allow_google_signals: false,
          allow_ad_personalization_signals: false,
        });
        window.__logocutGaConfigured = measurementId;
      }
    }

    flush();
    window.addEventListener("logocut:analytics-ready", flush);

    return () => window.removeEventListener("logocut:analytics-ready", flush);
  }, [measurementId]);

  if (!measurementId) {
    return null;
  }

  return (
    <Script
      src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(
        measurementId,
      )}`}
      strategy="afterInteractive"
      onLoad={() => window.dispatchEvent(new Event("logocut:analytics-ready"))}
    />
  );
}
