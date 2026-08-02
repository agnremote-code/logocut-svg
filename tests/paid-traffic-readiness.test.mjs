import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  ATTRIBUTION_MAX_AGE_MS,
  parseAttributionSearch,
  resolveAttribution,
} from "../lib/attribution.ts";
import {
  createPurchaseAnalyticsParams,
  sanitizeAnalyticsParams,
} from "../lib/analytics-payload.ts";

async function source(path) {
  return readFile(new URL(path, import.meta.url), "utf8");
}

test("paid attribution captures every approved campaign parameter", () => {
  assert.deepEqual(
    parseAttributionSearch(
      "?utm_source=google&utm_medium=cpc&utm_campaign=first_test" +
        "&utm_content=logo_ad&utm_term=logo%20to%20svg" +
        "&gclid=click_123&gbraid=gbraid-123&wbraid=wbraid.123",
    ),
    {
      utm_source: "google",
      utm_medium: "cpc",
      utm_campaign: "first_test",
      utm_content: "logo_ad",
      utm_term: "logo to svg",
      gclid: "click_123",
      gbraid: "gbraid-123",
      wbraid: "wbraid.123",
    },
  );
});

test("direct traffic does not overwrite recent paid attribution", () => {
  const now = Date.UTC(2026, 6, 23);
  const storedValue = JSON.stringify({
    utm_source: "google",
    utm_medium: "cpc",
    utm_campaign: "first_test",
    gclid: "click_123",
    captured_at: now - 1000,
  });

  const direct = resolveAttribution({
    search: "",
    storedValue,
    now,
  });
  const explicitDirect = resolveAttribution({
    search: "?utm_source=direct&utm_medium=(none)",
    storedValue,
    now,
  });

  assert.equal(direct.shouldPersist, true);
  assert.equal(explicitDirect.shouldPersist, true);
  assert.equal(direct.attribution.gclid, undefined);
  assert.equal(explicitDirect.attribution.gclid, undefined);
  assert.equal(explicitDirect.attribution.utm_campaign, "first_test");
  assert.doesNotMatch(explicitDirect.storedValue, /click_123|gclid/);
});

test("raw click identifiers are transient and never persisted", () => {
  const resolved = resolveAttribution({
    search:
      "?utm_source=google&utm_medium=cpc&utm_campaign=measurement_test" +
      "&gclid=TEST_ATTRIBUTION_VALUE&gbraid=TEST_GBRAID&wbraid=TEST_WBRAID",
    storedValue: null,
    now: Date.UTC(2026, 7, 2),
  });

  assert.equal(resolved.attribution.gclid, "TEST_ATTRIBUTION_VALUE");
  assert.equal(resolved.attribution.gbraid, "TEST_GBRAID");
  assert.equal(resolved.attribution.wbraid, "TEST_WBRAID");
  assert.deepEqual(JSON.parse(resolved.storedValue), {
    utm_source: "google",
    utm_medium: "cpc",
    utm_campaign: "measurement_test",
    captured_at: Date.UTC(2026, 7, 2),
  });
  assert.doesNotMatch(
    resolved.storedValue,
    /TEST_ATTRIBUTION_VALUE|TEST_GBRAID|TEST_WBRAID|gclid|gbraid|wbraid/,
  );
});

test("new paid traffic replaces stale attribution and expired data is ignored", () => {
  const now = Date.UTC(2026, 6, 23);
  const expired = JSON.stringify({
    utm_source: "old",
    utm_medium: "cpc",
    captured_at: now - ATTRIBUTION_MAX_AGE_MS - 1,
  });
  const next = resolveAttribution({
    search: "?utm_source=google&utm_medium=cpc&utm_campaign=new_test",
    storedValue: expired,
    now,
  });

  assert.equal(next.shouldPersist, true);
  assert.deepEqual(next.attribution, {
    utm_source: "google",
    utm_medium: "cpc",
    utm_campaign: "new_test",
  });
  assert.deepEqual(
    resolveAttribution({ search: "", storedValue: expired, now }).attribution,
    {},
  );
});

