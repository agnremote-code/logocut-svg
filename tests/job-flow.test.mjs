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

test("Complete Pack defaults to layered preview while preserving single preview switching", async () => {
  const source = await readFile(new URL("../components/conversion-studio.tsx", import.meta.url), "utf8");
  assert.match(source, /nextProductType === "complete_pack" && cut !== "multi"/);
  assert.match(source, /setCut\("multi"\)/);
  assert.match(source, /Colors are intentionally simplified for vinyl, decals and silhouette cuts\./);
  assert.match(source, /Colors are separated into layered shapes for multi-color projects\./);
  assert.match(source, /Single-Color Preview/);
  assert.match(source, /Layered Preview/);
  assert.match(source, /resultLabel=\{cut === "single" \? "Single-Color Preview" : "Layered Preview"\}/);
});

test("preview failures use safe code-based messages and support retry without reupload", async () => {
  const source = await readFile(new URL("../components/conversion-studio.tsx", import.meta.url), "utf8");
  assert.match(source, /network_error:\s*"The preview service could not be reached\. Please retry\."/);
  assert.match(source, /missing_credentials:\s*"Preview service is temporarily unavailable\."/);
  assert.match(source, /vectorizer_error:\s*"We couldn’t generate this preview right now\. Please retry\."/);
  assert.match(source, /invalid_input:\s*"This image could not be processed\. Try another PNG or JPG\."/);
  assert.match(source, /preview_failed/);
  assert.match(source, /preview_retry_clicked/);
  assert.match(source, /preview_failure_code/);
  assert.match(source, /preview_mode/);
  assert.match(source, /PreviewGenerationError/);
  assert.match(source, /Retry Preview/);
  assert.match(source, /Choose Another Image/);
  assert.doesNotMatch(source, /previewPayload\.detail/);
  assert.doesNotMatch(source, /Try a clearer logo/);
});

test("checkout supports optional recovery email without requiring accounts", async () => {
  const paypal = await readFile(new URL("../app/api/paypal/orders/route.ts", import.meta.url), "utf8");
  const checkout = await readFile(new URL("../components/paypal-checkout.tsx", import.meta.url), "utf8");
  const result = await readFile(new URL("../app/result/[jobId]/result-client.tsx", import.meta.url), "utf8");
  assert.match(paypal, /validateOptionalEmail\(payload\.recoveryEmail\)/);
  assert.match(paypal, /saveRecoveryEmailRequest/);
  assert.match(checkout, /recoveryEmail\?: string/);
  assert.match(checkout, /recoveryEmail/);
  assert.match(result, /Email me my download link/);
  assert.match(result, /Optional\. Your purchase still works without email\./);
});

test("recovery email validation normalizes valid emails and rejects invalid emails", async () => {
  const source = await readFile(new URL("../lib/secure-email.ts", import.meta.url), "utf8");
  assert.match(source, /return value\.trim\(\)\.toLowerCase\(\)/);
  assert.match(source, /EMAIL_PATTERN\.test\(email\)/);
  assert.match(source, /Invalid email address\./);
});

test("email provider unavailable disables delivery without blocking capture", async () => {
  const email = await readFile(new URL("../lib/recovery-email.ts", import.meta.url), "utf8");
  const capture = await readFile(new URL("../app/api/paypal/orders/[orderId]/capture/route.ts", import.meta.url), "utf8");
  assert.match(email, /markRecoveryEmailDisabled/);
  assert.match(email, /!apiKey \|\| !from \|\| !email \|\| !token/);
  assert.match(capture, /sendRecoveryEmailWithoutBlocking/);
  assert.match(capture, /delivery failed without blocking checkout/);
});

test("successful recovery email uses a signed link and no raw Blob URLs", async () => {
  const email = await readFile(new URL("../lib/recovery-email.ts", import.meta.url), "utf8");
  assert.match(email, /https:\/\/api\.resend\.com\/emails/);
  assert.match(email, /createRecoveryToken/);
  assert.match(email, /\/recover\/\$\{encodeURIComponent\(token\)\}/);
  assert.doesNotMatch(email, /previewSvgUrl/);
  assert.doesNotMatch(email, /finalSvgUrl/);
});

