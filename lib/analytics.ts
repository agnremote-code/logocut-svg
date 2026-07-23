"use client";

import { CutType, OneTimeProductType } from "@/lib/job-types";
import { getCurrentAttribution, PaidAttribution } from "@/lib/attribution";
import {
  createPurchaseAnalyticsParams,
  sanitizeAnalyticsParams,
} from "@/lib/analytics-payload";

type AnalyticsEventName =
  | "homepage_view"
  | "uploader_clicked"
  | "upload_started"
  | "upload_completed"
  | "preview_requested"
  | "preview_generated"
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
  | "checkout_viewed"
  | "final_svg_generation_started"
  | "final_svg_ready"
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
    gtag?: (
      command: "event",
      eventName: string,
      params?: Record<string, unknown>,
    ) => void;
    __logocutAnalyticsQueue?: Array<{
      eventName: AnalyticsEventName;
      params: Record<string, unknown>;
    }>;
  }
}

const purchaseMemory = new Set<string>();

export function trackEvent(
  eventName: AnalyticsEventName,
  params: AnalyticsParams = {},
) {
  if (
    typeof window === "undefined" ||
    !process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim()
  ) {
    return false;
  }

  const cleanParams = sanitizeAnalyticsParams({
    ...getCurrentAttribution(),
    ...params,
  });

  if (typeof window.gtag === "function") {
    window.gtag("event", eventName, cleanParams);
    return true;
  }

  window.__logocutAnalyticsQueue = window.__logocutAnalyticsQueue ?? [];

  if (window.__logocutAnalyticsQueue.length < 50) {
    window.__logocutAnalyticsQueue.push({ eventName, params: cleanParams });
    return true;
  }

  return false;
}

export function flushAnalyticsQueue() {
  if (typeof window === "undefined" || typeof window.gtag !== "function") {
    return;
  }

  const queue = window.__logocutAnalyticsQueue ?? [];
  window.__logocutAnalyticsQueue = [];

  for (const event of queue) {
    window.gtag("event", event.eventName, event.params);
  }
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
