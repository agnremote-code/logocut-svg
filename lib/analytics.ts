"use client";

import { CutType } from "@/lib/job-types";

type AnalyticsEventName =
  | "homepage_view"
  | "uploader_clicked"
  | "upload_started"
  | "upload_completed"
  | "preview_requested"
  | "preview_generated"
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
  | "checkout_viewed"
  | "final_svg_generation_started"
  | "final_svg_ready"
  | "purchase";

type AnalyticsParams = {
  cut_type?: CutType;
  source_page?: string;
  file_type?: string;
  currency?: "USD";
  transaction_id?: string;
  sample?: string;
  position_bucket?: number;
  setting?: string;
  value?: number | string;
  view_mode?: string;
  background?: string;
  direction?: string;
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

export function trackEvent(
  eventName: AnalyticsEventName,
  params: AnalyticsParams = {},
) {
  if (typeof window === "undefined" || typeof window.gtag !== "function") {
    return;
  }

  window.gtag("event", eventName, cleanParams(params));
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
