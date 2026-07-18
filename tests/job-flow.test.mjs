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

test("server prices remain five and nine dollars", async () => {
  const pricing = await readFile(new URL("../lib/pricing.ts", import.meta.url), "utf8");
  assert.match(pricing, /single[\s\S]*amountCents:\s*500/);
  assert.match(pricing, /multi[\s\S]*amountCents:\s*900/);
});
