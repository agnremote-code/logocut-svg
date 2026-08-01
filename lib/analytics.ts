"use client";

import { CutType, OneTimeProductType } from "@/lib/job-types";
import { getCurrentAttribution, PaidAttribution } from "@/lib/attribution";
import {
  createPurchaseAnalyticsParams,
  sanitizeAnalyticsParams,
} from "@/lib/analytics-payload";
import { recordFunnelDiagnostic } from "@/lib/funnel-diagnostics";

type AnalyticsEventName =
  | "page_view"
  | "homepage_view"
  | "landing_page_view"
  | "paid_landing_view"
  | "uploader_visible"
  | "uploader_clicked"
  | "file_picker_clicked"
  | "file_selected"
  | "upload_started"
  | "file_accepted"
  | "upload_completed"
  | "preview_requested"
  | "preview_generated"
  | "sample_demo_started"
  | "sample_preview_generated"
  | "preview_failed"
  | "preview_retry_clicked"
  | "result_page_view"
  | "paypal_order_created"
  | "purchase_completed"
  | "svg_downloaded"
  | "demo_sample_selected"
  | "comparison_slider_used"
  | "conversion_setting_changed"
  | "advanced_settings_opened"
  | "preview_view_mode_changed"
  | "cut_preview_background_changed"
  | "preview_zoom_used"
  | "preview_regenerated"
  | "preview_displayed"
  | "pricing_viewed"
  | "checkout_viewed"
  | "checkout_clicked"
  | "paypal_opened"
  | "final_svg_generation_started"
  | "final_svg_ready"
  | "generation_failed"
  | "purchase"
  | "marketing_capture_viewed"
  | "marketing_email_submitted"
  | "marketing_opt_in_completed"
  | "marketing_signup_failed"
  | "post_purchase_marketing_capture_viewed"
  | "marketing_unsubscribed";

type AnalyticsParams = {
  cut_type?: CutType;
  product_type?: OneTimeProductType;
  source_page?: string;
  source?: string;
  medium?: string;
  campaign?: string;
  device_category?: "desktop" | "mobile" | "tablet";
  has_gclid?: boolean;
  has_utm?: boolean;
  price?: number;
  file_type?: string;
  currency?: "USD";
  transaction_id?: string;
  sample?: string;
  position_bucket?: number;
  setting?: string;
  value?: number | string;
  view_mode?: string;
  preview_mode?: CutType;
  preview_failure_code?: string;
  background?: string;
  direction?: string;
  consent_source?: string;
  failure_reason?: string;
  page_location?: string;
  page_path?: string;
  page_title?: string;
  page_referrer?: string;
  debug_mode?: boolean;
  items?: AnalyticsItem[];
} & PaidAttribution;

type AnalyticsItem = {
  item_id: string;
  item_name: string;
  price: number;
  quantity: 1;
  product_type: OneTimeProductType;
  cut_type: CutType;
};

declare global {
  interface Window {
    dataLayer?: unknown[][];
    gtag?: (...args: unknown[]) => void;
    __logocutGaConfigured?: string;
    __logocutGaReady?: boolean;
    __logocutPageViews?: Set<string>;
    __logocutEventDedupe?: Set<string>;
    __logocutAnalyticsQueue?: Array<{
      eventName: AnalyticsEventName;
      params: Record<string, unknown>;
    }>;
    __logocutAnalyticsDiagnostics?: AnalyticsDiagnostics;
  }
}

const purchaseMemory = new Set<string>();

export type AnalyticsDiagnostics = {
  measurementIdPresent: boolean;
  scriptLoaded: boolean;
  configIssued: boolean;
  queueLength: number;
  pageViewSent: boolean;
  lastDispatchStatus: "idle" | "queued" | "sent" | "blocked";
};

function updateDiagnostics(update: Partial<AnalyticsDiagnostics>) {
  if (typeof window === "undefined") {
    return;
  }

  window.__logocutAnalyticsDiagnostics = {
    measurementIdPresent: Boolean(
      process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim(),
    ),
    scriptLoaded: Boolean(window.__logocutGaReady),
    configIssued: Boolean(window.__logocutGaConfigured),
    queueLength: window.__logocutAnalyticsQueue?.length ?? 0,
    pageViewSent: Boolean(window.__logocutPageViews?.size),
    lastDispatchStatus: "idle",
    ...window.__logocutAnalyticsDiagnostics,
    ...update,
  };
}

function getSafeAttributionParams() {
  const attribution = getCurrentAttribution();
  const pagePath = window.location.pathname;

  return {
    utm_source: attribution.utm_source,
    utm_medium: attribution.utm_medium,
    utm_campaign: attribution.utm_campaign,
    utm_content: attribution.utm_content,
    utm_term: attribution.utm_term,
    has_gclid: Boolean(
      attribution.gclid || attribution.gbraid || attribution.wbraid,
    ),
    has_utm: Boolean(
      attribution.utm_source ||
        attribution.utm_medium ||
        attribution.utm_campaign ||
        attribution.utm_content ||
        attribution.utm_term,
    ),
    page_location: `${window.location.origin}${pagePath}`,
    page_path: pagePath,
  };
}

