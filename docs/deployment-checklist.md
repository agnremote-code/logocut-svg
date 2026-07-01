# Production Deployment Checklist

Use this checklist before deploying LogoCut SVG to Vercel.

## Vercel Project

- Create a Vercel project connected to the repository.
- Confirm the build command is `npm run build`.
- Confirm the install command is `npm install`.
- Confirm the framework preset is Next.js.

## Vercel Environment Variables

Add these in Vercel Project Settings -> Environment Variables:

```bash
VECTORIZER_API_ID
VECTORIZER_API_SECRET
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
```

For the current MVP:

- Use Stripe test keys.
- Use Vectorizer.AI test mode for the free preview.
- Use Vectorizer.AI production mode only after successful payment.
- Connect Vercel Blob for uploaded images, generated SVG files, and job metadata JSON.
- Confirm the project has either `BLOB_STORE_ID` from Vercel system environment variables with OIDC enabled or `BLOB_READ_WRITE_TOKEN` configured.

## Stripe Live Keys Later

Before accepting real customer payments:

- Switch `STRIPE_SECRET_KEY` from `sk_test_...` to `sk_live_...`.
- Create and test live-mode products/pricing behavior if moving away from inline Checkout prices.
- Confirm Stripe business profile, public statement descriptor, support email, and payout settings.
- Run a live low-value payment test if appropriate.

## Vectorizer Production Mode Later

Before charging for production SVG output:

- Confirm expected cost per image.
- Add retry and failure handling around Vectorizer.AI.

## Domain Setup

- Add the production domain in Vercel.
- Configure DNS records.
- Confirm HTTPS is active.
- Update Stripe allowed redirect expectations by testing Checkout from the production domain.

## Webhook Setup

- Create a Stripe webhook endpoint for:

```text
https://your-domain.com/api/stripe/webhook
```

- Subscribe to `checkout.session.completed`.
- Copy the webhook signing secret into `STRIPE_WEBHOOK_SECRET` in Vercel.
- Send a test webhook from Stripe and confirm a `200` response.

## Final Pre-Launch Check

- Upload a test PNG.
- Complete Stripe Checkout.
- Confirm redirect to `/processing/[jobId]`.
- Confirm payment status becomes `paid`.
- Confirm Vectorizer.AI returns a test SVG.
- Confirm the result page shows `TEST MODE`.
- Confirm Download SVG returns an SVG attachment.
