import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { sanitizeAnalyticsParams } from "../lib/analytics-payload.ts";
import {
  createPaidLandingMetadata,
  getDeviceCategory,
} from "../lib/paid-landing-metadata.ts";

async function source(path) {
  return readFile(new URL(path, import.meta.url), "utf8");
}

test("paid landing page presents upload, preview-first pricing, and trust above the long copy", async () => {
  const page = await source("../app/[converter]/page.tsx");

  assert.match(page, /PaidLandingAnalytics/);
  assert.match(page, /Free preview first/);
  assert.match(page, /Single-color/);
  assert.match(page, /Layered/);
  assert.match(page, /Both SVGs/);
  assert.match(page, /\$12/);
  assert.match(page, /ConversionUploader/);
  assert.match(page, /PaidLandingSample/);
  assert.ok(
    page.indexOf("ConversionUploader") < page.indexOf("page.sections.map"),
    "the real uploader should appear before long-form landing copy",
  );
});

test("paid landing funnel wires every observable pre-purchase step", async () => {
  const implementation = (
    await Promise.all(
      [
        "../components/paid-landing-analytics.tsx",
        "../components/paid-landing-sample.tsx",
        "../components/conversion-uploader.tsx",
        "../components/paypal-checkout.tsx",
        "../app/result/[jobId]/result-client.tsx",
      ].map(source),
    )
  ).join("\n");

  for (const eventName of [
    "landing_page_view",
    "paid_landing_view",
    "uploader_visible",
    "uploader_clicked",
    "file_picker_clicked",
    "file_selected",
    "upload_started",
    "file_accepted",
    "upload_completed",
    "sample_demo_started",
    "sample_preview_generated",
    "preview_requested",
    "preview_generated",
    "preview_displayed",
    "preview_failed",
    "pricing_viewed",
    "checkout_viewed",
    "checkout_clicked",
    "paypal_order_created",
    "paypal_opened",
    "svg_downloaded",
    "generation_failed",
  ]) {
    assert.match(implementation, new RegExp(`"${eventName}"`));
  }
});

test("paid funnel analytics discard private identifiers and customer data", () => {
  assert.deepEqual(
    sanitizeAnalyticsParams({
      source_page: "png-to-svg",
      product_type: "complete_pack",
      cut_type: "multi",
      file_type: "image/png",
      value: 12,
      currency: "USD",
      filename: "customer-logo.png",
      job_id: "private-job-id",
      payer_email: "buyer@example.com",
      provider_error: "private provider response",
      unsubscribe_token: "private-token",
    }),
    {
      source_page: "png-to-svg",
      product_type: "complete_pack",
      cut_type: "multi",
      file_type: "image/png",
      value: 12,
      currency: "USD",
    },
  );
});

test("sample demonstration uses real assets without creating a job or PayPal order", async () => {
  const sample = await source("../components/paid-landing-sample.tsx");

  assert.match(sample, /Try With a Sample Image/);
  assert.match(sample, /northline-original\.png/);
  assert.match(sample, /northline\.svg/);
  assert.match(sample, /sample_demo_started/);
  assert.match(sample, /sample_preview_generated/);
  assert.match(sample, /demonstration only/i);
  assert.doesNotMatch(sample, /fetch\(/);
  assert.doesNotMatch(sample, /\/api\/jobs/);
  assert.doesNotMatch(sample, /\/api\/paypal\/orders/);
  assert.doesNotMatch(sample, /PayPalCheckout|paypal\.Buttons/);
});

test("paid landing metadata reports safe attribution flags and device category", () => {
  assert.deepEqual(
    createPaidLandingMetadata({
      attribution: {
        utm_source: "google",
        utm_medium: "cpc",
        utm_campaign: "first_test",
        gclid: "click_123",
      },
      sourcePage: "png-to-svg",
      userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
      viewportWidth: 1440,
    }),
    {
      source_page: "png-to-svg",
      source: "google",
      medium: "cpc",
      campaign: "first_test",
      device_category: "desktop",
      has_gclid: true,
      has_utm: true,
    },
  );

  assert.equal(
    getDeviceCategory({
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)",
      viewportWidth: 390,
    }),
    "mobile",
  );
});

test("safe analytics sanitizer accepts landing flags but rejects private fields", () => {
  assert.deepEqual(
    sanitizeAnalyticsParams({
      source_page: "png-to-svg",
      source: "google",
      medium: "cpc",
      campaign: "first_test",
      device_category: "desktop",
      has_gclid: true,
      has_utm: true,
      job_id: "private-job-id",
      filename: "customer-logo.png",
      email: "buyer@example.com",
    }),
    {
      source_page: "png-to-svg",
      source: "google",
      medium: "cpc",
      campaign: "first_test",
      device_category: "desktop",
      has_gclid: true,
      has_utm: true,
    },
  );
});

test("development funnel diagnostics receive sanitized params before GA availability checks", async () => {
  const analytics = await source("../lib/analytics.ts");
  const diagnostics = await source("../lib/funnel-diagnostics.ts");

  assert.ok(
    analytics.indexOf("recordFunnelDiagnostic(eventName, cleanParams)") <
      analytics.indexOf(
        "!process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim()",
      ),
  );
  assert.match(diagnostics, /process\.env\.NODE_ENV !== "development"/);
  assert.match(diagnostics, /__logocutFunnelDiagnostics/);
  assert.match(diagnostics, /diagnostics\.slice\(-99\)/);
  assert.doesNotMatch(diagnostics, /localStorage|sessionStorage|fetch\(/);
});

test("failed previews preserve the selected image and expose a safe retry path", async () => {
  const uploader = await source("../components/conversion-uploader.tsx");

  assert.match(uploader, /setSelectedFile\(file\)/);
  assert.match(uploader, /setError\(previewFailureMessages\[failureCode\]\)/);
  assert.match(uploader, /preview_failed/);
  assert.match(uploader, /Generate Free SVG Preview/);
  assert.doesNotMatch(
    uploader,
    /previewPayload\.detail|provider_error|selectedFile\.name[\s\S]*trackEvent/,
  );
});
