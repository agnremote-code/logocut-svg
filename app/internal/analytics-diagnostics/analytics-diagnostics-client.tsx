"use client";

import { useEffect, useState } from "react";
import {
  AnalyticsDiagnostics,
  getAnalyticsDiagnostics,
  trackEventOnce,
} from "@/lib/analytics";
import { getCurrentAttribution } from "@/lib/attribution";
import { sendPaidLandingBeacon } from "@/lib/paid-landing-beacon";
import { createPaidLandingMetadata } from "@/lib/paid-landing-metadata";
import { getSafeReferrerHost } from "@/lib/paid-traffic-receipt";

const initialDiagnostics: AnalyticsDiagnostics = {
  measurementIdPresent: false,
  scriptLoaded: false,
  configIssued: false,
  queueLength: 0,
  pageViewSent: false,
  lastDispatchStatus: "idle",
};

export function AnalyticsDiagnosticsClient() {
  const [diagnostics, setDiagnostics] =
    useState<AnalyticsDiagnostics>(initialDiagnostics);
  const [beaconStatus, setBeaconStatus] = useState("pending");

  useEffect(() => {
    const attribution = getCurrentAttribution();
    const metadata = createPaidLandingMetadata({
      attribution,
      sourcePage: "analytics-diagnostics",
      userAgent: navigator.userAgent,
      viewportWidth: window.innerWidth,
    });

    trackEventOnce(
      "diagnostics:paid_landing_view",
      "paid_landing_view",
      { ...metadata, debug_mode: true },
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
      })
        .then(setBeaconStatus)
        .catch(() => setBeaconStatus("failed"));
    } else {
      setBeaconStatus("not-paid");
    }

    const refresh = () => setDiagnostics(getAnalyticsDiagnostics());
    refresh();
    const interval = window.setInterval(refresh, 500);
    return () => window.clearInterval(interval);
  }, []);

  return (
    <main className="mx-auto min-h-screen max-w-2xl px-6 py-16 text-[#111815]">
      <p className="text-sm font-bold uppercase text-[#16834b]">
        Preview diagnostics
      </p>
      <h1 className="mt-3 text-3xl font-bold">Paid traffic measurement</h1>
      <p className="mt-3 text-[#667069]">
        This page uses synthetic campaign markers only. It never creates a job,
        payment, preview, or Vectorizer request.
      </p>
      <dl className="mt-8 grid grid-cols-1 gap-3 rounded-lg border border-[#dde3de] bg-white p-6 sm:grid-cols-2">
        {Object.entries({ ...diagnostics, beaconStatus }).map(([key, value]) => (
          <div key={key}>
            <dt className="text-xs font-bold uppercase text-[#667069]">{key}</dt>
            <dd className="mt-1 font-mono text-sm">{String(value)}</dd>
          </div>
        ))}
      </dl>
    </main>
  );
}
