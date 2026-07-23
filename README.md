# LogoCut SVG

LogoCut SVG is a Next.js MVP for turning uploaded PNG or JPG logos into Cricut-ready SVG downloads.

The current product flow is:

1. Upload a logo.
2. Create a free watermarked SVG preview with Vectorizer.AI test mode.
3. Review the preview before paying.
4. Unlock the clean SVG with PayPal Checkout.
5. Process the image with Vectorizer.AI production mode after payment.
6. Preview and download the final SVG.

## What The App Does

- Accepts PNG, JPG, and JPEG logos under 10 MB.
- Recommends single-color or multi-color cut mode.
- Stores job metadata and files durably when Vercel storage is configured.
- Creates a free watermarked SVG preview before checkout.
- Creates one-time PayPal Checkout orders.
- Runs clean SVG generation only after payment is confirmed.
- Shows a result page with SVG preview and download.

The public app does not currently enable subscriber accounts, subscriptions, or
dashboards. LogoCut Unlimited is documented as a planned recurring product in
[docs/logocut-unlimited.md](docs/logocut-unlimited.md).

## Local Setup

Install dependencies:

```bash
npm install
```

Create a local environment file:

```bash
cp .env.local.example .env.local
```

Fill in the required values in `.env.local`.

## Environment Variables

```bash
VECTORIZER_API_ID="your-api-id"
VECTORIZER_API_SECRET="your-api-secret"

NEXT_PUBLIC_PAYPAL_CLIENT_ID="your-paypal-sandbox-client-id"
PAYPAL_CLIENT_ID="your-paypal-sandbox-client-id"
PAYPAL_CLIENT_SECRET="your-paypal-sandbox-client-secret"
PAYPAL_ENVIRONMENT="sandbox"

# Stripe one-time checkout remains inactive in the public unlock UI.
# Stripe Billing is the planned provider for LogoCut Unlimited subscriptions.
STRIPE_SECRET_KEY="sk_test_your-stripe-secret-key"
STRIPE_WEBHOOK_SECRET="whsec_your-stripe-webhook-secret"
STRIPE_UNLIMITED_PRICE_ID="price_your-logocut-unlimited-monthly-price"
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_your-stripe-publishable-key"

# Required before enabling passwordless subscriber accounts.
AUTH_SECRET="replace-with-a-random-32-byte-secret"
EMAIL_FROM="LogoCut SVG <support@logocutsvg.com>"
EMAIL_PROVIDER_API_KEY="your-transactional-email-api-key"

# Optional one-time purchase recovery email.
# If omitted, checkout still works and recovery email delivery is disabled.
RESEND_API_KEY="re_your-resend-api-key"
RESEND_FROM_EMAIL="LogoCut SVG <support@logocutsvg.com>"
RECOVERY_TOKEN_SECRET="replace-with-a-random-32-byte-secret"
LOGOCUT_SUPPORT_EMAIL="support@logocutsvg.com"
NEXT_PUBLIC_SITE_URL="http://localhost:3000"

# Optional for local durable Blob testing.
BLOB_READ_WRITE_TOKEN="vercel-blob-read-write-token"
```

Notes:

- `VECTORIZER_API_ID` and `VECTORIZER_API_SECRET` come from Vectorizer.AI.
- `NEXT_PUBLIC_PAYPAL_CLIENT_ID` is the public PayPal JavaScript SDK client ID.
- `PAYPAL_CLIENT_ID` and `PAYPAL_CLIENT_SECRET` are used server-side for the PayPal Orders API.
- `PAYPAL_ENVIRONMENT` must be `sandbox` or `live`; use `sandbox` until launch.
- Stripe code remains available in the repo, but PayPal is the active one-time checkout path.
- One-time recovery email uses Resend when `RESEND_API_KEY`,
  `RESEND_FROM_EMAIL`, and `RECOVERY_TOKEN_SECRET` are configured. If any are
  missing, checkout and downloads still work and email delivery is disabled.
- Recovery email addresses are encrypted in the private job metadata and are
  never sent to GA4.
- Stripe Billing is selected for the planned `LogoCut Unlimited` subscription because it provides hosted subscription Checkout, verified subscription webhooks, failed-payment lifecycle events and Customer Portal subscription management.
- Do not enable `LogoCut Unlimited` publicly until subscriber auth, verified webhooks, cancellation, billing management and monthly usage enforcement have passed end-to-end tests.
- Vercel Blob stores uploaded images, generated SVG files, and job metadata JSON.
- For local durable Blob testing, use `BLOB_READ_WRITE_TOKEN`.
- In Vercel, a connected Blob store can provide `BLOB_STORE_ID` through system environment variables and the Blob SDK uses Vercel OIDC automatically; `BLOB_READ_WRITE_TOKEN` is optional in that setup.
- Do not commit real `.env.local` values.
- Local development can fall back to in-memory storage when no Blob env vars are present.
- Production fails clearly with `Storage is not configured` if durable storage is missing.

## Run Locally

Start the development server:

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

Run verification:

```bash
npm run lint
npm run build
```

## Test Mode Notes

PayPal:

- Use PayPal sandbox credentials with `PAYPAL_ENVIRONMENT="sandbox"`.
- The PayPal button creates an order for the server-side job price only.
- Capturing a sandbox PayPal payment marks the job paid and triggers Vectorizer.AI production mode.
- Do not test PayPal live mode until launch configuration is complete.

Vectorizer.AI:

- The app sends `mode=test` before payment to create the watermarked preview.
- Test-mode SVGs may contain a watermark and the UI displays `TEST MODE`.
- After successful payment, the app sends `mode=production` to generate the clean SVG.

## Internal Testing

The internal logo comparison page is available at:

```text
http://localhost:3000/internal/test-suite
```

It is for manual QA of logo quality heuristics and SVG output behavior.
