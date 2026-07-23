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
    flush();
    window.addEventListener("logocut:analytics-ready", flush);

    return () => window.removeEventListener("logocut:analytics-ready", flush);
  }, []);

  if (!measurementId) {
    return null;
  }

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(
          measurementId,
        )}`}
        strategy="afterInteractive"
      />
      <Script id="ga4" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          window.gtag = gtag;
          gtag('js', new Date());
          gtag('config', '${measurementId}', {
            send_page_view: false,
            allow_google_signals: false,
            allow_ad_personalization_signals: false
          });
          window.dispatchEvent(new Event('logocut:analytics-ready'));
        `}
      </Script>
    </>
  );
}
