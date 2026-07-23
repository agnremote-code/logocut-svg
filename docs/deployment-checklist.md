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
NEXT_PUBLIC_PAYPAL_CLIENT_ID
PAYPAL_CLIENT_ID
PAYPAL_CLIENT_SECRET
PAYPAL_ENVIRONMENT
```

For the current MVP:

- Use PayPal sandbox credentials.
- Set `PAYPAL_ENVIRONMENT` to `sandbox`.
- Use Vectorizer.AI test mode for the free preview.
- Use Vectorizer.AI production mode only after successful payment.
- Connect Vercel Blob for uploaded images, generated SVG files, and job metadata JSON.
- Confirm the project has either `BLOB_STORE_ID` from Vercel system environment variables with OIDC enabled or `BLOB_READ_WRITE_TOKEN` configured.
- Optional purchase recovery email:
  - `RESEND_API_KEY`
  - `RESEND_FROM_EMAIL`
  - `RECOVERY_TOKEN_SECRET`
  - `LOGOCUT_SUPPORT_EMAIL`
  - `NEXT_PUBLIC_SITE_URL`
- If any recovery email variable is missing, checkout must still succeed and
  email delivery should remain disabled gracefully.
- Stripe code remains in the repo but is inactive in the public unlock UI.

## LogoCut Unlimited Later

Do not deploy the subscription publicly until subscriber auth, verified Stripe
Billing webhooks, cancellation, billing management and monthly allowance
enforcement are tested end-to-end.

Planned subscription environment variables:

```bash
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
STRIPE_UNLIMITED_PRICE_ID
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
AUTH_SECRET
EMAIL_FROM
EMAIL_PROVIDER_API_KEY
NEXT_PUBLIC_APP_URL
```

Stripe Billing is the selected subscription provider. PayPal remains the active
one-time checkout provider.

Before enabling LogoCut Unlimited:

- Create a Stripe Product named `LogoCut Unlimited`.
- Create a recurring monthly Price for USD 19.
- Store the Price ID in `STRIPE_UNLIMITED_PRICE_ID`.
- Configure the Stripe Customer Portal with cancellation enabled.
- Create a Stripe webhook endpoint for subscription events.
- Verify webhook signatures with `STRIPE_WEBHOOK_SECRET`.
- Test successful activation, renewal, payment failure, cancellation and period
  end expiration.
- Add an atomic usage ledger before enforcing the 25-conversion monthly limit.

## PayPal Live Mode Later

Before accepting real customer payments:

- Replace sandbox PayPal credentials with live PayPal REST app credentials.
- Set `PAYPAL_ENVIRONMENT` to `live`.
- Confirm PayPal business profile, support email, statement details, and payout settings.
- Add and verify a live PayPal webhook for payment capture events if asynchronous reconciliation is needed.
- Run a live low-value payment test if appropriate.

## Stripe Legacy Code

Stripe library code remains in the codebase for now, but no public Stripe route
or recurring checkout is exposed by the active application.

## Vectorizer Production Mode Later

Before charging for production SVG output:

- Confirm expected cost per image.
- Add retry and failure handling around Vectorizer.AI.

## Domain Setup

- Add the production domain in Vercel.
- Configure DNS records.
- Confirm HTTPS is active.
- Confirm PayPal sandbox checkout opens from the production domain.

## Webhook Setup

- PayPal Checkout capture is verified server-side during the buyer approval flow.
- Before launch, add a PayPal live webhook if you want a backup reconciliation path for completed captures.
- If Stripe Billing is activated later, add a verified Stripe webhook endpoint.
- Subscribe to the required subscription and invoice events.
- Copy the webhook signing secret into `STRIPE_WEBHOOK_SECRET` in Vercel.
- Send a test webhook from Stripe and confirm a `200` response.

## Final Pre-Launch Check

- Upload a test PNG.
- Complete PayPal sandbox checkout.
- Confirm payment status becomes `paid`.
- Confirm Vectorizer.AI production mode generates the clean SVG after capture.
- Confirm Download SVG returns an SVG attachment.
