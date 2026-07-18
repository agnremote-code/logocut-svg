import test from "node:test";
import assert from "node:assert/strict";
import { canCheckoutJob, canDownloadJob, canonicalStateForLegacyJob } from "../lib/job-flow.js";

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
