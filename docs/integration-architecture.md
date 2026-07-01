# LogoCut SVG Integration Architecture

## MVP Flow

Landing page -> upload image -> free watermarked preview -> PayPal Checkout -> result page.

## Current Implementation

- The landing page validates PNG/JPG uploads under 10 MB.
- `POST /api/jobs` stores the original image durably and creates a durable job record.
- `/api/jobs/[jobId]/vectorize` calls Vectorizer.AI test mode before payment and stores the watermarked preview SVG.
- `/api/paypal/orders` creates a one-time PayPal order only after the preview SVG exists.
- `/api/paypal/orders/[orderId]/capture` captures PayPal payment, validates the server-side amount, calls Vectorizer.AI production mode once, and stores the final SVG.
- `/result/[jobId]` displays the generated SVG state and enables download when the final SVG is ready.

## Production Boundary

The Vectorizer.AI integration should live behind the job API, not inside UI components.

Production path:

1. `POST /api/jobs`
   - Validate upload and cut type.
   - Store original image in object storage.
   - Create a durable unpaid job record.
   - Return the job id.

2. PayPal Checkout
   - Create a one-time PayPal order.
   - Confirm capture server-side.
   - Validate USD amount against the durable job cut type.
   - Mark the durable job as paid.

3. Final generation
   - Fetch original image.
   - Send image to Vectorizer.AI through `lib/vectorizer.ts`.
   - Store generated SVG.
   - Mark job as ready or failed.

4. `GET /api/jobs/[jobId]`
   - Return durable job status.

5. `GET /api/jobs/[jobId]/result`
   - Return the generated SVG attachment only after the job is ready.

## Intentional Non-Goals Right Now

- No fake SVG generation.
- No user accounts.
- No dashboard.
- No subscriptions.
