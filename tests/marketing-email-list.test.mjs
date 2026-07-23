import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

async function source(path) {
  return readFile(new URL(path, import.meta.url), "utf8");
}

test("purchase remains possible without email signup", async () => {
  const checkout = await source("../components/paypal-checkout.tsx");
  const orderRoute = await source("../app/api/paypal/orders/route.ts");
  const captureRoute = await source("../app/api/paypal/orders/[orderId]/capture/route.ts");

  assert.doesNotMatch(checkout, /marketing\/signup/);
  assert.doesNotMatch(orderRoute, /marketing_contacts|normalizeMarketing/);
  assert.doesNotMatch(captureRoute, /marketing_contacts|normalizeMarketing/);
  assert.match(checkout, /fetch\("\/api\/paypal\/orders"/);
  assert.match(captureRoute, /markServerJobPaidWithPayPal/);
});

test("marketing card appears only after preview or paid result", async () => {
  const studio = await source("../components/conversion-studio.tsx");
  const result = await source("../app/result/[jobId]/result-client.tsx");

  assert.match(studio, /hasMatchingPreview \?/);
  assert.match(studio, /<MarketingSignupCard source="preview_inline" compact \/>/);
  assert.match(result, /previewAssetReady && paymentStatus !== "paid"/);
  assert.match(result, /source="preview_inline"/);
  assert.match(result, /\(isSvgReady \|\| hasAnyCompleteOutput\) && !marketingJoined/);
  assert.match(result, /source="post_purchase_result"/);
});

test("marketing consent checkbox is unchecked by default and required for signup", async () => {
  const card = await source("../components/marketing-signup-card.tsx");
  const route = await source("../app/api/marketing/signup/route.ts");
  const marketing = await source("../lib/marketing.ts");

  assert.match(card, /useState\(false\)/);
  assert.match(card, /checked=\{consent\}/);
  assert.match(card, /Please check the consent box to join the list\./);
  assert.match(route, /normalizeMarketingSignupInput/);
  assert.match(marketing, /input\.consent !== true/);
});

test("invalid email is rejected and duplicate signup updates safely", async () => {
  const marketing = await source("../lib/marketing.ts");
  const migration = await source("../supabase/migrations/202607230001_create_marketing_contacts.sql");

  assert.match(marketing, /EMAIL_MAX_LENGTH = 254/);
  assert.match(marketing, /trim\(\)/);
  assert.match(marketing, /toLowerCase\(\)/);
  assert.match(marketing, /Enter a valid email address\./);
  assert.match(marketing, /on_conflict=normalized_email/);
  assert.match(marketing, /resolution=merge-duplicates/);
  assert.match(migration, /normalized_email text not null unique/);
});

test("PayPal payer email does not create marketing consent", async () => {
  const paypal = await source("../lib/paypal.ts");
  const captureRoute = await source("../app/api/paypal/orders/[orderId]/capture/route.ts");
  const marketing = await source("../lib/marketing.ts");

  assert.doesNotMatch(captureRoute, /marketing_contacts|upsertMarketingContact/);
  assert.doesNotMatch(paypal, /marketing_contacts|marketing_opt_in|consent_status/);
  assert.match(marketing, /consent_source/);
});

test("Resend failure does not fail successful signup response or checkout", async () => {
  const route = await source("../app/api/marketing/signup/route.ts");
  const marketing = await source("../lib/marketing.ts");

  assert.match(marketing, /return \{ sent: false, reason: "provider_failed"/);
  assert.match(marketing, /return \{ sent: false, reason: "email_not_configured"/);
  assert.match(route, /emailSent: delivery\.sent/);
  assert.match(route, /return NextResponse\.json\(\{\s*ok: true/);
});

test("unsubscribe uses a purpose-bound signed token and safe success page", async () => {
  const marketing = await source("../lib/marketing.ts");
  const page = await source("../app/unsubscribe/[token]/page.tsx");
  const tracker = await source("../components/unsubscribe-tracker.tsx");

  assert.match(marketing, /UNSUBSCRIBE_PURPOSE = "marketing_unsubscribe"/);
  assert.match(marketing, /createHmac\("sha256"/);
  assert.match(marketing, /timingSafeEqual/);
  assert.match(marketing, /This unsubscribe link is invalid\./);
  assert.match(marketing, /This unsubscribe link has expired\./);
  assert.match(marketing, /unsubscribeMarketingContact/);
  assert.match(page, /verifyUnsubscribeToken/);
  assert.match(page, /Unsubscribed/);
  assert.match(tracker, /marketing_unsubscribed/);
});

test("marketing analytics never include email, hashes, provider text or tokens", async () => {
  const card = await source("../components/marketing-signup-card.tsx");
  const tracker = await source("../components/unsubscribe-tracker.tsx");

  for (const file of [card, tracker]) {
    const analyticsSource = (file.match(/trackEvent\([\s\S]*?\);/g) ?? []).join("\n");

    assert.doesNotMatch(analyticsSource, /email\s*[:},]/i);
    assert.doesNotMatch(analyticsSource, /normalizedEmail/);
    assert.doesNotMatch(analyticsSource, /hash/i);
    assert.doesNotMatch(analyticsSource, /token/i);
    assert.doesNotMatch(analyticsSource, /provider/i);
    assert.doesNotMatch(analyticsSource, /PayPal/i);
  }
});

test("Email List MVP environment variables are documented", async () => {
  const envExample = await source("../.env.local.example");
  const readme = await source("../README.md");

  for (const name of [
    "SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
    "RESEND_API_KEY",
    "EMAIL_FROM",
    "MARKETING_TOKEN_SECRET",
    "NEXT_PUBLIC_APP_URL",
  ]) {
    assert.match(envExample, new RegExp(name));
    assert.match(readme, new RegExp(name));
  }
});
