# LogoCut Unlimited Architecture

## Status

LogoCut Unlimited is planned but not publicly enabled.

The current production app must continue to support:

- free watermarked previews;
- one-time PayPal purchases;
- durable Blob-backed one-time jobs;
- production Vectorizer generation after payment.

## Product

LogoCut Unlimited is a recurring subscription for frequent Cricut, Silhouette,
Etsy, vinyl, sticker and craft workflows.

Public copy must always show the real limit:

- USD 19 per month;
- unlimited free previews;
- up to 25 complete conversions per billing month;
- every complete conversion includes both clean single-color SVG and clean
  layered SVG;
- saved conversion history;
- re-downloads while files remain available;
- cancel anytime;
- one individual or one small business per subscription.

## Provider Decision

Use Stripe Billing for subscriptions.

Keep PayPal Orders API active for one-time purchases.

Stripe Billing was selected because the subscription product needs:

- hosted subscription checkout;
- verified recurring billing webhooks;
- subscription lifecycle states;
- failed payment handling;
- a customer billing portal for self-serve cancellation and payment method
  management;
- idempotent webhook processing.

PayPal Subscriptions supports recurring plans and subscription webhooks, but the
current application already uses PayPal only for one-time Orders API payments.
Adding PayPal Subscriptions would introduce a second PayPal product model,
separate plan lifecycle and separate subscription management surface. Stripe
Billing is the lower-risk subscription system while preserving PayPal for the
working one-time flow.

## Required Environment Variables

Subscription billing:

```bash
STRIPE_SECRET_KEY="sk_test_or_live_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
STRIPE_UNLIMITED_PRICE_ID="price_..."
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_or_live_..."
```

Passwordless auth and transactional email:

```bash
EMAIL_FROM="LogoCut SVG <support@logocutsvg.com>"
EMAIL_PROVIDER_API_KEY="..."
AUTH_SECRET="random-32-byte-secret"
```

App URL:

```bash
NEXT_PUBLIC_APP_URL="https://www.logocutsvg.com"
```

Existing one-time and conversion variables remain required:

```bash
NEXT_PUBLIC_PAYPAL_CLIENT_ID="..."
PAYPAL_CLIENT_ID="..."
PAYPAL_CLIENT_SECRET="..."
PAYPAL_ENVIRONMENT="live"
VECTORIZER_API_ID="..."
VECTORIZER_API_SECRET="..."
BLOB_READ_WRITE_TOKEN="..."
```

## Data Model

### User

- `id`
- `emailHash`
- `stripeCustomerId`
- `createdAt`
- `updatedAt`

Store email privately. Never send email addresses to analytics.

### Subscription

- `id`
- `userId`
- `provider`
- `providerSubscriptionId`
- `providerCustomerId`
- `status`
- `currentPeriodStart`
- `currentPeriodEnd`
- `cancelAtPeriodEnd`
- `monthlyConversionLimit`
- `createdAt`
- `updatedAt`

Supported states:

- `inactive`
- `checkout_pending`
- `active`
- `past_due`
- `cancelled_until_period_end`
- `expired`

### Usage Ledger

Usage must be immutable and append-only.

Fields:

- `id`
- `userId`
- `jobId`
- `billingPeriodId`
- `usageType`
- `status`
- `reservedAt`
- `completedAt`
- `reversedAt`
- `reversalReason`
- `stripeEventId`

A complete conversion consumes one monthly conversion when production
generation successfully begins under an active subscription.

Free previews do not consume usage.

Re-downloads do not consume usage.

If production generation fails permanently, the reserved usage entry must be
reversed.

## Storage

Existing Vercel Blob paths for one-time jobs remain unchanged.

Subscriber job files should use:

```text
users/{userId}/jobs/{jobId}/metadata.json
users/{userId}/jobs/{jobId}/original.{ext}
users/{userId}/jobs/{jobId}/single.svg
users/{userId}/jobs/{jobId}/layered.svg
```

Suggested retention:

- originals: 30 days;
- generated subscriber SVG files: 90 days;
- billing and audit metadata: retained as required for financial records.

Downloads must go through authenticated server routes. Do not expose raw
writable Blob credentials or rely on guessable job IDs as authorization.

## Concurrency Requirement

The requirement "do not allow more than 25 successful conversions in one billing
period" needs an atomic reservation step.

Vercel Blob is suitable for durable files and JSON metadata, but it is not a
transactional counter or compare-and-swap ledger. A production subscription
implementation should add a durable atomic data store for:

- user records;
- subscription records;
- idempotent Stripe webhook events;
- usage reservations;
- conversion ledger entries;
- per-account concurrency locks.

Blob can continue storing originals and generated SVG files.

## Implementation Sequence

1. Add Complete SVG Pack and dual-output production generation.
2. Add passwordless auth and persistent users.
3. Add Stripe Billing subscription checkout.
4. Add verified Stripe webhooks and idempotent event handling.
5. Add immutable usage ledger with atomic reservation.
6. Add subscriber "Generate Both Clean SVGs" flow.
7. Add account dashboard and secure history downloads.
8. Add billing portal.
9. Add transactional email.
10. Add pricing/upgrade UI.
11. Add analytics.
12. Complete sandbox and regression tests.

Do not deploy the subscription publicly until webhooks, cancellation, billing
management and allowance enforcement pass end-to-end tests.