test("recovery tokens fail safely when expired or modified", async () => {
  const token = await readFile(new URL("../lib/recovery-token.ts", import.meta.url), "utf8");
  const page = await readFile(new URL("../app/recover/[token]/page.tsx", import.meta.url), "utf8");
  assert.match(token, /timingSafeEqual/);
  assert.match(token, /reason: "expired"/);
  assert.match(token, /reason: "invalid"/);
  assert.match(token, /verifyRecoveryTokenForJob/);
  assert.match(page, /This download link is no longer valid/);
});

test("recovery link cannot authorize a different job", async () => {
  const token = await readFile(new URL("../lib/recovery-token.ts", import.meta.url), "utf8");
  assert.match(token, /verifyRecoveryTokenForJob/);
  assert.match(token, /result\.jobId !== jobId/);
});

test("refresh restores unpaid previews and paid results from existing stores", async () => {
  const clientStore = await readFile(new URL("../lib/client-job-store.ts", import.meta.url), "utf8");
  const studio = await readFile(new URL("../components/conversion-studio.tsx", import.meta.url), "utf8");
  const result = await readFile(new URL("../app/result/[jobId]/result-client.tsx", import.meta.url), "utf8");
  assert.match(clientStore, /ACTIVE_CONVERSION_KEY/);
  assert.match(clientStore, /saveActiveConversion/);
  assert.match(studio, /restoreActiveConversion/);
  assert.match(studio, /Your previous preview was restored\./);
  assert.match(studio, /Your paid result is still available\./);
  assert.match(result, /saveActiveConversion/);
});

test("changed output invalidates stale preview and demo assets never mix with uploads", async () => {
  const studio = await readFile(new URL("../components/conversion-studio.tsx", import.meta.url), "utf8");
  assert.match(studio, /resetStalePreviewAfterModeChange/);
  assert.match(studio, /clearActiveConversion\(\)/);
  assert.match(studio, /state === "demo"/);
  assert.match(studio, /state === "file_selected"/);
  assert.match(studio, /previewCut === cut/);
});

test("purchase analytics are deduplicated and do not send private job data", async () => {
  const analytics = await readFile(new URL("../lib/analytics.ts", import.meta.url), "utf8");
  assert.match(analytics, /trackPurchaseOnce/);
  assert.match(analytics, /localStorage\.getItem\(storageKey\)/);
  assert.doesNotMatch(analytics, /email\?:/);
  assert.doesNotMatch(analytics, /email_address/);
  assert.doesNotMatch(analytics, /fileName/);
  assert.doesNotMatch(analytics, /jobId/);
});

test("funnel analytics and UTM attribution use safe event names", async () => {
  const analytics = await readFile(new URL("../lib/analytics.ts", import.meta.url), "utf8");
  for (const event of [
    "landing_page_view",
    "file_accepted",
    "preview_started",
    "preview_failed",
    "preview_retry_clicked",
    "preview_displayed",
    "product_selected",
    "checkout_started",
    "purchase_completed",
    "final_svg_ready",
    "download_clicked",
    "recovery_email_requested",
    "recovery_email_sent",
    "recovery_link_opened",
    "new_conversion_started",
  ]) {
    assert.match(analytics, new RegExp(`"${event}"`));
  }
  assert.match(analytics, /captureAttribution/);
  assert.match(analytics, /utm_source/);
});

test("Convert another image clears paid state safely", async () => {
  const result = await readFile(new URL("../app/result/[jobId]/result-client.tsx", import.meta.url), "utf8");
  assert.match(result, /Need another file converted\?/);
  assert.match(result, /Convert another image/);
  assert.match(result, /clearActiveConversion\(\)/);
  assert.match(result, /new_conversion_started/);
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
