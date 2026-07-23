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

  assert.equal(direct.shouldPersist, false);
  assert.equal(explicitDirect.shouldPersist, false);
  assert.equal(direct.attribution.gclid, "click_123");
  assert.equal(explicitDirect.attribution.utm_campaign, "first_test");
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
      "../components/conversion-studio.tsx",
      "../components/paypal-checkout.tsx",
      "../components/marketing-signup-card.tsx",
      "../app/result/[jobId]/result-client.tsx",
    ].map(source),
  );
  const implementation = files.join("\n");

  for (const eventName of [
    "homepage_view",
    "upload_completed",
    "preview_requested",
    "preview_displayed",
    "checkout_viewed",
    "paypal_order_created",
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
  const envExample = await source("../.env.local.example");

  assert.match(provider, /NEXT_PUBLIC_GA_MEASUREMENT_ID/);
  assert.match(provider, /getCurrentAttribution\(\)/);
  assert.match(provider, /send_page_view: false/);
  assert.match(provider, /allow_google_signals: false/);
  assert.match(provider, /allow_ad_personalization_signals: false/);
  assert.match(envExample, /NEXT_PUBLIC_GA_MEASUREMENT_ID/);
});
