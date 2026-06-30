# LogoCut SVG Integration Architecture

## MVP Flow

Landing page -> upload image -> choose cut type -> Stripe Checkout -> processing page -> result page.

## Current Implementation

- The landing page validates PNG/JPG uploads under 10 MB.
- `POST /api/jobs` creates a temporary conversion job and returns a job id.
- The original image is stored temporarily in browser IndexedDB so the processing and result pages can show a preview without accounts or backend storage.
- `/api/jobs/[jobId]/checkout` creates a one-time Stripe Checkout session.
- `/processing/[jobId]` confirms payment, simulates the five product steps, calls Vectorizer.AI test mode, and redirects to the result page.
- `/result/[jobId]` displays the original image and either the returned test-mode SVG or a clean Vectorizer error.

## Future Production Boundary

The Vectorizer.AI integration should live behind the job API, not inside UI components.

Expected production path:

1. `POST /api/jobs`
   - Validate upload and cut type.
   - Store original image in object storage.
   - Create a durable unpaid job record.
   - Return the job id.

2. Stripe Checkout
   - Create a one-time payment session.
   - Confirm payment through redirect verification and webhooks.
   - Mark the durable job as paid.

3. Background worker
   - Fetch original image.
   - Send image to Vectorizer.AI through `lib/vectorizer.ts`.
   - Apply Cricut-specific SVG cleanup.
   - Store generated SVG.
   - Mark job as ready or failed.

4. `GET /api/jobs/[jobId]`
   - Return durable job status.

5. `GET /api/jobs/[jobId]/result`
   - Return the generated SVG download URL only after the job is ready.

## Intentional Non-Goals Right Now

- No fake SVG generation.
- No user accounts.
- No dashboard.
- No subscriptions.
