"use client";

import { CutType, OneTimeProductType } from "@/lib/job-types";

type AnalyticsEventName =
  | "landing_page_view"
  | "homepage_view"
  | "uploader_clicked"
  | "upload_started"
  | "upload_completed"
  | "file_accepted"
  | "preview_requested"
  | "preview_started"
  | "preview_generated"
  | "preview_failed"
  | "preview_retry_clicked"
  | "result_page_view"
  | "paypal_order_created"
  | "checkout_started"
  | "purchase_completed"
  | "svg_downloaded"
  | "download_clicked"
  | "demo_sample_selected"
  | "comparison_slider_used"
  | "conversion_setting_changed"
  | "advanced_settings_opened"
  | "preview_view_mode_changed"
  | "cut_preview_background_changed"
  | "preview_zoom_used"
  | "preview_regenerated"
  | "preview_displayed"
  | "checkout_viewed"
  | "final_svg_generation_started"
  | "final_svg_ready"
  | "recovery_email_requested"
  | "recovery_email_sent"
  | "recovery_link_opened"
  | "new_conversion_started"
  | "product_selected"
  | "purchase";

type AnalyticsParams = {
  cut_type?: CutType;
  product_type?: OneTimeProductType;
  source_page?: string;
  source?: string;
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
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  landing_page?: string;
};

declare global {
  interface Window {
    gtag?: (
      command: "event",
      eventName: string,
      params?: Record<string, string | number | undefined>,
    ) => void;
  }
}

function cleanParams(params: AnalyticsParams = {}) {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined),
  ) as Record<string, string | number | undefined>;
}

const ATTRIBUTION_KEY = "logocut_attribution";
const UTM_KEYS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
] as const;

function getStoredAttribution() {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    const raw = window.localStorage.getItem(ATTRIBUTION_KEY);

    if (!raw) {
      return {};
    }

    return JSON.parse(raw) as Pick<
      AnalyticsParams,
      | "utm_source"
      | "utm_medium"
      | "utm_campaign"
      | "utm_content"
      | "utm_term"
      | "landing_page"
    >;
  } catch {
    return {};
  }
}

export function captureAttribution() {
  if (typeof window === "undefined") {
    return;
  }

  const params = new URLSearchParams(window.location.search);
  const attribution: Record<string, string> = {};

  for (const key of UTM_KEYS) {
    const value = params.get(key);

    if (value) {
      attribution[key] = value.slice(0, 120);
    }
  }

  if (Object.keys(attribution).length === 0) {
    return;
  }

  attribution.landing_page = window.location.pathname;
  window.localStorage.setItem(ATTRIBUTION_KEY, JSON.stringify(attribution));
}

export function trackEvent(
  eventName: AnalyticsEventName,
  params: AnalyticsParams = {},
) {
  if (typeof window === "undefined" || typeof window.gtag !== "function") {
    return;
  }

  window.gtag("event", eventName, cleanParams({ ...getStoredAttribution(), ...params }));
}

export function trackPurchaseOnce(params: {
  transactionId: string;
  value: number;
  cutType: CutType;
}) {
  if (typeof window === "undefined" || !params.transactionId) {
    return;
  }

  const storageKey = `logocut_purchase_${params.transactionId}`;

  if (window.localStorage.getItem(storageKey)) {
    return;
  }

  window.localStorage.setItem(storageKey, "1");

  trackEvent("purchase_completed", {
    currency: "USD",
    value: params.value,
    cut_type: params.cutType,
    transaction_id: params.transactionId,
  });
  trackEvent("purchase", {
    currency: "USD",
    value: params.value,
    cut_type: params.cutType,
    transaction_id: params.transactionId,
  });
}