function dispatchToGa(
  eventName: AnalyticsEventName,
  params: Record<string, unknown>,
) {
  if (
    typeof window === "undefined" ||
    !window.__logocutGaReady ||
    typeof window.gtag !== "function"
  ) {
    return false;
  }

  window.gtag("event", eventName, params);
  updateDiagnostics({ lastDispatchStatus: "sent" });
  return true;
}

export function trackEvent(
  eventName: AnalyticsEventName,
  params: AnalyticsParams = {},
) {
  if (typeof window === "undefined") {
    return false;
  }

  const cleanParams = sanitizeAnalyticsParams({
    ...getSafeAttributionParams(),
    ...params,
  });

  recordFunnelDiagnostic(eventName, cleanParams);

  if (!process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim()) {
    updateDiagnostics({ lastDispatchStatus: "blocked" });
    return false;
  }

  if (dispatchToGa(eventName, cleanParams)) {
    return true;
  }

  window.__logocutAnalyticsQueue = window.__logocutAnalyticsQueue ?? [];

  if (window.__logocutAnalyticsQueue.length < 50) {
    window.__logocutAnalyticsQueue.push({ eventName, params: cleanParams });
    updateDiagnostics({
      lastDispatchStatus: "queued",
      queueLength: window.__logocutAnalyticsQueue.length,
    });
    return true;
  }

  return false;
}

export function flushAnalyticsQueue() {
  if (
    typeof window === "undefined" ||
    !window.__logocutGaReady ||
    typeof window.gtag !== "function"
  ) {
    return 0;
  }

  const queue = window.__logocutAnalyticsQueue ?? [];
  window.__logocutAnalyticsQueue = [];

  for (const event of queue) {
    dispatchToGa(event.eventName, event.params);
  }

  updateDiagnostics({ queueLength: 0 });
  return queue.length;
}

export function markAnalyticsReady() {
  if (typeof window === "undefined") {
    return 0;
  }

  window.__logocutGaReady = true;
  updateDiagnostics({ scriptLoaded: true });
  return flushAnalyticsQueue();
}

export function trackEventOnce(
  dedupeKey: string,
  eventName: AnalyticsEventName,
  params: AnalyticsParams = {},
) {
  if (typeof window === "undefined") {
    return false;
  }

  window.__logocutEventDedupe = window.__logocutEventDedupe ?? new Set();

  if (window.__logocutEventDedupe.has(dedupeKey)) {
    return false;
  }

  const accepted = trackEvent(eventName, params);

  if (accepted) {
    window.__logocutEventDedupe.add(dedupeKey);
  }

  return accepted;
}

function stripSearchAndHash(value: string) {
  try {
    const url = new URL(value);
    return `${url.origin}${url.pathname}`;
  } catch {
    return "";
  }
}

export function trackPageViewOnce(params: { debug_mode?: boolean } = {}) {
  if (typeof window === "undefined") {
    return false;
  }

  const pagePath = window.location.pathname;
  window.__logocutPageViews = window.__logocutPageViews ?? new Set();

  if (window.__logocutPageViews.has(pagePath)) {
    return false;
  }

  const accepted = trackEvent("page_view", {
    page_location: `${window.location.origin}${pagePath}`,
    page_path: pagePath,
    page_title: document.title.slice(0, 200),
    page_referrer: stripSearchAndHash(document.referrer),
    ...params,
  });

  if (accepted) {
    window.__logocutPageViews.add(pagePath);
    updateDiagnostics({ pageViewSent: true });
  }

  return accepted;
}

export function getAnalyticsDiagnostics(): AnalyticsDiagnostics {
  if (typeof window === "undefined") {
    return {
      measurementIdPresent: false,
      scriptLoaded: false,
      configIssued: false,
      queueLength: 0,
      pageViewSent: false,
      lastDispatchStatus: "idle",
    };
  }

  updateDiagnostics({});
  return window.__logocutAnalyticsDiagnostics as AnalyticsDiagnostics;
}

export function trackPurchaseOnce(params: {
  transactionId: string;
  value: number;
  cutType: CutType;
  productType: OneTimeProductType;
}) {
  if (typeof window === "undefined" || !params.transactionId) {
    return;
  }

  const storageKey = `logocut_purchase_${params.transactionId}`;
  let wasPersisted = false;

  try {
    wasPersisted = Boolean(window.localStorage.getItem(storageKey));
  } catch {
    wasPersisted = false;
  }

  if (purchaseMemory.has(params.transactionId) || wasPersisted) {
    return;
  }

  const purchaseParams = createPurchaseAnalyticsParams(params);

  if (!trackEvent("purchase", purchaseParams)) {
    return;
  }

  trackEvent("purchase_completed", purchaseParams);
  purchaseMemory.add(params.transactionId);

  try {
    window.localStorage.setItem(storageKey, "1");
  } catch {
    // In-memory deduplication still protects the current page session.
  }
}
