# LogoCut paid traffic measurement recovery

## Current evidence

After campaign reactivation Google Ads recorded 13 new desktop clicks, but GA4 recorded zero `google / cpc` sessions and zero paid-funnel events. Production serves measurement ID `G-JFF57HC8Y7`; application events exist in code; no recent upload, preview, PayPal, 4xx, or 5xx evidence was found. The campaign must remain paused until a controlled production test proves both GA4 and a first-party measurement path.

## Root questions to prove, not assume

1. Does the production browser send a request to Google Analytics `g/collect` for an explicit `page_view` and `paid_landing_view`?
2. Is `G-JFF57HC8Y7` the exact stream/property being inspected in GA4 Realtime and DebugView?
3. Are gclid and UTM query parameters preserved through every redirect and canonical host transition?
4. Does the landing route receive paid requests even when GA is blocked by privacy tools?
5. Are custom events queued and flushed after the GA library becomes ready?

## Required implementation

### 1. Explicit page measurement

- Keep a single GA4 configuration.
- Send an explicit `page_view` on initial load with sanitized `page_location`, `page_path`, `page_title`, and `page_referrer`.
- Do not double count page views.
- Keep `paid_landing_view` separate.
- Ensure queued events flush only after gtag is ready, while preserving events emitted before script load.
- Add a development diagnostic that reports: measurement ID present, script loaded, config issued, queue length, page_view sent, and last dispatch status. Never expose this in production UI.

### 2. First-party paid landing receipt

Add a same-origin measurement endpoint and client beacon so paid traffic can be counted independently of GA blockers.

- Endpoint: `/api/analytics/paid-landing`
- Accept only a strict sanitized schema.
- Record structured server logs for `paid_landing_request` and `paid_landing_client_beacon`.
- Never store or log raw gclid, filenames, images, emails, IP addresses, payer data, full user agents, tokens, or private job IDs.
- Allowed fields: event type, timestamp bucket, route, source, medium, campaign, has_gclid, has_utm, coarse device category, referrer host, anonymous short-lived visit ID.
- Generate a first-party anonymous visit ID and persist it in a SameSite=Lax cookie or local storage. It must not identify a person and should expire quickly.
- Server-rendered or middleware-side receipt should log the landing request whenever `/png-to-svg` arrives with gclid or paid UTM parameters, even if client JavaScript or Google Analytics is blocked.
- Client beacon should use `navigator.sendBeacon` with a fetch keepalive fallback.
- Deduplicate initial request/client receipt separately rather than collapsing them into one event.

### 3. Attribution preservation

- Add automated tests proving gclid and UTM parameters survive canonical-host and route behavior.
- Preserve attribution in first-party storage before any client navigation.
- Never place raw click IDs into analytics event parameters or logs; booleans are sufficient.

### 4. Controlled production verification page

Create a development/preview-only diagnostics route or test harness that:

- accepts a synthetic UTM marker, not a real gclid;
- emits explicit page_view, paid_landing_view, and first-party beacon;
- shows sanitized local dispatch state;
- is unavailable or 404 in production;
- performs no purchase, generation, PayPal, Vectorizer, or paid API action.

### 5. Production acceptance test

After preview deployment, use a clean browser profile with extensions disabled and a unique synthetic campaign marker.

Verify all of the following:

- final URL retains UTM query parameters;
- `gtag/js` loads successfully;
- browser network contains successful GA4 `g/collect` requests;
- request payload targets `G-JFF57HC8Y7`;
- `page_view` appears once;
- `paid_landing_view` appears once;
- first-party endpoint returns 2xx;
- Vercel logs contain sanitized request and client-beacon receipts;
- GA4 Realtime/DebugView shows the test device and events in the exact property being inspected;
- a real file-picker click and sample demo event are visible without creating a job or PayPal order;
- no console errors.

If GA4 network requests succeed but GA4 Realtime remains empty, treat that as a property/data-stream inspection or GA4 configuration issue, not a landing-page failure. Capture the destination measurement ID and exact property name being inspected.

## Tests

Add or update tests for:

- explicit page_view exactly once;
- no duplicate GA config;
- pre-load event queue and post-load flush;
- strict first-party endpoint schema;
- no raw gclid or personal data in logs/payloads;
- paid request receipt with gclid boolean;
- paid request receipt with UTM source/medium;
- organic request is not incorrectly labeled paid;
- sendBeacon fallback;
- attribution query preservation;
- production diagnostics route unavailable;
- existing purchase dedupe unchanged;
- sample flow still creates zero jobs and zero PayPal orders;
- LogoCut pricing, generation, storage, PayPal, and download behavior unchanged;
- Superclass unchanged.

## Validation

Run:

```sh
npm install
npm run lint
npm test
npm run build
```

Validate desktop at 1440x1000 and mobile at 390x844. Do not merge, manually deploy, alter Google Ads, or reactivate the campaign. Return the root cause actually proven, exact files changed, screenshots/network evidence, logs, GA4 Realtime/DebugView evidence, tests, build, final SHA, PR URL, and any remaining uncertainty.
