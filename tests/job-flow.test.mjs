import test from "node:test";
import assert from "node:assert/strict";
import { canCheckoutJob, canDownloadJob, canonicalStateForLegacyJob } from "../lib/job-flow.js";
import { readFile } from "node:fs/promises";

test("checkout requires a persisted matching unpaid preview", () => {
  const ready = { paymentStatus:"unpaid", previewStatus:"ready", previewPathname:"jobs/one/preview.svg", settingsHash:"a", previewSettingsHash:"a" };
  assert.equal(canCheckoutJob(ready), true);
  assert.equal(canCheckoutJob({ ...ready, previewPathname:undefined }), false);
  assert.equal(canCheckoutJob({ ...ready, previewSettingsHash:"b" }), false);
  assert.equal(canCheckoutJob({ ...ready, paymentStatus:"paid" }), false);
});

test("download requires paid status and a ready clean artifact", () => {
  const ready = { paymentStatus:"paid", finalStatus:"ready", finalPathname:"jobs/one/final.svg" };
  assert.equal(canDownloadJob(ready), true);
  assert.equal(canDownloadJob({ ...ready, paymentStatus:"unpaid" }), false);
  assert.equal(canDownloadJob({ ...ready, finalStatus:"processing" }), false);
});

test("legacy jobs receive backward-compatible canonical states", () => {
  assert.equal(canonicalStateForLegacyJob({ previewStatus:"ready", paymentStatus:"unpaid" }), "preview_ready");
  assert.equal(canonicalStateForLegacyJob({ previewStatus:"ready", paymentStatus:"paid", finalStatus:"ready" }), "final_svg_ready");
});

test("PayPal checkout uses one SDK loader and distinct operation errors", async () => {
  const source = await readFile(new URL("../components/paypal-checkout.tsx", import.meta.url), "utf8");
  assert.equal((source.match(/id="paypal-sdk"/g) ?? []).length, 1);
  assert.match(source, /Checkout could not be started\. Please try again\./);
  assert.match(source, /Payment could not be completed\. You were not charged\./);
  assert.doesNotMatch(source, /PayPal could not be loaded\. Please try again\./);
});

test("server prices remain five, nine, twelve, and nineteen dollars", async () => {
  const pricing = await readFile(new URL("../lib/pricing.ts", import.meta.url), "utf8");
  assert.match(pricing, /single[\s\S]*amountCents:\s*500/);
  assert.match(pricing, /multi[\s\S]*amountCents:\s*900/);
  assert.match(pricing, /complete_pack[\s\S]*amountCents:\s*1200/);
  assert.match(pricing, /LOGOCUT_UNLIMITED_PLAN[\s\S]*amountCents:\s*1900/);
  assert.match(pricing, /monthlyConversionLimit:\s*25/);
});

test("output types stay separate from product types", async () => {
  const source = await readFile(new URL("../lib/job-types.ts", import.meta.url), "utf8");
  const outputTypeLine = source.split("\n").find((line) => line.startsWith("export type OutputType"));
  assert.match(source, /export type OutputType = "single" \| "multi"/);
  assert.match(source, /export type ProductType =[\s\S]*"single_svg"[\s\S]*"layered_svg"[\s\S]*"complete_pack"[\s\S]*"unlimited_subscription"/);
  assert.doesNotMatch(outputTypeLine ?? "", /complete_pack/);
});

test("PayPal order pricing is server-authoritative and rejects client price manipulation", async () => {
  const source = await readFile(new URL("../app/api/paypal/orders/route.ts", import.meta.url), "utf8");
  assert.match(source, /getOneTimeProductPrice\(productType\)/);
  assert.match(source, /getExpectedPayPalAmount\(price\)/);
  assert.doesNotMatch(source, /payload\.price/);
  assert.doesNotMatch(source, /payload\.amount/);
});

test("Complete Pack capture generates both outputs and preserves partial success", async () => {
  const source = await readFile(new URL("../app/api/paypal/orders/[orderId]/capture/route.ts", import.meta.url), "utf8");
  assert.match(source, /getServerJobProductType\(latestPaidJob\) === "complete_pack"/);
  assert.match(source, /for \(const outputType of outputTypes\)/);
  assert.match(source, /hasServerJobFinalOutputSvg\(workingJob, outputType\)/);
  assert.match(source, /saveServerJobFinalOutputSvg/);
  assert.match(source, /failedOutputs\.push/);
});

test("duplicate PayPal capture returns success without rerunning final generation", async () => {
  const source = await readFile(new URL("../app/api/paypal/orders/[orderId]/capture/route.ts", import.meta.url), "utf8");
  assert.match(source, /hasServerJobFinalSvg\(job\) && job\.paymentStatus === "paid"/);
  assert.match(source, /Final generation already completed/);
});

test("production generation is not available before payment", async () => {
  const source = await readFile(new URL("../app/api/jobs/[jobId]/vectorize/route.ts", import.meta.url), "utf8");
  assert.match(source, /const mode = job\.paymentStatus === "paid" \? "production" : "test"/);
});

test("Complete Pack exposes two labeled downloads", async () => {
  const source = await readFile(new URL("../app/result/[jobId]/result-client.tsx", import.meta.url), "utf8");
  assert.match(source, /Download Single-Color SVG/);
  assert.match(source, /Download Layered SVG/);
  assert.match(source, /output=single/);
  assert.match(source, /output=multi/);
});

test("Complete Pack studio card is a product selection above preview generation", async () => {
  const source = await readFile(new URL("../components/conversion-studio.tsx", import.meta.url), "utf8");
  assert.match(source, /Best value/);
  assert.match(source, /Complete SVG Pack/);
  assert.match(source, /Both SVG versions from one upload/);
  assert.match(source, /Save \$2/);
  assert.match(source, /Single-Color Preview/);
  assert.match(source, /Layered Preview/);
  assert.match(source, /setProductType\(nextProductType\)/);
  assert.match(source, /product_type:\s*nextProductType/);
  assert.match(source, /price:\s*selectingCompletePack \? 12 : undefined/);
  assert.match(source, /source:\s*"studio_above_fold"/);
  assert.match(source, /Generate Free Preview/);
});

test("Vectorizer receives distinct single-color and layered output options", async () => {
  const source = await readFile(new URL("../lib/vectorizer.ts", import.meta.url), "utf8");
  assert.match(source, /function appendOutputOptions/);
  assert.match(source, /processing\.max_colors", "2"/);
  assert.match(source, /output\.shape_stacking", "cutouts"/);
  assert.match(source, /output\.group_by", "none"/);
  assert.match(source, /processing\.max_colors", "0"/);
  assert.match(source, /output\.shape_stacking", "stacked"/);
  assert.match(source, /output\.group_by", "color"/);
  assert.match(source, /appendOutputOptions\(formData, cutType\)/);
});

test("subscription statuses and usage ledger states are explicit", async () => {
  const source = await readFile(new URL("../lib/subscription-types.ts", import.meta.url), "utf8");
  for (const status of [
    "inactive",
    "checkout_pending",
    "active",
    "past_due",
    "cancelled_until_period_end",
    "expired",
  ]) {
    assert.match(source, new RegExp(`"${status}"`));
  }

  for (const status of ["reserved", "processing", "completed", "failed", "reversed"]) {
    assert.match(source, new RegExp(`"${status}"`));
  }
});
