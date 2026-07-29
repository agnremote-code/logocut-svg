import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { sanitizeAnalyticsParams } from "../lib/analytics-payload.ts";

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
        "../components/conversion-uploader.tsx",
        "../components/paypal-checkout.tsx",
        "../app/result/[jobId]/result-client.tsx",
      ].map(source),
    )
  ).join("\n");

  for (const eventName of [
    "landing_page_view",
    "uploader_clicked",
    "upload_started",
    "file_accepted",
    "upload_completed",
    "preview_requested",
    "preview_generated",
    "preview_displayed",
    "preview_failed",
    "pricing_viewed",
    "checkout_viewed",
    "checkout_clicked",
    "paypal_order_created",
    "paypal_opened",
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
