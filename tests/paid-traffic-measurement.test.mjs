import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  createPaidRequestReceipt,
  parsePaidBeaconPayload,
  preserveQueryOnCanonicalUrl,
} from "../lib/paid-traffic-receipt.ts";
import { flushQueuedAnalyticsEvents } from "../lib/analytics-queue.ts";
import {
  getGaCampaignFields,
  getGaPageLocation,
} from "../lib/ga-attribution.ts";
import { sanitizeAnalyticsEventParams } from "../lib/analytics-payload.ts";

async function source(path) {
  return readFile(new URL(path, import.meta.url), "utf8");
}

test("explicit page_view is deduplicated and GA config is issued once", async () => {
  const analytics = await source("../lib/analytics.ts");
  const provider = await source("../components/analytics-provider.tsx");
  const layout = await source("../app/layout.tsx");

  assert.match(analytics, /trackPageViewOnce/);
  assert.match(analytics, /__logocutPageViews\.has\(pagePath\)/);
  assert.match(analytics, /__logocutPageViews\.add\(pagePath\)/);
  assert.equal((layout.match(/window\.gtag\('config'/g) ?? []).length, 1);
  assert.equal((provider.match(/trackPageViewOnce\(/g) ?? []).length, 1);
  assert.match(layout, /send_page_view: false/);
  assert.match(layout, /page_location: window\.location\.href\.split\('#'\)\[0\]/);
});

test("pre-load events queue until the external GA library is ready", async () => {
  const analytics = await source("../lib/analytics.ts");
  const provider = await source("../components/analytics-provider.tsx");
  const layout = await source("../app/layout.tsx");

  assert.match(analytics, /!window\.__logocutGaReady/);
  assert.match(analytics, /__logocutAnalyticsQueue\.push/);
  assert.match(analytics, /export function markAnalyticsReady/);
  assert.match(analytics, /window\.__logocutGaReady = true/);
  assert.match(analytics, /return flushAnalyticsQueue\(\)/);
  assert.match(layout, /strategy="beforeInteractive"/);
  assert.match(provider, /onLoad=\{\(\) => \{/);
  assert.match(provider, /markAnalyticsReady\(\)/);
});

test("queued analytics events flush once", () => {
  const queue = [
    { eventName: "page_view", params: { page_path: "/png-to-svg" } },
    { eventName: "paid_landing_view", params: { has_gclid: true } },
  ];
  const dispatched = [];

  assert.equal(
    flushQueuedAnalyticsEvents(queue, (event) => dispatched.push(event)),
    2,
  );
  assert.equal(queue.length, 0);
  assert.equal(
    flushQueuedAnalyticsEvents(queue, (event) => dispatched.push(event)),
    0,
  );
  assert.deepEqual(
    dispatched.map((event) => event.eventName),
    ["page_view", "paid_landing_view"],
  );
});

test("GA page location preserves campaign attribution and removes only the fragment", () => {
  assert.equal(
    getGaPageLocation(
      "https://www.logocutsvg.com/png-to-svg?utm_source=google&utm_medium=cpc&utm_campaign=measurement_test&utm_term=png%20to%20svg&utm_content=ad-1&gclid=TEST_ATTRIBUTION_VALUE&gbraid=TEST_GBRAID&wbraid=TEST_WBRAID#studio",
    ),
    "https://www.logocutsvg.com/png-to-svg?utm_source=google&utm_medium=cpc&utm_campaign=measurement_test&utm_term=png%20to%20svg&utm_content=ad-1&gclid=TEST_ATTRIBUTION_VALUE&gbraid=TEST_GBRAID&wbraid=TEST_WBRAID",
  );
});

test("UTMs map to GA campaign fields without click identifiers", () => {
  const campaignFields = getGaCampaignFields({
    utm_source: "google",
    utm_medium: "cpc",
    utm_campaign: "measurement_test",
    utm_term: "png to svg",
    utm_content: "responsive_ad",
    gclid: "TEST_ATTRIBUTION_VALUE",
  });

  assert.deepEqual(campaignFields, {
    campaign_source: "google",
    campaign_medium: "cpc",
    campaign_name: "measurement_test",
    campaign_term: "png to svg",
    campaign_content: "responsive_ad",
  });
  assert.doesNotMatch(JSON.stringify(campaignFields), /TEST_ATTRIBUTION_VALUE/);
});

test("paid request receipt records safe flags without raw click identifiers", () => {
  const receipt = createPaidRequestReceipt({
    url: new URL(
      "https://www.logocutsvg.com/png-to-svg?utm_source=google&utm_medium=cpc&utm_campaign=first_test&gclid=RAW_CLICK_ID",
    ),
    userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
    referrer: "https://www.google.com/search?q=private",
    visitId: "visit_123",
    now: new Date("2026-07-31T13:45:00.000Z"),
  });

  assert.deepEqual(receipt, {
    event_type: "paid_landing_request",
    timestamp_bucket: "2026-07-31T13:00:00Z",
    route: "/png-to-svg",
    source: "google",
    medium: "cpc",
    campaign: "first_test",
    has_gclid: true,
    has_utm: true,
    device_category: "desktop",
    referrer_host: "www.google.com",
    visit_id: "visit_123",
  });
  assert.doesNotMatch(JSON.stringify(receipt), /RAW_CLICK_ID|search\?q/);
});

test("UTM paid receipt works and organic requests are not mislabeled", () => {
  const paid = createPaidRequestReceipt({
    url: new URL(
      "https://www.logocutsvg.com/png-to-svg?utm_source=google&utm_medium=cpc&utm_campaign=synthetic_test",
    ),
    userAgent: "mobile",
    visitId: "visit_456",
  });
  const organic = createPaidRequestReceipt({
    url: new URL("https://www.logocutsvg.com/png-to-svg"),
    userAgent: "desktop",
    visitId: "visit_789",
  });

  assert.equal(paid?.event_type, "paid_landing_request");
  assert.equal(paid?.has_gclid, false);
  assert.equal(paid?.has_utm, true);
  assert.equal(organic, null);
});

test("first-party beacon schema is strict and rejects personal data", () => {
  const valid = {
    event_type: "paid_landing_client_beacon",
    route: "/png-to-svg",
    source: "google",
    medium: "cpc",
    campaign: "first_test",
    has_gclid: true,
    has_utm: true,
    device_category: "desktop",
    referrer_host: "www.google.com",
  };

  assert.deepEqual(parsePaidBeaconPayload(valid), valid);
  assert.equal(
    parsePaidBeaconPayload({ ...valid, email: "buyer@example.com" }),
    null,
  );
  assert.equal(
    parsePaidBeaconPayload({ ...valid, gclid: "RAW_CLICK_ID" }),
    null,
  );
  assert.equal(
    parsePaidBeaconPayload({ ...valid, filename: "customer-logo.png" }),
    null,
  );
});

test("canonical URL handling preserves attribution query and fragments", () => {
  assert.equal(
    preserveQueryOnCanonicalUrl(
      "http://logocutsvg.com/png-to-svg?utm_source=google&utm_medium=cpc&gclid=click_123#studio",
      "https://www.logocutsvg.com",
    ),
    "https://www.logocutsvg.com/png-to-svg?utm_source=google&utm_medium=cpc&gclid=click_123#studio",
  );
});

test("client beacon has sendBeacon and keepalive fetch fallback", async () => {
  const beacon = await source("../lib/paid-landing-beacon.ts");

  assert.match(beacon, /navigatorApi\?\.sendBeacon/);
  assert.match(beacon, /if \(beaconAccepted\)/);
  assert.match(beacon, /keepalive: true/);
  assert.match(beacon, /\/api\/analytics\/paid-landing/);
  assert.doesNotMatch(beacon, /gclid:|email|filename|payer|jobId/);
});

test("production diagnostics route is unavailable and performs no product actions", async () => {
  const page = await source(
    "../app/internal/analytics-diagnostics/page.tsx",
  );
  const client = await source(
    "../app/internal/analytics-diagnostics/analytics-diagnostics-client.tsx",
  );

  assert.match(page, /process\.env\.VERCEL_ENV === "production"/);
  assert.match(page, /notFound\(\)/);
  assert.doesNotMatch(client, /\/api\/jobs|\/api\/paypal|vectorize|checkout/);
});

test("structured measurement code never logs forbidden request data", async () => {
  const receipt = await source("../lib/paid-traffic-receipt.ts");
  const route = await source("../app/api/analytics/paid-landing/route.ts");
  const middleware = await source("../middleware.ts");
  const combined = `${receipt}\n${route}\n${middleware}`;

  assert.match(receipt, /\[LogoCut measurement\]/);
  assert.doesNotMatch(combined, /x-forwarded-for|request\.ip|payer_email/);
  assert.doesNotMatch(combined, /console\.(?:info|log)\([^\n]*(?:request|payload|body)/);
  assert.match(route, /cache-control.*no-store/i);
  assert.match(route, /body\.length > 2048/);
});

test("custom GA events use click-presence flags without raw click identifiers", async () => {
  const analytics = await source("../lib/analytics.ts");
  const payload = await source("../lib/analytics-payload.ts");

  assert.match(analytics, /has_gclid: Boolean/);
  assert.match(analytics, /sanitizeAnalyticsEventParams\(eventName/);
  assert.doesNotMatch(payload, /^\s*"gclid",/m);
  assert.doesNotMatch(payload, /^\s*"gbraid",/m);
  assert.doesNotMatch(payload, /^\s*"wbraid",/m);
  assert.doesNotMatch(payload, /^\s*"utm_source",/m);
  assert.match(payload, /^\s*"campaign_source",/m);

  const customEvent = sanitizeAnalyticsEventParams("paid_landing_view", {
    campaign_source: "google",
    campaign_medium: "cpc",
    has_gclid: true,
    gclid: "TEST_ATTRIBUTION_VALUE",
    page_location:
      "https://www.logocutsvg.com/png-to-svg?gclid=TEST_ATTRIBUTION_VALUE",
  });
  assert.deepEqual(customEvent, {
    campaign_source: "google",
    campaign_medium: "cpc",
    has_gclid: true,
  });
  assert.doesNotMatch(JSON.stringify(customEvent), /TEST_ATTRIBUTION_VALUE/);

  const pageView = sanitizeAnalyticsEventParams("page_view", {
    page_location:
      "https://www.logocutsvg.com/png-to-svg?gclid=TEST_ATTRIBUTION_VALUE",
  });
  assert.match(pageView.page_location, /gclid=TEST_ATTRIBUTION_VALUE/);
});

test("sample and purchase protections remain unchanged", async () => {
  const sample = await source("../components/paid-landing-sample.tsx");
  const analytics = await source("../lib/analytics.ts");

  assert.doesNotMatch(sample, /fetch\(|\/api\/jobs|\/api\/paypal\/orders/);
  assert.match(analytics, /logocut_purchase_\$\{params\.transactionId\}/);
  assert.match(analytics, /purchaseMemory\.has\(params\.transactionId\)/);
});
