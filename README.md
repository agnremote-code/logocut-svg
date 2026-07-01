# LogoCut SVG

LogoCut SVG is a Next.js MVP for turning uploaded PNG or JPG logos into Cricut-ready SVG downloads.

The current product flow is:

1. Upload a logo.
2. Create a free watermarked SVG preview with Vectorizer.AI test mode.
3. Review the preview before paying.
4. Unlock the clean SVG with Stripe Checkout.
5. Process the image with Vectorizer.AI production mode after payment.
6. Preview and download the final SVG.

## What The App Does

- Accepts PNG, JPG, and JPEG logos under 10 MB.
- Recommends single-color or multi-color cut mode.
- Stores job metadata and files durably when Vercel storage is configured.
- Creates a free watermarked SVG preview before checkout.
- Creates one-time Stripe Checkout sessions.
- Runs clean SVG generation only after payment is confirmed.
- Shows a result page with SVG preview and download.

The app does not include user accounts, subscriptions, or dashboards.

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
STRIPE_SECRET_KEY="sk_test_your-stripe-secret-key"
STRIPE_WEBHOOK_SECRET="whsec_your-stripe-webhook-secret"

# Optional for local durable Blob testing.
BLOB_READ_WRITE_TOKEN="vercel-blob-read-write-token"
```

Notes:

- `VECTORIZER_API_ID` and `VECTORIZER_API_SECRET` come from Vectorizer.AI.
- `STRIPE_SECRET_KEY` should be a Stripe test key for this MVP.
- `STRIPE_WEBHOOK_SECRET` is required for signed webhook handling in deployed environments.
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

Stripe:

- Checkout currently uses whatever `STRIPE_SECRET_KEY` is configured.
- Use a Stripe test secret key locally.
- Use Stripe's official test card for local verification: `4242 4242 4242 4242`.

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
