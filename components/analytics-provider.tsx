"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import {
  markAnalyticsReady,
  trackPageViewOnce,
} from "@/lib/analytics";
import { getCurrentAttribution } from "@/lib/attribution";

export function AnalyticsProvider() {
  const measurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
  const pathname = usePathname();

  useEffect(() => {
    getCurrentAttribution();
    trackPageViewOnce({
      debug_mode: pathname === "/internal/analytics-diagnostics",
    });
  }, [pathname]);

  if (!measurementId) {
    return null;
  }

  return (
    <Script
      id="google-analytics-library"
      src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(
        measurementId,
      )}`}
      strategy="afterInteractive"
      onLoad={() => {
        markAnalyticsReady();
      }}
      onReady={() => {
        markAnalyticsReady();
      }}
    />
  );
}