test("attribution and analytics sanitizers reject personal or secret data", () => {
  assert.deepEqual(
    parseAttributionSearch(
      "?utm_source=person%40example.com&gclid=bad%20click%20id&utm_campaign=safe",
    ),
    { utm_campaign: "safe" },
  );

  assert.deepEqual(
    sanitizeAnalyticsParams({
      source_page: "person@example.com",
      utm_campaign: "api_key=secret-value",
      product_type: "single_svg",
      cut_type: "single",
      currency: "USD",
      value: 5,
      // Runtime misuse must not make an unknown sensitive field eligible.
      email: "person@example.com",
    }),
    {
      product_type: "single_svg",
      cut_type: "single",
      currency: "USD",
      value: 5,
    },
  );
});

test("purchase builder returns the complete GA4 ecommerce payload", () => {
  assert.deepEqual(
    createPurchaseAnalyticsParams({
      transactionId: "paypal-order-test",
      value: 12,
      cutType: "multi",
      productType: "complete_pack",
    }),
    {
      transaction_id: "paypal-order-test",
      value: 12,
      currency: "USD",
      product_type: "complete_pack",
      cut_type: "multi",
      items: [
        {
          item_id: "complete_pack",
          item_name: "Complete SVG Pack",
          price: 12,
          quantity: 1,
          product_type: "complete_pack",
          cut_type: "multi",
        },
      ],
    },
  );
});

test("purchase analytics retain transaction deduplication", async () => {
  const analytics = await source("../lib/analytics.ts");

  assert.match(analytics, /logocut_purchase_\$\{params\.transactionId\}/);
  assert.match(analytics, /purchaseMemory\.has\(params\.transactionId\)/);
  assert.match(analytics, /window\.localStorage\.getItem\(storageKey\)/);
  assert.match(analytics, /window\.localStorage\.setItem\(storageKey, "1"\)/);
  assert.match(analytics, /trackEvent\("purchase", purchaseParams\)/);
  assert.match(analytics, /trackEvent\("purchase_completed", purchaseParams\)/);
});

test("the requested funnel events remain wired to product surfaces", async () => {
  const files = await Promise.all(
    [
      "../components/home-page.tsx",
      "../components/paid-landing-analytics.tsx",
      "../components/conversion-uploader.tsx",
      "../components/conversion-studio.tsx",
      "../components/paypal-checkout.tsx",
      "../components/marketing-signup-card.tsx",
      "../app/result/[jobId]/result-client.tsx",
    ].map(source),
  );
  const implementation = files.join("\n");

  for (const eventName of [
    "homepage_view",
    "landing_page_view",
    "paid_landing_view",
    "uploader_visible",
    "file_picker_clicked",
    "file_selected",
    "file_accepted",
    "upload_completed",
    "sample_demo_started",
    "sample_preview_generated",
    "preview_requested",
    "preview_displayed",
    "checkout_viewed",
    "checkout_clicked",
    "paypal_order_created",
    "paypal_opened",
    "generation_failed",
    "purchase",
    "purchase_completed",
    "svg_downloaded",
    "marketing_opt_in_completed",
  ]) {
    assert.match(implementation + (await source("../lib/analytics.ts")), new RegExp(`"${eventName}"`));
  }
});

test("GA4 is documented and disabled safely until a measurement ID exists", async () => {
  const provider = await source("../components/analytics-provider.tsx");
  const layout = await source("../app/layout.tsx");
  const envExample = await source("../.env.local.example");

  assert.match(layout, /NEXT_PUBLIC_GA_MEASUREMENT_ID/);
  assert.match(provider, /getCurrentAttribution\(\)/);
  assert.match(layout, /window\.dataLayer = window\.dataLayer \|\| \[\]/);
  assert.match(layout, /window\.__logocutGaConfigured/);
  assert.match(layout, /send_page_view: false/);
  assert.match(layout, /allow_google_signals: false/);
  assert.match(layout, /allow_ad_personalization_signals: false/);
  assert.match(provider, /trackPageViewOnce/);
  assert.match(provider, /markAnalyticsReady/);
  assert.match(envExample, /NEXT_PUBLIC_GA_MEASUREMENT_ID/);
});
