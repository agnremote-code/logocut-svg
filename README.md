# LogoCut SVG

LogoCut SVG is a Next.js MVP for turning uploaded PNG or JPG logos into Cricut-ready SVG downloads.

The current product flow is:

1. Upload a logo.
2. Review deterministic quality warnings.
3. Choose a cut type.
4. Pay with Stripe Checkout.
5. Process the image with Vectorizer.AI in test mode.
6. Preview and download the returned SVG.

## What The App Does

- Accepts PNG, JPG, and JPEG logos under 10 MB.
- Runs a client-side pre-flight quality check.
- Recommends single-color or multi-color cut mode.
- Creates one-time Stripe Checkout sessions.
- Blocks Vectorizer.AI until payment is confirmed.
- Sends paid jobs to Vectorizer.AI with `mode=test`.
- Shows a result page with SVG preview and download.

The app does not include user accounts, subscriptions, dashboards, or persistent production storage yet.

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

## Required Environment Variables

```bash
VECTORIZER_API_ID="your-api-id"
VECTORIZER_API_SECRET="your-api-secret"
STRIPE_SECRET_KEY="sk_test_your-stripe-secret-key"
STRIPE_WEBHOOK_SECRET="whsec_your-stripe-webhook-secret"
```

Notes:

- `VECTORIZER_API_ID` and `VECTORIZER_API_SECRET` come from Vectorizer.AI.
- `STRIPE_SECRET_KEY` should be a Stripe test key for this MVP.
- `STRIPE_WEBHOOK_SECRET` is required for signed webhook handling in deployed environments.
- Do not commit real `.env.local` values.

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

- The app currently sends `mode=test`.
- Test-mode SVGs may contain a watermark.
- The result page clearly displays `TEST MODE`.
- Vectorizer production mode is intentionally not enabled yet.

## Internal Testing

The internal logo comparison page is available at:

```text
http://localhost:3000/internal/test-suite
```

It is for manual QA of logo quality heuristics and SVG output behavior.
